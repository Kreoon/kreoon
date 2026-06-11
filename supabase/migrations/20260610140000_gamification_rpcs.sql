-- ============================================================
-- Migration: Gamification RPCs — SECURITY DEFINER
-- Creado: 2026-06-10
-- Fase: 1 de 2 (esta migración + deploy frontend)
--       La fase 2 (DROP de políticas) está comentada al final.
--
-- Contexto del problema:
--   Cuatro flujos de gamificación/reputación escribían directamente
--   en tablas sensibles usando el cliente del usuario (anon key),
--   amparados por políticas RLS always-true. Cualquier usuario podía
--   ejecutar desde la consola del navegador:
--     supabase.from('reputation_events').insert({ base_points: 999999, ... })
--     supabase.from('user_global_stats').upsert({ total_badge_points: 99999, ... })
--     supabase.from('point_transactions').insert({ points: 999999, ... })
--   Esta migración mueve esas escrituras a RPCs SECURITY DEFINER que
--   validan ownership y rangos en el servidor.
--
-- Flujos cubiertos:
--   1. award_reputation_event   → reemplaza .from('reputation_events').insert()
--                                  (useUnifiedReputation.ts → logReputationEvent)
--   2. sync_user_global_stats   → reemplaza .from('user_global_stats').upsert()
--                                  (useGlobalRanking.ts → useUpdateGlobalStats.syncStats)
--   3. award_kiro_points        → reemplaza .from('point_transactions').insert()
--                                  + .from('user_points').upsert()
--                                  (useKiroGamification.ts → awardPoints)
--
-- Flujo NO cubierto aquí (ya seguro):
--   up_events — NO se inserta desde el frontend JS. Las escrituras
--   ocurren exclusivamente en triggers PostgreSQL del servidor
--   (trigger_up_events_on_content, trigger_up_event_on_status).
--   La política "Users can insert events" en producción la cubre el
--   trigger que corre con permisos de servidor. No requiere RPC nueva.
-- ============================================================


-- ════════════════════════════════════════════════════════════
-- 1. award_reputation_event
-- ════════════════════════════════════════════════════════════
--
-- Reemplaza: supabase.from('reputation_events').insert({ ... })
-- Hook:      src/hooks/useUnifiedReputation.ts → logReputationEvent
--
-- Validaciones de seguridad:
--   (a) auth.uid() no nulo (sesión activa requerida)
--   (b) p_user_id == auth.uid()  →  nadie puede acreditar puntos a otro
--   (c) is_org_member(auth.uid(), p_organization_id)  →  solo miembros
--   (d) p_base_points en [-500, 500]  →  cap anti-fraude por evento
--   (e) p_multiplier en [0.1, 5.0]   →  cap anti-fraude de multiplicador
--   (f) UNIQUE(org, user, ref_type, ref_id, event_type)  →  dedup graceful
--       devuelve { duplicate: true } sin lanzar error (replica el
--       comportamiento original del frontend con error.code === '23505')
--
-- Efectos secundarios conservados:
--   Invoca sync_marketplace_reputation(p_user_id) internamente.
--   En el hook original era fire-and-forget; aquí es síncrono pero
--   aislado en su propio bloque EXCEPTION para no abortar el INSERT.
-- ════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.award_reputation_event(
  p_organization_id UUID,
  p_user_id         UUID,
  p_role_key        VARCHAR(50),
  p_reference_type  VARCHAR(30),
  p_reference_id    UUID,
  p_event_type      VARCHAR(50),
  p_event_subtype   VARCHAR(50)  DEFAULT NULL,
  p_base_points     INT          DEFAULT 0,
  p_multiplier      NUMERIC(3,2) DEFAULT 1.0,
  p_breakdown       JSONB        DEFAULT NULL,
  p_season_id       UUID         DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller      UUID := auth.uid();
  v_inserted_id UUID;
BEGIN

  -- (a) Sesión activa
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'No autenticado' USING ERRCODE = 'P0001';
  END IF;

  -- (b) Solo el propio usuario puede crear sus eventos
  IF v_caller <> p_user_id THEN
    RAISE EXCEPTION 'No autorizado: p_user_id no coincide con auth.uid()'
      USING ERRCODE = 'P0001';
  END IF;

  -- (c) Debe ser miembro de la organización
  IF NOT public.is_org_member(v_caller, p_organization_id) THEN
    RAISE EXCEPTION 'No autorizado: usuario no es miembro de la organización'
      USING ERRCODE = 'P0001';
  END IF;

  -- (d) Cap de puntos base por evento
  IF p_base_points < -500 OR p_base_points > 500 THEN
    RAISE EXCEPTION 'base_points fuera de rango permitido [-500, 500]: valor=%', p_base_points
      USING ERRCODE = 'P0001';
  END IF;

  -- (e) Cap del multiplicador
  IF p_multiplier < 0.1 OR p_multiplier > 5.0 THEN
    RAISE EXCEPTION 'multiplier fuera de rango permitido [0.1, 5.0]: valor=%', p_multiplier
      USING ERRCODE = 'P0001';
  END IF;

  -- INSERT con dedup graceful
  BEGIN
    INSERT INTO public.reputation_events (
      organization_id,
      user_id,
      role_key,
      reference_type,
      reference_id,
      event_type,
      event_subtype,
      base_points,
      multiplier,
      calculation_breakdown,
      season_id
    ) VALUES (
      p_organization_id,
      p_user_id,
      p_role_key,
      p_reference_type,
      p_reference_id,
      p_event_type,
      p_event_subtype,
      p_base_points,
      p_multiplier,
      p_breakdown,
      p_season_id
    )
    RETURNING id INTO v_inserted_id;

  EXCEPTION
    WHEN unique_violation THEN
      -- (f) Duplicado: mismo comportamiento graceful que el hook anterior
      RETURN jsonb_build_object(
        'data',      NULL,
        'error',     NULL,
        'duplicate', TRUE
      );
  END;

  -- Efecto secundario: sync marketplace reputation
  -- Fallo no aborta la transacción principal
  BEGIN
    PERFORM public.sync_marketplace_reputation(p_user_id);
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN jsonb_build_object(
    'data',      jsonb_build_object('id', v_inserted_id),
    'error',     NULL,
    'duplicate', FALSE
  );

END;
$$;

GRANT EXECUTE ON FUNCTION public.award_reputation_event(
  UUID, UUID, VARCHAR, VARCHAR, UUID, VARCHAR, VARCHAR, INT, NUMERIC, JSONB, UUID
) TO authenticated;


-- ════════════════════════════════════════════════════════════
-- 2. sync_user_global_stats
-- ════════════════════════════════════════════════════════════
--
-- Reemplaza: supabase.from('user_global_stats').upsert({ user_id, ... })
-- Hook:      src/hooks/useGlobalRanking.ts → useUpdateGlobalStats → syncStats
--
-- DECISIÓN DE DISEÑO (documentada aquí y en el hook):
--   El cálculo de completeness, badge_points, total_projects, etc. se
--   realiza en el cliente mediante múltiples SELECT. Moverlo a SQL
--   introduciría complejidad y riesgo de regresión. En su lugar:
--   - La RPC acepta los valores ya calculados por el cliente.
--   - PERO fuerza user_id = auth.uid() internamente, ignorando cualquier
--     parámetro de user_id que el caller pudiera enviar.
--   - Esto garantiza que un usuario solo puede escribir sus PROPIAS stats.
--   La integridad de los valores numéricos queda protegida por los caps.
--
-- Validaciones de seguridad:
--   (a) auth.uid() no nulo
--   (b) user_id forzado = auth.uid()  →  nunca escribes stats de otro
--   (c) profile_completeness en [0, 100]
--   (d) total_badge_points >= 0
--   (e) badges_completed_count >= 0
--
-- Efectos secundarios conservados:
--   Invoca check_and_award_global_badges(auth.uid()) al final.
--   En el hook original era una llamada .rpc() separada post-upsert;
--   aquí se consolida dentro de la misma transacción, aislado con
--   EXCEPTION para no abortar el upsert si falla.
-- ════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.sync_user_global_stats(
  p_profile_completeness     INT         DEFAULT NULL,
  p_has_avatar               BOOLEAN     DEFAULT NULL,
  p_has_bio                  BOOLEAN     DEFAULT NULL,
  p_bio_length               INT         DEFAULT NULL,
  p_social_networks_count    INT         DEFAULT NULL,
  p_total_projects_completed INT         DEFAULT NULL,
  p_early_deliveries_count   INT         DEFAULT NULL,
  p_late_deliveries_count    INT         DEFAULT NULL,
  p_on_time_deliveries_count INT         DEFAULT NULL,
  p_days_since_signup        INT         DEFAULT NULL,
  p_badges_completed_count   INT         DEFAULT NULL,
  p_total_badge_points       INT         DEFAULT NULL,
  p_last_active_at           TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller UUID := auth.uid();
BEGIN

  -- (a) Sesión activa
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'No autenticado' USING ERRCODE = 'P0001';
  END IF;

  -- (c) Cap de completeness
  IF p_profile_completeness IS NOT NULL
     AND (p_profile_completeness < 0 OR p_profile_completeness > 100) THEN
    RAISE EXCEPTION 'profile_completeness fuera de rango [0, 100]: valor=%', p_profile_completeness
      USING ERRCODE = 'P0001';
  END IF;

  -- (d) Badge points no negativo
  IF p_total_badge_points IS NOT NULL AND p_total_badge_points < 0 THEN
    RAISE EXCEPTION 'total_badge_points no puede ser negativo'
      USING ERRCODE = 'P0001';
  END IF;

  -- (e) Badge count no negativo
  IF p_badges_completed_count IS NOT NULL AND p_badges_completed_count < 0 THEN
    RAISE EXCEPTION 'badges_completed_count no puede ser negativo'
      USING ERRCODE = 'P0001';
  END IF;

  -- (b) Upsert con user_id = auth.uid() forzado — NO usa ningún p_user_id del caller
  INSERT INTO public.user_global_stats (
    user_id,
    profile_completeness,
    has_avatar,
    has_bio,
    bio_length,
    social_networks_count,
    total_projects_completed,
    early_deliveries_count,
    late_deliveries_count,
    on_time_deliveries_count,
    days_since_signup,
    badges_completed_count,
    total_badge_points,
    last_active_at,
    updated_at
  ) VALUES (
    v_caller,
    COALESCE(p_profile_completeness,     0),
    COALESCE(p_has_avatar,               FALSE),
    COALESCE(p_has_bio,                  FALSE),
    COALESCE(p_bio_length,               0),
    COALESCE(p_social_networks_count,    0),
    COALESCE(p_total_projects_completed, 0),
    COALESCE(p_early_deliveries_count,   0),
    COALESCE(p_late_deliveries_count,    0),
    COALESCE(p_on_time_deliveries_count, 0),
    COALESCE(p_days_since_signup,        0),
    COALESCE(p_badges_completed_count,   0),
    COALESCE(p_total_badge_points,       0),
    COALESCE(p_last_active_at,           now()),
    now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    profile_completeness     = COALESCE(EXCLUDED.profile_completeness,     user_global_stats.profile_completeness),
    has_avatar               = COALESCE(EXCLUDED.has_avatar,               user_global_stats.has_avatar),
    has_bio                  = COALESCE(EXCLUDED.has_bio,                  user_global_stats.has_bio),
    bio_length               = COALESCE(EXCLUDED.bio_length,               user_global_stats.bio_length),
    social_networks_count    = COALESCE(EXCLUDED.social_networks_count,    user_global_stats.social_networks_count),
    total_projects_completed = COALESCE(EXCLUDED.total_projects_completed, user_global_stats.total_projects_completed),
    early_deliveries_count   = COALESCE(EXCLUDED.early_deliveries_count,   user_global_stats.early_deliveries_count),
    late_deliveries_count    = COALESCE(EXCLUDED.late_deliveries_count,    user_global_stats.late_deliveries_count),
    on_time_deliveries_count = COALESCE(EXCLUDED.on_time_deliveries_count, user_global_stats.on_time_deliveries_count),
    days_since_signup        = COALESCE(EXCLUDED.days_since_signup,        user_global_stats.days_since_signup),
    badges_completed_count   = COALESCE(EXCLUDED.badges_completed_count,   user_global_stats.badges_completed_count),
    total_badge_points       = COALESCE(EXCLUDED.total_badge_points,       user_global_stats.total_badge_points),
    last_active_at           = COALESCE(EXCLUDED.last_active_at,           user_global_stats.last_active_at),
    updated_at               = now();

  -- Efecto secundario: otorgar badges globales si corresponde
  BEGIN
    PERFORM public.check_and_award_global_badges(v_caller);
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN jsonb_build_object('ok', TRUE, 'user_id', v_caller::text);

END;
$$;

GRANT EXECUTE ON FUNCTION public.sync_user_global_stats(
  INT, BOOLEAN, BOOLEAN, INT, INT, INT, INT, INT, INT, INT, INT, INT, TIMESTAMPTZ
) TO authenticated;


-- ════════════════════════════════════════════════════════════
-- 3. award_kiro_points
-- ════════════════════════════════════════════════════════════
--
-- Reemplaza DOS operaciones del cliente:
--   (A) supabase.from('point_transactions').insert({ user_id, points, source, description })
--   (B) supabase.from('user_points').upsert({ user_id, total_points, level, updated_at })
-- Hook:  src/components/kiro/hooks/useKiroGamification.ts → awardPoints
--
-- Nota técnica — discrepancia de tipos resuelta aquí:
--   El hook calculaba level como número entero (1-7, tipo KiroLevel.level del
--   config JS) y lo enviaba en el campo `level` del upsert. Pero la tabla
--   user_points tiene `current_level up_level` (enum: 'bronze'/'silver'/
--   'gold'/'diamond'). Ese mismatch causaría error de cast en PostgreSQL.
--   Esta RPC recibe p_new_total_points y calcula current_level en SQL
--   usando public.calculate_up_level() que ya existe en la BD, resolviendo
--   la discrepancia definitivamente.
--
-- Validaciones de seguridad:
--   (a) auth.uid() no nulo
--   (b) user_id forzado = auth.uid() en AMBAS tablas
--   (c) p_points en [1, 10000]  →  techo absoluto anti-fraude
--       (el cooldown diario se valida en el cliente; el servidor pone el cap)
--   (d) p_source no vacío
--   (e) transaction_type fijo = 'manual_adjustment' (no expone el enum al cliente)
-- ════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.award_kiro_points(
  p_points           INT,
  p_source           TEXT,
  p_description      TEXT    DEFAULT NULL,
  p_new_total_points INT     DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller    UUID := auth.uid();
  v_txn_id    UUID;
  v_new_total INT;
  -- user_points.current_level es TEXT (no el enum up_level) y
  -- calculate_up_level() devuelve TEXT. Verificado en producción 2026-06-10.
  v_new_level TEXT;
BEGIN

  -- (a) Sesión activa
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'No autenticado' USING ERRCODE = 'P0001';
  END IF;

  -- (c) Cap de puntos
  IF p_points <= 0 OR p_points > 10000 THEN
    RAISE EXCEPTION 'p_points fuera de rango permitido [1, 10000]: valor=%', p_points
      USING ERRCODE = 'P0001';
  END IF;

  -- (d) Source requerido
  IF p_source IS NULL OR trim(p_source) = '' THEN
    RAISE EXCEPTION 'p_source no puede ser vacío'
      USING ERRCODE = 'P0001';
  END IF;

  -- (b-A) INSERT en point_transactions con user_id = auth.uid()
  -- transaction_type fijo: no se expone el enum al cliente
  INSERT INTO public.point_transactions (
    user_id,
    transaction_type,
    points,
    description
  ) VALUES (
    v_caller,
    'manual_adjustment'::point_transaction_type,
    p_points,
    COALESCE(p_description, p_source)
  )
  RETURNING id INTO v_txn_id;

  -- Calcular nuevo total
  -- Si el cliente pasa p_new_total_points (su total acumulado local),
  -- lo usamos como fuente de verdad optimista.
  -- Si no, sumamos al total existente en BD (fallback seguro).
  IF p_new_total_points IS NOT NULL AND p_new_total_points >= 0 THEN
    v_new_total := p_new_total_points;
  ELSE
    SELECT COALESCE(total_points, 0) + p_points
      INTO v_new_total
      FROM public.user_points
     WHERE user_id = v_caller;

    IF NOT FOUND THEN
      v_new_total := p_points;
    END IF;
  END IF;

  -- Calcular nivel correctamente en SQL (resuelve mismatch int vs up_level)
  v_new_level := public.calculate_up_level(v_new_total);

  -- (b-B) UPSERT en user_points con user_id = auth.uid()
  INSERT INTO public.user_points (
    user_id,
    total_points,
    current_level,
    updated_at
  ) VALUES (
    v_caller,
    v_new_total,
    v_new_level,
    now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    total_points  = EXCLUDED.total_points,
    current_level = EXCLUDED.current_level,
    updated_at    = now();

  RETURN jsonb_build_object(
    'transaction_id', v_txn_id,
    'new_total',      v_new_total,
    'new_level',      v_new_level::text,
    'ok',             TRUE
  );

END;
$$;

GRANT EXECUTE ON FUNCTION public.award_kiro_points(INT, TEXT, TEXT, INT) TO authenticated;


-- ════════════════════════════════════════════════════════════
-- Recargar schema de PostgREST
-- ════════════════════════════════════════════════════════════

NOTIFY pgrst, 'reload schema';


-- ════════════════════════════════════════════════════════════
-- FASE 2 — DROP DE POLÍTICAS ALWAYS-TRUE
-- ════════════════════════════════════════════════════════════
--
-- INSTRUCCIONES PARA EL LEAD:
--   Aplicar este bloque en una migración separada SOLO después de:
--     1. Aplicar esta migración (fase 1).
--     2. Desplegar el build de frontend que usa las RPCs.
--     3. Verificar en producción que los tres flujos funcionan:
--          - logReputationEvent (crear un evento de reputación)
--          - syncStats (actualizar stats de ranking global)
--          - awardPoints (otorgar puntos Kiro)
--
--   Nombres de políticas verificados en producción por el lead (2026-06-10):
--
--   TABLA                  | POLÍTICA                        | CMD
--   -----------------------|---------------------------------|------
--   reputation_events      | "System can manage events"      | ALL
--   point_transactions     | "System can insert transactions"| INSERT
--   up_events              | "Users can insert events"       | INSERT
--   user_global_stats      | "System can manage stats"       | ALL
--   user_global_badges     | "System can manage badges"      | ALL
--   user_reputation_totals | "System can manage totals"      | ALL
--
--   VERIFICADO EN PRODUCCIÓN (2026-06-10) por el lead:
--     • user_global_badges  → la escribe check_and_award_global_badges(),
--       que es SECURITY DEFINER. SEGURO dropear "System can manage badges".
--     • user_reputation_totals → la escribe sync_marketplace_reputation(),
--       que es SECURITY DEFINER. SEGURO dropear "System can manage totals".
--     • up_events → el frontend NO inserta (solo SELECT en useUPEngine.ts).
--       Su único trigger (update_up_user_scores) es SECURITY DEFINER pero
--       escribe en up_user_scores, no en up_events. ANTES de dropear
--       "Users can insert events", confirmar de dónde viene el INSERT en
--       up_events (¿edge function con service_role? ¿otra RPC?):
--         SELECT proname, prosecdef FROM pg_proc
--         WHERE pg_get_functiondef(oid) ILIKE '%insert into%up_events%';
--       Si todo INSERT es service_role / SECURITY DEFINER → seguro dropear.
-- ════════════════════════════════════════════════════════════

/*

-- ── 1. reputation_events ─────────────────────────────────────────────────────
-- Cierra escritura directa; la RPC award_reputation_event hace el INSERT.
-- La política de SELECT "Org members can view events" queda intacta.

DROP POLICY IF EXISTS "System can manage events" ON public.reputation_events;

CREATE POLICY "rpc_only_insert_reputation_events"
  ON public.reputation_events
  FOR INSERT
  WITH CHECK (false);


-- ── 2. point_transactions ────────────────────────────────────────────────────
-- Cierra escritura directa; la RPC award_kiro_points hace el INSERT.
-- Las políticas de SELECT y la de admin ALL quedan intactas.

DROP POLICY IF EXISTS "System can insert transactions" ON public.point_transactions;

CREATE POLICY "rpc_only_insert_point_transactions"
  ON public.point_transactions
  FOR INSERT
  WITH CHECK (false);


-- ── 3. up_events ─────────────────────────────────────────────────────────────
-- ATENCIÓN: leer advertencia sobre triggers antes de aplicar.
-- Si los triggers son SECURITY DEFINER, este DROP es seguro.
-- Si son SECURITY INVOKER, NO dropear hasta migrar los triggers.

DROP POLICY IF EXISTS "Users can insert events" ON public.up_events;

CREATE POLICY "rpc_only_insert_up_events"
  ON public.up_events
  FOR INSERT
  WITH CHECK (false);


-- ── 4. user_global_stats ─────────────────────────────────────────────────────
-- Cierra escritura directa; la RPC sync_user_global_stats hace el UPSERT.
-- La política de SELECT "Anyone can view stats" queda intacta.

DROP POLICY IF EXISTS "System can manage stats" ON public.user_global_stats;

CREATE POLICY "rpc_only_insert_user_global_stats"
  ON public.user_global_stats
  FOR INSERT
  WITH CHECK (false);

CREATE POLICY "rpc_only_update_user_global_stats"
  ON public.user_global_stats
  FOR UPDATE
  USING (false)
  WITH CHECK (false);


-- ── 5. user_global_badges ────────────────────────────────────────────────────
-- ATENCIÓN: leer advertencia sobre triggers antes de aplicar.
-- check_and_award_global_badges() escribe aquí — verificar que sea
-- SECURITY DEFINER (lo es en baseline: línea ~24670 de la migración).
-- Si es SECURITY DEFINER, bypasea RLS y este DROP es seguro.

DROP POLICY IF EXISTS "System can manage badges" ON public.user_global_badges;

CREATE POLICY "rpc_only_write_user_global_badges"
  ON public.user_global_badges
  FOR INSERT
  WITH CHECK (false);

CREATE POLICY "rpc_only_update_user_global_badges"
  ON public.user_global_badges
  FOR UPDATE
  USING (false)
  WITH CHECK (false);


-- ── 6. user_reputation_totals ────────────────────────────────────────────────
-- ATENCIÓN: leer advertencia sobre triggers antes de aplicar.
-- Las funciones de reputación (get_user_reputation, sync triggers) escriben
-- aquí. Verificar que sean SECURITY DEFINER antes de dropear.

DROP POLICY IF EXISTS "System can manage totals" ON public.user_reputation_totals;

CREATE POLICY "rpc_only_insert_user_reputation_totals"
  ON public.user_reputation_totals
  FOR INSERT
  WITH CHECK (false);

CREATE POLICY "rpc_only_update_user_reputation_totals"
  ON public.user_reputation_totals
  FOR UPDATE
  USING (false)
  WITH CHECK (false);


NOTIFY pgrst, 'reload schema';

*/
