-- Create a function to handle organization registration that bypasses RLS
CREATE OR REPLACE FUNCTION public.register_user_to_organization(
  p_organization_id UUID,
  p_user_id UUID,
  p_role TEXT DEFAULT 'creator'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert into organization_members
  INSERT INTO public.organization_members (organization_id, user_id, role, is_owner)
  VALUES (p_organization_id, p_user_id, p_role, false)
  ON CONFLICT (organization_id, user_id) DO NOTHING;
  
  -- Insert into organization_member_roles
  INSERT INTO public.organization_member_roles (organization_id, user_id, role)
  VALUES (p_organization_id, p_user_id, p_role)
  ON CONFLICT (organization_id, user_id, role) DO NOTHING;
  
  -- Update profile with current organization
  UPDATE public.profiles
  SET current_organization_id = p_organization_id,
      organization_status = 'pending'
  WHERE id = p_user_id;
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$;

-- Grant execute to anon and authenticated roles (needed for registration)
GRANT EXECUTE ON FUNCTION public.register_user_to_organization TO anon;
GRANT EXECUTE ON FUNCTION public.register_user_to_organization TO authenticated;