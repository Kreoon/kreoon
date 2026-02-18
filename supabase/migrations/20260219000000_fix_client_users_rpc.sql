-- =====================================================
-- Fix: Client Users RPC - include users from client_users table
-- Migration: 20260219000000_fix_client_users_rpc
-- Problem: get_org_client_users only checks organization_members role
--          and organization_member_roles. Users linked via client_users
--          (company contacts) but without a client org role are invisible.
-- Fix: UNION with client_users to catch all company-linked users.
-- =====================================================

CREATE OR REPLACE FUNCTION get_org_client_users(p_org_id uuid)
RETURNS TABLE (
  user_id uuid,
  full_name text,
  email text,
  avatar_url text,
  phone text,
  city text,
  bio text,
  created_at timestamptz,
  linked_companies jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH client_user_ids AS (
    -- Part 1: Org members with client-group roles
    SELECT DISTINCT om.user_id
    FROM organization_members om
    WHERE om.organization_id = p_org_id
      AND (
        om.role IN ('client', 'brand_manager', 'marketing_director')
        OR EXISTS (
          SELECT 1 FROM organization_member_roles omr
          WHERE omr.organization_id = p_org_id
            AND omr.user_id = om.user_id
            AND omr.role IN ('client', 'brand_manager', 'marketing_director')
        )
      )

    UNION

    -- Part 2: Users linked via client_users to companies in this org
    -- (regardless of org membership or org role)
    SELECT DISTINCT cu.user_id
    FROM client_users cu
    JOIN clients c ON c.id = cu.client_id AND c.organization_id = p_org_id
  )
  SELECT
    p.id AS user_id,
    p.full_name,
    p.email,
    p.avatar_url,
    p.phone,
    p.city,
    p.bio,
    p.created_at,
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'client_id', c.id,
            'client_name', c.name,
            'role', COALESCE(cu.role, 'viewer')
          )
        )
        FROM client_users cu
        JOIN clients c ON c.id = cu.client_id AND c.organization_id = p_org_id
        WHERE cu.user_id = p.id
      ),
      '[]'::jsonb
    ) AS linked_companies
  FROM client_user_ids cui
  JOIN profiles p ON p.id = cui.user_id
  ORDER BY p.full_name;
END;
$$;

GRANT EXECUTE ON FUNCTION get_org_client_users(uuid) TO authenticated;
