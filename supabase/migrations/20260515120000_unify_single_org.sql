-- Migración: Unificación a organización única KREOON by UGC Colombia
-- Org ID: c8ae6c6d-a15d-46d9-b69e-465f7371595e

-- 1. Migrar usuarios freelance (sin org) a organization_members de KREOON
-- Toma el primer rol de user_roles, o 'content_creator' por defecto
INSERT INTO organization_members (organization_id, user_id, role, is_owner, joined_at)
SELECT
  'c8ae6c6d-a15d-46d9-b69e-465f7371595e',
  p.id,
  COALESCE(
    (SELECT ur.role FROM user_roles ur WHERE ur.user_id = p.id ORDER BY ur.created_at LIMIT 1),
    'content_creator'
  ),
  false,
  NOW()
FROM profiles p
WHERE p.current_organization_id IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM organization_members om
    WHERE om.user_id = p.id
    AND om.organization_id = 'c8ae6c6d-a15d-46d9-b69e-465f7371595e'
  )
ON CONFLICT DO NOTHING;

-- 2. Migrar miembros de otras orgs (ej: Prolab) a KREOON, si no están ya
INSERT INTO organization_members (organization_id, user_id, role, is_owner, joined_at)
SELECT
  'c8ae6c6d-a15d-46d9-b69e-465f7371595e',
  om.user_id,
  om.role,
  false,
  NOW()
FROM organization_members om
WHERE om.organization_id != 'c8ae6c6d-a15d-46d9-b69e-465f7371595e'
  AND NOT EXISTS (
    SELECT 1 FROM organization_members om2
    WHERE om2.user_id = om.user_id
    AND om2.organization_id = 'c8ae6c6d-a15d-46d9-b69e-465f7371595e'
  )
ON CONFLICT DO NOTHING;

-- 3. Actualizar current_organization_id en todos los profiles que no son KREOON
UPDATE profiles
SET current_organization_id = 'c8ae6c6d-a15d-46d9-b69e-465f7371595e',
    updated_at = NOW()
WHERE current_organization_id IS NULL
   OR current_organization_id != 'c8ae6c6d-a15d-46d9-b69e-465f7371595e';
