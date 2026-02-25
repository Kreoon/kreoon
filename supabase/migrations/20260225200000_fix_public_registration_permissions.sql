-- ══════════════════════════════════════════════════════════════════
-- Fix Public Registration Permissions
--
-- Problem 1: exchange_rates returns 401 for unauthenticated users
--   - Pages like /unete/talento need to read exchange rates before login
--   - Only GRANT SELECT TO authenticated existed
--
-- Problem 2: capture-lead returns 500 (service_role write access)
--   - Edge function uses service_role key which should bypass RLS
--   - Adding explicit grants as safety net
--
-- Applied: 2026-02-25
-- ══════════════════════════════════════════════════════════════════

-- 1. Allow anonymous users to read exchange rates (needed for currency display)
GRANT SELECT ON exchange_rates TO anon;
GRANT SELECT ON supported_currencies TO anon;

-- 2. Ensure service_role has full access to CRM tables (for edge functions)
GRANT ALL ON platform_leads TO service_role;
GRANT ALL ON platform_lead_interactions TO service_role;
GRANT ALL ON platform_user_health TO service_role;

-- 3. Ensure sequences are accessible for inserts
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- 4. Create RLS policy to allow service_role inserts (belt and suspenders)
-- Note: service_role should bypass RLS, but explicit policy helps with debugging
DO $$
BEGIN
  -- Drop existing policy if it exists to avoid conflicts
  DROP POLICY IF EXISTS "platform_leads_service_role_insert" ON platform_leads;

  -- Create policy that allows any insert (service_role bypasses anyway)
  CREATE POLICY "platform_leads_service_role_insert" ON platform_leads
    FOR INSERT
    TO service_role
    WITH CHECK (true);
EXCEPTION WHEN OTHERS THEN
  NULL; -- Ignore if table doesn't exist
END $$;

-- 5. Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';
