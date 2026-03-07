-- Fix is_platform_admin() to also check is_superadmin field from profiles

CREATE OR REPLACE FUNCTION is_platform_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_is_admin BOOLEAN := false;
  v_is_superadmin BOOLEAN := false;
  v_email TEXT;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN false;
  END IF;

  -- 1. Check is_platform_admin OR is_superadmin flag in profiles table
  SELECT
    COALESCE(is_platform_admin, false),
    COALESCE(is_superadmin, false)
  INTO v_is_admin, v_is_superadmin
  FROM profiles
  WHERE id = v_user_id;

  IF v_is_admin = true OR v_is_superadmin = true THEN
    RETURN true;
  END IF;

  -- 2. Check hardcoded admin emails
  SELECT email INTO v_email
  FROM auth.users
  WHERE id = v_user_id;

  IF v_email IN ('jacsolucionesgraficas@gmail.com', 'kairosgp.sas@gmail.com') THEN
    RETURN true;
  END IF;

  -- 3. Check if user has 'admin' role in user_roles (platform-level)
  IF EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = v_user_id AND role = 'admin'
  ) THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

-- Grant execute on the function
GRANT EXECUTE ON FUNCTION is_platform_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION is_platform_admin() TO anon;
