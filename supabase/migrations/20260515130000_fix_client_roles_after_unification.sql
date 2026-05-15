-- Corrección de roles post-unificación: client_users y brand_members
-- que quedaron con content_creator por defecto al no tener user_roles

UPDATE organization_members om
SET role = 'client'
FROM client_users cu
WHERE cu.user_id = om.user_id
  AND om.organization_id = 'c8ae6c6d-a15d-46d9-b69e-465f7371595e'
  AND om.role = 'content_creator'
  AND NOT EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = om.user_id);

UPDATE organization_members om
SET role = 'client'
FROM brand_members bm
WHERE bm.user_id = om.user_id
  AND bm.status = 'active'
  AND om.organization_id = 'c8ae6c6d-a15d-46d9-b69e-465f7371595e'
  AND om.role = 'content_creator'
  AND NOT EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = om.user_id);
