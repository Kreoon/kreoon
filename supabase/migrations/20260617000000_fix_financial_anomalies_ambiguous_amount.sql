-- ============================================================================
-- Fix: get_org_financial_anomalies — "column reference amount is ambiguous"
-- ============================================================================
-- La funcion declara una columna OUT 'amount' (RETURNS TABLE ... amount numeric)
-- y dentro usa SUM(amount) sobre org_financial_costs. En PL/pgSQL el nombre
-- 'amount' colisiona entre la columna de la tabla y el parametro de salida, lo
-- que provoca un 400 cada vez que el panel financiero consulta anomalias (p.ej.
-- al crear un costo). Se anade '#variable_conflict use_column' (las columnas
-- ganan) y se cualifica la columna agregada.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_org_financial_anomalies(p_org_id uuid, p_currency text DEFAULT 'COP'::text)
RETURNS TABLE(anomaly_type text, severity text, title text, detail text, related_id uuid, amount numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
#variable_conflict use_column
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM organization_members
    WHERE user_id = auth.uid() AND organization_id = p_org_id
  ) THEN RETURN; END IF;

  -- Anomalia 1: costos del mes actual significativamente mayores al promedio
  RETURN QUERY
  WITH monthly_costs AS (
    SELECT date_trunc('month', ofc.cost_date) AS month, SUM(ofc.amount) AS total
    FROM org_financial_costs ofc
    WHERE ofc.organization_id = p_org_id AND ofc.currency = p_currency
      AND ofc.cost_date > CURRENT_DATE - INTERVAL '6 months'
    GROUP BY 1
  ),
  stats AS (
    SELECT AVG(total) AS avg_cost, STDDEV(total) AS std_cost,
           (SELECT total FROM monthly_costs WHERE month = date_trunc('month', CURRENT_DATE)) AS current_month
    FROM monthly_costs
    WHERE month < date_trunc('month', CURRENT_DATE)
  )
  SELECT 'high_costs'::TEXT,
         'media'::TEXT,
         'Costos del mes inusualmente altos'::TEXT,
         ('Este mes: ' || stats.current_month || ' vs promedio: ' || ROUND(stats.avg_cost, 0))::TEXT,
         NULL::UUID,
         stats.current_month - stats.avg_cost
  FROM stats
  WHERE stats.std_cost IS NOT NULL AND stats.current_month IS NOT NULL
    AND stats.current_month > stats.avg_cost + (2 * stats.std_cost);

  -- Anomalia 2: clientes que se atrasaron pero antes pagaban a tiempo
  RETURN QUERY
  SELECT 'client_default'::TEXT,
         'alta'::TEXT,
         'Cliente con cambio de comportamiento'::TEXT,
         (c.name || ' lleva ' || (CURRENT_DATE - cp.payment_due_date) || ' dias en mora')::TEXT,
         c.id,
         cp.total_value - cp.paid_amount
  FROM client_packages cp JOIN clients c ON c.id = cp.client_id
  WHERE c.organization_id = p_org_id
    AND cp.is_barter = false AND cp.is_active = true
    AND cp.currency::text = p_currency
    AND cp.payment_status != 'paid'
    AND cp.payment_due_date IS NOT NULL
    AND cp.payment_due_date < CURRENT_DATE - INTERVAL '15 days'
  ORDER BY cp.payment_due_date ASC
  LIMIT 5;

  -- Anomalia 3: caida de ingresos vs mes anterior
  RETURN QUERY
  WITH monthly_rev AS (
    SELECT date_trunc('month', COALESCE(cp.paid_at, cp.created_at)) AS month,
           SUM(cp.paid_amount) AS total
    FROM client_packages cp JOIN clients c ON c.id = cp.client_id
    WHERE c.organization_id = p_org_id AND cp.is_barter = false
      AND cp.currency::text = p_currency AND cp.paid_amount > 0
      AND COALESCE(cp.paid_at, cp.created_at) > CURRENT_DATE - INTERVAL '3 months'
    GROUP BY 1
  )
  SELECT 'revenue_drop'::TEXT,
         'media'::TEXT,
         'Ingresos en caida'::TEXT,
         ('Mes actual: ' || cur.total || ' vs mes anterior: ' || prev.total ||
          ' (caida ' || ROUND(((cur.total - prev.total) / prev.total) * 100, 1) || '%)')::TEXT,
         NULL::UUID,
         prev.total - cur.total
  FROM
    (SELECT total FROM monthly_rev WHERE month = date_trunc('month', CURRENT_DATE)) cur,
    (SELECT total FROM monthly_rev WHERE month = date_trunc('month', CURRENT_DATE - INTERVAL '1 month')) prev
  WHERE prev.total > 0 AND cur.total < prev.total * 0.7;
END;
$function$;
