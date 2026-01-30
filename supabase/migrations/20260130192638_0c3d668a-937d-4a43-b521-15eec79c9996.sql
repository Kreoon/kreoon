-- Fix RLS policy on public.profiles: org members can view profiles in their org
-- This is required so creator/editor names can load in /board.

DROP POLICY IF EXISTS "Org members can view org profiles" ON public.profiles;

CREATE POLICY "Org members can view org profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  get_current_organization_id(auth.uid()) IS NOT NULL
  AND is_org_member(get_current_organization_id(auth.uid()), public.profiles.id)
);
