-- ============================================================
-- KREOON ACADEMIA MODULE - Migración inicial
-- Módulo completo: Spaces, Courses, Lessons, Quizzes, Certs
-- ============================================================

-- ──────────────────────────────────────────────
-- 1. PLANES DE ACADEMIA
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.academy_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  price_usd NUMERIC(10,2) NOT NULL,
  transaction_fee_pct NUMERIC(5,4) NOT NULL,
  features JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.academy_plans (slug, name, price_usd, transaction_fee_pct, features) VALUES
('hobby', 'Academia Hobby', 9.00, 0.10, '{"max_spaces": 1, "live_calls": true, "affiliates": true, "custom_url": true}'),
('pro', 'Academia Pro', 99.00, 0.029, '{"max_spaces": -1, "live_calls": true, "affiliates": true, "custom_url": true}')
ON CONFLICT (slug) DO NOTHING;

-- ──────────────────────────────────────────────
-- 2. ACADEMY SPACES
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.academy_spaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_slug TEXT NOT NULL DEFAULT 'hobby' REFERENCES public.academy_plans(slug),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  cover_image_url TEXT,
  logo_url TEXT,
  accent_color TEXT DEFAULT '#8B5CF6',
  is_public BOOLEAN DEFAULT true,
  membership_price_usd NUMERIC(10,2),
  member_count INT DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'deleted')),
  custom_domain TEXT,
  stripe_product_id TEXT,
  stripe_price_id TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_academy_spaces_owner ON public.academy_spaces(owner_id);
CREATE INDEX IF NOT EXISTS idx_academy_spaces_slug ON public.academy_spaces(slug);

-- ──────────────────────────────────────────────
-- 3. ACADEMY MEMBERSHIPS
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.academy_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID NOT NULL REFERENCES public.academy_spaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('owner', 'instructor', 'moderator', 'student')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  stripe_subscription_id TEXT,
  UNIQUE(space_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_academy_memberships_space ON public.academy_memberships(space_id);
CREATE INDEX IF NOT EXISTS idx_academy_memberships_user ON public.academy_memberships(user_id);

-- ──────────────────────────────────────────────
-- 4. COURSES
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.academy_courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID NOT NULL REFERENCES public.academy_spaces(id) ON DELETE CASCADE,
  instructor_id UUID NOT NULL REFERENCES auth.users(id),
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  cover_image_url TEXT,
  trailer_url TEXT,
  price_usd NUMERIC(10,2) DEFAULT 0,
  is_free BOOLEAN GENERATED ALWAYS AS (price_usd = 0) STORED,
  difficulty TEXT DEFAULT 'beginner' CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  language TEXT DEFAULT 'es',
  tags TEXT[] DEFAULT '{}',
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  enrolled_count INT DEFAULT 0,
  completion_rate NUMERIC(5,2) DEFAULT 0,
  avg_rating NUMERIC(3,2) DEFAULT 0,
  review_count INT DEFAULT 0,
  total_duration_minutes INT DEFAULT 0,
  certificate_enabled BOOLEAN DEFAULT false,
  stripe_product_id TEXT,
  stripe_price_id TEXT,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(space_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_academy_courses_space ON public.academy_courses(space_id);
CREATE INDEX IF NOT EXISTS idx_academy_courses_instructor ON public.academy_courses(instructor_id);

-- ──────────────────────────────────────────────
-- 5. ENROLLMENTS
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.academy_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.academy_courses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  completion_pct NUMERIC(5,2) DEFAULT 0,
  last_accessed_at TIMESTAMPTZ,
  certificate_issued_at TIMESTAMPTZ,
  amount_paid_usd NUMERIC(10,2) DEFAULT 0,
  stripe_payment_intent_id TEXT,
  UNIQUE(course_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_academy_enrollments_course ON public.academy_enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_academy_enrollments_user ON public.academy_enrollments(user_id);

-- ──────────────────────────────────────────────
-- 6. MODULES
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.academy_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.academy_courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  sort_order INT DEFAULT 0,
  is_free_preview BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_academy_modules_course ON public.academy_modules(course_id);

-- ──────────────────────────────────────────────
-- 7. LESSONS
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.academy_lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID NOT NULL REFERENCES public.academy_modules(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.academy_courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'video' CHECK (type IN ('video', 'text', 'quiz', 'live', 'file')),
  content TEXT,
  video_source TEXT CHECK (video_source IN ('bunny', 'youtube', 'vimeo', 'drive', 'url')),
  video_url TEXT,
  video_bunny_id TEXT,
  video_duration_seconds INT,
  video_thumbnail_url TEXT,
  is_free_preview BOOLEAN DEFAULT false,
  is_required BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,
  has_midlesson_quiz BOOLEAN DEFAULT false,
  midlesson_quiz_timestamp_seconds INT,
  end_lesson_quiz_id UUID,
  drip_days_after_enroll INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_academy_lessons_module ON public.academy_lessons(module_id);
CREATE INDEX IF NOT EXISTS idx_academy_lessons_course ON public.academy_lessons(course_id);

-- ──────────────────────────────────────────────
-- 8. LESSON PROGRESS
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.academy_lesson_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES public.academy_lessons(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  enrollment_id UUID NOT NULL REFERENCES public.academy_enrollments(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed')),
  video_watch_pct NUMERIC(5,2) DEFAULT 0,
  last_position_seconds INT DEFAULT 0,
  completed_at TIMESTAMPTZ,
  time_spent_seconds INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(lesson_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_academy_lesson_progress_user ON public.academy_lesson_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_academy_lesson_progress_lesson ON public.academy_lesson_progress(lesson_id);

-- ──────────────────────────────────────────────
-- 9. QUIZZES
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.academy_quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.academy_courses(id) ON DELETE CASCADE,
  scope TEXT NOT NULL CHECK (scope IN ('midlesson', 'end_lesson', 'end_module', 'final')),
  lesson_id UUID REFERENCES public.academy_lessons(id) ON DELETE SET NULL,
  module_id UUID REFERENCES public.academy_modules(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  passing_score_pct INT NOT NULL DEFAULT 70 CHECK (passing_score_pct BETWEEN 0 AND 100),
  max_attempts INT DEFAULT 3,
  cooldown_minutes INT DEFAULT 0,
  randomize_questions BOOLEAN DEFAULT false,
  randomize_options BOOLEAN DEFAULT false,
  show_correct_answers TEXT DEFAULT 'after_passing' CHECK (
    show_correct_answers IN ('always', 'after_passing', 'never')
  ),
  time_limit_minutes INT,
  blocks_next_lesson BOOLEAN DEFAULT true,
  is_required_for_cert BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_academy_quizzes_course ON public.academy_quizzes(course_id);
CREATE INDEX IF NOT EXISTS idx_academy_quizzes_lesson ON public.academy_quizzes(lesson_id);

-- FK diferida: lecciones apuntan a quiz
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_end_lesson_quiz' AND table_name = 'academy_lessons'
  ) THEN
    ALTER TABLE public.academy_lessons
    ADD CONSTRAINT fk_end_lesson_quiz
    FOREIGN KEY (end_lesson_quiz_id) REFERENCES public.academy_quizzes(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ──────────────────────────────────────────────
-- 10. QUESTIONS
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.academy_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES public.academy_quizzes(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN (
    'single_choice', 'multiple_choice', 'true_false', 'ordering',
    'matching', 'open_text', 'file_upload', 'self_evaluation'
  )),
  question_text TEXT NOT NULL,
  explanation TEXT,
  points INT DEFAULT 1,
  sort_order INT DEFAULT 0,
  is_required BOOLEAN DEFAULT true,
  media_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_academy_questions_quiz ON public.academy_questions(quiz_id);

-- ──────────────────────────────────────────────
-- 11. QUESTION OPTIONS
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.academy_question_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES public.academy_questions(id) ON DELETE CASCADE,
  option_text TEXT NOT NULL,
  is_correct BOOLEAN DEFAULT false,
  sort_order INT DEFAULT 0,
  media_url TEXT,
  explanation TEXT
);

CREATE INDEX IF NOT EXISTS idx_academy_question_options_question ON public.academy_question_options(question_id);

-- ──────────────────────────────────────────────
-- 12. QUIZ ATTEMPTS
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.academy_quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES public.academy_quizzes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  enrollment_id UUID NOT NULL REFERENCES public.academy_enrollments(id) ON DELETE CASCADE,
  attempt_number INT NOT NULL DEFAULT 1,
  status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'passed', 'failed', 'pending_review')),
  score_pct NUMERIC(5,2),
  total_points_possible INT DEFAULT 0,
  points_earned NUMERIC(8,2) DEFAULT 0,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  submitted_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewer_feedback TEXT,
  time_spent_seconds INT DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_academy_attempts_quiz_user ON public.academy_quiz_attempts(quiz_id, user_id);
CREATE INDEX IF NOT EXISTS idx_academy_attempts_enrollment ON public.academy_quiz_attempts(enrollment_id);

-- ──────────────────────────────────────────────
-- 13. ATTEMPT ANSWERS
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.academy_attempt_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID NOT NULL REFERENCES public.academy_quiz_attempts(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.academy_questions(id) ON DELETE CASCADE,
  selected_option_ids UUID[] DEFAULT '{}',
  ordering_sequence UUID[] DEFAULT '{}',
  matching_pairs JSONB DEFAULT '[]',
  text_answer TEXT,
  file_url TEXT,
  file_name TEXT,
  self_eval_checked JSONB DEFAULT '[]',
  is_correct BOOLEAN,
  points_awarded NUMERIC(6,2) DEFAULT 0,
  instructor_feedback TEXT,
  graded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_academy_answers_attempt ON public.academy_attempt_answers(attempt_id);

-- ──────────────────────────────────────────────
-- 14. CERTIFICATE REQUIREMENTS
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.academy_certificate_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.academy_courses(id) ON DELETE CASCADE UNIQUE,
  min_lessons_completed_pct INT DEFAULT 100 CHECK (min_lessons_completed_pct BETWEEN 0 AND 100),
  require_all_module_exams BOOLEAN DEFAULT true,
  require_final_exam BOOLEAN DEFAULT true,
  min_final_exam_score INT DEFAULT 70 CHECK (min_final_exam_score BETWEEN 0 AND 100),
  require_all_manual_reviews BOOLEAN DEFAULT false,
  require_self_evaluations BOOLEAN DEFAULT false,
  min_avg_score INT DEFAULT 0 CHECK (min_avg_score BETWEEN 0 AND 100),
  min_time_spent_minutes INT DEFAULT 0,
  require_live_attendance BOOLEAN DEFAULT false,
  cert_title TEXT DEFAULT 'Certificado de Finalización',
  cert_subtitle TEXT,
  cert_signature_name TEXT,
  cert_signature_title TEXT,
  cert_logo_url TEXT,
  cert_background_color TEXT DEFAULT '#0a0a0f',
  cert_accent_color TEXT DEFAULT '#8B5CF6',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ──────────────────────────────────────────────
-- 15. CERTIFICATES
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.academy_certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.academy_courses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  enrollment_id UUID NOT NULL REFERENCES public.academy_enrollments(id) ON DELETE CASCADE,
  cert_code TEXT NOT NULL UNIQUE DEFAULT upper(substring(gen_random_uuid()::text, 1, 8)),
  verification_url TEXT GENERATED ALWAYS AS ('https://kreoon.com/cert/' || cert_code) STORED,
  verification_hash TEXT,
  student_name TEXT NOT NULL,
  course_title TEXT NOT NULL,
  instructor_name TEXT NOT NULL,
  space_name TEXT NOT NULL,
  final_score_pct NUMERIC(5,2),
  issued_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  is_valid BOOLEAN DEFAULT true,
  revoked_at TIMESTAMPTZ,
  revoke_reason TEXT,
  UNIQUE(course_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_academy_certificates_user ON public.academy_certificates(user_id);
CREATE INDEX IF NOT EXISTS idx_academy_certificates_code ON public.academy_certificates(cert_code);

-- ──────────────────────────────────────────────
-- 16. MANUAL REVIEWS QUEUE
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.academy_manual_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID NOT NULL REFERENCES public.academy_quiz_attempts(id) ON DELETE CASCADE,
  answer_id UUID NOT NULL REFERENCES public.academy_attempt_answers(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.academy_questions(id),
  course_id UUID NOT NULL REFERENCES public.academy_courses(id),
  student_id UUID NOT NULL REFERENCES auth.users(id),
  instructor_id UUID REFERENCES auth.users(id),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewing', 'approved', 'rejected', 'revision_requested')),
  score_awarded NUMERIC(6,2),
  max_score NUMERIC(6,2),
  feedback TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_manual_reviews_course ON public.academy_manual_reviews(course_id);
CREATE INDEX IF NOT EXISTS idx_manual_reviews_status ON public.academy_manual_reviews(status);

-- ──────────────────────────────────────────────
-- 17. REVIEWS DE CURSOS
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.academy_course_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.academy_courses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  enrollment_id UUID NOT NULL REFERENCES public.academy_enrollments(id),
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review_text TEXT,
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(course_id, user_id)
);

-- ──────────────────────────────────────────────
-- 18. INSTRUCTOR PLANS
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.academy_instructor_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  plan_slug TEXT NOT NULL DEFAULT 'hobby' REFERENCES public.academy_plans(slug),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'cancelled', 'trialing')),
  stripe_subscription_id TEXT,
  trial_ends_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '14 days'),
  current_period_start TIMESTAMPTZ DEFAULT NOW(),
  current_period_end TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '1 month'),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ──────────────────────────────────────────────
-- 19. RPC: check_certificate_eligibility
-- ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.check_certificate_eligibility(
  p_course_id UUID,
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_req RECORD;
  v_enrollment RECORD;
  v_missing JSONB := '[]'::jsonb;
  v_eligible BOOLEAN := true;
BEGIN
  SELECT * INTO v_req FROM academy_certificate_requirements WHERE course_id = p_course_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('eligible', false, 'reason', 'no_requirements_configured');
  END IF;

  SELECT * INTO v_enrollment FROM academy_enrollments
  WHERE course_id = p_course_id AND user_id = p_user_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('eligible', false, 'reason', 'not_enrolled');
  END IF;

  IF v_enrollment.completion_pct < v_req.min_lessons_completed_pct THEN
    v_eligible := false;
    v_missing := v_missing || jsonb_build_object(
      'type', 'lessons_completion',
      'required', v_req.min_lessons_completed_pct,
      'current', v_enrollment.completion_pct
    );
  END IF;

  IF v_req.require_final_exam THEN
    IF NOT EXISTS (
      SELECT 1 FROM academy_quiz_attempts qa
      JOIN academy_quizzes q ON q.id = qa.quiz_id
      WHERE q.course_id = p_course_id AND q.scope = 'final'
      AND qa.user_id = p_user_id AND qa.status = 'passed'
      AND qa.score_pct >= v_req.min_final_exam_score
    ) THEN
      v_eligible := false;
      v_missing := v_missing || '"final_exam_not_passed"'::jsonb;
    END IF;
  END IF;

  IF v_req.require_all_module_exams THEN
    IF EXISTS (
      SELECT 1 FROM academy_quizzes q
      WHERE q.course_id = p_course_id AND q.scope = 'end_module' AND q.is_required_for_cert = true
      AND NOT EXISTS (
        SELECT 1 FROM academy_quiz_attempts qa
        WHERE qa.quiz_id = q.id AND qa.user_id = p_user_id AND qa.status = 'passed'
      )
    ) THEN
      v_eligible := false;
      v_missing := v_missing || '"module_exams_pending"'::jsonb;
    END IF;
  END IF;

  IF v_req.require_all_manual_reviews THEN
    IF EXISTS (
      SELECT 1 FROM academy_manual_reviews
      WHERE course_id = p_course_id AND student_id = p_user_id AND status IN ('pending', 'reviewing')
    ) THEN
      v_eligible := false;
      v_missing := v_missing || '"manual_reviews_pending"'::jsonb;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'eligible', v_eligible,
    'missing', v_missing,
    'completion_pct', v_enrollment.completion_pct
  );
END;
$$;

-- ──────────────────────────────────────────────
-- 20. RPC: issue_academy_certificate
-- ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.issue_academy_certificate(
  p_course_id UUID,
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_check JSONB;
  v_cert RECORD;
  v_course RECORD;
  v_student_name TEXT;
  v_instructor_name TEXT;
  v_final_score NUMERIC(5,2);
BEGIN
  v_check := check_certificate_eligibility(p_course_id, p_user_id);
  IF NOT (v_check->>'eligible')::boolean THEN
    RETURN v_check;
  END IF;

  IF EXISTS (SELECT 1 FROM academy_certificates WHERE course_id = p_course_id AND user_id = p_user_id) THEN
    SELECT * INTO v_cert FROM academy_certificates WHERE course_id = p_course_id AND user_id = p_user_id;
    RETURN jsonb_build_object('eligible', true, 'already_issued', true, 'cert_code', v_cert.cert_code);
  END IF;

  SELECT c.title, c.instructor_id, ac.name AS space_name INTO v_course
  FROM academy_courses c
  JOIN academy_spaces ac ON ac.id = c.space_id
  WHERE c.id = p_course_id;

  SELECT COALESCE(full_name, 'Estudiante') INTO v_student_name FROM profiles WHERE id = p_user_id;
  SELECT COALESCE(full_name, 'Instructor') INTO v_instructor_name FROM profiles WHERE id = v_course.instructor_id;

  SELECT score_pct INTO v_final_score
  FROM academy_quiz_attempts qa
  JOIN academy_quizzes q ON q.id = qa.quiz_id
  WHERE q.course_id = p_course_id AND q.scope = 'final'
    AND qa.user_id = p_user_id AND qa.status = 'passed'
  ORDER BY qa.submitted_at DESC LIMIT 1;

  INSERT INTO academy_certificates (
    course_id, user_id, enrollment_id,
    student_name, course_title, instructor_name, space_name, final_score_pct
  )
  SELECT
    p_course_id, p_user_id, ae.id,
    COALESCE(v_student_name, 'Estudiante'),
    v_course.title,
    COALESCE(v_instructor_name, 'Instructor'),
    v_course.space_name,
    v_final_score
  FROM academy_enrollments ae
  WHERE ae.course_id = p_course_id AND ae.user_id = p_user_id
  RETURNING * INTO v_cert;

  UPDATE academy_enrollments
  SET certificate_issued_at = NOW()
  WHERE course_id = p_course_id AND user_id = p_user_id;

  -- UP Points: silently skip if reputation_events insert fails
  BEGIN
    INSERT INTO reputation_events (user_id, event_type, event_subtype, base_points, final_points, event_date)
    VALUES (p_user_id, 'academy_certificate_earned', p_course_id::text, 500, 500, CURRENT_DATE);
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN jsonb_build_object(
    'eligible', true,
    'issued', true,
    'cert_code', v_cert.cert_code,
    'verification_url', v_cert.verification_url
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_certificate_eligibility(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.issue_academy_certificate(UUID, UUID) TO authenticated;

-- ──────────────────────────────────────────────
-- 21. RLS
-- ──────────────────────────────────────────────
ALTER TABLE public.academy_spaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academy_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academy_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academy_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academy_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academy_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academy_lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academy_quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academy_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academy_question_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academy_quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academy_attempt_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academy_certificate_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academy_certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academy_manual_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academy_course_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academy_instructor_plans ENABLE ROW LEVEL SECURITY;

-- SPACES
DROP POLICY IF EXISTS "spaces_public_read" ON public.academy_spaces;
CREATE POLICY "spaces_public_read" ON public.academy_spaces FOR SELECT TO authenticated
USING (is_public = true AND status = 'active');

DROP POLICY IF EXISTS "spaces_owner_all" ON public.academy_spaces;
CREATE POLICY "spaces_owner_all" ON public.academy_spaces FOR ALL TO authenticated
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

-- COURSES
DROP POLICY IF EXISTS "courses_enrolled_or_public" ON public.academy_courses;
CREATE POLICY "courses_enrolled_or_public" ON public.academy_courses FOR SELECT TO authenticated
USING (
  status = 'published' OR
  instructor_id = auth.uid() OR
  EXISTS (SELECT 1 FROM academy_enrollments WHERE course_id = academy_courses.id AND user_id = auth.uid())
);

DROP POLICY IF EXISTS "courses_instructor_manage" ON public.academy_courses;
CREATE POLICY "courses_instructor_manage" ON public.academy_courses FOR ALL TO authenticated
USING (instructor_id = auth.uid())
WITH CHECK (instructor_id = auth.uid());

-- ENROLLMENTS
DROP POLICY IF EXISTS "enrollments_own" ON public.academy_enrollments;
CREATE POLICY "enrollments_own" ON public.academy_enrollments FOR ALL TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "enrollments_instructor_read" ON public.academy_enrollments;
CREATE POLICY "enrollments_instructor_read" ON public.academy_enrollments FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM academy_courses WHERE id = course_id AND instructor_id = auth.uid())
);

-- MODULES & LESSONS
DROP POLICY IF EXISTS "modules_access" ON public.academy_modules;
CREATE POLICY "modules_access" ON public.academy_modules FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM academy_courses c WHERE c.id = course_id AND (
    c.instructor_id = auth.uid() OR c.status = 'published'
  ))
);

DROP POLICY IF EXISTS "modules_instructor_manage" ON public.academy_modules;
CREATE POLICY "modules_instructor_manage" ON public.academy_modules FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM academy_courses WHERE id = course_id AND instructor_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM academy_courses WHERE id = course_id AND instructor_id = auth.uid()));

DROP POLICY IF EXISTS "lessons_access" ON public.academy_lessons;
CREATE POLICY "lessons_access" ON public.academy_lessons FOR SELECT TO authenticated
USING (
  is_free_preview = true OR
  EXISTS (SELECT 1 FROM academy_courses c WHERE c.id = course_id AND c.instructor_id = auth.uid()) OR
  EXISTS (SELECT 1 FROM academy_enrollments WHERE course_id = academy_lessons.course_id AND user_id = auth.uid())
);

DROP POLICY IF EXISTS "lessons_instructor_manage" ON public.academy_lessons;
CREATE POLICY "lessons_instructor_manage" ON public.academy_lessons FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM academy_courses WHERE id = course_id AND instructor_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM academy_courses WHERE id = course_id AND instructor_id = auth.uid()));

-- PROGRESS
DROP POLICY IF EXISTS "progress_own" ON public.academy_lesson_progress;
CREATE POLICY "progress_own" ON public.academy_lesson_progress FOR ALL TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- QUIZZES
DROP POLICY IF EXISTS "quizzes_access" ON public.academy_quizzes;
CREATE POLICY "quizzes_access" ON public.academy_quizzes FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM academy_courses c WHERE c.id = course_id AND (
    c.instructor_id = auth.uid() OR
    EXISTS (SELECT 1 FROM academy_enrollments WHERE course_id = c.id AND user_id = auth.uid())
  ))
);

DROP POLICY IF EXISTS "quizzes_instructor_manage" ON public.academy_quizzes;
CREATE POLICY "quizzes_instructor_manage" ON public.academy_quizzes FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM academy_courses WHERE id = course_id AND instructor_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM academy_courses WHERE id = course_id AND instructor_id = auth.uid()));

-- QUESTIONS & OPTIONS
DROP POLICY IF EXISTS "questions_access" ON public.academy_questions;
CREATE POLICY "questions_access" ON public.academy_questions FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM academy_quizzes q
  JOIN academy_courses c ON c.id = q.course_id
  WHERE q.id = quiz_id AND (
    c.instructor_id = auth.uid() OR
    EXISTS (SELECT 1 FROM academy_enrollments WHERE course_id = c.id AND user_id = auth.uid())
  )
));

DROP POLICY IF EXISTS "questions_instructor_manage" ON public.academy_questions;
CREATE POLICY "questions_instructor_manage" ON public.academy_questions FOR ALL TO authenticated
USING (EXISTS (
  SELECT 1 FROM academy_quizzes q JOIN academy_courses c ON c.id = q.course_id
  WHERE q.id = quiz_id AND c.instructor_id = auth.uid()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM academy_quizzes q JOIN academy_courses c ON c.id = q.course_id
  WHERE q.id = quiz_id AND c.instructor_id = auth.uid()
));

DROP POLICY IF EXISTS "options_access" ON public.academy_question_options;
CREATE POLICY "options_access" ON public.academy_question_options FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM academy_questions q2
  JOIN academy_quizzes qz ON qz.id = q2.quiz_id
  JOIN academy_courses c ON c.id = qz.course_id
  WHERE q2.id = question_id AND (
    c.instructor_id = auth.uid() OR
    EXISTS (SELECT 1 FROM academy_enrollments WHERE course_id = c.id AND user_id = auth.uid())
  )
));

DROP POLICY IF EXISTS "options_instructor_manage" ON public.academy_question_options;
CREATE POLICY "options_instructor_manage" ON public.academy_question_options FOR ALL TO authenticated
USING (EXISTS (
  SELECT 1 FROM academy_questions q2 JOIN academy_quizzes qz ON qz.id = q2.quiz_id
  JOIN academy_courses c ON c.id = qz.course_id WHERE q2.id = question_id AND c.instructor_id = auth.uid()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM academy_questions q2 JOIN academy_quizzes qz ON qz.id = q2.quiz_id
  JOIN academy_courses c ON c.id = qz.course_id WHERE q2.id = question_id AND c.instructor_id = auth.uid()
));

-- ATTEMPTS
DROP POLICY IF EXISTS "attempts_own" ON public.academy_quiz_attempts;
CREATE POLICY "attempts_own" ON public.academy_quiz_attempts FOR ALL TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "attempts_instructor_read" ON public.academy_quiz_attempts;
CREATE POLICY "attempts_instructor_read" ON public.academy_quiz_attempts FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM academy_quizzes q JOIN academy_courses c ON c.id = q.course_id
  WHERE q.id = quiz_id AND c.instructor_id = auth.uid()
));

-- ANSWERS
DROP POLICY IF EXISTS "answers_own" ON public.academy_attempt_answers;
CREATE POLICY "answers_own" ON public.academy_attempt_answers FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM academy_quiz_attempts WHERE id = attempt_id AND user_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM academy_quiz_attempts WHERE id = attempt_id AND user_id = auth.uid()));

DROP POLICY IF EXISTS "answers_instructor_read" ON public.academy_attempt_answers;
CREATE POLICY "answers_instructor_read" ON public.academy_attempt_answers FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM academy_quiz_attempts qa
  JOIN academy_quizzes q ON q.id = qa.quiz_id
  JOIN academy_courses c ON c.id = q.course_id
  WHERE qa.id = attempt_id AND c.instructor_id = auth.uid()
));

-- CERT REQUIREMENTS
DROP POLICY IF EXISTS "cert_req_access" ON public.academy_certificate_requirements;
CREATE POLICY "cert_req_access" ON public.academy_certificate_requirements FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM academy_courses c WHERE c.id = course_id AND (
    c.instructor_id = auth.uid() OR
    EXISTS (SELECT 1 FROM academy_enrollments WHERE course_id = c.id AND user_id = auth.uid())
  )
));

DROP POLICY IF EXISTS "cert_req_instructor" ON public.academy_certificate_requirements;
CREATE POLICY "cert_req_instructor" ON public.academy_certificate_requirements FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM academy_courses WHERE id = course_id AND instructor_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM academy_courses WHERE id = course_id AND instructor_id = auth.uid()));

-- CERTIFICATES (public verification: any authenticated user can read valid certs)
DROP POLICY IF EXISTS "certs_own_or_public" ON public.academy_certificates;
CREATE POLICY "certs_own_or_public" ON public.academy_certificates FOR SELECT TO authenticated
USING (user_id = auth.uid() OR is_valid = true);

DROP POLICY IF EXISTS "certs_anon_verify" ON public.academy_certificates;
CREATE POLICY "certs_anon_verify" ON public.academy_certificates FOR SELECT TO anon
USING (is_valid = true);

-- MEMBERSHIPS
DROP POLICY IF EXISTS "memberships_own_or_owner" ON public.academy_memberships;
CREATE POLICY "memberships_own_or_owner" ON public.academy_memberships FOR ALL TO authenticated
USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM academy_spaces WHERE id = space_id AND owner_id = auth.uid()))
WITH CHECK (user_id = auth.uid() OR EXISTS (SELECT 1 FROM academy_spaces WHERE id = space_id AND owner_id = auth.uid()));

-- MANUAL REVIEWS
DROP POLICY IF EXISTS "manual_reviews_access" ON public.academy_manual_reviews;
CREATE POLICY "manual_reviews_access" ON public.academy_manual_reviews FOR SELECT TO authenticated
USING (student_id = auth.uid() OR instructor_id = auth.uid() OR
  EXISTS (SELECT 1 FROM academy_courses WHERE id = course_id AND instructor_id = auth.uid())
);

DROP POLICY IF EXISTS "manual_reviews_instructor_update" ON public.academy_manual_reviews;
CREATE POLICY "manual_reviews_instructor_update" ON public.academy_manual_reviews FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM academy_courses WHERE id = course_id AND instructor_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM academy_courses WHERE id = course_id AND instructor_id = auth.uid()));

-- COURSE REVIEWS
DROP POLICY IF EXISTS "course_reviews_read" ON public.academy_course_reviews;
CREATE POLICY "course_reviews_read" ON public.academy_course_reviews FOR SELECT TO authenticated
USING (is_public = true OR user_id = auth.uid());

DROP POLICY IF EXISTS "course_reviews_own" ON public.academy_course_reviews;
CREATE POLICY "course_reviews_own" ON public.academy_course_reviews FOR ALL TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- INSTRUCTOR PLANS
DROP POLICY IF EXISTS "instructor_plans_own" ON public.academy_instructor_plans;
CREATE POLICY "instructor_plans_own" ON public.academy_instructor_plans FOR ALL TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- ──────────────────────────────────────────────
-- 22. GRANTS
-- ──────────────────────────────────────────────
GRANT SELECT ON public.academy_plans TO authenticated, anon;
GRANT ALL ON public.academy_spaces TO authenticated;
GRANT ALL ON public.academy_memberships TO authenticated;
GRANT ALL ON public.academy_courses TO authenticated;
GRANT ALL ON public.academy_enrollments TO authenticated;
GRANT ALL ON public.academy_modules TO authenticated;
GRANT ALL ON public.academy_lessons TO authenticated;
GRANT ALL ON public.academy_lesson_progress TO authenticated;
GRANT ALL ON public.academy_quizzes TO authenticated;
GRANT ALL ON public.academy_questions TO authenticated;
GRANT ALL ON public.academy_question_options TO authenticated;
GRANT ALL ON public.academy_quiz_attempts TO authenticated;
GRANT ALL ON public.academy_attempt_answers TO authenticated;
GRANT ALL ON public.academy_certificate_requirements TO authenticated;
GRANT ALL ON public.academy_certificates TO authenticated;
GRANT SELECT ON public.academy_certificates TO anon;
GRANT ALL ON public.academy_manual_reviews TO authenticated;
GRANT ALL ON public.academy_course_reviews TO authenticated;
GRANT ALL ON public.academy_instructor_plans TO authenticated;

GRANT ALL ON public.academy_plans TO service_role;
GRANT ALL ON public.academy_spaces TO service_role;
GRANT ALL ON public.academy_memberships TO service_role;
GRANT ALL ON public.academy_courses TO service_role;
GRANT ALL ON public.academy_enrollments TO service_role;
GRANT ALL ON public.academy_modules TO service_role;
GRANT ALL ON public.academy_lessons TO service_role;
GRANT ALL ON public.academy_lesson_progress TO service_role;
GRANT ALL ON public.academy_quizzes TO service_role;
GRANT ALL ON public.academy_questions TO service_role;
GRANT ALL ON public.academy_question_options TO service_role;
GRANT ALL ON public.academy_quiz_attempts TO service_role;
GRANT ALL ON public.academy_attempt_answers TO service_role;
GRANT ALL ON public.academy_certificate_requirements TO service_role;
GRANT ALL ON public.academy_certificates TO service_role;
GRANT ALL ON public.academy_manual_reviews TO service_role;
GRANT ALL ON public.academy_course_reviews TO service_role;
GRANT ALL ON public.academy_instructor_plans TO service_role;

NOTIFY pgrst, 'reload schema';
