-- Fix is_platform_admin() to also recognize users with is_platform_admin flag in profiles
-- and users who are platform admins via user_roles table

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
  v_email TEXT;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN false;
  END IF;

  -- 1. Check is_platform_admin flag in profiles table
  SELECT is_platform_admin INTO v_is_admin
  FROM profiles
  WHERE id = v_user_id;

  IF v_is_admin = true THEN
    RETURN true;
  END IF;

  -- 2. Check hardcoded admin emails
  SELECT email INTO v_email
  FROM auth.users
  WHERE id = v_user_id;

  IF v_email IN ('jacsolucionesgraficas@gmail.com', 'kairosgp.sas@gmail.com') THEN
    RETURN true;
  END IF;

  -- 3. Check if user has 'admin' role in user_roles (legacy check)
  IF EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = v_user_id AND role = 'admin'
  ) THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

-- Also ensure the portfolio_items delete policy is correct
DROP POLICY IF EXISTS "portfolio_items_delete_policy" ON public.portfolio_items;

CREATE POLICY "portfolio_items_delete_policy" ON public.portfolio_items
    FOR DELETE USING (
      -- Owner can delete their own items
      creator_id IN (SELECT id FROM creator_profiles WHERE user_id = auth.uid())
      -- Platform admins can delete any item
      OR is_platform_admin()
    );

-- Grant execute on the function
GRANT EXECUTE ON FUNCTION is_platform_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION is_platform_admin() TO anon;
