-- ============================================================
-- KREOON Email Marketing System
-- Migration: 20260217200000
-- Tables: email_templates, email_segments, email_campaigns,
--         email_drip_sequences, email_drip_steps,
--         email_drip_enrollments, email_events
-- ============================================================

-- ============================================================
-- 1. EMAIL TEMPLATES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  subject text NOT NULL DEFAULT '',
  html_body text NOT NULL DEFAULT '',
  text_body text,
  variables jsonb DEFAULT '[]'::jsonb,
  category text NOT NULL DEFAULT 'general',
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.email_templates IS 'Reusable HTML email templates for campaigns and drip sequences';
COMMENT ON COLUMN public.email_templates.organization_id IS 'NULL = platform-wide template';
COMMENT ON COLUMN public.email_templates.variables IS 'Array of {key, label, default_value} for template variables';
COMMENT ON COLUMN public.email_templates.category IS 'general, onboarding, marketing, transactional, notification';

CREATE INDEX idx_email_templates_org ON public.email_templates(organization_id);
CREATE INDEX idx_email_templates_category ON public.email_templates(category);

-- ============================================================
-- 2. EMAIL SEGMENTS (maps to Resend Segments)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.email_segments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  resend_segment_id text UNIQUE,
  filter_criteria jsonb DEFAULT '{}'::jsonb,
  contact_count int NOT NULL DEFAULT 0,
  last_synced_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.email_segments IS 'Local mapping of Resend Segments with filter criteria';
COMMENT ON COLUMN public.email_segments.resend_segment_id IS 'Corresponding segment ID in Resend API';
COMMENT ON COLUMN public.email_segments.filter_criteria IS '{contact_type, tags, relationship_strength, pipeline_stage, lead_stage, source}';

CREATE INDEX idx_email_segments_org ON public.email_segments(organization_id);

-- ============================================================
-- 3. EMAIL CAMPAIGNS (broadcasts)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.email_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  subject text NOT NULL,
  template_id uuid REFERENCES public.email_templates(id) ON DELETE SET NULL,
  segment_id uuid REFERENCES public.email_segments(id) ON DELETE SET NULL,
  html_body text,
  from_name text NOT NULL DEFAULT 'KREOON',
  from_email text NOT NULL DEFAULT 'noreply@kreoon.com',
  reply_to text,
  status text NOT NULL DEFAULT 'draft',
  resend_broadcast_id text,
  scheduled_at timestamptz,
  sent_at timestamptz,
  -- Metrics (updated by webhook)
  total_sent int NOT NULL DEFAULT 0,
  total_delivered int NOT NULL DEFAULT 0,
  total_opened int NOT NULL DEFAULT 0,
  total_clicked int NOT NULL DEFAULT 0,
  total_bounced int NOT NULL DEFAULT 0,
  total_complained int NOT NULL DEFAULT 0,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT email_campaign_status_check CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'cancelled'))
);

COMMENT ON TABLE public.email_campaigns IS 'Email broadcast campaigns sent to segments via Resend';

CREATE INDEX idx_email_campaigns_org ON public.email_campaigns(organization_id);
CREATE INDEX idx_email_campaigns_status ON public.email_campaigns(status);
CREATE INDEX idx_email_campaigns_segment ON public.email_campaigns(segment_id);
CREATE INDEX idx_email_campaigns_resend ON public.email_campaigns(resend_broadcast_id);

-- ============================================================
-- 4. EMAIL DRIP SEQUENCES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.email_drip_sequences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  trigger_type text NOT NULL DEFAULT 'manual',
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT drip_trigger_type_check CHECK (trigger_type IN ('manual', 'on_lead_created', 'on_contact_created', 'on_signup'))
);

COMMENT ON TABLE public.email_drip_sequences IS 'Automated email drip sequence definitions';

CREATE INDEX idx_email_drip_sequences_org ON public.email_drip_sequences(organization_id);
CREATE INDEX idx_email_drip_sequences_trigger ON public.email_drip_sequences(trigger_type);

-- ============================================================
-- 5. EMAIL DRIP STEPS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.email_drip_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_id uuid NOT NULL REFERENCES public.email_drip_sequences(id) ON DELETE CASCADE,
  step_order int NOT NULL DEFAULT 0,
  delay_minutes int NOT NULL DEFAULT 0,
  template_id uuid REFERENCES public.email_templates(id) ON DELETE SET NULL,
  subject_override text,
  conditions jsonb DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.email_drip_steps IS 'Individual steps within a drip sequence';
COMMENT ON COLUMN public.email_drip_steps.delay_minutes IS 'Minutes to wait after previous step before sending (0 = immediate)';
COMMENT ON COLUMN public.email_drip_steps.conditions IS '{skip_if_opened_prev, skip_if_clicked_prev, skip_if_bounced}';

CREATE INDEX idx_email_drip_steps_sequence ON public.email_drip_steps(sequence_id, step_order);

-- ============================================================
-- 6. EMAIL DRIP ENROLLMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.email_drip_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_id uuid NOT NULL REFERENCES public.email_drip_sequences(id) ON DELETE CASCADE,
  contact_email text NOT NULL,
  contact_name text,
  contact_metadata jsonb DEFAULT '{}'::jsonb,
  current_step int NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active',
  next_send_at timestamptz,
  last_sent_at timestamptz,
  resend_contact_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT enrollment_status_check CHECK (status IN ('active', 'completed', 'paused', 'unsubscribed', 'bounced'))
);

COMMENT ON TABLE public.email_drip_enrollments IS 'Contacts enrolled in drip sequences with current progress';
COMMENT ON COLUMN public.email_drip_enrollments.contact_metadata IS '{source_table, source_id, first_name, last_name, properties}';

CREATE INDEX idx_email_drip_enrollments_sequence ON public.email_drip_enrollments(sequence_id);
CREATE INDEX idx_email_drip_enrollments_status ON public.email_drip_enrollments(status);
CREATE INDEX idx_email_drip_enrollments_next_send ON public.email_drip_enrollments(next_send_at) WHERE status = 'active';
CREATE INDEX idx_email_drip_enrollments_email ON public.email_drip_enrollments(contact_email);

-- ============================================================
-- 7. EMAIL EVENTS (webhook log)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.email_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES public.email_campaigns(id) ON DELETE SET NULL,
  enrollment_id uuid REFERENCES public.email_drip_enrollments(id) ON DELETE SET NULL,
  resend_email_id text,
  event_type text NOT NULL,
  recipient_email text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.email_events IS 'Log of all email lifecycle events from Resend webhooks';
COMMENT ON COLUMN public.email_events.event_type IS 'delivered, opened, clicked, bounced, complained, sent, failed';

CREATE INDEX idx_email_events_campaign ON public.email_events(campaign_id);
CREATE INDEX idx_email_events_enrollment ON public.email_events(enrollment_id);
CREATE INDEX idx_email_events_recipient ON public.email_events(recipient_email);
CREATE INDEX idx_email_events_type ON public.email_events(event_type);
CREATE INDEX idx_email_events_resend ON public.email_events(resend_email_id);
CREATE INDEX idx_email_events_created ON public.email_events(created_at DESC);

-- ============================================================
-- RLS POLICIES — Platform admin only
-- ============================================================
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_drip_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_drip_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_drip_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_events ENABLE ROW LEVEL SECURITY;

-- Helper: check if user is platform admin (reuse existing function or create)
CREATE OR REPLACE FUNCTION public.is_email_marketing_admin(user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.user_id = $1
      AND om.app_role::text IN ('admin', 'owner')
    LIMIT 1
  )
  OR public.is_platform_root($1);
$$;

-- email_templates
CREATE POLICY "email_templates_select" ON public.email_templates
  FOR SELECT TO authenticated
  USING (public.is_email_marketing_admin(auth.uid()));

CREATE POLICY "email_templates_insert" ON public.email_templates
  FOR INSERT TO authenticated
  WITH CHECK (public.is_email_marketing_admin(auth.uid()));

CREATE POLICY "email_templates_update" ON public.email_templates
  FOR UPDATE TO authenticated
  USING (public.is_email_marketing_admin(auth.uid()));

CREATE POLICY "email_templates_delete" ON public.email_templates
  FOR DELETE TO authenticated
  USING (public.is_email_marketing_admin(auth.uid()));

-- email_segments
CREATE POLICY "email_segments_select" ON public.email_segments
  FOR SELECT TO authenticated
  USING (public.is_email_marketing_admin(auth.uid()));

CREATE POLICY "email_segments_insert" ON public.email_segments
  FOR INSERT TO authenticated
  WITH CHECK (public.is_email_marketing_admin(auth.uid()));

CREATE POLICY "email_segments_update" ON public.email_segments
  FOR UPDATE TO authenticated
  USING (public.is_email_marketing_admin(auth.uid()));

CREATE POLICY "email_segments_delete" ON public.email_segments
  FOR DELETE TO authenticated
  USING (public.is_email_marketing_admin(auth.uid()));

-- email_campaigns
CREATE POLICY "email_campaigns_select" ON public.email_campaigns
  FOR SELECT TO authenticated
  USING (public.is_email_marketing_admin(auth.uid()));

CREATE POLICY "email_campaigns_insert" ON public.email_campaigns
  FOR INSERT TO authenticated
  WITH CHECK (public.is_email_marketing_admin(auth.uid()));

CREATE POLICY "email_campaigns_update" ON public.email_campaigns
  FOR UPDATE TO authenticated
  USING (public.is_email_marketing_admin(auth.uid()));

CREATE POLICY "email_campaigns_delete" ON public.email_campaigns
  FOR DELETE TO authenticated
  USING (public.is_email_marketing_admin(auth.uid()));

-- email_drip_sequences
CREATE POLICY "email_drip_sequences_select" ON public.email_drip_sequences
  FOR SELECT TO authenticated
  USING (public.is_email_marketing_admin(auth.uid()));

CREATE POLICY "email_drip_sequences_insert" ON public.email_drip_sequences
  FOR INSERT TO authenticated
  WITH CHECK (public.is_email_marketing_admin(auth.uid()));

CREATE POLICY "email_drip_sequences_update" ON public.email_drip_sequences
  FOR UPDATE TO authenticated
  USING (public.is_email_marketing_admin(auth.uid()));

CREATE POLICY "email_drip_sequences_delete" ON public.email_drip_sequences
  FOR DELETE TO authenticated
  USING (public.is_email_marketing_admin(auth.uid()));

-- email_drip_steps
CREATE POLICY "email_drip_steps_select" ON public.email_drip_steps
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.email_drip_sequences s
      WHERE s.id = email_drip_steps.sequence_id
    )
  );

CREATE POLICY "email_drip_steps_insert" ON public.email_drip_steps
  FOR INSERT TO authenticated
  WITH CHECK (public.is_email_marketing_admin(auth.uid()));

CREATE POLICY "email_drip_steps_update" ON public.email_drip_steps
  FOR UPDATE TO authenticated
  USING (public.is_email_marketing_admin(auth.uid()));

CREATE POLICY "email_drip_steps_delete" ON public.email_drip_steps
  FOR DELETE TO authenticated
  USING (public.is_email_marketing_admin(auth.uid()));

-- email_drip_enrollments
CREATE POLICY "email_drip_enrollments_select" ON public.email_drip_enrollments
  FOR SELECT TO authenticated
  USING (public.is_email_marketing_admin(auth.uid()));

CREATE POLICY "email_drip_enrollments_insert" ON public.email_drip_enrollments
  FOR INSERT TO authenticated
  WITH CHECK (public.is_email_marketing_admin(auth.uid()));

CREATE POLICY "email_drip_enrollments_update" ON public.email_drip_enrollments
  FOR UPDATE TO authenticated
  USING (public.is_email_marketing_admin(auth.uid()));

CREATE POLICY "email_drip_enrollments_delete" ON public.email_drip_enrollments
  FOR DELETE TO authenticated
  USING (public.is_email_marketing_admin(auth.uid()));

-- email_events (read-only for admins; service_role inserts via webhook)
CREATE POLICY "email_events_select" ON public.email_events
  FOR SELECT TO authenticated
  USING (public.is_email_marketing_admin(auth.uid()));

-- Service role bypass for webhook inserts (no policy needed, service_role bypasses RLS)

-- ============================================================
-- GRANTS
-- ============================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_templates TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_segments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_campaigns TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_drip_sequences TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_drip_steps TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_drip_enrollments TO authenticated;
GRANT SELECT ON public.email_events TO authenticated;

-- Service role needs full access to email_events for webhook inserts
GRANT ALL ON public.email_events TO service_role;

-- ============================================================
-- UPDATED_AT TRIGGERS
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER email_templates_updated_at
  BEFORE UPDATE ON public.email_templates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER email_segments_updated_at
  BEFORE UPDATE ON public.email_segments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER email_campaigns_updated_at
  BEFORE UPDATE ON public.email_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER email_drip_sequences_updated_at
  BEFORE UPDATE ON public.email_drip_sequences
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER email_drip_steps_updated_at
  BEFORE UPDATE ON public.email_drip_steps
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER email_drip_enrollments_updated_at
  BEFORE UPDATE ON public.email_drip_enrollments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- RPC: Increment campaign metrics (called by webhook function)
-- ============================================================
CREATE OR REPLACE FUNCTION public.increment_campaign_metric(
  p_campaign_id uuid,
  p_metric text,
  p_amount int DEFAULT 1
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE format(
    'UPDATE public.email_campaigns SET %I = %I + $1 WHERE id = $2',
    'total_' || p_metric,
    'total_' || p_metric
  ) USING p_amount, p_campaign_id;
END;
$$;

-- ============================================================
-- pg_cron: Drip processor every 5 minutes
-- ============================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- Drip processor: every 5 minutes
    PERFORM cron.schedule(
      'email-drip-processor',
      '*/5 * * * *',
      $$SELECT net.http_post(
        url := current_setting('app.settings.supabase_url') || '/functions/v1/email-drip-processor',
        headers := jsonb_build_object(
          'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
          'Content-Type', 'application/json'
        ),
        body := '{}'::jsonb
      );$$
    );

    -- Daily reminders: Mon-Fri 8 AM UTC-5 (13:00 UTC)
    PERFORM cron.schedule(
      'daily-email-reminders',
      '0 13 * * 1-5',
      $$SELECT net.http_post(
        url := current_setting('app.settings.supabase_url') || '/functions/v1/daily-reminders',
        headers := jsonb_build_object(
          'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
          'Content-Type', 'application/json'
        ),
        body := '{}'::jsonb
      );$$
    );
  END IF;
END;
$$;

-- ============================================================
-- DEFAULT TEMPLATES (platform-wide)
-- ============================================================
INSERT INTO public.email_templates (name, subject, category, html_body, text_body, variables) VALUES
(
  'Bienvenida KREOON',
  'Bienvenido a KREOON, {{first_name}}!',
  'onboarding',
  '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:0;background:#0a0a0a;font-family:system-ui,-apple-system,sans-serif"><div style="max-width:600px;margin:0 auto;padding:40px 20px"><div style="background:linear-gradient(135deg,#1a1a2e 0%,#16213e 100%);border-radius:16px;padding:40px;border:1px solid rgba(255,255,255,0.1)"><div style="text-align:center;margin-bottom:32px"><img src="https://kreoon.com/favicon.png" alt="KREOON" width="48" height="48" style="display:block;margin:0 auto 16px;border-radius:12px" /><h1 style="color:#fff;font-size:28px;margin:0">Bienvenido a <span style="background:linear-gradient(90deg,#8b5cf6,#06b6d4);-webkit-background-clip:text;-webkit-text-fill-color:transparent">KREOON</span></h1></div><p style="color:#e2e8f0;font-size:16px;line-height:1.6">Hola {{first_name}},</p><p style="color:#94a3b8;font-size:15px;line-height:1.6">Tu cuenta ha sido creada exitosamente. Estamos emocionados de tenerte en la plataforma.</p><div style="text-align:center;margin:32px 0"><a href="https://kreoon.com/dashboard" style="background:linear-gradient(90deg,#8b5cf6,#06b6d4);color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:16px;display:inline-block">Ir al Dashboard</a></div><p style="color:#64748b;font-size:13px;text-align:center;margin-top:32px">KREOON - Tu sistema operativo para creadores</p></div></div></body></html>',
  'Hola {{first_name}}, bienvenido a KREOON. Tu cuenta ha sido creada exitosamente. Visita https://kreoon.com/dashboard para comenzar.',
  '[{"key":"first_name","label":"Nombre","default_value":""},{"key":"role","label":"Rol","default_value":""}]'::jsonb
),
(
  'Newsletter Mensual',
  '{{month_name}} en KREOON — Novedades y actualizaciones',
  'marketing',
  '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:0;background:#0a0a0a;font-family:system-ui,-apple-system,sans-serif"><div style="max-width:600px;margin:0 auto;padding:40px 20px"><div style="background:linear-gradient(135deg,#1a1a2e 0%,#16213e 100%);border-radius:16px;padding:40px;border:1px solid rgba(255,255,255,0.1)"><div style="text-align:center;margin-bottom:32px"><img src="https://kreoon.com/favicon.png" alt="KREOON" width="48" height="48" style="display:block;margin:0 auto 16px;border-radius:12px" /><h1 style="color:#fff;font-size:24px;margin:0">Novedades de <span style="background:linear-gradient(90deg,#8b5cf6,#06b6d4);-webkit-background-clip:text;-webkit-text-fill-color:transparent">KREOON</span></h1><p style="color:#94a3b8;font-size:14px;margin-top:8px">{{month_name}}</p></div><div style="color:#e2e8f0;font-size:15px;line-height:1.6">{{content}}</div><div style="border-top:1px solid rgba(255,255,255,0.1);margin-top:32px;padding-top:24px"><p style="color:#64748b;font-size:13px;text-align:center">KREOON - Tu sistema operativo para creadores</p></div></div></div></body></html>',
  'Novedades de KREOON - {{month_name}}. {{content}}',
  '[{"key":"month_name","label":"Mes","default_value":""},{"key":"content","label":"Contenido","default_value":""}]'::jsonb
),
(
  'Notificación General',
  '{{subject_line}}',
  'transactional',
  '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:0;background:#0a0a0a;font-family:system-ui,-apple-system,sans-serif"><div style="max-width:600px;margin:0 auto;padding:40px 20px"><div style="background:linear-gradient(135deg,#1a1a2e 0%,#16213e 100%);border-radius:16px;padding:40px;border:1px solid rgba(255,255,255,0.1)"><div style="text-align:center;margin-bottom:24px"><img src="https://kreoon.com/favicon.png" alt="KREOON" width="48" height="48" style="display:block;margin:0 auto 8px;border-radius:12px" /></div><p style="color:#e2e8f0;font-size:16px;line-height:1.6">Hola {{first_name}},</p><div style="color:#94a3b8;font-size:15px;line-height:1.6">{{message}}</div><div style="text-align:center;margin:32px 0"><a href="{{cta_url}}" style="background:linear-gradient(90deg,#8b5cf6,#06b6d4);color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:16px;display:inline-block">{{cta_text}}</a></div><p style="color:#64748b;font-size:13px;text-align:center;margin-top:32px">KREOON - Tu sistema operativo para creadores</p></div></div></body></html>',
  'Hola {{first_name}}, {{message}}',
  '[{"key":"first_name","label":"Nombre","default_value":""},{"key":"message","label":"Mensaje","default_value":""},{"key":"cta_url","label":"URL del botón","default_value":"https://kreoon.com"},{"key":"cta_text","label":"Texto del botón","default_value":"Ir a KREOON"},{"key":"subject_line","label":"Asunto","default_value":"Notificación de KREOON"}]'::jsonb
);
