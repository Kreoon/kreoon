-- =====================================================
-- FIX SEASON POINTS
-- Los eventos de reputación no tenían season_id
-- Esto causaba que los puntos de temporada no se sumaran
-- =====================================================

-- 1. Actualizar eventos existentes con el season_id correcto
-- basado en la fecha del evento y la temporada activa en ese momento
UPDATE public.reputation_events re
SET season_id = (
  SELECT rs.id
  FROM public.reputation_seasons rs
  WHERE rs.organization_id = re.organization_id
    AND re.event_date >= rs.start_date
    AND re.event_date <= rs.end_date
  ORDER BY rs.start_date DESC
  LIMIT 1
)
WHERE re.season_id IS NULL;

-- 2. Recalcular los puntos de temporada para cada usuario/rol
-- Primero, calculamos los totales correctos
WITH correct_season_totals AS (
  SELECT
    re.organization_id,
    re.user_id,
    re.role_key,
    re.season_id,
    SUM(re.final_points) AS total_season_points,
    COUNT(*) AS total_season_tasks
  FROM public.reputation_events re
  WHERE re.season_id IS NOT NULL
  GROUP BY re.organization_id, re.user_id, re.role_key, re.season_id
),
-- Obtener la temporada activa por organización
active_seasons AS (
  SELECT id, organization_id
  FROM public.reputation_seasons
  WHERE is_active = true
)
-- Actualizar user_reputation_totals con los puntos correctos de la temporada activa
UPDATE public.user_reputation_totals urt
SET
  season_points = COALESCE(cst.total_season_points, 0),
  season_tasks = COALESCE(cst.total_season_tasks, 0)
FROM active_seasons acts
LEFT JOIN correct_season_totals cst ON
  cst.organization_id = acts.organization_id
  AND cst.user_id = urt.user_id
  AND cst.role_key = urt.role_key
  AND cst.season_id = acts.id
WHERE urt.organization_id = acts.organization_id;

-- 3. Log del resultado
DO $$
DECLARE
  v_updated_events INTEGER;
  v_updated_totals INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_updated_events
  FROM public.reputation_events
  WHERE season_id IS NOT NULL;

  SELECT COUNT(*) INTO v_updated_totals
  FROM public.user_reputation_totals
  WHERE season_points > 0;

  RAISE NOTICE 'Eventos con season_id: %, Usuarios con season_points: %',
    v_updated_events, v_updated_totals;
END $$;
