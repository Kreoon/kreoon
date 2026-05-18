-- Fix: get_org_payroll_overview debe incluir TODOS los pagos a talento.
-- Antes: solo talent_payments.status='paid'.
-- Ahora: + content.creator_paid/editor_paid (sin doble conteo vía content_ids).

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
  v_talents_tp     BIGINT  := 0;
  v_talents_ct     BIGINT  := 0;
  v_talents        BIGINT  := 0;
  v_overdue_n      BIGINT  := 0;
  v_overdue_a      NUMERIC := 0;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM organization_members
    WHERE user_id = auth.uid() AND organization_id = p_org_id
  ) THEN RETURN; END IF;

  SELECT
    COALESCE(SUM(amount) FILTER (WHERE status = 'pending'), 0),
    COALESCE(SUM(amount) FILTER (WHERE status = 'processing'), 0)
  INTO v_to_settle, v_in_transfer
  FROM talent_payments
  WHERE organization_id = p_org_id;

  v_to_settle := v_to_settle + v_in_transfer;

  -- Pagado en período: talent_payments
  SELECT COALESCE(SUM(amount), 0), COUNT(DISTINCT user_id)
  INTO v_paid_tp, v_talents_tp
  FROM talent_payments
  WHERE organization_id = p_org_id
    AND status = 'paid'
    AND payment_date::date BETWEEN p_start AND p_end;

  -- Pagado en período: content.creator_paid/editor_paid (sin dup)
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
  ),
  unique_talents AS (
    SELECT DISTINCT talent_id FROM (
      SELECT creator_id AS talent_id FROM content_paid WHERE creator_paid = true AND creator_id IS NOT NULL
      UNION
      SELECT editor_id  AS talent_id FROM content_paid WHERE editor_paid  = true AND editor_id  IS NOT NULL
    ) sub
  )
  SELECT totals.amount, (SELECT COUNT(*) FROM unique_talents)
  INTO v_paid_content, v_talents_ct
  FROM totals;

  v_paid := v_paid_tp + v_paid_content;
  v_talents := GREATEST(v_talents_tp, v_talents_ct);
  IF v_talents_tp > 0 AND v_talents_ct > 0 THEN
    v_talents := v_talents_tp + v_talents_ct;
  END IF;

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
