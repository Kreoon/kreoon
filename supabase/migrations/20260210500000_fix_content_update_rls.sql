-- Fix: Replace heavy ALL policies on content table with fast SECURITY DEFINER versions
-- Root cause: "Org members can manage content" calls get_my_organization_ids() (returns SET, re-evaluated per row)
--             "Platform admins can manage content" calls has_role() + get_current_organization_id() multiple times
-- These block ALL direct .from('content').update() calls (30+ across the codebase)

-- Step 0: Create is_content_org_member() that checks ALL membership tables
-- (organization_member_roles has 103 rows vs organization_members 83 rows — 15 users only in roles table)
CREATE OR REPLACE FUNCTION public.is_content_org_member(_user_id uuid, _org_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_member_roles
    WHERE user_id = _user_id AND organization_id = _org_id
  ) OR EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE user_id = _user_id AND organization_id = _org_id
  ) OR EXISTS (
    SELECT 1 FROM public.client_users cu
    JOIN public.clients c ON c.id = cu.client_id
    WHERE cu.user_id = _user_id AND c.organization_id = _org_id
  )
$$;

-- Step 1: Drop the two heavy ALL policies
DROP POLICY IF EXISTS "Org members can manage content" ON public.content;
DROP POLICY IF EXISTS "Platform admins can manage content in current org" ON public.content;

-- Also drop any previous versions of these policies (from earlier migration attempt)
DROP POLICY IF EXISTS "content_org_member_select" ON public.content;
DROP POLICY IF EXISTS "content_org_member_insert" ON public.content;
DROP POLICY IF EXISTS "content_org_member_update" ON public.content;
DROP POLICY IF EXISTS "content_org_member_delete" ON public.content;

-- Step 2: Add fast replacements using is_content_org_member() (single indexed EXISTS per row)

-- SELECT: org members can see their org's content
CREATE POLICY "content_org_member_select" ON public.content
  FOR SELECT
  USING (
    is_content_org_member(auth.uid(), organization_id)
    OR (organization_id IS NULL AND client_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM clients c
      JOIN organization_members om ON om.organization_id = c.organization_id
      WHERE c.id = content.client_id AND om.user_id = auth.uid()
    ))
  );

-- INSERT: org members can create content in their org
CREATE POLICY "content_org_member_insert" ON public.content
  FOR INSERT
  WITH CHECK (
    is_content_org_member(auth.uid(), organization_id)
  );

-- UPDATE: org members can update content in their org
CREATE POLICY "content_org_member_update" ON public.content
  FOR UPDATE
  USING (
    is_content_org_member(auth.uid(), organization_id)
    OR (organization_id IS NULL AND client_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM clients c
      JOIN organization_members om ON om.organization_id = c.organization_id
      WHERE c.id = content.client_id AND om.user_id = auth.uid()
    ))
  );

-- DELETE: org members can delete content in their org
CREATE POLICY "content_org_member_delete" ON public.content
  FOR DELETE
  USING (
    is_content_org_member(auth.uid(), organization_id)
    OR (organization_id IS NULL AND client_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM clients c
      JOIN organization_members om ON om.organization_id = c.organization_id
      WHERE c.id = content.client_id AND om.user_id = auth.uid()
    ))
  );
