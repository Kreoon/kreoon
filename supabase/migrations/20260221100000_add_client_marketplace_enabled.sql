-- Add client_marketplace_enabled flag to organizations
-- Controls whether clients of the org can access the marketplace
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS client_marketplace_enabled boolean DEFAULT false;

COMMENT ON COLUMN public.organizations.client_marketplace_enabled
  IS 'When false, client users of this org cannot see or access the marketplace';

-- Must DROP first since return type changes (new column added)
DROP FUNCTION IF EXISTS public.get_user_org_context(uuid);

-- Recreate with client_marketplace_enabled in the return
CREATE OR REPLACE FUNCTION public.get_user_org_context(p_organization_id uuid)
RETURNS TABLE (
  is_owner boolean,
  org_name text,
  marketplace_enabled boolean,
  client_marketplace_enabled boolean,
  org_slug text,
  org_logo_url text,
  org_logo_dark_url text,
  org_favicon_url text,
  org_primary_color text,
  org_secondary_color text,
  org_platform_name text,
  org_sender_email text,
  org_sender_name text,
  org_support_email text,
  org_custom_domain text,
  org_resend_domain_verified boolean,
  org_pwa_icon_192_url text,
  org_pwa_icon_512_url text,
  org_og_image_url text,
  org_selected_plan text,
  org_white_label_config jsonb,
  org_timezone text
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT
    COALESCE(om.is_owner, false) AS is_owner,
    o.name::text AS org_name,
    COALESCE(o.marketplace_enabled, true) AS marketplace_enabled,
    COALESCE(o.client_marketplace_enabled, false) AS client_marketplace_enabled,
    o.slug::text,
    o.logo_url::text,
    o.logo_dark_url::text,
    o.favicon_url::text,
    COALESCE(o.primary_color, '#8B5CF6')::text,
    o.secondary_color::text,
    o.platform_name::text,
    o.sender_email::text,
    o.sender_name::text,
    o.support_email::text,
    o.custom_domain::text,
    COALESCE(o.resend_domain_verified, false),
    o.pwa_icon_192_url::text,
    o.pwa_icon_512_url::text,
    o.og_image_url::text,
    COALESCE(o.selected_plan, 'starter')::text,
    COALESCE(o.white_label_config, '{}'::jsonb),
    COALESCE(o.timezone, 'America/Bogota')::text AS org_timezone
  FROM organizations o
  LEFT JOIN organization_members om
    ON om.organization_id = o.id
    AND om.user_id = auth.uid()
  WHERE o.id = p_organization_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_org_context(uuid) TO authenticated;
NOTIFY pgrst, 'reload schema';
