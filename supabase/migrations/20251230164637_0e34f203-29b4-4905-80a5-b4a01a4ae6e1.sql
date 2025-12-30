-- Create organization social network settings table
CREATE TABLE public.organization_social_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  
  -- Global toggle: if false, all social features are org-only
  public_network_enabled BOOLEAN NOT NULL DEFAULT true,
  
  -- Per-section visibility toggles
  feed_public BOOLEAN NOT NULL DEFAULT true,        -- Feed "Para Ti" can see external public content
  explore_public BOOLEAN NOT NULL DEFAULT true,     -- Explore page can show external creators
  videos_public BOOLEAN NOT NULL DEFAULT true,      -- Videos page shows external videos
  profiles_public BOOLEAN NOT NULL DEFAULT true,    -- Members can view external public profiles
  
  -- Discovery settings
  allow_external_follow BOOLEAN NOT NULL DEFAULT true,      -- Members can follow external users
  allow_external_discovery BOOLEAN NOT NULL DEFAULT true,   -- Org members can be discovered by external users
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(organization_id)
);

-- Enable RLS
ALTER TABLE public.organization_social_settings ENABLE ROW LEVEL SECURITY;

-- Policies: org members can view, admins/owners can update
CREATE POLICY "Org members can view social settings"
ON public.organization_social_settings
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = organization_social_settings.organization_id
      AND om.user_id = auth.uid()
  )
);

CREATE POLICY "Org owners/admins can manage social settings"
ON public.organization_social_settings
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = organization_social_settings.organization_id
      AND om.user_id = auth.uid()
      AND (om.is_owner = true OR om.role = 'admin')
  )
);

-- Function to get social settings for a user (based on their current org)
CREATE OR REPLACE FUNCTION public.get_user_social_settings(_user_id uuid)
RETURNS public.organization_social_settings
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT oss.*
  FROM public.organization_social_settings oss
  INNER JOIN public.profiles p ON p.current_organization_id = oss.organization_id
  WHERE p.id = _user_id
  LIMIT 1;
$$;

-- Trigger to update updated_at
CREATE TRIGGER update_org_social_settings_updated_at
BEFORE UPDATE ON public.organization_social_settings
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Create default settings for existing organizations
INSERT INTO public.organization_social_settings (organization_id)
SELECT id FROM public.organizations
ON CONFLICT (organization_id) DO NOTHING;