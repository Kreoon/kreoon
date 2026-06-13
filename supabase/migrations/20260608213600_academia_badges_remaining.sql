-- 9 triggers de badges restantes
-- quiz_perfect, quiz_streak_5, helpful_5, socializer, beloved,
-- night_owl, early_bird, mentor (manual), founder

CREATE OR REPLACE FUNCTION public.grant_badge_if_new(p_space_id UUID, p_user_id UUID, p_badge_id TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_inserted BOOLEAN;
BEGIN
  INSERT INTO academy_member_badges (space_id, user_id, badge_id)
  VALUES (p_space_id, p_user_id, p_badge_id)
  ON CONFLICT DO NOTHING
  RETURNING true INTO v_inserted;
  RETURN COALESCE(v_inserted, false);
END;
$$;
GRANT EXECUTE ON FUNCTION public.grant_badge_if_new(UUID, UUID, TEXT) TO service_role;

CREATE OR REPLACE FUNCTION public.trg_badge_quiz_perfect()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_space_id UUID;
BEGIN
  IF NEW.status = 'passed' AND NEW.score_pct >= 100
     AND (OLD IS NULL OR OLD.score_pct IS DISTINCT FROM NEW.score_pct) THEN
    SELECT c.space_id INTO v_space_id
    FROM academy_quizzes q JOIN academy_courses c ON c.id = q.course_id
    WHERE q.id = NEW.quiz_id;
    IF v_space_id IS NOT NULL THEN
      PERFORM grant_badge_if_new(v_space_id, NEW.user_id, 'quiz_perfect');
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_academy_badge_quiz_perfect ON public.academy_quiz_attempts;
CREATE TRIGGER trg_academy_badge_quiz_perfect
  AFTER INSERT OR UPDATE OF status, score_pct ON public.academy_quiz_attempts
  FOR EACH ROW EXECUTE FUNCTION public.trg_badge_quiz_perfect();

CREATE OR REPLACE FUNCTION public.trg_badge_quiz_streak()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_space_id UUID; v_streak INT;
BEGIN
  IF NEW.status = 'passed' AND NEW.attempt_number = 1
     AND (OLD IS NULL OR OLD.status IS DISTINCT FROM 'passed') THEN
    SELECT c.space_id INTO v_space_id
    FROM academy_quizzes q JOIN academy_courses c ON c.id = q.course_id
    WHERE q.id = NEW.quiz_id;
    WITH last5 AS (
      SELECT qa.status, qa.attempt_number FROM academy_quiz_attempts qa
      JOIN academy_quizzes q ON q.id = qa.quiz_id
      JOIN academy_courses c ON c.id = q.course_id
      WHERE c.space_id = v_space_id AND qa.user_id = NEW.user_id
        AND qa.status IN ('passed','failed')
      ORDER BY qa.submitted_at DESC LIMIT 5
    )
    SELECT COUNT(*) INTO v_streak FROM last5 WHERE status = 'passed' AND attempt_number = 1;
    IF v_streak >= 5 AND v_space_id IS NOT NULL THEN
      PERFORM grant_badge_if_new(v_space_id, NEW.user_id, 'quiz_streak_5');
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_academy_badge_quiz_streak ON public.academy_quiz_attempts;
CREATE TRIGGER trg_academy_badge_quiz_streak
  AFTER UPDATE OF status ON public.academy_quiz_attempts
  FOR EACH ROW EXECUTE FUNCTION public.trg_badge_quiz_streak();

CREATE OR REPLACE FUNCTION public.trg_badge_helpful()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_count INT;
BEGIN
  IF NEW.is_featured = true AND (OLD IS NULL OR OLD.is_featured = false) THEN
    SELECT COUNT(*) INTO v_count FROM academy_lesson_comments WHERE author_id = NEW.author_id AND is_featured = true;
    IF v_count >= 5 THEN PERFORM grant_badge_if_new(NEW.space_id, NEW.author_id, 'helpful_5'); END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_academy_badge_helpful ON public.academy_lesson_comments;
CREATE TRIGGER trg_academy_badge_helpful AFTER UPDATE OF is_featured ON public.academy_lesson_comments
  FOR EACH ROW EXECUTE FUNCTION public.trg_badge_helpful();

CREATE OR REPLACE FUNCTION public.trg_badge_socializer()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_distinct_posts INT; v_space_id UUID;
BEGIN
  SELECT space_id INTO v_space_id FROM academy_posts WHERE id = NEW.post_id;
  IF v_space_id IS NULL THEN RETURN NEW; END IF;
  SELECT COUNT(DISTINCT post_id) INTO v_distinct_posts FROM academy_post_comments
    WHERE author_id = NEW.author_id AND is_deleted = false;
  IF v_distinct_posts >= 25 THEN PERFORM grant_badge_if_new(v_space_id, NEW.author_id, 'socializer'); END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_academy_badge_socializer ON public.academy_post_comments;
CREATE TRIGGER trg_academy_badge_socializer AFTER INSERT ON public.academy_post_comments
  FOR EACH ROW EXECUTE FUNCTION public.trg_badge_socializer();

CREATE OR REPLACE FUNCTION public.trg_badge_beloved()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_space_id UUID; v_author_id UUID; v_total INT;
BEGIN
  SELECT space_id, author_id INTO v_space_id, v_author_id FROM academy_posts WHERE id = NEW.post_id;
  IF v_space_id IS NULL OR v_author_id IS NULL OR v_author_id = NEW.user_id THEN RETURN NEW; END IF;
  SELECT COALESCE(SUM(like_count), 0) INTO v_total FROM academy_posts WHERE author_id = v_author_id;
  IF v_total >= 100 THEN PERFORM grant_badge_if_new(v_space_id, v_author_id, 'beloved'); END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_academy_badge_beloved ON public.academy_post_reactions;
CREATE TRIGGER trg_academy_badge_beloved AFTER INSERT ON public.academy_post_reactions
  FOR EACH ROW EXECUTE FUNCTION public.trg_badge_beloved();

CREATE OR REPLACE FUNCTION public.trg_badge_owl_or_bird()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_space_id UUID; v_hour INT; v_night_count INT; v_early_count INT;
BEGIN
  IF NEW.status = 'completed' AND (OLD IS NULL OR OLD.status IS DISTINCT FROM 'completed') THEN
    SELECT c.space_id INTO v_space_id FROM academy_lessons l JOIN academy_courses c ON c.id = l.course_id WHERE l.id = NEW.lesson_id;
    v_hour := EXTRACT(HOUR FROM COALESCE(NEW.completed_at, NOW()));
    IF v_space_id IS NOT NULL THEN
      IF v_hour >= 23 OR v_hour <= 3 THEN
        SELECT COUNT(*) INTO v_night_count FROM academy_lesson_progress WHERE user_id = NEW.user_id AND status = 'completed' AND (EXTRACT(HOUR FROM completed_at) >= 23 OR EXTRACT(HOUR FROM completed_at) <= 3);
        IF v_night_count >= 10 THEN PERFORM grant_badge_if_new(v_space_id, NEW.user_id, 'night_owl'); END IF;
      ELSIF v_hour >= 4 AND v_hour <= 7 THEN
        SELECT COUNT(*) INTO v_early_count FROM academy_lesson_progress WHERE user_id = NEW.user_id AND status = 'completed' AND EXTRACT(HOUR FROM completed_at) BETWEEN 4 AND 7;
        IF v_early_count >= 10 THEN PERFORM grant_badge_if_new(v_space_id, NEW.user_id, 'early_bird'); END IF;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_academy_badge_owl_or_bird ON public.academy_lesson_progress;
CREATE TRIGGER trg_academy_badge_owl_or_bird AFTER INSERT OR UPDATE OF status ON public.academy_lesson_progress
  FOR EACH ROW EXECUTE FUNCTION public.trg_badge_owl_or_bird();

CREATE OR REPLACE FUNCTION public.trg_badge_founder()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_count INT;
BEGIN
  IF NEW.is_active = true THEN
    SELECT COUNT(*) INTO v_count FROM academy_memberships WHERE space_id = NEW.space_id AND is_active = true;
    IF v_count <= 100 THEN PERFORM grant_badge_if_new(NEW.space_id, NEW.user_id, 'founder'); END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_academy_badge_founder ON public.academy_memberships;
CREATE TRIGGER trg_academy_badge_founder AFTER INSERT ON public.academy_memberships
  FOR EACH ROW EXECUTE FUNCTION public.trg_badge_founder();

CREATE OR REPLACE FUNCTION public.grant_mentor_badge(p_space_id UUID, p_target_user_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM academy_spaces WHERE id = p_space_id AND owner_id = auth.uid()) THEN
    RAISE EXCEPTION 'only the space owner can grant mentor badge';
  END IF;
  RETURN grant_badge_if_new(p_space_id, p_target_user_id, 'mentor');
END;
$$;
GRANT EXECUTE ON FUNCTION public.grant_mentor_badge(UUID, UUID) TO authenticated;
