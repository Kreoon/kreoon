-- Corregir asignaciones que quedaron en estado 'pending' cuando deberían estar en 'accepted'
-- Las asignaciones internas de equipo van directamente a 'accepted' (no requieren aceptación)

UPDATE project_assignments
SET
  status = 'accepted',
  accepted_at = COALESCE(accepted_at, created_at)
WHERE
  status = 'pending'
  AND invited_at IS NULL;  -- Solo las que nunca fueron invitaciones formales

-- Agregar comentario explicativo
COMMENT ON COLUMN project_assignments.status IS
  'Estado de la asignación. Las asignaciones internas de equipo inician en accepted.';
