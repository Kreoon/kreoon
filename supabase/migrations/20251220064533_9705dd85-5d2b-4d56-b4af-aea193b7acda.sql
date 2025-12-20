-- Create followers table
CREATE TABLE public.followers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  follower_id UUID NOT NULL,
  following_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(follower_id, following_id),
  CONSTRAINT no_self_follow CHECK (follower_id != following_id)
);

-- Enable RLS
ALTER TABLE public.followers ENABLE ROW LEVEL SECURITY;

-- Anyone can view followers
CREATE POLICY "Anyone can view followers"
ON public.followers
FOR SELECT
USING (true);

-- Authenticated users can follow others
CREATE POLICY "Users can follow others"
ON public.followers
FOR INSERT
WITH CHECK (auth.uid() = follower_id);

-- Users can unfollow
CREATE POLICY "Users can unfollow"
ON public.followers
FOR DELETE
USING (auth.uid() = follower_id);

-- Create indexes for performance
CREATE INDEX idx_followers_follower_id ON public.followers(follower_id);
CREATE INDEX idx_followers_following_id ON public.followers(following_id);

-- Function to toggle follow
CREATE OR REPLACE FUNCTION public.toggle_follow(_following_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_following BOOLEAN;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF auth.uid() = _following_id THEN
    RAISE EXCEPTION 'Cannot follow yourself';
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM public.followers 
    WHERE follower_id = auth.uid() AND following_id = _following_id
  ) INTO is_following;
  
  IF is_following THEN
    DELETE FROM public.followers 
    WHERE follower_id = auth.uid() AND following_id = _following_id;
    RETURN false;
  ELSE
    INSERT INTO public.followers (follower_id, following_id) 
    VALUES (auth.uid(), _following_id);
    RETURN true;
  END IF;
END;
$$;

-- Function to get follower counts
CREATE OR REPLACE FUNCTION public.get_follow_counts(_user_id UUID)
RETURNS TABLE(followers_count BIGINT, following_count BIGINT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    (SELECT COUNT(*) FROM public.followers WHERE following_id = _user_id) as followers_count,
    (SELECT COUNT(*) FROM public.followers WHERE follower_id = _user_id) as following_count;
$$;

-- Function to check if current user follows someone
CREATE OR REPLACE FUNCTION public.is_following(_following_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.followers 
    WHERE follower_id = auth.uid() AND following_id = _following_id
  );
$$;