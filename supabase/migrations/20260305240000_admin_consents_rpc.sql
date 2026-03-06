-- =====================================================
-- RPCs para que admins vean consentimientos de otros usuarios
-- Migration: 20260305240000_admin_consents_rpc
-- =====================================================

-- Función para obtener consentimientos de un usuario (admin only)
CREATE OR REPLACE FUNCTION get_user_consents(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin BOOLEAN;
  v_consents JSONB;
BEGIN
  -- Verificar si el usuario actual es admin o es el mismo usuario
  SELECT (
    is_platform_admin = true
    OR id = p_user_id
    OR email IN ('jacsolucionesgraficas@gmail.com', 'kairosgp.sas@gmail.com')
  )
  INTO v_is_admin
  FROM profiles
  WHERE id = auth.uid();

  IF NOT v_is_admin THEN
    RETURN '[]'::jsonb;
  END IF;

  -- Obtener consentimientos
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', id,
        'document_type', document_type,
        'document_version', document_version,
        'accepted', accepted,
        'accepted_at', accepted_at,
        'consent_method', consent_method,
        'ip_address', ip_address,
        'user_agent', user_agent
      ) ORDER BY accepted_at DESC
    ),
    '[]'::jsonb
  )
  INTO v_consents
  FROM user_legal_consents
  WHERE user_id = p_user_id;

  RETURN v_consents;
END;
$$;

GRANT EXECUTE ON FUNCTION get_user_consents(UUID) TO authenticated;

-- Función para obtener firmas digitales de un usuario (admin only)
CREATE OR REPLACE FUNCTION get_user_signatures(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin BOOLEAN;
  v_signatures JSONB;
BEGIN
  -- Verificar si el usuario actual es admin o es el mismo usuario
  SELECT (
    is_platform_admin = true
    OR id = p_user_id
    OR email IN ('jacsolucionesgraficas@gmail.com', 'kairosgp.sas@gmail.com')
  )
  INTO v_is_admin
  FROM profiles
  WHERE id = auth.uid();

  IF NOT v_is_admin THEN
    RETURN '[]'::jsonb;
  END IF;

  -- Obtener firmas
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', id,
        'document_type', document_type,
        'document_version', document_version,
        'signer_full_name', signer_full_name,
        'signature_method', signature_method,
        'typed_signature', typed_signature,
        'signature_image_url', signature_image_url,
        'declaration_text', declaration_text,
        'ip_address', ip_address,
        'timestamp_utc', timestamp_utc,
        'status', status
      ) ORDER BY created_at DESC
    ),
    '[]'::jsonb
  )
  INTO v_signatures
  FROM digital_signatures
  WHERE user_id = p_user_id;

  RETURN v_signatures;
END;
$$;

GRANT EXECUTE ON FUNCTION get_user_signatures(UUID) TO authenticated;

-- Función para obtener resumen de documentos requeridos vs firmados
CREATE OR REPLACE FUNCTION get_user_legal_summary(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin BOOLEAN;
  v_consents_count INTEGER;
  v_signatures_count INTEGER;
  v_onboarding_completed BOOLEAN;
  v_required_docs TEXT[];
  v_signed_docs TEXT[];
  v_missing_docs TEXT[];
BEGIN
  -- Verificar si el usuario actual es admin o es el mismo usuario
  SELECT (
    is_platform_admin = true
    OR id = p_user_id
    OR email IN ('jacsolucionesgraficas@gmail.com', 'kairosgp.sas@gmail.com')
  )
  INTO v_is_admin
  FROM profiles
  WHERE id = auth.uid();

  IF NOT v_is_admin THEN
    RETURN jsonb_build_object('error', 'unauthorized');
  END IF;

  -- Contar consentimientos
  SELECT COUNT(*) INTO v_consents_count
  FROM user_legal_consents WHERE user_id = p_user_id AND accepted = true;

  -- Contar firmas
  SELECT COUNT(*) INTO v_signatures_count
  FROM digital_signatures WHERE user_id = p_user_id AND status = 'valid';

  -- Estado de onboarding
  SELECT COALESCE(onboarding_completed, false)
  INTO v_onboarding_completed
  FROM profiles WHERE id = p_user_id;

  -- Documentos firmados
  SELECT ARRAY_AGG(DISTINCT document_type)
  INTO v_signed_docs
  FROM user_legal_consents
  WHERE user_id = p_user_id AND accepted = true;

  -- Documentos requeridos (basado en permission_group 'all')
  SELECT ARRAY_AGG(document_type)
  INTO v_required_docs
  FROM legal_documents
  WHERE is_current = true
    AND requires_signature = true
    AND is_mandatory = true
    AND 'all' = ANY(permission_groups);

  -- Calcular faltantes
  IF v_required_docs IS NOT NULL AND v_signed_docs IS NOT NULL THEN
    v_missing_docs := ARRAY(
      SELECT unnest(v_required_docs)
      EXCEPT
      SELECT unnest(v_signed_docs)
    );
  ELSE
    v_missing_docs := v_required_docs;
  END IF;

  RETURN jsonb_build_object(
    'consents_count', COALESCE(v_consents_count, 0),
    'signatures_count', COALESCE(v_signatures_count, 0),
    'onboarding_completed', v_onboarding_completed,
    'signed_docs', COALESCE(v_signed_docs, ARRAY[]::TEXT[]),
    'required_docs', COALESCE(v_required_docs, ARRAY[]::TEXT[]),
    'missing_docs', COALESCE(v_missing_docs, ARRAY[]::TEXT[])
  );
END;
$$;

GRANT EXECUTE ON FUNCTION get_user_legal_summary(UUID) TO authenticated;
