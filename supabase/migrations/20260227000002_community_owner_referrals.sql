-- ============================================================================
-- SISTEMA DE COMISIONES PARA DUEÑOS DE COMUNIDADES
-- El dueño de una comunidad recibe comisión de las transacciones de sus miembros
-- ============================================================================

-- Agregar tipo de transacción para comisiones de comunidad
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum
        WHERE enumtypid = 'transaction_type'::regtype
        AND enumlabel = 'community_commission'
    ) THEN
        ALTER TYPE transaction_type ADD VALUE IF NOT EXISTS 'community_commission';
    END IF;
EXCEPTION WHEN undefined_object THEN
    -- El enum no existe, ignorar
    NULL;
END $$;

-- Agregar campos para el dueño de la comunidad
ALTER TABLE partner_communities
ADD COLUMN IF NOT EXISTS owner_user_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS owner_commission_rate NUMERIC(5,4) DEFAULT 0.05,  -- 5% por defecto
ADD COLUMN IF NOT EXISTS owner_wallet_id UUID REFERENCES unified_wallets(id);

-- Agregar campo para trackear earnings de comunidad en membresías
ALTER TABLE partner_community_memberships
ADD COLUMN IF NOT EXISTS total_transactions NUMERIC(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_owner_earnings NUMERIC(12,2) DEFAULT 0;

-- Tabla para registrar las ganancias del dueño de la comunidad
CREATE TABLE IF NOT EXISTS partner_community_earnings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    community_id UUID NOT NULL REFERENCES partner_communities(id) ON DELETE CASCADE,
    membership_id UUID REFERENCES partner_community_memberships(id),
    owner_user_id UUID NOT NULL REFERENCES auth.users(id),

    -- Transacción relacionada
    escrow_id UUID REFERENCES escrow_holds(id),
    transaction_id UUID REFERENCES unified_transactions(id),

    -- Montos
    transaction_amount NUMERIC(12,2) NOT NULL,
    commission_rate NUMERIC(5,4) NOT NULL,
    earnings_amount NUMERIC(12,2) NOT NULL,

    -- Estado
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled')),
    paid_at TIMESTAMPTZ,

    -- Metadata
    description TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_community_earnings_owner ON partner_community_earnings(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_community_earnings_community ON partner_community_earnings(community_id);
CREATE INDEX IF NOT EXISTS idx_community_earnings_status ON partner_community_earnings(status);
CREATE INDEX IF NOT EXISTS idx_partner_communities_owner ON partner_communities(owner_user_id);

-- RLS
ALTER TABLE partner_community_earnings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners can read their earnings" ON partner_community_earnings;
CREATE POLICY "Owners can read their earnings" ON partner_community_earnings
    FOR SELECT
    TO authenticated
    USING (owner_user_id = auth.uid());

DROP POLICY IF EXISTS "Service role can manage earnings" ON partner_community_earnings;
CREATE POLICY "Service role can manage earnings" ON partner_community_earnings
    FOR ALL
    TO service_role
    USING (true);

-- GRANT
GRANT SELECT ON partner_community_earnings TO authenticated;
GRANT ALL ON partner_community_earnings TO service_role;

-- ============================================================================
-- FUNCIÓN: Registrar ganancia de comunidad cuando se libera un escrow
-- ============================================================================

CREATE OR REPLACE FUNCTION register_community_owner_earning(
    p_escrow_id UUID,
    p_member_user_id UUID,
    p_transaction_amount NUMERIC
) RETURNS UUID AS $$
DECLARE
    v_membership RECORD;
    v_community RECORD;
    v_earnings_amount NUMERIC;
    v_earning_id UUID;
BEGIN
    -- Buscar membresía activa del usuario
    SELECT pcm.*, pc.owner_user_id, pc.owner_commission_rate, pc.owner_wallet_id, pc.name as community_name
    INTO v_membership
    FROM partner_community_memberships pcm
    JOIN partner_communities pc ON pc.id = pcm.community_id
    WHERE pcm.user_id = p_member_user_id
      AND pcm.status = 'active'
      AND pc.owner_user_id IS NOT NULL
      AND pc.owner_commission_rate > 0
    LIMIT 1;

    -- Si no hay membresía con dueño configurado, salir
    IF NOT FOUND THEN
        RETURN NULL;
    END IF;

    -- Calcular ganancia
    v_earnings_amount := p_transaction_amount * v_membership.owner_commission_rate;

    -- Registrar ganancia
    INSERT INTO partner_community_earnings (
        community_id,
        membership_id,
        owner_user_id,
        escrow_id,
        transaction_amount,
        commission_rate,
        earnings_amount,
        status,
        description
    ) VALUES (
        v_membership.community_id,
        v_membership.id,
        v_membership.owner_user_id,
        p_escrow_id,
        p_transaction_amount,
        v_membership.owner_commission_rate,
        v_earnings_amount,
        'pending',
        'Comisión de comunidad ' || v_membership.community_name
    )
    RETURNING id INTO v_earning_id;

    -- Actualizar totales en membresía
    UPDATE partner_community_memberships
    SET
        total_transactions = COALESCE(total_transactions, 0) + p_transaction_amount,
        total_owner_earnings = COALESCE(total_owner_earnings, 0) + v_earnings_amount
    WHERE id = v_membership.id;

    -- Si el dueño tiene wallet, acreditar directamente
    IF v_membership.owner_wallet_id IS NOT NULL THEN
        -- Crear transacción de ingreso para el dueño
        INSERT INTO unified_transactions (
            wallet_id,
            transaction_type,
            status,
            amount,
            escrow_id,
            description,
            metadata,
            processed_at
        ) VALUES (
            v_membership.owner_wallet_id,
            'community_commission',
            'completed',
            v_earnings_amount,
            p_escrow_id,
            'Comisión de comunidad ' || v_membership.community_name,
            jsonb_build_object(
                'earning_id', v_earning_id,
                'community_id', v_membership.community_id,
                'member_user_id', p_member_user_id
            ),
            NOW()
        );

        -- Actualizar balance del wallet del dueño
        UPDATE unified_wallets
        SET
            available_balance = COALESCE(available_balance, 0) + v_earnings_amount,
            total_earned = COALESCE(total_earned, 0) + v_earnings_amount,
            updated_at = NOW()
        WHERE id = v_membership.owner_wallet_id;

        -- Marcar ganancia como pagada
        UPDATE partner_community_earnings
        SET status = 'paid', paid_at = NOW()
        WHERE id = v_earning_id;
    END IF;

    RETURN v_earning_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- TRIGGER: Registrar ganancia cuando se libera un escrow
-- ============================================================================

CREATE OR REPLACE FUNCTION trigger_community_earning_on_escrow_release()
RETURNS TRIGGER AS $$
BEGIN
    -- Solo actuar cuando el escrow pasa a estado 'released'
    IF NEW.status = 'released' AND (OLD.status IS NULL OR OLD.status != 'released') THEN
        -- Registrar ganancia del dueño de la comunidad si el cliente es miembro
        PERFORM register_community_owner_earning(
            NEW.id,
            NEW.client_id,
            NEW.total_amount
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_community_earning_on_escrow ON escrow_holds;
CREATE TRIGGER trg_community_earning_on_escrow
    AFTER UPDATE ON escrow_holds
    FOR EACH ROW
    EXECUTE FUNCTION trigger_community_earning_on_escrow_release();

-- Notificar a PostgREST
NOTIFY pgrst, 'reload schema';
