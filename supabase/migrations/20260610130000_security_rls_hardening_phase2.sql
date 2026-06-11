-- ============================================================
-- Migration: Security RLS Hardening — Fase 2 (Auditoría 2026-06-10)
-- Aplicada a producción vía MCP el 2026-06-10.
--
-- Cierra hallazgos adicionales verificados contra el código fuente que
-- la fase 1 (20260610120000) no cubrió.
-- ============================================================

-- ── connected_accounts ────────────────────────────────────────────
-- Contiene access_token / refresh_token OAuth de redes sociales.
-- Única política previa: "Service role full access" ALL TO public USING(true)
-- → cualquier usuario autenticado (o anon) podía leer los tokens OAuth de
--   TODAS las cuentas conectadas de TODOS los usuarios.
-- El frontend NO consulta esta tabla (0 matches de from('connected_accounts')
-- en todo el repo); solo edge functions con service_role la usan.
DROP POLICY IF EXISTS "Service role full access" ON public.connected_accounts;
DROP POLICY IF EXISTS "Users view own connected accounts" ON public.connected_accounts;
CREATE POLICY "Users view own connected accounts"
  ON public.connected_accounts
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());
-- Escritura queda exclusivamente para service_role (bypasea RLS).

-- ── organization_ai_defaults ──────────────────────────────────────
-- Tenía políticas específicas correctas (Org members view / Org owners-admins
-- update-insert) MÁS dos redundantes always-true (org_members_all ALL USING(true),
-- org_members_select SELECT USING(true)) que anulaban la seguridad.
-- El frontend (useOrganizationAI.ts update/insert) queda cubierto por las específicas.
DROP POLICY IF EXISTS "org_members_all" ON public.organization_ai_defaults;
DROP POLICY IF EXISTS "org_members_select" ON public.organization_ai_defaults;

NOTIFY pgrst, 'reload schema';

-- ============================================================
-- PENDIENTE (NO incluido aquí — requiere refactor cuidadoso, ver doc auditoría):
--
-- 1. Tablas de reputación/gamificación con políticas always-true que el
--    FRONTEND escribe directamente con el cliente del usuario (falsificables):
--      • reputation_events   (useUnifiedReputation.ts)
--      • user_global_stats   (useGlobalRanking.ts)
--      • point_transactions  (useKiroGamification.ts)
--      • up_events           (useUPEngine.ts)
--    Fix correcto: mover esas escrituras a RPCs SECURITY DEFINER que validen
--    el cálculo en el servidor. Dropear las políticas ahora rompería la
--    gamificación en producción.
--
-- 2. Tablas de logs/sistema con "System can ..." ALL/INSERT TO public USING(true)
--    (audit_logs, client_trust_scores, reputation_global, role_weight_config,
--     marketplace_reputation, user_global_badges, etc.). Son backend-only pero
--    su política ALL cubre también el SELECT; cerrarlas requiere verificar
--    lecturas del frontend tabla por tabla. Recrear cada una TO service_role
--    o con SELECT específico en una pasada dedicada.
--
-- 3. mi_tasks / mi_tickets: políticas UPDATE always-true (TO authenticated).
--    Módulo interno "MI" con su propio mi_current_role(). Restringir el UPDATE
--    con el mismo patrón del DELETE (mi_current_role() IN admin/owner) o por
--    assignee_id/created_by. No tocado para no romper ese módulo sin más contexto.
--
-- 4. Formularios públicos INSERT always-true (bookings, booking_question_answers,
--    creator_reviews, portfolio_inquiries, waitlist, data_deletion_requests):
--    INTENCIONALES (páginas públicas). Endurecer con rate limiting / validación
--    de payload si se desea, pero no son fugas de lectura.
-- ============================================================
