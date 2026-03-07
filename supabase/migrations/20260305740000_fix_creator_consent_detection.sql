-- =====================================================
-- FIX: Detectar creadores correctamente en get_pending_consents
-- Migration: 20260305740000_fix_creator_consent_detection
--
-- Problema: La función get_pending_consents solo detecta creadores
-- via organization_member_roles, pero los freelancers tienen
-- creator_profile sin necesariamente tener ese rol organizacional.
--
-- Solución: También considerar usuarios con creator_profile activo
-- =====================================================

DROP FUNCTION IF EXISTS get_pending_consents(UUID);

CREATE OR REPLACE FUNCTION get_pending_consents(p_user_id UUID)
RETURNS TABLE (
  document_id UUID,
  document_type TEXT,
  title TEXT,
  version TEXT,
  summary TEXT,
  is_required BOOLEAN
) AS $$
DECLARE
  v_user_roles TEXT[];
BEGIN
  -- Construir array de roles del usuario
  -- 1. Siempre incluir 'all'
  -- 2. Si tiene creator_profile activo -> incluir 'creator'
  -- 3. Incluir roles de organization_member_roles
  -- 4. Si está en client_users -> incluir 'brand' y 'client'

  v_user_roles := ARRAY['all'];

  -- Verificar si tiene creator_profile
  IF EXISTS (SELECT 1 FROM creator_profiles WHERE user_id = p_user_id) THEN
    v_user_roles := array_append(v_user_roles, 'creator');
  END IF;

  -- Agregar roles organizacionales
  SELECT array_cat(v_user_roles, COALESCE(array_agg(DISTINCT omr.role), '{}'))
  INTO v_user_roles
  FROM organization_member_roles omr
  JOIN organization_members om ON om.id = omr.member_id
  WHERE om.user_id = p_user_id;

  -- Verificar si es cliente/marca
  IF EXISTS (SELECT 1 FROM client_users WHERE user_id = p_user_id) THEN
    v_user_roles := array_append(v_user_roles, 'brand');
    v_user_roles := array_append(v_user_roles, 'client');
  END IF;

  -- Verificar si pertenece a una organización (para documentos de organization)
  IF EXISTS (SELECT 1 FROM organization_members WHERE user_id = p_user_id) THEN
    v_user_roles := array_append(v_user_roles, 'organization');
  END IF;

  RETURN QUERY
  SELECT
    ld.id AS document_id,
    ld.document_type,
    ld.title,
    ld.version,
    ld.summary,
    lcr.is_required
  FROM legal_documents ld
  JOIN legal_consent_requirements lcr ON lcr.document_type = ld.document_type
  WHERE ld.is_current = true
    AND lcr.user_role = ANY(v_user_roles)
    AND NOT EXISTS (
      SELECT 1 FROM user_legal_consents ulc
      WHERE ulc.user_id = p_user_id
        AND ulc.document_id = ld.id
        AND ulc.accepted = true
        AND ulc.is_current = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- También actualizar check_profile_completion para incluir gender como campo requerido
DROP FUNCTION IF EXISTS check_profile_completion(UUID);

CREATE OR REPLACE FUNCTION check_profile_completion(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_profile RECORD;
  v_missing TEXT[] := '{}';
  v_has_social BOOLEAN := false;
  v_age_ok BOOLEAN := false;
  v_result JSONB;
BEGIN
  SELECT * INTO v_profile FROM profiles WHERE id = p_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('complete', false, 'missing', ARRAY['profile_not_found']);
  END IF;

  -- Campos obligatorios
  IF v_profile.full_name IS NULL OR v_profile.full_name = '' THEN
    v_missing := array_append(v_missing, 'full_name');
  END IF;
  IF v_profile.username IS NULL OR v_profile.username = '' THEN
    v_missing := array_append(v_missing, 'username');
  END IF;
  IF v_profile.phone IS NULL OR v_profile.phone = '' THEN
    v_missing := array_append(v_missing, 'phone');
  END IF;
  IF v_profile.email IS NULL OR v_profile.email = '' THEN
    v_missing := array_append(v_missing, 'email');
  END IF;
  IF v_profile.country IS NULL OR v_profile.country = '' THEN
    v_missing := array_append(v_missing, 'country');
  END IF;
  IF v_profile.city IS NULL OR v_profile.city = '' THEN
    v_missing := array_append(v_missing, 'city');
  END IF;
  IF v_profile.address IS NULL OR v_profile.address = '' THEN
    v_missing := array_append(v_missing, 'address');
  END IF;
  IF v_profile.document_type IS NULL OR v_profile.document_type = '' THEN
    v_missing := array_append(v_missing, 'document_type');
  END IF;
  IF v_profile.document_number IS NULL OR v_profile.document_number = '' THEN
    v_missing := array_append(v_missing, 'document_number');
  END IF;
  IF v_profile.nationality IS NULL OR v_profile.nationality = '' THEN
    v_missing := array_append(v_missing, 'nationality');
  END IF;
  -- NUEVO: gender es requerido
  IF v_profile.gender IS NULL OR v_profile.gender = '' THEN
    v_missing := array_append(v_missing, 'gender');
  END IF;
  IF v_profile.date_of_birth IS NULL THEN
    v_missing := array_append(v_missing, 'date_of_birth');
  ELSE
    -- Verificar edad >= 18
    IF (CURRENT_DATE - v_profile.date_of_birth) / 365 >= 18 THEN
      v_age_ok := true;
    ELSE
      v_missing := array_append(v_missing, 'age_under_18');
    END IF;
  END IF;

  -- Al menos UNA red social
  IF COALESCE(v_profile.social_instagram, v_profile.instagram, '') != ''
     OR COALESCE(v_profile.social_facebook, v_profile.facebook, '') != ''
     OR COALESCE(v_profile.social_tiktok, v_profile.tiktok, '') != ''
     OR COALESCE(v_profile.social_x, '') != ''
     OR COALESCE(v_profile.social_youtube, '') != ''
     OR COALESCE(v_profile.social_linkedin, '') != '' THEN
    v_has_social := true;
  END IF;

  IF NOT v_has_social THEN
    v_missing := array_append(v_missing, 'social_network');
  END IF;

  -- Resultado
  v_result := jsonb_build_object(
    'complete', (array_length(v_missing, 1) IS NULL OR array_length(v_missing, 1) = 0),
    'missing', v_missing,
    'has_social', v_has_social,
    'age_ok', v_age_ok,
    'profile_completed', COALESCE(v_profile.profile_completed, false),
    'age_verified', COALESCE(v_profile.age_verified, false),
    'legal_consents_completed', COALESCE(v_profile.legal_consents_completed, false),
    'onboarding_completed', COALESCE(v_profile.onboarding_completed, false)
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_pending_consents(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION check_profile_completion(UUID) TO authenticated;

NOTIFY pgrst, 'reload schema';
