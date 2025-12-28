-- Add post_type column to portfolio_posts to differentiate between portfolio work and personal posts
ALTER TABLE public.portfolio_posts 
ADD COLUMN IF NOT EXISTS post_type text DEFAULT 'portfolio' CHECK (post_type IN ('portfolio', 'personal'));