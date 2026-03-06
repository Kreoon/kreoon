-- ============================================
-- MIGRACIÓN: Sistema de Firmas Digitales
-- Fecha: 2026-03-05
-- Descripción: Tabla para registro de firmas electrónicas
--              con validez legal según Ley 527/1999 (CO),
--              ESIGN Act (US), eIDAS (EU)
-- ============================================

-- ============================================
-- TABLA: digital_signatures
-- Registro de cada firma electrónica en la plataforma
-- ============================================
CREATE TABLE IF NOT EXISTS digital_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Quién firma
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Qué documento firma
  document_id UUID NOT NULL REFERENCES legal_documents(id),
  document_type TEXT NOT NULL,
  document_version TEXT NOT NULL,
  document_hash TEXT NOT NULL,

  -- Datos de la firma
  signer_full_name TEXT NOT NULL,
  signer_document_type TEXT,
  signer_document_number TEXT,
  signer_email TEXT NOT NULL,

  -- Declaración firmada
  declaration_text TEXT NOT NULL,

  -- Evidencia técnica (prueba legal)
  ip_address INET NOT NULL,
  user_agent TEXT NOT NULL,
  geolocation JSONB,
  device_fingerprint TEXT,

  -- Tipo de firma
  signature_method TEXT NOT NULL DEFAULT 'typed_name' CHECK (signature_method IN (
    'clickwrap',
    'typed_name',
    'drawn_signature',
    'otp_verified'
  )),

  -- Firma visual (si aplica)
  signature_image_url TEXT,
  typed_signature TEXT,

  -- OTP verification (si aplica)
  otp_verified BOOLEAN DEFAULT false,
  otp_phone TEXT,
  otp_verified_at TIMESTAMPTZ,

  -- Vinculación con consentimiento legal
  consent_id UUID REFERENCES user_legal_consents(id),

  -- Metadata del navegador/dispositivo
  browser_info JSONB DEFAULT '{}'::jsonb,

  -- Estado
  status TEXT DEFAULT 'valid' CHECK (status IN ('valid', 'revoked', 'superseded')),
  revoked_at TIMESTAMPTZ,
  revoked_reason TEXT,
  superseded_by UUID REFERENCES digital_signatures(id),

  -- Timestamps
  signed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_signatures_user ON digital_signatures(user_id);
CREATE INDEX IF NOT EXISTS idx_signatures_document ON digital_signatures(document_id);
CREATE INDEX IF NOT EXISTS idx_signatures_status ON digital_signatures(status);
CREATE INDEX IF NOT EXISTS idx_signatures_date ON digital_signatures(signed_at);

-- RLS
ALTER TABLE digital_signatures ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_sees_own_signatures" ON digital_signatures;
CREATE POLICY "user_sees_own_signatures" ON digital_signatures
FOR SELECT TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "user_creates_own_signature" ON digital_signatures;
CREATE POLICY "user_creates_own_signature" ON digital_signatures
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

-- GRANTS
GRANT ALL ON digital_signatures TO authenticated;
GRANT ALL ON digital_signatures TO service_role;

-- ============================================
-- RPC: Firmar documento (transacción atómica)
-- ============================================
CREATE OR REPLACE FUNCTION sign_legal_document(
  p_user_id UUID,
  p_document_id UUID,
  p_signer_full_name TEXT,
  p_declaration_text TEXT DEFAULT NULL,
  p_signature_method TEXT DEFAULT 'typed_name',
  p_typed_signature TEXT DEFAULT NULL,
  p_signature_image_url TEXT DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT '',
  p_browser_info JSONB DEFAULT '{}'::jsonb,
  p_geolocation JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_doc RECORD;
  v_profile RECORD;
  v_signature_id UUID;
  v_consent_id UUID;
  v_declaration TEXT;
  v_doc_hash TEXT;
BEGIN
  -- Obtener documento
  SELECT * INTO v_doc FROM legal_documents WHERE id = p_document_id AND is_current = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Documento no encontrado o no vigente';
  END IF;

  -- Obtener perfil del usuario
  SELECT * INTO v_profile FROM profiles WHERE id = p_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Perfil no encontrado';
  END IF;

  -- Calcular hash del documento
  v_doc_hash := encode(sha256(v_doc.content_html::bytea), 'hex');

  -- Construir declaración si no se proporcionó
  v_declaration := COALESCE(p_declaration_text, FORMAT(
    'Yo, %s, identificado(a) con %s No. %s, declaro que he leído y acepto el documento "%s" versión %s de SICOMMER INT LLC. Confirmo que soy mayor de 18 años y que actúo de manera libre y voluntaria. Fecha: %s',
    p_signer_full_name,
    COALESCE(v_profile.document_type, 'documento'),
    COALESCE(v_profile.document_number, 'N/A'),
    v_doc.title,
    v_doc.version,
    TO_CHAR(NOW() AT TIME ZONE 'America/Bogota', 'DD/MM/YYYY HH24:MI:SS')
  ));

  -- Invalidar firma anterior del mismo documento (si existe)
  UPDATE digital_signatures SET
    status = 'superseded'
  WHERE user_id = p_user_id
    AND document_type = v_doc.document_type
    AND status = 'valid';

  -- Crear firma
  INSERT INTO digital_signatures (
    user_id, document_id, document_type, document_version,
    document_hash, signer_full_name, signer_document_type,
    signer_document_number, signer_email, declaration_text,
    ip_address, user_agent, geolocation, signature_method,
    typed_signature, signature_image_url, browser_info
  ) VALUES (
    p_user_id, p_document_id, v_doc.document_type, v_doc.version,
    v_doc_hash,
    p_signer_full_name, v_profile.document_type,
    v_profile.document_number, COALESCE(v_profile.email, ''),
    v_declaration,
    COALESCE(p_ip_address, '0.0.0.0'::inet), p_user_agent,
    p_geolocation, p_signature_method,
    p_typed_signature, p_signature_image_url, p_browser_info
  ) RETURNING id INTO v_signature_id;

  -- Crear/actualizar consentimiento legal
  INSERT INTO user_legal_consents (
    user_id, document_id, document_type, document_version,
    accepted, accepted_at, ip_address, user_agent, consent_method, is_current
  ) VALUES (
    p_user_id, p_document_id, v_doc.document_type, v_doc.version,
    true, NOW(), p_ip_address, p_user_agent, p_signature_method, true
  )
  ON CONFLICT (user_id, document_id) DO UPDATE SET
    accepted = true,
    accepted_at = NOW(),
    document_version = v_doc.version,
    ip_address = p_ip_address,
    user_agent = p_user_agent,
    consent_method = p_signature_method,
    is_current = true
  RETURNING id INTO v_consent_id;

  -- Vincular firma con consentimiento
  UPDATE digital_signatures SET consent_id = v_consent_id WHERE id = v_signature_id;

  RETURN v_signature_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- RPC: Obtener firmas del usuario
-- ============================================
CREATE OR REPLACE FUNCTION get_my_signatures(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  document_type TEXT,
  document_title TEXT,
  document_version TEXT,
  signature_method TEXT,
  signed_at TIMESTAMPTZ,
  status TEXT,
  signer_full_name TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ds.id,
    ds.document_type,
    ld.title AS document_title,
    ds.document_version,
    ds.signature_method,
    ds.signed_at,
    ds.status,
    ds.signer_full_name
  FROM digital_signatures ds
  JOIN legal_documents ld ON ld.id = ds.document_id
  WHERE ds.user_id = p_user_id
  ORDER BY ds.signed_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- RPC: Obtener detalle de firma para comprobante
-- ============================================
CREATE OR REPLACE FUNCTION get_signature_receipt(p_signature_id UUID, p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'id', ds.id,
    'document_type', ds.document_type,
    'document_title', ld.title,
    'document_version', ds.document_version,
    'document_hash', ds.document_hash,
    'signer_full_name', ds.signer_full_name,
    'signer_document_type', ds.signer_document_type,
    'signer_document_number', ds.signer_document_number,
    'signer_email', ds.signer_email,
    'declaration_text', ds.declaration_text,
    'signature_method', ds.signature_method,
    'typed_signature', ds.typed_signature,
    'signature_image_url', ds.signature_image_url,
    'ip_address', ds.ip_address::text,
    'signed_at', ds.signed_at,
    'status', ds.status
  ) INTO v_result
  FROM digital_signatures ds
  JOIN legal_documents ld ON ld.id = ds.document_id
  WHERE ds.id = p_signature_id AND ds.user_id = p_user_id;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Notificar cambio de esquema
-- ============================================
NOTIFY pgrst, 'reload schema';
