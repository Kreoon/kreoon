-- ============================================================================
-- Fix: complete_onboarding y get_pending_consents
--
-- Problema: La migración 20260410 introdujo errores:
-- 1. Usa tablas incorrectas (legal_consents vs user_legal_consents)
-- 2. Usa columna incorrecta (account_type vs user_type)
-- 3. La función con dos parámetros rompe la compatibilidad
--
-- Solución: Restaurar la función original de un parámetro y corregir
-- complete_onboarding para que funcione correctamente.
-- ============================================================================

-- -----------------------------------------------------------------------------
-- PARTE 1: Sobrescribir get_pending_consents con la versión correcta
-- Usamos un solo parámetro para mantener compatibilidad
-- -----------------------------------------------------------------------------

DROP FUNCTION IF EXISTS get_pending_consents(UUID, TEXT);

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
    -- Verificar por document_type para permitir actualizaciones de versión
    AND NOT EXISTS (
      SELECT 1 FROM user_legal_consents ulc
      WHERE ulc.user_id = p_user_id
        AND ulc.document_type = ld.document_type
        AND ulc.accepted = true
        AND ulc.revoked = false
    )
    -- Solo documentos de registro o sin trigger específico
    AND (
      lcr.trigger_event = 'registration'
      OR lcr.trigger_event IS NULL
    )
    -- Filtrar por account_type si está definido
    AND (
      lcr.account_type IS NULL
      OR lcr.account_type = v_user_type
    )
    -- Filtrar por user_role si está definido
    AND (
      lcr.user_role IS NULL
      OR lcr.user_role = 'all'
      OR (lcr.user_role = 'talent' AND v_user_type = 'talent')
      OR (lcr.user_role = 'creator' AND v_user_type = 'talent')
      OR (lcr.user_role = 'client' AND v_user_type = 'client')
      OR (lcr.user_role = 'brand' AND v_user_type = 'client')
      OR (lcr.user_role = 'organization' AND v_user_type = 'organization')
    )
  ORDER BY COALESCE(lcr.display_order, 999), ld.created_at;
END;
$$;

COMMENT ON FUNCTION get_pending_consents(UUID) IS
'Obtiene documentos legales pendientes de aceptar para registro.
Verifica por document_type (no document_id) para permitir actualizaciones de versión.
Filtra por account_type y user_role según el tipo de usuario.';

-- -----------------------------------------------------------------------------
-- PARTE 2: Corregir complete_onboarding
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION complete_onboarding(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_check JSONB;
  v_pending_count INT;
BEGIN
  -- Verificar que el perfil esté completo
  v_check := check_profile_completion(p_user_id);

  IF v_check IS NULL OR NOT (v_check->>'complete')::boolean THEN
    RAISE NOTICE 'complete_onboarding: perfil no completo para user_id=%', p_user_id;
    RETURN false;
  END IF;

  -- Contar documentos pendientes de REGISTRO
  SELECT COUNT(*) INTO v_pending_count
  FROM get_pending_consents(p_user_id)
  WHERE is_required = true;

  IF v_pending_count > 0 THEN
    RAISE NOTICE 'complete_onboarding: % documentos pendientes para user_id=%', v_pending_count, p_user_id;
    RETURN false;
  END IF;

  -- Marcar todo como completado
  UPDATE profiles SET
    profile_completed = true,
    profile_completed_at = COALESCE(profile_completed_at, NOW()),
    legal_consents_completed = true,
    legal_consents_completed_at = COALESCE(legal_consents_completed_at, NOW()),
    onboarding_completed = true,
    onboarding_completed_at = NOW(),
    updated_at = NOW()
  WHERE id = p_user_id;

  RAISE NOTICE 'complete_onboarding: onboarding completado para user_id=%', p_user_id;
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION complete_onboarding(UUID) IS
'Completa el onboarding verificando perfil y consentimientos de REGISTRO.
Retorna true si se completó exitosamente, false si hay requisitos pendientes.';

-- -----------------------------------------------------------------------------
-- PARTE 3: Permisos
-- -----------------------------------------------------------------------------

GRANT EXECUTE ON FUNCTION get_pending_consents(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_pending_consents(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION complete_onboarding(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION complete_onboarding(UUID) TO service_role;

-- Notificar cambio de esquema a PostgREST
NOTIFY pgrst, 'reload schema';
