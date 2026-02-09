-- =============================================================================
-- CAMPAIGN VISIBILITY SYSTEM
-- =============================================================================
-- Adds configurable visibility (public/internal/selective) to campaigns,
-- organization support alongside brands, invitation system for selective
-- campaigns, and campaign deliverables table.
-- =============================================================================

-- ============================================
-- 1. HELPER FUNCTIONS
-- ============================================

-- is_org_member: check if current user belongs to an organization
CREATE OR REPLACE FUNCTION public.is_org_member(_org_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = _org_id
      AND user_id = auth.uid()
  );
$$;

-- is_org_admin: check if current user is admin of an organization
CREATE OR REPLACE FUNCTION public.is_org_admin(_org_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = _org_id
      AND user_id = auth.uid()
      AND role IN ('admin', 'team_leader')
  );
$$;

-- can_see_campaign: visibility-aware campaign access check
CREATE OR REPLACE FUNCTION public.can_see_campaign(_campaign_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  _visibility text;
  _org_id uuid;
  _brand_id uuid;
  _status text;
BEGIN
  SELECT visibility, organization_id, brand_id, status
  INTO _visibility, _org_id, _brand_id, _status
  FROM public.marketplace_campaigns
  WHERE id = _campaign_id;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Campaign creator can always see their own
  IF EXISTS (
    SELECT 1 FROM public.marketplace_campaigns
    WHERE id = _campaign_id AND created_by = _user_id
  ) THEN
    RETURN true;
  END IF;

  -- Brand members can always see their brand's campaigns
  IF _brand_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.brand_members
    WHERE brand_id = _brand_id AND user_id = _user_id AND status = 'active'
  ) THEN
    RETURN true;
  END IF;

  -- Org members can always see their org's campaigns
  IF _org_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = _org_id AND user_id = _user_id
  ) THEN
    RETURN true;
  END IF;

  -- Public campaigns: visible to all if active/in_progress/completed
  IF _visibility = 'public' AND _status IN ('active', 'in_progress', 'completed') THEN
    RETURN true;
  END IF;

  -- Internal campaigns: only org members (already checked above)
  IF _visibility = 'internal' THEN
    RETURN false;
  END IF;

  -- Selective campaigns: only if invited
  IF _visibility = 'selective' THEN
    RETURN EXISTS (
      SELECT 1 FROM public.campaign_invitations
      WHERE campaign_id = _campaign_id
        AND invited_profile_id = _user_id
        AND status IN ('pending', 'accepted')
    );
  END IF;

  RETURN false;
END;
$$;

-- ============================================
-- 2. ALTER marketplace_campaigns
-- ============================================

-- Visibility & organization support
ALTER TABLE public.marketplace_campaigns
  ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'public'
    CHECK (visibility IN ('public', 'internal', 'selective'));

ALTER TABLE public.marketplace_campaigns
  ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL;

-- Make brand_id nullable (campaigns can belong to org OR brand)
ALTER TABLE public.marketplace_campaigns
  ALTER COLUMN brand_id DROP NOT NULL;

-- Brief & extended branding
ALTER TABLE public.marketplace_campaigns
  ADD COLUMN IF NOT EXISTS brief text;

ALTER TABLE public.marketplace_campaigns
  ADD COLUMN IF NOT EXISTS brand_name_override varchar(200);

ALTER TABLE public.marketplace_campaigns
  ADD COLUMN IF NOT EXISTS brand_logo_override text;

-- Compensation
ALTER TABLE public.marketplace_campaigns
  ADD COLUMN IF NOT EXISTS compensation_type varchar(30) DEFAULT 'paid'
    CHECK (compensation_type IN ('paid', 'product_exchange', 'hybrid', 'credits'));

ALTER TABLE public.marketplace_campaigns
  ADD COLUMN IF NOT EXISTS compensation_description text;

ALTER TABLE public.marketplace_campaigns
  ADD COLUMN IF NOT EXISTS product_value numeric(10,2);

-- Extended deadlines
ALTER TABLE public.marketplace_campaigns
  ADD COLUMN IF NOT EXISTS application_deadline timestamptz;

ALTER TABLE public.marketplace_campaigns
  ADD COLUMN IF NOT EXISTS content_deadline timestamptz;

ALTER TABLE public.marketplace_campaigns
  ADD COLUMN IF NOT EXISTS campaign_start_date timestamptz;

ALTER TABLE public.marketplace_campaigns
  ADD COLUMN IF NOT EXISTS campaign_end_date timestamptz;

-- Capacity
ALTER TABLE public.marketplace_campaigns
  ADD COLUMN IF NOT EXISTS max_applications integer;

ALTER TABLE public.marketplace_campaigns
  ADD COLUMN IF NOT EXISTS current_applications integer DEFAULT 0;

-- Configuration
ALTER TABLE public.marketplace_campaigns
  ADD COLUMN IF NOT EXISTS auto_approve_applications boolean DEFAULT false;

ALTER TABLE public.marketplace_campaigns
  ADD COLUMN IF NOT EXISTS requires_portfolio boolean DEFAULT true;

ALTER TABLE public.marketplace_campaigns
  ADD COLUMN IF NOT EXISTS allow_counter_offers boolean DEFAULT false;

ALTER TABLE public.marketplace_campaigns
  ADD COLUMN IF NOT EXISTS nda_required boolean DEFAULT false;

ALTER TABLE public.marketplace_campaigns
  ADD COLUMN IF NOT EXISTS usage_rights text DEFAULT 'platform_only'
    CHECK (usage_rights IN ('platform_only', 'social_media', 'all_channels', 'exclusive', 'custom'));

ALTER TABLE public.marketplace_campaigns
  ADD COLUMN IF NOT EXISTS usage_rights_description text;

-- Flags
ALTER TABLE public.marketplace_campaigns
  ADD COLUMN IF NOT EXISTS is_urgent boolean DEFAULT false;

ALTER TABLE public.marketplace_campaigns
  ADD COLUMN IF NOT EXISTS published_at timestamptz;

-- Content guidelines
ALTER TABLE public.marketplace_campaigns
  ADD COLUMN IF NOT EXISTS content_guidelines text;

ALTER TABLE public.marketplace_campaigns
  ADD COLUMN IF NOT EXISTS reference_urls text[] DEFAULT '{}';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_campaigns_visibility ON public.marketplace_campaigns(visibility);
CREATE INDEX IF NOT EXISTS idx_campaigns_org_id ON public.marketplace_campaigns(organization_id);

-- ============================================
-- 3. CREATE campaign_invitations
-- ============================================

CREATE TABLE IF NOT EXISTS public.campaign_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.marketplace_campaigns(id) ON DELETE CASCADE,
  invited_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  invited_by uuid NOT NULL REFERENCES auth.users(id),
  message text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
  sent_at timestamptz DEFAULT now(),
  responded_at timestamptz,
  expires_at timestamptz DEFAULT (now() + interval '7 days'),
  CONSTRAINT campaign_invitations_unique UNIQUE (campaign_id, invited_profile_id)
);

CREATE INDEX IF NOT EXISTS idx_invitations_campaign ON public.campaign_invitations(campaign_id);
CREATE INDEX IF NOT EXISTS idx_invitations_profile ON public.campaign_invitations(invited_profile_id);
CREATE INDEX IF NOT EXISTS idx_invitations_status ON public.campaign_invitations(status);

-- Enable RLS
ALTER TABLE public.campaign_invitations ENABLE ROW LEVEL SECURITY;

-- Triggers
CREATE OR REPLACE TRIGGER trigger_invitations_updated_at
  BEFORE UPDATE ON public.campaign_invitations
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================
-- 4. CREATE campaign_deliverables
-- ============================================

CREATE TABLE IF NOT EXISTS public.campaign_deliverables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.marketplace_campaigns(id) ON DELETE CASCADE,
  creator_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  application_id uuid REFERENCES public.campaign_applications(id) ON DELETE SET NULL,
  -- Content
  title varchar(200),
  description text,
  file_url text NOT NULL,
  file_type text DEFAULT 'video' CHECK (file_type IN ('video', 'image', 'document')),
  thumbnail_url text,
  duration_seconds integer,
  file_size_mb numeric(10,2),
  -- Revision tracking
  revision_number integer DEFAULT 1,
  max_revisions integer DEFAULT 2,
  -- Status
  status text NOT NULL DEFAULT 'submitted'
    CHECK (status IN ('submitted', 'revision_requested', 'approved', 'rejected')),
  feedback text,
  approved_by uuid REFERENCES auth.users(id),
  -- Timestamps
  submitted_at timestamptz DEFAULT now(),
  reviewed_at timestamptz,
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_deliverables_campaign ON public.campaign_deliverables(campaign_id);
CREATE INDEX IF NOT EXISTS idx_deliverables_creator ON public.campaign_deliverables(creator_id);
CREATE INDEX IF NOT EXISTS idx_deliverables_application ON public.campaign_deliverables(application_id);
CREATE INDEX IF NOT EXISTS idx_deliverables_status ON public.campaign_deliverables(status);

-- Enable RLS
ALTER TABLE public.campaign_deliverables ENABLE ROW LEVEL SECURITY;

-- Triggers
CREATE OR REPLACE TRIGGER trigger_deliverables_updated_at
  BEFORE UPDATE ON public.campaign_deliverables
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================
-- 5. RLS POLICIES
-- ============================================

-- ---- Drop & recreate campaign SELECT policy to add visibility logic ----
DROP POLICY IF EXISTS "Active campaigns are publicly readable" ON public.marketplace_campaigns;

CREATE POLICY "Campaigns visible based on visibility rules"
  ON public.marketplace_campaigns FOR SELECT
  USING (
    -- Creator of the campaign
    created_by = auth.uid()
    -- Brand member
    OR (brand_id IS NOT NULL AND public.is_brand_member(brand_id))
    -- Org member (always sees org campaigns)
    OR (organization_id IS NOT NULL AND public.is_org_member(organization_id))
    -- Public campaigns that are active/in_progress/completed
    OR (visibility = 'public' AND status IN ('active', 'in_progress', 'completed'))
    -- Selective campaigns: user is invited
    OR (
      visibility = 'selective'
      AND status IN ('active', 'in_progress', 'completed')
      AND EXISTS (
        SELECT 1 FROM public.campaign_invitations ci
        WHERE ci.campaign_id = marketplace_campaigns.id
          AND ci.invited_profile_id = auth.uid()
          AND ci.status IN ('pending', 'accepted')
      )
    )
  );

-- Update INSERT policy to allow org members to create campaigns
DROP POLICY IF EXISTS "Brand members can create campaigns" ON public.marketplace_campaigns;

CREATE POLICY "Brand or org members can create campaigns"
  ON public.marketplace_campaigns FOR INSERT
  WITH CHECK (
    auth.uid() = created_by
    AND (
      (brand_id IS NOT NULL AND public.is_brand_member(brand_id))
      OR (organization_id IS NOT NULL AND public.is_org_member(organization_id))
      OR (brand_id IS NULL AND organization_id IS NULL) -- Allow standalone creation
    )
  );

-- Update UPDATE policy
DROP POLICY IF EXISTS "Brand admins can update campaigns" ON public.marketplace_campaigns;

CREATE POLICY "Campaign owners can update campaigns"
  ON public.marketplace_campaigns FOR UPDATE
  USING (
    created_by = auth.uid()
    OR (brand_id IS NOT NULL AND public.is_brand_admin(brand_id))
    OR (organization_id IS NOT NULL AND public.is_org_admin(organization_id))
  )
  WITH CHECK (
    created_by = auth.uid()
    OR (brand_id IS NOT NULL AND public.is_brand_admin(brand_id))
    OR (organization_id IS NOT NULL AND public.is_org_admin(organization_id))
  );

-- Update DELETE policy
DROP POLICY IF EXISTS "Brand admins can delete draft campaigns" ON public.marketplace_campaigns;

CREATE POLICY "Admins can delete draft campaigns"
  ON public.marketplace_campaigns FOR DELETE
  USING (
    status = 'draft'
    AND (
      created_by = auth.uid()
      OR (brand_id IS NOT NULL AND public.is_brand_admin(brand_id))
      OR (organization_id IS NOT NULL AND public.is_org_admin(organization_id))
    )
  );

-- ---- campaign_invitations policies ----

CREATE POLICY "Invitation visible to invited user and campaign org"
  ON public.campaign_invitations FOR SELECT
  USING (
    invited_profile_id = auth.uid()
    OR invited_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.marketplace_campaigns mc
      WHERE mc.id = campaign_invitations.campaign_id
        AND (
          mc.created_by = auth.uid()
          OR (mc.brand_id IS NOT NULL AND public.is_brand_member(mc.brand_id))
          OR (mc.organization_id IS NOT NULL AND public.is_org_member(mc.organization_id))
        )
    )
  );

CREATE POLICY "Campaign managers can create invitations"
  ON public.campaign_invitations FOR INSERT
  WITH CHECK (
    auth.uid() = invited_by
    AND EXISTS (
      SELECT 1 FROM public.marketplace_campaigns mc
      WHERE mc.id = campaign_invitations.campaign_id
        AND (
          mc.created_by = auth.uid()
          OR (mc.brand_id IS NOT NULL AND public.is_brand_admin(mc.brand_id))
          OR (mc.organization_id IS NOT NULL AND public.is_org_admin(mc.organization_id))
        )
    )
  );

CREATE POLICY "Invited users can respond to invitations"
  ON public.campaign_invitations FOR UPDATE
  USING (
    invited_profile_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.marketplace_campaigns mc
      WHERE mc.id = campaign_invitations.campaign_id
        AND (
          mc.created_by = auth.uid()
          OR (mc.brand_id IS NOT NULL AND public.is_brand_admin(mc.brand_id))
          OR (mc.organization_id IS NOT NULL AND public.is_org_admin(mc.organization_id))
        )
    )
  );

CREATE POLICY "Campaign managers can delete invitations"
  ON public.campaign_invitations FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.marketplace_campaigns mc
      WHERE mc.id = campaign_invitations.campaign_id
        AND (
          mc.created_by = auth.uid()
          OR (mc.brand_id IS NOT NULL AND public.is_brand_admin(mc.brand_id))
          OR (mc.organization_id IS NOT NULL AND public.is_org_admin(mc.organization_id))
        )
    )
  );

-- ---- campaign_deliverables policies ----

CREATE POLICY "Deliverables visible to campaign participants"
  ON public.campaign_deliverables FOR SELECT
  USING (
    creator_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.marketplace_campaigns mc
      WHERE mc.id = campaign_deliverables.campaign_id
        AND (
          mc.created_by = auth.uid()
          OR (mc.brand_id IS NOT NULL AND public.is_brand_member(mc.brand_id))
          OR (mc.organization_id IS NOT NULL AND public.is_org_member(mc.organization_id))
        )
    )
  );

CREATE POLICY "Creators can submit deliverables"
  ON public.campaign_deliverables FOR INSERT
  WITH CHECK (
    auth.uid() = creator_id
    AND EXISTS (
      SELECT 1 FROM public.campaign_applications ca
      WHERE ca.id = campaign_deliverables.application_id
        AND ca.status IN ('approved', 'assigned')
    )
  );

CREATE POLICY "Participants can update deliverables"
  ON public.campaign_deliverables FOR UPDATE
  USING (
    creator_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.marketplace_campaigns mc
      WHERE mc.id = campaign_deliverables.campaign_id
        AND (
          mc.created_by = auth.uid()
          OR (mc.brand_id IS NOT NULL AND public.is_brand_admin(mc.brand_id))
          OR (mc.organization_id IS NOT NULL AND public.is_org_admin(mc.organization_id))
        )
    )
  );

-- ============================================
-- 6. GRANTS
-- ============================================

GRANT ALL ON public.campaign_invitations TO authenticated;
GRANT ALL ON public.campaign_deliverables TO authenticated;
