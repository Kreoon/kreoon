-- =====================================================
-- Fix RLS for kanban_config and state_permissions
-- Allow org owners, platform admins, and org admins/strategists/team_leaders to manage
-- =====================================================

-- Helper: user can configure kanban (org owner, platform admin, or org member with config role)
CREATE OR REPLACE FUNCTION public.is_org_configurer(_user_id uuid, _org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (
    -- Platform admin
    public.has_role(_user_id, 'admin'::app_role)
    OR
    -- Org owner
    public.is_org_owner(_user_id, _org_id)
    OR
    -- Org member with config role (admin, strategist, team_leader)
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.user_id = _user_id AND om.organization_id = _org_id
      AND om.role::text IN ('admin', 'strategist', 'team_leader')
    )
    OR
    -- organization_member_roles (multiple roles per user)
    EXISTS (
      SELECT 1 FROM public.organization_member_roles omr
      WHERE omr.user_id = _user_id AND omr.organization_id = _org_id
      AND omr.role::text IN ('admin', 'strategist', 'team_leader')
    )
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_org_configurer(uuid, uuid) TO authenticated;

-- state_permissions: drop old manage policy, create new one
DROP POLICY IF EXISTS "Org owners and admins can manage state_permissions" ON public.state_permissions;
CREATE POLICY "Org configurers can manage state_permissions"
ON public.state_permissions FOR ALL
USING (public.is_org_configurer(auth.uid(), organization_id))
WITH CHECK (public.is_org_configurer(auth.uid(), organization_id));

-- kanban_config: drop old manage policy, create new one
DROP POLICY IF EXISTS "Org owners and admins can manage kanban_config" ON public.kanban_config;
CREATE POLICY "Org configurers can manage kanban_config"
ON public.kanban_config FOR ALL
USING (public.is_org_configurer(auth.uid(), organization_id))
WITH CHECK (public.is_org_configurer(auth.uid(), organization_id));

-- Also fix organization_statuses: add configurers (in case user gets 400 on update - might be RLS)
DROP POLICY IF EXISTS "Org owners can manage statuses" ON public.organization_statuses;
CREATE POLICY "Org owners and configurers can manage statuses"
ON public.organization_statuses FOR ALL
USING (public.is_org_configurer(auth.uid(), organization_id))
WITH CHECK (public.is_org_configurer(auth.uid(), organization_id));

-- Platform admins policy for organization_statuses (allows managing any org's statuses)
-- Already covered by has_role in the policy above, but keeping for clarity
