-- SECURITY DEFINER function to fetch org content efficiently.
-- Bypasses per-row RLS evaluation (18 policies with ~11 function calls per row).
-- Instead, checks organization membership ONCE, then returns content directly.

CREATE OR REPLACE FUNCTION get_org_content(
  p_organization_id uuid,
  p_role text DEFAULT NULL,
  p_user_id uuid DEFAULT NULL,
  p_client_id uuid DEFAULT NULL,
  p_creator_id uuid DEFAULT NULL,
  p_editor_id uuid DEFAULT NULL,
  p_limit int DEFAULT 500
)
RETURNS SETOF content
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_is_member boolean := false;
BEGIN
  -- 1. Check org membership via roles table (covers admin, creator, editor, etc.)
  SELECT EXISTS(
    SELECT 1 FROM organization_member_roles
    WHERE organization_id = p_organization_id
    AND user_id = v_uid
  ) INTO v_is_member;

  -- 2. If not a direct member, check client_users (covers client role)
  IF NOT v_is_member THEN
    SELECT EXISTS(
      SELECT 1 FROM client_users cu
      JOIN clients c ON c.id = cu.client_id
      WHERE c.organization_id = p_organization_id
      AND cu.user_id = v_uid
    ) INTO v_is_member;
  END IF;

  -- 3. Check root admin by email (platform owners)
  IF NOT v_is_member THEN
    SELECT EXISTS(
      SELECT 1 FROM auth.users
      WHERE id = v_uid
      AND email IN ('alexander@kreoon.com', 'admin@kreoon.com')
    ) INTO v_is_member;
  END IF;

  IF NOT v_is_member THEN
    -- Return empty set instead of raising exception (safer for frontend)
    RETURN;
  END IF;

  -- Return content with optional filters (NO per-row RLS evaluation)
  RETURN QUERY
  SELECT * FROM content c
  WHERE c.organization_id = p_organization_id
  AND (p_client_id IS NULL OR c.client_id = p_client_id)
  AND (p_creator_id IS NULL OR c.creator_id = p_creator_id)
  AND (p_editor_id IS NULL OR c.editor_id = p_editor_id)
  AND (
    -- If role is creator/editor, only show their assigned content
    p_role IS NULL
    OR p_role NOT IN ('creator', 'editor')
    OR (p_role = 'creator' AND c.creator_id = p_user_id)
    OR (p_role = 'editor' AND c.editor_id = p_user_id)
  )
  ORDER BY c.created_at DESC
  LIMIT p_limit;
END;
$$;

-- Grant execute to authenticated users (required for RPC calls)
GRANT EXECUTE ON FUNCTION get_org_content TO authenticated;
