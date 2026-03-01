-- Integraciones de calendario externo (Google Calendar, Outlook, etc.)
-- Permite sincronizar eventos bidireccional con calendarios externos

CREATE TABLE IF NOT EXISTS calendar_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  provider TEXT CHECK (provider IN ('google', 'outlook', 'apple')) NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  calendar_id TEXT, -- ID del calendario seleccionado
  calendar_name TEXT, -- Nombre del calendario para mostrar
  sync_enabled BOOLEAN DEFAULT true,
  check_conflicts BOOLEAN DEFAULT true, -- Verificar conflictos con eventos externos
  create_events BOOLEAN DEFAULT true, -- Crear eventos en calendario externo
  last_sync_at TIMESTAMPTZ,
  sync_errors JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Un usuario solo puede tener una integración por proveedor
  UNIQUE(user_id, provider)
);

-- Tabla para mapear eventos de Kreoon a eventos externos
CREATE TABLE IF NOT EXISTS calendar_event_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE NOT NULL,
  integration_id UUID REFERENCES calendar_integrations(id) ON DELETE CASCADE NOT NULL,
  external_event_id TEXT NOT NULL, -- ID del evento en el calendario externo
  external_calendar_id TEXT NOT NULL,
  last_synced_at TIMESTAMPTZ DEFAULT now(),
  sync_status TEXT DEFAULT 'synced' CHECK (sync_status IN ('synced', 'pending', 'error')),
  created_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(booking_id, integration_id)
);

-- Eventos externos que bloquean disponibilidad
CREATE TABLE IF NOT EXISTS calendar_blocked_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id UUID REFERENCES calendar_integrations(id) ON DELETE CASCADE NOT NULL,
  external_event_id TEXT NOT NULL,
  title TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  is_all_day BOOLEAN DEFAULT false,
  last_synced_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(integration_id, external_event_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_calendar_integrations_user ON calendar_integrations(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_integrations_provider ON calendar_integrations(user_id, provider);
CREATE INDEX IF NOT EXISTS idx_calendar_mappings_booking ON calendar_event_mappings(booking_id);
CREATE INDEX IF NOT EXISTS idx_calendar_mappings_external ON calendar_event_mappings(external_event_id);
CREATE INDEX IF NOT EXISTS idx_calendar_blocked_times ON calendar_blocked_events(integration_id, start_time, end_time);

-- RLS
ALTER TABLE calendar_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_event_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_blocked_events ENABLE ROW LEVEL SECURITY;

-- Usuarios pueden gestionar sus integraciones
CREATE POLICY "Users can manage their calendar integrations"
  ON calendar_integrations
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Usuarios pueden ver mapeos de sus bookings
CREATE POLICY "Users can view their event mappings"
  ON calendar_event_mappings
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM calendar_integrations ci
      WHERE ci.id = calendar_event_mappings.integration_id
      AND ci.user_id = auth.uid()
    )
  );

-- Service role puede gestionar mapeos
CREATE POLICY "Service can manage event mappings"
  ON calendar_event_mappings
  FOR ALL
  TO service_role
  WITH CHECK (true);

-- Usuarios pueden ver sus eventos bloqueados
CREATE POLICY "Users can view their blocked events"
  ON calendar_blocked_events
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM calendar_integrations ci
      WHERE ci.id = calendar_blocked_events.integration_id
      AND ci.user_id = auth.uid()
    )
  );

-- Service role puede gestionar eventos bloqueados
CREATE POLICY "Service can manage blocked events"
  ON calendar_blocked_events
  FOR ALL
  TO service_role
  WITH CHECK (true);

-- Grants
GRANT ALL ON calendar_integrations TO authenticated;
GRANT ALL ON calendar_event_mappings TO authenticated;
GRANT ALL ON calendar_event_mappings TO service_role;
GRANT ALL ON calendar_blocked_events TO authenticated;
GRANT ALL ON calendar_blocked_events TO service_role;

-- Trigger updated_at
CREATE TRIGGER trg_calendar_integrations_updated_at
  BEFORE UPDATE ON calendar_integrations
  FOR EACH ROW
  EXECUTE FUNCTION update_booking_questions_updated_at();

COMMENT ON TABLE calendar_integrations IS 'Integraciones con calendarios externos como Google Calendar';
COMMENT ON TABLE calendar_event_mappings IS 'Mapeo entre reservas de Kreoon y eventos en calendarios externos';
COMMENT ON TABLE calendar_blocked_events IS 'Eventos externos que bloquean disponibilidad';
