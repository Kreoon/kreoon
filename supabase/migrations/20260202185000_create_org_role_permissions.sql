-- Crear tabla org_role_permissions (referenciada por get_effective_permission pero nunca creada)
-- Permite overrides de permisos por organización y rol

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

-- Org configurers can manage
CREATE POLICY "Org configurers can manage org_role_permissions"
ON public.org_role_permissions FOR ALL
USING (public.is_org_configurer(auth.uid(), organization_id))
WITH CHECK (public.is_org_configurer(auth.uid(), organization_id));

-- Org members can view
DROP POLICY IF EXISTS "Org members can view org_role_permissions" ON public.org_role_permissions;
CREATE POLICY "Org members can view org_role_permissions"
ON public.org_role_permissions FOR SELECT
USING (
  public.is_org_member(auth.uid(), organization_id)
  OR EXISTS (SELECT 1 FROM public.organization_member_roles omr WHERE omr.organization_id = org_role_permissions.organization_id AND omr.user_id = auth.uid())
  OR public.is_platform_admin(auth.uid())
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.org_role_permissions TO authenticated;
