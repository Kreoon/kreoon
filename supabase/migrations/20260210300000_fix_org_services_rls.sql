-- Fix org_services RLS policies
-- Problem: policies used direct subqueries against organization_members which has
-- its own heavy RLS, causing recursive RLS evaluation → 403 on both SELECT and INSERT.
-- Fix: use existing SECURITY DEFINER helper functions that bypass organization_members RLS.

-- Drop existing policies
DROP POLICY IF EXISTS "org_services_member_select" ON public.org_services;
DROP POLICY IF EXISTS "org_services_public_read" ON public.org_services;
DROP POLICY IF EXISTS "org_services_admin_insert" ON public.org_services;
DROP POLICY IF EXISTS "org_services_admin_update" ON public.org_services;
DROP POLICY IF EXISTS "org_services_admin_delete" ON public.org_services;

-- SELECT: org members can read (SECURITY DEFINER — bypasses organization_members RLS)
CREATE POLICY "org_services_member_select" ON public.org_services
  FOR SELECT USING (is_org_member(organization_id));

-- SELECT: public read for visible orgs
CREATE POLICY "org_services_public_read" ON public.org_services
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.organizations
      WHERE organizations.id = org_services.organization_id
      AND organizations.org_profile_public = true
      AND organizations.org_marketplace_visible = true
    )
  );

-- INSERT: org admins/owners (SECURITY DEFINER helpers)
CREATE POLICY "org_services_admin_insert" ON public.org_services
  FOR INSERT WITH CHECK (
    is_org_owner(auth.uid(), organization_id)
    OR is_org_configurer(auth.uid(), organization_id)
  );

-- UPDATE: org admins/owners
CREATE POLICY "org_services_admin_update" ON public.org_services
  FOR UPDATE USING (
    is_org_owner(auth.uid(), organization_id)
    OR is_org_configurer(auth.uid(), organization_id)
  );

-- DELETE: org admins/owners
CREATE POLICY "org_services_admin_delete" ON public.org_services
  FOR DELETE USING (
    is_org_owner(auth.uid(), organization_id)
    OR is_org_configurer(auth.uid(), organization_id)
  );
