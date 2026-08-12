-- =====================================================================
-- ELIMINACIÓN DEL MÓDULO LIVE STREAMING
-- =====================================================================
-- Fecha: 2026-08-12
-- Bloque: simplificación de plataforma (posterior a booking / bloque 0)
--
-- RESPALDO
--   backups/pre-simplificacion/live-streaming/
--   Contiene el dump de las 37 tablas, sus definiciones de función,
--   enums y políticas RLS antes del DROP.
--   Total de filas afectadas: 19 (ver desglose abajo).
--
-- ALCANCE
--   · 37 tablas
--   · 28 funciones (19 normales + 9 de trigger)
--   ·  0 vistas / matviews  (verificado: ninguna depende del módulo)
--   · 17 enums huérfanos
--   ·  3 tablas en la publicación supabase_realtime
--   ·  1 columna en tabla que se queda (custom_pricing_agreements)
--
-- QUÉ SE VERIFICÓ (solo SELECT sobre pg_catalog, nada de DDL)
--   1. FKs internas entre las 37 -> se derivó el orden topológico real.
--   2. FKs ENTRANTES desde tablas que se quedan: 0. Ninguna tabla fuera
--      del módulo referencia a las 37. No hace falta ningún
--      ALTER TABLE ... DROP CONSTRAINT previo.
--   3. FKs SALIENTES hacia tablas que se quedan (organizations, users,
--      clients, brands, products, profiles, creator_profiles,
--      marketplace_campaigns, escrow_holds): existen pero NO bloquean —
--      desaparecen con la tabla hija.
--   4. Vistas/matviews dependientes de las 37: NINGUNA (pg_depend +
--      pg_rewrite sobre relkind IN ('v','m')).
--   5. Triggers en tablas que SE QUEDAN que ejecuten funciones del
--      módulo: NINGUNO. Confirmado que trg_escrow_create_streaming_session
--      ya fue removido de escrow_holds en el bloque 0. La función
--      create_streaming_session_for_hosting() quedó huérfana (sin trigger).
--   6. Políticas RLS en tablas que se quedan que mencionen las 37: NINGUNA.
--   7. Jobs de pg_cron que mencionen el módulo: NINGUNO.
--   8. Enums: los 17 listados son usados EXCLUSIVAMENTE por columnas de
--      las 37 tablas y por firmas de funciones que se eliminan aquí.
--      Ninguna tabla que se queda los usa.
--   9. handle_updated_at() NO se toca: es compartida por todo el esquema.
--
-- POR QUÉ ESTE ORDEN
--   apply_migration es atómico: si un paso falla no se aplica nada, así
--   que el orden importa y NO se usa CASCADE (queremos que reviente si
--   aparece una dependencia no prevista, en vez de arrastrar objetos).
--
--   (0) ALTER PUBLICATION primero: una tabla publicada no se puede
--       dropear limpiamente sin sacarla de la publicación.
--   (1) Funciones que DEVUELVEN el row-type de una tabla del módulo
--       (RETURNS SETOF live_hosting_requests) van ANTES que la tabla:
--       la tabla no se puede dropear mientras exista la función que
--       depende de su tipo compuesto.
--   (2) Resto de funciones normales: también antes (no estorban, pero
--       agrupadas para legibilidad).
--   (3) Tablas en orden topológico, hojas primero.
--   (4) Funciones de TRIGGER al final: sus triggers viven en las tablas
--       del módulo, así que hay que dropear la tabla ANTES que la función.
--   (5) Enums al final de todo: ya no quedan columnas ni firmas que los usen.
--   (6) Columna residual en custom_pricing_agreements.
--
-- NOTA SOBRE EL "CICLO" live_hosting_requests <-> streaming_sessions_v2
--   No es un ciclo a nivel de constraints. Solo existe una FK:
--     live_hosting_requests.streaming_session_id -> streaming_sessions_v2(id)
--   streaming_sessions_v2 NO tiene ninguna FK de vuelta. La aparente
--   bidireccionalidad venía del trigger create_streaming_session_for_hosting(),
--   que insertaba en streaming_sessions_v2 desde live_hosting_requests —
--   dependencia lógica, no declarativa. Por lo tanto NO se necesita soltar
--   ninguna constraint antes; basta con dropear live_hosting_requests
--   antes que streaming_sessions_v2.
--
-- ⚠️ PENDIENTE FUERA DE ESTA MIGRACIÓN (revisar con el lead)
--   · kreoon_merge_client(uuid, uuid) SE QUEDA pero referencia 8 tablas
--     del módulo (live_client_settings, live_hosting_requests,
--     live_hour_assignments, live_usage_logs, streaming_accounts,
--     streaming_events, streaming_sales, streaming_sessions_v2).
--     Al ser PL/pgSQL no falla en el DROP, pero reventará en runtime.
--     Debe reescribirse en una migración aparte.
--   · complete_live_hosting() toca escrow_holds (tabla que se queda).
--     Se elimina aquí; confirmar que no queda dinero retenido en escrow
--     asociado a live_hosting_requests (hoy: 0 filas en esa tabla).
--
-- CONTEO DE FILAS AL MOMENTO DE PREPARAR ESTA MIGRACIÓN
--   creator_live_streams .................. 9
--   live_stream_viewers ................... 5
--   live_feature_flags .................... 4
--   live_platform_config .................. 1
--   (las otras 33 tablas: 0 filas)
--   TOTAL ................................ 19
--   custom_pricing_agreements.live_shopping_fee_override NOT NULL: 0
-- =====================================================================


-- ---------------------------------------------------------------------
-- (0) PUBLICACIÓN REALTIME
-- ---------------------------------------------------------------------
ALTER PUBLICATION supabase_realtime DROP TABLE public.creator_live_streams;
ALTER PUBLICATION supabase_realtime DROP TABLE public.live_stream_comments;
ALTER PUBLICATION supabase_realtime DROP TABLE public.streaming_events;


-- ---------------------------------------------------------------------
-- (1) FUNCIONES QUE DEVUELVEN EL ROW-TYPE DE UNA TABLA DEL MÓDULO
--     Obligatorio: antes de dropear live_hosting_requests.
-- ---------------------------------------------------------------------
DROP FUNCTION public.get_live_hosting_requests(uuid, hosting_channel_type, hosting_request_status[]);
DROP FUNCTION public.get_marketplace_hosting_requests(text[], numeric, numeric, integer, integer);


-- ---------------------------------------------------------------------
-- (2) RESTO DE FUNCIONES NORMALES (no-trigger) DEL MÓDULO
-- ---------------------------------------------------------------------
DROP FUNCTION public.complete_live_hosting(uuid, numeric, numeric, integer, numeric, integer);

-- consume_live_hours tiene 3 sobrecargas
DROP FUNCTION public.consume_live_hours(uuid);
DROP FUNCTION public.consume_live_hours(uuid, numeric);
DROP FUNCTION public.consume_live_hours(uuid, uuid, numeric);

DROP FUNCTION public.reserve_live_hours(uuid, numeric);

DROP FUNCTION public.create_flash_offer(uuid, numeric, integer, integer);
DROP FUNCTION public.create_streaming_session_for_request(uuid);
DROP FUNCTION public.feature_streaming_product(uuid, uuid);
DROP FUNCTION public.record_live_shopping_purchase(uuid, uuid, integer, numeric);

DROP FUNCTION public.get_active_live_streams(integer, text);
DROP FUNCTION public.get_hosting_hosts(uuid);
DROP FUNCTION public.get_live_stream_by_creator(text);
DROP FUNCTION public.get_org_streaming_sessions(uuid);
DROP FUNCTION public.get_session_analytics_summary(uuid);
DROP FUNCTION public.is_creator_live(uuid);

DROP FUNCTION public.leave_live_viewer(uuid, text);
DROP FUNCTION public.ping_live_viewer(uuid, text);


-- ---------------------------------------------------------------------
-- (3) TABLAS — ORDEN TOPOLÓGICO, HOJAS PRIMERO
-- ---------------------------------------------------------------------

-- (3a) Hojas con FK hacia otras tablas del módulo
DROP TABLE public.live_hosting_status_history;      -- -> live_hosting_hosts, live_hosting_requests
DROP TABLE public.live_stream_comments;             -- -> creator_live_streams
DROP TABLE public.live_stream_products;             -- -> creator_live_streams
DROP TABLE public.live_stream_reactions;            -- -> creator_live_streams
DROP TABLE public.live_stream_viewers;              -- -> creator_live_streams
DROP TABLE public.streaming_analytics_v2;           -- -> streaming_products_v2, streaming_sessions_v2
DROP TABLE public.streaming_chat_messages_v2;       -- -> streaming_sessions_v2
DROP TABLE public.streaming_guests_v2;              -- -> streaming_sessions_v2
DROP TABLE public.streaming_session_channels_v2;    -- -> streaming_channels_v2, streaming_sessions_v2

-- (3b) Nivel intermedio
DROP TABLE public.live_hosting_hosts;               -- -> live_hosting_requests
DROP TABLE public.streaming_products_v2;            -- -> streaming_sessions_v2

-- (3c) live_hosting_requests: debe ir antes que streaming_sessions_v2
DROP TABLE public.live_hosting_requests;            -- -> streaming_sessions_v2

-- (3d) Raíces del módulo
DROP TABLE public.creator_live_streams;
DROP TABLE public.streaming_channels_v2;
DROP TABLE public.streaming_sessions_v2;

-- (3e) Tablas sin ninguna FK interna al módulo (orden libre)
DROP TABLE public.live_client_settings;
DROP TABLE public.live_event_creators;
DROP TABLE public.live_event_monitoring;
DROP TABLE public.live_feature_flags;
DROP TABLE public.live_hosting_templates;
DROP TABLE public.live_hour_assignments;
DROP TABLE public.live_hour_purchases;
DROP TABLE public.live_hour_wallets;
DROP TABLE public.live_org_oauth_tokens;
DROP TABLE public.live_packages;
DROP TABLE public.live_platform_config;
DROP TABLE public.live_stream_history;
DROP TABLE public.live_streaming_channels;
DROP TABLE public.live_usage_logs;
DROP TABLE public.organization_streaming_config;
DROP TABLE public.streaming_accounts;
DROP TABLE public.streaming_event_products;
DROP TABLE public.streaming_events;
DROP TABLE public.streaming_logs;
DROP TABLE public.streaming_overlays_v2;
DROP TABLE public.streaming_providers_config;
DROP TABLE public.streaming_sales;


-- ---------------------------------------------------------------------
-- (4) FUNCIONES DE TRIGGER — DESPUÉS de sus tablas
-- ---------------------------------------------------------------------
DROP FUNCTION public.log_hosting_host_status_change();       -- trg en live_hosting_hosts
DROP FUNCTION public.log_hosting_request_status_change();    -- trg en live_hosting_requests
DROP FUNCTION public.update_live_stream_comments_count();    -- trg en live_stream_comments
DROP FUNCTION public.update_live_stream_likes_count();       -- trg en live_stream_reactions
DROP FUNCTION public.update_live_stream_viewers_count();     -- trg en live_stream_viewers
DROP FUNCTION public.update_live_hosting_timestamp();        -- trg en live_hosting_{hosts,requests,templates}
DROP FUNCTION public.update_live_stream_timestamp();         -- trg en creator_live_streams
DROP FUNCTION public.streaming_update_timestamp();           -- trg en streaming_{channels,overlays,sessions}_v2

-- Huérfana: su trigger (trg_escrow_create_streaming_session en escrow_holds)
-- ya se eliminó en el bloque 0. No queda ningún trigger asociado.
DROP FUNCTION public.create_streaming_session_for_hosting();


-- ---------------------------------------------------------------------
-- (5) ENUMS HUÉRFANOS
--     Ninguna tabla ni función que se queda los usa (verificado con
--     pg_attribute sobre todo el esquema public + pg_get_functiondef).
-- ---------------------------------------------------------------------
DROP TYPE public.hosting_channel_type;
DROP TYPE public.hosting_host_status;
DROP TYPE public.hosting_request_status;
DROP TYPE public.live_stream_status;
DROP TYPE public.streaming_channel_status;
DROP TYPE public.streaming_chat_message_type;
DROP TYPE public.streaming_event_status;
DROP TYPE public.streaming_event_type;
DROP TYPE public.streaming_guest_status;
DROP TYPE public.streaming_overlay_type;
DROP TYPE public.streaming_owner_type;
DROP TYPE public.streaming_platform;
DROP TYPE public.streaming_platform_type;
DROP TYPE public.streaming_provider;
DROP TYPE public.streaming_sale_status;
DROP TYPE public.streaming_session_status;
DROP TYPE public.streaming_session_type;


-- ---------------------------------------------------------------------
-- (6) COLUMNA RESIDUAL EN TABLA QUE SE QUEDA
--     custom_pricing_agreements.live_shopping_fee_override numeric
--     Filas con valor NOT NULL: 0 -> se puede dropear sin pérdida de datos.
-- ---------------------------------------------------------------------
ALTER TABLE public.custom_pricing_agreements
  DROP COLUMN live_shopping_fee_override;


-- =====================================================================
-- ROLLBACK
-- =====================================================================
-- DROP TABLE / TYPE / FUNCTION no tienen SQL inverso. Para revertir hay que
-- restaurar desde el respaldo del 2026-08-11, EN ESTE ORDEN:
--
--   1. ALTER TABLE public.custom_pricing_agreements
--        ADD COLUMN live_shopping_fee_override numeric;
--      (no había datos: 0 filas con valor, no hay nada que repoblar)
--
--   2. Estructura — buscar el bloque de cada objeto en:
--        backups/pre-simplificacion/schema/01_tables.sql       (CREATE TABLE + los enums que usan)
--        backups/pre-simplificacion/schema/02_constraints.sql  (PK, FK, UNIQUE, CHECK)
--        backups/pre-simplificacion/schema/03_indexes.sql
--        backups/pre-simplificacion/schema/04_policies.sql     (RLS)
--        backups/pre-simplificacion/schema/05_triggers.sql
--      Crear las tablas en orden INVERSO al DROP (raíces primero:
--      streaming_sessions_v2, streaming_channels_v2, creator_live_streams,
--      luego los niveles intermedios y al final las hojas).
--      Añadir también GRANT ALL ... TO service_role: varias tablas de este
--      módulo NO lo tenían y por eso hubo que exportarlas por el rol postgres.
--
--   3. Datos (19 filas en total, solo 4 tablas tenían contenido):
--        node backups/pre-simplificacion/tools/make-restore-sql.mjs live-streaming creator_live_streams
--        node backups/pre-simplificacion/tools/make-restore-sql.mjs live-streaming live_stream_viewers
--        node backups/pre-simplificacion/tools/make-restore-sql.mjs live-streaming live_feature_flags
--        node backups/pre-simplificacion/tools/make-restore-sql.mjs live-streaming live_platform_config
--      Cada comando deja un .sql en backups/pre-simplificacion/restore/ listo
--      para pegar en el editor SQL de Supabase. El resto de tablas están vacías
--      (su .json es []), no hay nada que recargar.
--
--   4. Las 28 funciones NO están en el respaldo de esquema (01..05 cubre
--      tablas, constraints, índices, políticas y triggers, no cuerpos de
--      función). Para recuperarlas hay que sacarlas del historial de git:
--        git show pre-simplificacion -- supabase/migrations | grep -n <nombre>
--      o de las migraciones originales del módulo en supabase/migrations/.
--
--   5. Realtime:
--        ALTER PUBLICATION supabase_realtime ADD TABLE public.creator_live_streams;
--        ALTER PUBLICATION supabase_realtime ADD TABLE public.live_stream_comments;
--        ALTER PUBLICATION supabase_realtime ADD TABLE public.streaming_events;
--
--   6. El trigger trg_escrow_create_streaming_session sobre escrow_holds se
--      eliminó en el bloque 0, no aquí: restaurarlo aparte si hiciera falta.
--
--   7. Código: git revert del commit de este bloque.
-- =====================================================================
