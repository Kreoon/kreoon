-- =============================================================================
-- PROPUESTA (NO APLICAR TODAVÍA) — 03: RPC de registro de creador con aceptaciones v2
-- Destino futuro: supabase/migrations/<timestamp>_creator_signup_v2.sql
-- Depende de: 01, 02 y de la migración ya aplicada 20260930110000 (_resolve_signup_org).
--
-- Cambios frente a complete_creator_signup (v1, en producción):
--   * Acepta {version_id, content_sha256, statement_sha256} por documento: si el cliente vio una
--     versión distinta de la vigente → 'document_version_outdated' (no se registra nada).
--   * Registra organización de contexto, método derivado del token, flujo y client_request_id.
--   * Idempotente: el mismo client_request_id no duplica filas; un reintento tras éxito devuelve
--     'already_member'.
--   * Aceptaciones + membresía en UNA transacción: si falla una, no hay ninguna.
--   * No modifica v1: v1 sigue funcionando hasta que el frontend nuevo esté desplegado.
-- =============================================================================

BEGIN;

-- Documentos que exige el registro de creador (fuente única; cambiarla = nueva migración).
CREATE OR REPLACE FUNCTION public._creator_signup_required_keys()
RETURNS text[]
LANGUAGE sql IMMUTABLE
AS $$ SELECT ARRAY['creator_terms','privacy_policy']::text[] $$;

-- ─── Lectura pública: versiones vigentes que debe aceptar el registro ─────────
CREATE OR REPLACE FUNCTION public.get_creator_signup_documents_v2()
RETURNS TABLE (
  version_id uuid, document_key text, version text, title text,
  acceptance_kind text, acceptance_statement text,
  content_sha256 text, statement_sha256 text,
  effective_at timestamptz, notice_controller text, notice_contact text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT v.id, v.document_key, v.version, v.title, v.acceptance_kind, v.acceptance_statement,
         v.content_sha256, v.statement_sha256, v.effective_at, v.notice_controller, v.notice_contact
  FROM public.legal_document_versions v
  WHERE v.status = 'published'
    AND v.document_key = ANY (public._creator_signup_required_keys())
  ORDER BY array_position(public._creator_signup_required_keys(), v.document_key);
$$;
REVOKE ALL ON FUNCTION public.get_creator_signup_documents_v2() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_creator_signup_documents_v2() TO anon, authenticated, service_role;

-- ─── Método de autenticación derivado del token (no del cliente) ──────────────
CREATE OR REPLACE FUNCTION public._current_auth_method()
RETURNS text
LANGUAGE sql STABLE
AS $$
  SELECT CASE COALESCE(auth.jwt() -> 'app_metadata' ->> 'provider', '')
           WHEN 'google' THEN 'google_oauth'
           WHEN 'email'  THEN 'email_password'
           ELSE 'unknown'
         END
$$;

-- ─── Núcleo: valida e inserta aceptaciones (uso interno) ─────────────────────
-- p_acceptances: [{"version_id": uuid, "content_sha256": text, "statement_sha256": text}, ...]
-- Devuelve las claves que siguen faltando (vacío = todo aceptado).
CREATE OR REPLACE FUNCTION public._record_required_acceptances(
  p_uid uuid, p_org uuid, p_acceptances jsonb, p_client_request_id uuid, p_flow text
)
RETURNS text[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v record;
  a jsonb;
  v_missing text[] := '{}';
  v_ip inet := NULL;
  v_ua text := NULL;
  v_headers json;
  v_method text := public._current_auth_method();
BEGIN
  IF p_client_request_id IS NULL THEN
    RAISE EXCEPTION 'client_request_id_required';
  END IF;

  BEGIN
    v_headers := current_setting('request.headers', true)::json;
    v_ua := left(v_headers->>'user-agent', 500);
    v_ip := NULLIF(btrim(split_part(COALESCE(v_headers->>'x-forwarded-for', ''), ',', 1)), '')::inet;
  EXCEPTION WHEN OTHERS THEN
    v_ip := NULL;
  END;

  -- Versiones que el cliente dice haber aceptado pero ya no están vigentes → error explícito.
  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements(COALESCE(p_acceptances, '[]'::jsonb)) x
    LEFT JOIN public.legal_document_versions lv ON lv.id = (x->>'version_id')::uuid
    WHERE lv.id IS NULL OR lv.status <> 'published'
       OR lv.document_key <> ALL (public._creator_signup_required_keys())
  ) THEN
    RAISE EXCEPTION 'document_version_outdated';
  END IF;

  FOR v IN
    SELECT * FROM public.legal_document_versions
    WHERE status = 'published' AND document_key = ANY (public._creator_signup_required_keys())
  LOOP
    -- ¿Ya aceptada esta versión exacta y no revocada después?
    IF EXISTS (
      SELECT 1 FROM public.legal_acceptance_current c
      WHERE c.user_id = p_uid AND c.document_key = v.document_key
        AND c.document_version_id = v.id AND c.action = 'accept'
    ) THEN
      CONTINUE;
    END IF;

    SELECT x INTO a FROM jsonb_array_elements(COALESCE(p_acceptances, '[]'::jsonb)) x
    WHERE (x->>'version_id')::uuid = v.id
    LIMIT 1;

    IF a IS NULL THEN
      v_missing := v_missing || v.document_key;
      CONTINUE;
    END IF;

    -- El cliente debe haber visto exactamente este contenido y este texto de casilla.
    IF a->>'content_sha256' IS DISTINCT FROM v.content_sha256
       OR a->>'statement_sha256' IS DISTINCT FROM v.statement_sha256 THEN
      RAISE EXCEPTION 'document_version_outdated';
    END IF;

    INSERT INTO public.legal_acceptances (
      user_id, organization_id, document_version_id, document_key, document_version,
      content_sha256, statement_sha256, acceptance_kind, action, method, flow,
      client_request_id, ip_address, user_agent
    ) VALUES (
      p_uid, p_org, v.id, v.document_key, v.version,
      v.content_sha256, v.statement_sha256, v.acceptance_kind, 'accept', v_method, p_flow,
      p_client_request_id, v_ip, v_ua
    )
    ON CONFLICT (user_id, client_request_id, document_version_id) DO NOTHING;

    a := NULL;
  END LOOP;

  RETURN v_missing;
END;
$$;
REVOKE ALL ON FUNCTION public._record_required_acceptances(uuid, uuid, jsonb, uuid, text) FROM PUBLIC, anon, authenticated;

-- ─── RPC pública de alta ──────────────────────────────────────────────────────
-- Errores: unauthorized | org_not_found | org_inactive | registration_closed |
--          consents_required: <claves> | document_version_outdated | client_request_id_required
CREATE OR REPLACE FUNCTION public.complete_creator_signup_v2(
  p_slug text,
  p_acceptances jsonb,
  p_client_request_id uuid,
  p_flow text DEFAULT 'creator_signup_continue',
  p_attribution jsonb DEFAULT NULL,
  p_explicit boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  o organizations%ROWTYPE;
  v_has_other boolean;
  v_already boolean;
  v_missing text[];
  v_attr jsonb := NULL;
  v_key text;
  v_org_json jsonb;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'unauthorized'; END IF;
  IF p_flow NOT IN ('creator_signup','creator_signup_continue') THEN
    RAISE EXCEPTION 'invalid_flow';
  END IF;

  o := public._resolve_signup_org(p_slug);
  IF o.id IS NULL THEN RAISE EXCEPTION 'org_not_found'; END IF;
  IF o.deleted_at IS NOT NULL OR COALESCE(o.is_blocked, false) THEN RAISE EXCEPTION 'org_inactive'; END IF;
  v_org_json := jsonb_build_object('id', o.id, 'slug', o.slug, 'name', o.name, 'logo_url', o.logo_url);

  SELECT EXISTS (SELECT 1 FROM organization_members
                 WHERE organization_id = o.id AND user_id = v_uid AND deleted_at IS NULL)
    INTO v_already;

  IF NOT v_already THEN
    IF EXISTS (SELECT 1 FROM organization_members
               WHERE organization_id = o.id AND user_id = v_uid AND deleted_at IS NOT NULL) THEN
      RAISE EXCEPTION 'registration_closed';
    END IF;
    IF NOT COALESCE(o.is_registration_open, false) OR COALESCE(o.registration_require_invite, false) THEN
      RAISE EXCEPTION 'registration_closed';
    END IF;
    SELECT EXISTS (SELECT 1 FROM organization_members
                   WHERE user_id = v_uid AND organization_id <> o.id AND deleted_at IS NULL)
      INTO v_has_other;
    IF v_has_other AND NOT COALESCE(p_explicit, false) THEN
      RETURN jsonb_build_object('status', 'needs_confirmation', 'organization', v_org_json);
    END IF;
  END IF;

  -- Aceptaciones (si algo falla, se revierte todo, incluida la membresía).
  v_missing := public._record_required_acceptances(v_uid, o.id, p_acceptances, p_client_request_id, p_flow);
  IF array_length(v_missing, 1) IS NOT NULL THEN
    RAISE EXCEPTION 'consents_required: %', array_to_string(v_missing, ',');
  END IF;

  IF v_already THEN
    RETURN jsonb_build_object('status', 'already_member', 'organization', v_org_json);
  END IF;

  IF p_attribution IS NOT NULL AND jsonb_typeof(p_attribution) = 'object' THEN
    FOREACH v_key IN ARRAY ARRAY['utm_source','utm_medium','utm_campaign','utm_content','utm_term','ref'] LOOP
      IF p_attribution ? v_key AND jsonb_typeof(p_attribution->v_key) = 'string' THEN
        v_attr := COALESCE(v_attr, '{}'::jsonb) || jsonb_build_object(v_key, left(p_attribution->>v_key, 100));
      END IF;
    END LOOP;
  END IF;

  INSERT INTO organization_members (organization_id, user_id, role, is_owner, signup_attribution)
  VALUES (o.id, v_uid, 'content_creator', false, v_attr)
  ON CONFLICT (organization_id, user_id) DO NOTHING;

  INSERT INTO organization_member_roles (organization_id, user_id, role)
  VALUES (o.id, v_uid, 'content_creator')
  ON CONFLICT (organization_id, user_id, role) DO NOTHING;

  UPDATE profiles
  SET current_organization_id = COALESCE(current_organization_id, o.id),
      organization_status     = COALESCE(organization_status, 'active'),
      active_role             = COALESCE(active_role, 'content_creator'),
      legal_consents_completed = true,      -- respaldado por filas reales en legal_acceptances
      is_active               = true
  WHERE id = v_uid;

  RETURN jsonb_build_object('status', 'joined', 'organization', v_org_json);
END;
$$;
REVOKE ALL ON FUNCTION public.complete_creator_signup_v2(text, jsonb, uuid, text, jsonb, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_creator_signup_v2(text, jsonb, uuid, text, jsonb, boolean) TO authenticated, service_role;

-- ─── Reaceptación tras un cambio material (cuentas existentes) ────────────────
CREATE OR REPLACE FUNCTION public.accept_current_legal_documents(
  p_acceptances jsonb, p_client_request_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_org uuid;
  v_missing text[];
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'unauthorized'; END IF;
  SELECT current_organization_id INTO v_org FROM profiles WHERE id = v_uid;
  v_missing := public._record_required_acceptances(v_uid, v_org, p_acceptances, p_client_request_id, 'reacceptance_prompt');
  RETURN jsonb_build_object('missing', to_jsonb(v_missing));
END;
$$;
REVOKE ALL ON FUNCTION public.accept_current_legal_documents(jsonb, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accept_current_legal_documents(jsonb, uuid) TO authenticated, service_role;

-- ─── Estado legal de la persona (solo lectura) ────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_my_legal_status()
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'required', COALESCE(jsonb_agg(jsonb_build_object(
        'document_key', v.document_key,
        'version_id', v.id,
        'version', v.version,
        'title', v.title,
        'requires_reacceptance', v.requires_reacceptance,
        'accepted_version', c.document_version,
        'accepted_at', c.created_at,
        'is_current_accepted', (c.document_version_id = v.id AND c.action = 'accept')
      ) ORDER BY v.document_key), '[]'::jsonb)
  )
  FROM public.legal_document_versions v
  LEFT JOIN public.legal_acceptance_current c
         ON c.user_id = auth.uid() AND c.document_key = v.document_key
  WHERE auth.uid() IS NOT NULL
    AND v.status = 'published'
    AND v.document_key = ANY (public._creator_signup_required_keys());
$$;
REVOKE ALL ON FUNCTION public.get_my_legal_status() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_legal_status() TO authenticated, service_role;

COMMIT;
