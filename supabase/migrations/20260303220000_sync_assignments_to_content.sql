-- Corregir asignaciones en estado 'invited' y 'pending' a 'accepted'
-- Las asignaciones internas de equipo van directamente a 'accepted'

UPDATE project_assignments
SET
  status = 'accepted',
  accepted_at = COALESCE(accepted_at, invited_at, created_at)
WHERE
  status IN ('pending', 'invited');

-- Sincronizar asignaciones de project_assignments con campos escalares de content
-- Esto permite que las tarjetas del tablero muestren los creadores/editores asignados

-- Sincronizar creator_id
UPDATE content c
SET creator_id = pa.user_id
FROM project_assignments pa
WHERE pa.content_id = c.id
  AND pa.role_id = 'creator'
  AND pa.status NOT IN ('cancelled')
  AND c.creator_id IS NULL;

-- Sincronizar editor_id
UPDATE content c
SET editor_id = pa.user_id
FROM project_assignments pa
WHERE pa.content_id = c.id
  AND pa.role_id = 'editor'
  AND pa.status NOT IN ('cancelled')
  AND c.editor_id IS NULL;

-- Sincronizar strategist_id
UPDATE content c
SET strategist_id = pa.user_id
FROM project_assignments pa
WHERE pa.content_id = c.id
  AND pa.role_id = 'strategist'
  AND pa.status NOT IN ('cancelled')
  AND c.strategist_id IS NULL;

-- Sincronizar pagos de creator
UPDATE content c
SET creator_payment = pa.payment_amount
FROM project_assignments pa
WHERE pa.content_id = c.id
  AND pa.role_id = 'creator'
  AND pa.status NOT IN ('cancelled')
  AND pa.payment_amount IS NOT NULL
  AND (c.creator_payment IS NULL OR c.creator_payment = 0);

-- Sincronizar pagos de editor
UPDATE content c
SET editor_payment = pa.payment_amount
FROM project_assignments pa
WHERE pa.content_id = c.id
  AND pa.role_id = 'editor'
  AND pa.status NOT IN ('cancelled')
  AND pa.payment_amount IS NOT NULL
  AND (c.editor_payment IS NULL OR c.editor_payment = 0);
