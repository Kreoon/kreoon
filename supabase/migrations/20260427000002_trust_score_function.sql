-- Migration: RPC function calculate_creator_trust_score
-- Date: 2026-04-27
-- Author: Alexander Cast
--
-- Fórmula total: 100 puntos
--   Reviews   30 pts  (rating_avg, rating_count, would_recommend)
--   Delivery  25 pts  (on_time_pct, avg_revisions, issue_rate)
--   Projects  20 pts  (completed, success_rate, repeat_clients)
--   Profile   10 pts  (completitud básica — ampliable desde frontend)
--   Portfolio 10 pts  (cantidad de items, engagement)
--   Response   5 pts  (response_time_hours)
-- ============================================================

CREATE OR REPLACE FUNCTION calculate_creator_trust_score(creator_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  -- creator_profiles
  v_rating_avg            NUMERIC;
  v_rating_count          INTEGER;
  v_completed_projects    INTEGER;
  v_on_time_pct           NUMERIC;   -- 0-1
  v_repeat_clients_pct    NUMERIC;   -- 0-1
  v_response_time_hours   NUMERIC;
  v_profile_created_at    TIMESTAMPTZ;
  v_bio                   TEXT;
  v_avatar_url            TEXT;
  v_display_name          TEXT;
  v_specializations       TEXT[];

  -- marketplace_reviews
  v_would_recommend_pct   NUMERIC;   -- 0-1
  v_avg_revisions         NUMERIC;

  -- marketplace_projects (proyectos con deadline vs entrega real)
  v_issue_rate            NUMERIC;   -- fracción de proyectos con problema
  v_success_rate          NUMERIC;   -- 0-1

  -- portfolio_items
  v_portfolio_count       INTEGER;
  v_portfolio_engagement  NUMERIC;

  -- scores por dimensión
  v_score_reviews         NUMERIC := 0;
  v_score_delivery        NUMERIC := 0;
  v_score_projects        NUMERIC := 0;
  v_score_profile         NUMERIC := 0;
  v_score_portfolio       NUMERIC := 0;
  v_score_response        NUMERIC := 0;

  v_total_score           NUMERIC;
  v_is_new_profile        BOOLEAN := FALSE;
  v_result                JSONB;
BEGIN

  -- --------------------------------------------------------
  -- 1. Leer datos de creator_profiles
  -- --------------------------------------------------------
  SELECT
    COALESCE(rating_avg, 0),
    COALESCE(rating_count, 0),
    COALESCE(completed_projects, 0),
    -- on_time_delivery_pct puede estar como 0-100 o 0-1; normalizamos a 0-1
    CASE
      WHEN COALESCE(on_time_delivery_pct, 0) > 1
      THEN COALESCE(on_time_delivery_pct, 0) / 100.0
      ELSE COALESCE(on_time_delivery_pct, 0)
    END,
    CASE
      WHEN COALESCE(repeat_clients_pct, 0) > 1
      THEN COALESCE(repeat_clients_pct, 0) / 100.0
      ELSE COALESCE(repeat_clients_pct, 0)
    END,
    COALESCE(response_time_hours, 999),
    created_at,
    COALESCE(bio, ''),
    COALESCE(avatar_url, ''),
    COALESCE(display_name, ''),
    COALESCE(specializations, ARRAY[]::TEXT[])
  INTO
    v_rating_avg,
    v_rating_count,
    v_completed_projects,
    v_on_time_pct,
    v_repeat_clients_pct,
    v_response_time_hours,
    v_profile_created_at,
    v_bio,
    v_avatar_url,
    v_display_name,
    v_specializations
  FROM creator_profiles
  WHERE user_id = creator_user_id;

  -- Perfil no encontrado — retornar vacío
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'total',           0,
      'breakdown',       '{}',
      'is_new_profile',  true,
      'calculated_at',   now(),
      'error',           'creator_profile_not_found'
    );
  END IF;

  -- --------------------------------------------------------
  -- 2. Caso: perfil nuevo sin historial
  -- --------------------------------------------------------
  IF v_completed_projects = 0
     AND (now() - v_profile_created_at) < INTERVAL '30 days'
  THEN
    v_is_new_profile := TRUE;

    UPDATE creator_profiles SET
      trust_score            = 60.00,
      trust_score_breakdown  = jsonb_build_object(
        'reviews',   0,
        'delivery',  0,
        'projects',  0,
        'profile',   5,
        'portfolio', 0,
        'response',  0
      ),
      trust_score_updated_at = now()
    WHERE user_id = creator_user_id;

    RETURN jsonb_build_object(
      'total',          60.00,
      'breakdown',      jsonb_build_object(
        'reviews',   0,
        'delivery',  0,
        'projects',  0,
        'profile',   5,
        'portfolio', 0,
        'response',  0
      ),
      'is_new_profile', true,
      'calculated_at',  now()
    );
  END IF;

  -- --------------------------------------------------------
  -- 3. Reviews (30 pts)
  --    20 pts: (rating_avg / 5) * 20
  --     5 pts: min(rating_count / 10, 1) * 5
  --     5 pts: would_recommend_pct * 5
  -- --------------------------------------------------------
  SELECT
    COALESCE(
      AVG(CASE WHEN would_recommend THEN 1.0 ELSE 0.0 END),
      0
    )
  INTO v_would_recommend_pct
  FROM marketplace_reviews
  WHERE reviewed_id = creator_user_id;

  v_score_reviews :=
      (v_rating_avg / 5.0) * 20.0
    + LEAST(v_rating_count::NUMERIC / 10.0, 1.0) * 5.0
    + v_would_recommend_pct * 5.0;

  -- --------------------------------------------------------
  -- 4. Delivery (25 pts)
  --    15 pts: on_time_pct * 15
  --     5 pts: avg_revisions < 0.5  → 5 pts
  --     5 pts: issue_rate < 0.05    → 5 pts
  --
  --    avg_revisions = promedio de (revisions_used / NULLIF(revisions_limit,0))
  --    issue_rate    = fracción proyectos completed donde completed_at > deadline
  -- --------------------------------------------------------
  SELECT
    COALESCE(
      AVG(
        revisions_used::NUMERIC / NULLIF(revisions_limit, 0)
      ),
      0
    ),
    COALESCE(
      AVG(
        CASE
          WHEN status = 'completed'
               AND deadline IS NOT NULL
               AND completed_at IS NOT NULL
               AND completed_at > deadline
          THEN 1.0
          ELSE 0.0
        END
      ),
      0
    ),
    CASE
      WHEN COUNT(*) FILTER (WHERE status = 'completed') = 0
      THEN 0
      ELSE COUNT(*) FILTER (WHERE status = 'completed' AND (completed_at IS NULL OR deadline IS NULL OR completed_at <= deadline))::NUMERIC
           / NULLIF(COUNT(*) FILTER (WHERE status = 'completed'), 0)
    END
  INTO v_avg_revisions, v_issue_rate, v_success_rate
  FROM marketplace_projects
  WHERE creator_id = creator_user_id;

  v_score_delivery :=
      v_on_time_pct * 15.0
    + CASE WHEN COALESCE(v_avg_revisions, 0) < 0.5  THEN 5.0 ELSE 0.0 END
    + CASE WHEN COALESCE(v_issue_rate, 0)   < 0.05  THEN 5.0 ELSE 0.0 END;

  -- --------------------------------------------------------
  -- 5. Projects (20 pts)
  --    10 pts: min(completed / 20, 1) * 10
  --     5 pts: success_rate * 5
  --     5 pts: repeat_clients_pct * 5
  -- --------------------------------------------------------
  v_score_projects :=
      LEAST(v_completed_projects::NUMERIC / 20.0, 1.0) * 10.0
    + COALESCE(v_success_rate, 0) * 5.0
    + v_repeat_clients_pct * 5.0;

  -- --------------------------------------------------------
  -- 6. Profile (10 pts)
  --     5 pts base (siempre tiene perfil)
  --     1 pt:  bio no vacía
  --     1 pt:  avatar_url no vacío
  --     1 pt:  display_name no vacío
  --     2 pts: especialización(es) definida(s)
  -- --------------------------------------------------------
  v_score_profile :=
      5.0
    + CASE WHEN length(v_bio)          > 0 THEN 1.0 ELSE 0.0 END
    + CASE WHEN length(v_avatar_url)   > 0 THEN 1.0 ELSE 0.0 END
    + CASE WHEN length(v_display_name) > 0 THEN 1.0 ELSE 0.0 END
    + CASE WHEN array_length(v_specializations, 1) > 0 THEN 2.0 ELSE 0.0 END;

  -- --------------------------------------------------------
  -- 7. Portfolio (10 pts)
  --     5 pts: min(items_públicos / 10, 1) * 5
  --     5 pts: min(engagement_total / 1000, 1) * 5
  --            engagement = views_count + likes_count * 3
  -- --------------------------------------------------------
  SELECT
    COUNT(*),
    COALESCE(SUM(views_count + likes_count * 3), 0)
  INTO v_portfolio_count, v_portfolio_engagement
  FROM portfolio_items
  WHERE creator_id = creator_user_id
    AND is_public = true;

  v_score_portfolio :=
      LEAST(COALESCE(v_portfolio_count, 0)::NUMERIC / 10.0, 1.0) * 5.0
    + LEAST(COALESCE(v_portfolio_engagement, 0)::NUMERIC / 1000.0, 1.0) * 5.0;

  -- --------------------------------------------------------
  -- 8. Response time (5 pts)
  --    < 2 h  → 5 pts
  --    < 12 h → 4 pts
  --    < 24 h → 3 pts
  --    < 48 h → 2 pts
  --    >= 48 h → 1 pt
  -- --------------------------------------------------------
  v_score_response :=
    CASE
      WHEN v_response_time_hours <  2  THEN 5.0
      WHEN v_response_time_hours < 12  THEN 4.0
      WHEN v_response_time_hours < 24  THEN 3.0
      WHEN v_response_time_hours < 48  THEN 2.0
      ELSE 1.0
    END;

  -- --------------------------------------------------------
  -- 9. Total y persistencia
  -- --------------------------------------------------------
  v_total_score := LEAST(
    ROUND(
        v_score_reviews
      + v_score_delivery
      + v_score_projects
      + v_score_profile
      + v_score_portfolio
      + v_score_response,
    2),
  100.00);

  UPDATE creator_profiles SET
    trust_score            = v_total_score,
    trust_score_breakdown  = jsonb_build_object(
      'reviews',   ROUND(v_score_reviews::NUMERIC,  2),
      'delivery',  ROUND(v_score_delivery::NUMERIC, 2),
      'projects',  ROUND(v_score_projects::NUMERIC, 2),
      'profile',   ROUND(v_score_profile::NUMERIC,  2),
      'portfolio', ROUND(v_score_portfolio::NUMERIC,2),
      'response',  ROUND(v_score_response::NUMERIC, 2)
    ),
    trust_score_updated_at = now()
  WHERE user_id = creator_user_id;

  -- --------------------------------------------------------
  -- 10. Resultado
  -- --------------------------------------------------------
  v_result := jsonb_build_object(
    'total',          v_total_score,
    'breakdown',      jsonb_build_object(
      'reviews',   ROUND(v_score_reviews::NUMERIC,  2),
      'delivery',  ROUND(v_score_delivery::NUMERIC, 2),
      'projects',  ROUND(v_score_projects::NUMERIC, 2),
      'profile',   ROUND(v_score_profile::NUMERIC,  2),
      'portfolio', ROUND(v_score_portfolio::NUMERIC,2),
      'response',  ROUND(v_score_response::NUMERIC, 2)
    ),
    'is_new_profile', v_is_new_profile,
    'calculated_at',  now()
  );

  RETURN v_result;

END;
$$;

COMMENT ON FUNCTION calculate_creator_trust_score(UUID)
  IS 'Calcula y persiste el trust_score de un creador (0-100). Retorna JSONB con total, breakdown, is_new_profile y calculated_at.';
