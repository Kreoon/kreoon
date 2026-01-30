
-- Fix RLS policies for content_collaborators table
-- Allow org members to view collaborators on their org's content

-- Drop existing restrictive policies if they conflict
DROP POLICY IF EXISTS "Org members can view collaborators" ON public.content_collaborators;

-- Add policy for org members to SELECT collaborators
CREATE POLICY "Org members can view collaborators"
ON public.content_collaborators
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.content c
    JOIN public.organization_members om ON om.organization_id = c.organization_id
    WHERE c.id = content_collaborators.content_id
    AND om.user_id = auth.uid()
  )
);

-- Add policy for users to see content they're assigned to as creator/editor
DROP POLICY IF EXISTS "Users can view collaborators on their content" ON public.content_collaborators;

CREATE POLICY "Users can view collaborators on their content"
ON public.content_collaborators
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.content c
    WHERE c.id = content_collaborators.content_id
    AND (c.creator_id = auth.uid() OR c.editor_id = auth.uid())
  )
);

-- Add policy for org members to manage collaborators on their org's content
DROP POLICY IF EXISTS "Org members can manage collaborators" ON public.content_collaborators;

CREATE POLICY "Org members can manage collaborators"
ON public.content_collaborators
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.content c
    JOIN public.organization_members om ON om.organization_id = c.organization_id
    WHERE c.id = content_collaborators.content_id
    AND om.user_id = auth.uid()
    AND om.role IN ('admin', 'strategist', 'team_leader')
  )
);
