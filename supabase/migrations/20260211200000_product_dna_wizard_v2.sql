-- Migración: 20260211_product_dna_wizard_v2.sql

-- Tabla principal de Product DNA
CREATE TABLE IF NOT EXISTS product_dna (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,

  -- Categorización
  service_group TEXT NOT NULL, -- 'content_creation', 'post_production', 'strategy_marketing', 'technology', 'education', 'general'
  service_types TEXT[] NOT NULL, -- máximo 3 selecciones

  -- Audio y Transcripción
  audio_url TEXT,
  audio_duration_seconds INTEGER,
  transcription TEXT,

  -- Referencias externas
  reference_links JSONB DEFAULT '[]', -- [{url, type, notes}]
  competitor_links JSONB DEFAULT '[]',
  inspiration_links JSONB DEFAULT '[]',

  -- Respuestas del wizard
  wizard_responses JSONB NOT NULL DEFAULT '{}',

  -- Análisis generado por IA
  market_research JSONB,
  competitor_analysis JSONB,
  strategy_recommendations JSONB,
  content_brief JSONB,

  -- Metadatos
  ai_confidence_score INTEGER, -- 0-100
  estimated_complexity TEXT, -- 'simple', 'moderate', 'complex', 'enterprise'
  recommended_creators JSONB, -- sugerencias de creadores

  -- Control
  status TEXT NOT NULL DEFAULT 'draft', -- 'draft', 'analyzing', 'ready', 'in_progress', 'completed'
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT max_three_services CHECK (array_length(service_types, 1) <= 3)
);

-- Índices
CREATE INDEX idx_product_dna_client ON product_dna(client_id);
CREATE INDEX idx_product_dna_group ON product_dna(service_group);
CREATE INDEX idx_product_dna_status ON product_dna(status);
CREATE INDEX idx_product_dna_created ON product_dna(created_at DESC);

-- Trigger para updated_at
CREATE TRIGGER update_product_dna_timestamp
  BEFORE UPDATE ON product_dna
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE product_dna ENABLE ROW LEVEL SECURITY;

-- Org members can view product_dna for clients in their org
CREATE POLICY "Org members can view product_dna"
  ON product_dna FOR SELECT
  USING (
    client_id IN (
      SELECT c.id FROM clients c
      JOIN organization_members om ON om.organization_id = c.organization_id
      WHERE om.user_id = auth.uid()
    )
  );

-- Org members can insert product_dna for clients in their org
CREATE POLICY "Org members can insert product_dna"
  ON product_dna FOR INSERT
  WITH CHECK (
    client_id IN (
      SELECT c.id FROM clients c
      JOIN organization_members om ON om.organization_id = c.organization_id
      WHERE om.user_id = auth.uid()
    )
  );

-- Org members can update product_dna for clients in their org
CREATE POLICY "Org members can update product_dna"
  ON product_dna FOR UPDATE
  USING (
    client_id IN (
      SELECT c.id FROM clients c
      JOIN organization_members om ON om.organization_id = c.organization_id
      WHERE om.user_id = auth.uid()
    )
  );

-- Org members can delete product_dna for clients in their org
CREATE POLICY "Org members can delete product_dna"
  ON product_dna FOR DELETE
  USING (
    client_id IN (
      SELECT c.id FROM clients c
      JOIN organization_members om ON om.organization_id = c.organization_id
      WHERE om.user_id = auth.uid()
    )
  );

-- Client users can view their own product_dna
CREATE POLICY "Client users can view own product_dna"
  ON product_dna FOR SELECT
  USING (
    client_id IN (
      SELECT client_id FROM client_users WHERE user_id = auth.uid()
    )
  );

-- Grant access to authenticated role
GRANT ALL ON product_dna TO authenticated;

-- Grant access to service_role (needed by edge functions using SERVICE_ROLE_KEY)
GRANT ALL ON product_dna TO service_role;
