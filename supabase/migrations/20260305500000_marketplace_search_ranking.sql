-- ============================================================
-- FASE 1: Motor de Búsqueda IA + Ranking tipo Airbnb
-- Migration: 20260305500000_marketplace_search_ranking
-- ============================================================

-- 1.1 Columnas de scoring para el algoritmo tipo Airbnb
ALTER TABLE creator_profiles
  ADD COLUMN IF NOT EXISTS search_score          numeric(10,4) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS quality_score         numeric(5,4)  DEFAULT 0,
  ADD COLUMN IF NOT EXISTS activity_score        numeric(5,4)  DEFAULT 0,
  ADD COLUMN IF NOT EXISTS response_time_hours   integer       DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS profile_completeness  integer       DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_projects        integer       DEFAULT 0,
  ADD COLUMN IF NOT EXISTS acceptance_rate       numeric(5,4)  DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS repeat_client_rate    numeric(5,4)  DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_active_at        timestamptz   DEFAULT now(),
  ADD COLUMN IF NOT EXISTS search_vector         tsvector,
  ADD COLUMN IF NOT EXISTS portfolio_count       integer       DEFAULT 0,
  ADD COLUMN IF NOT EXISTS intro_discount_active boolean       DEFAULT false,
  ADD COLUMN IF NOT EXISTS skills                text[]        DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS niches                text[]        DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS primary_role          text          DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS is_published          boolean       DEFAULT true,
  ADD COLUMN IF NOT EXISTS username              text          DEFAULT NULL;

-- 1.2 Trigger para actualizar search_vector automáticamente
CREATE OR REPLACE FUNCTION update_creator_search_vector()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.search_vector := to_tsvector('spanish',
    coalesce(NEW.display_name, '') || ' ' ||
    coalesce(NEW.bio, '') || ' ' ||
    coalesce(NEW.primary_role, '') || ' ' ||
    coalesce(NEW.location_city, '') || ' ' ||
    coalesce(NEW.location_country, '') || ' ' ||
    coalesce(array_to_string(NEW.skills, ' '), '') || ' ' ||
    coalesce(array_to_string(NEW.content_types, ' '), '') || ' ' ||
    coalesce(array_to_string(NEW.niches, ' '), '') || ' ' ||
    coalesce(array_to_string(NEW.categories, ' '), '') || ' ' ||
    coalesce(array_to_string(NEW.marketplace_roles, ' '), '')
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_creator_search_vector ON creator_profiles;
CREATE TRIGGER trg_creator_search_vector
  BEFORE INSERT OR UPDATE ON creator_profiles
  FOR EACH ROW EXECUTE FUNCTION update_creator_search_vector();

-- 1.3 Índices para rendimiento
CREATE INDEX IF NOT EXISTS idx_creator_profiles_search_vector
  ON creator_profiles USING gin(search_vector);

CREATE INDEX IF NOT EXISTS idx_creator_profiles_search_score
  ON creator_profiles(search_score DESC)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_creator_profiles_active
  ON creator_profiles(last_active_at DESC)
  WHERE is_active = true;

-- 1.4 Tabla de historial de búsquedas
CREATE TABLE IF NOT EXISTS marketplace_search_logs (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  organization_id uuid        REFERENCES organizations(id) ON DELETE CASCADE,
  query_raw       text        NOT NULL,
  query_parsed    jsonb       DEFAULT '{}',
  results_count   integer     DEFAULT 0,
  clicked_profile uuid        REFERENCES creator_profiles(id) ON DELETE SET NULL,
  hired_from_search boolean   DEFAULT false,
  session_id      text,
  created_at      timestamptz DEFAULT now()
);

-- 1.5 Tabla de interacciones para señales de comportamiento
CREATE TABLE IF NOT EXISTS marketplace_interactions (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  creator_id      uuid        NOT NULL REFERENCES creator_profiles(id) ON DELETE CASCADE,
  interaction_type text       NOT NULL CHECK (interaction_type IN (
    'view', 'click', 'favorite', 'unfavorite', 'message', 'hire', 'review'
  )),
  duration_seconds integer    DEFAULT NULL,
  source          text        DEFAULT 'feed',
  metadata        jsonb       DEFAULT '{}',
  created_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_interactions_creator ON marketplace_interactions(creator_id);
CREATE INDEX IF NOT EXISTS idx_interactions_user    ON marketplace_interactions(user_id);

-- Enable RLS
ALTER TABLE marketplace_search_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_interactions ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can insert search logs" ON marketplace_search_logs
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Users can view own search logs" ON marketplace_search_logs
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users can insert interactions" ON marketplace_interactions
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Anon can insert interactions" ON marketplace_interactions
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Users can view own interactions" ON marketplace_interactions
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- 1.6 Función de ranking tipo Airbnb
-- Fórmula: Quality(40%) + Activity(25%) + Completeness(20%) + Boost(15%)
CREATE OR REPLACE FUNCTION compute_creator_search_score(p_creator_id uuid)
RETURNS numeric LANGUAGE plpgsql AS $$
DECLARE
  v_quality      numeric := 0;
  v_activity     numeric := 0;
  v_completeness numeric := 0;
  v_boost        numeric := 0;
  v_score        numeric := 0;
  v_days_ago     integer := 0;
  r              creator_profiles%ROWTYPE;
BEGIN
  SELECT * INTO r FROM creator_profiles WHERE id = p_creator_id;
  IF NOT FOUND THEN RETURN 0; END IF;

  -- CALIDAD (40%): rating, volumen reviews, proyectos, clientes repetidos
  IF r.rating_avg IS NOT NULL AND r.rating_count > 0 THEN
    v_quality := v_quality + (r.rating_avg / 5.0) * 0.50;
    v_quality := v_quality + LEAST(ln(r.rating_count + 1) / 10.0, 0.20) * 0.20;
  END IF;
  IF COALESCE(r.total_projects, 0) > 0 THEN
    v_quality := v_quality + LEAST(ln(r.total_projects + 1) / 8.0, 0.20) * 0.15;
  END IF;
  IF r.repeat_client_rate IS NOT NULL THEN
    v_quality := v_quality + r.repeat_client_rate * 0.15;
  END IF;

  -- ACTIVIDAD (25%): recencia + tiempo de respuesta
  IF r.last_active_at IS NOT NULL THEN
    v_days_ago := EXTRACT(EPOCH FROM (now() - r.last_active_at)) / 86400;
    IF    v_days_ago <= 1  THEN v_activity := 1.0;
    ELSIF v_days_ago <= 7  THEN v_activity := 0.85;
    ELSIF v_days_ago <= 14 THEN v_activity := 0.70;
    ELSIF v_days_ago <= 30 THEN v_activity := 0.50;
    ELSIF v_days_ago <= 60 THEN v_activity := 0.30;
    ELSE                        v_activity := 0.10;
    END IF;
  END IF;
  IF r.response_time_hours IS NOT NULL THEN
    IF    r.response_time_hours <= 2  THEN v_activity := v_activity + 0.15;
    ELSIF r.response_time_hours <= 12 THEN v_activity := v_activity + 0.08;
    ELSIF r.response_time_hours <= 24 THEN v_activity := v_activity + 0.03;
    END IF;
  END IF;
  v_activity := LEAST(v_activity, 1.0);

  -- COMPLETITUD (20%)
  v_completeness := COALESCE(r.profile_completeness, 0) / 100.0;

  -- BOOSTS (15%)
  IF r.intro_discount_active = true             THEN v_boost := v_boost + 0.05; END IF;
  IF COALESCE(r.portfolio_count, 0) > 0         THEN v_boost := v_boost + LEAST(r.portfolio_count * 0.01, 0.10); END IF;
  IF r.is_verified = true                       THEN v_boost := v_boost + 0.08; END IF;
  IF r.avatar_url IS NULL                       THEN v_boost := v_boost - 0.10; END IF;
  IF r.bio IS NULL OR length(r.bio) < 50        THEN v_boost := v_boost - 0.05; END IF;

  v_score := (v_quality * 0.40)
           + (v_activity * 0.25)
           + (v_completeness * 0.20)
           + (LEAST(GREATEST(v_boost, -0.20), 0.20) * 0.15);

  UPDATE creator_profiles SET
    search_score   = ROUND(v_score::numeric, 4),
    quality_score  = ROUND(LEAST(v_quality, 1.0)::numeric, 4),
    activity_score = ROUND(LEAST(v_activity, 1.0)::numeric, 4)
  WHERE id = p_creator_id;

  RETURN ROUND(v_score::numeric, 4);
END;
$$;

-- 1.7 RPC principal de búsqueda con ranking
CREATE OR REPLACE FUNCTION search_marketplace_creators(
  p_query              text    DEFAULT '',
  p_roles              text[]  DEFAULT NULL,
  p_location_country   text    DEFAULT NULL,
  p_location_city      text    DEFAULT NULL,
  p_niches             text[]  DEFAULT NULL,
  p_min_rating         numeric DEFAULT NULL,
  p_max_price          numeric DEFAULT NULL,
  p_accepts_exchange   boolean DEFAULT NULL,
  p_is_available       boolean DEFAULT NULL,
  p_limit              integer DEFAULT 20,
  p_offset             integer DEFAULT 0
)
RETURNS TABLE (
  id                  uuid,
  user_id             uuid,
  display_name        text,
  username            text,
  slug                text,
  avatar_url          text,
  bio                 text,
  primary_role        text,
  location_city       text,
  location_country    text,
  rating_avg          numeric,
  rating_count        integer,
  total_projects      integer,
  response_time_hours integer,
  base_price          numeric,
  currency            text,
  accepts_exchange    boolean,
  is_verified         boolean,
  portfolio_count     integer,
  search_score        numeric,
  quality_score       numeric,
  activity_score      numeric,
  text_rank           real,
  final_rank          numeric,
  organization_id     uuid,
  organization_name   text,
  organization_logo   text,
  marketplace_roles   text[],
  categories          text[],
  content_types       text[],
  languages           text[],
  level               text
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_tsquery tsquery;
BEGIN
  IF p_query IS NOT NULL AND length(trim(p_query)) > 0 THEN
    v_tsquery := websearch_to_tsquery('spanish', p_query);
  END IF;

  RETURN QUERY
  SELECT
    cp.id,
    cp.user_id,
    cp.display_name,
    cp.username,
    cp.slug,
    cp.avatar_url,
    cp.bio,
    cp.primary_role,
    cp.location_city,
    cp.location_country,
    cp.rating_avg,
    cp.rating_count,
    cp.total_projects,
    cp.response_time_hours,
    cp.base_price,
    cp.currency,
    cp.accepts_product_exchange AS accepts_exchange,
    cp.is_verified,
    cp.portfolio_count,
    cp.search_score,
    cp.quality_score,
    cp.activity_score,
    CASE
      WHEN v_tsquery IS NOT NULL THEN ts_rank_cd(cp.search_vector, v_tsquery, 32)
      ELSE 0.0
    END AS text_rank,
    -- Rank final: score base (60%) + relevancia textual (40%)
    CASE
      WHEN v_tsquery IS NOT NULL THEN
        ROUND((COALESCE(cp.search_score, 0) * 0.60 + ts_rank_cd(cp.search_vector, v_tsquery, 32) * 0.40)::numeric, 4)
      ELSE COALESCE(cp.search_score, 0)
    END AS final_rank,
    om.organization_id,
    o.name AS organization_name,
    o.logo_url AS organization_logo,
    cp.marketplace_roles,
    cp.categories,
    cp.content_types,
    cp.languages,
    cp.level
  FROM creator_profiles cp
  LEFT JOIN organization_members om ON om.user_id = cp.user_id
  LEFT JOIN organizations o ON o.id = om.organization_id
  WHERE
    cp.is_active = true
    AND (v_tsquery IS NULL OR cp.search_vector @@ v_tsquery)
    AND (p_roles IS NULL OR cp.primary_role = ANY(p_roles) OR cp.marketplace_roles && p_roles)
    AND (p_location_country IS NULL OR cp.location_country ILIKE p_location_country OR cp.location_country ILIKE '%' || p_location_country || '%')
    AND (p_location_city IS NULL OR cp.location_city ILIKE '%' || p_location_city || '%')
    AND (p_niches IS NULL OR cp.niches && p_niches OR cp.categories && p_niches)
    AND (p_min_rating IS NULL OR cp.rating_avg >= p_min_rating)
    AND (p_max_price IS NULL OR cp.base_price <= p_max_price)
    AND (p_accepts_exchange IS NULL OR cp.accepts_product_exchange = p_accepts_exchange)
    AND (p_is_available IS NULL OR cp.is_available = p_is_available)
  ORDER BY final_rank DESC, cp.last_active_at DESC NULLS LAST
  LIMIT p_limit OFFSET p_offset;
END;
$$;

-- GRANTs obligatorios
GRANT ALL ON marketplace_search_logs TO authenticated;
GRANT ALL ON marketplace_search_logs TO service_role;
GRANT ALL ON marketplace_interactions TO authenticated;
GRANT ALL ON marketplace_interactions TO service_role;
GRANT INSERT ON marketplace_interactions TO anon;
GRANT EXECUTE ON FUNCTION search_marketplace_creators TO authenticated;
GRANT EXECUTE ON FUNCTION search_marketplace_creators TO anon;
GRANT EXECUTE ON FUNCTION compute_creator_search_score TO service_role;

-- Actualizar search_vector de perfiles existentes
UPDATE creator_profiles SET updated_at = now() WHERE is_active = true;

NOTIFY pgrst, 'reload schema';
