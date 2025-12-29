-- Add AI model selection to tokenization config
ALTER TABLE public.ai_tokenization_config 
ADD COLUMN IF NOT EXISTS ai_model text NOT NULL DEFAULT 'google/gemini-2.5-flash';

-- Update existing record with default model
UPDATE public.ai_tokenization_config 
SET ai_model = 'google/gemini-2.5-flash' 
WHERE ai_model IS NULL;