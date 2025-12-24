-- Add new guideline columns for designer and admin roles
ALTER TABLE public.content 
ADD COLUMN IF NOT EXISTS designer_guidelines TEXT,
ADD COLUMN IF NOT EXISTS admin_guidelines TEXT;