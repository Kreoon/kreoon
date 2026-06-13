-- ============================================================
-- pending_owner_payouts: registro de deuda a owners cuando se cobra
-- en modo central (sin Stripe Connect). KREOON liquida manualmente
-- y marca como pagado en esta tabla.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.pending_owner_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  space_id UUID REFERENCES public.academy_spaces(id) ON DELETE SET NULL,
  source_type TEXT NOT NULL CHECK (source_type IN (
    'academy_membership_subscription',
    'academy_course_purchase'
  )),
  source_id TEXT,
  stripe_session_id TEXT,
  stripe_charge_id TEXT,
  stripe_invoice_id TEXT,
  gross_amount_usd NUMERIC(10, 2) NOT NULL,
  platform_fee_percent NUMERIC(5, 2) NOT NULL,
  platform_fee_amount_usd NUMERIC(10, 2) NOT NULL,
  net_owner_amount_usd NUMERIC(10, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'usd',
  collected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  paid_out_at TIMESTAMPTZ,
  paid_out_method TEXT,
  paid_out_reference TEXT,
  paid_out_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_pending_owner_payouts_invoice
  ON public.pending_owner_payouts (stripe_invoice_id)
  WHERE stripe_invoice_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_pending_owner_payouts_session
  ON public.pending_owner_payouts (stripe_session_id)
  WHERE stripe_session_id IS NOT NULL AND stripe_invoice_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_pending_owner_payouts_owner_pending
  ON public.pending_owner_payouts (owner_user_id, paid_out_at);
CREATE INDEX IF NOT EXISTS idx_pending_owner_payouts_collected
  ON public.pending_owner_payouts (collected_at DESC);

ALTER TABLE public.pending_owner_payouts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owners_read_own_payouts" ON public.pending_owner_payouts;
CREATE POLICY "owners_read_own_payouts"
  ON public.pending_owner_payouts FOR SELECT
  TO authenticated
  USING (owner_user_id = auth.uid());

GRANT SELECT ON public.pending_owner_payouts TO authenticated;

CREATE OR REPLACE FUNCTION public.record_owner_payout(
  p_caller_secret TEXT,
  p_owner_user_id UUID,
  p_space_id UUID,
  p_source_type TEXT,
  p_source_id TEXT,
  p_stripe_session_id TEXT,
  p_stripe_charge_id TEXT,
  p_stripe_invoice_id TEXT,
  p_gross_amount_usd NUMERIC,
  p_platform_fee_percent NUMERIC,
  p_currency TEXT DEFAULT 'usd'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_fee_amount NUMERIC(10, 2);
  v_net_amount NUMERIC(10, 2);
  v_id UUID;
BEGIN
  IF NOT public._stripe_sync_check_secret(p_caller_secret) THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;

  v_fee_amount := ROUND((p_gross_amount_usd * p_platform_fee_percent / 100)::numeric, 2);
  v_net_amount := p_gross_amount_usd - v_fee_amount;

  INSERT INTO pending_owner_payouts (
    owner_user_id, space_id, source_type, source_id,
    stripe_session_id, stripe_charge_id, stripe_invoice_id,
    gross_amount_usd, platform_fee_percent, platform_fee_amount_usd, net_owner_amount_usd,
    currency
  )
  VALUES (
    p_owner_user_id, p_space_id, p_source_type, p_source_id,
    p_stripe_session_id, p_stripe_charge_id, p_stripe_invoice_id,
    p_gross_amount_usd, p_platform_fee_percent, v_fee_amount, v_net_amount,
    COALESCE(p_currency, 'usd')
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_owner_payout(
  TEXT, UUID, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, NUMERIC, NUMERIC, TEXT
) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.mark_owner_payout_paid(
  p_payout_id UUID,
  p_method TEXT,
  p_reference TEXT,
  p_notes TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role IN ('admin', 'team_leader')
  ) INTO v_is_admin;

  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'only_platform_admin' USING ERRCODE = '42501';
  END IF;

  UPDATE pending_owner_payouts
  SET paid_out_at = NOW(),
      paid_out_method = p_method,
      paid_out_reference = p_reference,
      paid_out_notes = p_notes,
      updated_at = NOW()
  WHERE id = p_payout_id
    AND paid_out_at IS NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_owner_payout_paid(UUID, TEXT, TEXT, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_owner_payouts_summary()
RETURNS TABLE (
  owner_user_id UUID,
  owner_full_name TEXT,
  owner_email TEXT,
  pending_count INTEGER,
  pending_total_usd NUMERIC,
  oldest_pending_at TIMESTAMPTZ,
  has_stripe_connect BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role IN ('admin', 'team_leader')
  ) INTO v_is_admin;

  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'only_platform_admin' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    p.owner_user_id,
    pr.full_name::text AS owner_full_name,
    u.email::text AS owner_email,
    COUNT(*)::int AS pending_count,
    SUM(p.net_owner_amount_usd) AS pending_total_usd,
    MIN(p.collected_at) AS oldest_pending_at,
    EXISTS (SELECT 1 FROM stripe_connected_accounts c WHERE c.user_id = p.owner_user_id) AS has_stripe_connect
  FROM pending_owner_payouts p
  LEFT JOIN auth.users u ON u.id = p.owner_user_id
  LEFT JOIN profiles pr ON pr.id = p.owner_user_id
  WHERE p.paid_out_at IS NULL
  GROUP BY p.owner_user_id, pr.full_name, u.email
  ORDER BY pending_total_usd DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_owner_payouts_summary() TO authenticated;
