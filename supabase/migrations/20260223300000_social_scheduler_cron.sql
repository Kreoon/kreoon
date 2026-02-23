-- ══════════════════════════════════════════════════════════════════
-- Social Scheduler Cron Job
-- Runs every 2 minutes to process scheduled posts that are due
-- ══════════════════════════════════════════════════════════════════

-- NOTE: This cron job was already applied manually on 2026-02-23
-- via: SELECT cron.schedule('social-scheduler-process', '*/2 * * * *', ...)
-- This migration documents it for future reference.

DO $outer$
BEGIN
  -- Only create if not already scheduled
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'social-scheduler-process') THEN
    PERFORM cron.schedule(
      'social-scheduler-process',
      '*/2 * * * *',
      $inner$SELECT net.http_post(
        url := current_setting('app.settings.supabase_url') || '/functions/v1/social-scheduler/process',
        headers := jsonb_build_object(
          'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
          'Content-Type', 'application/json'
        ),
        body := '{}'::jsonb
      );$inner$
    );
  END IF;
END $outer$;
