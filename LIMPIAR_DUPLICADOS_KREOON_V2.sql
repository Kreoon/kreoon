-- =============================================================
-- SCRIPT DE LIMPIEZA DE DUPLICADOS EN KREOON
-- Base de datos: wjkbqcrxwsmvtxmqgiqc
-- Ejecutar en: https://supabase.com/dashboard/project/wjkbqcrxwsmvtxmqgiqc/sql/new
-- =============================================================

-- PASO 1: VER TODOS LOS DUPLICADOS POR EMAIL
-- (Muestra cuáles tienen proyectos asignados)
WITH duplicados AS (
  SELECT 
    email,
    array_agg(id ORDER BY created_at) as ids,
    array_agg(full_name ORDER BY created_at) as nombres,
    COUNT(*) as cantidad
  FROM public.profiles
  WHERE current_organization_id = 'c8ae6c6d-a15d-46d9-b69e-465f7371595e'
  GROUP BY email
  HAVING COUNT(*) > 1
)
SELECT 
  d.email,
  d.cantidad,
  p.id,
  p.full_name,
  p.created_at,
  p.active_role,
  (SELECT COUNT(*) FROM public.content WHERE creator_id = p.id) as proyectos_creador,
  (SELECT COUNT(*) FROM public.content WHERE editor_id = p.id) as proyectos_editor,
  (SELECT COUNT(*) FROM public.content WHERE strategist_id = p.id) as proyectos_estratega
FROM duplicados d
CROSS JOIN LATERAL unnest(d.ids) as profile_id
JOIN public.profiles p ON p.id = profile_id
ORDER BY d.email, p.created_at;

-- =============================================================
-- PASO 2: IDENTIFICAR PERFILES A ELIMINAR
-- Regla: Eliminar el que NO tiene proyectos asignados
-- Si ambos tienen proyectos, mantener el más antiguo
-- =============================================================
WITH duplicados AS (
  SELECT 
    email,
    array_agg(id ORDER BY created_at) as ids
  FROM public.profiles
  WHERE current_organization_id = 'c8ae6c6d-a15d-46d9-b69e-465f7371595e'
  GROUP BY email
  HAVING COUNT(*) > 1
),
perfiles_con_proyectos AS (
  SELECT 
    p.id,
    p.email,
    p.full_name,
    p.created_at,
    (
      (SELECT COUNT(*) FROM public.content WHERE creator_id = p.id) +
      (SELECT COUNT(*) FROM public.content WHERE editor_id = p.id) +
      (SELECT COUNT(*) FROM public.content WHERE strategist_id = p.id)
    ) as total_proyectos
  FROM duplicados d
  CROSS JOIN LATERAL unnest(d.ids) as profile_id
  JOIN public.profiles p ON p.id = profile_id
),
perfiles_a_mantener AS (
  -- Para cada email, elegir el que tiene más proyectos, o el más antiguo si empatan
  SELECT DISTINCT ON (email) 
    id,
    email,
    full_name,
    total_proyectos
  FROM perfiles_con_proyectos
  ORDER BY email, total_proyectos DESC, created_at ASC
)
-- Mostrar los que se van a ELIMINAR (los que NO están en perfiles_a_mantener)
SELECT 
  pcp.id as id_a_eliminar,
  pcp.email,
  pcp.full_name,
  pcp.total_proyectos,
  'ELIMINAR' as accion
FROM perfiles_con_proyectos pcp
WHERE pcp.id NOT IN (SELECT id FROM perfiles_a_mantener)
ORDER BY pcp.email;

-- =============================================================
-- PASO 3: EJECUTAR LIMPIEZA
-- (Solo ejecutar después de verificar el paso 2)
-- =============================================================

-- 3.1 Crear tabla temporal con IDs a eliminar
CREATE TEMP TABLE perfiles_a_eliminar AS
WITH duplicados AS (
  SELECT 
    email,
    array_agg(id ORDER BY created_at) as ids
  FROM public.profiles
  WHERE current_organization_id = 'c8ae6c6d-a15d-46d9-b69e-465f7371595e'
  GROUP BY email
  HAVING COUNT(*) > 1
),
perfiles_con_proyectos AS (
  SELECT 
    p.id,
    p.email,
    p.created_at,
    (
      (SELECT COUNT(*) FROM public.content WHERE creator_id = p.id) +
      (SELECT COUNT(*) FROM public.content WHERE editor_id = p.id) +
      (SELECT COUNT(*) FROM public.content WHERE strategist_id = p.id)
    ) as total_proyectos
  FROM duplicados d
  CROSS JOIN LATERAL unnest(d.ids) as profile_id
  JOIN public.profiles p ON p.id = profile_id
),
perfiles_a_mantener AS (
  SELECT DISTINCT ON (email) id
  FROM perfiles_con_proyectos
  ORDER BY email, total_proyectos DESC, created_at ASC
)
SELECT pcp.id
FROM perfiles_con_proyectos pcp
WHERE pcp.id NOT IN (SELECT id FROM perfiles_a_mantener);

-- 3.2 Ver cuántos se van a eliminar
SELECT COUNT(*) as perfiles_a_eliminar FROM perfiles_a_eliminar;

-- 3.3 Eliminar dependencias
DELETE FROM public.organization_member_badges WHERE user_id IN (SELECT id FROM perfiles_a_eliminar);
DELETE FROM public.organization_member_roles WHERE user_id IN (SELECT id FROM perfiles_a_eliminar);
DELETE FROM public.organization_members WHERE user_id IN (SELECT id FROM perfiles_a_eliminar);
DELETE FROM public.client_users WHERE user_id IN (SELECT id FROM perfiles_a_eliminar);
DELETE FROM public.user_achievements WHERE user_id IN (SELECT id FROM perfiles_a_eliminar);
DELETE FROM public.up_totals WHERE user_id IN (SELECT id FROM perfiles_a_eliminar);
DELETE FROM public.up_events WHERE user_id IN (SELECT id FROM perfiles_a_eliminar);
DELETE FROM public.notifications WHERE user_id IN (SELECT id FROM perfiles_a_eliminar);
DELETE FROM public.chat_participants WHERE user_id IN (SELECT id FROM perfiles_a_eliminar);

-- 3.4 Eliminar los perfiles duplicados
DELETE FROM public.profiles WHERE id IN (SELECT id FROM perfiles_a_eliminar);

-- 3.5 Limpiar tabla temporal
DROP TABLE perfiles_a_eliminar;

-- =============================================================
-- PASO 4: VERIFICACIÓN FINAL
-- =============================================================
SELECT 
  'duplicados_restantes' as verificacion,
  COUNT(*) as cantidad
FROM (
  SELECT email
  FROM public.profiles
  WHERE current_organization_id = 'c8ae6c6d-a15d-46d9-b69e-465f7371595e'
  GROUP BY email
  HAVING COUNT(*) > 1
) sub;

-- Total de perfiles después de limpieza
SELECT 
  'total_perfiles' as verificacion,
  COUNT(*) as cantidad
FROM public.profiles
WHERE current_organization_id = 'c8ae6c6d-a15d-46d9-b69e-465f7371595e';
