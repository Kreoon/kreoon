-- =====================================================
-- ADVANCED KANBAN BOARD SYSTEM
-- =====================================================

-- 1. BOARD SETTINGS PER ORGANIZATION
CREATE TABLE IF NOT EXISTS public.board_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  card_size text NOT NULL DEFAULT 'normal' CHECK (card_size IN ('compact', 'normal', 'large')),
  visible_fields jsonb NOT NULL DEFAULT '["title", "thumbnail", "status", "responsible", "client", "deadline"]'::jsonb,
  visible_sections jsonb NOT NULL DEFAULT '["brief", "script", "thumbnail", "comments", "history"]'::jsonb,
  default_view text NOT NULL DEFAULT 'kanban' CHECK (default_view IN ('kanban', 'list', 'calendar', 'table')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id)
);

-- 2. STATUS RULES (entry/exit conditions, required fields, allowed roles)
CREATE TABLE IF NOT EXISTS public.board_status_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  status_id uuid NOT NULL REFERENCES public.organization_statuses(id) ON DELETE CASCADE,
  required_fields jsonb DEFAULT '[]'::jsonb,
  allowed_from_statuses uuid[] DEFAULT '{}',
  allowed_roles text[] DEFAULT '{"admin"}'::text[],
  allowed_to_statuses uuid[] DEFAULT '{}',
  auto_actions jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id, status_id)
);

-- 3. CUSTOM FIELDS (Notion-style)
CREATE TABLE IF NOT EXISTS public.board_custom_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  field_type text NOT NULL CHECK (field_type IN ('text', 'number', 'date', 'select', 'multiselect', 'checkbox', 'currency', 'url')),
  options jsonb DEFAULT NULL,
  is_required boolean NOT NULL DEFAULT false,
  show_in_card boolean NOT NULL DEFAULT false,
  show_in_detail boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 4. CUSTOM FIELD VALUES (per content)
CREATE TABLE IF NOT EXISTS public.content_custom_field_values (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id uuid NOT NULL REFERENCES public.content(id) ON DELETE CASCADE,
  field_id uuid NOT NULL REFERENCES public.board_custom_fields(id) ON DELETE CASCADE,
  value jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(content_id, field_id)
);

-- 5. BOARD PERMISSIONS (role-based)
CREATE TABLE IF NOT EXISTS public.board_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  role text NOT NULL,
  can_create_cards boolean NOT NULL DEFAULT false,
  can_move_cards boolean NOT NULL DEFAULT true,
  can_edit_fields boolean NOT NULL DEFAULT false,
  can_delete_cards boolean NOT NULL DEFAULT false,
  can_approve boolean NOT NULL DEFAULT false,
  can_configure_board boolean NOT NULL DEFAULT false,
  allowed_statuses uuid[] DEFAULT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id, role)
);

-- 6. ADD custom_status_id to content for gradual migration
ALTER TABLE public.content
ADD COLUMN IF NOT EXISTS custom_status_id uuid REFERENCES public.organization_statuses(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_content_custom_status_id ON public.content(custom_status_id);

-- =====================================================
-- ENABLE ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE public.board_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.board_status_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.board_custom_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_custom_field_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.board_permissions ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- BOARD SETTINGS
CREATE POLICY "Org members can view board settings"
ON public.board_settings FOR SELECT
USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org owners and admins can manage board settings"
ON public.board_settings FOR ALL
USING (is_org_owner(auth.uid(), organization_id) OR has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (is_org_owner(auth.uid(), organization_id) OR has_role(auth.uid(), 'admin'::app_role));

-- BOARD STATUS RULES
CREATE POLICY "Org members can view status rules"
ON public.board_status_rules FOR SELECT
USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org owners and admins can manage status rules"
ON public.board_status_rules FOR ALL
USING (is_org_owner(auth.uid(), organization_id) OR has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (is_org_owner(auth.uid(), organization_id) OR has_role(auth.uid(), 'admin'::app_role));

-- BOARD CUSTOM FIELDS
CREATE POLICY "Org members can view custom fields"
ON public.board_custom_fields FOR SELECT
USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org owners and admins can manage custom fields"
ON public.board_custom_fields FOR ALL
USING (is_org_owner(auth.uid(), organization_id) OR has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (is_org_owner(auth.uid(), organization_id) OR has_role(auth.uid(), 'admin'::app_role));

-- CONTENT CUSTOM FIELD VALUES
CREATE POLICY "Users can view field values on accessible content"
ON public.content_custom_field_values FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.content c
    WHERE c.id = content_custom_field_values.content_id
    AND (
      c.is_published = true
      OR c.creator_id = auth.uid()
      OR c.editor_id = auth.uid()
      OR c.strategist_id = auth.uid()
      OR has_role(auth.uid(), 'admin'::app_role)
      OR EXISTS (SELECT 1 FROM public.client_users cu WHERE cu.client_id = c.client_id AND cu.user_id = auth.uid())
    )
  )
);

CREATE POLICY "Users with edit access can manage field values"
ON public.content_custom_field_values FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.content c
    WHERE c.id = content_custom_field_values.content_id
    AND (
      c.creator_id = auth.uid()
      OR c.editor_id = auth.uid()
      OR c.strategist_id = auth.uid()
      OR has_role(auth.uid(), 'admin'::app_role)
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.content c
    WHERE c.id = content_custom_field_values.content_id
    AND (
      c.creator_id = auth.uid()
      OR c.editor_id = auth.uid()
      OR c.strategist_id = auth.uid()
      OR has_role(auth.uid(), 'admin'::app_role)
    )
  )
);

-- BOARD PERMISSIONS
CREATE POLICY "Org members can view permissions"
ON public.board_permissions FOR SELECT
USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org owners and admins can manage permissions"
ON public.board_permissions FOR ALL
USING (is_org_owner(auth.uid(), organization_id) OR has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (is_org_owner(auth.uid(), organization_id) OR has_role(auth.uid(), 'admin'::app_role));

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

CREATE OR REPLACE FUNCTION public.can_move_to_status(
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
  user_role text;
  has_permission boolean := false;
  rule_exists boolean := false;
  is_allowed_from boolean := true;
BEGIN
  SELECT organization_id, custom_status_id INTO content_org_id, current_status_id
  FROM public.content WHERE id = _content_id;
  
  IF content_org_id IS NULL THEN
    RETURN false;
  END IF;
  
  IF has_role(_user_id, 'admin'::app_role) THEN
    RETURN true;
  END IF;
  
  SELECT omr.role INTO user_role
  FROM public.organization_member_roles omr
  WHERE omr.user_id = _user_id AND omr.organization_id = content_org_id
  LIMIT 1;
  
  IF user_role IS NULL THEN
    RETURN false;
  END IF;
  
  SELECT can_move_cards INTO has_permission
  FROM public.board_permissions
  WHERE organization_id = content_org_id AND role = user_role;
  
  IF NOT COALESCE(has_permission, true) THEN
    RETURN false;
  END IF;
  
  SELECT EXISTS(
    SELECT 1 FROM public.board_status_rules
    WHERE organization_id = content_org_id AND status_id = _target_status_id
  ) INTO rule_exists;
  
  IF rule_exists THEN
    SELECT user_role = ANY(allowed_roles) INTO has_permission
    FROM public.board_status_rules
    WHERE organization_id = content_org_id AND status_id = _target_status_id;
    
    IF NOT COALESCE(has_permission, true) THEN
      RETURN false;
    END IF;
    
    IF current_status_id IS NOT NULL THEN
      SELECT current_status_id = ANY(allowed_from_statuses) OR array_length(allowed_from_statuses, 1) IS NULL
      INTO is_allowed_from
      FROM public.board_status_rules
      WHERE organization_id = content_org_id AND status_id = _target_status_id;
    END IF;
  END IF;
  
  RETURN COALESCE(is_allowed_from, true);
END;
$$;

CREATE OR REPLACE FUNCTION public.check_status_requirements(
  _content_id uuid,
  _target_status_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  content_org_id uuid;
  required_fields jsonb;
  content_row record;
  missing_fields text[] := '{}';
  field_name text;
BEGIN
  SELECT c.*, c.organization_id INTO content_row
  FROM public.content c WHERE c.id = _content_id;
  
  IF content_row.organization_id IS NULL THEN
    RETURN jsonb_build_object('valid', true, 'missing', '[]'::jsonb);
  END IF;
  
  SELECT bsr.required_fields INTO required_fields
  FROM public.board_status_rules bsr
  WHERE bsr.organization_id = content_row.organization_id AND bsr.status_id = _target_status_id;
  
  IF required_fields IS NULL OR jsonb_array_length(required_fields) = 0 THEN
    RETURN jsonb_build_object('valid', true, 'missing', '[]'::jsonb);
  END IF;
  
  FOR field_name IN SELECT jsonb_array_elements_text(required_fields) LOOP
    CASE field_name
      WHEN 'script' THEN
        IF content_row.script IS NULL OR content_row.script = '' THEN
          missing_fields := array_append(missing_fields, 'Guión');
        END IF;
      WHEN 'creator_id' THEN
        IF content_row.creator_id IS NULL THEN
          missing_fields := array_append(missing_fields, 'Creador asignado');
        END IF;
      WHEN 'editor_id' THEN
        IF content_row.editor_id IS NULL THEN
          missing_fields := array_append(missing_fields, 'Editor asignado');
        END IF;
      WHEN 'video_url' THEN
        IF content_row.video_url IS NULL AND (content_row.video_urls IS NULL OR array_length(content_row.video_urls, 1) = 0) THEN
          missing_fields := array_append(missing_fields, 'Video');
        END IF;
      WHEN 'raw_video_urls' THEN
        IF content_row.raw_video_urls IS NULL OR array_length(content_row.raw_video_urls, 1) = 0 THEN
          missing_fields := array_append(missing_fields, 'Video crudo');
        END IF;
      WHEN 'script_approved' THEN
        IF content_row.script_approved_at IS NULL THEN
          missing_fields := array_append(missing_fields, 'Guión aprobado');
        END IF;
      WHEN 'deadline' THEN
        IF content_row.deadline IS NULL THEN
          missing_fields := array_append(missing_fields, 'Fecha límite');
        END IF;
      WHEN 'client_id' THEN
        IF content_row.client_id IS NULL THEN
          missing_fields := array_append(missing_fields, 'Cliente');
        END IF;
      ELSE
        NULL;
    END CASE;
  END LOOP;
  
  RETURN jsonb_build_object(
    'valid', array_length(missing_fields, 1) IS NULL,
    'missing', to_jsonb(missing_fields)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.initialize_board_settings(_org_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.board_settings (organization_id)
  VALUES (_org_id)
  ON CONFLICT (organization_id) DO NOTHING;
  
  INSERT INTO public.board_permissions (organization_id, role, can_create_cards, can_move_cards, can_edit_fields, can_delete_cards, can_approve, can_configure_board)
  VALUES 
    (_org_id, 'admin', true, true, true, true, true, true),
    (_org_id, 'creator', false, true, true, false, false, false),
    (_org_id, 'editor', false, true, true, false, false, false),
    (_org_id, 'strategist', true, true, true, false, true, false),
    (_org_id, 'client', false, false, false, false, true, false)
  ON CONFLICT (organization_id, role) DO NOTHING;
END;
$$;

CREATE OR REPLACE FUNCTION public.auto_create_board_settings()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.initialize_board_settings(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_auto_create_board_settings ON public.organizations;
CREATE TRIGGER trigger_auto_create_board_settings
  AFTER INSERT ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_board_settings();

-- Initialize settings for existing organizations
DO $$
DECLARE
  org_record record;
BEGIN
  FOR org_record IN SELECT id FROM public.organizations LOOP
    PERFORM public.initialize_board_settings(org_record.id);
  END LOOP;
END $$;

-- Enable realtime for board_settings
ALTER PUBLICATION supabase_realtime ADD TABLE public.board_settings;