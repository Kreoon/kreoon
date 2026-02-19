-- ============================================================================
-- REFERRAL ENHANCEMENTS: Tiers, Bilateral Rewards, Leaderboard, Promos, Nurture
-- ============================================================================

-- ─── 1A. referral_tiers (reference table) ───
CREATE TABLE IF NOT EXISTS referral_tiers (
  tier_key TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  min_referrals INT NOT NULL DEFAULT 0,
  bonus_subscription_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
  badge_emoji TEXT NOT NULL DEFAULT '',
  badge_color TEXT NOT NULL DEFAULT '#888',
  sort_order INT NOT NULL DEFAULT 0
);

INSERT INTO referral_tiers (tier_key, label, min_referrals, bonus_subscription_percent, badge_emoji, badge_color, sort_order)
VALUES
  ('starter',   'Starter',   0,  0, '', '#888888', 0),
  ('ambassador','Ambassador', 3,  2, '', '#9333ea', 1),
  ('champion',  'Champion',  10, 3, '', '#f59e0b', 2),
  ('elite',     'Elite',     25, 5, '', '#3b82f6', 3),
  ('legend',    'Legend',     50, 7, '', '#ef4444', 4)
ON CONFLICT (tier_key) DO NOTHING;

-- ─── 1B. ALTER referral_codes — bilateral rewards columns ───
ALTER TABLE referral_codes
  ADD COLUMN IF NOT EXISTS referred_discount_percent INT DEFAULT 30,
  ADD COLUMN IF NOT EXISTS referred_bonus_coins INT DEFAULT 25,
  ADD COLUMN IF NOT EXISTS referrer_bonus_coins INT DEFAULT 50;

-- ─── 1C. ALTER referral_relationships — coins tracking ───
ALTER TABLE referral_relationships
  ADD COLUMN IF NOT EXISTS referrer_coins_awarded INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS referred_coins_awarded INT DEFAULT 0;

-- ─── 1D. ALTER profiles — referral tier ───
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS referral_tier TEXT DEFAULT 'starter';

-- ─── 1E. referral_leaderboard ───
CREATE TABLE IF NOT EXISTS referral_leaderboard (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  period_month TEXT NOT NULL, -- 'YYYY-MM'
  referrals_count INT NOT NULL DEFAULT 0,
  earnings_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  rank_position INT NOT NULL DEFAULT 0,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, period_month)
);

CREATE INDEX IF NOT EXISTS idx_referral_leaderboard_period
  ON referral_leaderboard(period_month, rank_position);

-- ─── 1F. promotional_campaigns ───
CREATE TABLE IF NOT EXISTS promotional_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  start_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  end_date TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  referred_discount_percent INT NOT NULL DEFAULT 30,
  referred_bonus_coins INT NOT NULL DEFAULT 25,
  referrer_bonus_coins INT NOT NULL DEFAULT 50,
  referral_extra_free_months INT NOT NULL DEFAULT 0,
  max_redemptions INT,
  current_redemptions INT NOT NULL DEFAULT 0,
  promo_badge_text TEXT,
  promo_badge_color TEXT DEFAULT '#9333ea',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed: Early Bird Marzo 2026
INSERT INTO promotional_campaigns (slug, name, description, start_date, end_date, referred_discount_percent, referred_bonus_coins, referrer_bonus_coins, referral_extra_free_months, max_redemptions, promo_badge_text, promo_badge_color)
VALUES (
  'early-bird-marzo-2026',
  'Early Bird Marzo 2026',
  'Los primeros 100 referidos reciben 40% de descuento + 50 Kreoon Coins + 1 mes gratis.',
  '2026-03-01T00:00:00Z',
  '2026-03-31T23:59:59Z',
  40, 50, 75, 1, 100,
  'Early Bird', '#f59e0b'
)
ON CONFLICT (slug) DO NOTHING;

-- ─── 1G. campaign_redemptions ───
CREATE TABLE IF NOT EXISTS campaign_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES promotional_campaigns(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referral_code_used TEXT,
  free_months_granted INT NOT NULL DEFAULT 0,
  bonus_coins_granted INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(campaign_id, user_id)
);

-- ─── 1H. referral_nurture_queue ───
CREATE TABLE IF NOT EXISTS referral_nurture_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referred_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referrer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  relationship_id UUID REFERENCES referral_relationships(id) ON DELETE SET NULL,
  has_creator_profile BOOLEAN NOT NULL DEFAULT false,
  has_avatar BOOLEAN NOT NULL DEFAULT false,
  has_portfolio BOOLEAN NOT NULL DEFAULT false,
  is_qualified BOOLEAN NOT NULL DEFAULT false,
  reminder_count INT NOT NULL DEFAULT 0,
  next_reminder_at TIMESTAMPTZ DEFAULT (now() + INTERVAL '1 day'),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(referred_id)
);

-- ─── 1I-a. RPC: award_referral_coins ───
CREATE OR REPLACE FUNCTION award_referral_coins(
  p_user_id UUID,
  p_org_id UUID,
  p_amount INT,
  p_reason TEXT DEFAULT 'referral_bonus'
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  -- Kreoon Coins = reputation points, award via reputation_events
  INSERT INTO reputation_events (
    user_id,
    organization_id,
    event_type,
    base_points,
    final_points,
    metadata
  ) VALUES (
    p_user_id,
    COALESCE(p_org_id, (
      SELECT om.organization_id FROM organization_members om
      WHERE om.user_id = p_user_id LIMIT 1
    )),
    'referral_bonus',
    p_amount,
    p_amount,
    jsonb_build_object('reason', p_reason, 'coins', p_amount)
  );
END;
$$;

-- ─── 1I-b. Function: compute_referral_tier ───
CREATE OR REPLACE FUNCTION compute_referral_tier(p_count INT)
RETURNS TEXT
LANGUAGE plpgsql IMMUTABLE
AS $$
BEGIN
  IF p_count >= 50 THEN RETURN 'legend';
  ELSIF p_count >= 25 THEN RETURN 'elite';
  ELSIF p_count >= 10 THEN RETURN 'champion';
  ELSIF p_count >= 3 THEN RETURN 'ambassador';
  ELSE RETURN 'starter';
  END IF;
END;
$$;

-- ─── 1I-c. Trigger function: update_user_referral_tier ───
CREATE OR REPLACE FUNCTION update_user_referral_tier()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_referrer_id UUID;
  v_count INT;
  v_new_tier TEXT;
  v_bonus NUMERIC;
  v_new_rate NUMERIC;
BEGIN
  v_referrer_id := NEW.referrer_id;

  -- Count active referrals for this referrer
  SELECT COUNT(*) INTO v_count
  FROM referral_relationships
  WHERE referrer_id = v_referrer_id AND status = 'active';

  -- Determine tier
  v_new_tier := compute_referral_tier(v_count);

  -- Update profile tier
  UPDATE profiles SET referral_tier = v_new_tier WHERE id = v_referrer_id;

  -- Get tier bonus
  SELECT bonus_subscription_percent INTO v_bonus
  FROM referral_tiers WHERE tier_key = v_new_tier;

  -- Calculate new rate: base 20% + tier bonus
  v_new_rate := 0.20 + COALESCE(v_bonus, 0) / 100.0;

  -- Update ALL active relationships for this referrer
  UPDATE referral_relationships
  SET subscription_rate = v_new_rate
  WHERE referrer_id = v_referrer_id AND status = 'active';

  RETURN NEW;
END;
$$;

-- Drop trigger if exists, then create
DROP TRIGGER IF EXISTS trg_update_referral_tier ON referral_relationships;
CREATE TRIGGER trg_update_referral_tier
  AFTER INSERT OR UPDATE OF status ON referral_relationships
  FOR EACH ROW
  WHEN (NEW.status = 'active')
  EXECUTE FUNCTION update_user_referral_tier();

-- ─── 1I-d. Trigger function: enqueue_referral_nurture ───
CREATE OR REPLACE FUNCTION enqueue_referral_nurture()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_has_profile BOOLEAN := false;
  v_has_avatar BOOLEAN := false;
  v_has_portfolio BOOLEAN := false;
BEGIN
  -- Check initial state
  SELECT EXISTS(SELECT 1 FROM creator_profiles WHERE user_id = NEW.referred_id)
    INTO v_has_profile;

  SELECT EXISTS(
    SELECT 1 FROM profiles WHERE id = NEW.referred_id AND avatar_url IS NOT NULL AND avatar_url <> ''
  ) INTO v_has_avatar;

  SELECT EXISTS(SELECT 1 FROM portfolio_items WHERE user_id = NEW.referred_id)
    INTO v_has_portfolio;

  -- Insert into nurture queue
  INSERT INTO referral_nurture_queue (
    referred_id, referrer_id, relationship_id,
    has_creator_profile, has_avatar, has_portfolio,
    is_qualified,
    completed_at
  ) VALUES (
    NEW.referred_id, NEW.referrer_id, NEW.id,
    v_has_profile, v_has_avatar, v_has_portfolio,
    (v_has_profile AND v_has_avatar AND v_has_portfolio),
    CASE WHEN (v_has_profile AND v_has_avatar AND v_has_portfolio) THEN now() ELSE NULL END
  )
  ON CONFLICT (referred_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enqueue_referral_nurture ON referral_relationships;
CREATE TRIGGER trg_enqueue_referral_nurture
  AFTER INSERT ON referral_relationships
  FOR EACH ROW
  EXECUTE FUNCTION enqueue_referral_nurture();

-- ─── 1I-e. Trigger function: check_nurture_completion (creator_profiles) ───
CREATE OR REPLACE FUNCTION check_nurture_on_profile()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_row referral_nurture_queue%ROWTYPE;
BEGIN
  SELECT * INTO v_row
  FROM referral_nurture_queue
  WHERE referred_id = NEW.user_id AND completed_at IS NULL;

  IF NOT FOUND THEN RETURN NEW; END IF;

  -- Update profile check
  UPDATE referral_nurture_queue
  SET has_creator_profile = true, updated_at = now()
  WHERE id = v_row.id;

  -- Check if fully qualified now
  IF v_row.has_avatar AND true AND v_row.has_portfolio THEN
    UPDATE referral_nurture_queue
    SET is_qualified = true, completed_at = now(), updated_at = now()
    WHERE id = v_row.id;

    -- Award coins to BOTH users
    PERFORM award_referral_coins(v_row.referrer_id, NULL, 50, 'referral_qualified');
    PERFORM award_referral_coins(v_row.referred_id, NULL, 25, 'referral_welcome_qualified');

    -- Mark coins on relationship
    UPDATE referral_relationships
    SET referrer_coins_awarded = COALESCE(referrer_coins_awarded, 0) + 50,
        referred_coins_awarded = COALESCE(referred_coins_awarded, 0) + 25
    WHERE id = v_row.relationship_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_nurture_check_profile ON creator_profiles;
CREATE TRIGGER trg_nurture_check_profile
  AFTER INSERT ON creator_profiles
  FOR EACH ROW
  EXECUTE FUNCTION check_nurture_on_profile();

-- ─── 1I-f. Trigger function: check_nurture_on_avatar (profiles) ───
CREATE OR REPLACE FUNCTION check_nurture_on_avatar()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_row referral_nurture_queue%ROWTYPE;
BEGIN
  -- Only fire if avatar changed to non-null
  IF NEW.avatar_url IS NULL OR NEW.avatar_url = '' THEN RETURN NEW; END IF;
  IF OLD IS NOT NULL AND OLD.avatar_url = NEW.avatar_url THEN RETURN NEW; END IF;

  SELECT * INTO v_row
  FROM referral_nurture_queue
  WHERE referred_id = NEW.id AND completed_at IS NULL;

  IF NOT FOUND THEN RETURN NEW; END IF;

  UPDATE referral_nurture_queue
  SET has_avatar = true, updated_at = now()
  WHERE id = v_row.id;

  -- Check if fully qualified
  IF v_row.has_creator_profile AND true AND v_row.has_portfolio THEN
    UPDATE referral_nurture_queue
    SET is_qualified = true, completed_at = now(), updated_at = now()
    WHERE id = v_row.id;

    PERFORM award_referral_coins(v_row.referrer_id, NULL, 50, 'referral_qualified');
    PERFORM award_referral_coins(v_row.referred_id, NULL, 25, 'referral_welcome_qualified');

    UPDATE referral_relationships
    SET referrer_coins_awarded = COALESCE(referrer_coins_awarded, 0) + 50,
        referred_coins_awarded = COALESCE(referred_coins_awarded, 0) + 25
    WHERE id = v_row.relationship_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_nurture_check_avatar ON profiles;
CREATE TRIGGER trg_nurture_check_avatar
  AFTER UPDATE OF avatar_url ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION check_nurture_on_avatar();

-- ─── 1I-g. Trigger function: check_nurture_on_portfolio (portfolio_items) ───
CREATE OR REPLACE FUNCTION check_nurture_on_portfolio()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_row referral_nurture_queue%ROWTYPE;
BEGIN
  SELECT * INTO v_row
  FROM referral_nurture_queue
  WHERE referred_id = NEW.user_id AND completed_at IS NULL;

  IF NOT FOUND THEN RETURN NEW; END IF;

  UPDATE referral_nurture_queue
  SET has_portfolio = true, updated_at = now()
  WHERE id = v_row.id;

  -- Check if fully qualified
  IF v_row.has_creator_profile AND v_row.has_avatar AND true THEN
    UPDATE referral_nurture_queue
    SET is_qualified = true, completed_at = now(), updated_at = now()
    WHERE id = v_row.id;

    PERFORM award_referral_coins(v_row.referrer_id, NULL, 50, 'referral_qualified');
    PERFORM award_referral_coins(v_row.referred_id, NULL, 25, 'referral_welcome_qualified');

    UPDATE referral_relationships
    SET referrer_coins_awarded = COALESCE(referrer_coins_awarded, 0) + 50,
        referred_coins_awarded = COALESCE(referred_coins_awarded, 0) + 25
    WHERE id = v_row.relationship_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_nurture_check_portfolio ON portfolio_items;
CREATE TRIGGER trg_nurture_check_portfolio
  AFTER INSERT ON portfolio_items
  FOR EACH ROW
  EXECUTE FUNCTION check_nurture_on_portfolio();

-- ─── 1I-h. RPC: update_referral_leaderboard (monthly cron) ───
CREATE OR REPLACE FUNCTION update_referral_leaderboard()
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_period TEXT;
BEGIN
  v_period := to_char(now(), 'YYYY-MM');

  -- Delete old entries for this period
  DELETE FROM referral_leaderboard WHERE period_month = v_period;

  -- Insert aggregated data
  INSERT INTO referral_leaderboard (user_id, period_month, referrals_count, earnings_amount, rank_position, is_featured)
  SELECT
    rr.referrer_id,
    v_period,
    COUNT(*)::INT,
    COALESCE(SUM(re.commission_amount), 0),
    ROW_NUMBER() OVER (ORDER BY COUNT(*) DESC, COALESCE(SUM(re.commission_amount), 0) DESC)::INT,
    ROW_NUMBER() OVER (ORDER BY COUNT(*) DESC, COALESCE(SUM(re.commission_amount), 0) DESC) <= 10
  FROM referral_relationships rr
  LEFT JOIN referral_earnings re ON re.relationship_id = rr.id
    AND re.created_at >= date_trunc('month', now())
    AND re.created_at < date_trunc('month', now()) + INTERVAL '1 month'
  WHERE rr.created_at >= date_trunc('month', now())
    AND rr.created_at < date_trunc('month', now()) + INTERVAL '1 month'
    AND rr.status = 'active'
  GROUP BY rr.referrer_id;
END;
$$;

-- ─── 1J. Cron job (monthly leaderboard) ───
-- Requires pg_cron extension (already enabled)
SELECT cron.schedule(
  'referral-leaderboard-monthly',
  '0 1 1 * *',
  $$SELECT update_referral_leaderboard()$$
);

-- ─── 1K. RLS Policies ───

ALTER TABLE referral_tiers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read tiers" ON referral_tiers FOR SELECT USING (true);

ALTER TABLE referral_leaderboard ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read leaderboard" ON referral_leaderboard FOR SELECT USING (true);

ALTER TABLE promotional_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read active promos" ON promotional_campaigns FOR SELECT USING (true);

ALTER TABLE campaign_redemptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own redemptions" ON campaign_redemptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service role inserts redemptions" ON campaign_redemptions FOR INSERT WITH CHECK (true);

ALTER TABLE referral_nurture_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own nurture" ON referral_nurture_queue FOR SELECT USING (auth.uid() = referred_id OR auth.uid() = referrer_id);

-- ─── 1L. GRANTs ───

GRANT ALL ON referral_tiers TO authenticated;
GRANT ALL ON referral_tiers TO service_role;

GRANT ALL ON referral_leaderboard TO authenticated;
GRANT ALL ON referral_leaderboard TO service_role;

GRANT ALL ON promotional_campaigns TO authenticated;
GRANT ALL ON promotional_campaigns TO service_role;

GRANT ALL ON campaign_redemptions TO authenticated;
GRANT ALL ON campaign_redemptions TO service_role;

GRANT ALL ON referral_nurture_queue TO authenticated;
GRANT ALL ON referral_nurture_queue TO service_role;

GRANT EXECUTE ON FUNCTION award_referral_coins(UUID, UUID, INT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION award_referral_coins(UUID, UUID, INT, TEXT) TO service_role;

GRANT EXECUTE ON FUNCTION compute_referral_tier(INT) TO authenticated;
GRANT EXECUTE ON FUNCTION compute_referral_tier(INT) TO service_role;

GRANT EXECUTE ON FUNCTION update_referral_leaderboard() TO service_role;
