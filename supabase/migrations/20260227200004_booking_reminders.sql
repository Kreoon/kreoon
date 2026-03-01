-- Recordatorios configurables por tipo de evento
-- Permite configurar múltiples recordatorios con diferentes tiempos y canales

CREATE TABLE IF NOT EXISTS booking_reminder_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type_id UUID REFERENCES booking_event_types(id) ON DELETE CASCADE NOT NULL,
  reminder_type TEXT CHECK (reminder_type IN ('email', 'sms')) DEFAULT 'email',
  hours_before INT NOT NULL CHECK (hours_before > 0 AND hours_before <= 168), -- máx 1 semana
  enabled BOOLEAN DEFAULT true,
  template_subject TEXT,
  template_body TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Logs de recordatorios enviados
CREATE TABLE IF NOT EXISTS booking_reminder_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE NOT NULL,
  reminder_setting_id UUID REFERENCES booking_reminder_settings(id) ON DELETE SET NULL,
  reminder_type TEXT NOT NULL,
  hours_before INT NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT now(),
  status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'pending')),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_reminder_settings_event_type ON booking_reminder_settings(event_type_id);
CREATE INDEX IF NOT EXISTS idx_reminder_settings_enabled ON booking_reminder_settings(event_type_id, enabled);
CREATE INDEX IF NOT EXISTS idx_reminder_logs_booking ON booking_reminder_logs(booking_id);
CREATE INDEX IF NOT EXISTS idx_reminder_logs_sent_at ON booking_reminder_logs(sent_at);

-- RLS
ALTER TABLE booking_reminder_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_reminder_logs ENABLE ROW LEVEL SECURITY;

-- Propietarios pueden gestionar settings de recordatorios
CREATE POLICY "Owners can manage reminder settings"
  ON booking_reminder_settings
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM booking_event_types et
      WHERE et.id = booking_reminder_settings.event_type_id
      AND et.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM booking_event_types et
      WHERE et.id = booking_reminder_settings.event_type_id
      AND et.user_id = auth.uid()
    )
  );

-- Propietarios pueden ver logs de sus recordatorios
CREATE POLICY "Hosts can view reminder logs"
  ON booking_reminder_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.id = booking_reminder_logs.booking_id
      AND b.host_user_id = auth.uid()
    )
  );

-- Service role puede insertar logs
CREATE POLICY "Service can insert reminder logs"
  ON booking_reminder_logs
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Grants
GRANT ALL ON booking_reminder_settings TO authenticated;
GRANT ALL ON booking_reminder_logs TO authenticated;
GRANT ALL ON booking_reminder_logs TO service_role;

-- Trigger updated_at
CREATE TRIGGER trg_reminder_settings_updated_at
  BEFORE UPDATE ON booking_reminder_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_booking_questions_updated_at();

-- Crear recordatorios por defecto cuando se crea un event type
CREATE OR REPLACE FUNCTION create_default_reminders()
RETURNS TRIGGER AS $$
BEGIN
  -- Recordatorio 24h antes
  INSERT INTO booking_reminder_settings (event_type_id, reminder_type, hours_before, enabled)
  VALUES (NEW.id, 'email', 24, true);

  -- Recordatorio 1h antes
  INSERT INTO booking_reminder_settings (event_type_id, reminder_type, hours_before, enabled)
  VALUES (NEW.id, 'email', 1, true);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_create_default_reminders
  AFTER INSERT ON booking_event_types
  FOR EACH ROW
  EXECUTE FUNCTION create_default_reminders();

COMMENT ON TABLE booking_reminder_settings IS 'Configuración de recordatorios por tipo de evento';
COMMENT ON TABLE booking_reminder_logs IS 'Registro de recordatorios enviados';
