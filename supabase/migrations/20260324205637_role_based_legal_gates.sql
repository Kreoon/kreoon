-- ============================================================
-- Migración: Sistema de Documentos Legales Segmentados por Rol
-- Versión: 1.0
-- Fecha: 2026-03-24
-- ============================================================

-- 1. Agregar columna trigger_event a legal_consent_requirements
ALTER TABLE legal_consent_requirements
ADD COLUMN IF NOT EXISTS trigger_event TEXT DEFAULT 'registration';

-- 2. Agregar columna display_order a legal_consent_requirements
ALTER TABLE legal_consent_requirements
ADD COLUMN IF NOT EXISTS display_order INT DEFAULT 100;

-- 3. Crear tabla role_legal_gates
CREATE TABLE IF NOT EXISTS role_legal_gates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_role TEXT NOT NULL,
  required_documents TEXT[] NOT NULL,
  gate_title TEXT NOT NULL,
  gate_description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(target_role)
);

-- 4. Habilitar RLS en role_legal_gates
ALTER TABLE role_legal_gates ENABLE ROW LEVEL SECURITY;

-- 5. Política de lectura para role_legal_gates (todos pueden leer)
CREATE POLICY "role_legal_gates_select_policy"
ON role_legal_gates
FOR SELECT
TO authenticated
USING (true);

-- 6. Insertar nuevos documentos legales simplificados
INSERT INTO legal_documents (
  document_type,
  version,
  title,
  title_en,
  summary,
  content_html,
  is_current,
  is_required,
  applies_to,
  published_at
) VALUES
(
  'age_declaration',
  'v1.0',
  'Declaración de Edad',
  'Age Declaration',
  'Declaración jurada de ser mayor de 18 años con capacidad legal para contratar.',
  '<!-- Ver public/legal/age_declaration_v1.html -->',
  true,
  true,
  ARRAY['all'],
  NOW()
),
(
  'general_terms',
  'v1.0',
  'Términos Generales KREOON',
  'KREOON General Terms',
  'Términos de Servicio, Política de Privacidad, Tratamiento de Datos y Licencia de Uso integrados.',
  '<!-- Ver public/legal/general_terms_v1.html -->',
  true,
  true,
  ARRAY['all'],
  NOW()
)
ON CONFLICT (document_type, version) DO UPDATE SET
  title = EXCLUDED.title,
  title_en = EXCLUDED.title_en,
  summary = EXCLUDED.summary,
  is_current = EXCLUDED.is_current,
  is_required = EXCLUDED.is_required,
  applies_to = EXCLUDED.applies_to,
  published_at = EXCLUDED.published_at;

-- 7. Actualizar creator_agreement a versión 2.0 (cesión perpetua)
INSERT INTO legal_documents (
  document_type,
  version,
  title,
  title_en,
  summary,
  content_html,
  is_current,
  is_required,
  applies_to,
  published_at
) VALUES (
  'creator_agreement',
  'v2.0',
  'Acuerdo de Creador',
  'Creator Agreement',
  'Acuerdo de cesión perpetua de derechos patrimoniales y autorización de uso de imagen sin límite de tiempo.',
  '<!-- Ver public/legal/creator_agreement_v2.html -->',
  true,
  true,
  ARRAY['creator', 'editor'],
  NOW()
)
ON CONFLICT (document_type, version) DO UPDATE SET
  title = EXCLUDED.title,
  title_en = EXCLUDED.title_en,
  summary = EXCLUDED.summary,
  is_current = EXCLUDED.is_current,
  is_required = EXCLUDED.is_required,
  applies_to = EXCLUDED.applies_to,
  published_at = EXCLUDED.published_at;

-- 8. Marcar versión anterior de creator_agreement como no actual
UPDATE legal_documents
SET is_current = false
WHERE document_type = 'creator_agreement'
  AND version != 'v2.0';

-- 9. Configurar requisitos de consentimiento para nuevos documentos de registro
INSERT INTO legal_consent_requirements (
  document_type,
  user_role,
  is_required,
  trigger_event,
  display_order
) VALUES
('age_declaration', 'all', true, 'registration', 1),
('general_terms', 'all', true, 'registration', 2)
ON CONFLICT (document_type, user_role) DO UPDATE SET
  is_required = EXCLUDED.is_required,
  trigger_event = EXCLUDED.trigger_event,
  display_order = EXCLUDED.display_order;

-- 10. Marcar documentos antiguos como deprecated
UPDATE legal_consent_requirements
SET
  is_required = false,
  trigger_event = 'deprecated',
  display_order = 999
WHERE document_type IN (
  'terms_of_service',
  'privacy_policy',
  'acceptable_use_policy',
  'age_verification_policy',
  'cookie_policy'
);

-- 11. Configurar creator_agreement como documento de rol
INSERT INTO legal_consent_requirements (
  document_type,
  user_role,
  is_required,
  trigger_event,
  display_order
) VALUES
('creator_agreement', 'creator', true, 'role_assignment', 1),
('creator_agreement', 'editor', true, 'role_assignment', 1)
ON CONFLICT (document_type, user_role) DO UPDATE SET
  is_required = EXCLUDED.is_required,
  trigger_event = EXCLUDED.trigger_event,
  display_order = EXCLUDED.display_order;

-- 12. Insertar gates por rol
INSERT INTO role_legal_gates (
  target_role,
  required_documents,
  gate_title,
  gate_description,
  is_active
) VALUES
(
  'creator',
  ARRAY['creator_agreement'],
  'Acuerdo de Creador',
  'Para activar tu rol de Creador de Contenido, debes aceptar el Acuerdo de Creador que incluye la cesión perpetua de derechos de imagen.',
  true
),
(
  'editor',
  ARRAY['creator_agreement'],
  'Acuerdo de Creador',
  'Para activar tu rol de Editor, debes aceptar el Acuerdo de Creador que incluye la cesión perpetua de derechos de imagen.',
  true
)
ON CONFLICT (target_role) DO UPDATE SET
  required_documents = EXCLUDED.required_documents,
  gate_title = EXCLUDED.gate_title,
  gate_description = EXCLUDED.gate_description,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

-- 13. Crear función RPC para obtener documentos de registro
CREATE OR REPLACE FUNCTION get_registration_documents()
RETURNS TABLE (
  document_id UUID,
  document_type TEXT,
  title TEXT,
  version TEXT,
  summary TEXT,
  is_required BOOLEAN,
  display_order INT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ld.id AS document_id,
    ld.document_type,
    ld.title,
    ld.version,
    ld.summary,
    lcr.is_required,
    lcr.display_order
  FROM legal_documents ld
  JOIN legal_consent_requirements lcr ON lcr.document_type = ld.document_type
  WHERE ld.is_current = true
    AND lcr.user_role = 'all'
    AND lcr.trigger_event = 'registration'
    AND lcr.is_required = true
  ORDER BY lcr.display_order ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 14. Crear función RPC para obtener documentos pendientes por rol
CREATE OR REPLACE FUNCTION get_role_gate_documents(p_user_id UUID, p_role TEXT)
RETURNS TABLE (
  document_id UUID,
  document_type TEXT,
  title TEXT,
  version TEXT,
  summary TEXT,
  is_required BOOLEAN,
  already_signed BOOLEAN,
  gate_title TEXT,
  gate_description TEXT
) AS $$
DECLARE
  v_gate RECORD;
BEGIN
  -- Obtener configuración del gate
  SELECT * INTO v_gate
  FROM role_legal_gates
  WHERE target_role = p_role AND is_active = true;

  -- Si no hay gate para este rol, retornar vacío
  IF v_gate IS NULL THEN
    RETURN;
  END IF;

  -- Retornar documentos requeridos
  RETURN QUERY
  SELECT
    ld.id AS document_id,
    ld.document_type,
    ld.title,
    ld.version,
    ld.summary,
    true AS is_required,
    EXISTS (
      SELECT 1 FROM user_legal_consents ulc
      WHERE ulc.user_id = p_user_id
        AND ulc.document_id = ld.id
        AND ulc.accepted = true
        AND ulc.is_current = true
    ) AS already_signed,
    v_gate.gate_title,
    v_gate.gate_description
  FROM legal_documents ld
  WHERE ld.document_type = ANY(v_gate.required_documents)
    AND ld.is_current = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 15. Crear función RPC para verificar si un rol tiene documentos pendientes
CREATE OR REPLACE FUNCTION check_role_legal_gate(p_user_id UUID, p_role TEXT)
RETURNS TABLE (
  has_pending_documents BOOLEAN,
  pending_count INT,
  gate_title TEXT,
  gate_description TEXT
) AS $$
DECLARE
  v_gate RECORD;
  v_pending_count INT := 0;
BEGIN
  -- Obtener configuración del gate
  SELECT * INTO v_gate
  FROM role_legal_gates
  WHERE target_role = p_role AND is_active = true;

  -- Si no hay gate para este rol, puede proceder
  IF v_gate IS NULL THEN
    RETURN QUERY SELECT false, 0, NULL::TEXT, NULL::TEXT;
    RETURN;
  END IF;

  -- Contar documentos pendientes
  SELECT COUNT(*) INTO v_pending_count
  FROM unnest(v_gate.required_documents) AS doc_type
  WHERE NOT EXISTS (
    SELECT 1 FROM user_legal_consents ulc
    JOIN legal_documents ld ON ld.id = ulc.document_id
    WHERE ulc.user_id = p_user_id
      AND ld.document_type = doc_type
      AND ld.is_current = true
      AND ulc.accepted = true
      AND ulc.is_current = true
  );

  RETURN QUERY SELECT
    (v_pending_count > 0) AS has_pending_documents,
    v_pending_count AS pending_count,
    v_gate.gate_title,
    v_gate.gate_description;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 16. Trigger para actualizar updated_at en role_legal_gates
CREATE OR REPLACE FUNCTION update_role_legal_gates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS role_legal_gates_updated_at ON role_legal_gates;
CREATE TRIGGER role_legal_gates_updated_at
BEFORE UPDATE ON role_legal_gates
FOR EACH ROW
EXECUTE FUNCTION update_role_legal_gates_updated_at();

-- 17. Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_legal_consent_requirements_trigger_event
ON legal_consent_requirements(trigger_event);

CREATE INDEX IF NOT EXISTS idx_role_legal_gates_target_role
ON role_legal_gates(target_role) WHERE is_active = true;

-- Comentarios descriptivos
COMMENT ON TABLE role_legal_gates IS 'Configuración de documentos legales requeridos por rol';
COMMENT ON COLUMN role_legal_gates.target_role IS 'Rol que activa el gate (creator, editor, client, etc.)';
COMMENT ON COLUMN role_legal_gates.required_documents IS 'Array de document_type que el usuario debe aceptar';
COMMENT ON COLUMN role_legal_gates.gate_title IS 'Título mostrado en el modal de consentimiento';
COMMENT ON COLUMN role_legal_gates.gate_description IS 'Descripción/explicación del por qué se requieren estos documentos';
COMMENT ON COLUMN legal_consent_requirements.trigger_event IS 'Momento en que se muestra el documento: registration, role_assignment, first_content, deprecated';
COMMENT ON COLUMN legal_consent_requirements.display_order IS 'Orden de visualización (menor = primero)';
