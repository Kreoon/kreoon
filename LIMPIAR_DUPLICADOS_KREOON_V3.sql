-- =============================================================
-- SCRIPT DE LIMPIEZA DE DUPLICADOS EN KREOON (CORREGIDO)
-- Base de datos: wjkbqcrxwsmvtxmqgiqc
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

-- 3.3 Eliminar dependencias (tablas que existen en Kreoon)
DELETE FROM public.organization_member_badges WHERE user_id IN (SELECT id FROM perfiles_a_eliminar);
DELETE FROM public.organization_member_roles WHERE user_id IN (SELECT id FROM perfiles_a_eliminar);
DELETE FROM public.organization_members WHERE user_id IN (SELECT id FROM perfiles_a_eliminar);
DELETE FROM public.client_users WHERE user_id IN (SELECT id FROM perfiles_a_eliminar);
DELETE FROM public.user_achievements WHERE user_id IN (SELECT id FROM perfiles_a_eliminar);
DELETE FROM public.up_creadores_totals WHERE user_id IN (SELECT id FROM perfiles_a_eliminar);
DELETE FROM public.up_editores_totals WHERE user_id IN (SELECT id FROM perfiles_a_eliminar);
DELETE FROM public.up_transactions WHERE user_id IN (SELECT id FROM perfiles_a_eliminar);
DELETE FROM public.notifications WHERE user_id IN (SELECT id FROM perfiles_a_eliminar);
DELETE FROM public.chat_participants WHERE user_id IN (SELECT id FROM perfiles_a_eliminar);

-- 3.4 Eliminar los perfiles duplicados
DELETE FROM public.profiles WHERE id IN (SELECT id FROM perfiles_a_eliminar);

-- 3.5 Limpiar tabla temporal
DROP TABLE perfiles_a_eliminar;

-- VERIFICACIÓN FINAL
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
