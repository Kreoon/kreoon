-- Fix: get_pending_consents con columnas correctas

DROP FUNCTION IF EXISTS get_pending_consents(UUID, TEXT);

CREATE FUNCTION get_pending_consents(p_user_id UUID, p_trigger_event TEXT DEFAULT 'registration')
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
  v_account_type TEXT;
BEGIN
  -- Obtener el tipo de cuenta del usuario
  SELECT p.user_type INTO v_account_type
  FROM profiles p
  WHERE p.id = p_user_id;

  RETURN QUERY
  SELECT
    ld.id AS document_id,
    ld.document_type,
    ld.title,
    ld.version,
    ld.summary,
    lcr.is_required,
    lcr.trigger_event,
    lcr.display_order,
    lcr.user_role,
    lcr.account_type
  FROM legal_documents ld
  INNER JOIN legal_consent_requirements lcr ON ld.document_type = lcr.document_type
  WHERE ld.is_current = true
    -- Solo documentos del trigger solicitado (no deprecated)
    AND lcr.trigger_event = p_trigger_event
    AND lcr.is_required = true
    -- Filtrar por account_type si está especificado
    AND (
      lcr.account_type IS NULL
      OR lcr.account_type = v_account_type
    )
    -- Filtrar por user_role
    AND (
      lcr.user_role = 'all'
      OR (lcr.user_role = 'creator' AND v_account_type = 'talent')
      OR (lcr.user_role = 'talent' AND v_account_type = 'talent')
      OR (lcr.user_role = 'brand' AND v_account_type = 'client')
      OR (lcr.user_role = 'client' AND v_account_type = 'client')
      OR (lcr.user_role = 'organization' AND v_account_type = 'organization')
    )
    -- Excluir documentos ya aceptados
    AND NOT EXISTS (
      SELECT 1 FROM user_legal_consents ulc
      WHERE ulc.user_id = p_user_id
        AND ulc.document_id = ld.id
        AND ulc.accepted = true
        AND ulc.is_current = true
    )
  ORDER BY
    COALESCE(lcr.display_order, 99),
    CASE ld.document_type
      WHEN 'general_terms' THEN 1
      WHEN 'age_declaration' THEN 2
      WHEN 'talent_agreement' THEN 3
      WHEN 'brand_agreement' THEN 4
      WHEN 'client_agreement' THEN 5
      WHEN 'organization_agreement' THEN 6
      ELSE 10
    END;
END;
$$;

-- Grants
GRANT EXECUTE ON FUNCTION get_pending_consents(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_pending_consents(UUID, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION get_pending_consents(UUID, TEXT) TO service_role;

NOTIFY pgrst, 'reload schema';
