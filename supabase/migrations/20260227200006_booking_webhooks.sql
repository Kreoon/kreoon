-- Webhooks para notificar sistemas externos sobre eventos de booking
-- Permite a los usuarios configurar URLs que reciben notificaciones

CREATE TABLE IF NOT EXISTS booking_webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT, -- Nombre descriptivo del webhook
  url TEXT NOT NULL,
  events TEXT[] DEFAULT ARRAY['booking.created', 'booking.confirmed', 'booking.cancelled', 'booking.rescheduled', 'booking.completed'],
  secret TEXT, -- Secret para firmar los payloads
  headers JSONB DEFAULT '{}'::jsonb, -- Headers personalizados
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Logs de webhooks enviados
CREATE TABLE IF NOT EXISTS booking_webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id UUID REFERENCES booking_webhooks(id) ON DELETE CASCADE NOT NULL,
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  response_status INT,
  response_body TEXT,
  response_time_ms INT,
  attempt_number INT DEFAULT 1,
  sent_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_webhooks_user ON booking_webhooks(user_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_active ON booking_webhooks(user_id, active);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_webhook ON booking_webhook_logs(webhook_id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_booking ON booking_webhook_logs(booking_id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_sent_at ON booking_webhook_logs(sent_at);

-- RLS
ALTER TABLE booking_webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_webhook_logs ENABLE ROW LEVEL SECURITY;

-- Usuarios pueden gestionar sus webhooks
CREATE POLICY "Users can manage their webhooks"
  ON booking_webhooks
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Usuarios pueden ver logs de sus webhooks
CREATE POLICY "Users can view their webhook logs"
  ON booking_webhook_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM booking_webhooks w
      WHERE w.id = booking_webhook_logs.webhook_id
      AND w.user_id = auth.uid()
    )
  );

-- Service role puede gestionar logs
CREATE POLICY "Service can manage webhook logs"
  ON booking_webhook_logs
  FOR ALL
  TO service_role
  WITH CHECK (true);

-- Grants
GRANT ALL ON booking_webhooks TO authenticated;
GRANT ALL ON booking_webhook_logs TO authenticated;
GRANT ALL ON booking_webhook_logs TO service_role;

-- Trigger updated_at
CREATE TRIGGER trg_webhooks_updated_at
  BEFORE UPDATE ON booking_webhooks
  FOR EACH ROW
  EXECUTE FUNCTION update_booking_questions_updated_at();

-- Generar secret automáticamente
CREATE OR REPLACE FUNCTION generate_webhook_secret()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.secret IS NULL THEN
    NEW.secret = encode(gen_random_bytes(32), 'hex');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_generate_webhook_secret
  BEFORE INSERT ON booking_webhooks
  FOR EACH ROW
  EXECUTE FUNCTION generate_webhook_secret();

COMMENT ON TABLE booking_webhooks IS 'Configuración de webhooks para notificar sistemas externos';
COMMENT ON TABLE booking_webhook_logs IS 'Registro de webhooks enviados con respuestas';
