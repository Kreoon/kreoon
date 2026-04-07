-- Parte 4: Configuración de puntos por rol y funciones

-- Configuración de puntos por rol
CREATE TABLE IF NOT EXISTS public.role_points_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  role_key TEXT NOT NULL,
  delivery_days INTEGER NOT NULL DEFAULT 3,
  early_delivery_points INTEGER NOT NULL DEFAULT 70,
  on_time_delivery_points INTEGER NOT NULL DEFAULT 50,
  late_delivery_points INTEGER NOT NULL DEFAULT 0,
  clean_approval_bonus INTEGER NOT NULL DEFAULT 10,
  issue_penalty INTEGER NOT NULL DEFAULT 10,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, role_key)
);

CREATE INDEX IF NOT EXISTS idx_role_points_config_org ON public.role_points_config(organization_id);

ALTER TABLE public.role_points_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can view config" ON public.role_points_config FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.organization_members om WHERE om.organization_id = role_points_config.organization_id AND om.user_id = auth.uid()));
CREATE POLICY "Admins can manage config" ON public.role_points_config FOR ALL
  USING (EXISTS (SELECT 1 FROM public.organization_members om WHERE om.organization_id = role_points_config.organization_id AND om.user_id = auth.uid() AND om.is_owner = true));


-- Multiplicadores por nivel y complejidad
CREATE TABLE IF NOT EXISTS public.role_multipliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  multiplier_type TEXT NOT NULL CHECK (multiplier_type IN ('level', 'complexity', 'client_tier')),
  multiplier_key TEXT NOT NULL,
  multiplier_value DECIMAL(4,2) NOT NULL DEFAULT 1.0,
  role_key TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, multiplier_type, multiplier_key, role_key)
);

CREATE INDEX IF NOT EXISTS idx_role_multipliers_org ON public.role_multipliers(organization_id, multiplier_type);

ALTER TABLE public.role_multipliers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can view multipliers" ON public.role_multipliers FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.organization_members om WHERE om.organization_id = role_multipliers.organization_id AND om.user_id = auth.uid()));
CREATE POLICY "Admins can manage multipliers" ON public.role_multipliers FOR ALL
  USING (EXISTS (SELECT 1 FROM public.organization_members om WHERE om.organization_id = role_multipliers.organization_id AND om.user_id = auth.uid() AND om.is_owner = true));


-- Función para calcular puntos de entrega
CREATE OR REPLACE FUNCTION public.calculate_delivery_points(
  p_organization_id UUID,
  p_user_id UUID,
  p_role_key TEXT,
  p_delivery_days INTEGER,
  p_has_issues BOOLEAN DEFAULT false,
  p_issue_count INTEGER DEFAULT 0,
  p_complexity_key TEXT DEFAULT 'standard',
  p_client_tier TEXT DEFAULT 'standard'
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_config public.role_points_config%ROWTYPE;
  v_base_points INTEGER := 0;
  v_level_multiplier DECIMAL(4,2) := 1.0;
  v_complexity_multiplier DECIMAL(4,2) := 1.0;
  v_client_multiplier DECIMAL(4,2) := 1.0;
  v_user_level TEXT;
  v_total_points INTEGER;
BEGIN
  -- Obtener configuración del rol
  SELECT * INTO v_config
  FROM public.role_points_config
  WHERE organization_id = p_organization_id
    AND role_key = p_role_key
    AND is_active = true;

  -- Si no hay config, usar defaults basados en rol
  IF v_config IS NULL THEN
    IF p_role_key = 'editor' THEN
      v_config.delivery_days := 2;
      v_config.early_delivery_points := 70;
      v_config.on_time_delivery_points := 50;
      v_config.late_delivery_points := 0;
      v_config.clean_approval_bonus := 15;
      v_config.issue_penalty := 15;
    ELSE
      v_config.delivery_days := 3;
      v_config.early_delivery_points := 70;
      v_config.on_time_delivery_points := 50;
      v_config.late_delivery_points := 0;
      v_config.clean_approval_bonus := 10;
      v_config.issue_penalty := 10;
    END IF;
  END IF;

  -- Calcular puntos base por tiempo de entrega
  IF p_delivery_days < v_config.delivery_days THEN
    v_base_points := v_config.early_delivery_points;
  ELSIF p_delivery_days = v_config.delivery_days THEN
    v_base_points := v_config.on_time_delivery_points;
  ELSE
    v_base_points := v_config.late_delivery_points;
  END IF;

  -- Aplicar bonus/penalización por issues
  IF p_has_issues AND p_issue_count > 0 THEN
    v_base_points := v_base_points - (v_config.issue_penalty * p_issue_count);
  ELSIF NOT p_has_issues THEN
    v_base_points := v_base_points + v_config.clean_approval_bonus;
  END IF;

  -- Obtener nivel del usuario
  SELECT current_level INTO v_user_level
  FROM public.user_reputation_totals
  WHERE organization_id = p_organization_id AND user_id = p_user_id;

  -- Obtener multiplicador de nivel
  SELECT COALESCE(multiplier_value, 1.0) INTO v_level_multiplier
  FROM public.role_multipliers
  WHERE organization_id = p_organization_id
    AND multiplier_type = 'level'
    AND multiplier_key = COALESCE(v_user_level, 'Novato')
    AND is_active = true
  LIMIT 1;

  -- Obtener multiplicador de complejidad
  SELECT COALESCE(multiplier_value, 1.0) INTO v_complexity_multiplier
  FROM public.role_multipliers
  WHERE organization_id = p_organization_id
    AND multiplier_type = 'complexity'
    AND multiplier_key = p_complexity_key
    AND (role_key IS NULL OR role_key = p_role_key)
    AND is_active = true
  LIMIT 1;

  -- Obtener multiplicador de cliente
  SELECT COALESCE(multiplier_value, 1.0) INTO v_client_multiplier
  FROM public.role_multipliers
  WHERE organization_id = p_organization_id
    AND multiplier_type = 'client_tier'
    AND multiplier_key = p_client_tier
    AND is_active = true
  LIMIT 1;

  -- Calcular total
  v_total_points := GREATEST(0, ROUND(v_base_points * v_level_multiplier * v_complexity_multiplier * v_client_multiplier));

  RETURN v_total_points;
END;
$$;


-- Función para verificar y otorgar insignias globales
CREATE OR REPLACE FUNCTION public.check_and_award_global_badges(p_user_id UUID)
RETURNS TABLE(badge_id UUID, badge_key TEXT, badge_name TEXT, was_unlocked BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_badge RECORD;
  v_stats public.user_global_stats%ROWTYPE;
  v_progress INTEGER;
  v_max INTEGER;
  v_should_unlock BOOLEAN;
  v_existing RECORD;
BEGIN
  -- Obtener stats del usuario
  SELECT * INTO v_stats
  FROM public.user_global_stats
  WHERE user_id = p_user_id;

  IF v_stats IS NULL THEN
    RETURN;
  END IF;

  -- Iterar sobre insignias activas no completadas
  FOR v_badge IN
    SELECT gb.*
    FROM public.global_badges gb
    LEFT JOIN public.user_global_badges ugb ON ugb.badge_id = gb.id AND ugb.user_id = p_user_id
    WHERE gb.is_active = true
      AND (ugb.is_completed IS NULL OR ugb.is_completed = false)
    ORDER BY gb.rarity, gb.display_order
  LOOP
    v_progress := 0;
    v_max := 1;
    v_should_unlock := false;

    -- Evaluar condición según tipo
    CASE v_badge.condition_type
      WHEN 'threshold' THEN
        CASE v_badge.category
          WHEN 'profile' THEN
            IF v_badge.key LIKE '%avatar%' THEN
              v_progress := CASE WHEN v_stats.has_avatar THEN 1 ELSE 0 END;
            ELSIF v_badge.key LIKE '%banner%' THEN
              v_progress := CASE WHEN v_stats.has_banner THEN 1 ELSE 0 END;
            ELSIF v_badge.key LIKE '%bio%' THEN
              v_progress := CASE WHEN v_stats.has_bio THEN 1 ELSE 0 END;
            ELSIF v_badge.key LIKE '%completeness%' OR v_badge.key LIKE '%perfect%' OR v_badge.key LIKE '%pro%' THEN
              v_max := COALESCE((v_badge.condition_config->>'threshold')::INTEGER, 100);
              v_progress := v_stats.profile_completeness;
            ELSIF v_badge.key LIKE '%social%' THEN
              v_max := COALESCE((v_badge.condition_config->>'threshold')::INTEGER, 1);
              v_progress := v_stats.social_networks_count;
            END IF;

          WHEN 'portfolio' THEN
            v_max := COALESCE((v_badge.condition_config->>'threshold')::INTEGER, 1);
            IF v_badge.key LIKE '%view%' THEN
              v_progress := v_stats.portfolio_views_total::INTEGER;
            ELSIF v_badge.key LIKE '%like%' THEN
              v_progress := v_stats.portfolio_likes_total::INTEGER;
            ELSIF v_badge.key LIKE '%video%' THEN
              v_progress := v_stats.portfolio_videos_count;
            ELSIF v_badge.key LIKE '%image%' THEN
              v_progress := v_stats.portfolio_images_count;
            ELSIF v_badge.key LIKE '%hd%' OR v_badge.key LIKE '%4k%' THEN
              v_progress := v_stats.portfolio_hd_count;
            ELSE
              v_progress := v_stats.portfolio_posts_count;
            END IF;

          WHEN 'experience' THEN
            v_max := COALESCE((v_badge.condition_config->>'threshold')::INTEGER, 1);
            IF v_badge.key LIKE '%project%' OR v_badge.key LIKE '%mission%' THEN
              v_progress := v_stats.total_projects_completed;
            ELSIF v_badge.key LIKE '%client%' THEN
              v_progress := v_stats.unique_clients_count;
            ELSIF v_badge.key LIKE '%repeat%' THEN
              v_progress := v_stats.repeat_clients_count;
            ELSIF v_badge.key LIKE '%revenue%' OR v_badge.key LIKE '%10k%' THEN
              v_progress := v_stats.total_revenue_usd::INTEGER;
            END IF;

          WHEN 'quality' THEN
            v_max := COALESCE((v_badge.condition_config->>'threshold')::INTEGER, 1);
            IF v_badge.key LIKE '%five_star%' OR v_badge.key LIKE '%5star%' THEN
              v_progress := v_stats.five_star_count;
            ELSIF v_badge.key LIKE '%rating%' THEN
              v_max := COALESCE((v_badge.condition_config->>'min_ratings')::INTEGER, 10);
              v_progress := v_stats.ratings_count;
              IF v_stats.average_rating < COALESCE((v_badge.condition_config->>'min_rating')::NUMERIC, 4.5) THEN
                v_progress := 0;
              END IF;
            ELSIF v_badge.key LIKE '%no_revision%' OR v_badge.key LIKE '%clean%' THEN
              v_progress := v_stats.no_revision_streak;
            END IF;

          WHEN 'speed' THEN
            v_max := COALESCE((v_badge.condition_config->>'threshold')::INTEGER, 1);
            IF v_badge.key LIKE '%early%' THEN
              v_progress := v_stats.early_deliveries_count;
            ELSIF v_badge.key LIKE '%on_time%' THEN
              v_progress := v_stats.on_time_deliveries_count;
            ELSIF v_badge.key LIKE '%streak%' THEN
              v_progress := v_stats.delivery_streak;
            END IF;

          WHEN 'community' THEN
            v_max := COALESCE((v_badge.condition_config->>'threshold')::INTEGER, 1);
            IF v_badge.key LIKE '%follower%' THEN
              v_progress := v_stats.followers_count;
            ELSIF v_badge.key LIKE '%referral%' THEN
              v_progress := v_stats.successful_referrals;
            ELSIF v_badge.key LIKE '%collab%' THEN
              v_progress := v_stats.collaborations_count;
            ELSIF v_badge.key LIKE '%comment%' THEN
              v_progress := v_stats.comments_given;
            ELSIF v_badge.key LIKE '%like%' THEN
              v_progress := v_stats.likes_given;
            END IF;

          WHEN 'veteran' THEN
            v_max := COALESCE((v_badge.condition_config->>'threshold')::INTEGER, 365);
            v_progress := v_stats.days_since_signup;

          ELSE
            v_progress := 0;
        END CASE;

      WHEN 'milestone' THEN
        v_max := COALESCE((v_badge.condition_config->>'milestone')::INTEGER, 1);
        v_progress := v_stats.total_badge_points;

      WHEN 'streak' THEN
        v_max := COALESCE((v_badge.condition_config->>'streak_days')::INTEGER, 7);
        v_progress := v_stats.consecutive_active_days;

      WHEN 'cumulative' THEN
        v_max := COALESCE((v_badge.condition_config->>'total')::INTEGER, 1);
        v_progress := v_stats.badges_completed_count;

      ELSE
        v_progress := 0;
    END CASE;

    v_should_unlock := v_progress >= v_max;

    -- Insertar o actualizar progreso
    INSERT INTO public.user_global_badges (user_id, badge_id, current_progress, progress_max, is_completed, unlocked_at)
    VALUES (
      p_user_id,
      v_badge.id,
      LEAST(v_progress, v_max),
      v_max,
      v_should_unlock,
      CASE WHEN v_should_unlock THEN now() ELSE NULL END
    )
    ON CONFLICT (user_id, badge_id) DO UPDATE SET
      current_progress = LEAST(EXCLUDED.current_progress, user_global_badges.progress_max),
      is_completed = CASE WHEN user_global_badges.is_completed THEN true ELSE EXCLUDED.is_completed END,
      unlocked_at = CASE WHEN user_global_badges.is_completed THEN user_global_badges.unlocked_at ELSE EXCLUDED.unlocked_at END,
      progress_updated_at = now()
    RETURNING * INTO v_existing;

    -- Si se desbloqueó, actualizar puntos
    IF v_should_unlock AND v_existing.unlocked_at = now() THEN
      UPDATE public.user_global_stats
      SET total_badge_points = total_badge_points + v_badge.ranking_points,
          badges_completed_count = badges_completed_count + 1,
          updated_at = now()
      WHERE user_id = p_user_id;

      badge_id := v_badge.id;
      badge_key := v_badge.key;
      badge_name := v_badge.name;
      was_unlocked := true;
      RETURN NEXT;
    END IF;
  END LOOP;

  RETURN;
END;
$$;


-- Vista materializada para leaderboard en tiempo real
CREATE MATERIALIZED VIEW IF NOT EXISTS public.season_leaderboard_live AS
SELECT
  urt.organization_id,
  urt.user_id,
  urt.role_key,
  urt.season_points,
  urt.current_level,
  p.full_name,
  p.avatar_url,
  ROW_NUMBER() OVER (
    PARTITION BY urt.organization_id, urt.role_key
    ORDER BY urt.season_points DESC
  ) as season_rank,
  PERCENT_RANK() OVER (
    PARTITION BY urt.organization_id, urt.role_key
    ORDER BY urt.season_points DESC
  ) * 100 as percentile,
  rs.id as season_id,
  rs.name as season_name
FROM public.user_reputation_totals urt
JOIN public.profiles p ON p.id = urt.user_id
LEFT JOIN public.reputation_seasons rs ON rs.organization_id = urt.organization_id AND rs.is_active = true
WHERE urt.season_points > 0;

CREATE UNIQUE INDEX IF NOT EXISTS idx_season_leaderboard_live_pk ON public.season_leaderboard_live(organization_id, role_key, user_id);
CREATE INDEX IF NOT EXISTS idx_season_leaderboard_live_rank ON public.season_leaderboard_live(organization_id, role_key, season_rank);


-- Función para refrescar leaderboard
CREATE OR REPLACE FUNCTION public.refresh_season_leaderboard()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.season_leaderboard_live;
END;
$$;
