-- Fix: política RLS circular en academy_courses
-- La política "courses_enrolled_or_public" tenía una subconsulta en academy_enrollments.
-- Cuando PostgREST hace el join enrollments→courses→spaces, PostgreSQL evalúa esa
-- política que vuelve a leer academy_enrollments → referencia circular → error 500.
-- Solución: políticas separadas sin subconsulta circular.

-- COURSES: leer publicados o propios (sin subconsulta circular a enrollments)
DROP POLICY IF EXISTS "courses_enrolled_or_public" ON public.academy_courses;

CREATE POLICY "courses_published_read" ON public.academy_courses FOR SELECT TO authenticated
USING (status = 'published');

-- El instructor siempre ve sus cursos (published, draft, archived)
-- "courses_instructor_manage" (FOR ALL) ya cubre SELECT, pero lo hacemos explícito
-- para que coexista sin conflicto con la política de lectura pública.
-- La política existente "courses_instructor_manage" (FOR ALL con instructor_id check)
-- ya cubre este caso, así que no creamos duplicado.
