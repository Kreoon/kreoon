-- ============================================
-- Finance v2 — Realtime y RPCs de overview
-- ============================================

-- 1) Habilitar realtime en tablas financieras críticas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'client_package_payments'
  ) THEN ALTER PUBLICATION supabase_realtime ADD TABLE public.client_package_payments;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'org_financial_costs'
  ) THEN ALTER PUBLICATION supabase_realtime ADD TABLE public.org_financial_costs;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'org_financial_closings'
  ) THEN ALTER PUBLICATION supabase_realtime ADD TABLE public.org_financial_closings;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'package_costs'
  ) THEN ALTER PUBLICATION supabase_realtime ADD TABLE public.package_costs;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'recurring_expenses'
  ) THEN ALTER PUBLICATION supabase_realtime ADD TABLE public.recurring_expenses;
  END IF;
END $$;

-- 2) RPC: Overview de Finanzas (tab 1)
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
  v_sold        NUMERIC := 0;
  v_collected   NUMERIC := 0;
  v_pending     NUMERIC := 0;
  v_costs       NUMERIC := 0;
  v_payroll     NUMERIC := 0;
  v_pkg_sold    BIGINT  := 0;
  v_pay_count   BIGINT  := 0;
  v_overdue_n   BIGINT  := 0;
  v_overdue_a   NUMERIC := 0;
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
  INTO v_collected, v_pay_count
  FROM client_package_payments pp
  WHERE pp.organization_id = p_org_id
    AND pp.currency = p_currency
    AND pp.payment_date BETWEEN p_start AND p_end;

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
    v_pay_count,
    v_overdue_n,
    v_overdue_a;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_org_finance_overview(UUID, DATE, DATE, TEXT) TO authenticated;

-- 3) RPC: Overview de Nómina (tab 2)
CREATE OR REPLACE FUNCTION public.get_org_payroll_overview(
  p_org_id  UUID,
  p_start   DATE,
  p_end     DATE
)
RETURNS TABLE (
  to_settle           NUMERIC,
  in_transfer         NUMERIC,
  paid_in_period      NUMERIC,
  avg_payment         NUMERIC,
  talents_paid        BIGINT,
  overdue_count       BIGINT,
  overdue_amount      NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_to_settle    NUMERIC := 0;
  v_in_transfer  NUMERIC := 0;
  v_paid         NUMERIC := 0;
  v_talents      BIGINT  := 0;
  v_overdue_n    BIGINT  := 0;
  v_overdue_a    NUMERIC := 0;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM organization_members
    WHERE user_id = auth.uid() AND organization_id = p_org_id
  ) THEN RETURN; END IF;

  SELECT COALESCE(SUM(amount) FILTER (WHERE status = 'pending'), 0),
         COALESCE(SUM(amount) FILTER (WHERE status = 'processing'), 0)
  INTO v_to_settle, v_in_transfer
  FROM talent_payments
  WHERE organization_id = p_org_id;

  v_to_settle := v_to_settle + v_in_transfer;

  SELECT COALESCE(SUM(amount), 0), COUNT(DISTINCT user_id)
  INTO v_paid, v_talents
  FROM talent_payments
  WHERE organization_id = p_org_id
    AND status = 'paid'
    AND payment_date::date BETWEEN p_start AND p_end;

  SELECT COUNT(*), COALESCE(SUM(amount), 0)
  INTO v_overdue_n, v_overdue_a
  FROM talent_payments
  WHERE organization_id = p_org_id
    AND status IN ('pending', 'processing')
    AND payment_date IS NOT NULL
    AND payment_date::date < CURRENT_DATE;

  RETURN QUERY SELECT
    v_to_settle,
    v_in_transfer,
    v_paid,
    CASE WHEN v_talents > 0 THEN ROUND(v_paid / v_talents, 2) ELSE 0 END,
    v_talents,
    v_overdue_n,
    v_overdue_a;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_org_payroll_overview(UUID, DATE, DATE) TO authenticated;

-- 4) RPC: Overview de Costos (tab 3)
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
  v_total      NUMERIC := 0;
  v_income     NUMERIC := 0;
  v_linked     NUMERIC := 0;
  v_general    NUMERIC := 0;
  v_top_cat    TEXT;
  v_top_amt    NUMERIC := 0;
  v_breakdown  JSONB := '[]'::JSONB;
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

  SELECT COALESCE(SUM(amount), 0) INTO v_income
  FROM client_package_payments
  WHERE organization_id = p_org_id
    AND currency = p_currency
    AND payment_date BETWEEN p_start AND p_end;

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

-- 5) Extender fn_package_profitability con external_costs
DROP FUNCTION IF EXISTS public.fn_package_profitability(UUID);

CREATE FUNCTION public.fn_package_profitability(p_organization_id uuid)
RETURNS TABLE(
  package_id uuid,
  package_name text,
  campaign_number bigint,
  client_id uuid,
  client_name text,
  currency text,
  total_value numeric,
  paid_amount numeric,
  agency_commission_pct numeric,
  revenue_neto numeric,
  talent_cost numeric,
  other_costs numeric,
  external_costs numeric,
  total_costs numeric,
  gross_margin numeric,
  gross_margin_pct numeric,
  content_count integer,
  content_quantity integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM organization_members
    WHERE user_id = auth.uid() AND organization_id = p_organization_id
  ) THEN RETURN; END IF;

  RETURN QUERY
  WITH talent_costs AS (
    SELECT c.client_package_id,
           COUNT(*)::int AS content_count,
           COALESCE(SUM(COALESCE(c.creator_payment,0)+COALESCE(c.editor_payment,0)),0) AS talent_cost
    FROM public.content c
    WHERE c.client_package_id IS NOT NULL AND c.organization_id = p_organization_id
    GROUP BY c.client_package_id
  ),
  extra_costs AS (
    SELECT pc.package_id,
           COALESCE(SUM(pc.amount) FILTER (WHERE pc.cost_type!='creator_payout' AND pc.status!='cancelled'),0) AS other_costs
    FROM public.package_costs pc
    WHERE pc.organization_id = p_organization_id
    GROUP BY pc.package_id
  ),
  ext_costs AS (
    SELECT ofc.client_package_id,
           COALESCE(SUM(ofc.amount), 0) AS external_costs
    FROM public.org_financial_costs ofc
    WHERE ofc.organization_id = p_organization_id
      AND ofc.client_package_id IS NOT NULL
    GROUP BY ofc.client_package_id
  )
  SELECT
    cp.id,
    cp.name,
    cp.campaign_number,
    cp.client_id,
    cl.name,
    cp.currency::text,
    cp.total_value,
    cp.paid_amount,
    cp.agency_commission_pct,
    CASE WHEN COALESCE(cp.iva_rate,0)>0 THEN ROUND(cp.total_value/(1+cp.iva_rate/100),2) ELSE cp.total_value END,
    COALESCE(tc.talent_cost,0),
    COALESCE(ec.other_costs,0),
    COALESCE(xc.external_costs, 0),
    COALESCE(tc.talent_cost,0) + COALESCE(ec.other_costs,0) + COALESCE(xc.external_costs, 0),
    (CASE WHEN COALESCE(cp.iva_rate,0)>0 THEN ROUND(cp.total_value/(1+cp.iva_rate/100),2) ELSE cp.total_value END)
      - COALESCE(tc.talent_cost,0) - COALESCE(ec.other_costs,0) - COALESCE(xc.external_costs, 0),
    CASE WHEN cp.total_value>0 THEN ROUND(
      ((CASE WHEN COALESCE(cp.iva_rate,0)>0 THEN ROUND(cp.total_value/(1+cp.iva_rate/100),2) ELSE cp.total_value END)
       - COALESCE(tc.talent_cost,0) - COALESCE(ec.other_costs,0) - COALESCE(xc.external_costs, 0)) / cp.total_value * 100, 2)
    ELSE 0 END,
    COALESCE(tc.content_count, 0),
    cp.content_quantity
  FROM public.client_packages cp
  JOIN public.clients cl ON cl.id = cp.client_id
  LEFT JOIN talent_costs tc ON tc.client_package_id = cp.id
  LEFT JOIN extra_costs  ec ON ec.package_id = cp.id
  LEFT JOIN ext_costs    xc ON xc.client_package_id = cp.id
  WHERE cl.organization_id = p_organization_id AND cp.is_barter = false
  ORDER BY 16 ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_package_profitability(UUID) TO authenticated;
