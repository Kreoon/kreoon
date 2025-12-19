-- Agregar campo para el embed de Bunny.net
ALTER TABLE public.content 
ADD COLUMN IF NOT EXISTS bunny_embed_url text;

-- Agregar campo para trackear estado de procesamiento
ALTER TABLE public.content 
ADD COLUMN IF NOT EXISTS video_processing_status text DEFAULT 'none' 
CHECK (video_processing_status IN ('none', 'pending', 'processing', 'completed', 'failed'));

-- Agregar timestamp de cuando se inició el procesamiento
ALTER TABLE public.content 
ADD COLUMN IF NOT EXISTS video_processing_started_at timestamp with time zone;