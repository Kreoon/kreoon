-- Fix: Add missing prefill columns to content table (safe idempotent migration)
-- This migration uses DO blocks to safely add columns only if they don't exist

DO $$
BEGIN
    -- sphere_phase (may already exist but verify)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'content' AND column_name = 'sphere_phase') THEN
        ALTER TABLE public.content ADD COLUMN sphere_phase TEXT;
        RAISE NOTICE 'Added column: sphere_phase';
    END IF;

    -- funnel_stage
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'content' AND column_name = 'funnel_stage') THEN
        ALTER TABLE public.content ADD COLUMN funnel_stage TEXT;
        RAISE NOTICE 'Added column: funnel_stage';
    END IF;

    -- content_objective
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'content' AND column_name = 'content_objective') THEN
        ALTER TABLE public.content ADD COLUMN content_objective TEXT;
        RAISE NOTICE 'Added column: content_objective';
    END IF;

    -- cta
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'content' AND column_name = 'cta') THEN
        ALTER TABLE public.content ADD COLUMN cta TEXT;
        RAISE NOTICE 'Added column: cta';
    END IF;

    -- hooks_count
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'content' AND column_name = 'hooks_count') THEN
        ALTER TABLE public.content ADD COLUMN hooks_count INTEGER DEFAULT 3;
        RAISE NOTICE 'Added column: hooks_count';
    END IF;

    -- target_platform
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'content' AND column_name = 'target_platform') THEN
        ALTER TABLE public.content ADD COLUMN target_platform TEXT;
        RAISE NOTICE 'Added column: target_platform';
    END IF;

    -- strategist_guidelines
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'content' AND column_name = 'strategist_guidelines') THEN
        ALTER TABLE public.content ADD COLUMN strategist_guidelines TEXT;
        RAISE NOTICE 'Added column: strategist_guidelines';
    END IF;

    -- selected_pain
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'content' AND column_name = 'selected_pain') THEN
        ALTER TABLE public.content ADD COLUMN selected_pain TEXT;
        RAISE NOTICE 'Added column: selected_pain';
    END IF;

    -- selected_desire
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'content' AND column_name = 'selected_desire') THEN
        ALTER TABLE public.content ADD COLUMN selected_desire TEXT;
        RAISE NOTICE 'Added column: selected_desire';
    END IF;

    -- selected_objection
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'content' AND column_name = 'selected_objection') THEN
        ALTER TABLE public.content ADD COLUMN selected_objection TEXT;
        RAISE NOTICE 'Added column: selected_objection';
    END IF;

    -- target_country
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'content' AND column_name = 'target_country') THEN
        ALTER TABLE public.content ADD COLUMN target_country TEXT;
        RAISE NOTICE 'Added column: target_country';
    END IF;

    -- narrative_structure
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'content' AND column_name = 'narrative_structure') THEN
        ALTER TABLE public.content ADD COLUMN narrative_structure TEXT;
        RAISE NOTICE 'Added column: narrative_structure';
    END IF;

    -- video_duration
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'content' AND column_name = 'video_duration') THEN
        ALTER TABLE public.content ADD COLUMN video_duration TEXT;
        RAISE NOTICE 'Added column: video_duration';
    END IF;

    -- ideal_avatar
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'content' AND column_name = 'ideal_avatar') THEN
        ALTER TABLE public.content ADD COLUMN ideal_avatar TEXT;
        RAISE NOTICE 'Added column: ideal_avatar';
    END IF;

    -- sales_angle
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'content' AND column_name = 'sales_angle') THEN
        ALTER TABLE public.content ADD COLUMN sales_angle TEXT;
        RAISE NOTICE 'Added column: sales_angle';
    END IF;

    -- suggested_hooks (JSONB array)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'content' AND column_name = 'suggested_hooks') THEN
        ALTER TABLE public.content ADD COLUMN suggested_hooks JSONB DEFAULT '[]'::jsonb;
        RAISE NOTICE 'Added column: suggested_hooks';
    END IF;

    -- ai_prefilled
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'content' AND column_name = 'ai_prefilled') THEN
        ALTER TABLE public.content ADD COLUMN ai_prefilled BOOLEAN DEFAULT false;
        RAISE NOTICE 'Added column: ai_prefilled';
    END IF;

    -- ai_prefilled_at
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'content' AND column_name = 'ai_prefilled_at') THEN
        ALTER TABLE public.content ADD COLUMN ai_prefilled_at TIMESTAMP WITH TIME ZONE;
        RAISE NOTICE 'Added column: ai_prefilled_at';
    END IF;

END $$;

-- Ensure GRANT permissions for authenticated role
GRANT SELECT, INSERT, UPDATE ON public.content TO authenticated;

-- Create ai_assistant_config table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.ai_assistant_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    assistant_name TEXT NOT NULL DEFAULT 'Kiro',
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    model_provider TEXT DEFAULT 'gemini',
    model_name TEXT DEFAULT 'gemini-2.0-flash',
    system_prompt TEXT,
    temperature NUMERIC(3,2) DEFAULT 0.7,
    max_tokens INTEGER DEFAULT 2048,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id)
);

-- Enable RLS on ai_assistant_config
ALTER TABLE public.ai_assistant_config ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can read their org assistant config" ON public.ai_assistant_config;
DROP POLICY IF EXISTS "Admins can manage assistant config" ON public.ai_assistant_config;

-- Create RLS policies for ai_assistant_config
CREATE POLICY "Users can read their org assistant config"
ON public.ai_assistant_config FOR SELECT
TO authenticated
USING (
    organization_id IN (
        SELECT current_organization_id FROM public.profiles
        WHERE id = auth.uid()
    )
);

CREATE POLICY "Admins can manage assistant config"
ON public.ai_assistant_config FOR ALL
TO authenticated
USING (
    organization_id IN (
        SELECT current_organization_id FROM public.profiles
        WHERE id = auth.uid()
    )
);

-- Grant permissions on ai_assistant_config
GRANT SELECT, INSERT, UPDATE ON public.ai_assistant_config TO authenticated;
