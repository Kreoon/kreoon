-- ============================================================================
-- Fix missing GRANT statements on unified financial system tables
-- Root cause: 20260218000000_unified_financial_system.sql created tables
-- but omitted GRANT statements for several tables, causing
-- "permission denied for table referral_earnings" errors
-- ============================================================================

-- referral_earnings — was completely inaccessible
GRANT SELECT, INSERT, UPDATE, DELETE ON referral_earnings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON referral_earnings TO service_role;

-- unified_transactions — was completely inaccessible
GRANT SELECT, INSERT, UPDATE, DELETE ON unified_transactions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON unified_transactions TO service_role;

-- withdrawal_requests — missing service_role + DELETE
GRANT SELECT, INSERT, UPDATE, DELETE ON withdrawal_requests TO service_role;
GRANT DELETE ON withdrawal_requests TO authenticated;

-- referral_relationships — missing UPDATE/DELETE
GRANT UPDATE, DELETE ON referral_relationships TO authenticated;
GRANT UPDATE, DELETE ON referral_relationships TO service_role;

-- referral_codes — missing DELETE
GRANT DELETE ON referral_codes TO authenticated;
GRANT DELETE ON referral_codes TO service_role;

-- escrow_holds — was completely inaccessible
GRANT SELECT, INSERT, UPDATE ON escrow_holds TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON escrow_holds TO service_role;

-- custom_pricing_agreements — was completely inaccessible
GRANT SELECT ON custom_pricing_agreements TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON custom_pricing_agreements TO service_role;

-- creator_roles — was completely inaccessible
GRANT SELECT ON creator_roles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON creator_roles TO service_role;

-- role_specialties — was completely inaccessible
GRANT SELECT ON role_specialties TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON role_specialties TO service_role;

-- payment_methods — missing service_role
GRANT SELECT, INSERT, UPDATE, DELETE ON payment_methods TO service_role;

-- ai_token_balances — missing DELETE
GRANT DELETE ON ai_token_balances TO service_role;

-- platform_subscriptions — missing DELETE
GRANT DELETE ON platform_subscriptions TO service_role;

-- pricing_configuration — service_role needs write for admin
GRANT INSERT, UPDATE, DELETE ON pricing_configuration TO service_role;
