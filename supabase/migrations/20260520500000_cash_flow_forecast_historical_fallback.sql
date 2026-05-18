-- Cash flow forecast con fallback histórico.
-- Cuando no hay cuotas/recurrentes/due_dates programados, usa el promedio
-- mensual de los últimos 6 meses prorrateado por semana.

CREATE OR REPLACE FUNCTION public.fn_cash_flow_forecast(
  p_organization_id uuid,
  p_currency text DEFAULT 'COP'::text,
  p_weeks integer DEFAULT 12
)
RETURNS TABLE(
  week_number integer, week_start date, week_end date,
  inflow_confirmed numeric, inflow_estimated numeric,
  outflow_costs numeric, outflow_recurring numeric,
  net_week numeric, confidence_score numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_base_date date := CURRENT_DATE;
  v_week_start date; v_week_end date; v_week int;
  v_inflow_confirmed numeric; v_inflow_estimated numeric;
  v_outflow_costs numeric; v_outflow_recurring numeric;
  v_hist_weekly_inflow numeric := 0;
  v_hist_weekly_costs numeric := 0;
  v_hist_weekly_payroll numeric := 0;
  v_use_historical boolean := false;
  v_scheduled_total numeric := 0;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM organization_members om
    WHERE om.user_id = auth.uid() AND om.organization_id = p_organization_id
  ) THEN RETURN; END IF;

  SELECT
    COALESCE((SELECT SUM(pi.amount) FROM package_installments pi
              JOIN client_packages cp ON cp.id = pi.package_id
              JOIN clients c ON c.id = cp.client_id
              WHERE c.organization_id = p_organization_id
                AND cp.currency::text = p_currency
                AND pi.status IN ('scheduled','invoiced')
                AND pi.due_date BETWEEN v_base_date AND v_base_date + (p_weeks * 7)), 0)
    + COALESCE((SELECT SUM(cp.total_value - cp.paid_amount) FROM client_packages cp
              JOIN clients c ON c.id = cp.client_id
              WHERE c.organization_id = p_organization_id
                AND cp.currency::text = p_currency AND cp.is_barter = false
                AND cp.payment_status != 'paid'
                AND cp.payment_due_date BETWEEN v_base_date AND v_base_date + (p_weeks * 7)), 0)
    + COALESCE((SELECT SUM(re.amount) FROM recurring_expenses re
              WHERE re.organization_id = p_organization_id
                AND re.currency::text = p_currency AND re.is_active = true), 0)
  INTO v_scheduled_total;

  v_use_historical := (v_scheduled_total = 0);

  IF v_use_historical THEN
    SELECT COALESCE(SUM(combined) / 26.0, 0)
    INTO v_hist_weekly_inflow
    FROM (
      SELECT pp.amount AS combined FROM client_package_payments pp
      WHERE pp.organization_id = p_organization_id
        AND pp.currency = p_currency
        AND pp.payment_date > CURRENT_DATE - INTERVAL '6 months'
      UNION ALL
      SELECT cp.paid_amount FROM client_packages cp
      JOIN clients c ON c.id = cp.client_id
      WHERE c.organization_id = p_organization_id AND cp.is_barter = false
        AND cp.currency::text = p_currency AND cp.paid_amount > 0
        AND COALESCE(cp.paid_at::date, cp.created_at::date) > CURRENT_DATE - INTERVAL '6 months'
        AND NOT EXISTS (SELECT 1 FROM client_package_payments pp2 WHERE pp2.client_package_id = cp.id)
    ) sub;

    SELECT COALESCE(SUM(amount) / 26.0, 0) INTO v_hist_weekly_costs
    FROM org_financial_costs
    WHERE organization_id = p_organization_id AND currency = p_currency
      AND cost_date > CURRENT_DATE - INTERVAL '6 months';

    IF p_currency = 'COP' THEN
      SELECT COALESCE(SUM(amount) / 26.0, 0) INTO v_hist_weekly_payroll
      FROM (
        SELECT tp.amount FROM talent_payments tp
        WHERE tp.organization_id = p_organization_id
          AND COALESCE(tp.currency,'COP') = 'COP' AND tp.status = 'paid'
          AND tp.payment_date::date > CURRENT_DATE - INTERVAL '6 months'
        UNION ALL
        SELECT
          (CASE WHEN ct.creator_paid AND ct.id NOT IN (
            SELECT DISTINCT unnest(content_ids) FROM talent_payments
            WHERE organization_id = p_organization_id AND content_ids IS NOT NULL)
            THEN COALESCE(ct.creator_payment,0) ELSE 0 END
          + CASE WHEN ct.editor_paid AND ct.id NOT IN (
            SELECT DISTINCT unnest(content_ids) FROM talent_payments
            WHERE organization_id = p_organization_id AND content_ids IS NOT NULL)
            THEN COALESCE(ct.editor_payment,0) ELSE 0 END)
        FROM content ct
        WHERE ct.organization_id = p_organization_id
          AND COALESCE(ct.paid_at::date, ct.updated_at::date) > CURRENT_DATE - INTERVAL '6 months'
          AND (ct.creator_paid OR ct.editor_paid)
      ) sub;
    END IF;
  END IF;

  FOR v_week IN 0..(p_weeks - 1) LOOP
    v_week_start := v_base_date + (v_week * 7);
    v_week_end := v_week_start + 6;

    SELECT COALESCE(SUM(pi.amount), 0) INTO v_inflow_confirmed
    FROM package_installments pi
    JOIN client_packages cp ON cp.id = pi.package_id
    JOIN clients c ON c.id = cp.client_id
    WHERE c.organization_id = p_organization_id
      AND cp.currency::text = p_currency
      AND pi.status IN ('scheduled', 'invoiced')
      AND pi.due_date BETWEEN v_week_start AND v_week_end;

    SELECT COALESCE(SUM(GREATEST(cp.total_value - cp.paid_amount, 0)), 0) INTO v_inflow_estimated
    FROM client_packages cp
    JOIN clients c ON c.id = cp.client_id
    WHERE c.organization_id = p_organization_id
      AND cp.currency::text = p_currency AND cp.is_barter = false
      AND cp.payment_status != 'paid'
      AND cp.payment_due_date BETWEEN v_week_start AND v_week_end
      AND NOT EXISTS (SELECT 1 FROM package_installments pi WHERE pi.package_id = cp.id);

    SELECT COALESCE(SUM(pc.amount) / GREATEST(p_weeks, 1), 0) INTO v_outflow_costs
    FROM package_costs pc
    JOIN client_packages cp ON cp.id = pc.package_id
    JOIN clients c ON c.id = cp.client_id
    WHERE c.organization_id = p_organization_id
      AND cp.currency::text = p_currency AND pc.status = 'committed' AND cp.is_barter = false;

    SELECT COALESCE(SUM(
      CASE re.frequency
        WHEN 'weekly' THEN re.amount
        WHEN 'monthly' THEN re.amount / 4.33
        WHEN 'quarterly' THEN re.amount / 13
        WHEN 'annual' THEN re.amount / 52
        ELSE 0 END
    ), 0) INTO v_outflow_recurring
    FROM recurring_expenses re
    WHERE re.organization_id = p_organization_id
      AND re.currency::text = p_currency AND re.is_active = true;

    IF v_use_historical THEN
      v_inflow_estimated := v_inflow_estimated + v_hist_weekly_inflow;
      v_outflow_recurring := v_outflow_recurring + v_hist_weekly_costs + v_hist_weekly_payroll;
    END IF;

    RETURN QUERY SELECT
      v_week + 1, v_week_start, v_week_end,
      v_inflow_confirmed, v_inflow_estimated,
      v_outflow_costs, v_outflow_recurring,
      (v_inflow_confirmed + v_inflow_estimated) - (v_outflow_costs + v_outflow_recurring),
      CASE
        WHEN v_use_historical THEN 35
        WHEN (v_inflow_confirmed + v_inflow_estimated) = 0 THEN 0
        WHEN v_inflow_confirmed / (v_inflow_confirmed + v_inflow_estimated) >= 0.8 THEN 90
        WHEN v_inflow_confirmed / (v_inflow_confirmed + v_inflow_estimated) >= 0.5 THEN 65
        ELSE 40
      END;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_cash_flow_forecast(uuid, text, integer) TO authenticated;
