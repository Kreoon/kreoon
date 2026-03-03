-- Mostrar asignaciones actuales que podrían estar ocultas
DO $$
DECLARE
  rec RECORD;
BEGIN
  RAISE NOTICE '=== ASIGNACIONES ACTUALES ===';
  FOR rec IN
    SELECT
      pa.id,
      pa.status,
      pa.role_id,
      pa.content_id,
      p.full_name
    FROM project_assignments pa
    LEFT JOIN profiles p ON p.id = pa.user_id
    ORDER BY pa.created_at DESC
    LIMIT 50
  LOOP
    RAISE NOTICE 'ID: %, Status: %, Role: %, Content: %, User: %',
      rec.id, rec.status, rec.role_id, rec.content_id, rec.full_name;
  END LOOP;
END $$;

-- Actualizar TODAS las asignaciones que no están en estados finales a 'accepted'
UPDATE project_assignments
SET
  status = 'accepted',
  accepted_at = COALESCE(accepted_at, created_at)
WHERE status IN ('pending', 'invited');

-- Mostrar conteo por estado después de la limpieza
DO $$
DECLARE
  rec RECORD;
BEGIN
  RAISE NOTICE '=== CONTEO POR ESTADO DESPUÉS DE LIMPIEZA ===';
  FOR rec IN
    SELECT status, COUNT(*) as cnt
    FROM project_assignments
    GROUP BY status
    ORDER BY cnt DESC
  LOOP
    RAISE NOTICE 'Status: %, Count: %', rec.status, rec.cnt;
  END LOOP;
END $$;
