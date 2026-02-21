-- =============================================================================
-- Fix anonymous (non-logged-in) marketplace access
-- =============================================================================
-- Problem: content table has SELECT policies with TO public that reference
-- client_users table. The anon role can't access client_users, causing
-- "permission denied for table client_users" (42501) even though the
-- "Anyone can view published content" policy would allow the read.
--
-- PostgreSQL evaluates ALL applicable PERMISSIVE policies, and if any
-- subquery references a table the role can't access, the entire query fails.
--
-- Fix: Change content SELECT policies from TO public → TO authenticated.
-- These policies all use auth.uid() which is NULL for anon anyway.
-- =============================================================================

-- 1. "Client users can view their content" — references client_users
DROP POLICY IF EXISTS "Client users can view their content" ON public.content;
CREATE POLICY "Client users can view their content" ON public.content
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM client_users
    WHERE client_users.client_id = content.client_id
    AND client_users.user_id = auth.uid()
  ));

-- 2. "Org members can view content" — calls is_org_configurer(), is_org_member()
DROP POLICY IF EXISTS "Org members can view content" ON public.content;
CREATE POLICY "Org members can view content" ON public.content
  FOR SELECT TO authenticated
  USING (
    is_org_configurer(auth.uid(), organization_id)
    OR is_org_member(auth.uid(), organization_id)
    OR creator_id = auth.uid()
    OR editor_id = auth.uid()
  );

-- 3. "Root admins by email can view all content" — calls is_root_by_jwt_email()
DROP POLICY IF EXISTS "Root admins by email can view all content" ON public.content;
CREATE POLICY "Root admins by email can view all content" ON public.content
  FOR SELECT TO authenticated
  USING (is_root_by_jwt_email());

-- 4. "Strategists can view assigned content" — uses auth.uid()
DROP POLICY IF EXISTS "Strategists can view assigned content" ON public.content;
CREATE POLICY "Strategists can view assigned content" ON public.content
  FOR SELECT TO authenticated
  USING (strategist_id = auth.uid());

-- 5. "content_org_member_select" — calls is_content_org_member()
DROP POLICY IF EXISTS "content_org_member_select" ON public.content;
CREATE POLICY "content_org_member_select" ON public.content
  FOR SELECT TO authenticated
  USING (is_content_org_member(auth.uid(), organization_id));

-- =============================================================================
-- Fix user_subscriptions for marketplace (anon needs to check paid plans)
-- =============================================================================

GRANT SELECT ON public.user_subscriptions TO anon;

CREATE POLICY "Anon can view active paid subscriptions"
  ON public.user_subscriptions
  FOR SELECT TO anon
  USING (status = 'active' AND plan != 'free');

-- =============================================================================
-- Force PostgREST to reload schema cache
-- =============================================================================
NOTIFY pgrst, 'reload schema';
