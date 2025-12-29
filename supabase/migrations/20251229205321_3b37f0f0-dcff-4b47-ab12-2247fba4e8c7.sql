-- Drop and recreate function to fix ambiguous column reference
DROP FUNCTION IF EXISTS public.can_chat_with_user(uuid, uuid, uuid);

CREATE FUNCTION public.can_chat_with_user(_org_id uuid, _source_user_id uuid, _target_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_source_role TEXT;
  v_target_role TEXT;
  rule_exists BOOLEAN;
  can_chat_result BOOLEAN;
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
  
  -- Check if there's a specific rule using table alias to avoid ambiguity
  SELECT EXISTS(
    SELECT 1 FROM public.chat_rbac_rules r
    WHERE r.organization_id = _org_id 
    AND r.source_role = v_source_role 
    AND r.target_role = v_target_role
  ) INTO rule_exists;
  
  IF rule_exists THEN
    SELECT r.can_chat INTO can_chat_result
    FROM public.chat_rbac_rules r
    WHERE r.organization_id = _org_id 
    AND r.source_role = v_source_role 
    AND r.target_role = v_target_role;
    RETURN can_chat_result;
  END IF;
  
  -- Default: allow chat within same org
  RETURN true;
END;
$$;