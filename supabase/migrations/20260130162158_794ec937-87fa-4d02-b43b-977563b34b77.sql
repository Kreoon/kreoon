
-- Fix active_role for creators and editors
-- Set active_role based on their role in user_roles table

-- Update creators with NULL active_role
UPDATE public.profiles
SET active_role = 'creator'
WHERE id IN (
  SELECT user_id FROM user_roles WHERE role = 'creator'
)
AND active_role IS NULL;

-- Update editors with NULL active_role
UPDATE public.profiles
SET active_role = 'editor'
WHERE id IN (
  SELECT user_id FROM user_roles WHERE role = 'editor'
)
AND active_role IS NULL;

-- Also update current_organization_id for any creators/editors who don't have it set
-- by looking at their organization_members record
UPDATE public.profiles p
SET current_organization_id = om.organization_id
FROM organization_members om
WHERE p.id = om.user_id
AND p.current_organization_id IS NULL
AND om.role IN ('creator', 'editor');

-- Grant RLS policy access for organization config tables
-- These are needed for the board to function properly

-- Allow creators and editors to view their org's advanced config
DROP POLICY IF EXISTS "Org members can view advanced config" ON public.content_advanced_config;
CREATE POLICY "Org members can view advanced config"
ON public.content_advanced_config
FOR SELECT
TO authenticated
USING (
  organization_id IN (
    SELECT om.organization_id 
    FROM organization_members om 
    WHERE om.user_id = auth.uid()
  )
);

-- Allow creators and editors to view their org's block state rules
DROP POLICY IF EXISTS "Org members can view state rules" ON public.content_block_state_rules;
CREATE POLICY "Org members can view state rules"
ON public.content_block_state_rules
FOR SELECT
TO authenticated
USING (
  organization_id IN (
    SELECT om.organization_id 
    FROM organization_members om 
    WHERE om.user_id = auth.uid()
  )
);

-- Allow creators and editors to view script permissions
DROP POLICY IF EXISTS "Org members can view script permissions" ON public.script_permissions;
CREATE POLICY "Org members can view script permissions"
ON public.script_permissions
FOR SELECT
TO authenticated
USING (
  organization_id IN (
    SELECT om.organization_id 
    FROM organization_members om 
    WHERE om.user_id = auth.uid()
  )
);
