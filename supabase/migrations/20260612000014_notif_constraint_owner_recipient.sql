-- ============================================================================
-- Streaming layer follow-up:
-- 1) Extender academy_notifications.type para los nuevos tipos
--    (new_post, new_comment, level_up, payment_received) que el commit
--    30715843 introdujo pero el CHECK constraint legacy bloqueaba.
-- 2) Trigger trg_academy_notify_new_member ahora notifica también al
--    owner_id del space (que no tiene fila en academy_memberships).
-- 3) Renombrar 'new_member' → 'new_member_joined' para alinear con la
--    nomenclatura legacy ya aceptada por el constraint.
-- ============================================================================

ALTER TABLE public.academy_notifications
  DROP CONSTRAINT IF EXISTS academy_notifications_type_check;

ALTER TABLE public.academy_notifications
  ADD CONSTRAINT academy_notifications_type_check CHECK (
    type = ANY (ARRAY[
      'comment_reply', 'post_reaction', 'comment_on_my_post',
      'lesson_comment_reply', 'lesson_comment_featured', 'new_lesson',
      'event_reminder_24h', 'event_reminder_1h', 'event_cancelled',
      'new_member_joined', 'mention', 'auto_dm', 'certificate_earned',
      'new_post', 'new_comment', 'level_up', 'payment_received'
    ]::text[])
  );

CREATE OR REPLACE FUNCTION public.trg_academy_notify_new_member()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $func$
DECLARE
  v_owner_id UUID;
  v_space_name TEXT;
  v_space_slug TEXT;
  v_member_name TEXT;
BEGIN
  IF NOT NEW.is_active OR NEW.role = 'owner' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.is_active = TRUE THEN RETURN NEW; END IF;

  SELECT owner_id, name, slug INTO v_owner_id, v_space_name, v_space_slug
    FROM academy_spaces WHERE id = NEW.space_id;
  SELECT COALESCE(full_name, 'Alguien') INTO v_member_name
    FROM profiles WHERE id = NEW.user_id;

  INSERT INTO academy_notifications
    (space_id, recipient_id, sender_id, type, title, body, link,
     reference_id, reference_type, payload)
  SELECT DISTINCT
    NEW.space_id, recipient_id, NEW.user_id, 'new_member_joined',
    v_member_name || ' se unió a ' || COALESCE(v_space_name, 'la academia'),
    NULL,
    '/academia/' || v_space_slug,
    NEW.user_id, 'academy_membership',
    jsonb_build_object('member_name', v_member_name, 'space_name', v_space_name)
  FROM (
    SELECT am.user_id AS recipient_id
      FROM academy_memberships am
     WHERE am.space_id = NEW.space_id AND am.is_active = true
    UNION
    SELECT v_owner_id WHERE v_owner_id IS NOT NULL
  ) r
  WHERE recipient_id <> NEW.user_id
    AND _academy_wants_notification(recipient_id, NEW.space_id, 'new_member');

  RETURN NEW;
END; $func$;
