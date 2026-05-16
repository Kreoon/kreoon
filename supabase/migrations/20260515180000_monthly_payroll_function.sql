-- Migration: Función de cierre mensual de nómina
-- Date: 2026-05-15
-- Ciclo: cierre el día 20 de cada mes (status=pending)
--        pago los primeros 5 días del mes siguiente (status=paid)

-- =====================================================
-- 1. Función: cierre mensual por organización
-- =====================================================
--
-- Agrupa todos los proyectos approved/delivered sin pagar
-- por creador y por editor, y crea un talent_payment con
-- status = 'pending' para cada uno.
-- Marca el contenido como creator_paid/editor_paid = true
-- para que no vuelva a entrar en el siguiente cierre.
-- Guarda de idempotencia: si ya existe un pago 'pending'
-- para ese usuario en esa org, no crea uno nuevo.

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

  -- ── Creadores ──────────────────────────────────────────────────────────────
  FOR v_rec IN
    SELECT
      creator_id                         AS user_id,
      ARRAY_AGG(id ORDER BY created_at)  AS content_ids,
      SUM(COALESCE(creator_payment, 0))  AS amount,
      COUNT(*)                           AS qty
    FROM public.content
    WHERE organization_id             = p_organization_id
      AND status                     IN ('approved', 'delivered')
      AND creator_id                  IS NOT NULL
      AND COALESCE(creator_paid, false) = false
      AND COALESCE(creator_payment, 0)  > 0
    GROUP BY creator_id
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

    -- Marcar el contenido como cerrado en este período
    UPDATE public.content
    SET creator_paid = true
    WHERE id = ANY(v_rec.content_ids)
      AND organization_id = p_organization_id;

    v_inserted := v_inserted + 1;
  END LOOP;

  -- ── Editores ───────────────────────────────────────────────────────────────
  FOR v_rec IN
    SELECT
      editor_id                          AS user_id,
      ARRAY_AGG(id ORDER BY created_at)  AS content_ids,
      SUM(COALESCE(editor_payment, 0))   AS amount,
      COUNT(*)                           AS qty
    FROM public.content
    WHERE organization_id             = p_organization_id
      AND status                     IN ('approved', 'delivered')
      AND editor_id                   IS NOT NULL
      AND COALESCE(editor_paid, false)  = false
      AND COALESCE(editor_payment, 0)   > 0
    GROUP BY editor_id
  LOOP
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

    UPDATE public.content
    SET editor_paid = true
    WHERE id = ANY(v_rec.content_ids)
      AND organization_id = p_organization_id;

    v_inserted := v_inserted + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'success',          true,
    'organization_id',  p_organization_id,
    'period',           v_period,
    'payments_created', v_inserted,
    'expected_pay_date', v_expected_pay
  );
END;
$$;

COMMENT ON FUNCTION public.fn_monthly_talent_payroll(uuid, text) IS
  'Cierre mensual de nómina: agrupa proyectos approved/delivered por creador/editor '
  'y crea un talent_payment pending por cada uno. Se ejecuta el día 20 de cada mes. '
  'Pago previsto: 1-5 del mes siguiente.';


-- =====================================================
-- 2. Función: ejecutar para todas las organizaciones
-- =====================================================

CREATE OR REPLACE FUNCTION public.fn_monthly_talent_payroll_all()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org     record;
  v_result  jsonb;
  v_total   int := 0;
  v_errors  jsonb := '[]'::jsonb;
BEGIN
  FOR v_org IN SELECT id FROM public.organizations
  LOOP
    BEGIN
      v_result := public.fn_monthly_talent_payroll(v_org.id);
      v_total  := v_total + COALESCE((v_result->>'payments_created')::int, 0);
    EXCEPTION WHEN OTHERS THEN
      v_errors := v_errors || jsonb_build_object('org_id', v_org.id, 'error', SQLERRM);
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'success',                true,
    'total_payments_created', v_total,
    'errors',                 v_errors,
    'run_at',                 now()
  );
END;
$$;

COMMENT ON FUNCTION public.fn_monthly_talent_payroll_all() IS
  'Ejecuta el cierre mensual de nómina para todas las organizaciones. '
  'Llamada por el cron job el día 20 de cada mes a las 06:00 UTC.';


-- =====================================================
-- 3. Cron job (pg_cron) — día 20 a las 06:00 UTC
-- =====================================================
--
-- Solo se registra si la extensión pg_cron está disponible
-- (Supabase Pro+). En planes Free/Starter, invocar la Edge
-- Function manualmente o via n8n scheduler.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- Eliminar versión anterior si existe
    PERFORM cron.unschedule('monthly-talent-payroll')
    WHERE EXISTS (
      SELECT 1 FROM cron.job WHERE jobname = 'monthly-talent-payroll'
    );

    PERFORM cron.schedule(
      'monthly-talent-payroll',
      '0 6 20 * *',    -- 06:00 UTC del día 20 de cada mes
      $job$
        SELECT public.fn_monthly_talent_payroll_all();
      $job$
    );

    RAISE NOTICE 'Cron job "monthly-talent-payroll" registrado: 20 de cada mes a las 06:00 UTC';
  ELSE
    RAISE NOTICE 'pg_cron no disponible. Invocar fn_monthly_talent_payroll_all() manualmente o via Edge Function.';
  END IF;
END $$;
