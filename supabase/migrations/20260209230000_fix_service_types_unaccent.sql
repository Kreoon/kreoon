-- Fix: unaccent(text) does not exist when creating a service
-- The generate_service_slug function (created outside migrations) calls unaccent().
-- Also: expand service_type CHECK constraint to support all marketplace roles.

-- 1. Install unaccent extension (fixes the immediate error)
CREATE EXTENSION IF NOT EXISTS unaccent SCHEMA public;

-- 2. Replace generate_service_slug to use unaccent extension
CREATE OR REPLACE FUNCTION public.generate_service_slug(p_title text)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  _slug text;
BEGIN
  _slug := public.unaccent(lower(trim(p_title)));
  _slug := regexp_replace(_slug, '[^a-z0-9]+', '-', 'g');
  _slug := regexp_replace(_slug, '^-|-$', '', 'g');
  _slug := left(_slug, 80);
  RETURN _slug;
END;
$$;

-- 3. Replace auto_generate_service_slug trigger function to be safe
CREATE OR REPLACE FUNCTION public.auto_generate_service_slug()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := public.generate_service_slug(NEW.title);
    -- Append random suffix for uniqueness
    NEW.slug := NEW.slug || '-' || substr(md5(random()::text), 1, 6);
  END IF;
  RETURN NEW;
END;
$$;

-- Ensure trigger exists
DROP TRIGGER IF EXISTS trigger_auto_service_slug ON public.creator_services;
CREATE TRIGGER trigger_auto_service_slug
  BEFORE INSERT ON public.creator_services
  FOR EACH ROW EXECUTE FUNCTION public.auto_generate_service_slug();

-- 4. Drop the old inline CHECK constraint on service_type
--    PostgreSQL names it: {table}_{column}_check
ALTER TABLE public.creator_services DROP CONSTRAINT IF EXISTS creator_services_service_type_check;

-- 5. Add expanded CHECK constraint covering all marketplace roles
ALTER TABLE public.creator_services ADD CONSTRAINT creator_services_service_type_check
  CHECK (service_type IN (
    -- Content Creation
    'ugc_video', 'ugc_photo', 'ugc_carousel', 'photography', 'live_streaming',
    'voice_over', 'script_writing', 'podcast_production', 'influencer_post', 'graphic_design',
    -- Post-Production
    'video_editing', 'motion_graphics', 'thumbnail_design', 'sound_design',
    'color_grading', 'animation_2d3d', 'creative_direction', 'audiovisual_production',
    -- Strategy & Marketing
    'social_management', 'content_strategy', 'community_management', 'digital_strategy',
    'paid_advertising', 'seo_sem', 'email_marketing', 'growth_hacking',
    'crm_management', 'conversion_optimization',
    -- Technology
    'web_development', 'app_development', 'ai_automation',
    -- Education
    'online_courses', 'workshops',
    -- General
    'consulting', 'custom'
  ));

-- Grant
GRANT EXECUTE ON FUNCTION public.generate_service_slug(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.auto_generate_service_slug() TO authenticated;
