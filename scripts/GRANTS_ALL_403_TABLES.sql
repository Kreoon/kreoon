-- ============================================================
-- GRANTS PARA TODAS LAS TABLAS CON 403 - EJECUTAR EN SUPABASE
-- ============================================================
-- URL: https://supabase.com/dashboard/project/wjkbqcrxwsmvtxmqgiqc/sql/new
--
-- 1. Copia TODO (Ctrl+A, Ctrl+C)
-- 2. Pega en SQL Editor de Supabase
-- 3. Run (o Ctrl+Enter)
-- 4. Espera "Success"
-- 5. Recarga la app (F5)
-- ============================================================

GRANT USAGE ON SCHEMA public TO authenticated;

-- Notificaciones
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_preferences TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_notification_settings TO authenticated;

-- Equipo / Editores
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organization_editor_pool TO authenticated;

-- Permisos y auditoría
GRANT SELECT, INSERT, UPDATE, DELETE ON public.role_permissions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.audit_logs TO authenticated;

-- Social
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organization_social_settings TO authenticated;

-- Content
GRANT SELECT, INSERT, UPDATE, DELETE ON public.content_collaborators TO authenticated;

-- Live / Horas
GRANT SELECT, INSERT, UPDATE, DELETE ON public.live_hour_wallets TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.live_packages TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.live_hour_purchases TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.live_hour_assignments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.live_feature_flags TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.streaming_events TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.live_event_creators TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.live_usage_logs TO authenticated;

-- Referrals
GRANT SELECT, INSERT, UPDATE, DELETE ON public.referrals TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.referral_commissions TO authenticated;

-- Suscripciones
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_subscriptions TO authenticated;

-- Moneda / Finanzas
GRANT SELECT, INSERT, UPDATE, DELETE ON public.exchange_rates TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.currency_transfers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.currency_balances TO authenticated;

-- Seguridad
GRANT SELECT, INSERT, UPDATE, DELETE ON public.security_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_security_status TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.login_history TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.blocked_ips TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.security_events TO authenticated;

-- Tracking
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organization_tracking_config TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tracking_events TO authenticated;

-- AI
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_tokenization_config TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profile_token_evaluations TO authenticated;
