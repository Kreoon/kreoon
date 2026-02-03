-- Fix 403: client_strategists - grants y políticas para org_member_roles y platform admins

-- 1. Grants explícitos
GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_strategists TO authenticated;

-- 2. Política: org members vía organization_member_roles pueden ver
DROP POLICY IF EXISTS "Org members can view client strategists" ON public.client_strategists;
CREATE POLICY "Org members can view client strategists"
ON public.client_strategists
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = client_strategists.organization_id
    AND om.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.organization_member_roles omr
    WHERE omr.organization_id = client_strategists.organization_id
    AND omr.user_id = auth.uid()
  )
);

-- 3. Política: platform admins pueden ver
CREATE POLICY "Platform admins can view client strategists"
ON public.client_strategists
FOR SELECT
USING (public.is_platform_admin(auth.uid()));
