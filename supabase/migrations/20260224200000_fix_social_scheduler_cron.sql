-- ══════════════════════════════════════════════════════════════════
-- Fix Social Scheduler Cron Job
-- Problem: pg_cron jobs using net.http_post failed because:
--   1. The schema 'net' was not in the search_path for cron jobs
--   2. app.settings.supabase_url and service_role_key were not configured
--   3. Default timeout of 5000ms was too short for publishing
--
-- Solution: Use hardcoded project URL (not sensitive) and 60s timeout.
-- Since social-scheduler has verify_jwt=false, no auth header needed.
--
-- Applied manually on 2026-02-25.
-- ══════════════════════════════════════════════════════════════════

-- 1. Ensure pg_net extension is enabled
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- 2. Remove old broken cron jobs
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'social-scheduler-process') THEN
    PERFORM cron.unschedule('social-scheduler-process');
  END IF;
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'sync-social-metrics-daily') THEN
    PERFORM cron.unschedule('sync-social-metrics-daily');
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- 3. Create new cron job with hardcoded URL and 60s timeout
-- Runs every 2 minutes to process scheduled posts
SELECT cron.schedule(
  'social-scheduler-process',
  '*/2 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://wjkbqcrxwsmvtxmqgiqc.supabase.co/functions/v1/social-scheduler/process',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  )
  $$
);

-- 4. Fix social metrics cron as well (same issue)
SELECT cron.schedule(
  'sync-social-metrics-daily',
  '0 6 * * *',
  $$
  SELECT net.http_post(
    url := 'https://wjkbqcrxwsmvtxmqgiqc.supabase.co/functions/v1/social-metrics/bulk-sync',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  )
  $$
);

-- 5. Add queue processing cron (every 15 minutes)
SELECT cron.schedule(
  'social-scheduler-queues',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://wjkbqcrxwsmvtxmqgiqc.supabase.co/functions/v1/social-scheduler/process-queues',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  )
  $$
);
