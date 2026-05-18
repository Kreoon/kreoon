-- Fix: "Cobrado" debe incluir paid_amount de paquetes sin registros granulares
-- en client_package_payments (cuando el estado se marca directo en client_packages).

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
  v_costs             NUMERIC := 0;
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

  -- Fallback: paquetes con paid_amount > 0 SIN abonos granulares
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

  SELECT COALESCE(SUM(amount), 0)
  INTO v_costs
  FROM org_financial_costs
  WHERE organization_id = p_org_id
    AND currency = p_currency
    AND cost_date BETWEEN p_start AND p_end;

  SELECT COALESCE(SUM(amount), 0)
  INTO v_payroll
  FROM talent_payments
  WHERE organization_id = p_org_id
    AND COALESCE(currency, 'COP') = p_currency
    AND status = 'paid'
    AND payment_date::date BETWEEN p_start AND p_end;

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

-- Mismo fallback en get_financial_period_summary (usado en cierres)
CREATE OR REPLACE FUNCTION get_financial_period_summary(
  p_org_id     UUID,
  p_start      DATE,
  p_end        DATE,
  p_currency   TEXT DEFAULT 'COP'
)
RETURNS TABLE (
  total_income          NUMERIC,
  total_costs           NUMERIC,
  net_profit            NUMERIC,
  income_by_client      JSONB,
  costs_by_category     JSONB,
  packages_count        BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_income        NUMERIC := 0;
  v_income_pp     NUMERIC := 0;
  v_income_pkg    NUMERIC := 0;
  v_costs         NUMERIC := 0;
  v_income_json   JSONB := '[]'::JSONB;
  v_costs_json    JSONB := '[]'::JSONB;
  v_pkg_count     BIGINT := 0;
  v_pkg_count_pp  BIGINT := 0;
  v_pkg_count_pkg BIGINT := 0;
BEGIN
  SELECT COALESCE(SUM(pp.amount), 0), COUNT(DISTINCT pp.client_package_id)
  INTO v_income_pp, v_pkg_count_pp
  FROM client_package_payments pp
  JOIN client_packages cp ON cp.id = pp.client_package_id
  JOIN clients c ON c.id = cp.client_id
  WHERE c.organization_id = p_org_id
    AND pp.payment_date BETWEEN p_start AND p_end
    AND cp.currency::text = p_currency;

  SELECT COALESCE(SUM(cp.paid_amount), 0), COUNT(*)
  INTO v_income_pkg, v_pkg_count_pkg
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

  v_income := v_income_pp + v_income_pkg;
  v_pkg_count := v_pkg_count_pp + v_pkg_count_pkg;

  SELECT COALESCE(jsonb_agg(jsonb_build_object('client', client, 'total', total) ORDER BY total DESC), '[]'::JSONB)
  INTO v_income_json
  FROM (
    SELECT client, SUM(total) AS total FROM (
      SELECT c.name AS client, SUM(pp.amount) AS total
      FROM client_package_payments pp
      JOIN client_packages cp ON cp.id = pp.client_package_id
      JOIN clients c ON c.id = cp.client_id
      WHERE c.organization_id = p_org_id
        AND pp.payment_date BETWEEN p_start AND p_end
        AND cp.currency::text = p_currency
      GROUP BY c.name

      UNION ALL

      SELECT c.name AS client, SUM(cp.paid_amount) AS total
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
        )
      GROUP BY c.name
    ) merged
    GROUP BY client
  ) sub;

  SELECT COALESCE(SUM(amount), 0)
  INTO v_costs
  FROM org_financial_costs
  WHERE organization_id = p_org_id
    AND cost_date BETWEEN p_start AND p_end
    AND currency = p_currency;

  SELECT COALESCE(jsonb_agg(jsonb_build_object('category', category, 'total', total) ORDER BY total DESC), '[]'::JSONB)
  INTO v_costs_json
  FROM (
    SELECT category, SUM(amount) AS total
    FROM org_financial_costs
    WHERE organization_id = p_org_id
      AND cost_date BETWEEN p_start AND p_end
      AND currency = p_currency
    GROUP BY category
  ) sub;

  RETURN QUERY SELECT
    v_income,
    v_costs,
    v_income - v_costs,
    v_income_json,
    v_costs_json,
    v_pkg_count;
END;
$$;

GRANT EXECUTE ON FUNCTION get_financial_period_summary(UUID, DATE, DATE, TEXT) TO authenticated;

-- get_org_costs_overview también con fallback para income_in_period (el ratio)
CREATE OR REPLACE FUNCTION public.get_org_costs_overview(
  p_org_id    UUID,
  p_start     DATE,
  p_end       DATE,
  p_currency  TEXT DEFAULT 'COP'
)
RETURNS TABLE (
  total_costs           NUMERIC,
  income_in_period      NUMERIC,
  pct_of_income         NUMERIC,
  top_category          TEXT,
  top_category_amount   NUMERIC,
  linked_amount         NUMERIC,
  general_amount        NUMERIC,
  costs_by_category     JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total       NUMERIC := 0;
  v_income      NUMERIC := 0;
  v_income_pp   NUMERIC := 0;
  v_income_pkg  NUMERIC := 0;
  v_linked      NUMERIC := 0;
  v_general     NUMERIC := 0;
  v_top_cat     TEXT;
  v_top_amt     NUMERIC := 0;
  v_breakdown   JSONB := '[]'::JSONB;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM organization_members
    WHERE user_id = auth.uid() AND organization_id = p_org_id
  ) THEN RETURN; END IF;

  SELECT COALESCE(SUM(amount), 0),
         COALESCE(SUM(amount) FILTER (WHERE client_package_id IS NOT NULL), 0),
         COALESCE(SUM(amount) FILTER (WHERE client_package_id IS NULL), 0)
  INTO v_total, v_linked, v_general
  FROM org_financial_costs
  WHERE organization_id = p_org_id
    AND currency = p_currency
    AND cost_date BETWEEN p_start AND p_end;

  SELECT COALESCE(SUM(amount), 0) INTO v_income_pp
  FROM client_package_payments
  WHERE organization_id = p_org_id
    AND currency = p_currency
    AND payment_date BETWEEN p_start AND p_end;

  SELECT COALESCE(SUM(cp.paid_amount), 0) INTO v_income_pkg
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

  v_income := v_income_pp + v_income_pkg;

  SELECT category, SUM(amount)
  INTO v_top_cat, v_top_amt
  FROM org_financial_costs
  WHERE organization_id = p_org_id
    AND currency = p_currency
    AND cost_date BETWEEN p_start AND p_end
  GROUP BY category
  ORDER BY SUM(amount) DESC
  LIMIT 1;

  SELECT COALESCE(jsonb_agg(jsonb_build_object('category', category, 'total', total) ORDER BY total DESC), '[]'::JSONB)
  INTO v_breakdown
  FROM (
    SELECT category, SUM(amount) AS total
    FROM org_financial_costs
    WHERE organization_id = p_org_id
      AND currency = p_currency
      AND cost_date BETWEEN p_start AND p_end
    GROUP BY category
  ) sub;

  RETURN QUERY SELECT
    v_total,
    v_income,
    CASE WHEN v_income > 0 THEN ROUND((v_total / v_income) * 100, 2) ELSE 0 END,
    v_top_cat,
    COALESCE(v_top_amt, 0),
    v_linked,
    v_general,
    v_breakdown;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_org_costs_overview(UUID, DATE, DATE, TEXT) TO authenticated;
