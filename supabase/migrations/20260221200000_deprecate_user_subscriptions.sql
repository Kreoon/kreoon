-- =============================================================================
-- Migration: Deprecate user_subscriptions in favor of platform_subscriptions
-- =============================================================================
-- user_subscriptions is legacy (79 rows, all plan='free'). All subscription
-- logic now uses platform_subscriptions (Stripe-linked, org-level).
-- This migration:
--   1. Grants anon SELECT on platform_subscriptions (marketplace public access)
--   2. Grants anon SELECT on organization_members (resolve user→org)
--   3. Revokes anon access from user_subscriptions
--   4. Drops the auto-create trigger on auth.users
--   5. Renames user_subscriptions → user_subscriptions_deprecated
-- =============================================================================

-- 1. Allow anon to read active platform subscriptions (for marketplace public)
GRANT SELECT ON public.platform_subscriptions TO anon;

CREATE POLICY "Anon can view active platform subscriptions"
  ON public.platform_subscriptions
  FOR SELECT TO anon
  USING (status = 'active');

-- 2. Allow anon to resolve user→org memberships (for marketplace subscription check)
GRANT SELECT ON public.organization_members TO anon;

CREATE POLICY "Anon can view org memberships"
  ON public.organization_members
  FOR SELECT TO anon
  USING (true);

-- 3. Revoke anon from user_subscriptions (no longer needed)
DROP POLICY IF EXISTS "Anon can view active paid subscriptions" ON public.user_subscriptions;
REVOKE SELECT ON public.user_subscriptions FROM anon;

-- 4. Drop the trigger that auto-creates free user_subscriptions for new users
DROP TRIGGER IF EXISTS on_auth_user_created_subscription ON auth.users;

-- 5. Rename table as deprecated (keep data, don't drop)
ALTER TABLE public.user_subscriptions RENAME TO user_subscriptions_deprecated;

-- 6. Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';
