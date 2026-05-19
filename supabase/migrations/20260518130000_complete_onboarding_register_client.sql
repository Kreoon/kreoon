-- ============================================================================
-- FIX: complete_onboarding debe registrar al cliente en la organización
--
-- Problema: cuando un usuario completa el onboarding con user_type='client',
-- la función solo marca profile_completed y onboarding_completed pero NUNCA
-- lo agrega a organization_members ni actualiza current_organization_id.
-- Consecuencia: current_organization_id queda null y el usuario es invisible
-- para toda la lógica multi-tenant de la plataforma.
--
-- Solución: al final de complete_onboarding, si user_type='client', registrar
-- al usuario en la única organización existente con role='client'.
-- El trigger trg_auto_create_client_from_member (migración anterior) creará
-- automáticamente el registro en clients y client_users.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.complete_onboarding(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_exists BOOLEAN;
  v_pending_count  INT := 0;
  v_user_type      TEXT;
  v_org_id         UUID;
BEGIN
  -- 1. Verificar que el perfil existe
  SELECT EXISTS(SELECT 1 FROM profiles WHERE id = p_user_id) INTO v_profile_exists;

  IF NOT v_profile_exists THEN
    RAISE WARNING 'complete_onboarding: perfil no existe para %', p_user_id;
    RETURN false;
  END IF;

  -- 2. Contar documentos pendientes (con manejo de error)
  BEGIN
    SELECT COUNT(*) INTO v_pending_count
    FROM get_pending_consents(p_user_id)
    WHERE is_required = true;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'complete_onboarding: error contando pendientes: %', SQLERRM;
    v_pending_count := 0;
  END;

  IF v_pending_count > 0 THEN
    RAISE WARNING 'complete_onboarding: % documentos pendientes (continuando igual)', v_pending_count;
  END IF;

  -- 3. Marcar onboarding como completado
  UPDATE profiles SET
    profile_completed          = true,
    profile_completed_at       = COALESCE(profile_completed_at, NOW()),
    legal_consents_completed   = true,
    legal_consents_completed_at = COALESCE(legal_consents_completed_at, NOW()),
    onboarding_completed       = true,
    onboarding_completed_at    = NOW(),
    updated_at                 = NOW()
  WHERE id = p_user_id
  RETURNING user_type INTO v_user_type;

  IF NOT FOUND THEN
    RAISE WARNING 'complete_onboarding: UPDATE no afectó filas para %', p_user_id;
    RETURN false;
  END IF;

  -- 4. Si es cliente, registrarlo en la organización principal
  IF v_user_type = 'client' THEN
    -- Verificar si ya tiene organización asignada
    SELECT current_organization_id INTO v_org_id
    FROM profiles
    WHERE id = p_user_id;

    IF v_org_id IS NULL THEN
      -- Obtener la única organización de la plataforma
      SELECT id INTO v_org_id
      FROM organizations
      ORDER BY created_at
      LIMIT 1;

      IF v_org_id IS NOT NULL THEN
        -- Registrar en organization_members con role='client'
        -- (el trigger trg_auto_create_client_from_member creará el registro en clients)
        PERFORM register_user_to_organization(v_org_id, p_user_id, 'client');

        -- Actualizar current_organization_id en profiles
        UPDATE profiles
        SET current_organization_id = v_org_id,
            organization_status     = 'active',
            updated_at              = NOW()
        WHERE id = p_user_id;

        RAISE NOTICE 'complete_onboarding: cliente % registrado en org %', p_user_id, v_org_id;
      ELSE
        RAISE WARNING 'complete_onboarding: no se encontró organización principal para el cliente %', p_user_id;
      END IF;
    END IF;
  END IF;

  RAISE NOTICE 'complete_onboarding: ÉXITO para %', p_user_id;
  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION complete_onboarding(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION complete_onboarding(UUID) TO service_role;

-- ============================================================================
-- BACKFILL: clientes existentes sin current_organization_id
-- ============================================================================

DO $$
DECLARE
  r      RECORD;
  v_org_id UUID;
BEGIN
  -- Obtener la org principal
  SELECT id INTO v_org_id FROM organizations ORDER BY created_at LIMIT 1;

  IF v_org_id IS NULL THEN
    RAISE WARNING 'Backfill clientes: no hay organización';
    RETURN;
  END IF;

  FOR r IN
    SELECT id AS user_id
    FROM profiles
    WHERE user_type = 'client'
      AND onboarding_completed = true
      AND (current_organization_id IS NULL)
  LOOP
    -- Registrar en org (el trigger auto-crea el cliente)
    PERFORM register_user_to_organization(v_org_id, r.user_id, 'client');

    UPDATE profiles
    SET current_organization_id = v_org_id,
        organization_status     = 'active',
        updated_at              = NOW()
    WHERE id = r.user_id;

    RAISE NOTICE 'Backfill: user % registrado en org %', r.user_id, v_org_id;
  END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';
