-- =============================================
-- KREOON TRACKING ENGINE (KTE) - Database Schema
-- =============================================

-- Create the update_updated_at_column function if it doesn't exist
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Main tracking events table (partitioned by month for performance)
CREATE TABLE public.tracking_events (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  event_name TEXT NOT NULL,
  event_category TEXT NOT NULL DEFAULT 'general',
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID,
  viewer_id TEXT,
  entity_type TEXT,
  entity_id UUID,
  metadata JSONB DEFAULT '{}'::jsonb,
  context JSONB DEFAULT '{}'::jsonb,
  is_sensitive BOOLEAN DEFAULT false,
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- Create partitions for current and future months
CREATE TABLE tracking_events_2024_12 PARTITION OF tracking_events
  FOR VALUES FROM ('2024-12-01') TO ('2025-01-01');
CREATE TABLE tracking_events_2025_01 PARTITION OF tracking_events
  FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
CREATE TABLE tracking_events_2025_02 PARTITION OF tracking_events
  FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');
CREATE TABLE tracking_events_2025_03 PARTITION OF tracking_events
  FOR VALUES FROM ('2025-03-01') TO ('2025-04-01');
CREATE TABLE tracking_events_2025_04 PARTITION OF tracking_events
  FOR VALUES FROM ('2025-04-01') TO ('2025-05-01');
CREATE TABLE tracking_events_2025_05 PARTITION OF tracking_events
  FOR VALUES FROM ('2025-05-01') TO ('2025-06-01');
CREATE TABLE tracking_events_2025_06 PARTITION OF tracking_events
  FOR VALUES FROM ('2025-06-01') TO ('2025-07-01');

-- Indexes for common queries
CREATE INDEX idx_tracking_events_org_created ON tracking_events (organization_id, created_at DESC);
CREATE INDEX idx_tracking_events_event_name ON tracking_events (event_name, created_at DESC);
CREATE INDEX idx_tracking_events_entity ON tracking_events (entity_type, entity_id, created_at DESC);
CREATE INDEX idx_tracking_events_user ON tracking_events (user_id, created_at DESC);

-- Organization tracking configuration
CREATE TABLE public.organization_tracking_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE UNIQUE,
  tracking_enabled BOOLEAN DEFAULT true,
  external_tracking_enabled BOOLEAN DEFAULT false,
  anonymize_sensitive_data BOOLEAN DEFAULT true,
  require_consent BOOLEAN DEFAULT true,
  debug_mode BOOLEAN DEFAULT false,
  retention_days INTEGER DEFAULT 365,
  allowed_event_categories TEXT[] DEFAULT ARRAY['user', 'content', 'organization', 'project', 'chat', 'portfolio', 'board', 'ai'],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- External tracking integrations per organization
CREATE TABLE public.organization_tracking_integrations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  provider_id TEXT,
  api_key TEXT,
  enabled BOOLEAN DEFAULT false,
  events_allowed TEXT[] DEFAULT ARRAY[]::TEXT[],
  config JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(organization_id, provider)
);

-- AI Insights configuration per organization
CREATE TABLE public.organization_ai_insights_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE UNIQUE,
  enabled BOOLEAN DEFAULT true,
  provider TEXT DEFAULT 'lovable',
  model TEXT DEFAULT 'google/gemini-2.5-flash',
  analysis_frequency TEXT DEFAULT 'daily',
  auto_alerts_enabled BOOLEAN DEFAULT true,
  auto_recommendations_enabled BOOLEAN DEFAULT true,
  last_analysis_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- AI generated insights/alerts
CREATE TABLE public.tracking_ai_insights (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  insight_type TEXT NOT NULL,
  severity TEXT DEFAULT 'info',
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  metadata JSONB DEFAULT '{}'::jsonb,
  action_taken BOOLEAN DEFAULT false,
  action_taken_at TIMESTAMP WITH TIME ZONE,
  action_taken_by UUID,
  dismissed BOOLEAN DEFAULT false,
  dismissed_at TIMESTAMP WITH TIME ZONE,
  dismissed_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Event definitions (for documentation and validation)
CREATE TABLE public.tracking_event_definitions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_name TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL,
  description TEXT,
  schema JSONB DEFAULT '{}'::jsonb,
  is_sensitive BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert default event definitions
INSERT INTO tracking_event_definitions (event_name, category, description, is_sensitive) VALUES
('user_registered', 'user', 'Usuario registrado', false),
('user_logged_in', 'user', 'Usuario inició sesión', false),
('user_logged_out', 'user', 'Usuario cerró sesión', false),
('profile_updated', 'user', 'Perfil actualizado', false),
('role_changed', 'user', 'Rol modificado', false),
('permission_denied', 'user', 'Acceso denegado', false),
('viewed_profile', 'user', 'Perfil visualizado', false),
('revealed_contact', 'user', 'Contacto revelado', true),
('organization_created', 'organization', 'Organización creada', false),
('member_invited', 'organization', 'Miembro invitado', false),
('member_joined', 'organization', 'Miembro se unió', false),
('plan_changed', 'organization', 'Plan cambiado', false),
('trial_started', 'organization', 'Prueba iniciada', false),
('trial_ended', 'organization', 'Prueba finalizada', false),
('ai_provider_changed', 'organization', 'Proveedor IA cambiado', false),
('tracking_config_updated', 'organization', 'Config tracking actualizada', false),
('project_created', 'project', 'Proyecto creado', false),
('status_changed', 'project', 'Estado cambiado', false),
('content_uploaded', 'content', 'Contenido subido', false),
('raw_material_uploaded', 'content', 'Material crudo subido', false),
('thumbnail_generated', 'content', 'Thumbnail generado', false),
('script_generated_ai', 'content', 'Script generado con IA', false),
('content_approved', 'content', 'Contenido aprobado', false),
('content_delivered', 'content', 'Contenido entregado', false),
('card_created', 'board', 'Tarjeta creada', false),
('card_moved', 'board', 'Tarjeta movida', false),
('state_blocked_by_permission', 'board', 'Estado bloqueado', false),
('automation_triggered', 'board', 'Automatización ejecutada', false),
('ai_suggestion_applied', 'board', 'Sugerencia IA aplicada', false),
('video_view', 'portfolio', 'Video visualizado', false),
('video_like', 'portfolio', 'Video liked', false),
('video_save', 'portfolio', 'Video guardado', false),
('video_share', 'portfolio', 'Video compartido', false),
('story_view', 'portfolio', 'Story visualizada', false),
('story_posted', 'portfolio', 'Story publicada', false),
('follow_user', 'portfolio', 'Usuario seguido', false),
('follow_company', 'portfolio', 'Empresa seguida', false),
('recommendation_clicked', 'portfolio', 'Recomendación clickeada', false),
('message_sent', 'chat', 'Mensaje enviado', false),
('file_shared', 'chat', 'Archivo compartido', false),
('ai_message_generated', 'chat', 'Mensaje IA generado', false),
('ai_flow_triggered', 'chat', 'Flujo IA activado', false),
('ai_request', 'ai', 'Solicitud a IA', false),
('ai_response', 'ai', 'Respuesta de IA', false),
('ai_insight_generated', 'ai', 'Insight IA generado', false),
('page_view', 'navigation', 'Página vista', false),
('button_click', 'interaction', 'Botón clickeado', false),
('form_submit', 'interaction', 'Formulario enviado', false),
('search_performed', 'interaction', 'Búsqueda realizada', false),
('error_occurred', 'system', 'Error ocurrido', false);

-- Enable RLS on all tables
ALTER TABLE tracking_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_tracking_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_tracking_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_ai_insights_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracking_ai_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracking_event_definitions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tracking_events
CREATE POLICY "System can insert tracking events"
  ON tracking_events FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Org admins can view their org events"
  ON tracking_events FOR SELECT
  USING (
    organization_id IS NULL OR
    is_org_owner(auth.uid(), organization_id) OR
    (EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = tracking_events.organization_id
      AND om.user_id = auth.uid()
      AND om.role = 'admin'
    ))
  );

CREATE POLICY "Root admins can view all events"
  ON tracking_events FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

-- RLS for organization_tracking_config
CREATE POLICY "Org members can view tracking config"
  ON organization_tracking_config FOR SELECT
  USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org owners can manage tracking config"
  ON organization_tracking_config FOR ALL
  USING (is_org_owner(auth.uid(), organization_id));

-- RLS for organization_tracking_integrations
CREATE POLICY "Org owners can manage integrations"
  ON organization_tracking_integrations FOR ALL
  USING (is_org_owner(auth.uid(), organization_id));

CREATE POLICY "Org admins can view integrations"
  ON organization_tracking_integrations FOR SELECT
  USING (
    is_org_member(auth.uid(), organization_id) AND
    (EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = organization_tracking_integrations.organization_id
      AND om.user_id = auth.uid()
      AND om.role = 'admin'
    ))
  );

-- RLS for AI insights config
CREATE POLICY "Org members can view AI insights config"
  ON organization_ai_insights_config FOR SELECT
  USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org owners can manage AI insights config"
  ON organization_ai_insights_config FOR ALL
  USING (is_org_owner(auth.uid(), organization_id));

-- RLS for AI insights
CREATE POLICY "Org admins can view AI insights"
  ON tracking_ai_insights FOR SELECT
  USING (
    is_org_owner(auth.uid(), organization_id) OR
    (EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = tracking_ai_insights.organization_id
      AND om.user_id = auth.uid()
      AND om.role = 'admin'
    ))
  );

CREATE POLICY "Org owners can manage AI insights"
  ON tracking_ai_insights FOR ALL
  USING (is_org_owner(auth.uid(), organization_id));

-- RLS for event definitions
CREATE POLICY "Anyone can view event definitions"
  ON tracking_event_definitions FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage event definitions"
  ON tracking_event_definitions FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- Updated_at triggers
CREATE TRIGGER update_organization_tracking_config_updated_at
  BEFORE UPDATE ON organization_tracking_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_organization_tracking_integrations_updated_at
  BEFORE UPDATE ON organization_tracking_integrations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_organization_ai_insights_config_updated_at
  BEFORE UPDATE ON organization_ai_insights_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to create future partitions automatically
CREATE OR REPLACE FUNCTION create_tracking_partition()
RETURNS void AS $$
DECLARE
  partition_date DATE;
  partition_name TEXT;
  start_date DATE;
  end_date DATE;
BEGIN
  FOR i IN 0..5 LOOP
    partition_date := DATE_TRUNC('month', CURRENT_DATE + (i || ' months')::INTERVAL);
    partition_name := 'tracking_events_' || TO_CHAR(partition_date, 'YYYY_MM');
    start_date := partition_date;
    end_date := partition_date + INTERVAL '1 month';
    
    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = partition_name) THEN
      EXECUTE format(
        'CREATE TABLE IF NOT EXISTS %I PARTITION OF tracking_events FOR VALUES FROM (%L) TO (%L)',
        partition_name, start_date, end_date
      );
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Function to cleanup old events
CREATE OR REPLACE FUNCTION cleanup_old_tracking_events()
RETURNS void AS $$
BEGIN
  DELETE FROM tracking_events te
  WHERE te.created_at < NOW() - (
    SELECT COALESCE(
      (SELECT retention_days FROM organization_tracking_config WHERE organization_id = te.organization_id),
      365
    ) * INTERVAL '1 day'
  );
END;
$$ LANGUAGE plpgsql SET search_path = public;