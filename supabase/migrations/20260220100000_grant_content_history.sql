-- Fix: content_history table missing GRANT statements
-- The table had RLS policies but no GRANTs, causing 403 Forbidden on SELECT
GRANT SELECT, INSERT ON public.content_history TO authenticated;
GRANT ALL ON public.content_history TO service_role;
