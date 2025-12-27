-- Add ambassador content fields to content table
ALTER TABLE public.content 
ADD COLUMN IF NOT EXISTS content_type text DEFAULT 'commercial',
ADD COLUMN IF NOT EXISTS is_paid boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS reward_type text DEFAULT 'money';

-- Add comment for documentation
COMMENT ON COLUMN public.content.content_type IS 'Type: commercial, ambassador_internal, etc';
COMMENT ON COLUMN public.content.is_paid IS 'Whether this content is paid with money';
COMMENT ON COLUMN public.content.reward_type IS 'Type of reward: money, UP, etc';

-- Create ambassador UP events configuration table
CREATE TABLE IF NOT EXISTS public.ambassador_up_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  event_key text NOT NULL,
  event_name text NOT NULL,
  description text,
  base_points integer NOT NULL DEFAULT 100,
  conditions jsonb DEFAULT '{}',
  multipliers jsonb DEFAULT '{}',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(organization_id, event_key)
);

-- Enable RLS
ALTER TABLE public.ambassador_up_config ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view ambassador config for their organization"
ON public.ambassador_up_config
FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM public.organization_members 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Admins can manage ambassador config"
ON public.ambassador_up_config
FOR ALL
USING (
  organization_id IN (
    SELECT om.organization_id FROM public.organization_members om
    JOIN public.organization_member_roles omr ON om.user_id = omr.user_id 
      AND om.organization_id = omr.organization_id
    WHERE om.user_id = auth.uid() AND omr.role = 'admin'
  )
);

-- Insert default UP events for ambassador content
INSERT INTO public.ambassador_up_config (organization_id, event_key, event_name, description, base_points, conditions)
SELECT 
  id as organization_id,
  'ambassador_content_created' as event_key,
  'Contenido Embajador Creado' as event_name,
  'Puntos otorgados cuando un embajador crea contenido para la organización' as description,
  100 as base_points,
  '{"content_approved": true, "client_is_organization": true}'::jsonb as conditions
FROM public.organizations
ON CONFLICT (organization_id, event_key) DO NOTHING;

INSERT INTO public.ambassador_up_config (organization_id, event_key, event_name, description, base_points, conditions)
SELECT 
  id as organization_id,
  'ambassador_content_approved' as event_key,
  'Contenido Embajador Aprobado' as event_name,
  'Puntos adicionales cuando el contenido embajador es aprobado' as description,
  50 as base_points,
  '{"status": "approved"}'::jsonb as conditions
FROM public.organizations
ON CONFLICT (organization_id, event_key) DO NOTHING;

INSERT INTO public.ambassador_up_config (organization_id, event_key, event_name, description, base_points, conditions)
SELECT 
  id as organization_id,
  'ambassador_content_published' as event_key,
  'Contenido Embajador Publicado' as event_name,
  'Bonus de puntos cuando el contenido embajador se publica' as description,
  75 as base_points,
  '{"is_published": true}'::jsonb as conditions
FROM public.organizations
ON CONFLICT (organization_id, event_key) DO NOTHING;

-- Add AI module key for future use
INSERT INTO public.organization_ai_modules (organization_id, module_key, module_name, description, is_active, provider, model, required_role, category, permission_level)
SELECT 
  id as organization_id,
  'ambassador.internal_content.ai' as module_key,
  'IA Contenido Embajador' as module_name,
  'Evaluación de calidad, recomendación de UP bonus, detección de embajadores top' as description,
  false as is_active,
  'openai' as provider,
  'gpt-4o' as model,
  'admin' as required_role,
  'ambassador' as category,
  'execute' as permission_level
FROM public.organizations
ON CONFLICT DO NOTHING;