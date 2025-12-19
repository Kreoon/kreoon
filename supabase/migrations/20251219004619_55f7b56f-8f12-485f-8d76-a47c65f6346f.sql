-- Add views and likes columns to content
ALTER TABLE public.content ADD COLUMN IF NOT EXISTS views_count integer DEFAULT 0;
ALTER TABLE public.content ADD COLUMN IF NOT EXISTS likes_count integer DEFAULT 0;

-- Create table for tracking likes (to prevent duplicate likes)
CREATE TABLE public.content_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id uuid REFERENCES public.content(id) ON DELETE CASCADE NOT NULL,
  viewer_id text NOT NULL, -- Can be user_id or anonymous session id
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(content_id, viewer_id)
);

-- Enable RLS
ALTER TABLE public.content_likes ENABLE ROW LEVEL SECURITY;

-- Allow anyone to view likes
CREATE POLICY "Anyone can view likes" ON public.content_likes
FOR SELECT USING (true);

-- Allow anyone to insert likes (for public portfolio)
CREATE POLICY "Anyone can like content" ON public.content_likes
FOR INSERT WITH CHECK (true);

-- Create index for performance
CREATE INDEX idx_content_likes_content_id ON public.content_likes(content_id);
CREATE INDEX idx_content_views ON public.content(views_count);
CREATE INDEX idx_content_likes ON public.content(likes_count);

-- Function to increment view count
CREATE OR REPLACE FUNCTION public.increment_content_views(content_uuid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.content 
  SET views_count = COALESCE(views_count, 0) + 1 
  WHERE id = content_uuid AND is_published = true;
END;
$$;

-- Function to toggle like and update count
CREATE OR REPLACE FUNCTION public.toggle_content_like(content_uuid uuid, viewer text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  like_exists boolean;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM public.content_likes 
    WHERE content_id = content_uuid AND viewer_id = viewer
  ) INTO like_exists;
  
  IF like_exists THEN
    DELETE FROM public.content_likes WHERE content_id = content_uuid AND viewer_id = viewer;
    UPDATE public.content SET likes_count = GREATEST(COALESCE(likes_count, 0) - 1, 0) WHERE id = content_uuid;
    RETURN false;
  ELSE
    INSERT INTO public.content_likes (content_id, viewer_id) VALUES (content_uuid, viewer);
    UPDATE public.content SET likes_count = COALESCE(likes_count, 0) + 1 WHERE id = content_uuid;
    RETURN true;
  END IF;
END;
$$;