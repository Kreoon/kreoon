-- =====================================================================================
-- DROP del modulo UP / Reputacion / Gamificacion interna
-- Fecha: 2026-08-12
-- Bloque `up-reputacion` de backups/pre-simplificacion/manifest.json
-- =====================================================================================
--
-- ALCANCE
--   44 tablas del bloque `up-reputacion` + `role_archetypes` (45 tablas)
--   + la matview `season_leaderboard_live`
--   + 8 enums huerfanos
--   + 46 funciones (32 normales, 2 row-type, 12 de trigger)
--   + 3 triggers sobre tablas que SE QUEDAN (profiles x2, feed_reactions x1)
--   + 94 politicas RLS
--   + 8 tablas retiradas de la publicacion supabase_realtime
--
-- SE QUEDA (verificado, no se toca):
--   marketplace_reputation · organization_member_badges · talent_performance_history
--   creator_reviews · creator_profiles.trust_score · academy_* · mi_* · referral_*
--   content · profiles
--
-- =====================================================================================
-- LO QUE SE VERIFICO ANTES DE ESCRIBIR ESTA MIGRACION (consultas sobre pg_catalog)
-- =====================================================================================
--
-- 1) POLITICAS RLS
--    · 94 politicas sobre las 45 tablas (se DROPean todas primero, antes de cualquier tabla).
--    · CERO politicas de tablas que SE QUEDAN referencian tablas de UP
--      (query: pg_policies cruzada por regex sobre qual + with_check, excluyendo las 45).
--      => NO hay ninguna politica que recrear. A diferencia del bloque 3, aqui no hay
--         riesgo de dejar una tabla superviviente inaccesible.
--
-- 2) FOREIGN KEYS
--    · CERO FKs entrantes desde tablas que se quedan hacia las 45.
--      => No hay decision constraint-vs-columna que tomar; no se toca ninguna tabla externa.
--    · 11 FKs internas entre tablas de UP -> definen el orden topologico de la seccion 5.
--
-- 3) VISTAS / MATVIEWS
--    · Unica dependencia: la matview `season_leaderboard_live` (se dropea antes que las tablas).
--    · Ninguna vista de otro modulo depende de tablas UP.
--
-- 4) REALTIME
--    · Confirmadas exactamente 8 tablas de UP en la publicacion `supabase_realtime`:
--      point_transactions, up_events, up_quest_progress, up_quests, up_user_scores,
--      user_achievements, user_points, user_reputation_totals.
--      Se retiran de la publicacion antes de dropear (seccion 2).
--
-- 5) TRIGGERS EN TABLAS QUE SE QUEDAN
--    · profiles.on_profile_created_create_global_stats  -> create_user_global_stats()
--    · profiles.on_profile_updated_sync_global_stats    -> sync_profile_to_global_stats()
--    · feed_reactions.trg_feed_reaction_activity        -> fn_feed_reaction_activity()
--      (esta ultima solo hacia trabajo de UP: user_streaks + reputation_events +
--       user_daily_missions; el trigger completo se retira)
--    · organization_member_badges.update_organization_member_badges_updated_at usa
--      update_badge_updated_at(): NO es de UP, NO se toca.
--    · Los 3 triggers de UP sobre `content` (trigger_auto_calculate_points,
--      trigger_up_event_on_status, trigger_up_events_on_content) YA fueron eliminados
--      en una intervencion previa; aqui solo se dropean sus funciones.
--
-- 6) CRON JOBS
--    · Revisados los 20 jobs de cron.job: NINGUNO toca el modulo UP. Nada que borrar.
--
-- 7) FILAS (2026-08-12, 85.654 en total; 18 de las 45 tablas estan vacias)
--    user_global_badges 76.125 · up_events 3.373 · point_transactions 2.648
--    reputation_events 1.704 · user_achievements 640 · user_global_stats 525
--    global_badges 145 · user_points 85 · up_editores 71 · user_reputation_totals 48
--    up_creadores 44 · role_archetypes 43 · role_weight_config 43 · up_user_scores 42
--    achievements 24 · reputation_configs 18 · role_multipliers 17 · up_settings 10
--    up_fraud_alerts 9 · reputation_global 9 · user_streaks 7 · up_quality_scores 6
--    mission_templates 5 · reputation_seasons 4 · role_points_config 4
--    user_daily_missions 3 · up_seasons 2
--
-- 8) role_archetypes -> SE BORRA
--    · En BD solo la leen funciones de UP: update_reputation_totals(), get_org_ranking(),
--      get_role_weight(text,uuid). Las tres se van en esta migracion.
--    · En el repo solo aparece en src/integrations/supabase/types.ts (archivo generado).
--      Cero uso real en src/ ni en supabase/functions/.
--
-- 9) FUNCIONES QUE TOCAN UP PERO **NO** SE DROPEAN AQUI
--    · sync_marketplace_reputation, get_org_talent_roster, get_unified_talent,
--      update_talent_performance_scores -> las reescribe
--      20260812020000_rewrite_reputation_without_up.sql
--    · calculate_reputation_level(integer) -> la consume sync_marketplace_reputation. Se queda.
--    · admin_delete_user_cascade -> ya reescrita en 20260811230002; hoy solo menciona
--      tablas UP en comentarios. No se toca.
--    · get_public_reputation -> lee marketplace_reputation, no toca UP.
--    · update_badge_updated_at -> trigger de organization_member_badges. Se queda.
--
-- BLOQUEANTES DE FRONTERA: RESUELTOS ANTES DE APLICAR ESTA MIGRACION
--    a) award_kiro_points -> DROPeada tras desacoplar el frontend (Kiro usa localStorage).
--       Como consecuencia, calculate_up_level(integer) se queda sin consumidores externos:
--       verificado que solo la citaban add_user_points, emit_up_event(text,...) y
--       update_up_user_scores, las tres dropeadas aqui -> se DROPea tambien (seccion 6.2).
--       (Verificacion repetida justo antes de aplicar: 3 consumidores, todos UP.)
--    b) award_referral_coins -> reescrita como no-op (las monedas las acredita el edge
--       function referral-service). Ya no toca reputation_events.
--    c) award_space_points e issue_academy_certificate -> limpiadas de reputation_events.
--
-- =====================================================================================
-- ROLLBACK
--   Datos:   backups/pre-simplificacion/up-reputacion/  (CSV + JSON por tabla)
--   Esquema: backups/pre-simplificacion/schema/01_tables.sql, 02_constraints.sql,
--            03_indexes.sql, 04_policies.sql, 05_triggers.sql
--            (NO existe functions.sql: las definiciones de las funciones dropeadas aqui
--             hay que recuperarlas del historial de migraciones o de un dump previo)
--   Orden de restauracion: 01_tables -> datos -> 02_constraints -> 03_indexes ->
--                          04_policies -> 05_triggers -> funciones.
-- =====================================================================================

BEGIN;

-- =====================================================================================
-- 1) POLITICAS RLS  (TODAS primero, antes de tocar ninguna tabla)
-- =====================================================================================

DROP POLICY IF EXISTS "Admins can manage achievements"            ON public.achievements;
DROP POLICY IF EXISTS "Anyone can read achievements"              ON public.achievements;
DROP POLICY IF EXISTS "Anyone can view achievements"              ON public.achievements;

DROP POLICY IF EXISTS "Admins can manage chronometer"             ON public.chronometer_pauses;
DROP POLICY IF EXISTS "Org members can view chronometer"          ON public.chronometer_pauses;

DROP POLICY IF EXISTS "Admins can manage badges"                  ON public.global_badges;
DROP POLICY IF EXISTS "Anyone can view badges"                    ON public.global_badges;

DROP POLICY IF EXISTS "mission_templates_select_all"              ON public.mission_templates;

DROP POLICY IF EXISTS "Admins can manage transactions"            ON public.point_transactions;
DROP POLICY IF EXISTS "System can insert transactions"            ON public.point_transactions;
DROP POLICY IF EXISTS "Users can view all transactions"           ON public.point_transactions;

DROP POLICY IF EXISTS "Anyone can read reputation configs"        ON public.reputation_configs;

DROP POLICY IF EXISTS "Org members can insert events"             ON public.reputation_events;
DROP POLICY IF EXISTS "Org members can view events"               ON public.reputation_events;
DROP POLICY IF EXISTS "System can manage events"                  ON public.reputation_events;

DROP POLICY IF EXISTS "Anyone can view public reputation"         ON public.reputation_global;
DROP POLICY IF EXISTS "Users can view own reputation"             ON public.reputation_global;

DROP POLICY IF EXISTS "Admins can manage seasons"                 ON public.reputation_seasons;
DROP POLICY IF EXISTS "Org members can view seasons"              ON public.reputation_seasons;

DROP POLICY IF EXISTS "Admins can manage org archetypes"          ON public.role_archetypes;
DROP POLICY IF EXISTS "Anyone can read global archetypes"         ON public.role_archetypes;
DROP POLICY IF EXISTS "Org members can read org archetypes"       ON public.role_archetypes;

DROP POLICY IF EXISTS "Admins can manage multipliers"             ON public.role_multipliers;
DROP POLICY IF EXISTS "Org members can view multipliers"          ON public.role_multipliers;

DROP POLICY IF EXISTS "Admins can manage config"                  ON public.role_points_config;
DROP POLICY IF EXISTS "Org members can view config"               ON public.role_points_config;

DROP POLICY IF EXISTS "Anyone can read global role weights"       ON public.role_weight_config;
DROP POLICY IF EXISTS "Org members can read org role weights"     ON public.role_weight_config;

DROP POLICY IF EXISTS "Users can manage season_goals of their organization" ON public.season_goals;
DROP POLICY IF EXISTS "season_goals_delete"                       ON public.season_goals;
DROP POLICY IF EXISTS "season_goals_insert"                       ON public.season_goals;
DROP POLICY IF EXISTS "season_goals_select"                       ON public.season_goals;
DROP POLICY IF EXISTS "season_goals_update"                       ON public.season_goals;

DROP POLICY IF EXISTS "Admins can manage claims"                  ON public.season_reward_claims;
DROP POLICY IF EXISTS "Org members can view org claims"           ON public.season_reward_claims;
DROP POLICY IF EXISTS "Users can view own claims"                 ON public.season_reward_claims;

DROP POLICY IF EXISTS "Admins can manage rewards"                 ON public.season_rewards;
DROP POLICY IF EXISTS "Org members can view rewards"              ON public.season_rewards;

DROP POLICY IF EXISTS "Admins can manage config"                  ON public.unified_reputation_config;
DROP POLICY IF EXISTS "Org members can view config"               ON public.unified_reputation_config;

DROP POLICY IF EXISTS "Admins can manage ai config"               ON public.up_ai_config;
DROP POLICY IF EXISTS "Org members can view ai config"            ON public.up_ai_config;

DROP POLICY IF EXISTS "Org members can view arbiter log"          ON public.up_arbiter_log;

DROP POLICY IF EXISTS "Admins can manage chronometer pauses"      ON public.up_chronometer_pauses;
DROP POLICY IF EXISTS "Org members can view chronometer pauses"   ON public.up_chronometer_pauses;

DROP POLICY IF EXISTS "Org members can view client trust"         ON public.up_client_trust_scores;

DROP POLICY IF EXISTS "Admins can manage up_creadores"            ON public.up_creadores;
DROP POLICY IF EXISTS "Org members can read up_creadores"         ON public.up_creadores;

DROP POLICY IF EXISTS "Admins can manage up_creadores_totals"     ON public.up_creadores_totals;
DROP POLICY IF EXISTS "Org members can read up_creadores_totals"  ON public.up_creadores_totals;

DROP POLICY IF EXISTS "System manages up currency conversions"    ON public.up_currency_conversions;
DROP POLICY IF EXISTS "Users view own up currency conversions"    ON public.up_currency_conversions;

DROP POLICY IF EXISTS "Admins can manage up_editores"             ON public.up_editores;
DROP POLICY IF EXISTS "Org members can read up_editores"          ON public.up_editores;

DROP POLICY IF EXISTS "Admins can manage up_editores_totals"      ON public.up_editores_totals;
DROP POLICY IF EXISTS "Org members can read up_editores_totals"   ON public.up_editores_totals;

DROP POLICY IF EXISTS "Org members view up event types"           ON public.up_event_types;
DROP POLICY IF EXISTS "Platform root manages up event types"      ON public.up_event_types;

DROP POLICY IF EXISTS "Org members can view events"               ON public.up_events;
DROP POLICY IF EXISTS "Users can insert events"                   ON public.up_events;

DROP POLICY IF EXISTS "Platform root manages fraud alerts"        ON public.up_fraud_alerts;

DROP POLICY IF EXISTS "Org members view up permissions"           ON public.up_permissions;
DROP POLICY IF EXISTS "Platform root manages up permissions"      ON public.up_permissions;

DROP POLICY IF EXISTS "Org members view quality scores"           ON public.up_quality_scores;
DROP POLICY IF EXISTS "System manages quality scores"             ON public.up_quality_scores;

DROP POLICY IF EXISTS "Users manage own quest progress"           ON public.up_quest_progress;

DROP POLICY IF EXISTS "Org members view up quests"                ON public.up_quests;
DROP POLICY IF EXISTS "Org owners manage up quests"               ON public.up_quests;

DROP POLICY IF EXISTS "Admins can manage rules"                   ON public.up_rules;
DROP POLICY IF EXISTS "Org members can view rules"                ON public.up_rules;

DROP POLICY IF EXISTS "System manages season snapshots"           ON public.up_season_snapshots;
DROP POLICY IF EXISTS "Users view own season snapshots"           ON public.up_season_snapshots;

DROP POLICY IF EXISTS "Admins can manage seasons"                 ON public.up_seasons;
DROP POLICY IF EXISTS "Org members can view seasons"              ON public.up_seasons;

DROP POLICY IF EXISTS "Authenticated can read up settings"        ON public.up_settings;
DROP POLICY IF EXISTS "Platform root manages up settings"         ON public.up_settings;

DROP POLICY IF EXISTS "Org members can view org scores"           ON public.up_user_scores;
DROP POLICY IF EXISTS "Users can view own scores"                 ON public.up_user_scores;

DROP POLICY IF EXISTS "Admins can manage user achievements"       ON public.user_achievements;
DROP POLICY IF EXISTS "Authenticated can view user achievements"  ON public.user_achievements;
DROP POLICY IF EXISTS "Users can view all user achievements"      ON public.user_achievements;

DROP POLICY IF EXISTS "user_daily_missions_select_own"            ON public.user_daily_missions;

DROP POLICY IF EXISTS "Anyone can view completed badges"          ON public.user_global_badges;
DROP POLICY IF EXISTS "System can manage badges"                  ON public.user_global_badges;
DROP POLICY IF EXISTS "Users can view own badges"                 ON public.user_global_badges;

DROP POLICY IF EXISTS "Anyone can view stats"                     ON public.user_global_stats;
DROP POLICY IF EXISTS "System can manage stats"                   ON public.user_global_stats;

DROP POLICY IF EXISTS "System can manage points"                  ON public.user_points;
DROP POLICY IF EXISTS "Users can insert own points"               ON public.user_points;
DROP POLICY IF EXISTS "Users can view all points"                 ON public.user_points;

DROP POLICY IF EXISTS "Org members can view org totals"           ON public.user_reputation_totals;
DROP POLICY IF EXISTS "System can manage totals"                  ON public.user_reputation_totals;
DROP POLICY IF EXISTS "Users can view own totals"                 ON public.user_reputation_totals;

DROP POLICY IF EXISTS "user_streaks_select_own"                   ON public.user_streaks;

-- =====================================================================================
-- 2) PUBLICACION REALTIME  (antes de dropear las tablas)
-- =====================================================================================

ALTER PUBLICATION supabase_realtime DROP TABLE public.point_transactions;
ALTER PUBLICATION supabase_realtime DROP TABLE public.up_events;
ALTER PUBLICATION supabase_realtime DROP TABLE public.up_quest_progress;
ALTER PUBLICATION supabase_realtime DROP TABLE public.up_quests;
ALTER PUBLICATION supabase_realtime DROP TABLE public.up_user_scores;
ALTER PUBLICATION supabase_realtime DROP TABLE public.user_achievements;
ALTER PUBLICATION supabase_realtime DROP TABLE public.user_points;
ALTER PUBLICATION supabase_realtime DROP TABLE public.user_reputation_totals;

-- =====================================================================================
-- 3) TRIGGERS DE UP SOBRE TABLAS QUE SE QUEDAN
--    (los triggers internos de las tablas de UP se van con su propia tabla)
-- =====================================================================================

DROP TRIGGER IF EXISTS on_profile_created_create_global_stats ON public.profiles;
DROP TRIGGER IF EXISTS on_profile_updated_sync_global_stats   ON public.profiles;
DROP TRIGGER IF EXISTS trg_feed_reaction_activity             ON public.feed_reactions;

-- =====================================================================================
-- 4) FUNCIONES QUE DEVUELVEN ROW-TYPE DE UNA TABLA DE UP
--    (dependencia dura sobre el tipo compuesto -> deben caer ANTES que su tabla)
-- =====================================================================================

DROP FUNCTION IF EXISTS public.get_user_reputation(uuid, uuid);   -- SETOF user_reputation_totals
DROP FUNCTION IF EXISTS public.get_user_scores(uuid, uuid);       -- SETOF up_user_scores

-- =====================================================================================
-- 5) TABLAS  (orden topologico por las 11 FKs internas: hijas antes que padres)
-- =====================================================================================

-- 5.0) matview dependiente de las tablas
DROP MATERIALIZED VIEW IF EXISTS public.season_leaderboard_live;

-- 5.1) hojas / hijas
DROP TABLE IF EXISTS public.season_reward_claims;      -- -> season_rewards, reputation_seasons
DROP TABLE IF EXISTS public.season_rewards;            -- -> achievements, reputation_seasons
DROP TABLE IF EXISTS public.reputation_events;         -- -> reputation_seasons
DROP TABLE IF EXISTS public.up_creadores_totals;       -- -> up_seasons
DROP TABLE IF EXISTS public.up_editores_totals;        -- -> up_seasons
DROP TABLE IF EXISTS public.up_user_scores;            -- -> up_seasons
DROP TABLE IF EXISTS public.user_daily_missions;       -- -> mission_templates
DROP TABLE IF EXISTS public.user_global_badges;        -- -> global_badges

-- 5.2) padres de las anteriores
DROP TABLE IF EXISTS public.reputation_seasons;
DROP TABLE IF EXISTS public.achievements;
DROP TABLE IF EXISTS public.mission_templates;
DROP TABLE IF EXISTS public.global_badges;             -- self-FK parent_badge_id (no bloquea)
DROP TABLE IF EXISTS public.up_seasons;

-- 5.3) tablas sin FKs internas
DROP TABLE IF EXISTS public.chronometer_pauses;
DROP TABLE IF EXISTS public.point_transactions;
DROP TABLE IF EXISTS public.reputation_configs;
DROP TABLE IF EXISTS public.reputation_global;
DROP TABLE IF EXISTS public.role_archetypes;
DROP TABLE IF EXISTS public.role_multipliers;
DROP TABLE IF EXISTS public.role_points_config;
DROP TABLE IF EXISTS public.role_weight_config;
DROP TABLE IF EXISTS public.season_goals;
DROP TABLE IF EXISTS public.unified_reputation_config;
DROP TABLE IF EXISTS public.user_achievements;
DROP TABLE IF EXISTS public.user_global_stats;
DROP TABLE IF EXISTS public.user_points;
DROP TABLE IF EXISTS public.user_reputation_totals;
DROP TABLE IF EXISTS public.user_streaks;
DROP TABLE IF EXISTS public.up_ai_config;
DROP TABLE IF EXISTS public.up_arbiter_log;
DROP TABLE IF EXISTS public.up_chronometer_pauses;
DROP TABLE IF EXISTS public.up_client_trust_scores;
DROP TABLE IF EXISTS public.up_creadores;
DROP TABLE IF EXISTS public.up_currency_conversions;
DROP TABLE IF EXISTS public.up_editores;
DROP TABLE IF EXISTS public.up_event_types;
DROP TABLE IF EXISTS public.up_events;
DROP TABLE IF EXISTS public.up_fraud_alerts;
DROP TABLE IF EXISTS public.up_permissions;
DROP TABLE IF EXISTS public.up_quality_scores;
DROP TABLE IF EXISTS public.up_quest_progress;
DROP TABLE IF EXISTS public.up_quests;
DROP TABLE IF EXISTS public.up_rules;
DROP TABLE IF EXISTS public.up_season_snapshots;
DROP TABLE IF EXISTS public.up_settings;

-- =====================================================================================
-- 6) FUNCIONES  (despues de las tablas: plpgsql resuelve las tablas en runtime)
-- =====================================================================================

-- 6.1) funciones de trigger
DROP FUNCTION IF EXISTS public.auto_calculate_points();
DROP FUNCTION IF EXISTS public.create_user_global_stats();
DROP FUNCTION IF EXISTS public.emit_up_event_on_status_change();
DROP FUNCTION IF EXISTS public.fn_feed_reaction_activity();
DROP FUNCTION IF EXISTS public.set_season_id_creadores();
DROP FUNCTION IF EXISTS public.set_season_id_editores();
DROP FUNCTION IF EXISTS public.sync_profile_to_global_stats();
DROP FUNCTION IF EXISTS public.trigger_check_achievements();
DROP FUNCTION IF EXISTS public.trigger_emit_up_event_on_status();
DROP FUNCTION IF EXISTS public.update_reputation_totals();
DROP FUNCTION IF EXISTS public.update_up_user_scores();
DROP FUNCTION IF EXISTS public.update_user_last_active();

-- 6.2) funciones normales
--      add_user_points va PRIMERO: su firma usa el enum point_transaction_type,
--      que se dropea en la seccion 7.
DROP FUNCTION IF EXISTS public.add_user_points(uuid, uuid, public.point_transaction_type, integer, text);
DROP FUNCTION IF EXISTS public.award_reputation_event(uuid, uuid, character varying, character varying, uuid, character varying, character varying, integer, numeric, jsonb, uuid);
DROP FUNCTION IF EXISTS public.calculate_delivery_points(uuid, uuid, text, integer, boolean, integer, text, text);
DROP FUNCTION IF EXISTS public.calculate_up_level(integer);
DROP FUNCTION IF EXISTS public.check_and_award_achievements(uuid);
DROP FUNCTION IF EXISTS public.check_and_award_global_badges(uuid);
DROP FUNCTION IF EXISTS public.check_and_pause_chronometer(uuid, uuid, text, uuid, text);
DROP FUNCTION IF EXISTS public.check_perfect_streak(uuid);
DROP FUNCTION IF EXISTS public.close_expired_seasons();
DROP FUNCTION IF EXISTS public.close_season_and_distribute_rewards(uuid);
DROP FUNCTION IF EXISTS public.create_default_up_config(uuid);
DROP FUNCTION IF EXISTS public.create_default_up_event_types(uuid);
DROP FUNCTION IF EXISTS public.create_default_up_rules(uuid);
DROP FUNCTION IF EXISTS public.emit_up_event(text, uuid, uuid, jsonb);
DROP FUNCTION IF EXISTS public.emit_up_event(uuid, uuid, text, uuid, jsonb, boolean, numeric, jsonb);
DROP FUNCTION IF EXISTS public.fn_bump_user_streak(uuid);
DROP FUNCTION IF EXISTS public.fn_match_daily_missions(uuid, text);
DROP FUNCTION IF EXISTS public.get_active_season(uuid);
DROP FUNCTION IF EXISTS public.get_content_paused_hours(uuid, text);
DROP FUNCTION IF EXISTS public.get_daily_missions();
DROP FUNCTION IF EXISTS public.get_global_badges_with_progress(uuid);
DROP FUNCTION IF EXISTS public.get_global_ranking(integer, integer);
DROP FUNCTION IF EXISTS public.get_org_ranking(uuid, text, text, text, integer);
DROP FUNCTION IF EXISTS public.get_org_ranking_normalized(uuid, text, text, text);
DROP FUNCTION IF EXISTS public.get_role_weight(text, uuid);
DROP FUNCTION IF EXISTS public.get_role_weight(uuid, uuid, text);
DROP FUNCTION IF EXISTS public.get_season_rewards_with_eligibility(uuid, uuid);
DROP FUNCTION IF EXISTS public.get_up_setting(text);
DROP FUNCTION IF EXISTS public.get_user_events(uuid, uuid, text, integer);
DROP FUNCTION IF EXISTS public.initialize_org_points_config(uuid);
DROP FUNCTION IF EXISTS public.refresh_season_leaderboard();
DROP FUNCTION IF EXISTS public.resume_chronometer(uuid, text);
DROP FUNCTION IF EXISTS public.sync_user_global_stats(integer, boolean, boolean, integer, integer, integer, integer, integer, integer, integer, integer, integer, timestamp with time zone);

-- Ya la dropea 20260812020000_rewrite_reputation_without_up.sql; se repite por idempotencia.
DROP FUNCTION IF EXISTS public.refresh_reputation_global(uuid);

-- =====================================================================================
-- 7) ENUMS HUERFANOS
--    Verificado: ninguno tiene columnas ni argumentos de funcion fuera del modulo UP.
--    (`verification_method` NO se toca: no pertenece a UP pese a estar sin uso.)
-- =====================================================================================

DROP TYPE IF EXISTS public.badge_category;          -- era global_badges.category
DROP TYPE IF EXISTS public.badge_rarity;            -- era global_badges.rarity
DROP TYPE IF EXISTS public.effort_archetype;        -- era role_weight_config.archetype
DROP TYPE IF EXISTS public.point_transaction_type;  -- era point_transactions.transaction_type
DROP TYPE IF EXISTS public.up_season_mode;          -- era up_seasons.mode
DROP TYPE IF EXISTS public.up_event_type;           -- sin uso
DROP TYPE IF EXISTS public.up_level;                -- sin uso
DROP TYPE IF EXISTS public.up_rule_operator;        -- sin uso

COMMIT;
