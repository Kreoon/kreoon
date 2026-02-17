-- =====================================================
-- Client Users RPCs for Unified Clients Page
-- Migration: 20260218200000_client_users_rpc
-- Provides: get_org_client_users, get_unassigned_client_members
-- Updated: Include all client-group roles (client, brand_manager, marketing_director)
-- =====================================================

-- =====================================================
-- get_org_client_users: Returns ALL org members with client-group
-- roles, with their linked companies aggregated as JSONB array.
-- Shows users even if they're not linked to any company.
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
  FROM organization_members om
  JOIN profiles p ON p.id = om.user_id
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
  ORDER BY p.full_name;
END;
$$;

GRANT EXECUTE ON FUNCTION get_org_client_users(uuid) TO authenticated;

-- =====================================================
-- get_unassigned_client_members: Returns org members with
-- client-group roles who are NOT linked to ANY company.
-- =====================================================

CREATE OR REPLACE FUNCTION get_unassigned_client_members(p_org_id uuid)
RETURNS TABLE (
  user_id uuid,
  full_name text,
  email text,
  avatar_url text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id AS user_id,
    p.full_name,
    p.email,
    p.avatar_url
  FROM organization_members om
  JOIN profiles p ON p.id = om.user_id
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
    AND NOT EXISTS (
      SELECT 1
      FROM client_users cu2
      JOIN clients c2 ON c2.id = cu2.client_id AND c2.organization_id = p_org_id
      WHERE cu2.user_id = om.user_id
    )
  ORDER BY p.full_name;
END;
$$;

GRANT EXECUTE ON FUNCTION get_unassigned_client_members(uuid) TO authenticated;
