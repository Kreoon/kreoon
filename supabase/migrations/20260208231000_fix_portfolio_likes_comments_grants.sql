-- Fix 403: portfolio_post_likes and portfolio_post_comments missing GRANT to authenticated role
-- These tables were created with RLS policies but without explicit GRANT statements,
-- causing PostgREST to return 403 Forbidden for authenticated users.

GRANT SELECT, INSERT, DELETE ON public.portfolio_post_likes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.portfolio_post_comments TO authenticated;
