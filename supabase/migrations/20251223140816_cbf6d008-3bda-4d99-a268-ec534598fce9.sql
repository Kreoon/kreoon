-- Create table for portfolio post likes
CREATE TABLE IF NOT EXISTS public.portfolio_post_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.portfolio_posts(id) ON DELETE CASCADE,
  viewer_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create unique constraint to prevent duplicate likes
ALTER TABLE public.portfolio_post_likes ADD CONSTRAINT portfolio_post_likes_unique UNIQUE (post_id, viewer_id);

-- Create index for performance
CREATE INDEX idx_portfolio_post_likes_post ON public.portfolio_post_likes(post_id);
CREATE INDEX idx_portfolio_post_likes_viewer ON public.portfolio_post_likes(viewer_id);

-- Enable RLS
ALTER TABLE public.portfolio_post_likes ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read likes (for counts)
CREATE POLICY "Anyone can view portfolio post likes"
  ON public.portfolio_post_likes
  FOR SELECT
  USING (true);

-- Allow anyone to insert likes (viewer_id is anonymous or user)
CREATE POLICY "Anyone can like portfolio posts"
  ON public.portfolio_post_likes
  FOR INSERT
  WITH CHECK (true);

-- Allow viewers to delete their own likes
CREATE POLICY "Viewers can unlike their own likes"
  ON public.portfolio_post_likes
  FOR DELETE
  USING (true);

-- Create function to toggle portfolio post like
CREATE OR REPLACE FUNCTION public.toggle_portfolio_post_like(post_uuid UUID, viewer TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_now_liked BOOLEAN;
BEGIN
  -- Check if already liked
  IF EXISTS (SELECT 1 FROM portfolio_post_likes WHERE post_id = post_uuid AND viewer_id = viewer) THEN
    -- Unlike
    DELETE FROM portfolio_post_likes WHERE post_id = post_uuid AND viewer_id = viewer;
    -- Decrement counter
    UPDATE portfolio_posts SET likes_count = GREATEST(0, likes_count - 1) WHERE id = post_uuid;
    is_now_liked := false;
  ELSE
    -- Like
    INSERT INTO portfolio_post_likes (post_id, viewer_id) VALUES (post_uuid, viewer);
    -- Increment counter
    UPDATE portfolio_posts SET likes_count = likes_count + 1 WHERE id = post_uuid;
    is_now_liked := true;
  END IF;
  
  RETURN is_now_liked;
END;
$$;

-- Function to increment portfolio post views
CREATE OR REPLACE FUNCTION public.increment_portfolio_post_views(post_uuid UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE portfolio_posts SET views_count = views_count + 1 WHERE id = post_uuid;
END;
$$;