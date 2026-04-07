-- Parte 6: Triggers y funciones de sincronización

-- Trigger para crear user_global_stats cuando se crea un usuario
CREATE OR REPLACE FUNCTION public.create_user_global_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.user_global_stats (user_id, profile_created_at)
  VALUES (NEW.id, now())
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_profile_created_create_global_stats ON public.profiles;
CREATE TRIGGER on_profile_created_create_global_stats
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.create_user_global_stats();


-- Función para sincronizar stats de perfil
CREATE OR REPLACE FUNCTION public.sync_profile_to_global_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_completeness INTEGER := 0;
  v_has_avatar BOOLEAN := false;
  v_has_banner BOOLEAN := false;
  v_has_bio BOOLEAN := false;
  v_bio_length INTEGER := 0;
  v_social_count INTEGER := 0;
BEGIN
  -- Calcular completitud del perfil
  v_has_avatar := NEW.avatar_url IS NOT NULL AND NEW.avatar_url != '';
  v_has_banner := NEW.banner_url IS NOT NULL AND NEW.banner_url != '';
  v_has_bio := NEW.bio IS NOT NULL AND LENGTH(NEW.bio) > 10;
  v_bio_length := COALESCE(LENGTH(NEW.bio), 0);

  -- Contar redes sociales
  v_social_count := 0;
  IF NEW.instagram IS NOT NULL AND NEW.instagram != '' THEN v_social_count := v_social_count + 1; END IF;
  IF NEW.tiktok IS NOT NULL AND NEW.tiktok != '' THEN v_social_count := v_social_count + 1; END IF;
  IF NEW.youtube IS NOT NULL AND NEW.youtube != '' THEN v_social_count := v_social_count + 1; END IF;
  IF NEW.facebook IS NOT NULL AND NEW.facebook != '' THEN v_social_count := v_social_count + 1; END IF;
  IF NEW.linkedin IS NOT NULL AND NEW.linkedin != '' THEN v_social_count := v_social_count + 1; END IF;
  IF NEW.twitter IS NOT NULL AND NEW.twitter != '' THEN v_social_count := v_social_count + 1; END IF;

  -- Calcular porcentaje de completitud
  v_completeness := 0;
  IF v_has_avatar THEN v_completeness := v_completeness + 15; END IF;
  IF v_has_banner THEN v_completeness := v_completeness + 10; END IF;
  IF v_has_bio THEN v_completeness := v_completeness + 20; END IF;
  IF NEW.full_name IS NOT NULL AND NEW.full_name != '' THEN v_completeness := v_completeness + 15; END IF;
  IF NEW.headline IS NOT NULL AND NEW.headline != '' THEN v_completeness := v_completeness + 10; END IF;
  IF NEW.city IS NOT NULL AND NEW.city != '' THEN v_completeness := v_completeness + 10; END IF;
  IF v_social_count >= 1 THEN v_completeness := v_completeness + 10; END IF;
  IF v_social_count >= 3 THEN v_completeness := v_completeness + 10; END IF;

  -- Actualizar stats
  INSERT INTO public.user_global_stats (
    user_id, profile_completeness, has_avatar, has_banner, has_bio, bio_length, social_networks_count, updated_at
  ) VALUES (
    NEW.id, v_completeness, v_has_avatar, v_has_banner, v_has_bio, v_bio_length, v_social_count, now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    profile_completeness = EXCLUDED.profile_completeness,
    has_avatar = EXCLUDED.has_avatar,
    has_banner = EXCLUDED.has_banner,
    has_bio = EXCLUDED.has_bio,
    bio_length = EXCLUDED.bio_length,
    social_networks_count = EXCLUDED.social_networks_count,
    updated_at = now();

  -- Verificar badges
  PERFORM public.check_and_award_global_badges(NEW.id);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_profile_updated_sync_global_stats ON public.profiles;
CREATE TRIGGER on_profile_updated_sync_global_stats
  AFTER INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_profile_to_global_stats();


-- Función para cerrar temporada y distribuir premios
CREATE OR REPLACE FUNCTION public.close_season_and_distribute_rewards(p_season_id UUID)
RETURNS TABLE(
  claims_created INTEGER,
  points_distributed INTEGER,
  badges_awarded INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_season RECORD;
  v_reward RECORD;
  v_user RECORD;
  v_claims_count INTEGER := 0;
  v_points_total INTEGER := 0;
  v_badges_count INTEGER := 0;
  v_final_rank INTEGER;
  v_final_percentile NUMERIC;
BEGIN
  -- Obtener info de temporada
  SELECT * INTO v_season
  FROM public.reputation_seasons
  WHERE id = p_season_id;

  IF v_season IS NULL THEN
    RAISE EXCEPTION 'Season not found: %', p_season_id;
  END IF;

  IF v_season.is_active = true THEN
    -- Desactivar temporada
    UPDATE public.reputation_seasons
    SET is_active = false, updated_at = now()
    WHERE id = p_season_id;
  END IF;

  -- Refrescar leaderboard
  PERFORM public.refresh_season_leaderboard();

  -- Iterar sobre premios activos
  FOR v_reward IN
    SELECT sr.*
    FROM public.season_rewards sr
    WHERE sr.season_id = p_season_id
      AND sr.is_active = true
    ORDER BY sr.priority DESC
  LOOP
    -- Encontrar usuarios elegibles
    FOR v_user IN
      SELECT
        sll.user_id,
        sll.season_rank,
        sll.percentile,
        sll.season_points,
        sll.role_key
      FROM public.season_leaderboard_live sll
      WHERE sll.organization_id = v_season.organization_id
        AND sll.season_id = p_season_id
        AND (v_reward.role_key IS NULL OR sll.role_key = v_reward.role_key)
        AND (
          (v_reward.position_type = 'rank' AND sll.season_rank >= v_reward.position_min AND (v_reward.position_max IS NULL OR sll.season_rank <= v_reward.position_max))
          OR (v_reward.position_type = 'percentile' AND sll.percentile <= v_reward.position_min)
          OR (v_reward.position_type = 'threshold' AND sll.season_points >= v_reward.position_min)
        )
    LOOP
      -- Crear claim
      INSERT INTO public.season_reward_claims (
        season_id, reward_id, user_id, organization_id,
        final_rank, final_points, final_level, role_key, status
      )
      SELECT
        p_season_id,
        v_reward.id,
        v_user.user_id,
        v_season.organization_id,
        v_user.season_rank,
        v_user.season_points,
        urt.current_level,
        v_user.role_key,
        CASE
          WHEN v_reward.reward_type IN ('points_bonus', 'badge') THEN 'delivered'
          ELSE 'pending'
        END
      FROM public.user_reputation_totals urt
      WHERE urt.user_id = v_user.user_id
        AND urt.organization_id = v_season.organization_id
      ON CONFLICT (season_id, reward_id, user_id) DO NOTHING;

      IF FOUND THEN
        v_claims_count := v_claims_count + 1;

        -- Auto-entregar puntos
        IF v_reward.reward_type = 'points_bonus' AND v_reward.points_amount > 0 THEN
          UPDATE public.user_reputation_totals
          SET lifetime_points = lifetime_points + v_reward.points_amount,
              updated_at = now()
          WHERE user_id = v_user.user_id
            AND organization_id = v_season.organization_id;

          v_points_total := v_points_total + v_reward.points_amount;

          UPDATE public.season_reward_claims
          SET status = 'delivered', delivered_at = now()
          WHERE season_id = p_season_id
            AND reward_id = v_reward.id
            AND user_id = v_user.user_id;
        END IF;

        -- Auto-otorgar badge de temporada (si existe)
        IF v_reward.reward_type = 'badge' AND v_reward.badge_id IS NOT NULL THEN
          INSERT INTO public.user_achievements (user_id, achievement_id, organization_id)
          SELECT v_user.user_id, v_reward.badge_id, v_season.organization_id
          ON CONFLICT DO NOTHING;

          IF FOUND THEN
            v_badges_count := v_badges_count + 1;
          END IF;

          UPDATE public.season_reward_claims
          SET status = 'delivered', delivered_at = now()
          WHERE season_id = p_season_id
            AND reward_id = v_reward.id
            AND user_id = v_user.user_id;
        END IF;
      END IF;
    END LOOP;
  END LOOP;

  -- Resetear puntos de temporada a 0
  UPDATE public.user_reputation_totals
  SET season_points = 0
  WHERE organization_id = v_season.organization_id;

  claims_created := v_claims_count;
  points_distributed := v_points_total;
  badges_awarded := v_badges_count;
  RETURN NEXT;
END;
$$;


-- Trigger para actualizar last_active_at
CREATE OR REPLACE FUNCTION public.update_user_last_active()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.user_global_stats
  SET last_active_at = now(),
      days_since_signup = EXTRACT(DAY FROM (now() - profile_created_at)),
      updated_at = now()
  WHERE user_id = NEW.user_id;
  RETURN NEW;
END;
$$;


-- RPC para obtener premios de temporada con elegibilidad
CREATE OR REPLACE FUNCTION public.get_season_rewards_with_eligibility(
  p_season_id UUID,
  p_user_id UUID
)
RETURNS TABLE(
  reward_id UUID,
  reward_type TEXT,
  position_type TEXT,
  position_min INTEGER,
  position_max INTEGER,
  display_name TEXT,
  display_icon TEXT,
  display_color TEXT,
  description TEXT,
  points_amount INTEGER,
  monetary_amount DECIMAL,
  monetary_currency TEXT,
  user_rank INTEGER,
  user_percentile NUMERIC,
  user_points INTEGER,
  is_eligible BOOLEAN,
  is_claimed BOOLEAN,
  claim_status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_season RECORD;
  v_user_lb RECORD;
BEGIN
  -- Obtener temporada
  SELECT * INTO v_season
  FROM public.reputation_seasons
  WHERE id = p_season_id;

  IF v_season IS NULL THEN
    RETURN;
  END IF;

  -- Obtener posición del usuario
  SELECT * INTO v_user_lb
  FROM public.season_leaderboard_live
  WHERE organization_id = v_season.organization_id
    AND user_id = p_user_id
    AND season_id = p_season_id
  LIMIT 1;

  RETURN QUERY
  SELECT
    sr.id as reward_id,
    sr.reward_type,
    sr.position_type,
    sr.position_min,
    sr.position_max,
    sr.display_name,
    sr.display_icon,
    sr.display_color,
    sr.description,
    sr.points_amount,
    sr.monetary_amount,
    sr.monetary_currency,
    COALESCE(v_user_lb.season_rank::INTEGER, 0) as user_rank,
    COALESCE(v_user_lb.percentile, 100) as user_percentile,
    COALESCE(v_user_lb.season_points::INTEGER, 0) as user_points,
    CASE
      WHEN v_user_lb IS NULL THEN false
      WHEN sr.role_key IS NOT NULL AND sr.role_key != v_user_lb.role_key THEN false
      WHEN sr.position_type = 'rank' THEN
        v_user_lb.season_rank >= sr.position_min AND (sr.position_max IS NULL OR v_user_lb.season_rank <= sr.position_max)
      WHEN sr.position_type = 'percentile' THEN
        v_user_lb.percentile <= sr.position_min
      WHEN sr.position_type = 'threshold' THEN
        v_user_lb.season_points >= sr.position_min
      ELSE false
    END as is_eligible,
    EXISTS (
      SELECT 1 FROM public.season_reward_claims src
      WHERE src.season_id = p_season_id
        AND src.reward_id = sr.id
        AND src.user_id = p_user_id
    ) as is_claimed,
    (
      SELECT src.status FROM public.season_reward_claims src
      WHERE src.season_id = p_season_id
        AND src.reward_id = sr.id
        AND src.user_id = p_user_id
    ) as claim_status
  FROM public.season_rewards sr
  WHERE sr.season_id = p_season_id
    AND sr.is_active = true
  ORDER BY sr.priority DESC, sr.position_min ASC;
END;
$$;


-- RPC para obtener badges globales con progreso
CREATE OR REPLACE FUNCTION public.get_global_badges_with_progress(p_user_id UUID)
RETURNS TABLE(
  badge_id UUID,
  badge_key TEXT,
  badge_name TEXT,
  badge_description TEXT,
  badge_icon TEXT,
  badge_category TEXT,
  badge_rarity TEXT,
  ranking_points INTEGER,
  tier INTEGER,
  is_secret BOOLEAN,
  current_progress INTEGER,
  progress_max INTEGER,
  progress_percentage NUMERIC,
  is_completed BOOLEAN,
  unlocked_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    gb.id as badge_id,
    gb.key as badge_key,
    gb.name as badge_name,
    CASE WHEN gb.is_secret AND NOT COALESCE(ugb.is_completed, false) THEN '???' ELSE gb.description END as badge_description,
    gb.icon as badge_icon,
    gb.category::TEXT as badge_category,
    gb.rarity::TEXT as badge_rarity,
    gb.ranking_points,
    gb.tier,
    gb.is_secret,
    COALESCE(ugb.current_progress, 0) as current_progress,
    COALESCE(ugb.progress_max, 1) as progress_max,
    ROUND(COALESCE(ugb.current_progress, 0)::NUMERIC / GREATEST(COALESCE(ugb.progress_max, 1), 1) * 100, 1) as progress_percentage,
    COALESCE(ugb.is_completed, false) as is_completed,
    ugb.unlocked_at
  FROM public.global_badges gb
  LEFT JOIN public.user_global_badges ugb ON ugb.badge_id = gb.id AND ugb.user_id = p_user_id
  WHERE gb.is_active = true
    AND (NOT gb.is_secret OR COALESCE(ugb.is_completed, false) = true OR ugb.current_progress > 0)
  ORDER BY
    COALESCE(ugb.is_completed, false) DESC,
    gb.category,
    gb.rarity,
    gb.display_order;
END;
$$;


-- RPC para obtener ranking global
CREATE OR REPLACE FUNCTION public.get_global_ranking(
  p_limit INTEGER DEFAULT 100,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE(
  user_id UUID,
  full_name TEXT,
  avatar_url TEXT,
  total_badge_points INTEGER,
  badges_completed_count INTEGER,
  global_rank BIGINT,
  percentile NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH ranked AS (
    SELECT
      ugs.user_id,
      p.full_name,
      p.avatar_url,
      ugs.total_badge_points,
      ugs.badges_completed_count,
      ROW_NUMBER() OVER (ORDER BY ugs.total_badge_points DESC) as global_rank,
      PERCENT_RANK() OVER (ORDER BY ugs.total_badge_points DESC) * 100 as percentile
    FROM public.user_global_stats ugs
    JOIN public.profiles p ON p.id = ugs.user_id
    WHERE ugs.total_badge_points > 0
  )
  SELECT *
  FROM ranked
  ORDER BY global_rank
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;
