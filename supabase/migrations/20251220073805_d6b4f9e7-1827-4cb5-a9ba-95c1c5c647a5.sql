-- Add profile visibility setting
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_public boolean DEFAULT true;

-- Add comment
COMMENT ON COLUMN public.profiles.is_public IS 'Whether the profile is publicly visible to non-authenticated users';