-- =============================================================
-- EFFORT ARCHETYPE & ROLE WEIGHT NORMALIZATION
-- Extends: Unified Reputation System (20260209300000)
-- Purpose: Normalize scoring across 43 roles so all archetypes
--          compete fairly on the same leaderboard.
-- Formula: normalized_score = (tasks * base_weight) + (quality * complexity_multiplier)
-- =============================================================

-- 1. ENUM: effort_archetype
DO $$ BEGIN
  CREATE TYPE effort_archetype AS ENUM ('high_volume', 'medium_volume', 'low_volume_high_complexity');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- 2. TABLE: role_weight_config
CREATE TABLE IF NOT EXISTS public.role_weight_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  role_key TEXT NOT NULL,
  label TEXT NOT NULL,
  archetype effort_archetype NOT NULL DEFAULT 'medium_volume',
  base_weight NUMERIC(8,4) NOT NULL DEFAULT 1.0,
  complexity_multiplier NUMERIC(6,3) NOT NULL DEFAULT 1.0,
  expected_monthly_tasks INTEGER DEFAULT 10,
  is_marketplace_role BOOLEAN DEFAULT false,
  category TEXT,
  is_active BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Partial unique indexes (NULL org = global default)
CREATE UNIQUE INDEX IF NOT EXISTS idx_rwc_unique_global
  ON public.role_weight_config (role_key) WHERE organization_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_rwc_unique_org
  ON public.role_weight_config (organization_id, role_key) WHERE organization_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_rwc_role ON public.role_weight_config (role_key);
CREATE INDEX IF NOT EXISTS idx_rwc_org ON public.role_weight_config (organization_id);

-- RLS
ALTER TABLE public.role_weight_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read global role weights"
  ON public.role_weight_config FOR SELECT
  USING (organization_id IS NULL);

CREATE POLICY "Org members can read org role weights"
  ON public.role_weight_config FOR SELECT
  USING (
    organization_id IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = role_weight_config.organization_id
        AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "System can manage role weights"
  ON public.role_weight_config FOR ALL
  USING (true)
  WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.role_weight_config TO authenticated;


-- 3. ALTER EXISTING TABLES
ALTER TABLE public.up_user_scores
  ADD COLUMN IF NOT EXISTS normalized_score NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS role_metrics JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS marketplace_role TEXT;

ALTER TABLE public.reputation_global
  ADD COLUMN IF NOT EXISTS normalized_composite NUMERIC(10,2) DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_up_user_scores_org_normalized
  ON public.up_user_scores (organization_id, normalized_score DESC);


-- 4. FUNCTION: calculate_normalized_score (pure math)
CREATE OR REPLACE FUNCTION public.calculate_normalized_score(
  p_tasks INTEGER,
  p_quality NUMERIC,
  p_base_weight NUMERIC,
  p_complexity_multiplier NUMERIC
)
RETURNS NUMERIC
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT ROUND(
    (COALESCE(p_tasks, 0) * COALESCE(p_base_weight, 1.0))
    + (COALESCE(p_quality, 0) * COALESCE(p_complexity_multiplier, 1.0)),
    2
  );
$$;


-- 5. FUNCTION: get_role_weight (resolution chain)
CREATE OR REPLACE FUNCTION public.get_role_weight(
  p_user_id UUID,
  p_organization_id UUID,
  p_system_role TEXT
)
RETURNS TABLE(
  role_key TEXT,
  archetype effort_archetype,
  base_weight NUMERIC,
  complexity_multiplier NUMERIC,
  source TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path TO 'public'
AS $$
DECLARE
  v_marketplace_roles TEXT[];
  v_primary TEXT;
  v_result RECORD;
BEGIN
  -- 1. Resolve marketplace specialization
  SELECT cp.marketplace_roles INTO v_marketplace_roles
  FROM creator_profiles cp
  WHERE cp.user_id = p_user_id
  LIMIT 1;

  IF v_marketplace_roles IS NOT NULL AND array_length(v_marketplace_roles, 1) > 0 THEN
    v_primary := v_marketplace_roles[1];

    SELECT rwc.role_key, rwc.archetype, rwc.base_weight, rwc.complexity_multiplier,
           'marketplace'::TEXT AS source
    INTO v_result
    FROM role_weight_config rwc
    WHERE rwc.role_key = v_primary
      AND rwc.is_active = true
      AND (rwc.organization_id = p_organization_id OR rwc.organization_id IS NULL)
    ORDER BY rwc.organization_id NULLS LAST
    LIMIT 1;

    IF FOUND THEN
      RETURN QUERY SELECT v_result.role_key, v_result.archetype,
                          v_result.base_weight, v_result.complexity_multiplier, v_result.source;
      RETURN;
    END IF;
  END IF;

  -- 2. System role
  SELECT rwc.role_key, rwc.archetype, rwc.base_weight, rwc.complexity_multiplier,
         'system'::TEXT AS source
  INTO v_result
  FROM role_weight_config rwc
  WHERE rwc.role_key = p_system_role
    AND rwc.is_active = true
    AND (rwc.organization_id = p_organization_id OR rwc.organization_id IS NULL)
  ORDER BY rwc.organization_id NULLS LAST
  LIMIT 1;

  IF FOUND THEN
    RETURN QUERY SELECT v_result.role_key, v_result.archetype,
                        v_result.base_weight, v_result.complexity_multiplier, v_result.source;
    RETURN;
  END IF;

  -- 3. Wildcard
  SELECT rwc.role_key, rwc.archetype, rwc.base_weight, rwc.complexity_multiplier,
         'wildcard'::TEXT AS source
  INTO v_result
  FROM role_weight_config rwc
  WHERE rwc.role_key = '*'
    AND rwc.is_active = true
    AND (rwc.organization_id = p_organization_id OR rwc.organization_id IS NULL)
  ORDER BY rwc.organization_id NULLS LAST
  LIMIT 1;

  IF FOUND THEN
    RETURN QUERY SELECT v_result.role_key, v_result.archetype,
                        v_result.base_weight, v_result.complexity_multiplier, v_result.source;
    RETURN;
  END IF;

  -- 4. Absolute fallback
  RETURN QUERY SELECT p_system_role, 'medium_volume'::effort_archetype,
                      1.0::NUMERIC, 1.0::NUMERIC, 'default'::TEXT;
END;
$$;


-- 6. UPDATE TRIGGER: update_up_user_scores() — add normalized scoring
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
  v_rw RECORD;
  v_deliveries INTEGER;
  v_quality NUMERIC;
  v_norm_score NUMERIC;
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

  -- Find active season
  SELECT id INTO v_season
  FROM up_seasons
  WHERE organization_id = NEW.organization_id
    AND is_active = true
  LIMIT 1;

  -- Recalculate total points
  SELECT COALESCE(SUM(points_awarded), 0) INTO v_total
  FROM up_events
  WHERE user_id = NEW.user_id
    AND organization_id = NEW.organization_id;

  -- Upsert all-time scores
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

  -- ═══ NORMALIZED SCORING ═══
  SELECT total_deliveries, quality_score
  INTO v_deliveries, v_quality
  FROM up_user_scores
  WHERE user_id = NEW.user_id
    AND organization_id = NEW.organization_id
    AND role = v_role
    AND season_id IS NULL;

  -- Resolve role weight (hot-swappable)
  SELECT rw.base_weight, rw.complexity_multiplier, rw.role_key
  INTO v_rw
  FROM get_role_weight(NEW.user_id, NEW.organization_id, v_role) rw;

  v_norm_score := calculate_normalized_score(
    COALESCE(v_deliveries, 0),
    COALESCE(v_quality, 0),
    COALESCE(v_rw.base_weight, 1.0),
    COALESCE(v_rw.complexity_multiplier, 1.0)
  );

  UPDATE up_user_scores
  SET normalized_score = v_norm_score,
      marketplace_role = v_rw.role_key
  WHERE user_id = NEW.user_id
    AND organization_id = NEW.organization_id
    AND role = v_role
    AND season_id IS NULL;

  RETURN NEW;
END;
$$;


-- 7. RPC: get_org_ranking_normalized
CREATE OR REPLACE FUNCTION public.get_org_ranking_normalized(
  p_org_id UUID,
  p_role TEXT DEFAULT NULL,
  p_archetype TEXT DEFAULT NULL,
  p_sort_by TEXT DEFAULT 'normalized'
)
RETURNS TABLE(
  user_id UUID,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT,
  marketplace_role TEXT,
  total_points INTEGER,
  normalized_score NUMERIC,
  current_level TEXT,
  on_time_deliveries INTEGER,
  late_deliveries INTEGER,
  clean_approvals INTEGER,
  total_issues INTEGER,
  archetype TEXT,
  base_weight NUMERIC,
  complexity_multiplier NUMERIC
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path TO 'public'
AS $$
  SELECT
    s.user_id, p.full_name, p.avatar_url, s.role,
    s.marketplace_role,
    s.total_points, s.normalized_score, s.current_level,
    s.on_time_deliveries, s.late_deliveries, s.clean_approvals, s.total_issues,
    COALESCE(rwc.archetype::TEXT, 'medium_volume') AS archetype,
    COALESCE(rwc.base_weight, 1.0) AS base_weight,
    COALESCE(rwc.complexity_multiplier, 1.0) AS complexity_multiplier
  FROM up_user_scores s
  JOIN profiles p ON p.id = s.user_id
  LEFT JOIN LATERAL (
    SELECT rwc2.archetype, rwc2.base_weight, rwc2.complexity_multiplier
    FROM role_weight_config rwc2
    WHERE rwc2.role_key = COALESCE(s.marketplace_role, s.role)
      AND rwc2.is_active = true
      AND (rwc2.organization_id = p_org_id OR rwc2.organization_id IS NULL)
    ORDER BY rwc2.organization_id NULLS LAST
    LIMIT 1
  ) rwc ON true
  WHERE s.organization_id = p_org_id
    AND (p_role IS NULL OR s.role = p_role OR s.marketplace_role = p_role)
    AND (p_archetype IS NULL OR COALESCE(rwc.archetype::TEXT, 'medium_volume') = p_archetype)
    AND s.season_id IS NULL
  ORDER BY
    CASE WHEN p_sort_by = 'normalized' THEN s.normalized_score ELSE s.total_points::NUMERIC END DESC
  LIMIT 100;
$$;

GRANT EXECUTE ON FUNCTION public.get_org_ranking_normalized(UUID, TEXT, TEXT, TEXT) TO authenticated;


-- 8. UPDATE refresh_reputation_global to include normalized_composite
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
  v_norm_composite NUMERIC;
BEGIN
  SELECT
    COALESCE(SUM(total_points), 0),
    COALESCE(AVG(NULLIF(quality_score, 0)), 0),
    COALESCE(AVG(NULLIF(reliability_score, 0)), 0),
    COALESCE(AVG(NULLIF(velocity_score, 0)), 0),
    COALESCE(SUM(total_deliveries), 0),
    CASE WHEN SUM(total_deliveries) > 0
      THEN ROUND(SUM(on_time_deliveries)::numeric / SUM(total_deliveries) * 100, 2)
      ELSE 0 END,
    COALESCE(AVG(NULLIF(normalized_score, 0)), 0)
  INTO v_pts, v_quality, v_reliability, v_velocity, v_deliveries, v_on_time_pct, v_norm_composite
  FROM up_user_scores
  WHERE user_id = p_user_id AND season_id IS NULL;

  v_level := CASE
    WHEN v_pts >= 5000 THEN 'legend'
    WHEN v_pts >= 2000 THEN 'master'
    WHEN v_pts >= 500 THEN 'elite'
    ELSE 'pro'
  END;

  SELECT COALESCE(COUNT(*), 0), COALESCE(AVG(rating), 0)
  INTO v_reviews, v_avg_rating
  FROM creator_reviews
  WHERE creator_id = p_user_id;

  INSERT INTO reputation_global (
    user_id, global_points, global_level,
    avg_quality, avg_reliability, avg_velocity,
    composite_score, normalized_composite,
    total_projects_completed, total_on_time_pct,
    total_reviews, avg_review_rating, updated_at
  )
  VALUES (
    p_user_id, v_pts, v_level,
    v_quality, v_reliability, v_velocity,
    ROUND((v_quality * 0.35 + v_reliability * 0.35 + v_velocity * 0.3), 2),
    v_norm_composite,
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
    normalized_composite = EXCLUDED.normalized_composite,
    total_projects_completed = EXCLUDED.total_projects_completed,
    total_on_time_pct = EXCLUDED.total_on_time_pct,
    total_reviews = EXCLUDED.total_reviews,
    avg_review_rating = EXCLUDED.avg_review_rating,
    updated_at = now();
END;
$$;


-- 9. SEED DATA: 43 role weight configs
INSERT INTO public.role_weight_config
  (organization_id, role_key, label, archetype, base_weight, complexity_multiplier, expected_monthly_tasks, is_marketplace_role, category)
VALUES
  -- ══ SYSTEM ROLES ══
  (NULL, 'admin',       'Administrador',          'medium_volume',               1.0,    1.0,   60, false, 'system'),
  (NULL, 'team_leader', 'Líder de Equipo',        'medium_volume',               1.0,    1.2,   60, false, 'system'),
  (NULL, 'strategist',  'Estratega',              'medium_volume',               2.0,    1.5,   30, false, 'system'),
  (NULL, 'trafficker',  'Trafficker',             'high_volume',                 0.3,    0.8,  200, false, 'system'),
  (NULL, 'creator',     'Creador de Contenido',   'medium_volume',               3.0,    1.0,   20, false, 'system'),
  (NULL, 'editor',      'Productor Audio-Visual', 'medium_volume',               2.4,    1.2,   25, false, 'system'),
  (NULL, 'client',      'Cliente',                'medium_volume',               1.0,    0.5,   60, false, 'system'),

  -- ══ MARKETPLACE: Content Creation ══
  (NULL, 'ugc_creator',       'Creador UGC',             'medium_volume',               2.0,  1.0,  30, true, 'content_creation'),
  (NULL, 'lifestyle_creator', 'Creador Lifestyle',       'medium_volume',               2.0,  1.0,  30, true, 'content_creation'),
  (NULL, 'micro_influencer',  'Micro-Influencer',        'high_volume',                 0.2,  0.6, 300, true, 'content_creation'),
  (NULL, 'nano_influencer',   'Nano-Influencer',         'high_volume',                 0.15, 0.5, 400, true, 'content_creation'),
  (NULL, 'macro_influencer',  'Macro-Influencer',        'low_volume_high_complexity',  12.0, 2.0,   5, true, 'content_creation'),
  (NULL, 'brand_ambassador',  'Embajador de Marca',      'medium_volume',               3.0,  1.5,  20, true, 'content_creation'),
  (NULL, 'live_streamer',     'Streamer en Vivo',        'medium_volume',               4.0,  1.2,  15, true, 'content_creation'),
  (NULL, 'podcast_host',      'Conductor de Podcast',    'low_volume_high_complexity',  15.0, 2.0,   4, true, 'content_creation'),
  (NULL, 'photographer',      'Fotógrafo Profesional',   'medium_volume',               3.0,  1.3,  20, true, 'content_creation'),
  (NULL, 'copywriter',        'Copywriter',              'high_volume',                 0.12, 0.7, 500, true, 'content_creation'),
  (NULL, 'graphic_designer',  'Diseñador Gráfico',       'medium_volume',               2.0,  1.2,  30, true, 'content_creation'),
  (NULL, 'voice_artist',      'Locutor / Voz en Off',    'medium_volume',               4.0,  1.3,  15, true, 'content_creation'),

  -- ══ MARKETPLACE: Post-Production ══
  (NULL, 'video_editor',    'Editor de Video',         'medium_volume',               2.4,  1.2,  25, true, 'post_production'),
  (NULL, 'motion_graphics', 'Motion Graphics',         'low_volume_high_complexity',  10.0, 2.5,   6, true, 'post_production'),
  (NULL, 'sound_designer',  'Diseñador de Sonido',     'medium_volume',               4.0,  1.5,  15, true, 'post_production'),
  (NULL, 'colorist',        'Colorista',               'medium_volume',               3.0,  1.8,  20, true, 'post_production'),
  (NULL, 'director',        'Director Creativo',       'low_volume_high_complexity',  12.0, 2.5,   5, true, 'post_production'),
  (NULL, 'producer',        'Productor Audiovisual',   'low_volume_high_complexity',  10.0, 2.0,   6, true, 'post_production'),
  (NULL, 'animator_2d3d',   'Animador 2D/3D',          'low_volume_high_complexity',  30.0, 3.0,   2, true, 'post_production'),

  -- ══ MARKETPLACE: Strategy & Marketing ══
  (NULL, 'content_strategist',   'Estratega de Contenido',     'medium_volume',               2.0,  1.5,  30, true, 'strategy_marketing'),
  (NULL, 'social_media_manager', 'Social Media Manager',       'high_volume',                 0.2,  0.7, 300, true, 'strategy_marketing'),
  (NULL, 'community_manager',    'Community Manager',          'high_volume',                 0.12, 0.5, 500, true, 'strategy_marketing'),
  (NULL, 'digital_strategist',   'Estratega Digital',          'medium_volume',               3.0,  1.5,  20, true, 'strategy_marketing'),
  (NULL, 'seo_specialist',       'Especialista SEO/SEM',       'medium_volume',               2.0,  1.2,  30, true, 'strategy_marketing'),
  (NULL, 'email_marketer',       'Email Marketer',             'high_volume',                 0.15, 0.6, 400, true, 'strategy_marketing'),
  (NULL, 'growth_hacker',        'Growth Hacker',              'high_volume',                 0.12, 0.8, 500, true, 'strategy_marketing'),
  (NULL, 'crm_specialist',       'Especialista CRM',           'high_volume',                 0.2,  0.6, 300, true, 'strategy_marketing'),
  (NULL, 'conversion_optimizer', 'Optimizador de Conversión',  'medium_volume',               2.0,  1.3,  30, true, 'strategy_marketing'),

  -- ══ MARKETPLACE: Technology ══
  (NULL, 'web_developer', 'Desarrollador Web',       'low_volume_high_complexity',  12.0, 2.5,   5, true, 'technology'),
  (NULL, 'app_developer', 'Desarrollador de Apps',   'low_volume_high_complexity',  20.0, 3.0,   3, true, 'technology'),
  (NULL, 'ai_specialist', 'Especialista en IA',      'low_volume_high_complexity',  15.0, 3.0,   4, true, 'technology'),

  -- ══ MARKETPLACE: Education ══
  (NULL, 'online_instructor',    'Instructor Online',        'low_volume_high_complexity',  10.0, 2.0,  6, true, 'education'),
  (NULL, 'workshop_facilitator', 'Facilitador de Talleres',  'low_volume_high_complexity',  12.0, 2.0,  5, true, 'education'),

  -- ══ MARKETPLACE: Client ══
  (NULL, 'brand_manager',      'Gerente de Marca',        'medium_volume',  2.0, 1.0, 30, true, 'client'),
  (NULL, 'marketing_director', 'Director de Marketing',   'medium_volume',  3.0, 1.5, 20, true, 'client'),

  -- ══ WILDCARD FALLBACK ══
  (NULL, '*', 'Rol no configurado', 'medium_volume', 1.0, 1.0, 60, false, 'system')
ON CONFLICT DO NOTHING;


-- 10. BACKFILL: Calculate normalized_score for existing rows
DO $$
DECLARE
  r RECORD;
  v_rw RECORD;
  v_norm NUMERIC;
BEGIN
  FOR r IN
    SELECT id, user_id, organization_id, role, total_deliveries, quality_score
    FROM up_user_scores
    WHERE season_id IS NULL
  LOOP
    SELECT rw.base_weight, rw.complexity_multiplier, rw.role_key
    INTO v_rw
    FROM get_role_weight(r.user_id, r.organization_id, r.role) rw;

    v_norm := calculate_normalized_score(
      COALESCE(r.total_deliveries, 0),
      COALESCE(r.quality_score, 0),
      COALESCE(v_rw.base_weight, 1.0),
      COALESCE(v_rw.complexity_multiplier, 1.0)
    );

    UPDATE up_user_scores
    SET normalized_score = v_norm,
        marketplace_role = v_rw.role_key
    WHERE id = r.id;
  END LOOP;
END $$;
