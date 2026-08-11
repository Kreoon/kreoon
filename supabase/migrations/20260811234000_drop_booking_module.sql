-- Simplificación 2026 · Bloque 1 · Eliminación del módulo BOOKING / AGENDA
--
-- Contexto: el frontend de booking ya no existía (la ruta /booking/* era un redirect y
-- ninguna página, componente o item de navegación lo referenciaba). En esta migración
-- desaparece también de la base de datos.
--
-- Respaldo: backups/pre-simplificacion/booking/ (15 tablas · 6 filas en total).
-- Solo 2 tablas tenían datos: booking_availability (5) y booking_event_types (1).
-- El esquema completo está en backups/pre-simplificacion/schema/01_tables.sql y siguientes.
--
-- Verificado antes de ejecutar:
--   · 0 llaves foráneas entrantes desde tablas que se quedan.
--   · 0 de estas tablas está en la publicación supabase_realtime.
--   · El trigger update_booking_questions_updated_at solo lo usan 4 tablas del propio set.
--   · Ninguna RPC de booking tiene callers en src/ (verificado con grep).
--
-- NO se tocan, pese al nombre:
--   · get_booking_tracking_pixels() y log_ad_conversion(): son del módulo de ads/tracking.
--     Usan la columna booking_config_id de ad_tracking_pixels / ad_conversion_log, que no
--     tiene FK ni relación con este módulo.
--   · academy-google-calendar y las tablas academy_*_calendar_tokens: son de Academia.
--   · creator_profiles.is_available: esa es la disponibilidad real del marketplace
--     (ver MarketplaceSettings → CreatorAvailabilityTab, que se queda).
--   · daily-reminders: es el digest del board de contenido, no de booking.

-- 1. Vista dependiente
DROP VIEW IF EXISTS public.creator_availability_status;

-- 2. RPCs del módulo. Van ANTES de las tablas porque get_creator_availability
--    devuelve el row-type de creator_availability (falla con 2BP01 si la tabla cae antes).
DROP FUNCTION IF EXISTS public.create_public_booking(uuid, uuid, timestamptz, timestamptz, text, text, text, text, text, jsonb);
DROP FUNCTION IF EXISTS public.get_available_booking_slots(uuid, uuid, date, text);
DROP FUNCTION IF EXISTS public.check_booking_slot_available(uuid, timestamptz, timestamptz, uuid);
DROP FUNCTION IF EXISTS public.get_booking_page_data(text);
DROP FUNCTION IF EXISTS public.get_booking_host_by_username(text);
DROP FUNCTION IF EXISTS public.get_creator_availability(uuid);

-- 3. Tablas, de hijas a padres (sin CASCADE a propósito: si algo falla, queremos el error).
--    Los triggers del módulo caen con sus tablas; por eso las tablas van ANTES que las
--    funciones (un primer intento con el orden inverso falló con 2BP01: la función
--    auto_booking_event_type_slug todavía tenía su trigger encima).
DROP TABLE IF EXISTS public.booking_question_answers;
DROP TABLE IF EXISTS public.booking_reminder_logs;
DROP TABLE IF EXISTS public.booking_webhook_logs;
DROP TABLE IF EXISTS public.calendar_event_mappings;
DROP TABLE IF EXISTS public.calendar_blocked_events;
DROP TABLE IF EXISTS public.booking_custom_questions;
DROP TABLE IF EXISTS public.booking_reminder_settings;
DROP TABLE IF EXISTS public.booking_webhooks;
DROP TABLE IF EXISTS public.bookings;
DROP TABLE IF EXISTS public.booking_availability;
DROP TABLE IF EXISTS public.booking_exceptions;
DROP TABLE IF EXISTS public.booking_event_types;
DROP TABLE IF EXISTS public.booking_branding;
DROP TABLE IF EXISTS public.calendar_integrations;
DROP TABLE IF EXISTS public.creator_availability;

-- 4. Funciones de trigger. Van DESPUÉS de las tablas: mientras la tabla existe,
--    su trigger depende de ellas.
DROP FUNCTION IF EXISTS public.auto_booking_event_type_slug();
DROP FUNCTION IF EXISTS public.auto_update_availability_status();
DROP FUNCTION IF EXISTS public.check_vacation_end();
DROP FUNCTION IF EXISTS public.create_default_reminders();
DROP FUNCTION IF EXISTS public.update_booking_questions_updated_at();
DROP FUNCTION IF EXISTS public.update_creator_availability_updated_at();

-- 5. Enums que quedan huérfanos
DROP TYPE IF EXISTS public.booking_status;
DROP TYPE IF EXISTS public.booking_location_type;
