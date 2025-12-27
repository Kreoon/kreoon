-- ============================================
-- AI GOVERNANCE LAYER - Prompts por módulo
-- ============================================

-- Tabla para prompts JSON configurables por organización y módulo
CREATE TABLE public.organization_ai_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  module_key TEXT NOT NULL,
  prompt_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  version INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  UNIQUE(organization_id, module_key)
);

-- Índices
CREATE INDEX idx_ai_prompts_org_module ON public.organization_ai_prompts(organization_id, module_key);
CREATE INDEX idx_ai_prompts_active ON public.organization_ai_prompts(is_active) WHERE is_active = true;

-- Enable RLS
ALTER TABLE public.organization_ai_prompts ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Org members can view AI prompts"
  ON public.organization_ai_prompts FOR SELECT
  USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org owners and admins can manage AI prompts"
  ON public.organization_ai_prompts FOR ALL
  USING (is_org_owner(auth.uid(), organization_id) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (is_org_owner(auth.uid(), organization_id) OR has_role(auth.uid(), 'admin'::app_role));

-- Trigger para updated_at
CREATE TRIGGER update_ai_prompts_updated_at
  BEFORE UPDATE ON public.organization_ai_prompts
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ============================================
-- Agregar campos faltantes a organization_ai_modules
-- ============================================
ALTER TABLE public.organization_ai_modules 
  ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'general',
  ADD COLUMN IF NOT EXISTS permission_level TEXT DEFAULT 'execute',
  ADD COLUMN IF NOT EXISTS monthly_limit INTEGER;

-- ============================================
-- Agregar modelos habilitados a providers
-- ============================================
ALTER TABLE public.organization_ai_providers
  ADD COLUMN IF NOT EXISTS default_model TEXT;

-- ============================================
-- Función helper para obtener prompt de módulo
-- ============================================
CREATE OR REPLACE FUNCTION public.get_ai_module_prompt(_org_id UUID, _module_key TEXT)
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT prompt_config FROM public.organization_ai_prompts
     WHERE organization_id = _org_id AND module_key = _module_key AND is_active = true),
    '{}'::jsonb
  );
$$;