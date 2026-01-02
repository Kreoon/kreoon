-- Add column to store full AI analysis as JSON
ALTER TABLE public.content
ADD COLUMN IF NOT EXISTS ai_analysis_data JSONB DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.content.ai_analysis_data IS 'Stores the complete AI analysis result as JSON for persistence';