-- =============================================================================
-- Migracion: Fix Onboarding Legal Consents
-- Fecha: 08 de abril de 2026
-- Problema: Usuarios que ya aceptaron documentos legales no pueden pasar
--           de la pagina de terminos porque el sistema verifica por document_id
--           exacto en lugar de por document_type.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- PARTE 1: Actualizar get_pending_consents para verificar por document_type
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION get_pending_consents(p_user_id UUID)
RETURNS TABLE (
  document_id UUID,
  document_type TEXT,
  title TEXT,
  version TEXT,
  summary TEXT,
  is_required BOOLEAN,
  trigger_event TEXT,
  display_order INTEGER,
  user_role TEXT,
  account_type TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_type TEXT;
BEGIN
  -- Obtener el user_type del perfil del usuario
  SELECT p.user_type INTO v_user_type
  FROM profiles p
  WHERE p.id = p_user_id;

  RETURN QUERY
  SELECT
    ld.id AS document_id,
    ld.document_type,
    ld.title,
    ld.version,
    ld.summary,
    COALESCE(lcr.is_required, ld.is_required) AS is_required,
    lcr.trigger_event,
    COALESCE(lcr.display_order, 999) AS display_order,
    lcr.user_role,
    lcr.account_type
  FROM legal_documents ld
  LEFT JOIN legal_consent_requirements lcr
    ON ld.document_type = lcr.document_type
  WHERE
    ld.is_current = true
    AND ld.is_required = true
    -- CAMBIO PRINCIPAL: Verificar por document_type, no por document_id exacto
    -- Esto permite que consentimientos de versiones anteriores sigan siendo validos
    AND NOT EXISTS (
      SELECT 1 FROM user_legal_consents ulc
      WHERE ulc.user_id = p_user_id
        AND ulc.document_type = ld.document_type
        AND ulc.accepted = true
        AND ulc.revoked = false
    )
    AND (
      lcr.trigger_event = 'registration'
      OR lcr.trigger_event IS NULL
    )
    AND (
      -- Sin account_type: mostrar a todos
      lcr.account_type IS NULL
      -- Con account_type: solo si coincide con el user_type
      OR lcr.account_type = v_user_type
    )
  ORDER BY COALESCE(lcr.display_order, 999), ld.created_at;
END;
$$;

COMMENT ON FUNCTION get_pending_consents IS
'Obtiene documentos legales pendientes de aceptar, verificando por document_type en lugar de document_id exacto';

-- -----------------------------------------------------------------------------
-- PARTE 2: Funcion para completar onboarding de usuarios atascados
-- Marca como completado el onboarding de usuarios que ya aceptaron
-- todos los documentos requeridos pero estan atascados.
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION fix_stuck_onboarding_users()
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH stuck_users AS (
    -- Usuarios con perfil completo pero onboarding_completed = false
    SELECT
      p.id AS uid,
      p.email,
      p.full_name,
      p.onboarding_completed,
      p.legal_consents_completed,
      p.profile_completed
    FROM profiles p
    WHERE
      p.onboarding_completed = false
      AND p.full_name IS NOT NULL AND p.full_name != ''
      AND p.username IS NOT NULL AND p.username != ''
      AND p.phone IS NOT NULL AND p.phone != ''
      AND p.country IS NOT NULL AND p.country != ''
      AND p.city IS NOT NULL AND p.city != ''
      AND p.document_type IS NOT NULL AND p.document_type != ''
      AND p.document_number IS NOT NULL AND p.document_number != ''
  ),
  users_with_consents AS (
    -- De esos usuarios, verificar cuantos documentos requeridos les faltan
    SELECT
      su.uid,
      su.email,
      COUNT(DISTINCT gpc.document_type) AS pending_count
    FROM stuck_users su
    LEFT JOIN LATERAL (
      SELECT * FROM get_pending_consents(su.uid)
      WHERE is_required = true
    ) gpc ON true
    GROUP BY su.uid, su.email
  ),
  users_to_fix AS (
    -- Usuarios con 0 documentos pendientes
    SELECT uwc.uid, uwc.email
    FROM users_with_consents uwc
    WHERE uwc.pending_count = 0
  )
  -- Actualizar y retornar
  UPDATE profiles p
  SET
    profile_completed = true,
    profile_completed_at = COALESCE(p.profile_completed_at, NOW()),
    legal_consents_completed = true,
    legal_consents_completed_at = COALESCE(p.legal_consents_completed_at, NOW()),
    onboarding_completed = true,
    onboarding_completed_at = NOW(),
    updated_at = NOW()
  FROM users_to_fix utf
  WHERE p.id = utf.uid
  RETURNING p.id AS user_id, p.email, 'FIXED'::TEXT AS status;
END;
$$;

COMMENT ON FUNCTION fix_stuck_onboarding_users IS
'Detecta y corrige usuarios atascados en onboarding que ya tienen todos los consentimientos';

-- -----------------------------------------------------------------------------
-- PARTE 3: Ejecutar la correccion automaticamente
-- -----------------------------------------------------------------------------

-- Ejecutar la funcion para corregir usuarios atascados
DO $$
DECLARE
  fixed_count INT;
BEGIN
  SELECT COUNT(*) INTO fixed_count FROM fix_stuck_onboarding_users();
  RAISE NOTICE 'Usuarios corregidos: %', fixed_count;
END $$;

-- -----------------------------------------------------------------------------
-- PARTE 4: Funcion para forzar completar onboarding de un usuario especifico
-- Util para soporte cuando un usuario esta atascado
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION force_complete_onboarding(p_user_email TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_profile RECORD;
  v_pending_count INT;
BEGIN
  -- Buscar usuario por email
  SELECT id INTO v_user_id
  FROM profiles
  WHERE email = p_user_email;

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Usuario no encontrado',
      'email', p_user_email
    );
  END IF;

  -- Obtener estado actual del perfil
  SELECT * INTO v_profile FROM profiles WHERE id = v_user_id;

  -- Contar documentos pendientes
  SELECT COUNT(*) INTO v_pending_count
  FROM get_pending_consents(v_user_id)
  WHERE is_required = true;

  -- Marcar onboarding como completado
  UPDATE profiles SET
    profile_completed = true,
    profile_completed_at = COALESCE(profile_completed_at, NOW()),
    legal_consents_completed = true,
    legal_consents_completed_at = COALESCE(legal_consents_completed_at, NOW()),
    onboarding_completed = true,
    onboarding_completed_at = NOW(),
    updated_at = NOW()
  WHERE id = v_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'user_id', v_user_id,
    'email', p_user_email,
    'previous_state', jsonb_build_object(
      'profile_completed', v_profile.profile_completed,
      'legal_consents_completed', v_profile.legal_consents_completed,
      'onboarding_completed', v_profile.onboarding_completed
    ),
    'pending_documents_at_fix', v_pending_count,
    'new_state', 'onboarding_completed = true'
  );
END;
$$;

COMMENT ON FUNCTION force_complete_onboarding IS
'Fuerza la completacion del onboarding para un usuario especifico por email (uso de soporte)';

-- -----------------------------------------------------------------------------
-- PARTE 5: Funcion para diagnosticar estado de onboarding de un usuario
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION diagnose_onboarding(p_user_email TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_profile RECORD;
  v_pending_docs JSONB;
  v_consents JSONB;
BEGIN
  -- Buscar usuario por email
  SELECT id INTO v_user_id
  FROM profiles
  WHERE email = p_user_email;

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Usuario no encontrado',
      'email', p_user_email
    );
  END IF;

  -- Obtener perfil
  SELECT * INTO v_profile FROM profiles WHERE id = v_user_id;

  -- Documentos pendientes
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'document_type', gpc.document_type,
    'title', gpc.title,
    'is_required', gpc.is_required
  )), '[]'::jsonb)
  INTO v_pending_docs
  FROM get_pending_consents(v_user_id) gpc;

  -- Consentimientos existentes
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'document_type', ulc.document_type,
    'document_version', ulc.document_version,
    'accepted', ulc.accepted,
    'accepted_at', ulc.accepted_at,
    'is_current', ulc.is_current
  ) ORDER BY ulc.accepted_at DESC), '[]'::jsonb)
  INTO v_consents
  FROM user_legal_consents ulc
  WHERE ulc.user_id = v_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'user_id', v_user_id,
    'email', p_user_email,
    'profile_status', jsonb_build_object(
      'full_name', v_profile.full_name,
      'username', v_profile.username,
      'phone', v_profile.phone,
      'country', v_profile.country,
      'city', v_profile.city,
      'document_type', v_profile.document_type,
      'document_number', v_profile.document_number,
      'user_type', v_profile.user_type,
      'profile_completed', v_profile.profile_completed,
      'legal_consents_completed', v_profile.legal_consents_completed,
      'onboarding_completed', v_profile.onboarding_completed
    ),
    'pending_documents', v_pending_docs,
    'existing_consents', v_consents
  );
END;
$$;

COMMENT ON FUNCTION diagnose_onboarding IS
'Diagnostica el estado de onboarding de un usuario para soporte';

-- -----------------------------------------------------------------------------
-- PARTE 6: Permisos
-- -----------------------------------------------------------------------------

GRANT EXECUTE ON FUNCTION get_pending_consents TO authenticated;
GRANT EXECUTE ON FUNCTION get_pending_consents TO service_role;
GRANT EXECUTE ON FUNCTION fix_stuck_onboarding_users TO service_role;
GRANT EXECUTE ON FUNCTION force_complete_onboarding TO service_role;
GRANT EXECUTE ON FUNCTION diagnose_onboarding TO service_role;

-- Notificar cambio de esquema
NOTIFY pgrst, 'reload schema';
