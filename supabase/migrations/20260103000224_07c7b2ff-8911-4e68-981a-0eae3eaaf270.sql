-- Add structured brief fields to products table
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS brief_status TEXT DEFAULT 'pending' CHECK (brief_status IN ('pending', 'in_progress', 'completed')),
ADD COLUMN IF NOT EXISTS brief_completed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS brief_data JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS market_research JSONB,
ADD COLUMN IF NOT EXISTS competitor_analysis JSONB,
ADD COLUMN IF NOT EXISTS avatar_profiles JSONB,
ADD COLUMN IF NOT EXISTS sales_angles_data JSONB,
ADD COLUMN IF NOT EXISTS content_strategy JSONB,
ADD COLUMN IF NOT EXISTS research_generated_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS research_document_url TEXT;

-- Add index for brief status queries
CREATE INDEX IF NOT EXISTS idx_products_brief_status ON public.products(brief_status);

COMMENT ON COLUMN public.products.brief_status IS 'Estado del brief: pending, in_progress, completed';
COMMENT ON COLUMN public.products.brief_data IS 'Datos del brief estructurado (problema, solución, beneficios, etc)';
COMMENT ON COLUMN public.products.market_research IS 'Investigación de mercado generada por IA';
COMMENT ON COLUMN public.products.competitor_analysis IS 'Análisis de competencia generado por IA';
COMMENT ON COLUMN public.products.avatar_profiles IS 'Perfiles de avatar ideal generados por IA';
COMMENT ON COLUMN public.products.sales_angles_data IS 'Ángulos de venta estructurados generados por IA';
COMMENT ON COLUMN public.products.content_strategy IS 'Estrategia de contenido generada por IA';