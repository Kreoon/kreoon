-- ============================================================
-- ARREGLAR 403 EN MÓDULO MARKETING - EJECUTAR EN SUPABASE
-- ============================================================
-- URL: https://supabase.com/dashboard/project/wjkbqcrxwsmvtxmqgiqc/sql/new
--
-- 1. Copia TODO (Ctrl+A, Ctrl+C)
-- 2. Pega en SQL Editor de Supabase
-- 3. Run (o Ctrl+Enter)
-- 4. Espera "Success. No rows returned"
-- 5. Recarga la app (F5)
-- ============================================================

GRANT USAGE ON SCHEMA public TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.marketing_dashboard_config TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.traffic_channels TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.marketing_strategies TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.marketing_campaigns TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.marketing_clients TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.marketing_reports TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.marketing_ai_insights TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.traffic_sync_logs TO authenticated;
