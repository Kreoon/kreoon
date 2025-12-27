-- Tabla para registrar y controlar módulos con IA
CREATE TABLE public.organization_ai_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  module_key TEXT NOT NULL,
  module_name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT false,
  provider TEXT DEFAULT 'lovable',
  model TEXT DEFAULT 'google/gemini-2.5-flash',
  required_role TEXT DEFAULT 'admin',
  last_execution_at TIMESTAMPTZ,
  execution_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, module_key)
);

-- Enable RLS
ALTER TABLE public.organization_ai_modules ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Organization members can view AI modules"
  ON public.organization_ai_modules
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_id = organization_ai_modules.organization_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage AI modules"
  ON public.organization_ai_modules
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_id = organization_ai_modules.organization_id
      AND user_id = auth.uid()
      AND (role = 'admin' OR is_owner = true)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_id = organization_ai_modules.organization_id
      AND user_id = auth.uid()
      AND (role = 'admin' OR is_owner = true)
    )
  );

-- Trigger for updated_at
CREATE TRIGGER update_organization_ai_modules_updated_at
  BEFORE UPDATE ON public.organization_ai_modules
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Function to check if a module is active for an organization
CREATE OR REPLACE FUNCTION public.is_ai_module_active(_org_id UUID, _module_key TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_active FROM public.organization_ai_modules
     WHERE organization_id = _org_id AND module_key = _module_key),
    false
  );
$$;

-- Function to get AI module configuration
CREATE OR REPLACE FUNCTION public.get_ai_module_config(_org_id UUID, _module_key TEXT)
RETURNS TABLE(is_active BOOLEAN, provider TEXT, model TEXT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    COALESCE(m.is_active, false) as is_active,
    COALESCE(m.provider, d.default_provider, 'lovable') as provider,
    COALESCE(m.model, d.default_model, 'google/gemini-2.5-flash') as model
  FROM (SELECT 1) dummy
  LEFT JOIN public.organization_ai_modules m 
    ON m.organization_id = _org_id AND m.module_key = _module_key
  LEFT JOIN public.organization_ai_defaults d 
    ON d.organization_id = _org_id;
$$;

-- Function to register/ensure a module exists for an organization
CREATE OR REPLACE FUNCTION public.register_ai_module(
  _org_id UUID,
  _module_key TEXT,
  _module_name TEXT,
  _description TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  module_id UUID;
BEGIN
  INSERT INTO public.organization_ai_modules (organization_id, module_key, module_name, description)
  VALUES (_org_id, _module_key, _module_name, _description)
  ON CONFLICT (organization_id, module_key) DO UPDATE 
  SET module_name = EXCLUDED.module_name,
      description = COALESCE(EXCLUDED.description, organization_ai_modules.description)
  RETURNING id INTO module_id;
  
  RETURN module_id;
END;
$$;

-- Function to update last execution timestamp
CREATE OR REPLACE FUNCTION public.log_ai_module_execution(_org_id UUID, _module_key TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.organization_ai_modules
  SET 
    last_execution_at = now(),
    execution_count = execution_count + 1
  WHERE organization_id = _org_id AND module_key = _module_key;
END;
$$;