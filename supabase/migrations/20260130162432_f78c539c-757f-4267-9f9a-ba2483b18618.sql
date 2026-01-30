
-- Fix: Sync user_roles from organization_members for creators/editors
-- Insert missing creator roles
INSERT INTO public.user_roles (user_id, role)
SELECT om.user_id, 'creator'::app_role
FROM organization_members om
WHERE om.role = 'creator'
AND NOT EXISTS (
  SELECT 1 FROM user_roles ur 
  WHERE ur.user_id = om.user_id AND ur.role = 'creator'
)
ON CONFLICT (user_id, role) DO NOTHING;

-- Insert missing editor roles
INSERT INTO public.user_roles (user_id, role)
SELECT om.user_id, 'editor'::app_role
FROM organization_members om
WHERE om.role = 'editor'
AND NOT EXISTS (
  SELECT 1 FROM user_roles ur 
  WHERE ur.user_id = om.user_id AND ur.role = 'editor'
)
ON CONFLICT (user_id, role) DO NOTHING;

-- Update active_role for all creators in organization_members
UPDATE public.profiles p
SET active_role = 'creator'
FROM organization_members om
WHERE p.id = om.user_id
AND om.role = 'creator'
AND (p.active_role IS NULL OR p.active_role NOT IN ('creator', 'admin'));

-- Update active_role for all editors in organization_members
UPDATE public.profiles p
SET active_role = 'editor'
FROM organization_members om
WHERE p.id = om.user_id
AND om.role = 'editor'
AND (p.active_role IS NULL OR p.active_role NOT IN ('editor', 'admin', 'creator'));

-- Ensure all org members have current_organization_id set
UPDATE public.profiles p
SET current_organization_id = om.organization_id
FROM organization_members om
WHERE p.id = om.user_id
AND p.current_organization_id IS NULL;
