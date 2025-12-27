-- Add columns for forward/backward movement permissions per status
ALTER TABLE public.board_status_rules
ADD COLUMN IF NOT EXISTS can_advance_roles text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS can_retreat_roles text[] DEFAULT '{}';

-- Create a table to log all status movements
CREATE TABLE IF NOT EXISTS public.content_status_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id uuid NOT NULL REFERENCES public.content(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  from_status text,
  to_status text NOT NULL,
  from_custom_status_id uuid REFERENCES public.organization_statuses(id),
  to_custom_status_id uuid REFERENCES public.organization_statuses(id),
  user_role text,
  organization_id uuid REFERENCES public.organizations(id),
  moved_at timestamptz NOT NULL DEFAULT now(),
  notes text
);

-- Enable RLS on status logs
ALTER TABLE public.content_status_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for status logs
CREATE POLICY "Users can view status logs for their org content"
ON public.content_status_logs FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.user_id = auth.uid() 
    AND om.organization_id = content_status_logs.organization_id
  )
);

CREATE POLICY "Users can insert status logs"
ON public.content_status_logs FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Function to check if user can move content between statuses
CREATE OR REPLACE FUNCTION public.can_move_content_status(
  _user_id uuid,
  _content_id uuid,
  _target_status_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  content_org_id uuid;
  current_status_id uuid;
  current_sort_order int;
  target_sort_order int;
  user_role text;
  is_forward boolean;
  allowed_roles text[];
BEGIN
  -- Get content info
  SELECT organization_id, custom_status_id INTO content_org_id, current_status_id
  FROM public.content WHERE id = _content_id;
  
  IF content_org_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Admin can always move
  IF public.has_role(_user_id, 'admin'::app_role) THEN
    RETURN true;
  END IF;
  
  -- Get user role in organization
  SELECT omr.role INTO user_role
  FROM public.organization_member_roles omr
  WHERE omr.user_id = _user_id AND omr.organization_id = content_org_id
  LIMIT 1;
  
  -- If no role found, try organization_members
  IF user_role IS NULL THEN
    SELECT om.role::text INTO user_role
    FROM public.organization_members om
    WHERE om.user_id = _user_id AND om.organization_id = content_org_id
    LIMIT 1;
  END IF;
  
  IF user_role IS NULL THEN
    RETURN false;
  END IF;
  
  -- Get sort orders
  SELECT sort_order INTO current_sort_order
  FROM public.organization_statuses WHERE id = current_status_id;
  
  SELECT sort_order INTO target_sort_order
  FROM public.organization_statuses WHERE id = _target_status_id;
  
  -- Determine direction
  is_forward := COALESCE(target_sort_order, 0) > COALESCE(current_sort_order, 0);
  
  -- Get the rule for current status (moving FROM this status)
  IF current_status_id IS NOT NULL THEN
    IF is_forward THEN
      SELECT can_advance_roles INTO allowed_roles
      FROM public.board_status_rules
      WHERE status_id = current_status_id;
    ELSE
      SELECT can_retreat_roles INTO allowed_roles
      FROM public.board_status_rules
      WHERE status_id = current_status_id;
    END IF;
    
    -- If rules exist and role is not in allowed list, deny
    IF allowed_roles IS NOT NULL AND array_length(allowed_roles, 1) > 0 THEN
      IF NOT (user_role = ANY(allowed_roles)) THEN
        RETURN false;
      END IF;
    END IF;
  END IF;
  
  RETURN true;
END;
$$;

-- Function to log status movement
CREATE OR REPLACE FUNCTION public.log_status_movement()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role_val text;
BEGIN
  -- Only log if custom_status_id changed
  IF OLD.custom_status_id IS DISTINCT FROM NEW.custom_status_id THEN
    -- Get user role
    SELECT om.role::text INTO user_role_val
    FROM public.organization_members om
    WHERE om.user_id = auth.uid() AND om.organization_id = NEW.organization_id
    LIMIT 1;
    
    INSERT INTO public.content_status_logs (
      content_id,
      user_id,
      from_status,
      to_status,
      from_custom_status_id,
      to_custom_status_id,
      user_role,
      organization_id
    )
    VALUES (
      NEW.id,
      COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid),
      OLD.status,
      NEW.status,
      OLD.custom_status_id,
      NEW.custom_status_id,
      user_role_val,
      NEW.organization_id
    );
  -- Also log legacy status changes
  ELSIF OLD.status IS DISTINCT FROM NEW.status THEN
    SELECT om.role::text INTO user_role_val
    FROM public.organization_members om
    WHERE om.user_id = auth.uid() AND om.organization_id = NEW.organization_id
    LIMIT 1;
    
    INSERT INTO public.content_status_logs (
      content_id,
      user_id,
      from_status,
      to_status,
      user_role,
      organization_id
    )
    VALUES (
      NEW.id,
      COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid),
      OLD.status,
      NEW.status,
      user_role_val,
      NEW.organization_id
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for logging
DROP TRIGGER IF EXISTS trigger_log_status_movement ON public.content;
CREATE TRIGGER trigger_log_status_movement
  AFTER UPDATE ON public.content
  FOR EACH ROW
  EXECUTE FUNCTION public.log_status_movement();

-- Initialize default rules for existing statuses
INSERT INTO public.board_status_rules (organization_id, status_id, can_advance_roles, can_retreat_roles, allowed_roles)
SELECT 
  os.organization_id,
  os.id,
  ARRAY['admin', 'strategist', 'creator', 'editor']::text[],
  ARRAY['admin', 'strategist']::text[],
  ARRAY['admin', 'strategist', 'creator', 'editor', 'client']::text[]
FROM public.organization_statuses os
WHERE NOT EXISTS (
  SELECT 1 FROM public.board_status_rules bsr 
  WHERE bsr.status_id = os.id
)
ON CONFLICT DO NOTHING;

-- Update default board config function to include status rules
CREATE OR REPLACE FUNCTION public.create_default_board_config()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  status_record RECORD;
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

  -- Create default status rules for each status
  FOR status_record IN 
    SELECT id FROM organization_statuses WHERE organization_id = NEW.id
  LOOP
    INSERT INTO board_status_rules (
      organization_id, 
      status_id, 
      can_advance_roles, 
      can_retreat_roles,
      allowed_roles
    )
    VALUES (
      NEW.id,
      status_record.id,
      ARRAY['admin', 'strategist', 'creator', 'editor']::text[],
      ARRAY['admin', 'strategist']::text[],
      ARRAY['admin', 'strategist', 'creator', 'editor', 'client']::text[]
    )
    ON CONFLICT DO NOTHING;
  END LOOP;

  RETURN NEW;
END;
$$;