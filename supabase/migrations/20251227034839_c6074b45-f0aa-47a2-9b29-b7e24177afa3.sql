-- Function to create default board settings for new organizations
CREATE OR REPLACE FUNCTION public.create_default_board_config()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create board settings
  INSERT INTO board_settings (organization_id, card_size, default_view, visible_fields, visible_sections)
  VALUES (
    NEW.id,
    'normal',
    'kanban',
    '["title", "thumbnail", "status", "responsible", "client", "deadline"]'::jsonb,
    '["brief", "script", "thumbnail", "comments", "history"]'::jsonb
  )
  ON CONFLICT (organization_id) DO NOTHING;

  -- Create default statuses
  INSERT INTO organization_statuses (organization_id, status_key, label, color, sort_order, is_active)
  VALUES 
    (NEW.id, 'draft', 'Creado', '#6b7280', 0, true),
    (NEW.id, 'script_approved', 'Guión Aprobado', '#3b82f6', 1, true),
    (NEW.id, 'assigned', 'Asignado', '#8b5cf6', 2, true),
    (NEW.id, 'recording', 'En Grabación', '#f97316', 3, true),
    (NEW.id, 'recorded', 'Grabado', '#06b6d4', 4, true),
    (NEW.id, 'editing', 'En Edición', '#ec4899', 5, true),
    (NEW.id, 'delivered', 'Entregado', '#22c55e', 6, true),
    (NEW.id, 'issue', 'Novedad', '#ef4444', 7, true),
    (NEW.id, 'corrected', 'Corregido', '#eab308', 8, true),
    (NEW.id, 'approved', 'Aprobado', '#22c55e', 9, true)
  ON CONFLICT DO NOTHING;

  -- Create default permissions for all roles
  INSERT INTO board_permissions (organization_id, role, can_create_cards, can_move_cards, can_edit_fields, can_delete_cards, can_approve, can_configure_board)
  VALUES 
    (NEW.id, 'admin', true, true, true, true, true, true),
    (NEW.id, 'creator', false, true, true, false, false, false),
    (NEW.id, 'editor', false, true, true, false, false, false),
    (NEW.id, 'strategist', true, true, true, false, true, false),
    (NEW.id, 'client', false, false, false, false, true, false)
  ON CONFLICT (organization_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Create trigger on organizations table
DROP TRIGGER IF EXISTS trigger_create_default_board_config ON organizations;
CREATE TRIGGER trigger_create_default_board_config
  AFTER INSERT ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION create_default_board_config();

-- Also ensure existing organizations without config get it
DO $$
DECLARE
  org_record RECORD;
BEGIN
  FOR org_record IN SELECT id FROM organizations LOOP
    -- Create board settings if missing
    INSERT INTO board_settings (organization_id, card_size, default_view, visible_fields, visible_sections)
    VALUES (
      org_record.id,
      'normal',
      'kanban',
      '["title", "thumbnail", "status", "responsible", "client", "deadline"]'::jsonb,
      '["brief", "script", "thumbnail", "comments", "history"]'::jsonb
    )
    ON CONFLICT (organization_id) DO NOTHING;

    -- Create statuses if missing
    INSERT INTO organization_statuses (organization_id, status_key, label, color, sort_order, is_active)
    VALUES 
      (org_record.id, 'draft', 'Creado', '#6b7280', 0, true),
      (org_record.id, 'script_approved', 'Guión Aprobado', '#3b82f6', 1, true),
      (org_record.id, 'assigned', 'Asignado', '#8b5cf6', 2, true),
      (org_record.id, 'recording', 'En Grabación', '#f97316', 3, true),
      (org_record.id, 'recorded', 'Grabado', '#06b6d4', 4, true),
      (org_record.id, 'editing', 'En Edición', '#ec4899', 5, true),
      (org_record.id, 'delivered', 'Entregado', '#22c55e', 6, true),
      (org_record.id, 'issue', 'Novedad', '#ef4444', 7, true),
      (org_record.id, 'corrected', 'Corregido', '#eab308', 8, true),
      (org_record.id, 'approved', 'Aprobado', '#22c55e', 9, true)
    ON CONFLICT DO NOTHING;

    -- Create permissions if missing
    INSERT INTO board_permissions (organization_id, role, can_create_cards, can_move_cards, can_edit_fields, can_delete_cards, can_approve, can_configure_board)
    VALUES 
      (org_record.id, 'admin', true, true, true, true, true, true),
      (org_record.id, 'creator', false, true, true, false, false, false),
      (org_record.id, 'editor', false, true, true, false, false, false),
      (org_record.id, 'strategist', true, true, true, false, true, false),
      (org_record.id, 'client', false, false, false, false, true, false)
    ON CONFLICT (organization_id, role) DO NOTHING;
  END LOOP;
END;
$$;