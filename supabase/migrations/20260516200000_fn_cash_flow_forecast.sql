-- Flujo de caja proyectado semana a semana (12 semanas)
-- Inflows: installments scheduled/invoiced + packages sin cuotas con due_date
-- Outflows: recurring_expenses activos + package_costs committed
CREATE OR REPLACE FUNCTION public.fn_cash_flow_forecast(
  p_organization_id uuid,
  p_currency        text DEFAULT 'COP',
  p_weeks           int  DEFAULT 12
)
RETURNS TABLE (
  week_number       int,
  week_start        date,
  week_end          date,
  inflow_confirmed  numeric,
  inflow_estimated  numeric,
  outflow_costs     numeric,
  outflow_recurring numeric,
  net_week          numeric,
  confidence_score  numeric
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_base_date date := CURRENT_DATE;
  v_week_start date;
  v_week_end   date;
  v_week       int;
  v_inflow_confirmed numeric;
  v_inflow_estimated numeric;
  v_outflow_costs    numeric;
  v_outflow_recurring numeric;
BEGIN
  -- Validate member access
  IF NOT EXISTS (
    SELECT 1 FROM organization_members om
    WHERE om.user_id = auth.uid() AND om.organization_id = p_organization_id
  ) THEN RETURN; END IF;

  FOR v_week IN 0..(p_weeks - 1) LOOP
    v_week_start := v_base_date + (v_week * 7);
    v_week_end   := v_week_start + 6;

    -- Inflows confirmados: installments con due_date en rango
    SELECT COALESCE(SUM(pi.amount), 0) INTO v_inflow_confirmed
    FROM package_installments pi
    JOIN client_packages cp ON cp.id = pi.package_id
    WHERE cp.currency = p_currency
      AND pi.status IN ('scheduled', 'invoiced')
      AND pi.due_date BETWEEN v_week_start AND v_week_end
      AND EXISTS (
        SELECT 1 FROM clients c
        JOIN organization_members om ON om.user_id = auth.uid()
        WHERE c.id = cp.client_id AND om.organization_id = p_organization_id
      );

    -- Inflows estimados: packages sin installments, con payment_due_date en rango
    SELECT COALESCE(SUM(GREATEST(cp.total_value - cp.paid_amount, 0)), 0) INTO v_inflow_estimated
    FROM client_packages cp
    WHERE cp.currency = p_currency
      AND cp.is_barter = false
      AND cp.payment_status != 'paid'
      AND cp.payment_due_date BETWEEN v_week_start AND v_week_end
      AND NOT EXISTS (SELECT 1 FROM package_installments pi WHERE pi.package_id = cp.id)
      AND EXISTS (
        SELECT 1 FROM clients c
        JOIN organization_members om ON om.user_id = auth.uid()
        WHERE c.id = cp.client_id AND om.organization_id = p_organization_id
      );

    -- Outflows: costos comprometidos distribuidos en el horizonte
    SELECT COALESCE(SUM(pc.amount) / GREATEST(p_weeks, 1), 0) INTO v_outflow_costs
    FROM package_costs pc
    JOIN client_packages cp ON cp.id = pc.package_id
    WHERE cp.currency = p_currency
      AND pc.status = 'committed'
      AND cp.is_barter = false
      AND EXISTS (
        SELECT 1 FROM clients c
        JOIN organization_members om ON om.user_id = auth.uid()
        WHERE c.id = cp.client_id AND om.organization_id = p_organization_id
      );

    -- Outflows: gastos recurrentes normalizados a semana
    SELECT COALESCE(
      SUM(
        CASE re.frequency
          WHEN 'weekly'    THEN re.amount
          WHEN 'monthly'   THEN re.amount / 4.33
          WHEN 'quarterly' THEN re.amount / 13
          WHEN 'annual'    THEN re.amount / 52
          ELSE 0
        END
      ), 0
    ) INTO v_outflow_recurring
    FROM recurring_expenses re
    WHERE re.organization_id = p_organization_id
      AND re.currency = p_currency
      AND re.is_active = true;

    RETURN QUERY SELECT
      v_week + 1,
      v_week_start,
      v_week_end,
      v_inflow_confirmed,
      v_inflow_estimated,
      v_outflow_costs,
      v_outflow_recurring,
      (v_inflow_confirmed + v_inflow_estimated) - (v_outflow_costs + v_outflow_recurring),
      CASE
        WHEN (v_inflow_confirmed + v_inflow_estimated) = 0 THEN 0
        WHEN v_inflow_confirmed / (v_inflow_confirmed + v_inflow_estimated) >= 0.8 THEN 90
        WHEN v_inflow_confirmed / (v_inflow_confirmed + v_inflow_estimated) >= 0.5 THEN 65
        ELSE 40
      END;
  END LOOP;
END; $$;

COMMENT ON FUNCTION public.fn_cash_flow_forecast(uuid, text, int) IS
  'Proyección de flujo de caja semana a semana. Inflows: cuotas programadas + estimados. Outflows: costos + gastos recurrentes.';
