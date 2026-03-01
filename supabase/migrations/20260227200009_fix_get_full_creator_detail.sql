-- Fix get_full_creator_detail: split jsonb_build_object to avoid 100 arg limit

CREATE OR REPLACE FUNCTION get_full_creator_detail(p_creator_profile_id UUID)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB;
  profile_data JSONB;
  creator_data JSONB;
  extra_data JSONB;
BEGIN
  -- Part 1: Profile fields
  SELECT jsonb_build_object(
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
    'profile_created_at', p.created_at
  ) INTO profile_data
  FROM creator_profiles cp
  JOIN profiles p ON p.id = cp.user_id
  WHERE cp.id = p_creator_profile_id;

  -- Part 2: Creator profile fields
  SELECT jsonb_build_object(
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
    'created_at', cp.created_at
  ) INTO creator_data
  FROM creator_profiles cp
  WHERE cp.id = p_creator_profile_id;

  -- Part 3: Aggregated data (total_earned, portfolio, services)
  SELECT jsonb_build_object(
    'total_earned', COALESCE((
      SELECT SUM(mp.creator_payout)
      FROM marketplace_projects mp
      WHERE mp.creator_id = cp.user_id AND mp.status = 'completed'
    ), 0),
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
      WHERE cs.user_id = cp.user_id AND cs.is_active = true
    ), '[]'::jsonb)
  ) INTO extra_data
  FROM creator_profiles cp
  WHERE cp.id = p_creator_profile_id;

  -- Combine all parts
  result := COALESCE(profile_data, '{}'::jsonb) ||
            COALESCE(creator_data, '{}'::jsonb) ||
            COALESCE(extra_data, '{}'::jsonb);

  RETURN result;
END;
$$;

-- Also fix get_full_user_detail which may have the same issue
CREATE OR REPLACE FUNCTION get_full_user_detail(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB;
  profile_data JSONB;
  creator_data JSONB;
  health_data JSONB;
  org_data JSONB;
  arrays_data JSONB;
BEGIN
  -- Part 1: Basic profile fields
  SELECT jsonb_build_object(
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
    'created_at', p.created_at
  ) INTO profile_data
  FROM profiles p
  WHERE p.id = p_user_id;

  -- Part 2: Creator profile fields (nullable)
  SELECT jsonb_build_object(
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
    'showreel_thumbnail', cp.showreel_thumbnail
  ) INTO creator_data
  FROM creator_profiles cp
  WHERE cp.user_id = p_user_id;

  -- Part 3: Health data
  SELECT jsonb_build_object(
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
    'total_spent', COALESCE(h.total_spent, 0)
  ) INTO health_data
  FROM platform_user_health h
  WHERE h.user_id = p_user_id;

  -- Part 4: Org context
  SELECT jsonb_build_object(
    'organization_id', om.organization_id,
    'organization_name', o.name,
    'is_owner', COALESCE(om.is_owner, false),
    'ambassador_level', om.ambassador_level
  ) INTO org_data
  FROM profiles p
  LEFT JOIN organization_members om ON om.user_id = p.id
    AND om.organization_id = p.current_organization_id
  LEFT JOIN organizations o ON o.id = om.organization_id
  WHERE p.id = p_user_id;

  -- Part 5: Nested arrays (roles, badges, portfolio, services)
  SELECT jsonb_build_object(
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
      JOIN creator_profiles cp ON cp.id = pi.creator_id
      WHERE cp.user_id = p_user_id AND pi.is_public = true
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
  ) INTO arrays_data;

  -- Combine all parts
  result := COALESCE(profile_data, '{}'::jsonb) ||
            COALESCE(creator_data, '{}'::jsonb) ||
            COALESCE(health_data, '{}'::jsonb) ||
            COALESCE(org_data, '{}'::jsonb) ||
            COALESCE(arrays_data, '{}'::jsonb);

  RETURN result;
END;
$$;
