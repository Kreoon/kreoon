-- =============================================================================
-- MIGRACIÓN: Security RLS Fixes - Fase 1 (Riesgo Cero)
-- Fecha: 2026-05-08
-- Auditoría: 1,360 issues detectados por Supabase Security Advisor
--
-- FASE 1 — Solo cambios sin riesgo de breaking change:
--   1. Activar RLS en tablas deprecated (ya tienen políticas definidas)
--   2. Activar RLS en tablas de referencia públicas + política SELECT
--
-- ROLLBACK COMPLETO (ejecutar en orden inverso si algo falla):
--   ALTER TABLE public.supported_currencies DISABLE ROW LEVEL SECURITY;
--   ALTER TABLE public.role_specialties DISABLE ROW LEVEL SECURITY;
--   ALTER TABLE public.creator_roles DISABLE ROW LEVEL SECURITY;
--   ALTER TABLE public.kte_tracking_event_definitions_deprecated DISABLE ROW LEVEL SECURITY;
--   ALTER TABLE public.kte_tracking_ai_insights_deprecated DISABLE ROW LEVEL SECURITY;
--   ALTER TABLE public.kte_organization_tracking_integrations_deprecated DISABLE ROW LEVEL SECURITY;
--   ALTER TABLE public.kte_organization_tracking_config_deprecated DISABLE ROW LEVEL SECURITY;
--   ALTER TABLE public.kte_organization_ai_insights_config_deprecated DISABLE ROW LEVEL SECURITY;
-- =============================================================================

-- =============================================================================
-- BLOQUE 1: Tablas deprecated — Activar RLS (ya tienen políticas correctas)
-- Issue: policy_exists_rls_disabled — Políticas definidas pero RLS desactivado
-- Impacto: NULO. Sin acceso desde frontend. Políticas ya validadas en auditoría.
-- =============================================================================

ALTER TABLE public.kte_organization_ai_insights_config_deprecated
  ENABLE ROW LEVEL SECURITY;
-- Políticas existentes: "Org members can view AI insights config" (SELECT),
--                       "Org owners can manage AI insights config" (ALL)

ALTER TABLE public.kte_organization_tracking_config_deprecated
  ENABLE ROW LEVEL SECURITY;
-- Políticas existentes: "Org members can view tracking config" (SELECT),
--                       "Org owners can manage tracking config" (ALL)

ALTER TABLE public.kte_organization_tracking_integrations_deprecated
  ENABLE ROW LEVEL SECURITY;
-- Políticas existentes: "Org admins can view integrations" (SELECT),
--                       "Org owners can manage integrations" (ALL)

ALTER TABLE public.kte_tracking_ai_insights_deprecated
  ENABLE ROW LEVEL SECURITY;
-- Políticas existentes: "Org admins can view AI insights" (SELECT),
--                       "Org owners can manage AI insights" (ALL)

ALTER TABLE public.kte_tracking_event_definitions_deprecated
  ENABLE ROW LEVEL SECURITY;
-- Política existente: "Anyone can view event definitions" (SELECT, USING true)


-- =============================================================================
-- BLOQUE 2: Tablas de referencia — Activar RLS + política de solo lectura
-- Issue: rls_disabled_in_public — Tablas públicas sin RLS
-- Impacto: MUY BAJO. Son catálogos de solo lectura accedidos por usuarios auth.
-- =============================================================================

-- supported_currencies: Accedida en useCurrency.ts por usuarios autenticados
ALTER TABLE public.supported_currencies
  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read currencies"
  ON public.supported_currencies
  FOR SELECT
  TO authenticated
  USING (true);

-- creator_roles: Tabla de catálogo de roles de creadores
ALTER TABLE public.creator_roles
  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read creator roles"
  ON public.creator_roles
  FOR SELECT
  TO authenticated
  USING (true);

-- role_specialties: Tabla de catálogo de especialidades
ALTER TABLE public.role_specialties
  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read role specialties"
  ON public.role_specialties
  FOR SELECT
  TO authenticated
  USING (true);


-- =============================================================================
-- VERIFICACIÓN POST-MIGRACIÓN (ejecutar manualmente para confirmar):
-- =============================================================================
-- SELECT relname, relrowsecurity,
--        (SELECT count(*) FROM pg_policies p WHERE p.tablename = c.relname AND p.schemaname = 'public') AS num_politicas
-- FROM pg_class c
-- JOIN pg_namespace n ON n.oid = c.relnamespace
-- WHERE n.nspname = 'public'
-- AND c.relname IN (
--   'kte_organization_ai_insights_config_deprecated',
--   'kte_organization_tracking_config_deprecated',
--   'kte_organization_tracking_integrations_deprecated',
--   'kte_tracking_ai_insights_deprecated',
--   'kte_tracking_event_definitions_deprecated',
--   'creator_roles',
--   'role_specialties',
--   'supported_currencies'
-- )
-- ORDER BY relname;
-- Esperado: relrowsecurity = true en todas, num_politicas >= 1 en todas
