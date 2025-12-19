-- Add column to profiles to track if user has completed onboarding tour
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS has_seen_tour boolean DEFAULT false;

-- Update existing users to have seen the tour (so only new users see it)
-- Comment this out if you want ALL users to see the tour
-- UPDATE public.profiles SET has_seen_tour = true;