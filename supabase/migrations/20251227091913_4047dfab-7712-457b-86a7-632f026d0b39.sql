-- Agregar columnas para el módulo "tablero" en organization_ai_defaults
ALTER TABLE public.organization_ai_defaults
ADD COLUMN IF NOT EXISTS tablero_provider TEXT,
ADD COLUMN IF NOT EXISTS tablero_model TEXT;