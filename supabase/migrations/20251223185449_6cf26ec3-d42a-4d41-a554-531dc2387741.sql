-- Allow users to update their own portfolio stories
CREATE POLICY "Users can update their own stories"
ON public.portfolio_stories
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Allow creators to delete their assigned content
CREATE POLICY "Creators can delete assigned content"
ON public.content
FOR DELETE
USING (creator_id = auth.uid());

-- Allow editors to delete their assigned content (if they created it)
CREATE POLICY "Editors can delete assigned content"
ON public.content
FOR DELETE
USING (editor_id = auth.uid());