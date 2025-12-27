-- =============================================
-- UP ENGINE 2.0 - Event-Driven Gamification System
-- =============================================

-- 1. ENUMS para tipos de eventos y acciones
CREATE TYPE public.up_event_type AS ENUM (
  'status_change',
  'deadline_met',
  'deadline_missed', 
  'content_approved',
  'content_delivered',
  'correction_requested',
  'assignment_received',
  'script_submitted',
  'script_approved',
  'video_uploaded',
  'thumbnail_uploaded',
  'client_feedback_positive',
  'client_feedback_negative',
  'streak_milestone',
  'quest_completed',
  'manual_adjustment',
  'ai_quality_bonus',
  'ai_quality_penalty'
);

CREATE TYPE public.up_season_mode AS ENUM (
  'permanent',
  'monthly', 
  'quarterly',
  'custom'
);

CREATE TYPE public.up_rule_operator AS ENUM (
  'equals',
  'not_equals',
  'greater_than',
  'less_than',
  'contains',
  'in_list'
);

-- 2. UP EVENT TYPES - Catálogo de eventos configurables por org
CREATE TABLE public.up_event_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  event_key text NOT NULL,
  label text NOT NULL,
  description text,
  icon text DEFAULT 'zap',
  color text DEFAULT '#FFD700',
  is_active boolean DEFAULT true,
  is_system boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(organization_id, event_key)
);

-- 3. UP RULES - Reglas configurables por organización
CREATE TABLE public.up_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  event_type_key text NOT NULL,
  conditions jsonb DEFAULT '[]'::jsonb,
  points integer NOT NULL DEFAULT 0,
  is_bonus boolean DEFAULT false,
  is_penalty boolean DEFAULT false,
  applies_to_roles text[] DEFAULT '{}',
  max_per_day integer,
  max_per_week integer,
  max_per_content integer DEFAULT 1,
  cooldown_minutes integer,
  is_active boolean DEFAULT true,
  priority integer DEFAULT 0,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 4. UP EVENTS - Log de todos los eventos emitidos
CREATE TABLE public.up_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  content_id uuid REFERENCES public.content(id) ON DELETE SET NULL,
  event_type_key text NOT NULL,
  event_data jsonb DEFAULT '{}'::jsonb,
  points_awarded integer DEFAULT 0,
  rule_id uuid REFERENCES public.up_rules(id) ON DELETE SET NULL,
  ai_inferred boolean DEFAULT false,
  ai_confidence numeric(3,2),
  ai_evidence jsonb,
  processed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- 5. UP SEASONS - Temporadas configurables
CREATE TABLE public.up_seasons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  mode up_season_mode NOT NULL DEFAULT 'permanent',
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz,
  reset_points boolean DEFAULT false,
  reset_streaks boolean DEFAULT false,
  reset_ranking boolean DEFAULT true,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(organization_id, name)
);

-- 6. UP SEASON SNAPSHOTS - Histórico de temporadas
CREATE TABLE public.up_season_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id uuid NOT NULL REFERENCES public.up_seasons(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  final_points integer DEFAULT 0,
  final_level text,
  final_rank integer,
  total_events integer DEFAULT 0,
  achievements_unlocked integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- 7. UP QUESTS - Misiones/Retos generados por IA o admin
CREATE TABLE public.up_quests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  goal_metric text NOT NULL,
  goal_value integer NOT NULL DEFAULT 1,
  reward_points integer NOT NULL DEFAULT 0,
  reward_badge_id uuid REFERENCES public.achievements(id),
  applies_to_roles text[] DEFAULT '{}',
  starts_at timestamptz DEFAULT now(),
  ends_at timestamptz,
  is_ai_generated boolean DEFAULT false,
  ai_reasoning text,
  is_active boolean DEFAULT true,
  created_by uuid,
  created_at timestamptz DEFAULT now()
);

-- 8. UP QUEST PROGRESS - Progreso de usuarios en misiones
CREATE TABLE public.up_quest_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quest_id uuid NOT NULL REFERENCES public.up_quests(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  current_value integer DEFAULT 0,
  completed_at timestamptz,
  reward_claimed boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(quest_id, user_id)
);

-- 9. UP QUALITY SCORES - Puntuación de calidad por contenido
CREATE TABLE public.up_quality_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id uuid NOT NULL REFERENCES public.content(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  score integer NOT NULL CHECK (score >= 0 AND score <= 100),
  breakdown jsonb DEFAULT '{}'::jsonb,
  reasons text[] DEFAULT '{}',
  suggestions text[] DEFAULT '{}',
  ai_model text,
  evaluated_at timestamptz DEFAULT now(),
  UNIQUE(content_id)
);

-- 10. UP FRAUD ALERTS - Alertas anti-fraude
CREATE TABLE public.up_fraud_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid,
  severity text NOT NULL CHECK (severity IN ('low', 'medium', 'high')),
  alert_type text NOT NULL,
  reason text NOT NULL,
  evidence jsonb DEFAULT '[]'::jsonb,
  is_resolved boolean DEFAULT false,
  resolved_by uuid,
  resolved_at timestamptz,
  resolution_notes text,
  created_at timestamptz DEFAULT now()
);

-- 11. UP PERMISSIONS - Permisos RBAC por organización
CREATE TABLE public.up_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  role text NOT NULL,
  can_view_own_up boolean DEFAULT true,
  can_view_ranking boolean DEFAULT true,
  can_view_others_up boolean DEFAULT false,
  can_create_rules boolean DEFAULT false,
  can_edit_rules boolean DEFAULT false,
  can_toggle_ai boolean DEFAULT false,
  can_approve_ai_events boolean DEFAULT false,
  can_manual_adjust boolean DEFAULT false,
  can_view_fraud_alerts boolean DEFAULT false,
  can_view_quality_scores boolean DEFAULT true,
  can_manage_quests boolean DEFAULT false,
  can_manage_seasons boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(organization_id, role)
);

-- 12. UP AI CONFIG - Configuración de IA por organización
CREATE TABLE public.up_ai_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE UNIQUE,
  quality_score_enabled boolean DEFAULT true,
  event_detection_enabled boolean DEFAULT true,
  anti_fraud_enabled boolean DEFAULT true,
  quest_generation_enabled boolean DEFAULT true,
  rule_recommendations_enabled boolean DEFAULT true,
  min_quality_for_approval integer DEFAULT 60,
  auto_approve_quality_threshold integer,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =============================================
-- INDEXES
-- =============================================
CREATE INDEX idx_up_events_org ON public.up_events(organization_id);
CREATE INDEX idx_up_events_user ON public.up_events(user_id);
CREATE INDEX idx_up_events_content ON public.up_events(content_id);
CREATE INDEX idx_up_events_created ON public.up_events(created_at DESC);
CREATE INDEX idx_up_rules_org ON public.up_rules(organization_id);
CREATE INDEX idx_up_quests_org ON public.up_quests(organization_id);
CREATE INDEX idx_up_quality_content ON public.up_quality_scores(content_id);
CREATE INDEX idx_up_fraud_org ON public.up_fraud_alerts(organization_id);

-- =============================================
-- RLS POLICIES
-- =============================================
ALTER TABLE public.up_event_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.up_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.up_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.up_seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.up_season_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.up_quests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.up_quest_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.up_quality_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.up_fraud_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.up_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.up_ai_config ENABLE ROW LEVEL SECURITY;

-- Event Types: org members can view, admins can manage
CREATE POLICY "Org members can view event types" ON public.up_event_types
  FOR SELECT USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org admins can manage event types" ON public.up_event_types
  FOR ALL USING (is_org_owner(auth.uid(), organization_id) OR has_role(auth.uid(), 'admin'::app_role));

-- Rules: org members can view, admins can manage
CREATE POLICY "Org members can view rules" ON public.up_rules
  FOR SELECT USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org admins can manage rules" ON public.up_rules
  FOR ALL USING (is_org_owner(auth.uid(), organization_id) OR has_role(auth.uid(), 'admin'::app_role));

-- Events: users can view own, admins can view all org
CREATE POLICY "Users can view own events" ON public.up_events
  FOR SELECT USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can insert events" ON public.up_events
  FOR INSERT WITH CHECK (true);

-- Seasons: org members can view, admins can manage
CREATE POLICY "Org members can view seasons" ON public.up_seasons
  FOR SELECT USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org admins can manage seasons" ON public.up_seasons
  FOR ALL USING (is_org_owner(auth.uid(), organization_id) OR has_role(auth.uid(), 'admin'::app_role));

-- Season Snapshots: users can view own
CREATE POLICY "Users can view own snapshots" ON public.up_season_snapshots
  FOR SELECT USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

-- Quests: org members can view active
CREATE POLICY "Org members can view quests" ON public.up_quests
  FOR SELECT USING (is_org_member(auth.uid(), organization_id) AND is_active = true);

CREATE POLICY "Org admins can manage quests" ON public.up_quests
  FOR ALL USING (is_org_owner(auth.uid(), organization_id) OR has_role(auth.uid(), 'admin'::app_role));

-- Quest Progress: users can view/update own
CREATE POLICY "Users can view own quest progress" ON public.up_quest_progress
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update own quest progress" ON public.up_quest_progress
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "System can manage quest progress" ON public.up_quest_progress
  FOR ALL USING (true);

-- Quality Scores: org members can view
CREATE POLICY "Org members can view quality scores" ON public.up_quality_scores
  FOR SELECT USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "System can manage quality scores" ON public.up_quality_scores
  FOR ALL USING (true);

-- Fraud Alerts: only admins
CREATE POLICY "Admins can view fraud alerts" ON public.up_fraud_alerts
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can manage fraud alerts" ON public.up_fraud_alerts
  FOR ALL USING (true);

-- Permissions: org members can view, admins can manage
CREATE POLICY "Org members can view permissions" ON public.up_permissions
  FOR SELECT USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org admins can manage permissions" ON public.up_permissions
  FOR ALL USING (is_org_owner(auth.uid(), organization_id) OR has_role(auth.uid(), 'admin'::app_role));

-- AI Config: org members can view, admins can manage
CREATE POLICY "Org members can view ai config" ON public.up_ai_config
  FOR SELECT USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org admins can manage ai config" ON public.up_ai_config
  FOR ALL USING (is_org_owner(auth.uid(), organization_id) OR has_role(auth.uid(), 'admin'::app_role));

-- =============================================
-- CORE ENGINE FUNCTIONS
-- =============================================

-- Function to emit an UP event
CREATE OR REPLACE FUNCTION public.emit_up_event(
  _org_id uuid,
  _user_id uuid,
  _event_type_key text,
  _content_id uuid DEFAULT NULL,
  _event_data jsonb DEFAULT '{}'::jsonb,
  _ai_inferred boolean DEFAULT false,
  _ai_confidence numeric DEFAULT NULL,
  _ai_evidence jsonb DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  event_id uuid;
  rule_rec RECORD;
  total_points integer := 0;
  can_apply boolean;
  events_today integer;
  events_week integer;
  events_content integer;
BEGIN
  -- Insert the event
  INSERT INTO public.up_events (
    organization_id, user_id, content_id, event_type_key, 
    event_data, ai_inferred, ai_confidence, ai_evidence
  )
  VALUES (
    _org_id, _user_id, _content_id, _event_type_key,
    _event_data, _ai_inferred, _ai_confidence, _ai_evidence
  )
  RETURNING id INTO event_id;
  
  -- Find matching rules and calculate points
  FOR rule_rec IN 
    SELECT * FROM public.up_rules
    WHERE organization_id = _org_id
      AND event_type_key = _event_type_key
      AND is_active = true
    ORDER BY priority DESC
  LOOP
    can_apply := true;
    
    -- Check daily limit
    IF rule_rec.max_per_day IS NOT NULL THEN
      SELECT COUNT(*) INTO events_today
      FROM public.up_events
      WHERE user_id = _user_id
        AND rule_id = rule_rec.id
        AND created_at > now() - interval '1 day';
      
      IF events_today >= rule_rec.max_per_day THEN
        can_apply := false;
      END IF;
    END IF;
    
    -- Check weekly limit
    IF can_apply AND rule_rec.max_per_week IS NOT NULL THEN
      SELECT COUNT(*) INTO events_week
      FROM public.up_events
      WHERE user_id = _user_id
        AND rule_id = rule_rec.id
        AND created_at > now() - interval '7 days';
      
      IF events_week >= rule_rec.max_per_week THEN
        can_apply := false;
      END IF;
    END IF;
    
    -- Check per-content limit
    IF can_apply AND rule_rec.max_per_content IS NOT NULL AND _content_id IS NOT NULL THEN
      SELECT COUNT(*) INTO events_content
      FROM public.up_events
      WHERE user_id = _user_id
        AND content_id = _content_id
        AND rule_id = rule_rec.id;
      
      IF events_content >= rule_rec.max_per_content THEN
        can_apply := false;
      END IF;
    END IF;
    
    -- Apply rule if all checks pass
    IF can_apply THEN
      total_points := total_points + rule_rec.points;
      
      -- Update event with rule info
      UPDATE public.up_events
      SET rule_id = rule_rec.id, points_awarded = rule_rec.points, processed_at = now()
      WHERE id = event_id;
      
      -- Add to point_transactions for backward compatibility
      INSERT INTO public.point_transactions (user_id, content_id, transaction_type, points, description)
      VALUES (
        _user_id, 
        _content_id, 
        CASE WHEN rule_rec.points >= 0 THEN 'base_completion' ELSE 'correction_needed' END,
        rule_rec.points,
        rule_rec.name || ' (' || _event_type_key || ')'
      );
      
      -- Update user_points
      UPDATE public.user_points
      SET 
        total_points = GREATEST(0, user_points.total_points + rule_rec.points),
        updated_at = now()
      WHERE user_points.user_id = _user_id;
      
      EXIT; -- Apply only first matching rule (highest priority)
    END IF;
  END LOOP;
  
  RETURN event_id;
END;
$$;

-- Trigger to emit events on content status changes
CREATE OR REPLACE FUNCTION public.emit_up_event_on_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  event_key text;
  target_user_id uuid;
BEGIN
  -- Only process if status changed
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    -- Determine event type and target user based on status
    CASE NEW.status
      WHEN 'recorded' THEN
        event_key := 'status_change';
        target_user_id := NEW.creator_id;
      WHEN 'delivered' THEN
        event_key := 'content_delivered';
        target_user_id := NEW.editor_id;
      WHEN 'approved' THEN
        event_key := 'content_approved';
        target_user_id := COALESCE(NEW.editor_id, NEW.creator_id);
      WHEN 'issue' THEN
        event_key := 'correction_requested';
        target_user_id := NEW.editor_id;
      ELSE
        event_key := 'status_change';
        target_user_id := COALESCE(NEW.editor_id, NEW.creator_id);
    END CASE;
    
    -- Emit event if we have a target user and organization
    IF target_user_id IS NOT NULL AND NEW.organization_id IS NOT NULL THEN
      PERFORM public.emit_up_event(
        NEW.organization_id,
        target_user_id,
        event_key,
        NEW.id,
        jsonb_build_object(
          'old_status', OLD.status,
          'new_status', NEW.status,
          'title', NEW.title
        )
      );
      
      -- Check deadline
      IF NEW.deadline IS NOT NULL THEN
        IF now() <= NEW.deadline THEN
          PERFORM public.emit_up_event(
            NEW.organization_id,
            target_user_id,
            'deadline_met',
            NEW.id,
            jsonb_build_object('deadline', NEW.deadline)
          );
        ELSE
          PERFORM public.emit_up_event(
            NEW.organization_id,
            target_user_id,
            'deadline_missed',
            NEW.id,
            jsonb_build_object('deadline', NEW.deadline, 'late_by', now() - NEW.deadline)
          );
        END IF;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for content status changes
DROP TRIGGER IF EXISTS trigger_up_event_on_status ON public.content;
CREATE TRIGGER trigger_up_event_on_status
  AFTER UPDATE ON public.content
  FOR EACH ROW
  EXECUTE FUNCTION public.emit_up_event_on_status_change();

-- Function to create default UP config for an organization
CREATE OR REPLACE FUNCTION public.create_default_up_config(_org_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create default event types
  INSERT INTO public.up_event_types (organization_id, event_key, label, is_system) VALUES
    (_org_id, 'status_change', 'Cambio de Estado', true),
    (_org_id, 'deadline_met', 'Deadline Cumplido', true),
    (_org_id, 'deadline_missed', 'Deadline Incumplido', true),
    (_org_id, 'content_approved', 'Contenido Aprobado', true),
    (_org_id, 'content_delivered', 'Contenido Entregado', true),
    (_org_id, 'correction_requested', 'Corrección Solicitada', true),
    (_org_id, 'script_approved', 'Guión Aprobado', true),
    (_org_id, 'quest_completed', 'Misión Completada', true)
  ON CONFLICT (organization_id, event_key) DO NOTHING;
  
  -- Create default rules
  INSERT INTO public.up_rules (organization_id, name, event_type_key, points, applies_to_roles) VALUES
    (_org_id, 'Entrega completada', 'content_delivered', 10, '{creator,editor}'),
    (_org_id, 'Entrega a tiempo', 'deadline_met', 5, '{creator,editor}'),
    (_org_id, 'Entrega tardía', 'deadline_missed', -5, '{creator,editor}'),
    (_org_id, 'Contenido aprobado', 'content_approved', 3, '{creator,editor}'),
    (_org_id, 'Corrección necesaria', 'correction_requested', -3, '{editor}'),
    (_org_id, 'Guión aprobado', 'script_approved', 5, '{strategist}')
  ON CONFLICT DO NOTHING;
  
  -- Create default season
  INSERT INTO public.up_seasons (organization_id, name, mode, is_active)
  VALUES (_org_id, 'Temporada Permanente', 'permanent', true)
  ON CONFLICT DO NOTHING;
  
  -- Create default permissions
  INSERT INTO public.up_permissions (organization_id, role, can_view_own_up, can_view_ranking, can_view_others_up, can_create_rules, can_edit_rules, can_toggle_ai, can_approve_ai_events, can_manual_adjust, can_view_fraud_alerts, can_view_quality_scores, can_manage_quests, can_manage_seasons) VALUES
    (_org_id, 'admin', true, true, true, true, true, true, true, true, true, true, true, true),
    (_org_id, 'strategist', true, true, true, false, false, false, true, false, false, true, false, false),
    (_org_id, 'creator', true, true, false, false, false, false, false, false, false, true, false, false),
    (_org_id, 'editor', true, true, false, false, false, false, false, false, false, true, false, false),
    (_org_id, 'client', true, false, false, false, false, false, false, false, false, true, false, false)
  ON CONFLICT (organization_id, role) DO NOTHING;
  
  -- Create AI config
  INSERT INTO public.up_ai_config (organization_id)
  VALUES (_org_id)
  ON CONFLICT DO NOTHING;
END;
$$;

-- Enable realtime for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.up_events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.up_quests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.up_quest_progress;