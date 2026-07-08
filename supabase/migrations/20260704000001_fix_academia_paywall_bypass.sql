-- FASE 0 · Fix 2: bloquear paywall bypass en Academia (enrollment + progreso)
--
-- Hallazgos (docs/AUDITORIA-MODULOS-2026-07-04.md §7):
--   1. "enrollments_own" es FOR ALL ... WITH CHECK(user_id=auth.uid()) sin
--      validar curso gratis ni pago. Cualquier autenticado inserta su
--      propio academy_enrollments para CUALQUIER curso, incluso de pago.
--   2. La misma policy FOR ALL permite al cliente escribir completion_pct
--      directamente (useAcademyCourse.ts:301-308 hace un UPDATE crudo),
--      lo que dispara certificado + 500 XP sin cursar nada real.
--
-- Fix (aditivo, no invalida enrollments existentes):
--   1. enrollments_own -> solo SELECT propio. Se agrega RPC
--      enroll_in_course(p_course_id) SECURITY DEFINER que valida curso
--      gratis O checkout_intent pagado antes de insertar.
--   2. academy_lesson_progress: se retira la policy permisiva heredada
--      "progress_own" (FOR ALL, quedaba activa en paralelo a las policies
--      más estrictas de 20260612000013 por ser políticas permisivas que
--      se OR-ean). Se agrega RPC record_lesson_progress() que reemplaza
--      el upsert directo del cliente, y un trigger que recalcula
--      completion_pct en academy_enrollments a partir de las filas reales
--      de progreso (nunca desde un valor enviado por el cliente).
--   3. check_certificate_eligibility/issue_academy_certificate ya validan
--      completion_pct server-side (20260607182250) — al quedar esa columna
--      derivada del trigger, la cadena completa queda cerrada sin tocar
--      esas funciones.

-- ============================================================
-- 1. ENROLLMENTS: separar SELECT propio de escritura
-- ============================================================

DROP POLICY IF EXISTS "enrollments_own" ON public.academy_enrollments;
CREATE POLICY "enrollments_select_own" ON public.academy_enrollments
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- enrollments_instructor_read (SELECT, sin cambios) sigue vigente.

CREATE OR REPLACE FUNCTION public.enroll_in_course(p_course_id uuid)
RETURNS public.academy_enrollments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_course RECORD;
  v_enrollment public.academy_enrollments;
  v_has_paid_intent boolean;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'forbidden: authentication required';
  END IF;

  SELECT id, price_usd, is_free INTO v_course
  FROM public.academy_courses WHERE id = p_course_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'course_not_found: %', p_course_id;
  END IF;

  -- Idempotente: si ya está inscrito, devolver la fila existente.
  SELECT * INTO v_enrollment FROM public.academy_enrollments
  WHERE course_id = p_course_id AND user_id = auth.uid();
  IF FOUND THEN
    RETURN v_enrollment;
  END IF;

  IF NOT v_course.is_free THEN
    SELECT EXISTS (
      SELECT 1 FROM public.academy_checkout_intents
      WHERE course_id = p_course_id
        AND user_id = auth.uid()
        AND status = 'paid'
    ) INTO v_has_paid_intent;

    IF NOT v_has_paid_intent THEN
      RAISE EXCEPTION 'payment_required: no paid checkout intent found for course %', p_course_id;
    END IF;
  END IF;

  INSERT INTO public.academy_enrollments (course_id, user_id, amount_paid_usd)
  VALUES (p_course_id, auth.uid(), COALESCE(v_course.price_usd, 0))
  RETURNING * INTO v_enrollment;

  RETURN v_enrollment;
END;
$$;

GRANT EXECUTE ON FUNCTION public.enroll_in_course(uuid) TO authenticated;

-- ============================================================
-- 2. PROGRESO: retirar escritura directa, mover a RPC + trigger
-- ============================================================

-- Política heredada del módulo original (FOR ALL, sin validar curso/pago);
-- coexistía en paralelo con lesson_progress_own_read/write (permisivas ->
-- se OR-ean) y las anulaba en la práctica.
DROP POLICY IF EXISTS "progress_own" ON public.academy_lesson_progress;

-- La escritura directa del cliente se retira: el INSERT ahora solo llega
-- vía record_lesson_progress() (SECURITY DEFINER). Se conserva la lectura.
DROP POLICY IF EXISTS "lesson_progress_own_write" ON public.academy_lesson_progress;

CREATE OR REPLACE FUNCTION public.record_lesson_progress(
  p_lesson_id uuid,
  p_status text,
  p_video_watch_pct numeric DEFAULT 0,
  p_last_position_seconds int DEFAULT 0
)
RETURNS public.academy_lesson_progress
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_course_id uuid;
  v_enrollment_id uuid;
  v_row public.academy_lesson_progress;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'forbidden: authentication required';
  END IF;

  IF p_status NOT IN ('not_started', 'in_progress', 'completed') THEN
    RAISE EXCEPTION 'invalid_status: %', p_status;
  END IF;

  SELECT course_id INTO v_course_id FROM public.academy_lessons WHERE id = p_lesson_id;
  IF v_course_id IS NULL THEN
    RAISE EXCEPTION 'lesson_not_found: %', p_lesson_id;
  END IF;

  SELECT id INTO v_enrollment_id FROM public.academy_enrollments
  WHERE course_id = v_course_id AND user_id = auth.uid();
  IF v_enrollment_id IS NULL THEN
    RAISE EXCEPTION 'not_enrolled: user is not enrolled in course %', v_course_id;
  END IF;

  INSERT INTO public.academy_lesson_progress (
    lesson_id, user_id, enrollment_id, status,
    video_watch_pct, last_position_seconds, completed_at
  ) VALUES (
    p_lesson_id, auth.uid(), v_enrollment_id, p_status,
    LEAST(GREATEST(COALESCE(p_video_watch_pct, 0), 0), 100),
    GREATEST(COALESCE(p_last_position_seconds, 0), 0),
    CASE WHEN p_status = 'completed' THEN now() ELSE NULL END
  )
  ON CONFLICT (lesson_id, user_id) DO UPDATE SET
    status = EXCLUDED.status,
    video_watch_pct = EXCLUDED.video_watch_pct,
    last_position_seconds = EXCLUDED.last_position_seconds,
    completed_at = EXCLUDED.completed_at,
    updated_at = now()
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_lesson_progress(uuid, text, numeric, int) TO authenticated;

-- Trigger: recalcula completion_pct/completed_at en academy_enrollments a
-- partir de las filas reales de progreso. Nunca acepta un valor enviado
-- por el cliente.
CREATE OR REPLACE FUNCTION public.trg_recalc_enrollment_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_required int;
  v_completed_required int;
  v_pct numeric(5,2);
BEGIN
  SELECT COUNT(*) INTO v_total_required
  FROM public.academy_lessons
  WHERE course_id = (SELECT course_id FROM public.academy_lessons WHERE id = NEW.lesson_id)
    AND is_required = true;

  IF v_total_required = 0 THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*) INTO v_completed_required
  FROM public.academy_lesson_progress lp
  JOIN public.academy_lessons l ON l.id = lp.lesson_id
  WHERE lp.enrollment_id = NEW.enrollment_id
    AND lp.status = 'completed'
    AND l.is_required = true;

  v_pct := ROUND((v_completed_required::numeric / v_total_required) * 100, 2);

  UPDATE public.academy_enrollments
  SET completion_pct = v_pct,
      completed_at = CASE WHEN v_pct >= 100 THEN now() ELSE NULL END,
      last_accessed_at = now()
  WHERE id = NEW.enrollment_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_academy_lesson_progress_recalc ON public.academy_lesson_progress;
CREATE TRIGGER trg_academy_lesson_progress_recalc
  AFTER INSERT OR UPDATE ON public.academy_lesson_progress
  FOR EACH ROW EXECUTE FUNCTION public.trg_recalc_enrollment_completion();

NOTIFY pgrst, 'reload schema';
