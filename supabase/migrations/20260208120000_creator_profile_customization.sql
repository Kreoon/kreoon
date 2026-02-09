-- Migration: Add customization columns to creator_profiles and ensure portfolio_items schema
-- Date: 2026-02-08

-- Add profile customization JSONB to creator_profiles
ALTER TABLE public.creator_profiles ADD COLUMN IF NOT EXISTS profile_customization JSONB DEFAULT '{}';
ALTER TABLE public.creator_profiles ADD COLUMN IF NOT EXISTS showreel_video_id TEXT;
ALTER TABLE public.creator_profiles ADD COLUMN IF NOT EXISTS showreel_url TEXT;
ALTER TABLE public.creator_profiles ADD COLUMN IF NOT EXISTS showreel_thumbnail TEXT;

-- portfolio_items already has: is_featured, display_order, is_public (from 20260208100000)
-- creator_services already has: packages via deliverables JSONB, display_order, is_featured (from 20260204000000)
