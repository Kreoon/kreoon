-- ============================================================
-- CRION Academy v2 — Checkout Intents (source of truth para webhooks)
--
-- Resuelve 3 hallazgos críticos del security review:
--
-- (1) Wompi paywall bypass: un atacante puede crear una transacción
--     en Wompi a su nombre con reference='acad_<courseId>_<userId>'
--     apuntando a CUALQUIER course/user y, al APPROVED, nuestro webhook
--     inserta el enrollment sin validar amount → acceso gratis a
--     cualquier curso pagando $1.
--
-- (2) MP price validation: la metadata del preference es atacker-
--     controlled si crean su propia preference fuera de Kreoon. El
--     webhook llega al mismo endpoint y nosotros confiamos.
--
-- Fix: cada checkout que iniciamos desde un edge function (Stripe,
-- MP, Wompi) DEBE insertar previamente una fila en
-- academy_checkout_intents con (reference, course_id, user_id, amount,
-- currency, gateway). Los webhooks LOOKUP por reference y RECHAZAN si:
--   - El intent no existe (no es nuestro checkout).
--   - El amount cobrado < expected_amount_cents (intento de pagar
--     menos de lo debido).
--   - El intent ya está paid (anti-replay).
--
-- Rollback:
--   DROP TABLE academy_checkout_intents CASCADE;
-- ============================================================

CREATE TABLE IF NOT EXISTS public.academy_checkout_intents (
  reference text PRIMARY KEY,                          -- session_id / external_reference del gateway
  gateway text NOT NULL CHECK (gateway IN ('stripe', 'mercadopago', 'wompi')),
  course_id uuid REFERENCES public.academy_courses(id) ON DELETE CASCADE,
  space_id uuid REFERENCES public.academy_spaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expected_amount_cents bigint NOT NULL CHECK (expected_amount_cents > 0),
  currency text NOT NULL,
  intent_type text NOT NULL DEFAULT 'course_purchase'
    CHECK (intent_type IN ('course_purchase', 'subscription', 'upsell', 'order_bump_combo')),
  status text NOT NULL DEFAULT 'created'
    CHECK (status IN ('created', 'paid', 'expired', 'cancelled', 'rejected')),
  paid_at timestamptz,
  rejected_reason text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '48 hours')
);

CREATE INDEX IF NOT EXISTS academy_checkout_intents_user_idx
  ON public.academy_checkout_intents (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS academy_checkout_intents_status_idx
  ON public.academy_checkout_intents (status, created_at DESC) WHERE status = 'created';

ALTER TABLE public.academy_checkout_intents ENABLE ROW LEVEL SECURITY;

-- Solo service_role escribe (edge functions de checkout). El user
-- puede leer sus propios intents (para mostrar status en UI).
CREATE POLICY "academy_checkout_intents_user_read"
  ON public.academy_checkout_intents FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "academy_checkout_intents_service_role_all"
  ON public.academy_checkout_intents FOR ALL TO service_role
  USING (true) WITH CHECK (true);

GRANT ALL ON public.academy_checkout_intents TO service_role;
GRANT SELECT ON public.academy_checkout_intents TO authenticated;

COMMENT ON TABLE public.academy_checkout_intents IS
  'Source of truth para webhooks de pasarelas. Cada checkout iniciado por Kreoon DEBE crear un intent. Los webhooks rechazan referencias desconocidas o con monto insuficiente.';


-- ─── Helper RPC: derivar el precio autoritativo de un curso ────
-- Usado por edge functions de checkout para asegurar que el monto
-- esperado venga SIEMPRE de la DB, nunca de input del cliente.
CREATE OR REPLACE FUNCTION public.academy_get_course_price_authoritative(
  p_course_id uuid,
  p_currency text
) RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_price_usd numeric;
  v_local numeric;
BEGIN
  -- 1) Si hay precio local explícito en academy_course_prices, úsalo.
  SELECT amount INTO v_local
  FROM academy_course_prices
  WHERE course_id = p_course_id AND currency = upper(p_currency);

  IF v_local IS NOT NULL THEN
    RETURN jsonb_build_object(
      'amount', v_local,
      'amount_cents', (v_local * 100)::bigint,
      'currency', upper(p_currency),
      'source', 'explicit'
    );
  END IF;

  -- 2) Fallback al USD base del curso.
  SELECT price_usd INTO v_price_usd
  FROM academy_courses WHERE id = p_course_id;

  IF v_price_usd IS NULL THEN
    RETURN NULL;
  END IF;

  RETURN jsonb_build_object(
    'amount', v_price_usd,
    'amount_cents', (v_price_usd * 100)::bigint,
    'currency', 'USD',
    'source', 'fallback_usd'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.academy_get_course_price_authoritative(uuid, text)
  TO service_role;

COMMENT ON FUNCTION public.academy_get_course_price_authoritative(uuid, text) IS
  'Devuelve el precio autoritativo de un curso en la moneda solicitada. Edge functions de checkout DEBEN usar este RPC en lugar de confiar en precios pasados por el cliente.';
