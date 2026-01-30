-- =============================================================
-- SCRIPT DE LIMPIEZA DE DUPLICADOS EN KREOON
-- Ejecutar en: https://supabase.com/dashboard/project/wjkbqcrxwsmvtxmqgiqc/sql/new
-- =============================================================

-- PASO 1: Identificar PERFILES duplicados por email
-- (Muestra los que tienen el mismo email pero diferente ID)
SELECT 
  email,
  COUNT(*) as cantidad,
  array_agg(id ORDER BY created_at) as ids,
  array_agg(full_name ORDER BY created_at) as nombres,
  array_agg(created_at ORDER BY created_at) as fechas_creacion,
  array_agg(COALESCE(editor_completed_count, 0) ORDER BY created_at) as contenidos_editados,
  MIN(created_at) as perfil_original
FROM public.profiles
WHERE current_organization_id = 'c8ae6c6d-a15d-46d9-b69e-465f7371595e'
GROUP BY email
HAVING COUNT(*) > 1
ORDER BY cantidad DESC;

-- PASO 2: Identificar CLIENTES duplicados por nombre
SELECT 
  name,
  COUNT(*) as cantidad,
  array_agg(id ORDER BY created_at) as ids,
  array_agg(contact_email ORDER BY created_at) as emails,
  array_agg(created_at ORDER BY created_at) as fechas_creacion
FROM public.clients
WHERE organization_id = 'c8ae6c6d-a15d-46d9-b69e-465f7371595e'
GROUP BY name
HAVING COUNT(*) > 1
ORDER BY cantidad DESC;

-- =============================================================
-- LIMPIEZA DE PERFILES DUPLICADOS
-- Estrategia: Conservar el perfil MÁS ANTIGUO (el original)
-- y eliminar los creados recientemente (2026-01-30)
-- =============================================================

-- PASO 3: Ver qué perfiles se eliminarían (los nuevos/duplicados)
SELECT 
  p.id,
  p.email,
  p.full_name,
  p.created_at,
  p.editor_completed_count,
  p.active_role
FROM public.profiles p
WHERE p.current_organization_id = 'c8ae6c6d-a15d-46d9-b69e-465f7371595e'
  AND p.created_at::date = '2026-01-30'
  AND EXISTS (
    SELECT 1 FROM public.profiles p2 
    WHERE p2.email = p.email 
      AND p2.id != p.id 
      AND p2.created_at < p.created_at
  )
ORDER BY p.email;

-- PASO 4: Eliminar membresías de organización de los duplicados
DELETE FROM public.organization_members
WHERE user_id IN (
  SELECT p.id
  FROM public.profiles p
  WHERE p.current_organization_id = 'c8ae6c6d-a15d-46d9-b69e-465f7371595e'
    AND p.created_at::date = '2026-01-30'
    AND EXISTS (
      SELECT 1 FROM public.profiles p2 
      WHERE p2.email = p.email 
        AND p2.id != p.id 
        AND p2.created_at < p.created_at
    )
);

-- PASO 5: Eliminar roles de organización de los duplicados
DELETE FROM public.organization_member_roles
WHERE user_id IN (
  SELECT p.id
  FROM public.profiles p
  WHERE p.current_organization_id = 'c8ae6c6d-a15d-46d9-b69e-465f7371595e'
    AND p.created_at::date = '2026-01-30'
    AND EXISTS (
      SELECT 1 FROM public.profiles p2 
      WHERE p2.email = p.email 
        AND p2.id != p.id 
        AND p2.created_at < p.created_at
    )
);

-- PASO 6: Eliminar badges de los duplicados
DELETE FROM public.organization_member_badges
WHERE user_id IN (
  SELECT p.id
  FROM public.profiles p
  WHERE p.current_organization_id = 'c8ae6c6d-a15d-46d9-b69e-465f7371595e'
    AND p.created_at::date = '2026-01-30'
    AND EXISTS (
      SELECT 1 FROM public.profiles p2 
      WHERE p2.email = p.email 
        AND p2.id != p.id 
        AND p2.created_at < p.created_at
    )
);

-- PASO 7: Eliminar los perfiles duplicados
DELETE FROM public.profiles
WHERE id IN (
  SELECT p.id
  FROM public.profiles p
  WHERE p.current_organization_id = 'c8ae6c6d-a15d-46d9-b69e-465f7371595e'
    AND p.created_at::date = '2026-01-30'
    AND EXISTS (
      SELECT 1 FROM public.profiles p2 
      WHERE p2.email = p.email 
        AND p2.id != p.id 
        AND p2.created_at < p.created_at
    )
);

-- =============================================================
-- VERIFICACIÓN FINAL
-- =============================================================

-- Verificar que no queden duplicados de perfiles
SELECT 'Perfiles duplicados restantes' as check_type, COUNT(*) as cantidad
FROM (
  SELECT email
  FROM public.profiles
  WHERE current_organization_id = 'c8ae6c6d-a15d-46d9-b69e-465f7371595e'
  GROUP BY email
  HAVING COUNT(*) > 1
) sub;

-- Verificar que no queden duplicados de clientes
SELECT 'Clientes duplicados restantes' as check_type, COUNT(*) as cantidad
FROM (
  SELECT name
  FROM public.clients
  WHERE organization_id = 'c8ae6c6d-a15d-46d9-b69e-465f7371595e'
  GROUP BY name
  HAVING COUNT(*) > 1
) sub;
