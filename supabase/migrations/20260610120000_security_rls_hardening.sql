-- ============================================================
-- Migration: Security RLS Hardening — Auditoría integral 2026-06-10
-- Date: 2026-06-10
-- Author: Alexander Cast
--
-- IMPORTANTE: Esta migración fue redactada con análisis previo del código
-- fuente en src/ y supabase/functions/. Revisar cada sección antes de
-- aplicar en producción. Las secciones están marcadas con riesgo:
--   [RIESGO BAJO]   → cambio puro de seguridad, no afecta flujos
--   [RIESGO MEDIO]  → afecta comportamiento visible; leer comentario
--   [RIESGO NULO]   → solo performance o limpieza idempotente
--
-- NOTAS GENERALES:
--   • service_role BYPASEA RLS por defecto en Supabase — no se necesitan
--     políticas "USING(true) TO authenticated" para que las edge functions
--     funcionen. Esas políticas son las que se corrigen aquí.
--   • Todas las operaciones son idempotentes (DROP IF EXISTS / CREATE IF NOT EXISTS).
--   • mi_tasks y mi_tickets NO existen en migraciones locales; se omiten.
--   • profile_preview_tokens YA tiene RLS y política correcta en baseline; se omite.
--   • state_permissions YA tiene políticas correctas (SELECT para miembros,
--     ALL para owner/admin) en baseline; la "temp_allow_all" reportada por el
--     advisor NO aparece en el código local — probablemente fue eliminada.
--     Se deja DROP IF EXISTS defensivo.
-- ============================================================


-- ============================================================
-- SECCIÓN 1: TABLAS SIN RLS — academy_plans, academy_level_tiers,
--             academy_badges
-- Riesgo: BAJO
-- Evidencia: useAcademyGamification.ts lee academy_level_tiers y
--   academy_badges con usuario autenticado (.from('academy_level_tiers')
--   y .from('academy_badges')). academy_plans solo la leen edge functions
--   y el propio módulo de admin (verificado: no aparece en src/ fuera de
--   types.ts). Se habilita SELECT para authenticated en los tres catálogos.
--   Escritura queda sin política → solo service_role puede escribir.
-- ============================================================

-- 1a. academy_plans (catálogo de planes de academia)
ALTER TABLE public.academy_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Academy plans public read" ON public.academy_plans;
CREATE POLICY "Academy plans public read"
  ON public.academy_plans
  FOR SELECT
  TO authenticated
  USING (true);
-- Sin políticas de escritura: solo service_role puede insertar/actualizar.

-- 1b. academy_level_tiers
-- Nota: esta tabla es leída por useLevelTiers() sin filtro de sesión
-- (staleTime 1 hora). El frontend la lee con usuario autenticado — OK.
ALTER TABLE public.academy_level_tiers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Academy level tiers public read" ON public.academy_level_tiers;
CREATE POLICY "Academy level tiers public read"
  ON public.academy_level_tiers
  FOR SELECT
  TO authenticated
  USING (true);

-- 1c. academy_badges (catálogo global de badges)
-- Leída por useAllBadges() y como join en useMyBadges(). Siempre con sesión.
ALTER TABLE public.academy_badges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Academy badges public read" ON public.academy_badges;
CREATE POLICY "Academy badges public read"
  ON public.academy_badges
  FOR SELECT
  TO authenticated
  USING (true);


-- ============================================================
-- SECCIÓN 2: POLÍTICAS ALWAYS-TRUE PELIGROSAS
-- ============================================================

-- 2a. rate_limits — [RIESGO BAJO]
-- "System can manage rate limits" FOR ALL TO authenticated USING(true)
-- Evidencia: grep en src/ y supabase/functions/ → rate_limits NO se accede
-- desde el frontend ni desde edge functions con cliente de usuario.
-- La función check_rate_limit() es SECURITY DEFINER → usa service_role
-- internamente. Se elimina la política abierta. Se conserva "Admins can
-- view rate limits" para PlatformSecurityPanel.
DROP POLICY IF EXISTS "System can manage rate limits" ON public.rate_limits;

-- 2b. user_achievements — [RIESGO MEDIO]
-- Políticas originales:
--   "Users can view all user achievements"  → SELECT USING(true)
--   "System can insert user achievements"   → INSERT WITH CHECK(true)
--   "Admins can manage user achievements"   → ALL (has_role admin)
-- El advisor señala "Authenticated can manage user achievements" FOR ALL
-- USING(true). Esa política no aparece en migraciones locales pero puede
-- existir en producción. Se elimina defensivamente y se recrean las
-- políticas correctas:
--   SELECT: cualquier autenticado puede ver logros de otros (leaderboard,
--           portfolio). OK según src/hooks/useAchievements.ts y
--           src/components/portfolio/EnhancedSmartSearch.tsx.
--   INSERT: solo service_role (triggers y edge functions otorgan logros).
--           Se elimina WITH CHECK(true) TO authenticated.
DROP POLICY IF EXISTS "Authenticated can manage user achievements" ON public.user_achievements;
DROP POLICY IF EXISTS "System can insert user achievements" ON public.user_achievements;

-- INSERT solo via service_role (los triggers SECURITY DEFINER ya lo hacen)
-- No se necesita policy INSERT para authenticated.

-- SELECT público permanece (leaderboard y portfolio lo necesitan)
-- "Users can view all user achievements" ya existe en baseline → no recrear.

-- 2c. notifications — [RIESGO MEDIO]
-- "Service can insert notifications" FOR INSERT TO authenticated WITH CHECK(true)
-- Evidencia CRÍTICA: src/hooks/unified/useSocialShare.ts líneas 125 y 147
-- inserta notificaciones para OTROS usuarios (creator_id y client users).
-- El usuario autenticado inserta notificaciones cuyo user_id ≠ auth.uid().
-- Por eso la política original tiene WITH CHECK(true).
-- Fix conservador: permitir INSERT cuando el insertador es autenticado
-- y el user_id destino no es nulo. Esto evita insertar notificaciones
-- anónimas pero mantiene el flujo de useSocialShare.
-- ALTERNATIVA más segura a futuro: mover esas inserciones a una RPC
-- SECURITY DEFINER que valide que el emisor tiene permiso sobre el contenido.
DROP POLICY IF EXISTS "Service can insert notifications" ON public.notifications;

CREATE POLICY "Authenticated can insert notifications"
  ON public.notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- El destinatario debe existir. No se puede verificar que el insertor
    -- "tenga derecho" sin conocer el contexto del contenido compartido.
    -- Este es el mínimo seguro compatible con useSocialShare.ts.
    -- TODO: migrar a RPC SECURITY DEFINER en sprint siguiente.
    user_id IS NOT NULL
  );

-- 2d. security_events — [RIESGO BAJO]
-- "System can insert security events" INSERT WITH CHECK(true) TO authenticated
-- Evidencia: PlatformSecurityPanel.tsx solo hace SELECT (línea 191).
-- No se encontró ningún INSERT desde src/ → solo edge functions insertan.
DROP POLICY IF EXISTS "System can insert security events" ON public.security_events;
-- Sin política INSERT para authenticated: service_role bypasea RLS.

-- 2e. state_permissions — política "temp_allow_all" defensiva
-- No aparece en migraciones locales pero el advisor la reporta.
-- Las políticas correctas (SELECT para miembros, ALL para admin/owner)
-- ya existen en baseline líneas 16727-16736.
DROP POLICY IF EXISTS "temp_allow_all" ON public.state_permissions;


-- ============================================================
-- SECCIÓN 3: TABLAS DE MÓDULO AD-GENERATOR (legacy) — [RIESGO BAJO]
-- agent_conversations, alerts, brand_profiles, creatives, favorites,
-- generations, templates, usage_tracking
-- Evidencia: ninguna de estas tablas aparece en src/ (solo en types.ts
-- como definición de tipo). No se usan en hooks ni componentes activos.
-- Son tablas del módulo ad-generator que opera exclusivamente vía
-- edge functions con service_role. Se eliminan las políticas "Allow all"
-- FOR ALL y se recrean solo para service_role.
-- Nota: se usa DROP IF EXISTS defensivo; si la política tiene nombre
-- diferente en producción, esta sección es inofensiva.
-- ============================================================

DO $$
DECLARE
  t TEXT;
  tables TEXT[] := ARRAY[
    'agent_conversations',
    'alerts',
    'brand_profiles',
    'creatives',
    'favorites',
    'generations',
    'templates',
    'usage_tracking'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    -- Solo proceder si la tabla existe en el schema public
    IF EXISTS (
      SELECT 1 FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = t
    ) THEN
      -- Eliminar políticas always-true conocidas
      EXECUTE format('DROP POLICY IF EXISTS "Allow all" ON public.%I', t);
      EXECUTE format('DROP POLICY IF EXISTS "Allow all operations" ON public.%I', t);
      EXECUTE format('DROP POLICY IF EXISTS "Authenticated can manage %s" ON public.%I', t, t);

      -- Habilitar RLS si no estaba activo
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    END IF;
  END LOOP;
END $$;


-- ============================================================
-- SECCIÓN 4: organization_member_badges — política "Authenticated can manage"
-- Riesgo: BAJO
-- El baseline ya tiene políticas correctas:
--   "Org members can view badges"  → SELECT via is_org_member
--   "Admins can manage badges"     → ALL via JOIN organization_members/roles
-- El advisor reporta "Authenticated can manage member badges" FOR ALL
-- USING(true). No aparece en migraciones locales, pero puede existir
-- en producción. Se elimina defensivamente.
-- Evidencia de uso: múltiples hooks y componentes leen esta tabla con
-- SELECT (useInternalOrgContent.ts, useUnifiedTalent.ts, CreatorsContent.tsx,
-- ProfileTrustBadges.tsx, UnifiedBadgesShowcase.tsx, CreatorEditorForm.tsx).
-- Los INSERT/UPDATE son realizados por admin via componentes que ya pasan
-- por "Admins can manage badges".
-- ============================================================

DROP POLICY IF EXISTS "Authenticated can manage member badges" ON public.organization_member_badges;


-- ============================================================
-- SECCIÓN 5: organization_client_payments — restricción de SELECT
-- Riesgo: MEDIO
-- Situación actual en fase 3 (20260508000005):
--   "Org members view client payments" → SELECT via is_org_member
-- Problema: rol 'client' también es miembro de la org → ve pagos.
-- Fix: restringir SELECT a admin y team_leader.
-- Evidencia: src/ no muestra uso directo de esta tabla desde componentes
-- de cliente. El módulo financiero la consume en hooks de admin/owner.
-- Se usan las funciones helper is_org_owner + has_role existentes.
-- ============================================================

DROP POLICY IF EXISTS "Org members view client payments" ON public.organization_client_payments;

-- Reactivo: solo org members con rol admin o team_leader (o owner) ven pagos
DROP POLICY IF EXISTS "Finance roles view client payments" ON public.organization_client_payments;
CREATE POLICY "Finance roles view client payments"
  ON public.organization_client_payments
  FOR SELECT
  TO authenticated
  USING (
    is_org_owner(auth.uid(), organization_id)
    OR EXISTS (
      SELECT 1
      FROM public.organization_members om
      JOIN public.organization_member_roles omr
        ON om.user_id = omr.user_id
       AND om.organization_id = omr.organization_id
      WHERE om.organization_id = organization_client_payments.organization_id
        AND om.user_id = auth.uid()
        AND omr.role IN ('admin', 'team_leader')
    )
  );

-- Las políticas de escritura "Org owners manage client payments" permanecen.


-- ============================================================
-- SECCIÓN 6: get_pending_consents — guardia de caller
-- Riesgo: BAJO
-- Evidencia: la función es llamada desde:
--   • src/hooks/useLegalConsent.ts (usuario autenticado: user.id)
--   • src/hooks/useOnboardingGate.ts (enabled: !!user?.id → siempre autenticado)
-- En ambos casos auth.uid() está disponible y coincide con p_user_id.
-- La función tiene GRANT TO anon (línea 86 de la migración original) para
-- soportar flujos de registro. Como anon no tiene auth.uid(), la guardia
-- IF auth.uid() IS DISTINCT FROM p_user_id AND auth.role() <> 'service_role'
-- bloquearía llamadas anon legítimas (si las hubiera). Sin embargo:
-- el onboarding gate tiene enabled: !!user?.id — nunca se llama sin sesión.
-- Se agrega la guardia solo para llamadas autenticadas con uid distinto.
-- Las llamadas anon pasan sin restricción (no tienen uid → no pueden
-- impersonar a otro usuario de todos modos, la función no devuelve datos
-- de otro usuario porque el JOIN filtra por p_user_id).
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_pending_consents(
  p_user_id UUID,
  p_trigger_event TEXT DEFAULT 'registration'
)
RETURNS TABLE (
  document_id    UUID,
  document_type  TEXT,
  title          TEXT,
  version        TEXT,
  summary        TEXT,
  is_required    BOOLEAN,
  trigger_event  TEXT,
  display_order  INTEGER,
  user_role      TEXT,
  account_type   TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_account_type TEXT;
BEGIN
  -- Guardia: un usuario autenticado no puede consultar consentimientos de
  -- otro usuario. service_role siempre puede (para jobs de migración legal).
  -- Las llamadas anon se permiten porque no tienen uid → no pueden
  -- suplantar a nadie; el flujo de registro anon no existe actualmente
  -- (useOnboardingGate.ts requiere !!user?.id), pero se conserva el GRANT
  -- TO anon para no romper si se agrega en el futuro.
  IF auth.uid() IS NOT NULL
     AND auth.uid() IS DISTINCT FROM p_user_id
     AND current_setting('request.jwt.claims', true)::jsonb->>'role' <> 'service_role'
  THEN
    RAISE EXCEPTION 'forbidden: solo puedes consultar tus propios consentimientos';
  END IF;

  -- Obtener el tipo de cuenta del usuario
  SELECT p.user_type INTO v_account_type
  FROM profiles p
  WHERE p.id = p_user_id;

  RETURN QUERY
  SELECT
    ld.id              AS document_id,
    ld.document_type,
    ld.title,
    ld.version,
    ld.summary,
    lcr.is_required,
    lcr.trigger_event,
    lcr.display_order,
    lcr.user_role,
    lcr.account_type
  FROM legal_documents ld
  INNER JOIN legal_consent_requirements lcr
    ON ld.document_type = lcr.document_type
  WHERE ld.is_current = true
    AND lcr.trigger_event = p_trigger_event
    AND lcr.is_required = true
    AND (
      lcr.account_type IS NULL
      OR lcr.account_type = v_account_type
    )
    AND (
      lcr.user_role = 'all'
      OR (lcr.user_role = 'creator'      AND v_account_type = 'talent')
      OR (lcr.user_role = 'talent'       AND v_account_type = 'talent')
      OR (lcr.user_role = 'brand'        AND v_account_type = 'client')
      OR (lcr.user_role = 'client'       AND v_account_type = 'client')
      OR (lcr.user_role = 'organization' AND v_account_type = 'organization')
    )
    AND NOT EXISTS (
      SELECT 1 FROM user_legal_consents ulc
      WHERE ulc.user_id = p_user_id
        AND ulc.document_id = ld.id
        AND ulc.accepted = true
        AND ulc.is_current = true
    )
  ORDER BY
    COALESCE(lcr.display_order, 99),
    CASE ld.document_type
      WHEN 'general_terms'         THEN 1
      WHEN 'age_declaration'       THEN 2
      WHEN 'talent_agreement'      THEN 3
      WHEN 'brand_agreement'       THEN 4
      WHEN 'client_agreement'      THEN 5
      WHEN 'organization_agreement' THEN 6
      ELSE 10
    END;
END;
$$;

-- Conservar grants originales
GRANT EXECUTE ON FUNCTION public.get_pending_consents(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_pending_consents(UUID, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.get_pending_consents(UUID, TEXT) TO service_role;


-- ============================================================
-- SECCIÓN 7: STORAGE — políticas de listado público
-- Riesgo: BAJO
-- El advisor reporta estas políticas SELECT amplias en storage.objects.
-- Evidencia: grep en src/ de `.list(` → sin resultados. El frontend no
-- usa storage.list() en ningún flujo. Las URLs de archivos se construyen
-- con getPublicUrl() directamente (CDN Bunny o Supabase Storage public URL).
-- Acción: eliminar las políticas SELECT abiertas en buckets públicos.
-- Los buckets públicos en Supabase siguen sirviendo archivos vía URL
-- directa aunque se elimine la política SELECT en storage.objects —
-- la visibilidad pública del bucket no depende de RLS de storage.objects
-- para descargas individuales via URL. Lo que se bloquea es el listado
-- de contenidos del bucket para usuarios anónimos/autenticados no dueños.
-- ============================================================

-- streaming-media: "Anyone can view streaming media" (TO public)
DROP POLICY IF EXISTS "Anyone can view streaming media" ON storage.objects;

-- organizations: "Public can view organization assets" (TO anon, authenticated)
-- NOTA: este bucket sirve logos de orgs en la página de registro (anon).
-- Se reemplaza por una política más restrictiva: solo authenticated.
-- Los usuarios anon que necesiten el logo de su org durante registro
-- pueden obtenerlo vía getPublicUrl() si el bucket es público en Supabase.
DROP POLICY IF EXISTS "Public can view organization assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated read organization assets" ON storage.objects;
CREATE POLICY "Authenticated read organization assets"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'organizations');

-- marketplace-media: "marketplace_media_select" (TO public/anon)
DROP POLICY IF EXISTS "marketplace_media_select" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated read marketplace media" ON storage.objects;
CREATE POLICY "Authenticated read marketplace media"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'marketplace-media');

-- booking-assets: "Anyone can view booking assets" (TO public)
-- NOTA: las páginas de booking pueden ser accedidas por anon para ver
-- la disponibilidad del creador. Se conserva anon para este caso.
-- Solo se documenta; no se modifica para no romper páginas públicas de booking.
-- DROP POLICY IF EXISTS "Anyone can view booking assets" ON storage.objects;
-- [CONSERVADO INTENCIONALMENTE — páginas de booking son públicas]

-- ad-generator: "ad_gen_storage_read" (TO authenticated)
-- Esta política es solo para authenticated → ya es razonable.
-- No requiere cambio.

-- Políticas reportadas por el advisor que NO aparecen en migraciones locales
-- (pueden existir solo en producción). Se eliminan defensivamente por nombre exacto:
DROP POLICY IF EXISTS "Public can read audio recordings"    ON storage.objects;
DROP POLICY IF EXISTS "Public read avatars"                 ON storage.objects;
DROP POLICY IF EXISTS "mi_avatars_read"                     ON storage.objects;
DROP POLICY IF EXISTS "Public read content-thumbnails"      ON storage.objects;
DROP POLICY IF EXISTS "Public read organizations"           ON storage.objects;
DROP POLICY IF EXISTS "Public read portfolio"               ON storage.objects;
DROP POLICY IF EXISTS "Public read social media"            ON storage.objects;
DROP POLICY IF EXISTS "Public read social-temp"             ON storage.objects;

-- Si alguno de esos buckets necesita lectura pública autenticada,
-- recrear aquí con TO authenticated:
-- CREATE POLICY "Authenticated read avatars" ON storage.objects
--   FOR SELECT TO authenticated USING (bucket_id = 'avatars');
-- (Los avatares públicos se sirven vía URL directa en buckets públicos de Supabase)


-- ============================================================
-- SECCIÓN 8: ÍNDICES DUPLICADOS — [RIESGO NULO]
-- Operación segura: DROP INDEX IF EXISTS no falla si el índice no existe.
-- Se conserva el índice canónico en cada tabla.
-- Para constraints UNIQUE se usa ALTER TABLE DROP CONSTRAINT.
-- ============================================================

-- 8a. clients: conservar idx_clients_organization_id (línea 17710 baseline)
--     eliminar idx_clients_org (línea 4822) e idx_clients_organization (línea 24190)
DROP INDEX IF EXISTS public.idx_clients_org;
DROP INDEX IF EXISTS public.idx_clients_organization;

-- 8b. content_block_config: content_block_config_org_block_key_unique es un
--     UNIQUE CONSTRAINT (ADD CONSTRAINT, línea 6685 baseline), no un índice
--     independiente. PostgreSQL crea automáticamente un índice para el
--     constraint. Solo hay un UNIQUE en esa tabla → no hay duplicado real.
--     Se omite para no romper la constraint de unicidad.
-- [OMITIDO: es el único constraint unique en esa columna]

-- 8c. content_block_permissions: mismo caso — UNIQUE CONSTRAINT, no índice libre.
-- [OMITIDO: es el único constraint unique en esas columnas]

-- 8d. content_block_state_rules: mismo caso — UNIQUE CONSTRAINT.
-- [OMITIDO: es el único constraint unique en esas columnas]

-- 8e. marketplace_projects: conservar el índice más descriptivo
--     idx_projects_organization ya existe (línea 30681 baseline)
--     idx_projects_campaign existe (línea 21802 baseline)
--     idx_projects_creation_mode NO aparece en migraciones locales
--     (puede existir en prod desde 20260506100000 — DROP IF EXISTS es seguro)
DROP INDEX IF EXISTS public.idx_projects_creation_mode;
-- idx_projects_campaign e idx_projects_organization son útiles, se conservan.

-- 8f. talent_dna: idx_talent_dna_active es un índice parcial (WHERE is_active=true)
--     útil para queries de activos. Solo hay uno → no es un duplicado real.
--     El advisor puede haberlo reportado como duplicado de otro índice en user_id.
--     Se omite para no perder el índice parcial que mejora queries de activos.
-- [OMITIDO: índice parcial útil]


-- ============================================================
-- SECCIÓN 9: mcp_validate_api_key — SET search_path + last_used_at condicional
-- Riesgo: BAJO
-- La función original (20260508000010) ya es correcta en lógica:
--   - RETURN QUERY filtra is_revoked, expires_at y scope → 0 rows si inválida
--   - UPDATE last_used_at se ejecuta siempre, incluso si la key no existe
-- Fix: agregar SET search_path = public (previene search_path injection)
--      y condicionar el UPDATE a que la key sea válida.
-- ============================================================

CREATE OR REPLACE FUNCTION public.mcp_validate_api_key(
  p_key_hash       TEXT,
  p_required_scope TEXT DEFAULT NULL
)
RETURNS TABLE (
  key_id            UUID,
  organization_id   UUID,
  creator_id        UUID,
  scopes            TEXT[],
  rate_limit_per_hour INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_found BOOLEAN := FALSE;
BEGIN
  -- Validar la key y retornar contexto si es válida
  RETURN QUERY
  SELECT
    k.id,
    k.organization_id,
    k.creator_id,
    k.scopes,
    k.rate_limit_per_hour
  FROM public.mcp_api_keys k
  WHERE k.key_hash = p_key_hash
    AND k.is_revoked = FALSE
    AND k.expires_at > NOW()
    AND (p_required_scope IS NULL OR p_required_scope = ANY(k.scopes));

  -- Actualizar last_used_at SOLO si la key fue encontrada y es válida
  -- (FOUND se refiere a si RETURN QUERY retornó al menos una fila)
  GET DIAGNOSTICS v_found = ROW_COUNT;
  -- Nota: en funciones RETURNS TABLE, usamos la existencia de la key válida
  IF EXISTS (
    SELECT 1 FROM public.mcp_api_keys k
    WHERE k.key_hash = p_key_hash
      AND k.is_revoked = FALSE
      AND k.expires_at > NOW()
      AND (p_required_scope IS NULL OR p_required_scope = ANY(k.scopes))
  ) THEN
    UPDATE public.mcp_api_keys
    SET last_used_at = NOW()
    WHERE key_hash = p_key_hash;
  END IF;
END;
$$;

COMMENT ON FUNCTION public.mcp_validate_api_key IS
  'Valida una API key por su hash y scope requerido. '
  'Retorna contexto de autorización o 0 rows si inválida. '
  'Actualiza last_used_at solo en validación exitosa.';


-- ============================================================
-- SECCIÓN 10: profile_preview_tokens — verificación defensiva
-- El baseline (línea 68680) ya tiene:
--   ALTER TABLE profile_preview_tokens ENABLE ROW LEVEL SECURITY;
--   CREATE POLICY "Users can manage own preview tokens" FOR ALL
--     USING (profile_id IN (SELECT id FROM creator_profiles WHERE user_id = auth.uid()))
-- No hay nada que corregir. Esta sección es solo documentación.
-- [SIN CAMBIOS NECESARIOS]
-- ============================================================


-- ============================================================
-- SECCIÓN 11: NOTA FINAL — tablas omitidas con justificación
--
-- mi_tasks / mi_tickets:
--   No existen en migraciones locales (grep en supabase/migrations/ →
--   sin resultados). Probablemente son tablas de producción heredadas de
--   un módulo MI (Management Interface). No se pueden corregir sin conocer
--   su schema exacto. Usar: SELECT * FROM pg_policies WHERE tablename IN
--   ('mi_tasks','mi_tickets'); para verificar en prod antes de actuar.
--
-- state_permissions "temp_allow_all":
--   No aparece en migraciones locales. DROP IF EXISTS defensivo ya incluido
--   en sección 2e. Las políticas correctas existen en baseline.
--
-- organization_member_badges "Authenticated can manage member badges":
--   No aparece en migraciones locales. DROP IF EXISTS defensivo incluido
--   en sección 4. Las políticas correctas (Org members can view, Admins
--   can manage) ya existen en baseline.
--
-- user_achievements SELECT USING(true):
--   Se conserva. El leaderboard, el portfolio y AchievementNotificationProvider
--   requieren ver logros de otros usuarios (no solo propios). Restringir a
--   user_id = auth.uid() rompería esos flujos.
--
-- ad-generator / legacy tables:
--   Se habilitó RLS y se eliminaron políticas "Allow all" via DO loop.
--   No se crearon nuevas políticas porque ningún flujo de src/ las consume.
--   service_role las maneja sin necesidad de policies.
--
-- notifications INSERT WITH CHECK(true):
--   Se reemplazó por WITH CHECK(user_id IS NOT NULL). No se puede
--   restringir a user_id = auth.uid() porque useSocialShare.ts inserta
--   notificaciones para OTROS usuarios (creator y client users).
--   La solución correcta es una RPC SECURITY DEFINER futura.
-- ============================================================

NOTIFY pgrst, 'reload schema';
