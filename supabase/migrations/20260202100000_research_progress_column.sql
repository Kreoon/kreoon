-- Columna para guardar progreso parcial del research por pasos
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS research_progress JSONB DEFAULT NULL;

COMMENT ON COLUMN public.products.research_progress IS 'Progreso parcial del research: { completed_steps: string[], partial_results: object, updated_at: string }';
