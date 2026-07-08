-- ============================================================
-- CRION Academy v2 — Multi-gateway (S7)
--
-- 1. academy_spaces.preferred_gateways + default_currency
-- 2. academy_course_prices para precios por moneda local
--
-- Rollback:
--   DROP TABLE academy_course_prices;
--   ALTER TABLE academy_spaces
--     DROP COLUMN preferred_gateways, DROP COLUMN default_currency;
-- ============================================================

ALTER TABLE public.academy_spaces
  ADD COLUMN IF NOT EXISTS preferred_gateways text[] NOT NULL DEFAULT ARRAY['stripe'],
  ADD COLUMN IF NOT EXISTS default_currency text NOT NULL DEFAULT 'USD';

COMMENT ON COLUMN public.academy_spaces.preferred_gateways IS
  'Gateways habilitados para cobros en este space. Default: stripe. Ej: ARRAY[stripe, mercadopago, wompi]';
COMMENT ON COLUMN public.academy_spaces.default_currency IS
  'Moneda default mostrada en checkout cuando no se puede detectar país. USD/COP/MXN/BRL/...';

CREATE TABLE IF NOT EXISTS public.academy_course_prices (
  course_id uuid NOT NULL REFERENCES public.academy_courses(id) ON DELETE CASCADE,
  currency text NOT NULL,
  amount numeric(12, 2) NOT NULL CHECK (amount >= 0),
  external_price_id text,                                 -- price_xxx para gateways con priceID pre-creado
  PRIMARY KEY (course_id, currency)
);

CREATE INDEX IF NOT EXISTS academy_course_prices_course_idx
  ON public.academy_course_prices (course_id);

ALTER TABLE public.academy_course_prices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "academy_course_prices_public_read"
  ON public.academy_course_prices FOR SELECT TO authenticated, anon
  USING (
    EXISTS (
      SELECT 1 FROM academy_courses c
      JOIN academy_spaces s ON s.id = c.space_id
      WHERE c.id = course_id AND c.status = 'published' AND s.is_public = true
    )
  );

CREATE POLICY "academy_course_prices_owner_all"
  ON public.academy_course_prices FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM academy_courses c
      JOIN academy_spaces s ON s.id = c.space_id
      WHERE c.id = course_id AND s.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM academy_courses c
      JOIN academy_spaces s ON s.id = c.space_id
      WHERE c.id = course_id AND s.owner_id = auth.uid()
    )
  );

GRANT ALL ON public.academy_course_prices TO service_role, authenticated;
GRANT SELECT ON public.academy_course_prices TO anon;
