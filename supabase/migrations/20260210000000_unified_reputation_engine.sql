-- =============================================================
-- UNIFIED REPUTATION ENGINE
-- Replaces: up_creadores, up_editores, up_creadores_totals, up_editores_totals
-- Consolidates: UP V2 + "El Estudio" + Ambassador scoring
-- New tables: reputation_seasons, unified_reputation_config, role_archetypes,
--   reputation_events, user_reputation_totals, marketplace_reputation,
--   client_trust_scores, ai_arbitration_logs, chronometer_pauses
-- =============================================================

-- ═══════════════════════════════════════════════════
-- 1. REPUTATION SEASONS (must exist before reputation_events FK)
-- ═══════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.reputation_seasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT false,
  rewards_config JSONB DEFAULT '{
    "top_1": {"type": "fund_percentage", "value": 50},
    "top_3": {"type": "fund_percentage", "value": 30},
    "top_10": {"type": "badge", "value": "season_top_10"}
  }',
  compliance_fund_total DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rep_seasons_org ON public.reputation_seasons(organization_id, is_active);

ALTER TABLE public.reputation_seasons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view seasons"
  ON public.reputation_seasons FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = reputation_seasons.organization_id
        AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage seasons"
  ON public.reputation_seasons FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = reputation_seasons.organization_id
        AND om.user_id = auth.uid()
        AND om.role IN ('admin', 'team_leader')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = reputation_seasons.organization_id
        AND om.user_id = auth.uid()
        AND om.role IN ('admin', 'team_leader')
    )
  );


-- ═══════════════════════════════════════════════════
-- 2. UNIFIED REPUTATION CONFIG (per-org settings)
-- ═══════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.unified_reputation_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  config_version INT DEFAULT 1,

  -- Level thresholds (customizable per org)
  levels JSONB DEFAULT '[
    {"name": "Novato", "min_score": 0, "badge_color": "#94a3b8", "perks": []},
    {"name": "Pro", "min_score": 500, "badge_color": "#60a5fa", "perks": ["priority_matching"]},
    {"name": "Elite", "min_score": 2000, "badge_color": "#a78bfa", "perks": ["featured_profile"]},
    {"name": "Master", "min_score": 5000, "badge_color": "#fbbf24", "perks": ["commission_bonus"]},
    {"name": "Legend", "min_score": 15000, "badge_color": "#f472b6", "perks": ["legend_fund_access"]}
  ]',

  -- Global multipliers (hot-adjustable)
  speed_multiplier DECIMAL(3,2) DEFAULT 1.0,
  quality_multiplier DECIMAL(3,2) DEFAULT 1.0,
  volume_multiplier DECIMAL(3,2) DEFAULT 1.0,

  -- Compliance fund
  compliance_fund_enabled BOOLEAN DEFAULT true,
  compliance_fund_penalty_rate DECIMAL(3,2) DEFAULT 0.10,

  -- Season config
  season_duration_days INT DEFAULT 30,
  current_season_start TIMESTAMPTZ,

  -- AI Settings
  ai_auto_adjust BOOLEAN DEFAULT false,
  ai_fraud_detection BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(organization_id)
);

ALTER TABLE public.unified_reputation_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view config"
  ON public.unified_reputation_config FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = unified_reputation_config.organization_id
        AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage config"
  ON public.unified_reputation_config FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = unified_reputation_config.organization_id
        AND om.user_id = auth.uid()
        AND om.role IN ('admin', 'team_leader')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = unified_reputation_config.organization_id
        AND om.user_id = auth.uid()
        AND om.role IN ('admin', 'team_leader')
    )
  );


-- ═══════════════════════════════════════════════════
-- 3. ROLE ARCHETYPES (effort normalization per role)
-- ═══════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.role_archetypes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,

  role_key VARCHAR(50) NOT NULL,
  role_display_name VARCHAR(100) NOT NULL,
  role_category VARCHAR(50) NOT NULL,

  archetype VARCHAR(30) NOT NULL CHECK (archetype IN (
    'high_volume',
    'high_effort',
    'balanced',
    'trust_based'
  )),

  base_weight DECIMAL(5,2) DEFAULT 1.0,
  complexity_multiplier DECIMAL(3,2) DEFAULT 1.0,

  metrics_config JSONB DEFAULT '{
    "tracks_speed": true,
    "tracks_quality": true,
    "tracks_volume": true,
    "tracks_kpi": false,
    "tracks_trust": false
  }',

  point_actions JSONB DEFAULT '{
    "task_completed": 50,
    "early_delivery_bonus": 20,
    "on_time_delivery": 0,
    "late_delivery_penalty": -40,
    "revision_penalty": -10,
    "clean_approval_bonus": 10,
    "recovery_bonus": 10,
    "streak_weekly": 100,
    "streak_monthly": 500
  }',

  expected_monthly_volume INT DEFAULT 10,
  volume_normalization_cap INT DEFAULT 50,

  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Partial unique indexes: NULL org = global default, non-NULL = org override
CREATE UNIQUE INDEX IF NOT EXISTS idx_role_arch_global
  ON public.role_archetypes (role_key) WHERE organization_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_role_arch_org
  ON public.role_archetypes (organization_id, role_key) WHERE organization_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_role_arch_key ON public.role_archetypes (role_key);
CREATE INDEX IF NOT EXISTS idx_role_arch_org_id ON public.role_archetypes (organization_id);

ALTER TABLE public.role_archetypes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read global archetypes"
  ON public.role_archetypes FOR SELECT USING (organization_id IS NULL);

CREATE POLICY "Org members can read org archetypes"
  ON public.role_archetypes FOR SELECT
  USING (
    organization_id IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = role_archetypes.organization_id
        AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage org archetypes"
  ON public.role_archetypes FOR ALL
  USING (
    organization_id IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = role_archetypes.organization_id
        AND om.user_id = auth.uid()
        AND om.role IN ('admin', 'team_leader')
    )
  )
  WITH CHECK (
    organization_id IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = role_archetypes.organization_id
        AND om.user_id = auth.uid()
        AND om.role IN ('admin', 'team_leader')
    )
  );


-- ═══════════════════════════════════════════════════
-- 4. REPUTATION EVENTS (universal event log)
-- ═══════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.reputation_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role_key VARCHAR(50) NOT NULL,

  -- Polymorphic reference
  reference_type VARCHAR(30) NOT NULL,
  reference_id UUID NOT NULL,

  -- Event details
  event_type VARCHAR(50) NOT NULL,
  event_subtype VARCHAR(50),

  -- Points
  base_points INT NOT NULL,
  multiplier DECIMAL(3,2) DEFAULT 1.0,
  final_points INT GENERATED ALWAYS AS ((base_points * multiplier)::INT) STORED,

  -- Metadata
  calculation_breakdown JSONB,
  ai_decision_id UUID,

  -- Season
  season_id UUID REFERENCES public.reputation_seasons(id) ON DELETE SET NULL,

  -- Timestamps
  event_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT now(),

  -- Dedup
  UNIQUE(organization_id, user_id, reference_type, reference_id, event_type)
);

CREATE INDEX IF NOT EXISTS idx_rep_events_org_user ON public.reputation_events(organization_id, user_id);
CREATE INDEX IF NOT EXISTS idx_rep_events_date ON public.reputation_events(event_date);
CREATE INDEX IF NOT EXISTS idx_rep_events_season ON public.reputation_events(season_id);
CREATE INDEX IF NOT EXISTS idx_rep_events_ref ON public.reputation_events(reference_type, reference_id);

ALTER TABLE public.reputation_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view events"
  ON public.reputation_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = reputation_events.organization_id
        AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "Org members can insert events"
  ON public.reputation_events FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = reputation_events.organization_id
        AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "System can manage events"
  ON public.reputation_events FOR ALL
  USING (true)
  WITH CHECK (true);


-- ═══════════════════════════════════════════════════
-- 5. USER REPUTATION TOTALS (aggregates per user+org+role)
-- ═══════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.user_reputation_totals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role_key VARCHAR(50) NOT NULL,

  -- Lifetime
  lifetime_points INT DEFAULT 0,
  lifetime_tasks INT DEFAULT 0,

  -- Current season
  season_points INT DEFAULT 0,
  season_tasks INT DEFAULT 0,

  -- Rolling 30d
  rolling_30d_points INT DEFAULT 0,
  rolling_30d_tasks INT DEFAULT 0,
  rolling_30d_average DECIMAL(5,2) DEFAULT 0,

  -- Level
  current_level VARCHAR(50) DEFAULT 'Novato',
  current_level_progress DECIMAL(5,2) DEFAULT 0,

  -- Quality metrics
  on_time_rate DECIMAL(5,4) DEFAULT 0,
  approval_rate DECIMAL(5,4) DEFAULT 0,
  revision_rate DECIMAL(5,4) DEFAULT 0,

  -- Streaks
  current_streak_days INT DEFAULT 0,
  best_streak_days INT DEFAULT 0,
  last_activity_date DATE,

  -- Normalized score (cross-role comparison)
  normalized_score DECIMAL(10,2) DEFAULT 0,

  last_calculated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(organization_id, user_id, role_key)
);

CREATE INDEX IF NOT EXISTS idx_rep_totals_org_points
  ON public.user_reputation_totals(organization_id, lifetime_points DESC);
CREATE INDEX IF NOT EXISTS idx_rep_totals_org_normalized
  ON public.user_reputation_totals(organization_id, normalized_score DESC);
CREATE INDEX IF NOT EXISTS idx_rep_totals_user
  ON public.user_reputation_totals(user_id);

ALTER TABLE public.user_reputation_totals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own totals"
  ON public.user_reputation_totals FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Org members can view org totals"
  ON public.user_reputation_totals FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = user_reputation_totals.organization_id
        AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "System can manage totals"
  ON public.user_reputation_totals FOR ALL
  USING (true)
  WITH CHECK (true);

ALTER TABLE public.user_reputation_totals REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_reputation_totals;


-- ═══════════════════════════════════════════════════
-- 6. MARKETPLACE REPUTATION (public aggregated profile)
-- ═══════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.marketplace_reputation (
  user_id UUID PRIMARY KEY,

  global_score INT DEFAULT 0,
  global_level VARCHAR(50) DEFAULT 'Novato',

  total_projects_completed INT DEFAULT 0,
  avg_rating DECIMAL(3,2) DEFAULT 0,
  on_time_delivery_rate DECIMAL(5,4) DEFAULT 0,

  public_badges JSONB DEFAULT '[]',
  specialties JSONB DEFAULT '[]',

  is_verified BOOLEAN DEFAULT false,
  verification_level INT DEFAULT 0,

  last_synced_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mkt_rep_level ON public.marketplace_reputation(global_level);
CREATE INDEX IF NOT EXISTS idx_mkt_rep_score ON public.marketplace_reputation(global_score DESC);

ALTER TABLE public.marketplace_reputation ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view marketplace reputation"
  ON public.marketplace_reputation FOR SELECT
  USING (true);

CREATE POLICY "Users can view own marketplace reputation"
  ON public.marketplace_reputation FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "System can manage marketplace reputation"
  ON public.marketplace_reputation FOR ALL
  USING (true)
  WITH CHECK (true);


-- ═══════════════════════════════════════════════════
-- 7. CLIENT TRUST SCORES
-- ═══════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.client_trust_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  client_user_id UUID NOT NULL,

  approval_speed_avg_hours DECIMAL(5,2) DEFAULT 0,
  brief_clarity_score DECIMAL(3,2) DEFAULT 0,
  payment_punctuality_rate DECIMAL(5,4) DEFAULT 0,

  trust_level VARCHAR(30) DEFAULT 'Standard',

  rejection_rate DECIMAL(5,4) DEFAULT 0,
  is_flagged_toxic BOOLEAN DEFAULT false,
  toxic_flag_reason TEXT,

  total_projects INT DEFAULT 0,
  total_approved INT DEFAULT 0,
  total_rejected INT DEFAULT 0,

  last_calculated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(organization_id, client_user_id)
);

CREATE INDEX IF NOT EXISTS idx_client_trust_org ON public.client_trust_scores(organization_id);

ALTER TABLE public.client_trust_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view client trust"
  ON public.client_trust_scores FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = client_trust_scores.organization_id
        AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "System can manage client trust"
  ON public.client_trust_scores FOR ALL
  USING (true) WITH CHECK (true);


-- ═══════════════════════════════════════════════════
-- 8. AI ARBITRATION LOGS
-- ═══════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.ai_arbitration_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

  decision_type VARCHAR(50) NOT NULL,
  affected_user_id UUID,
  affected_reference_id UUID,

  input_data JSONB NOT NULL,
  decision JSONB NOT NULL,
  confidence_score DECIMAL(3,2),

  status VARCHAR(30) DEFAULT 'pending',
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_arb_log_org ON public.ai_arbitration_logs(organization_id, created_at DESC);

ALTER TABLE public.ai_arbitration_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view arbiter log"
  ON public.ai_arbitration_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = ai_arbitration_logs.organization_id
        AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "System can manage arbiter log"
  ON public.ai_arbitration_logs FOR ALL
  USING (true) WITH CHECK (true);


-- ═══════════════════════════════════════════════════
-- 9. CHRONOMETER PAUSES (timer management)
-- ═══════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.chronometer_pauses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  content_id UUID NOT NULL,
  role VARCHAR(50) NOT NULL,
  user_id UUID NOT NULL,
  paused_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resumed_at TIMESTAMPTZ,
  pause_reason TEXT NOT NULL,
  pause_source TEXT DEFAULT 'auto',
  paused_hours NUMERIC(8,2) DEFAULT 0,
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_chrono_content ON public.chronometer_pauses(content_id, role);
CREATE INDEX IF NOT EXISTS idx_chrono_active ON public.chronometer_pauses(content_id) WHERE resumed_at IS NULL;

ALTER TABLE public.chronometer_pauses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view chronometer"
  ON public.chronometer_pauses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = chronometer_pauses.organization_id
        AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage chronometer"
  ON public.chronometer_pauses FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = chronometer_pauses.organization_id
        AND om.user_id = auth.uid()
        AND om.role IN ('admin', 'team_leader')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = chronometer_pauses.organization_id
        AND om.user_id = auth.uid()
        AND om.role IN ('admin', 'team_leader')
    )
  );


-- ═══════════════════════════════════════════════════
-- 10. ALTER up_ai_config: arbiter toggles
-- ═══════════════════════════════════════════════════

ALTER TABLE public.up_ai_config
  ADD COLUMN IF NOT EXISTS arbiter_wizard_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS arbiter_judge_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS arbiter_auditor_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS auto_pause_review_hours INTEGER DEFAULT 24,
  ADD COLUMN IF NOT EXISTS client_trust_enabled BOOLEAN DEFAULT false;


-- ═══════════════════════════════════════════════════
-- 11. FUNCTIONS
-- ═══════════════════════════════════════════════════

-- Calculate level from points
CREATE OR REPLACE FUNCTION public.calculate_reputation_level(p_points INT)
RETURNS VARCHAR(50)
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_points >= 15000 THEN 'Legend'
    WHEN p_points >= 5000  THEN 'Master'
    WHEN p_points >= 2000  THEN 'Elite'
    WHEN p_points >= 500   THEN 'Pro'
    ELSE 'Novato'
  END;
$$;

-- Calculate level progress percentage
CREATE OR REPLACE FUNCTION public.calculate_level_progress(p_points INT)
RETURNS DECIMAL(5,2)
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_points >= 15000 THEN 100.0
    WHEN p_points >= 5000  THEN ROUND(((p_points - 5000)::DECIMAL / 10000) * 100, 2)
    WHEN p_points >= 2000  THEN ROUND(((p_points - 2000)::DECIMAL / 3000) * 100, 2)
    WHEN p_points >= 500   THEN ROUND(((p_points - 500)::DECIMAL / 1500) * 100, 2)
    ELSE ROUND((p_points::DECIMAL / 500) * 100, 2)
  END;
$$;

-- Calculate normalized score
CREATE OR REPLACE FUNCTION public.calculate_normalized_score(
  p_tasks INT,
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

-- Trigger: update_reputation_totals
CREATE OR REPLACE FUNCTION public.update_reputation_totals()
RETURNS TRIGGER AS $$
DECLARE
  v_season_id UUID;
  v_base_weight NUMERIC;
  v_complexity NUMERIC;
BEGIN
  -- Find active season
  SELECT id INTO v_season_id
  FROM public.reputation_seasons
  WHERE organization_id = NEW.organization_id
    AND is_active = true
  LIMIT 1;

  -- Resolve role weight
  SELECT ra.base_weight, ra.complexity_multiplier
  INTO v_base_weight, v_complexity
  FROM public.role_archetypes ra
  WHERE ra.role_key = NEW.role_key
    AND ra.is_active = true
    AND (ra.organization_id = NEW.organization_id OR ra.organization_id IS NULL)
  ORDER BY ra.organization_id NULLS LAST
  LIMIT 1;

  v_base_weight := COALESCE(v_base_weight, 1.0);
  v_complexity := COALESCE(v_complexity, 1.0);

  -- Upsert totals
  INSERT INTO public.user_reputation_totals (
    organization_id, user_id, role_key,
    lifetime_points, lifetime_tasks,
    season_points, season_tasks,
    current_level, current_level_progress,
    last_activity_date, last_calculated_at
  )
  VALUES (
    NEW.organization_id, NEW.user_id, NEW.role_key,
    NEW.final_points, 1,
    CASE WHEN NEW.season_id = v_season_id THEN NEW.final_points ELSE 0 END,
    CASE WHEN NEW.season_id = v_season_id THEN 1 ELSE 0 END,
    calculate_reputation_level(NEW.final_points),
    calculate_level_progress(NEW.final_points),
    NEW.event_date, now()
  )
  ON CONFLICT (organization_id, user_id, role_key)
  DO UPDATE SET
    lifetime_points = user_reputation_totals.lifetime_points + NEW.final_points,
    lifetime_tasks = user_reputation_totals.lifetime_tasks + 1,
    season_points = CASE
      WHEN NEW.season_id = v_season_id
      THEN user_reputation_totals.season_points + NEW.final_points
      ELSE user_reputation_totals.season_points
    END,
    season_tasks = CASE
      WHEN NEW.season_id = v_season_id
      THEN user_reputation_totals.season_tasks + 1
      ELSE user_reputation_totals.season_tasks
    END,
    current_level = calculate_reputation_level(
      user_reputation_totals.lifetime_points + NEW.final_points
    ),
    current_level_progress = calculate_level_progress(
      user_reputation_totals.lifetime_points + NEW.final_points
    ),
    on_time_rate = CASE
      WHEN NEW.event_type = 'delivery' AND NEW.event_subtype IN ('early', 'on_time')
      THEN ROUND(
        (COALESCE(user_reputation_totals.on_time_rate, 0) * user_reputation_totals.lifetime_tasks
         + 1.0) / (user_reputation_totals.lifetime_tasks + 1), 4)
      WHEN NEW.event_type = 'delivery' AND NEW.event_subtype = 'late'
      THEN ROUND(
        (COALESCE(user_reputation_totals.on_time_rate, 0) * user_reputation_totals.lifetime_tasks)
        / (user_reputation_totals.lifetime_tasks + 1), 4)
      ELSE user_reputation_totals.on_time_rate
    END,
    normalized_score = calculate_normalized_score(
      user_reputation_totals.lifetime_tasks + 1,
      0,
      v_base_weight,
      v_complexity
    ),
    last_activity_date = NEW.event_date,
    last_calculated_at = now();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

CREATE TRIGGER trg_reputation_totals
AFTER INSERT ON public.reputation_events
FOR EACH ROW
EXECUTE FUNCTION public.update_reputation_totals();


-- Sync marketplace reputation (aggregates across ALL orgs, no org-specific data)
CREATE OR REPLACE FUNCTION public.sync_marketplace_reputation(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
  v_total_points INT;
  v_total_projects INT;
  v_avg_on_time DECIMAL;
  v_avg_rating DECIMAL;
  v_review_count INT;
BEGIN
  SELECT
    COALESCE(SUM(lifetime_points), 0),
    COALESCE(SUM(lifetime_tasks), 0),
    COALESCE(AVG(on_time_rate), 0)
  INTO v_total_points, v_total_projects, v_avg_on_time
  FROM public.user_reputation_totals
  WHERE user_id = p_user_id;

  -- Reviews from marketplace
  SELECT COALESCE(COUNT(*), 0), COALESCE(AVG(rating), 0)
  INTO v_review_count, v_avg_rating
  FROM public.creator_reviews
  WHERE creator_id = p_user_id;

  INSERT INTO public.marketplace_reputation (
    user_id, global_score, global_level,
    total_projects_completed, avg_rating, on_time_delivery_rate,
    last_synced_at
  )
  VALUES (
    p_user_id, v_total_points,
    calculate_reputation_level(v_total_points),
    v_total_projects, COALESCE(v_avg_rating, 0), v_avg_on_time,
    now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    global_score = EXCLUDED.global_score,
    global_level = EXCLUDED.global_level,
    total_projects_completed = EXCLUDED.total_projects_completed,
    avg_rating = EXCLUDED.avg_rating,
    on_time_delivery_rate = EXCLUDED.on_time_delivery_rate,
    last_synced_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';


-- ═══════════════════════════════════════════════════
-- 12. RPCs
-- ═══════════════════════════════════════════════════

-- Org ranking (SECURITY DEFINER bypasses RLS for performance)
CREATE OR REPLACE FUNCTION public.get_org_ranking(
  p_org_id UUID,
  p_role TEXT DEFAULT NULL,
  p_archetype TEXT DEFAULT NULL,
  p_sort_by TEXT DEFAULT 'lifetime',
  p_limit INT DEFAULT 50
)
RETURNS TABLE(
  user_id UUID,
  full_name TEXT,
  avatar_url TEXT,
  role_key VARCHAR,
  lifetime_points INT,
  season_points INT,
  normalized_score DECIMAL,
  current_level VARCHAR,
  current_level_progress DECIMAL,
  on_time_rate DECIMAL,
  lifetime_tasks INT,
  current_streak_days INT,
  archetype VARCHAR,
  base_weight DECIMAL
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path TO 'public'
AS $$
  SELECT
    t.user_id, p.full_name, p.avatar_url, t.role_key,
    t.lifetime_points, t.season_points, t.normalized_score,
    t.current_level, t.current_level_progress, t.on_time_rate,
    t.lifetime_tasks, t.current_streak_days,
    COALESCE(ra.archetype, 'balanced')::VARCHAR AS archetype,
    COALESCE(ra.base_weight, 1.0) AS base_weight
  FROM user_reputation_totals t
  JOIN profiles p ON p.id = t.user_id
  LEFT JOIN LATERAL (
    SELECT ra2.archetype, ra2.base_weight
    FROM role_archetypes ra2
    WHERE ra2.role_key = t.role_key
      AND ra2.is_active = true
      AND (ra2.organization_id = p_org_id OR ra2.organization_id IS NULL)
    ORDER BY ra2.organization_id NULLS LAST
    LIMIT 1
  ) ra ON true
  WHERE t.organization_id = p_org_id
    AND (p_role IS NULL OR t.role_key = p_role)
    AND (p_archetype IS NULL OR COALESCE(ra.archetype, 'balanced') = p_archetype)
  ORDER BY
    CASE p_sort_by
      WHEN 'normalized' THEN t.normalized_score
      WHEN 'season' THEN t.season_points::DECIMAL
      ELSE t.lifetime_points::DECIMAL
    END DESC
  LIMIT p_limit;
$$;

-- User scores in one org
CREATE OR REPLACE FUNCTION public.get_user_reputation(p_user_id UUID, p_org_id UUID)
RETURNS SETOF user_reputation_totals
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path TO 'public'
AS $$
  SELECT * FROM user_reputation_totals
  WHERE user_id = p_user_id AND organization_id = p_org_id;
$$;

-- Public marketplace reputation
CREATE OR REPLACE FUNCTION public.get_public_reputation(p_user_id UUID)
RETURNS SETOF marketplace_reputation
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path TO 'public'
AS $$
  SELECT * FROM marketplace_reputation WHERE user_id = p_user_id;
$$;

-- User event history
CREATE OR REPLACE FUNCTION public.get_user_events(
  p_user_id UUID,
  p_org_id UUID DEFAULT NULL,
  p_role TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 100
)
RETURNS TABLE(
  id UUID,
  organization_id UUID,
  role_key VARCHAR,
  reference_type VARCHAR,
  reference_id UUID,
  event_type VARCHAR,
  event_subtype VARCHAR,
  final_points INT,
  calculation_breakdown JSONB,
  event_date DATE,
  created_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path TO 'public'
AS $$
  SELECT
    e.id, e.organization_id, e.role_key,
    e.reference_type, e.reference_id,
    e.event_type, e.event_subtype,
    e.final_points, e.calculation_breakdown,
    e.event_date, e.created_at
  FROM reputation_events e
  WHERE e.user_id = p_user_id
    AND (p_org_id IS NULL OR e.organization_id = p_org_id)
    AND (p_role IS NULL OR e.role_key = p_role)
  ORDER BY e.created_at DESC
  LIMIT p_limit;
$$;

-- Chronometer: get paused hours
CREATE OR REPLACE FUNCTION public.get_content_paused_hours(
  p_content_id UUID,
  p_role TEXT
)
RETURNS NUMERIC
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(SUM(
    CASE
      WHEN cp.resumed_at IS NOT NULL THEN cp.paused_hours
      ELSE EXTRACT(EPOCH FROM (now() - cp.paused_at)) / 3600.0
    END
  ), 0)::NUMERIC
  FROM chronometer_pauses cp
  WHERE cp.content_id = p_content_id
    AND cp.role = p_role;
$$;

-- Chronometer: pause
CREATE OR REPLACE FUNCTION public.check_and_pause_chronometer(
  p_content_id UUID,
  p_organization_id UUID,
  p_role TEXT DEFAULT NULL,
  p_user_id UUID DEFAULT NULL,
  p_reason TEXT DEFAULT 'client_review_delay'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_creator_id UUID;
  v_editor_id UUID;
BEGIN
  IF EXISTS (
    SELECT 1 FROM chronometer_pauses
    WHERE content_id = p_content_id AND resumed_at IS NULL
  ) THEN
    RETURN;
  END IF;

  IF p_role IS NOT NULL AND p_user_id IS NOT NULL THEN
    INSERT INTO chronometer_pauses (organization_id, content_id, role, user_id, pause_reason)
    VALUES (p_organization_id, p_content_id, p_role, p_user_id, p_reason);
    RETURN;
  END IF;

  SELECT creator_id, editor_id INTO v_creator_id, v_editor_id
  FROM content WHERE id = p_content_id;

  IF v_creator_id IS NOT NULL THEN
    INSERT INTO chronometer_pauses (organization_id, content_id, role, user_id, pause_reason)
    VALUES (p_organization_id, p_content_id, 'creator', v_creator_id, p_reason)
    ON CONFLICT DO NOTHING;
  END IF;

  IF v_editor_id IS NOT NULL THEN
    INSERT INTO chronometer_pauses (organization_id, content_id, role, user_id, pause_reason)
    VALUES (p_organization_id, p_content_id, 'editor', v_editor_id, p_reason)
    ON CONFLICT DO NOTHING;
  END IF;
END;
$$;

-- Chronometer: resume
CREATE OR REPLACE FUNCTION public.resume_chronometer(
  p_content_id UUID,
  p_resume_reason TEXT DEFAULT 'client_action'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE chronometer_pauses
  SET
    resumed_at = now(),
    paused_hours = ROUND(EXTRACT(EPOCH FROM (now() - paused_at)) / 3600.0, 2),
    metadata = metadata || jsonb_build_object('resume_reason', p_resume_reason)
  WHERE content_id = p_content_id
    AND resumed_at IS NULL;
END;
$$;

-- Client trust score refresh
CREATE OR REPLACE FUNCTION public.refresh_client_trust_score(
  p_org_id UUID,
  p_client_user_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_total INT;
  v_approved INT;
  v_rejected INT;
  v_avg_hours NUMERIC;
  v_trust TEXT;
BEGIN
  SELECT COUNT(*) INTO v_total
  FROM content c
  WHERE c.organization_id = p_org_id
    AND (c.creator_id = p_client_user_id OR c.editor_id = p_client_user_id);

  IF v_total = 0 THEN RETURN; END IF;

  SELECT
    COUNT(*) FILTER (WHERE c.status = 'approved'),
    COUNT(*) FILTER (WHERE c.status = 'issue')
  INTO v_approved, v_rejected
  FROM content c
  WHERE c.organization_id = p_org_id
    AND (c.creator_id = p_client_user_id OR c.editor_id = p_client_user_id);

  SELECT COALESCE(AVG(
    EXTRACT(EPOCH FROM (COALESCE(c.approved_at, c.updated_at) - c.delivered_at)) / 3600.0
  ), 0)
  INTO v_avg_hours
  FROM content c
  WHERE c.organization_id = p_org_id
    AND c.delivered_at IS NOT NULL;

  v_trust := CASE
    WHEN v_total < 3 THEN 'Standard'
    WHEN (v_rejected::NUMERIC / GREATEST(v_total, 1)) > 0.6 THEN 'Flagged'
    WHEN (v_rejected::NUMERIC / GREATEST(v_total, 1)) > 0.4 THEN 'Flagged'
    WHEN v_avg_hours > 72 THEN 'Standard'
    WHEN (v_approved::NUMERIC / GREATEST(v_total, 1)) > 0.8 AND v_avg_hours < 24 THEN 'Trusted'
    ELSE 'Standard'
  END;

  INSERT INTO client_trust_scores (
    organization_id, client_user_id, total_projects, total_approved,
    total_rejected, approval_speed_avg_hours, rejection_rate,
    trust_level, last_calculated_at
  )
  VALUES (
    p_org_id, p_client_user_id, v_total, v_approved,
    v_rejected, ROUND(v_avg_hours, 2),
    ROUND((v_rejected::NUMERIC / GREATEST(v_total, 1)) * 100, 4),
    v_trust, now()
  )
  ON CONFLICT (organization_id, client_user_id) DO UPDATE SET
    total_projects = EXCLUDED.total_projects,
    total_approved = EXCLUDED.total_approved,
    total_rejected = EXCLUDED.total_rejected,
    approval_speed_avg_hours = EXCLUDED.approval_speed_avg_hours,
    rejection_rate = EXCLUDED.rejection_rate,
    trust_level = EXCLUDED.trust_level,
    last_calculated_at = now();
END;
$$;

-- Arbiter log RPC
CREATE OR REPLACE FUNCTION public.get_arbiter_log(
  p_org_id UUID,
  p_action_type TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE(
  id UUID,
  decision_type VARCHAR,
  affected_user_id UUID,
  input_data JSONB,
  decision JSONB,
  confidence_score DECIMAL,
  status VARCHAR,
  created_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT al.id, al.decision_type, al.affected_user_id,
         al.input_data, al.decision, al.confidence_score,
         al.status, al.created_at
  FROM ai_arbitration_logs al
  WHERE al.organization_id = p_org_id
    AND (p_action_type IS NULL OR al.decision_type = p_action_type)
  ORDER BY al.created_at DESC
  LIMIT p_limit OFFSET p_offset;
$$;

-- Role weight resolution (org override > global)
CREATE OR REPLACE FUNCTION public.get_role_weight(
  p_role_key TEXT,
  p_organization_id UUID DEFAULT NULL
)
RETURNS TABLE(
  role_key VARCHAR,
  archetype VARCHAR,
  base_weight DECIMAL,
  complexity_multiplier DECIMAL,
  point_actions JSONB,
  expected_monthly_volume INT,
  volume_normalization_cap INT
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path TO 'public'
AS $$
  SELECT ra.role_key, ra.archetype, ra.base_weight,
         ra.complexity_multiplier, ra.point_actions,
         ra.expected_monthly_volume, ra.volume_normalization_cap
  FROM role_archetypes ra
  WHERE ra.role_key = p_role_key
    AND ra.is_active = true
    AND (ra.organization_id = p_organization_id OR ra.organization_id IS NULL)
  ORDER BY ra.organization_id NULLS LAST
  LIMIT 1;
$$;


-- ═══════════════════════════════════════════════════
-- 13. SEED: role_archetypes (43 default roles)
-- ═══════════════════════════════════════════════════

INSERT INTO public.role_archetypes
  (organization_id, role_key, role_display_name, role_category, archetype, base_weight, complexity_multiplier, expected_monthly_volume, volume_normalization_cap, point_actions)
VALUES
  -- ═══ SYSTEM ROLES ═══
  (NULL, 'admin',       'Administrador',          'system',     'balanced',    1.0, 1.0, 60, 100,
   '{"task_completed":50,"early_delivery_bonus":20,"on_time_delivery":0,"late_delivery_penalty":-40,"revision_penalty":-10,"clean_approval_bonus":10,"recovery_bonus":10,"streak_weekly":100,"streak_monthly":500}'),
  (NULL, 'team_leader', 'Líder de Equipo',        'system',     'balanced',    1.0, 1.2, 60, 100,
   '{"task_completed":50,"early_delivery_bonus":20,"on_time_delivery":0,"late_delivery_penalty":-40,"revision_penalty":-10,"clean_approval_bonus":10,"recovery_bonus":10,"streak_weekly":100,"streak_monthly":500}'),
  (NULL, 'strategist',  'Estratega',              'strategy',   'balanced',    2.0, 1.5, 30, 60,
   '{"task_completed":40,"early_delivery_bonus":20,"on_time_delivery":0,"late_delivery_penalty":-15,"revision_penalty":-5,"clean_approval_bonus":10,"recovery_bonus":10,"streak_weekly":100,"streak_monthly":500}'),
  (NULL, 'trafficker',  'Trafficker',             'performance','high_volume', 0.3, 0.8, 200,400,
   '{"task_completed":30,"early_delivery_bonus":10,"on_time_delivery":0,"late_delivery_penalty":-20,"revision_penalty":-5,"clean_approval_bonus":5,"recovery_bonus":5,"streak_weekly":100,"streak_monthly":500}'),
  (NULL, 'creator',     'Creador de Contenido',   'creative',   'balanced',    3.0, 1.0, 20, 50,
   '{"task_completed":50,"early_delivery_bonus":20,"on_time_delivery":0,"late_delivery_penalty":-30,"revision_penalty":-10,"clean_approval_bonus":10,"recovery_bonus":10,"streak_weekly":100,"streak_monthly":500}'),
  (NULL, 'editor',      'Productor Audio-Visual', 'production', 'balanced',    2.4, 1.2, 25, 50,
   '{"task_completed":50,"early_delivery_bonus":20,"on_time_delivery":0,"late_delivery_penalty":-30,"revision_penalty":-10,"clean_approval_bonus":10,"recovery_bonus":10,"streak_weekly":100,"streak_monthly":500}'),
  (NULL, 'client',      'Cliente',                'client',     'trust_based', 1.0, 0.5, 60, 100,
   '{"task_completed":0,"early_delivery_bonus":0,"on_time_delivery":0,"late_delivery_penalty":0,"revision_penalty":0,"clean_approval_bonus":0,"recovery_bonus":0,"streak_weekly":0,"streak_monthly":0}'),

  -- ═══ MARKETPLACE: Content Creation ═══
  (NULL, 'ugc_creator',       'Creador UGC',             'creative',   'balanced',     2.0, 1.0, 30, 60,
   '{"task_completed":50,"early_delivery_bonus":20,"on_time_delivery":0,"late_delivery_penalty":-30,"revision_penalty":-10,"clean_approval_bonus":10,"recovery_bonus":10,"streak_weekly":100,"streak_monthly":500}'),
  (NULL, 'lifestyle_creator', 'Creador Lifestyle',       'creative',   'balanced',     2.0, 1.0, 30, 60,
   '{"task_completed":50,"early_delivery_bonus":20,"on_time_delivery":0,"late_delivery_penalty":-30,"revision_penalty":-10,"clean_approval_bonus":10,"recovery_bonus":10,"streak_weekly":100,"streak_monthly":500}'),
  (NULL, 'micro_influencer',  'Micro-Influencer',        'creative',   'high_volume',  0.2, 0.6,300,500,
   '{"task_completed":30,"early_delivery_bonus":10,"on_time_delivery":0,"late_delivery_penalty":-20,"revision_penalty":-5,"clean_approval_bonus":5,"recovery_bonus":5,"streak_weekly":100,"streak_monthly":500}'),
  (NULL, 'nano_influencer',   'Nano-Influencer',         'creative',   'high_volume',  0.15,0.5,400,600,
   '{"task_completed":30,"early_delivery_bonus":10,"on_time_delivery":0,"late_delivery_penalty":-20,"revision_penalty":-5,"clean_approval_bonus":5,"recovery_bonus":5,"streak_weekly":100,"streak_monthly":500}'),
  (NULL, 'macro_influencer',  'Macro-Influencer',        'creative',   'high_effort', 12.0, 2.0,  5, 15,
   '{"task_completed":100,"early_delivery_bonus":50,"on_time_delivery":0,"late_delivery_penalty":-60,"revision_penalty":-20,"clean_approval_bonus":25,"recovery_bonus":20,"streak_weekly":200,"streak_monthly":1000}'),
  (NULL, 'brand_ambassador',  'Embajador de Marca',      'creative',   'balanced',     3.0, 1.5, 20, 50,
   '{"task_completed":50,"early_delivery_bonus":20,"on_time_delivery":0,"late_delivery_penalty":-30,"revision_penalty":-10,"clean_approval_bonus":10,"recovery_bonus":10,"streak_weekly":100,"streak_monthly":500}'),
  (NULL, 'live_streamer',     'Streamer en Vivo',        'creative',   'balanced',     4.0, 1.2, 15, 40,
   '{"task_completed":60,"early_delivery_bonus":25,"on_time_delivery":0,"late_delivery_penalty":-35,"revision_penalty":-10,"clean_approval_bonus":15,"recovery_bonus":10,"streak_weekly":100,"streak_monthly":500}'),
  (NULL, 'podcast_host',      'Conductor de Podcast',    'creative',   'high_effort', 15.0, 2.0,  4, 12,
   '{"task_completed":100,"early_delivery_bonus":50,"on_time_delivery":0,"late_delivery_penalty":-60,"revision_penalty":-20,"clean_approval_bonus":25,"recovery_bonus":20,"streak_weekly":200,"streak_monthly":1000}'),
  (NULL, 'photographer',      'Fotógrafo Profesional',   'creative',   'balanced',     3.0, 1.3, 20, 50,
   '{"task_completed":50,"early_delivery_bonus":20,"on_time_delivery":0,"late_delivery_penalty":-30,"revision_penalty":-10,"clean_approval_bonus":10,"recovery_bonus":10,"streak_weekly":100,"streak_monthly":500}'),
  (NULL, 'copywriter',        'Copywriter',              'creative',   'high_volume',  0.12,0.7,500,800,
   '{"task_completed":30,"early_delivery_bonus":10,"on_time_delivery":0,"late_delivery_penalty":-20,"revision_penalty":-5,"clean_approval_bonus":5,"recovery_bonus":5,"streak_weekly":100,"streak_monthly":500}'),
  (NULL, 'graphic_designer',  'Diseñador Gráfico',       'creative',   'balanced',     2.0, 1.2, 30, 60,
   '{"task_completed":50,"early_delivery_bonus":20,"on_time_delivery":0,"late_delivery_penalty":-30,"revision_penalty":-10,"clean_approval_bonus":10,"recovery_bonus":10,"streak_weekly":100,"streak_monthly":500}'),
  (NULL, 'voice_artist',      'Locutor / Voz en Off',    'creative',   'balanced',     4.0, 1.3, 15, 40,
   '{"task_completed":60,"early_delivery_bonus":25,"on_time_delivery":0,"late_delivery_penalty":-35,"revision_penalty":-10,"clean_approval_bonus":15,"recovery_bonus":10,"streak_weekly":100,"streak_monthly":500}'),

  -- ═══ MARKETPLACE: Post-Production ═══
  (NULL, 'video_editor',    'Editor de Video',         'production', 'balanced',     2.4, 1.2, 25, 50,
   '{"task_completed":50,"early_delivery_bonus":20,"on_time_delivery":0,"late_delivery_penalty":-30,"revision_penalty":-10,"clean_approval_bonus":10,"recovery_bonus":10,"streak_weekly":100,"streak_monthly":500}'),
  (NULL, 'motion_graphics', 'Motion Graphics',         'production', 'high_effort', 10.0, 2.5,  6, 15,
   '{"task_completed":100,"early_delivery_bonus":50,"on_time_delivery":0,"late_delivery_penalty":-60,"revision_penalty":-20,"clean_approval_bonus":25,"recovery_bonus":20,"streak_weekly":200,"streak_monthly":1000}'),
  (NULL, 'sound_designer',  'Diseñador de Sonido',     'production', 'balanced',     4.0, 1.5, 15, 40,
   '{"task_completed":60,"early_delivery_bonus":25,"on_time_delivery":0,"late_delivery_penalty":-35,"revision_penalty":-10,"clean_approval_bonus":15,"recovery_bonus":10,"streak_weekly":100,"streak_monthly":500}'),
  (NULL, 'colorist',        'Colorista',               'production', 'balanced',     3.0, 1.8, 20, 50,
   '{"task_completed":50,"early_delivery_bonus":20,"on_time_delivery":0,"late_delivery_penalty":-30,"revision_penalty":-10,"clean_approval_bonus":10,"recovery_bonus":10,"streak_weekly":100,"streak_monthly":500}'),
  (NULL, 'director',        'Director Creativo',       'production', 'high_effort', 12.0, 2.5,  5, 12,
   '{"task_completed":100,"early_delivery_bonus":50,"on_time_delivery":0,"late_delivery_penalty":-60,"revision_penalty":-20,"clean_approval_bonus":25,"recovery_bonus":20,"streak_weekly":200,"streak_monthly":1000}'),
  (NULL, 'producer',        'Productor Audiovisual',   'production', 'high_effort', 10.0, 2.0,  6, 15,
   '{"task_completed":100,"early_delivery_bonus":50,"on_time_delivery":0,"late_delivery_penalty":-60,"revision_penalty":-20,"clean_approval_bonus":25,"recovery_bonus":20,"streak_weekly":200,"streak_monthly":1000}'),
  (NULL, 'animator_2d3d',   'Animador 2D/3D',          'production', 'high_effort', 30.0, 3.0,  2, 8,
   '{"task_completed":150,"early_delivery_bonus":75,"on_time_delivery":0,"late_delivery_penalty":-80,"revision_penalty":-30,"clean_approval_bonus":30,"recovery_bonus":25,"streak_weekly":300,"streak_monthly":1500}'),

  -- ═══ MARKETPLACE: Strategy & Marketing ═══
  (NULL, 'content_strategist',   'Estratega de Contenido',     'strategy',   'balanced',     2.0, 1.5, 30, 60,
   '{"task_completed":40,"early_delivery_bonus":20,"on_time_delivery":0,"late_delivery_penalty":-15,"revision_penalty":-5,"clean_approval_bonus":10,"recovery_bonus":10,"streak_weekly":100,"streak_monthly":500}'),
  (NULL, 'social_media_manager', 'Social Media Manager',       'strategy',   'high_volume',  0.2, 0.7,300,500,
   '{"task_completed":30,"early_delivery_bonus":10,"on_time_delivery":0,"late_delivery_penalty":-20,"revision_penalty":-5,"clean_approval_bonus":5,"recovery_bonus":5,"streak_weekly":100,"streak_monthly":500}'),
  (NULL, 'community_manager',    'Community Manager',          'strategy',   'high_volume',  0.12,0.5,500,800,
   '{"task_completed":30,"early_delivery_bonus":10,"on_time_delivery":0,"late_delivery_penalty":-20,"revision_penalty":-5,"clean_approval_bonus":5,"recovery_bonus":5,"streak_weekly":100,"streak_monthly":500}'),
  (NULL, 'digital_strategist',   'Estratega Digital',          'strategy',   'balanced',     3.0, 1.5, 20, 50,
   '{"task_completed":40,"early_delivery_bonus":20,"on_time_delivery":0,"late_delivery_penalty":-15,"revision_penalty":-5,"clean_approval_bonus":10,"recovery_bonus":10,"streak_weekly":100,"streak_monthly":500}'),
  (NULL, 'seo_specialist',       'Especialista SEO/SEM',       'strategy',   'balanced',     2.0, 1.2, 30, 60,
   '{"task_completed":40,"early_delivery_bonus":20,"on_time_delivery":0,"late_delivery_penalty":-15,"revision_penalty":-5,"clean_approval_bonus":10,"recovery_bonus":10,"streak_weekly":100,"streak_monthly":500}'),
  (NULL, 'email_marketer',       'Email Marketer',             'strategy',   'high_volume',  0.15,0.6,400,600,
   '{"task_completed":30,"early_delivery_bonus":10,"on_time_delivery":0,"late_delivery_penalty":-20,"revision_penalty":-5,"clean_approval_bonus":5,"recovery_bonus":5,"streak_weekly":100,"streak_monthly":500}'),
  (NULL, 'growth_hacker',        'Growth Hacker',              'performance','high_volume',  0.12,0.8,500,800,
   '{"task_completed":30,"early_delivery_bonus":10,"on_time_delivery":0,"late_delivery_penalty":-20,"revision_penalty":-5,"clean_approval_bonus":5,"recovery_bonus":5,"streak_weekly":100,"streak_monthly":500}'),
  (NULL, 'crm_specialist',       'Especialista CRM',           'strategy',   'high_volume',  0.2, 0.6,300,500,
   '{"task_completed":30,"early_delivery_bonus":10,"on_time_delivery":0,"late_delivery_penalty":-20,"revision_penalty":-5,"clean_approval_bonus":5,"recovery_bonus":5,"streak_weekly":100,"streak_monthly":500}'),
  (NULL, 'conversion_optimizer', 'Optimizador de Conversión',  'strategy',   'balanced',     2.0, 1.3, 30, 60,
   '{"task_completed":40,"early_delivery_bonus":20,"on_time_delivery":0,"late_delivery_penalty":-15,"revision_penalty":-5,"clean_approval_bonus":10,"recovery_bonus":10,"streak_weekly":100,"streak_monthly":500}'),

  -- ═══ MARKETPLACE: Technology ═══
  (NULL, 'web_developer', 'Desarrollador Web',       'technology', 'high_effort', 12.0, 2.5,  5, 12,
   '{"task_completed":100,"early_delivery_bonus":50,"on_time_delivery":0,"late_delivery_penalty":-60,"revision_penalty":-20,"clean_approval_bonus":25,"recovery_bonus":20,"streak_weekly":200,"streak_monthly":1000}'),
  (NULL, 'app_developer', 'Desarrollador de Apps',   'technology', 'high_effort', 20.0, 3.0,  3, 8,
   '{"task_completed":150,"early_delivery_bonus":75,"on_time_delivery":0,"late_delivery_penalty":-80,"revision_penalty":-30,"clean_approval_bonus":30,"recovery_bonus":25,"streak_weekly":300,"streak_monthly":1500}'),
  (NULL, 'ai_specialist', 'Especialista en IA',      'technology', 'high_effort', 15.0, 3.0,  4, 10,
   '{"task_completed":100,"early_delivery_bonus":50,"on_time_delivery":0,"late_delivery_penalty":-60,"revision_penalty":-20,"clean_approval_bonus":25,"recovery_bonus":20,"streak_weekly":200,"streak_monthly":1000}'),

  -- ═══ MARKETPLACE: Education ═══
  (NULL, 'online_instructor',    'Instructor Online',        'education', 'high_effort', 10.0, 2.0, 6, 15,
   '{"task_completed":100,"early_delivery_bonus":50,"on_time_delivery":0,"late_delivery_penalty":-60,"revision_penalty":-20,"clean_approval_bonus":25,"recovery_bonus":20,"streak_weekly":200,"streak_monthly":1000}'),
  (NULL, 'workshop_facilitator', 'Facilitador de Talleres',  'education', 'high_effort', 12.0, 2.0, 5, 12,
   '{"task_completed":100,"early_delivery_bonus":50,"on_time_delivery":0,"late_delivery_penalty":-60,"revision_penalty":-20,"clean_approval_bonus":25,"recovery_bonus":20,"streak_weekly":200,"streak_monthly":1000}'),

  -- ═══ MARKETPLACE: Client ═══
  (NULL, 'brand_manager',      'Gerente de Marca',        'client', 'trust_based', 2.0, 1.0, 30, 60,
   '{"task_completed":0,"early_delivery_bonus":0,"on_time_delivery":0,"late_delivery_penalty":0,"revision_penalty":0,"clean_approval_bonus":0,"recovery_bonus":0,"streak_weekly":0,"streak_monthly":0}'),
  (NULL, 'marketing_director', 'Director de Marketing',   'client', 'trust_based', 3.0, 1.5, 20, 50,
   '{"task_completed":0,"early_delivery_bonus":0,"on_time_delivery":0,"late_delivery_penalty":0,"revision_penalty":0,"clean_approval_bonus":0,"recovery_bonus":0,"streak_weekly":0,"streak_monthly":0}'),

  -- ═══ WILDCARD FALLBACK ═══
  (NULL, '*', 'Rol no configurado', 'system', 'balanced', 1.0, 1.0, 60, 100,
   '{"task_completed":50,"early_delivery_bonus":20,"on_time_delivery":0,"late_delivery_penalty":-40,"revision_penalty":-10,"clean_approval_bonus":10,"recovery_bonus":10,"streak_weekly":100,"streak_monthly":500}')
ON CONFLICT DO NOTHING;


-- ═══════════════════════════════════════════════════
-- 14. LEGACY DATA MIGRATION
-- ═══════════════════════════════════════════════════

-- Disable trigger during backfill
ALTER TABLE public.reputation_events DISABLE TRIGGER trg_reputation_totals;

-- Migrate up_seasons → reputation_seasons
INSERT INTO public.reputation_seasons (id, organization_id, name, start_date, end_date, is_active, created_at)
SELECT id, organization_id, name, starts_at::DATE, COALESCE(ends_at::DATE, (starts_at + INTERVAL '30 days')::DATE), is_active, now()
FROM public.up_seasons
ON CONFLICT DO NOTHING;

-- Migrate up_creadores → reputation_events
INSERT INTO public.reputation_events (
  organization_id, user_id, role_key,
  reference_type, reference_id,
  event_type, event_subtype,
  base_points, multiplier,
  calculation_breakdown, event_date, created_at
)
SELECT
  c.organization_id, c.user_id, 'creator',
  'content', c.content_id,
  c.event_type,
  CASE
    WHEN c.event_type = 'entrega' AND c.points >= 70 THEN 'early'
    WHEN c.event_type = 'entrega' AND c.points >= 50 THEN 'on_time'
    WHEN c.event_type = 'entrega' AND c.points < 50  THEN 'late'
    ELSE NULL
  END,
  c.points, 1.0,
  jsonb_build_object('migrated_from', 'up_creadores', 'original_points', c.points, 'days_to_deliver', c.days_to_deliver),
  c.created_at::DATE, c.created_at
FROM public.up_creadores c
WHERE c.points IS NOT NULL
  AND c.content_id IS NOT NULL
  AND EXISTS (SELECT 1 FROM auth.users u WHERE u.id = c.user_id)
ON CONFLICT (organization_id, user_id, reference_type, reference_id, event_type) DO NOTHING;

-- Migrate up_editores → reputation_events
INSERT INTO public.reputation_events (
  organization_id, user_id, role_key,
  reference_type, reference_id,
  event_type, event_subtype,
  base_points, multiplier,
  calculation_breakdown, event_date, created_at
)
SELECT
  ed.organization_id, ed.user_id, 'editor',
  'content', ed.content_id,
  ed.event_type,
  CASE
    WHEN ed.event_type = 'entrega' AND ed.points >= 70 THEN 'early'
    WHEN ed.event_type = 'entrega' AND ed.points >= 50 THEN 'on_time'
    WHEN ed.event_type = 'entrega' AND ed.points < 50  THEN 'late'
    ELSE NULL
  END,
  ed.points, 1.0,
  jsonb_build_object('migrated_from', 'up_editores', 'original_points', ed.points, 'days_to_deliver', ed.days_to_deliver),
  ed.created_at::DATE, ed.created_at
FROM public.up_editores ed
WHERE ed.points IS NOT NULL
  AND ed.content_id IS NOT NULL
  AND EXISTS (SELECT 1 FROM auth.users u WHERE u.id = ed.user_id)
ON CONFLICT (organization_id, user_id, reference_type, reference_id, event_type) DO NOTHING;

-- Migrate up_creadores_totals → user_reputation_totals
INSERT INTO public.user_reputation_totals (
  organization_id, user_id, role_key,
  lifetime_points, lifetime_tasks,
  current_level, on_time_rate, last_calculated_at
)
SELECT
  t.organization_id, t.user_id, 'creator',
  t.total_points, t.total_deliveries,
  calculate_reputation_level(t.total_points),
  CASE WHEN t.total_deliveries > 0
    THEN ROUND(t.on_time_deliveries::NUMERIC / t.total_deliveries, 4)
    ELSE 0 END,
  now()
FROM public.up_creadores_totals t
WHERE EXISTS (SELECT 1 FROM auth.users u WHERE u.id = t.user_id)
ON CONFLICT (organization_id, user_id, role_key) DO NOTHING;

-- Migrate up_editores_totals → user_reputation_totals
INSERT INTO public.user_reputation_totals (
  organization_id, user_id, role_key,
  lifetime_points, lifetime_tasks,
  current_level, on_time_rate, last_calculated_at
)
SELECT
  t.organization_id, t.user_id, 'editor',
  t.total_points, t.total_deliveries,
  calculate_reputation_level(t.total_points),
  CASE WHEN t.total_deliveries > 0
    THEN ROUND(t.on_time_deliveries::NUMERIC / t.total_deliveries, 4)
    ELSE 0 END,
  now()
FROM public.up_editores_totals t
WHERE EXISTS (SELECT 1 FROM auth.users u WHERE u.id = t.user_id)
ON CONFLICT (organization_id, user_id, role_key) DO NOTHING;

-- Re-enable trigger
ALTER TABLE public.reputation_events ENABLE TRIGGER trg_reputation_totals;

-- Backfill marketplace_reputation
INSERT INTO public.marketplace_reputation (user_id, global_score, global_level, total_projects_completed, last_synced_at)
SELECT
  user_id,
  SUM(lifetime_points)::INT,
  calculate_reputation_level(SUM(lifetime_points)::INT),
  SUM(lifetime_tasks)::INT,
  now()
FROM public.user_reputation_totals
GROUP BY user_id
ON CONFLICT (user_id) DO UPDATE SET
  global_score = EXCLUDED.global_score,
  global_level = EXCLUDED.global_level,
  total_projects_completed = EXCLUDED.total_projects_completed,
  last_synced_at = now();

-- Backfill marketplace review data
UPDATE public.marketplace_reputation mr SET
  avg_rating = sub.avg_r::DECIMAL(3,2)
FROM (
  SELECT creator_id, AVG(rating) AS avg_r
  FROM public.creator_reviews
  GROUP BY creator_id
) sub
WHERE mr.user_id = sub.creator_id;


-- ═══════════════════════════════════════════════════
-- 15. DROP LEGACY TABLES
-- ═══════════════════════════════════════════════════

DROP TRIGGER IF EXISTS update_up_creadores_totals_trigger ON public.up_creadores;
DROP TRIGGER IF EXISTS update_up_editores_totals_trigger ON public.up_editores;

DROP FUNCTION IF EXISTS public.update_up_creadores_totals() CASCADE;
DROP FUNCTION IF EXISTS public.update_up_editores_totals() CASCADE;

DROP TABLE IF EXISTS public.up_creadores_totals CASCADE;
DROP TABLE IF EXISTS public.up_editores_totals CASCADE;
DROP TABLE IF EXISTS public.up_creadores CASCADE;
DROP TABLE IF EXISTS public.up_editores CASCADE;


-- ═══════════════════════════════════════════════════
-- 16. GRANTS
-- ═══════════════════════════════════════════════════

GRANT SELECT ON public.reputation_seasons TO authenticated;
GRANT SELECT ON public.unified_reputation_config TO authenticated;
GRANT SELECT ON public.role_archetypes TO authenticated;
GRANT SELECT, INSERT ON public.reputation_events TO authenticated;
GRANT SELECT ON public.user_reputation_totals TO authenticated;
GRANT SELECT ON public.marketplace_reputation TO authenticated;
GRANT SELECT ON public.client_trust_scores TO authenticated;
GRANT SELECT, INSERT ON public.ai_arbitration_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.chronometer_pauses TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.role_archetypes TO authenticated;
GRANT INSERT, UPDATE ON public.unified_reputation_config TO authenticated;
GRANT INSERT, UPDATE ON public.reputation_seasons TO authenticated;
GRANT INSERT, UPDATE ON public.client_trust_scores TO authenticated;

GRANT EXECUTE ON FUNCTION public.calculate_reputation_level(INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_level_progress(INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_normalized_score(INT, NUMERIC, NUMERIC, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sync_marketplace_reputation(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_org_ranking(UUID, TEXT, TEXT, TEXT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_reputation(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_reputation(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_events(UUID, UUID, TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_content_paused_hours(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_and_pause_chronometer(UUID, UUID, TEXT, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.resume_chronometer(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_client_trust_score(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_arbiter_log(UUID, TEXT, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_role_weight(TEXT, UUID) TO authenticated;
