-- pg_cron + pg_net deben estar habilitados
-- Energy decay diario, Misiones semanales lunes, Reminders 30min, Cleanup presence 10min

CREATE OR REPLACE FUNCTION public.decay_member_energy()
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_affected INT := 0; v_reset INT := 0;
BEGIN
  UPDATE academy_space_points
  SET energy = LEAST(energy, 30), streak_days = 0
  WHERE last_active_date < CURRENT_DATE - INTERVAL '7 days' AND energy > 30;
  GET DIAGNOSTICS v_reset = ROW_COUNT;

  UPDATE academy_space_points
  SET energy = GREATEST(0, energy - 10)
  WHERE last_active_date < CURRENT_DATE AND energy > 0;
  GET DIAGNOSTICS v_affected = ROW_COUNT;

  RETURN jsonb_build_object('decayed', v_affected, 'reset_to_30', v_reset);
END;
$$;
GRANT EXECUTE ON FUNCTION public.decay_member_energy() TO service_role;

CREATE OR REPLACE FUNCTION public.generate_weekly_missions()
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_member RECORD; v_week_start DATE; v_count INT := 0; v_t JSONB; v_picked JSONB[];
  v_templates JSONB := '[
    {"type":"complete_lessons","goal":3,"xp":30,"energy":15,"emoji":"📚","title":"Completa 3 lecciones esta semana"},
    {"type":"complete_lessons","goal":5,"xp":50,"energy":25,"emoji":"🎯","title":"Completa 5 lecciones esta semana"},
    {"type":"create_posts","goal":1,"xp":20,"energy":10,"emoji":"📣","title":"Publica algo en la comunidad"},
    {"type":"create_posts","goal":3,"xp":40,"energy":20,"emoji":"✍️","title":"Publica 3 posts esta semana"},
    {"type":"leave_comments","goal":5,"xp":25,"energy":15,"emoji":"💬","title":"Comenta 5 veces en posts"},
    {"type":"leave_comments","goal":10,"xp":50,"energy":25,"emoji":"🗣️","title":"Comenta 10 veces esta semana"},
    {"type":"react_posts","goal":10,"xp":15,"energy":10,"emoji":"❤️","title":"Reacciona a 10 posts"},
    {"type":"finish_quiz","goal":1,"xp":40,"energy":20,"emoji":"🧠","title":"Aprueba un examen"},
    {"type":"reach_streak","goal":7,"xp":60,"energy":40,"emoji":"🔥","title":"Mantén tu racha 7 días"}
  ]'::jsonb;
BEGIN
  v_week_start := CURRENT_DATE - ((EXTRACT(DOW FROM CURRENT_DATE)::INT + 6) % 7);
  FOR v_member IN
    SELECT DISTINCT space_id, user_id FROM academy_space_points
    WHERE last_active_date >= CURRENT_DATE - INTERVAL '14 days'
  LOOP
    IF EXISTS (SELECT 1 FROM academy_weekly_missions WHERE space_id = v_member.space_id AND user_id = v_member.user_id AND week_start = v_week_start) THEN CONTINUE; END IF;
    SELECT array_agg(template) INTO v_picked
    FROM (SELECT jsonb_array_elements(v_templates) AS template ORDER BY random() LIMIT 3) sub;
    FOREACH v_t IN ARRAY v_picked LOOP
      INSERT INTO academy_weekly_missions (space_id, user_id, week_start, mission_type, goal, xp_reward, energy_reward, emoji, title)
      VALUES (v_member.space_id, v_member.user_id, v_week_start, v_t->>'type', (v_t->>'goal')::INT, (v_t->>'xp')::INT, (v_t->>'energy')::INT, v_t->>'emoji', v_t->>'title')
      ON CONFLICT (space_id, user_id, week_start, mission_type) DO NOTHING;
      v_count := v_count + 1;
    END LOOP;
  END LOOP;
  RETURN jsonb_build_object('missions_created', v_count, 'week_start', v_week_start);
END;
$$;
GRANT EXECUTE ON FUNCTION public.generate_weekly_missions() TO service_role;

CREATE OR REPLACE FUNCTION public.bump_mission_progress(p_space_id UUID, p_user_id UUID, p_mission_type TEXT, p_delta INT DEFAULT 1)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_week_start DATE; v_mission RECORD;
BEGIN
  v_week_start := CURRENT_DATE - ((EXTRACT(DOW FROM CURRENT_DATE)::INT + 6) % 7);
  FOR v_mission IN
    SELECT * FROM academy_weekly_missions
    WHERE space_id = p_space_id AND user_id = p_user_id AND week_start = v_week_start
      AND mission_type = p_mission_type AND completed = false
  LOOP
    UPDATE academy_weekly_missions
    SET progress = LEAST(goal, progress + p_delta),
        completed = (progress + p_delta >= goal),
        completed_at = CASE WHEN progress + p_delta >= goal THEN NOW() ELSE NULL END
    WHERE id = v_mission.id;
    IF v_mission.progress + p_delta >= v_mission.goal THEN
      PERFORM award_space_points(p_space_id, p_user_id, 'streak_milestone', LEAST(v_mission.xp_reward, 25));
      PERFORM update_member_energy(p_space_id, p_user_id, v_mission.energy_reward);
    END IF;
  END LOOP;
END;
$$;
GRANT EXECUTE ON FUNCTION public.bump_mission_progress(UUID, UUID, TEXT, INT) TO service_role;

-- Triggers de bump_mission_progress
CREATE OR REPLACE FUNCTION public.trg_mission_on_post()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'published' THEN PERFORM bump_mission_progress(NEW.space_id, NEW.author_id, 'create_posts'); END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_academy_mission_post ON public.academy_posts;
CREATE TRIGGER trg_academy_mission_post AFTER INSERT ON public.academy_posts FOR EACH ROW EXECUTE FUNCTION public.trg_mission_on_post();

CREATE OR REPLACE FUNCTION public.trg_mission_on_comment()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_space_id UUID;
BEGIN
  SELECT space_id INTO v_space_id FROM academy_posts WHERE id = NEW.post_id;
  IF v_space_id IS NOT NULL THEN PERFORM bump_mission_progress(v_space_id, NEW.author_id, 'leave_comments'); END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_academy_mission_comment ON public.academy_post_comments;
CREATE TRIGGER trg_academy_mission_comment AFTER INSERT ON public.academy_post_comments FOR EACH ROW EXECUTE FUNCTION public.trg_mission_on_comment();

CREATE OR REPLACE FUNCTION public.trg_mission_on_reaction()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_space_id UUID;
BEGIN
  SELECT space_id INTO v_space_id FROM academy_posts WHERE id = NEW.post_id;
  IF v_space_id IS NOT NULL THEN PERFORM bump_mission_progress(v_space_id, NEW.user_id, 'react_posts'); END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_academy_mission_reaction ON public.academy_post_reactions;
CREATE TRIGGER trg_academy_mission_reaction AFTER INSERT ON public.academy_post_reactions FOR EACH ROW EXECUTE FUNCTION public.trg_mission_on_reaction();

CREATE OR REPLACE FUNCTION public.trg_mission_on_lesson()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_space_id UUID;
BEGIN
  IF NEW.status = 'completed' AND (OLD IS NULL OR OLD.status IS DISTINCT FROM 'completed') THEN
    SELECT c.space_id INTO v_space_id FROM academy_lessons l JOIN academy_courses c ON c.id = l.course_id WHERE l.id = NEW.lesson_id;
    IF v_space_id IS NOT NULL THEN PERFORM bump_mission_progress(v_space_id, NEW.user_id, 'complete_lessons'); END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_academy_mission_lesson ON public.academy_lesson_progress;
CREATE TRIGGER trg_academy_mission_lesson AFTER INSERT OR UPDATE OF status ON public.academy_lesson_progress FOR EACH ROW EXECUTE FUNCTION public.trg_mission_on_lesson();

CREATE OR REPLACE FUNCTION public.trg_mission_on_quiz()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_space_id UUID;
BEGIN
  IF NEW.status = 'passed' AND (OLD IS NULL OR OLD.status IS DISTINCT FROM 'passed') THEN
    SELECT c.space_id INTO v_space_id FROM academy_quizzes q JOIN academy_courses c ON c.id = q.course_id WHERE q.id = NEW.quiz_id;
    IF v_space_id IS NOT NULL THEN PERFORM bump_mission_progress(v_space_id, NEW.user_id, 'finish_quiz'); END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_academy_mission_quiz ON public.academy_quiz_attempts;
CREATE TRIGGER trg_academy_mission_quiz AFTER UPDATE OF status ON public.academy_quiz_attempts FOR EACH ROW EXECUTE FUNCTION public.trg_mission_on_quiz();

-- Cron jobs
SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname IN (
  'academia-energy-decay-daily', 'academia-weekly-missions',
  'academia-event-reminders-30min', 'academia-cleanup-presence'
);
SELECT cron.schedule('academia-energy-decay-daily',     '0 3 * * *',  'SELECT public.decay_member_energy();');
SELECT cron.schedule('academia-weekly-missions',         '0 4 * * 1',  'SELECT public.generate_weekly_missions();');
SELECT cron.schedule('academia-event-reminders-30min',   '*/30 * * * *', 'SELECT public.send_event_reminders();');
SELECT cron.schedule('academia-cleanup-presence',        '*/10 * * * *', 'SELECT public.cleanup_stale_presence();');
