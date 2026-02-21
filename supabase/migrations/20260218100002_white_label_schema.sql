-- ============================================================
-- White-Label Schema for Organizations
--
-- Adds columns to organizations for progressive white-label
-- support based on subscription plan tier:
--   org_starter  → logo + primary color only
--   org_pro      → full visual branding + sender name
--   org_enterprise → custom domain + custom email sender + auth
--
-- Also creates resolve_org_by_domain RPC for pre-auth branding
-- and extends get_user_org_context with white-label fields.
-- ============================================================

-- ─── New columns on organizations ──────────────────────────
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS custom_domain text,
  ADD COLUMN IF NOT EXISTS favicon_url text,
  ADD COLUMN IF NOT EXISTS logo_dark_url text,
  ADD COLUMN IF NOT EXISTS platform_name text,
  ADD COLUMN IF NOT EXISTS secondary_color text,
  ADD COLUMN IF NOT EXISTS sender_email text,
  ADD COLUMN IF NOT EXISTS sender_name text,
  ADD COLUMN IF NOT EXISTS support_email text,
  ADD COLUMN IF NOT EXISTS resend_domain_id text,
  ADD COLUMN IF NOT EXISTS resend_domain_verified boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS pwa_icon_192_url text,
  ADD COLUMN IF NOT EXISTS pwa_icon_512_url text,
  ADD COLUMN IF NOT EXISTS og_image_url text,
  ADD COLUMN IF NOT EXISTS white_label_config jsonb DEFAULT '{}'::jsonb;

-- Unique index on custom_domain (only non-null values)
CREATE UNIQUE INDEX IF NOT EXISTS idx_organizations_custom_domain
  ON organizations(custom_domain) WHERE custom_domain IS NOT NULL;

-- ─── resolve_org_by_domain RPC ─────────────────────────────
-- Public RPC callable without auth to resolve org branding
-- from hostname (for login page branding before authentication).
-- Matches by:
--   1. Exact custom_domain match
--   2. Slug = first segment of hostname (for orgslug.kreoon.com)
CREATE OR REPLACE FUNCTION public.resolve_org_by_domain(p_hostname text)
RETURNS TABLE (
  org_id uuid,
  org_name text,
  org_slug text,
  org_logo_url text,
  org_logo_dark_url text,
  org_favicon_url text,
  org_primary_color text,
  org_secondary_color text,
  org_platform_name text,
  org_og_image_url text,
  org_selected_plan text
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT
    o.id,
    o.name::text,
    o.slug::text,
    o.logo_url::text,
    o.logo_dark_url::text,
    o.favicon_url::text,
    COALESCE(o.primary_color, '#8B5CF6')::text,
    o.secondary_color::text,
    o.platform_name::text,
    o.og_image_url::text,
    COALESCE(o.selected_plan, 'starter')::text
  FROM organizations o
  WHERE
    -- Match by exact custom domain
    (o.custom_domain IS NOT NULL AND lower(o.custom_domain) = lower(p_hostname))
    OR
    -- Match by slug as subdomain (e.g., orgslug.kreoon.com → slug = orgslug)
    (o.slug = split_part(lower(p_hostname), '.', 1)
     AND p_hostname LIKE '%.kreoon.com'
     AND p_hostname != 'kreoon.com'
     AND p_hostname != 'www.kreoon.com')
  LIMIT 1;
$$;

-- Allow anonymous and authenticated users to call this
GRANT EXECUTE ON FUNCTION public.resolve_org_by_domain(text) TO anon;
GRANT EXECUTE ON FUNCTION public.resolve_org_by_domain(text) TO authenticated;

-- ─── Extend get_user_org_context RPC ───────────────────────
-- Drop and recreate to add white-label fields
CREATE OR REPLACE FUNCTION public.get_user_org_context(p_organization_id uuid)
RETURNS TABLE (
  is_owner boolean,
  org_name text,
  marketplace_enabled boolean,
  -- White-label fields
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
  org_white_label_config jsonb
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
    -- White-label fields
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
    COALESCE(o.white_label_config, '{}'::jsonb)
  FROM organizations o
  LEFT JOIN organization_members om
    ON om.organization_id = o.id
    AND om.user_id = auth.uid()
  WHERE o.id = p_organization_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_org_context(uuid) TO authenticated;
