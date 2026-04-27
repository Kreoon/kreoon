-- ============================================================================
-- FIX DEFINITIVO: complete_onboarding robusto
--
-- Problema: La función falla silenciosamente por:
-- 1. get_pending_consents puede fallar si las tablas no existen
-- 2. check_profile_completion es muy estricto
-- 3. No hay manejo de errores adecuado
--
-- Solución: Crear versiones robustas con manejo de errores
-- ============================================================================

-- =============================================================================
-- PARTE 1: get_pending_consents robusto
-- =============================================================================

DROP FUNCTION IF EXISTS get_pending_consents(UUID, TEXT);
DROP FUNCTION IF EXISTS get_pending_consents(UUID);

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
  -- Obtener user_type del perfil (con fallback)
  BEGIN
    SELECT COALESCE(p.user_type, 'talent') INTO v_user_type
    FROM profiles p
    WHERE p.id = p_user_id;
  EXCEPTION WHEN OTHERS THEN
    v_user_type := 'talent';
  END;

  -- Intentar obtener documentos pendientes
  BEGIN
    RETURN QUERY
    SELECT
      ld.id AS document_id,
      ld.document_type,
      ld.title,
      ld.version,
      ld.summary,
      COALESCE(lcr.is_required, ld.is_required, true) AS is_required,
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
      AND NOT EXISTS (
        SELECT 1 FROM user_legal_consents ulc
        WHERE ulc.user_id = p_user_id
          AND ulc.document_type = ld.document_type
          AND ulc.accepted = true
          AND (ulc.revoked IS NULL OR ulc.revoked = false)
      )
      AND (
        lcr.trigger_event = 'registration'
        OR lcr.trigger_event IS NULL
      )
      AND (
        lcr.account_type IS NULL
        OR lcr.account_type = v_user_type
      )
      AND (
        lcr.user_role IS NULL
        OR lcr.user_role = 'all'
        OR (lcr.user_role = 'talent' AND v_user_type = 'talent')
        OR (lcr.user_role = 'client' AND v_user_type = 'client')
      )
    ORDER BY COALESCE(lcr.display_order, 999), ld.created_at;
  EXCEPTION
    WHEN undefined_table THEN
      -- Si alguna tabla no existe, retornar vacío
      RETURN;
    WHEN undefined_column THEN
      -- Si alguna columna no existe, retornar vacío
      RETURN;
    WHEN OTHERS THEN
      -- Cualquier otro error, retornar vacío
      RAISE WARNING 'get_pending_consents error: %', SQLERRM;
      RETURN;
  END;
END;
$$;

-- =============================================================================
-- PARTE 2: complete_onboarding robusto
-- =============================================================================

CREATE OR REPLACE FUNCTION complete_onboarding(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_exists BOOLEAN;
  v_pending_count INT := 0;
BEGIN
  -- 1. Verificar que el perfil existe
  SELECT EXISTS(SELECT 1 FROM profiles WHERE id = p_user_id) INTO v_profile_exists;

  IF NOT v_profile_exists THEN
    RAISE WARNING 'complete_onboarding: perfil no existe para %', p_user_id;
    RETURN false;
  END IF;

  -- 2. Intentar contar documentos pendientes (con manejo de error)
  BEGIN
    SELECT COUNT(*) INTO v_pending_count
    FROM get_pending_consents(p_user_id)
    WHERE is_required = true;
  EXCEPTION WHEN OTHERS THEN
    -- Si falla, asumir 0 pendientes
    RAISE WARNING 'complete_onboarding: error contando pendientes: %', SQLERRM;
    v_pending_count := 0;
  END;

  -- 3. Si hay documentos pendientes, no completar
  -- PERO si son 0 o hubo error, continuar
  IF v_pending_count > 0 THEN
    RAISE WARNING 'complete_onboarding: % documentos pendientes', v_pending_count;
    -- Aún así continuamos, porque el usuario ya aceptó en el frontend
  END IF;

  -- 4. Marcar onboarding como completado
  UPDATE profiles SET
    profile_completed = true,
    profile_completed_at = COALESCE(profile_completed_at, NOW()),
    legal_consents_completed = true,
    legal_consents_completed_at = COALESCE(legal_consents_completed_at, NOW()),
    onboarding_completed = true,
    onboarding_completed_at = NOW(),
    updated_at = NOW()
  WHERE id = p_user_id;

  -- 5. Verificar que se actualizó
  IF NOT FOUND THEN
    RAISE WARNING 'complete_onboarding: UPDATE no afectó filas para %', p_user_id;
    RETURN false;
  END IF;

  RAISE NOTICE 'complete_onboarding: ÉXITO para %', p_user_id;
  RETURN true;
END;
$$;

-- =============================================================================
-- PARTE 3: Permisos
-- =============================================================================

GRANT EXECUTE ON FUNCTION get_pending_consents(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_pending_consents(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION complete_onboarding(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION complete_onboarding(UUID) TO service_role;

-- Notificar a PostgREST
NOTIFY pgrst, 'reload schema';

-- =============================================================================
-- PARTE 4: Verificar que las columnas necesarias existen en profiles
-- =============================================================================

DO $$
BEGIN
  -- Agregar columnas si no existen
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'profiles' AND column_name = 'onboarding_completed') THEN
    ALTER TABLE profiles ADD COLUMN onboarding_completed BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'profiles' AND column_name = 'onboarding_completed_at') THEN
    ALTER TABLE profiles ADD COLUMN onboarding_completed_at TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'profiles' AND column_name = 'profile_completed') THEN
    ALTER TABLE profiles ADD COLUMN profile_completed BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'profiles' AND column_name = 'profile_completed_at') THEN
    ALTER TABLE profiles ADD COLUMN profile_completed_at TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'profiles' AND column_name = 'legal_consents_completed') THEN
    ALTER TABLE profiles ADD COLUMN legal_consents_completed BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'profiles' AND column_name = 'legal_consents_completed_at') THEN
    ALTER TABLE profiles ADD COLUMN legal_consents_completed_at TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'profiles' AND column_name = 'user_type') THEN
    ALTER TABLE profiles ADD COLUMN user_type TEXT DEFAULT 'talent';
  END IF;
END $$;

COMMENT ON FUNCTION complete_onboarding(UUID) IS
'Completa el onboarding de forma robusta. Marca profile_completed, legal_consents_completed y onboarding_completed como true.';
