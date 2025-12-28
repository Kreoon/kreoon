-- Allow authenticated users to view published content in the public feed
CREATE POLICY "Authenticated users can view published content"
ON public.content
FOR SELECT
TO authenticated
USING (is_published = true);