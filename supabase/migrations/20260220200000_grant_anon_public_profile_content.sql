-- Grant SELECT on content table to anon role
-- Required so anonymous (non-logged-in) visitors can see published content
-- on public creator profiles. The RLS policy "Anyone can view published content"
-- (TO anon USING (is_published = true)) already exists but was ineffective
-- without this GRANT.
GRANT SELECT ON public.content TO anon;

-- Grant SELECT on portfolio_posts table to anon role
-- Required for the public profile's social feed / video gallery tabs.
GRANT SELECT ON public.portfolio_posts TO anon;

-- RLS policy for portfolio_posts: allow anon to see public posts
-- (portfolio_posts doesn't have an anon policy yet)
CREATE POLICY "Anyone can view portfolio posts"
  ON public.portfolio_posts
  FOR SELECT
  TO anon
  USING (true);
