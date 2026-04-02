-- =====================================================
-- Sistema de Bypass de Consentimientos Legales
-- Migration: 20260312150000_consent_bypass_system
-- Descripcion: Permite que admins otorguen acceso a la plataforma
--              sin que el usuario haya aceptado los consentimientos.
--              Los consentimientos quedan PENDIENTES, solo se bypasea
--              la verificacion de acceso.
-- =====================================================

-- 1. Agregar campos a profiles para el bypass
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS consent_bypass BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS consent_bypass_granted_by UUID REFERENCES auth.users(id);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS consent_bypass_granted_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS consent_bypass_reason TEXT;

COMMENT ON COLUMN profiles.consent_bypass IS 'Si true, el usuario puede acceder sin haber aceptado consentimientos legales';
COMMENT ON COLUMN profiles.consent_bypass_granted_by IS 'Admin que otorgo el bypass';
COMMENT ON COLUMN profiles.consent_bypass_granted_at IS 'Fecha y hora en que se otorgo el bypass';
COMMENT ON COLUMN profiles.consent_bypass_reason IS 'Razon por la que se otorgo el bypass';

-- 2. Tabla de auditoria para registrar todos los cambios de bypass
CREATE TABLE IF NOT EXISTS consent_bypass_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('granted', 'revoked')),
  granted_by UUID NOT NULL REFERENCES auth.users(id),
  granted_by_email TEXT NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE consent_bypass_audit IS 'Registro de auditoria de todos los bypass de consentimientos otorgados/revocados';

-- Indices
CREATE INDEX IF NOT EXISTS idx_consent_bypass_audit_user ON consent_bypass_audit(user_id);
CREATE INDEX IF NOT EXISTS idx_consent_bypass_audit_granted_by ON consent_bypass_audit(granted_by);
CREATE INDEX IF NOT EXISTS idx_consent_bypass_audit_created ON consent_bypass_audit(created_at DESC);

-- RLS para audit
ALTER TABLE consent_bypass_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_can_read_bypass_audit" ON consent_bypass_audit
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.is_platform_admin = true OR profiles.email IN ('jacsolucionesgraficas@gmail.com', 'kairosgp.sas@gmail.com'))
    )
  );

-- 3. Modificar get_pending_consents para respetar el bypass
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
  v_has_bypass BOOLEAN;
BEGIN
  -- Verificar si el usuario tiene bypass de consentimientos
  SELECT COALESCE(consent_bypass, false) INTO v_has_bypass
  FROM profiles
  WHERE id = p_user_id;

  -- Si tiene bypass, no retornar documentos pendientes
  IF v_has_bypass THEN
    RETURN;
  END IF;

  -- Logica normal: retornar documentos pendientes
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
    AND (lcr.user_role = 'all' OR lcr.user_role IN (
      SELECT omr.role FROM organization_member_roles omr
      JOIN organization_members om ON om.id = omr.member_id
      WHERE om.user_id = p_user_id
    ))
    AND NOT EXISTS (
      SELECT 1 FROM user_legal_consents ulc
      WHERE ulc.user_id = p_user_id
        AND ulc.document_id = ld.id
        AND ulc.accepted = true
        AND ulc.is_current = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Funcion para que admin otorgue bypass
CREATE OR REPLACE FUNCTION admin_grant_consent_bypass(
  p_user_email TEXT,
  p_reason TEXT DEFAULT 'Solicitud directa aprobada por admin'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id UUID;
  v_admin_email TEXT;
  v_user_id UUID;
  v_is_admin BOOLEAN;
BEGIN
  -- Obtener info del admin actual
  SELECT id, email,
    (is_platform_admin = true OR email IN ('jacsolucionesgraficas@gmail.com', 'kairosgp.sas@gmail.com'))
  INTO v_admin_id, v_admin_email, v_is_admin
  FROM profiles
  WHERE id = auth.uid();

  -- Verificar permisos
  IF NOT v_is_admin THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'No tienes permisos para otorgar bypass de consentimientos'
    );
  END IF;

  -- Buscar el usuario por email
  SELECT id INTO v_user_id
  FROM profiles
  WHERE LOWER(email) = LOWER(TRIM(p_user_email));

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Usuario no encontrado: ' || p_user_email
    );
  END IF;

  -- Otorgar el bypass
  UPDATE profiles
  SET
    consent_bypass = true,
    consent_bypass_granted_by = v_admin_id,
    consent_bypass_granted_at = NOW(),
    consent_bypass_reason = p_reason
  WHERE id = v_user_id;

  -- Registrar en auditoria
  INSERT INTO consent_bypass_audit (user_id, user_email, action, granted_by, granted_by_email, reason)
  VALUES (v_user_id, p_user_email, 'granted', v_admin_id, v_admin_email, p_reason);

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Bypass de consentimientos otorgado exitosamente',
    'user_email', p_user_email,
    'granted_by', v_admin_email,
    'granted_at', NOW()
  );
END;
$$;

-- 5. Funcion para revocar bypass
CREATE OR REPLACE FUNCTION admin_revoke_consent_bypass(
  p_user_email TEXT,
  p_reason TEXT DEFAULT 'Revocado por admin'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id UUID;
  v_admin_email TEXT;
  v_user_id UUID;
  v_is_admin BOOLEAN;
BEGIN
  -- Obtener info del admin actual
  SELECT id, email,
    (is_platform_admin = true OR email IN ('jacsolucionesgraficas@gmail.com', 'kairosgp.sas@gmail.com'))
  INTO v_admin_id, v_admin_email, v_is_admin
  FROM profiles
  WHERE id = auth.uid();

  -- Verificar permisos
  IF NOT v_is_admin THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'No tienes permisos para revocar bypass de consentimientos'
    );
  END IF;

  -- Buscar el usuario por email
  SELECT id INTO v_user_id
  FROM profiles
  WHERE LOWER(email) = LOWER(TRIM(p_user_email));

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Usuario no encontrado: ' || p_user_email
    );
  END IF;

  -- Revocar el bypass
  UPDATE profiles
  SET
    consent_bypass = false,
    consent_bypass_granted_by = NULL,
    consent_bypass_granted_at = NULL,
    consent_bypass_reason = NULL
  WHERE id = v_user_id;

  -- Registrar en auditoria
  INSERT INTO consent_bypass_audit (user_id, user_email, action, granted_by, granted_by_email, reason)
  VALUES (v_user_id, p_user_email, 'revoked', v_admin_id, v_admin_email, p_reason);

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Bypass de consentimientos revocado. El usuario debera aceptar los documentos para continuar.',
    'user_email', p_user_email,
    'revoked_by', v_admin_email,
    'revoked_at', NOW()
  );
END;
$$;

-- 6. Funcion para consultar estado de bypass de un usuario
CREATE OR REPLACE FUNCTION get_consent_bypass_status(p_user_email TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin BOOLEAN;
  v_result RECORD;
BEGIN
  -- Verificar permisos
  SELECT (is_platform_admin = true OR email IN ('jacsolucionesgraficas@gmail.com', 'kairosgp.sas@gmail.com'))
  INTO v_is_admin
  FROM profiles
  WHERE id = auth.uid();

  IF NOT v_is_admin THEN
    RETURN jsonb_build_object('error', 'No autorizado');
  END IF;

  -- Obtener estado
  SELECT
    p.id,
    p.email,
    p.full_name,
    COALESCE(p.consent_bypass, false) as has_bypass,
    p.consent_bypass_granted_at,
    p.consent_bypass_reason,
    admin.email as granted_by_email
  INTO v_result
  FROM profiles p
  LEFT JOIN profiles admin ON admin.id = p.consent_bypass_granted_by
  WHERE LOWER(p.email) = LOWER(TRIM(p_user_email));

  IF v_result IS NULL THEN
    RETURN jsonb_build_object('error', 'Usuario no encontrado');
  END IF;

  RETURN jsonb_build_object(
    'user_id', v_result.id,
    'email', v_result.email,
    'full_name', v_result.full_name,
    'has_bypass', v_result.has_bypass,
    'granted_at', v_result.consent_bypass_granted_at,
    'granted_by', v_result.granted_by_email,
    'reason', v_result.consent_bypass_reason
  );
END;
$$;

-- Grants
GRANT EXECUTE ON FUNCTION admin_grant_consent_bypass(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_revoke_consent_bypass(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_consent_bypass_status(TEXT) TO authenticated;
GRANT ALL ON consent_bypass_audit TO authenticated;
GRANT ALL ON consent_bypass_audit TO service_role;

-- Notificar cambio de schema
NOTIFY pgrst, 'reload schema';
