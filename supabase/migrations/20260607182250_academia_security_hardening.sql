-- ETAPA 1 — Endurecimiento de seguridad del módulo Academia
-- Cierra C-02 (RPCs cert sin validar caller), C-03 (award_space_points abierto),
-- C-04 (escrituras community sin validar membresía), A-04 (atomicidad submit quiz),
-- A-07 (NaN en grading con solo manuales — fix en edge function aparte).

-- C-02
CREATE OR REPLACE FUNCTION public.check_certificate_eligibility(p_course_id UUID, p_user_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_req RECORD; v_enrollment RECORD; v_missing JSONB := '[]'::jsonb; v_eligible BOOLEAN := true;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'forbidden: only the user can check their own eligibility';
  END IF;
  SELECT * INTO v_req FROM academy_certificate_requirements WHERE course_id = p_course_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('eligible', false, 'reason', 'no_requirements_configured'); END IF;
  SELECT * INTO v_enrollment FROM academy_enrollments WHERE course_id = p_course_id AND user_id = p_user_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('eligible', false, 'reason', 'not_enrolled'); END IF;
  IF v_enrollment.completion_pct < v_req.min_lessons_completed_pct THEN
    v_eligible := false;
    v_missing := v_missing || jsonb_build_object('type', 'lessons_completion', 'required', v_req.min_lessons_completed_pct, 'current', v_enrollment.completion_pct);
  END IF;
  IF v_req.require_final_exam AND NOT EXISTS (
    SELECT 1 FROM academy_quiz_attempts qa JOIN academy_quizzes q ON q.id = qa.quiz_id
    WHERE q.course_id = p_course_id AND q.scope = 'final' AND qa.user_id = p_user_id AND qa.status = 'passed'
      AND qa.score_pct >= v_req.min_final_exam_score
  ) THEN v_eligible := false; v_missing := v_missing || '"final_exam_not_passed"'::jsonb; END IF;
  IF v_req.require_all_module_exams AND EXISTS (
    SELECT 1 FROM academy_quizzes q WHERE q.course_id = p_course_id AND q.scope = 'end_module' AND q.is_required_for_cert = true
    AND NOT EXISTS (SELECT 1 FROM academy_quiz_attempts qa WHERE qa.quiz_id = q.id AND qa.user_id = p_user_id AND qa.status = 'passed')
  ) THEN v_eligible := false; v_missing := v_missing || '"module_exams_pending"'::jsonb; END IF;
  IF v_req.require_all_manual_reviews AND EXISTS (
    SELECT 1 FROM academy_manual_reviews WHERE course_id = p_course_id AND student_id = p_user_id AND status IN ('pending', 'reviewing')
  ) THEN v_eligible := false; v_missing := v_missing || '"manual_reviews_pending"'::jsonb; END IF;
  RETURN jsonb_build_object('eligible', v_eligible, 'missing', v_missing, 'completion_pct', v_enrollment.completion_pct);
END;
$$;

CREATE OR REPLACE FUNCTION public.issue_academy_certificate(p_course_id UUID, p_user_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_cert RECORD; v_course RECORD; v_student_name TEXT; v_instructor_name TEXT; v_final_score NUMERIC(5,2);
DECLARE v_req RECORD; v_enrollment RECORD;
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'forbidden: only the user can issue their own certificate';
  END IF;
  SELECT * INTO v_req FROM academy_certificate_requirements WHERE course_id = p_course_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('eligible', false, 'reason', 'no_requirements_configured'); END IF;
  SELECT * INTO v_enrollment FROM academy_enrollments WHERE course_id = p_course_id AND user_id = p_user_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('eligible', false, 'reason', 'not_enrolled'); END IF;
  IF v_enrollment.completion_pct < v_req.min_lessons_completed_pct THEN
    RETURN jsonb_build_object('eligible', false, 'reason', 'not_complete');
  END IF;
  IF v_req.require_final_exam AND NOT EXISTS (
    SELECT 1 FROM academy_quiz_attempts qa JOIN academy_quizzes q ON q.id = qa.quiz_id
    WHERE q.course_id = p_course_id AND q.scope = 'final' AND qa.user_id = p_user_id AND qa.status = 'passed'
      AND qa.score_pct >= v_req.min_final_exam_score
  ) THEN RETURN jsonb_build_object('eligible', false, 'reason', 'final_exam_pending'); END IF;
  IF EXISTS (SELECT 1 FROM academy_certificates WHERE course_id = p_course_id AND user_id = p_user_id) THEN
    SELECT * INTO v_cert FROM academy_certificates WHERE course_id = p_course_id AND user_id = p_user_id;
    RETURN jsonb_build_object('eligible', true, 'already_issued', true, 'cert_code', v_cert.cert_code);
  END IF;
  SELECT c.title, c.instructor_id, ac.name AS space_name INTO v_course
  FROM academy_courses c JOIN academy_spaces ac ON ac.id = c.space_id WHERE c.id = p_course_id;
  SELECT COALESCE(full_name, 'Estudiante') INTO v_student_name FROM profiles WHERE id = p_user_id;
  SELECT COALESCE(full_name, 'Instructor') INTO v_instructor_name FROM profiles WHERE id = v_course.instructor_id;
  SELECT score_pct INTO v_final_score FROM academy_quiz_attempts qa JOIN academy_quizzes q ON q.id = qa.quiz_id
    WHERE q.course_id = p_course_id AND q.scope = 'final' AND qa.user_id = p_user_id AND qa.status = 'passed'
    ORDER BY qa.submitted_at DESC LIMIT 1;
  INSERT INTO academy_certificates (course_id, user_id, enrollment_id, student_name, course_title, instructor_name, space_name, final_score_pct)
  SELECT p_course_id, p_user_id, ae.id, COALESCE(v_student_name,'Estudiante'), v_course.title, COALESCE(v_instructor_name,'Instructor'), v_course.space_name, v_final_score
  FROM academy_enrollments ae WHERE ae.course_id = p_course_id AND ae.user_id = p_user_id RETURNING * INTO v_cert;
  UPDATE academy_enrollments SET certificate_issued_at = NOW() WHERE course_id = p_course_id AND user_id = p_user_id;
  BEGIN
    INSERT INTO reputation_events (user_id, event_type, event_subtype, base_points, final_points, event_date)
    VALUES (p_user_id, 'academy_certificate_earned', p_course_id::text, 500, 500, CURRENT_DATE);
  EXCEPTION WHEN OTHERS THEN NULL; END;
  RETURN jsonb_build_object('eligible', true, 'issued', true, 'cert_code', v_cert.cert_code, 'verification_url', v_cert.verification_url);
END;
$$;

-- C-03
REVOKE EXECUTE ON FUNCTION public.award_space_points(UUID, UUID, TEXT, INT, UUID) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.award_space_points(UUID, UUID, TEXT, INT, UUID) FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.award_space_points(p_space_id UUID, p_user_id UUID, p_action TEXT, p_points INT, p_reference_id UUID DEFAULT NULL)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_max_points INT;
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
    ELSE -1
  END;
  IF v_max_points = -1 THEN RAISE EXCEPTION 'invalid_action: %', p_action; END IF;
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
  UPDATE academy_space_points SET level = LEAST(10, GREATEST(1, (total_points / 100) + 1))
  WHERE space_id = p_space_id AND user_id = p_user_id;
  BEGIN
    INSERT INTO reputation_events (user_id, event_type, event_subtype, base_points, final_points, event_date)
    VALUES (p_user_id, 'academy_community_action', p_action, LEAST(p_points, 10), LEAST(p_points, 10), CURRENT_DATE);
  EXCEPTION WHEN OTHERS THEN NULL; END;
END;
$$;
GRANT EXECUTE ON FUNCTION public.award_space_points(UUID, UUID, TEXT, INT, UUID) TO service_role;

-- C-04
CREATE OR REPLACE FUNCTION public.is_academy_member(p_space_id UUID, p_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM academy_memberships WHERE space_id = p_space_id AND user_id = p_user_id AND is_active = true)
      OR EXISTS (SELECT 1 FROM academy_spaces WHERE id = p_space_id AND owner_id = p_user_id);
$$;
GRANT EXECUTE ON FUNCTION public.is_academy_member(UUID, UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.trg_auto_join_on_post()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM academy_spaces WHERE id = NEW.space_id AND is_public = true)
     AND NOT public.is_academy_member(NEW.space_id, NEW.author_id) THEN
    INSERT INTO academy_memberships (space_id, user_id, role, is_active)
    VALUES (NEW.space_id, NEW.author_id, 'student', true)
    ON CONFLICT (space_id, user_id) DO UPDATE SET is_active = true;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_academy_auto_join_on_post ON public.academy_posts;
CREATE TRIGGER trg_academy_auto_join_on_post BEFORE INSERT ON public.academy_posts
  FOR EACH ROW EXECUTE FUNCTION public.trg_auto_join_on_post();

DROP POLICY IF EXISTS "posts_own_manage" ON public.academy_posts;
CREATE POLICY "posts_own_insert" ON public.academy_posts FOR INSERT TO authenticated
WITH CHECK (author_id = auth.uid() AND (public.is_academy_member(space_id, auth.uid())
  OR EXISTS (SELECT 1 FROM academy_spaces WHERE id = space_id AND is_public = true)));
CREATE POLICY "posts_own_update" ON public.academy_posts FOR UPDATE TO authenticated USING (author_id = auth.uid()) WITH CHECK (author_id = auth.uid());
CREATE POLICY "posts_own_delete" ON public.academy_posts FOR DELETE TO authenticated USING (author_id = auth.uid());

DROP POLICY IF EXISTS "reactions_own" ON public.academy_post_reactions;
CREATE POLICY "reactions_own" ON public.academy_post_reactions FOR ALL TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid() AND EXISTS (SELECT 1 FROM academy_posts p WHERE p.id = post_id AND public.is_academy_member(p.space_id, auth.uid())));

DROP POLICY IF EXISTS "comments_own" ON public.academy_post_comments;
CREATE POLICY "comments_own" ON public.academy_post_comments FOR ALL TO authenticated
USING (author_id = auth.uid())
WITH CHECK (author_id = auth.uid() AND EXISTS (SELECT 1 FROM academy_posts p WHERE p.id = post_id AND public.is_academy_member(p.space_id, auth.uid())));

DROP POLICY IF EXISTS "poll_votes_own" ON public.academy_poll_votes;
CREATE POLICY "poll_votes_own" ON public.academy_poll_votes FOR ALL TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid() AND EXISTS (SELECT 1 FROM academy_posts p WHERE p.id = post_id AND public.is_academy_member(p.space_id, auth.uid())));

DROP POLICY IF EXISTS "rsvps_own" ON public.academy_event_rsvps;
CREATE POLICY "rsvps_own" ON public.academy_event_rsvps FOR ALL TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid() AND EXISTS (SELECT 1 FROM academy_space_events e WHERE e.id = event_id AND public.is_academy_member(e.space_id, auth.uid())));

-- A-04 atomic submit
CREATE OR REPLACE FUNCTION public.submit_quiz_attempt_atomic(p_attempt_id UUID, p_quiz_id UUID, p_answers JSONB, p_time_spent_seconds INT DEFAULT 0)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_attempt RECORD; v_answer JSONB;
BEGIN
  SELECT * INTO v_attempt FROM academy_quiz_attempts WHERE id = p_attempt_id AND user_id = auth.uid();
  IF NOT FOUND THEN RAISE EXCEPTION 'forbidden_or_not_found'; END IF;
  IF v_attempt.quiz_id <> p_quiz_id THEN RAISE EXCEPTION 'quiz_mismatch'; END IF;
  IF v_attempt.status <> 'in_progress' THEN RAISE EXCEPTION 'already_submitted'; END IF;
  DELETE FROM academy_attempt_answers WHERE attempt_id = p_attempt_id;
  FOR v_answer IN SELECT * FROM jsonb_array_elements(p_answers) LOOP
    INSERT INTO academy_attempt_answers (attempt_id, question_id, selected_option_ids, ordering_sequence, matching_pairs, text_answer, file_url, file_name, self_eval_checked)
    VALUES (p_attempt_id, (v_answer->>'question_id')::UUID,
      COALESCE(ARRAY(SELECT jsonb_array_elements_text(v_answer->'selected_option_ids'))::UUID[], '{}'::UUID[]),
      COALESCE(ARRAY(SELECT jsonb_array_elements_text(v_answer->'ordering_sequence'))::UUID[], '{}'::UUID[]),
      COALESCE(v_answer->'matching_pairs', '[]'::jsonb),
      v_answer->>'text_answer', v_answer->>'file_url', v_answer->>'file_name',
      COALESCE(v_answer->'self_eval_checked', '[]'::jsonb));
  END LOOP;
  UPDATE academy_quiz_attempts SET time_spent_seconds = p_time_spent_seconds WHERE id = p_attempt_id;
  RETURN jsonb_build_object('success', true, 'attempt_id', p_attempt_id);
END;
$$;
GRANT EXECUTE ON FUNCTION public.submit_quiz_attempt_atomic(UUID, UUID, JSONB, INT) TO authenticated;
