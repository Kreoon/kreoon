-- Fix broken RLS policy on public.profiles that prevented org members from reading other members' profiles
-- The existing policy calls is_org_member() with arguments in the wrong order.

DROP POLICY IF EXISTS "Org members can view org profiles" ON public.profiles;

-- Allow authenticated users to view profiles of members in their current organization
-- Uses the central membership check to avoid recursion.
CREATE POLICY "Org members can view org profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  get_current_organization_id(auth.uid()) IS NOT NULL
  AND is_org_member(get_current_organization_id(auth.uid()), profiles.id)
);
