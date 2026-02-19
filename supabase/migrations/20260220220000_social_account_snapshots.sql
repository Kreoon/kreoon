-- ============================================================================
-- Social Account Snapshots: daily historical metrics for connected accounts
-- ============================================================================

-- Table for daily metric snapshots per account
CREATE TABLE IF NOT EXISTS social_account_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES social_accounts(id) ON DELETE CASCADE,

  -- Snapshot date (one row per account per day)
  snapshot_date DATE NOT NULL,

  -- Account-level counts
  followers_count INTEGER DEFAULT 0,
  following_count INTEGER DEFAULT 0,
  posts_count INTEGER DEFAULT 0,

  -- Period metrics (for that day)
  impressions BIGINT DEFAULT 0,
  reach BIGINT DEFAULT 0,
  profile_views INTEGER DEFAULT 0,
  accounts_engaged INTEGER DEFAULT 0,

  -- Engagement totals
  total_likes BIGINT DEFAULT 0,
  total_comments BIGINT DEFAULT 0,
  total_shares BIGINT DEFAULT 0,
  total_saves BIGINT DEFAULT 0,

  -- Video
  video_views BIGINT DEFAULT 0,

  -- Growth (computed from previous day)
  followers_gained INTEGER DEFAULT 0,
  followers_lost INTEGER DEFAULT 0,

  -- Audience demographics (JSONB for flexible structure)
  audience_demographics JSONB DEFAULT '{}',

  -- Raw API response for debugging
  raw_data JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(account_id, snapshot_date)
);

-- Indexes
CREATE INDEX idx_snapshots_account_date
  ON social_account_snapshots(account_id, snapshot_date DESC);

CREATE INDEX idx_snapshots_date
  ON social_account_snapshots(snapshot_date DESC);

-- RLS
ALTER TABLE social_account_snapshots ENABLE ROW LEVEL SECURITY;

-- SELECT: users can see snapshots for their own accounts
CREATE POLICY "Users can view own account snapshots"
  ON social_account_snapshots FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM social_accounts sa
      WHERE sa.id = social_account_snapshots.account_id
        AND sa.user_id = auth.uid()
    )
  );

-- Also allow org members to see snapshots for org accounts
CREATE POLICY "Org members can view org account snapshots"
  ON social_account_snapshots FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM social_accounts sa
      JOIN organization_members om ON om.organization_id = sa.organization_id
      WHERE sa.id = social_account_snapshots.account_id
        AND om.user_id = auth.uid()
    )
  );

-- Service role needs full access for edge function inserts
GRANT ALL ON social_account_snapshots TO authenticated;
GRANT ALL ON social_account_snapshots TO service_role;

-- Fix existing bug: post_metrics column name mismatch
-- The edge function writes 'raw_response' but column is 'platform_data'
-- Add raw_response as an alias column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'post_metrics' AND column_name = 'raw_response'
  ) THEN
    ALTER TABLE post_metrics ADD COLUMN raw_response JSONB DEFAULT '{}';
  END IF;
END $$;

-- ============================================================================
-- RPC: get_account_snapshots - fetch snapshots for a date range
-- ============================================================================
CREATE OR REPLACE FUNCTION get_account_snapshots(
  p_account_id UUID,
  p_days INTEGER DEFAULT 30
)
RETURNS SETOF social_account_snapshots
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT *
  FROM social_account_snapshots
  WHERE account_id = p_account_id
    AND snapshot_date >= (CURRENT_DATE - (p_days || ' days')::INTERVAL)
  ORDER BY snapshot_date ASC;
$$;

-- ============================================================================
-- RPC: get_org_account_snapshots - fetch snapshots for all org accounts
-- ============================================================================
CREATE OR REPLACE FUNCTION get_org_account_snapshots(
  p_org_id UUID,
  p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
  account_id UUID,
  platform TEXT,
  platform_username TEXT,
  platform_display_name TEXT,
  snapshot_date DATE,
  followers_count INTEGER,
  following_count INTEGER,
  posts_count INTEGER,
  impressions BIGINT,
  reach BIGINT,
  profile_views INTEGER,
  accounts_engaged INTEGER,
  total_likes BIGINT,
  total_comments BIGINT,
  total_shares BIGINT,
  total_saves BIGINT,
  video_views BIGINT,
  followers_gained INTEGER,
  followers_lost INTEGER,
  audience_demographics JSONB
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT
    s.account_id,
    sa.platform::TEXT,
    sa.platform_username,
    sa.platform_display_name,
    s.snapshot_date,
    s.followers_count,
    s.following_count,
    s.posts_count,
    s.impressions,
    s.reach,
    s.profile_views,
    s.accounts_engaged,
    s.total_likes,
    s.total_comments,
    s.total_shares,
    s.total_saves,
    s.video_views,
    s.followers_gained,
    s.followers_lost,
    s.audience_demographics
  FROM social_account_snapshots s
  JOIN social_accounts sa ON sa.id = s.account_id
  WHERE sa.organization_id = p_org_id
    AND sa.is_active = true
    AND s.snapshot_date >= (CURRENT_DATE - (p_days || ' days')::INTERVAL)
  ORDER BY s.snapshot_date ASC, sa.platform;
$$;

-- ============================================================================
-- Cron job: sync social metrics daily at 6 AM UTC
-- ============================================================================
DO $$
BEGIN
  -- Only create if pg_cron extension is available
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- Remove old job if exists
    PERFORM cron.unschedule('sync-social-metrics-daily');

    -- Schedule daily at 6 AM UTC
    PERFORM cron.schedule(
      'sync-social-metrics-daily',
      '0 6 * * *',
      $$
      SELECT net.http_post(
        url := current_setting('app.settings.supabase_url') || '/functions/v1/social-metrics/bulk-sync',
        headers := jsonb_build_object(
          'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
          'Content-Type', 'application/json'
        ),
        body := '{}'::jsonb
      );
      $$
    );
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_cron not available or scheduling failed: %', SQLERRM;
END $$;
