-- Add strategy rating fields to content table
ALTER TABLE public.content 
ADD COLUMN IF NOT EXISTS strategy_rating integer,
ADD COLUMN IF NOT EXISTS strategy_rated_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS strategy_rated_by uuid REFERENCES auth.users(id);

-- Add constraint to ensure ratings are between 1 and 5
ALTER TABLE public.content 
ADD CONSTRAINT content_strategy_rating_check CHECK (strategy_rating IS NULL OR (strategy_rating >= 1 AND strategy_rating <= 5));