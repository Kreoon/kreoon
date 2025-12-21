-- Add field to track pending ambassador celebration
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS ambassador_celebration_pending boolean DEFAULT false;