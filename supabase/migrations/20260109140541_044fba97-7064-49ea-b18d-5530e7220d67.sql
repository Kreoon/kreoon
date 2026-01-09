-- Add RLS policies for admins and team members to view all content in their org

-- Admins can view all content in their organization
CREATE POLICY "Admins can view all org content"
ON public.content
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  AND organization_id = get_current_organization_id(auth.uid())
);

-- Team leaders can view all content in their organization
CREATE POLICY "Team leaders can view all org content"
ON public.content
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'team_leader'::app_role)
  AND organization_id = get_current_organization_id(auth.uid())
);

-- Strategists can view all content in their organization
CREATE POLICY "Strategists can view all org content"
ON public.content
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'strategist'::app_role)
  AND organization_id = get_current_organization_id(auth.uid())
);

-- Traffickers can view all content in their organization
CREATE POLICY "Traffickers can view all org content"
ON public.content
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'trafficker'::app_role)
  AND organization_id = get_current_organization_id(auth.uid())
);