-- ============================================================================
-- REGISTRO AUTÓNOMO COMPLETO — Ningún usuario debe quedar sin acceso
--
-- Gaps cerrados:
-- 1. Talento auto-registrado en org con su active_role → aparece en equipo,
--    puede ser asignado a proyectos y accede a /board /content /scripts
-- 2. platform_access_unlocked = true para todos en complete_onboarding
--    (consistente con TalentGate desactivado; previene bloqueos futuros)
-- 3. Fallback robusto: si active_role inválido → usar 'content_creator'
-- 4. Backfill de talentos existentes sin org asignada
-- ============================================================================

CREATE OR REPLACE FUNCTION public.complete_onboarding(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_exists  BOOLEAN;
  v_pending_count   INT := 0;
  v_user_type       TEXT;
  v_active_role     TEXT;
  v_org_id          UUID;
  v_valid_role      public.app_role;
BEGIN
  -- 1. Verificar que el perfil existe
  SELECT EXISTS(SELECT 1 FROM profiles WHERE id = p_user_id) INTO v_profile_exists;

  IF NOT v_profile_exists THEN
    RAISE WARNING 'complete_onboarding: perfil no existe para %', p_user_id;
    RETURN false;
  END IF;

  -- 2. Contar documentos pendientes (tolerante a errores)
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

  -- 3. Marcar onboarding completo y desbloquear acceso a la plataforma
  UPDATE profiles SET
    profile_completed           = true,
    profile_completed_at        = COALESCE(profile_completed_at, NOW()),
    legal_consents_completed    = true,
    legal_consents_completed_at = COALESCE(legal_consents_completed_at, NOW()),
    onboarding_completed        = true,
    onboarding_completed_at     = NOW(),
    platform_access_unlocked    = true,   -- Desbloquear siempre al completar onboarding
    updated_at                  = NOW()
  WHERE id = p_user_id
  RETURNING user_type, active_role INTO v_user_type, v_active_role;

  IF NOT FOUND THEN
    RAISE WARNING 'complete_onboarding: UPDATE no afectó filas para %', p_user_id;
    RETURN false;
  END IF;

  -- 4. Registrar en la organización principal (si aún no lo está)
  -- Aplica tanto a clientes como a talento
  SELECT current_organization_id INTO v_org_id
  FROM profiles WHERE id = p_user_id;

  IF v_org_id IS NULL THEN
    -- Obtener la única organización de la plataforma
    SELECT id INTO v_org_id FROM organizations ORDER BY created_at LIMIT 1;

    IF v_org_id IS NOT NULL THEN

      -- Determinar el rol a asignar
      IF v_user_type = 'client' THEN
        v_active_role := 'client';
      END IF;

      -- Validar que el rol sea un app_role válido; si no, usar fallback según tipo
      BEGIN
        v_valid_role := v_active_role::public.app_role;
      EXCEPTION WHEN OTHERS THEN
        IF v_user_type = 'client' THEN
          v_valid_role := 'client'::public.app_role;
        ELSE
          v_valid_role := 'content_creator'::public.app_role;
        END IF;
        RAISE WARNING 'complete_onboarding: rol inválido "%" para user %, usando fallback "%"',
          v_active_role, p_user_id, v_valid_role;
      END;

      -- Registrar en la org (sets current_organization_id + organization_status='active')
      -- Para clientes: también dispara trg_auto_create_client_from_member
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
$$;

GRANT EXECUTE ON FUNCTION complete_onboarding(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION complete_onboarding(UUID) TO service_role;

-- ============================================================================
-- BACKFILL: usuarios que completaron onboarding pero quedaron sin org
-- ============================================================================

DO $$
DECLARE
  r             RECORD;
  v_org_id      UUID;
  v_valid_role  public.app_role;
BEGIN
  SELECT id INTO v_org_id FROM organizations ORDER BY created_at LIMIT 1;

  IF v_org_id IS NULL THEN
    RAISE WARNING 'Backfill: no hay organización principal';
    RETURN;
  END IF;

  FOR r IN
    SELECT id, user_type, active_role
    FROM profiles
    WHERE onboarding_completed = true
      AND (current_organization_id IS NULL)
  LOOP
    -- Determinar rol válido
    BEGIN
      IF r.user_type = 'client' THEN
        v_valid_role := 'client'::public.app_role;
      ELSE
        v_valid_role := COALESCE(r.active_role, 'content_creator')::public.app_role;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      v_valid_role := CASE WHEN r.user_type = 'client' THEN 'client' ELSE 'content_creator' END::public.app_role;
    END;

    -- Registrar en org
    BEGIN
      PERFORM register_user_to_organization(v_org_id, r.id, v_valid_role::TEXT);
      RAISE NOTICE 'Backfill: user % (%) → org % rol %', r.id, r.user_type, v_org_id, v_valid_role;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Backfill: error para user %: %', r.id, SQLERRM;
    END;
  END LOOP;
END $$;

-- Desbloquear platform_access para todos los que completaron onboarding
-- (consistente con TalentGate desactivado)
UPDATE profiles
SET platform_access_unlocked = true,
    updated_at = NOW()
WHERE onboarding_completed = true
  AND (platform_access_unlocked IS NULL OR platform_access_unlocked = false);

NOTIFY pgrst, 'reload schema';
