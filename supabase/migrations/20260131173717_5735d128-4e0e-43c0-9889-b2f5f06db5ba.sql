-- Update register_user_to_organization to set active_role for immediate access
CREATE OR REPLACE FUNCTION public.register_user_to_organization(
  p_organization_id uuid, 
  p_user_id uuid, 
  p_role text DEFAULT 'creator'::text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
SET row_security TO 'off'
AS $function$
DECLARE
  v_role public.app_role;
BEGIN
  -- Validate role
  BEGIN
    v_role := p_role::public.app_role;
  EXCEPTION
    WHEN invalid_text_representation THEN
      RAISE EXCEPTION 'INVALID_ROLE: %', p_role;
  END;

  -- Insert into organization_members
  INSERT INTO public.organization_members (organization_id, user_id, role, is_owner)
  VALUES (p_organization_id, p_user_id, v_role, false)
  ON CONFLICT (organization_id, user_id) DO NOTHING;

  -- Insert into organization_member_roles
  INSERT INTO public.organization_member_roles (organization_id, user_id, role)
  VALUES (p_organization_id, p_user_id, v_role)
  ON CONFLICT (organization_id, user_id, role) DO NOTHING;

  -- Update profile with ACTIVE status AND active_role for immediate access
  UPDATE public.profiles
  SET current_organization_id = p_organization_id,
      organization_status = 'active',
      active_role = p_role,
      is_active = true
  WHERE id = p_user_id;

  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'REGISTER_USER_TO_ORG_FAILED: %', SQLERRM;
END;
$function$;