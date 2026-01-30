-- Fix RLS policies for content_collaborators to allow creators/editors to view collaborators
-- on content they are assigned to

-- Drop the existing policy that requires org membership
DROP POLICY IF EXISTS "Org members can view collaborators" ON public.content_collaborators;

-- Create a more permissive SELECT policy that allows:
-- 1. Organization members (existing behavior)
-- 2. Creators to see collaborators on content where they are the creator
-- 3. Editors to see collaborators on content where they are the editor
CREATE POLICY "Authenticated users can view relevant collaborators"
ON public.content_collaborators
FOR SELECT
TO authenticated
USING (
  -- User is the collaborator themselves
  user_id = auth.uid()
  -- Or user is creator/editor of the content
  OR EXISTS (
    SELECT 1 FROM content c
    WHERE c.id = content_collaborators.content_id
    AND (c.creator_id = auth.uid() OR c.editor_id = auth.uid())
  )
  -- Or user is a member of the organization that owns the content
  OR EXISTS (
    SELECT 1 FROM content c
    JOIN organization_members om ON om.organization_id = c.organization_id
    WHERE c.id = content_collaborators.content_id
    AND om.user_id = auth.uid()
  )
);