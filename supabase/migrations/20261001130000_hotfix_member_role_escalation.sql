-- Hotfix de seguridad: escalada a admin por cualquier miembro (H2/H3 de 20260930100000, versión compatible
-- con el frontend de `main`). Verificado contra la base viva el 2026-10-01.
--
-- Antes:
--   · organization_member_roles: "Admins can manage roles" y "Admins can manage org roles" (ALL) con
--     USING organization_id IN get_my_organization_ids() → CUALQUIER miembro (un creador) podía insertar,
--     cambiar o borrar roles de su organización, incluido darse «admin».
--   · organization_members: "Admins can manage members" (ALL) con el mismo criterio.
--   · organization_members: "System can insert members on registration" → cualquier usuario podía
--     insertarse como miembro (creator) de CUALQUIER organización por PostgREST.
--
-- Después:
--   · Solo quien configura la organización (is_org_configurer: admin, dueño, estratega, líder) gestiona
--     miembros y roles; otorgar «admin» exige ser admin o dueño.
--   · Se conservan las políticas de dueño (registro que crea una organización nueva), de admin de
--     plataforma y de platform root. Las uniones a organizaciones existentes usan RPC SECURITY DEFINER
--     (register_user_to_organization, complete_creator_signup), que no dependen de estas políticas.
--
-- Reversión: recrear las tres políticas eliminadas (definición original en el comentario final).

CREATE OR REPLACE FUNCTION public._is_org_admin_or_owner(_user_id uuid, _org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT public.has_role(_user_id, 'admin'::app_role)
      OR public.is_org_owner(_user_id, _org_id)
      OR EXISTS (SELECT 1 FROM public.organization_members om
                  WHERE om.user_id = _user_id AND om.organization_id = _org_id AND om.role::text = 'admin')
      OR EXISTS (SELECT 1 FROM public.organization_member_roles omr
                  WHERE omr.user_id = _user_id AND omr.organization_id = _org_id AND omr.role::text = 'admin')
$$;
REVOKE ALL ON FUNCTION public._is_org_admin_or_owner(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public._is_org_admin_or_owner(uuid, uuid) TO authenticated, service_role;

-- ── organization_member_roles ────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admins can manage roles" ON public.organization_member_roles;
DROP POLICY IF EXISTS "Admins can manage org roles" ON public.organization_member_roles;

DROP POLICY IF EXISTS "Org configurers manage member roles" ON public.organization_member_roles;
CREATE POLICY "Org configurers manage member roles"
  ON public.organization_member_roles
  FOR ALL TO authenticated
  USING (public.is_org_configurer(auth.uid(), organization_id))
  WITH CHECK (
    public.is_org_configurer(auth.uid(), organization_id)
    AND (role::text <> 'admin' OR public._is_org_admin_or_owner(auth.uid(), organization_id))
  );

-- ── organization_members ─────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admins can manage members" ON public.organization_members;
DROP POLICY IF EXISTS "System can insert members on registration" ON public.organization_members;

DROP POLICY IF EXISTS "Org configurers manage members" ON public.organization_members;
CREATE POLICY "Org configurers manage members"
  ON public.organization_members
  FOR ALL TO authenticated
  USING (public.is_org_configurer(auth.uid(), organization_id))
  WITH CHECK (
    public.is_org_configurer(auth.uid(), organization_id)
    AND (role::text <> 'admin' OR public._is_org_admin_or_owner(auth.uid(), organization_id))
  );

NOTIFY pgrst, 'reload schema';

-- Definiciones previas (para reversión):
--   CREATE POLICY "Admins can manage roles" ON organization_member_roles FOR ALL
--     USING (organization_id IN (SELECT get_my_organization_ids()));
--   CREATE POLICY "Admins can manage org roles" ON organization_member_roles FOR ALL
--     USING (organization_id IN (SELECT get_my_organization_ids()));
--   CREATE POLICY "Admins can manage members" ON organization_members FOR ALL
--     USING (organization_id IN (SELECT get_my_organization_ids()));
--   CREATE POLICY "System can insert members on registration" ON organization_members FOR INSERT
--     WITH CHECK (user_id = auth.uid() AND role = 'creator'::app_role
--                 AND COALESCE(is_owner,false) = false AND COALESCE(is_ambassador,false) = false);
