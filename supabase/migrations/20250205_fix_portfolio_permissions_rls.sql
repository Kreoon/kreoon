-- =============================================
-- FIX: Portfolio Permissions RLS Policies
-- =============================================

-- Ensure the is_org_member function exists and works correctly
CREATE OR REPLACE FUNCTION public.is_org_member(_user_id uuid, _org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE user_id = _user_id AND organization_id = _org_id
  )
$$;

-- Ensure the is_org_owner function exists
CREATE OR REPLACE FUNCTION public.is_org_owner(_user_id uuid, _org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE user_id = _user_id AND organization_id = _org_id AND is_owner = true
  )
$$;

-- Drop existing policies if they exist and recreate them
DROP POLICY IF EXISTS "Org members can view permissions" ON public.portfolio_permissions;
DROP POLICY IF EXISTS "Org owners can manage permissions" ON public.portfolio_permissions;

-- Recreate the policies
CREATE POLICY "Org members can view permissions"
ON public.portfolio_permissions FOR SELECT
USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org owners can manage permissions"
ON public.portfolio_permissions FOR ALL
USING (is_org_owner(auth.uid(), organization_id));

-- Grant execute permissions on the functions
GRANT EXECUTE ON FUNCTION public.is_org_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_org_owner(uuid, uuid) TO authenticated;
