-- =====================================================
-- Fix: Allow authenticated users to view public profiles
-- This enables independent users to be discoverable
-- =====================================================

-- Drop existing restrictive policy for authenticated users if exists
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view profiles in same organization" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can view public profiles" ON public.profiles;

-- Policy 1: Users can always view their own profile
CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Policy 2: Authenticated users can view ANY public profile
-- This enables discovery of independent users like Susana
CREATE POLICY "Authenticated users can view public profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (is_public = true);

-- Policy 3: Users in the same organization can view each other's profiles
-- (regardless of is_public setting for internal visibility)
CREATE POLICY "Users can view profiles in same organization"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  current_organization_id IS NOT NULL 
  AND current_organization_id IN (
    SELECT current_organization_id 
    FROM public.profiles 
    WHERE id = auth.uid()
  )
);

-- Note: The anon policy "Anyone can view public profiles" already exists
-- and allows non-authenticated users to see public profiles