-- =====================================================================================
-- Fix de escala en sync_marketplace_reputation
-- Fecha: 2026-08-12
-- =====================================================================================
--
-- BUG: marketplace_reputation.on_time_delivery_rate es numeric(5,4) -> guarda una
-- FRACCIÓN 0-1, no un porcentaje. La primera versión de la reescritura escribía 0-100,
-- lo que provocaba "numeric field overflow" (22003) para cualquier talento con
-- puntualidad >= 10%. La excepción quedaba tragada por el backfill y esas filas
-- conservaban sus valores UP viejos (global_score de hasta 5.020 en una escala 0-100).
--
-- FIX: escribir ROUND(v_on_time_pct / 100, 4). El resto de la función no cambia.
-- Al final se re-ejecuta el backfill, ahora SIN capturar excepciones para que un
-- fallo aborte la migración en vez de pasar desapercibido.
--
-- NOTA: la migración 20260812020000_rewrite_reputation_without_up.sql ya lleva este
-- fix incorporado; este archivo existe para reflejar en el repo la corrección aplicada
-- por separado sobre la base remota. Ambas son idempotentes.
-- =====================================================================================

CREATE OR REPLACE FUNCTION public.sync_marketplace_reputation(p_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_rating_sum        numeric := 0;   -- suma de todas las valoraciones 1-5
  v_rating_n          integer := 0;   -- nº de valoraciones
  v_avg_rating        numeric;        -- NULL si no hay ninguna
  v_projects          integer := 0;   -- entregas reales
  v_on_time_total     integer := 0;   -- entregas con deadline
  v_on_time_ok        integer := 0;   -- entregas con deadline cumplido
  v_on_time_pct       numeric;        -- 0-100. NULL si no hay denominador
  v_score             numeric;
BEGIN
  -- ---------------------------------------------------------------------------------
  -- CALIDAD: creator_reviews + estrellas del board
  -- ---------------------------------------------------------------------------------
  SELECT COALESCE(SUM(r.rating), 0), COALESCE(COUNT(*), 0)
  INTO v_rating_sum, v_rating_n
  FROM (
    SELECT cr.rating::numeric AS rating
    FROM public.creator_reviews cr
    WHERE cr.creator_id = p_user_id AND cr.rating IS NOT NULL

    UNION ALL
    SELECT c.creator_rating::numeric
    FROM public.content c
    WHERE c.creator_id = p_user_id AND c.creator_rating IS NOT NULL

    UNION ALL
    SELECT c.editor_rating::numeric
    FROM public.content c
    WHERE c.editor_id = p_user_id AND c.editor_rating IS NOT NULL

    UNION ALL
    SELECT c.strategy_rating::numeric
    FROM public.content c
    WHERE c.strategist_id = p_user_id AND c.strategy_rating IS NOT NULL
  ) r;

  v_avg_rating := CASE WHEN v_rating_n > 0 THEN ROUND(v_rating_sum / v_rating_n, 2) ELSE NULL END;

  -- ---------------------------------------------------------------------------------
  -- VOLUMEN: entregas reales (cada fila cuenta una sola vez aunque el usuario
  -- figure a la vez como creador y editor)
  -- ---------------------------------------------------------------------------------
  SELECT COUNT(*)
  INTO v_projects
  FROM public.content c
  WHERE c.status IN ('approved', 'paid', 'delivered')
    AND c.deleted_at IS NULL
    AND (c.creator_id = p_user_id OR c.editor_id = p_user_id);

  v_projects := v_projects + (
    SELECT COUNT(*)
    FROM public.marketplace_projects mp
    WHERE mp.status IN ('completed', 'approved', 'paid', 'delivered')
      AND (mp.creator_id = p_user_id OR mp.editor_id = p_user_id)
  );

  -- ---------------------------------------------------------------------------------
  -- PUNTUALIDAD: solo entregas con fecha de entrega Y fecha límite
  -- ---------------------------------------------------------------------------------
  SELECT COUNT(*), COUNT(*) FILTER (WHERE t.on_time)
  INTO v_on_time_total, v_on_time_ok
  FROM (
    SELECT (c.delivered_at <= c.deadline) AS on_time
    FROM public.content c
    WHERE c.deadline IS NOT NULL
      AND c.delivered_at IS NOT NULL
      AND c.deleted_at IS NULL
      AND (c.creator_id = p_user_id OR c.editor_id = p_user_id)

    UNION ALL
    SELECT (mp.completed_at <= mp.deadline)
    FROM public.marketplace_projects mp
    WHERE mp.deadline IS NOT NULL
      AND mp.completed_at IS NOT NULL
      AND (mp.creator_id = p_user_id OR mp.editor_id = p_user_id)
  ) t;

  v_on_time_pct := CASE
    WHEN v_on_time_total > 0 THEN ROUND(v_on_time_ok::numeric / v_on_time_total * 100, 2)
    ELSE NULL   -- sin datos: NO es 0% (eso penalizaría a quien nunca tuvo deadline)
  END;

  -- ---------------------------------------------------------------------------------
  -- SCORE + NIVEL
  -- ---------------------------------------------------------------------------------
  v_score := public.calculate_talent_score(v_avg_rating, v_projects, v_on_time_pct);

  INSERT INTO public.marketplace_reputation (
    user_id, global_score, global_level, total_projects_completed,
    avg_rating, on_time_delivery_rate, last_synced_at
  )
  VALUES (
    p_user_id,
    ROUND(v_score)::integer,
    CASE
      WHEN v_score >= 85 THEN 'Legend'
      WHEN v_score >= 70 THEN 'Master'
      WHEN v_score >= 50 THEN 'Elite'
      WHEN v_score >= 30 THEN 'Pro'
      ELSE 'Novato'
    END,
    v_projects,
    COALESCE(v_avg_rating, 0),
    -- OJO: la columna es numeric(5,4) -> guarda FRACCIÓN 0-1, no porcentaje.
    -- Escribir 100 desborda. NULL cuando no hay señal (la columna es nullable).
    ROUND(v_on_time_pct / 100, 4),
    now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    global_score             = EXCLUDED.global_score,
    global_level             = EXCLUDED.global_level,
    total_projects_completed = EXCLUDED.total_projects_completed,
    avg_rating               = EXCLUDED.avg_rating,
    on_time_delivery_rate    = EXCLUDED.on_time_delivery_rate,
    last_synced_at           = now();
END;
$function$;

COMMENT ON FUNCTION public.sync_marketplace_reputation(uuid) IS
  'Recalcula marketplace_reputation desde creator_reviews + estrellas del board + entregas reales (content/marketplace_projects) + puntualidad. Sin dependencias del módulo UP. global_score es 0-100; on_time_delivery_rate es fracción 0-1.';

-- Re-backfill completo (ahora sin overflow). Sin EXCEPTION: si algo falla, la migración aborta.
DO $backfill$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT user_id FROM public.marketplace_reputation
    UNION
    SELECT creator_id FROM public.creator_reviews WHERE creator_id IS NOT NULL
    UNION
    SELECT creator_id FROM public.content
      WHERE creator_id IS NOT NULL AND deleted_at IS NULL
        AND status IN ('approved','paid','delivered')
    UNION
    SELECT editor_id FROM public.content
      WHERE editor_id IS NOT NULL AND deleted_at IS NULL
        AND status IN ('approved','paid','delivered')
    UNION
    SELECT creator_id FROM public.marketplace_projects
      WHERE status IN ('completed','approved','paid','delivered')
    UNION
    SELECT editor_id FROM public.marketplace_projects
      WHERE editor_id IS NOT NULL AND status IN ('completed','approved','paid','delivered')
  LOOP
    PERFORM public.sync_marketplace_reputation(r.user_id);
  END LOOP;
END;
$backfill$;
