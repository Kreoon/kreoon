-- Configuración de Perplexity por organización
-- API Key: organization_ai_providers (provider_key='perplexity')
-- Modelo y features: organization_ai_defaults + organization_ai_modules

-- 1. Añadir columnas a organization_ai_defaults para Perplexity
ALTER TABLE public.organization_ai_defaults
  ADD COLUMN IF NOT EXISTS perplexity_model TEXT DEFAULT 'llama-3.1-sonar-large-128k-online',
  ADD COLUMN IF NOT EXISTS perplexity_features JSONB DEFAULT '{"scripts": true, "research": true, "board": false, "talent": false, "live": false}'::jsonb;

COMMENT ON COLUMN public.organization_ai_defaults.perplexity_model IS 'Modelo de Perplexity preferido';
COMMENT ON COLUMN public.organization_ai_defaults.perplexity_features IS 'Dónde habilitar Perplexity: scripts, research, board, talent, live';

-- 2. Añadir columna config a organization_ai_modules (si no existe)
ALTER TABLE public.organization_ai_modules
  ADD COLUMN IF NOT EXISTS config JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.organization_ai_modules.config IS 'Configuración adicional del módulo (ej. features para research.perplexity)';

-- 3. Insertar módulo research.perplexity para cada organización
INSERT INTO public.organization_ai_modules (
  organization_id,
  module_key,
  module_name,
  description,
  is_active,
  provider,
  model,
  config
)
SELECT 
  o.id,
  'research.perplexity',
  'Perplexity - Investigación en Tiempo Real',
  'Búsquedas de tendencias, hooks y análisis competitivo con Perplexity',
  false,
  'perplexity',
  'llama-3.1-sonar-large-128k-online',
  '{"features": {"scripts": true, "research": true, "board": false, "talent": false, "live": false}}'::jsonb
FROM public.organizations o
WHERE NOT EXISTS (
  SELECT 1 FROM public.organization_ai_modules m
  WHERE m.organization_id = o.id AND m.module_key = 'research.perplexity'
);

-- 4. Crear entradas en organization_ai_providers para Perplexity (para que puedan guardar API key)
INSERT INTO public.organization_ai_providers (
  organization_id,
  provider_key,
  is_enabled,
  available_models
)
SELECT 
  o.id,
  'perplexity',
  false,
  ARRAY['llama-3.1-sonar-small-128k-online', 'llama-3.1-sonar-large-128k-online', 'llama-3.1-sonar-huge-128k-online']
FROM public.organizations o
WHERE NOT EXISTS (
  SELECT 1 FROM public.organization_ai_providers p
  WHERE p.organization_id = o.id AND p.provider_key = 'perplexity'
);
