-- Fix: fn_monthly_talent_payroll con UNION ALL para manejar el caso donde
-- el mismo usuario es creator Y editor del mismo proyecto.
-- El bug anterior: la guarda de idempotencia (CONTINUE WHEN EXISTS pending)
-- hacía que el loop de editores saltara al usuario si ya tenía un pending de creator.
-- Solución: combinar ambos roles con UNION ALL antes de generar el pago.

CREATE OR REPLACE FUNCTION public.fn_monthly_talent_payroll(
  p_organization_id uuid,
  p_period_label    text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_period         text;
  v_rec            record;
  v_inserted       int := 0;
  v_expected_pay   date;
BEGIN
  v_period := COALESCE(
    p_period_label,
    to_char(CURRENT_DATE, 'FMMonth YYYY')
  );

  -- Fecha prevista de pago: primer día del mes siguiente
  v_expected_pay := date_trunc('month', CURRENT_DATE + interval '1 month')::date;

  -- ── Combinación UNION ALL: creator + editor por usuario ─────────────────────
  -- Un usuario puede ser creator en un proyecto y editor en otro (o ambos en el
  -- mismo). UNION ALL suma los montos correctamente antes de agrupar.
  FOR v_rec IN
    SELECT
      user_id,
      ARRAY_AGG(DISTINCT content_id ORDER BY content_id) AS content_ids,
      SUM(amount)                                         AS amount,
      COUNT(*)                                            AS qty
    FROM (
      -- Rol creator
      SELECT
        creator_id                        AS user_id,
        id                                AS content_id,
        COALESCE(creator_payment, 0)      AS amount
      FROM public.content
      WHERE organization_id              = p_organization_id
        AND status                       = 'approved'
        AND creator_id                   IS NOT NULL
        AND COALESCE(creator_paid, false) = false
        AND COALESCE(creator_payment, 0)  > 0

      UNION ALL

      -- Rol editor
      SELECT
        editor_id                         AS user_id,
        id                                AS content_id,
        COALESCE(editor_payment, 0)       AS amount
      FROM public.content
      WHERE organization_id              = p_organization_id
        AND status                       = 'approved'
        AND editor_id                    IS NOT NULL
        AND COALESCE(editor_paid, false)  = false
        AND COALESCE(editor_payment, 0)   > 0
    ) combined
    GROUP BY user_id
    HAVING SUM(amount) > 0
  LOOP
    -- Idempotencia: un solo cierre pending por usuario a la vez
    CONTINUE WHEN EXISTS (
      SELECT 1 FROM public.talent_payments
      WHERE organization_id = p_organization_id
        AND user_id         = v_rec.user_id
        AND status          = 'pending'
    );

    INSERT INTO public.talent_payments (
      organization_id, user_id, amount, currency, status,
      description, content_ids, payment_date, notes
    ) VALUES (
      p_organization_id,
      v_rec.user_id,
      v_rec.amount,
      'COP',
      'pending',
      'Cierre mensual ' || v_period || ' — ' || v_rec.qty || ' proyecto' || CASE WHEN v_rec.qty > 1 THEN 's' ELSE '' END,
      v_rec.content_ids,
      v_expected_pay,
      'Cierre automático día 20. Pago previsto: 1-5 de ' || to_char(v_expected_pay, 'FMMonth YYYY')
    );

    -- Marcar creator_paid en los contenidos donde este usuario es creator
    UPDATE public.content
    SET creator_paid = true
    WHERE id = ANY(v_rec.content_ids)
      AND organization_id = p_organization_id
      AND creator_id      = v_rec.user_id
      AND COALESCE(creator_paid, false) = false;

    -- Marcar editor_paid en los contenidos donde este usuario es editor
    UPDATE public.content
    SET editor_paid = true
    WHERE id = ANY(v_rec.content_ids)
      AND organization_id = p_organization_id
      AND editor_id       = v_rec.user_id
      AND COALESCE(editor_paid, false) = false;

    v_inserted := v_inserted + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'success',           true,
    'organization_id',   p_organization_id,
    'period',            v_period,
    'payments_created',  v_inserted,
    'expected_pay_date', v_expected_pay
  );
END;
$$;

COMMENT ON FUNCTION public.fn_monthly_talent_payroll(uuid, text) IS
  'Cierre mensual de nómina: procesa SOLO contenido en status=approved. '
  'UNION ALL combina creator+editor antes de agrupar, evitando que el mismo '
  'usuario pierda el pago de editor cuando ya tiene un pending de creator. '
  'Se ejecuta el día 20 de cada mes. Pago previsto: 1-5 del mes siguiente.';
