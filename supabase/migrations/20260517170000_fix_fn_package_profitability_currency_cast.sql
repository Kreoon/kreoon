-- Fix: currency_type enum no castea implícitamente a text en RETURNS TABLE
-- Error en producción: "Returned type currency_type does not match expected type text in column 5"
-- Solución: castear cp.currency::text en el SELECT

CREATE OR REPLACE FUNCTION public.fn_package_profitability(p_organization_id uuid)
RETURNS TABLE (
  package_id            uuid,
  package_name          text,
  client_id             uuid,
  client_name           text,
  currency              text,
  total_value           numeric,
  paid_amount           numeric,
  agency_commission_pct numeric,
  revenue_neto          numeric,
  talent_cost           numeric,
  other_costs           numeric,
  total_costs           numeric,
  gross_margin          numeric,
  gross_margin_pct      numeric,
  content_count         int,
  content_quantity      int
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM organization_members
    WHERE user_id = auth.uid() AND organization_id = p_organization_id
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH talent_costs AS (
    SELECT
      c.client_package_id,
      COUNT(*)::int AS content_count,
      COALESCE(SUM(COALESCE(c.creator_payment, 0) + COALESCE(c.editor_payment, 0)), 0) AS talent_cost
    FROM public.content c
    WHERE c.client_package_id IS NOT NULL
      AND c.organization_id = p_organization_id
    GROUP BY c.client_package_id
  ),
  extra_costs AS (
    SELECT
      pc.package_id,
      COALESCE(SUM(pc.amount) FILTER (
        WHERE pc.cost_type != 'creator_payout' AND pc.status != 'cancelled'
      ), 0) AS other_costs
    FROM public.package_costs pc
    WHERE pc.organization_id = p_organization_id
    GROUP BY pc.package_id
  )
  SELECT
    cp.id                       AS package_id,
    cp.name                     AS package_name,
    cp.client_id,
    cl.name                     AS client_name,
    cp.currency::text,                              -- cast: currency_type → text
    cp.total_value,
    cp.paid_amount,
    cp.agency_commission_pct,
    CASE WHEN COALESCE(cp.iva_rate, 0) > 0
      THEN ROUND(cp.total_value / (1 + cp.iva_rate / 100), 2)
      ELSE cp.total_value
    END                                                               AS revenue_neto,
    COALESCE(tc.talent_cost, 0)                                       AS talent_cost,
    COALESCE(ec.other_costs, 0)                                       AS other_costs,
    COALESCE(tc.talent_cost, 0) + COALESCE(ec.other_costs, 0)        AS total_costs,
    (CASE WHEN COALESCE(cp.iva_rate, 0) > 0
      THEN ROUND(cp.total_value / (1 + cp.iva_rate / 100), 2)
      ELSE cp.total_value END)
    - COALESCE(tc.talent_cost, 0)
    - COALESCE(ec.other_costs, 0)                                     AS gross_margin,
    CASE WHEN cp.total_value > 0
      THEN ROUND(
        (
          (CASE WHEN COALESCE(cp.iva_rate, 0) > 0
            THEN ROUND(cp.total_value / (1 + cp.iva_rate / 100), 2)
            ELSE cp.total_value END)
          - COALESCE(tc.talent_cost, 0)
          - COALESCE(ec.other_costs, 0)
        ) / cp.total_value * 100, 2)
      ELSE 0
    END                                                               AS gross_margin_pct,
    COALESCE(tc.content_count, 0)                                     AS content_count,
    cp.content_quantity
  FROM public.client_packages cp
  JOIN public.clients cl ON cl.id = cp.client_id
  LEFT JOIN talent_costs  tc ON tc.client_package_id = cp.id
  LEFT JOIN extra_costs   ec ON ec.package_id = cp.id
  WHERE cl.organization_id = p_organization_id
    AND cp.is_barter = false
  ORDER BY gross_margin_pct ASC;
END; $$;

GRANT EXECUTE ON FUNCTION public.fn_package_profitability(uuid) TO authenticated;

COMMENT ON FUNCTION public.fn_package_profitability(uuid) IS
  'v2.1: fix cast currency_type→text. Margen real por paquete. Costos talento desde content.creator_payment + editor_payment. Costos adicionales desde package_costs.';
