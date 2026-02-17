-- ============================================================================
-- KREOON: Atomic Increment RPCs + Finance Fixes
-- Fixes supabase.raw() bug across all edge functions
-- ============================================================================

-- 1. Generic atomic increment RPC (works for any table/column)
CREATE OR REPLACE FUNCTION increment_column(
  p_table TEXT,
  p_column TEXT,
  p_amount NUMERIC,
  p_id UUID
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  EXECUTE format(
    'UPDATE %I SET %I = COALESCE(%I, 0) + $1 WHERE id = $2',
    p_table, p_column, p_column
  ) USING p_amount, p_id;
END;
$$;

-- 2. Atomic wallet balance update (for referral commissions + withdrawals)
CREATE OR REPLACE FUNCTION update_wallet_balance(
  p_wallet_id UUID,
  p_available_delta NUMERIC DEFAULT 0,
  p_reserved_delta NUMERIC DEFAULT 0,
  p_earned_delta NUMERIC DEFAULT 0
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  UPDATE unified_wallets
  SET
    balance_available = COALESCE(balance_available, 0) + p_available_delta,
    balance_reserved = COALESCE(balance_reserved, 0) + p_reserved_delta,
    total_earned = COALESCE(total_earned, 0) + p_earned_delta,
    updated_at = now()
  WHERE id = p_wallet_id;
END;
$$;

-- 3. Atomic token credit (for purchases)
CREATE OR REPLACE FUNCTION credit_purchased_tokens(
  p_balance_id UUID,
  p_tokens INTEGER
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  UPDATE ai_token_balances
  SET
    balance_purchased = COALESCE(balance_purchased, 0) + p_tokens,
    total_purchased = COALESCE(total_purchased, 0) + p_tokens,
    updated_at = now()
  WHERE id = p_balance_id;
END;
$$;

-- 4. Consume AI tokens atomically (checks balance, deducts, logs)
CREATE OR REPLACE FUNCTION consume_ai_tokens(
  p_user_id UUID DEFAULT NULL,
  p_org_id UUID DEFAULT NULL,
  p_action_type TEXT DEFAULT 'default',
  p_tokens INTEGER DEFAULT 40,
  p_metadata JSONB DEFAULT '{}'
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_balance RECORD;
  v_remaining INTEGER;
  v_source TEXT;
  v_deduct_sub INTEGER := 0;
  v_deduct_purchased INTEGER := 0;
  v_deduct_bonus INTEGER := 0;
BEGIN
  -- Find balance
  IF p_org_id IS NOT NULL THEN
    SELECT * INTO v_balance FROM ai_token_balances WHERE organization_id = p_org_id LIMIT 1;
  ELSE
    SELECT * INTO v_balance FROM ai_token_balances WHERE user_id = p_user_id AND organization_id IS NULL LIMIT 1;
  END IF;

  IF v_balance IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No token balance found');
  END IF;

  -- Check total available
  v_remaining := COALESCE(v_balance.balance_subscription, 0)
               + COALESCE(v_balance.balance_purchased, 0)
               + COALESCE(v_balance.balance_bonus, 0);

  IF v_remaining < p_tokens THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Insufficient tokens',
      'required', p_tokens,
      'available', v_remaining
    );
  END IF;

  -- Deduct in order: subscription first, then bonus, then purchased
  v_deduct_sub := LEAST(p_tokens, COALESCE(v_balance.balance_subscription, 0));
  v_deduct_bonus := LEAST(p_tokens - v_deduct_sub, COALESCE(v_balance.balance_bonus, 0));
  v_deduct_purchased := p_tokens - v_deduct_sub - v_deduct_bonus;

  IF v_deduct_sub > 0 THEN v_source := 'subscription';
  ELSIF v_deduct_bonus > 0 THEN v_source := 'bonus';
  ELSE v_source := 'purchased';
  END IF;

  -- Update balance
  UPDATE ai_token_balances
  SET
    balance_subscription = COALESCE(balance_subscription, 0) - v_deduct_sub,
    balance_bonus = COALESCE(balance_bonus, 0) - v_deduct_bonus,
    balance_purchased = COALESCE(balance_purchased, 0) - v_deduct_purchased,
    total_consumed = COALESCE(total_consumed, 0) + p_tokens,
    updated_at = now()
  WHERE id = v_balance.id;

  -- Log transaction
  INSERT INTO ai_token_transactions (
    balance_id, transaction_type, tokens, balance_after,
    action_type, action_metadata, executed_by
  ) VALUES (
    v_balance.id, 'consumption', -p_tokens,
    v_remaining - p_tokens,
    p_action_type, p_metadata,
    COALESCE(p_user_id, p_org_id)
  );

  RETURN jsonb_build_object(
    'success', true,
    'tokens_consumed', p_tokens,
    'balance_remaining', v_remaining - p_tokens,
    'source', v_source
  );
END;
$$;

-- 5. Fix escrow_status enum: add partially_refunded
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'partially_refunded'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'escrow_status')
  ) THEN
    ALTER TYPE escrow_status ADD VALUE IF NOT EXISTS 'partially_refunded';
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- Type may not exist or already has the value
  NULL;
END $$;

-- 6. Admin check function
CREATE OR REPLACE FUNCTION is_platform_admin(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = p_user_id
    AND (role = 'admin' OR is_platform_root(p_user_id))
  );
END;
$$;

-- 7. Grant execute to authenticated
GRANT EXECUTE ON FUNCTION increment_column(TEXT, TEXT, NUMERIC, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION update_wallet_balance(UUID, NUMERIC, NUMERIC, NUMERIC) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION credit_purchased_tokens(UUID, INTEGER) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION consume_ai_tokens(UUID, UUID, TEXT, INTEGER, JSONB) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION is_platform_admin(UUID) TO authenticated, service_role;
