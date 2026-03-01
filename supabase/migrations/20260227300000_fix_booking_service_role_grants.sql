-- Fix missing service_role GRANTs and policies for booking tables
-- Required for edge functions (reminders, webhooks, calendar sync) to work correctly

-- 1. booking_custom_questions
GRANT ALL ON booking_custom_questions TO service_role;

-- 2. booking_question_answers
GRANT ALL ON booking_question_answers TO service_role;

-- 3. booking_branding
GRANT ALL ON booking_branding TO service_role;

-- 4. booking_reminder_settings - needed for cron jobs
GRANT ALL ON booking_reminder_settings TO service_role;

-- Add SELECT policy for service_role to read reminder settings
CREATE POLICY "Service can read reminder settings"
  ON booking_reminder_settings
  FOR SELECT
  TO service_role
  USING (true);

-- 5. calendar_integrations - needed for sync operations
GRANT ALL ON calendar_integrations TO service_role;

-- Add policy for service_role to manage calendar integrations
CREATE POLICY "Service can manage calendar integrations"
  ON calendar_integrations
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 6. booking_webhooks - needed for webhook dispatcher
GRANT ALL ON booking_webhooks TO service_role;

-- Add policy for service_role to read webhooks
CREATE POLICY "Service can read webhooks"
  ON booking_webhooks
  FOR SELECT
  TO service_role
  USING (true);

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';

COMMENT ON TABLE booking_custom_questions IS 'Custom questions per event type - service_role fixed';
COMMENT ON TABLE booking_reminder_settings IS 'Reminder configuration - service_role fixed';
COMMENT ON TABLE booking_webhooks IS 'Webhook endpoints - service_role fixed';
