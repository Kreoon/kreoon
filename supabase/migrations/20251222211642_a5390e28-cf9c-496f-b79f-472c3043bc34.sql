-- Add unique constraint to username if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'profiles_username_key'
  ) THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_username_key UNIQUE (username);
  END IF;
END
$$;

-- Make sure all existing users have unique usernames
-- First fix any null usernames
UPDATE public.profiles
SET username = public.generate_username_from_name(full_name)
WHERE username IS NULL;

-- Fix any duplicates by adding numbers
WITH duplicates AS (
  SELECT id, username, ROW_NUMBER() OVER (PARTITION BY username ORDER BY created_at) as rn
  FROM public.profiles
  WHERE username IS NOT NULL
)
UPDATE public.profiles p
SET username = p.username || d.rn::text
FROM duplicates d
WHERE p.id = d.id AND d.rn > 1;