-- Extender whitelist de award_space_points con 4 acciones que la versión
-- legacy de 4 args manejaba pero la nueva de 5 args había omitido:
--   intro_post (50 pts) — bonus por presentación en el feed
--   referral (100 pts) — bonus por traer un nuevo miembro
--   share (10 pts) — compartir contenido
--   live_attended (20 pts) — asistir a live
--
-- Bug: al borrar la versión legacy (migración 20260613000010), las
-- llamadas con esas acciones empezaron a fallar con
-- 'invalid_action: intro_post' P0001.
--
-- Fix: agregar esas 4 acciones a la whitelist de la versión nueva. No
-- cambia la lógica de level/reputation_events, solo extiende valores
-- válidos de p_action.

CREATE OR REPLACE FUNCTION public.award_space_points(
  p_space_id uuid,
  p_user_id uuid,
  p_action text,
  p_points integer,
  p_reference_id uuid DEFAULT NULL::uuid
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $func$
DECLARE
  v_max_points INT;
BEGIN
  v_max_points := CASE p_action
    WHEN 'post_created'        THEN 5
    WHEN 'comment_created'     THEN 2
    WHEN 'reaction_received'   THEN 1
    WHEN 'lesson_completed'    THEN 10
    WHEN 'course_completed'    THEN 50
    WHEN 'streak_milestone'    THEN 25
    WHEN 'badge_earned'        THEN 30
    WHEN 'quiz_passed'         THEN 15
    WHEN 'intro_post'          THEN 50
    WHEN 'referral'            THEN 100
    WHEN 'share'               THEN 10
    WHEN 'live_attended'       THEN 20
    ELSE -1
  END;

  IF v_max_points = -1 THEN
    RAISE EXCEPTION 'invalid_action: %', p_action;
  END IF;

  p_points := LEAST(GREATEST(p_points, 0), v_max_points);

  INSERT INTO academy_space_point_events (space_id, user_id, action, points, reference_id)
  VALUES (p_space_id, p_user_id, p_action, p_points, p_reference_id);

  INSERT INTO academy_space_points (space_id, user_id, total_points, current_week_points, current_month_points)
  VALUES (p_space_id, p_user_id, p_points, p_points, p_points)
  ON CONFLICT (space_id, user_id) DO UPDATE SET
    total_points = academy_space_points.total_points + p_points,
    current_week_points = academy_space_points.current_week_points + p_points,
    current_month_points = academy_space_points.current_month_points + p_points,
    updated_at = NOW();

  UPDATE academy_space_points
  SET level = LEAST(10, GREATEST(1, (total_points / 100) + 1))
  WHERE space_id = p_space_id AND user_id = p_user_id;

  BEGIN
    INSERT INTO reputation_events (user_id, event_type, event_subtype, base_points, final_points, event_date)
    VALUES (p_user_id, 'academy_community_action', p_action,
            LEAST(p_points, 10), LEAST(p_points, 10), CURRENT_DATE);
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
END;
$func$;
