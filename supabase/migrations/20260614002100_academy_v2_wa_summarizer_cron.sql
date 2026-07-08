-- ============================================================
-- CRION Academy v2 — Cron summarizer + templates extra (S3.2)
--
-- 1. pg_cron diario que invoca academy-wa-summarizer (20:00 UTC).
-- 2. Seed de 2 templates WhatsApp adicionales:
--    - academy_wa_daily_digest (owner recibe resumen)
--    - academy_broadcast (broadcast del owner a miembros)
--
-- Rollback:
--   SELECT cron.unschedule('academy_wa_summarizer_daily');
--   DELETE FROM whatsapp_notification_templates
--     WHERE event_type IN ('academy_wa_daily_digest', 'academy_broadcast');
-- ============================================================

-- ─── Templates adicionales ─────────────────────────────────────
INSERT INTO public.whatsapp_notification_templates
  (event_type, template_id, template_name, language, category, variables_schema, is_active)
VALUES

  -- ─── academy_wa_daily_digest (owner) ───────────────────────
  -- Body: "Resumen del día en {{1}}: {{2}} mensajes, {{3}} miembros activos."
  -- Button URL → admin/whatsapp
  (
    'academy_wa_daily_digest',
    'PENDING',
    'crion_academy_wa_daily_digest',
    'es',
    'MARKETING',
    '[{"pos":1,"name":"space_name","example":"Marketing con IA"},
      {"pos":2,"name":"total_messages","example":"47"},
      {"pos":3,"name":"active_members","example":"12"}]'::jsonb,
    false
  ),

  -- ─── academy_broadcast (broadcast a miembros) ──────────────
  -- ⚠️ MARKETING — solo se envía a miembros con whatsapp_enabled (opt-in)
  -- Body: "{{1}}, {{2}}" — variable 1 = nombre miembro, variable 2 = mensaje del owner
  (
    'academy_broadcast',
    'PENDING',
    'crion_academy_broadcast',
    'es',
    'MARKETING',
    '[{"pos":1,"name":"member_name","example":"Alexander"},
      {"pos":2,"name":"message","example":"Hoy publicamos un nuevo recurso en la sección de…"}]'::jsonb,
    false
  )

ON CONFLICT (event_type) DO NOTHING;


-- ─── Cron summarizer diario ────────────────────────────────────
DO $$
BEGIN
  PERFORM cron.unschedule('academy_wa_summarizer_daily');
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- 20:00 UTC = 15:00 Bogotá / 17:00 Buenos Aires / 21:00 Madrid
SELECT cron.schedule(
  'academy_wa_summarizer_daily',
  '0 20 * * *',
  $$
  SELECT net.http_post(
    url := 'https://wjkbqcrxwsmvtxmqgiqc.supabase.co/functions/v1/academy-wa-summarizer',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);
