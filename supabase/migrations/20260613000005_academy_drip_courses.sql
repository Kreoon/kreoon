-- Drip courses: lección se desbloquea N días tras la inscripción al curso.
-- NULL/0 = disponible inmediatamente (default).
ALTER TABLE public.academy_lessons
  ADD COLUMN IF NOT EXISTS unlock_after_days INT NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.is_lesson_unlocked_for_user(
  p_lesson_id UUID, p_user_id UUID DEFAULT NULL
) RETURNS BOOLEAN
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $func$
DECLARE
  v_unlock INT;
  v_course_id UUID;
  v_enrolled_at TIMESTAMPTZ;
  v_uid UUID := COALESCE(p_user_id, auth.uid());
BEGIN
  IF v_uid IS NULL THEN RETURN false; END IF;
  SELECT unlock_after_days, course_id INTO v_unlock, v_course_id
    FROM academy_lessons WHERE id = p_lesson_id;
  IF v_unlock IS NULL OR v_unlock = 0 THEN RETURN true; END IF;
  SELECT enrolled_at INTO v_enrolled_at
    FROM academy_enrollments
   WHERE user_id = v_uid AND course_id = v_course_id;
  IF v_enrolled_at IS NULL THEN RETURN false; END IF;
  RETURN (v_enrolled_at + (v_unlock || ' days')::interval) <= NOW();
END; $func$;

GRANT EXECUTE ON FUNCTION public.is_lesson_unlocked_for_user(UUID, UUID)
  TO authenticated, anon;

CREATE OR REPLACE FUNCTION public.days_until_lesson_unlock(p_lesson_id UUID)
RETURNS INT
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $func$
DECLARE
  v_unlock INT;
  v_course_id UUID;
  v_enrolled_at TIMESTAMPTZ;
  v_unlock_at TIMESTAMPTZ;
BEGIN
  IF auth.uid() IS NULL THEN RETURN -1; END IF;
  SELECT unlock_after_days, course_id INTO v_unlock, v_course_id
    FROM academy_lessons WHERE id = p_lesson_id;
  IF v_unlock IS NULL OR v_unlock = 0 THEN RETURN 0; END IF;
  SELECT enrolled_at INTO v_enrolled_at
    FROM academy_enrollments
   WHERE user_id = auth.uid() AND course_id = v_course_id;
  IF v_enrolled_at IS NULL THEN RETURN v_unlock; END IF;
  v_unlock_at := v_enrolled_at + (v_unlock || ' days')::interval;
  IF v_unlock_at <= NOW() THEN RETURN 0; END IF;
  RETURN CEIL(EXTRACT(EPOCH FROM (v_unlock_at - NOW())) / 86400)::INT;
END; $func$;

GRANT EXECUTE ON FUNCTION public.days_until_lesson_unlock(UUID)
  TO authenticated, anon;
