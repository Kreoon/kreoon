-- Normalizar roles legacy al sistema de 7 roles base de organización
-- brand_manager → client, creator → content_creator, strategist → digital_strategist

UPDATE organization_members
SET role = 'client'
WHERE role = 'brand_manager'
  AND organization_id = 'c8ae6c6d-a15d-46d9-b69e-465f7371595e';

UPDATE user_roles
SET role = 'content_creator'
WHERE role = 'creator';

UPDATE user_roles
SET role = 'digital_strategist'
WHERE role = 'strategist';

-- Sincronizar organization_members si quedaron roles no válidos
UPDATE organization_members om
SET role = ur.role
FROM (
  SELECT DISTINCT ON (user_id) user_id, role
  FROM user_roles
  ORDER BY user_id, created_at
) ur
WHERE ur.user_id = om.user_id
  AND om.organization_id = 'c8ae6c6d-a15d-46d9-b69e-465f7371595e'
  AND om.role NOT IN ('admin', 'content_creator', 'editor', 'digital_strategist', 'creative_strategist', 'community_manager', 'client');
