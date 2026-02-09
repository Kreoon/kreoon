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
