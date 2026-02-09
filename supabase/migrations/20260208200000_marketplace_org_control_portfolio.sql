-- Migration: Marketplace org control + Public portfolio infrastructure
-- Adds marketplace_enabled toggle per organization and public portfolio fields

-- 1. Add marketplace_enabled and portfolio fields to organizations
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS marketplace_enabled boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS portfolio_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS portfolio_title text,
  ADD COLUMN IF NOT EXISTS portfolio_description text,
  ADD COLUMN IF NOT EXISTS portfolio_cover text,
  ADD COLUMN IF NOT EXISTS portfolio_color text DEFAULT '#8B5CF6';

-- 2. Create portfolio_inquiries table for contact form submissions
CREATE TABLE IF NOT EXISTS public.portfolio_inquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text NOT NULL,
  company text,
  phone text,
  message text NOT NULL,
  budget_range text,
  service_type text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'contacted', 'closed')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  notes text
);

-- 3. Enable RLS on portfolio_inquiries
ALTER TABLE public.portfolio_inquiries ENABLE ROW LEVEL SECURITY;

-- Anyone (including anonymous) can submit portfolio inquiries
CREATE POLICY "Anyone can submit portfolio inquiries"
  ON public.portfolio_inquiries FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

-- Org members can view their organization's inquiries
CREATE POLICY "Org members can view portfolio inquiries"
  ON public.portfolio_inquiries FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT om.organization_id
      FROM public.organization_members om
      WHERE om.user_id = auth.uid()
    )
  );

-- Org owners and admins can update inquiries
CREATE POLICY "Org admins can update portfolio inquiries"
  ON public.portfolio_inquiries FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT om.organization_id
      FROM public.organization_members om
      WHERE om.user_id = auth.uid()
        AND (om.is_owner = true OR om.role = 'admin')
    )
  );

-- Platform admins can manage all inquiries
CREATE POLICY "Platform admins manage all portfolio inquiries"
  ON public.portfolio_inquiries FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users u
      WHERE u.id = auth.uid()
        AND u.email IN ('jacsolucionesgraficas@gmail.com', 'kairosgp.sas@gmail.com')
    )
  );

-- 4. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_portfolio_inquiries_org
  ON public.portfolio_inquiries(organization_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_inquiries_status
  ON public.portfolio_inquiries(status);
CREATE INDEX IF NOT EXISTS idx_organizations_marketplace_enabled
  ON public.organizations(marketplace_enabled);
CREATE INDEX IF NOT EXISTS idx_organizations_portfolio_enabled
  ON public.organizations(portfolio_enabled)
  WHERE portfolio_enabled = true;

-- 5. Allow public (anon) to read organization data for public portfolio pages
-- Only expose necessary fields via a function
CREATE OR REPLACE FUNCTION public.get_public_org_portfolio(org_slug text)
RETURNS TABLE (
  id uuid,
  name text,
  slug text,
  logo_url text,
  description text,
  portfolio_enabled boolean,
  portfolio_title text,
  portfolio_description text,
  portfolio_cover text,
  portfolio_color text,
  primary_color text
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT
    o.id,
    o.name,
    o.slug,
    o.logo_url,
    o.description,
    o.portfolio_enabled,
    o.portfolio_title,
    o.portfolio_description,
    o.portfolio_cover,
    o.portfolio_color,
    o.primary_color
  FROM public.organizations o
  WHERE o.slug = org_slug
    AND o.portfolio_enabled = true
    AND o.is_blocked IS NOT TRUE;
$$;

-- 6. Function to get org members for public portfolio (only visible creators)
CREATE OR REPLACE FUNCTION public.get_portfolio_creators(org_id_param uuid)
RETURNS TABLE (
  user_id uuid,
  full_name text,
  avatar_url text,
  role text,
  joined_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT
    p.id as user_id,
    p.full_name,
    p.avatar_url,
    om.role::text,
    om.joined_at
  FROM public.organization_members om
  JOIN public.profiles p ON p.id = om.user_id
  WHERE om.organization_id = org_id_param
    AND om.role IN ('creator', 'editor', 'strategist')
  ORDER BY om.joined_at ASC;
$$;

-- 7. Add to realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.portfolio_inquiries;

-- 8. Grant permissions
GRANT ALL ON public.portfolio_inquiries TO authenticated;
GRANT INSERT ON public.portfolio_inquiries TO anon;
GRANT EXECUTE ON FUNCTION public.get_public_org_portfolio(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_portfolio_creators(uuid) TO anon, authenticated;
