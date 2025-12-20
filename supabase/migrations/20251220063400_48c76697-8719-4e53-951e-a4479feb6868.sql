-- Create table for user portfolio posts (additional content uploaded by users)
CREATE TABLE public.portfolio_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  media_url TEXT NOT NULL,
  media_type TEXT NOT NULL DEFAULT 'image', -- 'image' or 'video'
  thumbnail_url TEXT,
  caption TEXT,
  views_count INTEGER DEFAULT 0,
  likes_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for stories (24-hour expiring content)
CREATE TABLE public.portfolio_stories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  media_url TEXT NOT NULL,
  media_type TEXT NOT NULL DEFAULT 'image', -- 'image' or 'video'
  views_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '24 hours')
);

-- Enable RLS
ALTER TABLE public.portfolio_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio_stories ENABLE ROW LEVEL SECURITY;

-- RLS Policies for portfolio_posts
CREATE POLICY "Anyone can view portfolio posts"
ON public.portfolio_posts
FOR SELECT
USING (true);

CREATE POLICY "Users can create their own posts"
ON public.portfolio_posts
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own posts"
ON public.portfolio_posts
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own posts"
ON public.portfolio_posts
FOR DELETE
USING (auth.uid() = user_id);

-- RLS Policies for portfolio_stories
CREATE POLICY "Anyone can view non-expired stories"
ON public.portfolio_stories
FOR SELECT
USING (expires_at > now());

CREATE POLICY "Users can create their own stories"
ON public.portfolio_stories
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own stories"
ON public.portfolio_stories
FOR DELETE
USING (auth.uid() = user_id);

-- Create storage bucket for portfolio media
INSERT INTO storage.buckets (id, name, public)
VALUES ('portfolio', 'portfolio', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for portfolio bucket
CREATE POLICY "Anyone can view portfolio media"
ON storage.objects
FOR SELECT
USING (bucket_id = 'portfolio');

CREATE POLICY "Authenticated users can upload portfolio media"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'portfolio' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own portfolio media"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'portfolio' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own portfolio media"
ON storage.objects
FOR DELETE
USING (bucket_id = 'portfolio' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Function to clean up expired stories (can be called by a cron job)
CREATE OR REPLACE FUNCTION public.cleanup_expired_stories()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.portfolio_stories WHERE expires_at < now();
END;
$$;