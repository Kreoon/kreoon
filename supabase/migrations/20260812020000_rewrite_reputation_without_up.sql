-- =====================================================================================
-- Reescritura de la reputación y el ranking de talento SIN el módulo UP
-- Fecha: 2026-08-12
-- =====================================================================================
--
-- CONTEXTO
-- El módulo UP se elimina. Las funciones de reputación/ranking leían tablas UP
-- (user_reputation_totals, up_user_scores, up_creadores_totals, up_editores_totals,
-- up_quality_scores). Esta migración las reescribe sobre señales reales del producto.
--
-- SEÑALES NUEVAS (qué sustituye a qué)
--   UP lifetime_points            -> score 0-100 calculado (calidad + volumen + puntualidad)
--   UP lifetime_tasks             -> entregas reales:
--                                     · content con status IN ('approved','paid','delivered')
--                                     · marketplace_projects con status IN
--                                       ('completed','approved','paid','delivered')
--   UP on_time_rate               -> puntualidad del board:
--                                     · content.delivered_at <= content.deadline
--                                     · marketplace_projects.completed_at <= deadline
--                                    (solo filas con AMBAS fechas no nulas)
--   up_quality_scores.score       -> estrellas del board (content.creator_rating /
--                                    editor_rating / strategy_rating, escala 1-5)
--                                    + creator_reviews.rating (escala 1-5)
--   up_creadores/editores_totals  -> mismo score 0-100, calculado por organización
--   up_user_scores                -> idem
--
-- FÓRMULA DE global_score (0-100, pesos renormalizados sobre los componentes disponibles)
--   score = ( 40 * (avg_rating/5) + 35 * MIN(entregas/20,1) + 25 * (on_time_pct/100) )
--           / (suma de los pesos de los componentes que SÍ tienen datos)
--   · calidad (40): media combinada de creator_reviews.rating y las estrellas del board.
--                   NULL si el talento no tiene ninguna valoración -> el peso se descarta.
--   · volumen (35): entregas aprobadas/pagadas/entregadas, saturando en 20 entregas = 100%.
--                   Siempre computable (0 entregas = 0%), así que el denominador nunca es 0.
--   · puntualidad (25): % de entregas con fecha límite cumplida.
--                   NULL si no hay ninguna entrega con deadline -> el peso se descarta.
--
-- CAMBIO DE ESCALA (IMPORTANTE)
--   marketplace_reputation.global_score pasa de "puntos UP acumulados" (valores actuales
--   entre 10 y 5.660) a un score 0-100. Los umbrales de calculate_reputation_level
--   (500/2000/5000/15000 puntos) ya no aplican: el nivel se calcula con umbrales de score
--   dentro de sync_marketplace_reputation, conservando el mismo vocabulario
--   (Novato / Pro / Elite / Master / Legend). calculate_reputation_level(integer) NO se
--   modifica ni se borra aquí (puede tener otros consumidores).
--   Lo mismo aplica a up_points en el módulo de Talento: pasa a ser el score 0-100.
--   up_level conserva el vocabulario bronze/silver/gold/diamond que ya pinta la UI.
--
-- ESTADO DE LOS DATOS AL ESCRIBIR ESTA MIGRACIÓN (2026-08-11)
--   creator_reviews ................................ 0 filas
--   marketplace_projects ........................... 0 filas
--   content con status approved/paid ............... 43 (11 creadores, 5 editores)
--   content con status approved/paid/delivered ..... 45
--   content con deadline Y delivered_at ............ 24 (3 a tiempo -> 12,5%; 8 creadores)
--   content con estrellas (creator/editor/strategy)  0 de 567 filas
--   marketplace_reputation ......................... 40 filas (se recalculan al final)
--   => Hoy la señal de CALIDAD está vacía: el score saldrá de volumen + puntualidad.
--      Es esperado y el score se renormaliza solo; en cuanto entren reviews o estrellas,
--      la calidad entra sin tocar nada.
--
-- QUÉ SE ELIMINA
--   refresh_reputation_global(uuid): leía up_user_scores y escribía reputation_global
--   (tabla que también se va). Sin ningún caller en BD ni en src/. Se DROPea.
--
-- =====================================================================================


-- =====================================================================================
-- 1) HELPERS
-- =====================================================================================

-- Score 0-100 con renormalización de pesos según los componentes disponibles.
CREATE OR REPLACE FUNCTION public.calculate_talent_score(
  p_avg_rating  numeric,   -- 0-5, NULL si no hay ninguna valoración
  p_deliveries  integer,   -- entregas aprobadas/pagadas/entregadas
  p_on_time_pct numeric    -- 0-100, NULL si no hay entregas con deadline
)
RETURNS numeric
LANGUAGE sql
IMMUTABLE
AS $function$
  SELECT ROUND(
    (
      COALESCE(p_avg_rating / 5.0 * 100.0 * 0.40, 0)
      + LEAST(COALESCE(p_deliveries, 0)::numeric / 20.0, 1.0) * 100.0 * 0.35
      + COALESCE(p_on_time_pct * 0.25, 0)
    )
    / (
      0.35
      + CASE WHEN p_avg_rating  IS NOT NULL THEN 0.40 ELSE 0 END
      + CASE WHEN p_on_time_pct IS NOT NULL THEN 0.25 ELSE 0 END
    )
  , 2);
$function$;

COMMENT ON FUNCTION public.calculate_talent_score(numeric, integer, numeric) IS
  'Score de talento 0-100: 40% calidad (rating 1-5), 35% volumen (satura en 20 entregas), 25% puntualidad. Los pesos de los componentes sin datos se descartan y el resto se renormaliza.';

-- Nivel visual del módulo de Talento. Vocabulario bronze/silver/gold/diamond:
-- es el que ya interpretan TalentCard/UnifiedTalentCard para los colores del badge.
CREATE OR REPLACE FUNCTION public.calculate_talent_level(p_score numeric)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $function$
  SELECT CASE
    WHEN p_score >= 85 THEN 'diamond'
    WHEN p_score >= 65 THEN 'gold'
    WHEN p_score >= 40 THEN 'silver'
    ELSE 'bronze'
  END;
$function$;

COMMENT ON FUNCTION public.calculate_talent_level(numeric) IS
  'Traduce el score 0-100 de calculate_talent_score al vocabulario bronze/silver/gold/diamond que pinta la UI de Talento.';


-- =====================================================================================
-- 2) sync_marketplace_reputation(uuid)
--    Reputación GLOBAL del creador (no escopeada por organización).
--    Firma, retorno, lenguaje, SECURITY DEFINER y search_path se conservan.
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
  v_on_time_pct       numeric;        -- NULL si no hay denominador
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
    -- Escribir 100 desborda ("numeric field overflow"). NULL cuando no hay señal.
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
  'Recalcula marketplace_reputation desde creator_reviews + estrellas del board + entregas reales (content/marketplace_projects) + puntualidad. Sin dependencias del módulo UP. global_score es 0-100.';


-- =====================================================================================
-- 3) get_org_talent_roster(uuid)
--    MISMA firma y MISMAS 25 columnas de salida. Solo cambia el origen de
--    up_points / up_level: ya no viene de up_creadores_totals / up_editores_totals.
-- =====================================================================================

CREATE OR REPLACE FUNCTION public.get_org_talent_roster(p_organization_id uuid)
 RETURNS TABLE(id uuid, full_name text, email text, avatar_url text, phone text, bio text, role text, content_count bigint, is_ambassador boolean, quality_score_avg numeric, reliability_score numeric, velocity_score numeric, ai_recommended_level text, ai_risk_flag text, ambassador_level text, editor_rating numeric, editor_completed_count integer, editor_on_time_count integer, active_tasks bigint, up_points numeric, up_level text, avg_creator_rating numeric, avg_editor_rating numeric, avg_strategy_rating numeric, avg_star_rating numeric, rated_content_count bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT public.assert_org_member(p_organization_id);
  WITH members AS (
    SELECT DISTINCT ON (omr.user_id)
      omr.user_id,
      omr.role AS canonical_role
    FROM organization_member_roles omr
    WHERE omr.organization_id = p_organization_id
      AND omr.role IN ('content_creator','editor','digital_strategist','creative_strategist','community_manager')
    ORDER BY omr.user_id,
      CASE omr.role
        WHEN 'editor' THEN 1
        WHEN 'content_creator' THEN 2
        WHEN 'digital_strategist' THEN 3
        WHEN 'creative_strategist' THEN 4
        WHEN 'community_manager' THEN 5
      END
  ),
  ambassador_roles AS (
    SELECT DISTINCT omr.user_id
    FROM organization_member_roles omr
    WHERE omr.organization_id = p_organization_id AND omr.role = 'ambassador'
  ),
  member_data AS (
    SELECT om.user_id, om.ambassador_level
    FROM organization_members om
    WHERE om.organization_id = p_organization_id
  ),
  content_counts AS (
    SELECT creator_id AS user_id, count(*) AS cnt
    FROM content WHERE organization_id = p_organization_id AND creator_id IS NOT NULL
    GROUP BY creator_id
    UNION ALL
    SELECT editor_id AS user_id, count(*) AS cnt
    FROM content WHERE organization_id = p_organization_id AND editor_id IS NOT NULL
    GROUP BY editor_id
  ),
  content_count_totals AS (
    SELECT user_id, sum(cnt) AS content_count FROM content_counts GROUP BY user_id
  ),
  active_tasks_creator AS (
    SELECT creator_id AS user_id, count(*) AS cnt
    FROM content
    WHERE organization_id = p_organization_id AND creator_id IS NOT NULL
      AND status IN ('assigned','recording','recorded','editing','review','issue')
    GROUP BY creator_id
  ),
  active_tasks_editor AS (
    SELECT editor_id AS user_id, count(*) AS cnt
    FROM content
    WHERE organization_id = p_organization_id AND editor_id IS NOT NULL
      AND status IN ('assigned','recording','recorded','editing','review','issue')
    GROUP BY editor_id
  ),
  active_tasks_totals AS (
    SELECT user_id, sum(cnt) AS active_tasks FROM (
      SELECT * FROM active_tasks_creator UNION ALL SELECT * FROM active_tasks_editor
    ) t GROUP BY user_id
  ),
  -- ===== SEÑALES NUEVAS (sustituyen a up_creadores_totals / up_editores_totals) =====
  deliveries AS (
    SELECT user_id, count(*) AS delivered_count
    FROM (
      SELECT creator_id AS user_id FROM content
      WHERE organization_id = p_organization_id AND creator_id IS NOT NULL
        AND deleted_at IS NULL AND status IN ('approved','paid','delivered')
      UNION ALL
      SELECT editor_id AS user_id FROM content
      WHERE organization_id = p_organization_id AND editor_id IS NOT NULL
        AND deleted_at IS NULL AND status IN ('approved','paid','delivered')
      UNION ALL
      SELECT strategist_id AS user_id FROM content
      WHERE organization_id = p_organization_id AND strategist_id IS NOT NULL
        AND deleted_at IS NULL AND status IN ('approved','paid','delivered')
      UNION ALL
      SELECT creator_id AS user_id FROM marketplace_projects
      WHERE organization_id = p_organization_id
        AND status IN ('completed','approved','paid','delivered')
      UNION ALL
      SELECT editor_id AS user_id FROM marketplace_projects
      WHERE organization_id = p_organization_id AND editor_id IS NOT NULL
        AND status IN ('completed','approved','paid','delivered')
    ) d
    GROUP BY user_id
  ),
  punctuality AS (
    SELECT
      user_id,
      count(*) AS with_deadline,
      count(*) FILTER (WHERE on_time) AS on_time_count
    FROM (
      SELECT creator_id AS user_id, (delivered_at <= deadline) AS on_time
      FROM content
      WHERE organization_id = p_organization_id AND creator_id IS NOT NULL
        AND deleted_at IS NULL AND deadline IS NOT NULL AND delivered_at IS NOT NULL
      UNION ALL
      SELECT editor_id AS user_id, (delivered_at <= deadline)
      FROM content
      WHERE organization_id = p_organization_id AND editor_id IS NOT NULL
        AND deleted_at IS NULL AND deadline IS NOT NULL AND delivered_at IS NOT NULL
      UNION ALL
      SELECT creator_id AS user_id, (completed_at <= deadline)
      FROM marketplace_projects
      WHERE organization_id = p_organization_id
        AND deadline IS NOT NULL AND completed_at IS NOT NULL
      UNION ALL
      SELECT editor_id AS user_id, (completed_at <= deadline)
      FROM marketplace_projects
      WHERE organization_id = p_organization_id AND editor_id IS NOT NULL
        AND deadline IS NOT NULL AND completed_at IS NOT NULL
    ) p
    GROUP BY user_id
  ),
  external_reviews AS (
    -- creator_reviews es reputación del creador (puede venir sin organization_id),
    -- por eso NO se filtra por organización: se perderían filas.
    SELECT creator_id AS user_id, avg(rating)::numeric AS avg_rating, count(*) AS review_count
    FROM creator_reviews
    WHERE rating IS NOT NULL
    GROUP BY creator_id
  ),
  -- =================================================================================
  creator_ratings AS (
    SELECT creator_id AS user_id, avg(creator_rating) AS avg_rating, count(*) AS rated_count
    FROM content
    WHERE organization_id = p_organization_id AND creator_id IS NOT NULL AND creator_rating IS NOT NULL
    GROUP BY creator_id
  ),
  editor_ratings AS (
    SELECT editor_id AS user_id, avg(editor_rating) AS avg_rating, count(*) AS rated_count
    FROM content
    WHERE organization_id = p_organization_id AND editor_id IS NOT NULL AND editor_rating IS NOT NULL
    GROUP BY editor_id
  ),
  strategy_ratings AS (
    SELECT strategist_id AS user_id, avg(strategy_rating) AS avg_rating, count(*) AS rated_count
    FROM content
    WHERE organization_id = p_organization_id AND strategist_id IS NOT NULL AND strategy_rating IS NOT NULL
    GROUP BY strategist_id
  ),
  -- Calidad combinada: estrellas del board de esta org + reviews públicas del creador
  combined_quality AS (
    SELECT
      m.user_id,
      CASE
        WHEN COALESCE(cr.rated_count, 0) + COALESCE(er.rated_count, 0)
           + COALESCE(sr.rated_count, 0) + COALESCE(rv.review_count, 0) = 0
        THEN NULL
        ELSE (
          COALESCE(cr.avg_rating * cr.rated_count, 0)
          + COALESCE(er.avg_rating * er.rated_count, 0)
          + COALESCE(sr.avg_rating * sr.rated_count, 0)
          + COALESCE(rv.avg_rating * rv.review_count, 0)
        ) / NULLIF(
          COALESCE(cr.rated_count, 0) + COALESCE(er.rated_count, 0)
          + COALESCE(sr.rated_count, 0) + COALESCE(rv.review_count, 0), 0
        )
      END AS avg_rating
    FROM members m
    LEFT JOIN creator_ratings  cr ON cr.user_id = m.user_id
    LEFT JOIN editor_ratings   er ON er.user_id = m.user_id
    LEFT JOIN strategy_ratings sr ON sr.user_id = m.user_id
    LEFT JOIN external_reviews rv ON rv.user_id = m.user_id
  ),
  talent_score AS (
    SELECT
      m.user_id,
      public.calculate_talent_score(
        cq.avg_rating,
        COALESCE(dv.delivered_count, 0)::integer,
        CASE WHEN COALESCE(pu.with_deadline, 0) > 0
          THEN ROUND(pu.on_time_count::numeric / pu.with_deadline * 100, 2)
          ELSE NULL END
      ) AS score
    FROM members m
    LEFT JOIN combined_quality cq ON cq.user_id = m.user_id
    LEFT JOIN deliveries       dv ON dv.user_id = m.user_id
    LEFT JOIN punctuality      pu ON pu.user_id = m.user_id
  )
  SELECT
    m.user_id AS id,
    COALESCE(p.full_name, p.email, 'Usuario eliminado') AS full_name,
    COALESCE(p.email, '') AS email,
    p.avatar_url,
    p.phone,
    p.bio,
    CASE
      WHEN m.canonical_role = 'editor' THEN 'editor'
      WHEN m.canonical_role = 'content_creator' THEN 'creator'
      ELSE 'strategist'
    END AS role,
    COALESCE(cct.content_count, 0) AS content_count,
    (ar.user_id IS NOT NULL OR COALESCE(p.is_ambassador, false)) AS is_ambassador,
    p.quality_score_avg,
    p.reliability_score,
    p.velocity_score,
    p.ai_recommended_level,
    p.ai_risk_flag,
    COALESCE(md.ambassador_level, 'none') AS ambassador_level,
    p.editor_rating,
    p.editor_completed_count,
    p.editor_on_time_count,
    COALESCE(att.active_tasks, 0) AS active_tasks,
    -- up_points: score de talento 0-100 (antes: puntos UP acumulados)
    COALESCE(ts.score, 0) AS up_points,
    -- up_level: bronze/silver/gold/diamond derivado del score (antes: nivel UP)
    COALESCE(public.calculate_talent_level(ts.score), 'bronze') AS up_level,
    cr.avg_rating AS avg_creator_rating,
    er.avg_rating AS avg_editor_rating,
    sr.avg_rating AS avg_strategy_rating,
    COALESCE(
      CASE
        WHEN m.canonical_role = 'editor' THEN er.avg_rating
        WHEN m.canonical_role = 'content_creator' THEN cr.avg_rating
        ELSE sr.avg_rating
      END,
      0
    ) AS avg_star_rating,
    COALESCE(
      CASE
        WHEN m.canonical_role = 'editor' THEN er.rated_count
        WHEN m.canonical_role = 'content_creator' THEN cr.rated_count
        ELSE sr.rated_count
      END,
      0
    ) AS rated_content_count
  FROM members m
  LEFT JOIN profiles p ON p.id = m.user_id
  LEFT JOIN ambassador_roles ar ON ar.user_id = m.user_id
  LEFT JOIN member_data md ON md.user_id = m.user_id
  LEFT JOIN content_count_totals cct ON cct.user_id = m.user_id
  LEFT JOIN active_tasks_totals att ON att.user_id = m.user_id
  LEFT JOIN talent_score ts ON ts.user_id = m.user_id
  LEFT JOIN creator_ratings cr ON cr.user_id = m.user_id
  LEFT JOIN editor_ratings er ON er.user_id = m.user_id
  LEFT JOIN strategy_ratings sr ON sr.user_id = m.user_id;
$function$;

COMMENT ON FUNCTION public.get_org_talent_roster(uuid) IS
  'Roster de talento de la organización. up_points/up_level ya NO vienen del módulo UP: son el score 0-100 (calidad + volumen + puntualidad) y su nivel bronze/silver/gold/diamond.';


-- =====================================================================================
-- 4) get_unified_talent(uuid)
--    MISMA firma y MISMAS columnas. Solo cambia el CTE up_data:
--    ya no lee up_user_scores.
-- =====================================================================================

CREATE OR REPLACE FUNCTION public.get_unified_talent(p_org_id uuid)
 RETURNS TABLE(id uuid, full_name text, email text, avatar_url text, phone text, bio text, source text, org_role text, all_roles text[], is_owner boolean, content_count bigint, is_ambassador boolean, ambassador_level text, quality_score_avg numeric, reliability_score numeric, velocity_score numeric, ai_recommended_level text, ai_risk_flag text, active_tasks bigint, up_points numeric, up_level text, avg_star_rating numeric, rated_content_count bigint, relationship_id uuid, relationship_type text, times_worked_together integer, total_paid numeric, average_rating_given numeric, last_collaboration_at timestamp with time zone, internal_notes text, internal_tags text[], list_name text, creator_profile_id uuid, categories text[], content_types text[], platforms text[], slug text, lead_source text, community_name text, referred_by text, marketplace_is_active boolean, marketplace_paused_until timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  WITH
  internal_members AS (
    SELECT
      om.user_id,
      om.is_owner,
      ARRAY_AGG(omr.role::text ORDER BY
        CASE omr.role::text
          WHEN 'admin' THEN 1
          WHEN 'team_leader' THEN 2
          WHEN 'strategist' THEN 3
          WHEN 'trafficker' THEN 4
          WHEN 'creator' THEN 5
          WHEN 'content_creator' THEN 5
          WHEN 'editor' THEN 6
          WHEN 'client' THEN 7
          ELSE 8
        END
      ) FILTER (WHERE omr.role IS NOT NULL) AS roles,
      MIN(CASE omr.role::text
        WHEN 'admin' THEN 1
        WHEN 'team_leader' THEN 2
        WHEN 'strategist' THEN 3
        WHEN 'trafficker' THEN 4
        WHEN 'creator' THEN 5
        WHEN 'content_creator' THEN 5
        WHEN 'editor' THEN 6
        WHEN 'client' THEN 7
        ELSE 8
      END) AS role_priority
    FROM organization_members om
    LEFT JOIN organization_member_roles omr
      ON omr.organization_id = om.organization_id
      AND omr.user_id = om.user_id
    WHERE om.organization_id = p_org_id
    GROUP BY om.user_id, om.is_owner
  ),
  internal_with_role AS (
    SELECT
      im.user_id,
      im.is_owner,
      im.roles,
      CASE im.role_priority
        WHEN 1 THEN 'admin'
        WHEN 2 THEN 'team_leader'
        WHEN 3 THEN 'strategist'
        WHEN 4 THEN 'trafficker'
        WHEN 5 THEN 'content_creator'
        WHEN 6 THEN 'editor'
        WHEN 7 THEN 'client'
        ELSE NULL
      END AS primary_role
    FROM internal_members im
  ),
  external_rels AS (
    SELECT
      r.id AS rel_id,
      r.creator_id,
      r.relationship_type,
      r.times_worked_together,
      r.total_paid,
      r.average_rating_given,
      r.last_collaboration_at,
      r.internal_notes,
      r.internal_tags,
      r.list_name
    FROM org_creator_relationships r
    WHERE r.organization_id = p_org_id
  ),
  all_users AS (
    SELECT iwr.user_id FROM internal_with_role iwr
    UNION
    SELECT er.creator_id FROM external_rels er
  ),
  ambassador_info AS (
    SELECT
      om.user_id,
      om.ambassador_level,
      EXISTS (
        SELECT 1 FROM organization_member_roles omr2
        WHERE omr2.organization_id = p_org_id
          AND omr2.user_id = om.user_id
          AND omr2.role = 'ambassador'
      ) AS is_amb_role
    FROM organization_members om
    WHERE om.organization_id = p_org_id
  ),
  content_counts AS (
    SELECT user_id, SUM(cnt) AS total
    FROM (
      SELECT creator_id AS user_id, COUNT(*) AS cnt
      FROM content
      WHERE organization_id = p_org_id AND creator_id IS NOT NULL
      GROUP BY creator_id
      UNION ALL
      SELECT editor_id AS user_id, COUNT(*) AS cnt
      FROM content
      WHERE organization_id = p_org_id AND editor_id IS NOT NULL
      GROUP BY editor_id
      UNION ALL
      SELECT strategist_id AS user_id, COUNT(*) AS cnt
      FROM content
      WHERE organization_id = p_org_id AND strategist_id IS NOT NULL
      GROUP BY strategist_id
    ) sub
    GROUP BY user_id
  ),
  active_tasks_counts AS (
    SELECT user_id, SUM(cnt) AS total
    FROM (
      SELECT creator_id AS user_id, COUNT(*) AS cnt
      FROM content
      WHERE organization_id = p_org_id
        AND status IN ('assigned','recording','recorded','editing','review','issue')
        AND creator_id IS NOT NULL
      GROUP BY creator_id
      UNION ALL
      SELECT editor_id AS user_id, COUNT(*) AS cnt
      FROM content
      WHERE organization_id = p_org_id
        AND status IN ('assigned','recording','recorded','editing','review','issue')
        AND editor_id IS NOT NULL
      GROUP BY editor_id
    ) sub
    GROUP BY user_id
  ),
  star_ratings AS (
    SELECT user_id, AVG(rating) AS avg_rating, COUNT(*) AS rating_count
    FROM (
      SELECT creator_id AS user_id, creator_rating AS rating
      FROM content
      WHERE organization_id = p_org_id AND creator_rating IS NOT NULL
      UNION ALL
      SELECT editor_id AS user_id, editor_rating AS rating
      FROM content
      WHERE organization_id = p_org_id AND editor_rating IS NOT NULL
      UNION ALL
      SELECT strategist_id AS user_id, strategy_rating AS rating
      FROM content
      WHERE organization_id = p_org_id AND strategy_rating IS NOT NULL
    ) sub
    WHERE user_id IS NOT NULL
    GROUP BY user_id
  ),
  -- ===== SEÑALES NUEVAS (sustituyen a up_user_scores) =====
  deliveries AS (
    SELECT user_id, COUNT(*) AS delivered_count
    FROM (
      SELECT creator_id AS user_id FROM content
      WHERE organization_id = p_org_id AND creator_id IS NOT NULL
        AND deleted_at IS NULL AND status IN ('approved','paid','delivered')
      UNION ALL
      SELECT editor_id AS user_id FROM content
      WHERE organization_id = p_org_id AND editor_id IS NOT NULL
        AND deleted_at IS NULL AND status IN ('approved','paid','delivered')
      UNION ALL
      SELECT strategist_id AS user_id FROM content
      WHERE organization_id = p_org_id AND strategist_id IS NOT NULL
        AND deleted_at IS NULL AND status IN ('approved','paid','delivered')
      UNION ALL
      SELECT creator_id AS user_id FROM marketplace_projects
      WHERE organization_id = p_org_id
        AND status IN ('completed','approved','paid','delivered')
      UNION ALL
      SELECT editor_id AS user_id FROM marketplace_projects
      WHERE organization_id = p_org_id AND editor_id IS NOT NULL
        AND status IN ('completed','approved','paid','delivered')
    ) d
    GROUP BY user_id
  ),
  punctuality AS (
    SELECT
      user_id,
      COUNT(*) AS with_deadline,
      COUNT(*) FILTER (WHERE on_time) AS on_time_count
    FROM (
      SELECT creator_id AS user_id, (delivered_at <= deadline) AS on_time
      FROM content
      WHERE organization_id = p_org_id AND creator_id IS NOT NULL
        AND deleted_at IS NULL AND deadline IS NOT NULL AND delivered_at IS NOT NULL
      UNION ALL
      SELECT editor_id AS user_id, (delivered_at <= deadline)
      FROM content
      WHERE organization_id = p_org_id AND editor_id IS NOT NULL
        AND deleted_at IS NULL AND deadline IS NOT NULL AND delivered_at IS NOT NULL
      UNION ALL
      SELECT creator_id AS user_id, (completed_at <= deadline)
      FROM marketplace_projects
      WHERE organization_id = p_org_id
        AND deadline IS NOT NULL AND completed_at IS NOT NULL
      UNION ALL
      SELECT editor_id AS user_id, (completed_at <= deadline)
      FROM marketplace_projects
      WHERE organization_id = p_org_id AND editor_id IS NOT NULL
        AND deadline IS NOT NULL AND completed_at IS NOT NULL
    ) p
    GROUP BY user_id
  ),
  external_reviews AS (
    SELECT creator_id AS user_id, AVG(rating)::numeric AS avg_rating, COUNT(*) AS review_count
    FROM creator_reviews
    WHERE rating IS NOT NULL
    GROUP BY creator_id
  ),
  talent_score AS (
    SELECT
      au.user_id,
      public.calculate_talent_score(
        CASE
          WHEN COALESCE(sr.rating_count, 0) + COALESCE(rv.review_count, 0) = 0 THEN NULL
          ELSE (COALESCE(sr.avg_rating * sr.rating_count, 0) + COALESCE(rv.avg_rating * rv.review_count, 0))
               / NULLIF(COALESCE(sr.rating_count, 0) + COALESCE(rv.review_count, 0), 0)
        END,
        COALESCE(dv.delivered_count, 0)::integer,
        CASE WHEN COALESCE(pu.with_deadline, 0) > 0
          THEN ROUND(pu.on_time_count::numeric / pu.with_deadline * 100, 2)
          ELSE NULL END
      ) AS score
    FROM all_users au
    LEFT JOIN star_ratings     sr ON sr.user_id = au.user_id
    LEFT JOIN external_reviews rv ON rv.user_id = au.user_id
    LEFT JOIN deliveries       dv ON dv.user_id = au.user_id
    LEFT JOIN punctuality      pu ON pu.user_id = au.user_id
  )
  -- ========================================================
  SELECT
    p.id,
    p.full_name,
    p.email,
    p.avatar_url,
    p.phone,
    p.bio,
    CASE
      WHEN iwr.user_id IS NOT NULL AND er.creator_id IS NOT NULL THEN 'both'
      WHEN iwr.user_id IS NOT NULL THEN 'internal'
      ELSE 'external'
    END AS source,
    iwr.primary_role AS org_role,
    iwr.roles AS all_roles,
    COALESCE(iwr.is_owner, false) AS is_owner,
    COALESCE(cc.total, 0)::bigint AS content_count,
    COALESCE(ai.is_amb_role, p.is_ambassador, false) AS is_ambassador,
    ai.ambassador_level,
    p.quality_score_avg,
    p.reliability_score,
    p.velocity_score,
    p.ai_recommended_level,
    p.ai_risk_flag,
    COALESCE(at.total, 0)::bigint AS active_tasks,
    -- up_points: score de talento 0-100 (antes: SUM(up_user_scores.total_points))
    COALESCE(ts.score, 0)::numeric AS up_points,
    -- up_level: bronze/silver/gold/diamond derivado del score
    public.calculate_talent_level(COALESCE(ts.score, 0)) AS up_level,
    sr.avg_rating AS avg_star_rating,
    COALESCE(sr.rating_count, 0)::bigint AS rated_content_count,
    er.rel_id AS relationship_id,
    er.relationship_type,
    COALESCE(er.times_worked_together, 0) AS times_worked_together,
    COALESCE(er.total_paid, 0) AS total_paid,
    er.average_rating_given,
    er.last_collaboration_at,
    er.internal_notes,
    er.internal_tags,
    er.list_name,
    cp.id AS creator_profile_id,
    cp.categories,
    cp.content_types,
    cp.platforms,
    cp.slug,
    p.lead_source,
    p.community_name,
    p.referred_by,
    COALESCE(
      cp.is_active AND (cp.marketplace_paused_until IS NULL OR cp.marketplace_paused_until <= NOW()),
      true
    ) AS marketplace_is_active,
    cp.marketplace_paused_until
  FROM all_users au
  JOIN profiles p ON p.id = au.user_id
  LEFT JOIN internal_with_role iwr ON iwr.user_id = au.user_id
  LEFT JOIN external_rels er ON er.creator_id = au.user_id
  LEFT JOIN ambassador_info ai ON ai.user_id = au.user_id
  LEFT JOIN content_counts cc ON cc.user_id = au.user_id
  LEFT JOIN active_tasks_counts at ON at.user_id = au.user_id
  LEFT JOIN talent_score ts ON ts.user_id = au.user_id
  LEFT JOIN star_ratings sr ON sr.user_id = au.user_id
  LEFT JOIN creator_profiles cp ON cp.user_id = au.user_id
  ORDER BY
    CASE
      WHEN iwr.user_id IS NOT NULL AND er.creator_id IS NOT NULL THEN 0
      WHEN iwr.user_id IS NOT NULL THEN 1
      ELSE 2
    END,
    p.full_name;
END;
$function$;

COMMENT ON FUNCTION public.get_unified_talent(uuid) IS
  'Talento unificado (interno + CRM externo). up_points/up_level ya NO vienen de up_user_scores: son el score 0-100 y su nivel bronze/silver/gold/diamond.';


-- =====================================================================================
-- 5) update_talent_performance_scores(uuid, uuid)
--    Se quita la lectura de up_quality_scores. La calidad pasa a salir de las
--    estrellas del board (1-5) escaladas a 0-10 para no romper la escala de
--    profiles.quality_score_avg / reliability_score (ambas 0-10).
--    El resto (profiles + talent_performance_history) se conserva igual.
-- =====================================================================================

CREATE OR REPLACE FUNCTION public.update_talent_performance_scores(p_user_id uuid, p_organization_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_total_completed INTEGER;
  v_on_time INTEGER;
  v_avg_quality NUMERIC;
BEGIN
  -- Stats de editor (columnas propias de profiles, sin relación con UP)
  SELECT
    COALESCE(editor_completed_count, 0),
    COALESCE(editor_on_time_count, 0)
  INTO v_total_completed, v_on_time
  FROM profiles
  WHERE id = p_user_id;

  -- Calidad: media de las estrellas del board de los últimos 90 días, escala 1-5 -> 0-10.
  -- (Antes: AVG(up_quality_scores.score) sobre los mismos 90 días.)
  SELECT AVG(r) * 2
  INTO v_avg_quality
  FROM (
    SELECT c.creator_rating::numeric AS r
    FROM content c
    WHERE c.creator_id = p_user_id
      AND c.organization_id = p_organization_id
      AND c.creator_rating IS NOT NULL
      AND COALESCE(c.approved_at, c.delivered_at, c.updated_at) > now() - interval '90 days'
    UNION ALL
    SELECT c.editor_rating::numeric
    FROM content c
    WHERE c.editor_id = p_user_id
      AND c.organization_id = p_organization_id
      AND c.editor_rating IS NOT NULL
      AND COALESCE(c.approved_at, c.delivered_at, c.updated_at) > now() - interval '90 days'
    UNION ALL
    SELECT c.strategy_rating::numeric
    FROM content c
    WHERE c.strategist_id = p_user_id
      AND c.organization_id = p_organization_id
      AND c.strategy_rating IS NOT NULL
      AND COALESCE(c.approved_at, c.delivered_at, c.updated_at) > now() - interval '90 days'
  ) q;

  -- Actualizar perfil
  UPDATE profiles
  SET
    quality_score_avg = COALESCE(v_avg_quality, quality_score_avg, 0),
    reliability_score = CASE
      WHEN v_total_completed = 0 THEN 0
      ELSE (v_on_time::NUMERIC / v_total_completed) * 10
    END,
    updated_at = now()
  WHERE id = p_user_id;

  -- Histórico (talent_performance_history SE QUEDA)
  INSERT INTO talent_performance_history (
    user_id, organization_id, quality_score, reliability_score,
    completed_tasks_count, on_time_count
  )
  VALUES (
    p_user_id, p_organization_id, v_avg_quality,
    CASE WHEN v_total_completed = 0 THEN 0 ELSE (v_on_time::NUMERIC / v_total_completed) * 10 END,
    v_total_completed, v_on_time
  );
END;
$function$;

COMMENT ON FUNCTION public.update_talent_performance_scores(uuid, uuid) IS
  'Actualiza profiles.quality_score_avg/reliability_score y registra en talent_performance_history. Calidad desde las estrellas del board (1-5 -> 0-10); ya no lee up_quality_scores.';


-- =====================================================================================
-- 6) refresh_reputation_global(uuid) -> DROP
--    Único propósito: agregar up_user_scores en la tabla reputation_global.
--    Ambas desaparecen con UP y la función no tiene ningún caller
--    (ni en pg_proc/triggers ni en src/). No se reescribe: se elimina.
--    NOTA: admin_delete_user_cascade referencia la TABLA reputation_global; esa
--    limpieza es parte del borrado del módulo UP, no de esta migración.
-- =====================================================================================

DROP FUNCTION IF EXISTS public.refresh_reputation_global(uuid);


-- =====================================================================================
-- 7) DISPARADORES DE RECÁLCULO
--    sync_marketplace_reputation solo se invocaba desde award_reputation_event (UP).
--    Al eliminarse UP se quedaría sin caller y marketplace_reputation nunca se
--    actualizaría. Estos triggers la realimentan desde las señales nuevas.
--    Todos son "best effort": si el recálculo falla NO bloquean la operación.
-- =====================================================================================

CREATE OR REPLACE FUNCTION public.trg_sync_reputation_from_review()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_creator_id uuid;
BEGIN
  -- OJO: en un trigger de fila, NEW no existe en DELETE y OLD no existe en INSERT.
  -- Hay que discriminar por TG_OP, no con COALESCE(NEW..., OLD...).
  IF TG_OP = 'DELETE' THEN
    v_creator_id := OLD.creator_id;
  ELSE
    v_creator_id := NEW.creator_id;
  END IF;

  BEGIN
    PERFORM public.sync_marketplace_reputation(v_creator_id);
    -- En UPDATE con cambio de creador, refrescar también al anterior
    IF TG_OP = 'UPDATE' AND OLD.creator_id IS DISTINCT FROM NEW.creator_id THEN
      PERFORM public.sync_marketplace_reputation(OLD.creator_id);
    END IF;
  EXCEPTION WHEN others THEN NULL;
  END;
  RETURN NULL;
END;
$function$;

DROP TRIGGER IF EXISTS trg_creator_reviews_sync_reputation ON public.creator_reviews;
CREATE TRIGGER trg_creator_reviews_sync_reputation
AFTER INSERT OR UPDATE OF rating, creator_id OR DELETE ON public.creator_reviews
FOR EACH ROW EXECUTE FUNCTION public.trg_sync_reputation_from_review();


CREATE OR REPLACE FUNCTION public.trg_sync_reputation_from_content()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status IN ('approved', 'paid', 'delivered')
     OR NEW.creator_rating IS DISTINCT FROM OLD.creator_rating
     OR NEW.editor_rating IS DISTINCT FROM OLD.editor_rating
     OR NEW.strategy_rating IS DISTINCT FROM OLD.strategy_rating
  THEN
    BEGIN
      IF NEW.creator_id IS NOT NULL THEN
        PERFORM public.sync_marketplace_reputation(NEW.creator_id);
      END IF;
      IF NEW.editor_id IS NOT NULL AND NEW.editor_id IS DISTINCT FROM NEW.creator_id THEN
        PERFORM public.sync_marketplace_reputation(NEW.editor_id);
      END IF;
      IF NEW.strategist_id IS NOT NULL
         AND NEW.strategist_id IS DISTINCT FROM NEW.creator_id
         AND NEW.strategist_id IS DISTINCT FROM NEW.editor_id THEN
        PERFORM public.sync_marketplace_reputation(NEW.strategist_id);
      END IF;
    EXCEPTION WHEN others THEN NULL;
    END;
  END IF;
  RETURN NULL;
END;
$function$;

DROP TRIGGER IF EXISTS trg_content_sync_reputation ON public.content;
CREATE TRIGGER trg_content_sync_reputation
AFTER UPDATE OF status, creator_rating, editor_rating, strategy_rating, delivered_at
ON public.content
FOR EACH ROW EXECUTE FUNCTION public.trg_sync_reputation_from_content();


CREATE OR REPLACE FUNCTION public.trg_sync_reputation_from_project()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status IN ('completed', 'approved', 'paid', 'delivered') THEN
    BEGIN
      IF NEW.creator_id IS NOT NULL THEN
        PERFORM public.sync_marketplace_reputation(NEW.creator_id);
      END IF;
      IF NEW.editor_id IS NOT NULL AND NEW.editor_id IS DISTINCT FROM NEW.creator_id THEN
        PERFORM public.sync_marketplace_reputation(NEW.editor_id);
      END IF;
    EXCEPTION WHEN others THEN NULL;
    END;
  END IF;
  RETURN NULL;
END;
$function$;

DROP TRIGGER IF EXISTS trg_marketplace_projects_sync_reputation ON public.marketplace_projects;
CREATE TRIGGER trg_marketplace_projects_sync_reputation
AFTER UPDATE OF status, completed_at ON public.marketplace_projects
FOR EACH ROW EXECUTE FUNCTION public.trg_sync_reputation_from_project();


-- =====================================================================================
-- 8) BACKFILL
--    Las 40 filas actuales de marketplace_reputation guardan puntos UP (10..5.660).
--    Se recalculan con la fórmula nueva para que la escala quede coherente (0-100).
-- =====================================================================================

DO $backfill$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    -- Filas existentes (escala vieja) + cualquiera con señal nueva pero sin fila todavía
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
    BEGIN
      PERFORM public.sync_marketplace_reputation(r.user_id);
    EXCEPTION WHEN others THEN
      RAISE NOTICE 'No se pudo recalcular la reputación de %', r.user_id;
    END;
  END LOOP;
END;
$backfill$;
