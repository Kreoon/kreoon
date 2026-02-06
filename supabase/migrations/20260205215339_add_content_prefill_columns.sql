-- Add prefill columns to content table for AI-powered script generator pre-population
-- These columns store intelligent suggestions generated from product research data

-- Selected pain point from product research
ALTER TABLE public.content ADD COLUMN IF NOT EXISTS selected_pain TEXT;

-- Selected desire from product research
ALTER TABLE public.content ADD COLUMN IF NOT EXISTS selected_desire TEXT;

-- Selected objection from product research
ALTER TABLE public.content ADD COLUMN IF NOT EXISTS selected_objection TEXT;

-- Target country for the content
ALTER TABLE public.content ADD COLUMN IF NOT EXISTS target_country TEXT;

-- Narrative structure selection (AIDA, PAS, BAB, etc.)
ALTER TABLE public.content ADD COLUMN IF NOT EXISTS narrative_structure TEXT;

-- Video duration setting
ALTER TABLE public.content ADD COLUMN IF NOT EXISTS video_duration TEXT;

-- Ideal avatar description from product research
ALTER TABLE public.content ADD COLUMN IF NOT EXISTS ideal_avatar TEXT;

-- AI-suggested hooks as JSONB array
ALTER TABLE public.content ADD COLUMN IF NOT EXISTS suggested_hooks JSONB DEFAULT '[]'::jsonb;

-- Flag to indicate if this content was pre-filled by AI
ALTER TABLE public.content ADD COLUMN IF NOT EXISTS ai_prefilled BOOLEAN DEFAULT false;

-- Timestamp when prefill was generated
ALTER TABLE public.content ADD COLUMN IF NOT EXISTS ai_prefilled_at TIMESTAMP WITH TIME ZONE;

-- Add comment for documentation
COMMENT ON COLUMN public.content.selected_pain IS 'AI-selected pain point from product research for script generation';
COMMENT ON COLUMN public.content.selected_desire IS 'AI-selected desire from product research for script generation';
COMMENT ON COLUMN public.content.selected_objection IS 'AI-selected objection from product research for script generation';
COMMENT ON COLUMN public.content.target_country IS 'Target country/market for the content';
COMMENT ON COLUMN public.content.narrative_structure IS 'Selected narrative structure (AIDA, PAS, BAB, etc.)';
COMMENT ON COLUMN public.content.video_duration IS 'Target video duration for the content';
COMMENT ON COLUMN public.content.ideal_avatar IS 'AI-selected ideal avatar description from product research';
COMMENT ON COLUMN public.content.suggested_hooks IS 'AI-generated hooks array based on research and sphere phase';
COMMENT ON COLUMN public.content.ai_prefilled IS 'Flag indicating if content was pre-filled by AI from research data';
COMMENT ON COLUMN public.content.ai_prefilled_at IS 'Timestamp when AI prefill was generated';
