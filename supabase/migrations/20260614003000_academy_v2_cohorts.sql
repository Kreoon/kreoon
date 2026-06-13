-- ============================================================
-- CRION Academy v2 — Cohortes (S4)
--
-- Curso puede operar en modo `self_paced` (default — actual) o
-- `cohort` (nas.io style). En cohort, los drip de lecciones se
-- calculan desde `cohort.start_date + lesson.drip_days_after_enroll`
-- en lugar de desde `enrollment.enrolled_at`.
--
-- Rollback:
--   DROP FUNCTION academy_calc_lesson_release_date(uuid, uuid);
--   DROP TABLE academy_cohorts CASCADE;
--   ALTER TABLE academy_enrollments DROP COLUMN cohort_id;
--   ALTER TABLE academy_courses DROP COLUMN mode, DROP COLUMN cohort_capacity;
-- ============================================================

-- ─── Extensión academy_courses ─────────────────────────────────
ALTER TABLE public.academy_courses
  ADD COLUMN IF NOT EXISTS mode text NOT NULL DEFAULT 'self_paced'
    CHECK (mode IN ('self_paced', 'cohort')),
  ADD COLUMN IF NOT EXISTS cohort_capacity int;

-- ─── academy_cohorts ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.academy_cohorts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.academy_courses(id) ON DELETE CASCADE,
  name text NOT NULL,                            -- "Cohorte Mayo 2026"
  start_date date NOT NULL,
  end_date date,
  status text NOT NULL DEFAULT 'upcoming'
    CHECK (status IN ('upcoming', 'in_progress', 'finished', 'cancelled')),
  seats_total int,                                -- override del cohort_capacity del curso
  seats_taken int NOT NULL DEFAULT 0,
  instructor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (end_date IS NULL OR end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS academy_cohorts_course_status_idx
  ON public.academy_cohorts (course_id, status, start_date);

ALTER TABLE public.academy_cohorts ENABLE ROW LEVEL SECURITY;

-- Lectura pública (cualquier visitante para checkout); escritura solo
-- para el owner del space del curso.
CREATE POLICY "academy_cohorts_public_read"
  ON public.academy_cohorts FOR SELECT TO authenticated, anon
  USING (
    EXISTS (
      SELECT 1 FROM academy_courses c
      JOIN academy_spaces s ON s.id = c.space_id
      WHERE c.id = academy_cohorts.course_id
        AND c.status = 'published' AND s.is_public = true
    )
  );

CREATE POLICY "academy_cohorts_owner_all"
  ON public.academy_cohorts FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM academy_courses c
      JOIN academy_spaces s ON s.id = c.space_id
      WHERE c.id = academy_cohorts.course_id AND s.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM academy_courses c
      JOIN academy_spaces s ON s.id = c.space_id
      WHERE c.id = academy_cohorts.course_id AND s.owner_id = auth.uid()
    )
  );

GRANT ALL ON public.academy_cohorts TO service_role, authenticated;
GRANT SELECT ON public.academy_cohorts TO anon;


-- ─── Extensión academy_enrollments ─────────────────────────────
ALTER TABLE public.academy_enrollments
  ADD COLUMN IF NOT EXISTS cohort_id uuid REFERENCES public.academy_cohorts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS academy_enrollments_cohort_idx
  ON public.academy_enrollments (cohort_id) WHERE cohort_id IS NOT NULL;


-- ─── RPC academy_calc_lesson_release_date ──────────────────────
-- Devuelve el timestamp en el que la lección queda disponible para
-- el usuario, considerando: drip_mode (S6), modo cohort, default
-- self_paced. Unifica la lógica para frontend + backend.
CREATE OR REPLACE FUNCTION public.academy_calc_lesson_release_date(
  p_enrollment_id uuid,
  p_lesson_id uuid
) RETURNS timestamptz
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_drip_days int;
  v_enrolled_at timestamptz;
  v_cohort_start date;
  v_course_mode text;
BEGIN
  SELECT l.drip_days_after_enroll, c.mode
    INTO v_drip_days, v_course_mode
  FROM academy_lessons l
  JOIN academy_courses c ON c.id = l.course_id
  WHERE l.id = p_lesson_id;

  IF v_drip_days IS NULL OR v_drip_days = 0 THEN
    RETURN NULL;  -- disponible inmediatamente
  END IF;

  SELECT enrolled_at, ch.start_date
    INTO v_enrolled_at, v_cohort_start
  FROM academy_enrollments e
  LEFT JOIN academy_cohorts ch ON ch.id = e.cohort_id
  WHERE e.id = p_enrollment_id;

  IF v_course_mode = 'cohort' AND v_cohort_start IS NOT NULL THEN
    RETURN (v_cohort_start::timestamptz) + (v_drip_days || ' days')::interval;
  END IF;

  RETURN COALESCE(v_enrolled_at, now()) + (v_drip_days || ' days')::interval;
END;
$$;

GRANT EXECUTE ON FUNCTION public.academy_calc_lesson_release_date(uuid, uuid)
  TO authenticated, service_role;


-- ─── Trigger: validar capacity al inscribir ────────────────────
CREATE OR REPLACE FUNCTION public.trg_academy_cohort_seats()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cap int;
  v_taken int;
BEGIN
  IF NEW.cohort_id IS NULL THEN RETURN NEW; END IF;

  SELECT seats_total, seats_taken INTO v_cap, v_taken
  FROM academy_cohorts WHERE id = NEW.cohort_id FOR UPDATE;

  IF v_cap IS NOT NULL AND v_taken >= v_cap THEN
    RAISE EXCEPTION 'cohort_full';
  END IF;

  UPDATE academy_cohorts
    SET seats_taken = seats_taken + 1
    WHERE id = NEW.cohort_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_academy_cohort_seats_t ON public.academy_enrollments;
CREATE TRIGGER trg_academy_cohort_seats_t
  AFTER INSERT ON public.academy_enrollments
  FOR EACH ROW EXECUTE FUNCTION public.trg_academy_cohort_seats();


-- ─── Cron: cohort_starting (-24h) ──────────────────────────────
-- Emite al bus para cada enrollment de cohorte que arranca mañana.
CREATE OR REPLACE FUNCTION public.academy_v2_dispatch_cohort_starting_24h()
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sent int := 0;
  r record;
  v_member_name text;
  v_space_slug text;
BEGIN
  FOR r IN
    SELECT
      e.id AS enrollment_id,
      e.user_id,
      e.cohort_id,
      co.name AS cohort_name,
      co.start_date,
      c.title AS course_name,
      c.space_id,
      sp.slug AS space_slug
    FROM academy_enrollments e
    JOIN academy_cohorts co ON co.id = e.cohort_id
    JOIN academy_courses c ON c.id = e.course_id
    JOIN academy_spaces sp ON sp.id = c.space_id
    LEFT JOIN academy_event_log el
      ON el.event_type = 'cohort_starting'
      AND el.payload->>'enrollment_id' = e.id::text
    WHERE co.status = 'upcoming'
      AND co.start_date = (current_date + 1)
      AND el.id IS NULL
  LOOP
    SELECT COALESCE(display_name, full_name, email, 'Miembro') INTO v_member_name
      FROM profiles WHERE id = r.user_id;

    PERFORM academy_emit_event_safe(
      p_type     := 'cohort_starting',
      p_space_id := r.space_id,
      p_user_id  := r.user_id,
      p_payload  := jsonb_build_object(
        'title',          'Tu cohorte ' || r.cohort_name || ' comienza mañana',
        'body',           'Prepárate para ' || r.course_name,
        'link',           '/academia/' || r.space_slug,
        'reference_id',   r.cohort_id,
        'reference_type', 'cohort',
        'enrollment_id',  r.enrollment_id,
        'variables',      jsonb_build_array(v_member_name, r.cohort_name, r.course_name)
      )
    );
    v_sent := v_sent + 1;
  END LOOP;
  RETURN v_sent;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.academy_v2_dispatch_cohort_starting_24h() FROM PUBLIC, authenticated;
GRANT EXECUTE ON FUNCTION public.academy_v2_dispatch_cohort_starting_24h() TO service_role;

DO $$
BEGIN
  PERFORM cron.unschedule('academy_cohort_starting_24h');
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

SELECT cron.schedule(
  'academy_cohort_starting_24h',
  '0 12 * * *',  -- diario 12:00 UTC (07:00 Bogotá)
  $$ SELECT public.academy_v2_dispatch_cohort_starting_24h(); $$
);
