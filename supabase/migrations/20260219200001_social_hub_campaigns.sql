-- ============================================================================
-- SOCIAL HUB: Campaign Activation & Brand Collaboration
-- Enables creators to post content tagging brands as collaborators,
-- track post verification, and aggregate campaign-level metrics.
-- ============================================================================

-- ── 1. Add campaign fields to scheduled_posts ──────────────────────────────

ALTER TABLE scheduled_posts
  ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES marketplace_campaigns(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES marketplace_projects(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS brand_collaboration JSONB DEFAULT NULL,
  -- brand_collaboration: {
  --   brand_account_id: uuid (social_accounts.id of the brand),
  --   brand_username: string (e.g. @kreoon),
  --   brand_platform_id: string (platform-specific ID for collab),
  --   collaboration_type: 'collab_post' | 'mention' | 'tag' | 'branded_content',
  --   require_approval: boolean
  -- }
  ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT NULL,
  -- null = not applicable, 'pending' = awaiting verification, 'verified' = confirmed, 'rejected' = not compliant
  ADD COLUMN IF NOT EXISTS verification_details JSONB DEFAULT NULL,
  -- verification_details: {
  --   brand_mentioned: boolean,
  --   brand_tagged: boolean,
  --   collab_active: boolean,
  --   hashtags_used: string[],
  --   verified_at: timestamp,
  --   verified_by: uuid | 'auto'
  -- }
  ADD COLUMN IF NOT EXISTS creator_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
  -- When a brand schedules on behalf of a creator's account, creator_id tracks who

CREATE INDEX IF NOT EXISTS idx_scheduled_posts_campaign ON scheduled_posts(campaign_id) WHERE campaign_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_project ON scheduled_posts(project_id) WHERE project_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_verification ON scheduled_posts(verification_status) WHERE verification_status IS NOT NULL;

-- ── 2. Campaign social metrics aggregation view ────────────────────────────

CREATE OR REPLACE VIEW campaign_social_summary AS
SELECT
  sp.campaign_id,
  COUNT(DISTINCT sp.id) AS total_posts,
  COUNT(DISTINCT sp.id) FILTER (WHERE sp.status = 'published') AS published_posts,
  COUNT(DISTINCT sp.id) FILTER (WHERE sp.verification_status = 'verified') AS verified_posts,
  COUNT(DISTINCT sp.user_id) AS unique_creators,
  COALESCE(SUM(sm.impressions), 0) AS total_impressions,
  COALESCE(SUM(sm.reach), 0) AS total_reach,
  COALESCE(SUM(sm.engagement), 0) AS total_engagement,
  COALESCE(SUM(sm.likes), 0) AS total_likes,
  COALESCE(SUM(sm.comments), 0) AS total_comments,
  COALESCE(SUM(sm.shares), 0) AS total_shares,
  COALESCE(SUM(sm.saves), 0) AS total_saves,
  COALESCE(SUM(sm.video_views), 0) AS total_video_views,
  COALESCE(SUM(sm.clicks), 0) AS total_clicks,
  CASE
    WHEN SUM(sm.impressions) > 0
    THEN ROUND((SUM(sm.engagement)::NUMERIC / SUM(sm.impressions)::NUMERIC) * 100, 2)
    ELSE 0
  END AS avg_engagement_rate
FROM scheduled_posts sp
LEFT JOIN social_publish_logs spl ON spl.scheduled_post_id = sp.id AND spl.status = 'success'
LEFT JOIN social_metrics sm ON sm.scheduled_post_id = sp.id AND sm.metric_type = 'post'
WHERE sp.campaign_id IS NOT NULL
GROUP BY sp.campaign_id;

-- ── 3. RPC: Get campaign social metrics with creator breakdown ─────────────

CREATE OR REPLACE FUNCTION get_campaign_social_metrics(p_campaign_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'campaign_id', p_campaign_id,
    'summary', (
      SELECT row_to_json(s) FROM campaign_social_summary s WHERE s.campaign_id = p_campaign_id
    ),
    'creators', (
      SELECT json_agg(json_build_object(
        'user_id', sp.user_id,
        'display_name', COALESCE(pr.full_name, 'Creador'),
        'avatar_url', pr.avatar_url,
        'posts_count', COUNT(sp.id),
        'published_count', COUNT(sp.id) FILTER (WHERE sp.status = 'published'),
        'verified_count', COUNT(sp.id) FILTER (WHERE sp.verification_status = 'verified'),
        'total_impressions', COALESCE(SUM(sm.impressions), 0),
        'total_reach', COALESCE(SUM(sm.reach), 0),
        'total_engagement', COALESCE(SUM(sm.engagement), 0),
        'total_likes', COALESCE(SUM(sm.likes), 0),
        'total_video_views', COALESCE(SUM(sm.video_views), 0)
      ))
      FROM scheduled_posts sp
      LEFT JOIN profiles pr ON pr.id = sp.user_id
      LEFT JOIN social_metrics sm ON sm.scheduled_post_id = sp.id AND sm.metric_type = 'post'
      WHERE sp.campaign_id = p_campaign_id
      GROUP BY sp.user_id, pr.full_name, pr.avatar_url
    ),
    'posts', (
      SELECT json_agg(json_build_object(
        'id', sp.id,
        'user_id', sp.user_id,
        'caption', LEFT(sp.caption, 200),
        'status', sp.status,
        'verification_status', sp.verification_status,
        'scheduled_at', sp.scheduled_at,
        'published_at', sp.published_at,
        'thumbnail_url', sp.thumbnail_url,
        'target_accounts', sp.target_accounts,
        'publish_results', sp.publish_results,
        'brand_collaboration', sp.brand_collaboration,
        'impressions', COALESCE(sm.impressions, 0),
        'reach', COALESCE(sm.reach, 0),
        'engagement', COALESCE(sm.engagement, 0),
        'likes', COALESCE(sm.likes, 0),
        'comments', COALESCE(sm.comments, 0),
        'shares', COALESCE(sm.shares, 0),
        'video_views', COALESCE(sm.video_views, 0)
      ) ORDER BY sp.published_at DESC NULLS LAST)
      FROM scheduled_posts sp
      LEFT JOIN LATERAL (
        SELECT * FROM social_metrics mx
        WHERE mx.scheduled_post_id = sp.id AND mx.metric_type = 'post'
        ORDER BY mx.recorded_at DESC LIMIT 1
      ) sm ON true
      WHERE sp.campaign_id = p_campaign_id
    )
  ) INTO result;

  RETURN result;
END;
$$;

-- ── 4. RPC: Verify a campaign post (auto or manual) ───────────────────────

CREATE OR REPLACE FUNCTION verify_campaign_post(
  p_post_id UUID,
  p_brand_mentioned BOOLEAN DEFAULT false,
  p_brand_tagged BOOLEAN DEFAULT false,
  p_collab_active BOOLEAN DEFAULT false,
  p_hashtags_used TEXT[] DEFAULT '{}',
  p_verified_by UUID DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE scheduled_posts
  SET
    verification_status = CASE
      WHEN p_brand_mentioned OR p_brand_tagged OR p_collab_active THEN 'verified'
      ELSE 'rejected'
    END,
    verification_details = jsonb_build_object(
      'brand_mentioned', p_brand_mentioned,
      'brand_tagged', p_brand_tagged,
      'collab_active', p_collab_active,
      'hashtags_used', p_hashtags_used,
      'verified_at', now(),
      'verified_by', COALESCE(p_verified_by::TEXT, 'auto')
    )
  WHERE id = p_post_id AND campaign_id IS NOT NULL;
END;
$$;

-- ── 5. GRANTs ──────────────────────────────────────────────────────────────

GRANT SELECT ON campaign_social_summary TO authenticated;
GRANT SELECT ON campaign_social_summary TO service_role;
