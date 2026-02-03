-- ============================================================
-- EJECUTAR EN SUPABASE SQL EDITOR
-- URL: https://supabase.com/dashboard/project/wjkbqcrxwsmvtxmqgiqc/sql/new
-- Proyecto: Kreoon (wjkbqcrxwsmvtxmqgiqc)
-- ============================================================
-- 1. Copia TODO este archivo
-- 2. Pégalo en el SQL Editor de Supabase
-- 3. Haz clic en Run (o Ctrl+Enter)
-- 4. Espera "Success"
-- 5. Recarga la app (F5)
-- ============================================================

-- Solo GRANTs (lo mínimo para quitar 403 por permisos de tabla)
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.marketing_dashboard_config TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.traffic_channels TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.marketing_strategies TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.marketing_campaigns TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.marketing_clients TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.marketing_reports TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.marketing_ai_insights TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.traffic_sync_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.content_likes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.talent_ai_recommendations TO authenticated;
