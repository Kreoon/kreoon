-- Fix: get_org_payroll_overview no debe incluir fillmaker_services con status='pending'
-- en el KPI "Por liquidar". Los Fillmaker pending están en "Proyectos para el próximo cierre"
-- y no son compromisos de pago hasta que el admin haga clic en "Pagar ya" (→ processing).
-- Los Fillmaker processing SÍ cuentan (el admin ya los comprometió al pago).

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
  v_to_settle      NUMERIC := 0;
  v_in_transfer    NUMERIC := 0;
  v_paid_tp        NUMERIC := 0;
  v_paid_content   NUMERIC := 0;
  v_paid           NUMERIC := 0;
  v_talents        BIGINT  := 0;
  v_overdue_n      BIGINT  := 0;
  v_overdue_a      NUMERIC := 0;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM organization_members
    WHERE user_id = auth.uid() AND organization_id = p_org_id
  ) THEN RETURN; END IF;

  -- Pendiente: excluir Fillmakers con status='pending' (no son compromisos aún)
  -- En transferencia: incluir TODOS los processing (Fillmaker processing ya fue aprobado)
  SELECT
    COALESCE(SUM(amount) FILTER (WHERE status = 'pending' AND fillmaker_service_id IS NULL), 0),
    COALESCE(SUM(amount) FILTER (WHERE status = 'processing'), 0)
  INTO v_to_settle, v_in_transfer
  FROM talent_payments
  WHERE organization_id = p_org_id;

  v_to_settle := v_to_settle + v_in_transfer;

  -- Pagado en período: talent_payments
  SELECT COALESCE(SUM(amount), 0)
  INTO v_paid_tp
  FROM talent_payments
  WHERE organization_id = p_org_id
    AND status = 'paid'
    AND payment_date::date BETWEEN p_start AND p_end;

  -- Pagado en período: content.creator_paid/editor_paid (sin dup con talent_payments)
  WITH contents_in_payments AS (
    SELECT DISTINCT unnest(content_ids) AS content_id
    FROM talent_payments
    WHERE organization_id = p_org_id AND content_ids IS NOT NULL
  ),
  content_paid AS (
    SELECT
      ct.creator_id, ct.editor_id, ct.creator_paid, ct.editor_paid,
      ct.creator_payment, ct.editor_payment, ct.id
    FROM content ct
    WHERE ct.organization_id = p_org_id
      AND COALESCE(ct.paid_at::date, ct.updated_at::date) BETWEEN p_start AND p_end
      AND (ct.creator_paid = true OR ct.editor_paid = true)
      AND ct.id NOT IN (SELECT content_id FROM contents_in_payments)
  ),
  totals AS (
    SELECT
      COALESCE(SUM(
        CASE WHEN creator_paid THEN COALESCE(creator_payment, 0) ELSE 0 END
        + CASE WHEN editor_paid THEN COALESCE(editor_payment, 0) ELSE 0 END
      ), 0) AS amount
    FROM content_paid
  )
  SELECT totals.amount
  INTO v_paid_content
  FROM totals;

  v_paid := v_paid_tp + v_paid_content;

  -- WARNING FIX: contar talents únicos combinando AMBAS fuentes con UNION + DISTINCT
  -- para evitar doble conteo de un talent que aparece en talent_payments Y en content pagado.
  WITH tp_users AS (
    SELECT DISTINCT user_id AS talent_id
    FROM talent_payments
    WHERE organization_id = p_org_id
      AND status = 'paid'
      AND payment_date::date BETWEEN p_start AND p_end
  ),
  contents_in_payments AS (
    SELECT DISTINCT unnest(content_ids) AS content_id
    FROM talent_payments
    WHERE organization_id = p_org_id AND content_ids IS NOT NULL
  ),
  content_users AS (
    SELECT creator_id AS talent_id
    FROM content
    WHERE organization_id = p_org_id
      AND creator_paid = true
      AND creator_id IS NOT NULL
      AND COALESCE(paid_at::date, updated_at::date) BETWEEN p_start AND p_end
      AND id NOT IN (SELECT content_id FROM contents_in_payments)
    UNION
    SELECT editor_id AS talent_id
    FROM content
    WHERE organization_id = p_org_id
      AND editor_paid = true
      AND editor_id IS NOT NULL
      AND COALESCE(paid_at::date, updated_at::date) BETWEEN p_start AND p_end
      AND id NOT IN (SELECT content_id FROM contents_in_payments)
  ),
  all_talents AS (
    SELECT talent_id FROM tp_users
    UNION
    SELECT talent_id FROM content_users
  )
  SELECT COUNT(*)
  INTO v_talents
  FROM all_talents;

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
