-- ============================================================
-- CRION Academy v2 — Extender academy_notifications.type
--
-- Drop CHECK constraint estricto y volverlo text libre.
-- Razón: el event bus (academy_emit_event) emite types nuevos por
-- bloque (welcome_to_space, lesson_unlocked, level_up, badge_earned,
-- cohort_starting, checkpoint_due, challenge_completed, cart_abandoned,
-- upsell_offer, certificate_ready, etc.). Mantener el CHECK obliga a
-- migrar el constraint en cada feature y bloquea el fan-out genérico.
--
-- Compensación: los types los emite código de confianza (edge fanout +
-- triggers). Si en el futuro se necesita auditoría, se crea una tabla
-- `academy_notification_types` de referencia + FK en lugar de CHECK.
--
-- Rollback manual:
--   ALTER TABLE public.academy_notifications
--     ADD CONSTRAINT academy_notifications_type_check
--     CHECK (type IN ('comment_reply','post_reaction', ...));
-- ============================================================

ALTER TABLE public.academy_notifications
  DROP CONSTRAINT IF EXISTS academy_notifications_type_check;

COMMENT ON COLUMN public.academy_notifications.type IS
  'Tipo de notificación. Texto libre desde Academy v2 — emitido por academy_emit_event y triggers. Convención: snake_case.';
