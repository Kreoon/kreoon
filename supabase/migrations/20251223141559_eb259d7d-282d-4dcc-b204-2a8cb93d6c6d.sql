-- Create portfolio_post_comments table
CREATE TABLE public.portfolio_post_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.portfolio_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  comment TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.portfolio_post_comments ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can view portfolio post comments"
ON public.portfolio_post_comments FOR SELECT
USING (true);

CREATE POLICY "Users can add comments"
ON public.portfolio_post_comments FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own comments"
ON public.portfolio_post_comments FOR DELETE
USING (user_id = auth.uid());

-- Add comments_count to portfolio_posts
ALTER TABLE public.portfolio_posts ADD COLUMN IF NOT EXISTS comments_count INTEGER DEFAULT 0;

-- Create function to update comments count
CREATE OR REPLACE FUNCTION public.update_portfolio_post_comments_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.portfolio_posts SET comments_count = comments_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.portfolio_posts SET comments_count = comments_count - 1 WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger
CREATE TRIGGER update_comments_count_trigger
AFTER INSERT OR DELETE ON public.portfolio_post_comments
FOR EACH ROW EXECUTE FUNCTION public.update_portfolio_post_comments_count();