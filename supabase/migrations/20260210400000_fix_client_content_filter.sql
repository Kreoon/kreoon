-- Fix: get_org_content should filter content for client role
-- Previously: creators/editors saw only their assigned content, but clients saw ALL org content
-- Now: clients only see content belonging to their associated clients (via client_users junction)

CREATE OR REPLACE FUNCTION public.get_org_content(
  p_organization_id uuid,
  p_role text DEFAULT NULL,
  p_user_id uuid DEFAULT NULL,
  p_client_id uuid DEFAULT NULL,
  p_creator_id uuid DEFAULT NULL,
  p_editor_id uuid DEFAULT NULL,
  p_limit integer DEFAULT 500
)
RETURNS SETOF content
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_is_member boolean := false;
BEGIN
  -- Check org membership (roles table)
  SELECT EXISTS(
    SELECT 1 FROM organization_member_roles
    WHERE organization_id = p_organization_id AND user_id = v_uid
  ) INTO v_is_member;

  -- Check client_users junction (client access)
  IF NOT v_is_member THEN
    SELECT EXISTS(
      SELECT 1 FROM client_users cu
      JOIN clients c ON c.id = cu.client_id
      WHERE c.organization_id = p_organization_id AND cu.user_id = v_uid
    ) INTO v_is_member;
  END IF;

  -- Platform root fallback
  IF NOT v_is_member THEN
    SELECT EXISTS(
      SELECT 1 FROM auth.users
      WHERE id = v_uid AND email IN ('alexander@kreoon.com', 'admin@kreoon.com')
    ) INTO v_is_member;
  END IF;

  IF NOT v_is_member THEN
    RETURN;
  END IF;

  RETURN QUERY
    SELECT * FROM content c
    WHERE c.organization_id = p_organization_id
      AND (p_client_id IS NULL OR c.client_id = p_client_id)
      AND (p_creator_id IS NULL OR c.creator_id = p_creator_id)
      AND (p_editor_id IS NULL OR c.editor_id = p_editor_id)
      -- Role-based filtering
      AND (
        p_role IS NULL
        OR p_role NOT IN ('creator', 'editor', 'client')
        OR (p_role = 'creator' AND c.creator_id = p_user_id)
        OR (p_role = 'editor' AND c.editor_id = p_user_id)
        OR (p_role = 'client' AND c.client_id IN (
          SELECT cu.client_id FROM client_users cu WHERE cu.user_id = p_user_id
        ))
      )
    ORDER BY c.created_at DESC
    LIMIT p_limit;
END;
$function$;
