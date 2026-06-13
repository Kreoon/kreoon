-- ============================================================
-- KREOON ACADEMIA · Lectura pública para visitantes anónimos
-- ============================================================
-- Causa raíz: las policies de academy_spaces, academy_courses y
-- academy_post_categories solo daban SELECT TO authenticated. Eso hacía
-- invisible cualquier academia "pública" para un visitante NO logueado,
-- aunque tuviera is_public=true.
--
-- Consecuencia visible: el link de la academia se rompía al compartirlo.
-- El visitante caía a "Esta academia no existe" hasta hacer login.
--
-- Esta migración expone solo el meta-data necesario para preview a anon:
-- nombre, descripción, logo, cover, cursos publicados gratis, etc.
-- Los datos privados (membresías, posts privados) siguen bloqueados.
-- ============================================================

-- 1. academy_spaces: visitante anon puede leer spaces públicos y activos
DROP POLICY IF EXISTS "spaces_anon_public_read" ON public.academy_spaces;
CREATE POLICY "spaces_anon_public_read"
  ON public.academy_spaces FOR SELECT TO anon
  USING (is_public = true AND status = 'active');

GRANT SELECT ON public.academy_spaces TO anon;

-- 2. academy_courses: visitante anon ve cursos publicados de spaces públicos
DROP POLICY IF EXISTS "courses_anon_public_read" ON public.academy_courses;
CREATE POLICY "courses_anon_public_read"
  ON public.academy_courses FOR SELECT TO anon
  USING (
    status = 'published'
    AND EXISTS (
      SELECT 1 FROM academy_spaces s
      WHERE s.id = academy_courses.space_id
        AND s.is_public = true
        AND s.status = 'active'
    )
  );

GRANT SELECT ON public.academy_courses TO anon;

-- 3. academy_modules + academy_lessons: visitante anon ve currículum (sin contenido bloqueado)
DROP POLICY IF EXISTS "modules_anon_public_read" ON public.academy_modules;
CREATE POLICY "modules_anon_public_read"
  ON public.academy_modules FOR SELECT TO anon
  USING (
    EXISTS (
      SELECT 1 FROM academy_courses c
      JOIN academy_spaces s ON s.id = c.space_id
      WHERE c.id = academy_modules.course_id
        AND c.status = 'published'
        AND s.is_public = true
        AND s.status = 'active'
    )
  );

GRANT SELECT ON public.academy_modules TO anon;

DROP POLICY IF EXISTS "lessons_anon_public_read" ON public.academy_lessons;
CREATE POLICY "lessons_anon_public_read"
  ON public.academy_lessons FOR SELECT TO anon
  USING (
    EXISTS (
      SELECT 1 FROM academy_modules m
      JOIN academy_courses c ON c.id = m.course_id
      JOIN academy_spaces s ON s.id = c.space_id
      WHERE m.id = academy_lessons.module_id
        AND c.status = 'published'
        AND s.is_public = true
        AND s.status = 'active'
    )
  );

GRANT SELECT ON public.academy_lessons TO anon;

-- 4. academy_post_categories (para que un visitante vea las "salas" del space)
DROP POLICY IF EXISTS "post_categories_anon_public_read" ON public.academy_post_categories;
CREATE POLICY "post_categories_anon_public_read"
  ON public.academy_post_categories FOR SELECT TO anon
  USING (
    is_active = true
    AND EXISTS (
      SELECT 1 FROM academy_spaces s
      WHERE s.id = academy_post_categories.space_id
        AND s.is_public = true
        AND s.status = 'active'
    )
  );

GRANT SELECT ON public.academy_post_categories TO anon;

-- 5. academy_space_events: visitante anon ve próximos lives de spaces públicos
DROP POLICY IF EXISTS "events_anon_public_read" ON public.academy_space_events;
CREATE POLICY "events_anon_public_read"
  ON public.academy_space_events FOR SELECT TO anon
  USING (
    is_published = true
    AND EXISTS (
      SELECT 1 FROM academy_spaces s
      WHERE s.id = academy_space_events.space_id
        AND s.is_public = true
        AND s.status = 'active'
    )
  );

GRANT SELECT ON public.academy_space_events TO anon;

-- ── NOTA: estos accesos anon NO incluyen:
--   - academy_memberships (privado)
--   - academy_posts (los posts requieren autenticación por defecto)
--   - academy_post_reactions / comments
--   - academy_space_points (privado)
--   - academy_member_badges (privado)
--   - academy_enrollments (privado)
--   - academy_lesson_progress (privado)
