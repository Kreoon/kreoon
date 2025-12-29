-- Create helper function to check if user can see another user in list
CREATE OR REPLACE FUNCTION public.can_see_user_in_list(_org_id uuid, _source_user_id uuid, _target_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_source_role TEXT;
  v_target_role TEXT;
  rule_exists BOOLEAN;
  can_see_result BOOLEAN;
BEGIN
  -- Get source user role in org
  SELECT om.role INTO v_source_role
  FROM public.organization_members om
  WHERE om.organization_id = _org_id AND om.user_id = _source_user_id;
  
  IF v_source_role IS NULL THEN
    RETURN false;
  END IF;
  
  -- Get target user role in org
  SELECT om.role INTO v_target_role
  FROM public.organization_members om
  WHERE om.organization_id = _org_id AND om.user_id = _target_user_id;
  
  IF v_target_role IS NULL THEN
    RETURN false;
  END IF;
  
  -- Check if there's a specific rule
  SELECT EXISTS(
    SELECT 1 FROM public.chat_rbac_rules r
    WHERE r.organization_id = _org_id 
    AND r.source_role = v_source_role 
    AND r.target_role = v_target_role
  ) INTO rule_exists;
  
  IF rule_exists THEN
    SELECT r.can_see_in_list INTO can_see_result
    FROM public.chat_rbac_rules r
    WHERE r.organization_id = _org_id 
    AND r.source_role = v_source_role 
    AND r.target_role = v_target_role;
    RETURN can_see_result;
  END IF;
  
  -- Default rules if no explicit rule exists:
  -- Client can only see admin and strategist
  IF v_source_role = 'client' THEN
    RETURN v_target_role IN ('admin', 'strategist');
  END IF;
  
  -- Non-clients (editor, creator, etc.) cannot see clients
  IF v_source_role IN ('editor', 'creator', 'designer', 'trafficker') AND v_target_role = 'client' THEN
    RETURN false;
  END IF;
  
  -- Non-clients can see each other (internal team)
  IF v_source_role != 'client' AND v_target_role != 'client' THEN
    RETURN true;
  END IF;
  
  -- Admin and strategist can see everyone
  IF v_source_role IN ('admin', 'strategist') THEN
    RETURN true;
  END IF;
  
  RETURN true;
END;
$$;

-- Update get_chat_visible_users to filter by can_see_in_list
CREATE OR REPLACE FUNCTION public.get_chat_visible_users(_user_id uuid, _org_id uuid)
RETURNS TABLE(user_id uuid, can_chat boolean, can_add_to_group boolean)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- Get user's role
  SELECT role INTO user_role
  FROM public.organization_members
  WHERE organization_members.user_id = _user_id AND organization_id = _org_id;
  
  IF user_role IS NULL THEN
    RETURN;
  END IF;
  
  RETURN QUERY
  SELECT 
    om.user_id,
    public.can_chat_with_user(_org_id, _user_id, om.user_id) as can_chat,
    CASE 
      WHEN user_role = 'admin' THEN true
      WHEN user_role = 'client' THEN false
      ELSE (SELECT role FROM public.organization_members WHERE organization_members.user_id = om.user_id AND organization_id = _org_id) != 'client'
    END as can_add_to_group
  FROM public.organization_members om
  WHERE om.organization_id = _org_id
    AND om.user_id != _user_id
    AND public.can_see_user_in_list(_org_id, _user_id, om.user_id) = true;
END;
$$;