-- Tighten multi-tenant isolation: make "public" profile/client/content visibility apply to anon only,
-- and scope platform admin access to the currently selected organization.

-- =========================
-- PROFILES
-- =========================
-- Replace overly permissive authenticated read policy
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- Allow authenticated users to view their own profile
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (id = auth.uid());

-- Allow authenticated users to view profiles of members in their current organization
CREATE POLICY "Org members can view org profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  public.get_current_organization_id(auth.uid()) IS NOT NULL
  AND public.is_org_member(
    id,
    public.get_current_organization_id(auth.uid())
  )
);

-- Public (anon) access only to public profiles
DROP POLICY IF EXISTS "Anyone can view public profiles" ON public.profiles;
CREATE POLICY "Anyone can view public profiles"
ON public.profiles
FOR SELECT
TO anon
USING (is_public = true);


-- =========================
-- CLIENTS
-- =========================
-- Public (anon) access only to public client profiles
DROP POLICY IF EXISTS "Anyone can view public client profiles" ON public.clients;
CREATE POLICY "Anyone can view public client profiles"
ON public.clients
FOR SELECT
TO anon
USING (is_public = true);


-- =========================
-- CONTENT
-- =========================
-- Public (anon) access only to published content
DROP POLICY IF EXISTS "Anyone can view published content" ON public.content;
CREATE POLICY "Anyone can view published content"
ON public.content
FOR SELECT
TO anon
USING (is_published = true);


-- =========================
-- ORGANIZATION MEMBERS
-- =========================
-- Scope platform admin broad policies to the currently selected organization
DROP POLICY IF EXISTS "Platform admins can view all members" ON public.organization_members;
CREATE POLICY "Platform admins can view members in current org"
ON public.organization_members
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  AND public.get_current_organization_id(auth.uid()) IS NOT NULL
  AND organization_id = public.get_current_organization_id(auth.uid())
);

DROP POLICY IF EXISTS "Platform admins can manage all members" ON public.organization_members;
CREATE POLICY "Platform admins can manage members in current org"
ON public.organization_members
FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  AND public.get_current_organization_id(auth.uid()) IS NOT NULL
  AND organization_id = public.get_current_organization_id(auth.uid())
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  AND public.get_current_organization_id(auth.uid()) IS NOT NULL
  AND organization_id = public.get_current_organization_id(auth.uid())
);
