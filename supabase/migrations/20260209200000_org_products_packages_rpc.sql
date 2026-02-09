-- RPCs to replace massive .in('client_id', [...500+ UUIDs]) queries
-- which exceed HTTP URL length limits (400 Bad Request) and overload the DB.
-- These do the JOIN server-side with a single organization_id parameter.

-- 1. Get all products for an organization (used by ContentBoard filters)
CREATE OR REPLACE FUNCTION get_org_products(p_organization_id uuid)
RETURNS TABLE (id uuid, name text, client_id uuid, client_name text)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT p.id, p.name::text, p.client_id, c.name::text AS client_name
  FROM products p
  JOIN clients c ON c.id = p.client_id
  WHERE c.organization_id = p_organization_id
  ORDER BY p.name;
$$;

-- 2. Get active client packages for an organization (used by Dashboard billing)
-- Uses SETOF to match the exact table schema (avoids column mismatch issues)
CREATE OR REPLACE FUNCTION get_org_client_packages(p_organization_id uuid)
RETURNS SETOF client_packages
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT cp.*
  FROM client_packages cp
  JOIN clients c ON c.id = cp.client_id
  WHERE c.organization_id = p_organization_id
  AND cp.is_active = true;
$$;

-- Grant execute
GRANT EXECUTE ON FUNCTION get_org_products(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_org_client_packages(uuid) TO authenticated;
