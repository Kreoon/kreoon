-- ============================================================================
-- KREOON FINANCE - Auto-create Triggers
-- Version: 20260218000002
-- Creates wallets and token balances automatically for new users
-- ============================================================================

-- 1. Trigger: auto-create unified_wallet on new profile
CREATE OR REPLACE FUNCTION auto_create_unified_wallet()
RETURNS TRIGGER AS $$
DECLARE
    v_wallet_type wallet_type;
BEGIN
    -- Map role to wallet_type
    v_wallet_type := CASE
        WHEN NEW.active_role IN ('creator', 'ugc_creator', 'influencer', 'producer', 'educator') THEN 'creator'::wallet_type
        WHEN NEW.active_role IN ('editor', 'post_production') THEN 'editor'::wallet_type
        WHEN NEW.active_role = 'brand' THEN 'brand'::wallet_type
        WHEN NEW.active_role IN ('strategist', 'tech') THEN 'creator'::wallet_type
        ELSE 'creator'::wallet_type
    END;

    INSERT INTO unified_wallets (user_id, wallet_type)
    VALUES (NEW.id, v_wallet_type)
    ON CONFLICT (user_id, wallet_type) DO NOTHING;

    RETURN NEW;
EXCEPTION WHEN undefined_table THEN
    -- unified_wallets table doesn't exist yet, skip silently
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_auto_create_unified_wallet ON profiles;
CREATE TRIGGER trigger_auto_create_unified_wallet
    AFTER INSERT ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION auto_create_unified_wallet();

-- 2. Trigger: auto-create ai_token_balance on new profile
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
        800,  -- Default: creator_free tier
        800,
        'creator_free'::subscription_tier,
        NOW() + INTERVAL '30 days'
    )
    ON CONFLICT (user_id) DO NOTHING;

    RETURN NEW;
EXCEPTION WHEN undefined_table THEN
    -- ai_token_balances table doesn't exist yet, skip silently
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_auto_create_token_balance ON profiles;
CREATE TRIGGER trigger_auto_create_token_balance
    AFTER INSERT ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION auto_create_token_balance();

-- 3. Trigger: auto-create org wallet when organization is created
CREATE OR REPLACE FUNCTION auto_create_org_wallet()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO unified_wallets (organization_id, wallet_type)
    VALUES (NEW.id, 'organization'::wallet_type)
    ON CONFLICT (organization_id, wallet_type) DO NOTHING;

    RETURN NEW;
EXCEPTION WHEN undefined_table THEN
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_auto_create_org_wallet ON organizations;
CREATE TRIGGER trigger_auto_create_org_wallet
    AFTER INSERT ON organizations
    FOR EACH ROW
    EXECUTE FUNCTION auto_create_org_wallet();

-- 4. Trigger: auto-create org token balance when organization is created
CREATE OR REPLACE FUNCTION auto_create_org_token_balance()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO ai_token_balances (
        organization_id,
        balance_subscription,
        monthly_allowance,
        subscription_tier,
        next_reset_at
    )
    VALUES (
        NEW.id,
        300,  -- Default: brand_free tier
        300,
        'brand_free'::subscription_tier,
        NOW() + INTERVAL '30 days'
    )
    ON CONFLICT (organization_id) DO NOTHING;

    RETURN NEW;
EXCEPTION WHEN undefined_table THEN
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_auto_create_org_token_balance ON organizations;
CREATE TRIGGER trigger_auto_create_org_token_balance
    AFTER INSERT ON organizations
    FOR EACH ROW
    EXECUTE FUNCTION auto_create_org_token_balance();
