-- =============================================================
-- AMBASSADOR BADGE SIMPLIFICATION + REFERRAL MODULE
-- =============================================================
-- Ambassador: Simplify from 6-table complex system to boolean badge
-- Referrals: New org-scoped monetization module (separate concept)
-- =============================================================


-- ═══════════════════════════════════════════════════
-- 1. AMBASSADOR BADGE → Simple boolean on organization_members
-- ═══════════════════════════════════════════════════

-- ambassador_since already exists from migration 20251227104536
ALTER TABLE public.organization_members
  ADD COLUMN IF NOT EXISTS is_ambassador BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS ambassador_note TEXT;

-- Migrate existing badge data: anyone with active ambassador badge → is_ambassador=true
UPDATE public.organization_members om
SET
  is_ambassador = TRUE,
  ambassador_since = COALESCE(om.ambassador_since, omb.granted_at)
FROM public.organization_member_badges omb
WHERE omb.user_id = om.user_id
  AND omb.organization_id = om.organization_id
  AND omb.badge = 'ambassador'
  AND omb.is_active = TRUE
  AND om.is_ambassador IS NOT TRUE;

-- Create index for ambassador queries
CREATE INDEX IF NOT EXISTS idx_org_members_ambassador
  ON public.organization_members(organization_id)
  WHERE is_ambassador = TRUE;

-- View: list ambassadors per org
CREATE OR REPLACE VIEW public.organization_ambassadors AS
SELECT
  om.user_id,
  om.organization_id,
  p.full_name,
  p.avatar_url,
  p.email,
  om.role,
  om.is_ambassador,
  om.ambassador_since,
  om.ambassador_note
FROM public.organization_members om
JOIN public.profiles p ON p.id = om.user_id
WHERE om.is_ambassador = TRUE;

-- Grant access
GRANT SELECT ON public.organization_ambassadors TO authenticated;


-- ═══════════════════════════════════════════════════
-- 2. REFERRAL MODULE — Program configuration per org
-- ═══════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.referral_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

  -- Commission config
  referrer_commission_type TEXT DEFAULT 'percentage'
    CHECK (referrer_commission_type IN ('percentage', 'fixed')),
  referrer_commission_value DECIMAL(10,2) DEFAULT 10,
  referee_bonus_type TEXT DEFAULT 'percentage'
    CHECK (referee_bonus_type IN ('percentage', 'fixed', 'none')),
  referee_bonus_value DECIMAL(10,2) DEFAULT 5,

  -- Limits
  max_referrals_per_user INT,           -- NULL = unlimited
  commission_duration_months INT DEFAULT 12,
  minimum_payout DECIMAL(10,2) DEFAULT 50.00,

  -- State
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(organization_id)
);

ALTER TABLE public.referral_programs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view referral program"
  ON public.referral_programs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = referral_programs.organization_id
        AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage referral program"
  ON public.referral_programs FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = referral_programs.organization_id
        AND om.user_id = auth.uid()
        AND om.role IN ('admin', 'team_leader')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = referral_programs.organization_id
        AND om.user_id = auth.uid()
        AND om.role IN ('admin', 'team_leader')
    )
  );

GRANT ALL ON public.referral_programs TO authenticated;


-- ═══════════════════════════════════════════════════
-- 3. REFERRAL CODES — Unique per user per org
-- ═══════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.referral_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

  code TEXT NOT NULL,
  custom_url TEXT,

  -- Stats (denormalized for quick access)
  total_clicks INT DEFAULT 0,
  total_signups INT DEFAULT 0,
  total_conversions INT DEFAULT 0,
  total_earnings DECIMAL(12,2) DEFAULT 0,

  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(code),
  UNIQUE(user_id, organization_id)
);

CREATE INDEX IF NOT EXISTS idx_referral_codes_org
  ON public.referral_codes(organization_id, is_active);
CREATE INDEX IF NOT EXISTS idx_referral_codes_user
  ON public.referral_codes(user_id);

ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own referral codes"
  ON public.referral_codes FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Org members can view org referral codes"
  ON public.referral_codes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = referral_codes.organization_id
        AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create own referral codes"
  ON public.referral_codes FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can manage referral codes"
  ON public.referral_codes FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = referral_codes.organization_id
        AND om.user_id = auth.uid()
        AND om.role IN ('admin', 'team_leader')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = referral_codes.organization_id
        AND om.user_id = auth.uid()
        AND om.role IN ('admin', 'team_leader')
    )
  );

GRANT ALL ON public.referral_codes TO authenticated;


-- ═══════════════════════════════════════════════════
-- 4. ORG REFERRALS — Tracking each referral
-- ═══════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.org_referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_code_id UUID NOT NULL REFERENCES public.referral_codes(id) ON DELETE CASCADE,
  referrer_id UUID NOT NULL REFERENCES auth.users(id),
  referee_id UUID REFERENCES auth.users(id),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

  -- Status
  status TEXT DEFAULT 'pending'
    CHECK (status IN ('pending', 'active', 'converted', 'expired', 'cancelled')),

  -- Dates
  clicked_at TIMESTAMPTZ,
  signed_up_at TIMESTAMPTZ,
  converted_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,

  -- Tracking
  source_url TEXT,
  utm_params JSONB,

  created_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(referee_id, organization_id)
);

CREATE INDEX IF NOT EXISTS idx_org_referrals_referrer
  ON public.org_referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_org_referrals_referee
  ON public.org_referrals(referee_id);
CREATE INDEX IF NOT EXISTS idx_org_referrals_status
  ON public.org_referrals(organization_id, status);

ALTER TABLE public.org_referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own referrals"
  ON public.org_referrals FOR SELECT
  USING (referrer_id = auth.uid() OR referee_id = auth.uid());

CREATE POLICY "Admins can view org referrals"
  ON public.org_referrals FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = org_referrals.organization_id
        AND om.user_id = auth.uid()
        AND om.role IN ('admin', 'team_leader')
    )
  );

CREATE POLICY "System can manage referrals"
  ON public.org_referrals FOR ALL
  USING (true) WITH CHECK (true);

GRANT ALL ON public.org_referrals TO authenticated;


-- ═══════════════════════════════════════════════════
-- 5. ORG REFERRAL COMMISSIONS — Earnings per transaction
-- ═══════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.org_referral_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_id UUID NOT NULL REFERENCES public.org_referrals(id) ON DELETE CASCADE,
  referrer_id UUID NOT NULL REFERENCES auth.users(id),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

  -- Transaction
  transaction_type TEXT
    CHECK (transaction_type IN ('subscription', 'project', 'purchase', 'other')),
  transaction_id UUID,
  transaction_amount DECIMAL(12,2),

  -- Commission
  commission_rate DECIMAL(5,4),
  commission_amount DECIMAL(12,2) NOT NULL,

  -- Payment status
  status TEXT DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'paid', 'cancelled')),
  paid_at TIMESTAMPTZ,
  payout_id UUID,

  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_org_ref_comm_referrer
  ON public.org_referral_commissions(referrer_id, status);
CREATE INDEX IF NOT EXISTS idx_org_ref_comm_org
  ON public.org_referral_commissions(organization_id);

ALTER TABLE public.org_referral_commissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own commissions"
  ON public.org_referral_commissions FOR SELECT
  USING (referrer_id = auth.uid());

CREATE POLICY "Admins can manage commissions"
  ON public.org_referral_commissions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = org_referral_commissions.organization_id
        AND om.user_id = auth.uid()
        AND om.role IN ('admin', 'team_leader')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = org_referral_commissions.organization_id
        AND om.user_id = auth.uid()
        AND om.role IN ('admin', 'team_leader')
    )
  );

GRANT ALL ON public.org_referral_commissions TO authenticated;


-- ═══════════════════════════════════════════════════
-- 6. REFERRAL PAYOUTS — Withdrawal requests
-- ═══════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.referral_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

  amount DECIMAL(12,2) NOT NULL,
  payment_method TEXT
    CHECK (payment_method IN ('bank_transfer', 'paypal', 'nequi', 'daviplata', 'crypto', 'other')),
  payment_details JSONB,

  status TEXT DEFAULT 'requested'
    CHECK (status IN ('requested', 'processing', 'completed', 'failed')),
  processed_at TIMESTAMPTZ,
  processed_by UUID REFERENCES auth.users(id),

  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ref_payouts_user
  ON public.referral_payouts(user_id, status);
CREATE INDEX IF NOT EXISTS idx_ref_payouts_org
  ON public.referral_payouts(organization_id, status);

ALTER TABLE public.referral_payouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own payouts"
  ON public.referral_payouts FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can request payouts"
  ON public.referral_payouts FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can manage payouts"
  ON public.referral_payouts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = referral_payouts.organization_id
        AND om.user_id = auth.uid()
        AND om.role IN ('admin', 'team_leader')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = referral_payouts.organization_id
        AND om.user_id = auth.uid()
        AND om.role IN ('admin', 'team_leader')
    )
  );

GRANT ALL ON public.referral_payouts TO authenticated;


-- ═══════════════════════════════════════════════════
-- 7. HELPER FUNCTIONS
-- ═══════════════════════════════════════════════════

-- Generate a unique referral code for a user
CREATE OR REPLACE FUNCTION public.generate_referral_code(
  p_user_id UUID,
  p_organization_id UUID
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_name TEXT;
  v_code TEXT;
  v_attempt INT := 0;
BEGIN
  -- Get user name prefix
  SELECT UPPER(LEFT(REGEXP_REPLACE(COALESCE(full_name, 'USER'), '[^A-Za-z]', '', 'g'), 4))
  INTO v_name
  FROM public.profiles
  WHERE id = p_user_id;

  -- Generate unique code
  LOOP
    v_code := v_name || '-' || UPPER(SUBSTR(MD5(RANDOM()::TEXT), 1, 4));
    v_attempt := v_attempt + 1;

    -- Check uniqueness
    IF NOT EXISTS (SELECT 1 FROM public.referral_codes WHERE code = v_code) THEN
      EXIT;
    END IF;

    IF v_attempt > 10 THEN
      v_code := v_name || '-' || UPPER(SUBSTR(MD5(RANDOM()::TEXT || NOW()::TEXT), 1, 6));
      EXIT;
    END IF;
  END LOOP;

  -- Insert the code
  INSERT INTO public.referral_codes (user_id, organization_id, code)
  VALUES (p_user_id, p_organization_id, v_code)
  ON CONFLICT (user_id, organization_id) DO NOTHING;

  RETURN v_code;
END;
$$;

-- Get referral stats for a user
CREATE OR REPLACE FUNCTION public.get_referral_stats(
  p_user_id UUID,
  p_organization_id UUID
)
RETURNS TABLE (
  total_referrals BIGINT,
  active_referrals BIGINT,
  converted_referrals BIGINT,
  total_earnings DECIMAL,
  pending_earnings DECIMAL,
  paid_earnings DECIMAL
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    COUNT(r.id) AS total_referrals,
    COUNT(r.id) FILTER (WHERE r.status = 'active') AS active_referrals,
    COUNT(r.id) FILTER (WHERE r.status = 'converted') AS converted_referrals,
    COALESCE(SUM(rc.commission_amount), 0) AS total_earnings,
    COALESCE(SUM(rc.commission_amount) FILTER (WHERE rc.status = 'pending' OR rc.status = 'approved'), 0) AS pending_earnings,
    COALESCE(SUM(rc.commission_amount) FILTER (WHERE rc.status = 'paid'), 0) AS paid_earnings
  FROM public.referral_codes c
  LEFT JOIN public.org_referrals r ON r.referral_code_id = c.id
  LEFT JOIN public.org_referral_commissions rc ON rc.referral_id = r.id AND rc.referrer_id = p_user_id
  WHERE c.user_id = p_user_id
    AND c.organization_id = p_organization_id;
$$;

-- Update referral code stats (denormalized counts)
CREATE OR REPLACE FUNCTION public.update_referral_code_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.referral_codes
  SET
    total_signups = (
      SELECT COUNT(*) FROM public.org_referrals
      WHERE referral_code_id = COALESCE(NEW.referral_code_id, OLD.referral_code_id)
        AND signed_up_at IS NOT NULL
    ),
    total_conversions = (
      SELECT COUNT(*) FROM public.org_referrals
      WHERE referral_code_id = COALESCE(NEW.referral_code_id, OLD.referral_code_id)
        AND status = 'converted'
    )
  WHERE id = COALESCE(NEW.referral_code_id, OLD.referral_code_id);

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_update_referral_code_stats
  AFTER INSERT OR UPDATE OR DELETE ON public.org_referrals
  FOR EACH ROW EXECUTE FUNCTION public.update_referral_code_stats();

-- Update referral code earnings (denormalized)
CREATE OR REPLACE FUNCTION public.update_referral_code_earnings()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_code_id UUID;
BEGIN
  SELECT r.referral_code_id INTO v_code_id
  FROM public.org_referrals r
  WHERE r.id = COALESCE(NEW.referral_id, OLD.referral_id);

  IF v_code_id IS NOT NULL THEN
    UPDATE public.referral_codes
    SET total_earnings = (
      SELECT COALESCE(SUM(commission_amount), 0)
      FROM public.org_referral_commissions rc
      JOIN public.org_referrals r ON r.id = rc.referral_id
      WHERE r.referral_code_id = v_code_id
        AND rc.status IN ('approved', 'paid')
    )
    WHERE id = v_code_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_update_referral_earnings
  AFTER INSERT OR UPDATE OR DELETE ON public.org_referral_commissions
  FOR EACH ROW EXECUTE FUNCTION public.update_referral_code_earnings();
