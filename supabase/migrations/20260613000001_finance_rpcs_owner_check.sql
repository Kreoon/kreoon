-- ============================================================================
-- IDOR fix: solo el owner del space puede leer métricas financieras.
-- Antes: cualquier user logueado podía leer MRR/churn/ARPU de cualquier
-- academia llamando los RPCs con space_id arbitrario.
-- ============================================================================

CREATE OR REPLACE FUNCTION public._caller_owns_academy_space(p_space_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $func$
  SELECT EXISTS (
    SELECT 1 FROM academy_spaces
     WHERE id = p_space_id AND owner_id = auth.uid()
  );
$func$;

GRANT EXECUTE ON FUNCTION public._caller_owns_academy_space(UUID) TO authenticated;

-- Reemplazar el cuerpo del RPC con check de ownership al inicio.
-- Si el caller no es el owner del space, RAISE EXCEPTION 'forbidden'.
-- El contenido del RPC se mantiene idéntico al de las migraciones previas.
CREATE OR REPLACE FUNCTION public.get_academy_financial_health(p_space_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $func$
DECLARE
  v_space RECORD;
  v_mrr_gross NUMERIC := 0;
  v_mrr_effective NUMERIC := 0;
  v_active_members INT := 0;
  v_new_30d INT := 0;
  v_churned_30d INT := 0;
  v_collected_30d NUMERIC := 0;
  v_commission_30d NUMERIC := 0;
  v_active_coupons INT := 0;
  v_total_redemptions INT := 0;
  v_fee_percent NUMERIC := 10;
BEGIN
  IF NOT public._caller_owns_academy_space(p_space_id) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_space FROM academy_spaces WHERE id = p_space_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'space_not_found');
  END IF;

  v_fee_percent := CASE WHEN v_space.plan_slug = 'pro' THEN 2.9 ELSE 10 END;

  SELECT COUNT(*) INTO v_active_members
    FROM academy_memberships
   WHERE space_id = p_space_id AND is_active = true AND role <> 'owner';

  v_mrr_gross := v_active_members * COALESCE(v_space.membership_price_usd, 0);

  SELECT COALESCE(SUM(
    CASE
      WHEN c.id IS NULL THEN COALESCE(v_space.membership_price_usd, 0)
      WHEN c.duration = 'once' THEN COALESCE(v_space.membership_price_usd, 0)
      WHEN c.discount_type = 'percentage'
        THEN GREATEST(0, COALESCE(v_space.membership_price_usd, 0)
                         * (100 - c.discount_value) / 100)
      ELSE GREATEST(0, COALESCE(v_space.membership_price_usd, 0) - c.discount_value)
    END
  ), 0) INTO v_mrr_effective
  FROM academy_memberships am
  LEFT JOIN LATERAL (
    SELECT cr.coupon_id FROM academy_coupon_redemptions cr
     WHERE cr.user_id = am.user_id AND cr.space_id = p_space_id
     ORDER BY cr.redeemed_at DESC LIMIT 1
  ) r ON true
  LEFT JOIN academy_coupons c ON c.id = r.coupon_id
  WHERE am.space_id = p_space_id AND am.is_active = true AND am.role <> 'owner';

  SELECT COUNT(*) INTO v_new_30d
    FROM academy_memberships
   WHERE space_id = p_space_id AND is_active = true
     AND joined_at > NOW() - INTERVAL '30 days';

  SELECT COUNT(*) INTO v_churned_30d
    FROM academy_memberships
   WHERE space_id = p_space_id AND is_active = false
     AND joined_at > NOW() - INTERVAL '30 days';

  SELECT COALESCE(SUM(gross_amount_usd), 0),
         COALESCE(SUM(platform_fee_amount_usd), 0)
    INTO v_collected_30d, v_commission_30d
   FROM pending_owner_payouts
  WHERE space_id = p_space_id
    AND collected_at > NOW() - INTERVAL '30 days';

  SELECT COUNT(*) INTO v_active_coupons
    FROM academy_coupons
   WHERE space_id = p_space_id AND is_active = true;

  SELECT COALESCE(SUM(redemptions_count), 0) INTO v_total_redemptions
    FROM academy_coupons WHERE space_id = p_space_id;

  RETURN jsonb_build_object(
    'mrr_gross',           ROUND(v_mrr_gross, 2),
    'mrr_effective',       ROUND(v_mrr_effective, 2),
    'mrr_lost_to_coupons', ROUND(v_mrr_gross - v_mrr_effective, 2),
    'dilution_percent',    CASE WHEN v_mrr_gross > 0
                                THEN ROUND((v_mrr_gross - v_mrr_effective) / v_mrr_gross * 100, 1)
                                ELSE 0 END,
    'active_members',      v_active_members,
    'new_members_30d',     v_new_30d,
    'churned_30d',         v_churned_30d,
    'collected_30d_usd',   ROUND(v_collected_30d, 2),
    'commission_30d_usd',  ROUND(v_commission_30d, 2),
    'arr_effective_usd',   ROUND(v_mrr_effective * 12, 2),
    'platform_fee_percent', v_fee_percent,
    'projected_commission_mrr', ROUND(v_mrr_effective * v_fee_percent / 100, 2),
    'active_coupons',      v_active_coupons,
    'total_redemptions',   v_total_redemptions
  );
END; $func$;

CREATE OR REPLACE FUNCTION public.get_academy_advanced_metrics(p_space_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $func$
DECLARE
  v_space RECORD;
  v_mrr_effective NUMERIC := 0;
  v_active_members INT := 0;
  v_avg_revenue_per_member NUMERIC := 0;
  v_monthly_churn_rate NUMERIC := 0;
  v_ltv_usd NUMERIC := NULL;
  v_avg_lifetime_months NUMERIC := NULL;
  v_net_mrr_series JSONB;
  v_cohort_retention JSONB;
  v_mrr_breakdown JSONB;
  v_new_30d INT := 0;
  v_churned_30d INT := 0;
  v_total_active_at_period_start INT := 0;
BEGIN
  IF NOT public._caller_owns_academy_space(p_space_id) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_space FROM academy_spaces WHERE id = p_space_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('error', 'space_not_found'); END IF;

  SELECT (get_academy_financial_health(p_space_id)->>'mrr_effective')::numeric,
         (get_academy_financial_health(p_space_id)->>'active_members')::int
  INTO v_mrr_effective, v_active_members;

  v_avg_revenue_per_member := CASE WHEN v_active_members > 0
                                   THEN v_mrr_effective / v_active_members ELSE 0 END;

  SELECT COUNT(*) INTO v_new_30d
    FROM academy_memberships
   WHERE space_id = p_space_id AND is_active = true AND role <> 'owner'
     AND joined_at > NOW() - INTERVAL '30 days';

  SELECT COUNT(*) INTO v_churned_30d
    FROM academy_memberships
   WHERE space_id = p_space_id AND is_active = false AND role <> 'owner'
     AND joined_at > NOW() - INTERVAL '60 days';

  v_total_active_at_period_start := v_active_members + v_churned_30d;
  v_monthly_churn_rate := CASE WHEN v_total_active_at_period_start > 0
                               THEN ROUND(v_churned_30d::numeric / v_total_active_at_period_start * 100, 2)
                               ELSE 0 END;

  IF v_monthly_churn_rate > 0 THEN
    v_avg_lifetime_months := ROUND(100.0 / v_monthly_churn_rate, 1);
    v_ltv_usd := ROUND(v_avg_revenue_per_member * v_avg_lifetime_months, 2);
  END IF;

  WITH months AS (
    SELECT date_trunc('month', NOW() - (n || ' months')::interval)::date AS month_start
    FROM generate_series(0, 11) n
  ),
  monthly_stats AS (
    SELECT m.month_start,
           COUNT(*) FILTER (
             WHERE date_trunc('month', am.joined_at) = m.month_start
               AND am.is_active = true
           ) AS new_members,
           COUNT(*) FILTER (
             WHERE date_trunc('month', am.joined_at) = m.month_start
               AND am.is_active = false
           ) AS churned_members
      FROM months m
      LEFT JOIN academy_memberships am
        ON am.space_id = p_space_id AND am.role <> 'owner'
     GROUP BY m.month_start
  )
  SELECT jsonb_agg(jsonb_build_object(
    'month', to_char(month_start, 'YYYY-MM'),
    'month_label', to_char(month_start, 'Mon YY'),
    'new_mrr', ROUND(new_members * COALESCE(v_space.membership_price_usd, 0), 2),
    'churned_mrr', ROUND(churned_members * COALESCE(v_space.membership_price_usd, 0), 2),
    'net_mrr', ROUND((new_members - churned_members) * COALESCE(v_space.membership_price_usd, 0), 2),
    'new_members', new_members,
    'churned_members', churned_members
  ) ORDER BY month_start) INTO v_net_mrr_series
  FROM monthly_stats;

  WITH cohorts AS (
    SELECT date_trunc('month', joined_at)::date AS cohort_month,
           COUNT(*) AS cohort_size,
           COUNT(*) FILTER (WHERE is_active = true) AS still_active
      FROM academy_memberships
     WHERE space_id = p_space_id AND role <> 'owner'
     GROUP BY date_trunc('month', joined_at)
  )
  SELECT jsonb_agg(jsonb_build_object(
    'cohort_month', to_char(cohort_month, 'YYYY-MM'),
    'cohort_label', to_char(cohort_month, 'Mon YY'),
    'cohort_size', cohort_size,
    'still_active', still_active,
    'retention_pct', ROUND(still_active::numeric / NULLIF(cohort_size, 0) * 100, 1)
  ) ORDER BY cohort_month DESC) INTO v_cohort_retention
  FROM cohorts;

  v_mrr_breakdown := jsonb_build_object(
    'new_mrr_this_month', ROUND(v_new_30d * COALESCE(v_space.membership_price_usd, 0), 2),
    'churned_mrr_this_month', ROUND(v_churned_30d * COALESCE(v_space.membership_price_usd, 0), 2),
    'net_mrr_this_month', ROUND((v_new_30d - v_churned_30d) * COALESCE(v_space.membership_price_usd, 0), 2),
    'new_members_this_month', v_new_30d,
    'churned_members_this_month', v_churned_30d
  );

  RETURN jsonb_build_object(
    'ltv_usd', v_ltv_usd,
    'avg_lifetime_months', v_avg_lifetime_months,
    'monthly_churn_rate_pct', v_monthly_churn_rate,
    'avg_revenue_per_member_usd', ROUND(v_avg_revenue_per_member, 2),
    'cac_payback_months', NULL,
    'cac_note', 'CAC requiere registro de gasto en ads (próxima iteración)',
    'net_mrr_series', COALESCE(v_net_mrr_series, '[]'::jsonb),
    'cohort_retention', COALESCE(v_cohort_retention, '[]'::jsonb),
    'mrr_breakdown', v_mrr_breakdown
  );
END; $func$;
