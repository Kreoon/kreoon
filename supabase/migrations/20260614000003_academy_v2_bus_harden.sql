-- ============================================================
-- CRION Academy v2 — Hardening del event bus
--
-- Fix de seguridad post-review (2 ítems HIGH):
--
-- (1) Authorization / Event Spoofing
--     La migración 20260614000000 dio GRANT EXECUTE a `authenticated`,
--     lo que permitía a cualquier user autenticado:
--       - Spoofear p_user_id (notif injection a víctimas)
--       - Spoofear p_type (level_up/certificate_ready/etc.)
--       - Spoofear payload.title/body/link/sender_id (in-app content)
--       - Spoofear payload.phone (relay abuse del cupo WhatsApp)
--     Fix: REVOKE FROM authenticated. En S1-S7 todos los emisores son
--     service_role (edge functions) o triggers DB SECURITY DEFINER
--     que corren como `postgres` (owner del RPC) y por tanto pueden
--     ejecutar sin importar GRANTs. Cualquier emisión desde frontend
--     en el futuro debe pasar por un edge function dedicado que haga
--     scoping (auth.uid() forzado, allowlist de tipos, validación de
--     space membership, strip de campos sensibles del payload).
--
-- (2) Hardcoded Configuration / Secret Handling
--     El RPC lee `app.settings.supabase_url` de un GUC; esos GUCs son
--     overrideables con `SET LOCAL` en la sesión del caller. Con el
--     REVOKE del fix (1) el caller solo puede ser service_role o
--     postgres, que no aceptan override externo en sesiones de
--     PostgREST. Aún así, hardcodeamos la URL del proyecto Kreoon
--     (wjkbqcrxwsmvtxmqgiqc) y validamos el path contra allowlist
--     explícita para eliminar la dependencia del GUC.
--
--     Para `service_role_key` mantenemos el patrón `current_setting`
--     porque es el estándar establecido del proyecto (igual que
--     notify_content_status_change en 20260513150000). El secret nunca
--     debe hardcodearse en código fuente y la migración no debe
--     conocerlo. Riesgo de override está mitigado por (1).
--
-- Rollback manual (NO recomendado):
--   GRANT EXECUTE ON FUNCTION academy_emit_event(text, jsonb, uuid, uuid)
--     TO authenticated;
-- ============================================================

-- ─── (1) REVOKE EXECUTE de authenticated ────────────────────
REVOKE EXECUTE ON FUNCTION public.academy_emit_event(text, jsonb, uuid, uuid)
  FROM authenticated;

-- Asegurar service_role mantiene EXECUTE (idempotente).
GRANT EXECUTE ON FUNCTION public.academy_emit_event(text, jsonb, uuid, uuid)
  TO service_role;

-- ─── (2) Re-crear el RPC con URL hardcoded + path allowlist ─
-- Hardcodeo el host del proyecto Kreoon en lugar de GUC overrideable.
-- El path se valida contra una constante explícita para descartar SSRF
-- via override accidental o malicioso del path.
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
  v_service_key text;
  v_fanout_secret text;
  -- Host hardcoded del proyecto. NO leer de GUC — evita SSRF via
  -- override de `app.settings.supabase_url` en la sesión del caller.
  c_supabase_url constant text := 'https://wjkbqcrxwsmvtxmqgiqc.supabase.co';
  -- Path allowlist: solo permitimos fan-out al worker conocido.
  c_fanout_path constant text := '/functions/v1/academy-event-fanout';
BEGIN
  IF p_type IS NULL OR p_type = '' THEN
    RAISE EXCEPTION 'event_type is required';
  END IF;

  IF p_user_id IS NULL THEN
    p_user_id := auth.uid();
  END IF;

  INSERT INTO public.academy_event_log (event_type, space_id, user_id, payload, status)
  VALUES (p_type, p_space_id, p_user_id, COALESCE(p_payload, '{}'::jsonb), 'pending')
  RETURNING id INTO v_event_id;

  -- service_role_key sigue en GUC (patrón estándar del proyecto, no
  -- podemos hardcodear un secret en SQL). Riesgo de override mitigado
  -- por el REVOKE de authenticated del paso (1).
  v_service_key := current_setting('app.settings.service_role_key', true);

  -- Shared secret entre el RPC y el worker academy-event-fanout.
  -- DEBE configurarse vía:
  --   ALTER DATABASE postgres SET "app.settings.academy_fanout_secret" = '<hex>';
  --   (mismo valor en env var ACADEMY_FANOUT_SECRET del edge function)
  -- Sin esto el worker rechaza con 401.
  v_fanout_secret := current_setting('app.settings.academy_fanout_secret', true);

  -- Fire-and-forget vía pg_net. Si la red falla, el evento queda en
  -- estado `pending` para reprocess.
  PERFORM net.http_post(
    url := c_supabase_url || c_fanout_path,
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || v_service_key,
      'Content-Type', 'application/json',
      'x-academy-fanout-secret', COALESCE(v_fanout_secret, '')
    ),
    body := jsonb_build_object('event_id', v_event_id)
  );

  RETURN v_event_id;
END;
$$;

COMMENT ON FUNCTION public.academy_emit_event(text, jsonb, uuid, uuid) IS
  'Emite un evento al bus de Academy v2. SOLO callable por service_role o triggers SECURITY DEFINER (postgres). NUNCA exponer a authenticated — usar edge function de scoping. URL del fanout hardcoded y path validado para descartar SSRF.';
