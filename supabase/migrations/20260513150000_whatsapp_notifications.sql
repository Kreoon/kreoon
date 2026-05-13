-- ============================================================
-- WhatsApp Notifications Infrastructure
-- Agrega soporte de notificaciones WhatsApp vía Botcake API
-- ============================================================

-- 1. Campo WhatsApp en profiles (creadores, editores, admins)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS whatsapp_phone TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp_enabled BOOLEAN NOT NULL DEFAULT false;

-- 2. Campo WhatsApp en clients (clientes de organización)
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS whatsapp_phone TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp_enabled BOOLEAN NOT NULL DEFAULT true;

-- 3. Campo WhatsApp en creator_profiles (freelancers del marketplace)
ALTER TABLE public.creator_profiles
  ADD COLUMN IF NOT EXISTS whatsapp_phone TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp_enabled BOOLEAN NOT NULL DEFAULT false;

-- 4. Tabla de logs de notificaciones WhatsApp
CREATE TABLE IF NOT EXISTS public.whatsapp_notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  phone TEXT NOT NULL,
  message TEXT NOT NULL,
  event_type TEXT NOT NULL,
  entity_id UUID,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | sent | failed
  provider_response JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.whatsapp_notification_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view whatsapp logs"
  ON public.whatsapp_notification_logs
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
    )
  );

-- 5. Tabla de templates de WhatsApp (configuración de plantillas Meta aprobadas)
-- Cada event_type tiene su template_id de Botcake y el esquema de variables
CREATE TABLE IF NOT EXISTS public.whatsapp_notification_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL UNIQUE,     -- ej: "content_assigned"
  template_id TEXT NOT NULL,           -- ID del template en Botcake (sincronizado desde Meta)
  template_name TEXT NOT NULL,         -- nombre del template en Meta (ej: "kreoon_content_assigned")
  language TEXT NOT NULL DEFAULT 'es', -- código de idioma del template
  category TEXT NOT NULL DEFAULT 'UTILITY', -- MARKETING | UTILITY | AUTHENTICATION
  variables_schema JSONB NOT NULL DEFAULT '[]', -- descripción de las variables para documentación
  is_active BOOLEAN NOT NULL DEFAULT false,     -- solo se envía si el template está activo
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.whatsapp_notification_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage whatsapp templates"
  ON public.whatsapp_notification_templates
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
    )
  );

-- Seed: Insertar las plantillas que se deben crear en Meta/Botcake.
-- is_active = false hasta que el template sea aprobado por Meta y se configure el template_id real.
INSERT INTO public.whatsapp_notification_templates
  (event_type, template_id, template_name, language, category, variables_schema)
VALUES
  (
    'content_assigned',
    'PENDING',
    'kreoon_content_assigned',
    'es',
    'UTILITY',
    '[{"pos":1,"name":"creator_name","example":"Alexander"},{"pos":2,"name":"content_title","example":"Video Testimonial Marca X"},{"pos":3,"name":"org_name","example":"Agencia Kreoon"},{"pos":4,"name":"client_name","example":"Cliente ABC"}]'::jsonb
  ),
  (
    'content_recorded',
    'PENDING',
    'kreoon_content_recorded',
    'es',
    'UTILITY',
    '[{"pos":1,"name":"editor_name","example":"Juan"},{"pos":2,"name":"content_title","example":"Video Testimonial"},{"pos":3,"name":"org_name","example":"Agencia Kreoon"},{"pos":4,"name":"creator_name","example":"María"}]'::jsonb
  ),
  (
    'content_approved',
    'PENDING',
    'kreoon_content_approved',
    'es',
    'UTILITY',
    '[{"pos":1,"name":"creator_name","example":"Alexander"},{"pos":2,"name":"content_title","example":"Video Testimonial"}]'::jsonb
  ),
  (
    'content_issue',
    'PENDING',
    'kreoon_content_issue',
    'es',
    'UTILITY',
    '[{"pos":1,"name":"user_name","example":"Juan"},{"pos":2,"name":"content_title","example":"Video Testimonial"},{"pos":3,"name":"org_name","example":"Agencia Kreoon"}]'::jsonb
  ),
  (
    'script_pending',
    'PENDING',
    'kreoon_script_pending',
    'es',
    'UTILITY',
    '[{"pos":1,"name":"content_title","example":"Video Testimonial Marca X"},{"pos":2,"name":"org_name","example":"Agencia Kreoon"}]'::jsonb
  ),
  (
    'content_delivered',
    'PENDING',
    'kreoon_content_delivered',
    'es',
    'UTILITY',
    '[{"pos":1,"name":"content_title","example":"Video Testimonial"},{"pos":2,"name":"org_name","example":"Agencia Kreoon"}]'::jsonb
  ),
  (
    'content_corrected',
    'PENDING',
    'kreoon_content_corrected',
    'es',
    'UTILITY',
    '[{"pos":1,"name":"content_title","example":"Video Testimonial"},{"pos":2,"name":"org_name","example":"Agencia Kreoon"}]'::jsonb
  ),
  (
    'new_campaign',
    'PENDING',
    'kreoon_new_campaign',
    'es',
    'MARKETING',
    '[{"pos":1,"name":"creator_name","example":"Alexander"},{"pos":2,"name":"campaign_title","example":"Campaña Verano 2026"},{"pos":3,"name":"brand_name","example":"Marca X"},{"pos":4,"name":"budget","example":"$500.000 por video"},{"pos":5,"name":"match_score","example":"87"}]'::jsonb
  ),
  (
    'new_member',
    'PENDING',
    'kreoon_new_member',
    'es',
    'UTILITY',
    '[{"pos":1,"name":"org_name","example":"Agencia Kreoon"},{"pos":2,"name":"member_name","example":"Carlos Pérez"},{"pos":3,"name":"role_label","example":"Creador"}]'::jsonb
  ),
  (
    'welcome_creator',
    'PENDING',
    'kreoon_welcome_creator',
    'es',
    'UTILITY',
    '[{"pos":1,"name":"creator_name","example":"Alexander"}]'::jsonb
  ),
  (
    'welcome_client',
    'PENDING',
    'kreoon_welcome_client',
    'es',
    'UTILITY',
    '[{"pos":1,"name":"client_name","example":"Valentina"},{"pos":2,"name":"org_name","example":"Agencia Kreoon"}]'::jsonb
  ),
  (
    'profile_reminder',
    'PENDING',
    'kreoon_profile_reminder',
    'es',
    'UTILITY',
    '[{"pos":1,"name":"creator_name","example":"Alexander"}]'::jsonb
  ),
  (
    'client_reminder',
    'PENDING',
    'kreoon_client_reminder',
    'es',
    'UTILITY',
    '[{"pos":1,"name":"org_name","example":"Agencia Kreoon"},{"pos":2,"name":"pending_count","example":"2"}]'::jsonb
  )
ON CONFLICT (event_type) DO NOTHING;

-- 6. Permisos explícitos para que service_role pueda leer las tablas
--    (necesario cuando las tablas se crean por migración SQL, no desde el Dashboard)
GRANT ALL ON public.whatsapp_notification_templates TO service_role, authenticated, anon;
GRANT ALL ON public.whatsapp_notification_logs TO service_role, authenticated, anon;

-- ============================================================
-- Extender trigger notify_content_status_change para incluir
-- los nuevos eventos que notifican al cliente vía WhatsApp
-- (script_pending, delivered, corrected)
-- ============================================================

CREATE OR REPLACE FUNCTION public.notify_content_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _payload jsonb;
  _type text;
  _url text;
BEGIN
  -- Only fire on actual status changes
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Determine notification type based on new status
  CASE NEW.status
    WHEN 'assigned' THEN
      IF NEW.creator_id IS NOT NULL THEN
        _type := 'content_assigned';
      END IF;
    WHEN 'recorded' THEN
      IF NEW.editor_id IS NOT NULL THEN
        _type := 'content_recorded';
      END IF;
    WHEN 'approved' THEN
      IF NEW.creator_id IS NOT NULL THEN
        _type := 'content_approved';
      END IF;
    WHEN 'issue' THEN
      _type := 'content_issue';
    -- Nuevos eventos para clientes (WhatsApp)
    WHEN 'script_pending' THEN
      IF NEW.client_id IS NOT NULL THEN
        _type := 'script_pending';
      END IF;
    WHEN 'delivered' THEN
      IF NEW.client_id IS NOT NULL THEN
        _type := 'content_delivered';
      END IF;
    WHEN 'corrected' THEN
      IF NEW.client_id IS NOT NULL THEN
        _type := 'content_corrected';
      END IF;
    ELSE
      RETURN NEW;
  END CASE;

  IF _type IS NULL THEN
    RETURN NEW;
  END IF;

  _payload := jsonb_build_object(
    'type', _type,
    'record', jsonb_build_object(
      'id', NEW.id,
      'title', NEW.title,
      'status', NEW.status,
      'creator_id', NEW.creator_id,
      'editor_id', NEW.editor_id,
      'client_id', NEW.client_id,
      'organization_id', NEW.organization_id
    ),
    'old_record', jsonb_build_object(
      'status', OLD.status
    )
  );

  _url := current_setting('app.settings.supabase_url', true);
  IF _url IS NULL OR _url = '' THEN
    _url := 'https://wjkbqcrxwsmvtxmqgiqc.supabase.co';
  END IF;

  PERFORM net.http_post(
    url := _url || '/functions/v1/workflow-notifications',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true),
      'Content-Type', 'application/json'
    ),
    body := _payload
  );

  RETURN NEW;
END;
$$;

-- Re-crear el trigger (la función ya fue reemplazada arriba, el trigger se mantiene)
DROP TRIGGER IF EXISTS trg_content_workflow_notification ON public.content;
CREATE TRIGGER trg_content_workflow_notification
  AFTER UPDATE OF status ON public.content
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_content_status_change();
