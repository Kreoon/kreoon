-- =====================================================
-- KREOON FINANCE MODULE - FUNCTIONS
-- Migration: 20260216960000_create_finance_functions
-- Functions: get_platform_finance_stats,
--            get_org_finance_stats,
--            get_creator_finance_stats,
--            request_creator_payout,
--            get_revenue_by_month
-- =====================================================

-- =====================================================
-- 1. get_platform_finance_stats
-- =====================================================

CREATE OR REPLACE FUNCTION get_platform_finance_stats(p_days INTEGER DEFAULT 30)
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result JSON;
    start_date TIMESTAMPTZ := NOW() - (p_days || ' days')::INTERVAL;
    prev_start_date TIMESTAMPTZ := NOW() - (p_days * 2 || ' days')::INTERVAL;
BEGIN
    SELECT json_build_object(
        -- MRR (Monthly Recurring Revenue)
        'mrr', COALESCE((
            SELECT SUM(amount_monthly)
            FROM platform_subscriptions
            WHERE status = 'active'
        ), 0),

        -- ARR (Annual Recurring Revenue)
        'arr', COALESCE((
            SELECT SUM(amount_monthly) * 12
            FROM platform_subscriptions
            WHERE status = 'active'
        ), 0),

        -- Ingresos del período
        'revenue_period', COALESCE((
            SELECT SUM(amount)
            FROM platform_transactions
            WHERE transaction_type IN ('subscription_payment', 'campaign_payment', 'platform_fee')
            AND status = 'completed'
            AND created_at >= start_date
        ), 0),

        -- Ingresos período anterior (para comparar)
        'revenue_previous', COALESCE((
            SELECT SUM(amount)
            FROM platform_transactions
            WHERE transaction_type IN ('subscription_payment', 'campaign_payment', 'platform_fee')
            AND status = 'completed'
            AND created_at >= prev_start_date
            AND created_at < start_date
        ), 0),

        -- Pagos a creadores del período
        'payouts_period', COALESCE((
            SELECT SUM(net_amount)
            FROM platform_payouts
            WHERE status = 'completed'
            AND completed_at >= start_date
        ), 0),

        -- Pagos pendientes a creadores
        'payouts_pending', COALESCE((
            SELECT SUM(net_amount)
            FROM platform_payouts
            WHERE status IN ('pending', 'approved', 'processing')
        ), 0),

        -- Facturas por cobrar
        'invoices_pending_amount', COALESCE((
            SELECT SUM(total)
            FROM platform_invoices
            WHERE status IN ('sent', 'overdue')
        ), 0),

        'invoices_pending_count', (
            SELECT COUNT(*)
            FROM platform_invoices
            WHERE status IN ('sent', 'overdue')
        ),

        -- Facturas vencidas
        'invoices_overdue_amount', COALESCE((
            SELECT SUM(total)
            FROM platform_invoices
            WHERE status = 'overdue'
        ), 0),

        'invoices_overdue_count', (
            SELECT COUNT(*)
            FROM platform_invoices
            WHERE status = 'overdue'
        ),

        -- Suscripciones por plan
        'subscriptions_by_plan', (
            SELECT COALESCE(json_agg(json_build_object('plan', plan, 'count', count, 'mrr', mrr)), '[]'::json)
            FROM (
                SELECT plan, COUNT(*) as count, SUM(amount_monthly) as mrr
                FROM platform_subscriptions
                WHERE status = 'active'
                GROUP BY plan
            ) s
        ),

        -- Transacciones del período
        'transactions_count', (
            SELECT COUNT(*)
            FROM platform_transactions
            WHERE created_at >= start_date
        ),

        -- Comisiones ganadas
        'fees_earned', COALESCE((
            SELECT SUM(fee_amount)
            FROM platform_transactions
            WHERE status = 'completed'
            AND created_at >= start_date
        ), 0)
    ) INTO result;

    RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_platform_finance_stats(INTEGER) TO authenticated;

-- =====================================================
-- 2. get_org_finance_stats
-- =====================================================

CREATE OR REPLACE FUNCTION get_org_finance_stats(p_org_id UUID, p_days INTEGER DEFAULT 30)
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result JSON;
    start_date TIMESTAMPTZ := NOW() - (p_days || ' days')::INTERVAL;
BEGIN
    SELECT json_build_object(
        -- Total gastado histórico
        'total_spent', COALESCE((
            SELECT SUM(amount)
            FROM platform_transactions
            WHERE organization_id = p_org_id
            AND transaction_type IN ('campaign_payment', 'subscription_payment')
            AND status = 'completed'
        ), 0),

        -- Gastado en el período
        'spent_period', COALESCE((
            SELECT SUM(amount)
            FROM platform_transactions
            WHERE organization_id = p_org_id
            AND transaction_type IN ('campaign_payment', 'subscription_payment')
            AND status = 'completed'
            AND created_at >= start_date
        ), 0),

        -- Pagado a creadores histórico
        'total_paid_creators', COALESCE((
            SELECT SUM(total_paid)
            FROM org_creator_relationships
            WHERE organization_id = p_org_id
        ), 0),

        -- Suscripción actual
        'subscription', (
            SELECT json_build_object(
                'plan', plan,
                'status', status,
                'amount_monthly', amount_monthly,
                'current_period_end', current_period_end,
                'days_until_renewal', EXTRACT(DAY FROM current_period_end - NOW())
            )
            FROM platform_subscriptions
            WHERE organization_id = p_org_id
            LIMIT 1
        ),

        -- Facturas pendientes
        'invoices_pending', COALESCE((
            SELECT SUM(total)
            FROM platform_invoices
            WHERE organization_id = p_org_id
            AND status IN ('sent', 'overdue')
        ), 0),

        'invoices_pending_count', (
            SELECT COUNT(*)
            FROM platform_invoices
            WHERE organization_id = p_org_id
            AND status IN ('sent', 'overdue')
        ),

        -- Última factura pagada
        'last_payment', (
            SELECT json_build_object(
                'amount', total,
                'paid_at', paid_at
            )
            FROM platform_invoices
            WHERE organization_id = p_org_id
            AND status = 'paid'
            ORDER BY paid_at DESC
            LIMIT 1
        ),

        -- Transacciones recientes count
        'transactions_count_period', (
            SELECT COUNT(*)
            FROM platform_transactions
            WHERE organization_id = p_org_id
            AND created_at >= start_date
        ),

        -- Campañas pagadas
        'campaigns_paid_count', (
            SELECT COUNT(DISTINCT campaign_id)
            FROM platform_transactions
            WHERE organization_id = p_org_id
            AND transaction_type = 'campaign_payment'
            AND status = 'completed'
        )
    ) INTO result;

    RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_org_finance_stats(UUID, INTEGER) TO authenticated;

-- =====================================================
-- 3. get_creator_finance_stats
-- =====================================================

CREATE OR REPLACE FUNCTION get_creator_finance_stats(p_creator_id UUID)
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        -- Wallet info
        'wallet', (
            SELECT json_build_object(
                'available_balance', available_balance,
                'pending_balance', pending_balance,
                'total_earned', total_earned,
                'total_withdrawn', total_withdrawn,
                'minimum_payout', minimum_payout,
                'payment_info_verified', payment_info_verified
            )
            FROM creator_wallets
            WHERE creator_id = p_creator_id
        ),

        -- Ganancias este mes
        'earnings_this_month', COALESCE((
            SELECT SUM(amount)
            FROM creator_wallet_transactions
            WHERE creator_id = p_creator_id
            AND transaction_type IN ('earning', 'bonus', 'referral_bonus')
            AND created_at >= DATE_TRUNC('month', NOW())
        ), 0),

        -- Ganancias mes pasado
        'earnings_last_month', COALESCE((
            SELECT SUM(amount)
            FROM creator_wallet_transactions
            WHERE creator_id = p_creator_id
            AND transaction_type IN ('earning', 'bonus', 'referral_bonus')
            AND created_at >= DATE_TRUNC('month', NOW() - INTERVAL '1 month')
            AND created_at < DATE_TRUNC('month', NOW())
        ), 0),

        -- Payouts completados
        'total_payouts', (
            SELECT COUNT(*)
            FROM platform_payouts
            WHERE creator_id = p_creator_id
            AND status = 'completed'
        ),

        -- Último payout
        'last_payout', (
            SELECT json_build_object(
                'amount', net_amount,
                'completed_at', completed_at,
                'payment_method', payment_method
            )
            FROM platform_payouts
            WHERE creator_id = p_creator_id
            AND status = 'completed'
            ORDER BY completed_at DESC
            LIMIT 1
        ),

        -- Payout pendiente
        'pending_payout', (
            SELECT json_build_object(
                'id', id,
                'amount', net_amount,
                'status', status,
                'requested_at', requested_at
            )
            FROM platform_payouts
            WHERE creator_id = p_creator_id
            AND status IN ('pending', 'approved', 'processing')
            LIMIT 1
        ),

        -- Ganancias por tipo
        'earnings_by_type', (
            SELECT COALESCE(json_agg(json_build_object('type', transaction_type, 'total', total)), '[]'::json)
            FROM (
                SELECT transaction_type, SUM(amount) as total
                FROM creator_wallet_transactions
                WHERE creator_id = p_creator_id
                AND amount > 0
                GROUP BY transaction_type
            ) t
        )
    ) INTO result;

    RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_creator_finance_stats(UUID) TO authenticated;

-- =====================================================
-- 4. request_creator_payout
-- =====================================================

CREATE OR REPLACE FUNCTION request_creator_payout(
    p_creator_id UUID,
    p_amount DECIMAL(12,2),
    p_payment_method TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_wallet creator_wallets%ROWTYPE;
    v_payout_id UUID;
    v_platform_fee DECIMAL(12,2);
BEGIN
    -- Obtener wallet
    SELECT * INTO v_wallet
    FROM creator_wallets
    WHERE creator_id = p_creator_id;

    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Wallet no encontrado');
    END IF;

    -- Verificar balance disponible
    IF v_wallet.available_balance < p_amount THEN
        RETURN json_build_object('success', false, 'error', 'Balance insuficiente');
    END IF;

    -- Verificar mínimo
    IF p_amount < v_wallet.minimum_payout THEN
        RETURN json_build_object('success', false, 'error', 'Monto menor al mínimo permitido');
    END IF;

    -- Verificar que no hay payout pendiente
    IF EXISTS (
        SELECT 1 FROM platform_payouts
        WHERE creator_id = p_creator_id
        AND status IN ('pending', 'approved', 'processing')
    ) THEN
        RETURN json_build_object('success', false, 'error', 'Ya tienes un pago en proceso');
    END IF;

    -- Calcular comisión (5%)
    v_platform_fee := p_amount * 0.05;

    -- Crear payout
    INSERT INTO platform_payouts (
        creator_id,
        gross_amount,
        platform_fee,
        payment_method,
        status
    ) VALUES (
        p_creator_id,
        p_amount,
        v_platform_fee,
        p_payment_method,
        'pending'
    ) RETURNING id INTO v_payout_id;

    -- Actualizar wallet (restar del disponible, añadir a pending)
    UPDATE creator_wallets
    SET
        available_balance = available_balance - p_amount,
        pending_balance = pending_balance + p_amount,
        updated_at = NOW()
    WHERE creator_id = p_creator_id;

    -- Registrar transacción en wallet
    INSERT INTO creator_wallet_transactions (
        wallet_id,
        creator_id,
        transaction_type,
        amount,
        balance_after,
        description,
        payout_id
    ) VALUES (
        v_wallet.id,
        p_creator_id,
        'payout_request',
        -p_amount,
        v_wallet.available_balance - p_amount,
        'Solicitud de pago #' || v_payout_id::TEXT,
        v_payout_id
    );

    RETURN json_build_object(
        'success', true,
        'payout_id', v_payout_id,
        'net_amount', p_amount - v_platform_fee
    );
END;
$$;

GRANT EXECUTE ON FUNCTION request_creator_payout(UUID, DECIMAL, TEXT) TO authenticated;

-- =====================================================
-- 5. get_revenue_by_month
-- =====================================================

CREATE OR REPLACE FUNCTION get_revenue_by_month(p_months INTEGER DEFAULT 12)
RETURNS TABLE (
    month TEXT,
    revenue DECIMAL(12,2),
    payouts DECIMAL(12,2),
    net DECIMAL(12,2)
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    WITH months AS (
        SELECT generate_series(
            DATE_TRUNC('month', NOW() - (p_months || ' months')::INTERVAL),
            DATE_TRUNC('month', NOW()),
            '1 month'::INTERVAL
        ) AS month_start
    ),
    revenue_data AS (
        SELECT
            DATE_TRUNC('month', pt.created_at) as m,
            SUM(CASE WHEN pt.transaction_type IN ('subscription_payment', 'campaign_payment', 'platform_fee')
                THEN pt.amount ELSE 0 END) as rev,
            SUM(CASE WHEN pt.transaction_type = 'creator_payout'
                THEN pt.amount ELSE 0 END) as pay
        FROM platform_transactions pt
        WHERE pt.status = 'completed'
        AND pt.created_at >= DATE_TRUNC('month', NOW() - (p_months || ' months')::INTERVAL)
        GROUP BY DATE_TRUNC('month', pt.created_at)
    )
    SELECT
        TO_CHAR(ms.month_start, 'Mon YY') as month,
        COALESCE(r.rev, 0)::DECIMAL(12,2) as revenue,
        COALESCE(r.pay, 0)::DECIMAL(12,2) as payouts,
        (COALESCE(r.rev, 0) - COALESCE(r.pay, 0))::DECIMAL(12,2) as net
    FROM months ms
    LEFT JOIN revenue_data r ON ms.month_start = r.m
    ORDER BY ms.month_start;
END;
$$;

GRANT EXECUTE ON FUNCTION get_revenue_by_month(INTEGER) TO authenticated;
