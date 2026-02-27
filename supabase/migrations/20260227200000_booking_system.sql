-- =============================================================================
-- BOOKING SYSTEM - Sistema de Agendamiento
-- =============================================================================
-- Este módulo permite a usuarios configurar tipos de citas, disponibilidad,
-- y recibir reservas de clientes externos.
-- =============================================================================

-- ============================================
-- 1. CUSTOM TYPES (enums)
-- ============================================

DO $$ BEGIN
  CREATE TYPE public.booking_status AS ENUM (
    'pending',      -- Esperando confirmación
    'confirmed',    -- Confirmada
    'cancelled',    -- Cancelada por host o guest
    'completed',    -- Completada
    'no_show'       -- Guest no asistió
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.booking_location_type AS ENUM (
    'google_meet',
    'zoom',
    'phone',
    'in_person',
    'custom'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- 2. TABLES
-- ============================================

-- ---- booking_event_types ----
-- Tipos de evento configurables por usuario (ej: "Llamada de 30min", "Demo de producto")
CREATE TABLE IF NOT EXISTS public.booking_event_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Información básica
  title text NOT NULL,
  slug text NOT NULL,
  description text,

  -- Configuración de duración
  duration_minutes integer NOT NULL DEFAULT 30,
  buffer_before_minutes integer DEFAULT 0,
  buffer_after_minutes integer DEFAULT 0,

  -- Límites
  min_notice_hours integer DEFAULT 24,        -- Mínimo de horas de anticipación
  max_days_in_advance integer DEFAULT 60,     -- Máximo días hacia adelante
  max_bookings_per_day integer,               -- Límite diario (null = sin límite)

  -- Ubicación
  location_type public.booking_location_type DEFAULT 'google_meet',
  location_details text,                      -- URL o dirección específica

  -- Apariencia
  color text DEFAULT '#8B5CF6',

  -- Estado
  is_active boolean DEFAULT true,

  -- Metadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  -- Constraints
  CONSTRAINT booking_event_types_duration_positive CHECK (duration_minutes > 0),
  CONSTRAINT booking_event_types_buffer_positive CHECK (buffer_before_minutes >= 0 AND buffer_after_minutes >= 0),
  CONSTRAINT booking_event_types_unique_slug UNIQUE (user_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_booking_event_types_user_id ON public.booking_event_types(user_id);
CREATE INDEX IF NOT EXISTS idx_booking_event_types_slug ON public.booking_event_types(user_id, slug);
CREATE INDEX IF NOT EXISTS idx_booking_event_types_active ON public.booking_event_types(user_id, is_active) WHERE is_active = true;

-- ---- booking_availability ----
-- Disponibilidad semanal recurrente (horarios por día de la semana)
CREATE TABLE IF NOT EXISTS public.booking_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Día de la semana (0=Domingo, 1=Lunes, ..., 6=Sábado)
  day_of_week integer NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),

  -- Rango horario (formato HH:MM)
  start_time time NOT NULL,
  end_time time NOT NULL,

  -- Timezone del usuario
  timezone text DEFAULT 'America/Bogota',

  -- Metadata
  created_at timestamptz DEFAULT now(),

  -- Constraints
  CONSTRAINT booking_availability_time_range CHECK (start_time < end_time)
);

CREATE INDEX IF NOT EXISTS idx_booking_availability_user_id ON public.booking_availability(user_id);
CREATE INDEX IF NOT EXISTS idx_booking_availability_day ON public.booking_availability(user_id, day_of_week);

-- ---- booking_exceptions ----
-- Excepciones a la disponibilidad (días bloqueados, horarios especiales)
CREATE TABLE IF NOT EXISTS public.booking_exceptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Fecha específica
  exception_date date NOT NULL,

  -- Tipo de excepción
  is_blocked boolean DEFAULT true,  -- true = día bloqueado, false = horario especial

  -- Si is_blocked = false, estos campos definen el horario especial
  start_time time,
  end_time time,

  -- Razón (opcional)
  reason text,

  -- Metadata
  created_at timestamptz DEFAULT now(),

  -- Constraints
  CONSTRAINT booking_exceptions_special_hours CHECK (
    is_blocked = true OR (start_time IS NOT NULL AND end_time IS NOT NULL AND start_time < end_time)
  )
);

CREATE INDEX IF NOT EXISTS idx_booking_exceptions_user_id ON public.booking_exceptions(user_id);
CREATE INDEX IF NOT EXISTS idx_booking_exceptions_date ON public.booking_exceptions(user_id, exception_date);

-- ---- bookings ----
-- Reservas agendadas
CREATE TABLE IF NOT EXISTS public.bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Referencias
  event_type_id uuid NOT NULL REFERENCES public.booking_event_types(id) ON DELETE CASCADE,
  host_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  guest_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL, -- Puede ser null si es externo

  -- Datos del invitado
  guest_name text NOT NULL,
  guest_email text NOT NULL,
  guest_phone text,
  guest_notes text,

  -- Fecha y hora (en UTC)
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  timezone text NOT NULL,  -- Timezone del guest para mostrar en emails

  -- Ubicación
  location_type public.booking_location_type NOT NULL,
  location_details text,   -- URL de videollamada o dirección
  meeting_url text,        -- URL generada para la reunión

  -- Estado
  status public.booking_status DEFAULT 'pending',

  -- Tokens para acciones
  confirmation_token uuid DEFAULT gen_random_uuid(),
  cancellation_token uuid DEFAULT gen_random_uuid(),

  -- Recordatorios enviados
  reminder_24h_sent boolean DEFAULT false,
  reminder_1h_sent boolean DEFAULT false,

  -- Notas del host
  host_notes text,

  -- Metadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  cancelled_at timestamptz,
  cancelled_by text,  -- 'host' o 'guest'
  cancellation_reason text,

  -- Constraints
  CONSTRAINT bookings_time_range CHECK (start_time < end_time)
);

CREATE INDEX IF NOT EXISTS idx_bookings_host ON public.bookings(host_user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_guest ON public.bookings(guest_user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_event_type ON public.bookings(event_type_id);
CREATE INDEX IF NOT EXISTS idx_bookings_start_time ON public.bookings(start_time);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_confirmation_token ON public.bookings(confirmation_token);
CREATE INDEX IF NOT EXISTS idx_bookings_cancellation_token ON public.bookings(cancellation_token);
CREATE INDEX IF NOT EXISTS idx_bookings_host_upcoming ON public.bookings(host_user_id, start_time)
  WHERE status IN ('pending', 'confirmed');

-- ============================================
-- 3. TRIGGERS
-- ============================================

-- Auto-update updated_at
CREATE OR REPLACE TRIGGER trigger_booking_event_types_updated_at
  BEFORE UPDATE ON public.booking_event_types
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE OR REPLACE TRIGGER trigger_bookings_updated_at
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Auto-generate slug for event types
CREATE OR REPLACE FUNCTION public.auto_booking_event_type_slug()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  _base_slug text;
  _slug text;
  _counter int := 0;
  _exists boolean;
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    -- Normalize title to slug
    _base_slug := lower(trim(NEW.title));
    _base_slug := regexp_replace(_base_slug, '[^a-z0-9]+', '-', 'g');
    _base_slug := regexp_replace(_base_slug, '^-|-$', '', 'g');
    _base_slug := left(_base_slug, 50);

    _slug := _base_slug;

    LOOP
      SELECT EXISTS (
        SELECT 1 FROM public.booking_event_types
        WHERE user_id = NEW.user_id AND slug = _slug
      ) INTO _exists;

      EXIT WHEN NOT _exists;
      _counter := _counter + 1;
      _slug := _base_slug || '-' || _counter;
    END LOOP;

    NEW.slug := _slug;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trigger_auto_booking_event_type_slug
  BEFORE INSERT ON public.booking_event_types
  FOR EACH ROW EXECUTE FUNCTION public.auto_booking_event_type_slug();

-- ============================================
-- 4. HELPER FUNCTIONS
-- ============================================

-- Verificar si un slot está disponible para una reserva
CREATE OR REPLACE FUNCTION public.check_booking_slot_available(
  _host_user_id uuid,
  _start_time timestamptz,
  _end_time timestamptz,
  _exclude_booking_id uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1 FROM public.bookings
    WHERE host_user_id = _host_user_id
      AND status IN ('pending', 'confirmed')
      AND id IS DISTINCT FROM _exclude_booking_id
      AND (
        -- Overlap check
        (_start_time, _end_time) OVERLAPS (start_time, end_time)
      )
  );
END;
$$;

-- Obtener slots disponibles para una fecha específica
CREATE OR REPLACE FUNCTION public.get_available_booking_slots(
  _host_user_id uuid,
  _event_type_id uuid,
  _date date,
  _timezone text DEFAULT 'America/Bogota'
)
RETURNS TABLE (
  slot_start timestamptz,
  slot_end timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  _event_type record;
  _day_of_week integer;
  _availability record;
  _slot_start timestamptz;
  _slot_end timestamptz;
  _is_blocked boolean;
  _exception record;
BEGIN
  -- Get event type info
  SELECT * INTO _event_type
  FROM public.booking_event_types
  WHERE id = _event_type_id AND user_id = _host_user_id AND is_active = true;

  IF _event_type IS NULL THEN
    RETURN;
  END IF;

  -- Get day of week for the date
  _day_of_week := EXTRACT(DOW FROM _date)::integer;

  -- Check if date is blocked
  SELECT * INTO _exception
  FROM public.booking_exceptions
  WHERE user_id = _host_user_id
    AND exception_date = _date
  LIMIT 1;

  IF _exception IS NOT NULL AND _exception.is_blocked THEN
    RETURN; -- Day is blocked
  END IF;

  -- If there's a special schedule for this date, use it
  IF _exception IS NOT NULL AND NOT _exception.is_blocked THEN
    -- Use exception hours
    _slot_start := (_date || ' ' || _exception.start_time)::timestamp AT TIME ZONE _timezone;

    WHILE _slot_start + (_event_type.duration_minutes || ' minutes')::interval <=
          (_date || ' ' || _exception.end_time)::timestamp AT TIME ZONE _timezone
    LOOP
      _slot_end := _slot_start + (_event_type.duration_minutes || ' minutes')::interval;

      -- Check if slot is available (no conflicts)
      IF public.check_booking_slot_available(_host_user_id, _slot_start, _slot_end) THEN
        slot_start := _slot_start;
        slot_end := _slot_end;
        RETURN NEXT;
      END IF;

      -- Move to next slot (considering buffer)
      _slot_start := _slot_end + (_event_type.buffer_after_minutes || ' minutes')::interval;
    END LOOP;

    RETURN;
  END IF;

  -- Use regular availability for this day of week
  FOR _availability IN
    SELECT * FROM public.booking_availability
    WHERE user_id = _host_user_id AND day_of_week = _day_of_week
    ORDER BY start_time
  LOOP
    _slot_start := (_date || ' ' || _availability.start_time)::timestamp AT TIME ZONE _timezone;

    WHILE _slot_start + (_event_type.duration_minutes || ' minutes')::interval <=
          (_date || ' ' || _availability.end_time)::timestamp AT TIME ZONE _timezone
    LOOP
      _slot_end := _slot_start + (_event_type.duration_minutes || ' minutes')::interval;

      -- Check if slot is available (no conflicts)
      IF public.check_booking_slot_available(_host_user_id, _slot_start, _slot_end) THEN
        slot_start := _slot_start;
        slot_end := _slot_end;
        RETURN NEXT;
      END IF;

      -- Move to next slot (considering buffer)
      _slot_start := _slot_end + (_event_type.buffer_after_minutes || ' minutes')::interval;
    END LOOP;
  END LOOP;

  RETURN;
END;
$$;

-- Obtener información del host por username
CREATE OR REPLACE FUNCTION public.get_booking_host_by_username(_username text)
RETURNS TABLE (
  user_id uuid,
  display_name text,
  avatar_url text,
  username text,
  timezone text
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT
    p.id as user_id,
    COALESCE(p.full_name, p.username) as display_name,
    p.avatar_url,
    p.username,
    'America/Bogota'::text as timezone
  FROM public.profiles p
  WHERE p.username = _username
  LIMIT 1;
$$;

-- ============================================
-- 5. ENABLE RLS ON ALL TABLES
-- ============================================

ALTER TABLE public.booking_event_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_exceptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 6. RLS POLICIES
-- ============================================

-- ---- booking_event_types ----
-- Tipos activos son públicos para lectura (necesario para página de reserva)
CREATE POLICY "booking_event_types_public_read"
  ON public.booking_event_types FOR SELECT
  TO authenticated, anon
  USING (is_active = true);

-- Usuarios pueden gestionar sus propios tipos
CREATE POLICY "booking_event_types_owner_all"
  ON public.booking_event_types FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ---- booking_availability ----
-- Disponibilidad es pública para lectura (necesario para página de reserva)
CREATE POLICY "booking_availability_public_read"
  ON public.booking_availability FOR SELECT
  TO authenticated, anon
  USING (true);

-- Usuarios pueden gestionar su propia disponibilidad
CREATE POLICY "booking_availability_owner_all"
  ON public.booking_availability FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ---- booking_exceptions ----
-- Excepciones son públicas para lectura
CREATE POLICY "booking_exceptions_public_read"
  ON public.booking_exceptions FOR SELECT
  TO authenticated, anon
  USING (true);

-- Usuarios pueden gestionar sus propias excepciones
CREATE POLICY "booking_exceptions_owner_all"
  ON public.booking_exceptions FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ---- bookings ----
-- Cualquiera puede crear una reserva (incluido anónimos via edge function)
CREATE POLICY "bookings_insert_public"
  ON public.bookings FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

-- Hosts pueden ver sus reservas
CREATE POLICY "bookings_host_select"
  ON public.bookings FOR SELECT
  TO authenticated
  USING (auth.uid() = host_user_id);

-- Guests registrados pueden ver sus reservas
CREATE POLICY "bookings_guest_select"
  ON public.bookings FOR SELECT
  TO authenticated
  USING (auth.uid() = guest_user_id);

-- Hosts pueden actualizar sus reservas
CREATE POLICY "bookings_host_update"
  ON public.bookings FOR UPDATE
  TO authenticated
  USING (auth.uid() = host_user_id);

-- Hosts pueden eliminar sus reservas
CREATE POLICY "bookings_host_delete"
  ON public.bookings FOR DELETE
  TO authenticated
  USING (auth.uid() = host_user_id);

-- ============================================
-- 7. GRANTS
-- ============================================

GRANT ALL ON public.booking_event_types TO authenticated;
GRANT SELECT ON public.booking_event_types TO anon;

GRANT ALL ON public.booking_availability TO authenticated;
GRANT SELECT ON public.booking_availability TO anon;

GRANT ALL ON public.booking_exceptions TO authenticated;
GRANT SELECT ON public.booking_exceptions TO anon;

GRANT ALL ON public.bookings TO authenticated;
GRANT INSERT ON public.bookings TO anon;  -- Para reservas sin login

GRANT ALL ON public.booking_event_types TO service_role;
GRANT ALL ON public.booking_availability TO service_role;
GRANT ALL ON public.booking_exceptions TO service_role;
GRANT ALL ON public.bookings TO service_role;

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION public.check_booking_slot_available TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.get_available_booking_slots TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.get_booking_host_by_username TO authenticated, anon, service_role;

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
