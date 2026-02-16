-- =====================================================
-- KREOON FINANCE MODULE
-- Migration: 20260216950000_create_finance_tables
-- Tables: platform_subscriptions, platform_transactions,
--         platform_invoices, platform_payouts,
--         creator_wallets, creator_wallet_transactions
-- =====================================================

-- =====================================================
-- 1. TABLES
-- =====================================================

-- -----------------------------------------------------
-- 1.1 platform_subscriptions
-- -----------------------------------------------------
CREATE TABLE platform_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Plan
    plan TEXT NOT NULL CHECK (plan IN ('free', 'starter', 'pro', 'enterprise')),
    billing_cycle TEXT NOT NULL CHECK (billing_cycle IN ('monthly', 'yearly')),

    -- Montos
    amount_monthly DECIMAL(12,2) NOT NULL DEFAULT 0,
    amount_yearly DECIMAL(12,2),
    currency TEXT NOT NULL DEFAULT 'USD',

    -- Estado
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'past_due', 'trialing', 'paused')),

    -- Fechas
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    trial_ends_at TIMESTAMPTZ,

    -- Integración con pasarela de pago
    stripe_subscription_id TEXT,
    stripe_customer_id TEXT,
    payment_method_last4 TEXT,
    payment_method_brand TEXT,

    -- Metadata
    features JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(organization_id)
);

CREATE INDEX idx_platform_subscriptions_org ON platform_subscriptions(organization_id);
CREATE INDEX idx_platform_subscriptions_status ON platform_subscriptions(status);
CREATE INDEX idx_platform_subscriptions_plan ON platform_subscriptions(plan);

-- -----------------------------------------------------
-- 1.2 platform_invoices (before transactions, since transactions reference it)
-- -----------------------------------------------------
CREATE TABLE platform_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES platform_subscriptions(id) ON DELETE SET NULL,

    -- Número de factura
    invoice_number TEXT NOT NULL UNIQUE,

    -- Montos
    subtotal DECIMAL(12,2) NOT NULL,
    tax_amount DECIMAL(12,2) DEFAULT 0,
    discount_amount DECIMAL(12,2) DEFAULT 0,
    total DECIMAL(12,2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'USD',

    -- Estado
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
        'draft', 'sent', 'paid', 'partially_paid', 'overdue', 'cancelled', 'refunded'
    )),

    -- Fechas
    issued_at TIMESTAMPTZ,
    due_date DATE NOT NULL,
    paid_at TIMESTAMPTZ,

    -- Detalles
    line_items JSONB NOT NULL DEFAULT '[]',
    notes TEXT,

    -- Datos de facturación
    billing_name TEXT,
    billing_email TEXT,
    billing_address JSONB,
    tax_id TEXT,

    -- Archivos
    pdf_url TEXT,

    -- Integración
    stripe_invoice_id TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_platform_invoices_org ON platform_invoices(organization_id);
CREATE INDEX idx_platform_invoices_status ON platform_invoices(status);
CREATE INDEX idx_platform_invoices_due ON platform_invoices(due_date);

-- -----------------------------------------------------
-- 1.3 platform_payouts (before transactions, since transactions reference it)
-- -----------------------------------------------------
CREATE TABLE platform_payouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Montos
    gross_amount DECIMAL(12,2) NOT NULL,
    platform_fee DECIMAL(12,2) NOT NULL DEFAULT 0,
    payment_fee DECIMAL(12,2) DEFAULT 0,
    net_amount DECIMAL(12,2) GENERATED ALWAYS AS (gross_amount - platform_fee - COALESCE(payment_fee, 0)) STORED,
    currency TEXT NOT NULL DEFAULT 'USD',

    -- Estado
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending', 'approved', 'processing', 'completed', 'failed', 'cancelled'
    )),

    -- Método de pago
    payment_method TEXT CHECK (payment_method IN (
        'bank_transfer', 'paypal', 'wise', 'payoneer', 'crypto', 'other'
    )),

    -- Datos bancarios
    bank_info JSONB,
    payment_reference TEXT,

    -- Fechas
    requested_at TIMESTAMPTZ DEFAULT NOW(),
    approved_at TIMESTAMPTZ,
    approved_by UUID REFERENCES auth.users(id),
    processed_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,

    -- Desglose de origen
    source_campaigns JSONB DEFAULT '[]',
    source_bonuses JSONB DEFAULT '[]',

    -- Notas
    notes TEXT,
    failure_reason TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_platform_payouts_creator ON platform_payouts(creator_id);
CREATE INDEX idx_platform_payouts_status ON platform_payouts(status);
CREATE INDEX idx_platform_payouts_created ON platform_payouts(created_at DESC);

-- -----------------------------------------------------
-- 1.4 platform_transactions
-- -----------------------------------------------------
CREATE TABLE platform_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Relaciones
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    creator_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

    -- Tipo de transacción
    transaction_type TEXT NOT NULL CHECK (transaction_type IN (
        'subscription_payment',
        'subscription_refund',
        'campaign_payment',
        'creator_payout',
        'creator_payout_fee',
        'platform_fee',
        'bonus',
        'adjustment',
        'refund'
    )),

    -- Montos
    amount DECIMAL(12,2) NOT NULL,
    fee_amount DECIMAL(12,2) DEFAULT 0,
    net_amount DECIMAL(12,2) GENERATED ALWAYS AS (amount - COALESCE(fee_amount, 0)) STORED,
    currency TEXT NOT NULL DEFAULT 'USD',

    -- Estado
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded'
    )),

    -- Descripción
    description TEXT,
    reference_id TEXT,
    reference_type TEXT,

    -- Relación con otros registros
    subscription_id UUID REFERENCES platform_subscriptions(id) ON DELETE SET NULL,
    campaign_id UUID,
    invoice_id UUID REFERENCES platform_invoices(id) ON DELETE SET NULL,
    payout_id UUID REFERENCES platform_payouts(id) ON DELETE SET NULL,

    -- Metadata
    metadata JSONB DEFAULT '{}',

    -- Auditoría
    processed_at TIMESTAMPTZ,
    processed_by UUID REFERENCES auth.users(id),

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_platform_transactions_org ON platform_transactions(organization_id);
CREATE INDEX idx_platform_transactions_user ON platform_transactions(user_id);
CREATE INDEX idx_platform_transactions_creator ON platform_transactions(creator_id);
CREATE INDEX idx_platform_transactions_type ON platform_transactions(transaction_type);
CREATE INDEX idx_platform_transactions_status ON platform_transactions(status);
CREATE INDEX idx_platform_transactions_created ON platform_transactions(created_at DESC);

-- -----------------------------------------------------
-- 1.5 creator_wallets
-- -----------------------------------------------------
CREATE TABLE creator_wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,

    -- Balances
    available_balance DECIMAL(12,2) NOT NULL DEFAULT 0,
    pending_balance DECIMAL(12,2) NOT NULL DEFAULT 0,
    total_earned DECIMAL(12,2) NOT NULL DEFAULT 0,
    total_withdrawn DECIMAL(12,2) NOT NULL DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'USD',

    -- Configuración de pago
    minimum_payout DECIMAL(12,2) DEFAULT 50,
    auto_payout BOOLEAN DEFAULT FALSE,
    preferred_payment_method TEXT,

    -- Datos de pago verificados
    payment_info_verified BOOLEAN DEFAULT FALSE,
    payment_info JSONB,

    -- Última actividad
    last_earning_at TIMESTAMPTZ,
    last_payout_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_creator_wallets_creator ON creator_wallets(creator_id);

-- -----------------------------------------------------
-- 1.6 creator_wallet_transactions
-- -----------------------------------------------------
CREATE TABLE creator_wallet_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id UUID NOT NULL REFERENCES creator_wallets(id) ON DELETE CASCADE,
    creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Tipo
    transaction_type TEXT NOT NULL CHECK (transaction_type IN (
        'earning',
        'bonus',
        'referral_bonus',
        'payout_request',
        'payout_completed',
        'payout_failed',
        'adjustment',
        'fee'
    )),

    -- Montos
    amount DECIMAL(12,2) NOT NULL,
    balance_after DECIMAL(12,2) NOT NULL,

    -- Descripción
    description TEXT,

    -- Referencias
    campaign_id UUID,
    payout_id UUID REFERENCES platform_payouts(id),
    reference_id TEXT,

    -- Metadata
    metadata JSONB DEFAULT '{}',

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_wallet_transactions_wallet ON creator_wallet_transactions(wallet_id);
CREATE INDEX idx_wallet_transactions_creator ON creator_wallet_transactions(creator_id);
CREATE INDEX idx_wallet_transactions_type ON creator_wallet_transactions(transaction_type);
CREATE INDEX idx_wallet_transactions_created ON creator_wallet_transactions(created_at DESC);

-- =====================================================
-- 2. TRIGGERS
-- =====================================================

-- updated_at triggers
CREATE TRIGGER update_platform_subscriptions_updated_at
    BEFORE UPDATE ON platform_subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_platform_transactions_updated_at
    BEFORE UPDATE ON platform_transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_platform_invoices_updated_at
    BEFORE UPDATE ON platform_invoices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_platform_payouts_updated_at
    BEFORE UPDATE ON platform_payouts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_creator_wallets_updated_at
    BEFORE UPDATE ON creator_wallets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Invoice number auto-generation
CREATE SEQUENCE IF NOT EXISTS invoice_number_seq START 1;

CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.invoice_number IS NULL THEN
        NEW.invoice_number := 'INV-' || TO_CHAR(NOW(), 'YYYYMM') || '-' ||
            LPAD(NEXTVAL('invoice_number_seq')::TEXT, 5, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_invoice_number
    BEFORE INSERT ON platform_invoices
    FOR EACH ROW EXECUTE FUNCTION generate_invoice_number();

-- =====================================================
-- 3. RLS POLICIES
-- =====================================================

-- platform_subscriptions
ALTER TABLE platform_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "platform_subscriptions_policy" ON platform_subscriptions
    FOR ALL USING (
        is_platform_admin(auth.uid()) OR
        organization_id IN (
            SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
        )
    );

-- platform_transactions
ALTER TABLE platform_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "platform_transactions_policy" ON platform_transactions
    FOR ALL USING (
        is_platform_admin(auth.uid()) OR
        organization_id IN (
            SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
        ) OR
        creator_id = auth.uid() OR
        user_id = auth.uid()
    );

-- platform_invoices
ALTER TABLE platform_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "platform_invoices_policy" ON platform_invoices
    FOR ALL USING (
        is_platform_admin(auth.uid()) OR
        organization_id IN (
            SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
        )
    );

-- platform_payouts
ALTER TABLE platform_payouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "platform_payouts_policy" ON platform_payouts
    FOR ALL USING (
        is_platform_admin(auth.uid()) OR
        creator_id = auth.uid()
    );

-- creator_wallets
ALTER TABLE creator_wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "creator_wallets_policy" ON creator_wallets
    FOR ALL USING (
        is_platform_admin(auth.uid()) OR
        creator_id = auth.uid()
    );

-- creator_wallet_transactions
ALTER TABLE creator_wallet_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "creator_wallet_transactions_policy" ON creator_wallet_transactions
    FOR ALL USING (
        is_platform_admin(auth.uid()) OR
        creator_id = auth.uid()
    );

-- =====================================================
-- 4. GRANTS
-- =====================================================

GRANT ALL ON platform_subscriptions TO authenticated;
GRANT ALL ON platform_transactions TO authenticated;
GRANT ALL ON platform_invoices TO authenticated;
GRANT ALL ON platform_payouts TO authenticated;
GRANT ALL ON creator_wallets TO authenticated;
GRANT ALL ON creator_wallet_transactions TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE invoice_number_seq TO authenticated;
