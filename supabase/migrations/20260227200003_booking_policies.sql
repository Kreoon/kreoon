-- Políticas de cancelación y reprogramación
-- Agrega configuración de políticas al tipo de evento

-- Agregar columna de políticas al tipo de evento
ALTER TABLE booking_event_types
ADD COLUMN IF NOT EXISTS cancellation_policy JSONB DEFAULT '{
  "allow_cancellation": true,
  "min_hours_before": 24,
  "allow_reschedule": true,
  "reschedule_limit": 2,
  "policy_text": null
}'::jsonb;

-- Agregar columnas para tracking de reprogramaciones en bookings
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS reschedule_count INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS original_start_time TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS rescheduled_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS rescheduled_by TEXT CHECK (rescheduled_by IN ('host', 'guest')),
ADD COLUMN IF NOT EXISTS cancel_token TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS reschedule_token TEXT UNIQUE;

-- Generar tokens automáticamente para nuevas reservas
CREATE OR REPLACE FUNCTION generate_booking_tokens()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.cancel_token IS NULL THEN
    NEW.cancel_token = replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
  END IF;
  IF NEW.reschedule_token IS NULL THEN
    NEW.reschedule_token = replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_generate_booking_tokens
  BEFORE INSERT ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION generate_booking_tokens();

-- Actualizar tokens existentes que no tienen
UPDATE bookings
SET
  cancel_token = replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  reschedule_token = replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '')
WHERE cancel_token IS NULL OR reschedule_token IS NULL;

-- Índices
CREATE INDEX IF NOT EXISTS idx_bookings_cancel_token ON bookings(cancel_token);
CREATE INDEX IF NOT EXISTS idx_bookings_reschedule_token ON bookings(reschedule_token);

COMMENT ON COLUMN booking_event_types.cancellation_policy IS 'Configuración de políticas de cancelación y reprogramación en JSON';
COMMENT ON COLUMN bookings.cancel_token IS 'Token único para enlace de cancelación por email';
COMMENT ON COLUMN bookings.reschedule_token IS 'Token único para enlace de reprogramación por email';
