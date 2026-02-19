-- ============================================================================
-- WALLET OPERATIONAL MIGRATION
-- Renames columns to match frontend, creates payment_methods table,
-- adds RPCs for atomic withdrawals, admin RLS, and backward-compat view.
-- ============================================================================

-- ============================================================================
-- 1a. Rename columns in unified_wallets to match frontend types
-- ============================================================================

ALTER TABLE unified_wallets RENAME COLUMN balance_available TO available_balance;
ALTER TABLE unified_wallets RENAME COLUMN balance_pending TO pending_balance;
ALTER TABLE unified_wallets RENAME COLUMN balance_reserved TO reserved_balance;
ALTER TABLE unified_wallets RENAME COLUMN preferred_currency TO currency;

-- Add status column (frontend expects text, DB had boolean is_active)
ALTER TABLE unified_wallets ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
UPDATE unified_wallets SET status = CASE WHEN is_active THEN 'active' ELSE 'suspended' END;

-- Add settings column
ALTER TABLE unified_wallets ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}';

-- ============================================================================
-- 1b. Create payment_methods table
-- ============================================================================

CREATE TABLE IF NOT EXISTS payment_methods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    method_type TEXT NOT NULL,
    label TEXT NOT NULL,
    details JSONB NOT NULL DEFAULT '{}',
    is_default BOOLEAN DEFAULT false,
    is_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;

CREATE POLICY pm_select ON payment_methods FOR SELECT USING (user_id = auth.uid());
CREATE POLICY pm_insert ON payment_methods FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY pm_update ON payment_methods FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY pm_delete ON payment_methods FOR DELETE USING (user_id = auth.uid());

GRANT ALL ON payment_methods TO authenticated;

-- ============================================================================
-- 1c. Extend withdrawal_method enum with new values
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'bank_transfer_colombia' AND enumtypid = 'withdrawal_method'::regtype) THEN
    ALTER TYPE withdrawal_method ADD VALUE 'bank_transfer_colombia';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'bank_transfer_international' AND enumtypid = 'withdrawal_method'::regtype) THEN
    ALTER TYPE withdrawal_method ADD VALUE 'bank_transfer_international';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'stripe_connect' AND enumtypid = 'withdrawal_method'::regtype) THEN
    ALTER TYPE withdrawal_method ADD VALUE 'stripe_connect';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'paypal' AND enumtypid = 'withdrawal_method'::regtype) THEN
    ALTER TYPE withdrawal_method ADD VALUE 'paypal';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'payoneer' AND enumtypid = 'withdrawal_method'::regtype) THEN
    ALTER TYPE withdrawal_method ADD VALUE 'payoneer';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'nequi' AND enumtypid = 'withdrawal_method'::regtype) THEN
    ALTER TYPE withdrawal_method ADD VALUE 'nequi';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'daviplata' AND enumtypid = 'withdrawal_method'::regtype) THEN
    ALTER TYPE withdrawal_method ADD VALUE 'daviplata';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'crypto' AND enumtypid = 'withdrawal_method'::regtype) THEN
    ALTER TYPE withdrawal_method ADD VALUE 'crypto';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'zelle' AND enumtypid = 'withdrawal_method'::regtype) THEN
    ALTER TYPE withdrawal_method ADD VALUE 'zelle';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'wise' AND enumtypid = 'withdrawal_method'::regtype) THEN
    ALTER TYPE withdrawal_method ADD VALUE 'wise';
  END IF;
END$$;

-- ============================================================================
-- 1c2. Rename withdrawal_requests columns to match frontend types
-- ============================================================================

ALTER TABLE withdrawal_requests RENAME COLUMN fee_total TO fee;
ALTER TABLE withdrawal_requests RENAME COLUMN method TO payment_method;
ALTER TABLE withdrawal_requests RENAME COLUMN failure_reason TO rejection_reason;
ALTER TABLE withdrawal_requests ADD COLUMN IF NOT EXISTS payment_proof_url TEXT;

-- ============================================================================
-- 1d. Admin RLS for withdrawal_requests
-- ============================================================================

-- Admin can SELECT all withdrawals
CREATE POLICY withdrawals_admin_select ON withdrawal_requests
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
        OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND email = 'root@kreoon.com')
    );

-- Admin can UPDATE withdrawals (process/reject)
CREATE POLICY withdrawals_admin_update ON withdrawal_requests
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
    );

-- ============================================================================
-- 1e. RPC: create_withdrawal_request (atomic)
-- ============================================================================

CREATE OR REPLACE FUNCTION create_withdrawal_request(
    p_wallet_id UUID,
    p_user_id UUID,
    p_amount DECIMAL,
    p_payment_method TEXT,
    p_payment_details JSONB,
    p_fee DECIMAL
) RETURNS UUID AS $$
DECLARE
    v_wallet unified_wallets%ROWTYPE;
    v_net DECIMAL;
    v_id UUID;
BEGIN
    -- Lock wallet row
    SELECT * INTO v_wallet FROM unified_wallets WHERE id = p_wallet_id FOR UPDATE;
    IF v_wallet IS NULL THEN
        RAISE EXCEPTION 'Wallet not found';
    END IF;
    IF v_wallet.user_id != p_user_id THEN
        RAISE EXCEPTION 'Not your wallet';
    END IF;
    IF v_wallet.available_balance < p_amount THEN
        RAISE EXCEPTION 'Insufficient balance';
    END IF;
    IF v_wallet.status != 'active' THEN
        RAISE EXCEPTION 'Wallet is not active';
    END IF;

    -- Check no pending withdrawal exists
    IF EXISTS (
        SELECT 1 FROM withdrawal_requests
        WHERE wallet_id = p_wallet_id AND status IN ('pending', 'processing')
    ) THEN
        RAISE EXCEPTION 'Ya tienes un retiro pendiente';
    END IF;

    v_net := p_amount - p_fee;

    -- Reserve funds atomically
    UPDATE unified_wallets SET
        available_balance = available_balance - p_amount,
        pending_balance = pending_balance + p_amount,
        updated_at = NOW()
    WHERE id = p_wallet_id;

    -- Insert withdrawal
    INSERT INTO withdrawal_requests (
        wallet_id, user_id, amount, net_amount, fee,
        payment_method, payment_details, status
    ) VALUES (
        p_wallet_id, p_user_id, p_amount, v_net, p_fee,
        p_payment_method::withdrawal_method, p_payment_details, 'pending'
    ) RETURNING id INTO v_id;

    RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 1f. RPC: cancel_withdrawal_request (atomic — returns funds)
-- ============================================================================

CREATE OR REPLACE FUNCTION cancel_withdrawal_request(
    p_withdrawal_id UUID,
    p_user_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
    v_wr withdrawal_requests%ROWTYPE;
BEGIN
    SELECT * INTO v_wr FROM withdrawal_requests WHERE id = p_withdrawal_id FOR UPDATE;
    IF v_wr IS NULL OR v_wr.user_id != p_user_id THEN
        RAISE EXCEPTION 'Not found';
    END IF;
    IF v_wr.status != 'pending' THEN
        RAISE EXCEPTION 'Cannot cancel: status is %', v_wr.status;
    END IF;

    -- Return funds
    UPDATE unified_wallets SET
        available_balance = available_balance + v_wr.amount,
        pending_balance = pending_balance - v_wr.amount,
        updated_at = NOW()
    WHERE id = v_wr.wallet_id;

    UPDATE withdrawal_requests
    SET status = 'cancelled', updated_at = NOW()
    WHERE id = p_withdrawal_id;

    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 1g. RPC: update_wallet_balance (if not exists — used by edge functions)
-- ============================================================================

CREATE OR REPLACE FUNCTION update_wallet_balance(
    p_wallet_id UUID,
    p_available_delta DECIMAL DEFAULT 0,
    p_pending_delta DECIMAL DEFAULT 0,
    p_reserved_delta DECIMAL DEFAULT 0,
    p_earned_delta DECIMAL DEFAULT 0
) RETURNS VOID AS $$
BEGIN
    UPDATE unified_wallets SET
        available_balance = available_balance + p_available_delta,
        pending_balance = pending_balance + p_pending_delta,
        reserved_balance = reserved_balance + p_reserved_delta,
        total_earned = COALESCE(total_earned, 0) + p_earned_delta,
        updated_at = NOW()
    WHERE id = p_wallet_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 1h. Note: 'wallets' is an existing BASE TABLE (not a view).
-- All frontend code uses 'unified_wallets' directly after this migration.
-- ============================================================================
