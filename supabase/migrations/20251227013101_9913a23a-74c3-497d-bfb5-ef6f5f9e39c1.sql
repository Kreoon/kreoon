-- Tighten multi-tenant data isolation

-- GOALS: remove overly-permissive policy that allows any authenticated user to read all goals
DROP POLICY IF EXISTS "Authenticated can view goals" ON public.goals;

-- Ensure org members can read their org goals (policy may already exist, keep as-is)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'goals' AND policyname = 'Members can view org goals'
  ) THEN
    CREATE POLICY "Members can view org goals"
    ON public.goals
    FOR SELECT
    USING (public.is_org_member(auth.uid(), organization_id));
  END IF;
END $$;

-- CLIENTS: remove overly-permissive policy that allows any authenticated user to read all clients
DROP POLICY IF EXISTS "Authenticated can view clients" ON public.clients;

-- Allow org members to view clients for their org
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'clients' AND policyname = 'Org members can view org clients'
  ) THEN
    CREATE POLICY "Org members can view org clients"
    ON public.clients
    FOR SELECT
    USING (
      public.is_org_member(auth.uid(), organization_id)
    );
  END IF;
END $$;

-- Keep existing policies:
-- - Admins can manage clients
-- - Anyone can view public client profiles (is_public=true)
-- - Associated users can view their client (client_users)

-- OPTIONAL HARDENING: if organization_id is null, restrict visibility to admins only
-- (handled implicitly since is_org_member(NULL) is false)
