-- =====================================================
-- Corregir query de estadísticas financieras
-- Migration: 20260305730000_fix_financial_stats_query
-- =====================================================

DROP FUNCTION IF EXISTS get_full_user_detail(UUID);

CREATE OR REPLACE FUNCTION get_full_user_detail(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB;
  profile_base JSONB;
  profile_social JSONB;
  profile_extras JSONB;
  creator_data JSONB;
  health_data JSONB;
  financial_data JSONB;
  org_data JSONB;
  arrays_data JSONB;
  v_creator_profile_id UUID;
  v_wallet_id UUID;
  v_total_applications INTEGER := 0;
  v_total_completed INTEGER := 0;
  v_total_earned DECIMAL := 0;
  v_total_spent DECIMAL := 0;
  v_wallet_balance DECIMAL := 0;
BEGIN
  -- Get creator_profile_id for this user
  SELECT id INTO v_creator_profile_id
  FROM creator_profiles WHERE user_id = p_user_id;

  -- Get wallet_id for this user
  SELECT id, available_balance INTO v_wallet_id, v_wallet_balance
  FROM wallets WHERE user_id = p_user_id LIMIT 1;

  -- Calculate total applications
  IF v_creator_profile_id IS NOT NULL THEN
    SELECT COUNT(*) INTO v_total_applications
    FROM campaign_applications
    WHERE creator_id = v_creator_profile_id;
  END IF;

  -- Calculate completed projects from creator_profiles
  SELECT COALESCE(completed_projects, 0) INTO v_total_completed
  FROM creator_profiles WHERE user_id = p_user_id;

  -- Calculate total earned from wallet transactions (via wallet_id)
  IF v_wallet_id IS NOT NULL THEN
    SELECT COALESCE(SUM(amount), 0) INTO v_total_earned
    FROM wallet_transactions
    WHERE wallet_id = v_wallet_id
      AND transaction_type IN ('deposit', 'transfer_in', 'escrow_release', 'refund');

    -- Calculate total spent from wallet transactions
    SELECT COALESCE(SUM(amount), 0) INTO v_total_spent
    FROM wallet_transactions
    WHERE wallet_id = v_wallet_id
      AND transaction_type IN ('withdrawal', 'transfer_out', 'escrow_hold', 'fee');
  END IF;

  -- Also check creator_wallet_transactions if creator exists
  IF v_total_earned = 0 AND v_creator_profile_id IS NOT NULL THEN
    SELECT COALESCE(SUM(amount), 0) INTO v_total_earned
    FROM creator_wallet_transactions
    WHERE creator_id = p_user_id
      AND transaction_type IN ('earning', 'bonus', 'referral_bonus');

    SELECT COALESCE(SUM(amount), 0) INTO v_total_spent
    FROM creator_wallet_transactions
    WHERE creator_id = p_user_id
      AND transaction_type IN ('payout_request', 'withdrawal', 'fee');
  END IF;

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
    'nationality', p.nationality,
    'date_of_birth', p.date_of_birth,
    'gender', p.gender,
    'onboarding_completed', COALESCE(p.onboarding_completed, false),
    'created_at', p.created_at
  ) INTO profile_base
  FROM profiles p WHERE p.id = p_user_id;

  -- Part 2: Social links and content preferences
  SELECT jsonb_build_object(
    'instagram', p.instagram,
    'tiktok', p.tiktok,
    'facebook', p.facebook,
    'social_linkedin', p.social_linkedin,
    'social_twitter', p.social_twitter,
    'social_youtube', p.social_youtube,
    'social_instagram', p.social_instagram,
    'social_facebook', p.social_facebook,
    'social_tiktok', p.social_tiktok,
    'social_x', p.social_x,
    'portfolio_url', p.portfolio_url,
    'featured_video_url', p.featured_video_url,
    'content_categories', COALESCE(p.content_categories, ARRAY[]::TEXT[]),
    'specialties_tags', COALESCE(p.specialties_tags, ARRAY[]::TEXT[]),
    'style_keywords', COALESCE(p.style_keywords, ARRAY[]::TEXT[]),
    'industries', COALESCE(p.industries, ARRAY[]::TEXT[]),
    'interests', COALESCE(p.interests, ARRAY[]::TEXT[]),
    'languages', COALESCE(p.languages, ARRAY[]::TEXT[])
  ) INTO profile_social
  FROM profiles p WHERE p.id = p_user_id;

  -- Part 3: Profile extras (scores, flags)
  SELECT jsonb_build_object(
    'experience_level', p.experience_level,
    'availability_status', p.availability_status,
    'best_at', p.best_at,
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
    'is_banned', COALESCE(p.is_banned, false),
    'is_platform_admin', COALESCE(p.is_platform_admin, false),
    'crm_custom_fields', COALESCE(p.crm_custom_fields, '{}'::jsonb)
  ) INTO profile_extras
  FROM profiles p WHERE p.id = p_user_id;

  -- Part 4: Creator profile data
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
  FROM profiles p
  LEFT JOIN creator_profiles cp ON cp.user_id = p.id
  WHERE p.id = p_user_id;

  -- Part 5: Health data (from table + calculated)
  SELECT jsonb_build_object(
    'health_score', COALESCE(h.health_score, 50),
    'health_status', COALESCE(h.health_status, 'healthy'),
    'total_logins', COALESCE(h.total_logins, 1),
    'days_since_last_activity', COALESCE(h.days_since_last_activity, 0),
    'last_login_at', h.last_login_at,
    'total_actions', 0,
    'needs_attention', COALESCE(h.needs_attention, false),
    'total_applications', v_total_applications,
    'total_completed_projects', v_total_completed,
    'total_spent', v_total_spent
  ) INTO health_data
  FROM profiles p
  LEFT JOIN platform_user_health h ON h.user_id = p.id
  WHERE p.id = p_user_id;

  -- Part 6: Financial data (calculated)
  financial_data := jsonb_build_object(
    'total_earned', v_total_earned,
    'total_spent', v_total_spent,
    'wallet_balance', v_wallet_balance,
    'total_applications', v_total_applications,
    'total_completed_projects', v_total_completed,
    'net_balance', v_total_earned - v_total_spent,
    'avg_per_project', CASE WHEN v_total_completed > 0 THEN v_total_earned / v_total_completed ELSE 0 END,
    'conversion_rate', CASE WHEN v_total_applications > 0 THEN (v_total_completed::DECIMAL / v_total_applications) * 100 ELSE 0 END
  );

  -- Part 7: Organization context
  SELECT jsonb_build_object(
    'organization_id', om.organization_id,
    'organization_name', o.name,
    'is_owner', COALESCE(om.is_owner, false),
    'ambassador_level', om.ambassador_level
  ) INTO org_data
  FROM profiles p
  LEFT JOIN organization_members om ON om.user_id = p.id AND om.organization_id = p.current_organization_id
  LEFT JOIN organizations o ON o.id = om.organization_id
  WHERE p.id = p_user_id;

  -- Part 8: Nested arrays
  SELECT jsonb_build_object(
    'organizations', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'organization_id', om2.organization_id,
        'organization_name', o2.name,
        'role', (SELECT omr3.role FROM organization_member_roles omr3 WHERE omr3.user_id = p_user_id AND omr3.organization_id = om2.organization_id LIMIT 1),
        'is_owner', om2.is_owner,
        'joined_at', om2.joined_at
      ) ORDER BY om2.joined_at ASC)
      FROM organization_members om2
      LEFT JOIN organizations o2 ON o2.id = om2.organization_id
      WHERE om2.user_id = p_user_id
    ), '[]'::jsonb),
    'companies', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'client_id', c2.id,
        'client_name', c2.name,
        'organization_id', c2.organization_id,
        'organization_name', o3.name,
        'role', cu2.role,
        'created_at', cu2.created_at
      ) ORDER BY cu2.created_at ASC)
      FROM client_users cu2
      JOIN clients c2 ON c2.id = cu2.client_id
      LEFT JOIN organizations o3 ON o3.id = c2.organization_id
      WHERE cu2.user_id = p_user_id
    ), '[]'::jsonb),
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
  result := COALESCE(profile_base, '{}'::jsonb)
    || COALESCE(profile_social, '{}'::jsonb)
    || COALESCE(profile_extras, '{}'::jsonb)
    || COALESCE(creator_data, '{}'::jsonb)
    || COALESCE(health_data, '{}'::jsonb)
    || COALESCE(financial_data, '{}'::jsonb)
    || COALESCE(org_data, '{}'::jsonb)
    || COALESCE(arrays_data, '{}'::jsonb);

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_full_user_detail(uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';
