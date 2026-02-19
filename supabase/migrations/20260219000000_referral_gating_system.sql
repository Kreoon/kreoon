-- ============================================================================
-- REFERRAL GATING SYSTEM
-- Users need 3 "qualified" referrals to unlock the platform.
-- Qualified = active creator_profile + avatar_url + at least 1 portfolio item.
-- Root admin can grant access manually from CRM.
-- ============================================================================

-- 1. Add column to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS platform_access_unlocked BOOLEAN DEFAULT false;

-- 2. Grandfather all existing users (they already have access)
UPDATE profiles SET platform_access_unlocked = true WHERE platform_access_unlocked = false OR platform_access_unlocked IS NULL;

-- ============================================================================
-- count_qualified_referrals: counts how many of a user's referrals are "qualified"
-- Qualified = has creator_profile with is_active=true AND avatar_url IS NOT NULL
--             AND at least 1 portfolio_item
-- ============================================================================
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
  WHERE rr.referrer_id = p_user_id
    AND rr.status = 'active'
    AND cp.is_active = true
    AND cp.avatar_url IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM portfolio_items pi
      WHERE pi.creator_profile_id = cp.id
    );

  RETURN COALESCE(v_count, 0);
END;
$$;

-- ============================================================================
-- check_and_unlock_access: verifies and unlocks if >= 3 qualified referrals
-- ============================================================================
CREATE OR REPLACE FUNCTION check_and_unlock_access(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_already_unlocked BOOLEAN;
  v_qualified INT;
BEGIN
  -- Check if already unlocked
  SELECT platform_access_unlocked INTO v_already_unlocked
  FROM profiles WHERE id = p_user_id;

  IF v_already_unlocked = true THEN
    RETURN true;
  END IF;

  -- Count qualified referrals
  v_qualified := count_qualified_referrals(p_user_id);

  IF v_qualified >= 3 THEN
    UPDATE profiles SET platform_access_unlocked = true WHERE id = p_user_id;
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

-- ============================================================================
-- get_referral_gate_status: returns full progress for the gate UI
-- ============================================================================
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

  -- Get referrals with qualification details
  SELECT COALESCE(jsonb_agg(row_to_json(r)::jsonb), '[]'::jsonb) INTO v_referrals
  FROM (
    SELECT
      rr.referred_id,
      rr.status,
      rr.created_at,
      p.full_name,
      p.avatar_url AS referred_avatar,
      cp.id IS NOT NULL AND cp.is_active = true AS has_active_profile,
      cp.avatar_url IS NOT NULL AS has_avatar,
      EXISTS (
        SELECT 1 FROM portfolio_items pi WHERE pi.creator_profile_id = cp.id
      ) AS has_portfolio,
      (
        cp.id IS NOT NULL AND cp.is_active = true
        AND cp.avatar_url IS NOT NULL
        AND EXISTS (SELECT 1 FROM portfolio_items pi WHERE pi.creator_profile_id = cp.id)
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

-- ============================================================================
-- validate_referral_slug: validates format + uniqueness + reserved words
-- ============================================================================
CREATE OR REPLACE FUNCTION validate_referral_slug(p_slug TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_normalized TEXT;
  v_exists BOOLEAN;
  v_reserved TEXT[] := ARRAY[
    'ADMIN', 'KREOON', 'SUPPORT', 'HELP', 'API', 'APP', 'WWW',
    'BLOG', 'DOCS', 'STATUS', 'LOGIN', 'AUTH', 'REGISTER',
    'MARKETPLACE', 'SETTINGS', 'DASHBOARD', 'NULL', 'UNDEFINED'
  ];
BEGIN
  -- Normalize to uppercase
  v_normalized := UPPER(TRIM(p_slug));

  -- Check length (3-30 chars)
  IF LENGTH(v_normalized) < 3 OR LENGTH(v_normalized) > 30 THEN
    RETURN jsonb_build_object('valid', false, 'error', 'El slug debe tener entre 3 y 30 caracteres');
  END IF;

  -- Check format: alphanumeric + hyphens, no leading/trailing hyphens
  IF v_normalized !~ '^[A-Z0-9][A-Z0-9\-]*[A-Z0-9]$' AND LENGTH(v_normalized) > 2 THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Solo letras, numeros y guiones. No puede empezar o terminar con guion');
  END IF;

  -- Single char slug edge case
  IF LENGTH(v_normalized) <= 2 AND v_normalized !~ '^[A-Z0-9]+$' THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Solo letras y numeros');
  END IF;

  -- Check reserved words
  IF v_normalized = ANY(v_reserved) THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Este slug esta reservado');
  END IF;

  -- Check uniqueness (case insensitive since we store uppercase)
  SELECT EXISTS(
    SELECT 1 FROM referral_codes WHERE UPPER(code) = v_normalized
  ) INTO v_exists;

  IF v_exists THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Este slug ya esta en uso');
  END IF;

  RETURN jsonb_build_object('valid', true, 'normalized', v_normalized);
END;
$$;

-- ============================================================================
-- grant_platform_access: root admin manually unlocks a user
-- ============================================================================
CREATE OR REPLACE FUNCTION grant_platform_access(p_admin_id UUID, p_target_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin BOOLEAN;
BEGIN
  -- Verify the caller is a platform admin (user_roles table)
  SELECT EXISTS(
    SELECT 1 FROM user_roles WHERE user_id = p_admin_id AND role = 'admin'
  ) INTO v_is_admin;

  -- Also check ROOT_EMAILS as fallback
  IF NOT v_is_admin THEN
    SELECT EXISTS(
      SELECT 1 FROM auth.users
      WHERE id = p_admin_id
        AND email IN ('jacsolucionesgraficas@gmail.com', 'kairosgp.sas@gmail.com')
    ) INTO v_is_admin;
  END IF;

  IF NOT v_is_admin THEN
    RETURN jsonb_build_object('success', false, 'error', 'No tienes permisos de administrador');
  END IF;

  -- Unlock the target user
  UPDATE profiles
  SET platform_access_unlocked = true
  WHERE id = p_target_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Usuario no encontrado');
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- ============================================================================
-- TRIGGERS: auto-check referrer unlock when a referred user qualifies
-- ============================================================================

-- Helper: given a user_id (the referred), find their referrer and check unlock
CREATE OR REPLACE FUNCTION trigger_check_referrer_unlock()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referrer_id UUID;
BEGIN
  -- Find the referrer of this user
  -- For creator_profiles trigger, the user_id is on the row
  -- For portfolio_items trigger, we need to join through creator_profiles
  IF TG_TABLE_NAME = 'creator_profiles' THEN
    SELECT rr.referrer_id INTO v_referrer_id
    FROM referral_relationships rr
    WHERE rr.referred_id = NEW.user_id
      AND rr.status = 'active'
    LIMIT 1;
  ELSIF TG_TABLE_NAME = 'portfolio_items' THEN
    SELECT rr.referrer_id INTO v_referrer_id
    FROM referral_relationships rr
    JOIN creator_profiles cp ON cp.user_id = rr.referred_id
    WHERE cp.id = NEW.creator_profile_id
      AND rr.status = 'active'
    LIMIT 1;
  END IF;

  IF v_referrer_id IS NOT NULL THEN
    PERFORM check_and_unlock_access(v_referrer_id);
  END IF;

  RETURN NEW;
END;
$$;

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

-- ============================================================================
-- GRANTS
-- ============================================================================
GRANT EXECUTE ON FUNCTION count_qualified_referrals(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION check_and_unlock_access(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_referral_gate_status(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION validate_referral_slug(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION grant_platform_access(UUID, UUID) TO authenticated;
