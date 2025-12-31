-- Fix the register_user_to_organization function to use correct organization_status value
CREATE OR REPLACE FUNCTION public.register_user_to_organization(
  p_organization_id UUID,
  p_user_id UUID,
  p_role TEXT DEFAULT 'creator'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
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

  -- Update profile with correct status value (pending_assignment, not pending)
  UPDATE public.profiles
  SET current_organization_id = p_organization_id,
      organization_status = 'pending_assignment'
  WHERE id = p_user_id;

  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'REGISTER_USER_TO_ORG_FAILED: %', SQLERRM;
END;
$$;

-- Keep grants
GRANT EXECUTE ON FUNCTION public.register_user_to_organization TO anon;
GRANT EXECUTE ON FUNCTION public.register_user_to_organization TO authenticated;