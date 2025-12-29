-- Add active_role column to profiles table for persisting user's selected role
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS active_role text;

-- Add comment explaining the column
COMMENT ON COLUMN public.profiles.active_role IS 'The currently active role selected by the user for their session context';