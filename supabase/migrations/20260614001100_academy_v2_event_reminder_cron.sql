-- ============================================================
-- CRION Academy v2 — Cron event_reminder_24h
--
-- pg_cron job que cada 15 min busca academy_space_events que arrancan
-- en una ventana de [24h, 24h + 15min] desde ahora y emite el evento
-- `academy_event_reminder_24h` para cada RSVP `going`.
--
-- Idempotencia: usamos una tabla auxiliar `academy_event_reminders_sent`
-- con UNIQUE(event_id, user_id, reminder_type) para no duplicar.
--
-- Rollback:
--   SELECT cron.unschedule('academy_event_reminder_24h');
--   DROP TABLE academy_event_reminders_sent;
--   DROP FUNCTION academy_v2_dispatch_event_reminders_24h();
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Tabla de deduplicación
CREATE TABLE IF NOT EXISTS public.academy_event_reminders_sent (
  event_id uuid NOT NULL REFERENCES public.academy_space_events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reminder_type text NOT NULL CHECK (reminder_type IN ('24h', '1h')),
  sent_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (event_id, user_id, reminder_type)
);

ALTER TABLE public.academy_event_reminders_sent ENABLE ROW LEVEL SECURITY;

CREATE POLICY "academy_event_reminders_sent_service_role_all"
  ON public.academy_event_reminders_sent
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

GRANT ALL ON public.academy_event_reminders_sent TO service_role;

-- Dispatcher
CREATE OR REPLACE FUNCTION public.academy_v2_dispatch_event_reminders_24h()
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sent int := 0;
  r record;
  v_space_slug text;
  v_member_name text;
BEGIN
  -- Busca eventos que arrancan en (now + 24h, now + 24h15m] que aún
  -- no fueron reminded para cada RSVP `going`.
  FOR r IN
    SELECT
      e.id        AS event_id,
      e.space_id  AS space_id,
      e.title     AS event_title,
      e.starts_at AS event_starts_at,
      e.timezone  AS event_tz,
      rsvp.user_id
    FROM academy_space_events e
    JOIN academy_event_rsvps rsvp ON rsvp.event_id = e.id AND rsvp.status = 'going'
    LEFT JOIN academy_event_reminders_sent sent
      ON sent.event_id = e.id AND sent.user_id = rsvp.user_id AND sent.reminder_type = '24h'
    WHERE e.is_published = true
      AND e.starts_at >  now() + interval '24 hours'
      AND e.starts_at <= now() + interval '24 hours 15 minutes'
      AND sent.event_id IS NULL
  LOOP
    SELECT slug INTO v_space_slug FROM academy_spaces WHERE id = r.space_id;
    SELECT COALESCE(display_name, full_name, email, 'Miembro') INTO v_member_name
      FROM profiles WHERE id = r.user_id;

    PERFORM academy_emit_event_safe(
      p_type     := 'academy_event_reminder_24h',
      p_space_id := r.space_id,
      p_user_id  := r.user_id,
      p_payload  := jsonb_build_object(
        'title',          'Recordatorio: ' || r.event_title || ' mañana',
        'body',           'Comienza ' || to_char(r.event_starts_at AT TIME ZONE COALESCE(r.event_tz, 'America/Bogota'), 'DD Mon HH24:MI'),
        'link',           '/academia/' || v_space_slug || '/calendar',
        'reference_id',   r.event_id,
        'reference_type', 'event',
        'variables',      jsonb_build_array(
          v_member_name,
          r.event_title,
          to_char(r.event_starts_at AT TIME ZONE COALESCE(r.event_tz, 'America/Bogota'), 'DD Mon HH24:MI')
        )
      )
    );

    INSERT INTO academy_event_reminders_sent (event_id, user_id, reminder_type)
    VALUES (r.event_id, r.user_id, '24h')
    ON CONFLICT DO NOTHING;

    v_sent := v_sent + 1;
  END LOOP;

  RETURN v_sent;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.academy_v2_dispatch_event_reminders_24h() FROM PUBLIC, authenticated;
GRANT EXECUTE ON FUNCTION public.academy_v2_dispatch_event_reminders_24h() TO service_role;

-- Schedule cada 15 min (a los :00, :15, :30, :45)
-- Idempotente: si ya existe, lo recreamos.
DO $$
BEGIN
  PERFORM cron.unschedule('academy_event_reminder_24h');
EXCEPTION WHEN OTHERS THEN
  -- No existía, sin problema
  NULL;
END $$;

SELECT cron.schedule(
  'academy_event_reminder_24h',
  '*/15 * * * *',
  $$ SELECT public.academy_v2_dispatch_event_reminders_24h(); $$
);
