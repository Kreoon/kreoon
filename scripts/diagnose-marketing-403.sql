-- Diagnóstico 403 marketing_campaigns
-- Ejecutar en Supabase SQL Editor para verificar estado actual

-- 1. Verificar si existen los GRANTs
SELECT grantee, privilege_type 
FROM information_schema.table_privileges 
WHERE table_schema = 'public' AND table_name = 'marketing_campaigns' AND grantee = 'authenticated';

-- 2. Verificar políticas RLS actuales
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'marketing_campaigns';

-- 3. Verificar membresía del usuario (reemplaza USER_ID con auth.uid() en una sesión)
-- En Supabase SQL Editor, el usuario actual no aplica; esto es para referencia
SELECT 'organization_members' as fuente, organization_id, user_id, role 
FROM organization_members 
WHERE organization_id = 'c8ae6c6d-a15d-46d9-b69e-465f7371595e'
LIMIT 5;

SELECT 'organization_member_roles' as fuente, organization_id, user_id, role 
FROM organization_member_roles 
WHERE organization_id = 'c8ae6c6d-a15d-46d9-b69e-465f7371595e'
LIMIT 5;
