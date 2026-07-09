# ARCHITECTURE_LEDGER.md — KREOON (ground truth)

> Verdad establecida del codebase. Claude Code LEE ESTO antes de explorar.
> Si el dato está aquí, NO grep/read para confirmarlo. Actualizar al descubrir algo nuevo (sección UPDATES abajo).
> Supabase project: `wjkbqcrxwsmvtxmqgiqc`. Rama activa: `feature/academy-v2-alexander`. StrictMode ON (main.tsx).

## FEED / PORTFOLIO
- `portfolio_items` = FUENTE DE VERDAD del feed. 1228 filas (697 `organization_content` + 531 `manual`).
- `portfolio_posts` = LEGACY. 158 filas, 21 migradas (resto = usuarios sin creator_profile, no forzar). No borrar.
- Trigger `sync_approved_content_to_portfolio`: crea fila privada por creator+editor cuando content → approved/paid. Solo 11/697 públicas. `is_public` filtra bien.
- Publicar a portafolio = UPSERT en portfolio_items (source_type='content_delivery'), NO cambio de status. content usa flags bool: is_published, shared_on_kreoon, is_portfolio_public, show_on_creator_profile.
- `feed_reactions`: CHECK constraint (love/fire/clap/wow/sad), NO enum PG. Contador desnormalizado reactions_count vía trigger. ReactionButton antes muerto, ya wireado.
- `saved_items`: genérico (item_type/item_id), SIN CHECK constraint. 'portfolio_item' válido sin tocar SQL.
- `followers`: 12 filas, casi todas rotas (apuntan a usuarios borrados, sin cascada). Tab "Siguiendo" nace vacía → empty state con SuggestedProfiles.
- RPC lectura feed: `get_feed_posts(tab, niche, cursor, limit)` SECURITY DEFINER, viewer via auth.uid() (NO parámetro cliente — hubo IDOR).
- feed-recommendations (edge fn): heurística JS pura (following+recency+engagement+diversidad+shuffle). Mal etiquetada como gemini. Reutilizable tal cual.

## DEAD CODE / NO TOCAR
- MUERTO: `adn-orchestrator`, `adn-continue`, `adn-orchestrator-lite`. Pipeline real = `generate-full-research`.
- NO TOCAR: `modules/social/*` = Social Hub (scheduling externo IG/TikTok, estilo Metricool). NO es el feed interno.
- Pasarelas muertas: Wompi, MercadoPago, Hotmart. Stripe = único cobro. Payouts talento = manual (DolarApp/Mercury).

## REPUTACIÓN / GAMIFICACIÓN
- `award_reputation_event` EXIGE `is_org_member()` → estudiantes/freelancers sin org NO emiten reputation_events. Racha necesita 2 entradas: RPC (org) + trigger en feed_reactions (cualquiera).
- Academia gamificación (streak_days/WeeklyMission) scoped a space_id. SEPARADO del UP. No confundir.
- `user_streaks` = global nuevo. "Día" = America/Bogota vía función `kreoon_today()`. Escritura solo server-side (trigger SECURITY DEFINER).
- Misiones: `mission_templates` + `user_daily_missions`. Asignación LAZY vía `get_daily_missions()` (no cron aunque pg_cron exista). Progreso server-side vía trigger en reputation_events. Cap anti-farmeo reacciones: 5/día.
- up-ai-copilot generador misiones (#60): NO llamar por usuario/día (costo). Solo refresh admin del pool.

## NOTIFICACIONES
- 3 tablas paralelas: `notifications`, `user_notifications`, `social_notifications`. USAR social_notifications (tiene UI: useSocialNotifications + dropdown).
- Web Push: `push_subscriptions` + `push_dedup_log` (throttle 5min). Trigger social_notifications → pg_net → edge fn `push-send` (VAPID, npm:web-push). Auth via header X-Internal-Secret (constant-time), notification_type whitelisteado, NO texto libre. Secreto en Vault.
- iOS: push SOLO con PWA instalada (≥16.4). Android/Chrome: completo.

## BUGS CONOCIDOS / PATRONES
- 🔴 REALTIME CHANNEL + StrictMode: topic literal crashea ("cannot add postgres_changes callbacks after subscribe"). FIX = topic único por mount: `nombre-{user.id}-{uuid}`. EXISTE EN ~30 HOOKS (useAchievements, useGlobalRanking, useMarketplaceNotifications, etc.) — bomba latente.
- VideoPlayerProvider: SocialFeed/useGlobalMute lo requiere. Envolver cualquier vista que renderice SocialFeed.
- `portfolio_items_select_policy` = qual:true (fuga: cualquier auth lee todo). PENDIENTE endurecer.
- tsc baseline: ~1565-1568 errores PREEXISTENTES. No son nuestros. Solo validar cero-nuevos en archivos tocados (grep contra paths propios).
- 188/291 organization_members.role en legacy 'creator'.

## CONVENCIONES (no re-preguntar)
- RLS: `TO authenticated` (nunca public con subquery auth), `WITH CHECK`, whitelist columnas en UPDATE, GRANTs + `NOTIFY pgrst`.
- CORS en toda edge function. Secretos en Vault (patrón academy_fanout_secret).
- Aditivo. Schema-first. Commits en español. getPermissionGroup() (no roles hardcoded). finance/constants.ts.
- pg_cron ON, pg_net disponible.

## DESIGN SYSTEM
- SOLO tokens `nova-*` / `kreoon-*`. CERO hex hardcodeado, CERO gray-*.
- Componentes: KreoonGlassCard, KreoonButton, NovaCard, NovaButton, KreoonSkeleton (loadings). PageHeader (compact en móvil, breakpoint md=768).
- Tipografía BricolageGrotesque. Colores: #8B5CF6 / #00D9FF / #FF00E5 / #00FF88.
- Móvil: useIsMobile() = 768px. safe-area env(). targets 44px. Kanban default vista lista <768.

## PENDIENTES ABIERTOS (carryover)
- [ ] Endurecer portfolio_items_select_policy (qual:true).
- [ ] npm run build NO corrido tras cambio workbox.importScripts en vite.config.ts (riesgo deploy).
- [ ] ~30 hooks con topic realtime literal (fix preventivo por lote).
- [ ] Env var Vercel: VITE_VAPID_PUBLIC_KEY (manual Alexander).
- [ ] Conectar academy_lesson_completed / campaign_application a rachas (localizados, no wireados).
- [ ] Auditar 137 portfolio_posts no migrados (autores activos vs muertos).
- [ ] Mostrar racha en perfil público requiere columna pública nueva (current_streak no expuesto hoy) — no se hizo, spec lo marcaba opcional.
- [ ] `useCreatorProfile.ts` select('*') sobre creator_profiles — no explotable hoy (solo se llama con userId propio) pero riesgo latente si un caller futuro pasa userId ajeno.
- [ ] npm run build no corrido tras cambios de Fase 3 (mismo riesgo pendiente de Fase 2.5, workbox.importScripts).

## UPDATES (append-only — Claude Code agrega descubrimientos aquí)
2026-07-09 | Perfil público real: rutas `/p/:username` y `/@:username` -> `PublicCreatorPage.tsx` (NO existe `/talent/:username`). Campo real = `creator_profiles.slug` (433/433 poblado); `username` es columna muerta (0/433 filas, nunca escrita).
2026-07-09 | El perfil público NO es hardcoded — es un builder de bloques (`profile_blocks`, `builder_config`, 20+ BlockType: hero_banner/portfolio/reviews/stats/services/testimonials/etc.) renderizado por `ProfilePageRenderer` + `PublicBlockRenderer` (`src/components/profile-viewer/`). Antes de tocar el hero o agregar secciones, revisar `BLOCK_DEFINITIONS` en `src/components/profile-builder/types/profile-builder.ts`.
2026-07-09 | `PublicCreatorPage.tsx` YA tenía meta tags OG/Twitter completos + canonical + `ProfileShareButton` (react-helmet-async) — Paso 2 de SEO estaba resuelto de antes, no se re-construyó.
2026-07-09 | 🔴 CRÍTICO (ya en prod, no introducido por Fase 3): `creator_profiles` RLS SELECT es pública (`is_active=true OR own`) y `useCreatorPublicProfile.ts` hacía `select('*')` sobre esa tabla en 3 lugares -> exponía `stripe_account_id`/`whatsapp_phone`/`payout_method` a cualquier visitante sin sesión. Fix aplicado: whitelist explícita de columnas (`PUBLIC_CREATOR_PROFILE_COLUMNS`) igual a lo que `mapProfileRow()` realmente usa. RLS solo filtra FILAS, nunca columnas — cualquier `select('*')` sobre una tabla con policy pública es sospechoso por default.
2026-07-09 | `followers` -> trigger `on_follow_notification` (AFTER INSERT) ya emite `social_notifications` server-side. `FollowButton.tsx` (`src/components/social/FollowButton.tsx`) espera `profileId` = auth `user_id` (no `creator_profiles.id`) — reusable tal cual en cualquier vista nueva, cero backend nuevo necesario para follow.
2026-07-09 | KAE = Kreoon Analytics Events. Hook `useAnalytics()` (`src/hooks/useAnalytics.ts`), método `track({event_name, event_category, properties})`, funciona sin sesión (anonymous_id via localStorage), envía a edge fn `kae-track`. Ya usado para profile_view en `PublicCreatorPage.tsx`.
2026-07-09 | `hero_banner` block (builder) NO tiene nivel/racha — se agregó como overlay fijo fuera del sistema de bloques (`PublicCreatorPage.tsx`, badge `Nivel {level}` top-left) en vez de modificar el bloque genérico. `StreakWidget`/`useStreak()` están hardcoded a "mi propia racha" (auth.uid()) — NO sirven para mostrar la racha de OTRO usuario visto públicamente; requeriría exponer `current_streak` vía columna pública nueva. Se dejó pendiente (spec lo marcaba opcional: "racha si aplica").
2026-07-09 | Hire desde perfil público NO reimplementa el flujo — solo navega a `/marketplace/creator/:id` (ya existe `HiringWizard`/`stripe-creator-hire` ahí). Gating: visible si `!user` (CTA lleva a login/registro implícito en esa página) o si `getPermissionGroup(roles[0]) === 'client'`; oculto si es el propio perfil.
2026-07-09 | `useCreatorProfile.ts` (perfil PROPIO, no público) también hace `select('*')` sobre `creator_profiles` en 2 lugares — hoy no es explotable porque el único caller pasa `userId` propio (nunca ajeno), pero es un riesgo latente si algún caller futuro pasa `options.userId` de otro usuario. No se tocó (fuera de scope del hallazgo actual, pero queda anotado).
-->
