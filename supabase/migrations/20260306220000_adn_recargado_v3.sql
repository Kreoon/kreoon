-- =============================================
-- ADN RECARGADO v3 - DATABASE SCHEMA
-- Nuevas columnas y tabla de sesiones para el
-- sistema de research de 22 pasos
-- =============================================

-- =============================================
-- 1. NUEVAS COLUMNAS EN TABLA PRODUCTS
-- =============================================

-- Columna para almacenar las 22 pestañas del research v3
ALTER TABLE products
ADD COLUMN IF NOT EXISTS full_research_v3 JSONB DEFAULT NULL;

COMMENT ON COLUMN products.full_research_v3 IS 'ADN Recargado v3: 22 pestañas de research completo. Estructura: { version: 3, generated_at: timestamp, tabs: { tab_1_market: {...}, ..., tab_22_summary: {...} }, metadata: { inputs_used: {...}, ai_providers: [...], tokens_consumed: number } }';

-- Columna para tracking del progreso en tiempo real
ALTER TABLE products
ADD COLUMN IF NOT EXISTS research_v3_progress JSONB DEFAULT NULL;

COMMENT ON COLUMN products.research_v3_progress IS 'Progreso del research v3 en tiempo real. Estructura: { current_step: number, total_steps: 22, steps: [ { id: string, name: string, status: pending|running|completed|error, started_at: timestamp, completed_at: timestamp, tokens_used: number } ] }';

-- Índice para búsqueda de productos con research v3 completado
CREATE INDEX IF NOT EXISTS idx_products_research_v3_status
ON products USING btree ((full_research_v3 IS NOT NULL));

-- =============================================
-- 2. NUEVAS COLUMNAS EN TABLA PRODUCT_DNA
-- =============================================

-- Columna para Social Intelligence (reviews, comentarios, vocabulario real)
ALTER TABLE product_dna
ADD COLUMN IF NOT EXISTS social_intelligence JSONB DEFAULT NULL;

COMMENT ON COLUMN product_dna.social_intelligence IS 'Inteligencia social scrapeada: reviews, comentarios, vocabulario real del mercado. Estructura: { reviews_data: [...], social_comments: [...], vocabulary_extracted: { pain_words: [...], desire_words: [...], objection_phrases: [...] }, scraped_at: timestamp }';

-- Columna para Ad Intelligence (análisis de ads de competidores)
ALTER TABLE product_dna
ADD COLUMN IF NOT EXISTS ad_intelligence JSONB DEFAULT NULL;

COMMENT ON COLUMN product_dna.ad_intelligence IS 'Inteligencia de ads de competidores. Estructura: { meta_ads: {...}, tiktok_ads: {...}, dominant_hooks: [...], dominant_formats: [...], competitor_social: [...], analyzed_at: timestamp }';

-- Columna para snapshot del ADN de Marca al momento de generar el research
ALTER TABLE product_dna
ADD COLUMN IF NOT EXISTS client_dna_snapshot JSONB DEFAULT NULL;

COMMENT ON COLUMN product_dna.client_dna_snapshot IS 'Snapshot del ADN de Marca usado para coherencia. Estructura: { dna_id: string, dna_data: {...full dna_data...}, used_in_research: boolean, snapshot_at: timestamp }';

-- Columna para análisis emocional del audio (si no existe)
ALTER TABLE product_dna
ADD COLUMN IF NOT EXISTS emotional_analysis JSONB DEFAULT NULL;

COMMENT ON COLUMN product_dna.emotional_analysis IS 'Análisis emocional del audio del usuario: mood, confidence_level, passion_topics, concern_areas, recommended_tone';

-- =============================================
-- 3. NUEVA TABLA: ADN_RESEARCH_SESSIONS
-- Tracking de sesiones de research
-- =============================================

CREATE TABLE IF NOT EXISTS adn_research_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relaciones
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  product_dna_id UUID REFERENCES product_dna(id) ON DELETE SET NULL,
  client_dna_id UUID REFERENCES client_dna(id) ON DELETE SET NULL,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Configuración de inputs
  inputs_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- { include_client_dna: boolean, include_social_intelligence: boolean, include_ad_intelligence: boolean, locations: [...] }

  -- Estado de la sesión
  status TEXT NOT NULL DEFAULT 'initializing'
    CHECK (status IN ('initializing', 'gathering_intelligence', 'researching', 'completed', 'error', 'cancelled')),

  -- Progreso detallado
  progress JSONB DEFAULT '{}'::jsonb,
  current_step INTEGER DEFAULT 0,
  total_steps INTEGER DEFAULT 22,

  -- Tokens y costos
  tokens_consumed INTEGER DEFAULT 0,
  estimated_cost_usd NUMERIC(10,4) DEFAULT 0,

  -- Resultado y errores
  result_snapshot JSONB,
  error_message TEXT,
  error_details JSONB,

  -- Timestamps
  started_at TIMESTAMPTZ DEFAULT now(),
  intelligence_completed_at TIMESTAMPTZ,
  research_completed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- 4. ÍNDICES PARA PERFORMANCE
-- =============================================

CREATE INDEX IF NOT EXISTS idx_adn_research_sessions_product
ON adn_research_sessions(product_id);

CREATE INDEX IF NOT EXISTS idx_adn_research_sessions_org
ON adn_research_sessions(organization_id);

CREATE INDEX IF NOT EXISTS idx_adn_research_sessions_status
ON adn_research_sessions(status);

CREATE INDEX IF NOT EXISTS idx_adn_research_sessions_created
ON adn_research_sessions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_adn_research_sessions_product_status
ON adn_research_sessions(product_id, status);

-- Índice para encontrar la sesión más reciente completada por producto
CREATE INDEX IF NOT EXISTS idx_adn_research_sessions_product_completed
ON adn_research_sessions(product_id, completed_at DESC)
WHERE status = 'completed';

-- =============================================
-- 5. TRIGGER PARA UPDATED_AT
-- =============================================

CREATE OR REPLACE FUNCTION update_adn_research_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_adn_research_sessions_timestamp ON adn_research_sessions;
CREATE TRIGGER update_adn_research_sessions_timestamp
  BEFORE UPDATE ON adn_research_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_adn_research_sessions_updated_at();

-- =============================================
-- 6. RLS PARA ADN_RESEARCH_SESSIONS
-- =============================================

ALTER TABLE adn_research_sessions ENABLE ROW LEVEL SECURITY;

-- Los miembros de la organización pueden ver sesiones de su org
CREATE POLICY "members_select_research_sessions"
ON adn_research_sessions FOR SELECT TO authenticated
USING (
  organization_id IN (
    SELECT organization_id FROM organization_members
    WHERE user_id = auth.uid()
  )
);

-- Los miembros de la organización pueden crear sesiones
CREATE POLICY "members_insert_research_sessions"
ON adn_research_sessions FOR INSERT TO authenticated
WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM organization_members
    WHERE user_id = auth.uid()
  )
);

-- Los miembros de la organización pueden actualizar sesiones
CREATE POLICY "members_update_research_sessions"
ON adn_research_sessions FOR UPDATE TO authenticated
USING (
  organization_id IN (
    SELECT organization_id FROM organization_members
    WHERE user_id = auth.uid()
  )
);

-- Los miembros de la organización pueden eliminar sesiones (solo borradores o con error)
CREATE POLICY "members_delete_research_sessions"
ON adn_research_sessions FOR DELETE TO authenticated
USING (
  organization_id IN (
    SELECT organization_id FROM organization_members
    WHERE user_id = auth.uid()
  )
  AND status IN ('initializing', 'error', 'cancelled')
);

-- =============================================
-- 7. GRANTS
-- =============================================

GRANT ALL ON adn_research_sessions TO authenticated;
GRANT ALL ON adn_research_sessions TO service_role;

-- =============================================
-- 8. FUNCIÓN HELPER PARA OBTENER ÚLTIMA SESIÓN COMPLETADA
-- =============================================

CREATE OR REPLACE FUNCTION get_latest_completed_research_session(p_product_id UUID)
RETURNS TABLE (
  session_id UUID,
  completed_at TIMESTAMPTZ,
  tokens_consumed INTEGER,
  tabs_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id AS session_id,
    s.completed_at,
    s.tokens_consumed,
    COALESCE(jsonb_object_keys(p.full_research_v3->'tabs')::INTEGER, 0) AS tabs_count
  FROM adn_research_sessions s
  LEFT JOIN products p ON p.id = s.product_id
  WHERE s.product_id = p_product_id
    AND s.status = 'completed'
  ORDER BY s.completed_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_latest_completed_research_session(UUID) TO authenticated;

-- =============================================
-- 9. FUNCIÓN PARA ACTUALIZAR PROGRESO EN TIEMPO REAL
-- =============================================

CREATE OR REPLACE FUNCTION update_research_session_progress(
  p_session_id UUID,
  p_current_step INTEGER,
  p_step_status TEXT,
  p_step_name TEXT DEFAULT NULL,
  p_tokens_used INTEGER DEFAULT 0
)
RETURNS VOID AS $$
DECLARE
  v_progress JSONB;
BEGIN
  -- Obtener progreso actual
  SELECT progress INTO v_progress
  FROM adn_research_sessions
  WHERE id = p_session_id;

  -- Inicializar si es necesario
  IF v_progress IS NULL OR v_progress = '{}'::jsonb THEN
    v_progress = jsonb_build_object(
      'steps', '[]'::jsonb,
      'started_at', now()
    );
  END IF;

  -- Actualizar el paso específico
  v_progress = jsonb_set(
    v_progress,
    ARRAY['steps', (p_current_step - 1)::text],
    jsonb_build_object(
      'step', p_current_step,
      'name', COALESCE(p_step_name, 'Step ' || p_current_step),
      'status', p_step_status,
      'tokens_used', p_tokens_used,
      'updated_at', now()
    )
  );

  -- Actualizar la sesión
  UPDATE adn_research_sessions
  SET
    current_step = p_current_step,
    progress = v_progress,
    tokens_consumed = tokens_consumed + p_tokens_used,
    status = CASE
      WHEN p_step_status = 'error' THEN 'error'
      WHEN p_current_step >= 22 AND p_step_status = 'completed' THEN 'completed'
      ELSE status
    END,
    completed_at = CASE
      WHEN p_current_step >= 22 AND p_step_status = 'completed' THEN now()
      ELSE completed_at
    END,
    updated_at = now()
  WHERE id = p_session_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION update_research_session_progress(UUID, INTEGER, TEXT, TEXT, INTEGER) TO service_role;

-- =============================================
-- 10. RELOAD SCHEMA
-- =============================================

NOTIFY pgrst, 'reload schema';
