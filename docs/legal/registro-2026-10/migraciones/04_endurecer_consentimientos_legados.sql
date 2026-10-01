-- =============================================================================
-- Hotfix de seguridad: endurecer los consentimientos legales legados.
-- Estado: PREPARADA, PENDIENTE DE APLICAR POR ALEXANDER. No aplicada en producción.
-- Copia idéntica: docs/legal/registro-2026-10/migraciones/04_endurecer_consentimientos_legados.sql
--
-- Verificado contra la base viva (solo lectura) el 2026-10-01:
--   · record_consent, record_age_verification y sign_legal_document son SECURITY DEFINER (owner postgres),
--     reciben p_user_id y p_ip_address del cliente, no comprueban auth.uid() y su ACL es
--     {=X/postgres,...}: PUBLIC (y por tanto anon) puede ejecutarlas. Cualquiera, sin sesión, podía
--     registrar consentimientos, verificaciones de edad y firmas a nombre de otra persona, con la IP que quisiera.
--   · check_role_legal_gate y get_role_gate_documents: misma ACL abierta a PUBLIC.
--   · user_legal_consents: políticas user_creates_own_consent (INSERT) y user_updates_own_consent (UPDATE)
--     para authenticated, y GRANT completo a authenticated → el usuario podía escribir sus propias filas
--     de prueba (fecha, IP, versión) saltándose las RPC.
--
-- Llamadores revisados (todos siguen funcionando):
--   · Sesión del MISMO usuario (p_user_id = user.id de la sesión):
--       src/hooks/useLegalConsent.ts:156 (record_consent), :181 (record_age_verification)
--         ← NovaLegalConsentStep, LegalConsentModal, LegalConsentGate, RoleLegalConsentModal
--       src/components/registration-v2/shared/recordLegalConsents.ts:11,26
--         ← UpgradeToCreatorWizard.tsx:112
--       src/hooks/useDigitalSignature.ts:99 (sign_legal_document) ← SignatureModal
--       src/hooks/useRoleLegalGate.ts:44,83 y src/providers/RoleLegalGateProvider.tsx:92,122
--         (check_role_legal_gate / get_role_gate_documents)
--   · service_role (no afectado por las políticas ni por el guard):
--       supabase/functions/client-onboarding-claim/index.ts:348 (upsert directo a user_legal_consents)
--   · Funciones SQL SECURITY DEFINER (owner postgres, no dependen de grants/políticas de authenticated):
--       complete_creator_signup (inserta directo, ya usa auth.uid() y request.headers), get_pending_consents,
--       check_user_consents, get_user_consents, get_user_legal_summary, etc. (solo lectura).
--   · Registro con Google: OAuth → sesión → complete_creator_signup; no usa las funciones legadas.
--   · Sin sesión: ninguno legítimo.
--   · Nadie escribe directamente user_legal_consents con la clave anon ni con sesión de usuario
--     (en src/ solo hay SELECT: useLegalConsent.ts:107, LegalConsentsAdminPanel.tsx:96-122,
--     PlatformUsersManagement.tsx:168).
--
-- Qué hace:
--   1. Helpers privados: _legal_assert_caller (exige auth.uid() = p_user_id salvo service_role o sesión
--      SQL directa) y _legal_request_ip / _legal_request_ua (IP y navegador desde request.headers, mismo
--      criterio que complete_creator_signup).
--   2. Reescribe las 3 funciones con su lógica viva intacta + guard + IP/UA del servidor. Para el usuario
--      se IGNORA p_ip_address (y p_user_agent si llega la cabecera); para service_role se respeta lo que
--      envía (las funciones de borde pasan la IP real del cliente).
--   3. EXECUTE: fuera PUBLIC/anon; solo authenticated y service_role.
--   4. user_legal_consents: fuera las políticas INSERT/UPDATE del usuario y los privilegios de escritura
--      de anon/authenticated. legal_documents: fuera privilegios de escritura de anon/authenticated
--      (ya no había política de escritura; es defensa en profundidad).
--
-- Qué NO hace:
--   · No toca ninguna fila existente (user_legal_consents, age_verifications, digital_signatures).
--   · NO cambia el ON DELETE CASCADE de user_legal_consents.user_id (ni el de age_verifications ni
--     digital_signatures). PENDIENTE JURÍDICO: hoy, borrar una cuenta borra su prueba de consentimiento.
--     Cambiarlo exige decidir plazo de conservación vs. derecho de supresión (ver pendientes-juridicos.md).
--   · No toca las políticas INSERT propias de age_verifications y digital_signatures (mismo patrón, solo
--     afectan a las filas del propio usuario). Bloque opcional comentado al final.
-- =============================================================================

-- ── 1. Helpers privados ──────────────────────────────────────────────────────

-- Devuelve true si el llamador es de confianza (service_role o sesión SQL directa sin JWT),
-- false si es el propio usuario autenticado; en cualquier otro caso lanza 'unauthorized'.
CREATE OR REPLACE FUNCTION public._legal_assert_caller(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SET search_path TO 'public'
AS $$
DECLARE
  v_claims jsonb;
  v_role   text;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'user_id_required' USING ERRCODE = '22004';
  END IF;

  BEGIN
    v_claims := NULLIF(current_setting('request.jwt.claims', true), '')::jsonb;
  EXCEPTION WHEN OTHERS THEN
    v_claims := NULL;
  END;
  v_role := COALESCE(v_claims ->> 'role', '');

  IF v_role = 'service_role' THEN
    RETURN true;
  END IF;

  -- Consola SQL / migraciones / conexiones directas: no pasan por PostgREST (authenticator) ni traen JWT.
  IF v_claims IS NULL AND session_user <> 'authenticator' THEN
    RETURN true;
  END IF;

  IF auth.uid() IS NOT NULL AND auth.uid() = p_user_id THEN
    RETURN false;
  END IF;

  RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
END;
$$;

CREATE OR REPLACE FUNCTION public._legal_request_ip()
RETURNS inet
LANGUAGE plpgsql
STABLE
SET search_path TO 'public'
AS $$
DECLARE
  v_headers json;
  v_ip      inet;
BEGIN
  BEGIN
    v_headers := NULLIF(current_setting('request.headers', true), '')::json;
    v_ip := NULLIF(btrim(split_part(COALESCE(v_headers ->> 'x-forwarded-for', ''), ',', 1)), '')::inet;
  EXCEPTION WHEN OTHERS THEN
    v_ip := NULL;
  END;
  RETURN v_ip;
END;
$$;

CREATE OR REPLACE FUNCTION public._legal_request_ua()
RETURNS text
LANGUAGE plpgsql
STABLE
SET search_path TO 'public'
AS $$
DECLARE
  v_headers json;
BEGIN
  BEGIN
    v_headers := NULLIF(current_setting('request.headers', true), '')::json;
    RETURN NULLIF(left(v_headers ->> 'user-agent', 500), '');
  EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
  END;
END;
$$;

-- Los helpers solo se usan dentro de las funciones SECURITY DEFINER (owner postgres).
-- Supabase concede EXECUTE por defecto a anon/authenticated en funciones nuevas: se retira.
REVOKE ALL ON FUNCTION public._legal_assert_caller(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public._legal_request_ip()        FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public._legal_request_ua()        FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public._legal_assert_caller(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public._legal_request_ip()        TO service_role;
GRANT EXECUTE ON FUNCTION public._legal_request_ua()        TO service_role;

-- ── 2. Funciones legadas: lógica viva + guard + IP/UA del servidor ───────────

CREATE OR REPLACE FUNCTION public.record_consent(
  p_user_id uuid,
  p_document_id uuid,
  p_ip_address inet DEFAULT NULL::inet,
  p_user_agent text DEFAULT NULL::text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_consent_id UUID;
  v_doc_type TEXT;
  v_doc_version TEXT;
  v_old_consent_id UUID;
  v_trusted boolean;
  v_ip inet;
  v_ua text;
BEGIN
  v_trusted := public._legal_assert_caller(p_user_id);
  IF v_trusted THEN
    v_ip := p_ip_address;
    v_ua := p_user_agent;
  ELSE
    v_ip := public._legal_request_ip();
    v_ua := COALESCE(public._legal_request_ua(), left(p_user_agent, 500));
  END IF;

  SELECT document_type, version INTO v_doc_type, v_doc_version
  FROM legal_documents WHERE id = p_document_id;

  IF v_doc_type IS NULL THEN
    RAISE EXCEPTION 'Documento no encontrado: %', p_document_id;
  END IF;

  UPDATE user_legal_consents
  SET is_current = false
  WHERE user_id = p_user_id
    AND document_type = v_doc_type
    AND is_current = true
  RETURNING id INTO v_old_consent_id;

  INSERT INTO user_legal_consents (
    user_id, document_id, document_type, document_version,
    accepted, accepted_at, ip_address, user_agent,
    consent_method, superseded_by, is_current
  ) VALUES (
    p_user_id, p_document_id, v_doc_type, v_doc_version,
    true, NOW(), v_ip, v_ua,
    'clickwrap', NULL, true
  )
  ON CONFLICT (user_id, document_id)
  DO UPDATE SET
    accepted = true,
    accepted_at = NOW(),
    ip_address = v_ip,
    user_agent = v_ua,
    is_current = true
  RETURNING id INTO v_consent_id;

  IF v_old_consent_id IS NOT NULL THEN
    UPDATE user_legal_consents
    SET superseded_by = v_consent_id
    WHERE id = v_old_consent_id;
  END IF;

  RETURN v_consent_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.record_age_verification(
  p_user_id uuid,
  p_declared_age_18_plus boolean,
  p_ip_address inet DEFAULT NULL::inet,
  p_user_agent text DEFAULT NULL::text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_verification_id UUID;
  v_trusted boolean;
  v_ip inet;
  v_ua text;
BEGIN
  v_trusted := public._legal_assert_caller(p_user_id);
  IF v_trusted THEN
    v_ip := p_ip_address;
    v_ua := p_user_agent;
  ELSE
    v_ip := public._legal_request_ip();
    v_ua := COALESCE(public._legal_request_ua(), left(p_user_agent, 500));
  END IF;

  INSERT INTO age_verifications (
    user_id, declared_age_18_plus, declared_at,
    ip_address, user_agent, verification_method, verification_status
  ) VALUES (
    p_user_id, p_declared_age_18_plus, NOW(),
    v_ip, v_ua, 'self_declaration',
    CASE WHEN p_declared_age_18_plus THEN 'verified' ELSE 'rejected' END
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_verification_id;

  IF v_verification_id IS NULL THEN
    SELECT id INTO v_verification_id
    FROM age_verifications
    WHERE user_id = p_user_id
    LIMIT 1;
  END IF;

  RETURN v_verification_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.sign_legal_document(
  p_user_id uuid,
  p_document_id uuid,
  p_signer_full_name text,
  p_declaration_text text DEFAULT NULL::text,
  p_signature_method text DEFAULT 'typed_name'::text,
  p_typed_signature text DEFAULT NULL::text,
  p_signature_image_url text DEFAULT NULL::text,
  p_ip_address inet DEFAULT NULL::inet,
  p_user_agent text DEFAULT ''::text,
  p_browser_info jsonb DEFAULT '{}'::jsonb,
  p_geolocation jsonb DEFAULT NULL::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_doc RECORD;
  v_profile RECORD;
  v_signature_id UUID;
  v_consent_id UUID;
  v_declaration TEXT;
  v_doc_hash TEXT;
  v_trusted boolean;
  v_ip inet;
  v_ua text;
BEGIN
  v_trusted := public._legal_assert_caller(p_user_id);
  IF v_trusted THEN
    v_ip := p_ip_address;
    v_ua := p_user_agent;
  ELSE
    v_ip := public._legal_request_ip();
    v_ua := COALESCE(public._legal_request_ua(), left(p_user_agent, 500), '');
  END IF;

  -- Obtener documento
  SELECT * INTO v_doc FROM legal_documents WHERE id = p_document_id AND is_current = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Documento no encontrado o no vigente';
  END IF;

  -- Obtener perfil del usuario
  SELECT * INTO v_profile FROM profiles WHERE id = p_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Perfil no encontrado';
  END IF;

  -- Calcular hash del documento
  v_doc_hash := encode(sha256(v_doc.content_html::bytea), 'hex');

  -- Construir declaración si no se proporcionó
  v_declaration := COALESCE(p_declaration_text, FORMAT(
    'Yo, %s, identificado(a) con %s No. %s, declaro que he leído y acepto el documento "%s" versión %s de SICOMMER INT LLC. Confirmo que soy mayor de 18 años y que actúo de manera libre y voluntaria. Fecha: %s',
    p_signer_full_name,
    COALESCE(v_profile.document_type, 'documento'),
    COALESCE(v_profile.document_number, 'N/A'),
    v_doc.title,
    v_doc.version,
    TO_CHAR(NOW() AT TIME ZONE 'America/Bogota', 'DD/MM/YYYY HH24:MI:SS')
  ));

  -- Invalidar firma anterior del mismo documento (si existe)
  UPDATE digital_signatures SET
    status = 'superseded'
  WHERE user_id = p_user_id
    AND document_type = v_doc.document_type
    AND status = 'valid';

  -- Crear firma
  INSERT INTO digital_signatures (
    user_id, document_id, document_type, document_version,
    document_hash, signer_full_name, signer_document_type,
    signer_document_number, signer_email, declaration_text,
    ip_address, user_agent, geolocation, signature_method,
    typed_signature, signature_image_url, browser_info
  ) VALUES (
    p_user_id, p_document_id, v_doc.document_type, v_doc.version,
    v_doc_hash,
    p_signer_full_name, v_profile.document_type,
    v_profile.document_number, COALESCE(v_profile.email, ''),
    v_declaration,
    COALESCE(v_ip, '0.0.0.0'::inet), v_ua,
    p_geolocation, p_signature_method,
    p_typed_signature, p_signature_image_url, p_browser_info
  ) RETURNING id INTO v_signature_id;

  -- Crear/actualizar consentimiento legal
  INSERT INTO user_legal_consents (
    user_id, document_id, document_type, document_version,
    accepted, accepted_at, ip_address, user_agent, consent_method, is_current
  ) VALUES (
    p_user_id, p_document_id, v_doc.document_type, v_doc.version,
    true, NOW(), v_ip, v_ua, p_signature_method, true
  )
  ON CONFLICT (user_id, document_id) DO UPDATE SET
    accepted = true,
    accepted_at = NOW(),
    document_version = v_doc.version,
    ip_address = v_ip,
    user_agent = v_ua,
    consent_method = p_signature_method,
    is_current = true
  RETURNING id INTO v_consent_id;

  -- Vincular firma con consentimiento
  UPDATE digital_signatures SET consent_id = v_consent_id WHERE id = v_signature_id;

  RETURN v_signature_id;
END;
$function$;

-- ── 3. EXECUTE: sin PUBLIC ni anon ───────────────────────────────────────────
-- (CREATE OR REPLACE conserva la ACL anterior {=X/postgres}; por eso se revoca después.)
REVOKE ALL ON FUNCTION public.record_consent(uuid, uuid, inet, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.record_age_verification(uuid, boolean, inet, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.sign_legal_document(uuid, uuid, text, text, text, text, text, inet, text, jsonb, jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.check_role_legal_gate(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_role_gate_documents(uuid, text) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.record_consent(uuid, uuid, inet, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.record_age_verification(uuid, boolean, inet, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.sign_legal_document(uuid, uuid, text, text, text, text, text, inet, text, jsonb, jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.check_role_legal_gate(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_role_gate_documents(uuid, text) TO authenticated, service_role;

-- ── 4. user_legal_consents / legal_documents: sin escritura directa ──────────
DROP POLICY IF EXISTS user_creates_own_consent ON public.user_legal_consents;
DROP POLICY IF EXISTS user_updates_own_consent ON public.user_legal_consents;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.user_legal_consents FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.legal_documents FROM anon, authenticated;
-- Se conservan: SELECT propio (user_sees_own_consents), SELECT de admin (admin_sees_all_consents),
-- lectura pública de legal_documents y todos los privilegios de service_role.
-- El ON DELETE CASCADE de las FK no depende de estos privilegios (las acciones referenciales
-- se ejecutan con permisos del dueño de la tabla).

NOTIFY pgrst, 'reload schema';

-- =============================================================================
-- OPCIONAL (no incluido): mismo cierre para age_verifications y digital_signatures.
-- Nadie en src/ ni en supabase/functions escribe directamente en ellas (solo las RPC de arriba).
-- DROP POLICY IF EXISTS user_creates_own_age_verification ON public.age_verifications;
-- DROP POLICY IF EXISTS user_creates_own_signature ON public.digital_signatures;
-- REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.age_verifications FROM anon, authenticated;
-- REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.digital_signatures FROM anon, authenticated;
-- =============================================================================

-- =============================================================================
-- VERIFICACIÓN POST-APLICACIÓN (ejecutar a mano; todo es de solo lectura salvo la prueba curl,
-- que debe FALLAR).
--
-- a) ACL de las funciones: ninguna debe empezar por "=X" (PUBLIC) ni contener "anon=".
--    Esperado: {postgres=X/postgres,service_role=X/postgres,authenticated=X/postgres}
-- SELECT p.oid::regprocedure AS firma, p.prosecdef, p.proacl::text
-- FROM pg_proc p
-- WHERE p.pronamespace = 'public'::regnamespace
--   AND p.proname IN ('record_consent','record_age_verification','sign_legal_document',
--                     'check_role_legal_gate','get_role_gate_documents',
--                     '_legal_assert_caller','_legal_request_ip','_legal_request_ua');
--
-- b) Políticas: solo deben quedar admin_sees_all_consents y user_sees_own_consents (SELECT).
-- SELECT policyname, cmd, roles::text FROM pg_policies
-- WHERE schemaname = 'public' AND tablename = 'user_legal_consents';
--
-- c) Privilegios: authenticated solo SELECT en user_legal_consents y legal_documents; anon solo
--    SELECT en legal_documents.
-- SELECT table_name, grantee, string_agg(privilege_type, ',' ORDER BY privilege_type)
-- FROM information_schema.role_table_grants
-- WHERE table_schema = 'public' AND table_name IN ('user_legal_consents','legal_documents')
--   AND grantee IN ('anon','authenticated','service_role')
-- GROUP BY 1, 2 ORDER BY 1, 2;
--
-- d) El guard está en el cuerpo vivo:
-- SELECT proname, prosrc ILIKE '%_legal_assert_caller%' AS con_guard FROM pg_proc
-- WHERE pronamespace = 'public'::regnamespace
--   AND proname IN ('record_consent','record_age_verification','sign_legal_document');
--
-- e) Prueba negativa con la clave anon (sin sesión). Esperado: HTTP 401/403 con código 42501
--    ("permission denied for function record_consent"). NO debe devolver un uuid.
--    Usar un UUID inventado: si por error la llamada pasara, no tocaría a nadie real.
-- curl -s -i -X POST "https://wjkbqcrxwsmvtxmqgiqc.supabase.co/rest/v1/rpc/record_consent" \
--   -H "apikey: $SUPABASE_ANON_KEY" -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
--   -H "Content-Type: application/json" \
--   -d '{"p_user_id":"00000000-0000-0000-0000-000000000000","p_document_id":"00000000-0000-0000-0000-000000000000"}'
--   (repetir con /rpc/record_age_verification {"p_user_id":"0000...","p_declared_age_18_plus":true}
--    y /rpc/sign_legal_document {"p_user_id":"0000...","p_document_id":"0000...","p_signer_full_name":"x"})
--
-- f) Prueba negativa de escritura directa (anon). Esperado: 401/403 (42501), nunca 201.
-- curl -s -i -X POST "https://wjkbqcrxwsmvtxmqgiqc.supabase.co/rest/v1/user_legal_consents" \
--   -H "apikey: $SUPABASE_ANON_KEY" -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
--   -H "Content-Type: application/json" -d '{"user_id":"00000000-0000-0000-0000-000000000000"}'
--
-- g) Prueba positiva (en la app, con una cuenta de prueba propia): aceptar un documento en el
--    onboarding (NovaLegalConsentStep) o firmar en SignatureModal; la fila nueva de
--    user_legal_consents debe tener ip_address = IP real (no la de ipify) o NULL, nunca un error.
-- =============================================================================

-- =============================================================================
-- ROLLBACK MANUAL (solo si algo legítimo se rompe; reabre la vulnerabilidad):
--
-- -- 1) Permisos de ejecución como estaban (PUBLIC = incluye anon):
-- GRANT EXECUTE ON FUNCTION public.record_consent(uuid, uuid, inet, text) TO PUBLIC;
-- GRANT EXECUTE ON FUNCTION public.record_age_verification(uuid, boolean, inet, text) TO PUBLIC;
-- GRANT EXECUTE ON FUNCTION public.sign_legal_document(uuid, uuid, text, text, text, text, text, inet, text, jsonb, jsonb) TO PUBLIC;
-- GRANT EXECUTE ON FUNCTION public.check_role_legal_gate(uuid, text) TO PUBLIC;
-- GRANT EXECUTE ON FUNCTION public.get_role_gate_documents(uuid, text) TO PUBLIC;
--
-- -- 2) Políticas y privilegios de tabla:
-- CREATE POLICY user_creates_own_consent ON public.user_legal_consents
--   FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
-- CREATE POLICY user_updates_own_consent ON public.user_legal_consents
--   FOR UPDATE TO authenticated USING (user_id = auth.uid());
-- GRANT INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.user_legal_consents TO authenticated;
-- GRANT INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.legal_documents TO authenticated;
--
-- -- 3) Cuerpos originales: volver a ejecutar las tres CREATE OR REPLACE de la sección 2 quitando
-- --    el bloque «v_trusted := public._legal_assert_caller(...) ... END IF;» y sustituyendo
-- --    v_ip → p_ip_address y v_ua → p_user_agent (es exactamente la definición viva leída el
-- --    2026-10-01 con pg_get_functiondef). Después:
-- DROP FUNCTION IF EXISTS public._legal_assert_caller(uuid);
-- DROP FUNCTION IF EXISTS public._legal_request_ip();
-- DROP FUNCTION IF EXISTS public._legal_request_ua();
-- NOTIFY pgrst, 'reload schema';
--
-- Ninguna fila se modificó en la aplicación, así que el rollback no requiere restaurar datos.
-- =============================================================================
