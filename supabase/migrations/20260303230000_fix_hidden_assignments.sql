-- Problema: hay asignaciones en estado 'cancelled' que bloquean nuevas asignaciones
-- por el constraint de unicidad, pero no se muestran en la UI.

-- Solución 1: Eliminar físicamente las asignaciones canceladas (ya no son útiles)
DELETE FROM project_assignments WHERE status = 'cancelled';

-- Solución 2: Actualizar el índice único para excluir las canceladas
-- Primero eliminar el índice existente
DROP INDEX IF EXISTS idx_assignment_unique_user_role_content;
DROP INDEX IF EXISTS idx_assignment_unique_user_role_marketplace;

-- Recrear con exclusión de canceladas
CREATE UNIQUE INDEX idx_assignment_unique_user_role_content
  ON project_assignments(user_id, role_id, content_id)
  WHERE content_id IS NOT NULL AND status != 'cancelled';

CREATE UNIQUE INDEX idx_assignment_unique_user_role_marketplace
  ON project_assignments(user_id, role_id, marketplace_project_id)
  WHERE marketplace_project_id IS NOT NULL AND status != 'cancelled';

-- Verificar y mostrar asignaciones que estaban ocultas
-- (Esto es solo informativo, se ejecutará pero no afecta datos)
DO $$
DECLARE
  hidden_count INT;
BEGIN
  SELECT COUNT(*) INTO hidden_count FROM project_assignments WHERE status NOT IN ('accepted', 'in_progress', 'delivered', 'approved', 'paid');
  RAISE NOTICE 'Asignaciones en estados no activos: %', hidden_count;
END $$;
