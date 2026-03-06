-- ============================================
-- MIGRACIÓN: Sistema de Documentos Legales y Consentimiento
-- Fecha: 2026-03-05
-- Descripción: Tablas para gestión de documentos legales versionados,
--              registro de consentimientos de usuarios, y verificación
--              de cumplimiento por tipo de usuario.
-- ============================================

-- ============================================
-- TABLA: legal_documents
-- Documentos legales versionados de la plataforma
-- ============================================
CREATE TABLE IF NOT EXISTS legal_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Tipo de documento
  document_type TEXT NOT NULL CHECK (document_type IN (
    'terms_of_service',
    'privacy_policy',
    'cookie_policy',
    'creator_agreement',
    'brand_agreement',
    'acceptable_use_policy',
    'dmca_policy',
    'content_moderation_policy',
    'escrow_payment_terms',
    'live_shopping_terms',
    'referral_terms',
    'data_processing_agreement',
    'white_label_agreement',
    'ai_usage_disclosure',
    'age_verification_policy'
  )),

  -- Versión
  version TEXT NOT NULL,             -- Ej: "1.0", "1.1", "2.0"
  version_date DATE NOT NULL,

  -- Contenido
  title TEXT NOT NULL,               -- Título en español
  title_en TEXT,                     -- Título en inglés
  content_html TEXT NOT NULL,        -- Contenido completo en HTML
  content_html_en TEXT,              -- Versión en inglés
  summary TEXT,                      -- Resumen en lenguaje claro

  -- Metadatos
  is_current BOOLEAN DEFAULT false,  -- ¿Es la versión vigente?
  is_required BOOLEAN DEFAULT true,  -- ¿Es obligatorio aceptar?
  applies_to TEXT[] DEFAULT '{all}', -- A quién aplica: ['all'], ['creator'], ['brand'], ['organization']

  -- Checksums para verificar integridad
  content_hash TEXT,                 -- SHA-256 del content_html

  -- Control
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Comentarios
COMMENT ON TABLE legal_documents IS 'Documentos legales versionados de la plataforma KREOON';
COMMENT ON COLUMN legal_documents.document_type IS 'Tipo de documento legal';
COMMENT ON COLUMN legal_documents.is_current IS 'Indica si es la versión vigente del documento';
COMMENT ON COLUMN legal_documents.content_hash IS 'Hash SHA-256 para verificar integridad';

-- Solo un documento vigente por tipo
CREATE UNIQUE INDEX IF NOT EXISTS idx_legal_docs_current
ON legal_documents(document_type)
WHERE is_current = true;

-- ============================================
-- TABLA: user_legal_consents
-- Registro de aceptación de cada usuario
-- ============================================
CREATE TABLE IF NOT EXISTS user_legal_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES legal_documents(id),
  document_type TEXT NOT NULL,
  document_version TEXT NOT NULL,

  -- Aceptación
  accepted BOOLEAN NOT NULL DEFAULT false,
  accepted_at TIMESTAMPTZ,

  -- Contexto de aceptación (prueba legal)
  ip_address INET,
  user_agent TEXT,
  consent_method TEXT DEFAULT 'clickwrap', -- 'clickwrap', 'browsewrap', 'sign'

  -- Para re-consentimiento
  superseded_by UUID REFERENCES user_legal_consents(id),
  is_current BOOLEAN DEFAULT true,

  -- Revocación (donde aplique)
  revoked BOOLEAN DEFAULT false,
  revoked_at TIMESTAMPTZ,
  revocation_reason TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, document_id)
);

COMMENT ON TABLE user_legal_consents IS 'Registro de aceptación de documentos legales por usuario';
COMMENT ON COLUMN user_legal_consents.consent_method IS 'Método de consentimiento: clickwrap (checkbox), browsewrap (uso implica aceptación), sign (firma)';

-- ============================================
-- TABLA: legal_consent_requirements
-- Define qué documentos debe aceptar cada tipo de usuario
-- ============================================
CREATE TABLE IF NOT EXISTS legal_consent_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  document_type TEXT NOT NULL,
  user_role TEXT NOT NULL,            -- 'all', 'creator', 'brand', 'organization', 'client'
  is_required BOOLEAN DEFAULT true,
  required_at TEXT DEFAULT 'registration', -- 'registration', 'first_upload', 'first_transaction', 'first_live'

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(document_type, user_role)
);

COMMENT ON TABLE legal_consent_requirements IS 'Define qué documentos debe aceptar cada tipo de usuario';

-- ============================================
-- TABLA: age_verifications
-- Registro de verificaciones de edad
-- ============================================
CREATE TABLE IF NOT EXISTS age_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Declaración
  declared_age_18_plus BOOLEAN NOT NULL DEFAULT false,
  declared_at TIMESTAMPTZ,

  -- Contexto
  ip_address INET,
  user_agent TEXT,

  -- Verificación adicional (opcional, para contenido restringido)
  verification_method TEXT, -- 'self_declaration', 'document_upload', 'third_party'
  verification_status TEXT DEFAULT 'pending', -- 'pending', 'verified', 'rejected'
  verified_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE age_verifications IS 'Registro de verificaciones de edad de usuarios';

-- ============================================
-- ÍNDICES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_legal_docs_type ON legal_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_legal_docs_current_flag ON legal_documents(is_current);
CREATE INDEX IF NOT EXISTS idx_consents_user ON user_legal_consents(user_id);
CREATE INDEX IF NOT EXISTS idx_consents_document ON user_legal_consents(document_id);
CREATE INDEX IF NOT EXISTS idx_consents_current ON user_legal_consents(user_id, is_current) WHERE is_current = true;
CREATE INDEX IF NOT EXISTS idx_consent_reqs_role ON legal_consent_requirements(user_role);
CREATE INDEX IF NOT EXISTS idx_age_verifications_user ON age_verifications(user_id);

-- ============================================
-- RLS (Row Level Security)
-- ============================================
ALTER TABLE legal_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_legal_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE legal_consent_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE age_verifications ENABLE ROW LEVEL SECURITY;

-- Documentos legales: todos pueden leer, solo admin puede escribir
CREATE POLICY "anyone_can_read_legal_docs" ON legal_documents
FOR SELECT TO authenticated USING (true);

CREATE POLICY "anon_can_read_legal_docs" ON legal_documents
FOR SELECT TO anon USING (is_current = true);

CREATE POLICY "admin_can_manage_legal_docs" ON legal_documents
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM organization_members om
    JOIN organization_member_roles omr ON om.id = omr.member_id
    WHERE om.user_id = auth.uid() AND omr.role = 'admin'
  )
);

-- Consentimientos: usuario ve los suyos, admin ve todos
CREATE POLICY "user_sees_own_consents" ON user_legal_consents
FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "user_creates_own_consent" ON user_legal_consents
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_updates_own_consent" ON user_legal_consents
FOR UPDATE TO authenticated
USING (user_id = auth.uid());

-- Requirements: todos pueden leer
CREATE POLICY "anyone_reads_requirements" ON legal_consent_requirements
FOR SELECT TO authenticated USING (true);

CREATE POLICY "anon_reads_requirements" ON legal_consent_requirements
FOR SELECT TO anon USING (true);

-- Age verifications: usuario ve las suyas
CREATE POLICY "user_sees_own_age_verification" ON age_verifications
FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "user_creates_own_age_verification" ON age_verifications
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

-- ============================================
-- GRANTS
-- ============================================
GRANT SELECT ON legal_documents TO anon;
GRANT ALL ON legal_documents TO authenticated;
GRANT ALL ON legal_documents TO service_role;
GRANT SELECT ON legal_consent_requirements TO anon;
GRANT ALL ON user_legal_consents TO authenticated;
GRANT ALL ON user_legal_consents TO service_role;
GRANT ALL ON legal_consent_requirements TO authenticated;
GRANT ALL ON legal_consent_requirements TO service_role;
GRANT ALL ON age_verifications TO authenticated;
GRANT ALL ON age_verifications TO service_role;

-- ============================================
-- SEED: Requirements por tipo de usuario
-- ============================================
INSERT INTO legal_consent_requirements (document_type, user_role, is_required, required_at) VALUES
-- Todos los usuarios al registrarse
('terms_of_service', 'all', true, 'registration'),
('privacy_policy', 'all', true, 'registration'),
('acceptable_use_policy', 'all', true, 'registration'),
('age_verification_policy', 'all', true, 'registration'),
-- Creadores
('creator_agreement', 'creator', true, 'registration'),
('content_moderation_policy', 'creator', true, 'first_upload'),
('dmca_policy', 'creator', true, 'first_upload'),
-- Marcas/Clientes
('brand_agreement', 'brand', true, 'registration'),
('escrow_payment_terms', 'brand', true, 'first_transaction'),
-- Live shopping
('live_shopping_terms', 'creator', true, 'first_live'),
('live_shopping_terms', 'brand', true, 'first_live'),
-- Organizaciones
('white_label_agreement', 'organization', true, 'registration'),
('data_processing_agreement', 'organization', true, 'registration')
ON CONFLICT (document_type, user_role) DO NOTHING;

-- ============================================
-- FUNCIONES RPC
-- ============================================

-- Verificar si usuario tiene todos los consentimientos requeridos
CREATE OR REPLACE FUNCTION check_user_consents(p_user_id UUID, p_user_role TEXT)
RETURNS TABLE (
  document_type TEXT,
  is_required BOOLEAN,
  is_accepted BOOLEAN,
  document_version TEXT,
  accepted_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    lcr.document_type,
    lcr.is_required,
    COALESCE(ulc.accepted, false) AS is_accepted,
    ulc.document_version,
    ulc.accepted_at
  FROM legal_consent_requirements lcr
  LEFT JOIN legal_documents ld
    ON ld.document_type = lcr.document_type AND ld.is_current = true
  LEFT JOIN user_legal_consents ulc
    ON ulc.user_id = p_user_id
    AND ulc.document_id = ld.id
    AND ulc.is_current = true
    AND ulc.accepted = true
  WHERE lcr.user_role IN ('all', p_user_role);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verificar si hay documentos nuevos que el usuario no ha aceptado
CREATE OR REPLACE FUNCTION get_pending_consents(p_user_id UUID)
RETURNS TABLE (
  document_id UUID,
  document_type TEXT,
  title TEXT,
  version TEXT,
  summary TEXT,
  is_required BOOLEAN
) AS $$
BEGIN
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

-- Registrar consentimiento
CREATE OR REPLACE FUNCTION record_consent(
  p_user_id UUID,
  p_document_id UUID,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_consent_id UUID;
  v_doc_type TEXT;
  v_doc_version TEXT;
  v_old_consent_id UUID;
BEGIN
  -- Obtener info del documento
  SELECT document_type, version INTO v_doc_type, v_doc_version
  FROM legal_documents WHERE id = p_document_id;

  IF v_doc_type IS NULL THEN
    RAISE EXCEPTION 'Documento no encontrado: %', p_document_id;
  END IF;

  -- Marcar consentimientos anteriores como superseded
  UPDATE user_legal_consents
  SET is_current = false
  WHERE user_id = p_user_id
    AND document_type = v_doc_type
    AND is_current = true
  RETURNING id INTO v_old_consent_id;

  -- Insertar nuevo consentimiento
  INSERT INTO user_legal_consents (
    user_id, document_id, document_type, document_version,
    accepted, accepted_at, ip_address, user_agent,
    consent_method, superseded_by, is_current
  ) VALUES (
    p_user_id, p_document_id, v_doc_type, v_doc_version,
    true, NOW(), p_ip_address, p_user_agent,
    'clickwrap', NULL, true
  )
  ON CONFLICT (user_id, document_id)
  DO UPDATE SET
    accepted = true,
    accepted_at = NOW(),
    ip_address = p_ip_address,
    user_agent = p_user_agent,
    is_current = true
  RETURNING id INTO v_consent_id;

  -- Actualizar referencia del anterior
  IF v_old_consent_id IS NOT NULL THEN
    UPDATE user_legal_consents
    SET superseded_by = v_consent_id
    WHERE id = v_old_consent_id;
  END IF;

  RETURN v_consent_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Registrar verificación de edad
CREATE OR REPLACE FUNCTION record_age_verification(
  p_user_id UUID,
  p_declared_age_18_plus BOOLEAN,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_verification_id UUID;
BEGIN
  INSERT INTO age_verifications (
    user_id, declared_age_18_plus, declared_at,
    ip_address, user_agent, verification_method, verification_status
  ) VALUES (
    p_user_id, p_declared_age_18_plus, NOW(),
    p_ip_address, p_user_agent, 'self_declaration',
    CASE WHEN p_declared_age_18_plus THEN 'verified' ELSE 'rejected' END
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_verification_id;

  -- Si no se insertó (ya existía), obtener el existente
  IF v_verification_id IS NULL THEN
    SELECT id INTO v_verification_id
    FROM age_verifications
    WHERE user_id = p_user_id
    LIMIT 1;
  END IF;

  RETURN v_verification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verificar si usuario es mayor de edad
CREATE OR REPLACE FUNCTION is_user_age_verified(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM age_verifications
    WHERE user_id = p_user_id
      AND declared_age_18_plus = true
      AND verification_status = 'verified'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Notificar cambio de esquema
NOTIFY pgrst, 'reload schema';
