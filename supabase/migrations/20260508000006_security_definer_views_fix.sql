-- =============================================================================
-- MIGRACIÓN: Corrección de 10 views con SECURITY DEFINER
-- Fecha: 2026-05-08
--
-- Problema: Las views con SECURITY DEFINER ejecutan con permisos del creador
-- (superusuario), ignorando completamente el RLS del usuario que consulta.
-- Esto permite que cualquier usuario autenticado vea datos de otras orgs.
--
-- Solución: Convertir a SECURITY INVOKER para que la view herede los permisos
-- del usuario que la consulta, respetando el RLS de cada tabla base.
--
-- Prerequisito: Todas las tablas base tienen RLS activo con políticas correctas
-- (verificado antes de aplicar esta migración).
--
-- ROLLBACK: ALTER VIEW public.<nombre> SET (security_invoker = off);
-- =============================================================================

-- Views de datos de org (usuarios ven solo su propia org con INVOKER)
ALTER VIEW public.ai_usage_daily              SET (security_invoker = on);
ALTER VIEW public.campaign_context            SET (security_invoker = on);
ALTER VIEW public.campaign_social_summary     SET (security_invoker = on);
ALTER VIEW public.marketing_available_content SET (security_invoker = on);
ALTER VIEW public.organization_ambassadors    SET (security_invoker = on);
ALTER VIEW public.v_org_creators_with_stats   SET (security_invoker = on);
ALTER VIEW public.v_license_expiration_notices SET (security_invoker = on);

-- View de leaderboard (mi_profiles ya tiene RLS con visibilidad correcta)
ALTER VIEW public.mi_leaderboard SET (security_invoker = on);

-- Views de administración de plataforma (solo accesibles para platform_root
-- porque platform_leads y platform_user_health tienen RLS restrictivo)
ALTER VIEW public.v_platform_leads_summary  SET (security_invoker = on);
ALTER VIEW public.v_users_needing_attention SET (security_invoker = on);
