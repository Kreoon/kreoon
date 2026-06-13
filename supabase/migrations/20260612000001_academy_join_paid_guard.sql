-- ============================================================
-- academy_join_space: bloquear join directo si la academia es de pago.
-- Para academias con membership_price_usd > 0, el usuario DEBE pasar
-- por la edge function `stripe-academy-subscribe`. El webhook crea
-- la membership al confirmar el pago.
-- ============================================================

CREATE OR REPLACE FUNCTION public.academy_join_space(
  p_space_slug TEXT,
  p_consent BOOLEAN DEFAULT false,
  p_country TEXT DEFAULT NULL,
  p_referrer_id UUID DEFAULT NULL,
  p_source TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_space_id UUID;
  v_user_id UUID := auth.uid();
  v_existing_id UUID;
  v_existing_active BOOLEAN;
  v_status TEXT;
  v_membership_price NUMERIC(10, 2);
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  SELECT id, COALESCE(membership_price_usd, 0)
    INTO v_space_id, v_membership_price
  FROM academy_spaces
  WHERE slug = p_space_slug AND is_public = true;

  IF v_space_id IS NULL THEN
    RAISE EXCEPTION 'space_not_found_or_not_public';
  END IF;

  -- Bloquear el join directo si la academia es de pago.
  -- El flujo correcto pasa por stripe-academy-subscribe + webhook.
  IF v_membership_price > 0 THEN
    RAISE EXCEPTION 'paid_membership_required';
  END IF;

  SELECT id, is_active INTO v_existing_id, v_existing_active
  FROM academy_memberships
  WHERE space_id = v_space_id AND user_id = v_user_id;

  IF v_existing_id IS NOT NULL AND v_existing_active THEN
    RETURN jsonb_build_object(
      'status', 'already_member',
      'membership_id', v_existing_id,
      'space_id', v_space_id
    );
  END IF;

  IF v_existing_id IS NOT NULL THEN
    UPDATE academy_memberships
    SET is_active = true,
        marketing_consent = COALESCE(p_consent, marketing_consent),
        country = COALESCE(p_country, country),
        referrer_user_id = COALESCE(referrer_user_id, p_referrer_id)
    WHERE id = v_existing_id;
    v_status := 'reactivated';
  ELSE
    INSERT INTO academy_memberships (
      space_id, user_id, role, is_active,
      marketing_consent, country, lead_source, referrer_user_id, lifecycle_stage
    )
    VALUES (
      v_space_id, v_user_id, 'student', true,
      COALESCE(p_consent, false), p_country, p_source,
      CASE WHEN p_referrer_id = v_user_id THEN NULL ELSE p_referrer_id END,
      'member'
    )
    RETURNING id INTO v_existing_id;
    v_status := 'joined';
  END IF;

  RETURN jsonb_build_object(
    'status', v_status,
    'membership_id', v_existing_id,
    'space_id', v_space_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.academy_join_space(TEXT, BOOLEAN, TEXT, UUID, TEXT) TO authenticated;
