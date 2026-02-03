-- Fix 403: marketing_campaigns - grants y políticas para org_member_roles y platform admins

-- 1. Grants explícitos (todas las tablas de marketing)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.marketing_dashboard_config TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.traffic_channels TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.marketing_strategies TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.marketing_campaigns TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.traffic_sync_logs TO authenticated;

-- 2. marketing_campaigns RLS
DROP POLICY IF EXISTS "Org members can view campaigns" ON public.marketing_campaigns;
DROP POLICY IF EXISTS "Strategists and admins can manage campaigns" ON public.marketing_campaigns;

CREATE POLICY "Org members can view campaigns"
ON public.marketing_campaigns FOR SELECT
USING (
  EXISTS (SELECT 1 FROM public.organization_members om WHERE om.organization_id = marketing_campaigns.organization_id AND om.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.organization_member_roles omr WHERE omr.organization_id = marketing_campaigns.organization_id AND omr.user_id = auth.uid())
  OR public.is_platform_admin(auth.uid())
  OR (
    marketing_campaigns.marketing_client_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.marketing_clients mc
      INNER JOIN public.client_users cu ON cu.client_id = mc.client_id AND cu.user_id = auth.uid()
      WHERE mc.id = marketing_campaigns.marketing_client_id
    )
  )
);

CREATE POLICY "Strategists and admins can manage campaigns"
ON public.marketing_campaigns FOR ALL
USING (
  public.is_org_configurer(auth.uid(), marketing_campaigns.organization_id)
  OR public.is_platform_admin(auth.uid())
)
WITH CHECK (
  public.is_org_configurer(auth.uid(), marketing_campaigns.organization_id)
  OR public.is_platform_admin(auth.uid())
);
