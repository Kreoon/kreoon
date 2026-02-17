-- =====================================================
-- Migration: add_roles_categories_to_platform_leads
-- Adds 36-role + 6-category marketplace support to platform_leads
-- =====================================================

BEGIN;

-- =====================================================
-- 1. MIGRATE EXISTING DATA (before constraint change)
-- =====================================================
UPDATE platform_leads SET lead_type = 'talent'       WHERE lead_type = 'creator';
UPDATE platform_leads SET lead_type = 'organization'  WHERE lead_type = 'agency';

-- =====================================================
-- 2. DROP OLD CHECK, ADD NEW CHECK on lead_type
-- =====================================================
ALTER TABLE platform_leads
  DROP CONSTRAINT IF EXISTS platform_leads_lead_type_check;

ALTER TABLE platform_leads
  ADD CONSTRAINT platform_leads_lead_type_check
  CHECK (lead_type IN ('talent', 'brand', 'organization', 'other'));

-- =====================================================
-- 3. ADD NEW COLUMNS
-- =====================================================

-- Talent category (6 categories)
ALTER TABLE platform_leads
  ADD COLUMN IF NOT EXISTS talent_category TEXT
  CHECK (talent_category IN (
    'content_creation',
    'post_production',
    'strategy_marketing',
    'technology',
    'education',
    'client'
  ));

-- Specific role (36 roles)
ALTER TABLE platform_leads
  ADD COLUMN IF NOT EXISTS specific_role TEXT
  CHECK (specific_role IN (
    -- Content Creation (12)
    'ugc_creator', 'lifestyle_creator', 'micro_influencer', 'nano_influencer',
    'macro_influencer', 'brand_ambassador', 'live_streamer', 'podcast_host',
    'photographer', 'copywriter', 'graphic_designer', 'voice_artist',
    -- Post-Production (7)
    'video_editor', 'motion_graphics', 'sound_designer', 'colorist',
    'director', 'producer', 'animator_2d3d',
    -- Strategy & Marketing (10)
    'content_strategist', 'social_media_manager', 'community_manager',
    'digital_strategist', 'trafficker', 'seo_specialist', 'email_marketer',
    'growth_hacker', 'crm_specialist', 'conversion_optimizer',
    -- Technology (3)
    'web_developer', 'app_developer', 'ai_specialist',
    -- Education (2)
    'online_instructor', 'workshop_facilitator',
    -- Client (2)
    'brand_manager', 'marketing_director'
  ));

-- Talent subtype (creator vs editor vs both)
ALTER TABLE platform_leads
  ADD COLUMN IF NOT EXISTS talent_subtype TEXT
  CHECK (talent_subtype IN ('creator', 'editor', 'both'));

-- Registration intent
ALTER TABLE platform_leads
  ADD COLUMN IF NOT EXISTS registration_intent TEXT
  CHECK (registration_intent IN ('talent', 'brand', 'organization', 'join'));

-- Interests array
ALTER TABLE platform_leads
  ADD COLUMN IF NOT EXISTS interests TEXT[] DEFAULT '{}';

-- Experience level
ALTER TABLE platform_leads
  ADD COLUMN IF NOT EXISTS experience_level TEXT
  CHECK (experience_level IN ('beginner', 'intermediate', 'advanced', 'expert'));

-- Portfolio URL
ALTER TABLE platform_leads
  ADD COLUMN IF NOT EXISTS portfolio_url TEXT;

-- Social profiles JSONB
ALTER TABLE platform_leads
  ADD COLUMN IF NOT EXISTS social_profiles JSONB DEFAULT '{}';

-- City
ALTER TABLE platform_leads
  ADD COLUMN IF NOT EXISTS city TEXT;

-- Country (defaults to Colombia)
ALTER TABLE platform_leads
  ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'CO';

-- =====================================================
-- 4. NEW INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_platform_leads_talent_category
  ON platform_leads(talent_category);

CREATE INDEX IF NOT EXISTS idx_platform_leads_specific_role
  ON platform_leads(specific_role);

CREATE INDEX IF NOT EXISTS idx_platform_leads_registration_intent
  ON platform_leads(registration_intent);

CREATE INDEX IF NOT EXISTS idx_platform_leads_country
  ON platform_leads(country);

COMMIT;
