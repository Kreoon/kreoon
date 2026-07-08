-- ============================================================
-- CRION Academy v2 — Sales funnels (S6)
--
-- 1. Drip dual: academy_lessons.drip_mode + drip_release_date
--    + RPC unificado academy_lesson_is_unlocked.
-- 2. Order bumps en checkout: academy_order_bumps.
-- 3. Upsell one-click: academy_upsells (relación from→to).
-- 4. Cart abandonment: academy_abandoned_carts + cron de envío.
-- 5. Affiliates avanzados: academy_spaces.attribution_model.
--
-- Rollback completo en footer.
-- ============================================================

-- ─── (1) Drip dual ─────────────────────────────────────────────
ALTER TABLE public.academy_lessons
  ADD COLUMN IF NOT EXISTS drip_release_date timestamptz,
  ADD COLUMN IF NOT EXISTS drip_mode text NOT NULL DEFAULT 'days_after_enroll'
    CHECK (drip_mode IN ('days_after_enroll', 'absolute_date', 'cohort_relative'));

CREATE OR REPLACE FUNCTION public.academy_lesson_is_unlocked(
  p_lesson_id uuid,
  p_user_id uuid
) RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_drip_mode text;
  v_drip_days int;
  v_release_date timestamptz;
  v_enrollment_id uuid;
  v_enrolled_at timestamptz;
  v_cohort_start date;
  v_course_id uuid;
BEGIN
  SELECT l.drip_mode, l.drip_days_after_enroll, l.drip_release_date, l.course_id
    INTO v_drip_mode, v_drip_days, v_release_date, v_course_id
  FROM academy_lessons l WHERE l.id = p_lesson_id;

  IF v_drip_mode IS NULL THEN
    RETURN true;  -- lesson sin drip → siempre desbloqueada
  END IF;

  -- absolute_date: comparar contra timestamp absoluto
  IF v_drip_mode = 'absolute_date' THEN
    RETURN v_release_date IS NULL OR v_release_date <= now();
  END IF;

  -- days_after_enroll y cohort_relative requieren enrollment
  SELECT e.id, e.enrolled_at, ch.start_date
    INTO v_enrollment_id, v_enrolled_at, v_cohort_start
  FROM academy_enrollments e
  LEFT JOIN academy_cohorts ch ON ch.id = e.cohort_id
  WHERE e.course_id = v_course_id AND e.user_id = p_user_id;

  IF v_enrollment_id IS NULL THEN
    RETURN false;  -- no inscrito → no desbloqueada
  END IF;

  IF v_drip_days IS NULL OR v_drip_days = 0 THEN
    RETURN true;
  END IF;

  IF v_drip_mode = 'cohort_relative' AND v_cohort_start IS NOT NULL THEN
    RETURN (v_cohort_start::timestamptz + (v_drip_days || ' days')::interval) <= now();
  END IF;

  -- days_after_enroll
  RETURN (v_enrolled_at + (v_drip_days || ' days')::interval) <= now();
END;
$$;

GRANT EXECUTE ON FUNCTION public.academy_lesson_is_unlocked(uuid, uuid)
  TO authenticated, service_role;


-- ─── (2) Order bumps ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.academy_order_bumps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_course_id uuid NOT NULL REFERENCES public.academy_courses(id) ON DELETE CASCADE,
  bump_course_id uuid NOT NULL REFERENCES public.academy_courses(id) ON DELETE CASCADE,
  discount_percent int NOT NULL DEFAULT 0 CHECK (discount_percent BETWEEN 0 AND 95),
  headline text NOT NULL,
  subheadline text,
  image_url text,
  active boolean NOT NULL DEFAULT true,
  position int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (parent_course_id, bump_course_id)
);

CREATE INDEX IF NOT EXISTS academy_order_bumps_parent_idx
  ON public.academy_order_bumps (parent_course_id, position);

ALTER TABLE public.academy_order_bumps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "academy_order_bumps_public_read"
  ON public.academy_order_bumps FOR SELECT TO authenticated, anon
  USING (active = true);

CREATE POLICY "academy_order_bumps_owner_all"
  ON public.academy_order_bumps FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM academy_courses c
      JOIN academy_spaces s ON s.id = c.space_id
      WHERE c.id = parent_course_id AND s.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM academy_courses c
      JOIN academy_spaces s ON s.id = c.space_id
      WHERE c.id = parent_course_id AND s.owner_id = auth.uid()
    )
  );

GRANT ALL ON public.academy_order_bumps TO service_role, authenticated;
GRANT SELECT ON public.academy_order_bumps TO anon;


-- ─── (3) Upsells one-click ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.academy_upsells (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_product_id uuid NOT NULL REFERENCES public.academy_courses(id) ON DELETE CASCADE,
  to_product_id uuid NOT NULL REFERENCES public.academy_courses(id) ON DELETE CASCADE,
  headline text NOT NULL,
  discount_percent int NOT NULL DEFAULT 0,
  display_seconds int NOT NULL DEFAULT 0,             -- 0 = mostrar inmediatamente; >0 = countdown
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (from_product_id, to_product_id)
);

ALTER TABLE public.academy_upsells ENABLE ROW LEVEL SECURITY;

CREATE POLICY "academy_upsells_public_read"
  ON public.academy_upsells FOR SELECT TO authenticated
  USING (active = true);

CREATE POLICY "academy_upsells_owner_all"
  ON public.academy_upsells FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM academy_courses c
      JOIN academy_spaces s ON s.id = c.space_id
      WHERE c.id = from_product_id AND s.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM academy_courses c
      JOIN academy_spaces s ON s.id = c.space_id
      WHERE c.id = from_product_id AND s.owner_id = auth.uid()
    )
  );

GRANT ALL ON public.academy_upsells TO service_role, authenticated;


-- ─── (4) Cart abandonment ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.academy_abandoned_carts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text UNIQUE NOT NULL,                    -- Stripe checkout session id
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  course_id uuid REFERENCES public.academy_courses(id) ON DELETE SET NULL,
  space_id uuid REFERENCES public.academy_spaces(id) ON DELETE SET NULL,
  amount_usd numeric(10, 2),
  customer_email text,
  customer_phone text,
  payment_status text NOT NULL DEFAULT 'abandoned'
    CHECK (payment_status IN ('abandoned', 'paid', 'recovered', 'expired')),
  reminder_sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS academy_abandoned_carts_status_created_idx
  ON public.academy_abandoned_carts (payment_status, created_at)
  WHERE payment_status = 'abandoned' AND reminder_sent_at IS NULL;

ALTER TABLE public.academy_abandoned_carts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "academy_abandoned_carts_owner_read"
  ON public.academy_abandoned_carts FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM academy_spaces s WHERE s.id = space_id AND s.owner_id = auth.uid()
    )
  );

CREATE POLICY "academy_abandoned_carts_service_role_all"
  ON public.academy_abandoned_carts FOR ALL TO service_role
  USING (true) WITH CHECK (true);

GRANT ALL ON public.academy_abandoned_carts TO service_role;
GRANT SELECT ON public.academy_abandoned_carts TO authenticated;


-- ─── Cart abandonment cron: emit WA después de 1h ──────────────
CREATE OR REPLACE FUNCTION public.academy_v2_dispatch_cart_abandonment()
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sent int := 0;
  r record;
BEGIN
  FOR r IN
    SELECT ac.id, ac.session_id, ac.user_id, ac.course_id, ac.space_id,
           c.title AS course_title, sp.slug AS space_slug
    FROM academy_abandoned_carts ac
    LEFT JOIN academy_courses c ON c.id = ac.course_id
    LEFT JOIN academy_spaces sp ON sp.id = ac.space_id
    WHERE ac.payment_status = 'abandoned'
      AND ac.reminder_sent_at IS NULL
      AND ac.created_at <= now() - interval '1 hour'
      AND ac.created_at >= now() - interval '48 hours'  -- ventana razonable
      AND ac.user_id IS NOT NULL
  LOOP
    PERFORM academy_emit_event_safe(
      p_type     := 'cart_abandoned',
      p_space_id := r.space_id,
      p_user_id  := r.user_id,
      p_payload  := jsonb_build_object(
        'title',          'Tu compra quedó pendiente',
        'body',           COALESCE(r.course_title, 'curso') || ' te espera. Termina la compra antes que expire.',
        'link',           '/academia/' || COALESCE(r.space_slug, ''),
        'reference_id',   r.id,
        'reference_type', 'abandoned_cart',
        'variables',      jsonb_build_array(COALESCE(r.course_title, 'tu curso'))
      )
    );
    UPDATE academy_abandoned_carts SET reminder_sent_at = now() WHERE id = r.id;
    v_sent := v_sent + 1;
  END LOOP;
  RETURN v_sent;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.academy_v2_dispatch_cart_abandonment() FROM PUBLIC, authenticated;
GRANT EXECUTE ON FUNCTION public.academy_v2_dispatch_cart_abandonment() TO service_role;

DO $$
BEGIN
  PERFORM cron.unschedule('academy_cart_abandonment');
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

SELECT cron.schedule(
  'academy_cart_abandonment',
  '*/30 * * * *',  -- cada 30 min
  $$ SELECT public.academy_v2_dispatch_cart_abandonment(); $$
);


-- ─── (5) Affiliates: modelo de atribución por space ────────────
ALTER TABLE public.academy_spaces
  ADD COLUMN IF NOT EXISTS attribution_model text NOT NULL DEFAULT 'last_click'
    CHECK (attribution_model IN ('first_click', 'last_click', 'multi_touch'));

COMMENT ON COLUMN public.academy_spaces.attribution_model IS
  'Modelo de atribución para conversiones de afiliados. last_click = default Hotmart-style. multi_touch = split por touchpoints.';


-- ============================================================
-- Rollback manual:
--   SELECT cron.unschedule('academy_cart_abandonment');
--   DROP FUNCTION academy_v2_dispatch_cart_abandonment();
--   DROP TABLE academy_abandoned_carts CASCADE;
--   DROP TABLE academy_upsells CASCADE;
--   DROP TABLE academy_order_bumps CASCADE;
--   DROP FUNCTION academy_lesson_is_unlocked(uuid, uuid);
--   ALTER TABLE academy_lessons
--     DROP COLUMN drip_release_date, DROP COLUMN drip_mode;
--   ALTER TABLE academy_spaces DROP COLUMN attribution_model;
-- ============================================================
