-- ============================================================
-- CRION Academy v2 — Hotmart Co-producción (S8)
--
-- Modelo: el creator del space monta su producto en Hotmart, invita a
-- KREOON como co-productor con un % de comisión (paridad con Stripe:
-- 10% Hobby / 2.9% Pro), y Hotmart hace el split automático en cada
-- venta. KREOON NUNCA toca el dinero — Hotmart paga a cada parte
-- directamente 30 días post-venta.
--
-- Cambio de scope (decisión 2026-06-15):
-- Solo Stripe + Hotmart por ahora. MercadoPago y Wompi quedan
-- desactivados pero el código adapters/webhooks queda dormido por si
-- vuelven en una fase futura. preferred_gateways default = {stripe}.
--
-- Rollback:
--   ALTER TABLE academy_spaces ALTER COLUMN preferred_gateways
--     SET DEFAULT ARRAY['stripe'];
--   DROP TABLE academy_hotmart_coproductions CASCADE;
-- ============================================================

-- ─── academy_hotmart_coproductions ─────────────────────────────
-- Mapping curso KREOON ↔ producto Hotmart + Hottok del productor para
-- validar webhooks + estado de la invitación de co-producción.
CREATE TABLE IF NOT EXISTS public.academy_hotmart_coproductions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id uuid NOT NULL REFERENCES public.academy_spaces(id) ON DELETE CASCADE,
  course_id uuid REFERENCES public.academy_courses(id) ON DELETE CASCADE,
                                                       -- nullable: producto Hotmart puede ser membresía del space, no curso individual

  -- Identificación del producto en Hotmart
  hotmart_product_id text NOT NULL UNIQUE,             -- ID numérico del producto (visible en URL Hotmart)
  hotmart_offer_code text,                              -- offer code opcional (ofertas/promos)
  hotmart_product_ucode text,                           -- ucode (unique code) del producto
  is_subscription boolean NOT NULL DEFAULT false,

  -- Validación de webhooks
  producer_hottok text NOT NULL,                        -- Hottok del PRODUCTOR (creator), valida x-hotmart-hottok header

  -- KREOON como co-productor
  kreoon_account_id text NOT NULL,                      -- Account ID de KREOON en Hotmart
  kreoon_commission_percent numeric(5, 2) NOT NULL
    CHECK (kreoon_commission_percent BETWEEN 0 AND 100),

  -- Estado de la invitación de co-producción
  coproduction_status text NOT NULL DEFAULT 'pending'
    CHECK (coproduction_status IN ('pending', 'accepted', 'rejected', 'cancelled')),
  accepted_at timestamptz,

  -- Operativo
  active boolean NOT NULL DEFAULT false,                -- el owner debe activar manualmente tras aceptar invite
  connected_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS academy_hotmart_coprod_space_idx
  ON public.academy_hotmart_coproductions (space_id);

CREATE INDEX IF NOT EXISTS academy_hotmart_coprod_course_idx
  ON public.academy_hotmart_coproductions (course_id) WHERE course_id IS NOT NULL;

ALTER TABLE public.academy_hotmart_coproductions ENABLE ROW LEVEL SECURITY;

-- Owner del space CRUD; service_role para webhook lookup.
CREATE POLICY "academy_hotmart_coprod_owner_all"
  ON public.academy_hotmart_coproductions FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM academy_spaces s
      WHERE s.id = space_id AND s.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM academy_spaces s
      WHERE s.id = space_id AND s.owner_id = auth.uid()
    )
  );

CREATE POLICY "academy_hotmart_coprod_service_role_all"
  ON public.academy_hotmart_coproductions FOR ALL TO service_role
  USING (true) WITH CHECK (true);

GRANT ALL ON public.academy_hotmart_coproductions TO service_role, authenticated;

COMMENT ON TABLE public.academy_hotmart_coproductions IS
  'Co-producción Hotmart: el creator monta producto en Hotmart e invita a KREOON con % de comisión. Hotmart hace split automático.';


-- ─── academy_enrollments.revoked_at (para refunds Hotmart) ─────
-- En lugar de DELETE el enrollment cuando llega refund/chargeback,
-- marcamos revoked_at para audit y bloqueo de acceso.
ALTER TABLE public.academy_enrollments
  ADD COLUMN IF NOT EXISTS revoked_at timestamptz,
  ADD COLUMN IF NOT EXISTS revoked_reason text,
  ADD COLUMN IF NOT EXISTS gateway text;                -- 'stripe'|'hotmart' para audit

COMMENT ON COLUMN public.academy_enrollments.revoked_at IS
  'Set por webhook de refund/chargeback. Frontend debe filtrar enrollments revoked_at IS NULL.';


-- ─── academy_hotmart_pending_claims ────────────────────────────
-- Cuando un buyer compra vía Hotmart con email que NO matchea ningún
-- profile KREOON, registramos un "claim pending" para que el user
-- reclame el enrollment al hacer signup/login. Vive separado de
-- academy_checkout_intents para mantener limpio el modelo de intents
-- (que son checkouts in-flight de users reales).
CREATE TABLE IF NOT EXISTS public.academy_hotmart_pending_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coproduction_id uuid NOT NULL REFERENCES public.academy_hotmart_coproductions(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.academy_courses(id) ON DELETE CASCADE,
  space_id uuid NOT NULL REFERENCES public.academy_spaces(id) ON DELETE CASCADE,
  buyer_email text NOT NULL,
  buyer_name text,
  hotmart_transaction text,                            -- purchase.transaction o ucode
  amount_paid_usd numeric(10, 2),
  claimed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  claimed_at timestamptz,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'claimed', 'expired', 'revoked')),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '90 days')
);

CREATE INDEX IF NOT EXISTS academy_hotmart_pending_claims_email_idx
  ON public.academy_hotmart_pending_claims (lower(buyer_email), status)
  WHERE status = 'pending';

ALTER TABLE public.academy_hotmart_pending_claims ENABLE ROW LEVEL SECURITY;

-- User puede leer claims donde su email matchea (para mostrar en UI tipo
-- "tienes 1 compra Hotmart pendiente de claim"). Service role full.
CREATE POLICY "academy_hotmart_pending_claims_user_read"
  ON public.academy_hotmart_pending_claims FOR SELECT TO authenticated
  USING (
    lower(buyer_email) = lower((auth.jwt()->>'email')::text)
    OR claimed_by = auth.uid()
  );

CREATE POLICY "academy_hotmart_pending_claims_service_role_all"
  ON public.academy_hotmart_pending_claims FOR ALL TO service_role
  USING (true) WITH CHECK (true);

GRANT ALL ON public.academy_hotmart_pending_claims TO service_role;
GRANT SELECT ON public.academy_hotmart_pending_claims TO authenticated;

COMMENT ON TABLE public.academy_hotmart_pending_claims IS
  'Compras Hotmart cuyo buyer_email no matchea profile KREOON. User reclama al hacer signup/login con el mismo email.';


-- ─── RPC academy_claim_hotmart_purchases ───────────────────────
-- User reclama todas sus compras Hotmart pendientes (su email matchea
-- una o más entries pending). Idempotente.
CREATE OR REPLACE FUNCTION public.academy_claim_hotmart_purchases()
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_email text;
  v_claimed int := 0;
  r record;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  SELECT lower(email) INTO v_email FROM profiles WHERE id = v_user_id;
  IF v_email IS NULL THEN RETURN 0; END IF;

  FOR r IN
    SELECT id, course_id, amount_paid_usd
    FROM academy_hotmart_pending_claims
    WHERE lower(buyer_email) = v_email AND status = 'pending'
      AND expires_at > now()
  LOOP
    -- Crear enrollment (idempotente)
    INSERT INTO academy_enrollments (
      course_id, user_id, amount_paid_usd, gateway, stripe_payment_intent_id
    ) VALUES (
      r.course_id, v_user_id, COALESCE(r.amount_paid_usd, 0), 'hotmart',
      'hotmart_claim_' || r.id::text
    )
    ON CONFLICT (course_id, user_id) DO UPDATE SET
      revoked_at = NULL, revoked_reason = NULL;

    UPDATE academy_hotmart_pending_claims
      SET status = 'claimed', claimed_by = v_user_id, claimed_at = now()
      WHERE id = r.id;

    v_claimed := v_claimed + 1;
  END LOOP;

  RETURN v_claimed;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.academy_claim_hotmart_purchases() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.academy_claim_hotmart_purchases() TO authenticated;


-- ─── Cleanup: gateways default ─────────────────────────────────
-- MP/Wompi quedan desactivados pero el código (adapters + webhooks)
-- permanece como dormiente. preferred_gateways default = {stripe}.
-- Los owners que ya tengan {stripe, mercadopago, wompi} en su array
-- los mantienen (decision: no migrar data existente, solo cambiar
-- default para nuevos spaces).
ALTER TABLE public.academy_spaces
  ALTER COLUMN preferred_gateways SET DEFAULT ARRAY['stripe'];

COMMENT ON COLUMN public.academy_spaces.preferred_gateways IS
  'Gateways habilitados. Soportados activos: stripe, hotmart. mercadopago/wompi dormant (código existente, no se muestran en GatewaySelector).';


-- ─── Seed de templates WA para Hotmart events ─────────────────
-- Templates pendientes de aprobación en Meta.
INSERT INTO public.whatsapp_notification_templates
  (event_type, template_id, template_name, language, category, variables_schema, is_active)
VALUES

  -- Refund / acceso revocado
  (
    'enrollment_revoked',
    'PENDING',
    'crion_academy_enrollment_revoked',
    'es',
    'UTILITY',
    '[{"pos":1,"name":"member_name","example":"Alexander"},
      {"pos":2,"name":"course_name","example":"Marketing con IA"}]'::jsonb,
    false
  ),

  -- Bienvenida especial para compras vía Hotmart (con claim de cuenta)
  (
    'hotmart_purchase_claim',
    'PENDING',
    'crion_academy_hotmart_claim',
    'es',
    'UTILITY',
    '[{"pos":1,"name":"buyer_email","example":"juan@gmail.com"},
      {"pos":2,"name":"course_name","example":"Marketing con IA"},
      {"pos":3,"name":"claim_url","example":"https://kreoon.com/claim/abc123"}]'::jsonb,
    false
  )

ON CONFLICT (event_type) DO NOTHING;
