-- Validacion post-checklist (segunda pasada): activate_campaign tenia TRES
-- problemas, descubiertos al validar el fix del escrow de campanas:
--
-- 1. SIN validacion de caller: SECURITY DEFINER + GRANT authenticated, no
--    chequeaba auth.uid(). Cualquier usuario logueado podia activar
--    CUALQUIER campana (propia o ajena) llamando el RPC directo, saltandose
--    el pago de Stripe -- status pasaba a 'active' sin cobro (paywall bypass,
--    mismo patron que register_user_to_organization).
--
-- 2. INSERT roto contra escrow_holds: usaba columnas inexistentes
--    (payer_wallet_id, payee_wallet_id, amount) -- con total_budget > 0
--    reventaba en runtime (42703), la activacion manual del admin en
--    PendingPaymentsPage nunca funciono para campanas con presupuesto.
--
-- 3. Lookup del wallet roto: pw.owner_id no existe en unified_wallets
--    (las columnas reales son user_id / organization_id).
--
-- Fix:
-- - Guard: platform admin puede activar cualquier campana (caso
--   PendingPaymentsPage: verifico el pago por fuera). El owner (created_by)
--   o un admin de la org solo pueden activar campanas SIN dinero de por
--   medio (campaign_type='exchange' o total_budget nulo/0) -- las campanas
--   pagas se activan unicamente via checkout de Stripe -> stripe-webhook.
-- - INSERT corregido a las columnas reales de escrow_holds:
--   project_type='campaign_managed', client_id, client_wallet_id,
--   total_amount, platform_fee_rate (fraccion), distributions=[] jsonb.
--   Status queda en el default 'created' (NO 'funded': aca no hay pago
--   Stripe verificado; 'funded' lo pone solo el webhook).
-- - Wallet: por organization_id de la campana, fallback a user_id del
--   creador; prefiere wallet de organizacion.
--
-- Verificado en vivo (rollback): tercero -> "Not authorized"; owner no-admin
-- con campana paga -> "Paid campaigns must be activated through checkout";
-- platform admin con campana paga -> escrow creado correcto, in_escrow.

CREATE OR REPLACE FUNCTION public.activate_campaign(p_campaign_id uuid, p_payment_intent_id text DEFAULT NULL)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_campaign RECORD;
  v_escrow_id UUID;
  v_is_platform_admin BOOLEAN;
  v_is_owner_or_org_admin BOOLEAN;
  v_requires_payment BOOLEAN;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Authentication required');
  END IF;

  SELECT * INTO v_campaign FROM marketplace_campaigns WHERE id = p_campaign_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Campaign not found');
  END IF;

  v_is_platform_admin := public.is_platform_admin(auth.uid());
  v_is_owner_or_org_admin := (v_campaign.created_by = auth.uid())
    OR (v_campaign.organization_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_id = v_campaign.organization_id
        AND user_id = auth.uid()
        AND role IN ('admin', 'team_leader')
    ));

  IF NOT v_is_platform_admin AND NOT v_is_owner_or_org_admin THEN
    RETURN json_build_object('success', false, 'error', 'Not authorized to activate this campaign');
  END IF;

  v_requires_payment := COALESCE(v_campaign.campaign_type, '') <> 'exchange'
    AND COALESCE(v_campaign.total_budget, 0) > 0;

  IF v_requires_payment AND NOT v_is_platform_admin THEN
    RETURN json_build_object('success', false, 'error', 'Paid campaigns must be activated through checkout');
  END IF;

  IF v_campaign.status NOT IN ('draft', 'active') THEN
    RETURN json_build_object('success', false, 'error', 'Campaign cannot be activated in current status');
  END IF;

  IF v_campaign.total_budget IS NOT NULL AND v_campaign.total_budget > 0 THEN
    INSERT INTO escrow_holds (
      project_type, project_title, client_id, client_wallet_id,
      total_amount, currency, platform_fee_rate, distributions,
      expires_at, metadata
    )
    SELECT
      'campaign_managed',
      'Campaign escrow: ' || v_campaign.title,
      v_campaign.created_by,
      pw.id,
      v_campaign.total_budget,
      COALESCE(v_campaign.currency, 'USD'),
      COALESCE(v_campaign.commission_rate, 30) / 100.0,
      '[]'::jsonb,
      v_campaign.campaign_end_date + INTERVAL '7 days',
      jsonb_build_object('campaign_id', p_campaign_id, 'commission_rate', v_campaign.commission_rate, 'type', 'campaign_escrow')
    FROM unified_wallets pw
    WHERE (
        (v_campaign.organization_id IS NOT NULL AND pw.organization_id = v_campaign.organization_id)
        OR pw.user_id = v_campaign.created_by
      )
      AND pw.wallet_type IN ('organization', 'creator')
      AND pw.is_active = true
    ORDER BY CASE WHEN pw.wallet_type = 'organization' THEN 0 ELSE 1 END
    LIMIT 1
    RETURNING id INTO v_escrow_id;
  END IF;

  UPDATE marketplace_campaigns SET
    status = 'active',
    payment_status = CASE WHEN v_escrow_id IS NOT NULL THEN 'in_escrow' ELSE 'pending_payment' END,
    escrow_hold_id = v_escrow_id,
    stripe_payment_intent_id = p_payment_intent_id,
    activated_at = NOW(),
    published_at = COALESCE(published_at, NOW())
  WHERE id = p_campaign_id;

  RETURN json_build_object(
    'success', true,
    'campaign_id', p_campaign_id,
    'escrow_hold_id', v_escrow_id,
    'payment_status', CASE WHEN v_escrow_id IS NOT NULL THEN 'in_escrow' ELSE 'pending_payment' END
  );
END;
$$;

NOTIFY pgrst, 'reload schema';
