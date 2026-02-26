-- ============================================================================
-- COMISIÓN DE SUSCRIPCIONES PARA DUEÑOS DE COMUNIDADES
-- El dueño recibe 20% de las suscripciones de miembros (igual que referidos)
-- ============================================================================

-- Agregar campo para tasa de comisión de suscripciones
ALTER TABLE partner_communities
ADD COLUMN IF NOT EXISTS owner_subscription_rate NUMERIC(5,4) DEFAULT 0.20;  -- 20% por defecto

-- Actualizar Mastershop con las tasas correctas (iguales a referidos)
UPDATE partner_communities
SET
    owner_commission_rate = 0.05,      -- 5% de transacciones
    owner_subscription_rate = 0.20     -- 20% de suscripciones
WHERE slug = 'mastershop';

-- ============================================================================
-- FUNCIÓN: Registrar ganancia de suscripción para dueño de comunidad
-- ============================================================================

CREATE OR REPLACE FUNCTION register_community_subscription_earning(
    p_user_id UUID,
    p_subscription_amount NUMERIC,
    p_subscription_id UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_membership RECORD;
    v_earnings_amount NUMERIC;
    v_earning_id UUID;
BEGIN
    -- Buscar membresía activa del usuario con dueño configurado
    SELECT pcm.*, pc.owner_user_id, pc.owner_subscription_rate, pc.owner_wallet_id, pc.name as community_name
    INTO v_membership
    FROM partner_community_memberships pcm
    JOIN partner_communities pc ON pc.id = pcm.community_id
    WHERE pcm.user_id = p_user_id
      AND pcm.status = 'active'
      AND pc.owner_user_id IS NOT NULL
      AND pc.owner_subscription_rate > 0
    LIMIT 1;

    -- Si no hay membresía con dueño configurado, salir
    IF NOT FOUND THEN
        RETURN NULL;
    END IF;

    -- Calcular ganancia (20% de la suscripción)
    v_earnings_amount := p_subscription_amount * v_membership.owner_subscription_rate;

    -- Registrar ganancia
    INSERT INTO partner_community_earnings (
        community_id,
        membership_id,
        owner_user_id,
        transaction_amount,
        commission_rate,
        earnings_amount,
        status,
        description,
        metadata
    ) VALUES (
        v_membership.community_id,
        v_membership.id,
        v_membership.owner_user_id,
        p_subscription_amount,
        v_membership.owner_subscription_rate,
        v_earnings_amount,
        'pending',
        'Comisión de suscripción - Comunidad ' || v_membership.community_name,
        jsonb_build_object('type', 'subscription', 'subscription_id', p_subscription_id)
    )
    RETURNING id INTO v_earning_id;

    -- Si el dueño tiene wallet, acreditar directamente
    IF v_membership.owner_wallet_id IS NOT NULL THEN
        -- Crear transacción de ingreso para el dueño
        INSERT INTO unified_transactions (
            wallet_id,
            transaction_type,
            status,
            amount,
            description,
            metadata,
            processed_at
        ) VALUES (
            v_membership.owner_wallet_id,
            'community_commission',
            'completed',
            v_earnings_amount,
            'Comisión de suscripción - Comunidad ' || v_membership.community_name,
            jsonb_build_object(
                'earning_id', v_earning_id,
                'community_id', v_membership.community_id,
                'member_user_id', p_user_id,
                'type', 'subscription'
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
-- TRIGGER: Registrar ganancia cuando se crea/actualiza una suscripción
-- ============================================================================

CREATE OR REPLACE FUNCTION trigger_community_earning_on_subscription()
RETURNS TRIGGER AS $$
BEGIN
    -- Solo actuar cuando la suscripción se activa
    IF NEW.status = 'active' AND (OLD IS NULL OR OLD.status != 'active') THEN
        -- Registrar ganancia del dueño de la comunidad
        PERFORM register_community_subscription_earning(
            NEW.user_id,
            NEW.current_price,
            NEW.id
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_community_earning_on_subscription ON platform_subscriptions;
CREATE TRIGGER trg_community_earning_on_subscription
    AFTER INSERT OR UPDATE ON platform_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION trigger_community_earning_on_subscription();

-- Notificar a PostgREST
NOTIFY pgrst, 'reload schema';
