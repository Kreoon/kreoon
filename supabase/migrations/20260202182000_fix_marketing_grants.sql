-- Fix 403: módulo Marketing - permission denied for tables

GRANT SELECT, INSERT, UPDATE, DELETE ON public.marketing_dashboard_config TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.traffic_channels TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.marketing_strategies TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.marketing_campaigns TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.traffic_sync_logs TO authenticated;
