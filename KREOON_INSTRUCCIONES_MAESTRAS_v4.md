# 🚀 KREOON — Instrucciones Maestras del Proyecto v4.0

> **Sistema Operativo para Creadores de LATAM**
> PWA Full-Stack Multi-Tenant | SaaS + Marketplace + Economía Colaborativa
> **Última actualización:** Julio 2026
> **Estado:** Post-auditoría de producto (Fases A-E, ~100.591 líneas de código muerto eliminadas en 32 commits)

---

## Changelog v3.0 → v4.0

El v3.0 describía módulos que ya no existen. Este documento se generó escaneando el repo real (`main`, post-merge PR #54), no copiando del v3.0.

### Módulos eliminados (0 uso confirmado en producción)

| Módulo | Evidencia |
|---|---|
| Streaming (streaming, streaming-v2, live-streaming) | 0 filas en tablas de sesión, 0 callers |
| Booking (reservas de llamadas) | `bookings=0` |
| Org-CRM (dashboard + kanban de pipeline) | 0 callers; `org_contacts` sigue vivo vía página Clientes (no se tocó) |
| Ad-intelligence | `ad_library_ads=0` |
| Social-scraper | `social_scrape_items=0` |
| Marketing Center (página de 6 tabs) | 27 componentes, 0 callers |
| Marketing-ads (PromoteContentDialog + hooks + edge functions) | decisión explícita de negocio, incluía un caller real (botón "Pautar contenido" en ContentBoard) que se desacopló antes de borrar |
| Demo (DemoClientDashboard + DemoModeProvider global) | subsistema aislado, 0 uso |
| Registration v1 | reemplazado por registration-v2 (9 callers reales) |
| Profile-builder v2 | WIP abandonado; v1 es el activo |
| FreelancerDashboard | duplicado de CreatorDashboard, ya tenía `@deprecated` |
| 57 componentes de `components/marketplace/` | auditoría de callers, 158→101 archivos |
| 30 componentes de `components/content/` | incluye el orquestador viejo `ContentDetailDialog/`, reemplazado por `UnifiedProjectModal` |
| 10 hooks huérfanos | `useAIAssistantData`, `useMedievalSounds`, `useMentionNotifications`, `useMetaAdsDateRange`, `useNotificationSound`, `useReassignmentCheck`, `useReferralProgram`, `useUnifiedEscrow`/`useUnifiedWallet` (duplicados legacy), `useUPSettings` |
| 8 edge functions huérfanas | `bunny-status-v2`, `bunny-thumbnail-v2`, `social-instagram`, `social-tiktok`, `analyze-product-dna`, `migrate-all-media-bunny`, `migrate-avatars-bunny`, `migrate-storage` |
| Zona KIRO `live-stage` | huérfana desde el borrado de streaming |

### Redirects agregados (evitar 404 en links/bookmarks viejos)

`/marketing`, `/marketing-ads`, `/demo`, `/admin/ad-intelligence`, `/admin/social-scraper`, `/streaming/*`, `/live`, `/live/*`, `/booking/*`, `/book/*`, `/org-crm(+subrutas)`, `/wallet(+subrutas)`, `/admin/wallets` → redirigen a la página viva equivalente más cercana (ver `src/App.tsx`, bloque antes del catch-all `NotFound`).

### Hallazgos documentados (no resueltos, fuera de alcance de la poda)

- `marketplace_projects = 0` — hire directo nunca completó un proyecto. Flujo técnicamente bien cableado (checkout → webhook → insert). **Confirmado: no existe costura marketplace↔board** — son silos separados. Ver `docs/DIAGNOSTICO-HIRE-DIRECTO-2026-07-08.md`.
- `src/modules/wallet/pages/{WalletPage,TransactionsPage,WithdrawPage,AdminWalletsPage,AdminWithdrawalsPage}.tsx` — huérfanos desde febrero 2026 (no relacionado con la poda). La funcionalidad real de wallet vive como tab "Mis Cobros" dentro de `/creator-dashboard` (`TalentWalletView`) desde mayo 2026.
- `calendar-google-auth`/`calendar-google-callback`/`calendar-google-sync` — 0 callers, ownership ambiguo (relacionado con Academia, no confirmado si activo).
- `wallet-mercury-payout` — 0 callers detectados pero hace transferencias bancarias reales vía Mercury API. No se borró por riesgo financiero; decisión pendiente.
- Tablas de BD de los módulos borrados siguen en Supabase (streaming_*, bookings, booking_event_types, org-CRM pipelines, etc.) — migración SQL de limpieza pendiente, fuera de alcance de esta poda (regla explícita: no tocar BD).
- `npx tsc --noEmit` sin `-p tsconfig.app.json` es un no-op en este repo (tsconfig raíz tiene `files: []`). La validación real usada en toda la poda fue `npm run build`.

### Integraciones inactivas/deprecadas (código presente, no en uso)

- Wompi, MercadoPago: marcadas `DORMANT` en `supabase/config.toml` desde 2026-06-15 (código presente pero no están en `preferred_gateways` por defecto). Marketplace/paquetes/hire directo: **solo Stripe**.
- Cloudflare Stream, Restream: módulos completos eliminados (formaban parte de streaming/live shopping).

---

## 1. Visión y Modelo de Negocio

KREOON es una PWA full-stack multi-tenant: sistema operativo para creadores de contenido en LATAM. Combina:

- **SaaS de gestión de producción** — board/kanban de contenido, guionizado con IA, portafolio, analytics (KAE), gamificación (UP Points, embajadores).
- **Marketplace** — contratación directa creador↔marca, campañas gestionadas, sistema de escrow.
- **Academia** — LMS con cursos, comunidad, gamificación propia, monetización vía Stripe/Hotmart.

**KIRO** es el asistente/mascota IA de la plataforma — chat contextual con zonas temáticas (ver sección 10).

## 2. Stack Tecnológico

**Frontend:** React 18.3 + TypeScript 5.8 + Vite 5.4 (SWC) · React Router v6.30 · TanStack Query v5.83 · shadcn/ui (Radix) + Tailwind 3.4 · Framer Motion 11 · React Hook Form + Zod.

**Backend:** Supabase (PostgreSQL + Auth + Storage + Edge Functions, Deno) · Stripe (pagos marketplace/academia) · Bunny CDN (video/storage) · Resend (email).

**Infraestructura:** Vercel (deploy) · Bunny CDN · Supabase · GitHub · Cloudflare (solo DNS — Cloudflare Stream se eliminó junto con el módulo de streaming).

**Sin Cloudflare Stream, sin Restream** — ambos formaban parte del streaming/live shopping eliminado.

## 3. Arquitectura Multi-Tenant

```
Organizations (tenants aislados)
  └── Members (usuarios en la org)
      ├── Roles (8 base, uno o más por usuario)
      └── Badges (embajador, separado de roles)
```

Aislamiento por `organization_id` reforzado con RLS en PostgreSQL. Convenciones post-remediación de seguridad: `WITH CHECK` obligatorio en policies de escritura, column whitelists en updates sensibles, `assertOrgMembership` (`_shared/assertOrgMembership.ts`) en toda edge function con `verify_jwt = false` que además opera sobre datos de una org.

### Stack de Providers (`src/main.tsx` → `src/App.tsx`, orden real)

```
AccessGateProvider → BrandingProvider → AuthProvider → OnboardingGateProvider
  → RoleLegalGateProvider → CurrencyProvider → AnalyticsProvider
  → ImpersonationProvider → TrialProvider → UnsavedChangesProvider
  → AchievementNotificationProvider → StrategistClientProvider
  → AICopilotProvider → KiroProvider → GenerationJobProvider
  → CreatorFavoritesProvider
```

16 providers activos. `DemoModeProvider` se eliminó (Fase E) — su único consumo real era el propio subsistema demo, también borrado.

## 4. Sistema de Roles

**8 roles base** (`src/lib/roles.ts`, única fuente de verdad): `admin`, `content_creator`, `editor`, `digital_strategist`, `creative_strategist`, `community_manager`, `client`, `student`. Prioridad: admin > content_creator > editor > digital_strategist > creative_strategist > community_manager > client > student.

**4 permission groups** (`src/lib/permissionGroups.ts`): `admin`, `talent` (agrupa content_creator/editor/digital_strategist/creative_strategist/community_manager), `client`, `student`.

**31 roles de marketplace** (`src/components/marketplace/roles/marketplaceRoleConfig.ts`) — especializaciones de talento independientes/vendibles (ej. `live_streamer`, `ugc_creator`, `podcast_host` — nomenclatura de servicio, no relacionada con el módulo de streaming eliminado).

**Embajadores:** sistema de badges (Bronce/Plata/Oro) en `organization_member_badges`, separado de roles — no es un rol, es un logro/privilegio.

`student` es el único rol global sin organización (registro express, solo Academia).

## 5. Módulos de la Plataforma (estado real del repo)

| Métrica | Valor |
|---|---|
| Páginas (`src/pages/*.tsx`) | 159 |
| Componentes (`src/components/**/*.tsx`) | 1.000 |
| Hooks (`src/hooks/**/*.ts(x)`) | 219 |
| Módulos aislados (`src/modules/*/`) | 3 (`ad-generator`, `social`, `wallet`) |
| Providers/Contexts activos | 16 |
| Edge Functions | 162 |
| Rutas en `App.tsx` | ~146 funcionales + 18 redirects de compatibilidad |

### Componentes por directorio (top 15, `src/components/`)

| Directorio | Archivos |
|---|---|
| marketplace | 89 |
| ui (shadcn primitives) | 80 |
| academy | 79 |
| profile-builder | 64 |
| settings | 57 |
| content | 49 |
| crm | 41 |
| portfolio | 36 |
| admin | 36 |
| landing | 32 |
| unlock-access | 29 |
| board | 26 |
| products | 25 |
| clients | 24 |
| kiro | 21 |

**No existen** (verificar antes de asumir lo contrario): `components/streaming/`, `components/booking/`, `components/marketing/`, `components/demo/`, `modules/marketing/`, `modules/ad-intelligence/`, `modules/social-scraper/`.

### Núcleo vivo confirmado

Board/Kanban de contenido, Campañas (feed/wizard/detalle), ad-generator (98 usos internos), Wallet/Finanzas (vía tab en CreatorDashboard + módulo `modules/wallet/`), Portfolio, Profile-builder v1, Registration-v2, UP/Reputación, KIRO, KAE (analytics), Academia.

## 6. Edge Functions (162 activas)

Agrupadas por dominio funcional (lista completa en `supabase/functions/`, config JWT en `supabase/config.toml`):

| Dominio | Ejemplos |
|---|---|
| Academia | `academy-course-checkout`, `academy-event-fanout`, `academy-video-upload-init`, `academy-signed-video-url`, `academy-wa-summarizer`, `academy-google-calendar` |
| Bunny CDN | `bunny-upload(-v2)`, `bunny-download(-v2)`, `bunny-status`, `bunny-thumbnail`, `bunny-webhook`, `bunny-raw-*`, `bunny-marketplace-*`, `bunny-portfolio-upload` |
| Stripe | `stripe-webhook`, `stripe-connect-webhook`, `stripe-creator-hire`, `stripe-campaign-checkout`, `stripe-client-checkout`, `stripe-academy-subscribe`, `stripe-sync-product` |
| IA / Contenido | `content-ai`, `board-ai`, `up-ai-copilot`, `multi-ai`, `generate-script`, `script-chat`, `generate-full-research` (pipeline ADN real, 21 fases), `generate-client-dna`, `generate-product-dna`, `generate-talent-dna`, `talent-ai` |
| Marketplace | `marketplace-ai-search`, `marketplace-recommendations`, `marketplace-score-updater`, `verify-campaign-access`, `escrow-service` |
| Social Hub | `social-auth`, `social-publish`, `social-scheduler`, `social-metrics`, `social-ai-generator` |
| KIRO | `kiro-chat`, `kiro-auto-learn`, `generate-kiro-video` |
| Pancake CRM | `pancake-sync`, `pancake-sync-organization`, `pancake-sync-user`, `pancake-webhook-receiver`, `pancake-dashboard-stats`, `pancake-bulk-sync`, `pancake-setup`, `pancake-cleanup` |
| Wallet/Pagos | `wallet-connect`, `wallet-process-withdrawal`, `wallet-mercury-payout`, `monthly-talent-payroll` |
| Webhooks externos | `stripe-webhook`, `stripe-connect-webhook`, `hotmart-webhook`, `resend-webhook`, `bunny-webhook`, `wompi-webhook` (dormant), `mercadopago-webhook` (dormant) |
| Auth/Admin/Ops | `admin-users`, `admin-add-tokens`, `admin-reset-password`, `bulk-password-reset`, `emergency-password-reset`, `sync-user-permissions`, `kreoon-bootstrap`, `kreoon-sql`, `sync-to-kreoon`, `migrate-to-kreoon` |
| Cron/scheduled | `daily-reminders`, `email-drip-processor`, `cleanup-expired-stories`, `update-exchange-rates`, `stripe-reconcile-academy-subs`, `academy-wa-summarizer` |

**No incluidas** (borradas en la poda): `streaming-*`, `booking-*`, `marketing-auth`, `marketing-campaigns`, `marketing-metrics`, `marketing-reports`, `marketing-linkedin`, `intelligence-gatherer`, `ad-intelligence`, `social-scraper`, `bunny-status-v2`, `bunny-thumbnail-v2`, `social-instagram`, `social-tiktok`, `analyze-product-dna`, `migrate-all-media-bunny`, `migrate-avatars-bunny`, `migrate-storage`, `extension-video-capture`.

## 7. Sistema Financiero

Fuente única de verdad: `src/lib/finance/constants.ts` (sincronizado manualmente con `supabase/functions/_shared/ai-token-guard.ts` para Edge Functions, que no pueden importar de `src/`).

**Comisiones de plataforma por tipo de transacción:**

| Tipo | Base | Rango |
|---|---|---|
| Marketplace directo (creador↔marca) | 30% | 25-35% |
| Campañas gestionadas (con escrow/soporte) | 40% | 35-45% |
| Servicios profesionales | 30% | 25-35% |
| Paquetes corporativos | 30% | 25-35% |
| Live shopping / Live hosting | 20%, 12% white-label | — *(constantes definidas, sin frontend activo tras el borrado de streaming)* |

**Split interno post-comisión:** creador 70% · editor 15% · organización 15%.

**Referidos (perpetuo mientras ambas partes estén activas):** 20% de suscripciones, 5% de comisión sobre transacciones.

**Tokens IA:** costos por acción definidos en `AI_TOKEN_COSTS` (ej. research completo 1.500, guión 120, banner de ads 200). Planes con asignación mensual desde 500 (free) hasta 200.000 (agencia enterprise). Paquetes de compra: 2K/$15 hasta 100K/$399.

**Pagos:** Marketplace/paquetes/hire directo — **solo Stripe** (Wompi/MercadoPago dormant). Academia — Stripe + Hotmart co-producción activo. **Payout a talento: manual** (admin registra método DolarApp/Mercury Bank y marca pagado con comprobante) — sin automatización de payout saliente confirmada en frontend (`wallet-mercury-payout` existe pero 0 callers detectados).

## 8. Sistema de Reputación UP

No se tocó en esta poda. Gamificación con puntos, niveles, misiones y badges de embajador (`organization_member_badges`, separado del sistema de roles).

## 9. Analytics Engine KAE

No se tocó en esta poda. Edge functions `kae-track`, `kae-identify`, `kae-conversion`, `kae-test-connection`. Settings en `src/components/settings/analytics/` (`KaeSettingsSection.tsx`, `KaeAdPlatformsTab.tsx`, `KaeEventMappingTab.tsx`, `KaePlatformLogsTab.tsx`) — configuración de plataformas de ads (Meta/TikTok/Google) para tracking, **no relacionada** con el módulo `ad-tracking` eliminado en Fase C (que eran pixels sin ningún lector real).

## 10. Integraciones de IA

**Proveedores:** Perplexity, Gemini, OpenAI, Anthropic — fallback chain multi-provider (`content-ai`, `board-ai`, `up-ai-copilot`, `multi-ai`).

**ADN Recargado (research de producto):** el pipeline real y único en producción es `generate-full-research` (21 fases, self-invocation chain, Perplexity + Firecrawl + Gemini + Mistral), invocado desde `src/lib/services/product-dna.service.ts`. El árbol paralelo (`adn-orchestrator`, `adn-continue`, `adn-orchestrator-lite`) ya no existe en el repo — se eliminó en un commit previo a esta poda (2026-07-05).

**KIRO:** 8 zonas temáticas (`sala-de-control`, `camerino`, `set-de-grabacion`, `sala-de-edicion`, `casting`, `sala-de-prensa`, `escuela`, `general`) — la zona `live-stage` (streaming/live shopping) se eliminó en Fase E por quedar inalcanzable tras el borrado del módulo de streaming.

## 11. Base de Datos

~480 tablas con tipo `Row` generado en `src/integrations/supabase/types.ts`. Las tablas de los módulos eliminados (`streaming_*`, `bookings`, `booking_event_types`, tablas de pipeline org-CRM, etc.) **siguen existiendo en Supabase** — esta poda fue exclusivamente de código frontend/edge functions, nunca tocó el esquema de BD (regla explícita del plan). Migración SQL de limpieza queda pendiente para una iteración separada.

**Patrones RLS post-remediación:** `WITH CHECK` obligatorio en toda policy de escritura, column whitelists en updates que tocan campos sensibles (roles, balances, permisos), `assertOrgMembership` en edge functions con `verify_jwt = false` que operan sobre datos de una organización específica.

## 12. Academia

LMS con cursos, lecciones, quizzes y certificados. Modelo de planes por espacio: `hobby` / `pro` (`AcademyPlanSlug` en `src/types/academy.ts`), cada uno con `price_usd` y `transaction_fee_pct` configurables — no hardcodeados en frontend, se leen de BD por espacio.

**Monetización:** Stripe (`stripe-academy-subscribe`, `stripe-academy-portal`, `academy-course-checkout`) + Hotmart co-producción activo (`hotmart-webhook`, `academy-hotmart-redirect`) vía `academy_checkout_intents`.

**Community:** feed, DMs, leaderboard (integrado con UP Points), calendario con integración a Google Calendar (`academy-google-calendar`, aunque `calendar-google-auth/callback/sync` — funciones más antiguas y separadas — tienen ownership ambiguo, ver Diagnósticos).

**Video:** subida directa a Bunny Stream vía TUS (`academy-video-upload-init`, credenciales solo para el instructor del curso) + reproducción con URL firmada (`academy-signed-video-url`). Usa el secret `BUNNY_ACADEMY_LIBRARY_ID` — **nunca** `BUNNY_LIBRARY_ID` (usado por 15+ funciones del módulo de contenido general; pisarlo rompe upload de video en toda la plataforma, incidente real documentado 2026-07-06).

**WhatsApp:** broadcast y resumen automático (`academy-wa-broadcast`, `academy-wa-summarizer`, cron diario).

## 13. Principios de Desarrollo

- **Protección de contenido:** nunca sobrescribir datos reales de usuario sin confirmación explícita.
- **Implementación aditiva:** preferir extender sobre reescribir cuando el código existente funciona.
- **Datos reales sobre mock:** ninguna feature nueva debe depender de datos simulados una vez en producción.
- **Schema-first discipline:** antes de escribir queries o RPCs nuevos, verificar el esquema real (`list_tables`, migraciones existentes) — no asumir estructura de columnas.
- **CORS en toda Edge Function:** no negociable, usar `_shared/cors.ts`.
- **Validación de build:** `npm run build` (Vite resuelve imports reales). `npx tsc --noEmit` **sin** `-p tsconfig.app.json` es un no-op en este repo — el `tsconfig.json` raíz usa project references con `files: []`.
- **Dead-code awareness:** antes de asumir que un componente/hook/edge function "se usa en algún lado", grepear el import exacto (ruta completa, no solo el nombre del símbolo) — colisiones de nombres genéricos (`ServicesSection`, `CampaignList`, `ContentSelector`, `DatesTab`) causaron falsos positivos reales durante esta poda.

## 14. Herramientas de Desarrollo

- Claude Code como asistente principal de desarrollo.
- Supabase CLI para deploy de Edge Functions (`npx supabase functions deploy X` — el MCP de Supabase no resuelve imports de `_shared/`, usar siempre CLI para funciones con dependencias compartidas).
- `gh` CLI para PRs y CI.

## 15. Anti-Patterns y Best Practices

- No pisar secrets compartidos entre librerías Bunny distintas (ver nota de `BUNNY_ACADEMY_LIBRARY_ID` en sección 12).
- No perpetuar valores de rol legacy (`creator` en vez de `content_creator`) en código nuevo — mapear, no propagar.
- No asumir que "0 callers por grep de basename" significa código muerto: webhooks, crons y triggers pg_net son invisibles a un grep simple sobre `src/` — verificar firma de webhook, `cron.schedule` en migraciones, o patrón Event Bus (RPC `SECURITY DEFINER` + `pg_net`) antes de borrar una Edge Function.
- No mezclar auditoría de código muerto con cambios de esquema de BD en el mismo trabajo — mantenerlos como fases separadas (esta poda nunca tocó tablas).
- Ante ambigüedad de riesgo financiero (ej. una función de payout con 0 callers detectados), reportar y pedir decisión explícita en vez de borrar.

## 16. Diagnósticos Pendientes

| Item | Detalle |
|---|---|
| Hire directo roto | `marketplace_projects=0`. Flujo técnicamente cableado, sin costura marketplace↔board. Ver `docs/DIAGNOSTICO-HIRE-DIRECTO-2026-07-08.md` |
| Tablas huérfanas en BD | Tablas de streaming/booking/org-CRM pipeline siguen en Supabase sin frontend. Migración SQL pendiente |
| Edge functions de Google Calendar | `calendar-google-auth`/`callback`/`sync` — 0 callers, ownership ambiguo (¿Academia? ¿feature separada?) |
| `wallet-mercury-payout` | 0 callers, hace transferencias bancarias reales — decisión explícita pendiente sobre si borrar o formalizar como herramienta admin |
| `modules/wallet/pages/*` legacy | 5 archivos huérfanos desde febrero 2026 (WalletPage, TransactionsPage, WithdrawPage, AdminWalletsPage, AdminWithdrawalsPage) — reemplazados por tab "Mis Cobros" en CreatorDashboard, no borrados aún |
| Comisiones de live shopping | `COMMISSION_RATES.live_shopping`/`live_hosting_*` definidas en `finance/constants.ts` sin frontend activo (streaming eliminado) — limpiar o mantener para futuro relanzamiento, decisión de producto |
