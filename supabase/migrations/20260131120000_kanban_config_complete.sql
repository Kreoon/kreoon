-- =====================================================
-- KANBAN CONFIG COMPLETE - State permissions, transitions, custom fields
-- =====================================================

-- 1. Add icon and description to organization_statuses
ALTER TABLE public.organization_statuses
ADD COLUMN IF NOT EXISTS icon text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS description text DEFAULT NULL;

-- 2. Add visible_in_states to board_custom_fields (array of status_keys)
ALTER TABLE public.board_custom_fields
ADD COLUMN IF NOT EXISTS visible_in_states jsonb DEFAULT '[]'::jsonb;

-- 3. Create state_permissions table (matrix: state x role)
CREATE TABLE IF NOT EXISTS public.state_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  status_id uuid NOT NULL REFERENCES public.organization_statuses(id) ON DELETE CASCADE,
  role text NOT NULL,
  can_view boolean NOT NULL DEFAULT true,
  can_view_assigned_only boolean NOT NULL DEFAULT false,
  can_move_to boolean NOT NULL DEFAULT false,
  can_edit boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id, status_id, role)
);

CREATE INDEX IF NOT EXISTS idx_state_permissions_org ON public.state_permissions(organization_id);

-- Skip index creation if column doesn't exist
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'state_permissions' AND column_name = 'status_id'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_state_permissions_status ON public.state_permissions(status_id);
  END IF;
END $$;

-- 4. Create kanban_config for extra JSONB config
CREATE TABLE IF NOT EXISTS public.kanban_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE UNIQUE,
  config_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 5. Add transition rules columns to board_status_rules if not exists
-- (allowed_from_statuses, allowed_to_statuses already exist)
-- Add automations column for "when X do Y"
ALTER TABLE public.board_status_rules
ADD COLUMN IF NOT EXISTS automations jsonb DEFAULT '[]'::jsonb;

-- 6. RLS for new tables
ALTER TABLE public.state_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kanban_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org members can view state_permissions" ON public.state_permissions;
CREATE POLICY "Org members can view state_permissions"
ON public.state_permissions FOR SELECT
USING (is_org_member(auth.uid(), organization_id));

DROP POLICY IF EXISTS "Org owners and admins can manage state_permissions" ON public.state_permissions;
CREATE POLICY "Org owners and admins can manage state_permissions"
ON public.state_permissions FOR ALL
USING (is_org_owner(auth.uid(), organization_id) OR has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (is_org_owner(auth.uid(), organization_id) OR has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Org members can view kanban_config" ON public.kanban_config;
CREATE POLICY "Org members can view kanban_config"
ON public.kanban_config FOR SELECT
USING (is_org_member(auth.uid(), organization_id));

DROP POLICY IF EXISTS "Org owners and admins can manage kanban_config" ON public.kanban_config;
CREATE POLICY "Org owners and admins can manage kanban_config"
ON public.kanban_config FOR ALL
USING (is_org_owner(auth.uid(), organization_id) OR has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (is_org_owner(auth.uid(), organization_id) OR has_role(auth.uid(), 'admin'::app_role));