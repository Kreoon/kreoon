-- Relanzamiento Kreoon / UGC Colombia — Fase 1: cierre de rutas de alta y escalada.
--
-- Hallazgos verificados contra la base viva (proyecto wjkbqcrxwsmvtxmqgiqc, 2026-09-30):
--   H1  approve_join_request(uuid): SECURITY DEFINER, SIN chequeo de quien llama y con EXECUTE a anon.
--       Cualquiera (sin sesion) puede aprobar cualquier solicitud pendiente por su id.
--   H2  Policy "System can insert members on registration" (organization_members, INSERT, public):
--       user_id = auth.uid() AND role='creator' AND no owner. NO valida la organizacion, asi que
--       cualquier usuario se inserta como miembro de CUALQUIER organizacion por PostgREST.
--   H3  Policies "Admins can manage members" / "Admins can manage (org) roles" (ALL, authenticated):
--       organization_id IN get_my_organization_ids() = toda org donde el usuario es miembro.
--       En la practica cualquier miembro (un creador) tiene ALL sobre organization_members y
--       organization_member_roles => puede auto-asignarse admin. Con GRANT de INSERT/UPDATE/DELETE.
--   H4  register_user_to_organization: acepta cualquier org y cualquier app_role distinto de admin,
--       sin validar que la inscripcion este abierta.
--   H5  organizations: "Platform admins can manage all organizations" es ALL (incluye INSERT) para
--       cualquier user_roles.admin global. La creacion de organizaciones debe ser solo del propietario
--       de la plataforma (is_platform_root).
--
-- Esta migracion es aditiva y NO cambia datos. No se aplica a produccion sin autorizacion explicita.
-- Orden de despliegue recomendado: (1) desplegar el frontend nuevo, (2) aplicar esta migracion.

-- ─────────────────────────────────────────────────────────────────────────────
-- H1: approve_join_request exige admin/owner de la organizacion de la solicitud
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.approve_join_request(request_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_request RECORD;
  v_caller uuid := auth.uid();
  v_is_platform_root boolean;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  SELECT * INTO v_request
  FROM organization_join_requests
  WHERE id = request_id AND status = 'pending'
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  v_is_platform_root := public.is_platform_root(v_caller);

  IF NOT (
    v_is_platform_root
    OR EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = v_request.organization_id
        AND om.user_id = v_caller
        AND om.deleted_at IS NULL
        AND (om.is_owner OR om.role IN ('admin', 'team_leader'))
    )
  ) THEN
    RAISE EXCEPTION 'forbidden: only organization admins can approve requests';
  END IF;

  INSERT INTO organization_members (organization_id, user_id, role, is_owner, invited_by)
  VALUES (v_request.organization_id, v_request.user_id, v_request.requested_role, false, v_caller)
  ON CONFLICT (organization_id, user_id) DO NOTHING;

  INSERT INTO organization_member_roles (organization_id, user_id, role)
  VALUES (v_request.organization_id, v_request.user_id, v_request.requested_role)
  ON CONFLICT (organization_id, user_id, role) DO NOTHING;

  UPDATE organization_join_requests
  SET status = 'approved', reviewed_by = v_caller, reviewed_at = NOW(), updated_at = NOW()
  WHERE id = request_id;

  RETURN TRUE;
END;
$function$;

REVOKE ALL ON FUNCTION public.approve_join_request(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_join_request(uuid) TO authenticated, service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- H2: ya no se permite insertar membresias directamente desde el cliente.
-- La unica via publica es public.complete_creator_signup (migracion siguiente).
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "System can insert members on registration" ON public.organization_members;

-- ─────────────────────────────────────────────────────────────────────────────
-- H3: "Admins can manage ..." dejaba ALL a cualquier miembro. Se acota a admin/owner real.
-- Las policies de owner ("Org owners can manage members"/"... member roles") y de
-- platform root se conservan sin cambios.
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admins can manage members" ON public.organization_members;
-- El owner es intocable para admin/team_leader (USING incluye is_owner = false: ni degradarlo ni borrarlo).
CREATE POLICY "Org admins can manage non-owner members"
  ON public.organization_members
  FOR ALL TO authenticated
  USING (public.is_org_admin(organization_id) AND COALESCE(is_owner, false) = false)
  WITH CHECK (public.is_org_admin(organization_id) AND COALESCE(is_owner, false) = false);

DROP POLICY IF EXISTS "Admins can manage org roles" ON public.organization_member_roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON public.organization_member_roles;
CREATE POLICY "Org admins can manage member roles"
  ON public.organization_member_roles
  FOR ALL TO authenticated
  USING (
    public.is_org_admin(organization_id)
    AND NOT EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = organization_member_roles.organization_id
        AND om.user_id = organization_member_roles.user_id
        AND COALESCE(om.is_owner, false) = true)
  )
  WITH CHECK (public.is_org_admin(organization_id));

-- ─────────────────────────────────────────────────────────────────────────────
-- H4: register_user_to_organization queda como wrapper endurecido (compatibilidad):
--  * org activa con inscripcion abierta y SIN invitacion obligatoria, idempotente;
--  * creador: solo si ya acepto los documentos de registro (no es un camino sin consentimientos);
--  * client: solo cuentas de cliente/marca EXISTENTES (complete_onboarding legado lo llama para marcas
--    independientes sin organizacion); nunca para cuentas nuevas.
-- Sin callers nuevos: el frontend usa complete_creator_signup.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.register_user_to_organization(
  p_organization_id uuid,
  p_user_id uuid,
  p_role text DEFAULT 'content_creator'::text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
SET row_security TO 'off'
AS $function$
DECLARE
  v_org organizations%ROWTYPE;
  v_role public.app_role;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'forbidden: cannot register another user';
  END IF;

  IF p_role IN ('creator', 'content_creator') THEN
    v_role := 'content_creator';
  ELSIF p_role = 'client' THEN
    IF NOT (EXISTS (SELECT 1 FROM brand_members WHERE user_id = p_user_id)
            OR EXISTS (SELECT 1 FROM client_users WHERE user_id = p_user_id)) THEN
      RAISE EXCEPTION 'forbidden: client accounts are not created by public registration';
    END IF;
    v_role := 'client';
  ELSE
    RAISE EXCEPTION 'forbidden: role not allowed for self-registration';
  END IF;

  SELECT * INTO v_org FROM organizations WHERE id = p_organization_id;
  IF NOT FOUND
     OR v_org.deleted_at IS NOT NULL
     OR COALESCE(v_org.is_blocked, false)
     OR NOT COALESCE(v_org.is_registration_open, false)
     OR COALESCE(v_org.registration_require_invite, false) THEN
    RAISE EXCEPTION 'forbidden: organization is not open for registration';
  END IF;

  IF v_role = 'content_creator' AND EXISTS (
       SELECT 1 FROM public.list_registration_documents('talent') d
       WHERE NOT EXISTS (SELECT 1 FROM user_legal_consents c
                          WHERE c.user_id = p_user_id AND c.document_id = d.document_id AND c.accepted = true)) THEN
    RAISE EXCEPTION 'forbidden: registration consents are required';
  END IF;

  IF EXISTS (SELECT 1 FROM organization_members WHERE organization_id = p_organization_id AND user_id = p_user_id AND deleted_at IS NOT NULL) THEN
    RAISE EXCEPTION 'forbidden: membership was removed';
  END IF;

  INSERT INTO organization_members (organization_id, user_id, role, is_owner)
  VALUES (p_organization_id, p_user_id, v_role, false)
  ON CONFLICT (organization_id, user_id) DO NOTHING;

  INSERT INTO organization_member_roles (organization_id, user_id, role)
  VALUES (p_organization_id, p_user_id, v_role)
  ON CONFLICT (organization_id, user_id, role) DO NOTHING;

  UPDATE profiles
  SET current_organization_id = COALESCE(current_organization_id, p_organization_id),
      organization_status = 'active',
      active_role = COALESCE(active_role, v_role::text),
      is_active = true
  WHERE id = p_user_id;

  RETURN TRUE;
END;
$function$;

REVOKE ALL ON FUNCTION public.register_user_to_organization(uuid, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.register_user_to_organization(uuid, uuid, text) TO authenticated, service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- H5: crear organizaciones es exclusivo del propietario de la plataforma.
-- El ALL del admin global se separa en UPDATE/DELETE (sin INSERT).
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Platform admins can create organizations" ON public.organizations;
DROP POLICY IF EXISTS "Platform admins can manage all organizations" ON public.organizations;

CREATE POLICY "Platform root can create organizations"
  ON public.organizations
  FOR INSERT TO authenticated
  WITH CHECK (public.is_platform_root(auth.uid()));

CREATE POLICY "Platform admins can update organizations"
  ON public.organizations
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Platform admins can delete organizations"
  ON public.organizations
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

NOTIFY pgrst, 'reload schema';
