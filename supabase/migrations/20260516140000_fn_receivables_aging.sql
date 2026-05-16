-- Aging de cartera: clasifica deuda pendiente por antigüedad
-- Retorna una fila por paquete con cobro pendiente, con su bucket de vencimiento
-- y un risk_score agregado por cliente

CREATE OR REPLACE FUNCTION public.fn_receivables_aging(p_organization_id uuid)
RETURNS TABLE (
  client_id       uuid,
  client_name     text,
  package_id      uuid,
  package_name    text,
  currency        text,
  total_value     numeric,
  paid_amount     numeric,
  pending_amount  numeric,
  due_date        date,
  days_overdue    int,
  aging_bucket    text,
  risk_score      numeric
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH pkg_due AS (
    -- Fecha de vencimiento: el installment más antiguo no pagado, con fallback a payment_due_date
    SELECT
      cp.id AS package_id,
      COALESCE(
        (SELECT MIN(pi.due_date)
         FROM package_installments pi
         WHERE pi.package_id = cp.id
           AND pi.status NOT IN ('paid','renegotiated')),
        cp.payment_due_date
      ) AS effective_due_date
    FROM client_packages cp
    WHERE cp.is_barter = false
      AND cp.payment_status != 'paid'
      AND EXISTS (
        SELECT 1 FROM clients c
        JOIN organization_members om ON om.user_id = auth.uid()
        WHERE c.id = cp.client_id
          AND om.organization_id = p_organization_id
      )
  ),
  aged AS (
    SELECT
      c.id                    AS client_id,
      c.name                  AS client_name,
      cp.id                   AS package_id,
      cp.name                 AS package_name,
      cp.currency,
      cp.total_value,
      cp.paid_amount,
      GREATEST(cp.total_value - cp.paid_amount, 0) AS pending_amount,
      pd.effective_due_date   AS due_date,
      CASE
        WHEN pd.effective_due_date IS NULL THEN 0
        ELSE GREATEST(0, CURRENT_DATE - pd.effective_due_date)
      END AS days_overdue
    FROM client_packages cp
    JOIN pkg_due pd ON pd.package_id = cp.id
    JOIN clients c ON c.id = cp.client_id
    WHERE cp.is_barter = false
      AND cp.payment_status != 'paid'
      AND GREATEST(cp.total_value - cp.paid_amount, 0) > 0
  )
  SELECT
    a.client_id,
    a.client_name,
    a.package_id,
    a.package_name,
    a.currency,
    a.total_value,
    a.paid_amount,
    a.pending_amount,
    a.due_date,
    a.days_overdue,
    CASE
      WHEN a.due_date IS NULL OR a.due_date >= CURRENT_DATE THEN 'current'
      WHEN a.days_overdue BETWEEN 1  AND 30 THEN '1_30d'
      WHEN a.days_overdue BETWEEN 31 AND 60 THEN '31_60d'
      WHEN a.days_overdue BETWEEN 61 AND 90 THEN '61_90d'
      ELSE 'bad_debt'
    END AS aging_bucket,
    ROUND(CASE
      WHEN a.days_overdue = 0           THEN 0
      WHEN a.days_overdue BETWEEN 1  AND 30 THEN 10
      WHEN a.days_overdue BETWEEN 31 AND 60 THEN 30
      WHEN a.days_overdue BETWEEN 61 AND 90 THEN 60
      ELSE 100
    END, 2) AS risk_score
  FROM aged a
  ORDER BY a.days_overdue DESC, a.pending_amount DESC;
END;
$$;

COMMENT ON FUNCTION public.fn_receivables_aging(uuid) IS
  'Aging de cartera por paquete. Buckets: current, 1_30d, 31_60d, 61_90d, bad_debt. Risk score 0-100.';
