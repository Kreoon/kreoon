-- ============================================================================
-- Sprint 2.1 — Tiers de membresía (Bronce/Plata/Oro)
-- Sprint 2.2 — Bundles (paquetes de cursos + membresía opcional)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.academy_membership_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID NOT NULL REFERENCES public.academy_spaces(id) ON DELETE CASCADE,
  tier_slug TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  monthly_price_usd NUMERIC(10,2),
  yearly_price_usd NUMERIC(10,2),
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  stripe_monthly_price_id TEXT,
  stripe_yearly_price_id TEXT,
  badge_color TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (space_id, tier_slug),
  CHECK (monthly_price_usd IS NULL OR monthly_price_usd >= 0),
  CHECK (yearly_price_usd IS NULL OR yearly_price_usd >= 0)
);

CREATE INDEX IF NOT EXISTS idx_tiers_space_sort
  ON public.academy_membership_tiers(space_id, sort_order);

ALTER TABLE public.academy_memberships
  ADD COLUMN IF NOT EXISTS tier_id UUID REFERENCES public.academy_membership_tiers(id);

ALTER TABLE public.academy_membership_tiers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tiers_public_read" ON public.academy_membership_tiers;
CREATE POLICY "tiers_public_read" ON public.academy_membership_tiers FOR SELECT
  TO authenticated, anon USING (is_active = true);

DROP POLICY IF EXISTS "tiers_owners_manage" ON public.academy_membership_tiers;
CREATE POLICY "tiers_owners_manage" ON public.academy_membership_tiers FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM academy_spaces s WHERE s.id = space_id AND s.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM academy_spaces s WHERE s.id = space_id AND s.owner_id = auth.uid()));

GRANT SELECT ON public.academy_membership_tiers TO authenticated, anon;
GRANT INSERT, UPDATE, DELETE ON public.academy_membership_tiers TO authenticated;

CREATE TABLE IF NOT EXISTS public.academy_bundles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID NOT NULL REFERENCES public.academy_spaces(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  course_ids UUID[] NOT NULL DEFAULT ARRAY[]::UUID[],
  includes_membership_tier_id UUID REFERENCES public.academy_membership_tiers(id),
  membership_duration_months INT,
  price_usd NUMERIC(10,2) NOT NULL,
  compare_at_price_usd NUMERIC(10,2),
  stripe_price_id TEXT,
  stripe_product_id TEXT,
  cover_image_url TEXT,
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (space_id, slug),
  CHECK (price_usd >= 0),
  CHECK (cardinality(course_ids) >= 1 OR includes_membership_tier_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_bundles_space ON public.academy_bundles(space_id);

ALTER TABLE public.academy_bundles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bundles_public_read" ON public.academy_bundles;
CREATE POLICY "bundles_public_read" ON public.academy_bundles FOR SELECT
  TO authenticated, anon USING (is_active = true);

DROP POLICY IF EXISTS "bundles_owners_manage" ON public.academy_bundles;
CREATE POLICY "bundles_owners_manage" ON public.academy_bundles FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM academy_spaces s WHERE s.id = space_id AND s.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM academy_spaces s WHERE s.id = space_id AND s.owner_id = auth.uid()));

GRANT SELECT ON public.academy_bundles TO authenticated, anon;
GRANT INSERT, UPDATE, DELETE ON public.academy_bundles TO authenticated;
