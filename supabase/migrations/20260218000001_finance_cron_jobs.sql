-- ============================================================================
-- KREOON FINANCE - Cron Jobs
-- Version: 20260218000001
-- Requires: pg_cron extension (enable in Supabase Dashboard > Extensions)
-- ============================================================================

-- Enable pg_cron if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

-- Grant usage to postgres role
GRANT USAGE ON SCHEMA cron TO postgres;

-- ────────────────────────────────────────────────────
-- 1. Monthly AI Token Reset (1st of each month at midnight UTC)
-- Resets subscription tokens to monthly allowance
-- ────────────────────────────────────────────────────
SELECT cron.schedule(
  'reset-monthly-tokens',
  '0 0 1 * *',
  $$
    UPDATE ai_token_balances
    SET
      balance_subscription = balance_subscription + monthly_allowance,
      last_reset_at = NOW(),
      next_reset_at = NOW() + INTERVAL '30 days'
    WHERE monthly_allowance > 0
      AND next_reset_at <= NOW();
  $$
);

-- ────────────────────────────────────────────────────
-- 2. Auto-approve Escrows after 72h (every hour)
-- If client doesn't respond within 72h, auto-approve
-- ────────────────────────────────────────────────────
SELECT cron.schedule(
  'auto-approve-escrows',
  '0 * * * *',
  $$
    UPDATE escrow_holds
    SET
      status = 'approved',
      approved_at = NOW()
    WHERE
      status = 'pending_approval'
      AND auto_approve_at <= NOW();
  $$
);

-- ────────────────────────────────────────────────────
-- 3. Check Referral Activity (1st of each month)
-- Pause referral relationships where either party
-- has been inactive for 90+ days
-- ────────────────────────────────────────────────────
SELECT cron.schedule(
  'check-referral-activity',
  '0 0 1 * *',
  $$
    UPDATE referral_relationships
    SET status = 'paused'
    WHERE
      status = 'active'
      AND (
        referrer_last_active < NOW() - INTERVAL '90 days'
        OR referred_last_active < NOW() - INTERVAL '90 days'
      );
  $$
);
