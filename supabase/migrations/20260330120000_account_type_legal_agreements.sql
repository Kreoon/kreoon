-- =============================================================================
-- Migracion: Sistema Legal por Tipo de Cuenta
-- Fecha: 30 de marzo de 2026
-- Descripcion: Reestructura documentos legales segun account_type (talent, client, organization)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- PARTE 1: Agregar columna account_type a legal_consent_requirements
-- -----------------------------------------------------------------------------

ALTER TABLE legal_consent_requirements
ADD COLUMN IF NOT EXISTS account_type TEXT;

-- Agregar constraint para validar valores
ALTER TABLE legal_consent_requirements
DROP CONSTRAINT IF EXISTS legal_consent_requirements_account_type_check;

ALTER TABLE legal_consent_requirements
ADD CONSTRAINT legal_consent_requirements_account_type_check
CHECK (account_type IS NULL OR account_type IN ('talent', 'client', 'organization'));

COMMENT ON COLUMN legal_consent_requirements.account_type IS
'Tipo de cuenta al que aplica el documento: talent, client, organization, o NULL para todos';

-- -----------------------------------------------------------------------------
-- PARTE 1.5: Actualizar constraint de document_type en legal_documents
-- Agregar nuevos tipos: talent_agreement, client_agreement, organization_agreement
-- -----------------------------------------------------------------------------

ALTER TABLE legal_documents
DROP CONSTRAINT IF EXISTS legal_documents_document_type_check;

ALTER TABLE legal_documents
ADD CONSTRAINT legal_documents_document_type_check
CHECK (document_type IN (
  -- Tipos existentes en produccion
  'terms_of_service',
  'privacy_policy',
  'cookie_policy',
  'creator_agreement',
  'brand_agreement',
  'acceptable_use_policy',
  'dmca_policy',
  'content_moderation_policy',
  'escrow_payment_terms',
  'age_verification_policy',
  'age_declaration',
  'general_terms',
  -- Tipos adicionales del schema original
  'live_shopping_terms',
  'referral_terms',
  'data_processing_agreement',
  'white_label_agreement',
  'ai_usage_disclosure',
  -- Nuevos tipos unificados por account_type
  'talent_agreement',
  'client_agreement',
  'organization_agreement'
));

-- -----------------------------------------------------------------------------
-- PARTE 2: Crear tabla de bloqueos por incumplimiento de pago
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS account_payment_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  block_type TEXT NOT NULL CHECK (block_type IN (
    'client_payment_default',         -- Cliente incumplio acuerdo de pago especial
    'organization_payment_default',   -- Organizacion sin pagos al dia
    'organization_no_payment_method'  -- Organizacion sin metodo de pago valido
  )),
  blocked_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  blocked_reason TEXT,
  is_active BOOLEAN DEFAULT true NOT NULL,
  unblocked_at TIMESTAMPTZ,
  unblocked_by UUID REFERENCES auth.users(id),
  unblock_reason TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indices para consultas rapidas
CREATE INDEX IF NOT EXISTS idx_payment_blocks_user_active
  ON account_payment_blocks(user_id) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_payment_blocks_org_active
  ON account_payment_blocks(organization_id) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_payment_blocks_type
  ON account_payment_blocks(block_type);

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_account_payment_blocks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_account_payment_blocks_updated_at ON account_payment_blocks;
CREATE TRIGGER trg_account_payment_blocks_updated_at
  BEFORE UPDATE ON account_payment_blocks
  FOR EACH ROW EXECUTE FUNCTION update_account_payment_blocks_updated_at();

-- RLS Policies
ALTER TABLE account_payment_blocks ENABLE ROW LEVEL SECURITY;

-- Los usuarios pueden ver sus propios bloqueos
CREATE POLICY "Users can view their own blocks" ON account_payment_blocks
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Los admins de organizacion pueden ver bloqueos de su org
CREATE POLICY "Org admins can view org blocks" ON account_payment_blocks
  FOR SELECT TO authenticated
  USING (
    organization_id IN (
      SELECT om.organization_id FROM organization_members om
      WHERE om.user_id = auth.uid() AND om.role = 'admin'
    )
  );

-- Solo service_role puede insertar/actualizar/eliminar
CREATE POLICY "Service role can manage blocks" ON account_payment_blocks
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

COMMENT ON TABLE account_payment_blocks IS
'Registra bloqueos de cuenta por incumplimiento de pagos (clientes u organizaciones)';

-- -----------------------------------------------------------------------------
-- PARTE 3: Insertar nuevos documentos legales en legal_documents
-- -----------------------------------------------------------------------------

-- Limpiar documentos existentes con los mismos tipos (si existen)
DELETE FROM legal_documents WHERE document_type IN ('talent_agreement', 'client_agreement', 'organization_agreement');

-- Documento unificado de Talento
INSERT INTO legal_documents (
  document_type,
  version,
  version_date,
  title,
  summary,
  content_html,
  is_current,
  is_required,
  created_at,
  updated_at
) VALUES (
  'talent_agreement',
  '1.0',
  '2026-03-30',
  'Acuerdo de Talento KREOON',
  'Acuerdo unificado para todos los roles de talento. Incluye cesion de derechos de imagen ilimitada, propiedad del contenido al cliente, y condiciones de pago a mes vencido.',
  '<!-- El contenido HTML se carga desde el archivo talent_agreement_v1.html -->',
  true,
  true,
  NOW(),
  NOW()
);

-- Documento unificado de Cliente
INSERT INTO legal_documents (
  document_type,
  version,
  version_date,
  title,
  summary,
  content_html,
  is_current,
  is_required,
  created_at,
  updated_at
) VALUES (
  'client_agreement',
  '1.0',
  '2026-03-30',
  'Acuerdo de Cliente KREOON',
  'Acuerdo para clientes. Establece pago anticipado obligatorio, condiciones de acuerdos especiales, y consecuencias por incumplimiento incluyendo bloqueo de plataforma.',
  '<!-- El contenido HTML se carga desde el archivo client_agreement_v1.html -->',
  true,
  true,
  NOW(),
  NOW()
);

-- Documento unificado de Organizacion
INSERT INTO legal_documents (
  document_type,
  version,
  version_date,
  title,
  summary,
  content_html,
  is_current,
  is_required,
  created_at,
  updated_at
) VALUES (
  'organization_agreement',
  '1.0',
  '2026-03-30',
  'Acuerdo de Organizacion KREOON',
  'Acuerdo para organizaciones. Requiere metodo de pago valido para membresias. Bloqueo total de plataforma si no hay pagos al dia.',
  '<!-- El contenido HTML se carga desde el archivo organization_agreement_v1.html -->',
  true,
  true,
  NOW(),
  NOW()
);

-- -----------------------------------------------------------------------------
-- PARTE 4: Configurar requirements por account_type
-- -----------------------------------------------------------------------------

-- Limpiar requirements existentes para los nuevos document_types
DELETE FROM legal_consent_requirements
WHERE document_type IN ('talent_agreement', 'client_agreement', 'organization_agreement');

-- Requirement para Talento
INSERT INTO legal_consent_requirements (
  document_type,
  user_role,
  account_type,
  is_required,
  trigger_event,
  display_order
) VALUES (
  'talent_agreement',
  'all',
  'talent',
  true,
  'registration',
  10
);

-- Requirement para Cliente
INSERT INTO legal_consent_requirements (
  document_type,
  user_role,
  account_type,
  is_required,
  trigger_event,
  display_order
) VALUES (
  'client_agreement',
  'all',
  'client',
  true,
  'registration',
  10
);

-- Requirement para Organizacion
INSERT INTO legal_consent_requirements (
  document_type,
  user_role,
  account_type,
  is_required,
  trigger_event,
  display_order
) VALUES (
  'organization_agreement',
  'all',
  'organization',
  true,
  'registration',
  10
);

-- -----------------------------------------------------------------------------
-- PARTE 5: RPC para verificar bloqueos de cuenta
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION check_account_blocked(p_user_id UUID)
RETURNS TABLE (
  is_blocked BOOLEAN,
  block_type TEXT,
  block_reason TEXT,
  blocked_since TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    true AS is_blocked,
    apb.block_type,
    apb.blocked_reason AS block_reason,
    apb.blocked_at AS blocked_since
  FROM account_payment_blocks apb
  WHERE apb.is_active = true
    AND (
      apb.user_id = p_user_id
      OR apb.organization_id IN (
        SELECT om.organization_id
        FROM organization_members om
        WHERE om.user_id = p_user_id
      )
    )
  ORDER BY apb.blocked_at DESC
  LIMIT 1;

  -- Si no hay bloqueos, retornar false
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::TEXT, NULL::TEXT, NULL::TIMESTAMPTZ;
  END IF;
END;
$$;

COMMENT ON FUNCTION check_account_blocked IS
'Verifica si un usuario o su organizacion tiene algun bloqueo activo por incumplimiento de pago';

-- -----------------------------------------------------------------------------
-- PARTE 6: RPC para bloquear cuenta
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION block_account(
  p_user_id UUID,
  p_organization_id UUID DEFAULT NULL,
  p_block_type TEXT DEFAULT 'client_payment_default',
  p_reason TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_block_id UUID;
BEGIN
  -- Validar tipo de bloqueo
  IF p_block_type NOT IN ('client_payment_default', 'organization_payment_default', 'organization_no_payment_method') THEN
    RAISE EXCEPTION 'Tipo de bloqueo invalido: %', p_block_type;
  END IF;

  -- Insertar bloqueo
  INSERT INTO account_payment_blocks (
    user_id,
    organization_id,
    block_type,
    blocked_reason,
    is_active
  ) VALUES (
    p_user_id,
    p_organization_id,
    p_block_type,
    p_reason,
    true
  )
  RETURNING id INTO v_block_id;

  RETURN v_block_id;
END;
$$;

COMMENT ON FUNCTION block_account IS
'Bloquea una cuenta por incumplimiento de pago. Retorna el ID del bloqueo creado.';

-- -----------------------------------------------------------------------------
-- PARTE 7: RPC para desbloquear cuenta
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION unblock_account(
  p_block_id UUID,
  p_unblocked_by UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE account_payment_blocks
  SET
    is_active = false,
    unblocked_at = NOW(),
    unblocked_by = p_unblocked_by,
    unblock_reason = p_reason
  WHERE id = p_block_id AND is_active = true;

  RETURN FOUND;
END;
$$;

COMMENT ON FUNCTION unblock_account IS
'Desbloquea una cuenta previamente bloqueada. Retorna true si se encontro y desbloqueo.';

-- -----------------------------------------------------------------------------
-- PARTE 8: Actualizar RPC get_pending_consents para incluir account_type
-- -----------------------------------------------------------------------------

-- Eliminar funcion existente para poder cambiar el tipo de retorno
DROP FUNCTION IF EXISTS get_pending_consents(UUID);

CREATE OR REPLACE FUNCTION get_pending_consents(p_user_id UUID)
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
  v_user_type TEXT;
BEGIN
  -- Obtener el user_type del perfil del usuario
  SELECT p.user_type INTO v_user_type
  FROM profiles p
  WHERE p.id = p_user_id;

  RETURN QUERY
  SELECT
    ld.id AS document_id,
    ld.document_type,
    ld.title,
    ld.version,
    ld.summary,
    COALESCE(lcr.is_required, ld.is_required) AS is_required,
    lcr.trigger_event,
    COALESCE(lcr.display_order, 999) AS display_order,
    lcr.user_role,
    lcr.account_type
  FROM legal_documents ld
  LEFT JOIN legal_consent_requirements lcr
    ON ld.document_type = lcr.document_type
  LEFT JOIN user_legal_consents ulc
    ON ulc.document_id = ld.id AND ulc.user_id = p_user_id
  WHERE
    ld.is_current = true
    AND ld.is_required = true
    AND ulc.id IS NULL  -- No ha sido aceptado aun
    AND (
      lcr.trigger_event = 'registration'
      OR lcr.trigger_event IS NULL
    )
    AND (
      -- Sin account_type: mostrar a todos
      lcr.account_type IS NULL
      -- Con account_type: solo si coincide con el user_type
      OR lcr.account_type = v_user_type
    )
  ORDER BY COALESCE(lcr.display_order, 999), ld.created_at;
END;
$$;

COMMENT ON FUNCTION get_pending_consents IS
'Obtiene documentos legales pendientes de aceptar, filtrados por account_type del usuario';

-- -----------------------------------------------------------------------------
-- PARTE 9: Grants de permisos
-- -----------------------------------------------------------------------------

GRANT EXECUTE ON FUNCTION check_account_blocked TO authenticated;
GRANT EXECUTE ON FUNCTION check_account_blocked TO service_role;

GRANT EXECUTE ON FUNCTION block_account TO service_role;
GRANT EXECUTE ON FUNCTION unblock_account TO service_role;

GRANT EXECUTE ON FUNCTION get_pending_consents TO authenticated;
GRANT EXECUTE ON FUNCTION get_pending_consents TO service_role;

-- -----------------------------------------------------------------------------
-- FIN DE LA MIGRACION
-- -----------------------------------------------------------------------------
