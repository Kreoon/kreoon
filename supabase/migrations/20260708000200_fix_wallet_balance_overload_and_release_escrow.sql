-- Validacion post-checklist (segunda pasada): tres RPCs de dinero rotos en
-- runtime, descubiertos al auditar el flujo de escrow de campanas.
--
-- 1. update_wallet_balance tenia DOS overloads (4 y 5 args), ambos con
--    DEFAULTs en todos los parametros numericos. Toda llamada PostgREST
--    por nombre con un subconjunto de parametros (los 5 call sites reales:
--    referral-service, stripe-webhook marketplace/_subscription-helpers,
--    wallet-process-withdrawal x2) matcheaba AMBOS overloads -> PGRST203
--    "Could not choose the best candidate function" -> acreditacion de
--    comisiones de referidos, retiros y balances de suscripcion fallando.
--    Ademas el overload de 4 args usaba columnas inexistentes
--    (balance_available, balance_reserved -- las reales son
--    available_balance, reserved_balance). Fix: DROP del overload de 4
--    args (misma leccion que get_org_content en FASE4: CREATE OR REPLACE
--    con firma distinta crea un segundo overload, hay que dropear el viejo).
--
-- 2. release_escrow usaba balance_available (inexistente) en los dos
--    UPDATEs de acreditacion -- liberar CUALQUIER escrow con
--    distribuciones reventaba al acreditar el primer wallet.
--
-- 3. release_escrow sin referido tambien reventaba: v_referral_rel queda
--    sin asignar y el IF "v_referral_amount > 0 AND
--    v_referral_rel.referrer_wallet_id IS NOT NULL" da 55000 (plpgsql no
--    cortocircuita el acceso a un record no asignado). Fix: IF anidado.
--
-- Verificado en vivo (rollback): update_wallet_balance con subset de named
-- params resuelve y acredita correcto; release_escrow end-to-end sobre un
-- escrow approved con 1 distribucion -> success, 70 al wallet, 30 fee.

DROP FUNCTION IF EXISTS public.update_wallet_balance(uuid, numeric, numeric, numeric);

CREATE OR REPLACE FUNCTION public.release_escrow(p_escrow_id uuid, p_released_by uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_escrow RECORD;
    v_distribution JSONB;
    v_wallet_id UUID;
    v_amount DECIMAL;
    v_platform_net DECIMAL;
    v_referral_amount DECIMAL;
    v_referral_rel RECORD;
BEGIN
    SELECT * INTO v_escrow FROM escrow_holds WHERE id = p_escrow_id FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Escrow not found');
    END IF;

    IF v_escrow.status NOT IN ('pending_approval', 'approved') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Escrow not in releasable state');
    END IF;

    v_referral_amount := 0;
    IF v_escrow.referral_id IS NOT NULL THEN
        SELECT * INTO v_referral_rel FROM referral_relationships WHERE id = v_escrow.referral_id;
        IF FOUND AND v_referral_rel.status = 'active' THEN
            v_referral_amount := v_escrow.platform_fee_amount * v_referral_rel.transaction_rate / v_escrow.platform_fee_rate;

            INSERT INTO referral_earnings (
                relationship_id, referrer_id, referrer_wallet_id,
                source_type, source_id, gross_amount, commission_rate, commission_amount
            ) VALUES (
                v_escrow.referral_id, v_referral_rel.referrer_id, v_referral_rel.referrer_wallet_id,
                'transaction', p_escrow_id, v_escrow.total_amount, v_referral_rel.transaction_rate, v_referral_amount
            );

            UPDATE referral_relationships
            SET total_transaction_earned = total_transaction_earned + v_referral_amount
            WHERE id = v_escrow.referral_id;
        END IF;
    END IF;

    v_platform_net := v_escrow.platform_fee_amount - v_referral_amount;

    FOR v_distribution IN SELECT * FROM jsonb_array_elements(v_escrow.distributions)
    LOOP
        v_wallet_id := (v_distribution ->> 'wallet_id')::UUID;
        v_amount := (v_distribution ->> 'amount')::DECIMAL;

        UPDATE unified_wallets
        SET available_balance = available_balance + v_amount,
            total_earned = total_earned + v_amount
        WHERE id = v_wallet_id;

        INSERT INTO unified_transactions (
            wallet_id, transaction_type, status, amount, escrow_id, description
        ) VALUES (
            v_wallet_id, 'escrow_release', 'completed', v_amount, p_escrow_id,
            'Release from escrow: ' || v_escrow.project_title
        );
    END LOOP;

    IF v_referral_amount > 0 THEN
        IF v_referral_rel.referrer_wallet_id IS NOT NULL THEN
            UPDATE unified_wallets
            SET available_balance = available_balance + v_referral_amount,
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
    END IF;

    INSERT INTO unified_transactions (
        wallet_id, transaction_type, status, amount, fee, escrow_id, description
    ) VALUES (
        (SELECT id FROM unified_wallets WHERE wallet_type = 'platform' LIMIT 1),
        'platform_fee', 'completed', v_platform_net, v_referral_amount, p_escrow_id,
        'Platform fee from escrow release'
    );

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
$$;

NOTIFY pgrst, 'reload schema';
