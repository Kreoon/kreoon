-- ============================================================================
-- SOCIAL HUB v2.0: Multi-Level Account Ownership, Groups, Permissions, Queues
-- Extends existing social_hub schema (20260219200000) with org/brand-level
-- account ownership, account groups, granular permissions, content queues,
-- and per-post metrics.
-- ============================================================================

-- ── 1. Add 'threads' to social_platform enum ────────────────────────────────

DO $$ BEGIN
  ALTER TYPE social_platform ADD VALUE IF NOT EXISTS 'threads';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── 2. Extend social_accounts with ownership + metadata ─────────────────────

DO $$ BEGIN
  CREATE TYPE social_account_owner_type AS ENUM ('user', 'brand', 'organization');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE social_account_type AS ENUM ('personal', 'business', 'creator', 'page');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE social_accounts
  ADD COLUMN IF NOT EXISTS owner_type social_account_owner_type DEFAULT 'user',
  ADD COLUMN IF NOT EXISTS brand_id UUID REFERENCES brands(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS account_type social_account_type DEFAULT 'personal',
  ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS platform_metadata JSONB DEFAULT '{}';

COMMENT ON COLUMN social_accounts.owner_type IS 'Who owns this connection: user, brand, or organization';
COMMENT ON COLUMN social_accounts.brand_id IS 'Brand that owns this account (when owner_type=brand)';
COMMENT ON COLUMN social_accounts.account_type IS 'Type of social account: personal, business, creator, page';
COMMENT ON COLUMN social_accounts.settings IS 'Per-account settings: auto_publish, default_hashtags, watermark, etc.';
COMMENT ON COLUMN social_accounts.platform_metadata IS 'Platform-specific data: followers_count, verification_status, etc.';

CREATE INDEX IF NOT EXISTS idx_social_accounts_brand ON social_accounts(brand_id) WHERE brand_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_social_accounts_owner_type ON social_accounts(owner_type, organization_id);

-- ── 3. social_account_groups ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS social_account_groups (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  description     TEXT,
  color           TEXT DEFAULT '#6366f1',
  icon            TEXT DEFAULT 'folder',
  is_default      BOOLEAN DEFAULT false,
  sort_order      INT DEFAULT 0,
  created_by      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_social_account_groups_org ON social_account_groups(organization_id, sort_order);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS trg_social_account_groups_updated ON social_account_groups;
CREATE TRIGGER trg_social_account_groups_updated
  BEFORE UPDATE ON social_account_groups
  FOR EACH ROW EXECUTE FUNCTION update_social_updated_at();

-- ── 4. social_account_group_members (many-to-many) ──────────────────────────

CREATE TABLE IF NOT EXISTS social_account_group_members (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id        UUID NOT NULL REFERENCES social_account_groups(id) ON DELETE CASCADE,
  account_id      UUID NOT NULL REFERENCES social_accounts(id) ON DELETE CASCADE,
  sort_order      INT DEFAULT 0,
  added_at        TIMESTAMPTZ DEFAULT now(),
  UNIQUE(group_id, account_id)
);

CREATE INDEX IF NOT EXISTS idx_group_members_group ON social_account_group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_account ON social_account_group_members(account_id);

-- ── 5. social_account_permissions (granular team permissions) ────────────────

CREATE TABLE IF NOT EXISTS social_account_permissions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id      UUID NOT NULL REFERENCES social_accounts(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  can_view        BOOLEAN DEFAULT true,
  can_post        BOOLEAN DEFAULT false,
  can_schedule    BOOLEAN DEFAULT false,
  can_analytics   BOOLEAN DEFAULT false,
  can_manage      BOOLEAN DEFAULT false,
  granted_by      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(account_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_social_permissions_user ON social_account_permissions(user_id, organization_id);
CREATE INDEX IF NOT EXISTS idx_social_permissions_account ON social_account_permissions(account_id);

DROP TRIGGER IF EXISTS trg_social_account_permissions_updated ON social_account_permissions;
CREATE TRIGGER trg_social_account_permissions_updated
  BEFORE UPDATE ON social_account_permissions
  FOR EACH ROW EXECUTE FUNCTION update_social_updated_at();

-- ── 6. content_queue (per-account/group scheduling slots) ───────────────────

CREATE TABLE IF NOT EXISTS content_queue (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  account_id      UUID REFERENCES social_accounts(id) ON DELETE CASCADE,
  group_id        UUID REFERENCES social_account_groups(id) ON DELETE CASCADE,
  name            TEXT NOT NULL DEFAULT 'Cola principal',
  timezone        TEXT NOT NULL DEFAULT 'America/Bogota',
  schedule_slots  JSONB NOT NULL DEFAULT '[]',
  -- schedule_slots: [{ day: 'monday', times: ['09:00', '12:00', '18:00'] }, ...]
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT queue_target_check CHECK (
    account_id IS NOT NULL OR group_id IS NOT NULL
  )
);

CREATE INDEX IF NOT EXISTS idx_content_queue_org ON content_queue(organization_id);
CREATE INDEX IF NOT EXISTS idx_content_queue_account ON content_queue(account_id) WHERE account_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_content_queue_group ON content_queue(group_id) WHERE group_id IS NOT NULL;

DROP TRIGGER IF EXISTS trg_content_queue_updated ON content_queue;
CREATE TRIGGER trg_content_queue_updated
  BEFORE UPDATE ON content_queue
  FOR EACH ROW EXECUTE FUNCTION update_social_updated_at();

-- ── 7. post_metrics (per-post per-account detailed metrics) ─────────────────

CREATE TABLE IF NOT EXISTS post_metrics (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scheduled_post_id UUID NOT NULL REFERENCES scheduled_posts(id) ON DELETE CASCADE,
  social_account_id UUID NOT NULL REFERENCES social_accounts(id) ON DELETE CASCADE,
  platform_post_id  TEXT,
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
  replies           INT DEFAULT 0,
  retweets          INT DEFAULT 0,
  quotes            INT DEFAULT 0,
  profile_clicks    INT DEFAULT 0,
  link_clicks       INT DEFAULT 0,
  engagement_rate   NUMERIC(6,4) DEFAULT 0,
  platform_data     JSONB DEFAULT '{}',
  fetched_at        TIMESTAMPTZ DEFAULT now(),
  created_at        TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_post_metrics_unique
  ON post_metrics(scheduled_post_id, social_account_id);
CREATE INDEX IF NOT EXISTS idx_post_metrics_post ON post_metrics(scheduled_post_id);
CREATE INDEX IF NOT EXISTS idx_post_metrics_account ON post_metrics(social_account_id, fetched_at DESC);

-- ── 8. Extend social_metrics with v2 fields ─────────────────────────────────

ALTER TABLE social_metrics
  ADD COLUMN IF NOT EXISTS granularity TEXT DEFAULT 'daily',
  ADD COLUMN IF NOT EXISTS audience_demographics JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS best_posting_times JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS stories_count INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reels_count INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS avg_engagement_rate NUMERIC(6,4) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_social_metrics_org
  ON social_metrics(organization_id, recorded_at DESC) WHERE organization_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_social_metrics_granularity
  ON social_metrics(social_account_id, granularity, recorded_at DESC);

-- ── 9. Add organization_id to scheduled_posts if missing context ────────────

-- (already exists from v1, but ensure index for org-filtered queries)
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_org_status
  ON scheduled_posts(organization_id, status, scheduled_at)
  WHERE organization_id IS NOT NULL;

-- ── 10. RLS Policies ────────────────────────────────────────────────────────

ALTER TABLE social_account_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_account_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_account_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_metrics ENABLE ROW LEVEL SECURITY;

-- social_account_groups: org members can view, admin/team_leader can manage
CREATE POLICY sag_select ON social_account_groups FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM organization_members om
    WHERE om.organization_id = social_account_groups.organization_id
      AND om.user_id = auth.uid()
  )
);

CREATE POLICY sag_insert ON social_account_groups FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM organization_members om
    WHERE om.organization_id = social_account_groups.organization_id
      AND om.user_id = auth.uid()
      AND om.role IN ('admin', 'team_leader', 'strategist')
  )
);

CREATE POLICY sag_update ON social_account_groups FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM organization_members om
    WHERE om.organization_id = social_account_groups.organization_id
      AND om.user_id = auth.uid()
      AND om.role IN ('admin', 'team_leader', 'strategist')
  )
);

CREATE POLICY sag_delete ON social_account_groups FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM organization_members om
    WHERE om.organization_id = social_account_groups.organization_id
      AND om.user_id = auth.uid()
      AND om.role IN ('admin', 'team_leader')
  )
);

-- social_account_group_members: org members can view, managers can modify
CREATE POLICY sagm_select ON social_account_group_members FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM social_account_groups g
    JOIN organization_members om ON om.organization_id = g.organization_id
    WHERE g.id = social_account_group_members.group_id
      AND om.user_id = auth.uid()
  )
);

CREATE POLICY sagm_insert ON social_account_group_members FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM social_account_groups g
    JOIN organization_members om ON om.organization_id = g.organization_id
    WHERE g.id = social_account_group_members.group_id
      AND om.user_id = auth.uid()
      AND om.role IN ('admin', 'team_leader', 'strategist')
  )
);

CREATE POLICY sagm_delete ON social_account_group_members FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM social_account_groups g
    JOIN organization_members om ON om.organization_id = g.organization_id
    WHERE g.id = social_account_group_members.group_id
      AND om.user_id = auth.uid()
      AND om.role IN ('admin', 'team_leader', 'strategist')
  )
);

-- social_account_permissions: users see their own, admins manage all
CREATE POLICY sap_select ON social_account_permissions FOR SELECT USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM organization_members om
    WHERE om.organization_id = social_account_permissions.organization_id
      AND om.user_id = auth.uid()
      AND om.role IN ('admin', 'team_leader')
  )
);

CREATE POLICY sap_insert ON social_account_permissions FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM organization_members om
    WHERE om.organization_id = social_account_permissions.organization_id
      AND om.user_id = auth.uid()
      AND om.role IN ('admin', 'team_leader')
  )
);

CREATE POLICY sap_update ON social_account_permissions FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM organization_members om
    WHERE om.organization_id = social_account_permissions.organization_id
      AND om.user_id = auth.uid()
      AND om.role IN ('admin', 'team_leader')
  )
);

CREATE POLICY sap_delete ON social_account_permissions FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM organization_members om
    WHERE om.organization_id = social_account_permissions.organization_id
      AND om.user_id = auth.uid()
      AND om.role IN ('admin', 'team_leader')
  )
);

-- content_queue: org members can view, managers can modify
CREATE POLICY cq_select ON content_queue FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM organization_members om
    WHERE om.organization_id = content_queue.organization_id
      AND om.user_id = auth.uid()
  )
);

CREATE POLICY cq_insert ON content_queue FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM organization_members om
    WHERE om.organization_id = content_queue.organization_id
      AND om.user_id = auth.uid()
      AND om.role IN ('admin', 'team_leader', 'strategist')
  )
);

CREATE POLICY cq_update ON content_queue FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM organization_members om
    WHERE om.organization_id = content_queue.organization_id
      AND om.user_id = auth.uid()
      AND om.role IN ('admin', 'team_leader', 'strategist')
  )
);

CREATE POLICY cq_delete ON content_queue FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM organization_members om
    WHERE om.organization_id = content_queue.organization_id
      AND om.user_id = auth.uid()
      AND om.role IN ('admin', 'team_leader')
  )
);

-- post_metrics: readable by account owners + org members
CREATE POLICY pm_select ON post_metrics FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM social_accounts sa
    WHERE sa.id = post_metrics.social_account_id
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

-- post_metrics: service_role inserts (from edge functions)
CREATE POLICY pm_insert ON post_metrics FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM social_accounts sa
    WHERE sa.id = post_metrics.social_account_id
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

-- ── 11. GRANTs ──────────────────────────────────────────────────────────────

GRANT ALL ON social_account_groups TO authenticated;
GRANT ALL ON social_account_groups TO service_role;
GRANT ALL ON social_account_group_members TO authenticated;
GRANT ALL ON social_account_group_members TO service_role;
GRANT ALL ON social_account_permissions TO authenticated;
GRANT ALL ON social_account_permissions TO service_role;
GRANT ALL ON content_queue TO authenticated;
GRANT ALL ON content_queue TO service_role;
GRANT ALL ON post_metrics TO authenticated;
GRANT ALL ON post_metrics TO service_role;

-- ── 12. Helper RPCs ─────────────────────────────────────────────────────────

-- Get accounts with their groups for an organization
CREATE OR REPLACE FUNCTION get_org_social_accounts(p_org_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_agg(row_to_json(sa))
  INTO result
  FROM (
    SELECT
      sa.*,
      (
        SELECT json_agg(json_build_object(
          'group_id', g.id,
          'group_name', g.name,
          'group_color', g.color
        ))
        FROM social_account_group_members gm
        JOIN social_account_groups g ON g.id = gm.group_id
        WHERE gm.account_id = sa.id
      ) AS groups,
      (
        SELECT json_agg(json_build_object(
          'user_id', p.user_id,
          'can_view', p.can_view,
          'can_post', p.can_post,
          'can_schedule', p.can_schedule,
          'can_analytics', p.can_analytics,
          'can_manage', p.can_manage
        ))
        FROM social_account_permissions p
        WHERE p.account_id = sa.id
      ) AS permissions
    FROM social_accounts sa
    WHERE sa.organization_id = p_org_id
      AND sa.is_active = true
    ORDER BY sa.platform, sa.platform_display_name
  ) sa;

  RETURN COALESCE(result, '[]'::json);
END;
$$;

-- Get next available queue slot for an account
CREATE OR REPLACE FUNCTION get_next_queue_slot(
  p_account_id UUID,
  p_after TIMESTAMPTZ DEFAULT now()
)
RETURNS TIMESTAMPTZ
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_queue RECORD;
  v_slot RECORD;
  v_day_name TEXT;
  v_check_date DATE;
  v_slot_time TIME;
  v_candidate TIMESTAMPTZ;
  v_existing INT;
BEGIN
  -- Get the queue for this account
  SELECT * INTO v_queue
  FROM content_queue
  WHERE account_id = p_account_id AND is_active = true
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- Check next 14 days
  FOR i IN 0..13 LOOP
    v_check_date := (p_after AT TIME ZONE v_queue.timezone)::DATE + i;
    v_day_name := LOWER(to_char(v_check_date, 'fmday'));

    -- Iterate schedule slots for this day
    FOR v_slot IN
      SELECT slot->>'day' AS day, jsonb_array_elements_text(slot->'times') AS time_str
      FROM jsonb_array_elements(v_queue.schedule_slots) AS slot
      WHERE LOWER(slot->>'day') = v_day_name
    LOOP
      v_slot_time := v_slot.time_str::TIME;
      v_candidate := (v_check_date || ' ' || v_slot_time)::TIMESTAMP AT TIME ZONE v_queue.timezone;

      -- Skip if in the past
      IF v_candidate <= p_after THEN
        CONTINUE;
      END IF;

      -- Check if slot is already taken
      SELECT COUNT(*) INTO v_existing
      FROM scheduled_posts
      WHERE scheduled_at = v_candidate
        AND status IN ('scheduled', 'publishing')
        AND target_accounts @> jsonb_build_array(jsonb_build_object('account_id', p_account_id::TEXT));

      IF v_existing = 0 THEN
        RETURN v_candidate;
      END IF;
    END LOOP;
  END LOOP;

  RETURN NULL;
END;
$$;
