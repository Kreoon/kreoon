-- ============================================================================
-- client_onboarding_forms — el cliente puede LEER su propio formulario
-- ============================================================================
-- Fecha: 2026-08-12
--
-- Contexto: la migración original (20260811185335) solo dejaba una política
-- para staff ("Org staff can manage client onboarding forms"). El cliente no
-- podía leer su propio formulario desde una sesión autenticada, así que el
-- panel del portal no tenía forma de saber si estaba a medias o ya enviado
-- (solo existía el flujo público por token, sin sesión).
--
-- Esta migración agrega UNA política de SOLO LECTURA para el dueño del
-- cliente, mismo patrón que "Client can view own pipeline run" en
-- 20260812060000_client_pipeline_runs.sql (client_id resuelto vía
-- `client_users`, no hay helper nuevo).
--
-- DELIBERADAMENTE solo SELECT: el guardado por sección y el envío final desde
-- sesión pasan por pipeline-orchestrator (acciones `save_form_section` y
-- `submit_form`, con service role), nunca por escritura directa del cliente
-- a esta tabla. No se agrega INSERT/UPDATE/DELETE para el cliente.
--
-- Rollback:
--   DROP POLICY IF EXISTS "Client can view own onboarding form" ON public.client_onboarding_forms;
-- ============================================================================

DROP POLICY IF EXISTS "Client can view own onboarding form" ON public.client_onboarding_forms;
CREATE POLICY "Client can view own onboarding form"
  ON public.client_onboarding_forms
  FOR SELECT
  TO authenticated
  USING (
    client_id IN (
      SELECT cu.client_id
      FROM public.client_users cu
      WHERE cu.user_id = auth.uid()
    )
  );

NOTIFY pgrst, 'reload schema';
