-- ============================================================
-- Fix 404 org_role_permissions + 403 marketing_campaigns
-- ============================================================
-- 1. Ir a https://supabase.com/dashboard/project/wjkbqcrxwsmvtxmqgiqc/sql/new
-- 2. Pegar este script completo
-- 3. Ejecutar (Run)
-- ============================================================

-- ========== A. org_role_permissions (404 - tabla no existía) ==========
CREATE TABLE IF NOT EXISTS public.org_role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  module_key TEXT NOT NULL,
  can_view BOOLEAN NOT NULL DEFAULT true,
  can_create BOOLEAN NOT NULL DEFAULT false,
  can_modify BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, role, module_key)
);

ALTER TABLE public.org_role_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org configurers can manage org_role_permissions" ON public.org_role_permissions;
CREATE POLICY "Org configurers can manage org_role_permissions" ON public.org_role_permissions FOR ALL
USING (public.is_org_configurer(auth.uid(), organization_id))
WITH CHECK (public.is_org_configurer(auth.uid(), organization_id));

DROP POLICY IF EXISTS "Org members can view org_role_permissions" ON public.org_role_permissions;
CREATE POLICY "Org members can view org_role_permissions" ON public.org_role_permissions FOR SELECT
USING (
  public.is_org_member(auth.uid(), organization_id)
  OR EXISTS (SELECT 1 FROM public.organization_member_roles omr WHERE omr.organization_id = org_role_permissions.organization_id AND omr.user_id = auth.uid())
  OR public.is_platform_admin(auth.uid())
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.org_role_permissions TO authenticated;

-- ========== B. marketing_campaigns (403) ==========
-- 0. Schema (por si acaso)
GRANT USAGE ON SCHEMA public TO authenticated;

-- 1. Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.marketing_dashboard_config TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.traffic_channels TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.marketing_strategies TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.marketing_campaigns TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.marketing_clients TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.marketing_reports TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.marketing_ai_insights TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.traffic_sync_logs TO authenticated;

-- 2. RLS marketing_campaigns
DROP POLICY IF EXISTS "Org members can view campaigns" ON public.marketing_campaigns;
DROP POLICY IF EXISTS "Strategists and admins can manage campaigns" ON public.marketing_campaigns;

-- SELECT: org members vía organization_members O organization_member_roles, platform admins, client users
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

-- ALL: configurers y platform admins
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
