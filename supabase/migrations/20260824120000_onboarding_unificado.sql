-- ============================================================================
-- Onboarding unificado de empresas (2026-08-24)
-- ============================================================================
--
-- Objetivo: el admin crea la empresa PRIMERO y manda UN solo link. Ese link
-- (a) crea la cuenta del cliente en el paso 0 y (b) llega precargado con lo que
-- el admin ya escribió, así el cliente no vuelve a teclear nombre/correo/celular.
--
-- Piezas:
--   1. client_onboarding_forms.claimed_user_id / claimed_at — quién reclamó el
--      link creando su cuenta (lo escribe la edge client-onboarding-claim).
--   2. list_registration_documents(p_account_type) — documentos legales que un
--      tipo de cuenta debe aceptar al registrarse. Misma lógica de filtrado que
--      get_pending_consents pero SIN usuario (en el paso 0 aún no existe).
--   3. create_onboarding_form_for_client(p_client_id) — crea (o reutiliza) el
--      formulario vigente con form_data PRECARGADO desde la fila de clients.
--   4. create_client_with_onboarding(...) — alta de empresa + formulario en una
--      sola llamada atómica. Devuelve el token para armar el link al instante.
--   5. Requisitos legales de cliente: se deprecan brand_agreement,
--      escrow_payment_terms y live_shopping_terms (placeholders de <100 chars
--      que get_pending_consents mostraba a los clientes). Quedan
--      age_declaration + general_terms + client_agreement (v2, ver migración
--      20260824120100).
--   6. complete_onboarding: copia VERBATIM de la versión de producción. El repo
--      tenía drift (20260523180000 insertaba clients con full_name; prod no).
-- ============================================================================

-- ── 1. Quién reclamó el link ────────────────────────────────────────────────
ALTER TABLE public.client_onboarding_forms
  ADD COLUMN IF NOT EXISTS claimed_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS claimed_at timestamptz;

COMMENT ON COLUMN public.client_onboarding_forms.claimed_user_id IS
  'Usuario creado (o vinculado) desde el paso 0 del link de onboarding. NULL = nadie ha creado cuenta con este link todavía.';

-- ── 2. Documentos legales por tipo de cuenta (sin usuario) ──────────────────
CREATE OR REPLACE FUNCTION public.list_registration_documents(p_account_type text)
RETURNS TABLE (
  document_id uuid,
  document_type text,
  title text,
  version text,
  summary text,
  content_html text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ld.id, ld.document_type, ld.title, ld.version, ld.summary, ld.content_html
  FROM legal_documents ld
  WHERE ld.is_current = true
    AND EXISTS (
      SELECT 1
      FROM legal_consent_requirements lcr
      WHERE lcr.document_type = ld.document_type
        AND lcr.is_required = true
        AND lcr.trigger_event = 'registration'
        AND (lcr.account_type IS NULL OR lcr.account_type = p_account_type)
        AND (
          lcr.user_role = 'all'
          OR (p_account_type = 'client' AND lcr.user_role IN ('brand', 'client'))
          OR (p_account_type = 'talent' AND lcr.user_role IN ('creator', 'talent'))
          OR (p_account_type = 'organization' AND lcr.user_role = 'organization')
        )
    )
  ORDER BY
    (SELECT MIN(COALESCE(l2.display_order, 99))
       FROM legal_consent_requirements l2
      WHERE l2.document_type = ld.document_type
        AND l2.trigger_event = 'registration'),
    ld.document_type;
$$;

REVOKE ALL ON FUNCTION public.list_registration_documents(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_registration_documents(text) TO anon, authenticated, service_role;

-- ── 3. Formulario precargado para una empresa existente ─────────────────────
CREATE OR REPLACE FUNCTION public.create_onboarding_form_for_client(p_client_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client   public.clients%ROWTYPE;
  v_form     public.client_onboarding_forms%ROWTYPE;
  v_prefill  jsonb;
  v_aprobador jsonb;
  v_marca    jsonb;
  v_legal    jsonb;
  v_equipo   jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'forbidden: sesión requerida';
  END IF;

  SELECT * INTO v_client FROM public.clients WHERE id = p_client_id AND deleted_at IS NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'client_not_found';
  END IF;

  -- Mismo set de roles que la RLS de client_onboarding_forms (legacy + canónicos).
  IF NOT EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = v_client.organization_id
      AND om.user_id = auth.uid()
      AND om.role::text IN ('admin','team_leader','strategist','digital_strategist','creative_strategist')
  ) AND NOT EXISTS (
    SELECT 1 FROM public.organization_member_roles omr
    WHERE omr.organization_id = v_client.organization_id
      AND omr.user_id = auth.uid()
      AND omr.role::text IN ('admin','team_leader','strategist','digital_strategist','creative_strategist')
  ) THEN
    RAISE EXCEPTION 'forbidden: se requiere admin o estratega de la organización';
  END IF;

  -- Reutilizar el formulario vigente (no procesado, no vencido).
  SELECT * INTO v_form
  FROM public.client_onboarding_forms
  WHERE client_id = p_client_id
    AND status <> 'processed'
    AND expires_at > now()
  ORDER BY created_at DESC
  LIMIT 1;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'form_id', v_form.id,
      'token', v_form.token,
      'status', v_form.status,
      'expires_at', v_form.expires_at,
      'reused', true
    );
  END IF;

  -- Precarga desde la ficha: solo claves con valor (jsonb_strip_nulls).
  v_legal := jsonb_strip_nulls(jsonb_build_object(
    'razon_social',      COALESCE(NULLIF(v_client.legal_name, ''), NULLIF(v_client.name, '')),
    'tipo_documento',    NULLIF(v_client.document_type, ''),
    'nit',               NULLIF(v_client.document_number, ''),
    'representante',     NULLIF(v_client.legal_representative, ''),
    'correo_facturacion',NULLIF(v_client.billing_email, ''),
    'direccion_fiscal',  NULLIF(v_client.address, ''),
    'ciudad',            NULLIF(v_client.city, ''),
    'pais',              NULLIF(v_client.country, ''),
    'categoria',         NULLIF(v_client.category, ''),
    'descripcion',       NULLIF(v_client.bio, '')
  ));

  v_aprobador := jsonb_strip_nulls(jsonb_build_object(
    'nombre',  NULLIF(v_client.main_contact, ''),
    'correo',  NULLIF(v_client.contact_email, ''),
    'celular', COALESCE(NULLIF(v_client.contact_phone, ''), NULLIF(v_client.whatsapp_phone, ''))
  ));

  v_equipo := jsonb_strip_nulls(jsonb_build_object(
    'aprobador',     CASE WHEN v_aprobador = '{}'::jsonb THEN NULL ELSE v_aprobador END,
    'correo_portal', NULLIF(v_client.contact_email, '')
  ));

  v_marca := jsonb_strip_nulls(jsonb_build_object(
    'instagram', NULLIF(v_client.instagram, ''),
    'tiktok',    NULLIF(v_client.tiktok, ''),
    'facebook',  NULLIF(v_client.facebook, ''),
    'linkedin',  NULLIF(v_client.linkedin, ''),
    'website',   NULLIF(v_client.website, '')
  ));

  v_prefill := jsonb_strip_nulls(jsonb_build_object(
    'legal',  CASE WHEN v_legal  = '{}'::jsonb THEN NULL ELSE v_legal  END,
    'equipo', CASE WHEN v_equipo = '{}'::jsonb THEN NULL ELSE v_equipo END,
    'marca',  CASE WHEN v_marca  = '{}'::jsonb THEN NULL ELSE v_marca  END
  ));

  INSERT INTO public.client_onboarding_forms (organization_id, client_id, created_by, form_data)
  VALUES (v_client.organization_id, p_client_id, auth.uid(), COALESCE(v_prefill, '{}'::jsonb))
  RETURNING * INTO v_form;

  RETURN jsonb_build_object(
    'form_id', v_form.id,
    'token', v_form.token,
    'status', v_form.status,
    'expires_at', v_form.expires_at,
    'reused', false
  );
END;
$$;

REVOKE ALL ON FUNCTION public.create_onboarding_form_for_client(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_onboarding_form_for_client(uuid) TO authenticated;

-- ── 4. Alta de empresa + formulario en una sola llamada ─────────────────────
CREATE OR REPLACE FUNCTION public.create_client_with_onboarding(
  p_organization_id uuid,
  p_name text,
  p_contact_name text DEFAULT NULL,
  p_contact_email text DEFAULT NULL,
  p_contact_phone text DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client_id uuid;
  v_form jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'forbidden: sesión requerida';
  END IF;

  IF p_name IS NULL OR length(btrim(p_name)) < 2 THEN
    RAISE EXCEPTION 'invalid_name: el nombre de la empresa es requerido';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = p_organization_id
      AND om.user_id = auth.uid()
      AND om.role::text IN ('admin','team_leader','strategist','digital_strategist','creative_strategist')
  ) AND NOT EXISTS (
    SELECT 1 FROM public.organization_member_roles omr
    WHERE omr.organization_id = p_organization_id
      AND omr.user_id = auth.uid()
      AND omr.role::text IN ('admin','team_leader','strategist','digital_strategist','creative_strategist')
  ) THEN
    RAISE EXCEPTION 'forbidden: se requiere admin o estratega de la organización';
  END IF;

  INSERT INTO public.clients (
    organization_id, name, main_contact, contact_email, contact_phone, whatsapp_phone,
    notes, created_by, is_public, is_internal_brand
  ) VALUES (
    p_organization_id,
    btrim(p_name),
    NULLIF(btrim(COALESCE(p_contact_name, '')), ''),
    NULLIF(lower(btrim(COALESCE(p_contact_email, ''))), ''),
    NULLIF(btrim(COALESCE(p_contact_phone, '')), ''),
    NULLIF(btrim(COALESCE(p_contact_phone, '')), ''),
    NULLIF(btrim(COALESCE(p_notes, '')), ''),
    auth.uid(),
    false,
    false
  )
  RETURNING id INTO v_client_id;

  v_form := public.create_onboarding_form_for_client(v_client_id);

  RETURN jsonb_build_object('client_id', v_client_id) || v_form;
END;
$$;

REVOKE ALL ON FUNCTION public.create_client_with_onboarding(uuid, text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_client_with_onboarding(uuid, text, text, text, text, text) TO authenticated;

-- ── 5. Requisitos legales del cliente: fuera los placeholders ───────────────
UPDATE public.legal_consent_requirements
SET trigger_event = 'deprecated', is_required = false, display_order = 999
WHERE (document_type = 'brand_agreement' AND user_role = 'all' AND account_type = 'client')
   OR (document_type = 'escrow_payment_terms' AND user_role = 'brand')
   OR (document_type = 'live_shopping_terms' AND user_role = 'brand');

-- ── 6. complete_onboarding: alineación repo ↔ producción (sin cambio de comportamiento)
CREATE OR REPLACE FUNCTION public.complete_onboarding(p_user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_profile_exists  BOOLEAN;
  v_pending_count   INT := 0;
  v_user_type       TEXT;
  v_org_id          UUID;
  v_valid_role      public.app_role;
BEGIN
  -- Guardia: nadie completa el onboarding de otro usuario.
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'forbidden: cannot complete onboarding for another user';
  END IF;

  SELECT EXISTS(SELECT 1 FROM profiles WHERE id = p_user_id) INTO v_profile_exists;

  IF NOT v_profile_exists THEN
    RAISE WARNING 'complete_onboarding: perfil no existe para %', p_user_id;
    RETURN false;
  END IF;

  BEGIN
    SELECT COUNT(*) INTO v_pending_count
    FROM get_pending_consents(p_user_id)
    WHERE is_required = true;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'complete_onboarding: error get_pending_consents: %', SQLERRM;
    v_pending_count := 0;
  END;

  IF v_pending_count > 0 THEN
    RAISE WARNING 'complete_onboarding: % docs pendientes (continuando igual)', v_pending_count;
  END IF;

  UPDATE profiles SET
    profile_completed           = true,
    profile_completed_at        = COALESCE(profile_completed_at, NOW()),
    legal_consents_completed    = true,
    legal_consents_completed_at = COALESCE(legal_consents_completed_at, NOW()),
    onboarding_completed        = true,
    onboarding_completed_at     = NOW(),
    platform_access_unlocked    = true,
    updated_at                  = NOW()
  WHERE id = p_user_id
  RETURNING user_type INTO v_user_type;

  IF NOT FOUND THEN
    RAISE WARNING 'complete_onboarding: UPDATE no afectó filas para %', p_user_id;
    RETURN false;
  END IF;

  SELECT current_organization_id INTO v_org_id
  FROM profiles WHERE id = p_user_id;

  IF v_org_id IS NULL THEN
    SELECT id INTO v_org_id FROM organizations ORDER BY created_at LIMIT 1;

    IF v_org_id IS NOT NULL THEN
      -- El rol otorgado se deriva SIEMPRE de user_type, nunca de
      -- profiles.active_role (columna escribible por el cliente).
      v_valid_role := CASE WHEN v_user_type = 'client' THEN 'client'::public.app_role
                           ELSE 'content_creator'::public.app_role END;

      PERFORM register_user_to_organization(v_org_id, p_user_id, v_valid_role::TEXT);

      RAISE NOTICE 'complete_onboarding: user % (%) registrado en org % con rol %',
        p_user_id, v_user_type, v_org_id, v_valid_role;
    ELSE
      RAISE WARNING 'complete_onboarding: no se encontró organización principal para %', p_user_id;
    END IF;
  END IF;

  RAISE NOTICE 'complete_onboarding: ÉXITO para % (tipo: %)', p_user_id, v_user_type;
  RETURN true;
END;
$function$;

NOTIFY pgrst, 'reload schema';
