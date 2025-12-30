-- Add missing disabled_at column to live_feature_flags table
ALTER TABLE public.live_feature_flags 
ADD COLUMN IF NOT EXISTS disabled_at TIMESTAMP WITH TIME ZONE;