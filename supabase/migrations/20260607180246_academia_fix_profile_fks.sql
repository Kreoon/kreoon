-- Fix: PostgREST necesita FKs a public.profiles para resolver joins
-- de la forma `embed:profiles!column(...)`. Las FKs originales apuntan
-- a auth.users (schema invisible a PostgREST).
-- Mismo patrón que fk_academy_courses_instructor_profile y
-- fk_academy_lesson_comments_author_profile.

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_academy_posts_author_profile') THEN
    ALTER TABLE public.academy_posts
      ADD CONSTRAINT fk_academy_posts_author_profile
      FOREIGN KEY (author_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_academy_post_comments_author_profile') THEN
    ALTER TABLE public.academy_post_comments
      ADD CONSTRAINT fk_academy_post_comments_author_profile
      FOREIGN KEY (author_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_academy_memberships_user_profile') THEN
    ALTER TABLE public.academy_memberships
      ADD CONSTRAINT fk_academy_memberships_user_profile
      FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_academy_space_points_user_profile') THEN
    ALTER TABLE public.academy_space_points
      ADD CONSTRAINT fk_academy_space_points_user_profile
      FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_academy_presence_user_profile') THEN
    ALTER TABLE public.academy_member_presence
      ADD CONSTRAINT fk_academy_presence_user_profile
      FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_academy_notifications_sender_profile') THEN
    ALTER TABLE public.academy_notifications
      ADD CONSTRAINT fk_academy_notifications_sender_profile
      FOREIGN KEY (sender_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_academy_events_organizer_profile') THEN
    ALTER TABLE public.academy_space_events
      ADD CONSTRAINT fk_academy_events_organizer_profile
      FOREIGN KEY (organizer_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_academy_space_profiles_user_profile') THEN
    ALTER TABLE public.academy_space_profiles
      ADD CONSTRAINT fk_academy_space_profiles_user_profile
      FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_academy_follows_follower_profile') THEN
    ALTER TABLE public.academy_member_follows
      ADD CONSTRAINT fk_academy_follows_follower_profile
      FOREIGN KEY (follower_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_academy_follows_following_profile') THEN
    ALTER TABLE public.academy_member_follows
      ADD CONSTRAINT fk_academy_follows_following_profile
      FOREIGN KEY (following_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
