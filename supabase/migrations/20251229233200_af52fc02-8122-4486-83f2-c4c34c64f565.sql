-- Add missing foreign keys so PostgREST can join followers -> profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'followers_follower_id_fkey'
  ) THEN
    ALTER TABLE public.followers
      ADD CONSTRAINT followers_follower_id_fkey
      FOREIGN KEY (follower_id) REFERENCES public.profiles(id)
      ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'followers_following_id_fkey'
  ) THEN
    ALTER TABLE public.followers
      ADD CONSTRAINT followers_following_id_fkey
      FOREIGN KEY (following_id) REFERENCES public.profiles(id)
      ON DELETE CASCADE;
  END IF;
END $$;

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_followers_following_id ON public.followers (following_id);
CREATE INDEX IF NOT EXISTS idx_followers_follower_id ON public.followers (follower_id);