-- Fix: la utilidad neta debe descontar TODOS los costos.
-- Antes: solo talent_payments.status='paid' y org_financial_costs.
-- Ahora: incluye también package_costs y los pagos marcados en
-- content.creator_paid / editor_paid sin doble conteo vía content_ids.

CREATE OR REPLACE FUNCTION public.get_org_finance_overview(
  p_org_id    UUID,
  p_start     DATE,
  p_end       DATE,
  p_currency  TEXT DEFAULT 'COP'
)
RETURNS TABLE (
  total_sold        NUMERIC,
  total_collected   NUMERIC,
  total_pending     NUMERIC,
  costs             NUMERIC,
  payroll           NUMERIC,
  net_profit        NUMERIC,
  margin_pct        NUMERIC,
  packages_sold     BIGINT,
  payments_count    BIGINT,
  overdue_count     BIGINT,
  overdue_amount    NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sold              NUMERIC := 0;
  v_collected_pp      NUMERIC := 0;
  v_collected_pkg     NUMERIC := 0;
  v_collected         NUMERIC := 0;
  v_pending           NUMERIC := 0;
  v_costs_op          NUMERIC := 0;
  v_costs_pkg         NUMERIC := 0;
  v_costs             NUMERIC := 0;
  v_payroll_tp        NUMERIC := 0;
  v_payroll_content   NUMERIC := 0;
  v_payroll           NUMERIC := 0;
  v_pkg_sold          BIGINT  := 0;
  v_pay_count_pp      BIGINT  := 0;
  v_pay_count_pkg     BIGINT  := 0;
  v_overdue_n         BIGINT  := 0;
  v_overdue_a         NUMERIC := 0;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM organization_members
    WHERE user_id = auth.uid() AND organization_id = p_org_id
  ) THEN RETURN; END IF;

  SELECT COALESCE(SUM(cp.total_value), 0), COUNT(*)
  INTO v_sold, v_pkg_sold
  FROM client_packages cp
  JOIN clients c ON c.id = cp.client_id
  WHERE c.organization_id = p_org_id
    AND cp.is_barter = false
    AND cp.currency::text = p_currency
    AND cp.created_at::date BETWEEN p_start AND p_end;

  SELECT COALESCE(SUM(pp.amount), 0), COUNT(*)
  INTO v_collected_pp, v_pay_count_pp
  FROM client_package_payments pp
  WHERE pp.organization_id = p_org_id
    AND pp.currency = p_currency
    AND pp.payment_date BETWEEN p_start AND p_end;

  SELECT COALESCE(SUM(cp.paid_amount), 0), COUNT(*)
  INTO v_collected_pkg, v_pay_count_pkg
  FROM client_packages cp
  JOIN clients c ON c.id = cp.client_id
  WHERE c.organization_id = p_org_id
    AND cp.is_barter = false
    AND cp.currency::text = p_currency
    AND cp.paid_amount > 0
    AND COALESCE(cp.paid_at::date, cp.created_at::date) BETWEEN p_start AND p_end
    AND NOT EXISTS (
      SELECT 1 FROM client_package_payments pp2
      WHERE pp2.client_package_id = cp.id
    );

  v_collected := v_collected_pp + v_collected_pkg;

  SELECT COALESCE(SUM(cp.total_value - cp.paid_amount), 0)
  INTO v_pending
  FROM client_packages cp
  JOIN clients c ON c.id = cp.client_id
  WHERE c.organization_id = p_org_id
    AND cp.is_barter = false
    AND cp.is_active = true
    AND cp.currency::text = p_currency
    AND cp.payment_status != 'paid';

  -- COSTOS OPERATIVOS (org_financial_costs)
  SELECT COALESCE(SUM(amount), 0)
  INTO v_costs_op
  FROM org_financial_costs
  WHERE organization_id = p_org_id
    AND currency = p_currency
    AND cost_date BETWEEN p_start AND p_end;

  -- COSTOS POR PAQUETE (package_costs, excluyendo creator_payout que ya entra por content)
  SELECT COALESCE(SUM(pc.amount), 0)
  INTO v_costs_pkg
  FROM package_costs pc
  WHERE pc.organization_id = p_org_id
    AND pc.currency = p_currency
    AND pc.cost_type != 'creator_payout'
    AND pc.status != 'cancelled'
    AND COALESCE(pc.paid_date, pc.created_at::date) BETWEEN p_start AND p_end;

  v_costs := v_costs_op + v_costs_pkg;

  -- NÓMINA: pagos formales registrados en talent_payments
  SELECT COALESCE(SUM(amount), 0)
  INTO v_payroll_tp
  FROM talent_payments
  WHERE organization_id = p_org_id
    AND COALESCE(currency, 'COP') = p_currency
    AND status = 'paid'
    AND payment_date::date BETWEEN p_start AND p_end;

  -- NÓMINA fallback: contenidos marcados como pagados directamente
  -- (creator_paid/editor_paid=true) que NO están ya en algún talent_payment.content_ids
  WITH contents_in_payments AS (
    SELECT DISTINCT unnest(content_ids) AS content_id
    FROM talent_payments
    WHERE organization_id = p_org_id
      AND content_ids IS NOT NULL
  )
  SELECT COALESCE(SUM(
    CASE WHEN ct.creator_paid AND ct.id NOT IN (SELECT content_id FROM contents_in_payments)
      THEN COALESCE(ct.creator_payment, 0) ELSE 0 END
    +
    CASE WHEN ct.editor_paid AND ct.id NOT IN (SELECT content_id FROM contents_in_payments)
      THEN COALESCE(ct.editor_payment, 0) ELSE 0 END
  ), 0)
  INTO v_payroll_content
  FROM content ct
  LEFT JOIN client_packages cp ON cp.id = ct.client_package_id
  WHERE ct.organization_id = p_org_id
    AND COALESCE(ct.paid_at::date, ct.updated_at::date) BETWEEN p_start AND p_end
    AND COALESCE(cp.currency::text, 'COP') = p_currency
    AND (ct.creator_paid = true OR ct.editor_paid = true);

  v_payroll := v_payroll_tp + v_payroll_content;

  SELECT COUNT(*), COALESCE(SUM(cp.total_value - cp.paid_amount), 0)
  INTO v_overdue_n, v_overdue_a
  FROM client_packages cp
  JOIN clients c ON c.id = cp.client_id
  WHERE c.organization_id = p_org_id
    AND cp.is_barter = false
    AND cp.is_active = true
    AND cp.currency::text = p_currency
    AND cp.payment_status != 'paid'
    AND cp.payment_due_date IS NOT NULL
    AND cp.payment_due_date < CURRENT_DATE;

  RETURN QUERY SELECT
    v_sold,
    v_collected,
    v_pending,
    v_costs,
    v_payroll,
    v_collected - v_costs - v_payroll,
    CASE WHEN v_collected > 0
      THEN ROUND(((v_collected - v_costs - v_payroll) / v_collected) * 100, 2)
      ELSE 0 END,
    v_pkg_sold,
    v_pay_count_pp + v_pay_count_pkg,
    v_overdue_n,
    v_overdue_a;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_org_finance_overview(UUID, DATE, DATE, TEXT) TO authenticated;
