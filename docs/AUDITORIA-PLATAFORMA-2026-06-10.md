# Auditoría Integral KREOON — 2026-06-10

Cuatro frentes auditados: **Modelo de monetización** (migración a pago único), **Seguridad de código**, **Seguridad de base de datos** (migraciones + advisors de producción), y **QA + UI/UX**.

---

## 1. MODELO DE MONETIZACIÓN: Migración de recurrente → pago único

### 1.1 Modelo actual

- **Stripe `mode: "subscription"`** con trial de 14 días, billing mensual/anual.
- Orquestación: `supabase/functions/stripe-webhook/index.ts` (926 líneas, 12 eventos) + `supabase/functions/subscription-service/index.ts` (810 líneas, 7 acciones).
- Frontend: `src/hooks/useSubscription.ts` (hook maestro), `src/hooks/useCreatorPlanFeatures.ts` (gating por tier).
- BD: `platform_subscriptions` (registro maestro), `ai_token_balances` (reset mensual), `pricing_configuration` (source of truth de planes), `unified_transactions`.
- Planes actuales: marcas_starter $39/m, marcas_pro $129/m, marcas_business $349/m, creadores_pro $24/m, agencias_starter $249/m, agencias_pro $599/m.
- **El marketplace (escrow, `stripe-creator-hire`, campañas, cursos de Academia) YA es pago único** — no requiere cambios.

### 1.2 Cambios necesarios (archivo por archivo)

| Componente | Cambio |
|-----------|--------|
| `subscription-service/index.ts` | `mode: "subscription"` → `"payment"` (línea ~312). Reescribir `createCheckoutSession()` sin trial ni `subscription_data`. Reemplazar `cancelSubscription()` por `refundPurchase()` y `changePlan()` por `upgradePlan()` (pago diferencial). |
| `stripe-webhook/index.ts` | Eliminar handlers `customer.subscription.*` e `invoice.*` (líneas 45-287). Nuevo handler `handleAccessPurchaseCompleted()` en `checkout.session.completed` con `metadata.type = 'access_purchase'`. Reemplazar `processReferralSubscriptionCommission()` por comisión única de referido al comprar. |
| `useSubscription.ts` | Reescribir: `subscription` → `access`, `isActive` → `hasActiveAccess` (basado en `access_ends_at > now`), nuevos estados `isExpired` y `daysRemaining`. |
| BD (nueva migración) | Crear tabla `one_time_purchases` (tier, access_type: lifetime/year/month, access_starts_at, access_ends_at, stripe_payment_intent_id, plan_limits snapshot) con RLS. Vista `v_user_access` que unifica legacy + nuevo. |
| `ai_token_balances` | Semántica de `next_reset_at` cambia: para lifetime no hay reset (o reset anual); para year, reset cada 12 meses. |
| Stripe Dashboard | Crear nuevos Price IDs one-time (los actuales son recurring y no sirven en `mode: payment`). |

### 1.3 Migración de usuarios existentes — recomendación

**Sistema dual gradual** (no hard cut): mantener webhooks de suscripción activos durante la transición; al renovar cada suscripción legacy, convertirla en una `one_time_purchase` equivalente (monthly → 1 mes, annual → 12 meses) y marcar la legacy con `deprecated_at`. Cero churn forzado, comunicación proactiva a usuarios.

### 1.4 Pricing sugerido (one-time)

| Tier | Mensual actual | 1 año (−17%) | Lifetime (~3x anual) |
|------|---------------|--------------|----------------------|
| Starter | $39/m | $390 | $1,200–1,400 |
| Pro | $129/m | $1,290 | $4,000–4,500 |
| Business | $349/m | $3,490 | $12,000–13,000 |
| Creator Pro | $24/m | $240 | $700–800 |

**Riesgo principal de negocio**: lifetime mal preciado destruye LTV. Recomendado: vender acceso de 12 meses como producto principal y lifetime como premium limitado.

**Política de reembolsos sugerida**: garantía 30 días (automática), pro-rata para accesos > 1 mes, lifetime solo 7 días.

### 1.5 Timeline estimado

1. Desarrollo + testing: 2-3 semanas
2. Staging + QA Stripe test mode: 1 semana
3. Migración de usuarios existentes: 2 semanas
4. GA con feature flag: 1 semana
5. Cleanup de código legacy: 1 mes post-GA

---

## 2. SEGURIDAD DE CÓDIGO — 4 CRÍTICOS, 7 ALTOS

### 🔴 CRÍTICOS (resolver YA, antes de cualquier deploy)

**C1. Secretos commiteados en `.env` (raíz del repo)** — `SUPABASE_ACCESS_TOKEN`, `ELEVENLABS_API_KEY`, `GEMINI_API_KEY`, `MISTRAL_API_KEY`, `APIFY_API_KEY`, `FIRECRAWL_API_KEY`, `PERPLEXITY_API_KEY`. Aunque hoy esté en `.gitignore`, **ya está en el historial de Git**.
→ Rotar TODAS las claves de inmediato. Purgar del historial (`git filter-repo`). Mover secretos a Supabase Edge Function secrets.

**C2. `kreoon-mcp-server/.env` con `SUPABASE_SERVICE_ROLE_KEY` y `MCP_SECRET` commiteados; `extension/.env` con `VITE_GEMINI_API_KEY`.** El service role key bypasea TODA la RLS.
→ Rotar service role key, purgar del historial.

**C3. `bunny-delete-v2` con `verify_jwt = false`** (config.toml:211) y poder destructivo. Su gemela `bunny-delete` sí tiene `verify_jwt = true` — inconsistencia clara.
→ Cambiar a `verify_jwt = true` o auditar validación interna.

**C4. `admin-users` y `kreoon-sql` con `verify_jwt = false`** + validación manual: sin rate limiting, `kreoon-sql` con fallback hardcodeado de `ROOT_ADMIN_EMAILS`, `list_users` retorna todos los usuarios de la plataforma.
→ `verify_jwt = true`, eliminar fallback de emails (fallar si no está la env var), rate limiting en endpoints admin.

### 🟠 ALTOS

- **A1. IDOR cross-org en `supabase/functions/api/index.ts`**: `GET /clients` (líneas 306-326) y `GET /creators` (329-363) devuelven datos de TODA la plataforma sin filtrar por `organization_id`. → Validar membresía y filtrar.
- **A2. `POST /content` (api/index.ts:257-265)** acepta `client_id`/`creator_id`/`creator_payment` del body sin validar acceso — fraude financiero cross-org posible. → Validar pertenencia antes del insert.
- **A3. SSRF en `fetch-document/index.ts`** (líneas 23-102): hace fetch a URLs del usuario sin whitelist. → Whitelist de dominios + bloquear localhost/IPs privadas/metadata endpoints.
- **A4. XSS en `src/components/content/TeleprompterMode.tsx`** (líneas 42, 55): `innerHTML` renderizado con `dangerouslySetInnerHTML` sin pasar por `sanitizeHTML()`. → Sanitizar o usar `textContent`.
- **A5. Matriz `verify_jwt = false`**: 50+ funciones lo tienen; muchas IA (`multi-ai`, `content-ai`, `generate-script`) dependen de validación interna no verificada. → Crear matriz de auditoría función por función.
- **A6. Rate limiting ausente en funciones IA** — riesgo de costos descontrolados.
- **A7. UTMs sin sanitizar en `src/hooks/useAnalytics.ts`** (39-51) guardados en localStorage. → Whitelist regex.

### ✅ Lo que está bien

`sanitizeHTML.ts` (DOMPurify con whitelist), `safeUrl.ts`, CORS restrictivo en `_shared/cors.ts`, validación de firma Stripe en webhook, validación de secret en bunny-webhook, service role nunca en frontend, `useAuth` valida roles desde BD (no confía en localStorage), bloqueo de 'ambassador' como rol funcional.

---

## 3. SEGURIDAD DE BASE DE DATOS

### 3.1 Advisors de Supabase (producción real — 1,429 hallazgos de seguridad)

🔴 **ERROR — 3 tablas SIN RLS**: `academy_plans`, `academy_level_tiers`, `academy_badges` (módulo Academia reciente). Fix inmediato:
```sql
ALTER TABLE public.academy_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academy_level_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academy_badges ENABLE ROW LEVEL SECURITY;
-- + políticas SELECT públicas si son catálogos, escritura solo admin/service
```

🔴 **57 políticas RLS "always true"** que anulan la seguridad. Las más graves (rol `authenticated` o `anon` con acceso total):
- `organization_member_badges` — "Authenticated can manage member badges" ALL: **cualquier usuario puede auto-asignarse badge Embajador Oro**.
- `user_achievements` — "Authenticated can manage" ALL: gamificación falsificable.
- `mi_tasks` / `mi_tickets` — UPDATE always-true para authenticated.
- `rate_limits` — "System can manage" ALL para authenticated: **un atacante puede borrar sus propios rate limits**.
- `state_permissions` — política `temp_allow_all` (temporal que quedó en producción).
- `notifications` / `security_events` — INSERT always-true para authenticated: spoofing de notificaciones y logs.
- `live_stream_viewers`, `streaming_chat_messages_v2`, `marketplace_interactions`, `bookings`, `organization_ai_defaults`.
- El resto son políticas "System/Service role" con rol `-` (público): deben recrearse con `TO service_role`.

🟠 **11 buckets públicos listables** (avatars, portfolio, marketplace-media, organizations, social-media, audio-recordings, booking-assets, content-thumbnails, social-temp, streaming-media, ad-generator): eliminar las políticas SELECT amplias sobre `storage.objects` — los buckets públicos no las necesitan para servir URLs.

🟠 **Otros**: 1,088 funciones SECURITY DEFINER ejecutables por anon/authenticated (revocar EXECUTE de anon donde no aplique), 266 funciones con `search_path` mutable (`SET search_path = public`), protección HaveIBeenPwned desactivada en Auth, `payment_providers` con RLS sin políticas, extensiones `pg_trgm`/`unaccent` en schema public.

### 3.2 Auditoría de migraciones SQL (11 hallazgos)

🔴 **C-01. IDOR en `get_pending_consents(p_user_id)`** (`20260410190000_fix_get_pending_consents.sql`): SECURITY DEFINER que acepta cualquier UUID sin comparar con `auth.uid()`, con `GRANT EXECUTE TO anon`. → Validar `auth.uid() = p_user_id`, revocar anon.

🔴 **C-03. `organization_client_payments`**: política SELECT visible para CUALQUIER miembro de la org **incluyendo rol `client`** — montos, clientes y referencias de pago expuestos. `organization_payment_gateways.webhook_secret` en **texto plano**. → Restringir SELECT a admin, mover secretos a Supabase Vault o pgcrypto.

🟠 **A-03. `mcp_validate_api_key()`** revela metadata (org_id, creator_id, scopes, rate limits) para cualquier hash. → Refactorizar para retornar mínimo.

🟠 **A-04. `award_space_points()`** SECURITY DEFINER sin validar caller (gamificación Academia). → Validar service_role o rol moderator del space.

🟡 **Medios**: `profile_preview_tokens` sin RLS explícita, verificar `security_invoker` aplicado en las 10 views corregidas, verificar RLS de `academy_spaces`/`academy_memberships`/`academy_courses` en producción.

### 3.3 Performance (advisors — 4,054 hallazgos)

- **1,168 políticas re-evalúan `auth.uid()` por fila** → envolver en `(SELECT auth.uid())` (gran impacto en queries grandes).
- **1,911 políticas permisivas múltiples** sobre la misma tabla/acción → consolidar.
- **685 índices sin uso** → revisar y eliminar los confirmados.
- **8 índices duplicados** → eliminar: `clients` (3 idénticos), `content_block_config/permissions/state_rules`, `marketplace_projects` (3 pares), `talent_dna`.
- **6 tablas `_backup_*` sin PK** (referral_codes, platform_transactions, creator_wallet_transactions, ai_token_transactions, wallet_transactions, creator_wallets) → exportar y eliminar.
- Auth server limitado a 10 conexiones absolutas → cambiar a asignación porcentual.

---

## 4. QA + UI/UX

**Veredicto**: código general limpio (sin console.log, sin promesas huérfanas). **Academia (cambios sin commitear) concentra los 5 bugs de impacto alto** — corregir antes del commit.

### 🔴 Alto impacto (Academia — fix antes de commit)

1. `AcademiaCourseEditorPage.tsx:40` — `lesson: any` en `ActiveView` → tipar como `AcademyLesson`.
2. `AcademiaCourseEditorPage.tsx:109` — query Supabase sin manejar `error` (space null no detectado → crash en `space.id`).
3. `AcademyVideoPlayer.tsx:20-28` — `getSavedPosition` accede `progress[0]` sin validar array vacío.
4. `AcademiaCoursePage.tsx:118` y `AcademiaSpaceClassroomPage.tsx:298` — imágenes informativas con `alt=""` (WCAG).
5. `AcademiaCourseEditorPage.tsx:552` — `useEffect` con dependencias incompletas (datos stale en el editor).
6. `SpaceNavbar.tsx:58` — callback `({isActive}) => ...` pasado a `style` de NavLink: **el color de acento del tab activo no funciona**.

### 🟡 Medio impacto

- `AcademiaCoursePage.handleEnroll` sin manejo de error ni toast (el usuario no sabe si falló) y sin confirmación previa en cursos de pago.
- `App.tsx:575-622` — 13 providers anidados sin memoización → re-renders globales.
- Empty state genérico en `AcademiaManagePage` sin CTA vinculado.
- Skeletons genéricos que causan layout shift en `AcademiaSpaceHomePage`.

### 🔵 Bajo impacto

Validación de precio sin máximo en ManagePage, falta fallback HLS en VideoPlayer, confirmaciones genéricas al eliminar módulos, labels VIDEO_SOURCES inconsistentes, falta skeleton en CoursePage.

Resto de flujos (Auth, Dashboard, Marketplace, Wallet, Chat): sin hallazgos de impacto alto.

---

## 5. PLAN DE ACCIÓN PRIORIZADO

### Hoy / esta semana (seguridad crítica)
1. **Rotar todas las claves expuestas** (.env raíz, mcp-server, extension) y purgarlas del historial de Git.
2. Habilitar RLS en `academy_plans`, `academy_level_tiers`, `academy_badges`.
3. Recrear las políticas "System can manage" con `TO service_role` (las 57 always-true), priorizando `organization_member_badges`, `user_achievements`, `rate_limits`, `mi_tasks/mi_tickets`, `state_permissions`.
4. `verify_jwt = true` en `bunny-delete-v2`, `admin-users`, `kreoon-sql`.
5. Fix IDOR en `api/index.ts` (`/clients`, `/creators`, `POST /content`) y en `get_pending_consents`.
6. Restringir `organization_client_payments` a admins.
7. Fixes QA Academia (los 6 puntos de alto impacto) antes de commitear los cambios pendientes.

### Próximas 2 semanas
8. SSRF whitelist en `fetch-document`; sanitizar `TeleprompterMode`; sanitizar UTMs.
9. Eliminar políticas de listado en los 11 buckets públicos.
10. Matriz de auditoría de las 50+ funciones con `verify_jwt = false`.
11. Mover `webhook_secret` y credenciales de gateways a Supabase Vault.
12. Habilitar HaveIBeenPwned en Auth; rate limiting en funciones IA y admin.

### Próximo mes
13. Performance BD: `(SELECT auth.uid())` en políticas, consolidar permisivas, borrar índices duplicados y tablas `_backup_*`.
14. **Proyecto de migración a pago único** (sección 1): 6-8 semanas con sistema dual.
15. Memoizar providers en `App.tsx`; mejoras UX de empty states y skeletons.
