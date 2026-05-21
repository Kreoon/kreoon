-- ============================================================================
-- FIX: Backfill y corrección de balances de tokens para usuarios free
--
-- Problemas corregidos:
-- 1. Perfiles sin fila en ai_token_balances (registrados antes del trigger)
-- 2. Filas con monthly_allowance = 0 → el reset mensual ponía balance en 0
-- 3. Trigger auto_create_token_balance usaba 800 tokens (valor anterior)
--    ahora creadores_free = 500 tokens (plan Básico actual)
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- 1. Crear filas faltantes para perfiles sin balance
-- ────────────────────────────────────────────────────────────────────────────
INSERT INTO ai_token_balances (
  user_id,
  balance_subscription,
  monthly_allowance,
  subscription_tier,
  next_reset_at
)
SELECT
  p.id,
  500,
  500,
  'creator_free'::subscription_tier,
  NOW() + INTERVAL '30 days'
FROM profiles p
LEFT JOIN ai_token_balances b ON b.user_id = p.id
WHERE b.id IS NULL
ON CONFLICT (user_id) DO NOTHING;

-- ────────────────────────────────────────────────────────────────────────────
-- 2. Corregir filas que tienen monthly_allowance = 0 (quedarían en 0 al reset)
--    Solo para usuarios free (sin suscripción activa o con creator_free)
-- ────────────────────────────────────────────────────────────────────────────
UPDATE ai_token_balances b
SET
  monthly_allowance    = 500,
  balance_subscription = GREATEST(b.balance_subscription, 500),
  subscription_tier    = COALESCE(b.subscription_tier, 'creator_free'::subscription_tier)
WHERE
  b.user_id IS NOT NULL
  AND b.monthly_allowance = 0
  AND NOT EXISTS (
    SELECT 1 FROM platform_subscriptions s
    WHERE s.user_id = b.user_id
      AND s.organization_id IS NULL
      AND s.status IN ('active', 'trialing')
  );

-- ────────────────────────────────────────────────────────────────────────────
-- 3. Actualizar trigger para usar 500 tokens (plan Básico actual)
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION auto_create_token_balance()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO ai_token_balances (
    user_id,
    balance_subscription,
    monthly_allowance,
    subscription_tier,
    next_reset_at
  )
  VALUES (
    NEW.id,
    500,
    500,
    'creator_free'::subscription_tier,
    NOW() + INTERVAL '30 days'
  )
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
EXCEPTION WHEN undefined_table THEN
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
