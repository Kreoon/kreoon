-- Remove the old overly permissive policies now that we have proper ones
DROP POLICY IF EXISTS "Anyone can like content" ON public.content_likes;
DROP POLICY IF EXISTS "Anyone can like portfolio posts" ON public.portfolio_post_likes;
DROP POLICY IF EXISTS "Viewers can unlike their own likes" ON public.portfolio_post_likes;