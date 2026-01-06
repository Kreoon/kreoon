-- Fix overly permissive RLS policies for likes tables (with proper type casting)

-- Recreate content_likes policy with proper check (viewer_id is text)
CREATE POLICY "Authenticated users can like content" ON public.content_likes
  FOR INSERT 
  TO authenticated
  WITH CHECK (auth.uid()::text = viewer_id);

-- Recreate portfolio_post_likes policies (viewer_id is text)
CREATE POLICY "Authenticated users can like portfolio posts" ON public.portfolio_post_likes
  FOR INSERT 
  TO authenticated
  WITH CHECK (auth.uid()::text = viewer_id);

CREATE POLICY "Users can unlike their own likes" ON public.portfolio_post_likes
  FOR DELETE 
  TO authenticated
  USING (auth.uid()::text = viewer_id);