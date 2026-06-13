-- Límite de usos por usuario en cupones de academia.
-- NULL = ilimitado por usuario (default).
ALTER TABLE public.academy_coupons
  ADD COLUMN IF NOT EXISTS max_redemptions_per_user INT;

CREATE OR REPLACE FUNCTION public.validate_academy_coupon(
  p_space_id UUID,
  p_code TEXT,
  p_plan TEXT,
  p_user_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $func$
DECLARE
  v_coupon RECORD;
  v_price NUMERIC;
  v_discount NUMERIC;
  v_final NUMERIC;
  v_uses_by_user INT;
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

  IF v_coupon.max_redemptions_per_user IS NOT NULL AND p_user_id IS NOT NULL THEN
    SELECT COUNT(*) INTO v_uses_by_user
    FROM academy_coupon_redemptions
    WHERE coupon_id = v_coupon.id AND user_id = p_user_id;

    IF v_uses_by_user >= v_coupon.max_redemptions_per_user THEN
      RETURN jsonb_build_object(
        'valid', false,
        'error', 'coupon_max_per_user_reached',
        'uses_by_user', v_uses_by_user,
        'limit_per_user', v_coupon.max_redemptions_per_user
      );
    END IF;
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
    'final_price_usd', v_final,
    'max_redemptions_per_user', v_coupon.max_redemptions_per_user
  );
END;
$func$;

GRANT EXECUTE ON FUNCTION public.validate_academy_coupon(UUID, TEXT, TEXT, UUID) TO anon, authenticated;
