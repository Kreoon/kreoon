-- ============================================================
-- CRION Academy v2 — Event Bus
--
-- Bus de eventos in-process para academy. Todos los bloques nuevos
-- (WhatsApp, Cohortes, Challenges, Funnels, multi-gateway) publican
-- al bus en lugar de duplicar fan-out (notif in-app + WA + Zapier).
--
-- Flujo:
--   1. Caller llama RPC `academy_emit_event(p_type, p_payload, ...)`.
--   2. RPC inserta fila en `academy_event_log` (estado `pending`).
--   3. RPC dispara `pg_net` POST a edge function `academy-event-fanout`
--      con `{ event_id }` — el edge hace el fan-out real y marca
--      `processed_at`.
--   4. Si pg_net falla, la fila queda en `pending` para reintentos
--      manuales (cron `academy_event_log_reprocess` — fase futura).
--
-- Rollback manual:
--   DROP FUNCTION public.academy_emit_event(text, jsonb, uuid, uuid);
--   DROP TABLE public.academy_event_log;
-- ============================================================

CREATE TABLE IF NOT EXISTS public.academy_event_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  space_id uuid REFERENCES public.academy_spaces(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','processed','failed')),
  processed_at timestamptz,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS academy_event_log_event_type_created_idx
  ON public.academy_event_log (event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS academy_event_log_space_id_created_idx
  ON public.academy_event_log (space_id, created_at DESC);

-- Partial index para reprocesamiento (solo pending/failed)
CREATE INDEX IF NOT EXISTS academy_event_log_pending_idx
  ON public.academy_event_log (status, created_at)
  WHERE status IN ('pending', 'failed');

ALTER TABLE public.academy_event_log ENABLE ROW LEVEL SECURITY;

-- Solo service_role lee/escribe el log (el edge fanout lo hace).
-- Admins de space podrán leer eventos de su space a través de un RPC
-- específico cuando exista el panel de auditoría (fase futura).
CREATE POLICY "academy_event_log_service_role_all"
  ON public.academy_event_log
  FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

GRANT ALL ON public.academy_event_log TO service_role;

-- ============================================================
-- RPC academy_emit_event
-- ============================================================
-- Punto de entrada único para emitir eventos del bus.
-- Llamable desde edge functions (service_role) y desde triggers de DB.
-- También expuesto a `authenticated` para que el frontend pueda emitir
-- eventos directos (ej: `lesson_completed`) sin pasar por un edge.

CREATE OR REPLACE FUNCTION public.academy_emit_event(
  p_type text,
  p_payload jsonb DEFAULT '{}'::jsonb,
  p_space_id uuid DEFAULT NULL,
  p_user_id uuid DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event_id uuid;
  v_supabase_url text;
  v_service_key text;
BEGIN
  IF p_type IS NULL OR p_type = '' THEN
    RAISE EXCEPTION 'event_type is required';
  END IF;

  -- Fallback a p_user_id = caller cuando no se pasa explícito
  IF p_user_id IS NULL THEN
    p_user_id := auth.uid();
  END IF;

  INSERT INTO public.academy_event_log (event_type, space_id, user_id, payload, status)
  VALUES (p_type, p_space_id, p_user_id, COALESCE(p_payload, '{}'::jsonb), 'pending')
  RETURNING id INTO v_event_id;

  -- Fan-out fire-and-forget vía pg_net.
  -- Si falla la red, el evento queda como `pending` para reprocess.
  v_supabase_url := current_setting('app.settings.supabase_url', true);
  IF v_supabase_url IS NULL OR v_supabase_url = '' THEN
    v_supabase_url := 'https://wjkbqcrxwsmvtxmqgiqc.supabase.co';
  END IF;

  v_service_key := current_setting('app.settings.service_role_key', true);

  PERFORM net.http_post(
    url := v_supabase_url || '/functions/v1/academy-event-fanout',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || v_service_key,
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object('event_id', v_event_id)
  );

  RETURN v_event_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.academy_emit_event(text, jsonb, uuid, uuid)
  TO service_role, authenticated;

-- ============================================================
-- RPC academy_mark_event_processed
-- ============================================================
-- Llamado por el edge fanout al terminar el fan-out.
-- Idempotente: si ya está procesado no falla.

CREATE OR REPLACE FUNCTION public.academy_mark_event_processed(
  p_event_id uuid,
  p_status text DEFAULT 'processed',
  p_error text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_status NOT IN ('processed', 'failed') THEN
    RAISE EXCEPTION 'invalid status: %', p_status;
  END IF;

  UPDATE public.academy_event_log
    SET status       = p_status,
        processed_at = now(),
        error        = p_error
  WHERE id = p_event_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.academy_mark_event_processed(uuid, text, text)
  TO service_role;

-- ============================================================
-- Comentarios para documentación
-- ============================================================
COMMENT ON TABLE public.academy_event_log IS
  'CRION Academy v2 event bus log. Cada fila es un evento publicado al bus.';
COMMENT ON FUNCTION public.academy_emit_event(text, jsonb, uuid, uuid) IS
  'Emite un evento al bus de Academy v2. Inserta en academy_event_log y dispara academy-event-fanout vía pg_net.';
COMMENT ON FUNCTION public.academy_mark_event_processed(uuid, text, text) IS
  'Marca un evento como procesado o fallido. Llamado por academy-event-fanout.';
