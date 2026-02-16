-- Migration: Add is_superadmin field to profiles
-- Date: 2026-02-16
-- Description: Adds superadmin functionality for platform-wide access to all organizations

-- 1. Add is_superadmin column to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS is_superadmin BOOLEAN DEFAULT false NOT NULL;

-- 2. Create index for efficient superadmin queries
CREATE INDEX IF NOT EXISTS idx_profiles_is_superadmin
ON public.profiles(is_superadmin)
WHERE is_superadmin = true;

-- 3. Add comment for documentation
COMMENT ON COLUMN public.profiles.is_superadmin IS
'Platform superadmin flag: users with this flag can access and manage ANY organization without being a member. Used for platform administrators.';

-- 4. Create helper function to check if current user is superadmin
CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND is_superadmin = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 5. Grant function execution to authenticated users
GRANT EXECUTE ON FUNCTION public.is_superadmin() TO authenticated;

-- 6. Add comment to function
COMMENT ON FUNCTION public.is_superadmin() IS
'Returns true if the current authenticated user (auth.uid()) has is_superadmin = true in their profile. Used in RLS policies to allow superadmins to bypass organization-based restrictions.';

-- ============================================
-- MANUAL ASSIGNMENT (execute after identifying user IDs)
-- ============================================

-- Assign superadmin to jacsolucionesgraficas@gmail.com
-- UPDATE public.profiles
-- SET is_superadmin = true
-- WHERE email = 'jacsolucionesgraficas@gmail.com';

-- Assign superadmin to Brian (replace with actual email after identification)
-- UPDATE public.profiles
-- SET is_superadmin = true
-- WHERE email = 'brian@example.com';  -- REPLACE WITH BRIAN'S ACTUAL EMAIL

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Verify superadmins were assigned correctly:
-- SELECT id, email, full_name, is_superadmin, current_organization_id
-- FROM public.profiles
-- WHERE is_superadmin = true;
