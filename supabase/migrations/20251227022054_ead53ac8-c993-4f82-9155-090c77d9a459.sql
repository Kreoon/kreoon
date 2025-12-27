-- Create table to support multiple roles per organization member
CREATE TABLE public.organization_member_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  assigned_by UUID REFERENCES auth.users(id),
  UNIQUE (organization_id, user_id, role)
);

-- Enable RLS
ALTER TABLE public.organization_member_roles ENABLE ROW LEVEL SECURITY;

-- Members can view roles in their organization
CREATE POLICY "Members can view org member roles"
  ON public.organization_member_roles
  FOR SELECT
  USING (is_org_member(auth.uid(), organization_id));

-- Org owners can manage roles
CREATE POLICY "Org owners can manage member roles"
  ON public.organization_member_roles
  FOR ALL
  USING (is_org_owner(auth.uid(), organization_id))
  WITH CHECK (is_org_owner(auth.uid(), organization_id));

-- Platform admins can manage roles in their current org
CREATE POLICY "Platform admins can manage member roles in current org"
  ON public.organization_member_roles
  FOR ALL
  USING (
    has_role(auth.uid(), 'admin'::app_role) 
    AND get_current_organization_id(auth.uid()) IS NOT NULL 
    AND organization_id = get_current_organization_id(auth.uid())
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role) 
    AND get_current_organization_id(auth.uid()) IS NOT NULL 
    AND organization_id = get_current_organization_id(auth.uid())
  );

-- Add index for faster queries
CREATE INDEX idx_org_member_roles_org_user ON public.organization_member_roles(organization_id, user_id);
CREATE INDEX idx_org_member_roles_user ON public.organization_member_roles(user_id);

-- Migrate existing roles from organization_members to the new table
INSERT INTO public.organization_member_roles (organization_id, user_id, role)
SELECT organization_id, user_id, role
FROM public.organization_members
WHERE role IS NOT NULL
ON CONFLICT (organization_id, user_id, role) DO NOTHING;

-- Comment for clarity
COMMENT ON TABLE public.organization_member_roles IS 'Allows multiple roles per user within an organization';