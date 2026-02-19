-- ============================================================================
-- SOCIAL HUB MODULE
-- Schedule, publish, and measure content across social media platforms
-- ============================================================================

-- ── Enums ──────────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE social_platform AS ENUM (
    'facebook', 'instagram', 'tiktok', 'youtube', 'twitter', 'linkedin', 'pinterest'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE scheduled_post_status AS ENUM (
    'draft', 'scheduled', 'publishing', 'published', 'partially_published', 'failed', 'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE social_post_type AS ENUM (
    'post', 'reel', 'story', 'short', 'carousel', 'thread', 'pin'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── 1. social_accounts ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS social_accounts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  platform        social_platform NOT NULL,
  platform_user_id   TEXT NOT NULL,
  platform_username  TEXT,
  platform_display_name TEXT,
  platform_avatar_url   TEXT,
  platform_page_id   TEXT,       -- Facebook Pages, LinkedIn Company pages
  platform_page_name TEXT,
  access_token       TEXT NOT NULL,
  refresh_token      TEXT,
  token_expires_at   TIMESTAMPTZ,
  scopes             TEXT[] DEFAULT '{}',
  is_active          BOOLEAN DEFAULT true,
  metadata           JSONB DEFAULT '{}',
  connected_at       TIMESTAMPTZ DEFAULT now(),
  last_synced_at     TIMESTAMPTZ,
  last_error         TEXT,
  created_at         TIMESTAMPTZ DEFAULT now(),
  updated_at         TIMESTAMPTZ DEFAULT now()
);

-- Prevent duplicate connections per platform+page per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_social_accounts_unique
  ON social_accounts(user_id, platform, platform_user_id, COALESCE(platform_page_id, ''))
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_social_accounts_user ON social_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_social_accounts_org ON social_accounts(organization_id) WHERE organization_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_social_accounts_token_expiry ON social_accounts(token_expires_at) WHERE is_active = true;

-- ── 2. scheduled_posts ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS scheduled_posts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  content_id      UUID,  -- optional link to existing content table
  caption         TEXT,
  hashtags        TEXT[] DEFAULT '{}',
  scheduled_at    TIMESTAMPTZ,
  published_at    TIMESTAMPTZ,
  status          scheduled_post_status DEFAULT 'draft',
  post_type       social_post_type DEFAULT 'post',
  visibility      TEXT DEFAULT 'public',
  first_comment   TEXT,            -- auto-comment after publishing
  location_name   TEXT,
  media_urls      TEXT[] DEFAULT '{}',
  thumbnail_url   TEXT,
  target_accounts JSONB DEFAULT '[]',  -- [{account_id, platform}]
  publish_results JSONB DEFAULT '[]',  -- [{account_id, platform, platform_post_id, status, error, published_at}]
  retry_count     INT DEFAULT 0,
  max_retries     INT DEFAULT 3,
  error_message   TEXT,
  metadata        JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scheduled_posts_user ON scheduled_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_org ON scheduled_posts(organization_id) WHERE organization_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_status ON scheduled_posts(status, scheduled_at)
  WHERE status = 'scheduled';
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_calendar ON scheduled_posts(user_id, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_content ON scheduled_posts(content_id) WHERE content_id IS NOT NULL;

-- ── 3. social_metrics ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS social_metrics (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  social_account_id UUID NOT NULL REFERENCES social_accounts(id) ON DELETE CASCADE,
  scheduled_post_id UUID REFERENCES scheduled_posts(id) ON DELETE CASCADE,
  platform_post_id  TEXT,
  metric_type       TEXT NOT NULL DEFAULT 'post',  -- 'post', 'account', 'story'
  impressions       INT DEFAULT 0,
  reach             INT DEFAULT 0,
  engagement        INT DEFAULT 0,
  likes             INT DEFAULT 0,
  comments          INT DEFAULT 0,
  shares            INT DEFAULT 0,
  saves             INT DEFAULT 0,
  clicks            INT DEFAULT 0,
  video_views       INT DEFAULT 0,
  watch_time_seconds INT DEFAULT 0,
  followers_count   INT DEFAULT 0,
  followers_gained  INT DEFAULT 0,
  profile_visits    INT DEFAULT 0,
  metadata          JSONB DEFAULT '{}',
  recorded_at       TIMESTAMPTZ DEFAULT now(),
  created_at        TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_social_metrics_account ON social_metrics(social_account_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_social_metrics_post ON social_metrics(scheduled_post_id) WHERE scheduled_post_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_social_metrics_type ON social_metrics(metric_type, recorded_at DESC);

-- ── 4. social_publish_logs ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS social_publish_logs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scheduled_post_id UUID NOT NULL REFERENCES scheduled_posts(id) ON DELETE CASCADE,
  social_account_id UUID NOT NULL REFERENCES social_accounts(id) ON DELETE CASCADE,
  platform          social_platform NOT NULL,
  action            TEXT NOT NULL,  -- 'publish', 'delete', 'update', 'retry'
  status            TEXT NOT NULL,  -- 'success', 'failed', 'pending'
  platform_post_id  TEXT,
  platform_response JSONB,
  error_message     TEXT,
  duration_ms       INT,
  created_at        TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_social_publish_logs_post ON social_publish_logs(scheduled_post_id, created_at DESC);

-- ── 5. Triggers for updated_at ─────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_social_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_social_accounts_updated ON social_accounts;
CREATE TRIGGER trg_social_accounts_updated
  BEFORE UPDATE ON social_accounts
  FOR EACH ROW EXECUTE FUNCTION update_social_updated_at();

DROP TRIGGER IF EXISTS trg_scheduled_posts_updated ON scheduled_posts;
CREATE TRIGGER trg_scheduled_posts_updated
  BEFORE UPDATE ON scheduled_posts
  FOR EACH ROW EXECUTE FUNCTION update_social_updated_at();

-- ── 6. RLS Policies ────────────────────────────────────────────────────────

ALTER TABLE social_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_publish_logs ENABLE ROW LEVEL SECURITY;

-- social_accounts: users see/manage their own + org members see org accounts
CREATE POLICY social_accounts_select ON social_accounts FOR SELECT USING (
  user_id = auth.uid()
  OR (organization_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM organization_members om
    WHERE om.organization_id = social_accounts.organization_id
      AND om.user_id = auth.uid()
  ))
);

CREATE POLICY social_accounts_insert ON social_accounts FOR INSERT WITH CHECK (
  user_id = auth.uid()
);

CREATE POLICY social_accounts_update ON social_accounts FOR UPDATE USING (
  user_id = auth.uid()
);

CREATE POLICY social_accounts_delete ON social_accounts FOR DELETE USING (
  user_id = auth.uid()
);

-- scheduled_posts: users see/manage their own + org members see org posts
CREATE POLICY scheduled_posts_select ON scheduled_posts FOR SELECT USING (
  user_id = auth.uid()
  OR (organization_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM organization_members om
    WHERE om.organization_id = scheduled_posts.organization_id
      AND om.user_id = auth.uid()
  ))
);

CREATE POLICY scheduled_posts_insert ON scheduled_posts FOR INSERT WITH CHECK (
  user_id = auth.uid()
);

CREATE POLICY scheduled_posts_update ON scheduled_posts FOR UPDATE USING (
  user_id = auth.uid()
  OR (organization_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM organization_members om
    WHERE om.organization_id = scheduled_posts.organization_id
      AND om.user_id = auth.uid()
      AND om.role IN ('admin', 'team_leader', 'strategist')
  ))
);

CREATE POLICY scheduled_posts_delete ON scheduled_posts FOR DELETE USING (
  user_id = auth.uid()
);

-- social_metrics: read-only for account owners + org members
CREATE POLICY social_metrics_select ON social_metrics FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM social_accounts sa
    WHERE sa.id = social_metrics.social_account_id
      AND (
        sa.user_id = auth.uid()
        OR (sa.organization_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM organization_members om
          WHERE om.organization_id = sa.organization_id
            AND om.user_id = auth.uid()
        ))
      )
  )
);

-- social_publish_logs: read-only for post owners
CREATE POLICY social_publish_logs_select ON social_publish_logs FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM scheduled_posts sp
    WHERE sp.id = social_publish_logs.scheduled_post_id
      AND sp.user_id = auth.uid()
  )
);

-- ── 7. GRANTs ──────────────────────────────────────────────────────────────

GRANT ALL ON social_accounts TO authenticated;
GRANT ALL ON social_accounts TO service_role;
GRANT ALL ON scheduled_posts TO authenticated;
GRANT ALL ON scheduled_posts TO service_role;
GRANT ALL ON social_metrics TO authenticated;
GRANT ALL ON social_metrics TO service_role;
GRANT ALL ON social_publish_logs TO authenticated;
GRANT ALL ON social_publish_logs TO service_role;

-- ── 8. Helper RPC: get upcoming scheduled posts (for scheduler cron) ───────

CREATE OR REPLACE FUNCTION get_due_scheduled_posts()
RETURNS SETOF scheduled_posts
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT *
  FROM scheduled_posts
  WHERE status = 'scheduled'
    AND scheduled_at <= now()
    AND retry_count < max_retries
  ORDER BY scheduled_at ASC
  LIMIT 50;
$$;

-- ── 9. Helper RPC: get social account with token (for service_role) ────────

CREATE OR REPLACE FUNCTION get_social_account_token(p_account_id UUID)
RETURNS TABLE(
  id UUID,
  platform social_platform,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  platform_user_id TEXT,
  platform_page_id TEXT,
  metadata JSONB
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT sa.id, sa.platform, sa.access_token, sa.refresh_token,
         sa.token_expires_at, sa.platform_user_id, sa.platform_page_id, sa.metadata
  FROM social_accounts sa
  WHERE sa.id = p_account_id AND sa.is_active = true;
$$;
