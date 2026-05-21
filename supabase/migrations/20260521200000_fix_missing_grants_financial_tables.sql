-- ============================================================
-- FIX: Grants faltantes en tablas del módulo financiero
--
-- CAUSA RAÍZ: Las tablas financieras creadas en mayo-2026 tenían
-- RLS habilitado y políticas correctas, pero NUNCA se ejecutaron
-- los GRANT SELECT/INSERT/UPDATE/DELETE TO authenticated.
--
-- PostgREST verifica permisos en dos capas:
--   1. GRANT de PostgreSQL (si falta → 403 inmediato)
--   2. Política RLS (si no aplica → 0 filas, no 403)
--
-- Sin los GRANTs, el rol 'authenticated' no podía ni llegar
-- a evaluar las políticas RLS → todos los endpoints devolvían 403.
--
-- Tablas afectadas y errores observados:
--   - org_financial_costs        → 403
--   - client_package_payments    → 403
--   - package_costs              → 403
--   - recurring_expenses         → 403
--   - org_financial_closings     → 403 (preventivo)
-- ============================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public.org_financial_costs     TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_package_payments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.package_costs           TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recurring_expenses      TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.org_financial_closings  TO authenticated;
