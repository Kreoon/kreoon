-- ============================================================================
-- FIX REFERRAL QUALIFICATION LOGIC
-- Update count_qualified_referrals to match useMarketplaceReadiness:
-- Portfolio can come from portfolio_items, published content, OR portfolio_posts
-- Also fix avatar check to include fallback to profiles.avatar_url
-- ============================================================================

-- Update count_qualified_referrals to use all portfolio sources
CREATE OR REPLACE FUNCTION count_qualified_referrals(p_user_id UUID)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INT;
BEGIN
  SELECT COUNT(DISTINCT rr.referred_id) INTO v_count
  FROM referral_relationships rr
  JOIN creator_profiles cp ON cp.user_id = rr.referred_id
  LEFT JOIN profiles p ON p.id = rr.referred_id
  WHERE rr.referrer_id = p_user_id
    AND rr.status = 'active'
    AND cp.is_active = true
    -- Avatar check: creator_profiles OR profiles fallback (same as useMarketplaceReadiness)
    AND (cp.avatar_url IS NOT NULL OR p.avatar_url IS NOT NULL)
    -- Portfolio check: any of 3 sources (same as useMarketplaceReadiness)
    AND (
      EXISTS (SELECT 1 FROM portfolio_items pi WHERE pi.creator_profile_id = cp.id)
      OR EXISTS (SELECT 1 FROM content c WHERE c.creator_id = rr.referred_id AND c.is_published = true)
      OR EXISTS (SELECT 1 FROM portfolio_posts pp WHERE pp.user_id = rr.referred_id)
    );

  RETURN COALESCE(v_count, 0);
END;
$$;

-- Update get_referral_gate_status to use same logic
CREATE OR REPLACE FUNCTION get_referral_gate_status(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_unlocked BOOLEAN;
  v_qualified INT;
  v_referral_code TEXT;
  v_referrals JSONB;
BEGIN
  -- Current unlock status
  SELECT platform_access_unlocked INTO v_unlocked
  FROM profiles WHERE id = p_user_id;

  IF v_unlocked = true THEN
    RETURN jsonb_build_object(
      'unlocked', true,
      'qualified_count', 3,
      'remaining', 0,
      'referral_code', NULL,
      'referrals', '[]'::jsonb
    );
  END IF;

  -- Count qualified
  v_qualified := count_qualified_referrals(p_user_id);

  -- Get the user's primary referral code
  SELECT code INTO v_referral_code
  FROM referral_codes
  WHERE user_id = p_user_id AND is_active = true
  ORDER BY created_at ASC
  LIMIT 1;

  -- Get referrals with qualification details (updated to match new logic)
  SELECT COALESCE(jsonb_agg(row_to_json(r)::jsonb), '[]'::jsonb) INTO v_referrals
  FROM (
    SELECT
      rr.referred_id,
      rr.status,
      rr.created_at,
      p.full_name,
      COALESCE(cp.avatar_url, p.avatar_url) AS referred_avatar,
      cp.id IS NOT NULL AND cp.is_active = true AS has_active_profile,
      (cp.avatar_url IS NOT NULL OR p.avatar_url IS NOT NULL) AS has_avatar,
      (
        EXISTS (SELECT 1 FROM portfolio_items pi WHERE pi.creator_profile_id = cp.id)
        OR EXISTS (SELECT 1 FROM content c WHERE c.creator_id = rr.referred_id AND c.is_published = true)
        OR EXISTS (SELECT 1 FROM portfolio_posts pp WHERE pp.user_id = rr.referred_id)
      ) AS has_portfolio,
      (
        cp.id IS NOT NULL AND cp.is_active = true
        AND (cp.avatar_url IS NOT NULL OR p.avatar_url IS NOT NULL)
        AND (
          EXISTS (SELECT 1 FROM portfolio_items pi WHERE pi.creator_profile_id = cp.id)
          OR EXISTS (SELECT 1 FROM content c WHERE c.creator_id = rr.referred_id AND c.is_published = true)
          OR EXISTS (SELECT 1 FROM portfolio_posts pp WHERE pp.user_id = rr.referred_id)
        )
      ) AS is_qualified
    FROM referral_relationships rr
    JOIN profiles p ON p.id = rr.referred_id
    LEFT JOIN creator_profiles cp ON cp.user_id = rr.referred_id
    WHERE rr.referrer_id = p_user_id
      AND rr.status = 'active'
    ORDER BY rr.created_at DESC
  ) r;

  RETURN jsonb_build_object(
    'unlocked', false,
    'qualified_count', v_qualified,
    'remaining', GREATEST(3 - v_qualified, 0),
    'referral_code', v_referral_code,
    'referrals', v_referrals
  );
END;
$$;

-- Update trigger to also fire on content and portfolio_posts changes
CREATE OR REPLACE FUNCTION trigger_check_referrer_unlock()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referrer_id UUID;
  v_user_id UUID;
BEGIN
  -- Determine user_id based on which table triggered
  IF TG_TABLE_NAME = 'creator_profiles' THEN
    v_user_id := NEW.user_id;
  ELSIF TG_TABLE_NAME = 'portfolio_items' THEN
    SELECT cp.user_id INTO v_user_id
    FROM creator_profiles cp
    WHERE cp.id = NEW.creator_profile_id;
  ELSIF TG_TABLE_NAME = 'content' THEN
    v_user_id := NEW.creator_id;
  ELSIF TG_TABLE_NAME = 'portfolio_posts' THEN
    v_user_id := NEW.user_id;
  ELSIF TG_TABLE_NAME = 'profiles' THEN
    v_user_id := NEW.id;
  END IF;

  -- Find the referrer of this user
  IF v_user_id IS NOT NULL THEN
    SELECT rr.referrer_id INTO v_referrer_id
    FROM referral_relationships rr
    WHERE rr.referred_id = v_user_id
      AND rr.status = 'active'
    LIMIT 1;
  END IF;

  IF v_referrer_id IS NOT NULL THEN
    PERFORM check_and_unlock_access(v_referrer_id);
  END IF;

  RETURN NEW;
END;
$$;

-- Drop existing triggers and recreate with updated conditions

-- Trigger on creator_profiles: when avatar_url or is_active changes
DROP TRIGGER IF EXISTS trg_check_referrer_on_profile_update ON creator_profiles;
CREATE TRIGGER trg_check_referrer_on_profile_update
  AFTER UPDATE OF avatar_url, is_active ON creator_profiles
  FOR EACH ROW
  EXECUTE FUNCTION trigger_check_referrer_unlock();

-- Trigger on portfolio_items: when a new item is inserted
DROP TRIGGER IF EXISTS trg_check_referrer_on_portfolio_insert ON portfolio_items;
CREATE TRIGGER trg_check_referrer_on_portfolio_insert
  AFTER INSERT ON portfolio_items
  FOR EACH ROW
  EXECUTE FUNCTION trigger_check_referrer_unlock();

-- NEW: Trigger on content: when content is published
DROP TRIGGER IF EXISTS trg_check_referrer_on_content_publish ON content;
CREATE TRIGGER trg_check_referrer_on_content_publish
  AFTER INSERT OR UPDATE OF is_published ON content
  FOR EACH ROW
  WHEN (NEW.is_published = true)
  EXECUTE FUNCTION trigger_check_referrer_unlock();

-- NEW: Trigger on portfolio_posts: when a new post is created
DROP TRIGGER IF EXISTS trg_check_referrer_on_portfolio_post ON portfolio_posts;
CREATE TRIGGER trg_check_referrer_on_portfolio_post
  AFTER INSERT ON portfolio_posts
  FOR EACH ROW
  EXECUTE FUNCTION trigger_check_referrer_unlock();

-- NEW: Trigger on profiles: when avatar_url changes (fallback avatar)
DROP TRIGGER IF EXISTS trg_check_referrer_on_profiles_avatar ON profiles;
CREATE TRIGGER trg_check_referrer_on_profiles_avatar
  AFTER UPDATE OF avatar_url ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION trigger_check_referrer_unlock();

-- Ensure GRANTs are in place
GRANT EXECUTE ON FUNCTION count_qualified_referrals(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION check_and_unlock_access(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_referral_gate_status(UUID) TO authenticated;
