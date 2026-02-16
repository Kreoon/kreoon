-- =============================================================
-- project_assignments: Multi-talent assignment system
-- Polymorphic FK to content OR marketplace_projects
-- =============================================================

CREATE TABLE public.project_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Polymorphic reference
  project_source TEXT NOT NULL CHECK (project_source IN ('content', 'marketplace')),
  content_id UUID REFERENCES public.content(id) ON DELETE CASCADE,
  marketplace_project_id UUID REFERENCES public.marketplace_projects(id) ON DELETE CASCADE,

  -- Who is assigned
  user_id UUID NOT NULL REFERENCES auth.users(id),
  role_id TEXT NOT NULL,       -- 'ugc_creator', 'video_editor', 'web_developer', etc.
  role_group TEXT NOT NULL,    -- 'creator', 'editor', 'strategist', 'tech', 'education'

  -- Sequential flow
  phase INTEGER NOT NULL DEFAULT 1,
  depends_on UUID[] DEFAULT '{}',

  -- Assignment lifecycle
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',
    'invited',
    'accepted',
    'in_progress',
    'delivered',
    'in_review',
    'changes_requested',
    'approved',
    'paid',
    'cancelled'
  )),

  -- Payment
  payment_amount DECIMAL(10,2),
  payment_currency TEXT DEFAULT 'COP',
  payment_method TEXT CHECK (payment_method IN ('payment', 'exchange')),
  is_paid BOOLEAN DEFAULT FALSE,
  paid_at TIMESTAMPTZ,

  -- Associated workspace block
  workspace_block_type TEXT,

  -- Lifecycle timestamps
  invited_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Exactly one FK must be set
  CONSTRAINT valid_project_reference CHECK (
    (project_source = 'content' AND content_id IS NOT NULL AND marketplace_project_id IS NULL) OR
    (project_source = 'marketplace' AND marketplace_project_id IS NOT NULL AND content_id IS NULL)
  )
);

-- =============================================================
-- Unique partial indexes: prevent duplicate role per user per project
-- =============================================================

CREATE UNIQUE INDEX idx_assignment_unique_user_role_content
  ON public.project_assignments(content_id, user_id, role_id)
  WHERE content_id IS NOT NULL;

CREATE UNIQUE INDEX idx_assignment_unique_user_role_marketplace
  ON public.project_assignments(marketplace_project_id, user_id, role_id)
  WHERE marketplace_project_id IS NOT NULL;

-- =============================================================
-- Lookup indexes
-- =============================================================

CREATE INDEX idx_assignments_content ON public.project_assignments(content_id) WHERE content_id IS NOT NULL;
CREATE INDEX idx_assignments_marketplace ON public.project_assignments(marketplace_project_id) WHERE marketplace_project_id IS NOT NULL;
CREATE INDEX idx_assignments_user ON public.project_assignments(user_id);
CREATE INDEX idx_assignments_status ON public.project_assignments(status);
CREATE INDEX idx_assignments_phase ON public.project_assignments(content_id, phase) WHERE content_id IS NOT NULL;
CREATE INDEX idx_assignments_phase_mp ON public.project_assignments(marketplace_project_id, phase) WHERE marketplace_project_id IS NOT NULL;

-- =============================================================
-- RLS
-- =============================================================

ALTER TABLE public.project_assignments ENABLE ROW LEVEL SECURITY;

-- SELECT: assigned user, or org member (content), or project participant (marketplace)
CREATE POLICY "assignments_select" ON public.project_assignments FOR SELECT USING (
  auth.uid() = user_id
  OR (content_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.content c
    JOIN public.clients cl ON cl.id = c.client_id
    JOIN public.organization_members om ON om.organization_id = cl.organization_id
    WHERE c.id = project_assignments.content_id AND om.user_id = auth.uid()
  ))
  OR (marketplace_project_id IS NOT NULL AND public.is_project_participant(marketplace_project_id))
);

-- INSERT: org member (content) or project participant (marketplace)
CREATE POLICY "assignments_insert" ON public.project_assignments FOR INSERT WITH CHECK (
  (content_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.content c
    JOIN public.clients cl ON cl.id = c.client_id
    JOIN public.organization_members om ON om.organization_id = cl.organization_id
    WHERE c.id = project_assignments.content_id AND om.user_id = auth.uid()
  ))
  OR (marketplace_project_id IS NOT NULL AND public.is_project_participant(marketplace_project_id))
);

-- UPDATE: assigned user or org member or project participant
CREATE POLICY "assignments_update" ON public.project_assignments FOR UPDATE USING (
  auth.uid() = user_id
  OR (content_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.content c
    JOIN public.clients cl ON cl.id = c.client_id
    JOIN public.organization_members om ON om.organization_id = cl.organization_id
    WHERE c.id = project_assignments.content_id AND om.user_id = auth.uid()
  ))
  OR (marketplace_project_id IS NOT NULL AND public.is_project_participant(marketplace_project_id))
);

-- DELETE: admin/team_leader (content) or brand admin (marketplace)
CREATE POLICY "assignments_delete" ON public.project_assignments FOR DELETE USING (
  (content_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.content c
    JOIN public.clients cl ON cl.id = c.client_id
    JOIN public.organization_members om ON om.organization_id = cl.organization_id
    WHERE c.id = project_assignments.content_id
      AND om.user_id = auth.uid()
      AND om.role IN ('admin', 'team_leader')
  ))
  OR (marketplace_project_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.marketplace_projects mp
    WHERE mp.id = project_assignments.marketplace_project_id
      AND (
        public.is_brand_admin(mp.brand_id)
        OR (mp.organization_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM public.organization_members om
          WHERE om.organization_id = mp.organization_id
            AND om.user_id = auth.uid()
            AND om.role = 'admin'
        ))
      )
  ))
);

GRANT ALL ON public.project_assignments TO authenticated;

-- =============================================================
-- Auto-update updated_at
-- =============================================================

CREATE TRIGGER set_project_assignments_updated_at
  BEFORE UPDATE ON public.project_assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================================
-- Update is_project_participant to also check assignments
-- =============================================================

CREATE OR REPLACE FUNCTION public.is_project_participant(_project_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.marketplace_projects mp
    WHERE mp.id = _project_id
      AND (
        mp.creator_id = auth.uid()
        OR mp.editor_id = auth.uid()
        OR (mp.brand_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM public.brand_members bm
          WHERE bm.brand_id = mp.brand_id
            AND bm.user_id = auth.uid()
            AND bm.status = 'active'
        ))
        OR (mp.organization_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM public.organization_members om
          WHERE om.organization_id = mp.organization_id
            AND om.user_id = auth.uid()
        ))
        -- NEW: check project_assignments table
        OR EXISTS (
          SELECT 1 FROM public.project_assignments pa
          WHERE pa.marketplace_project_id = _project_id
            AND pa.user_id = auth.uid()
            AND pa.status NOT IN ('cancelled')
        )
      )
  );
$$;
