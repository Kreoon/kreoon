-- ============================================================================
-- FIX: Tokens de IA - Reset no acumulativo y función de reset automático
-- Fecha: 2026-04-07
--
-- Cambios:
-- 1. Función para resetear tokens expirados de usuarios free (sin suscripción Stripe)
-- 2. Los tokens del plan se resetean mensualmente, NO se acumulan
-- 3. El ciclo se basa en la fecha de registro del usuario
-- ============================================================================

-- ============================================================================
-- 1. FUNCIÓN: Reset automático de tokens para usuarios sin suscripción activa
-- ============================================================================
-- Esta función debe ejecutarse diariamente (via pg_cron o edge function)
-- Solo afecta usuarios FREE (sin suscripción activa en Stripe)
-- NO afecta balance_purchased ni balance_bonus (solo balance_subscription)

CREATE OR REPLACE FUNCTION public.reset_expired_token_balances()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rows_updated INTEGER := 0;
  v_record RECORD;
BEGIN
  -- Buscar balances expirados de usuarios SIN suscripción activa
  FOR v_record IN
    SELECT
      b.id,
      b.monthly_allowance,
      b.user_id,
      b.organization_id
    FROM ai_token_balances b
    LEFT JOIN platform_subscriptions s ON
      (b.user_id = s.user_id AND s.organization_id IS NULL) OR
      (b.organization_id = s.organization_id)
    WHERE
      b.next_reset_at IS NOT NULL
      AND b.next_reset_at < NOW()
      AND (
        s.id IS NULL -- Sin suscripción
        OR s.status NOT IN ('active', 'trialing') -- Suscripción no activa
      )
    FOR UPDATE OF b SKIP LOCKED -- Evitar deadlocks
  LOOP
    -- Resetear balance_subscription al monthly_allowance (NO acumular)
    UPDATE ai_token_balances
    SET
      balance_subscription = v_record.monthly_allowance,
      last_reset_at = NOW(),
      next_reset_at = NOW() + INTERVAL '1 month'
    WHERE id = v_record.id;

    -- Registrar transacción de reset
    INSERT INTO ai_token_transactions (
      balance_id,
      transaction_type,
      tokens,
      balance_after,
      action_metadata
    ) VALUES (
      v_record.id,
      'reset',
      v_record.monthly_allowance,
      v_record.monthly_allowance,
      jsonb_build_object(
        'type', 'monthly_reset',
        'reset_at', NOW()::TEXT,
        'note', 'Reset automático mensual (usuario free)'
      )
    );

    rows_updated := rows_updated + 1;
  END LOOP;

  RETURN rows_updated;
END;
$$;

COMMENT ON FUNCTION public.reset_expired_token_balances IS
'Resetea tokens de suscripción para usuarios free con balance expirado.
Ejecutar diariamente via cron o edge function.
NO acumula - resetea a monthly_allowance.';

-- Grants
GRANT EXECUTE ON FUNCTION public.reset_expired_token_balances() TO service_role;

-- ============================================================================
-- 2. FUNCIÓN: Calcular próxima fecha de reset basada en fecha de registro
-- ============================================================================

CREATE OR REPLACE FUNCTION public.calculate_next_token_reset(
  p_registration_date TIMESTAMPTZ,
  p_from_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TIMESTAMPTZ
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_day_of_month INTEGER;
  v_next_reset TIMESTAMPTZ;
  v_target_month INTEGER;
  v_target_year INTEGER;
BEGIN
  -- Obtener el día del mes de registro
  v_day_of_month := EXTRACT(DAY FROM p_registration_date);

  -- Empezar con el mes actual
  v_target_year := EXTRACT(YEAR FROM p_from_date);
  v_target_month := EXTRACT(MONTH FROM p_from_date);

  -- Intentar construir la fecha con el día de registro en el mes actual
  BEGIN
    v_next_reset := make_timestamptz(
      v_target_year,
      v_target_month,
      LEAST(v_day_of_month, 28), -- Usar 28 como máximo para evitar problemas con meses cortos
      12, 0, 0, 'UTC'
    );
  EXCEPTION WHEN OTHERS THEN
    -- Si falla (día inválido), usar el último día del mes
    v_next_reset := (DATE_TRUNC('month', p_from_date) + INTERVAL '1 month' - INTERVAL '1 day')::TIMESTAMPTZ;
  END;

  -- Si la fecha calculada ya pasó, avanzar al siguiente mes
  IF v_next_reset <= p_from_date THEN
    v_next_reset := v_next_reset + INTERVAL '1 month';
  END IF;

  RETURN v_next_reset;
END;
$$;

COMMENT ON FUNCTION public.calculate_next_token_reset IS
'Calcula la próxima fecha de reset de tokens basada en el día del mes de registro.
Por ejemplo: si el usuario se registró el 15, su reset será el día 15 de cada mes.';

-- Grants
GRANT EXECUTE ON FUNCTION public.calculate_next_token_reset(TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_next_token_reset(TIMESTAMPTZ, TIMESTAMPTZ) TO service_role;
