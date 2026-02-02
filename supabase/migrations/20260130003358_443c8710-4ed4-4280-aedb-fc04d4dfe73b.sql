-- Drop existing restrictive policies on goals
DROP POLICY IF EXISTS "Members can view org goals" ON public.goals;
DROP POLICY IF EXISTS "Org owners can manage org goals" ON public.goals;
DROP POLICY IF EXISTS "Platform admins can manage goals in current org" ON public.goals;

-- Drop policies if they already exist (to avoid duplicates)
DROP POLICY IF EXISTS "Users can view goals from their organization" ON public.goals;
DROP POLICY IF EXISTS "Users can create goals for their organization" ON public.goals;
DROP POLICY IF EXISTS "Users can update goals from their organization" ON public.goals;
DROP POLICY IF EXISTS "Users can delete goals from their organization" ON public.goals;

-- Create simple organization-based policies for goals
-- Allow authenticated users to view goals from their current organization
CREATE POLICY "Users can view goals from their organization" 
ON public.goals 
FOR SELECT 
USING (
  organization_id IN (
    SELECT current_organization_id FROM public.profiles WHERE id = auth.uid()
  )
);

-- Allow authenticated users to insert goals for their current organization
CREATE POLICY "Users can create goals for their organization" 
ON public.goals 
FOR INSERT 
WITH CHECK (
  organization_id IN (
    SELECT current_organization_id FROM public.profiles WHERE id = auth.uid()
  )
);

-- Allow authenticated users to update goals from their current organization
CREATE POLICY "Users can update goals from their organization" 
ON public.goals 
FOR UPDATE 
USING (
  organization_id IN (
    SELECT current_organization_id FROM public.profiles WHERE id = auth.uid()
  )
);

-- Allow authenticated users to delete goals from their organization
CREATE POLICY "Users can delete goals from their organization" 
ON public.goals 
FOR DELETE 
USING (
  organization_id IN (
    SELECT current_organization_id FROM public.profiles WHERE id = auth.uid()
  )
);