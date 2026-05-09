-- =============================================================================
-- MIGRACIÓN: Security RLS Fixes - Fase 2
-- Fecha: 2026-05-08
-- Continúa la auditoría de 1,360 issues de seguridad
--
-- CAMBIOS:
--   1. Activar RLS en tabla `profiles` (15 políticas ya correctas)
--   2. Activar RLS en `pricing_configuration` + políticas de acceso
--   3. Corregir `api_keys`: reemplazar "Allow all" (public) por políticas de owner
--   4. Corregir `profiles`: "Public avatar access for marketplace" → solo perfiles públicos
--   5. Eliminar política duplicada "Authenticated can view profiles"
--
-- ROLLBACK:
--   ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
--   ALTER TABLE public.pricing_configuration DISABLE ROW LEVEL SECURITY;
--   DROP POLICY IF EXISTS "Users can view own api_keys" ON public.api_keys;
--   DROP POLICY IF EXISTS "Users can insert own api_keys" ON public.api_keys;
--   DROP POLICY IF EXISTS "Users can update own api_keys" ON public.api_keys;
--   DROP POLICY IF EXISTS "Users can delete own api_keys" ON public.api_keys;
--   CREATE POLICY "Allow all" ON public.api_keys FOR ALL TO public USING (true) WITH CHECK (true);
--   DROP POLICY IF EXISTS "Authenticated can read pricing config" ON public.pricing_configuration;
--   DROP POLICY IF EXISTS "Admins can modify pricing config" ON public.pricing_configuration;
-- =============================================================================


-- =============================================================================
-- BLOQUE 1: Activar RLS en `profiles`
-- Las 15 políticas existentes ya cubren todos los casos de acceso.
-- Al activar RLS, las políticas entran en vigor:
--   - INSERT: solo propio (auth.uid() = id)
--   - UPDATE: solo propio, admins, platform root
--   - SELECT: propio, misma org, admins, platform root, perfiles públicos
-- NOTA: Quedan 2 políticas "always true" que se abordan en fase 3
-- =============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;


-- =============================================================================
-- BLOQUE 2: Corregir política "Public avatar access for marketplace" en profiles
-- Problema: roles={anon}, qual=true → cualquier anónimo lee TODOS los perfiles
-- Fix: restringir a solo perfiles marcados como públicos (is_public = true)
-- Riesgo: BAJO. El marketplace solo debería mostrar perfiles que el creator marcó público.
-- =============================================================================

DROP POLICY IF EXISTS "Public avatar access for marketplace" ON public.profiles;

CREATE POLICY "Public avatar access for marketplace"
  ON public.profiles
  FOR SELECT
  TO anon
  USING (is_public = true);


-- =============================================================================
-- BLOQUE 3: Eliminar política duplicada en profiles
-- "Authenticated can view profiles" es idéntica a "Authenticated can view all profiles"
-- Ambas tienen qual=true. Se elimina la duplicada para reducir superficie de ataque.
-- La otra ("Authenticated can view all profiles") queda pendiente para fase 3
-- porque requiere análisis de impacto en búsquedas cross-org.
-- =============================================================================

DROP POLICY IF EXISTS "Authenticated can view profiles" ON public.profiles;


-- =============================================================================
-- BLOQUE 4: Activar RLS + políticas en `pricing_configuration`
-- Tabla de configuración global de precios. Sin user_id ni organization_id.
-- Solo platform_root puede modificar. Usuarios auth pueden leer (para cotizaciones).
-- =============================================================================

ALTER TABLE public.pricing_configuration ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read pricing config"
  ON public.pricing_configuration
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can modify pricing config"
  ON public.pricing_configuration
  FOR ALL
  TO authenticated
  USING (is_platform_root(auth.uid()))
  WITH CHECK (is_platform_root(auth.uid()));


-- =============================================================================
-- BLOQUE 5: Corregir `api_keys` — reemplazar "Allow all" por políticas de owner
-- Problema CRÍTICO: "Allow all" con roles={public} y qual=true
--   → Cualquier usuario (incluso anónimo) puede leer/escribir TODAS las API keys
-- Fix: políticas basadas en user_id = auth.uid()
-- Riesgo: BAJO. No hay acceso desde frontend confirmado. Edge functions usan service_role.
-- =============================================================================

DROP POLICY IF EXISTS "Allow all" ON public.api_keys;

CREATE POLICY "Users can view own api_keys"
  ON public.api_keys
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own api_keys"
  ON public.api_keys
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own api_keys"
  ON public.api_keys
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own api_keys"
  ON public.api_keys
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Permitir al service_role (Edge Functions) gestionar api_keys sin restricción
-- (el service_role ya bypasea RLS por defecto, esto es solo documentación)


-- =============================================================================
-- VERIFICACIÓN POST-MIGRACIÓN:
-- =============================================================================
-- SELECT relname, relrowsecurity,
--        (SELECT count(*) FROM pg_policies p WHERE p.tablename = c.relname AND p.schemaname = 'public') AS num_politicas
-- FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
-- WHERE n.nspname = 'public'
-- AND c.relname IN ('profiles', 'pricing_configuration', 'api_keys')
-- ORDER BY relname;
-- Esperado: profiles(rls=true, 14 políticas), pricing_configuration(rls=true, 2 políticas), api_keys(rls=true, 4 políticas)
