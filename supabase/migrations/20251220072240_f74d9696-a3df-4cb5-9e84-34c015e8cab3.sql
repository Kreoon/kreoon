-- Add pinned functionality to portfolio_posts
ALTER TABLE public.portfolio_posts 
ADD COLUMN IF NOT EXISTS is_pinned boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS pinned_at timestamp with time zone;

-- Add description column to content for captions
ALTER TABLE public.content
ADD COLUMN IF NOT EXISTS caption text;

-- Create index for pinned posts
CREATE INDEX IF NOT EXISTS idx_portfolio_posts_pinned ON public.portfolio_posts (user_id, is_pinned, pinned_at DESC);

-- Function to toggle pin status (max 3 pins per user)
CREATE OR REPLACE FUNCTION public.toggle_post_pin(post_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_pinned boolean;
  pin_count integer;
  post_owner uuid;
BEGIN
  -- Get current pin status and owner
  SELECT is_pinned, user_id INTO current_pinned, post_owner
  FROM public.portfolio_posts
  WHERE id = post_id;
  
  IF post_owner IS NULL THEN
    RAISE EXCEPTION 'Post not found';
  END IF;
  
  -- Check if user owns the post
  IF post_owner != auth.uid() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  
  -- If already pinned, unpin it
  IF current_pinned = true THEN
    UPDATE public.portfolio_posts
    SET is_pinned = false, pinned_at = NULL
    WHERE id = post_id;
    RETURN false;
  END IF;
  
  -- Check pin count (max 3)
  SELECT COUNT(*) INTO pin_count
  FROM public.portfolio_posts
  WHERE user_id = post_owner AND is_pinned = true;
  
  IF pin_count >= 3 THEN
    RAISE EXCEPTION 'Maximum 3 pinned posts allowed';
  END IF;
  
  -- Pin the post
  UPDATE public.portfolio_posts
  SET is_pinned = true, pinned_at = now()
  WHERE id = post_id;
  
  RETURN true;
END;
$$;

-- Function to toggle content pin (max 3 pins per creator)
CREATE OR REPLACE FUNCTION public.toggle_content_pin(content_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_pinned boolean;
  pin_count integer;
  content_creator uuid;
BEGIN
  -- Get current pin status and creator
  SELECT 
    COALESCE((SELECT true FROM public.content WHERE id = content_id AND caption LIKE '%[PINNED]%'), false),
    creator_id 
  INTO current_pinned, content_creator
  FROM public.content
  WHERE id = content_id;
  
  IF content_creator IS NULL THEN
    RAISE EXCEPTION 'Content not found';
  END IF;
  
  -- Check if user owns the content
  IF content_creator != auth.uid() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  
  -- Toggle pin by updating caption
  IF current_pinned = true THEN
    UPDATE public.content
    SET caption = REPLACE(caption, '[PINNED]', '')
    WHERE id = content_id;
    RETURN false;
  END IF;
  
  -- Check pin count (max 3)
  SELECT COUNT(*) INTO pin_count
  FROM public.content
  WHERE creator_id = content_creator AND caption LIKE '%[PINNED]%';
  
  IF pin_count >= 3 THEN
    RAISE EXCEPTION 'Maximum 3 pinned posts allowed';
  END IF;
  
  -- Pin the content
  UPDATE public.content
  SET caption = COALESCE(caption, '') || '[PINNED]'
  WHERE id = content_id;
  
  RETURN true;
END;
$$;