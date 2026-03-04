-- ============================================================
-- PANCAKE CRM SYNC - Tablas de estado de sincronización
-- Integración bidireccional Kreoon ↔ Pancake CRM POS
-- ============================================================

-- Tabla de mapeo Kreoon ↔ Pancake (registro de IDs externos)
CREATE TABLE IF NOT EXISTS pancake_sync_map (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  kreoon_entity_type TEXT NOT NULL CHECK (kreoon_entity_type IN ('user', 'organization')),
  kreoon_entity_id UUID NOT NULL,
  pancake_record_id TEXT,  -- ID del registro en Pancake CRM
  pancake_table_name TEXT NOT NULL CHECK (pancake_table_name IN ('kreoon_users', 'kreoon_organizations')),
  sync_status TEXT NOT NULL DEFAULT 'pending' CHECK (sync_status IN ('pending', 'synced', 'error', 'skip')),
  last_synced_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(kreoon_entity_type, kreoon_entity_id)
);

-- Tabla de log de sincronización (auditoría)
CREATE TABLE IF NOT EXISTS pancake_sync_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  direction TEXT NOT NULL CHECK (direction IN ('kreoon_to_pancake', 'pancake_to_kreoon')),
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('create', 'update', 'delete')),
  payload JSONB,
  response JSONB,
  status TEXT NOT NULL CHECK (status IN ('success', 'error')),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabla de configuración de la integración (por plataforma)
CREATE TABLE IF NOT EXISTS pancake_integration_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  config_key TEXT UNIQUE NOT NULL,
  config_value TEXT,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Insertar configuración inicial (Shop ID se rellena en setup)
INSERT INTO pancake_integration_config (config_key, config_value) VALUES
  ('shop_id', NULL),
  ('sync_users_enabled', 'true'),
  ('sync_organizations_enabled', 'true'),
  ('webhook_secret', gen_random_uuid()::text)
ON CONFLICT (config_key) DO NOTHING;

-- Índices
CREATE INDEX IF NOT EXISTS idx_pancake_sync_map_entity ON pancake_sync_map(kreoon_entity_type, kreoon_entity_id);
CREATE INDEX IF NOT EXISTS idx_pancake_sync_map_status ON pancake_sync_map(sync_status);
CREATE INDEX IF NOT EXISTS idx_pancake_sync_map_record ON pancake_sync_map(pancake_record_id, pancake_table_name);
CREATE INDEX IF NOT EXISTS idx_pancake_sync_log_created ON pancake_sync_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pancake_sync_log_entity ON pancake_sync_log(entity_type, entity_id);

-- RLS
ALTER TABLE pancake_sync_map ENABLE ROW LEVEL SECURITY;
ALTER TABLE pancake_sync_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE pancake_integration_config ENABLE ROW LEVEL SECURITY;

-- Políticas: solo admins de plataforma y service_role pueden acceder
CREATE POLICY "admin_pancake_sync_map" ON pancake_sync_map
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.is_platform_admin = true
    )
  );

CREATE POLICY "admin_pancake_sync_log" ON pancake_sync_log
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.is_platform_admin = true
    )
  );

CREATE POLICY "admin_pancake_config" ON pancake_integration_config
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.is_platform_admin = true
    )
  );

-- Service role siempre tiene acceso
CREATE POLICY "service_role_pancake_sync_map" ON pancake_sync_map
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_pancake_sync_log" ON pancake_sync_log
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_pancake_config" ON pancake_integration_config
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- GRANTs
GRANT ALL ON pancake_sync_map TO authenticated;
GRANT ALL ON pancake_sync_map TO service_role;
GRANT ALL ON pancake_sync_log TO authenticated;
GRANT ALL ON pancake_sync_log TO service_role;
GRANT ALL ON pancake_integration_config TO authenticated;
GRANT ALL ON pancake_integration_config TO service_role;

-- Trigger para updated_at en pancake_sync_map
CREATE OR REPLACE FUNCTION update_pancake_sync_map_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_pancake_sync_map_updated_at ON pancake_sync_map;
CREATE TRIGGER trg_pancake_sync_map_updated_at
  BEFORE UPDATE ON pancake_sync_map
  FOR EACH ROW
  EXECUTE FUNCTION update_pancake_sync_map_updated_at();

NOTIFY pgrst, 'reload schema';
