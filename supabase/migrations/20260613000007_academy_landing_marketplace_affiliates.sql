-- ============================================================================
-- Sprint 3.1 — Landing pública SEO por academia
-- Sprint 3.2 — Marketplace de academias (filtros + ranking)
-- Sprint 3.3 — Affiliates con tracking + comisiones
-- ============================================================================

ALTER TABLE public.academy_spaces
  ADD COLUMN IF NOT EXISTS landing_headline TEXT,
  ADD COLUMN IF NOT EXISTS landing_subheadline TEXT,
  ADD COLUMN IF NOT EXISTS landing_video_url TEXT,
  ADD COLUMN IF NOT EXISTS landing_testimonials JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS landing_instructors JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS landing_faqs JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS landing_seo_title TEXT,
  ADD COLUMN IF NOT EXISTS landing_seo_description TEXT,
  ADD COLUMN IF NOT EXISTS landing_og_image_url TEXT,
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS language_code TEXT NOT NULL DEFAULT 'es',
  ADD COLUMN IF NOT EXISTS avg_rating NUMERIC(2,1),
  ADD COLUMN IF NOT EXISTS rating_count INT NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.get_public_academy_landing(p_slug TEXT)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $func$
DECLARE v_space RECORD; v_owner RECORD; v_courses JSONB;
BEGIN
  SELECT * INTO v_space FROM academy_spaces WHERE slug = p_slug AND status = 'active' AND is_public = true;
  IF NOT FOUND THEN RETURN jsonb_build_object('error', 'not_found'); END IF;

  SELECT id, COALESCE(full_name, email, 'Owner') AS name, avatar_url, bio
    INTO v_owner FROM profiles WHERE id = v_space.owner_id;

  SELECT jsonb_agg(jsonb_build_object(
    'id', c.id, 'title', c.title, 'slug', c.slug,
    'description', c.description, 'cover_image_url', c.cover_image_url
  )) INTO v_courses
  FROM academy_courses c
  WHERE c.space_id = v_space.id AND c.status = 'published'
  LIMIT 12;

  RETURN jsonb_build_object(
    'id', v_space.id, 'slug', v_space.slug, 'name', v_space.name,
    'description', v_space.description, 'cover_image_url', v_space.cover_image_url,
    'logo_url', v_space.logo_url, 'accent_color', v_space.accent_color,
    'member_count', v_space.member_count,
    'monthly_price_usd', v_space.membership_price_usd,
    'yearly_price_usd', v_space.yearly_price_usd,
    'landing_headline', v_space.landing_headline,
    'landing_subheadline', v_space.landing_subheadline,
    'landing_video_url', v_space.landing_video_url,
    'landing_testimonials', COALESCE(v_space.landing_testimonials, '[]'::jsonb),
    'landing_instructors', COALESCE(v_space.landing_instructors, '[]'::jsonb),
    'landing_faqs', COALESCE(v_space.landing_faqs, '[]'::jsonb),
    'seo_title', COALESCE(v_space.landing_seo_title, v_space.name),
    'seo_description', COALESCE(v_space.landing_seo_description, v_space.description),
    'og_image_url', COALESCE(v_space.landing_og_image_url, v_space.cover_image_url),
    'category', v_space.category,
    'avg_rating', v_space.avg_rating, 'rating_count', v_space.rating_count,
    'owner', jsonb_build_object('name', v_owner.name, 'avatar_url', v_owner.avatar_url),
    'courses', COALESCE(v_courses, '[]'::jsonb)
  );
END; $func$;

GRANT EXECUTE ON FUNCTION public.get_public_academy_landing(TEXT) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.list_public_academies(
  p_category TEXT DEFAULT NULL,
  p_language TEXT DEFAULT NULL,
  p_plan_slug TEXT DEFAULT NULL,
  p_price_max NUMERIC DEFAULT NULL,
  p_limit INT DEFAULT 24,
  p_offset INT DEFAULT 0
) RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $func$
DECLARE v_items JSONB;
BEGIN
  SELECT jsonb_agg(item) INTO v_items FROM (
    SELECT jsonb_build_object(
      'id', s.id, 'slug', s.slug, 'name', s.name,
      'description', s.description, 'cover_image_url', s.cover_image_url,
      'logo_url', s.logo_url, 'accent_color', s.accent_color,
      'member_count', s.member_count,
      'monthly_price_usd', s.membership_price_usd,
      'yearly_price_usd', s.yearly_price_usd,
      'category', s.category, 'language_code', s.language_code,
      'avg_rating', s.avg_rating, 'rating_count', s.rating_count,
      'plan_slug', s.plan_slug,
      'ranking_score', (COALESCE(s.member_count,0) * 1.0
                       + COALESCE(s.rating_count,0) * 5.0
                       + COALESCE(s.avg_rating,0) * 10.0)
    ) AS item
    FROM academy_spaces s
    WHERE s.status = 'active' AND s.is_public = true
      AND (p_category IS NULL OR s.category = p_category)
      AND (p_language IS NULL OR s.language_code = p_language)
      AND (p_plan_slug IS NULL OR s.plan_slug = p_plan_slug)
      AND (p_price_max IS NULL
           OR COALESCE(s.membership_price_usd, 0) <= p_price_max
           OR COALESCE(s.yearly_price_usd, 0) <= p_price_max)
    ORDER BY (COALESCE(s.member_count,0) * 1.0
            + COALESCE(s.rating_count,0) * 5.0
            + COALESCE(s.avg_rating,0) * 10.0) DESC
    LIMIT p_limit OFFSET p_offset
  ) t;

  RETURN jsonb_build_object(
    'items', COALESCE(v_items, '[]'::jsonb),
    'filters', jsonb_build_object(
      'category', p_category, 'language', p_language, 'plan_slug', p_plan_slug
    )
  );
END; $func$;

GRANT EXECUTE ON FUNCTION public.list_public_academies(TEXT, TEXT, TEXT, NUMERIC, INT, INT)
  TO anon, authenticated;

CREATE TABLE IF NOT EXISTS public.academy_affiliate_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID NOT NULL REFERENCES public.academy_spaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  commission_pct NUMERIC(5,2) NOT NULL DEFAULT 20,
  clicks INT NOT NULL DEFAULT 0,
  conversions INT NOT NULL DEFAULT 0,
  earned_total_usd NUMERIC(12,2) NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (space_id, code),
  CHECK (commission_pct >= 0 AND commission_pct <= 50)
);

CREATE INDEX IF NOT EXISTS idx_affiliate_links_space_user
  ON public.academy_affiliate_links(space_id, user_id);

CREATE TABLE IF NOT EXISTS public.academy_affiliate_conversions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  link_id UUID NOT NULL REFERENCES public.academy_affiliate_links(id) ON DELETE CASCADE,
  referred_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  space_id UUID NOT NULL REFERENCES public.academy_spaces(id) ON DELETE CASCADE,
  amount_paid_usd NUMERIC(10,2) NOT NULL,
  commission_usd NUMERIC(10,2) NOT NULL,
  stripe_charge_id TEXT,
  paid_to_affiliate_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.academy_affiliate_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academy_affiliate_conversions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "affiliate_links_owner_read" ON public.academy_affiliate_links;
CREATE POLICY "affiliate_links_owner_read" ON public.academy_affiliate_links FOR SELECT
  TO authenticated
  USING (user_id = auth.uid()
         OR EXISTS (SELECT 1 FROM academy_spaces s WHERE s.id = space_id AND s.owner_id = auth.uid()));

DROP POLICY IF EXISTS "affiliate_conversions_visible" ON public.academy_affiliate_conversions;
CREATE POLICY "affiliate_conversions_visible" ON public.academy_affiliate_conversions FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM academy_affiliate_links l
    WHERE l.id = link_id
      AND (l.user_id = auth.uid()
           OR EXISTS (SELECT 1 FROM academy_spaces s WHERE s.id = l.space_id AND s.owner_id = auth.uid()))
  ));

GRANT SELECT ON public.academy_affiliate_links TO authenticated;
GRANT SELECT ON public.academy_affiliate_conversions TO authenticated;

CREATE OR REPLACE FUNCTION public.get_or_create_affiliate_link(p_space_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $func$
DECLARE v_link RECORD; v_code TEXT;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501'; END IF;
  SELECT * INTO v_link FROM academy_affiliate_links
   WHERE space_id = p_space_id AND user_id = auth.uid();
  IF FOUND THEN RETURN to_jsonb(v_link); END IF;
  v_code := UPPER(SUBSTRING(MD5(auth.uid()::text || p_space_id::text || NOW()::text) FROM 1 FOR 8));
  INSERT INTO academy_affiliate_links (space_id, user_id, code)
  VALUES (p_space_id, auth.uid(), v_code)
  RETURNING * INTO v_link;
  RETURN to_jsonb(v_link);
END; $func$;

GRANT EXECUTE ON FUNCTION public.get_or_create_affiliate_link(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.track_affiliate_click(p_code TEXT, p_space_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $func$
BEGIN
  UPDATE academy_affiliate_links
     SET clicks = clicks + 1
   WHERE space_id = p_space_id AND code = p_code AND is_active = true;
END; $func$;

GRANT EXECUTE ON FUNCTION public.track_affiliate_click(TEXT, UUID) TO anon, authenticated;
