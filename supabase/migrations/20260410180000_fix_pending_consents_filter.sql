-- ============================================================================
-- Fix: get_pending_consents debe filtrar por trigger_event
--
-- Problema: La función devuelve documentos con trigger_event='first_upload'
-- durante el onboarding, cuando solo debería devolver los de 'registration'.
--
-- Documentos afectados:
-- - dmca_policy (trigger: first_upload) - solo al subir contenido
-- - content_moderation_policy (trigger: first_upload) - solo al subir contenido
-- ============================================================================

-- Primero, verificar y corregir la función get_pending_consents
CREATE OR REPLACE FUNCTION get_pending_consents(p_user_id UUID, p_trigger_event TEXT DEFAULT 'registration')
RETURNS TABLE (
  document_id UUID,
  document_type TEXT,
  title TEXT,
  description TEXT,
  version TEXT,
  is_required BOOLEAN,
  requires_signature BOOLEAN,
  signature_method TEXT,
  user_role TEXT,
  trigger_event TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ld.id AS document_id,
    ld.document_type,
    ld.title,
    ld.description,
    ld.version,
    COALESCE(ldr.is_required, true) AS is_required,
    COALESCE(ld.requires_signature, false) AS requires_signature,
    COALESCE(ld.signature_method, 'clickwrap') AS signature_method,
    COALESCE(ldr.user_role, 'all') AS user_role,
    COALESCE(ldr.trigger_event, 'registration') AS trigger_event
  FROM legal_documents ld
  LEFT JOIN legal_document_requirements ldr ON ld.document_type = ldr.document_type
  WHERE ld.is_active = true
    AND ld.is_published = true
    -- Solo documentos del trigger solicitado O sin trigger específico
    AND (
      ldr.trigger_event = p_trigger_event
      OR ldr.trigger_event IS NULL
      OR (p_trigger_event = 'registration' AND ldr.trigger_event = 'registration')
    )
    -- Excluir documentos ya aceptados por este usuario
    AND NOT EXISTS (
      SELECT 1 FROM legal_consents lc
      WHERE lc.user_id = p_user_id
        AND lc.document_id = ld.id
        AND lc.is_active = true
    )
    -- Filtrar por rol del usuario
    AND (
      ldr.user_role = 'all'
      OR ldr.user_role IS NULL
      OR EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = p_user_id
          AND (
            -- Si es talent/creator
            (ldr.user_role = 'creator' AND p.account_type = 'talent')
            OR (ldr.user_role = 'talent' AND p.account_type = 'talent')
            -- Si es brand/client
            OR (ldr.user_role = 'brand' AND p.account_type = 'client')
            OR (ldr.user_role = 'client' AND p.account_type = 'client')
            -- Si es organization
            OR (ldr.user_role = 'organization' AND p.account_type = 'organization')
          )
      )
    )
  ORDER BY
    CASE ld.document_type
      WHEN 'terms_of_service' THEN 1
      WHEN 'privacy_policy' THEN 2
      WHEN 'acceptable_use_policy' THEN 3
      WHEN 'age_verification_policy' THEN 4
      WHEN 'creator_agreement' THEN 5
      WHEN 'brand_agreement' THEN 6
      ELSE 10
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Actualizar complete_onboarding para usar el filtro correcto
CREATE OR REPLACE FUNCTION complete_onboarding(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_check JSONB;
  v_consents_ok BOOLEAN;
BEGIN
  -- Verificar que el perfil esté completo
  v_check := check_profile_completion(p_user_id);

  IF NOT (v_check->>'complete')::boolean THEN
    RETURN false;
  END IF;

  -- Verificar que los consentimientos de REGISTRO estén aceptados
  -- Solo verificamos trigger_event = 'registration', NO 'first_upload'
  BEGIN
    SELECT NOT EXISTS (
      SELECT 1 FROM get_pending_consents(p_user_id, 'registration')
      WHERE is_required = true
    ) INTO v_consents_ok;
  EXCEPTION WHEN undefined_function THEN
    v_consents_ok := true;
  END;

  IF NOT v_consents_ok THEN
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

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentarios
COMMENT ON FUNCTION get_pending_consents(UUID, TEXT) IS
'Devuelve documentos legales pendientes de aceptar. El parámetro p_trigger_event filtra por tipo:
- registration: documentos requeridos para completar registro
- first_upload: documentos requeridos antes del primer upload de contenido
- first_transaction: documentos requeridos antes de la primera transacción';

COMMENT ON FUNCTION complete_onboarding(UUID) IS
'Completa el onboarding verificando perfil y consentimientos de REGISTRO únicamente.
Documentos de first_upload y first_transaction se verifican en sus respectivos flujos.';

-- Notificar cambio de esquema
NOTIFY pgrst, 'reload schema';
