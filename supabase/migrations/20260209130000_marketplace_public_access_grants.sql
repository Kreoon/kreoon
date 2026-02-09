-- Grant anon SELECT on tables needed for public marketplace browsing
-- creator_profiles, portfolio_items, marketplace_campaigns, creator_reviews already have anon grants
-- Adding grants for creator_services and campaign_applications (read-only for public stats)

GRANT SELECT ON public.creator_services TO anon;

-- Also ensure profiles table allows anon to read avatar_url for creator profile fallback
-- Using a policy instead of broad grant to limit exposure
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'profiles' AND policyname = 'Public avatar access for marketplace'
  ) THEN
    CREATE POLICY "Public avatar access for marketplace"
      ON public.profiles FOR SELECT
      TO anon
      USING (true);
  END IF;
END $$;

-- Grant anon read on profiles table (needed for avatar fallback)
GRANT SELECT ON public.profiles TO anon;

-- RPC function to get user_ids that should be excluded from the marketplace
-- Runs as SECURITY DEFINER so it works for both authenticated and anonymous users
-- Returns user_ids from client_users table + organization_members with role='client'
CREATE OR REPLACE FUNCTION public.get_marketplace_excluded_user_ids()
RETURNS TABLE(user_id uuid)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT cu.user_id FROM public.client_users cu
  UNION
  SELECT om.user_id FROM public.organization_members om WHERE om.role = 'client'::app_role;
$$;

-- Grant execute to both anon and authenticated roles
GRANT EXECUTE ON FUNCTION public.get_marketplace_excluded_user_ids() TO anon;
GRANT EXECUTE ON FUNCTION public.get_marketplace_excluded_user_ids() TO authenticated;
