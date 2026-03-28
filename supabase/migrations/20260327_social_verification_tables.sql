-- ============================================================================
-- KREOON SOCIAL VERIFICATION TABLES
-- Tables for social API integrations and influencer verification
-- ============================================================================

-- 1. OAuth states for social connections (temporary storage)
CREATE TABLE IF NOT EXISTS public.oauth_states (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  state text UNIQUE NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform text NOT NULL,
  creator_profile_id uuid REFERENCES public.creator_profiles(id) ON DELETE SET NULL,
  return_url text,
  code_verifier text, -- For PKCE
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Auto-cleanup expired states
CREATE INDEX IF NOT EXISTS idx_oauth_states_expires ON public.oauth_states(expires_at);

-- 2. Creator social connections (OAuth tokens and metrics)
CREATE TABLE IF NOT EXISTS public.creator_social_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  creator_profile_id uuid REFERENCES public.creator_profiles(id) ON DELETE SET NULL,
  platform text NOT NULL, -- 'instagram', 'tiktok', 'youtube', 'twitter'
  platform_user_id text NOT NULL,
  platform_username text,
  -- OAuth tokens
  access_token text NOT NULL,
  refresh_token text,
  token_expires_at timestamptz,
  refresh_token_expires_at timestamptz,
  -- Metrics (synced from API)
  followers_count integer DEFAULT 0,
  following_count integer DEFAULT 0,
  posts_count integer DEFAULT 0,
  likes_count integer DEFAULT 0, -- Total likes received (TikTok)
  engagement_rate numeric(5,2) DEFAULT 0,
  -- Verification
  is_verified boolean DEFAULT false,
  verification_status text, -- 'verified', 'mismatch', 'pending', 'error', 'expired'
  declared_followers integer,
  actual_followers integer,
  variance_pct numeric(5,2),
  verified_at timestamptz,
  -- Metadata
  last_synced_at timestamptz,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  -- Constraints
  CONSTRAINT unique_user_platform UNIQUE(user_id, platform)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_creator_social_profile ON public.creator_social_connections(creator_profile_id);
CREATE INDEX IF NOT EXISTS idx_creator_social_platform ON public.creator_social_connections(platform);
CREATE INDEX IF NOT EXISTS idx_creator_social_verified ON public.creator_social_connections(is_verified) WHERE is_verified = true;

-- 3. Creator verified metrics (historical snapshots)
CREATE TABLE IF NOT EXISTS public.creator_verified_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  creator_profile_id uuid REFERENCES public.creator_profiles(id) ON DELETE SET NULL,
  platform text NOT NULL,
  -- Metrics at verification time
  followers_count integer NOT NULL,
  following_count integer DEFAULT 0,
  posts_count integer DEFAULT 0,
  likes_count integer DEFAULT 0,
  engagement_rate numeric(5,2),
  avg_views integer,
  avg_likes integer,
  avg_comments integer,
  -- Verification details
  declared_followers integer,
  variance_pct numeric(5,2),
  is_verified boolean DEFAULT false,
  verification_status text,
  verification_source text, -- 'api', 'manual', 'screenshot'
  verified_at timestamptz NOT NULL,
  -- Timestamps
  created_at timestamptz DEFAULT now()
);

-- Index for historical queries
CREATE INDEX IF NOT EXISTS idx_verified_metrics_profile ON public.creator_verified_metrics(creator_profile_id, verified_at DESC);

-- 4. Creator verification history (audit trail)
CREATE TABLE IF NOT EXISTS public.creator_verification_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_profile_id uuid NOT NULL REFERENCES public.creator_profiles(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Verification result
  overall_verified boolean NOT NULL,
  verification_score integer DEFAULT 0, -- 0-100
  platforms_data jsonb DEFAULT '[]', -- Array of platform verification results
  badges_earned text[] DEFAULT '{}',
  alerts jsonb DEFAULT '[]',
  -- Who verified
  verified_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  verified_at timestamptz NOT NULL,
  -- Timestamps
  created_at timestamptz DEFAULT now()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_verification_history_profile ON public.creator_verification_history(creator_profile_id, verified_at DESC);

-- 5. Campaign ROI metrics (aggregated)
CREATE TABLE IF NOT EXISTS public.campaign_roi_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.marketplace_campaigns(id) ON DELETE CASCADE,
  -- Period
  period_start date NOT NULL,
  period_end date NOT NULL,
  -- Investment
  total_investment numeric(12,2) DEFAULT 0,
  currency text DEFAULT 'USD',
  total_videos integer DEFAULT 0,
  total_creators integer DEFAULT 0,
  -- Performance metrics
  total_views bigint DEFAULT 0,
  total_likes bigint DEFAULT 0,
  total_comments bigint DEFAULT 0,
  total_shares bigint DEFAULT 0,
  total_saves bigint DEFAULT 0,
  avg_engagement_rate numeric(5,2) DEFAULT 0,
  -- Cost metrics
  cost_per_video numeric(10,2) DEFAULT 0,
  cost_per_view numeric(10,6) DEFAULT 0,
  cost_per_engagement numeric(10,4) DEFAULT 0,
  cost_per_thousand_views numeric(10,2) DEFAULT 0,
  -- Value estimation
  estimated_value numeric(12,2) DEFAULT 0,
  roi_multiplier numeric(6,2) DEFAULT 0,
  roi_percentage numeric(8,2) DEFAULT 0,
  -- Timestamps
  calculated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  -- Unique per campaign/period
  CONSTRAINT unique_campaign_period UNIQUE(campaign_id, period_start, period_end)
);

-- Index
CREATE INDEX IF NOT EXISTS idx_roi_metrics_campaign ON public.campaign_roi_metrics(campaign_id);

-- 6. Add verification columns to creator_profiles if not exist
DO $$
BEGIN
  -- Add verification_score column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'creator_profiles' AND column_name = 'verification_score'
  ) THEN
    ALTER TABLE public.creator_profiles ADD COLUMN verification_score integer DEFAULT 0;
  END IF;

  -- Add verification_badges column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'creator_profiles' AND column_name = 'verification_badges'
  ) THEN
    ALTER TABLE public.creator_profiles ADD COLUMN verification_badges text[] DEFAULT '{}';
  END IF;

  -- Add verified_at column if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'creator_profiles' AND column_name = 'verified_at'
  ) THEN
    ALTER TABLE public.creator_profiles ADD COLUMN verified_at timestamptz;
  END IF;
END $$;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- OAuth states (only service role access, temporary data)
ALTER TABLE public.oauth_states ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage oauth_states"
  ON public.oauth_states FOR ALL
  USING (auth.role() = 'service_role');

-- Creator social connections
ALTER TABLE public.creator_social_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own social connections"
  ON public.creator_social_connections FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own social connections"
  ON public.creator_social_connections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own social connections"
  ON public.creator_social_connections FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own social connections"
  ON public.creator_social_connections FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage social connections"
  ON public.creator_social_connections FOR ALL
  USING (auth.role() = 'service_role');

-- Creator verified metrics
ALTER TABLE public.creator_verified_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own verified metrics"
  ON public.creator_verified_metrics FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage verified metrics"
  ON public.creator_verified_metrics FOR ALL
  USING (auth.role() = 'service_role');

-- Verification history
ALTER TABLE public.creator_verification_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own verification history"
  ON public.creator_verification_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage verification history"
  ON public.creator_verification_history FOR ALL
  USING (auth.role() = 'service_role');

-- Campaign ROI metrics (visible to campaign owner and org members)
ALTER TABLE public.campaign_roi_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Campaign owners can view ROI metrics"
  ON public.campaign_roi_metrics FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.marketplace_campaigns mc
      WHERE mc.id = campaign_roi_metrics.campaign_id
      AND mc.brand_user_id = auth.uid()
    )
  );

CREATE POLICY "Service role can manage ROI metrics"
  ON public.campaign_roi_metrics FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Auto-update updated_at on creator_social_connections
CREATE OR REPLACE FUNCTION public.update_social_connections_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_social_connections_updated_at ON public.creator_social_connections;
CREATE TRIGGER trigger_social_connections_updated_at
  BEFORE UPDATE ON public.creator_social_connections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_social_connections_updated_at();

-- Cleanup expired oauth states (run periodically via cron)
CREATE OR REPLACE FUNCTION public.cleanup_expired_oauth_states()
RETURNS void AS $$
BEGIN
  DELETE FROM public.oauth_states WHERE expires_at < now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE public.oauth_states IS 'Temporary storage for OAuth state parameters during social login flows';
COMMENT ON TABLE public.creator_social_connections IS 'OAuth tokens and synced metrics from social platforms';
COMMENT ON TABLE public.creator_verified_metrics IS 'Historical snapshots of verified social metrics';
COMMENT ON TABLE public.creator_verification_history IS 'Audit trail of influencer verification attempts';
COMMENT ON TABLE public.campaign_roi_metrics IS 'Aggregated ROI metrics per campaign per period';
