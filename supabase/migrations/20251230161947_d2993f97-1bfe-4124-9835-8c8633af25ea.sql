-- Fix profiles SELECT policies to avoid recursion and support org-private social networks

-- Ensure RLS enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop problematic policies
DROP POLICY IF EXISTS "Users can view profiles in same organization" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can view public profiles" ON public.profiles;

-- Policy: Authenticated users can view public profiles, except users in orgs set to internal-only
-- (organization_members.visibility_scope defaults to 'org_only')
CREATE POLICY "Authenticated users can view public profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  is_public = true
  AND NOT EXISTS (
    SELECT 1
    FROM public.organization_members om
    WHERE om.user_id = auth.uid()
      AND om.visibility_scope IN ('org_only', 'private')
  )
);

-- Policy: Users in the same organization can view each other's profiles (internal network)
CREATE POLICY "Users can view profiles in same organization"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  current_organization_id IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM public.organization_members om
    WHERE om.user_id = auth.uid()
      AND om.organization_id = public.profiles.current_organization_id
  )
);
