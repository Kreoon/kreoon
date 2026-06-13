-- Cupones gestionados desde KREOON (no Stripe).
-- Cada academia crea sus propios códigos; KREOON valida y crea un
-- Stripe Coupon al vuelo solo para esa Checkout Session.

CREATE TABLE IF NOT EXISTS public.academy_coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID NOT NULL REFERENCES public.academy_spaces(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed_amount')),
  discount_value NUMERIC(10, 2) NOT NULL CHECK (discount_value > 0),
  applies_to TEXT[] NOT NULL DEFAULT ARRAY['monthly', 'yearly']::TEXT[],
  duration TEXT NOT NULL CHECK (duration IN ('once', 'repeating', 'forever')),
  duration_in_months INT,
  max_redemptions INT,
  redemptions_count INT NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (duration != 'repeating' OR duration_in_months IS NOT NULL),
  CHECK (discount_type != 'percentage' OR discount_value <= 100)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_academy_coupons_space_code
  ON public.academy_coupons(space_id, LOWER(code));
CREATE INDEX IF NOT EXISTS idx_academy_coupons_space_active
  ON public.academy_coupons(space_id, is_active);

ALTER TABLE public.academy_coupons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owners_manage_coupons" ON public.academy_coupons;
CREATE POLICY "owners_manage_coupons"
  ON public.academy_coupons FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM academy_spaces s WHERE s.id = space_id AND s.owner_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM academy_spaces s WHERE s.id = space_id AND s.owner_id = auth.uid())
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.academy_coupons TO authenticated;

CREATE TABLE IF NOT EXISTS public.academy_coupon_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id UUID NOT NULL REFERENCES public.academy_coupons(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  space_id UUID NOT NULL REFERENCES public.academy_spaces(id) ON DELETE CASCADE,
  plan TEXT NOT NULL CHECK (plan IN ('monthly', 'yearly')),
  stripe_subscription_id TEXT,
  redeemed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_coupon
  ON public.academy_coupon_redemptions(coupon_id);

ALTER TABLE public.academy_coupon_redemptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "owners_read_redemptions" ON public.academy_coupon_redemptions;
CREATE POLICY "owners_read_redemptions"
  ON public.academy_coupon_redemptions FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM academy_spaces s WHERE s.id = space_id AND s.owner_id = auth.uid())
  );

GRANT SELECT ON public.academy_coupon_redemptions TO authenticated;

CREATE OR REPLACE FUNCTION public.validate_academy_coupon(
  p_space_id UUID,
  p_code TEXT,
  p_plan TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_coupon RECORD;
  v_price NUMERIC;
  v_discount NUMERIC;
  v_final NUMERIC;
BEGIN
  IF p_plan NOT IN ('monthly', 'yearly') THEN
    RETURN jsonb_build_object('valid', false, 'error', 'invalid_plan');
  END IF;

  SELECT * INTO v_coupon
  FROM academy_coupons
  WHERE space_id = p_space_id
    AND LOWER(code) = LOWER(p_code)
    AND is_active = true;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'error', 'coupon_not_found');
  END IF;

  IF v_coupon.expires_at IS NOT NULL AND v_coupon.expires_at < NOW() THEN
    RETURN jsonb_build_object('valid', false, 'error', 'coupon_expired');
  END IF;

  IF v_coupon.max_redemptions IS NOT NULL
     AND v_coupon.redemptions_count >= v_coupon.max_redemptions THEN
    RETURN jsonb_build_object('valid', false, 'error', 'coupon_max_redemptions');
  END IF;

  IF NOT (p_plan = ANY(v_coupon.applies_to)) THEN
    RETURN jsonb_build_object('valid', false, 'error', 'coupon_plan_not_applicable');
  END IF;

  SELECT CASE WHEN p_plan = 'monthly' THEN membership_price_usd
              ELSE yearly_price_usd END
    INTO v_price
  FROM academy_spaces WHERE id = p_space_id;

  IF v_price IS NULL OR v_price <= 0 THEN
    RETURN jsonb_build_object('valid', false, 'error', 'plan_not_available');
  END IF;

  IF v_coupon.discount_type = 'percentage' THEN
    v_discount := ROUND((v_price * v_coupon.discount_value / 100)::numeric, 2);
  ELSE
    v_discount := LEAST(v_coupon.discount_value, v_price);
  END IF;
  v_final := GREATEST(v_price - v_discount, 0);

  RETURN jsonb_build_object(
    'valid', true,
    'coupon_id', v_coupon.id,
    'code', v_coupon.code,
    'discount_type', v_coupon.discount_type,
    'discount_value', v_coupon.discount_value,
    'duration', v_coupon.duration,
    'duration_in_months', v_coupon.duration_in_months,
    'original_price_usd', v_price,
    'discount_amount_usd', v_discount,
    'final_price_usd', v_final
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.validate_academy_coupon(UUID, TEXT, TEXT) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.record_coupon_redemption(
  p_caller_secret TEXT,
  p_coupon_id UUID,
  p_user_id UUID,
  p_space_id UUID,
  p_plan TEXT,
  p_stripe_subscription_id TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public._stripe_sync_check_secret(p_caller_secret) THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;

  INSERT INTO academy_coupon_redemptions (coupon_id, user_id, space_id, plan, stripe_subscription_id)
  VALUES (p_coupon_id, p_user_id, p_space_id, p_plan, p_stripe_subscription_id);

  UPDATE academy_coupons
  SET redemptions_count = redemptions_count + 1,
      updated_at = NOW()
  WHERE id = p_coupon_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_coupon_redemption(TEXT, UUID, UUID, UUID, TEXT, TEXT) TO authenticated;
