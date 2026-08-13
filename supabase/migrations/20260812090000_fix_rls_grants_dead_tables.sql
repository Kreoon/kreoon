-- ============================================================
-- FIX SEGURIDAD: tablas con GRANT a anon/authenticated pero SIN
-- políticas RLS (verificado con Management API 2026-08-12)
-- ============================================================
-- Estado real de las 9 tablas reportadas:
--   RLS habilitado en las 9 (relrowsecurity = true), 0 políticas → hoy
--   deniegan TODO a anon/authenticated (comportamiento seguro por
--   defecto de Postgres cuando RLS está activo sin políticas), PERO 8
--   de ellas conservan GRANT ALL (SELECT/INSERT/UPDATE/DELETE/...) a
--   `anon` sin ninguna restricción adicional. Eso es una bomba de
--   tiempo: si alguna vez se agrega una política permisiva sin querer,
--   o alguien deshabilita RLS por error, `anon` (usuario NO
--   autenticado, cualquiera con la anon key pública) tendría CRUD
--   completo de inmediato.
--
-- CLASIFICACIÓN (las 9 tienen 0 filas hoy, verificado por conteo
-- directo):
--
-- A) agent_conversations, alerts, brand_profiles, campaign_mappings,
--    creatives, generations, templates, usage_tracking
--    → SIN ningún consumidor en src/ ni en supabase/functions/ (grep
--    exhaustivo, 0 resultados). Siete de ellas ya están documentadas
--    como "módulo ad-generator (legacy)" en
--    supabase/migrations/20260610120000_security_rls_hardening.sql
--    ("operan exclusivamente vía edge functions con service_role").
--    Esa migración ya había quitado las políticas "Allow all" pero
--    dejó vivo el GRANT de tabla a anon/authenticated — eso es lo que
--    se revoca aquí.
--    NOTA sobre campaign_mappings: no estaba en el array de esa
--    migración de junio; apareció después en el sweep multi-org
--    (20260708020000_marketplace_per_org_sweep_add_org_id.sql) y en
--    20260812010000_drop_campaigns_module.sql hay un comentario
--    ambiguo ("campaign_metrics -> campaign_mappings (SE QUEDA,
--    referidos)") que podría confundirla con el sistema de referidos.
--    Se revisaron sus columnas (generation_id, connected_account_id,
--    platform_campaign_id/adset_id/ad_id, budget_amount) y NO tienen
--    relación con referidos: son las mismas columnas del módulo
--    ad-generator muerto (generation_id apunta al flujo de
--    `generations`; connected_account_id a `connected_accounts`, otra
--    tabla del mismo módulo con 0 filas y política mínima sin uso
--    real). 0 filas, 0 referencias en código. Se revoca igual que las
--    demás, pero queda marcada explícitamente para que el agente
--    `map-campanas` (activo en esta sesión sobre el módulo de
--    campañas) la confirme antes de que se aplique esta migración, por
--    si tiene contexto que yo no vi.
--
-- B) payment_providers → SÍ tiene un consumidor real:
--    src/modules/wallet/services/payout.service.ts
--    (getAllProviders/getProvider) hace
--    `.from('payment_providers').select('*').eq('is_active', true)`.
--    El GRANT ya estaba bien acotado (solo SELECT a authenticated, sin
--    anon) — solo faltaba la política, por eso hoy ese servicio
--    recibe 0 filas silenciosamente (RLS deniega todo). Es un catálogo
--    global de referencia (no tiene organization_id ni user_id), hoy
--    con 0 filas. Se agrega política de solo lectura para proveedores
--    activos.
--    OJO: la columna `config` (jsonb) NO debe usarse nunca para
--    guardar secretos/API keys reales — cualquier credencial va en
--    variables de entorno de la Edge Function (Deno.env.get), no en
--    esta tabla, que queda legible por TODO usuario autenticado de
--    cualquier organización.
-- ============================================================

-- A) Revocar acceso de anon/authenticated a las tablas muertas del
--    módulo ad-generator. service_role no se toca (bypasea RLS de
--    todas formas y no depende de estos GRANT).
REVOKE ALL ON public.agent_conversations FROM anon, authenticated;
REVOKE ALL ON public.alerts FROM anon, authenticated;
REVOKE ALL ON public.brand_profiles FROM anon, authenticated;
REVOKE ALL ON public.campaign_mappings FROM anon, authenticated;
REVOKE ALL ON public.creatives FROM anon, authenticated;
REVOKE ALL ON public.generations FROM anon, authenticated;
REVOKE ALL ON public.templates FROM anon, authenticated;
REVOKE ALL ON public.usage_tracking FROM anon, authenticated;

-- B) payment_providers: política mínima de solo lectura. Catálogo
--    global de proveedores de pago activos, sin scope de organización
--    porque la tabla no tiene organization_id (ni lo necesita: no es
--    dato de negocio, es configuración de plataforma).
CREATE POLICY "Authenticated can view active payment providers"
  ON public.payment_providers
  FOR SELECT
  TO authenticated
  USING (is_active = true);
