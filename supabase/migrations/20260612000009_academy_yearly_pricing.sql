-- Plan anual opcional por academia (mensual + anual side by side).

ALTER TABLE public.academy_spaces
  ADD COLUMN IF NOT EXISTS yearly_price_usd NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS stripe_yearly_price_id TEXT;

CREATE OR REPLACE FUNCTION public.get_stripe_sync_payload(
  p_entity_type TEXT,
  p_entity_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  IF p_entity_type = 'academy_space' THEN
    SELECT to_jsonb(t) INTO v_result
    FROM (
      SELECT id, name, slug, description,
             membership_price_usd, yearly_price_usd,
             stripe_product_id, stripe_price_id, stripe_yearly_price_id,
             logo_url, cover_image_url
      FROM academy_spaces
      WHERE id = p_entity_id
    ) t;
  ELSIF p_entity_type = 'academy_course' THEN
    SELECT to_jsonb(t) INTO v_result
    FROM (
      SELECT id, title, slug, description, price_usd, is_free,
             stripe_product_id, stripe_price_id, cover_image_url, space_id
      FROM academy_courses
      WHERE id = p_entity_id
    ) t;
  END IF;
  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.apply_stripe_sync_result_v2(
  p_caller_secret TEXT,
  p_entity_type TEXT,
  p_entity_id UUID,
  p_stripe_product_id TEXT,
  p_stripe_price_id TEXT,
  p_stripe_yearly_price_id TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_product TEXT;
BEGIN
  IF NOT public._stripe_sync_check_secret(p_caller_secret) THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;

  IF p_stripe_product_id IS NOT NULL AND p_stripe_product_id !~ '^prod_[A-Za-z0-9]+$' THEN
    RAISE EXCEPTION 'invalid_product_id_format' USING ERRCODE = '22023';
  END IF;
  IF p_stripe_price_id IS NOT NULL AND p_stripe_price_id !~ '^price_[A-Za-z0-9]+$' THEN
    RAISE EXCEPTION 'invalid_price_id_format' USING ERRCODE = '22023';
  END IF;
  IF p_stripe_yearly_price_id IS NOT NULL AND p_stripe_yearly_price_id !~ '^price_[A-Za-z0-9]+$' THEN
    RAISE EXCEPTION 'invalid_yearly_price_id_format' USING ERRCODE = '22023';
  END IF;

  IF p_entity_type = 'academy_space' THEN
    SELECT stripe_product_id INTO v_current_product
    FROM academy_spaces WHERE id = p_entity_id;

    IF v_current_product IS NOT NULL
       AND p_stripe_product_id IS NOT NULL
       AND v_current_product IS DISTINCT FROM p_stripe_product_id THEN
      RAISE EXCEPTION 'product_id_already_assigned' USING ERRCODE = '23514';
    END IF;

    UPDATE academy_spaces
    SET stripe_product_id      = COALESCE(p_stripe_product_id, stripe_product_id),
        stripe_price_id        = p_stripe_price_id,
        stripe_yearly_price_id = p_stripe_yearly_price_id
    WHERE id = p_entity_id;

  ELSIF p_entity_type = 'academy_course' THEN
    SELECT stripe_product_id INTO v_current_product
    FROM academy_courses WHERE id = p_entity_id;

    IF v_current_product IS NOT NULL
       AND p_stripe_product_id IS NOT NULL
       AND v_current_product IS DISTINCT FROM p_stripe_product_id THEN
      RAISE EXCEPTION 'product_id_already_assigned' USING ERRCODE = '23514';
    END IF;

    UPDATE academy_courses
    SET stripe_product_id = COALESCE(p_stripe_product_id, stripe_product_id),
        stripe_price_id   = p_stripe_price_id
    WHERE id = p_entity_id;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.apply_stripe_sync_result_v2(TEXT, TEXT, UUID, TEXT, TEXT, TEXT) TO authenticated;
