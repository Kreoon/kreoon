-- ============================================================
-- Migration: Organization Marketplace Profile + Talent Recruitment
-- Adds org public profile fields, services, reviews, inquiries,
-- talent lists, and marketplace invitations.
-- ============================================================

-- 1. ALTER organizations: add org marketplace profile columns
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS org_profile_public boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS org_marketplace_visible boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS org_type text,
  ADD COLUMN IF NOT EXISTS org_display_name text,
  ADD COLUMN IF NOT EXISTS org_tagline text,
  ADD COLUMN IF NOT EXISTS org_cover_url text,
  ADD COLUMN IF NOT EXISTS org_gallery jsonb DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS org_specialties text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS org_team_size_range text,
  ADD COLUMN IF NOT EXISTS org_year_founded integer,
  ADD COLUMN IF NOT EXISTS org_website text,
  ADD COLUMN IF NOT EXISTS org_linkedin text,
  ADD COLUMN IF NOT EXISTS org_instagram text,
  ADD COLUMN IF NOT EXISTS org_tiktok text,
  ADD COLUMN IF NOT EXISTS org_min_budget numeric,
  ADD COLUMN IF NOT EXISTS org_max_budget numeric,
  ADD COLUMN IF NOT EXISTS org_budget_currency text DEFAULT 'COP',
  ADD COLUMN IF NOT EXISTS org_response_time text,
  ADD COLUMN IF NOT EXISTS org_marketplace_rating_avg numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS org_marketplace_rating_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS org_marketplace_projects_count integer DEFAULT 0;

-- Add CHECK constraint for org_type
DO $$ BEGIN
  ALTER TABLE public.organizations
    ADD CONSTRAINT organizations_org_type_check
    CHECK (org_type IS NULL OR org_type IN ('agency','studio','brand','independent'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Index for marketplace visibility queries
CREATE INDEX IF NOT EXISTS idx_organizations_marketplace_visible
  ON public.organizations (org_profile_public, org_marketplace_visible)
  WHERE org_profile_public = true AND org_marketplace_visible = true;

-- ============================================================
-- 2. org_services: Services offered by the organization
-- ============================================================
CREATE TABLE IF NOT EXISTS public.org_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  icon text NOT NULL DEFAULT '🎯',
  title text NOT NULL,
  description text,
  is_featured boolean DEFAULT false,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.org_services ENABLE ROW LEVEL SECURITY;

-- Org members can read their org's services
CREATE POLICY "org_services_member_select" ON public.org_services
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_members.organization_id = org_services.organization_id
      AND organization_members.user_id = auth.uid()
    )
  );

-- Public read for visible orgs (marketplace)
CREATE POLICY "org_services_public_read" ON public.org_services
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.organizations
      WHERE organizations.id = org_services.organization_id
      AND organizations.org_profile_public = true
      AND organizations.org_marketplace_visible = true
    )
  );

-- Org admins/owners can insert
CREATE POLICY "org_services_admin_insert" ON public.org_services
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_members.organization_id = org_services.organization_id
      AND organization_members.user_id = auth.uid()
      AND (organization_members.role = 'admin' OR organization_members.is_owner = true)
    )
  );

-- Org admins/owners can update
CREATE POLICY "org_services_admin_update" ON public.org_services
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_members.organization_id = org_services.organization_id
      AND organization_members.user_id = auth.uid()
      AND (organization_members.role = 'admin' OR organization_members.is_owner = true)
    )
  );

-- Org admins/owners can delete
CREATE POLICY "org_services_admin_delete" ON public.org_services
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_members.organization_id = org_services.organization_id
      AND organization_members.user_id = auth.uid()
      AND (organization_members.role = 'admin' OR organization_members.is_owner = true)
    )
  );

CREATE INDEX IF NOT EXISTS idx_org_services_org ON public.org_services(organization_id);
GRANT ALL ON public.org_services TO authenticated;

-- ============================================================
-- 3. org_reviews: Reviews of the organization
-- ============================================================
CREATE TABLE IF NOT EXISTS public.org_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  reviewer_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewer_name text NOT NULL,
  reviewer_avatar text,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text text NOT NULL,
  project_type text,
  is_published boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.org_reviews ENABLE ROW LEVEL SECURITY;

-- Public read for visible orgs
CREATE POLICY "org_reviews_public_read" ON public.org_reviews
  FOR SELECT USING (
    is_published = true AND EXISTS (
      SELECT 1 FROM public.organizations
      WHERE organizations.id = org_reviews.organization_id
      AND organizations.org_profile_public = true
    )
  );

-- Org members can see all reviews (including unpublished)
CREATE POLICY "org_reviews_member_select" ON public.org_reviews
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_members.organization_id = org_reviews.organization_id
      AND organization_members.user_id = auth.uid()
    )
  );

-- Authenticated users can insert reviews
CREATE POLICY "org_reviews_auth_insert" ON public.org_reviews
  FOR INSERT WITH CHECK (auth.uid() = reviewer_user_id);

-- Reviewer can update own review
CREATE POLICY "org_reviews_reviewer_update" ON public.org_reviews
  FOR UPDATE USING (auth.uid() = reviewer_user_id);

CREATE INDEX IF NOT EXISTS idx_org_reviews_org ON public.org_reviews(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_reviews_published ON public.org_reviews(organization_id, is_published) WHERE is_published = true;
GRANT ALL ON public.org_reviews TO authenticated;

-- ============================================================
-- 4. org_inquiries: Contact form submissions for org profile
-- ============================================================
CREATE TABLE IF NOT EXISTS public.org_inquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  sender_user_id uuid REFERENCES auth.users(id),
  sender_name text NOT NULL,
  sender_email text NOT NULL,
  sender_company text,
  sender_phone text,
  subject text NOT NULL,
  message text NOT NULL,
  inquiry_type text DEFAULT 'general' CHECK (inquiry_type IN ('general','collaboration','hiring','partnership','other')),
  budget_range text,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','reviewed','contacted','closed')),
  internal_notes text,
  assigned_to uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  reviewed_at timestamptz,
  contacted_at timestamptz,
  closed_at timestamptz
);

ALTER TABLE public.org_inquiries ENABLE ROW LEVEL SECURITY;

-- Anyone can submit an inquiry (public form) if org profile is public
CREATE POLICY "org_inquiries_public_insert" ON public.org_inquiries
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organizations
      WHERE organizations.id = org_inquiries.organization_id
      AND organizations.org_profile_public = true
    )
  );

-- Org members can read inquiries
CREATE POLICY "org_inquiries_member_select" ON public.org_inquiries
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_members.organization_id = org_inquiries.organization_id
      AND organization_members.user_id = auth.uid()
    )
  );

-- Org admins can update inquiries (status, notes, assign)
CREATE POLICY "org_inquiries_admin_update" ON public.org_inquiries
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_members.organization_id = org_inquiries.organization_id
      AND organization_members.user_id = auth.uid()
      AND (organization_members.role = 'admin' OR organization_members.is_owner = true)
    )
  );

CREATE INDEX IF NOT EXISTS idx_org_inquiries_org ON public.org_inquiries(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_inquiries_status ON public.org_inquiries(organization_id, status);
GRANT ALL ON public.org_inquiries TO authenticated;
GRANT INSERT ON public.org_inquiries TO anon;

-- ============================================================
-- 5. org_talent_lists: Talent curation lists
-- ============================================================
CREATE TABLE IF NOT EXISTS public.org_talent_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  color text DEFAULT '#8B5CF6',
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  member_count integer DEFAULT 0
);

ALTER TABLE public.org_talent_lists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "talent_lists_member_select" ON public.org_talent_lists
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_members.organization_id = org_talent_lists.organization_id
      AND organization_members.user_id = auth.uid()
    )
  );

CREATE POLICY "talent_lists_member_insert" ON public.org_talent_lists
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_members.organization_id = org_talent_lists.organization_id
      AND organization_members.user_id = auth.uid()
    )
  );

CREATE POLICY "talent_lists_member_update" ON public.org_talent_lists
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_members.organization_id = org_talent_lists.organization_id
      AND organization_members.user_id = auth.uid()
    )
  );

CREATE POLICY "talent_lists_member_delete" ON public.org_talent_lists
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_members.organization_id = org_talent_lists.organization_id
      AND organization_members.user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_talent_lists_org ON public.org_talent_lists(organization_id);
GRANT ALL ON public.org_talent_lists TO authenticated;

-- ============================================================
-- 6. org_talent_list_members: Creators in talent lists
-- ============================================================
CREATE TABLE IF NOT EXISTS public.org_talent_list_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id uuid NOT NULL REFERENCES public.org_talent_lists(id) ON DELETE CASCADE,
  creator_user_id uuid NOT NULL REFERENCES auth.users(id),
  added_by uuid NOT NULL REFERENCES auth.users(id),
  added_at timestamptz DEFAULT now(),
  notes text,
  UNIQUE(list_id, creator_user_id)
);

ALTER TABLE public.org_talent_list_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "talent_list_members_select" ON public.org_talent_list_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.org_talent_lists tl
      JOIN public.organization_members om ON om.organization_id = tl.organization_id
      WHERE tl.id = org_talent_list_members.list_id
      AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "talent_list_members_insert" ON public.org_talent_list_members
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.org_talent_lists tl
      JOIN public.organization_members om ON om.organization_id = tl.organization_id
      WHERE tl.id = org_talent_list_members.list_id
      AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "talent_list_members_delete" ON public.org_talent_list_members
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.org_talent_lists tl
      JOIN public.organization_members om ON om.organization_id = tl.organization_id
      WHERE tl.id = org_talent_list_members.list_id
      AND om.user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_talent_list_members_list ON public.org_talent_list_members(list_id);
CREATE INDEX IF NOT EXISTS idx_talent_list_members_creator ON public.org_talent_list_members(creator_user_id);
GRANT ALL ON public.org_talent_list_members TO authenticated;

-- Trigger to maintain member_count on org_talent_lists
CREATE OR REPLACE FUNCTION public.update_talent_list_member_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.org_talent_lists SET member_count = member_count + 1, updated_at = now()
    WHERE id = NEW.list_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.org_talent_lists SET member_count = GREATEST(member_count - 1, 0), updated_at = now()
    WHERE id = OLD.list_id;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_talent_list_member_count
AFTER INSERT OR DELETE ON public.org_talent_list_members
FOR EACH ROW EXECUTE FUNCTION public.update_talent_list_member_count();

-- ============================================================
-- 7. marketplace_org_invitations: Org-to-creator recruitment invitations
-- ============================================================
CREATE TABLE IF NOT EXISTS public.marketplace_org_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  creator_user_id uuid NOT NULL REFERENCES auth.users(id),
  invited_by uuid NOT NULL REFERENCES auth.users(id),
  message text,
  proposed_role text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','declined','cancelled')),
  created_at timestamptz DEFAULT now(),
  responded_at timestamptz,
  response_message text
);

ALTER TABLE public.marketplace_org_invitations ENABLE ROW LEVEL SECURITY;

-- Org members can see their org's invitations
CREATE POLICY "mkt_org_inv_org_select" ON public.marketplace_org_invitations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_members.organization_id = marketplace_org_invitations.organization_id
      AND organization_members.user_id = auth.uid()
    )
  );

-- Org members can create invitations
CREATE POLICY "mkt_org_inv_org_insert" ON public.marketplace_org_invitations
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_members.organization_id = marketplace_org_invitations.organization_id
      AND organization_members.user_id = auth.uid()
    )
  );

-- Org members can update (cancel) their org's invitations
CREATE POLICY "mkt_org_inv_org_update" ON public.marketplace_org_invitations
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_members.organization_id = marketplace_org_invitations.organization_id
      AND organization_members.user_id = auth.uid()
    )
  );

-- Creator can see their own invitations
CREATE POLICY "mkt_org_inv_creator_select" ON public.marketplace_org_invitations
  FOR SELECT USING (creator_user_id = auth.uid());

-- Creator can update their own invitations (accept/decline)
CREATE POLICY "mkt_org_inv_creator_update" ON public.marketplace_org_invitations
  FOR UPDATE USING (creator_user_id = auth.uid())
  WITH CHECK (creator_user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_mkt_org_inv_org ON public.marketplace_org_invitations(organization_id);
CREATE INDEX IF NOT EXISTS idx_mkt_org_inv_creator ON public.marketplace_org_invitations(creator_user_id);
CREATE INDEX IF NOT EXISTS idx_mkt_org_inv_status ON public.marketplace_org_invitations(organization_id, status);
GRANT ALL ON public.marketplace_org_invitations TO authenticated;

-- ============================================================
-- 8. SQL function for public org marketplace profile
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_marketplace_org_profile(org_slug text)
RETURNS TABLE (
  id uuid,
  name text,
  slug text,
  logo_url text,
  description text,
  org_display_name text,
  org_tagline text,
  org_type text,
  org_cover_url text,
  org_gallery jsonb,
  org_specialties text[],
  org_team_size_range text,
  org_year_founded integer,
  org_website text,
  org_linkedin text,
  org_instagram text,
  org_tiktok text,
  org_min_budget numeric,
  org_max_budget numeric,
  org_budget_currency text,
  org_response_time text,
  org_marketplace_rating_avg numeric,
  org_marketplace_rating_count integer,
  org_marketplace_projects_count integer,
  portfolio_color text,
  primary_color text
) LANGUAGE sql SECURITY DEFINER AS $$
  SELECT
    o.id, o.name, o.slug, o.logo_url, o.description,
    o.org_display_name, o.org_tagline, o.org_type,
    o.org_cover_url, o.org_gallery, o.org_specialties,
    o.org_team_size_range, o.org_year_founded,
    o.org_website, o.org_linkedin, o.org_instagram, o.org_tiktok,
    o.org_min_budget, o.org_max_budget, o.org_budget_currency,
    o.org_response_time,
    o.org_marketplace_rating_avg, o.org_marketplace_rating_count,
    o.org_marketplace_projects_count,
    o.portfolio_color, o.primary_color
  FROM public.organizations o
  WHERE o.slug = org_slug
    AND o.org_profile_public = true;
$$;

-- Function to list visible orgs in marketplace
CREATE OR REPLACE FUNCTION public.get_marketplace_orgs()
RETURNS TABLE (
  id uuid,
  slug text,
  org_display_name text,
  logo_url text,
  org_tagline text,
  org_type text,
  org_cover_url text,
  org_specialties text[],
  org_team_size_range text,
  org_marketplace_rating_avg numeric,
  org_marketplace_rating_count integer,
  org_marketplace_projects_count integer,
  org_min_budget numeric,
  org_max_budget numeric,
  org_budget_currency text,
  org_response_time text,
  portfolio_color text
) LANGUAGE sql SECURITY DEFINER AS $$
  SELECT
    o.id, o.slug,
    COALESCE(o.org_display_name, o.name) AS org_display_name,
    o.logo_url, o.org_tagline, o.org_type,
    o.org_cover_url, o.org_specialties, o.org_team_size_range,
    o.org_marketplace_rating_avg, o.org_marketplace_rating_count,
    o.org_marketplace_projects_count,
    o.org_min_budget, o.org_max_budget, o.org_budget_currency,
    o.org_response_time, o.portfolio_color
  FROM public.organizations o
  WHERE o.org_profile_public = true
    AND o.org_marketplace_visible = true
  ORDER BY o.org_marketplace_rating_avg DESC, o.name ASC;
$$;

-- Enable realtime for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.org_services;
ALTER PUBLICATION supabase_realtime ADD TABLE public.org_talent_lists;
ALTER PUBLICATION supabase_realtime ADD TABLE public.marketplace_org_invitations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.org_inquiries;
