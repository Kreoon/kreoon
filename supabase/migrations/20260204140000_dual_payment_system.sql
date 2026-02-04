-- =====================================================
-- KREOON WALLET - DUAL PAYMENT SYSTEM
-- Phase 4.5: Organization Flow + Marketplace Flow
-- =====================================================

-- =====================================================
-- FLUJO ORGANIZACIÓN: Pagos internos de agencias
-- =====================================================

-- Métodos de cobro de la organización (para cobrar a sus clientes)
CREATE TABLE IF NOT EXISTS organization_payment_gateways (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Tipo de pasarela
    provider VARCHAR(50) NOT NULL CHECK (provider IN (
        'stripe', 'mercadopago', 'paypal', 'payu', 'wompi', 'bold', 'manual'
    )),

    -- Credenciales (encriptadas)
    credentials JSONB NOT NULL DEFAULT '{}',

    -- Configuración
    is_active BOOLEAN DEFAULT true,
    is_default BOOLEAN DEFAULT false,
    supported_currencies TEXT[] DEFAULT ARRAY['USD'],

    -- Webhooks
    webhook_url TEXT,
    webhook_secret TEXT,

    -- Metadata
    display_name VARCHAR(100),
    description TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(organization_id, provider)
);

CREATE INDEX idx_org_payment_gateways_org ON organization_payment_gateways(organization_id);

-- Métodos de pago de la organización (para pagar a su equipo)
CREATE TABLE IF NOT EXISTS organization_payout_methods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Tipo de método
    method_type VARCHAR(50) NOT NULL CHECK (method_type IN (
        'payoneer', 'wise', 'paypal', 'bank_transfer', 'nequi', 'daviplata', 'cash', 'manual'
    )),

    -- Credenciales (si aplica)
    credentials JSONB DEFAULT '{}',

    -- Configuración
    is_active BOOLEAN DEFAULT true,
    supported_currencies TEXT[] DEFAULT ARRAY['USD', 'COP'],

    -- Para transferencias bancarias
    bank_info JSONB DEFAULT '{}',

    -- Metadata
    display_name VARCHAR(100),
    notes TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_org_payout_methods_org ON organization_payout_methods(organization_id);

-- Configuración general de pagos de la organización
CREATE TABLE IF NOT EXISTS organization_payment_settings (
    organization_id UUID PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,

    -- ¿Cómo maneja los pagos esta org?
    client_payment_mode VARCHAR(20) DEFAULT 'external' CHECK (client_payment_mode IN (
        'external',    -- La org cobra directamente a sus clientes (fuera de Kreoon)
        'kreoon',      -- La org usa el sistema de Kreoon para cobrar
        'hybrid'       -- Puede usar ambos según el proyecto
    )),

    team_payment_mode VARCHAR(20) DEFAULT 'external' CHECK (team_payment_mode IN (
        'external',    -- La org paga directamente a su equipo (fuera de Kreoon)
        'kreoon',      -- La org usa wallets de Kreoon para pagar
        'hybrid'       -- Puede usar ambos
    )),

    -- Moneda principal de la organización
    default_currency VARCHAR(3) DEFAULT 'USD',

    -- ¿Mostrar precios a clientes en qué moneda?
    display_currency VARCHAR(3) DEFAULT 'USD',

    -- Comisiones internas (cuánto se queda la org vs creador)
    default_creator_percentage DECIMAL(5,2) DEFAULT 70.00,
    default_editor_percentage DECIMAL(5,2) DEFAULT 15.00,
    default_org_percentage DECIMAL(5,2) DEFAULT 15.00,

    -- Términos de pago
    payment_terms_days INT DEFAULT 15,

    -- Notas/instrucciones para clientes
    payment_instructions TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pagos de clientes a organizaciones
CREATE TABLE IF NOT EXISTS organization_client_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id),

    -- Cliente que paga
    client_id UUID REFERENCES auth.users(id),
    client_organization_id UUID REFERENCES organizations(id),
    client_name VARCHAR(255),
    client_email VARCHAR(255),

    -- Campaña/Proyecto asociado
    campaign_id UUID REFERENCES campaigns(id),
    project_reference VARCHAR(255),

    -- Montos
    amount DECIMAL(12,2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',

    -- Método de pago usado
    payment_gateway_id UUID REFERENCES organization_payment_gateways(id),
    payment_method VARCHAR(50),

    -- Referencias externas
    external_payment_id VARCHAR(255),
    external_status VARCHAR(50),

    -- Estado interno
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN (
        'pending', 'processing', 'completed', 'failed', 'refunded', 'cancelled'
    )),

    -- Comprobantes
    receipt_url TEXT,
    invoice_url TEXT,
    proof_of_payment TEXT,

    -- Notas
    notes TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    paid_at TIMESTAMPTZ,

    -- Para pagos manuales
    confirmed_by UUID REFERENCES auth.users(id),
    confirmed_at TIMESTAMPTZ
);

CREATE INDEX idx_org_client_payments_org ON organization_client_payments(organization_id);
CREATE INDEX idx_org_client_payments_campaign ON organization_client_payments(campaign_id);
CREATE INDEX idx_org_client_payments_status ON organization_client_payments(status);

-- Pagos de organizaciones a su equipo
CREATE TABLE IF NOT EXISTS organization_team_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id),

    -- A quién se paga
    recipient_user_id UUID REFERENCES auth.users(id),
    recipient_name VARCHAR(255),
    recipient_role VARCHAR(50),

    -- Campaña/Proyecto/Entregable asociado
    campaign_id UUID REFERENCES campaigns(id),
    deliverable_reference VARCHAR(255),

    -- Montos
    amount DECIMAL(12,2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',

    -- Método de pago usado
    payout_method_id UUID REFERENCES organization_payout_methods(id),

    -- Referencias externas
    external_payment_id VARCHAR(255),
    external_status VARCHAR(50),

    -- Estado
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN (
        'pending', 'approved', 'processing', 'completed', 'failed', 'cancelled'
    )),

    -- Comprobantes
    proof_of_payment TEXT,

    -- Aprobaciones
    requested_by UUID REFERENCES auth.users(id),
    approved_by UUID REFERENCES auth.users(id),
    approved_at TIMESTAMPTZ,

    -- Notas
    notes TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    paid_at TIMESTAMPTZ
);

CREATE INDEX idx_org_team_payments_org ON organization_team_payments(organization_id);
CREATE INDEX idx_org_team_payments_recipient ON organization_team_payments(recipient_user_id);
CREATE INDEX idx_org_team_payments_status ON organization_team_payments(status);

-- =====================================================
-- FLUJO MARKETPLACE: Contratación directa
-- =====================================================

-- Contratos directos usuario ↔ creador/editor
CREATE TABLE IF NOT EXISTS marketplace_contracts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Partes del contrato
    client_user_id UUID NOT NULL REFERENCES auth.users(id),
    provider_user_id UUID NOT NULL REFERENCES auth.users(id),
    provider_type VARCHAR(20) NOT NULL CHECK (provider_type IN ('creator', 'editor')),

    -- Detalles del trabajo
    title VARCHAR(255) NOT NULL,
    description TEXT,
    deliverables JSONB DEFAULT '[]',

    -- Montos
    total_amount DECIMAL(12,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',

    -- Fee de Kreoon
    platform_fee_percentage DECIMAL(5,2) DEFAULT 10.00,
    platform_fee_amount DECIMAL(12,2),

    -- Monto neto para el proveedor
    provider_amount DECIMAL(12,2),

    -- Estado del contrato
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN (
        'draft',
        'pending_payment',
        'active',
        'delivered',
        'revision',
        'completed',
        'disputed',
        'cancelled',
        'refunded'
    )),

    -- Escrow
    escrow_id UUID REFERENCES escrow_holds(id),

    -- Fechas
    deadline TIMESTAMPTZ,
    max_revisions INT DEFAULT 2,
    revisions_used INT DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    paid_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,

    -- Calificaciones mutuas
    client_rating INT CHECK (client_rating BETWEEN 1 AND 5),
    client_review TEXT,
    provider_rating INT CHECK (provider_rating BETWEEN 1 AND 5),
    provider_review TEXT,

    CONSTRAINT different_parties CHECK (client_user_id != provider_user_id)
);

CREATE INDEX idx_marketplace_contracts_client ON marketplace_contracts(client_user_id);
CREATE INDEX idx_marketplace_contracts_provider ON marketplace_contracts(provider_user_id);
CREATE INDEX idx_marketplace_contracts_status ON marketplace_contracts(status);

-- Mensajes del contrato
CREATE TABLE IF NOT EXISTS marketplace_contract_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contract_id UUID NOT NULL REFERENCES marketplace_contracts(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES auth.users(id),
    message TEXT NOT NULL,
    attachments JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_contract_messages_contract ON marketplace_contract_messages(contract_id);

-- Entregables del contrato
CREATE TABLE IF NOT EXISTS marketplace_contract_deliverables (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contract_id UUID NOT NULL REFERENCES marketplace_contracts(id) ON DELETE CASCADE,

    title VARCHAR(255) NOT NULL,
    description TEXT,

    -- Archivos entregados
    files JSONB DEFAULT '[]',

    -- Estado
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN (
        'pending', 'delivered', 'approved', 'rejected'
    )),

    delivered_at TIMESTAMPTZ,
    reviewed_at TIMESTAMPTZ,
    feedback TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_contract_deliverables_contract ON marketplace_contract_deliverables(contract_id);

-- =====================================================
-- RLS POLICIES
-- =====================================================

ALTER TABLE organization_payment_gateways ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_payout_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_payment_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_client_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_team_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_contract_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_contract_deliverables ENABLE ROW LEVEL SECURITY;

-- Organization payment gateways: solo admins de la org
CREATE POLICY "Org admins can manage payment gateways"
ON organization_payment_gateways FOR ALL
TO authenticated
USING (
    organization_id IN (
        SELECT organization_id FROM organization_members
        WHERE user_id = auth.uid()
        AND role IN ('admin', 'team_leader')
    )
);

-- Organization payout methods: solo admins
CREATE POLICY "Org admins can manage payout methods"
ON organization_payout_methods FOR ALL
TO authenticated
USING (
    organization_id IN (
        SELECT organization_id FROM organization_members
        WHERE user_id = auth.uid()
        AND role IN ('admin', 'team_leader')
    )
);

-- Organization payment settings: solo admins
CREATE POLICY "Org admins can manage payment settings"
ON organization_payment_settings FOR ALL
TO authenticated
USING (
    organization_id IN (
        SELECT organization_id FROM organization_members
        WHERE user_id = auth.uid()
        AND role = 'admin'
    )
);

-- Client payments: miembros de la org pueden ver, admins pueden gestionar
CREATE POLICY "Org members can view client payments"
ON organization_client_payments FOR SELECT
TO authenticated
USING (
    organization_id IN (
        SELECT organization_id FROM organization_members
        WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Org admins can manage client payments"
ON organization_client_payments FOR ALL
TO authenticated
USING (
    organization_id IN (
        SELECT organization_id FROM organization_members
        WHERE user_id = auth.uid()
        AND role IN ('admin', 'team_leader')
    )
);

-- Team payments: miembros pueden ver los suyos, admins pueden ver todos
CREATE POLICY "Users can view their team payments"
ON organization_team_payments FOR SELECT
TO authenticated
USING (
    recipient_user_id = auth.uid()
    OR organization_id IN (
        SELECT organization_id FROM organization_members
        WHERE user_id = auth.uid()
        AND role IN ('admin', 'team_leader')
    )
);

CREATE POLICY "Org admins can manage team payments"
ON organization_team_payments FOR ALL
TO authenticated
USING (
    organization_id IN (
        SELECT organization_id FROM organization_members
        WHERE user_id = auth.uid()
        AND role IN ('admin', 'team_leader')
    )
);

-- Marketplace contracts: partes del contrato pueden ver y gestionar
CREATE POLICY "Contract parties can view contracts"
ON marketplace_contracts FOR SELECT
TO authenticated
USING (
    client_user_id = auth.uid()
    OR provider_user_id = auth.uid()
);

CREATE POLICY "Client can create contracts"
ON marketplace_contracts FOR INSERT
TO authenticated
WITH CHECK (client_user_id = auth.uid());

CREATE POLICY "Contract parties can update contracts"
ON marketplace_contracts FOR UPDATE
TO authenticated
USING (
    client_user_id = auth.uid()
    OR provider_user_id = auth.uid()
);

-- Contract messages: partes pueden ver y enviar
CREATE POLICY "Contract parties can access messages"
ON marketplace_contract_messages FOR ALL
TO authenticated
USING (
    contract_id IN (
        SELECT id FROM marketplace_contracts
        WHERE client_user_id = auth.uid()
        OR provider_user_id = auth.uid()
    )
);

-- Contract deliverables: partes pueden gestionar
CREATE POLICY "Contract parties can access deliverables"
ON marketplace_contract_deliverables FOR ALL
TO authenticated
USING (
    contract_id IN (
        SELECT id FROM marketplace_contracts
        WHERE client_user_id = auth.uid()
        OR provider_user_id = auth.uid()
    )
);

-- =====================================================
-- FUNCIONES HELPER
-- =====================================================

-- Función para calcular el fee de Kreoon en marketplace
CREATE OR REPLACE FUNCTION calculate_marketplace_fee(
    p_amount DECIMAL(12,2),
    p_fee_percentage DECIMAL(5,2) DEFAULT 10.00
) RETURNS TABLE (
    total_amount DECIMAL(12,2),
    platform_fee DECIMAL(12,2),
    provider_amount DECIMAL(12,2)
) AS $$
BEGIN
    RETURN QUERY SELECT
        p_amount as total_amount,
        ROUND(p_amount * (p_fee_percentage / 100), 2) as platform_fee,
        ROUND(p_amount - (p_amount * (p_fee_percentage / 100)), 2) as provider_amount;
END;
$$ LANGUAGE plpgsql;

-- Función para obtener estadísticas de pagos de org
CREATE OR REPLACE FUNCTION get_organization_payment_stats(
    p_organization_id UUID,
    p_period VARCHAR(10) DEFAULT 'month'
) RETURNS TABLE (
    total_received DECIMAL(12,2),
    total_paid DECIMAL(12,2),
    pending_payments INT,
    completed_payments INT
) AS $$
DECLARE
    v_start_date TIMESTAMPTZ;
BEGIN
    -- Calcular fecha de inicio según período
    CASE p_period
        WHEN 'week' THEN v_start_date := NOW() - INTERVAL '7 days';
        WHEN 'month' THEN v_start_date := NOW() - INTERVAL '30 days';
        WHEN 'year' THEN v_start_date := NOW() - INTERVAL '365 days';
        ELSE v_start_date := NOW() - INTERVAL '30 days';
    END CASE;

    RETURN QUERY
    SELECT
        COALESCE((
            SELECT SUM(amount) FROM organization_client_payments
            WHERE organization_id = p_organization_id
            AND status = 'completed'
            AND paid_at >= v_start_date
        ), 0) as total_received,
        COALESCE((
            SELECT SUM(amount) FROM organization_team_payments
            WHERE organization_id = p_organization_id
            AND status = 'completed'
            AND paid_at >= v_start_date
        ), 0) as total_paid,
        (
            SELECT COUNT(*)::INT FROM organization_team_payments
            WHERE organization_id = p_organization_id
            AND status = 'pending'
        ) as pending_payments,
        (
            SELECT COUNT(*)::INT FROM organization_team_payments
            WHERE organization_id = p_organization_id
            AND status = 'completed'
            AND paid_at >= v_start_date
        ) as completed_payments;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- GRANTS
-- =====================================================

GRANT ALL ON organization_payment_gateways TO authenticated;
GRANT ALL ON organization_payout_methods TO authenticated;
GRANT ALL ON organization_payment_settings TO authenticated;
GRANT ALL ON organization_client_payments TO authenticated;
GRANT ALL ON organization_team_payments TO authenticated;
GRANT ALL ON marketplace_contracts TO authenticated;
GRANT ALL ON marketplace_contract_messages TO authenticated;
GRANT ALL ON marketplace_contract_deliverables TO authenticated;
