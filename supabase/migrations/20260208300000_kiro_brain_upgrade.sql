-- ═══════════════════════════════════════════════════════════════════════════
-- KIRO BRAIN UPGRADE — Flags de plataforma, fuente de aprendizaje, memoria
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Distinguir conocimiento de plataforma vs organizacional
ALTER TABLE ai_assistant_knowledge ADD COLUMN IF NOT EXISTS is_platform BOOLEAN DEFAULT false;
ALTER TABLE ai_positive_examples ADD COLUMN IF NOT EXISTS is_platform BOOLEAN DEFAULT false;
ALTER TABLE ai_negative_rules ADD COLUMN IF NOT EXISTS is_platform BOOLEAN DEFAULT false;
ALTER TABLE ai_conversation_flows ADD COLUMN IF NOT EXISTS is_platform BOOLEAN DEFAULT false;

-- 2. Rastrear fuente de conocimiento auto-aprendido
ALTER TABLE ai_assistant_knowledge ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'manual';
ALTER TABLE ai_assistant_knowledge ADD COLUMN IF NOT EXISTS source_id UUID NULL;
-- source values: 'manual', 'auto_content', 'auto_research', 'auto_product', 'auto_client'

-- 3. Session ID para agrupar conversaciones de KIRO
ALTER TABLE ai_assistant_logs ADD COLUMN IF NOT EXISTS session_id TEXT NULL;

-- 4. Config de auto-aprendizaje y KIRO por org
ALTER TABLE ai_assistant_config ADD COLUMN IF NOT EXISTS auto_learn_content BOOLEAN DEFAULT true;
ALTER TABLE ai_assistant_config ADD COLUMN IF NOT EXISTS auto_learn_research BOOLEAN DEFAULT true;
ALTER TABLE ai_assistant_config ADD COLUMN IF NOT EXISTS auto_learn_products BOOLEAN DEFAULT true;
ALTER TABLE ai_assistant_config ADD COLUMN IF NOT EXISTS auto_learn_clients BOOLEAN DEFAULT true;
ALTER TABLE ai_assistant_config ADD COLUMN IF NOT EXISTS kiro_enabled BOOLEAN DEFAULT true;

-- 5. RLS: conocimiento de plataforma legible por todos los autenticados
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'ai_assistant_knowledge'
    AND policyname = 'Platform knowledge readable by all authenticated'
  ) THEN
    CREATE POLICY "Platform knowledge readable by all authenticated"
      ON ai_assistant_knowledge
      FOR SELECT
      TO authenticated
      USING (is_platform = true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'ai_positive_examples'
    AND policyname = 'Platform examples readable by all authenticated'
  ) THEN
    CREATE POLICY "Platform examples readable by all authenticated"
      ON ai_positive_examples
      FOR SELECT
      TO authenticated
      USING (is_platform = true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'ai_negative_rules'
    AND policyname = 'Platform rules readable by all authenticated'
  ) THEN
    CREATE POLICY "Platform rules readable by all authenticated"
      ON ai_negative_rules
      FOR SELECT
      TO authenticated
      USING (is_platform = true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'ai_conversation_flows'
    AND policyname = 'Platform flows readable by all authenticated'
  ) THEN
    CREATE POLICY "Platform flows readable by all authenticated"
      ON ai_conversation_flows
      FOR SELECT
      TO authenticated
      USING (is_platform = true);
  END IF;
END $$;

-- 6. Index para búsquedas de logs por session_id
CREATE INDEX IF NOT EXISTS idx_ai_assistant_logs_session
  ON ai_assistant_logs(user_id, organization_id, session_id);

-- 7. Index para filtrar conocimiento por plataforma/fuente
CREATE INDEX IF NOT EXISTS idx_ai_knowledge_platform
  ON ai_assistant_knowledge(is_platform) WHERE is_platform = true;
CREATE INDEX IF NOT EXISTS idx_ai_knowledge_source
  ON ai_assistant_knowledge(source) WHERE source != 'manual';
