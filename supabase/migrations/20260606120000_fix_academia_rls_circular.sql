-- Fix 1: política RLS circular en academy_courses (error 500 en enrollments)
DROP POLICY IF EXISTS "courses_enrolled_or_public" ON public.academy_courses;
CREATE POLICY "courses_published_read" ON public.academy_courses FOR SELECT TO authenticated
USING (status = 'published');

-- Fix 2: políticas RLS circulares en tablas hijas (error 400 en course page)
-- Tablas hijas que al subir al padre creaban un bucle → reemplazar por true
-- Tablas hijas: scope real sin referencias a academy_enrollments (sin bucle).
-- academy_courses ya tiene policies simples → su subquery no crea recursión.
DROP POLICY IF EXISTS "modules_access" ON public.academy_modules;
DROP POLICY IF EXISTS "modules_read" ON public.academy_modules;
CREATE POLICY "modules_read" ON public.academy_modules FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM academy_courses c
    WHERE c.id = academy_modules.course_id
      AND (c.status = 'published' OR c.instructor_id = auth.uid())
  )
);

DROP POLICY IF EXISTS "lessons_access" ON public.academy_lessons;
DROP POLICY IF EXISTS "lessons_read" ON public.academy_lessons;
CREATE POLICY "lessons_read" ON public.academy_lessons FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM academy_courses c
    WHERE c.id = academy_lessons.course_id
      AND (c.status = 'published' OR c.instructor_id = auth.uid())
  )
);

DROP POLICY IF EXISTS "cert_req_access" ON public.academy_certificate_requirements;
DROP POLICY IF EXISTS "cert_req_enrolled_read" ON public.academy_certificate_requirements;
DROP POLICY IF EXISTS "cert_req_instructor_read" ON public.academy_certificate_requirements;
DROP POLICY IF EXISTS "cert_req_instructor" ON public.academy_certificate_requirements;
DROP POLICY IF EXISTS "cert_req_read" ON public.academy_certificate_requirements;
CREATE POLICY "cert_req_read" ON public.academy_certificate_requirements FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM academy_courses c
    WHERE c.id = academy_certificate_requirements.course_id
      AND (c.status = 'published' OR c.instructor_id = auth.uid())
  )
);

CREATE POLICY "cert_req_instructor_write" ON public.academy_certificate_requirements
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM academy_courses WHERE id = course_id AND instructor_id = auth.uid()));

CREATE POLICY "cert_req_instructor_update" ON public.academy_certificate_requirements
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM academy_courses WHERE id = course_id AND instructor_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM academy_courses WHERE id = course_id AND instructor_id = auth.uid()));

-- Fix 3: FK instructor_id → public.profiles(id)
-- El join `instructor:profiles!instructor_id` fallaba con 400 porque la FK original
-- REFERENCES auth.users(id) está en schema auth (invisible a PostgREST).
-- Esta FK a public.profiles hace el join resolvible.
ALTER TABLE public.academy_courses
  ADD CONSTRAINT IF NOT EXISTS fk_academy_courses_instructor_profile
  FOREIGN KEY (instructor_id) REFERENCES public.profiles(id) ON DELETE RESTRICT;
