-- =====================================================
-- SCRIPT DE RESTAURACIÓN: TEMPORADA ENERO 2026
-- =====================================================
-- Ejecutar en Supabase SQL Editor del proyecto Kreoon
-- Este script restaura los datos de la temporada que no se migraron
-- =====================================================

-- 1. VERIFICAR DATOS ACTUALES (ejecutar primero para diagnóstico)
-- =====================================================

-- Ver contenido de Enero 2026
SELECT 
  id, 
  title, 
  status, 
  creator_id,
  editor_id,
  created_at,
  approved_at
FROM content 
WHERE created_at >= '2026-01-01' AND created_at < '2026-02-01'
ORDER BY created_at DESC;

-- Ver puntos UP de creators
SELECT 
  user_id,
  total_points,
  level,
  updated_at
FROM up_creadores_totals
ORDER BY total_points DESC;

-- Ver puntos UP de editores
SELECT 
  user_id,
  total_points,
  level,
  updated_at
FROM up_editores_totals
ORDER BY total_points DESC;

-- Ver transacciones UP de Enero 2026
SELECT 
  user_id,
  role,
  event_type,
  points,
  created_at
FROM up_transactions_v2
WHERE created_at >= '2026-01-01' AND created_at < '2026-02-01'
ORDER BY created_at DESC;

-- Ver logros desbloqueados
SELECT 
  ua.user_id,
  a.name as achievement_name,
  ua.unlocked_at
FROM user_achievements ua
JOIN achievements a ON ua.achievement_id = a.id
WHERE ua.unlocked_at >= '2026-01-01' AND ua.unlocked_at < '2026-02-01'
ORDER BY ua.unlocked_at DESC;

-- =====================================================
-- 2. SCRIPT PARA COPIAR DATOS DESDE PROYECTO ORIGINAL (Lovable Cloud)
-- =====================================================
-- Si tienes acceso al proyecto original (hfooshsteglylhvrpuka),
-- exporta los datos usando estas queries y luego impórtalos aquí

-- OPCIÓN A: Exportar desde Lovable Cloud y ejecutar INSERT aquí
-- =====================================================

-- Ejemplo de INSERT para contenido (reemplazar con datos reales exportados)
/*
INSERT INTO content (id, title, status, creator_id, editor_id, client_id, created_at, approved_at, ...)
VALUES 
  ('uuid-1', 'Video Title 1', 'approved', 'creator-uuid', 'editor-uuid', 'client-uuid', '2026-01-15 10:00:00', '2026-01-18 14:00:00', ...),
  ('uuid-2', 'Video Title 2', 'paid', 'creator-uuid', 'editor-uuid', 'client-uuid', '2026-01-20 09:00:00', '2026-01-22 16:00:00', ...)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  status = EXCLUDED.status,
  approved_at = EXCLUDED.approved_at;
*/

-- Ejemplo de INSERT para transacciones UP
/*
INSERT INTO up_transactions_v2 (id, user_id, role, content_id, event_type, points, created_at)
VALUES 
  ('uuid-1', 'user-uuid', 'creator', 'content-uuid', 'early_delivery', 70, '2026-01-15 12:00:00'),
  ('uuid-2', 'user-uuid', 'creator', 'content-uuid', 'clean_approval_bonus', 10, '2026-01-18 14:00:00')
ON CONFLICT (id) DO NOTHING;
*/

-- =====================================================
-- 3. RECALCULAR TOTALES UP (ejecutar después de importar transacciones)
-- =====================================================

-- Recalcular totales para Creators
INSERT INTO up_creadores_totals (user_id, total_points, level, updated_at)
SELECT 
  user_id,
  COALESCE(SUM(points), 0) as total_points,
  CASE 
    WHEN COALESCE(SUM(points), 0) >= 1200 THEN 'diamond'
    WHEN COALESCE(SUM(points), 0) >= 800 THEN 'gold'
    WHEN COALESCE(SUM(points), 0) >= 500 THEN 'silver'
    ELSE 'bronze'
  END as level,
  NOW() as updated_at
FROM up_transactions_v2
WHERE role = 'creator'
GROUP BY user_id
ON CONFLICT (user_id) DO UPDATE SET
  total_points = EXCLUDED.total_points,
  level = EXCLUDED.level,
  updated_at = EXCLUDED.updated_at;

-- Recalcular totales para Editors
INSERT INTO up_editores_totals (user_id, total_points, level, updated_at)
SELECT 
  user_id,
  COALESCE(SUM(points), 0) as total_points,
  CASE 
    WHEN COALESCE(SUM(points), 0) >= 1200 THEN 'diamond'
    WHEN COALESCE(SUM(points), 0) >= 800 THEN 'gold'
    WHEN COALESCE(SUM(points), 0) >= 500 THEN 'silver'
    ELSE 'bronze'
  END as level,
  NOW() as updated_at
FROM up_transactions_v2
WHERE role = 'editor'
GROUP BY user_id
ON CONFLICT (user_id) DO UPDATE SET
  total_points = EXCLUDED.total_points,
  level = EXCLUDED.level,
  updated_at = EXCLUDED.updated_at;

-- =====================================================
-- 4. VERIFICAR RESTAURACIÓN
-- =====================================================

-- Verificar que los datos se restauraron correctamente
SELECT 'Contenido Enero 2026' as tabla, COUNT(*) as registros
FROM content WHERE created_at >= '2026-01-01' AND created_at < '2026-02-01'
UNION ALL
SELECT 'Transacciones UP Enero 2026', COUNT(*)
FROM up_transactions_v2 WHERE created_at >= '2026-01-01' AND created_at < '2026-02-01'
UNION ALL
SELECT 'Total Creators con puntos', COUNT(*)
FROM up_creadores_totals WHERE total_points > 0
UNION ALL
SELECT 'Total Editors con puntos', COUNT(*)
FROM up_editores_totals WHERE total_points > 0
UNION ALL
SELECT 'Logros desbloqueados Enero 2026', COUNT(*)
FROM user_achievements WHERE unlocked_at >= '2026-01-01' AND unlocked_at < '2026-02-01';

-- =====================================================
-- 5. SCRIPT DE SINCRONIZACIÓN DESDE LOVABLE CLOUD
-- =====================================================
-- Para ejecutar una sincronización completa, usa este endpoint
-- desde la consola del navegador o Postman:

/*
// Sincronizar desde Lovable Cloud (proyecto original)
const LOVABLE_CLOUD_URL = 'https://hfooshsteglylhvrpuka.supabase.co';
const LOVABLE_CLOUD_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'; // Tu anon key

// Fetch datos de Enero 2026
const response = await fetch(`${LOVABLE_CLOUD_URL}/rest/v1/content?created_at=gte.2026-01-01&created_at=lt.2026-02-01`, {
  headers: {
    'apikey': LOVABLE_CLOUD_KEY,
    'Authorization': `Bearer ${LOVABLE_CLOUD_KEY}`
  }
});
const data = await response.json();
console.log('Datos a migrar:', data);
*/

-- =====================================================
-- FIN DEL SCRIPT
-- =====================================================
