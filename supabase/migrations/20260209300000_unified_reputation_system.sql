-- =============================================================
-- UNIFIED REPUTATION SYSTEM
-- Replaces: up_creadores, up_editores, up_creadores_totals, up_editores_totals
-- Extends: UP Engine 2.0 (up_events, up_rules, emit_up_event)
-- =============================================================

-- 1. NEW TABLE: up_user_scores (role-agnostic, replaces *_totals)
CREATE TABLE IF NOT EXISTS public.up_user_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'other',
  season_id UUID REFERENCES public.up_seasons(id) ON DELETE SET NULL,

  -- Aggregated metrics
  total_points INTEGER NOT NULL DEFAULT 0,
  current_level TEXT NOT NULL DEFAULT 'bronze',
  total_deliveries INTEGER NOT NULL DEFAULT 0,
  on_time_deliveries INTEGER NOT NULL DEFAULT 0,
  late_deliveries INTEGER NOT NULL DEFAULT 0,
  total_issues INTEGER NOT NULL DEFAULT 0,
  clean_approvals INTEGER NOT NULL DEFAULT 0,
  reassignments INTEGER NOT NULL DEFAULT 0,

  -- Quality metrics
  avg_rating NUMERIC(3,2) DEFAULT 0,
  rating_count INTEGER DEFAULT 0,
  quality_score NUMERIC(5,2) DEFAULT 0,
  reliability_score NUMERIC(5,2) DEFAULT 0,
  velocity_score NUMERIC(5,2) DEFAULT 0,

  -- Timestamps
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Unique constraint: one row per user+org+role+season
-- season_id can be NULL (all-time), so we need a partial approach
CREATE UNIQUE INDEX IF NOT EXISTS idx_up_user_scores_unique_with_season
  ON public.up_user_scores (user_id, organization_id, role, season_id)
  WHERE season_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_up_user_scores_unique_no_season
  ON public.up_user_scores (user_id, organization_id, role)
  WHERE season_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_up_user_scores_org_points
  ON public.up_user_scores (organization_id, total_points DESC);

CREATE INDEX IF NOT EXISTS idx_up_user_scores_user
  ON public.up_user_scores (user_id);

CREATE INDEX IF NOT EXISTS idx_up_user_scores_role
  ON public.up_user_scores (role);

-- RLS
ALTER TABLE public.up_user_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own scores"
  ON public.up_user_scores FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Org members can view org scores"
  ON public.up_user_scores FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = up_user_scores.organization_id
        AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "System can manage scores"
  ON public.up_user_scores FOR ALL
  USING (true)
  WITH CHECK (true);

ALTER TABLE public.up_user_scores REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.up_user_scores;


-- 2. NEW TABLE: reputation_global (public marketplace profile)
CREATE TABLE IF NOT EXISTS public.reputation_global (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Cross-org aggregated (no org-specific data)
  global_points INTEGER NOT NULL DEFAULT 0,
  global_level TEXT NOT NULL DEFAULT 'pro',  -- pro, elite, master, legend

  -- Weighted scores
  avg_quality NUMERIC(5,2) DEFAULT 0,
  avg_reliability NUMERIC(5,2) DEFAULT 0,
  avg_velocity NUMERIC(5,2) DEFAULT 0,
  composite_score NUMERIC(5,2) DEFAULT 0,

  -- Aggregate counts
  total_projects_completed INTEGER DEFAULT 0,
  total_on_time_pct NUMERIC(5,2) DEFAULT 0,
  total_reviews INTEGER DEFAULT 0,
  avg_review_rating NUMERIC(3,2) DEFAULT 0,

  -- Badges
  badges TEXT[] DEFAULT '{}',

  -- Marketplace visibility
  is_visible BOOLEAN DEFAULT true,

  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reputation_global_level
  ON public.reputation_global (global_level);

CREATE INDEX IF NOT EXISTS idx_reputation_global_score
  ON public.reputation_global (composite_score DESC);

-- RLS: public read, system write
ALTER TABLE public.reputation_global ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view public reputation"
  ON public.reputation_global FOR SELECT
  USING (is_visible = true);

CREATE POLICY "Users can view own reputation"
  ON public.reputation_global FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "System can manage reputation"
  ON public.reputation_global FOR ALL
  USING (true)
  WITH CHECK (true);


-- 3. NEW TABLE: reputation_configs (point rules per role/event)
CREATE TABLE IF NOT EXISTS public.reputation_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role TEXT NOT NULL,
  event_key TEXT NOT NULL,
  base_points INTEGER NOT NULL DEFAULT 0,
  day_range_min INTEGER,
  day_range_max INTEGER,
  label TEXT NOT NULL,
  description TEXT,
  is_bonus BOOLEAN DEFAULT false,
  is_penalty BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  UNIQUE(role, event_key)
);

ALTER TABLE public.reputation_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read reputation configs"
  ON public.reputation_configs FOR SELECT
  USING (true);

-- Seed default configs
INSERT INTO public.reputation_configs (role, event_key, base_points, day_range_min, day_range_max, label, is_bonus, is_penalty) VALUES
  -- Creator rules
  ('creator', 'early_delivery',     70,  1, 2, 'Entrega temprana',    true,  false),
  ('creator', 'on_time_delivery',   50,  3, 3, 'Entrega a tiempo',    true,  false),
  ('creator', 'late_delivery',     -30,  4, NULL, 'Entrega tardía',   false, true),
  ('creator', 'issue_penalty',     -10,  NULL, NULL, 'Novedad',       false, true),
  ('creator', 'issue_recovery',     10,  NULL, NULL, 'Recuperación',  true,  false),
  ('creator', 'clean_approval',     10,  NULL, NULL, 'Aprobación limpia', true, false),
  -- Editor rules
  ('editor', 'early_delivery',      70,  1, 1, 'Entrega temprana',    true,  false),
  ('editor', 'on_time_delivery',    50,  2, 2, 'Entrega a tiempo',    true,  false),
  ('editor', 'late_delivery',      -30,  3, NULL, 'Entrega tardía',   false, true),
  ('editor', 'issue_penalty',      -10,  NULL, NULL, 'Novedad',       false, true),
  ('editor', 'issue_recovery',      10,  NULL, NULL, 'Recuperación',  true,  false),
  ('editor', 'clean_approval',      10,  NULL, NULL, 'Aprobación limpia', true, false),
  -- Strategist rules
  ('strategist', 'script_approved',    40,  NULL, NULL, 'Guión aprobado',      true,  false),
  ('strategist', 'campaign_success',   60,  NULL, NULL, 'Campaña exitosa',     true,  false),
  ('strategist', 'revision_requested', -5,  NULL, NULL, 'Revisión solicitada', false, true),
  -- Universal rules
  ('*', 'quest_completed',       25, NULL, NULL, 'Misión completada',   true,  false),
  ('*', 'review_received_5star', 15, NULL, NULL, 'Reseña 5 estrellas',  true,  false),
  ('*', 'referral_activated',    50, NULL, NULL, 'Referido activado',   true,  false)
ON CONFLICT (role, event_key) DO NOTHING;


-- 4. FUNCTION: update_up_user_scores() — trigger on up_events
CREATE OR REPLACE FUNCTION public.update_up_user_scores()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_role TEXT;
  v_total INTEGER;
  v_season UUID;
BEGIN
  -- Determine role from event_data or content assignment
  v_role := NEW.event_data->>'role';

  IF v_role IS NULL AND NEW.content_id IS NOT NULL THEN
    SELECT CASE
      WHEN c.creator_id = NEW.user_id THEN 'creator'
      WHEN c.editor_id = NEW.user_id THEN 'editor'
      ELSE 'other'
    END INTO v_role
    FROM content c WHERE c.id = NEW.content_id;
  END IF;

  v_role := COALESCE(v_role, 'other');

  -- Find active season for this org
  SELECT id INTO v_season
  FROM up_seasons
  WHERE organization_id = NEW.organization_id
    AND is_active = true
  LIMIT 1;

  -- Recalculate total points for this user+org
  SELECT COALESCE(SUM(points_awarded), 0) INTO v_total
  FROM up_events
  WHERE user_id = NEW.user_id
    AND organization_id = NEW.organization_id;

  -- Upsert all-time scores (season_id IS NULL)
  INSERT INTO up_user_scores (
    user_id, organization_id, role, season_id,
    total_points, current_level,
    total_deliveries, on_time_deliveries, late_deliveries,
    total_issues, clean_approvals, updated_at
  )
  VALUES (
    NEW.user_id, NEW.organization_id, v_role, NULL,
    v_total, calculate_up_level(v_total),
    CASE WHEN NEW.event_type_key IN ('early_delivery','on_time_delivery','content_recorded','content_delivered') THEN 1 ELSE 0 END,
    CASE WHEN NEW.event_type_key IN ('early_delivery','on_time_delivery','deadline_met') THEN 1 ELSE 0 END,
    CASE WHEN NEW.event_type_key IN ('late_delivery','deadline_missed') THEN 1 ELSE 0 END,
    CASE WHEN NEW.event_type_key = 'correction_requested' THEN 1 ELSE 0 END,
    CASE WHEN NEW.event_type_key = 'content_approved' AND NOT EXISTS(
      SELECT 1 FROM up_events WHERE content_id = NEW.content_id AND event_type_key = 'correction_requested' AND user_id = NEW.user_id
    ) THEN 1 ELSE 0 END,
    now()
  )
  ON CONFLICT (user_id, organization_id, role) WHERE season_id IS NULL
  DO UPDATE SET
    total_points = v_total,
    current_level = calculate_up_level(v_total),
    total_deliveries = up_user_scores.total_deliveries +
      CASE WHEN NEW.event_type_key IN ('early_delivery','on_time_delivery','content_recorded','content_delivered') THEN 1 ELSE 0 END,
    on_time_deliveries = up_user_scores.on_time_deliveries +
      CASE WHEN NEW.event_type_key IN ('early_delivery','on_time_delivery','deadline_met') THEN 1 ELSE 0 END,
    late_deliveries = up_user_scores.late_deliveries +
      CASE WHEN NEW.event_type_key IN ('late_delivery','deadline_missed') THEN 1 ELSE 0 END,
    total_issues = up_user_scores.total_issues +
      CASE WHEN NEW.event_type_key = 'correction_requested' THEN 1 ELSE 0 END,
    clean_approvals = up_user_scores.clean_approvals +
      CASE WHEN NEW.event_type_key = 'content_approved' AND NOT EXISTS(
        SELECT 1 FROM up_events WHERE content_id = NEW.content_id AND event_type_key = 'correction_requested' AND user_id = NEW.user_id
      ) THEN 1 ELSE 0 END,
    updated_at = now();

  RETURN NEW;
END;
$$;

-- Drop old trigger if it exists on up_events, then create new
DROP TRIGGER IF EXISTS trg_update_user_scores ON public.up_events;
CREATE TRIGGER trg_update_user_scores
  AFTER INSERT ON public.up_events
  FOR EACH ROW EXECUTE FUNCTION public.update_up_user_scores();


-- 5. FUNCTION: refresh_reputation_global(user_id)
CREATE OR REPLACE FUNCTION public.refresh_reputation_global(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_pts INTEGER;
  v_quality NUMERIC;
  v_reliability NUMERIC;
  v_velocity NUMERIC;
  v_deliveries INTEGER;
  v_on_time_pct NUMERIC;
  v_level TEXT;
  v_reviews INTEGER;
  v_avg_rating NUMERIC;
BEGIN
  SELECT
    COALESCE(SUM(total_points), 0),
    COALESCE(AVG(NULLIF(quality_score, 0)), 0),
    COALESCE(AVG(NULLIF(reliability_score, 0)), 0),
    COALESCE(AVG(NULLIF(velocity_score, 0)), 0),
    COALESCE(SUM(total_deliveries), 0),
    CASE WHEN SUM(total_deliveries) > 0
      THEN ROUND(SUM(on_time_deliveries)::numeric / SUM(total_deliveries) * 100, 2)
      ELSE 0 END
  INTO v_pts, v_quality, v_reliability, v_velocity, v_deliveries, v_on_time_pct
  FROM up_user_scores
  WHERE user_id = p_user_id AND season_id IS NULL;

  -- Global levels: pro(0), elite(500), master(2000), legend(5000)
  v_level := CASE
    WHEN v_pts >= 5000 THEN 'legend'
    WHEN v_pts >= 2000 THEN 'master'
    WHEN v_pts >= 500 THEN 'elite'
    ELSE 'pro'
  END;

  -- Reviews from marketplace
  SELECT COALESCE(COUNT(*), 0), COALESCE(AVG(rating), 0)
  INTO v_reviews, v_avg_rating
  FROM creator_reviews
  WHERE creator_id = p_user_id;

  INSERT INTO reputation_global (
    user_id, global_points, global_level,
    avg_quality, avg_reliability, avg_velocity,
    composite_score, total_projects_completed, total_on_time_pct,
    total_reviews, avg_review_rating, updated_at
  )
  VALUES (
    p_user_id, v_pts, v_level,
    v_quality, v_reliability, v_velocity,
    ROUND((v_quality * 0.35 + v_reliability * 0.35 + v_velocity * 0.3), 2),
    v_deliveries, v_on_time_pct,
    v_reviews, v_avg_rating, now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    global_points = EXCLUDED.global_points,
    global_level = EXCLUDED.global_level,
    avg_quality = EXCLUDED.avg_quality,
    avg_reliability = EXCLUDED.avg_reliability,
    avg_velocity = EXCLUDED.avg_velocity,
    composite_score = EXCLUDED.composite_score,
    total_projects_completed = EXCLUDED.total_projects_completed,
    total_on_time_pct = EXCLUDED.total_on_time_pct,
    total_reviews = EXCLUDED.total_reviews,
    avg_review_rating = EXCLUDED.avg_review_rating,
    updated_at = now();
END;
$$;


-- 6. RPCs for Frontend

-- Org ranking (replaces client-side merge)
CREATE OR REPLACE FUNCTION public.get_org_ranking(p_org_id UUID, p_role TEXT DEFAULT NULL)
RETURNS TABLE(
  user_id UUID,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT,
  total_points INTEGER,
  current_level TEXT,
  on_time_deliveries INTEGER,
  late_deliveries INTEGER,
  clean_approvals INTEGER,
  total_issues INTEGER
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path TO 'public'
AS $$
  SELECT
    s.user_id, p.full_name, p.avatar_url, s.role,
    s.total_points, s.current_level, s.on_time_deliveries,
    s.late_deliveries, s.clean_approvals, s.total_issues
  FROM up_user_scores s
  JOIN profiles p ON p.id = s.user_id
  WHERE s.organization_id = p_org_id
    AND (p_role IS NULL OR s.role = p_role)
    AND s.season_id IS NULL
  ORDER BY s.total_points DESC
  LIMIT 100;
$$;

-- User scores in one org
CREATE OR REPLACE FUNCTION public.get_user_scores(p_user_id UUID, p_org_id UUID)
RETURNS SETOF up_user_scores
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path TO 'public'
AS $$
  SELECT * FROM up_user_scores
  WHERE user_id = p_user_id AND organization_id = p_org_id AND season_id IS NULL;
$$;

-- Public reputation (marketplace profile)
CREATE OR REPLACE FUNCTION public.get_public_reputation(p_user_id UUID)
RETURNS SETOF reputation_global
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path TO 'public'
AS $$
  SELECT * FROM reputation_global WHERE user_id = p_user_id AND is_visible = true;
$$;

-- User event history (replaces direct up_creadores/up_editores queries)
CREATE OR REPLACE FUNCTION public.get_user_events(
  p_user_id UUID,
  p_org_id UUID DEFAULT NULL,
  p_role TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 100
)
RETURNS TABLE(
  id UUID,
  organization_id UUID,
  content_id UUID,
  event_type_key TEXT,
  event_data JSONB,
  points_awarded INTEGER,
  role TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path TO 'public'
AS $$
  SELECT
    e.id, e.organization_id, e.content_id, e.event_type_key,
    e.event_data, e.points_awarded,
    COALESCE(e.event_data->>'role', 'other') AS role,
    e.created_at
  FROM up_events e
  WHERE e.user_id = p_user_id
    AND (p_org_id IS NULL OR e.organization_id = p_org_id)
    AND (p_role IS NULL OR COALESCE(e.event_data->>'role', 'other') = p_role)
  ORDER BY e.created_at DESC
  LIMIT p_limit;
$$;


-- 7. BACKFILL: Migrate data from legacy tables to unified tables

-- IMPORTANT: Disable the trigger during backfill to prevent cascading issues
-- with orphaned user_ids (deleted auth.users) and duplicate event processing
ALTER TABLE public.up_events DISABLE TRIGGER trg_update_user_scores;

-- Backfill from up_creadores_totals → up_user_scores (filter orphaned users)
INSERT INTO up_user_scores (
  user_id, organization_id, role, season_id,
  total_points, current_level,
  total_deliveries, on_time_deliveries, late_deliveries,
  total_issues, clean_approvals, reassignments, updated_at
)
SELECT
  t.user_id, t.organization_id, 'creator', NULL,
  t.total_points, t.current_level,
  t.total_deliveries, t.on_time_deliveries, t.late_deliveries,
  t.total_issues, t.clean_approvals, t.reassignments, t.updated_at
FROM up_creadores_totals t
WHERE EXISTS (SELECT 1 FROM auth.users u WHERE u.id = t.user_id)
ON CONFLICT DO NOTHING;

-- Backfill from up_editores_totals → up_user_scores (filter orphaned users)
INSERT INTO up_user_scores (
  user_id, organization_id, role, season_id,
  total_points, current_level,
  total_deliveries, on_time_deliveries, late_deliveries,
  total_issues, clean_approvals, reassignments, updated_at
)
SELECT
  t.user_id, t.organization_id, 'editor', NULL,
  t.total_points, t.current_level,
  t.total_deliveries, t.on_time_deliveries, t.late_deliveries,
  t.total_issues, t.clean_approvals, t.reassignments, t.updated_at
FROM up_editores_totals t
WHERE EXISTS (SELECT 1 FROM auth.users u WHERE u.id = t.user_id)
ON CONFLICT DO NOTHING;

-- Backfill up_creadores events → up_events (preserve history, filter orphans)
INSERT INTO up_events (
  organization_id, user_id, content_id, event_type_key,
  event_data, points_awarded, created_at
)
SELECT
  c.organization_id, c.user_id, c.content_id, c.event_type,
  jsonb_build_object(
    'role', 'creator',
    'days_to_deliver', c.days_to_deliver,
    'description', c.description,
    'is_recovered', c.is_recovered,
    'legacy_source', 'up_creadores'
  ),
  c.points, c.created_at
FROM up_creadores c
WHERE EXISTS (SELECT 1 FROM auth.users u WHERE u.id = c.user_id)
  AND NOT EXISTS (
    SELECT 1 FROM up_events e
    WHERE e.user_id = c.user_id
      AND e.content_id = c.content_id
      AND e.event_type_key = c.event_type
      AND e.event_data->>'legacy_source' = 'up_creadores'
  );

-- Backfill up_editores events → up_events (filter orphans)
INSERT INTO up_events (
  organization_id, user_id, content_id, event_type_key,
  event_data, points_awarded, created_at
)
SELECT
  ed.organization_id, ed.user_id, ed.content_id, ed.event_type,
  jsonb_build_object(
    'role', 'editor',
    'days_to_deliver', ed.days_to_deliver,
    'description', ed.description,
    'is_recovered', ed.is_recovered,
    'legacy_source', 'up_editores'
  ),
  ed.points, ed.created_at
FROM up_editores ed
WHERE EXISTS (SELECT 1 FROM auth.users u WHERE u.id = ed.user_id)
  AND NOT EXISTS (
    SELECT 1 FROM up_events ev
    WHERE ev.user_id = ed.user_id
      AND ev.content_id = ed.content_id
      AND ev.event_type_key = ed.event_type
      AND ev.event_data->>'legacy_source' = 'up_editores'
  );

-- Re-enable the trigger after backfill
ALTER TABLE public.up_events ENABLE TRIGGER trg_update_user_scores;

-- Backfill reputation_global
INSERT INTO reputation_global (user_id, global_points, global_level, total_projects_completed, updated_at)
SELECT
  user_id,
  SUM(total_points),
  CASE
    WHEN SUM(total_points) >= 5000 THEN 'legend'
    WHEN SUM(total_points) >= 2000 THEN 'master'
    WHEN SUM(total_points) >= 500 THEN 'elite'
    ELSE 'pro'
  END,
  SUM(total_deliveries),
  now()
FROM up_user_scores
WHERE season_id IS NULL
GROUP BY user_id
ON CONFLICT (user_id) DO UPDATE SET
  global_points = EXCLUDED.global_points,
  global_level = EXCLUDED.global_level,
  total_projects_completed = EXCLUDED.total_projects_completed,
  updated_at = now();

-- Backfill review data
UPDATE reputation_global rg SET
  total_reviews = sub.cnt,
  avg_review_rating = sub.avg_r
FROM (
  SELECT creator_id, COUNT(*)::integer AS cnt, AVG(rating)::numeric(3,2) AS avg_r
  FROM creator_reviews GROUP BY creator_id
) sub
WHERE rg.user_id = sub.creator_id;


-- 8. DROP LEGACY TABLES (clean break)

-- Remove old triggers
DROP TRIGGER IF EXISTS update_up_creadores_totals_trigger ON public.up_creadores;
DROP TRIGGER IF EXISTS update_up_editores_totals_trigger ON public.up_editores;

-- Drop trigger functions
DROP FUNCTION IF EXISTS public.update_up_creadores_totals() CASCADE;
DROP FUNCTION IF EXISTS public.update_up_editores_totals() CASCADE;

-- Drop legacy tables
DROP TABLE IF EXISTS public.up_creadores_totals CASCADE;
DROP TABLE IF EXISTS public.up_editores_totals CASCADE;
DROP TABLE IF EXISTS public.up_creadores CASCADE;
DROP TABLE IF EXISTS public.up_editores CASCADE;


-- 9. GRANT permissions
GRANT SELECT ON public.up_user_scores TO authenticated;
GRANT SELECT ON public.reputation_global TO authenticated;
GRANT SELECT ON public.reputation_configs TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_org_ranking(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_scores(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_reputation(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_events(UUID, UUID, TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_reputation_global(UUID) TO authenticated;
