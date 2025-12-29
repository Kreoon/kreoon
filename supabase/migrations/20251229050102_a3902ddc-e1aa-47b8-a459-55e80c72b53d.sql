-- =====================================================
-- FUNCIÓN: get_effective_permission (herencia global -> org)
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_effective_permission(
  _user_id UUID,
  _org_id UUID,
  _role TEXT,
  _module_key TEXT
)
RETURNS TABLE(can_view BOOLEAN, can_create BOOLEAN, can_modify BOOLEAN)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  org_perm RECORD;
  global_perm RECORD;
BEGIN
  -- First check org-level override
  SELECT orp.can_view, orp.can_create, orp.can_modify
  INTO org_perm
  FROM public.org_role_permissions orp
  WHERE orp.organization_id = _org_id
    AND orp.role = _role
    AND orp.module_key = _module_key;
  
  IF FOUND THEN
    RETURN QUERY SELECT org_perm.can_view, org_perm.can_create, org_perm.can_modify;
    RETURN;
  END IF;
  
  -- Fall back to global role_permissions
  SELECT rp.can_view, rp.can_create, rp.can_modify
  INTO global_perm
  FROM public.role_permissions rp
  WHERE rp.role = _role
    AND rp.module = _module_key;
  
  IF FOUND THEN
    RETURN QUERY SELECT global_perm.can_view, global_perm.can_create, global_perm.can_modify;
    RETURN;
  END IF;
  
  -- Default: no access
  RETURN QUERY SELECT false, false, false;
END;
$$;