-- =====================================================
-- Sincronizar datos de actividad de usuarios desde auth.users
-- Migration: 20260305210000_sync_user_health_from_sessions
-- =====================================================

-- Función para sincronizar/inicializar health de un usuario
CREATE OR REPLACE FUNCTION sync_user_health(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_last_sign_in TIMESTAMPTZ;
  v_created_at TIMESTAMPTZ;
  v_days_inactive INTEGER;
  v_completed_projects INTEGER;
  v_total_applications INTEGER;
BEGIN
  -- Obtener datos del usuario de auth.users
  SELECT
    last_sign_in_at,
    created_at
  INTO v_last_sign_in, v_created_at
  FROM auth.users
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Calcular días de inactividad
  IF v_last_sign_in IS NOT NULL THEN
    v_days_inactive := EXTRACT(DAY FROM (NOW() - v_last_sign_in));
  ELSE
    v_days_inactive := EXTRACT(DAY FROM (NOW() - v_created_at));
  END IF;

  -- Obtener proyectos completados del creator_profile si existe
  SELECT COALESCE(cp.completed_projects, 0)
  INTO v_completed_projects
  FROM creator_profiles cp
  WHERE cp.user_id = p_user_id;

  IF NOT FOUND THEN
    v_completed_projects := 0;
  END IF;

  -- Obtener aplicaciones del marketplace
  SELECT COUNT(*)
  INTO v_total_applications
  FROM campaign_applications
  WHERE creator_id IN (SELECT id FROM creator_profiles WHERE user_id = p_user_id);

  -- Insertar o actualizar platform_user_health
  INSERT INTO platform_user_health (
    user_id,
    last_login_at,
    total_logins,
    days_since_last_activity,
    total_completed_projects,
    total_applications,
    health_score,
    health_status,
    needs_attention,
    updated_at
  ) VALUES (
    p_user_id,
    v_last_sign_in,
    1,
    v_days_inactive,
    v_completed_projects,
    COALESCE(v_total_applications, 0),
    CASE
      WHEN v_days_inactive <= 7 THEN 70
      WHEN v_days_inactive <= 14 THEN 50
      WHEN v_days_inactive <= 30 THEN 30
      ELSE 10
    END,
    CASE
      WHEN v_days_inactive <= 7 THEN 'healthy'
      WHEN v_days_inactive <= 14 THEN 'at_risk'
      WHEN v_days_inactive <= 30 THEN 'churning'
      ELSE 'churned'
    END,
    v_days_inactive > 14,
    NOW()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    last_login_at = COALESCE(EXCLUDED.last_login_at, platform_user_health.last_login_at),
    total_logins = platform_user_health.total_logins + 1,
    days_since_last_activity = EXCLUDED.days_since_last_activity,
    total_completed_projects = EXCLUDED.total_completed_projects,
    total_applications = EXCLUDED.total_applications,
    health_score = EXCLUDED.health_score,
    health_status = EXCLUDED.health_status,
    needs_attention = EXCLUDED.needs_attention,
    updated_at = NOW();
END;
$$;

GRANT EXECUTE ON FUNCTION sync_user_health(UUID) TO authenticated;

-- Función para sincronizar TODOS los usuarios (admin)
CREATE OR REPLACE FUNCTION sync_all_users_health()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER := 0;
  v_user_id UUID;
BEGIN
  FOR v_user_id IN
    SELECT id FROM auth.users
  LOOP
    PERFORM sync_user_health(v_user_id);
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION sync_all_users_health() TO authenticated;

-- Actualizar update_user_health_score para crear el registro si no existe
CREATE OR REPLACE FUNCTION update_user_health_score(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_days_inactive INTEGER;
    v_completed INTEGER;
    v_rating DECIMAL;
    v_logins INTEGER;
    v_score INTEGER := 50;
    v_status TEXT;
BEGIN
    -- Asegurar que existe el registro
    IF NOT EXISTS (SELECT 1 FROM platform_user_health WHERE user_id = p_user_id) THEN
      PERFORM sync_user_health(p_user_id);
    END IF;

    -- Obtener métricas actuales
    SELECT
        days_since_last_activity,
        total_completed_projects,
        average_rating,
        total_logins
    INTO v_days_inactive, v_completed, v_rating, v_logins
    FROM platform_user_health
    WHERE user_id = p_user_id;

    -- Si no existe el registro, no hacer nada
    IF NOT FOUND THEN
        RETURN;
    END IF;

    -- Calcular score base (0-100)
    v_score := 50;

    -- Factor actividad: -2 puntos por día inactivo (max -30)
    IF v_days_inactive IS NOT NULL THEN
        v_score := v_score - LEAST(v_days_inactive * 2, 30);
    END IF;

    -- Factor proyectos: +3 puntos por proyecto completado (max +15)
    IF v_completed IS NOT NULL THEN
        v_score := v_score + LEAST(v_completed * 3, 15);
    END IF;

    -- Factor rating: +5 por rating >= 4.5, +3 por >= 4.0, -5 por < 3.0
    IF v_rating IS NOT NULL THEN
        IF v_rating >= 4.5 THEN v_score := v_score + 5;
        ELSIF v_rating >= 4.0 THEN v_score := v_score + 3;
        ELSIF v_rating < 3.0 THEN v_score := v_score - 5;
        END IF;
    END IF;

    -- Factor logins: +2 por cada 10 logins (max +10)
    IF v_logins IS NOT NULL THEN
        v_score := v_score + LEAST((v_logins / 10) * 2, 10);
    END IF;

    -- Clamp entre 0 y 100
    v_score := GREATEST(0, LEAST(100, v_score));

    -- Determinar status
    IF v_score > 70 THEN
        v_status := 'healthy';
    ELSIF v_score >= 40 THEN
        v_status := 'at_risk';
    ELSE
        v_status := 'churning';
    END IF;

    -- Actualizar
    UPDATE platform_user_health
    SET
        health_score = v_score,
        health_status = v_status,
        needs_attention = (v_score < 50)
    WHERE user_id = p_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION update_user_health_score(UUID) TO authenticated;

-- Ejecutar sincronización inicial para todos los usuarios existentes
SELECT sync_all_users_health();
