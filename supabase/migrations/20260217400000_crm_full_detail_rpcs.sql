-- =====================================================
-- CRM Full Detail RPCs + Custom Field Definitions
-- =====================================================

-- 1. Custom field definitions table
CREATE TABLE IF NOT EXISTS crm_custom_field_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('user', 'creator', 'org_creator', 'contact', 'lead')),
  name TEXT NOT NULL,
  field_type TEXT NOT NULL CHECK (field_type IN ('text','textarea','number','date','datetime','select','multiselect','checkbox','currency','url','email','phone','rating','color','tags')),
  options TEXT[] DEFAULT NULL,
  is_required BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crm_cf_defs_org_entity
  ON crm_custom_field_definitions(organization_id, entity_type)
  WHERE is_active = TRUE;

ALTER TABLE crm_custom_field_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_members_can_read_crm_cf_defs"
  ON crm_custom_field_definitions FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "org_admins_can_insert_crm_cf_defs"
  ON crm_custom_field_definitions FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT om.organization_id FROM organization_members om
      JOIN organization_member_roles omr ON omr.user_id = om.user_id AND omr.organization_id = om.organization_id
      WHERE om.user_id = auth.uid() AND omr.role IN ('admin', 'team_leader')
    )
  );

CREATE POLICY "org_admins_can_update_crm_cf_defs"
  ON crm_custom_field_definitions FOR UPDATE
  USING (
    organization_id IN (
      SELECT om.organization_id FROM organization_members om
      JOIN organization_member_roles omr ON omr.user_id = om.user_id AND omr.organization_id = om.organization_id
      WHERE om.user_id = auth.uid() AND omr.role IN ('admin', 'team_leader')
    )
  );

CREATE POLICY "org_admins_can_delete_crm_cf_defs"
  ON crm_custom_field_definitions FOR DELETE
  USING (
    organization_id IN (
      SELECT om.organization_id FROM organization_members om
      JOIN organization_member_roles omr ON omr.user_id = om.user_id AND omr.organization_id = om.organization_id
      WHERE om.user_id = auth.uid() AND omr.role IN ('admin', 'team_leader')
    )
  );

GRANT ALL ON crm_custom_field_definitions TO authenticated;

-- 2. Add custom_fields JSONB to profiles and org_creator_relationships
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS crm_custom_fields JSONB DEFAULT '{}';
ALTER TABLE org_creator_relationships ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}';

-- =====================================================
-- 3. get_full_user_detail(p_user_id) - comprehensive user data
-- =====================================================
CREATE OR REPLACE FUNCTION get_full_user_detail(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    -- profiles
    'id', p.id,
    'email', p.email,
    'full_name', p.full_name,
    'username', p.username,
    'avatar_url', p.avatar_url,
    'phone', p.phone,
    'bio', p.bio,
    'tagline', p.tagline,
    'cover_url', p.cover_url,
    'document_type', p.document_type,
    'document_number', p.document_number,
    'address', p.address,
    'city', p.city,
    'country', p.country,
    'instagram', p.instagram,
    'tiktok', p.tiktok,
    'facebook', p.facebook,
    'social_linkedin', p.social_linkedin,
    'social_twitter', p.social_twitter,
    'social_youtube', p.social_youtube,
    'portfolio_url', p.portfolio_url,
    'featured_video_url', p.featured_video_url,
    'experience_level', p.experience_level,
    'availability_status', p.availability_status,
    'best_at', p.best_at,
    'content_categories', COALESCE(p.content_categories, ARRAY[]::TEXT[]),
    'specialties_tags', COALESCE(p.specialties_tags, ARRAY[]::TEXT[]),
    'style_keywords', COALESCE(p.style_keywords, ARRAY[]::TEXT[]),
    'industries', COALESCE(p.industries, ARRAY[]::TEXT[]),
    'interests', COALESCE(p.interests, ARRAY[]::TEXT[]),
    'languages', COALESCE(p.languages, ARRAY[]::TEXT[]),
    'rate_per_content', p.rate_per_content,
    'rate_currency', p.rate_currency,
    'quality_score_avg', p.quality_score_avg,
    'reliability_score', p.reliability_score,
    'velocity_score', p.velocity_score,
    'editor_rating', p.editor_rating,
    'is_ambassador', COALESCE(p.is_ambassador, false),
    'is_platform_founder', COALESCE(p.is_platform_founder, false),
    'founder_badge_type', p.founder_badge_type,
    'active_role', p.active_role,
    'ai_recommended_level', p.ai_recommended_level,
    'ai_risk_flag', p.ai_risk_flag,
    'is_active', COALESCE(p.is_active, true),
    'crm_custom_fields', COALESCE(p.crm_custom_fields, '{}'::jsonb),
    'created_at', p.created_at,
    -- creator_profiles (nullable)
    'creator_profile_id', cp.id,
    'slug', cp.slug,
    'bio_full', cp.bio_full,
    'banner_url', cp.banner_url,
    'creator_social_links', cp.social_links,
    'level', cp.level,
    'is_verified', COALESCE(cp.is_verified, false),
    'is_available', COALESCE(cp.is_available, false),
    'rating_avg', COALESCE(cp.rating_avg, 0),
    'rating_count', COALESCE(cp.rating_count, 0),
    'completed_projects', COALESCE(cp.completed_projects, 0),
    'base_price', cp.base_price,
    'currency', COALESCE(cp.currency, 'USD'),
    'categories', COALESCE(cp.categories, ARRAY[]::TEXT[]),
    'content_types', COALESCE(cp.content_types, ARRAY[]::TEXT[]),
    'platforms', COALESCE(cp.platforms, ARRAY[]::TEXT[]),
    'marketplace_roles', COALESCE(cp.marketplace_roles, ARRAY[]::TEXT[]),
    'accepts_product_exchange', COALESCE(cp.accepts_product_exchange, false),
    'response_time_hours', cp.response_time_hours,
    'on_time_delivery_pct', cp.on_time_delivery_pct,
    'repeat_clients_pct', cp.repeat_clients_pct,
    'showreel_video_id', cp.showreel_video_id,
    'showreel_url', cp.showreel_url,
    'showreel_thumbnail', cp.showreel_thumbnail,
    -- health
    'health_score', COALESCE(h.health_score, 0),
    'health_status', COALESCE(h.health_status, 'healthy'),
    'total_logins', COALESCE(h.total_logins, 0),
    'days_since_last_activity', h.days_since_last_activity,
    'last_login_at', h.last_login_at,
    'total_actions', COALESCE(
      (SELECT COUNT(*) FROM auth.sessions WHERE user_id = p_user_id)::int, 0
    ),
    'needs_attention', COALESCE(h.needs_attention, false),
    'total_applications', COALESCE(h.total_applications, 0),
    'total_completed_projects', COALESCE(h.total_completed_projects, 0),
    'total_spent', COALESCE(h.total_spent, 0),
    -- org context
    'organization_id', om.organization_id,
    'organization_name', o.name,
    'is_owner', COALESCE(om.is_owner, false),
    'ambassador_level', om.ambassador_level,
    -- nested arrays
    'roles', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'role', omr.role,
        'organization_id', omr.organization_id,
        'organization_name', o2.name
      ))
      FROM organization_member_roles omr
      LEFT JOIN organizations o2 ON o2.id = omr.organization_id
      WHERE omr.user_id = p_user_id
    ), '[]'::jsonb),
    'badges', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'badge', omb.badge,
        'level', omb.level,
        'is_active', omb.is_active,
        'granted_at', omb.granted_at
      ))
      FROM organization_member_badges omb
      WHERE omb.user_id = p_user_id AND omb.is_active = true
    ), '[]'::jsonb),
    'portfolio', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', pi.id,
        'title', pi.title,
        'media_type', pi.media_type,
        'media_url', pi.media_url,
        'thumbnail_url', pi.thumbnail_url,
        'bunny_video_id', pi.bunny_video_id,
        'category', pi.category,
        'is_featured', pi.is_featured
      ) ORDER BY pi.is_featured DESC, pi.display_order ASC)
      FROM portfolio_items pi
      WHERE pi.creator_id = cp.id AND pi.is_public = true
      LIMIT 12
    ), '[]'::jsonb),
    'services', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', cs.id,
        'title', cs.title,
        'service_type', cs.service_type,
        'price_type', cs.price_type,
        'price_amount', cs.price_amount,
        'price_currency', cs.price_currency,
        'delivery_days', cs.delivery_days,
        'is_featured', cs.is_featured
      ) ORDER BY cs.is_featured DESC, cs.display_order ASC)
      FROM creator_services cs
      WHERE cs.user_id = p_user_id AND cs.is_active = true
    ), '[]'::jsonb)
  ) INTO result
  FROM profiles p
  LEFT JOIN creator_profiles cp ON cp.user_id = p.id
  LEFT JOIN platform_user_health h ON h.user_id = p.id
  LEFT JOIN organization_members om ON om.user_id = p.id
    AND om.organization_id = p.current_organization_id
  LEFT JOIN organizations o ON o.id = om.organization_id
  WHERE p.id = p_user_id;

  RETURN result;
END;
$$;

-- =====================================================
-- 4. get_full_creator_detail(p_creator_profile_id) - comprehensive creator data
-- =====================================================
CREATE OR REPLACE FUNCTION get_full_creator_detail(p_creator_profile_id UUID)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    -- profiles
    'id', p.id,
    'email', p.email,
    'full_name', p.full_name,
    'username', p.username,
    'avatar_url', p.avatar_url,
    'phone', p.phone,
    'bio', p.bio,
    'tagline', p.tagline,
    'cover_url', p.cover_url,
    'city', p.city,
    'country', p.country,
    'instagram', p.instagram,
    'tiktok', p.tiktok,
    'facebook', p.facebook,
    'social_linkedin', p.social_linkedin,
    'social_twitter', p.social_twitter,
    'social_youtube', p.social_youtube,
    'portfolio_url', p.portfolio_url,
    'featured_video_url', p.featured_video_url,
    'experience_level', p.experience_level,
    'availability_status', p.availability_status,
    'best_at', p.best_at,
    'content_categories', COALESCE(p.content_categories, ARRAY[]::TEXT[]),
    'specialties_tags', COALESCE(p.specialties_tags, ARRAY[]::TEXT[]),
    'style_keywords', COALESCE(p.style_keywords, ARRAY[]::TEXT[]),
    'industries', COALESCE(p.industries, ARRAY[]::TEXT[]),
    'interests', COALESCE(p.interests, ARRAY[]::TEXT[]),
    'languages', COALESCE(p.languages, ARRAY[]::TEXT[]),
    'rate_per_content', p.rate_per_content,
    'rate_currency', p.rate_currency,
    'quality_score_avg', p.quality_score_avg,
    'reliability_score', p.reliability_score,
    'velocity_score', p.velocity_score,
    'editor_rating', p.editor_rating,
    'active_role', p.active_role,
    'is_ambassador', COALESCE(p.is_ambassador, false),
    'crm_custom_fields', COALESCE(p.crm_custom_fields, '{}'::jsonb),
    'profile_created_at', p.created_at,
    -- creator_profiles
    'creator_profile_id', cp.id,
    'user_id', cp.user_id,
    'slug', cp.slug,
    'display_name', cp.display_name,
    'bio_full', cp.bio_full,
    'banner_url', cp.banner_url,
    'location_city', cp.location_city,
    'location_country', cp.location_country,
    'country_flag', cp.country_flag,
    'creator_social_links', cp.social_links,
    'level', cp.level,
    'is_verified', COALESCE(cp.is_verified, false),
    'is_available', COALESCE(cp.is_available, false),
    'is_active', COALESCE(cp.is_active, true),
    'rating_avg', COALESCE(cp.rating_avg, 0),
    'rating_count', COALESCE(cp.rating_count, 0),
    'completed_projects', COALESCE(cp.completed_projects, 0),
    'base_price', cp.base_price,
    'currency', COALESCE(cp.currency, 'USD'),
    'categories', COALESCE(cp.categories, ARRAY[]::TEXT[]),
    'content_types', COALESCE(cp.content_types, ARRAY[]::TEXT[]),
    'platforms', COALESCE(cp.platforms, ARRAY[]::TEXT[]),
    'marketplace_roles', COALESCE(cp.marketplace_roles, ARRAY[]::TEXT[]),
    'accepts_product_exchange', COALESCE(cp.accepts_product_exchange, false),
    'exchange_conditions', cp.exchange_conditions,
    'response_time_hours', cp.response_time_hours,
    'on_time_delivery_pct', cp.on_time_delivery_pct,
    'repeat_clients_pct', cp.repeat_clients_pct,
    'showreel_video_id', cp.showreel_video_id,
    'showreel_url', cp.showreel_url,
    'showreel_thumbnail', cp.showreel_thumbnail,
    'created_at', cp.created_at,
    -- total earned
    'total_earned', COALESCE((
      SELECT SUM(mp.creator_payout)
      FROM marketplace_projects mp
      WHERE mp.creator_id = cp.user_id AND mp.status = 'completed'
    ), 0),
    -- portfolio
    'portfolio', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', pi.id,
        'title', pi.title,
        'media_type', pi.media_type,
        'media_url', pi.media_url,
        'thumbnail_url', pi.thumbnail_url,
        'bunny_video_id', pi.bunny_video_id,
        'category', pi.category,
        'is_featured', pi.is_featured
      ) ORDER BY pi.is_featured DESC, pi.display_order ASC)
      FROM portfolio_items pi
      WHERE pi.creator_id = cp.id AND pi.is_public = true
      LIMIT 12
    ), '[]'::jsonb),
    -- services
    'services', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', cs.id,
        'title', cs.title,
        'service_type', cs.service_type,
        'price_type', cs.price_type,
        'price_amount', cs.price_amount,
        'price_currency', cs.price_currency,
        'delivery_days', cs.delivery_days,
        'is_featured', cs.is_featured
      ) ORDER BY cs.is_featured DESC, cs.display_order ASC)
      FROM creator_services cs
      WHERE cs.user_id = cp.user_id AND cs.is_active = true
    ), '[]'::jsonb)
  ) INTO result
  FROM creator_profiles cp
  JOIN profiles p ON p.id = cp.user_id
  WHERE cp.id = p_creator_profile_id;

  RETURN result;
END;
$$;

-- =====================================================
-- 5. get_org_creator_full_detail(p_org_id, p_creator_id) - org relationship + full creator
-- =====================================================
CREATE OR REPLACE FUNCTION get_org_creator_full_detail(p_org_id UUID, p_creator_id UUID)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    -- relationship
    'relationship_id', r.id,
    'relationship_type', r.relationship_type,
    'times_worked_together', r.times_worked_together,
    'total_paid', r.total_paid,
    'average_rating_given', r.average_rating_given,
    'last_collaboration_at', r.last_collaboration_at,
    'internal_notes', r.internal_notes,
    'internal_tags', r.internal_tags,
    'list_name', r.list_name,
    'custom_fields', COALESCE(r.custom_fields, '{}'::jsonb),
    'relationship_created_at', r.created_at,
    -- profiles
    'id', p.id,
    'email', p.email,
    'full_name', p.full_name,
    'username', p.username,
    'avatar_url', p.avatar_url,
    'phone', p.phone,
    'bio', p.bio,
    'tagline', p.tagline,
    'cover_url', p.cover_url,
    'city', p.city,
    'country', p.country,
    'instagram', p.instagram,
    'tiktok', p.tiktok,
    'facebook', p.facebook,
    'social_linkedin', p.social_linkedin,
    'social_twitter', p.social_twitter,
    'social_youtube', p.social_youtube,
    'portfolio_url', p.portfolio_url,
    'experience_level', p.experience_level,
    'content_categories', COALESCE(p.content_categories, ARRAY[]::TEXT[]),
    'specialties_tags', COALESCE(p.specialties_tags, ARRAY[]::TEXT[]),
    'languages', COALESCE(p.languages, ARRAY[]::TEXT[]),
    -- creator_profiles
    'creator_profile_id', cp.id,
    'slug', cp.slug,
    'display_name', cp.display_name,
    'bio_full', cp.bio_full,
    'banner_url', cp.banner_url,
    'location_city', cp.location_city,
    'location_country', cp.location_country,
    'country_flag', cp.country_flag,
    'creator_social_links', cp.social_links,
    'level', cp.level,
    'is_verified', COALESCE(cp.is_verified, false),
    'is_available', COALESCE(cp.is_available, false),
    'is_active', COALESCE(cp.is_active, true),
    'rating_avg', COALESCE(cp.rating_avg, 0),
    'rating_count', COALESCE(cp.rating_count, 0),
    'completed_projects', COALESCE(cp.completed_projects, 0),
    'base_price', cp.base_price,
    'currency', COALESCE(cp.currency, 'USD'),
    'categories', COALESCE(cp.categories, ARRAY[]::TEXT[]),
    'content_types', COALESCE(cp.content_types, ARRAY[]::TEXT[]),
    'platforms', COALESCE(cp.platforms, ARRAY[]::TEXT[]),
    'marketplace_roles', COALESCE(cp.marketplace_roles, ARRAY[]::TEXT[]),
    'accepts_product_exchange', COALESCE(cp.accepts_product_exchange, false),
    'response_time_hours', cp.response_time_hours,
    'on_time_delivery_pct', cp.on_time_delivery_pct,
    'repeat_clients_pct', cp.repeat_clients_pct,
    'showreel_video_id', cp.showreel_video_id,
    'showreel_url', cp.showreel_url,
    'showreel_thumbnail', cp.showreel_thumbnail,
    'created_at', cp.created_at,
    -- portfolio
    'portfolio', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', pi.id,
        'title', pi.title,
        'media_type', pi.media_type,
        'media_url', pi.media_url,
        'thumbnail_url', pi.thumbnail_url,
        'bunny_video_id', pi.bunny_video_id,
        'category', pi.category,
        'is_featured', pi.is_featured
      ) ORDER BY pi.is_featured DESC, pi.display_order ASC)
      FROM portfolio_items pi
      WHERE pi.creator_id = cp.id AND pi.is_public = true
      LIMIT 12
    ), '[]'::jsonb),
    -- services
    'services', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', cs.id,
        'title', cs.title,
        'service_type', cs.service_type,
        'price_type', cs.price_type,
        'price_amount', cs.price_amount,
        'price_currency', cs.price_currency,
        'delivery_days', cs.delivery_days,
        'is_featured', cs.is_featured
      ) ORDER BY cs.is_featured DESC, cs.display_order ASC)
      FROM creator_services cs
      WHERE cs.user_id = cp.user_id AND cs.is_active = true
    ), '[]'::jsonb)
  ) INTO result
  FROM org_creator_relationships r
  JOIN profiles p ON p.id = r.creator_id
  LEFT JOIN creator_profiles cp ON cp.user_id = r.creator_id
  WHERE r.organization_id = p_org_id AND r.creator_id = p_creator_id
  ORDER BY r.created_at DESC
  LIMIT 1;

  RETURN result;
END;
$$;

-- Grant execute
GRANT EXECUTE ON FUNCTION get_full_user_detail(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_full_creator_detail(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_org_creator_full_detail(UUID, UUID) TO authenticated;
