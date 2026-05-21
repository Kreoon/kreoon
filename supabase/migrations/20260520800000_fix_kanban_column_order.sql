-- Corrige el sort_order de los estados del Kanban para todas las organizaciones
-- Flujo UGC canónico: Creado → Pendiente Guión → Guión Aprobado → Asignado →
-- En Grabación → Grabado → En Edición → Entregado → Aprobado →
-- Novedad → Corregido → Pagado → Archivado

UPDATE organization_statuses
SET sort_order = CASE status_key
  WHEN 'draft'           THEN 0
  WHEN 'script_pending'  THEN 1
  WHEN 'script_approved' THEN 2
  WHEN 'assigned'        THEN 3
  WHEN 'recording'       THEN 4
  WHEN 'recorded'        THEN 5
  WHEN 'editing'         THEN 6
  WHEN 'delivered'       THEN 7
  WHEN 'review'          THEN 8
  WHEN 'approved'        THEN 9
  WHEN 'issue'           THEN 10
  WHEN 'corrected'       THEN 11
  WHEN 'rejected'        THEN 12
  WHEN 'paid'            THEN 13
  WHEN 'archived'        THEN 14
  ELSE sort_order + 100
END;

-- Actualizar también la función que crea los estados por defecto para nuevas organizaciones
CREATE OR REPLACE FUNCTION create_default_board_config()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO board_settings (organization_id, card_size, default_view, visible_fields, visible_sections)
  VALUES (
    NEW.id,
    'normal',
    'kanban',
    '["title", "thumbnail", "status", "responsible", "client", "deadline"]'::jsonb,
    '["brief", "script", "thumbnail", "comments", "history"]'::jsonb
  )
  ON CONFLICT (organization_id) DO NOTHING;

  INSERT INTO organization_statuses (organization_id, status_key, label, color, sort_order, is_active)
  VALUES
    (NEW.id, 'draft',           'Creado',          '#6b7280', 0,  true),
    (NEW.id, 'script_pending',  'Pendiente Guión', '#f59e0b', 1,  true),
    (NEW.id, 'script_approved', 'Guión Aprobado',  '#3b82f6', 2,  true),
    (NEW.id, 'assigned',        'Asignado',        '#8b5cf6', 3,  true),
    (NEW.id, 'recording',       'En Grabación',    '#f97316', 4,  true),
    (NEW.id, 'recorded',        'Grabado',         '#06b6d4', 5,  true),
    (NEW.id, 'editing',         'En Edición',      '#ec4899', 6,  true),
    (NEW.id, 'delivered',       'Entregado',       '#22c55e', 7,  true),
    (NEW.id, 'approved',        'Aprobado',        '#22c55e', 9,  true),
    (NEW.id, 'issue',           'Novedad',         '#ef4444', 10, true),
    (NEW.id, 'corrected',       'Corregido',       '#eab308', 11, true),
    (NEW.id, 'paid',            'Pagado',          '#10b981', 13, true),
    (NEW.id, 'archived',        'Archivado',       '#64748b', 14, true)
  ON CONFLICT DO NOTHING;

  INSERT INTO board_permissions (organization_id, role, can_create_cards, can_move_cards, can_edit_fields, can_delete_cards, can_approve, can_configure_board)
  VALUES
    (NEW.id, 'admin',              true,  true,  true,  true,  true,  true),
    (NEW.id, 'content_creator',    false, true,  true,  false, false, false),
    (NEW.id, 'editor',             false, true,  true,  false, false, false),
    (NEW.id, 'digital_strategist', true,  true,  true,  false, true,  false),
    (NEW.id, 'client',             false, false, false, false, true,  false)
  ON CONFLICT (organization_id, role) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
