-- Add connection_method column to social_accounts
-- Tracks how the account was connected (e.g. 'facebook' for Meta Login, 'direct' for Instagram API)
ALTER TABLE social_accounts
ADD COLUMN IF NOT EXISTS connection_method TEXT DEFAULT 'default'
CHECK (connection_method IN ('default', 'facebook', 'direct'));

-- Update existing Meta-connected Instagram accounts to 'facebook' method
UPDATE social_accounts
SET connection_method = 'facebook'
WHERE platform = 'instagram'
  AND platform_page_id IS NOT NULL
  AND connection_method = 'default';

-- Update existing Facebook accounts to 'facebook' method
UPDATE social_accounts
SET connection_method = 'facebook'
WHERE platform = 'facebook'
  AND connection_method = 'default';

-- Index for filtering by connection method
CREATE INDEX IF NOT EXISTS idx_social_accounts_connection_method
ON social_accounts(connection_method)
WHERE is_active = true;

-- Update the get_org_social_accounts RPC to include connection_method
CREATE OR REPLACE FUNCTION get_org_social_accounts(p_org_id UUID)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  organization_id UUID,
  platform TEXT,
  platform_user_id TEXT,
  platform_username TEXT,
  platform_display_name TEXT,
  platform_avatar_url TEXT,
  platform_page_id TEXT,
  platform_page_name TEXT,
  is_active BOOLEAN,
  scopes TEXT[],
  token_expires_at TIMESTAMPTZ,
  connected_at TIMESTAMPTZ,
  last_synced_at TIMESTAMPTZ,
  last_error TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  owner_type TEXT,
  brand_id UUID,
  client_id UUID,
  account_type TEXT,
  settings JSONB,
  platform_metadata JSONB,
  connection_method TEXT,
  client_name TEXT,
  client_logo_url TEXT,
  groups JSONB,
  permissions JSONB
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    sa.id,
    sa.user_id,
    sa.organization_id,
    sa.platform,
    sa.platform_user_id,
    sa.platform_username,
    sa.platform_display_name,
    sa.platform_avatar_url,
    sa.platform_page_id,
    sa.platform_page_name,
    sa.is_active,
    sa.scopes,
    sa.token_expires_at,
    sa.connected_at,
    sa.last_synced_at,
    sa.last_error,
    sa.metadata,
    sa.created_at,
    sa.updated_at,
    sa.owner_type::TEXT,
    sa.brand_id,
    sa.client_id,
    sa.account_type::TEXT,
    sa.settings,
    sa.platform_metadata,
    sa.connection_method,
    c.name AS client_name,
    c.logo_url AS client_logo_url,
    COALESCE(
      (SELECT jsonb_agg(jsonb_build_object(
        'group_id', sag.group_id,
        'group_name', g.name,
        'group_color', g.color
      ))
      FROM social_account_group_members sag
      JOIN social_account_groups g ON g.id = sag.group_id
      WHERE sag.account_id = sa.id),
      '[]'::JSONB
    ) AS groups,
    COALESCE(
      (SELECT jsonb_agg(jsonb_build_object(
        'user_id', sap.user_id,
        'can_view', sap.can_view,
        'can_post', sap.can_post,
        'can_schedule', sap.can_schedule,
        'can_analytics', sap.can_analytics,
        'can_manage', sap.can_manage
      ))
      FROM social_account_permissions sap
      WHERE sap.account_id = sa.id),
      '[]'::JSONB
    ) AS permissions
  FROM social_accounts sa
  LEFT JOIN clients c ON c.id = sa.client_id
  WHERE sa.organization_id = p_org_id
    AND sa.is_active = true
  ORDER BY sa.platform, sa.connected_at DESC;
$$;

GRANT EXECUTE ON FUNCTION get_org_social_accounts(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_org_social_accounts(UUID) TO service_role;
