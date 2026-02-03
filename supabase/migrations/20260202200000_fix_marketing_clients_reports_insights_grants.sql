-- Fix 403: permission denied for marketing_clients, marketing_reports, marketing_ai_insights

GRANT SELECT, INSERT, UPDATE, DELETE ON public.marketing_clients TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.marketing_reports TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.marketing_ai_insights TO authenticated;
