-- Relanzamiento Kreoon / UGC Colombia — Fase 2: registro publico de creadores por organizacion.
--
-- Principios:
--   * La organizacion se resuelve en el SERVIDOR a partir del slug (o alias). Nunca de localStorage
--     ni de user_metadata.
--   * El rol lo asigna el servidor: siempre content_creator. El cliente no lo elige.
--   * Visitar una URL NO concede membresia. La membresia solo se crea en complete_creator_signup,
--     que exige sesion, organizacion activa con inscripcion abierta y consentimientos vigentes.
--   * Idempotente: reintentos no duplican miembros, roles ni consentimientos.
--   * Una identidad de Auth ya miembro de otra organizacion NO se incorpora sola: requiere
--     confirmacion explicita (p_explicit = true) y solo se crea membresia/rol. No se copia
--     informacion de negocio entre organizaciones.

-- ─── Esquema ────────────────────────────────────────────────────────────────
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS is_default_registration_org boolean NOT NULL DEFAULT false;

-- A lo sumo UNA organizacion predeterminada para /registro y accesos genericos.
CREATE UNIQUE INDEX IF NOT EXISTS uq_organizations_default_registration
  ON public.organizations (is_default_registration_org)
  WHERE is_default_registration_org = true;

ALTER TABLE public.organization_members
  ADD COLUMN IF NOT EXISTS signup_attribution jsonb;

-- Alias de slug: enlaces antiguos siguen resolviendo a la misma organizacion (mismo ID).
CREATE TABLE IF NOT EXISTS public.organization_slug_aliases (
  alias text PRIMARY KEY CHECK (alias = lower(alias) AND alias ~ '^[a-z0-9][a-z0-9-]{1,62}$'),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.organization_slug_aliases ENABLE ROW LEVEL SECURITY;
-- Sin policies: solo se lee via get_registration_org (SECURITY DEFINER) y service_role.
REVOKE ALL ON public.organization_slug_aliases FROM PUBLIC, anon, authenticated;

-- ─── Resolucion interna ────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public._resolve_signup_org(p_slug text)
RETURNS public.organizations
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT o.*
  FROM organizations o
  WHERE o.id = COALESCE(
    (SELECT o1.id FROM organizations o1 WHERE o1.slug = lower(btrim(p_slug)) LIMIT 1),
    (SELECT a.organization_id FROM organization_slug_aliases a WHERE a.alias = lower(btrim(p_slug)) LIMIT 1)
  )
$$;
REVOKE ALL ON FUNCTION public._resolve_signup_org(text) FROM PUBLIC, anon, authenticated;

-- ─── get_registration_org: estado publico de inscripcion de una organizacion ─
-- status: open | closed | inactive | not_found. Sin fallback a otra organizacion.
CREATE OR REPLACE FUNCTION public.get_registration_org(p_slug text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  o organizations%ROWTYPE;
BEGIN
  IF p_slug IS NULL OR length(btrim(p_slug)) = 0 OR length(p_slug) > 64 THEN
    RETURN jsonb_build_object('status', 'not_found');
  END IF;

  o := public._resolve_signup_org(p_slug);

  IF o.id IS NULL THEN
    RETURN jsonb_build_object('status', 'not_found');
  END IF;

  IF o.deleted_at IS NOT NULL OR COALESCE(o.is_blocked, false) THEN
    RETURN jsonb_build_object('status', 'inactive');
  END IF;

  RETURN jsonb_build_object(
    'status', CASE WHEN COALESCE(o.is_registration_open, false) THEN 'open' ELSE 'closed' END,
    'organization', jsonb_build_object(
      'id', o.id,
      'slug', o.slug,
      'name', o.name,
      'logo_url', o.logo_url,
      'description', o.description
    )
  );
END;
$$;
REVOKE ALL ON FUNCTION public.get_registration_org(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_registration_org(text) TO anon, authenticated, service_role;

-- ─── get_default_registration_org: organizacion predeterminada del dominio raiz ─
CREATE OR REPLACE FUNCTION public.get_default_registration_org()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(
    (SELECT jsonb_build_object('slug', o.slug)
       FROM organizations o
      WHERE o.is_default_registration_org = true
        AND o.deleted_at IS NULL AND NOT COALESCE(o.is_blocked, false)
      LIMIT 1),
    jsonb_build_object('slug', NULL)
  )
$$;
REVOKE ALL ON FUNCTION public.get_default_registration_org() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_default_registration_org() TO anon, authenticated, service_role;

-- ─── Documentos requeridos para el registro de creador ─────────────────────
-- Fuente de verdad: legal_consent_requirements (trigger_event='registration') via
-- list_registration_documents('talent'). No se altera el contenido juridico.
CREATE OR REPLACE FUNCTION public.get_creator_signup_documents()
RETURNS TABLE (document_id uuid, document_type text, title text, version text, summary text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT d.document_id, d.document_type, d.title, d.version, d.summary
  FROM public.list_registration_documents('talent') d
$$;
REVOKE ALL ON FUNCTION public.get_creator_signup_documents() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_creator_signup_documents() TO anon, authenticated, service_role;

-- ─── complete_creator_signup: alta idempotente y transaccional ─────────────
-- Devuelve:
--   { status: 'joined' | 'already_member' | 'needs_confirmation', organization: {...} }
-- Lanza excepciones con codigo estable en el mensaje:
--   unauthorized | org_not_found | org_inactive | registration_closed | consents_required
CREATE OR REPLACE FUNCTION public.complete_creator_signup(
  p_slug text,
  p_accepted_document_ids uuid[] DEFAULT '{}',
  p_attribution jsonb DEFAULT NULL,
  p_explicit boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  o organizations%ROWTYPE;
  v_has_other boolean;
  v_already boolean;
  v_attr jsonb := NULL;
  v_missing text[];
  v_ip inet := NULL;
  v_ua text := NULL;
  v_headers json;
  v_key text;
  v_org_json jsonb;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  o := public._resolve_signup_org(p_slug);
  IF o.id IS NULL THEN
    RAISE EXCEPTION 'org_not_found';
  END IF;
  IF o.deleted_at IS NOT NULL OR COALESCE(o.is_blocked, false) THEN
    RAISE EXCEPTION 'org_inactive';
  END IF;

  v_org_json := jsonb_build_object('id', o.id, 'slug', o.slug, 'name', o.name, 'logo_url', o.logo_url);

  SELECT EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_id = o.id AND user_id = v_uid AND deleted_at IS NULL
  ) INTO v_already;

  -- Cuenta ya miembro: idempotente, sin nuevas escrituras de membresia.
  IF v_already THEN
    RETURN jsonb_build_object('status', 'already_member', 'organization', v_org_json);
  END IF;

  IF NOT COALESCE(o.is_registration_open, false) THEN
    RAISE EXCEPTION 'registration_closed';
  END IF;

  -- Identidad con membresias en OTRAS organizaciones: incorporacion solo con accion explicita.
  SELECT EXISTS (
    SELECT 1 FROM organization_members
    WHERE user_id = v_uid AND organization_id <> o.id AND deleted_at IS NULL
  ) INTO v_has_other;

  IF v_has_other AND NOT COALESCE(p_explicit, false) THEN
    RETURN jsonb_build_object('status', 'needs_confirmation', 'organization', v_org_json);
  END IF;

  -- Consentimientos: todos los documentos requeridos deben estar aceptados ahora o antes.
  SELECT array_agg(d.document_type ORDER BY d.document_type) INTO v_missing
  FROM public.list_registration_documents('talent') d
  WHERE NOT (d.document_id = ANY (COALESCE(p_accepted_document_ids, '{}')))
    AND NOT EXISTS (
      SELECT 1 FROM user_legal_consents c
      WHERE c.user_id = v_uid AND c.document_id = d.document_id AND c.accepted = true
    );

  IF v_missing IS NOT NULL THEN
    RAISE EXCEPTION 'consents_required: %', array_to_string(v_missing, ',');
  END IF;

  -- Metadatos de la aceptacion (mejor esfuerzo; no se inventan datos).
  BEGIN
    v_headers := current_setting('request.headers', true)::json;
    v_ua := left(v_headers->>'user-agent', 500);
    v_ip := NULLIF(btrim(split_part(COALESCE(v_headers->>'x-forwarded-for', ''), ',', 1)), '')::inet;
  EXCEPTION WHEN OTHERS THEN
    v_ip := NULL;
  END;

  INSERT INTO user_legal_consents (
    user_id, document_id, document_type, document_version,
    accepted, accepted_at, ip_address, user_agent, consent_method, is_current
  )
  SELECT v_uid, d.document_id, d.document_type, d.version,
         true, now(), v_ip, v_ua, 'registration', true
  FROM public.list_registration_documents('talent') d
  WHERE d.document_id = ANY (COALESCE(p_accepted_document_ids, '{}'))
  ON CONFLICT (user_id, document_id) DO NOTHING;

  -- Atribucion: lista blanca de claves, longitud acotada.
  IF p_attribution IS NOT NULL AND jsonb_typeof(p_attribution) = 'object' THEN
    FOREACH v_key IN ARRAY ARRAY['utm_source','utm_medium','utm_campaign','utm_content','utm_term','ref']
    LOOP
      IF p_attribution ? v_key AND jsonb_typeof(p_attribution->v_key) = 'string' THEN
        v_attr := COALESCE(v_attr, '{}'::jsonb)
                  || jsonb_build_object(v_key, left(p_attribution->>v_key, 100));
      END IF;
    END LOOP;
  END IF;

  INSERT INTO organization_members (organization_id, user_id, role, is_owner, signup_attribution)
  VALUES (o.id, v_uid, 'content_creator', false, v_attr)
  ON CONFLICT (organization_id, user_id) DO NOTHING;

  INSERT INTO organization_member_roles (organization_id, user_id, role)
  VALUES (o.id, v_uid, 'content_creator')
  ON CONFLICT (organization_id, user_id, role) DO NOTHING;

  -- Perfil: solo se fija el contexto si la cuenta aun no tiene uno. No se pisa la
  -- organizacion activa de una identidad con otras membresias.
  UPDATE profiles
  SET current_organization_id = COALESCE(current_organization_id, o.id),
      organization_status = COALESCE(organization_status, 'active'),
      active_role = COALESCE(active_role, 'content_creator'),
      is_active = true
  WHERE id = v_uid;

  RETURN jsonb_build_object('status', 'joined', 'organization', v_org_json);
END;
$$;
REVOKE ALL ON FUNCTION public.complete_creator_signup(text, uuid[], jsonb, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_creator_signup(text, uuid[], jsonb, boolean) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
