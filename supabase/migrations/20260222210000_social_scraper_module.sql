-- ============================================================
-- Social Scraper Module — Organic content intelligence
-- Scrapes IG, TikTok, FB, YouTube, X via Apify
-- ============================================================

-- ── Scrape Targets (accounts/hashtags to monitor) ───────────

CREATE TABLE social_scrape_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  platform TEXT NOT NULL,                       -- instagram | tiktok | facebook | youtube | twitter
  target_type TEXT NOT NULL DEFAULT 'profile',  -- profile | hashtag | keyword
  target_value TEXT NOT NULL,                   -- @username, #hashtag, or keyword
  display_name TEXT,                            -- human-readable label
  is_active BOOLEAN NOT NULL DEFAULT true,
  sync_interval_hours INT DEFAULT 24,
  last_synced_at TIMESTAMPTZ,
  total_items_found INT DEFAULT 0,
  metadata JSONB DEFAULT '{}',                  -- platform-specific config (e.g., follower count)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Scraped Content Items ───────────────────────────────────

CREATE TABLE social_scrape_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_id UUID REFERENCES social_scrape_targets(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  platform_item_id TEXT NOT NULL,               -- post/video/tweet ID on the platform
  author_username TEXT,
  author_name TEXT,
  content_type TEXT,                            -- post | reel | story | video | short | tweet
  text_content TEXT,                            -- caption, tweet text, description
  media_url TEXT,                               -- primary media URL (image/video)
  thumbnail_url TEXT,
  permalink TEXT,                               -- link to original post
  hashtags TEXT[],
  mentions TEXT[],
  -- Engagement metrics
  likes INT DEFAULT 0,
  comments INT DEFAULT 0,
  shares INT DEFAULT 0,
  views INT DEFAULT 0,
  saves INT DEFAULT 0,
  engagement_rate NUMERIC(5,2),                 -- calculated (likes+comments+shares)/views*100
  -- Timing
  published_at TIMESTAMPTZ,
  -- Raw + AI
  raw_data JSONB DEFAULT '{}',
  ai_analysis JSONB,                            -- {hooks, virality_score, content_pillars, etc.}
  ai_analyzed_at TIMESTAMPTZ,
  -- Meta
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(platform, platform_item_id)
);

-- ── Indexes ─────────────────────────────────────────────────

CREATE INDEX idx_scrape_targets_created_by ON social_scrape_targets(created_by);
CREATE INDEX idx_scrape_targets_platform ON social_scrape_targets(platform);
CREATE INDEX idx_scrape_items_target_id ON social_scrape_items(target_id);
CREATE INDEX idx_scrape_items_platform ON social_scrape_items(platform);
CREATE INDEX idx_scrape_items_platform_item_id ON social_scrape_items(platform, platform_item_id);
CREATE INDEX idx_scrape_items_published_at ON social_scrape_items(published_at DESC);
CREATE INDEX idx_scrape_items_engagement ON social_scrape_items(likes DESC);
CREATE INDEX idx_scrape_items_views ON social_scrape_items(views DESC);

-- ── RLS ─────────────────────────────────────────────────────

ALTER TABLE social_scrape_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_scrape_items ENABLE ROW LEVEL SECURITY;

-- social_scrape_targets
CREATE POLICY "scrape_targets_select" ON social_scrape_targets FOR SELECT TO authenticated USING (is_platform_root(auth.uid()));
CREATE POLICY "scrape_targets_insert" ON social_scrape_targets FOR INSERT TO authenticated WITH CHECK (is_platform_root(auth.uid()));
CREATE POLICY "scrape_targets_update" ON social_scrape_targets FOR UPDATE TO authenticated USING (is_platform_root(auth.uid()));
CREATE POLICY "scrape_targets_delete" ON social_scrape_targets FOR DELETE TO authenticated USING (is_platform_root(auth.uid()));

-- social_scrape_items
CREATE POLICY "scrape_items_select" ON social_scrape_items FOR SELECT TO authenticated USING (is_platform_root(auth.uid()));
CREATE POLICY "scrape_items_insert" ON social_scrape_items FOR INSERT TO authenticated WITH CHECK (is_platform_root(auth.uid()));
CREATE POLICY "scrape_items_update" ON social_scrape_items FOR UPDATE TO authenticated USING (is_platform_root(auth.uid()));
CREATE POLICY "scrape_items_delete" ON social_scrape_items FOR DELETE TO authenticated USING (is_platform_root(auth.uid()));

-- ── Grants ──────────────────────────────────────────────────

GRANT ALL ON social_scrape_targets TO authenticated;
GRANT ALL ON social_scrape_targets TO service_role;
GRANT ALL ON social_scrape_items TO authenticated;
GRANT ALL ON social_scrape_items TO service_role;

NOTIFY pgrst, 'reload schema';
