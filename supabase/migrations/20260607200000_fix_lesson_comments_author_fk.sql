-- Fix: author_id en academy_lesson_comments referenciaba auth.users(id)
-- → invisible a PostgREST → join author:profiles!author_id fallaba con 400.
-- Mismo patrón que fk_academy_courses_instructor_profile.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fk_academy_lesson_comments_author_profile'
  ) THEN
    ALTER TABLE public.academy_lesson_comments
      ADD CONSTRAINT fk_academy_lesson_comments_author_profile
      FOREIGN KEY (author_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
END $$;
