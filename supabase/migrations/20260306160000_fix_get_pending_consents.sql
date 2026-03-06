-- =====================================================
-- Fix: get_pending_consents usaba member_id que no existe
-- La tabla organization_member_roles tiene user_id directamente
-- También se arregla el cast de app_role a TEXT
-- =====================================================

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
  v_org_roles TEXT[];
BEGIN
  -- Inicializar con 'all'
  v_user_roles := ARRAY['all'];

  -- Verificar si tiene creator_profile
  IF EXISTS (SELECT 1 FROM creator_profiles WHERE user_id = p_user_id) THEN
    v_user_roles := array_append(v_user_roles, 'creator');
  END IF;

  -- Agregar roles organizacionales (corregido: usar user_id directamente y cast a TEXT)
  SELECT COALESCE(array_agg(DISTINCT omr.role::TEXT), ARRAY[]::TEXT[])
  INTO v_org_roles
  FROM organization_member_roles omr
  WHERE omr.user_id = p_user_id;

  v_user_roles := v_user_roles || v_org_roles;

  -- Verificar si es cliente/marca
  IF EXISTS (SELECT 1 FROM client_users WHERE user_id = p_user_id) THEN
    v_user_roles := array_append(v_user_roles, 'brand');
    v_user_roles := array_append(v_user_roles, 'client');
  END IF;

  -- Verificar si pertenece a una organización
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

GRANT EXECUTE ON FUNCTION get_pending_consents(UUID) TO authenticated;

NOTIFY pgrst, 'reload schema';
