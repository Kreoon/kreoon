-- ═══════════════════════════════════════════════════════════════════════════
-- Social Accounts: Client (Empresa) Association
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Add 'client' value to social_account_owner_type enum
ALTER TYPE social_account_owner_type ADD VALUE IF NOT EXISTS 'client';

-- 2. Add client_id column to social_accounts
ALTER TABLE social_accounts
  ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id) ON DELETE SET NULL;

-- 3. Unique partial index: max 1 active account per (client_id, platform)
CREATE UNIQUE INDEX IF NOT EXISTS idx_social_accounts_client_platform_unique
  ON social_accounts (client_id, platform)
  WHERE client_id IS NOT NULL AND is_active = true;

-- 4. Lookup index for client_id
CREATE INDEX IF NOT EXISTS idx_social_accounts_client_id
  ON social_accounts (client_id)
  WHERE client_id IS NOT NULL;

-- 5. Update get_org_social_accounts RPC to include client info
CREATE OR REPLACE FUNCTION get_org_social_accounts(p_org_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_agg(row_to_json(sa))
  INTO result
  FROM (
    SELECT
      sa.*,
      c.name AS client_name,
      c.logo_url AS client_logo_url,
      (
        SELECT json_agg(json_build_object(
          'group_id', g.id,
          'group_name', g.name,
          'group_color', g.color
        ))
        FROM social_account_group_members gm
        JOIN social_account_groups g ON g.id = gm.group_id
        WHERE gm.account_id = sa.id
      ) AS groups,
      (
        SELECT json_agg(json_build_object(
          'user_id', p.user_id,
          'can_view', p.can_view,
          'can_post', p.can_post,
          'can_schedule', p.can_schedule,
          'can_analytics', p.can_analytics,
          'can_manage', p.can_manage
        ))
        FROM social_account_permissions p
        WHERE p.account_id = sa.id
      ) AS permissions
    FROM social_accounts sa
    LEFT JOIN clients c ON c.id = sa.client_id
    WHERE sa.organization_id = p_org_id
      AND sa.is_active = true
    ORDER BY sa.platform, sa.platform_display_name
  ) sa;

  RETURN COALESCE(result, '[]'::json);
END;
$$;

-- 6. Grants
GRANT EXECUTE ON FUNCTION get_org_social_accounts(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_org_social_accounts(UUID) TO service_role;
