CREATE OR REPLACE FUNCTION public.fn_package_profitability(p_organization_id uuid)
RETURNS TABLE (
  package_id          uuid,
  package_name        text,
  client_id           uuid,
  client_name         text,
  currency            text,
  total_value         numeric,
  paid_amount         numeric,
  agency_commission_pct numeric,
  revenue_neto        numeric,
  talent_cost         numeric,
  other_costs         numeric,
  total_costs         numeric,
  gross_margin        numeric,
  gross_margin_pct    numeric,
  content_quantity    int,
  cost_per_video      numeric
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  SELECT
    cp.id               AS package_id,
    cp.name             AS package_name,
    cp.client_id,
    c.name              AS client_name,
    cp.currency,
    cp.total_value,
    cp.paid_amount,
    cp.agency_commission_pct,
    -- Revenue neto: si tiene IVA, descontar; sino usar total_value directamente
    CASE WHEN COALESCE(cp.iva_rate, 0) > 0
      THEN ROUND(cp.total_value / (1 + cp.iva_rate / 100), 2)
      ELSE cp.total_value
    END AS revenue_neto,
    -- Costos de talento (creator_payout en package_costs)
    COALESCE(SUM(pc.amount) FILTER (WHERE pc.cost_type = 'creator_payout' AND pc.status != 'cancelled'), 0) AS talent_cost,
    -- Otros costos directos
    COALESCE(SUM(pc.amount) FILTER (WHERE pc.cost_type != 'creator_payout' AND pc.status != 'cancelled'), 0) AS other_costs,
    -- Total costos
    COALESCE(SUM(pc.amount) FILTER (WHERE pc.status != 'cancelled'), 0) AS total_costs,
    -- Margen bruto
    (CASE WHEN COALESCE(cp.iva_rate, 0) > 0
      THEN ROUND(cp.total_value / (1 + cp.iva_rate / 100), 2)
      ELSE cp.total_value
    END) - COALESCE(SUM(pc.amount) FILTER (WHERE pc.status != 'cancelled'), 0) AS gross_margin,
    -- Margen %
    CASE WHEN cp.total_value > 0
      THEN ROUND(
        ((CASE WHEN COALESCE(cp.iva_rate, 0) > 0
          THEN ROUND(cp.total_value / (1 + cp.iva_rate / 100), 2)
          ELSE cp.total_value END)
          - COALESCE(SUM(pc.amount) FILTER (WHERE pc.status != 'cancelled'), 0))
        / cp.total_value * 100, 2)
      ELSE 0
    END AS gross_margin_pct,
    cp.content_quantity,
    CASE WHEN COALESCE(cp.content_quantity, 0) > 0
      THEN ROUND(COALESCE(SUM(pc.amount) FILTER (WHERE pc.status != 'cancelled'), 0) / cp.content_quantity, 2)
      ELSE 0
    END AS cost_per_video
  FROM client_packages cp
  JOIN clients c ON c.id = cp.client_id
  LEFT JOIN package_costs pc ON pc.package_id = cp.id
  WHERE cp.is_barter = false
    AND EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.user_id = auth.uid() AND om.organization_id = p_organization_id
    )
  GROUP BY cp.id, c.name
  ORDER BY gross_margin_pct ASC;
END; $$;

COMMENT ON FUNCTION public.fn_package_profitability(uuid) IS
  'Rentabilidad por paquete: revenue_neto - costos = margen bruto. Ordena de menos a más rentable.';
