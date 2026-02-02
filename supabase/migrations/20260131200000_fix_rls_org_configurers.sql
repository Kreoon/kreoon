-- =====================================================
-- Fix RLS: Allow org configurers (admin, strategist, team_leader) 
-- to access tables that were restricted to org_owner only
-- =====================================================

-- Ensure is_org_configurer exists (from previous migration)
CREATE OR REPLACE FUNCTION public.is_org_configurer(_user_id uuid, _org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (
    public.has_role(_user_id, 'admin'::app_role)
    OR public.is_org_owner(_user_id, _org_id)
    OR EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.user_id = _user_id AND om.organization_id = _org_id
      AND om.role::text IN ('admin', 'strategist', 'team_leader')
    )
    OR EXISTS (
      SELECT 1 FROM public.organization_member_roles omr
      WHERE omr.user_id = _user_id AND omr.organization_id = _org_id
      AND omr.role::text IN ('admin', 'strategist', 'team_leader')
    )
  );
$$;

-- project_raw_assets: Add policy for org configurers to manage (if not already covered)
DROP POLICY IF EXISTS "Org configurers can manage raw assets" ON public.project_raw_assets;
CREATE POLICY "Org configurers can manage raw assets"
ON public.project_raw_assets FOR ALL
USING (public.is_org_configurer(auth.uid(), organization_id))
WITH CHECK (public.is_org_configurer(auth.uid(), organization_id));

-- content_comments: Ensure org members can view (content comes from content table)
-- Add policy for users who can access the content
DROP POLICY IF EXISTS "Org configurers can view content comments" ON public.content_comments;
CREATE POLICY "Org configurers can view content comments"
ON public.content_comments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.content c
    WHERE c.id = content_comments.content_id
    AND public.is_org_configurer(auth.uid(), c.organization_id)
  )
);

-- content_block_config
DROP POLICY IF EXISTS "Org configurers can manage block config" ON public.content_block_config;
CREATE POLICY "Org configurers can manage block config"
ON public.content_block_config FOR ALL
USING (public.is_org_configurer(auth.uid(), organization_id))
WITH CHECK (public.is_org_configurer(auth.uid(), organization_id));

-- content_block_permissions
DROP POLICY IF EXISTS "Org configurers can manage block permissions" ON public.content_block_permissions;
CREATE POLICY "Org configurers can manage block permissions"
ON public.content_block_permissions FOR ALL
USING (public.is_org_configurer(auth.uid(), organization_id))
WITH CHECK (public.is_org_configurer(auth.uid(), organization_id));

-- content_advanced_config
DROP POLICY IF EXISTS "Org configurers can manage advanced config" ON public.content_advanced_config;
CREATE POLICY "Org configurers can manage advanced config"
ON public.content_advanced_config FOR ALL
USING (public.is_org_configurer(auth.uid(), organization_id))
WITH CHECK (public.is_org_configurer(auth.uid(), organization_id));

-- content_block_state_rules
DROP POLICY IF EXISTS "Org configurers can manage state rules" ON public.content_block_state_rules;
CREATE POLICY "Org configurers can manage state rules"
ON public.content_block_state_rules FOR ALL
USING (public.is_org_configurer(auth.uid(), organization_id))
WITH CHECK (public.is_org_configurer(auth.uid(), organization_id));

-- script_permissions
DROP POLICY IF EXISTS "Org configurers can manage script permissions" ON public.script_permissions;
CREATE POLICY "Org configurers can manage script permissions"
ON public.script_permissions FOR ALL
USING (public.is_org_configurer(auth.uid(), organization_id))
WITH CHECK (public.is_org_configurer(auth.uid(), organization_id));

-- organization_ai_prompts
DROP POLICY IF EXISTS "Org configurers can manage ai prompts" ON public.organization_ai_prompts;
CREATE POLICY "Org configurers can manage ai prompts"
ON public.organization_ai_prompts FOR ALL
USING (public.is_org_configurer(auth.uid(), organization_id))
WITH CHECK (public.is_org_configurer(auth.uid(), organization_id));

-- organization_ai_providers
DROP POLICY IF EXISTS "Org configurers can manage ai providers" ON public.organization_ai_providers;
CREATE POLICY "Org configurers can manage ai providers"
ON public.organization_ai_providers FOR ALL
USING (public.is_org_configurer(auth.uid(), organization_id))
WITH CHECK (public.is_org_configurer(auth.uid(), organization_id));
