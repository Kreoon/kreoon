-- Add music support to portfolio_stories
ALTER TABLE public.portfolio_stories
ADD COLUMN IF NOT EXISTS music_url TEXT,
ADD COLUMN IF NOT EXISTS music_name TEXT,
ADD COLUMN IF NOT EXISTS mute_video_audio BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS music_volume NUMERIC DEFAULT 0.5,
ADD COLUMN IF NOT EXISTS video_volume NUMERIC DEFAULT 1.0;