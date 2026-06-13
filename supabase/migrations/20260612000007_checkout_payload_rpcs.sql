-- ============================================================
-- RPCs SECURITY DEFINER usados por stripe-academy-subscribe y
-- academy-course-checkout. Evitan el bug conocido del runtime de
-- edge functions donde SUPABASE_SERVICE_ROLE_KEY a veces no se
-- inyecta. Las edge functions llaman estos RPCs con el JWT del
-- user (no el anon_key), para que Postgrest haga la auth real y
-- los RPCs validen auth.uid() = p_user_id como defensa adicional.
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_subscribe_payload(
  p_caller_secret TEXT,
  p_space_slug TEXT,
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_space RECORD;
  v_membership_active BOOLEAN := FALSE;
  v_owner_account_id TEXT;
  v_auth_uid UUID := auth.uid();
BEGIN
  IF NOT public._stripe_sync_check_secret(p_caller_secret) THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;

  -- Defense in depth: el caller debe estar autenticado y p_user_id
  -- debe ser el suyo. Si el caller_secret se filtrara, el atacante
  -- solo podría consultar payloads para su propio user.
  IF v_auth_uid IS NULL OR v_auth_uid <> p_user_id THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;

  SELECT id, slug, name, status, is_public,
         membership_price_usd, stripe_price_id, owner_id, plan_slug
    INTO v_space
  FROM academy_spaces
  WHERE slug = p_space_slug;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('found', false);
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM academy_memberships
    WHERE space_id = v_space.id AND user_id = p_user_id AND is_active = true
  ) INTO v_membership_active;

  SELECT stripe_account_id INTO v_owner_account_id
  FROM stripe_connected_accounts
  WHERE user_id = v_space.owner_id;

  RETURN jsonb_build_object(
    'found', true,
    'space', jsonb_build_object(
      'id', v_space.id,
      'slug', v_space.slug,
      'name', v_space.name,
      'status', v_space.status,
      'is_public', v_space.is_public,
      'membership_price_usd', v_space.membership_price_usd,
      'stripe_price_id', v_space.stripe_price_id,
      'owner_id', v_space.owner_id,
      'plan_slug', v_space.plan_slug
    ),
    'membership_active', v_membership_active,
    'owner_stripe_account_id', v_owner_account_id
  );
END;
$$;

-- Solo `authenticated` (no anon). Defensa contra abuso desde el anon_key
-- público, aunque el caller_secret ya filtra.
REVOKE EXECUTE ON FUNCTION public.get_subscribe_payload(TEXT, TEXT, UUID) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_subscribe_payload(TEXT, TEXT, UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_course_checkout_payload(
  p_caller_secret TEXT,
  p_course_id UUID,
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_course RECORD;
  v_space RECORD;
  v_enrolled BOOLEAN := FALSE;
  v_owner_account_id TEXT;
  v_auth_uid UUID := auth.uid();
BEGIN
  IF NOT public._stripe_sync_check_secret(p_caller_secret) THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;

  IF v_auth_uid IS NULL OR v_auth_uid <> p_user_id THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;

  SELECT id, title, slug, price_usd, is_free, cover_image_url, space_id
    INTO v_course
  FROM academy_courses
  WHERE id = p_course_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('found', false);
  END IF;

  SELECT id, slug, name, owner_id, plan_slug
    INTO v_space
  FROM academy_spaces
  WHERE id = v_course.space_id;

  SELECT EXISTS (
    SELECT 1 FROM academy_enrollments
    WHERE course_id = p_course_id AND user_id = p_user_id
  ) INTO v_enrolled;

  SELECT stripe_account_id INTO v_owner_account_id
  FROM stripe_connected_accounts
  WHERE user_id = v_space.owner_id;

  RETURN jsonb_build_object(
    'found', true,
    'course', jsonb_build_object(
      'id', v_course.id,
      'title', v_course.title,
      'slug', v_course.slug,
      'price_usd', v_course.price_usd,
      'is_free', v_course.is_free,
      'cover_image_url', v_course.cover_image_url,
      'space_id', v_course.space_id
    ),
    'space', jsonb_build_object(
      'id', v_space.id,
      'slug', v_space.slug,
      'name', v_space.name,
      'owner_id', v_space.owner_id,
      'plan_slug', v_space.plan_slug
    ),
    'already_enrolled', v_enrolled,
    'owner_stripe_account_id', v_owner_account_id
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_course_checkout_payload(TEXT, UUID, UUID) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_course_checkout_payload(TEXT, UUID, UUID) TO authenticated;
