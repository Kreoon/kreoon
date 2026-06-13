-- ============================================================================
-- RLS hardening — Academia: bloquear lectura de courses/lessons/modules a
-- usuarios cuyo academy_membership esté inactivo (sub vencida / cancelada).
--
-- Antes: cualquier user logueado podía leer TODO curso publicado, sin
-- importar si tenía sub activa. Ahora, si la academia es de pago
-- (membership_price_usd > 0 OR yearly_price_usd > 0), exigimos membresía
-- activa o ser owner. Las academias gratis quedan abiertas como hoy.
-- ============================================================================

CREATE OR REPLACE FUNCTION public._has_academy_access(p_space_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    -- Owner del space
    EXISTS (
      SELECT 1 FROM academy_spaces s
       WHERE s.id = p_space_id AND s.owner_id = auth.uid()
    )
    OR
    -- Miembro activo
    EXISTS (
      SELECT 1 FROM academy_memberships m
       WHERE m.space_id = p_space_id
         AND m.user_id = auth.uid()
         AND m.is_active = true
    )
    OR
    -- Academia gratis (sin precio) → acceso abierto a logueados
    EXISTS (
      SELECT 1 FROM academy_spaces s
       WHERE s.id = p_space_id
         AND COALESCE(s.membership_price_usd, 0) = 0
         AND COALESCE(s.yearly_price_usd, 0) = 0
         AND s.is_public = true
    );
$$;

GRANT EXECUTE ON FUNCTION public._has_academy_access(UUID) TO authenticated, anon;

-- ────────────────────────────────────────────────────────────────────────────
-- COURSES: endurecer courses_published_read
-- ────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "courses_published_read" ON public.academy_courses;
CREATE POLICY "courses_published_read"
  ON public.academy_courses FOR SELECT
  TO authenticated
  USING (
    status = 'published'
    AND public._has_academy_access(space_id)
  );

-- ────────────────────────────────────────────────────────────────────────────
-- MODULES
-- ────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "modules_read" ON public.academy_modules;
CREATE POLICY "modules_read"
  ON public.academy_modules FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM academy_courses c
       WHERE c.id = academy_modules.course_id
         AND (
           c.instructor_id = auth.uid()
           OR (c.status = 'published' AND public._has_academy_access(c.space_id))
         )
    )
  );

-- ────────────────────────────────────────────────────────────────────────────
-- LESSONS
-- ────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "lessons_read" ON public.academy_lessons;
CREATE POLICY "lessons_read"
  ON public.academy_lessons FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM academy_courses c
       WHERE c.id = academy_lessons.course_id
         AND (
           c.instructor_id = auth.uid()
           OR (c.status = 'published' AND public._has_academy_access(c.space_id))
         )
    )
  );

-- ────────────────────────────────────────────────────────────────────────────
-- LESSON PROGRESS: solo dueño y solo si su membresía está activa
-- ────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "lesson_progress_own_read" ON public.academy_lesson_progress;
CREATE POLICY "lesson_progress_own_read"
  ON public.academy_lesson_progress FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "lesson_progress_own_write" ON public.academy_lesson_progress;
CREATE POLICY "lesson_progress_own_write"
  ON public.academy_lesson_progress FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM academy_lessons l
      JOIN academy_courses c ON c.id = l.course_id
      WHERE l.id = academy_lesson_progress.lesson_id
        AND public._has_academy_access(c.space_id)
    )
  );
