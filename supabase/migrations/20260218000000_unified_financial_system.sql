-- ============================================================================
-- KREOON UNIFIED FINANCIAL SYSTEM
-- Migración consolidada para unificar toda la arquitectura financiera
-- Fecha: 2026-02-16
-- ============================================================================

-- ============================================================================
-- PARTE 1: CLEANUP - Eliminar tablas duplicadas/obsoletas
-- ============================================================================

-- Backup de datos existentes antes de eliminar (si existen)
DO $$
BEGIN
    -- Crear tabla de backup si hay datos en creator_wallets
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'creator_wallets') THEN
        CREATE TABLE IF NOT EXISTS _backup_creator_wallets AS SELECT * FROM creator_wallets;
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'creator_wallet_transactions') THEN
        CREATE TABLE IF NOT EXISTS _backup_creator_wallet_transactions AS SELECT * FROM creator_wallet_transactions;
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'wallet_transactions') THEN
        CREATE TABLE IF NOT EXISTS _backup_wallet_transactions AS SELECT * FROM wallet_transactions;
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'platform_transactions') THEN
        CREATE TABLE IF NOT EXISTS _backup_platform_transactions AS SELECT * FROM platform_transactions;
    END IF;
END $$;

-- Drop Phase B referral tables if they exist (from migration 20260217500000)
DROP TABLE IF EXISTS referral_earnings CASCADE;
DROP TABLE IF EXISTS referral_relationships CASCADE;

-- Drop functions from Phase B migration
DROP FUNCTION IF EXISTS update_referral_relationship_timestamp() CASCADE;
DROP FUNCTION IF EXISTS update_referral_relationship_totals() CASCADE;
DROP FUNCTION IF EXISTS get_perpetual_referral_stats(UUID) CASCADE;

-- Drop tables with incompatible schema (backup first, then recreate with new schema)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'ai_token_transactions' AND table_schema = 'public') THEN
        CREATE TABLE IF NOT EXISTS _backup_ai_token_transactions AS SELECT * FROM ai_token_transactions;
    END IF;
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'referral_codes' AND table_schema = 'public') THEN
        CREATE TABLE IF NOT EXISTS _backup_referral_codes AS SELECT * FROM referral_codes;
    END IF;
END $$;
DROP TABLE IF EXISTS ai_token_transactions CASCADE;
DROP TABLE IF EXISTS referral_codes CASCADE;

-- ============================================================================
-- PARTE 2: ENUMS UNIFICADOS
-- ============================================================================

-- Tipos de wallet
DO $$ BEGIN
    CREATE TYPE wallet_type AS ENUM (
        'creator',
        'editor', 
        'brand',
        'organization',
        'agency',
        'platform'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Estados de transacción
DO $$ BEGIN
    CREATE TYPE transaction_status AS ENUM (
        'pending',
        'processing',
        'completed',
        'failed',
        'cancelled',
        'refunded',
        'disputed'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Tipos de transacción unificados
DO $$ BEGIN
    CREATE TYPE transaction_type AS ENUM (
        -- Depósitos/Retiros
        'deposit',
        'withdrawal',
        -- Escrow
        'escrow_hold',
        'escrow_release',
        'escrow_refund',
        'escrow_partial_release',
        -- Comisiones
        'platform_fee',
        'referral_commission',
        -- Suscripciones
        'subscription_payment',
        'subscription_refund',
        -- AI Tokens
        'token_purchase',
        'token_consumption',
        'token_bonus',
        -- Transferencias
        'transfer_in',
        'transfer_out',
        -- Ajustes
        'adjustment',
        'chargeback'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Estados de escrow
DO $$ BEGIN
    CREATE TYPE escrow_status AS ENUM (
        'created',
        'funded',
        'partially_funded',
        'in_progress',
        'pending_approval',
        'approved',
        'disputed',
        'resolved',
        'released',
        'refunded',
        'cancelled'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Tipos de proyecto/servicio financiero (renamed to avoid conflict with existing project_type enum)
DO $$ BEGIN
    CREATE TYPE financial_project_type AS ENUM (
        'marketplace_direct',
        'campaign_managed',
        'live_shopping',
        'professional_service',
        'corporate_package'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Métodos de retiro
DO $$ BEGIN
    CREATE TYPE withdrawal_method AS ENUM (
        'bank_col',
        'bank_international',
        'paypal',
        'payoneer',
        'nequi',
        'daviplata',
        'mercadopago',
        'crypto',
        'zelle',
        'wise'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Estados de retiro
DO $$ BEGIN
    CREATE TYPE withdrawal_status AS ENUM (
        'pending',
        'processing',
        'completed',
        'failed',
        'cancelled'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Tipos de suscripción
DO $$ BEGIN
    CREATE TYPE subscription_tier AS ENUM (
        -- Marcas
        'brand_free',
        'brand_starter',
        'brand_pro',
        'brand_business',
        -- Creadores
        'creator_free',
        'creator_pro',
        -- Organizaciones
        'org_starter',
        'org_pro',
        'org_enterprise'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Estados de suscripción
-- NOTE: If enum already exists, run these BEFORE this migration (separate transaction):
--   ALTER TYPE subscription_status ADD VALUE IF NOT EXISTS 'trialing';
--   ALTER TYPE subscription_status ADD VALUE IF NOT EXISTS 'past_due';
--   ALTER TYPE subscription_status ADD VALUE IF NOT EXISTS 'paused';
DO $$ BEGIN
    CREATE TYPE subscription_status AS ENUM (
        'trialing', 'active', 'past_due', 'cancelled', 'paused', 'expired', 'pending'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- PARTE 3: TABLAS PRINCIPALES
-- ============================================================================

-- --------------------------------------
-- 3.1 WALLETS UNIFICADOS
-- --------------------------------------
CREATE TABLE IF NOT EXISTS unified_wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Propietario (uno de estos será NOT NULL)
    user_id UUID REFERENCES auth.users(id),
    organization_id UUID REFERENCES organizations(id),
    
    -- Tipo de wallet
    wallet_type wallet_type NOT NULL,
    
    -- Balances en USD (moneda base)
    balance_available DECIMAL(12,2) DEFAULT 0 CHECK (balance_available >= 0),
    balance_pending DECIMAL(12,2) DEFAULT 0 CHECK (balance_pending >= 0),
    balance_reserved DECIMAL(12,2) DEFAULT 0 CHECK (balance_reserved >= 0),
    
    -- Totales acumulados (para estadísticas)
    total_earned DECIMAL(14,2) DEFAULT 0,
    total_withdrawn DECIMAL(14,2) DEFAULT 0,
    total_spent DECIMAL(14,2) DEFAULT 0,
    
    -- Moneda preferida del usuario
    preferred_currency TEXT DEFAULT 'USD',
    
    -- Stripe
    stripe_customer_id TEXT,
    stripe_connect_account_id TEXT,
    stripe_connect_status TEXT DEFAULT 'not_connected', -- not_connected, pending, active, restricted
    
    -- Metadata
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT wallet_owner_check CHECK (
        wallet_type = 'platform' OR
        (user_id IS NOT NULL AND organization_id IS NULL) OR
        (user_id IS NULL AND organization_id IS NOT NULL)
    ),
    CONSTRAINT unique_user_wallet UNIQUE (user_id, wallet_type),
    CONSTRAINT unique_org_wallet UNIQUE (organization_id, wallet_type)
);

-- Índices para wallets
CREATE INDEX IF NOT EXISTS idx_wallets_user ON unified_wallets(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_wallets_org ON unified_wallets(organization_id) WHERE organization_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_wallets_stripe_customer ON unified_wallets(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;

-- --------------------------------------
-- 3.2 ESCROW HOLDS (Refactorizado) — created before transactions for FK
-- --------------------------------------
DROP TABLE IF EXISTS escrow_holds CASCADE;

CREATE TABLE escrow_holds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Proyecto asociado
    project_id UUID,
    project_type financial_project_type NOT NULL,
    project_title TEXT,
    
    -- Participantes
    client_id UUID NOT NULL REFERENCES auth.users(id), -- Quien paga
    client_wallet_id UUID REFERENCES unified_wallets(id),
    
    -- Monto total y distribución
    total_amount DECIMAL(12,2) NOT NULL CHECK (total_amount > 0),
    currency TEXT DEFAULT 'USD',
    
    -- Comisiones (calculadas según tipo de proyecto)
    platform_fee_rate DECIMAL(5,4) NOT NULL, -- 0.20 a 0.40
    platform_fee_amount DECIMAL(10,2) GENERATED ALWAYS AS (total_amount * platform_fee_rate) STORED,
    
    -- Referido (si aplica)
    referral_id UUID, -- FK added after referral_relationships table creation
    referral_fee_rate DECIMAL(5,4) DEFAULT 0, -- 0.05 del platform_fee
    referral_fee_amount DECIMAL(10,2) DEFAULT 0,
    
    -- Distribución de beneficiarios
    distributions JSONB NOT NULL DEFAULT '[]',
    /*
    Estructura de distributions:
    [
        {
            "wallet_id": "uuid",
            "user_id": "uuid",
            "role": "creator" | "editor" | "organization",
            "percentage": 0.70,
            "amount": 700.00,
            "released": false,
            "released_at": null
        }
    ]
    */
    
    -- Estado
    status escrow_status DEFAULT 'created',
    
    -- Milestones (opcional)
    milestones JSONB DEFAULT '[]',
    /*
    [
        {
            "id": "uuid",
            "title": "Entrega inicial",
            "percentage": 0.50,
            "amount": 500.00,
            "status": "pending" | "approved" | "disputed",
            "due_date": "2026-02-20",
            "completed_at": null
        }
    ]
    */
    
    -- Stripe
    stripe_payment_intent_id TEXT,
    stripe_payment_status TEXT,
    
    -- Timestamps
    funded_at TIMESTAMPTZ,
    approved_at TIMESTAMPTZ,
    released_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ, -- Auto-release después de X días
    
    -- Auto-aprobación (72h sin respuesta)
    auto_approve_at TIMESTAMPTZ,
    
    -- Disputa
    disputed_at TIMESTAMPTZ,
    dispute_reason TEXT,
    dispute_resolved_at TIMESTAMPTZ,
    dispute_resolution TEXT,
    
    -- Metadata
    notes TEXT,
    metadata JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para escrow
CREATE INDEX IF NOT EXISTS idx_escrow_client ON escrow_holds(client_id);
CREATE INDEX IF NOT EXISTS idx_escrow_project ON escrow_holds(project_id) WHERE project_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_escrow_status ON escrow_holds(status);
CREATE INDEX IF NOT EXISTS idx_escrow_auto_approve ON escrow_holds(auto_approve_at) WHERE status = 'pending_approval';
CREATE INDEX IF NOT EXISTS idx_escrow_stripe ON escrow_holds(stripe_payment_intent_id) WHERE stripe_payment_intent_id IS NOT NULL;

-- --------------------------------------
-- 3.3 TRANSACCIONES UNIFICADAS
-- --------------------------------------
CREATE TABLE IF NOT EXISTS unified_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Referencia al wallet
    wallet_id UUID NOT NULL REFERENCES unified_wallets(id),

    -- Tipo y estado
    transaction_type transaction_type NOT NULL,
    status transaction_status DEFAULT 'pending',

    -- Montos
    amount DECIMAL(12,2) NOT NULL,
    fee DECIMAL(10,2) DEFAULT 0,
    net_amount DECIMAL(12,2) GENERATED ALWAYS AS (amount - fee) STORED,

    -- Moneda
    currency TEXT DEFAULT 'USD',
    exchange_rate DECIMAL(10,6) DEFAULT 1,
    amount_original DECIMAL(12,2),
    currency_original TEXT,

    -- Referencias
    escrow_id UUID REFERENCES escrow_holds(id),
    subscription_id UUID,
    project_id UUID,
    referral_id UUID,
    related_transaction_id UUID REFERENCES unified_transactions(id),

    -- Stripe
    stripe_payment_intent_id TEXT,
    stripe_transfer_id TEXT,
    stripe_charge_id TEXT,

    -- Metadata
    description TEXT,
    metadata JSONB DEFAULT '{}',

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ,

    -- Idempotency
    idempotency_key TEXT UNIQUE
);

-- Índices para transacciones
CREATE INDEX IF NOT EXISTS idx_transactions_wallet ON unified_transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON unified_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON unified_transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_escrow ON unified_transactions(escrow_id) WHERE escrow_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_transactions_created ON unified_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_stripe_pi ON unified_transactions(stripe_payment_intent_id) WHERE stripe_payment_intent_id IS NOT NULL;

-- --------------------------------------
-- 3.4 SUSCRIPCIONES
-- --------------------------------------
DROP TABLE IF EXISTS platform_subscriptions CASCADE;

CREATE TABLE platform_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Propietario
    user_id UUID REFERENCES auth.users(id),
    organization_id UUID REFERENCES organizations(id),
    wallet_id UUID REFERENCES unified_wallets(id),
    
    -- Plan
    tier subscription_tier NOT NULL,
    status subscription_status DEFAULT 'trialing',
    
    -- Precios
    price_monthly DECIMAL(8,2) NOT NULL,
    price_annual DECIMAL(8,2),
    billing_cycle TEXT DEFAULT 'monthly', -- monthly, annual
    current_price DECIMAL(8,2) NOT NULL,
    
    -- Stripe
    stripe_subscription_id TEXT UNIQUE,
    stripe_price_id TEXT,
    stripe_customer_id TEXT,
    
    -- Período
    trial_ends_at TIMESTAMPTZ,
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    
    -- Cancelación
    cancel_at_period_end BOOLEAN DEFAULT false,
    cancelled_at TIMESTAMPTZ,
    cancellation_reason TEXT,
    
    -- Referido
    referred_by UUID, -- FK added after referral_relationships table creation
    
    -- Límites del plan (snapshot al momento de suscripción)
    plan_limits JSONB NOT NULL DEFAULT '{}',
    /*
    {
        "max_users": 3,
        "max_content_per_month": 50,
        "ai_tokens_monthly": 4000,
        "storage_gb": 5,
        "features": ["basic_analytics", "escrow"]
    }
    */
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT subscription_owner_check CHECK (
        (user_id IS NOT NULL AND organization_id IS NULL) OR
        (user_id IS NULL AND organization_id IS NOT NULL)
    )
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON platform_subscriptions(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_subscriptions_org ON platform_subscriptions(organization_id) WHERE organization_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON platform_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe ON platform_subscriptions(stripe_subscription_id) WHERE stripe_subscription_id IS NOT NULL;

-- --------------------------------------
-- 3.5 SOLICITUDES DE RETIRO
-- --------------------------------------
DROP TABLE IF EXISTS withdrawal_requests CASCADE;

CREATE TABLE withdrawal_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Wallet origen
    wallet_id UUID NOT NULL REFERENCES unified_wallets(id),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    
    -- Monto
    amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
    currency TEXT DEFAULT 'USD',
    
    -- Fees
    fee_fixed DECIMAL(8,2) DEFAULT 0,
    fee_percentage DECIMAL(5,4) DEFAULT 0,
    fee_total DECIMAL(8,2) DEFAULT 0,
    net_amount DECIMAL(12,2) NOT NULL,
    
    -- Método de pago
    method withdrawal_method NOT NULL,
    payment_details JSONB NOT NULL,
    /*
    Para bank_col:
    {
        "bank_name": "Bancolombia",
        "account_type": "savings",
        "account_number": "****1234",
        "account_holder": "Alexander..."
    }
    
    Para paypal:
    {
        "email": "user@email.com"
    }
    
    Para crypto:
    {
        "network": "ethereum",
        "wallet_address": "0x...",
        "currency": "USDT"
    }
    */
    
    -- Estado
    status withdrawal_status DEFAULT 'pending',
    
    -- Procesamiento
    processed_by UUID REFERENCES auth.users(id),
    processed_at TIMESTAMPTZ,
    
    -- Stripe/Payout
    stripe_payout_id TEXT,
    external_reference TEXT, -- Referencia del banco/servicio
    
    -- En caso de fallo
    failure_reason TEXT,
    
    -- Transacción relacionada
    transaction_id UUID REFERENCES unified_transactions(id),
    
    -- Metadata
    notes TEXT,
    metadata JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_withdrawals_wallet ON withdrawal_requests(wallet_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_user ON withdrawal_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON withdrawal_requests(status);
CREATE INDEX IF NOT EXISTS idx_withdrawals_created ON withdrawal_requests(created_at DESC);

-- ============================================================================
-- PARTE 4: SISTEMA DE REFERIDOS (Perpetuo)
-- ============================================================================

-- --------------------------------------
-- 4.1 RELACIONES DE REFERIDO
-- --------------------------------------
CREATE TABLE IF NOT EXISTS referral_relationships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Quien refiere
    referrer_id UUID NOT NULL REFERENCES auth.users(id),
    referrer_wallet_id UUID REFERENCES unified_wallets(id),
    
    -- Quien es referido
    referred_id UUID NOT NULL REFERENCES auth.users(id),
    referred_wallet_id UUID REFERENCES unified_wallets(id),
    
    -- Código usado
    referral_code TEXT NOT NULL,
    
    -- Tipo de referido
    referred_type TEXT NOT NULL, -- 'brand', 'creator', 'organization'
    
    -- Estado (activo mientras ambas cuentas estén activas)
    status TEXT DEFAULT 'active', -- active, paused, terminated
    
    -- Tasas de comisión (pueden ser custom)
    subscription_rate DECIMAL(5,4) DEFAULT 0.20, -- 20% de suscripciones
    transaction_rate DECIMAL(5,4) DEFAULT 0.05, -- 5% de transacciones
    
    -- Acumulados lifetime
    total_subscription_earned DECIMAL(14,2) DEFAULT 0,
    total_transaction_earned DECIMAL(14,2) DEFAULT 0,
    total_earned DECIMAL(14,2) GENERATED ALWAYS AS (total_subscription_earned + total_transaction_earned) STORED,
    
    -- Tracking de actividad
    referrer_last_active TIMESTAMPTZ,
    referred_last_active TIMESTAMPTZ,
    
    -- Razón de terminación
    terminated_at TIMESTAMPTZ,
    termination_reason TEXT,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT unique_referral_relationship UNIQUE (referrer_id, referred_id)
);

CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referral_relationships(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred ON referral_relationships(referred_id);
CREATE INDEX IF NOT EXISTS idx_referrals_code ON referral_relationships(referral_code);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON referral_relationships(status);

-- --------------------------------------
-- 4.2 CÓDIGOS DE REFERIDO
-- --------------------------------------
CREATE TABLE IF NOT EXISTS referral_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    user_id UUID NOT NULL REFERENCES auth.users(id),
    
    -- Código único
    code TEXT NOT NULL UNIQUE,
    
    -- Tipo de audiencia objetivo
    target_type TEXT DEFAULT 'all', -- all, brand, creator, organization
    
    -- Estadísticas
    clicks INTEGER DEFAULT 0,
    registrations INTEGER DEFAULT 0,
    conversions INTEGER DEFAULT 0, -- Referidos que pagaron
    
    -- Límites (opcional)
    max_uses INTEGER, -- NULL = ilimitado
    
    -- Estado
    is_active BOOLEAN DEFAULT true,
    expires_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_referral_codes_user ON referral_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_referral_codes_code ON referral_codes(code);

-- --------------------------------------
-- 4.3 GANANCIAS DE REFERIDOS
-- --------------------------------------
CREATE TABLE IF NOT EXISTS referral_earnings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Relación de referido
    relationship_id UUID NOT NULL REFERENCES referral_relationships(id),
    
    -- Quien recibe la comisión
    referrer_id UUID NOT NULL REFERENCES auth.users(id),
    referrer_wallet_id UUID REFERENCES unified_wallets(id),
    
    -- Fuente de la ganancia
    source_type TEXT NOT NULL, -- 'subscription', 'transaction'
    source_id UUID NOT NULL, -- ID de la suscripción o escrow
    
    -- Montos
    gross_amount DECIMAL(12,2) NOT NULL, -- Monto total de la transacción
    commission_rate DECIMAL(5,4) NOT NULL, -- 0.20 o 0.05
    commission_amount DECIMAL(12,2) NOT NULL,
    
    -- Estado
    status TEXT DEFAULT 'pending', -- pending, credited, paid, cancelled
    
    -- Transacción asociada
    transaction_id UUID REFERENCES unified_transactions(id),
    
    -- Timestamps
    credited_at TIMESTAMPTZ,
    paid_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_referral_earnings_relationship ON referral_earnings(relationship_id);
CREATE INDEX IF NOT EXISTS idx_referral_earnings_referrer ON referral_earnings(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referral_earnings_status ON referral_earnings(status);
CREATE INDEX IF NOT EXISTS idx_referral_earnings_source ON referral_earnings(source_type, source_id);

-- Deferred FK constraints (referral_relationships created after escrow_holds/subscriptions)
ALTER TABLE escrow_holds ADD CONSTRAINT fk_escrow_referral
    FOREIGN KEY (referral_id) REFERENCES referral_relationships(id);
ALTER TABLE platform_subscriptions ADD CONSTRAINT fk_subscription_referral
    FOREIGN KEY (referred_by) REFERENCES referral_relationships(id);

-- ============================================================================
-- PARTE 5: AI TOKENS (Mejorado)
-- ============================================================================

-- --------------------------------------
-- 5.1 BALANCE DE TOKENS
-- --------------------------------------
DROP TABLE IF EXISTS organization_ai_tokens CASCADE;

CREATE TABLE ai_token_balances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Propietario
    user_id UUID REFERENCES auth.users(id),
    organization_id UUID REFERENCES organizations(id),
    
    -- Balances
    balance_subscription INTEGER DEFAULT 0, -- Tokens del plan
    balance_purchased INTEGER DEFAULT 0, -- Tokens comprados
    balance_bonus INTEGER DEFAULT 0, -- Tokens de regalo/promo
    balance_total INTEGER GENERATED ALWAYS AS (balance_subscription + balance_purchased + balance_bonus) STORED,
    
    -- Del plan actual
    subscription_tier subscription_tier,
    monthly_allowance INTEGER DEFAULT 0,
    
    -- Reset mensual
    last_reset_at TIMESTAMPTZ DEFAULT NOW(),
    next_reset_at TIMESTAMPTZ,
    
    -- Acumulados
    total_consumed INTEGER DEFAULT 0,
    total_purchased INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT token_owner_check CHECK (
        (user_id IS NOT NULL AND organization_id IS NULL) OR
        (user_id IS NULL AND organization_id IS NOT NULL)
    ),
    CONSTRAINT unique_user_tokens UNIQUE (user_id),
    CONSTRAINT unique_org_tokens UNIQUE (organization_id)
);

CREATE INDEX IF NOT EXISTS idx_tokens_user ON ai_token_balances(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tokens_org ON ai_token_balances(organization_id) WHERE organization_id IS NOT NULL;

-- --------------------------------------
-- 5.2 TRANSACCIONES DE TOKENS
-- --------------------------------------
CREATE TABLE IF NOT EXISTS ai_token_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Balance afectado
    balance_id UUID NOT NULL REFERENCES ai_token_balances(id),
    
    -- Tipo
    transaction_type TEXT NOT NULL, -- 'consumption', 'purchase', 'subscription_credit', 'bonus', 'refund', 'reset'
    
    -- Tokens
    tokens INTEGER NOT NULL, -- Positivo = crédito, Negativo = consumo
    balance_after INTEGER NOT NULL,
    
    -- Para consumo: qué acción
    action_type TEXT, -- 'research.full', 'scripts.generate', etc.
    action_metadata JSONB DEFAULT '{}',
    
    -- Para compras
    purchase_amount DECIMAL(8,2),
    stripe_payment_id TEXT,
    
    -- Usuario que ejecutó
    executed_by UUID REFERENCES auth.users(id),
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_token_tx_balance ON ai_token_transactions(balance_id);
CREATE INDEX IF NOT EXISTS idx_token_tx_type ON ai_token_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_token_tx_created ON ai_token_transactions(created_at DESC);

-- ============================================================================
-- PARTE 6: PRECIOS Y CONFIGURACIÓN
-- ============================================================================

-- --------------------------------------
-- 6.1 CONFIGURACIÓN DE PRECIOS (Editable por admin)
-- --------------------------------------
CREATE TABLE IF NOT EXISTS pricing_configuration (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    config_key TEXT NOT NULL UNIQUE,
    config_value JSONB NOT NULL,
    
    description TEXT,
    
    updated_by UUID REFERENCES auth.users(id),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insertar configuración por defecto
INSERT INTO pricing_configuration (config_key, config_value, description) VALUES

-- Comisiones por tipo de proyecto
('commission_rates', '{
    "marketplace_direct": {"default": 0.25, "min": 0.20, "max": 0.35},
    "campaign_managed": {"default": 0.30, "min": 0.25, "max": 0.40},
    "live_shopping": {"default": 0.20, "min": 0.15, "max": 0.25},
    "professional_service": {"default": 0.25, "min": 0.20, "max": 0.30},
    "corporate_package": {"default": 0.35, "min": 0.30, "max": 0.40}
}', 'Comisiones de plataforma por tipo de proyecto'),

-- Distribución interna
('distribution_splits', '{
    "creator": 0.70,
    "editor": 0.15,
    "organization": 0.15
}', 'Distribución porcentual entre participantes'),

-- Referidos
('referral_rates', '{
    "subscription": 0.20,
    "transaction": 0.05,
    "ai_tokens": 0
}', 'Tasas de comisión para referidos'),

-- Planes de marcas
('plans_brand', '{
    "brand_free": {
        "name": "Explorar",
        "price_monthly": 0,
        "price_annual": 0,
        "max_users": 1,
        "max_content_per_month": 0,
        "ai_tokens_monthly": 300,
        "storage_gb": 0,
        "features": ["browse_marketplace"]
    },
    "brand_starter": {
        "name": "Starter",
        "price_monthly": 39,
        "price_annual": 390,
        "max_users": 3,
        "max_content_per_month": 30,
        "ai_tokens_monthly": 4000,
        "storage_gb": 5,
        "features": ["browse_marketplace", "create_campaigns", "basic_ai", "escrow", "basic_analytics"]
    },
    "brand_pro": {
        "name": "Pro",
        "price_monthly": 129,
        "price_annual": 1290,
        "max_users": 10,
        "max_content_per_month": 150,
        "ai_tokens_monthly": 12000,
        "storage_gb": 50,
        "features": ["browse_marketplace", "create_campaigns", "advanced_ai", "escrow", "advanced_analytics", "priority_support", "custom_branding"]
    },
    "brand_business": {
        "name": "Business",
        "price_monthly": 349,
        "price_annual": 3490,
        "max_users": -1,
        "max_content_per_month": -1,
        "ai_tokens_monthly": 40000,
        "storage_gb": 500,
        "features": ["browse_marketplace", "create_campaigns", "advanced_ai", "escrow", "advanced_analytics", "priority_support", "custom_branding", "api_access", "dedicated_pm", "live_shopping"]
    }
}', 'Planes de suscripción para marcas'),

-- Planes de creadores
('plans_creator', '{
    "creator_free": {
        "name": "Básico",
        "price_monthly": 0,
        "price_annual": 0,
        "ai_tokens_monthly": 800,
        "features": ["profile", "apply_campaigns", "basic_ai", "portfolio"]
    },
    "creator_pro": {
        "name": "Creator Pro",
        "price_monthly": 24,
        "price_annual": 240,
        "ai_tokens_monthly": 6000,
        "features": ["profile", "apply_campaigns", "advanced_ai", "portfolio", "verified_badge", "priority_matching", "advanced_analytics", "early_access"]
    }
}', 'Planes de suscripción para creadores'),

-- Planes de organizaciones
('plans_organization', '{
    "org_starter": {
        "name": "Agency Starter",
        "price_monthly": 249,
        "price_annual": 2490,
        "max_clients": 5,
        "max_team": 10,
        "ai_tokens_monthly": 20000,
        "features": ["team_management", "client_management", "escrow", "analytics", "white_label_basic"]
    },
    "org_pro": {
        "name": "Agency Pro",
        "price_monthly": 599,
        "price_annual": 5990,
        "max_clients": 20,
        "max_team": 30,
        "ai_tokens_monthly": 60000,
        "features": ["team_management", "client_management", "escrow", "advanced_analytics", "white_label", "api_access", "priority_support"]
    },
    "org_enterprise": {
        "name": "Enterprise",
        "price_monthly": null,
        "price_annual": null,
        "max_clients": -1,
        "max_team": -1,
        "ai_tokens_monthly": 200000,
        "features": ["all_features", "custom_integrations", "dedicated_support", "sla"]
    }
}', 'Planes de suscripción para organizaciones'),

-- Paquetes de tokens
('token_packages', '{
    "basic": {"tokens": 2000, "price": 15, "discount": 0},
    "popular": {"tokens": 10000, "price": 59, "discount": 0.21},
    "pro": {"tokens": 30000, "price": 149, "discount": 0.34},
    "agency": {"tokens": 100000, "price": 399, "discount": 0.47}
}', 'Paquetes de compra de AI tokens'),

-- Costos de AI por acción
('ai_action_costs', '{
    "research.full": 600,
    "dna.full_analysis": 500,
    "scripts.generate": 120,
    "content.generate_script": 120,
    "research.phase": 100,
    "board.analyze_card": 80,
    "scripts.improve": 60,
    "portfolio.bio": 50,
    "board.suggestions": 40,
    "script_chat": 20,
    "transcription_per_minute": 15,
    "default": 40
}', 'Costo en tokens por acción de IA'),

-- Fees de retiro
('withdrawal_fees', '{
    "bank_col": {"fixed": 0, "percentage": 0, "minimum": 50000, "currency": "COP"},
    "bank_international": {"fixed": 25, "percentage": 0, "minimum": 100, "currency": "USD"},
    "paypal": {"fixed": 0, "percentage": 0.025, "minimum": 10, "currency": "USD"},
    "payoneer": {"fixed": 3, "percentage": 0, "minimum": 50, "currency": "USD"},
    "nequi": {"fixed": 0, "percentage": 0, "minimum": 10000, "currency": "COP"},
    "daviplata": {"fixed": 0, "percentage": 0, "minimum": 10000, "currency": "COP"},
    "mercadopago": {"fixed": 0, "percentage": 0.02, "minimum": 20000, "currency": "COP"},
    "crypto": {"fixed": 5, "percentage": 0, "minimum": 50, "currency": "USD"},
    "zelle": {"fixed": 0, "percentage": 0, "minimum": 10, "currency": "USD"},
    "wise": {"fixed": 1, "percentage": 0.005, "minimum": 20, "currency": "USD"}
}', 'Fees por método de retiro')

ON CONFLICT (config_key) DO UPDATE SET 
    config_value = EXCLUDED.config_value,
    updated_at = NOW();

-- --------------------------------------
-- 6.2 ACUERDOS DE PRECIOS PERSONALIZADOS
-- --------------------------------------
CREATE TABLE IF NOT EXISTS custom_pricing_agreements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Entidad beneficiaria
    user_id UUID REFERENCES auth.users(id),
    organization_id UUID REFERENCES organizations(id),
    
    -- Overrides de comisiones
    marketplace_fee_override DECIMAL(5,4),
    campaign_fee_override DECIMAL(5,4),
    live_shopping_fee_override DECIMAL(5,4),
    professional_fee_override DECIMAL(5,4),
    corporate_fee_override DECIMAL(5,4),
    
    -- Overrides de referidos
    referral_subscription_rate DECIMAL(5,4),
    referral_transaction_rate DECIMAL(5,4),
    
    -- Overrides de tokens
    token_discount_percent DECIMAL(5,4),
    bonus_tokens_monthly INTEGER,
    
    -- Overrides de suscripción
    subscription_discount_percent DECIMAL(5,4),
    custom_plan_limits JSONB,
    
    -- Validez
    valid_from DATE NOT NULL DEFAULT CURRENT_DATE,
    valid_until DATE,
    is_active BOOLEAN DEFAULT true,
    
    -- Aprobación
    negotiated_by UUID REFERENCES auth.users(id),
    approved_by UUID REFERENCES auth.users(id),
    approved_at TIMESTAMPTZ,
    
    -- Notas
    notes TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT agreement_entity_check CHECK (
        (user_id IS NOT NULL AND organization_id IS NULL) OR
        (user_id IS NULL AND organization_id IS NOT NULL)
    )
);

CREATE INDEX IF NOT EXISTS idx_agreements_user ON custom_pricing_agreements(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_agreements_org ON custom_pricing_agreements(organization_id) WHERE organization_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_agreements_active ON custom_pricing_agreements(is_active, valid_from, valid_until);

-- ============================================================================
-- PARTE 7: ROLES SIMPLIFICADOS
-- ============================================================================

-- Actualizar o crear tabla de roles simplificados
CREATE TABLE IF NOT EXISTS creator_roles (
    id TEXT PRIMARY KEY,
    label TEXT NOT NULL,
    category TEXT NOT NULL, -- 'content_creation', 'post_production', 'strategy', 'tech', 'education', 'client'
    icon TEXT,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0
);

-- Tabla de especialidades (tags)
CREATE TABLE IF NOT EXISTS role_specialties (
    id TEXT PRIMARY KEY,
    role_id TEXT NOT NULL REFERENCES creator_roles(id),
    label TEXT NOT NULL,
    icon TEXT,
    is_active BOOLEAN DEFAULT true
);

-- Insertar roles principales (8 roles)
INSERT INTO creator_roles (id, label, category, description, sort_order) VALUES
('ugc_creator', 'Creador UGC', 'content_creation', 'Crea contenido auténtico para marcas', 1),
('influencer', 'Influencer', 'content_creation', 'Creador con audiencia establecida', 2),
('post_production', 'Post-Producción', 'post_production', 'Edición, motion graphics, sonido', 3),
('strategist', 'Estratega', 'strategy', 'Estrategia de contenido y marketing', 4),
('producer', 'Productor', 'content_creation', 'Dirección y producción audiovisual', 5),
('tech', 'Técnico', 'tech', 'Desarrollo web, apps, IA', 6),
('educator', 'Educador', 'education', 'Formación y talleres', 7),
('brand', 'Marca', 'client', 'Empresas y marcas', 8)
ON CONFLICT (id) DO UPDATE SET 
    label = EXCLUDED.label,
    category = EXCLUDED.category,
    description = EXCLUDED.description;

-- Insertar especialidades
INSERT INTO role_specialties (id, role_id, label) VALUES
-- UGC Creator
('ugc_lifestyle', 'ugc_creator', 'Lifestyle'),
('ugc_beauty', 'ugc_creator', 'Belleza'),
('ugc_tech', 'ugc_creator', 'Tecnología'),
('ugc_fitness', 'ugc_creator', 'Fitness'),
('ugc_food', 'ugc_creator', 'Food & Beverage'),
('ugc_gaming', 'ugc_creator', 'Gaming'),
('ugc_travel', 'ugc_creator', 'Travel'),
('ugc_fashion', 'ugc_creator', 'Moda'),
('ugc_parenting', 'ugc_creator', 'Parenting'),
('ugc_pets', 'ugc_creator', 'Mascotas'),
-- Influencer
('inf_nano', 'influencer', 'Nano (1K-10K)'),
('inf_micro', 'influencer', 'Micro (10K-100K)'),
('inf_macro', 'influencer', 'Macro (100K-1M)'),
('inf_mega', 'influencer', 'Mega (1M+)'),
('inf_ambassador', 'influencer', 'Brand Ambassador'),
('inf_streamer', 'influencer', 'Streamer'),
('inf_podcaster', 'influencer', 'Podcaster'),
-- Post Production
('pp_video_editor', 'post_production', 'Editor de Video'),
('pp_motion', 'post_production', 'Motion Graphics'),
('pp_sound', 'post_production', 'Sound Design'),
('pp_color', 'post_production', 'Colorista'),
('pp_animator', 'post_production', 'Animador 2D/3D'),
('pp_vfx', 'post_production', 'VFX'),
-- Strategist
('str_content', 'strategist', 'Content Strategy'),
('str_social', 'strategist', 'Social Media'),
('str_digital', 'strategist', 'Digital Marketing'),
('str_seo', 'strategist', 'SEO/SEM'),
('str_growth', 'strategist', 'Growth'),
('str_crm', 'strategist', 'CRM'),
('str_copywriter', 'strategist', 'Copywriting'),
-- Producer
('prod_director', 'producer', 'Director Creativo'),
('prod_photographer', 'producer', 'Fotógrafo'),
('prod_voice', 'producer', 'Locutor/Voz'),
('prod_audiovisual', 'producer', 'Productor Audiovisual'),
-- Tech
('tech_web', 'tech', 'Desarrollo Web'),
('tech_app', 'tech', 'Desarrollo Apps'),
('tech_ai', 'tech', 'Especialista IA'),
-- Educator
('edu_instructor', 'educator', 'Instructor Online'),
('edu_facilitator', 'educator', 'Facilitador'),
('edu_mentor', 'educator', 'Mentor'),
-- Brand
('brand_manager', 'brand', 'Brand Manager'),
('brand_marketing', 'brand', 'Marketing Director'),
('brand_ecommerce', 'brand', 'E-commerce'),
('brand_agency', 'brand', 'Agencia')
ON CONFLICT (id) DO UPDATE SET label = EXCLUDED.label;

-- ============================================================================
-- PARTE 8: FUNCIONES Y TRIGGERS
-- ============================================================================

-- --------------------------------------
-- 8.1 Función para crear wallet automáticamente
-- --------------------------------------
CREATE OR REPLACE FUNCTION create_user_wallet()
RETURNS TRIGGER AS $$
DECLARE
    v_wallet_type wallet_type;
    v_role TEXT;
BEGIN
    -- Obtener el rol del usuario
    SELECT role INTO v_role FROM profiles WHERE id = NEW.id;
    
    -- Mapear rol a wallet_type
    v_wallet_type := CASE 
        WHEN v_role IN ('ugc_creator', 'influencer', 'producer', 'educator') THEN 'creator'::wallet_type
        WHEN v_role = 'post_production' THEN 'editor'::wallet_type
        WHEN v_role = 'brand' THEN 'brand'::wallet_type
        WHEN v_role = 'strategist' THEN 'creator'::wallet_type
        WHEN v_role = 'tech' THEN 'creator'::wallet_type
        ELSE 'creator'::wallet_type
    END;
    
    -- Crear wallet si no existe
    INSERT INTO unified_wallets (user_id, wallet_type)
    VALUES (NEW.id, v_wallet_type)
    ON CONFLICT (user_id, wallet_type) DO NOTHING;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- --------------------------------------
-- 8.2 Función para crear balance de tokens
-- --------------------------------------
CREATE OR REPLACE FUNCTION create_user_token_balance()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO ai_token_balances (user_id, balance_subscription, monthly_allowance)
    VALUES (NEW.id, 800, 800) -- Default: creator_free
    ON CONFLICT (user_id) DO NOTHING;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- --------------------------------------
-- 8.3 Función para consumir tokens (atómica)
-- --------------------------------------
CREATE OR REPLACE FUNCTION consume_ai_tokens(
    p_user_id UUID,
    p_org_id UUID,
    p_action_type TEXT,
    p_tokens INTEGER,
    p_metadata JSONB DEFAULT '{}'
)
RETURNS JSONB AS $$
DECLARE
    v_balance_record RECORD;
    v_balance_id UUID;
    v_new_balance INTEGER;
    v_source TEXT;
BEGIN
    -- Obtener balance
    IF p_user_id IS NOT NULL THEN
        SELECT * INTO v_balance_record 
        FROM ai_token_balances 
        WHERE user_id = p_user_id
        FOR UPDATE;
    ELSE
        SELECT * INTO v_balance_record 
        FROM ai_token_balances 
        WHERE organization_id = p_org_id
        FOR UPDATE;
    END IF;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'No token balance found');
    END IF;
    
    -- Verificar balance suficiente
    IF v_balance_record.balance_total < p_tokens THEN
        RETURN jsonb_build_object(
            'success', false, 
            'error', 'Insufficient tokens',
            'required', p_tokens,
            'available', v_balance_record.balance_total
        );
    END IF;
    
    -- Consumir en orden: bonus -> subscription -> purchased
    v_balance_id := v_balance_record.id;
    
    -- Deducir tokens
    IF v_balance_record.balance_bonus >= p_tokens THEN
        UPDATE ai_token_balances SET balance_bonus = balance_bonus - p_tokens WHERE id = v_balance_id;
        v_source := 'bonus';
    ELSIF v_balance_record.balance_bonus + v_balance_record.balance_subscription >= p_tokens THEN
        UPDATE ai_token_balances SET 
            balance_bonus = 0,
            balance_subscription = balance_subscription - (p_tokens - balance_bonus)
        WHERE id = v_balance_id;
        v_source := 'subscription';
    ELSE
        UPDATE ai_token_balances SET 
            balance_bonus = 0,
            balance_subscription = 0,
            balance_purchased = balance_purchased - (p_tokens - balance_bonus - balance_subscription)
        WHERE id = v_balance_id;
        v_source := 'purchased';
    END IF;
    
    -- Actualizar total consumido
    UPDATE ai_token_balances SET total_consumed = total_consumed + p_tokens WHERE id = v_balance_id;
    
    -- Obtener nuevo balance
    SELECT balance_total INTO v_new_balance FROM ai_token_balances WHERE id = v_balance_id;
    
    -- Registrar transacción
    INSERT INTO ai_token_transactions (
        balance_id, transaction_type, tokens, balance_after, action_type, action_metadata, executed_by
    ) VALUES (
        v_balance_id, 'consumption', -p_tokens, v_new_balance, p_action_type, p_metadata, p_user_id
    );
    
    RETURN jsonb_build_object(
        'success', true,
        'tokens_consumed', p_tokens,
        'balance_remaining', v_new_balance,
        'source', v_source
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- --------------------------------------
-- 8.4 Función para obtener comisión aplicable
-- --------------------------------------
CREATE OR REPLACE FUNCTION get_applicable_commission(
    p_user_id UUID,
    p_org_id UUID,
    p_project_type financial_project_type
)
RETURNS DECIMAL AS $$
DECLARE
    v_custom_rate DECIMAL;
    v_default_rate DECIMAL;
    v_config JSONB;
    v_type_key TEXT;
BEGIN
    -- Mapear project_type a key de config
    v_type_key := CASE p_project_type
        WHEN 'marketplace_direct' THEN 'marketplace_direct'
        WHEN 'campaign_managed' THEN 'campaign_managed'
        WHEN 'live_shopping' THEN 'live_shopping'
        WHEN 'professional_service' THEN 'professional_service'
        WHEN 'corporate_package' THEN 'corporate_package'
    END;
    
    -- Buscar acuerdo custom
    IF p_org_id IS NOT NULL THEN
        SELECT 
            CASE v_type_key
                WHEN 'marketplace_direct' THEN marketplace_fee_override
                WHEN 'campaign_managed' THEN campaign_fee_override
                WHEN 'live_shopping' THEN live_shopping_fee_override
                WHEN 'professional_service' THEN professional_fee_override
                WHEN 'corporate_package' THEN corporate_fee_override
            END
        INTO v_custom_rate
        FROM custom_pricing_agreements
        WHERE organization_id = p_org_id
          AND is_active = true
          AND valid_from <= CURRENT_DATE
          AND (valid_until IS NULL OR valid_until >= CURRENT_DATE);
    ELSIF p_user_id IS NOT NULL THEN
        SELECT 
            CASE v_type_key
                WHEN 'marketplace_direct' THEN marketplace_fee_override
                WHEN 'campaign_managed' THEN campaign_fee_override
                WHEN 'live_shopping' THEN live_shopping_fee_override
                WHEN 'professional_service' THEN professional_fee_override
                WHEN 'corporate_package' THEN corporate_fee_override
            END
        INTO v_custom_rate
        FROM custom_pricing_agreements
        WHERE user_id = p_user_id
          AND is_active = true
          AND valid_from <= CURRENT_DATE
          AND (valid_until IS NULL OR valid_until >= CURRENT_DATE);
    END IF;
    
    -- Si hay rate custom, usarlo
    IF v_custom_rate IS NOT NULL THEN
        RETURN v_custom_rate;
    END IF;
    
    -- Obtener default de config
    SELECT config_value INTO v_config
    FROM pricing_configuration
    WHERE config_key = 'commission_rates';
    
    v_default_rate := (v_config -> v_type_key ->> 'default')::DECIMAL;
    
    RETURN COALESCE(v_default_rate, 0.25);
END;
$$ LANGUAGE plpgsql STABLE;

-- --------------------------------------
-- 8.5 Función para procesar liberación de escrow
-- --------------------------------------
DROP FUNCTION IF EXISTS release_escrow(UUID, UUID);
DROP FUNCTION IF EXISTS release_escrow(UUID);
CREATE OR REPLACE FUNCTION release_escrow(
    p_escrow_id UUID,
    p_released_by UUID
)
RETURNS JSONB AS $$
DECLARE
    v_escrow RECORD;
    v_distribution JSONB;
    v_wallet_id UUID;
    v_amount DECIMAL;
    v_platform_net DECIMAL;
    v_referral_amount DECIMAL;
    v_referral_rel RECORD;
BEGIN
    -- Obtener escrow con lock
    SELECT * INTO v_escrow FROM escrow_holds WHERE id = p_escrow_id FOR UPDATE;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Escrow not found');
    END IF;
    
    IF v_escrow.status NOT IN ('pending_approval', 'approved') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Escrow not in releasable state');
    END IF;
    
    -- Calcular comisión de referido si aplica
    v_referral_amount := 0;
    IF v_escrow.referral_id IS NOT NULL THEN
        SELECT * INTO v_referral_rel FROM referral_relationships WHERE id = v_escrow.referral_id;
        IF FOUND AND v_referral_rel.status = 'active' THEN
            v_referral_amount := v_escrow.platform_fee_amount * v_referral_rel.transaction_rate / v_escrow.platform_fee_rate;
            
            -- Registrar ganancia de referido
            INSERT INTO referral_earnings (
                relationship_id, referrer_id, referrer_wallet_id,
                source_type, source_id, gross_amount, commission_rate, commission_amount
            ) VALUES (
                v_escrow.referral_id, v_referral_rel.referrer_id, v_referral_rel.referrer_wallet_id,
                'transaction', p_escrow_id, v_escrow.total_amount, v_referral_rel.transaction_rate, v_referral_amount
            );
            
            -- Actualizar totales del referido
            UPDATE referral_relationships 
            SET total_transaction_earned = total_transaction_earned + v_referral_amount
            WHERE id = v_escrow.referral_id;
        END IF;
    END IF;
    
    v_platform_net := v_escrow.platform_fee_amount - v_referral_amount;
    
    -- Procesar cada distribución
    FOR v_distribution IN SELECT * FROM jsonb_array_elements(v_escrow.distributions)
    LOOP
        v_wallet_id := (v_distribution ->> 'wallet_id')::UUID;
        v_amount := (v_distribution ->> 'amount')::DECIMAL;
        
        -- Acreditar al wallet
        UPDATE unified_wallets 
        SET balance_available = balance_available + v_amount,
            total_earned = total_earned + v_amount
        WHERE id = v_wallet_id;
        
        -- Registrar transacción
        INSERT INTO unified_transactions (
            wallet_id, transaction_type, status, amount, escrow_id, description
        ) VALUES (
            v_wallet_id, 'escrow_release', 'completed', v_amount, p_escrow_id,
            'Release from escrow: ' || v_escrow.project_title
        );
    END LOOP;
    
    -- Acreditar comisión de referido
    IF v_referral_amount > 0 AND v_referral_rel.referrer_wallet_id IS NOT NULL THEN
        UPDATE unified_wallets 
        SET balance_available = balance_available + v_referral_amount,
            total_earned = total_earned + v_referral_amount
        WHERE id = v_referral_rel.referrer_wallet_id;
        
        INSERT INTO unified_transactions (
            wallet_id, transaction_type, status, amount, escrow_id, referral_id, description
        ) VALUES (
            v_referral_rel.referrer_wallet_id, 'referral_commission', 'completed', 
            v_referral_amount, p_escrow_id, v_escrow.referral_id,
            'Referral commission from project'
        );
    END IF;
    
    -- Registrar fee de plataforma
    INSERT INTO unified_transactions (
        wallet_id, transaction_type, status, amount, fee, escrow_id, description
    ) VALUES (
        (SELECT id FROM unified_wallets WHERE wallet_type = 'platform' LIMIT 1),
        'platform_fee', 'completed', v_platform_net, v_referral_amount, p_escrow_id,
        'Platform fee from escrow release'
    );
    
    -- Actualizar escrow
    UPDATE escrow_holds SET 
        status = 'released',
        released_at = NOW(),
        referral_fee_amount = v_referral_amount
    WHERE id = p_escrow_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'escrow_id', p_escrow_id,
        'total_released', v_escrow.total_amount - v_escrow.platform_fee_amount,
        'platform_fee', v_platform_net,
        'referral_fee', v_referral_amount
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- --------------------------------------
-- 8.6 Trigger para auto-aprobación de escrow
-- --------------------------------------
CREATE OR REPLACE FUNCTION check_escrow_auto_approve()
RETURNS TRIGGER AS $$
BEGIN
    -- Establecer auto_approve_at a 72 horas después de pending_approval
    IF NEW.status = 'pending_approval' AND OLD.status != 'pending_approval' THEN
        NEW.auto_approve_at := NOW() + INTERVAL '72 hours';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS escrow_auto_approve_trigger ON escrow_holds;
CREATE TRIGGER escrow_auto_approve_trigger
    BEFORE UPDATE ON escrow_holds
    FOR EACH ROW
    EXECUTE FUNCTION check_escrow_auto_approve();

-- --------------------------------------
-- 8.7 Función para verificar estado de referido (perpetuo)
-- --------------------------------------
CREATE OR REPLACE FUNCTION update_referral_activity()
RETURNS TRIGGER AS $$
BEGIN
    -- Actualizar última actividad del usuario en sus relaciones de referido
    UPDATE referral_relationships 
    SET referrer_last_active = NOW()
    WHERE referrer_id = NEW.id;
    
    UPDATE referral_relationships 
    SET referred_last_active = NOW()
    WHERE referred_id = NEW.id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- --------------------------------------
-- 8.8 Helper: get referral stats for a user (used by usePerpetualReferrals hook)
-- --------------------------------------
CREATE OR REPLACE FUNCTION get_perpetual_referral_stats(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'total_referrals', COUNT(*),
    'active_referrals', COUNT(*) FILTER (WHERE status = 'active'),
    'total_subscription_earned', COALESCE(SUM(total_subscription_earned), 0),
    'total_transaction_earned', COALESCE(SUM(total_transaction_earned), 0),
    'total_earned', COALESCE(SUM(total_subscription_earned + total_transaction_earned), 0)
  ) INTO v_result
  FROM referral_relationships
  WHERE referrer_id = p_user_id;

  RETURN COALESCE(v_result, '{"total_referrals":0,"active_referrals":0,"total_subscription_earned":0,"total_transaction_earned":0,"total_earned":0}'::jsonb);
END;
$$;

-- ============================================================================
-- PARTE 9: ROW LEVEL SECURITY
-- ============================================================================

-- Habilitar RLS en todas las tablas
ALTER TABLE unified_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE unified_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE escrow_holds ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE withdrawal_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_token_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_token_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_pricing_agreements ENABLE ROW LEVEL SECURITY;

-- Políticas para wallets
CREATE POLICY wallet_select_own ON unified_wallets
    FOR SELECT USING (
        auth.uid() = user_id OR
        organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid())
    );

CREATE POLICY wallet_update_own ON unified_wallets
    FOR UPDATE USING (auth.uid() = user_id);

-- Políticas para transacciones
CREATE POLICY transactions_select_own ON unified_transactions
    FOR SELECT USING (
        wallet_id IN (
            SELECT id FROM unified_wallets 
            WHERE user_id = auth.uid() OR 
            organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid())
        )
    );

-- Políticas para escrow
CREATE POLICY escrow_select ON escrow_holds
    FOR SELECT USING (
        client_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM jsonb_array_elements(distributions) d
            WHERE (d ->> 'user_id')::UUID = auth.uid()
        )
    );

-- Políticas para suscripciones
CREATE POLICY subscriptions_select_own ON platform_subscriptions
    FOR SELECT USING (
        user_id = auth.uid() OR
        organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid())
    );

-- Políticas para retiros
CREATE POLICY withdrawals_select_own ON withdrawal_requests
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY withdrawals_insert_own ON withdrawal_requests
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- Políticas para referidos
CREATE POLICY referrals_select_own ON referral_relationships
    FOR SELECT USING (referrer_id = auth.uid() OR referred_id = auth.uid());

CREATE POLICY referral_codes_select_own ON referral_codes
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY referral_codes_manage_own ON referral_codes
    FOR ALL USING (user_id = auth.uid());

CREATE POLICY referral_earnings_select_own ON referral_earnings
    FOR SELECT USING (referrer_id = auth.uid());

-- Políticas para tokens
CREATE POLICY tokens_select_own ON ai_token_balances
    FOR SELECT USING (
        user_id = auth.uid() OR
        organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid())
    );

CREATE POLICY token_tx_select_own ON ai_token_transactions
    FOR SELECT USING (
        balance_id IN (
            SELECT id FROM ai_token_balances 
            WHERE user_id = auth.uid() OR 
            organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid())
        )
    );

-- ============================================================================
-- PARTE 10: CREAR WALLET DE PLATAFORMA
-- ============================================================================

INSERT INTO unified_wallets (wallet_type, balance_available)
VALUES ('platform', 0)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- FIN DE MIGRACIÓN
-- ============================================================================

COMMENT ON TABLE unified_wallets IS 'Wallets unificados para usuarios y organizaciones';
COMMENT ON TABLE unified_transactions IS 'Log único de todas las transacciones financieras';
COMMENT ON TABLE escrow_holds IS 'Sistema de escrow para proyectos y campañas';
COMMENT ON TABLE platform_subscriptions IS 'Suscripciones de plataforma con Stripe';
COMMENT ON TABLE referral_relationships IS 'Relaciones de referidos perpetuas';
COMMENT ON TABLE referral_earnings IS 'Ganancias por referidos';
COMMENT ON TABLE ai_token_balances IS 'Balance de tokens de IA por usuario/org';
COMMENT ON TABLE pricing_configuration IS 'Configuración de precios editable';
