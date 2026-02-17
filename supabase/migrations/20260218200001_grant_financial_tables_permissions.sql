-- ============================================================================
-- GRANT PERMISSIONS ON UNIFIED FINANCE TABLES
-- These tables were created without GRANTs for service_role/authenticated,
-- causing "permission denied" errors from edge functions.
-- ============================================================================

-- ai_token_balances: used by ai-tokens-service (get-balance, consume, check-can-consume)
GRANT SELECT, INSERT, UPDATE ON public.ai_token_balances TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.ai_token_balances TO authenticated;

-- ai_token_transactions: used by ai-tokens-service (get-history, consume, add-bonus)
GRANT SELECT, INSERT ON public.ai_token_transactions TO service_role;
GRANT SELECT, INSERT ON public.ai_token_transactions TO authenticated;

-- unified_wallets: used by subscription-service (create-checkout, create-portal)
GRANT SELECT, INSERT, UPDATE ON public.unified_wallets TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.unified_wallets TO authenticated;

-- platform_subscriptions: used by subscription-service (cancel, resume, change-plan, get-status)
GRANT SELECT, INSERT, UPDATE ON public.platform_subscriptions TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.platform_subscriptions TO authenticated;

-- pricing_configuration: used by ai-tokens-service (get-packages, get-action-costs) and subscription-service (get-plans)
GRANT SELECT ON public.pricing_configuration TO service_role;
GRANT SELECT ON public.pricing_configuration TO authenticated;

-- referral_codes: used by subscription-service (create-checkout with referral)
GRANT SELECT, INSERT, UPDATE ON public.referral_codes TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.referral_codes TO authenticated;

-- referral_relationships: used by subscription-service (create-checkout with referral)
GRANT SELECT, INSERT ON public.referral_relationships TO service_role;
GRANT SELECT, INSERT ON public.referral_relationships TO authenticated;

-- Sequences for tables with serial/identity columns
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
