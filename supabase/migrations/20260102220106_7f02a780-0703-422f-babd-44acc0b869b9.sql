-- =====================================================
-- MIGRACIÓN: Método Esfera - Reemplazar TOFU/MOFU/BOFU
-- =====================================================

-- 1. Crear enum sphere_phase
DO $$ BEGIN
    CREATE TYPE sphere_phase AS ENUM ('engage', 'solution', 'remarketing', 'fidelize');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- 2. Agregar columna sphere_phase a content (reemplaza funnel_stage)
ALTER TABLE public.content
ADD COLUMN IF NOT EXISTS sphere_phase sphere_phase DEFAULT 'engage';

-- 3. Migrar datos existentes de funnel_stage a sphere_phase
UPDATE public.content
SET sphere_phase = CASE 
    WHEN funnel_stage = 'tofu' THEN 'engage'::sphere_phase
    WHEN funnel_stage = 'mofu' THEN 'solution'::sphere_phase
    WHEN funnel_stage = 'bofu' THEN 'remarketing'::sphere_phase
    ELSE 'engage'::sphere_phase
END
WHERE sphere_phase IS NULL OR funnel_stage IS NOT NULL;

-- 4. Actualizar marketing_strategies: agregar columnas Esfera
ALTER TABLE public.marketing_strategies
ADD COLUMN IF NOT EXISTS esfera_engage JSONB DEFAULT '{
    "description": "",
    "objective": "Captar atención y generar clic",
    "content_types": ["hooks_disruptivos", "problemas_visibles", "patrones_rotos"],
    "metrics": ["ctr", "scroll", "retencion_inicial"],
    "tactics": [],
    "angles": []
}'::jsonb,
ADD COLUMN IF NOT EXISTS esfera_solution JSONB DEFAULT '{
    "description": "",
    "objective": "Demostrar que el producto elimina el dolor",
    "content_types": ["casos_uso", "demostraciones", "storytelling_transformacion"],
    "metrics": ["leads", "watch_time", "intencion"],
    "tactics": [],
    "angles": []
}'::jsonb,
ADD COLUMN IF NOT EXISTS esfera_remarketing JSONB DEFAULT '{
    "description": "",
    "objective": "Reimpactar usuarios tibios",
    "content_types": ["prueba_social", "objeciones", "comparativas"],
    "metrics": ["conversion", "cpa", "roas"],
    "tactics": [],
    "angles": []
}'::jsonb,
ADD COLUMN IF NOT EXISTS esfera_fidelize JSONB DEFAULT '{
    "description": "",
    "objective": "Aumentar LTV y comunidad",
    "content_types": ["educacion", "comunidad", "upsells", "referidos"],
    "metrics": ["recompra", "engagement_recurrente", "retencion"],
    "tactics": [],
    "angles": []
}'::jsonb;

-- 5. Migrar datos existentes de TOFU/MOFU/BOFU a Esfera
UPDATE public.marketing_strategies
SET 
    esfera_engage = COALESCE(funnel_tofu, '{}'::jsonb) || '{"objective": "Captar atención y generar clic"}'::jsonb,
    esfera_solution = COALESCE(funnel_mofu, '{}'::jsonb) || '{"objective": "Demostrar que el producto elimina el dolor"}'::jsonb,
    esfera_remarketing = COALESCE(funnel_bofu, '{}'::jsonb) || '{"objective": "Reimpactar usuarios tibios"}'::jsonb
WHERE funnel_tofu IS NOT NULL OR funnel_mofu IS NOT NULL OR funnel_bofu IS NOT NULL;

-- 6. Agregar sphere_phase a marketing_campaigns
ALTER TABLE public.marketing_campaigns
ADD COLUMN IF NOT EXISTS sphere_phase sphere_phase DEFAULT 'engage';

-- 7. Agregar sphere_phase a marketing_content_calendar
ALTER TABLE public.marketing_content_calendar
ADD COLUMN IF NOT EXISTS sphere_phase sphere_phase DEFAULT 'engage';

-- 8. Crear índices para mejorar performance
CREATE INDEX IF NOT EXISTS idx_content_sphere_phase ON public.content(sphere_phase);
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_sphere_phase ON public.marketing_campaigns(sphere_phase);
CREATE INDEX IF NOT EXISTS idx_marketing_calendar_sphere_phase ON public.marketing_content_calendar(sphere_phase);

-- 9. Agregar columnas de validación Esfera a content_strategy_reviews
ALTER TABLE public.content_strategy_reviews
ADD COLUMN IF NOT EXISTS coherent_with_esfera BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS sphere_phase_assigned sphere_phase;

-- 10. Comentarios de documentación
COMMENT ON COLUMN public.content.sphere_phase IS 'Fase del Método Esfera: engage, solution, remarketing, fidelize';
COMMENT ON COLUMN public.marketing_strategies.esfera_engage IS 'Estrategia para fase ENGANCHAR del Método Esfera';
COMMENT ON COLUMN public.marketing_strategies.esfera_solution IS 'Estrategia para fase SOLUCIÓN del Método Esfera';
COMMENT ON COLUMN public.marketing_strategies.esfera_remarketing IS 'Estrategia para fase REMARKETING del Método Esfera';
COMMENT ON COLUMN public.marketing_strategies.esfera_fidelize IS 'Estrategia para fase FIDELIZAR del Método Esfera';