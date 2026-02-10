-- Single RPC to replace 3 separate queries on every page load:
--   1. organization_members?select=is_owner (useOrgOwner)
--   2. organizations?select=name (useOrgOwner)
--   3. organizations?select=marketplace_enabled (useOrgMarketplace)
-- Reduces 3 round-trips to 1.

CREATE OR REPLACE FUNCTION get_user_org_context(p_organization_id uuid)
RETURNS TABLE (
  is_owner boolean,
  org_name text,
  marketplace_enabled boolean
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT
    COALESCE(om.is_owner, false) AS is_owner,
    o.name::text AS org_name,
    COALESCE(o.marketplace_enabled, true) AS marketplace_enabled
  FROM organizations o
  LEFT JOIN organization_members om
    ON om.organization_id = o.id
    AND om.user_id = auth.uid()
  WHERE o.id = p_organization_id;
$$;

GRANT EXECUTE ON FUNCTION get_user_org_context(uuid) TO authenticated;
