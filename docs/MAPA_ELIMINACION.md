# Mapa de eliminación · KREOON

**Fecha:** 2026-08-11 · **Rama:** `simplificacion-2026` · **Punto de retorno:** tag `pre-simplificacion`
**Respaldo de datos:** `backups/pre-simplificacion/` · **Línea base:** `docs/SIMPLIFICACION_BASELINE.md`

Este documento se hizo **sin borrar nada**: solo lectura de código y `SELECT` en la base.
Todo lo que sigue está verificado con `archivo:línea` o con el nombre real del objeto de base de datos.

**Módulos que se eliminan:** live streaming · red social/feed · UP/gamificación · marketplace de campañas · booking.
**Módulos que se quedan:** board/kanban, contenido, guiones/IA, clientes, creadores y talento (perfiles, portafolios, búsqueda, contratación directa), equipo, chat, notificaciones, financiero (wallets/escrow/tokens/referidos), CRM, KAE, Academia, settings.

---

## 1. Lo que cambia el plan (léelo antes que nada)

**1. Dos de los cinco módulos ya estaban muertos.** Live streaming y booking no tienen frontend: sus rutas son
redirects a `/dashboard` y no queda ni una página. Lo que sobrevive son tablas en la base y un par de restos.
El trabajo real está en los otros tres.

**2. Mi clasificación inicial de las tablas "social" estaba mal en 12 casos.** Estas tablas están dentro del
respaldo `social-feed` pero **SE QUEDAN**, porque las usa otro módulo:

| Tabla | Quién la usa de verdad |
|---|---|
| `content_likes` | El board de contenido (`UnifiedContentModule.tsx:241`) |
| `followers` | El botón Seguir del perfil público de talento (`components/social/FollowButton.tsx:46`) |
| `saved_items`, `saved_collections` | Favoritos del marketplace (`CreatorFavoritesContext.tsx:30`) |
| `saved_creators` | `marketplace-recommendations` |
| `saved_searches` | Búsqueda de creadores (`useCreatorMatching.ts:120`) |
| `profile_views` | Métricas del perfil de talento (`useCreatorMarketplaceProfile.ts:196`) |
| `suggested_profiles_cache`, `user_interest_profile` | `marketplace-recommendations` |
| `user_feed_events` | Marketplace, pese al nombre (`useMarketplaceEvents.ts:19`) |
| `post_metrics` | Social Hub — publicación a redes externas |

El respaldo las incluye igualmente (copiar de más no hace daño), pero **no se dropean**.

**3. `/social-hub` NO es el feed.** Es la publicación programada a Instagram/TikTok/Facebook
(`src/modules/social/**`, 5 edge functions). Si se borra por confusión de nombre, se cae toda esa función.
Lo mismo con `/academia/:slug/feed` y `/academia/*/calendar`: son de Academia.

**4. El chunk `dash.all.min` (854 kB) no es de live streaming.** Viene de `react-player` → Academia.
De los 1,38 MB que yo había anotado como "ahorro seguro" en la línea base, `hls` (525 kB) tampoco se va:
lo usa el player de contenido y el de Academia. **Corrección a `docs/SIMPLIFICACION_BASELINE.md`: el ahorro
de bundle por borrar live streaming es cero, porque el frontend ya no existe.**

**5. Hay tres cosas vivas que rompen producción si se dropean tablas sin tocarlas antes:**

| Qué | Dónde | Qué se rompe |
|---|---|---|
| `auto_approve_stale_content()` | cron `jobid 16`, diario 06:00 | La auto-aprobación de contenido a los 5 días. Inserta en `reputation_events` |
| `trg_escrow_create_streaming_session` | trigger sobre `escrow_holds` | El escrow del financiero, al liberar fondos |
| `admin_delete_user_cascade()` | `supabase/functions/admin-users` | Borrar usuarios — la única vía que no deja zombis |

A esos tres se suman `kreoon_merge_client` (fusión de clientes en el CRM) y
`evaluate-profile-tokens` (tokens de IA, lee `user_achievements`).

---

## 2. Orden recomendado de eliminación

Del más desacoplado al más enredado. Cada bloque debe terminar con `npm run build` en verde y
navegación manual de las rutas que se quedan (no hay tests automatizados).

| # | Bloque | Por qué en este puesto | Riesgo |
|---|---|---|---|
| **0** | **Pre-requisitos de base de datos** | Nada se dropea antes: reescribir las 5 funciones vivas, soltar 8 triggers, sacar 13 tablas de `supabase_realtime`, soltar 8 FKs entrantes | 🔴 Alto si se salta |
| **1** | **Booking** | Código muerto: 1 hook huérfano, 3 edge functions sin callers, 1 redirect. Cero dependencias inversas | 🟢 Bajo |
| **2** | **Live streaming** | Frontend ya borrado. Solo 1 tab en el detalle de cliente + 1 componente de landing sin uso. La única atadura real es `kreoon_merge_client` | 🟢 Bajo |
| **3** | **Marketplace de campañas** | Árbol propio y bien delimitado (6 dependencias inversas), pero toca `stripe-webhook` y el servidor MCP | 🟠 Medio-alto |
| **4** | **UP / gamificación** | Muchos widgets embebidos en pantallas que se quedan (~25 puntos de edición) y 3 triggers sobre `content` | 🟠 Medio |
| **5** | **Red social / Feed** | El más enredado: frontera fina con talento, la campanita de móvil y contenido de usuarios que no está migrado | 🔴 Alto |

Dentro de cada bloque, el orden es siempre el mismo: **frontend primero** (rutas → páginas → componentes →
hooks → navegación), **luego edge functions**, **al final la base de datos**. Así, si algo se rompe, la app
todavía tiene los datos.

---

## 3. Decisiones que tiene que tomar el dueño del producto

Ninguna es técnica. Sin la nº 1 resuelta, el bloque 5 no se puede ejecutar.

| # | Decisión | Contexto | Bloquea |
|---|---|---|---|
| 1 | **¿Se puede perder el contenido de `portfolio_posts`?** | 158 filas; según la migración de backfill, **137 son de usuarios sin perfil de creador** (estudiantes/clientes) y **no están replicadas en `portfolio_items`**. Dropear la tabla borra ese contenido | Bloque 5 |
| 2 | **`marketplace_reputation` se queda sin alimentador** | La alimenta `sync_marketplace_reputation`, que lee tablas de UP. Al borrar UP, los scores se congelan. Opciones: reescribirla sobre `creator_reviews` + `marketplace_projects`, o borrar la tabla | Bloque 4 |
| 3 | **¿El módulo de Talento conserva ranking?** | La página Talento usa `get_org_talent_roster` y `get_unified_talent`, que leen `up_creadores_totals`, `up_editores_totals` y `up_user_scores`. Sin ellas, esas columnas van a cero | Bloque 4 |
| 4 | **¿`/campanas-gestionadas` se queda?** | Es venta de servicio UGC con Stripe (`stripe-campaign-checkout` + `managed_campaign_subscriptions`, hoy 0 filas). Es independiente del marketplace de campañas: se puede conservar tal cual | Bloque 3 |
| 5 | **La campanita de notificaciones en móvil** | `SocialNotificationsDropdown` (del feed) es la única campanita en las 4 cabeceras móviles; `IntegratedNotificationHeader` solo está en las de escritorio. Hay que **sustituirla**, no solo quitarla | Bloque 5 |
| 6 | **El bottom nav de marca/cliente queda con 3 slots** | Pierde Feed y Campañas de 4 items. Hay que rellenar (Producciones, Facturas) o rediseñar | Bloque 3 y 5 |
| 7 | **¿`company_followers` se va?** | Es el "seguir" de perfiles de marca (`/company/:username`), no del feed. No está claro que muera con el feed | Bloque 5 |

---

## 4. Cifras del alcance real

| Módulo | Archivos a borrar | Archivos compartidos a tocar | Tablas a dropear | Estado del frontend |
|---|---:|---:|---:|---|
| Booking | 4 | 2 | 15 | ya desmontado |
| Live streaming | 2 | 13 | 37 | ya desmontado |
| Marketplace de campañas | ~45 | 26 | 12 (de 15) | vivo |
| UP / gamificación | ~45 | 27 | 44 | vivo |
| Red social / Feed | ~35 | 15 | 11 (de 24) | vivo |

**Total de tablas a dropear: ~119** de las 135 respaldadas (16 se quedan: 12 de social, `promotional_campaigns`,
`campaign_redemptions`, `campaign_mappings` y `company_followers` si se decide conservarla).

Objetos de base de datos: **87 funciones a eliminar**, **33 a reescribir**, **13 dudosas**,
**8 triggers a soltar**, **2 vistas**, **8 FKs entrantes**, **13 tablas a sacar de Realtime**.

---

## 5. Checklist previo obligatorio (bloque 0)

Ninguna de estas líneas se ha ejecutado. Es el guion propuesto.

1. Reescribir `auto_approve_stale_content()` sin `reputation_events` (cron 16 sigue activo).
2. Reescribir `admin_delete_user_cascade()` quitando los 31 `DELETE` de tablas del set.
3. Reescribir `kreoon_merge_client()` quitando los 10 `UPDATE` de tablas de streaming y campañas.
4. Reescribir `trigger_check_referrer_unlock()` contra `portfolio_items` en vez de `portfolio_posts`
   (una sola función, 4 triggers vivos la usan).
5. Editar `supabase/functions/evaluate-profile-tokens` para que deje de leer `user_achievements`.
6. `DROP TRIGGER trg_escrow_create_streaming_session ON escrow_holds;` (y los otros 7 del listado de BD).
7. Sacar las 13 tablas de la publicación `supabase_realtime` y quitar sus suscripciones en `src/`.
8. Soltar las 8 FKs entrantes (`DROP CONSTRAINT` es más reversible que `DROP COLUMN`).
9. **No usar `CASCADE`.** Si un `DROP TABLE` falla, leer el error y añadir la dependencia al plan:
   `CASCADE` borra en silencio lo que se creó después de este mapa.

---

## 6. Cómo leer lo que sigue

Cada sección viene de una investigación independiente sobre el repositorio y la base de datos en producción.
Se conservan tal cual, con su evidencia. Donde dos secciones se contradicen, manda esta nota:

- **`chronometer_pauses`**: la sección de base de datos la marca como "revisar". **Resuelto: se va.**
  Verificado — cero triggers activos, cero llamadas desde `src/`, y solo aparece dentro de
  `admin_delete_user_cascade`.
- **FKs entrantes**: la sección de red social dice no haber podido cruzar `06_dependencias.md`.
  El cruce está hecho en la sección de base de datos, apartado 4.

---

# Bloque 1 — Booking / Agenda


### ¿Está vivo o es código muerto?
**CÓDIGO MUERTO. Frontend ya fue eliminado en una limpieza previa; solo quedan restos.**

Evidencia:
- `src/App.tsx:1493` → `<Route path="/booking/*" element={<Navigate to="/dashboard" replace />} />`. La ruta **no carga ningún componente**: es un redirect. No hay `BookingPage`, `EventType*`, `PublicBooking*` ni equivalente en `src/`.
- `grep -rn "/booking" src/` → **1 sola coincidencia** (la línea de arriba). Cero enlaces en navegación. Cero `Agenda`/`Reservas`/`Calendly` en `src/components/layout`, `src/lib`.
- Ninguna RPC de booking se invoca desde `src/`: `get_booking_page_data`, `create_public_booking`, `get_available_booking_slots`, `check_booking_slot_available`, `get_booking_host_by_username` → 0 callers (solo aparecen en `src/integrations/supabase/types.ts`, que es autogenerado).
- Las 3 edge functions `calendar-google-*` **no las invoca nadie**: `grep -rn "calendar-google-auth|calendar-google-sync|calendar-google-callback" src/` → 0 resultados.
- Datos en BD (backups/pre-simplificacion/manifest.json:640-700): todo en 0 filas salvo `booking_availability` (5) y `booking_event_types` (1) — residuo de una prueba. `bookings` = **0**, `calendar_integrations` = **0**, `creator_availability` = **0**.

Único resto en `src/` con lógica real: dos hooks huérfanos (`useCreatorAvailability`, y el bloque `creator_availability` dentro de `useCreatorMarketplaceProfile`), ninguno consumido por componente/página alguna.

### Frontera con el calendario de Academia (que se queda)
Separación limpia, verificada por grep en `supabase/functions/`:
- `academy-google-calendar/index.ts` toca **solo** `academy_google_calendar_tokens` (líneas 133, 179, 243, 509, 531) y `academy_member_calendar_tokens` (411, 432, 631). **Nunca** toca `calendar_integrations` ni `calendar_blocked_events`.
- `calendar-google-auth` (:125), `calendar-google-callback` (:270), `calendar-google-sync` (:148,169,267,346,431) tocan **solo** `calendar_integrations`; `calendar-google-sync` (:405,412,420) toca `calendar_blocked_events`. **Nunca** tocan tablas `academy_*`.
- Caller de Academia: `src/hooks/academy/useAcademyCalendar.ts` invoca **`academy-google-calendar`** exclusivamente (7 llamadas). Se queda.
- `supabase/config.toml:59` = `[functions.academy-google-calendar]` (se queda) vs `:475/:479/:484` = las tres `calendar-google-*` (se van).

### Archivos a borrar
- `supabase/functions/calendar-google-auth/` (directorio completo)
- `supabase/functions/calendar-google-callback/` (directorio completo)
- `supabase/functions/calendar-google-sync/` (directorio completo)
- `src/hooks/useCreatorAvailability.ts` (188 líneas; único consumidor de `creator_availability`, sin ningún import fuera de `hooks/index.ts`)

### Archivos compartidos a modificar (ruta | línea | cambio exacto)
- `src/App.tsx` | 1493 | Borrar la línea del `<Route path="/booking/*" …>`. Verificar si `Navigate` sigue usándose en el archivo antes de tocar el import.
- `src/hooks/index.ts` | 52 | Borrar `export { useCreatorAvailability } from './useCreatorAvailability';`
- `src/hooks/useCreatorMarketplaceProfile.ts` | 60-65 | Borrar el bloque `supabase.from('creator_availability').select('*').eq('user_id', userId).maybeSingle()` del `Promise.all` y su desestructuración/asignación al campo `availability` del resultado. **El resto del hook es marketplace legítimo** (`creator_services`, `marketplace_verifications`, `marketplace_reviews`, `profile_views`) — no borrar el archivo aquí.
- `src/types/marketplace.ts` | 632 | Quitar `availability: CreatorAvailability | null;` de la interfaz de perfil.
- `src/types/marketplace.ts` | ~645, ~668 | `availability_status?: AvailabilityStatus` (CreatorSearchFilters) y `availability_status: AvailabilityStatus` (CreatorSearchResult) — ninguno se usa hoy (el filtro real del marketplace es otro, ver Riesgos). Eliminar junto con los tipos `CreatorAvailability`, `CreatorAvailabilityInput`, `AvailabilityStatus`.
- `src/hooks/usePlatformTrash.ts` | 41 | Borrar `booking_event_types: 'Tipos de Evento',` del mapa `TABLE_LABELS` (solo etiqueta cosmética).
- `supabase/config.toml` | 473-487 | Borrar el bloque comentado `# ── Google Calendar OAuth ──` con las 3 entradas `[functions.calendar-google-*]`.
- `src/integrations/supabase/types.ts` | 5011/5029/5047, 5547/5560/5573, 7149-7730, 8097-8131, 35184, 35982, 36226, 36717-36774, 39026, 39945-39951, 40526-40533 | Autogenerado: **no editar a mano**, regenerar con `supabase gen types` después del DROP.

### Edge functions
| Función | Estado | Acción |
|---|---|---|
| `calendar-google-auth` | exclusiva booking, 0 callers | borrar |
| `calendar-google-callback` | exclusiva booking, 0 callers, `verify_jwt=false` | borrar |
| `calendar-google-sync` | exclusiva booking, 0 callers | borrar |
| `academy-google-calendar` | Academia, viva (7 callers) | **NO tocar** |
| `daily-reminders` | **NO es de booking**: lee `content`, `organizations`, `profiles` (líneas 98-388); digest de guiones/contenido para clientes/creadores/editores | **NO tocar** |
| `social-scheduler` | Social Hub | **NO tocar** |

No existe ninguna edge function `booking-*` ni `reminder*` de booking (`booking_reminder_settings`/`booking_reminder_logs` nunca tuvieron worker).

### Tablas y objetos de BD
15 tablas (todas 0 filas salvo las 2 marcadas). Orden de DROP sugerido (hijas primero) o `DROP … CASCADE`:
`booking_question_answers`, `booking_reminder_logs`, `booking_webhook_logs`, `calendar_event_mappings`, `calendar_blocked_events`, `booking_custom_questions`, `booking_reminder_settings`, `booking_webhooks`, `bookings`, `booking_availability` (**5 filas**), `booking_exceptions`, `booking_event_types` (**1 fila**), `booking_branding`, `calendar_integrations`, `creator_availability`.

- Vista: `creator_availability_status` (sobre `creator_availability`) — `06_dependencias.md:188`. Sin uso en `src/`.
- Enums: `booking_location_type`, `booking_status` (`types.ts:39945-39951`).
- Funciones: `create_public_booking`, `get_available_booking_slots`, `get_booking_page_data`, `get_booking_host_by_username`, `check_booking_slot_available`, `get_creator_availability`, `auto_update_availability_status`, `check_vacation_end`, `update_creator_availability_updated_at`, `update_booking_questions_updated_at`.
- Triggers (`05_triggers.sql:31,43`): `trg_calendar_integrations_updated_at`, `trigger_creator_availability_updated_at`.
- ⚠️ `update_booking_questions_updated_at()` es la función del trigger de `calendar_integrations` — verificar que ninguna tabla fuera de booking la use antes de dropearla.
- Índices/constraints: `03_indexes.sql:81-90,143-148,535-563`; `02_constraints.sql:82-122,253`.
- FKs entrantes desde fuera del módulo: **ninguna**. `booking_event_types_deleted_by_fkey` apunta a `profiles` (saliente, no bloquea).

### Dependencias inversas del core
Prácticamente nulas. Las únicas: la línea de `App.tsx`, el export en `hooks/index.ts`, la etiqueta en `usePlatformTrash.ts`, y el bloque `creator_availability` de `useCreatorMarketplaceProfile.ts`. Ningún componente, página, dashboard o item de navegación referencia booking.

### Riesgos y trampas
1. **`creator_availability` NO la usa el marketplace.** El marketplace lee `creator_profiles.is_available` — evidencia: `src/components/settings/MarketplaceSettings.tsx:822-852` (`CreatorAvailabilityTab`, tab vivo en Ajustes) hace `UPDATE creator_profiles SET is_available, response_time_hours`; y `src/hooks/useMarketplaceCreators.ts:738` filtra con `c.is_available`, no con `creator_availability`. **El nombre engaña: `CreatorAvailabilityTab` se queda, la tabla `creator_availability` se va.** No borrar `MarketplaceSettings.tsx` ni `useCreatorProfile`.
2. **`booking_config_id` en `ad_tracking_pixels` y `ad_conversion_log`** (`types.ts:5011, 5547`) y la RPC `get_booking_tracking_pixels(p_booking_config_id, p_branch_id)` (`types.ts:36773`) pertenecen al módulo de ads/tracking, **no** a este booking: no existe ninguna tabla `booking_configs` y esas columnas **no tienen FK** (0 coincidencias en `02_constraints.sql`). No borrarlas en este barrido — son columnas huérfanas de otro origen.
3. `booking_availability` (5 filas) y `booking_event_types` (1 fila) tienen datos reales aunque residuales: hacer backup del contenido antes del DROP, aunque `bookings` esté vacía.
4. Tras el DROP hay que **regenerar** `src/integrations/supabase/types.ts`; editarlo a mano genera drift.
5. `daily-reminders` suena a booking pero es del board de contenido — borrarla rompería el digest diario de guiones/aprobaciones.
6. La ruta `/booking/*` es un redirect: si algún usuario tiene un bookmark viejo, quitarla lo llevará al 404 en vez del dashboard. Impacto trivial (0 bookings en BD), pero es una decisión consciente.

---

# Bloque 2 — Live streaming


> **Hallazgo principal:** el módulo de live streaming **ya fue borrado del frontend y del backend**
> (Fase A+B cleanup, 2026-07-08). No quedan páginas, hooks, contexts, providers ni edge functions.
> Lo que queda es: **1 componente huérfano funcional**, **2 componentes/config residuales**,
> **37 tablas en BD** y **7 enums**. Este mapa es mucho más pequeño de lo que sugiere el manifest.

Rutas en `src/App.tsx` (verificadas por grep):
- L1490 `<Route path="/streaming/*" element={<Navigate to="/dashboard" replace />} />`
- L1491 `<Route path="/live" element={<Navigate to="/dashboard" replace />} />`
- L1492 `<Route path="/live/*" element={<Navigate to="/dashboard" replace />} />`
- **No hay `lazy()` de live/streaming.** Los tres son redirects a `/dashboard`.
- L40 / L1534 `AcademyLiveToaster` → **NO es live streaming** (ver Trampas).

---

### Archivos a borrar

| ruta | qué es | verificado sin uso externo sí/no |
|---|---|---|
| `src/components/clients/ClientStreamingChannels.tsx` (316 líneas) | CRUD de canales de streaming de un cliente. Consulta `streaming_accounts` (L79, L133, L151) y usa enums `streaming_platform` / `streaming_provider` (L13–14). Único consumidor real de tablas de streaming que queda en `src/`. | **NO** — lo monta `ClientDetailDialog.tsx` (tab "Canales"). Ver sección "compartidos a modificar". |
| `src/components/landing/LiveShoppingComingSoon.tsx` (507 líneas) | Card/banner/modal "Live Shopping — próximamente" con captura de waitlist por email (landing pública). | **SÍ** — solo se re-exporta en `src/components/landing/index.ts` L37–38; grep en `src/pages/` y resto de `src/components/` da **cero consumidores**. Código muerto incluso hoy. |

**Eso es todo en `src/`.** No hay `src/pages/Live*`, `src/pages/Streaming*`, ni carpetas
`src/components/live*` / `src/components/streaming*` — `find src -type d -iname "*live*" -o -iname "*stream*"`
solo devuelve `src/components/academy/live` (Academia, se queda).

---

### Archivos compartidos a modificar

| ruta | línea(s) | cambio exacto a hacer |
|---|---|---|
| `src/components/clients/ClientDetailDialog.tsx` | L28 | Borrar `import { ClientStreamingChannels } from "@/components/clients/ClientStreamingChannels";` |
| `src/components/clients/ClientDetailDialog.tsx` | L426–429 | Borrar el `<TabsTrigger value="channels">` completo |
| `src/components/clients/ClientDetailDialog.tsx` | L1142–1145 | Borrar el bloque `{/* Streaming Channels Tab */}` + `<TabsContent value="channels">` |
| `src/components/landing/index.ts` | L37–38 | Borrar los dos `export` de `LiveShoppingComingSoon` / `LiveShoppingComingSoonProps` |
| `src/components/ProtectedRoute.tsx` | L81 | Quitar `'/live'` de `CLIENT_ALLOWED_ROUTES` |
| `src/components/ProtectedRoute.tsx` | L236 | Quitar `'/live'` de `SHARED_ROUTES` |
| `src/App.tsx` | L1490–1492 | Borrar los 3 redirects (opcional — si se dejan, `/live` sigue cayendo a `/dashboard`; borrarlos hace que caiga en el 404 normal). **DUDOSO**: dejarlos es más seguro para links viejos indexados. |
| `src/config/service-catalog.ts` | L88–98 | Borrar la entrada de servicio `id: 'live_streaming'` ("Live Streaming", icon `Radio`). Revisar si `Radio` queda como import sin uso. |
| `src/lib/finance/constants.ts` | L22, L28–31 | Borrar de `COMMISSION_RATES`: `live_shopping`, `live_hosting_direct`, `live_hosting_whitelabel`. **DUDOSO**: `CommissionType` se deriva de este objeto — grep de esos 3 keys antes de borrar. |
| `src/lib/i18n/terminos.ts` | L250–254 | Borrar el bloque `// Streaming`: `transmision_vivo`, `sala_espera`, `estudio`, `grabaciones` |
| `src/lib/profile-builder/generateBlocksFromTemplate.ts` | L118 | Entrada `live_streaming: 'Video'` en el mapa de bloques. **DUDOSO**: verificar si algún template de profile-builder emite ese tipo antes de quitarlo. |
| `src/components/layout/Sidebar.tsx` | L632 | Solo un **comentario** (`// Hide adminOnly items (streaming/live)...`). El flag `adminOnly` se usa para otros ítems; **no tocar la lógica**, solo actualizar el comentario. |
| `src/components/layout/MobileNav.tsx` | L210 | Comentario `// Live module coming soon` dentro de `freelanceSections`. Borrar el comentario. No hay ítem de nav. |
| `src/integrations/supabase/types.ts` | varias | Se regenera con `npx supabase gen types`; no editar a mano. |

`MainLayout`, `MobileBottomNav`, `MoreMenuSheet`: **cero referencias** a `/live` o `/streaming`.

---

### Edge functions

- **Exclusivas: NINGUNA.** `ls supabase/functions | grep -iE "live|stream|restream|cloudflare|rtmp"` → vacío.
  Las funciones `streaming-webhook`, `streaming-webhook-v2`, `cloudflare-live-webhook`, `restream-api`
  que menciona `CLAUDE.md` **ya no existen en el repo** (el CLAUDE.md está desactualizado en ese punto).
- **`supabase/config.toml`: cero entradas** con `live|stream|cloudflare|restream`.
- **Compartidas con mención residual:** `supabase/functions/_shared/rate-limiter.ts` L49 — solo un
  comentario (`webhook: Webhooks externos (Bunny, n8n, Restream)`). Cosmético.
- **Migración `supabase/migrations/20260612000011_academy_streaming_layer.sql`** → **NO tocar**, es la
  capa realtime de Academia (presencia/notificaciones), no video en vivo.

---

### Tablas y objetos de BD

**37 tablas** (`backups/pre-simplificacion/manifest.json` → `modules["live-streaming"]`). Con datos solo 4:

| tabla | filas |
|---|---|
| `creator_live_streams` | 9 |
| `live_stream_viewers` | 5 |
| `live_feature_flags` | 4 |
| `live_platform_config` | 1 |

Las otras 33 están a **0 filas**: `live_client_settings`, `live_event_creators`, `live_event_monitoring`,
`live_hosting_hosts`, `live_hosting_requests`, `live_hosting_status_history`, `live_hosting_templates`,
`live_hour_assignments`, `live_hour_purchases`, `live_hour_wallets`, `live_org_oauth_tokens`,
`live_packages`, `live_stream_comments`, `live_stream_history`, `live_stream_products`,
`live_stream_reactions`, `live_streaming_channels`, `live_usage_logs`, `organization_streaming_config`,
`streaming_accounts`, `streaming_analytics_v2`, `streaming_channels_v2`, `streaming_chat_messages_v2`,
`streaming_event_products`, `streaming_events`, `streaming_guests_v2`, `streaming_logs`,
`streaming_overlays_v2`, `streaming_products_v2`, `streaming_providers_config`, `streaming_sales`,
`streaming_session_channels_v2`, `streaming_sessions_v2`.

**FKs entrantes desde fuera del set** (`schema/06_dependencias.md` sección a), total 8):
las 8 apuntan a `campaign_mappings`, `marketplace_campaigns`, `campaign_applications`, `portfolio_posts`.
**Ninguna apunta a una tabla `live_*` / `streaming_*` → cero FKs externas bloquean el DROP.**

**Funciones de BD que las referencian** (mismo doc, sección b): `complete_live_hosting`, `consume_live_hours`
(3 sobrecargas), `create_flash_offer`, `create_streaming_session_for_hosting`,
`create_streaming_session_for_request`, `feature_streaming_product`, `get_active_live_streams`,
`get_hosting_hosts`, `get_live_hosting_requests`, `get_live_stream_by_creator`,
`get_marketplace_hosting_requests`, `get_org_streaming_sessions`, `get_session_analytics_summary`,
`is_creator_live`, `leave_live_viewer`, `log_hosting_request_status_change`,
`log_hosting_host_status_change`, `ping_live_viewer`, `record_live_shopping_purchase`,
`reserve_live_hours`, `update_live_stream_comments_count`, `update_live_stream_likes_count`,
`update_live_stream_viewers_count` — todas exclusivas, se pueden dropear.

**⚠️ `kreoon_merge_client(p_master_id, p_dup_id)` es del CORE (merge de clientes en CRM)** y toca
`live_client_settings`, `live_hosting_requests`, `live_hour_assignments`, `live_usage_logs`,
`streaming_accounts`, `streaming_events`, `streaming_sales`, `streaming_sessions_v2`.
**Hay que reescribirla ANTES de dropear las tablas** o el merge de clientes revienta en runtime.

**Enums a dropear** (`src/integrations/supabase/types.ts`): `live_stream_status` (L40039),
`streaming_platform` (L40158), `streaming_platform_type` (L40166), `streaming_provider` (L40176),
`hosting_channel_type` (L40014), `hosting_request_status` (L40027), y el enum inline de `live_type`.

**Columna residual:** `custom_pricing_agreements.live_shopping_fee_override` (types.ts L12748, L12773, L12798).
Tabla del core → `ALTER TABLE ... DROP COLUMN`, no dropear la tabla.

---

### Dependencias inversas del core

Solo **una** real en código:

| archivo del core | qué importa |
|---|---|
| `src/components/clients/ClientDetailDialog.tsx` L28, L426–429, L1142–1145 | `ClientStreamingChannels` (tab "Canales" del detalle de cliente) |
| `src/components/landing/index.ts` L37–38 | re-export de `LiveShoppingComingSoon` (sin consumidores aguas abajo) |

A nivel de BD, la dependencia inversa crítica es `kreoon_merge_client` (ver arriba).

---

### Dependencias npm que se pueden desinstalar

**NINGUNA.** Esto contradice la pista de partida — verificado con grep:

| paquete | quién lo importa | veredicto |
|---|---|---|
| `hls.js` (`package.json` L81) | `src/components/academy/AcademyVideoPlayer.tsx` L3 + `src/components/video/HLSVideoPlayer.tsx` (consumido por `board/KanbanVideoModal`, `content/unified/PresentationMode`, `UnifiedContentViewer`) | **SE QUEDA** — Academia y el player de contenido |
| `react-player` (L98) | `src/components/academy/AcademyVideoPlayer.tsx` L2 | **SE QUEDA** — Academia |
| `player.js` (L86) | `src/components/academy/AcademyVideoPlayer.tsx` L4 | **SE QUEDA** — Academia |
| `dashjs` / `dash-video-element` | **no están en `package.json`** — son deps transitivas de `react-player@3` | **SE QUEDA** — el chunk `dash.all.min` del build viene de aquí, **no** del módulo de live |

El chunk `dash.all.min` **no** es evidencia de live streaming: sale de `react-player` → `dash-video-element` → `dashjs`,
cadena que existe por el player de Academia.

---

### Riesgos y trampas

1. **`kreoon_merge_client` (BD).** Función viva del CRM que hace `DELETE`/`UPDATE` sobre 8 tablas de
   streaming. `DROP TABLE ... CASCADE` no la borra ni la corrige: queda con referencias muertas y
   falla en runtime la primera vez que un admin fusione dos clientes. **Reescribir primero.**
2. **Falsos positivos por nombre.** No borrar por grep de "live"/"stream":
   - `src/components/academy/live/AcademyLiveToaster.tsx` + `src/hooks/academy/useAcademyLive.ts` →
     realtime/notificaciones de **Academia**. Montado globalmente en `src/App.tsx` L40 (import) y
     **L1534** (mount). **Es el único componente "Live" en el árbol global y se queda.**
   - `src/components/points/SeasonLeaderboardLive.tsx` + matview `season_leaderboard_live` → gamificación.
   - `src/components/profile-builder/blocks/BunnyStreamPlayer.tsx` → embed VOD de Bunny Stream
     (usado por `PortfolioBlock.tsx` L35 y `VideoEmbedBlock.tsx` L6).
   - `src/components/video/*` (`HLSVideoPlayer`, `BunnyVideoPlayer`, `SmartVideoPlayer`, …) y
     `src/hooks/useHLSPlayer` → player de contenido/board.
   - `supabase/migrations/20260612000011_academy_streaming_layer.sql` → Academia.
3. **No hay provider de video/live montado globalmente.** `VideoPlayerProvider` **no existe** en el repo
   (grep vacío). El único mount global "Live" es `AcademyLiveToaster` y se queda. Ese riesgo no aplica.
4. **`CLAUDE.md` está desactualizado**: describe `streaming-webhook`, `streaming-webhook-v2`,
   `cloudflare-live-webhook` y `restream-api` como si existieran. No existen. Actualizar la sección
   *Security → Streaming* y *Integraciones* al cerrar el borrado, o el próximo agente re-explora en falso.
5. **`live_shopping` en `COMMISSION_RATES`** puede estar tipado como `CommissionType` en el módulo
   financiero. Grep de `live_shopping` / `live_hosting_direct` / `live_hosting_whitelabel` en
   `src/components/finance*` antes de tocar `src/lib/finance/constants.ts`, o se rompe el tipado.

---

# Bloque 3 — Marketplace de campañas


Rutas (src/App.tsx): 627 `/marketplace/campaigns` · 637 `/marketplace/campaigns/:id` · 716 `/marketplace/campaigns/create` · 726 `/marketplace/campaigns/:id/edit` · 736 `/marketplace/my-campaigns` · 746 `/marketplace/creator-campaigns` · 796 `/marketplace/campaign-payment/success` · 804 `/marketplace/campaign-payment/cancel` · 1160 `/admin/pending-payments` · 1211 `/campanas-gestionadas` · 577-578 `/casos-de-exito[/:slug]`. Lazy imports: App.tsx:169-186, 208-212, 278-279, 316-317.

### FRONTERA campañas vs contratación directa
- **Hire directo NO toca campañas.** `stripe-webhook/handlers/marketplace.ts:335-400` (`handleCreatorHirePaymentCompleted`) inserta `marketplace_projects` con `creation_mode:"direct_hire"`, `service_id`, `client_user_id`, `stripe_session_id` — **nunca** setea `campaign_id` ni `application_id`. Entrada: `HiringWizard.tsx:308` y `PricingBlock.tsx:385` → `stripe-creator-hire`.
- Las columnas `marketplace_projects.campaign_id` / `application_id` (baseline.sql:21765-21766, nullables) solo las escribe `useMarketplaceProjects.ts:329-330` (createProject desde campaña) y se leen en `useMarketplaceProjects.ts:357-362` (`getProjectsByCampaign`).
- Escrow: `escrow_holds.campaign_id` es UUID **sin FK** (índice parcial baseline.sql:19212). El hire directo no crea escrow_hold (el webhook no lo toca).

| Elemento | Estado | Evidencia |
|---|---|---|
| `marketplace_projects` (tabla, wizard, chat, entregables, revisiones) | SE QUEDA | handlers/marketplace.ts:346,392 (hire la usa sin campaign_id) |
| Columnas `marketplace_projects.campaign_id` / `application_id` | SE MODIFICA (drop tras borrar FKs) | baseline.sql:21765-21766 |
| `useMarketplaceProjects.createProject` params campaign_id/application_id | SE MODIFICA | src/hooks/useMarketplaceProjects.ts:124-125, 329-330 |
| `useMarketplaceProjects.getProjectsByCampaign` | SE VA | src/hooks/useMarketplaceProjects.ts:357-362 |
| `ProjectFromCampaign`-type con `campaign_id` | SE MODIFICA | src/components/marketplace/types/projects.ts:51-52, 185-187 |
| `creator_services` / `stripe-creator-hire` / HiringWizard | SE QUEDA | supabase/functions/stripe-creator-hire/index.ts |
| Escrow / wallets / `escrow_holds` | SE QUEDA | src/modules/wallet/hooks/useEscrow.ts:53+ |
| `CampaignEscrowSection` + tipo `campaign_managed` | SE VA / SE MODIFICA | wallet/components/Escrow/index.tsx:14; escrow.types.ts:18,24; wallet/index.ts:103; EscrowActions.tsx:61 (`cancel_campaign`) |
| `marketplace_reputation`, perfiles, búsqueda, TalentLists, Favoritos, Inquiries, Invitations (org↔creator) | SE QUEDA | MarketplaceInvitationsPage usa `useOrgSentInvitations`, no `campaign_invitations` |
| `content.marketing_campaign_id` (board/marketing) | SE QUEDA — NO es marketplace | TalentProfileModal.tsx:341; UnifiedTalentDetailPanel.tsx:338 |
| CRM email campaigns, analytics de ads, `promotional_campaigns` (referidos) | SE QUEDA — NO es marketplace | referral-service/index.ts:190,679 |

### Archivos a borrar
Páginas: `src/pages/CampaignsFeedPage.tsx`, `CampaignDetailPage.tsx`, `CampaignWizardPage.tsx`, `CampaignEditWizardPage.tsx`, `BrandCampaignsPage.tsx`, `CreatorCampaignsPage.tsx`, `src/pages/marketplace/CampaignPaymentSuccess.tsx`, `CampaignPaymentCancel.tsx`, `src/pages/admin/PendingPaymentsPage.tsx` (100% campañas: PendingPaymentsPage.tsx:39 `marketplace_campaigns`), `src/pages/CaseStudies.tsx`, `src/pages/CaseStudyDetail.tsx` (tabla `campaign_case_studies`).
Decisión aparte: `src/pages/CampanasGestionadasPage.tsx` — ver §4.
Componentes: todo `src/components/marketplace/campaigns/**` (24 archivos: activation/ 3, application/ 2, creator/ 1, feed/ 5, management/ 6, wizard/ 11, SuggestedCreators.tsx), `src/components/marketplace/MembershipGate.tsx` (solo lo usan CampaignWizardPage:21 y CampaignEditWizardPage:35), `src/components/marketplace/org-profile/OrgCampaignsSection.tsx`, `src/modules/wallet/components/Escrow/CampaignEscrowSection.tsx`.
Hooks: `src/hooks/useMarketplaceCampaigns.ts` (1150+ líneas), `useCampaignDeliverables.ts`, `useCampaignInvitations.ts`, `useCampaignNotifications.ts`, `useCampaignROI.ts`, `useBrandActivation.ts`, `src/hooks/marketplace/useSmartMatch.ts`, `useCampaignTemplates.ts`, `useCaseStudies.ts`, `campaign.constants.ts`, `campaign.types.ts`, `src/modules/social/hooks/useCampaignSocialMetrics.ts`, `src/modules/social/components/Analytics/CampaignMetricsDashboard.tsx` (sin caller fuera de social/hooks/index.ts:5).
Tipos: `src/components/marketplace/types/brandActivation.ts`; bloque `Campaign*` de `src/components/marketplace/types/marketplace.ts` (incl. `CampaignPricingMode`).

### Archivos compartidos a modificar (ruta | línea | cambio exacto)
- `src/App.tsx` | 169-186, 208-212, 278-279, 316-317 | borrar lazy imports.
- `src/App.tsx` | 577-578, 627-755, 796-810, 1160-1168, 1205-1219 | borrar bloques `<Route>`.
- `src/components/layout/Sidebar.tsx` | 90, 210, 220-221, 249, 277, 375-381 | quitar ítems Campañas / Mis Campañas / Crear Campaña / Campañas Gestionadas.
- `src/components/layout/MobileNav.tsx` | 260, 323, 326 | idem.
- `src/components/layout/MainLayout.tsx` | 89, 102-103, 616 | idem + comentario de active-state.
- `src/lib/allAppPages.ts` | 90-93, 145 | quitar 5 entradas.
- `src/components/marketplace/MarketplacePage.tsx` | 28-33, 291-296 | quitar lazy `CampaignsFeed` y el tab.
- `src/components/marketplace/MarketplaceTabBar.tsx` | 11, 17, 20, 25 | quitar tab `campaigns` y prop `campaignsCount`.
- `src/components/marketplace/dashboard/MarketplaceDashboardTab.tsx` | 45, 52, 81, 100, 176-230, 334-370 | quitar KPIs, queries `marketplace_campaigns`/`campaign_applications` y sección de campañas públicas.
- `src/hooks/useMarketplaceStats.ts` | 14, 22, 33, 37, 110-133 | quitar `availableCampaigns`/`activeCampaigns` y sus counts.
- `src/pages/CreatorDashboard.tsx` | 124 | quitar query `campaign_applications`.
- `src/components/brands/BrandMemberDashboard.tsx` | 7, 155-156, 300, 367-431, 622-690 | quitar hook, tab y tarjetas de campañas.
- `src/components/marketplace/org-profile/OrgProfilePage.tsx` | 11, 79-95 | quitar import y query `marketplace_campaigns` del `Promise.all` + estado `campaigns`.
- `src/components/marketplace/roles/marketplaceRoleConfig.ts` | 1, 66, 121 | quitar `CampaignPricingMode` y `PRICING_MODE_CONFIG` si no lo usa el perfil de creador (verificar antes).
- `src/hooks/index.ts` | 74, 93-97 | quitar re-exports.
- `src/hooks/marketplace/index.ts` | 10-19 | dejar solo `useBrandCredits`.
- `src/modules/social/hooks/index.ts` | 5 | quitar export.
- `src/modules/wallet/index.ts` | 103 | quitar export; `types/escrow.types.ts` 18, 24 quitar `campaign_name` y `'campaign_managed'`; `components/Escrow/index.tsx` 14; `EscrowActions.tsx` 61 (`cancel_campaign`).
- `src/components/settings/OrganizationPlansPage.tsx` | 117, 121 | quitar features "Postulacion a campanas" / "Prioridad en campanas" (venden campañas).
- `src/providers/OnboardingGateProvider.tsx` | 22 | quitar `/marketplace/campaigns` de la allowlist.
- `src/components/studio/QuickActions.tsx` | 64 | quitar acción "Ver Campañas".
- `src/components/kiro/types/notifications.ts` | 16-17, 131-145 | tipos huérfanos `campaign_started`/`campaign_completed`.
- `src/components/kiro/bridge/KiroNotificationBridge.ts` | 165, 317-319 | mapeo `campaign` → `/campaigns/${id}` (ruta que ni siquiera existe hoy).
- `src/lib/i18n/terminos.ts` | 202-204, 301, 332 | labels `campanas`, `campana_nueva`, `mis_campanas`, `sin_campanas`, `buscar_campana`.
- `src/lib/constants.ts` | 75, 115 | `maxCampaignTitle`, key `campaigns`.
- `src/integrations/supabase/types.ts` / `src/types/database.ts` | — | regenerar tras el DDL.

### Edge functions y MCP
Exclusivas (borrar + su bloque en `supabase/config.toml`): `campaign-checkout` (435 líneas; config.toml:446), `campaign-notifications` (config.toml:109), `campaign-wizard-ai` (config.toml:190), `upload-campaign-media` (config.toml:115; solo lo llama useMarketplaceCampaigns.ts:526,585), `verify-campaign-access` (config.toml:112).
Compartidas a podar:
- `supabase/functions/stripe-webhook/index.ts` | 40, 119-120 | quitar import y rama `metadata.type.startsWith("campaign_")`; borrar `handlers/campaigns.ts` completo (maneja `campaign_publish` y `campaign_bid_payment`, escribe `escrow_holds` + `marketplace_campaigns`).
- `supabase/functions/stripe-webhook/index.ts` | 37, 123-124 y `handlers/marketplace.ts` | 300-330 | rama `managed_campaign_payment` → solo si se elimina también §4. **NO tocar** 38, 125-126 (`creator_hire_payment`) ni `handleClientPackagePaymentCompleted`.
MCP (repo `kreoon-mcp-server/`, no vive en supabase/functions):
- `kreoon-mcp-server/src/tools/campaigns.ts` — borrar (implementa `create_marketplace_campaign`, `list_marketplace_campaigns`, `manage_campaign_application`).
- `kreoon-mcp-server/src/tools/creators.ts` — quitar `score_creator_for_campaign`.
- `kreoon-mcp-server/api/index.ts` | 11, 289, 327-330 | quitar import/registro y las entradas del mapa de scopes.
- `kreoon-mcp-server/src/server.ts` | 37, 60 | quitar entradas de `score_creator_for_campaign`.
- `kreoon-mcp-server/src/permissions.ts` | 58-59, 86, 89 | quitar los 4 tools de las listas. **OJO**: el scope `campaigns:read/write` se reusa como scope genérico de contenido/ADN (api/index.ts:303-326) — **no eliminar el scope**, solo los tools.
- `src/pages/MCPDocumentation.tsx` | 335, 533 | quitar doc de `list_marketplace_campaigns` (y las otras 3 si figuran).

### Tablas y objetos de BD
15 tablas del bloque `marketplace-campanas` (backups/pre-simplificacion/manifest.json). Filas reales: `marketplace_campaigns` 8, `campaign_templates` 6, `promotional_campaigns` 1, resto 0.
BORRAR: `marketplace_campaigns`, `campaign_applications`, `campaign_deliverables`, `campaign_invitations`, `campaign_media`, `campaign_metrics`, `campaign_notifications`, `campaign_templates`, `campaign_case_studies`, `activation_publications`, `publication_verification_queue`, `campaign_roi_metrics` (baseline.sql:65777).
NO borrar pese al nombre: `promotional_campaigns`, `campaign_redemptions`, `campaign_mappings` → sistema de referidos (`referral-service/index.ts:190,679,689`). `managed_campaign_subscriptions` → ver §4.
FKs entrantes hacia `marketplace_campaigns` / `campaign_applications` (baseline.sql):
1. `marketplace_projects.campaign_id` :21765 → marketplace_campaigns
2. `marketplace_projects.application_id` :21766 → campaign_applications
3. `marketplace_media.campaign_id` :21884 → marketplace_campaigns (ON DELETE SET NULL)
4. `scheduled_posts.campaign_id` :39895 (ALTER, SET NULL) → marketplace_campaigns
5. (extra) `brand_credit_transactions.related_campaign_id` :42334 → marketplace_campaigns
6. (extra) `streaming_sessions_v2.campaign_id` :47538 y `live_hosting_requests.campaign_id` :50579 → marketplace_campaigns (módulos ya muertos, verificar si las tablas siguen)
Las 3 y 4 son de tablas que SE QUEDAN → drop de columna, no de tabla.
RPCs a borrar: `activate_campaign`, `approve_campaign_application`, `complete_campaign_delivery`, `get_campaign_media`, `smart_match_creators`, `calculate_engagement_bonus`, `creator_meets_activation_requirements`, `get_eligible_activation_campaigns`, `get_campaign_social_metrics`, `verify_campaign_post` (callers en useMarketplaceCampaigns.ts:620,898,920,942,1029; useBrandActivation.ts:297,419,449; useCampaignSocialMetrics.ts:17,40).

### `/campanas-gestionadas` — venta de servicio UGC de KREOON (§4)
Sí es venta directa con Stripe, y es **independiente del marketplace de campañas**: `CampanasGestionadasPage.tsx:365` → `stripe-campaign-checkout` (planes inicio/crecimiento/escala, precios hardcodeados en la función, index.ts:18-28) → webhook rama `managed_campaign_payment` (stripe-webhook/index.ts:123-124) → `handleManagedCampaignPaymentCompleted` (handlers/marketplace.ts:300-330) → insert en `managed_campaign_subscriptions`. **No lee ni escribe `marketplace_campaigns`.** Se puede conservar tal cual borrando todo lo demás, o borrarlo aparte; es decisión de negocio, no técnica.

### Dependencias inversas del core
Solo 6 archivos fuera del árbol de campañas importan hooks de campañas: `BrandMemberDashboard.tsx:7`, `PendingPaymentsPage.tsx:6` (se borra), `CaseStudies.tsx:3` (se borra), `MembershipGate.tsx:4` (se borra), `MarketplaceDashboardTab.tsx` (query directa, sin import), `OrgProfilePage.tsx:11,79`. Ninguno del flujo de hire.

### Riesgos y trampas
- **`stripe-webhook` es un solo archivo con 8 ramas**: tocar mal el `if/else if` de líneas 119-134 rompe hire directo, paquetes de cliente y Academia. Cambio quirúrgico: borrar únicamente las líneas 119-120 (y 123-124 si aplica §4).
- `campaigns:read` / `campaigns:write` son scopes genéricos del MCP usados por 20+ tools de contenido — borrarlos deja sin permisos todo el MCP.
- `promotional_campaigns` / `campaign_redemptions` / `campaign_mappings` parecen del bloque pero son referidos; `content.marketing_campaign_id` es del board.
- `marketplace_media` y `scheduled_posts` sobreviven: hay que hacer `DROP COLUMN campaign_id` antes de `DROP TABLE marketplace_campaigns`, o el drop falla / cascadea.
- `MembershipGate` se borra pero conviene confirmar que ningún gate de membresía de marketplace lo reusa a futuro (hoy solo 2 callers, ambos wizards de campaña).
- Chunk de build `ActivationCampaignConfig` desaparece: revisar `vite.config.ts` por manualChunks que lo nombre.
- `marketplaceRoleConfig.PRICING_MODE_CONFIG` puede estar usado por el perfil del creador — verificar antes de borrarlo.

---

# Bloque 4 — UP / Reputación / Gamificación


### Triggers sobre content: qué se dispara hoy al mover una tarjeta

`content` tiene **38 triggers**. Solo 3 son de UP. Tabla completa de los relevantes al cambio de estado:

| trigger | evento | función | escribe en | destino |
|---|---|---|---|---|
| `trigger_auto_calculate_points` | AFTER UPDATE | `auto_calculate_points()` | `user_points`, `point_transactions` (vía `add_user_points`), `user_achievements` (cascada `check_perfect_streak` → `trigger_check_achievements`) | **SE ELIMINA** — sistema de puntos legacy |
| `trigger_up_event_on_status` | AFTER UPDATE | `emit_up_event_on_status_change()` | `up_events` (vía `emit_up_event(org,user,...)` 8-args), `up_rules` lectura, `point_transactions` | **SE ELIMINA** — motor UP |
| `trigger_up_events_on_content` | AFTER UPDATE | `trigger_emit_up_event_on_status()` | `up_events` (vía `emit_up_event(key,user,...)` 4-args) | **SE ELIMINA** — motor UP duplicado del anterior |
| `trigger_track_status_change` | BEFORE UPDATE | `track_content_status_change()` | columnas `*_at` de la propia fila | **SE PRESERVA** — timestamps del workflow |
| `on_content_status_change` | AFTER UPDATE | `log_content_status_change()` | `content_history` | **SE PRESERVA** — historial core |
| `trigger_log_status_movement` | AFTER UPDATE | `log_status_movement()` | `content_status_logs` | **SE PRESERVA** — auditoría del board |
| `trg_content_workflow_notification` | AFTER UPDATE OF status | `notify_content_status_change()` | notificaciones | **SE PRESERVA** |
| `trigger_auto_talent_payment_on_paid` | AFTER UPDATE | `auto_talent_payment_on_paid()` | `talent_payments` | **SE PRESERVA** — financiero |
| `trigger_update_editor_stats` + `update_editor_stats_trigger` (duplicados) | AFTER UPDATE | `update_editor_stats_on_completion()` | `profiles.editor_completed_count`, `profiles.editor_on_time_count` | **SE PRESERVA** — escribe en `profiles`, no en tablas UP (frontera: son métricas de talento, no reputación) |
| `auto_zero_payment_ugc_ambassador_*` | BEFORE INS/UPD | `auto_zero_payment_ugc_ambassador()` | la propia fila | **SE PRESERVA** — lee `profiles.is_ambassador` + `user_roles`, **NO** depende de `organization_member_badges` ni de UP |
| `trg_check_referrer_on_content_publish` | AFTER INS/UPD OF is_published | `trigger_check_referrer_unlock()` | `referral_relationships` → `check_and_unlock_access()` | **SE PRESERVA** — referidos, módulo aparte |
| resto (auto_assign_editor, protect_*, guard_*, sync_to_ghl, portfolio_count, audit, sequence_number, …) | — | — | — | **SE PRESERVA** — core |

Triggers en las otras tablas pedidas:
- `content_status_logs`, `content_history`, `project_assignments`: **cero triggers de UP** (`project_assignments` solo tiene `updated_at` + `protect_delete_generic`).
- `talent_payments`: 5 triggers, **ninguno de UP** (guard doble pago, receipt, notificaciones, `sync_content_paid_on_payment`).
- Triggers UP en otras tablas: `reputation_events → trg_reputation_totals` (`update_reputation_totals`), `up_events → trg_update_user_scores` (`update_up_user_scores`), `point_transactions → check_achievements_on_transaction`, `user_points → check_achievements_on_points_update`.

Verificación del punto 3 del encargo:
- `trg_reputation_totals` ✅ existe — sobre `reputation_events`, NO sobre `content`.
- `update_reputation_totals` ✅ existe — escribe `user_reputation_totals`, lee `reputation_seasons` y **`role_archetypes`** (tabla NO listada en el manifest — ver Riesgos).
- `calculate_delivery_points` ✅ existe (`p_organization_id, p_user_id, p_role_key, p_delivery_days, …`) — sin trigger asociado.
- `award_*`: existen `award_reputation_event`, `award_kiro_points`, `award_space_points` (Academia), `award_referral_coins`, `award_brand_referral_credit` (referidos, **se quedan**).
- `sync_user_global_stats` ❌ **NO existe**. Las escrituras a `user_global_stats` no vienen de un trigger de BD; el frontend las lee/escribe desde `useGlobalBadges.ts:184,391` y `useGlobalRanking.ts:40,108`.
- `sync_marketplace_reputation` ✅ existe — ver frontera.
- `close_season_and_distribute_rewards` ✅ existe (+ `close_expired_seasons`, `refresh_season_leaderboard`).

### Efecto de borrar UP sobre el board

**Al mover una tarjeta hoy pasan 4 cosas de UP, todas fire-and-forget:**
1. `auto_calculate_points` suma/resta puntos en `user_points` + fila en `point_transactions` (recorded +10, delivered +10, issue −3, approved-desde-review +2).
2. `emit_up_event_on_status_change` y `trigger_emit_up_event_on_status` insertan en `up_events` (doble emisión: dos triggers distintos para el mismo cambio).
3. Desde el frontend, `updateContentStatusWithUP` llama a `handleUPStatusChange` → `award_reputation_event` → `reputation_events` → `user_reputation_totals` → `sync_marketplace_reputation` + `fn_match_daily_missions`.
4. Nada de esto bloquea el update: los triggers son AFTER y el paso 3 está envuelto en try/catch (`useContentStatusWithUP.ts:73-75, 148-151`).

**Conclusión: borrar UP no rompe el board.** El update real lo hace `update_content_status_rpc` (SECURITY DEFINER, valida `organization_member_roles` o `client_users`, setea status + timestamps). Es core y se preserva íntegro.

**Cambio mínimo en frontend:** NO existe un `useContentStatus` alternativo. En el mismo archivo `src/hooks/useContentStatusWithUP.ts` conviven:
- `updateContentStatus(contentId, newStatus)` (L20) — también llama UP (L46-76).
- `updateContentStatusWithUP(params)` (L94, marcado `@deprecated`) — el que usan todos los callers.
- `updateContentStatusSimple(contentId, newStatus)` (L159) — sin UP, pero usa otro RPC (`update_content_by_id`) y no devuelve `old_status`.

Reemplazo recomendado: **conservar el archivo y las dos firmas exportadas**, borrando solo los bloques UP (L3 import, L46-76 en `updateContentStatus`, L118-151 en `updateContentStatusWithUP`). Cero cambios en los 9 callers. Renombrar el archivo a `useContentStatus.ts` es opcional y toca 10 imports.

Callers actuales (todos siguen funcionando sin tocar):
`src/pages/ContentBoard.tsx:27` · `src/pages/ClientContentBoard.tsx:24,419` · `src/pages/ClientDashboard.tsx:28` · `src/hooks/useContent.ts:5` · `src/hooks/index.ts:39` · `src/components/content/unified/UnifiedContentCard.tsx:11` · `src/components/content/ReviewCard.tsx:25` · `src/components/content/ContentVideoCard.tsx:30` · `src/components/content/ClientContentDetailDialog.tsx:15` · `src/components/client-dashboard/ClientVideoDetailSheet.tsx:11` · `src/components/projects/UnifiedProjectModal/hooks/useUnifiedProject.ts:22`

### Archivos a borrar

**Páginas**
- `src/pages/Ranking.tsx`
- `src/pages/UPDocumentation.tsx`

**Carpetas completas**
- `src/components/points/` (19 archivos: AchievementNotificationProvider, AchievementUnlockToast, BadgeProgressCard, BadgeUnlockAnimation, GlobalBadgesShowcase, GlobalRankingWidget, index.ts, QualityScoreWidget, RoleLeaderboard, RoleUPWidget, SeasonEndCelebration, SeasonLeaderboardLive, SeasonManager, SeasonPrizesShowcase, SeasonUrgencyBanner, SidebarAchievementsWidget, UnifiedBadgesShowcase, UPHistoryTable, UPPermissionsEditor)
- `src/components/gamification/` (DailyMissionsPanel, DailyMissionsSheet, StreakWidget)
- `src/lib/reputation/` (types.ts, index.ts)

**Componentes sueltos**
- `src/components/studio/`: `AchievementCard.tsx`, `AchievementToast.tsx`, `LevelBadge.tsx`, `ProgressToNextLevel.tsx`, `RankingTable.tsx`, `SeasonBanner.tsx` (el resto de `studio/` — ContentStatusBadge, ProductionCard, QuickActions, RatingStars, RecentActivityFeed, CreditsDisplay — no es UP; hay que podar `src/components/studio/index.ts` y `src/lib/studio-system.ts:455` en vez de borrarlos enteros)
- `src/components/dashboard/UPSystemKPIs.tsx`
- `src/components/dashboard/ActiveSeasonBanner.tsx`
- `src/components/team/TalentRanking.tsx`

**Hooks**
- `src/hooks/useUnifiedReputation.ts`, `useUPStatusHandler.ts`, `useUPEngine.ts`, `useUPCreadores.ts`, `useUPEditores.ts`, `useUPSeasons.ts`, `useAchievements.ts`, `useGlobalBadges.ts`, `useGlobalRanking.ts`, `useSeasonLeaderboard.ts`, `useSeasonRewards.ts`, `useStreak.ts`, `useDailyMissions.ts`

**Edge functions**
- `supabase/functions/up-ai-copilot/` — sus 5 acciones son todas UP (quality_score, detect_events, anti_fraud, generate_quests, rule_recommendations). Único caller: `useUPEngine.ts:407,435,462,488,516`. Quitar bloque `[functions.up-ai-copilot]` de `supabase/config.toml:193`.
- `supabase/functions/generate-achievement-icon/` — genera iconos de logros. `config.toml:184`.

### Archivos compartidos a modificar

| ruta | línea | cambio exacto |
|---|---|---|
| `src/App.tsx` | 19, 1524, 1552 | quitar import `AchievementNotificationProvider` y desenvolver el JSX (dejar los hijos) |
| `src/App.tsx` | 131, 1275-1281 | quitar lazy `Ranking` y su `<Route path="/ranking">` |
| `src/App.tsx` | 140, 832 | quitar lazy `UPDocumentation` y su `<Route path="/up-documentation">` |
| `src/components/layout/MainLayout.tsx` | 15 | quitar import `StreakWidget` |
| `src/components/layout/MainLayout.tsx` | 330, 433, 710 | borrar los tres `<StreakWidget size="sm" />` |
| `src/components/layout/MainLayout.tsx` | 126 | quitar item de nav `{ name: "Ranking", href: "/ranking", icon: Trophy }` |
| `src/components/layout/MobileNav.tsx` | 51, 771 | quitar import y `<SidebarAchievementsWidget collapsed={false} />` |
| `src/components/layout/MobileNav.tsx` | 92, 128 | quitar los dos items "Ranking" |
| `src/components/layout/Sidebar.tsx` | 105, 145 | quitar los dos items `{ name: "Ranking", …, tourId: "sidebar-up" }` (revisar si el tour referencia `sidebar-up`) |
| `src/components/layout/AccountMenu.tsx` | 18, 32 | quitar `import { useStreak }` y `const { currentStreak } = useStreak()`; borrar el JSX que pinta la racha |
| `src/pages/Dashboard.tsx` | 40, 41, 43, 44 | quitar 4 imports (UPSystemKPIs, ActiveSeasonBanner, GlobalRankingWidget, SidebarAchievementsWidget) |
| `src/pages/Dashboard.tsx` | 1614, 1619, 1627-1635 | borrar `<ActiveSeasonBanner />`, `<UPSystemKPIs …/>` y el bloque "Gamification - Ranking & Achievements" entero |
| `src/pages/CreatorDashboard.tsx` | 22-27, 31 | quitar imports UP; en L31 conservar solo `VOCABULARIO_ROL` de `@/components/studio` |
| `src/pages/CreatorDashboard.tsx` | 354-357, 468, 475-486, 519-523 | borrar SeasonUrgencyBanner, SeasonBanner, ProgressToNextLevel, RoleUPWidget, bloque "Ranking y Logros" (GlobalRankingWidget + SidebarAchievementsWidget) y bloque "Ranking e historial de puntos" (RoleLeaderboard + UPHistoryTable) |
| `src/pages/EditorDashboard.tsx` | 22-25, 29 | ídem: conservar solo `VOCABULARIO_ROL` |
| `src/pages/EditorDashboard.tsx` | 318-320, 413, 448-452 | ídem que CreatorDashboard |
| `src/pages/UnifiedTalentPage.tsx` | 29, 52, 559 | quitar import `TalentRanking`, el tab `{ key: 'ranking', label: 'Ranking' }` y `<TalentRanking />` |
| `src/pages/settings/sections/PermissionsUnifiedSection.tsx` | 3, 50, 58 | quitar import y los dos `<UPPermissionsEditor …/>`; revisar si la sección queda vacía |
| `src/components/portfolio/profile/ProfileTrustBadges.tsx` | 19, 373 | quitar import y `<UnifiedBadgesShowcase …/>` |
| `src/components/projects/UnifiedProjectModal/tabs/BriefTab.tsx` | 14, 169 | quitar import y `<QualityScoreWidget …/>` |
| `src/components/studio/index.ts` | 6, 9-11, 14-15 | quitar exports LevelBadge, ProgressToNextLevel, AchievementCard, AchievementToast*, RankingTable, SeasonBanner |
| `src/lib/allAppPages.ts` | 163 | quitar entrada `/ranking` |
| `src/lib/developmentModules.ts` | 54-60 | quitar módulo "Ranking" |
| `src/lib/studio-system.ts` | 455 | quitar `titulo: 'Ranking en construcción'` (y revisar NIVELES/INSIGNIAS/getTemporadaActual si quedan huérfanos) |
| `src/hooks/index.ts` | 39 | ajustar si se renombra `useContentStatusWithUP` |
| `src/hooks/useContentStatusWithUP.ts` | 3, 46-76, 118-151 | quitar import `handleUPStatusChange` y los dos bloques UP (ver arriba) |
| `supabase/functions/evaluate-profile-tokens/index.ts` | — | **elimina la lectura de `user_achievements`**; la función se queda (tokens IA) |
| `src/lib/edgeFunctions.ts` | 91 | quitar `GENERATE_ACHIEVEMENT_ICON` |
| `src/components/admin/dashboard/AdminAISection.tsx` | 39, 69 | quitar entradas `"up-ai-copilot"` del mapa de colores/labels |

### RPCs y funciones de BD a eliminar / preservar

**Eliminar** (invocadas desde src o solo desde UP): `award_reputation_event` (`useUnifiedReputation.ts:286`), `get_org_ranking` (`:121`), `get_user_reputation` (`:150`), `get_public_reputation` (`:178`), `check_and_award_global_badges` (`useGlobalBadges.ts:203`), `get_daily_missions` (`useDailyMissions.ts:24`), `refresh_season_leaderboard` (`useSeasonLeaderboard.ts:124`), `close_expired_seasons` (`useUPSeasons.ts:319`).

**Eliminar** (internas): `add_user_points`, `auto_calculate_points`, `emit_up_event` (×2 firmas), `emit_up_event_on_status_change`, `trigger_emit_up_event_on_status`, `update_up_user_scores`, `update_reputation_totals`, `calculate_up_level`, `calculate_reputation_level`, `calculate_level_progress`, `calculate_normalized_score`, `calculate_delivery_points`, `check_perfect_streak`, `check_and_award_achievements`, `trigger_check_achievements`, `fn_bump_user_streak`, `fn_match_daily_missions`, `generate_weekly_missions`, `get_active_season`, `get_global_badges_with_progress`, `get_season_rewards_with_eligibility`, `get_up_setting`, `close_season_and_distribute_rewards`, `refresh_reputation_global`, `initialize_org_points_config`, `create_default_up_config`, `create_default_up_event_types`, `create_default_up_rules`, `set_season_id_creadores`, `set_season_id_editores`, `sync_marketplace_reputation`, `refresh_client_trust_score`, `update_member_level` (si es Academia, ver frontera).

**Preservar**: `update_content_status_rpc`, `get_content_by_id`, `update_content_by_id`, `log_content_status_change`, `log_status_movement`, `track_content_status_change`, `auto_talent_payment_on_paid`, `update_editor_stats_on_completion`, `auto_zero_payment_ugc_ambassador`, `calculate_creator_trust_score`, `grant_badge`/`has_badge`/`revoke_badge`/`get_badge_level`/`update_badge_updated_at` (embajadores — `organization_member_badges`, NO es UP), `award_referral_coins`, `award_brand_referral_credit`, `trigger_check_referrer_unlock`, `award_kiro_points`, y todo el árbol `trg_academy_*` / `mi_*` / `award_space_points` / `bump_*` / `grant_*_badge` (Academia y Kiro tienen su propia gamificación).

### Frontera con marketplace_reputation y con tokens de IA

**`marketplace_reputation` SE QUEDA pero pierde su alimentador.** `sync_marketplace_reputation(p_user_id)` lee `user_reputation_totals` (tabla UP: `lifetime_points`, `lifetime_tasks`, `on_time_rate`) y `creator_reviews`, y hace upsert en `marketplace_reputation` (`global_score`, `global_level`, `total_projects_completed`, `avg_rating`, `on_time_delivery_rate`). Se invoca **solo** desde `award_reputation_event`. Al borrar UP:
- `global_score`, `global_level`, `on_time_delivery_rate`, `total_projects_completed` se **congelan** en su último valor.
- `avg_rating` seguía viniendo de `creator_reviews`, pero ya no se refrescará.
- Decisión requerida: o se reescribe `sync_marketplace_reputation` sobre `creator_reviews` + `marketplace_projects` (sin UP), o se borra la tabla. Frontend no la lee directamente hoy (solo aparece en `src/integrations/supabase/types.ts:19655,38324`).

**`creator_profiles.trust_score` (marketplace) NO es UP y se queda.** `calculate_creator_trust_score()` solo lee `creator_profiles`, `portfolio_items` y reviews. Alimenta `TrustScoreBadge`, `useMarketplaceCreators`, `useCreatorSearch`, `FavoritosPage` y `lib/marketplace/rankingAlgorithm.ts` — todo ese árbol es marketplace puro, **intacto**. El "trust score de talento" que sí muere es `up_client_trust_scores` + `refresh_client_trust_score`.

**Tokens de IA SE QUEDAN.** `evaluate-profile-tokens`, `ai-tokens-service`, `admin-add-tokens`, `ai_tokenization_config`, `profile_token_evaluations`, `AITokenizationPage`, `useProfile.ts:333`. **Único acoplamiento**: `evaluate-profile-tokens/index.ts` lee `user_achievements` — hay que quitar esa lectura o la función revienta al borrar la tabla. `up-ai-copilot` NO es tokens de IA pese al prefijo compartido: es el copiloto del motor UP → se borra.

**Academia y Kiro tienen gamificación propia e independiente** (`academy_member_badges`, `space_*`, `trg_academy_*`, `award_kiro_points`, `useKiroGamification`, `useAcademyGamification`, `useSpaceLeaderboard`, `/academia/:slug/leaderboard`). No comparten tablas con UP → **se quedan**. Confirmar con el lead si Academia también entra en el recorte.

**Embajadores (`organization_member_badges`) NO es UP** — CLAUDE.md ya lo separa. Además `auto_zero_payment_ugc_ambassador` (financiero, sobre `content`) usa `profiles.is_ambassador` + `user_roles`, no esa tabla. Intacto.

### Tablas y objetos de BD

44 tablas en `backups/pre-simplificacion/manifest.json` → `up-reputacion` (total 86.024 filas del backup global; UP aporta el grueso: `user_global_badges` 76.125 filas / 41 MB, `up_events` 3.371, `point_transactions` 2.644, `reputation_events` 1.702, `user_global_stats` 525, `user_achievements` 640, `global_badges` 145, `user_points` 85, `up_editores` 71, `up_reputation_totals` 48, `up_creadores` 44, `up_user_scores` 42, `achievements` 24, `reputation_configs` 18, `role_multipliers` 17, `up_settings` 10, `reputation_global` 9, `up_fraud_alerts` 9, `user_streaks` 7, `up_quality_scores` 6, `mission_templates` 5, `reputation_seasons` 4, `role_points_config` 4, `role_weight_config` 43, `user_daily_missions` 3, `up_seasons` 2; el resto en 0).

Vacías y borrables sin backup adicional: `chronometer_pauses`, `unified_reputation_config`, `up_ai_config`, `up_arbiter_log`, `up_chronometer_pauses`, `up_client_trust_scores`, `up_creadores_totals`, `up_currency_conversions`, `up_editores_totals`, `up_event_types`, `up_permissions`, `up_quest_progress`, `up_quests`, `up_rules`, `up_season_snapshots`, `season_goals`, `season_reward_claims`, `season_rewards`.

**Objeto NO listado en el manifest pero exclusivo de UP: `role_archetypes`** (leída por `update_reputation_totals`: `base_weight`, `complexity_multiplier`). Verificar antes de borrar.

Además: enum `point_transaction_type` (usado por `add_user_points` / `point_transactions`) queda huérfano.

### Dependencias inversas del core

- `content` → 3 triggers UP (AFTER UPDATE, fire-and-forget). Cortarlos es un `DROP TRIGGER` × 3.
- `content` es **leído** por `update_up_user_scores` (para deducir rol creator/editor) y por `emit_up_event` (para deducir `organization_id`). Direccion UP→core, no bloquea.
- `organization_members` es leída por `emit_up_event` (fallback de org). Direccion UP→core.
- `profiles`: `update_editor_stats_on_completion` escribe `editor_completed_count`/`editor_on_time_count`. **No es UP**, se queda.
- `creator_reviews` es leída por `sync_marketplace_reputation` — la dependencia real es al revés (UP lee reviews).
- `evaluate-profile-tokens` (core, tokens IA) → lee `user_achievements` (UP). **Única dependencia core→UP que rompe algo.**
- `useProfile`, `AITokenizationPage`, `AdminAISection` referencian nombres UP pero solo como strings/labels.

### Riesgos y trampas

1. **Doble trigger de emisión UP sobre `content`** (`trigger_up_event_on_status` + `trigger_up_events_on_content`) llamando a **dos sobrecargas distintas** de `emit_up_event`. Al hacer `DROP FUNCTION emit_up_event` hay que dropear las dos firmas o el `DROP` falla por ambigüedad.
2. **`evaluate-profile-tokens` se cae en silencio** si se borra `user_achievements` sin editar la edge function primero. Los tokens de IA sí se quedan.
3. **`marketplace_reputation` se congela**, no se rompe. Decidir explícitamente si se reescribe o se borra — el lead dijo que "se queda", pero sin alimentador es una tabla muerta.
4. **`role_archetypes` no está en el manifest de 44 tablas** — si se borra con el módulo, cualquier otro consumidor se rompe; si no se borra, queda basura. Verificar con `pg_depend`.
5. **`update_editor_stats_on_completion` tiene dos triggers idénticos** sobre `content` (`trigger_update_editor_stats` y `update_editor_stats_trigger`) — no es UP, pero al auditar la lista es fácil confundirlo con gamificación y borrarlo. Escribe en `profiles`, se queda.
6. **`useContentStatusWithUP` está marcado `@deprecated` pero es el que usan los 9 callers**; `updateContentStatus` (la versión "nueva") también llama UP. No asumir que la no-deprecada está limpia.
7. **`tourId: "sidebar-up"`** en `Sidebar.tsx:105,145` — al quitar el item de nav puede romper el onboarding tour si algún step apunta a ese id.
8. **`src/components/studio/` es mixto**: 6 de 13 archivos son UP, el resto (ContentStatusBadge, ProductionCard, …) lo usa el board. Borrar la carpeta entera rompe contenido.
9. **`user_global_stats` no tiene trigger que la mantenga** (`sync_user_global_stats` no existe): la escribe el frontend. Cualquier resto de `useGlobalBadges`/`useGlobalRanking` sin borrar seguirá intentando escribir en una tabla inexistente.
10. **Landing y copy** mencionan "Rankings y Reputación" (`FeaturesSection.tsx:81`, `LandingSections.tsx:490`) — texto de marketing a actualizar, no rompe build.

---

# Bloque 5 — Red social / Feed


Sesión read-only. Todo con evidencia `archivo:línea`. `DUDOSO` = no probado con certeza.

### CORRECCIONES a la clasificación inicial (tablas mal marcadas como social)

Estas 6 tablas estaban en el bloque `social-feed` del manifest pero **NO son del feed. SE QUEDAN todas.**

| Tabla | Veredicto | Por qué se clasificó mal / evidencia |
|---|---|---|
| `saved_items` | **SE MODIFICA (la tabla SE QUEDA)** | Es una tabla polimórfica con discriminador `item_type` (`src/hooks/useSavedItems.ts:5`: `'work_video' \| 'post' \| 'profile' \| 'company' \| 'portfolio_item'`). **Marketplace**: `src/contexts/CreatorFavoritesContext.tsx:33,55,62` usa `item_type='profile'`; `src/components/profile-viewer/ProfileHeader.tsx:28`; `src/pages/portfolio/VideosPage.tsx:311,563`. **Feed**: `src/hooks/useFeedPosts.ts:182` inserta `'portfolio_item'` o `'post'`. → Solo se poda `item_type='post'` y el `toggleSaved` de `useFeedPosts.ts:177-214`; `'portfolio_item'` apunta a `portfolio_items`, que se queda |
| `saved_collections` | **SE QUEDA** | Colecciones de la página `/marketplace/guardados` (`src/App.tsx:658` → `SavedPage.tsx:2`), leídas junto a `saved_items` en `src/hooks/useSavedItems.ts:65,166,192`. Ningún componente del feed la toca |
| `saved_searches` | **SE QUEDA** | Búsquedas guardadas de creadores: `src/hooks/useCreatorMatching.ts:120,137,163,182`. Cero referencias en `pages/portfolio/FeedPage.tsx` o `components/portfolio/feed/` |
| `content_likes` | **SE QUEDA** | Confirmado: son likes de tarjetas del **módulo de contenido**, no del feed. `src/components/content/unified/UnifiedContentModule.tsx:241` filtra `.in('content_id', contentIds)` donde `contentIds` sale de la tabla `content` (`:237`). El toggle vive en `baseline.sql:504-513` (`toggle_content_like`) y el cascade de borrado de usuario la referencia en 6 sitios (`baseline.sql:44873, 46605, 46804, 46999, 49339, 49912`). El feed usa `portfolio_post_likes` + `feed_reactions`, tablas distintas |
| `profile_views` | **SE QUEDA** | Métricas del perfil de talento: `src/hooks/useCreatorMarketplaceProfile.ts:196,233,238,244,250`. Sin caller en el feed |
| `followers` | **SE QUEDA** | El contador/botón de seguidores **sí es parte del perfil público de talento**: `src/pages/PublicCreatorPage.tsx:12` (ruta `/p/:username` y `/@:username`, `src/App.tsx:814-815`) importa `FollowButton` que escribe la tabla en `src/components/social/FollowButton.tsx:46,74,86`. También `src/components/portfolio/profile/ProfileBlocksRenderer.tsx:415` (bloque `PublicStatsBlock` del Profile Builder). Los consumidores del feed (`feed/SuggestedProfiles.tsx:48,57,183`, `FollowersDialog.tsx:53,67,86,100`) se borran, pero la tabla no |
| `marketplace_favorites` | **NO SE TOCA** | Tabla **distinta** de `saved_items`, con su propio hook: `src/hooks/useMarketplaceFavorites.ts:23,69,118,146,211`. No aparece en el bloque `social-feed` del manifest. Confirmado que no la usa ningún archivo del feed |

Falso positivo aclarado: `src/components/content/PublishToPortfolioButton.tsx:39` **no toca la tabla `followers`** — es el valor `'followers'` del enum de visibilidad (`src/types/database.ts:156`: `PortfolioVisibility = 'public' | 'followers' | 'org'`). Su hook publica a `portfolio_items` (`src/hooks/usePublishToPortfolio.ts:45,75,95`), no a `portfolio_posts` → **el flujo "publicar contenido al portafolio" SE QUEDA intacto.**

Bug latente detectado de paso (no bloquea el borrado): `src/components/profile-viewer/ProfileHeader.tsx:28` llama `useSavedItems('creator', creatorId)` y hace `toggleSave()` sin argumentos (`:63`), pero la firma es `useSavedItems(): UseSavedItemsHook` (`src/hooks/useSavedItems.ts:42`) con `toggleSave(itemType, itemId)` (`:34`). El botón Guardar de ese header probablemente no funciona hoy. DUDOSO — no verificado en runtime.

### FRONTERA feed vs talento

| Elemento | Veredicto | Evidencia |
|---|---|---|
| `portfolio_posts` | **SE VA** | Solo lo escriben/leen feed + perfil social: `src/components/portfolio/MediaUploader.tsx:268`, `src/components/portfolio/profile/PortfolioProfile.tsx:156,639,804,1037,1293` |
| `portfolio_post_likes` | **SE VA** | `src/hooks/useFeedPosts.ts:159,166`, `src/components/portfolio/feed/FeedCard.tsx:134` |
| `portfolio_post_comments` | **SE VA** | único caller `src/components/content/PortfolioCommentsSection.tsx:43,84` |
| `portfolio_stories` / `story_views` | **SE VA** | `src/components/portfolio/feed/StoriesBar.tsx:51`, `src/hooks/useStoryViews.ts:24,45,68`, `supabase/functions/cleanup-expired-stories/index.ts:35` |
| `feed_reactions` | **SE VA** | único caller `src/hooks/useFeedPosts.ts:115,122` |
| `social_notifications` | **SE VA (con caveat)** | feed puro en `src/hooks/useSocialNotifications.ts:38` (types follow/like/comment/mention/share). **CAVEAT**: `src/hooks/useContactReveal.ts:110` inserta ahí con `notification_type:'reveal'` (marketplace) — hay que reubicar ese insert antes de borrar |
| `hashtags` / `post_hashtags` | **SE VA** | `src/hooks/useHashtags.ts:19,38,56,67`; el hook NO tiene caller de componente (solo re-export `src/hooks/index.ts:42`). 0 filas en manifest |
| `link_previews` | **SE VA** | `src/hooks/useLinkPreview.ts:36,73`; sin caller (solo `src/hooks/index.ts:113`). 0 filas |
| `favorites`, `kreadores_content_likes` | **SE VA** | 0 referencias en `src/` y `supabase/functions/` (grep vacío). Tablas muertas |
| **`portfolio_items`** | **SE QUEDA** | Fuente de verdad de talento: `src/hooks/useCreatorPublicProfile.ts:268`, `src/hooks/useCreatorStats.ts:113`, `src/hooks/useMarketplaceCreators.ts:191`, `src/components/profile-builder/media/MediaLibraryUploader.tsx:171` |
| `portfolio_items.legacy_post_id` | **SE VA (columna)** | FK → `portfolio_posts(id)` en `supabase/migrations/20260708040000_backfill_legacy_posts_and_feed_rpc.sql:11-14`. `on delete set null`, más índice único parcial `:14`. Hay que dropear columna+índice antes de dropear `portfolio_posts` |
| RPC `get_feed_posts` | **SE VA** | definida en `20260708040000_...sql:78+`; **hace UNION de `portfolio_items` + `portfolio_posts`** (`:120+`). Único caller `src/hooks/useFeedPosts.ts:45` |
| `content_likes` | **SE QUEDA** | Es del **board de contenido**, no del feed: `src/components/content/unified/UnifiedContentModule.tsx:241` (`.in('content_id', contentIds)` sobre tabla `content`). Toggle en `supabase/migrations/00000000000000_baseline.sql:504-513` |
| `followers` | **SE QUEDA** | Usado por el **perfil público de TALENTO**: `src/pages/PublicCreatorPage.tsx:12` → `src/components/social/FollowButton.tsx:46,74,86`. También `src/components/portfolio/profile/ProfileBlocksRenderer.tsx:415` (PublicStatsBlock). El feed también lo usa (`SuggestedProfiles.tsx:48,57,183`) pero no es dueño |
| `saved_items` / `saved_collections` | **SE QUEDA** | Marketplace: `src/contexts/CreatorFavoritesContext.tsx:30,54,61`, `src/components/profile-viewer/ProfileHeader.tsx:28` (`useSavedItems('creator', creatorId)`), página `/marketplace/guardados` (`src/App.tsx:658`) |
| `saved_creators` | **SE QUEDA** | Solo marketplace: `supabase/functions/marketplace-recommendations/index.ts:189,199,224` |
| `saved_searches` | **SE QUEDA** | `src/hooks/useCreatorMatching.ts:120,137,163,182` (búsqueda de creadores) |
| `profile_views` | **SE QUEDA** | `src/hooks/useCreatorMarketplaceProfile.ts:196,233,238,244,250` — métricas de perfil de talento |
| `suggested_profiles_cache` | **SE QUEDA** | Solo `supabase/functions/marketplace-recommendations/index.ts:287,376,389`. `SuggestedProfiles.tsx` (feed) NO la usa |
| `user_feed_events` | **SE QUEDA** | Nombre engañoso: lo escribe `src/hooks/useMarketplaceEvents.ts:19,40,59,77` y lo lee `marketplace-recommendations/index.ts:33`. `src/hooks/useFeedEvents.ts:56` también escribe pero **no tiene ningún caller** (grep vacío) → ese hook SE VA, la tabla NO |
| `user_interest_profile` | **SE QUEDA** | `supabase/functions/marketplace-recommendations/index.ts:134` + `interest-extractor/index.ts:218` |
| `post_metrics` | **SE QUEDA** | Es del **Social Hub** (métricas de posts publicados en IG/TikTok): `src/modules/social/hooks/usePostMetrics.ts:18`, `supabase/functions/social-metrics/index.ts:586` |
| `company_followers` | **DUDOSO** | `src/components/portfolio/CompanyFollowButton.tsx:35` + `src/pages/portfolio/CompanyProfilePage.tsx:149` (`/company/:username`, `src/App.tsx:811`). Esa página lee `clients` + `content`, no `portfolio_posts` → es perfil de marca, no feed. Decidir aparte |
| **`/social-hub` + `src/modules/social/**`** | **SE QUEDA — NO es el feed** | Es publicación programada a redes EXTERNAS: `src/modules/social/hooks/useSocialAccounts.ts:112` → `social-auth/connect`, `useScheduledPosts.ts:241` → `social-scheduler/publish-now`, `PostComposer.tsx`. Ninguna tabla del bloque `social-feed` del manifest salvo `post_metrics` |
| `PublicProfilePage` (`/profile/:userId`) | **SE VA** | `src/App.tsx:812` → renderiza `PortfolioProfile` (`src/pages/portfolio/PublicProfilePage.tsx:8,122`), que es la grilla de `portfolio_posts` + stories + followers |
| `PublicCreatorPage` (`/p/:username`, `/@:username`) | **SE QUEDA** | `src/App.tsx:814-815`; lee `creator_profiles` (`src/pages/PublicCreatorPage.tsx:208`) vía `ProfilePageRenderer`. **NO muestra posts del feed** |
| `ProfileBuilder` | **SE QUEDA (con parche)** | `src/components/portfolio/profile/ProfileBuilder.tsx` no consulta `portfolio_posts` (grep `.from('` vacío). Pero su hermano `ProfileBlocksRenderer.tsx:412` sí (bloque `PublicStatsBlock`) → hay que reescribir ese bloque contra `portfolio_items` |

### Archivos a borrar

Páginas
- `src/pages/portfolio/FeedPage.tsx` (ruta `/feed`, `src/App.tsx:886-903`)
- `src/pages/portfolio/PublicProfilePage.tsx` (`/profile/:userId`, `src/App.tsx:812`)
- `src/pages/portfolio/ProfilePage.tsx` — **huérfano**, sin ruta ni import (grep `pages/portfolio/ProfilePage` vacío)

Componentes feed (`src/components/portfolio/`)
- `feed/FeedCard.tsx`, `feed/FeedGridCard.tsx`, `feed/FeedGridModal.tsx`, `feed/StoriesBar.tsx`, `feed/SuggestedProfiles.tsx`, `feed/CollaborationsFilter.tsx`, `feed/SmartSearchBar.tsx`
- `MediaUploader.tsx` (único caller `FeedPage.tsx:22`)
- `StoryViewer.tsx` (único caller `feed/StoriesBar.tsx:8`), `StoryRing.tsx` (sin caller)
- `PostActionsMenu.tsx` (único caller `PortfolioProfile.tsx:24`)
- `ReportDialog.tsx` (único caller `feed/FeedCard.tsx:19`)
- `SocialNotificationsDropdown.tsx`, `FollowersDialog.tsx` (sin caller externo), `FollowButton.tsx` (portfolio; el vivo es el de `components/social/`)
- `profile/PortfolioProfile.tsx` (solo lo usan las 2 páginas borradas)
- `PortfolioHeader.tsx` + `SmartSearch.tsx` (PortfolioHeader sin caller; SmartSearch solo lo usa PortfolioHeader), `PortfolioHighlights.tsx`, `PortfolioImageThumbnail.tsx`, `PortfolioVideoThumbnail.tsx`, `AICaptionHelper.tsx`, `AIBioHelper.tsx`, `ProfileEditor.tsx` (todos sin caller — verificado por grep)

Componentes (`src/components/social/`) — solo los del feed
- `SocialFeed.tsx`, `SocialFeedCard.tsx` (solo `FeedPage.tsx:13-14`)
- `SuggestedUsers.tsx`, `TrendingSection.tsx`, `UserProfileCard.tsx`, `UserSearchFilters.tsx`, `NotificationsBell.tsx` (sin caller; `NotificationsBell` solo se re-exporta en `src/components/social/index.ts:6`)
- **NO borrar**: `FollowButton.tsx` (usado por `PublicCreatorPage.tsx:12`), `ReactionButton.tsx` (`UnifiedContentViewer.tsx:37`), `RevealContactButton.tsx`, `FollowersModal.tsx`, `FeaturedVideoUploader.tsx`, `FounderBadge.tsx` — todos importados por `PortfolioProfile.tsx:28-32`; al borrar PortfolioProfile reevaluar caso por caso
- `ShareButton.tsx`: solo lo usan `feed/FeedCard.tsx:21` y `feed/FeedGridModal.tsx:13` → SE VA con ellos

Hooks / contexts
- `src/hooks/useFeedPosts.ts`, `useStoryViews.ts`, `useHashtags.ts`, `useLinkPreview.ts`, `useSocialNotifications.ts`, `useFollowersList.ts` (solo `components/social/FollowersModal.tsx:127`), `useFeedEvents.ts` (0 callers)
- `src/contexts/ImmersiveFeedContext.tsx` — **provider global** montado en `src/App.tsx:1529-1547`; solo lo consumen `MainLayout.tsx:18` y `FeedPage.tsx:5`
- `src/hooks/useRecommendations.ts` y `src/hooks/useInterestExtractor.ts`: **0 callers** (grep vacío) → huérfanos, se pueden borrar

### Archivos compartidos a modificar

| Ruta | Línea | Cambio exacto |
|---|---|---|
| `src/App.tsx` | 33, 1529, 1547 | quitar import y wrapper `ImmersiveFeedProvider` |
| `src/App.tsx` | 124, 128-130, 886-903, 812 | quitar lazy `FeedPage`/`PublicProfilePage` y sus `<Route>`; añadir redirect `/feed` → `/marketplace` |
| `src/App.tsx` | 587-595 | los redirects `/social` y `/social/*` → `/marketplace` ya existen; conservar |
| `src/components/layout/MainLayout.tsx` | 14, 331, 434, 583, 711 | borrar import y las 4 instancias de `<SocialNotificationsDropdown />` (queda `IntegratedNotificationHeader` líneas 6/379/482/643/768 como campanita general) |
| `src/components/layout/MainLayout.tsx` | 18, 201, 206 | quitar `useImmersiveFeed`, `isMarketplaceRouteOrFeed`, `hideChromeForFeed` |
| `src/components/layout/MainLayout.tsx` | 71, 79, 87, 113 | borrar 4 entradas `{ name: "Feed", href: "/feed", icon: Compass }` |
| `src/components/layout/MobileBottomNav.tsx` | 4, 16, 27-30 | quitar `useSocialNotifications` y el botón que navega a `/feed` |
| `src/components/kiro/KiroWidget.tsx` | 521 | `isOnFeed = location.pathname === '/feed'` queda muerto → simplificar |
| `src/components/portfolio/profile/ProfileBlocksRenderer.tsx` | 412-420 | `PublicStatsBlock`: cambiar `portfolio_posts` por `portfolio_items` (mantiene `followers`) |
| `src/pages/portfolio/CompanyProfilePage.tsx` | 18-19 | importa `FeedGridCard`/`FeedGridModal` → mover esos 2 componentes a `components/portfolio/` o inlinearlos |
| `src/components/portfolio/EnhancedSmartSearch.tsx` | 246, 352 | usa `followers` y `company_followers`; solo lo importa `FeedPage.tsx:17` → borrar entero salvo que se reubique |
| `src/hooks/useContactReveal.ts` | 110-120 | insert en `social_notifications` (marketplace) → migrar a `user_notifications` antes de dropear la tabla |
| `src/hooks/index.ts` | 42, 63, 113, 124 | quitar re-exports `useHashtags`, `useFollowersList`, `useLinkPreview`, `useFeedEvents` |
| `src/components/social/index.ts` | 6 | quitar export `NotificationsBell` |
| `src/components/content/PortfolioCommentsSection.tsx` | 43, 84 | archivo completo depende de `portfolio_post_comments` → borrar y quitar su uso |
| `src/lib/allAppPages.ts` | 97, 107 | revisar entradas Guardados / Social Hub (ambas SE QUEDAN) |
| `src/components/ProtectedRoute.tsx` | 236 | `SHARED_ROUTES` contiene `'/social'` y `'/explore'` → limpiar |

### Edge functions

| Función | Veredicto | Evidencia |
|---|---|---|
| `cleanup-expired-stories` | **SE VA** | única razón de existir: `portfolio_stories` (`index.ts:35,89`). Config en `supabase/config.toml:175` |
| `feed-recommendations` | **SE VA (DUDOSO)** | lee `user_interest_profile:62` + `user_feed_events:81`; su único caller `src/hooks/useRecommendations.ts:40` **no tiene callers** → cadena muerta |
| `interest-extractor` | **SE QUEDA** | escribe `user_interest_profile` que consume `marketplace-recommendations:134`. Su caller directo `useInterestExtractor.ts` está huérfano, pero la tabla sirve al marketplace |
| `marketplace-recommendations` | **SE QUEDA** | marketplace puro |
| `bunny-portfolio-upload` | **MODIFICAR** | `index.ts:99` escribe `portfolio_stories`; el resto sirve al uploader de contenido (`BunnyMultiVideoUploader.tsx:258`) → quitar solo esa rama |
| `sync-to-kreoon` | **MODIFICAR** | lista de tablas a sincronizar incluye `content_likes:39`, `portfolio_post_likes:53`, `portfolio_post_comments:54`, `portfolio_stories:55`, `story_views:56`, `saved_collections:57`, `saved_items:58`, `social_notifications:59`, `company_followers:111` → depurar |
| `admin-users` | **MODIFICAR** | cleanup de usuario toca `content_likes:632,1129` y `saved_creators:642` (ambas SE QUEDAN); revisar si añade tablas del feed |
| `social-auth`, `social-publish`, `social-scheduler`, `social-metrics`, `social-ai-generator` | **SE QUEDAN** | son del Social Hub (publicación externa), no del feed |
| `portfolio-ai`, `portfolio-image-upload`, `portfolio-item-delete` | **SE QUEDAN** | operan sobre `portfolio_items` (`src/hooks/usePortfolioItems.ts:184`) |
| `admin/social-scraper` | ya eliminado | solo queda redirect `src/App.tsx:1489` |

### Tablas y objetos de BD

SE VAN (7): `portfolio_posts`, `portfolio_post_likes`, `portfolio_post_comments`, `portfolio_stories`, `story_views`, `feed_reactions`, `social_notifications`
SE VAN (muertas, 4): `favorites`, `kreadores_content_likes`, `hashtags`, `post_hashtags`, `link_previews`
SE QUEDAN (12): `portfolio_items`, `content_likes`, `followers`, `saved_items`, `saved_collections`, `saved_creators`, `saved_searches`, `profile_views`, `suggested_profiles_cache`, `user_feed_events`, `user_interest_profile`, `post_metrics`
DUDOSO (1): `company_followers` (atado a `/company/:username`, no al feed)

Objetos derivados:
- RPC `public.get_feed_posts` → DROP (`20260708040000_backfill_legacy_posts_and_feed_rpc.sql:78`)
- `portfolio_items.legacy_post_id` (columna + `idx_portfolio_items_legacy_post`) → DROP **antes** de `portfolio_posts` (FK entrante, `:11-14`)
- CHECK `portfolio_items_source_type_check` incluye `'legacy_post'` (`:20-21`) → recrear sin ese valor; ojo: hay filas backfilleadas con `source_type='legacy_post'` (`:24-44`)
- `idx_portfolio_posts_created` (`:32`)
- Funciones de borrado de usuario (`admin_delete_user_cascade` y variantes) referencian `content_likes` en `baseline.sql:44873, 46605, 46804, 46999, 49339, 49912` → `content_likes` SE QUEDA, no tocar
- Marcar FKs entrantes contra `06_dependencias.md`: **no pude cruzarlo, ese archivo no existe todavía en el scratchpad** (`ls .../mapa` vacío al momento de escribir)

### Dependencias inversas del core

| Archivo del core | Import del feed |
|---|---|
| `src/App.tsx:33` | `ImmersiveFeedProvider` from `@/contexts/ImmersiveFeedContext` |
| `src/components/layout/MainLayout.tsx:14` | `SocialNotificationsDropdown` |
| `src/components/layout/MainLayout.tsx:18` | `useImmersiveFeed` |
| `src/components/layout/MobileBottomNav.tsx:4` | `useSocialNotifications` |
| `src/pages/portfolio/CompanyProfilePage.tsx:18-19` | `FeedGridCard`, `FeedGridModal` |
| `src/components/portfolio/profile/ProfileBlocksRenderer.tsx:412` | query directa a `portfolio_posts` |
| `src/hooks/useCreatorPublicProfile.ts:284` | query directa a `portfolio_posts` (bloque "4. Portfolio posts") |
| `src/hooks/unified/useUnifiedContent.ts:193` | query directa a `portfolio_posts` |
| `src/components/content/PortfolioCommentsSection.tsx:43` | `portfolio_post_comments` |
| `src/hooks/useContactReveal.ts:110` | insert en `social_notifications` |
| `src/components/portfolio/profile/PortfolioProfile.tsx:27` | `FeedGridModal` |

### Riesgos y trampas

1. **`get_feed_posts` mezcla las dos tablas.** El RPC hace UNION `portfolio_items` + `portfolio_posts`; si se borra el feed pero se deja el RPC, queda apuntando a una tabla inexistente. Borrar RPC y tabla en la misma migración.
2. **`legacy_post_id` es FK real hacia `portfolio_posts`** (`20260708040000_...sql:11`). `DROP TABLE portfolio_posts` falla hasta que se dropee columna + índice único. Además `source_type='legacy_post'` quedaría como valor semánticamente huérfano en filas ya migradas.
3. **158 filas de `portfolio_posts` con contenido real** (manifest) y el comentario de la migración dice que **137/158 son de usuarios sin `creator_profile`** (estudiantes/clientes). Ese contenido NO está replicado en `portfolio_items` — se pierde. Confirmar con negocio antes de dropear.
4. **`social_notifications` tiene un writer del marketplace** (`useContactReveal.ts:110`, `notification_type:'reveal'`) con columnas distintas a las que lee el hook del feed (`type`/`content_type` en `useSocialNotifications.ts:8-10`). Ese insert probablemente ya falla en runtime — DUDOSO, no verificado contra el schema real.
5. **La campanita del feed es la única campanita en móvil.** `SocialNotificationsDropdown` aparece en 4 headers de `MainLayout` (331/434/583/711); `IntegratedNotificationHeader` está solo en los bloques desktop (379/482/643/768). Borrarla deja móvil sin notificaciones — hay que sustituirla, no solo quitarla.
6. **`/social-hub` NO es el feed.** Si se borra por confusión de nombre, se rompe toda la publicación programada a IG/TikTok/FB (5 edge functions + 15 hooks en `src/modules/social/`).
7. **Nombres engañosos**: `user_feed_events` es de marketplace, `content_likes` es del board, `post_metrics` es del Social Hub, `saved_*` es de marketplace. Ninguna se va pese a estar listada en el bloque `social-feed` del manifest.
8. **`followers` no se puede dropear**: el botón Seguir del perfil público de talento (`PublicCreatorPage.tsx:12` → `components/social/FollowButton.tsx:46`) depende de ella.
9. `src/components/portfolio/` mezcla feed y talento en la misma carpeta — no borrar la carpeta entera; `CompanyProfileEditor.tsx` lo usa `src/components/clients/ClientDetailDialog.tsx:39` y `PortfolioButton.tsx` lo usan 3 dashboards (`CreatorDashboard.tsx:20`, `EditorDashboard.tsx:20`, `ClientDashboard.tsx:33`).

---

# Trabajo transversal (aplica a todos los bloques)


Alcance: eliminar **live streaming, red social/feed, UP/gamificación, marketplace de campañas, booking**.
Todo lo de abajo es evidencia leída en repo (rutas absolutas) o SELECT en prod (wjkbqcrxwsmvtxmqgiqc).

---

## 1. Árbol global de providers

`src/main.tsx` no monta providers (solo StrictMode + HelmetProvider). Todo el árbol vive en
`src/App.tsx` (`AppContent`, líneas 1508-1565). Orden exacto de fuera hacia dentro:

| # | Provider | Archivo | Estado |
|---|---|---|---|
| 1 | QueryClientProvider | App.tsx:1568 | queda |
| 2 | ThemeProvider (next-themes) | App.tsx:1569 | queda |
| 3 | BrowserRouter | App.tsx:1510 | queda |
| 4 | AccessGateProvider | src/providers/AccessGateProvider.tsx | queda |
| 5 | BrandingProvider | src/contexts/BrandingContext.tsx | queda |
| 6 | AuthProvider | src/hooks/useAuth | queda |
| 7 | AuthStoreBridge | src/stores/AuthStoreBridge | queda |
| 8 | **OnboardingGateProvider** | src/providers/OnboardingGateProvider.tsx | **MIXTO** |
| 9 | RoleLegalGateProvider | src/providers/RoleLegalGateProvider.tsx | queda |
| 10 | CurrencyProvider | src/contexts/CurrencyContext | queda |
| 11 | AnalyticsProvider | src/contexts/AnalyticsContext | queda |
| 12 | ImpersonationProvider | src/contexts/ImpersonationContext | queda |
| 13 | TrialProvider | src/contexts/TrialContext | queda |
| 14 | UnsavedChangesProvider | src/contexts/UnsavedChangesContext | queda |
| 15 | **AchievementNotificationProvider** | src/components/points/AchievementNotificationProvider.tsx | **SE VA** (UP) |
| 16 | StrategistClientProvider | src/contexts/StrategistClientContext | queda |
| 17 | AICopilotProvider | src/contexts/AICopilotContext | queda |
| 18 | **KiroProvider** | src/contexts/KiroContext.tsx | **MIXTO** |
| 19 | GenerationJobProvider | src/contexts/GenerationJobContext | queda |
| 20 | **ImmersiveFeedProvider** | src/contexts/ImmersiveFeedContext | **SE VA** (feed) |
| 21 | TooltipProvider | ui/tooltip | queda |
| 22 | CreatorFavoritesProvider | src/contexts/CreatorFavoritesContext | queda (favoritos de talento) |

Componentes globales dentro del árbol: `AcademyLiveToaster` (App.tsx:1534) es **Academia**, NO
live streaming — no tocar. `MarketplaceReadinessPopup` (1537) es marketplace de talento — queda.

**Providers mixtos, qué podar:**

| Provider | Archivo:línea | Qué podar |
|---|---|---|
| OnboardingGateProvider | src/providers/OnboardingGateProvider.tsx:22 | `'/marketplace/campaigns'` de `PUBLIC_ROUTES` |
| KiroProvider | src/contexts/KiroContext.tsx:242 | `'/ranking': 'escuela'` de `ROUTE_TO_ZONE` |
| KiroProvider | src/contexts/KiroContext.tsx:237 | `'/marketing': 'sala-de-prensa'` (ruta ya muerta, redirect en App.tsx:1485) |
| KiroProvider | src/contexts/KiroContext.tsx:277-280 | `ZONE_INFO['escuela'].description = 'Formación y ranking'` → quitar "y ranking" |

**Respuesta a la pregunta concreta (zonas KIRO):** SÍ. Las zonas se definen en
`ROUTE_TO_ZONE` (KiroContext.tsx:205-243) y `ZONE_INFO` (246-282). De las 8 zonas, solo
`escuela` apunta a un módulo que se va (`/ranking`). `sala-de-prensa` apunta a `/marketing`
(ya redirigida). Ninguna zona apunta a live/feed/booking/campañas. La zona `escuela`
sobrevive por Academia (`/academy`, `/training`).

Además, fuera del context:
- `src/components/kiro/KiroWidget.tsx:517-521` — `isOnFeed = location.pathname === '/feed'`, layout especial de KIRO en el feed. Podar.
- `src/components/kiro/bridge/KiroNotificationBridge.ts:317-319` — `case 'campaign'/'project'` → `/campaigns/${id}`, **ruta que hoy ni existe** (bug preexistente). Podar el case `campaign`.

---

## 2. Navegación completa

| Archivo | Línea | Elemento | Rol | Cambio |
|---|---|---|---|---|
| src/components/layout/MainLayout.tsx | 71 | bottom nav "Feed" | editor | quitar item |
| MainLayout.tsx | 79 | bottom nav "Feed" | creator | quitar item |
| MainLayout.tsx | 87 | bottom nav "Feed" | client | quitar item |
| MainLayout.tsx | 89 | bottom nav "Campañas" → /marketplace/my-campaigns | client | quitar item |
| MainLayout.tsx | 102 | clientMoreItems "Crear Campaña" | client | quitar |
| MainLayout.tsx | 103 | clientMoreItems "Campañas Gestionadas" | client | quitar |
| MainLayout.tsx | 113 | bottom nav "Feed" | admin | quitar item |
| MainLayout.tsx | 126 | ADMIN_MORE_ITEMS_BASE "Ranking" | admin | quitar |
| MainLayout.tsx | 201, 205-206 | `isMarketplaceRouteOrFeed`, `useImmersiveFeed()`, `hideChromeForFeed` | todos | quitar lógica de feed |
| MainLayout.tsx | 616 | comentario sobre /marketplace/my-campaigns | — | actualizar |
| MainLayout.tsx | 147 | Academia "Feed" (`/academia/:slug/feed`) | todos | **NO TOCAR** (Academia) |
| src/components/layout/Sidebar.tsx | 84 | MARKETING_ITEMS "Social Hub" | admin/estr./editor/creator | quitar |
| Sidebar.tsx | 90 | CONFIG_ITEMS "Campañas Gestionadas" | idem | quitar |
| Sidebar.tsx | 105 | adminSections "Ranking" | admin | quitar |
| Sidebar.tsx | 145 | strategistSections "Ranking" | estratega | quitar |
| Sidebar.tsx | 210 | clientSections "Campañas Gestionadas" | client | quitar |
| Sidebar.tsx | 220-221 | clientSections MARKETPLACE "Mis Campañas" + "Crear Campaña" | client | quitar |
| Sidebar.tsx | 242 | basicTalentInOrg sección "SOCIAL" (único item) | talento básico | **sección queda vacía** |
| Sidebar.tsx | 249 | basicTalentInOrg "Campañas" | talento básico | quitar |
| Sidebar.tsx | 277 | freelanceSections "Campañas" | freelance | quitar |
| Sidebar.tsx | 284 | freelanceSections sección "SOCIAL" (único item) | freelance | **sección queda vacía** |
| Sidebar.tsx | 377 | getMarketplaceSections "Campañas" | admin/talento | quitar |
| Sidebar.tsx | 381 | getMarketplaceSections "Mis Campañas" | admin/talento/client | quitar |
| Sidebar.tsx | 392 | getMarketplaceSections "Guardados" | admin/talento | quitar |
| Sidebar.tsx | 632 | comentario `adminOnly items (streaming/live)` | — | limpiar comentario |
| src/components/layout/MobileNav.tsx | 74 | MARKETING_ITEMS "Social Hub" | varios | quitar |
| MobileNav.tsx | 92 | adminSections "Ranking" | admin | quitar |
| MobileNav.tsx | 128 | strategistSections "Ranking" | estratega | quitar |
| MobileNav.tsx | 209-211 | freelance "MARKETING & MEDIA": Social Hub + comentario "Live module coming soon" | freelance | **sección queda vacía** |
| MobileNav.tsx | 253 | basicTalentInOrg "SOCIAL" (único item) | talento básico | **sección queda vacía** |
| MobileNav.tsx | 260 | basicTalentInOrg "Campañas" | talento básico | quitar |
| MobileNav.tsx | 323 | getMarketplaceSections "Campañas" | varios | quitar |
| MobileNav.tsx | 326 | getMarketplaceSections "Mis Campañas" | varios | quitar |
| MobileNav.tsx | 337 | getMarketplaceSections "Guardados" | varios | quitar |
| src/components/layout/MobileBottomNav.tsx | 1-85 | archivo completo (`/feed`, `/explore`, useSocialNotifications) | — | **CÓDIGO MUERTO: no se importa en ningún sitio** (grep: solo se auto-referencia). Borrar entero |
| src/components/layout/MoreMenuSheet.tsx | 34-39 | items default (Academia/IA/Cobros/Config) | creator/editor | sin cambios |
| src/components/ProtectedRoute.tsx | 81 | CLIENT_ALLOWED_ROUTES: `'/live'`, `'/social-hub'` | client | quitar |
| ProtectedRoute.tsx | 234 | ORG_ROUTES: `'/ranking'` | org | quitar |
| ProtectedRoute.tsx | 236 | SHARED_ROUTES: `'/social'`, `'/live'`, `'/social-hub'` | todos | quitar |
| src/lib/allAppPages.ts | 90-93 | Campañas / Crear Campaña / Mis Campañas / Campañas como Creador | QA | quitar |
| allAppPages.ts | 97 | Guardados | QA | quitar |
| allAppPages.ts | 107 | Social Hub | QA | quitar |
| allAppPages.ts | 145 | Campañas Gestionadas | QA | quitar |
| allAppPages.ts | 163 | Ranking | QA | quitar |
| src/lib/developmentModules.ts | 53-60 | módulo `ranking` (+ item de menú `/ranking`) | UnderConstructionGuard | quitar |
| developmentModules.ts | 64-69 | módulo `marketing` (`/marketing`, ya redirigida) | — | quitar (limpieza) |
| src/pages/welcome/WelcomeUGCColombia.tsx | 52 | CTA → /marketplace/campaigns | onboarding | repuntar a /marketplace |
| src/pages/Content.tsx | 294 | CTA creador → /marketplace/campaigns | creator | repuntar a /marketplace |
| src/components/board/EnhancedContentCard.tsx | 771 | botón → /social-hub | board | quitar botón |
| src/components/brands/BrandMemberDashboard.tsx | 431, 631, 650 | CTAs → /marketplace/my-campaigns | client/marca | quitar |
| src/components/marketplace/dashboard/MarketplaceDashboardTab.tsx | 52, 342, 352, 382 | "Explorar Campañas" + links a campañas | marketplace | quitar bloque |
| src/pages/CaseStudies.tsx | 30 · CaseStudyDetail.tsx:164 | CTA → /marketplace/campaigns/create?quick=true | público | repuntar |
| src/components/marketplace/calculator/UGCPriceCalculator.tsx | 94 | → /marketplace/campaigns/create | público | repuntar |

**Menús que quedan cortos o vacíos (explícito):**
- `brandMobileNavigation` (MainLayout.tsx:85-90): pierde 2 de 4 → queda **Hub + Talento + "Más" = 3 slots**. Es el peor caso; hay que rellenar (p.ej. Producciones, Facturas) o rediseñar.
- `creatorMobileNavigation` (77-82), `editorMobileNavigation` (69-74), `adminMobileNavigation` (111-116): pierden Feed → **4 slots** (3 items + Más).
- Sidebar sección `SOCIAL` en `basicTalentInOrgSections` (239-244) y `freelanceSections` (281-286): **quedan vacías** → eliminar la sección entera (`combineNavSections` ya filtra `items.length > 0`, Sidebar.tsx:341, así que no rompe, pero deja el label muerto en el código).
- MobileNav `MARKETING & MEDIA` de freelance (207-212) y `SOCIAL` de basicTalent (250-255): **quedan vacías**.
- `MARKETING_ITEMS` (Sidebar.tsx:83-86 / MobileNav.tsx:73-76): pasa de 2 a 1 item (solo Generador de Anuncios) — sobrevive.
- Sidebar `clientSections` MARKETPLACE (215-223): de 4 a 2 items.

---

## 3. Planes y suscripciones

Consultado por SELECT en prod:

- **`plan_features`** — 54 filas, tiers `creator_free` / `creator_pro` / `creator_premium`. TODAS son features del **Profile Builder** (`max_blocks`, `allowed_templates`, `reveal_contact`, `portfolio_max_items`, `ai_seo_optimizer`, …). **Cero filas** con feature_key de live/streaming/feed/social/campaign/booking/gamif/ranking → **0 filas huérfanas**.
- **`platform_subscriptions`** — 16 filas. Claves de `plan_limits` por tier: `brand_starter` {ai_tokens, content_per_month, storage_gb, users}, `creator_pro` {ai_tokens, projects, storage_gb}, `org_pro` {admin_users, ai_tokens_monthly, creators, editors, features, max_clients, max_users, storage_gb, strategists}. Ninguna clave de los 5 módulos. DUDOSO: no inspeccioné el contenido del array `features` de `org_pro` (1 fila).
- **`academy_plans`** — 2 filas, Academia, **se queda**.
- **`live_feature_flags`** — 4 filas activas (`platform/global`, `platform/platform`, 1 organization, 1 client), todas `is_enabled=true`. **Tabla huérfana al borrar live** → candidata a DROP.
- **`managed_campaign_subscriptions`** — **0 filas**. Huérfana al borrar campañas gestionadas → DROP sin riesgo de datos.
- `src/pages/PlanesPage.tsx`: grep de campañ/live/streaming/feed/ranking/gamific/booking → **sin coincidencias**. La página de planes no vende ninguno de los 5 módulos.

---

## 4. Notificaciones

`SELECT type, entity_type, count(*) FROM user_notifications GROUP BY 1,2` (prod, hoy):

| type | entity_type | filas |
|---|---|---|
| status_change | content | 4193 |
| mention | content | 422 |
| assignment | profile | 35 |
| content_update | client_onboarding | 24 |
| message | chat | 22 |

**Ninguna combinación pertenece a los 5 módulos que se van → 0 notificaciones huérfanas.**

Mapa de types en el frontend:
- `src/hooks/useUserNotifications.ts:9` — unión TS: `'content_update' | 'mention' | 'assignment' | 'status_change' | 'recruitment_request'`.
- `src/components/kiro/bridge/KiroNotificationBridge.ts:65` — `PLATFORM_NOTIFICATION_MAP` con exactamente esas 5 keys (líneas 69, 85, 100, 116, 131).
- **Nada que quitar ahí por esta limpieza.** Sí hay que podar `generateActionRoute` case `'campaign'` (KiroNotificationBridge.ts:317).
- ⚠️ **Preexistente, no causado por el borrado**: `message` existe en prod (22 filas) y NO está en la unión ni en `PLATFORM_NOTIFICATION_MAP` → `PLATFORM_NOTIFICATION_MAP[type]` devuelve `undefined`. Vale revisarlo mientras se toca el archivo.
- Tabla aparte: `campaign_notifications` (`src/hooks/useCampaignNotifications.ts:91,115,145,228`) — es del módulo de campañas, se va completa con él. No comparte tabla con `user_notifications`.

---

## 5. Rutas huérfanas y redirecciones (propuesta)

Ya existen redirects en `src/App.tsx:1484-1501` para `/streaming/*`, `/live`, `/live/*`,
`/booking/*`, `/book/*` (→ `/dashboard`) y `/social`, `/social/*` (→ `/marketplace`, App.tsx:588-595).
**Live y booking ya están desmontados de rutas**; el trabajo real es el resto.

| Ruta a borrar | App.tsx | Redirect propuesto |
|---|---|---|
| `/feed` | 886 | `/board` (rol interno) — es el que más links guardados tendrá |
| `/ranking` | 1275 | `/dashboard` |
| `/social-hub` | 1110 | `/settings` (lo usan client y talento; `/dashboard` es admin-only) |
| `/marketplace/campaigns`, `/campaigns/:id`, `/create`, `/:id/edit` | 627, 637, 716, 726 | `/marketplace` |
| `/marketplace/my-campaigns`, `/creator-campaigns` | 736, 746 | `/marketplace` |
| `/marketplace/guardados` | 658 | `/marketplace/favoritos` |
| `/marketplace/campaign-payment/success` \| `/cancel` | 796, 803 | `/marketplace` (links de retorno de Stripe: dejar vivos ≥1 ciclo de facturación) |
| `/campanas-gestionadas` | 1211 | `/planes` |
| `/up-documentation` | 832 | `/dashboard` (doc del sistema UP) |
| `/admin/social-scraper` | 1489 | ya es redirect a `/admin/analytics`; puede eliminarse |

⚠️ **Trampa existente**: `/live` y `/social-hub` están en `CLIENT_ALLOWED_ROUTES`
(ProtectedRoute.tsx:81) pero `/live` redirige a `/dashboard`, que es `allowedRoles:["admin"]`
(App.tsx:858) → un `client` con ese bookmark cae en Unauthorized. Al elegir destinos de
redirect, usar rutas alcanzables por el rol.

---

## 6. Realtime

Suscripciones **montadas globalmente** (todo el árbol, sin importar ruta):

| Hook/Componente | Archivo:línea | Canal / tabla | Estado |
|---|---|---|---|
| AchievementNotificationProvider | src/components/points/AchievementNotificationProvider.tsx:30-37 | `new-achievements-*` → `user_achievements` INSERT | **SE VA** (UP) — es la única global de un módulo que muere |
| useKiroPlatformSync | src/components/kiro/bridge/useKiroPlatformSync.ts:201-287 | `kiro_platform_sync_*` → `user_notifications` INSERT/UPDATE/DELETE | queda |
| usePresence / useClientRealtimeNotifications | montados en MainLayout.tsx:190,193 | presencia / contenido cliente | quedan |
| useNewContentNotifications | App.tsx:568 (AppRoutes) | contenido | queda |

No globales, mueren con su módulo: `useUPEngine`, `useUPCreadores`, `useUPEditores`,
`useAchievements`, `useGlobalBadges`, `useGlobalRanking`, `useSeasonRewards`,
`useSeasonLeaderboard` (UP); `useCampaignNotifications` (campañas);
`useSocialNotifications` (solo lo usa `MobileBottomNav`, que es código muerto).
Quedan: `useRealtimeMarketplaceProjects`, `useMarketplaceProposals`, `useMarketplaceNotifications`,
`useRealtimeFinanceSync`, `useRealtimeContent`, hooks `academy/*`.

---

## 7. Service worker / PWA

`vite.config.ts:105-280`. **No hay ninguna ruta de aplicación en la config PWA**:
`globPatterns` (142-149) precachea solo `index.html` + chunks vendor/index;
`navigateFallback: undefined` (152); `includeAssets` (109) = favicon/robots.
`runtimeCaching` cachea por origen (Supabase functions/rest/storage, Bunny, fuentes), no por ruta.

Único punto a revisar: las reglas `bunny-hls-manifest-v1` (241) y `bunny-hls-segments-v1` (259)
se agregaron en "Fase 3.7" junto con el feed inmersivo. **DUDOSO**: el mismo pipeline HLS de
Bunny lo usa el módulo de contenido/portafolio, así que probablemente siguen haciendo falta —
verificar antes de tocar. No hay assets ni entradas de manifest específicos de los 5 módulos.

---

# Bloque 0 — Plan de base de datos


Proyecto `wjkbqcrxwsmvtxmqgiqc` · set = 135 tablas · **SQL propuesto, NO ejecutado**.
Método: `pg_proc.prosrc ~* '\m<tabla>\M'` cruzado contra tablas que SE QUEDAN.

---

## 1. Las 133 funciones dependientes

| Grupo | Conteo |
|---|---|
| (a) SE ELIMINAN — solo tocan tablas del set | **87** |
| (b) SE MODIFICAN — tocan tablas que SE QUEDAN | **33** |
| (c) DUDOSAS | **13** |

### (b) SE MODIFICAN — 33. Estas rompen producción.

| # | Función | Tablas que SE QUEDAN que toca | Qué podar | Riesgo |
|---|---|---|---|---|
| 1 | `admin_delete_user_cascade(uuid)` | 74 tablas core (profiles, content, payments, clients, organization_members, wallets, marketplace_projects, portfolio_items…) | Borrar los 31 `DELETE FROM <set>`; conservar el resto en el mismo orden | 🔴 **Máximo** — es la única vía segura de borrar usuarios (`supabase/functions/admin-users/index.ts`). Si queda apuntando a tablas muertas, todo borrado de usuario falla |
| 2 | `auto_approve_stale_content()` | content, content_history, organizations, organization_statuses | Quitar el bloque que inserta en `reputation_events` y el lookup de `reputation_seasons` | 🔴 **Máximo** — cron activo `jobid 16` diario 06:00. Es la auto-aprobación de 5 días del board |
| 3 | `create_streaming_session_for_hosting()` | (trigger sobre `escrow_holds`) | Función entera muere → **DROP TRIGGER `trg_escrow_create_streaming_session` ON escrow_holds** antes del DROP de tablas | 🔴 **Máximo** — trigger vivo sobre tabla del financiero |
| 4 | `trigger_check_referrer_unlock()` | referral_relationships, profiles, creator_profiles, content, portfolio_items | Sustituir el conteo sobre `portfolio_posts` por `portfolio_items` (el backfill ya migró los datos) | 🟠 Alto — 4 triggers vivos (content, creator_profiles, portfolio_items, profiles) |
| 5 | `kreoon_merge_client(uuid,uuid)` | clients, client_users, products, content, client_packages, social_accounts, +10 | Quitar los 10 `UPDATE`: company_followers, live_client_settings, live_hosting_requests, live_hour_assignments, live_usage_logs, marketplace_campaigns, streaming_accounts, streaming_events, streaming_sales, streaming_sessions_v2 | 🟠 Alto — merge de clientes duplicados |
| 6 | `issue_academy_certificate(uuid,uuid)` | academy_* (8 tablas), profiles | Quitar el `INSERT INTO reputation_events` | 🟠 Alto — Academia SE QUEDA; llamada desde `academy-grade-attempt` y `useAcademyCertificate.ts` |
| 7 | `award_space_points(...)` | academy_space_points, academy_space_point_events | Quitar el `INSERT INTO reputation_events` | 🟠 Alto — puntos de espacios Academia |
| 8 | `award_referral_coins(...)` | organization_members | Quitar `reputation_events`; decidir dónde acreditar las monedas | 🟠 Alto — `supabase/functions/referral-service` |
| 9 | `get_referral_gate_status(uuid)` | referrals, referral_codes, referral_relationships, profiles, creator_profiles, content, portfolio_items | Reemplazar el conteo de `portfolio_posts` por `portfolio_items` | 🟠 Alto — `src/hooks/useReferralGate.ts` |
| 10 | `count_qualified_referrals(uuid)` | referral_relationships, profiles, creator_profiles, content, portfolio_items | Igual que la anterior | 🟠 Alto |
| 11 | `get_creator_unified_stats(uuid)` | creator_profiles, creator_reviews, marketplace_projects, content, portfolio_items | Quitar el bloque `saved_creators` (contador de guardados) | 🟠 Alto — `src/hooks/useCreatorPublicProfile.ts` |
| 12 | `search_marketplace_creators(...)` | creator_profiles, organizations, content, portfolio_items, user_specializations | Quitar el join/subquery a `portfolio_posts` | 🟠 Alto — `useMarketplaceSearch.ts`, `useCreatorSearch.ts` |
| 13 | `get_unified_talent(uuid)` | organization_members, creator_profiles, profiles, content | Quitar el join a `up_user_scores` (o devolver 0) | 🟠 Alto — `src/hooks/useUnifiedTalent.ts` |
| 14 | `get_org_talent_roster(uuid)` | organization_members, organization_member_roles, profiles, content | Quitar `up_creadores_totals` / `up_editores_totals` | 🟠 Alto — `CreatorsContent.tsx` |
| 15 | `get_org_account_snapshots(uuid,int)` | social_accounts, social_account_snapshots | Quitar `profile_views` | 🟡 Medio — `useSocialMetrics.ts` |
| 16 | `sync_marketplace_reputation(uuid)` | marketplace_reputation, creator_reviews | Quitar la lectura de `user_reputation_totals` | 🟡 Medio |
| 17 | `refresh_reputation_global(uuid)` | creator_reviews | Escribe en `reputation_global` + lee `up_user_scores` (ambas mueren) → candidata a DROP, salvo que se rehaga sobre `creator_reviews` | 🟡 Medio |
| 18 | `recalc_creator_portfolio_count(uuid)` | creator_profiles, content, portfolio_items | Quitar `portfolio_posts` del conteo | 🟡 Medio |
| 19 | `sync_profile_to_marketplace(uuid)` | profiles, creator_profiles, content, portfolio_items | Igual | 🟡 Medio |
| 20 | `sync_user_health(uuid)` | platform_user_health, creator_profiles | Quitar métricas de `campaign_applications` | 🟡 Medio |
| 21 | `update_talent_performance_scores(uuid,uuid)` | talent_performance_history, profiles, content | Quitar escritura en `up_quality_scores` | 🟡 Medio |
| 22 | `check_and_pause_chronometer(...)` | content | Cronómetro del board escribe en `chronometer_pauses` (del set) → si el board conserva pausas, `chronometer_pauses` NO debe borrarse | 🟠 **Revisar antes de borrar** |
| 23 | `get_content_paused_hours(uuid,text)` | — | Igual que arriba | 🟠 Revisar |
| 24 | `resume_chronometer(uuid,text)` | — | Igual que arriba | 🟠 Revisar |
| 25-26 | `emit_up_event(...)` ×2 overloads | content, organization_members | Ambas mueren con UP; verificar que ningún trigger de `content` las llame | 🟡 Medio |
| 27 | `auto_calculate_points()` | (trigger `trigger_auto_calculate_points` ON content) | Escribe `user_points` → **DROP TRIGGER antes del DROP TABLE** | 🟠 Alto |
| 28 | `create_user_global_stats()` | (trigger ON profiles) | Escribe `user_global_stats` → DROP TRIGGER | 🟠 Alto |
| 29 | `sync_profile_to_global_stats()` | (trigger ON profiles) | Idem | 🟠 Alto |
| 30 | `update_user_last_active()` | user_global_stats | Sin trigger detectado; DROP | 🟢 Bajo |
| 31 | `sync_user_global_stats(...)` | user_global_stats | DROP | 🟢 Bajo |
| 32 | `check_and_award_achievements(uuid)` | profiles | DROP (achievements/user_achievements/user_points mueren) | 🟢 Bajo |
| 33 | `toggle_content_like(uuid,text)` | content | DROP con `content_likes` | 🟢 Bajo |

### (c) DUDOSAS — 13

`activate_campaign`, `approve_campaign_application`, `create_project_from_application`, `complete_campaign_delivery`, `assign_editor_to_project`, `complete_live_hosting` — escriben en `marketplace_projects` / `escrow_holds` / `unified_wallets` (**se quedan**) pero solo se disparan desde el flujo de campañas. Confirmar que la contratación directa Stripe no las reutiliza antes de borrarlas.
`get_role_weight`, `get_org_ranking`, `get_org_ranking_normalized`, `update_reputation_totals` — ranking de talento (`useUnifiedReputation.ts`); decidir si el módulo Talento conserva ranking.
`get_feed_posts(...)` ×2 — feed social; muere con el módulo salvo que el feed TikTok (Fase 3.7) siga apuntando ahí.
`notify_on_portfolio_comment()` — toca `content`, pero es trigger del feed.

### (a) SE ELIMINAN — 87
Todo el resto: `booking_*` (7), `consume_live_hours` ×3, `reserve_live_hours`, `live_*`/`streaming_*` (18), `campaign_*`/`can_*_campaign`/`is_campaign_invitee`/`smart_match_creators` (14), `up_*`/`create_default_up_*`/`calculate_up_level` (12), `season_*`/`close_*_season*` (5), followers/likes/hashtags/stories/missions/badges/streaks (26).

---

## 2. Triggers en tablas que SE QUEDAN cuya función toca el set — 8

| Tabla (se queda) | Trigger | Función | Tablas del set | Acción |
|---|---|---|---|---|
| `escrow_holds` | `trg_escrow_create_streaming_session` | `create_streaming_session_for_hosting` | live_hosting_hosts, live_hosting_requests, streaming_sessions_v2 | **DROP TRIGGER** (financiero) |
| `content` | `trigger_auto_calculate_points` | `auto_calculate_points` | user_points | DROP TRIGGER |
| `content` | `trg_check_referrer_on_content_publish` | `trigger_check_referrer_unlock` | portfolio_posts | Reescribir función (portfolio_items) |
| `creator_profiles` | `trg_check_referrer_on_profile_update` | `trigger_check_referrer_unlock` | portfolio_posts | Idem (misma función) |
| `portfolio_items` | `trg_check_referrer_on_portfolio_insert` | `trigger_check_referrer_unlock` | portfolio_posts | Idem |
| `profiles` | `trg_check_referrer_on_profiles_avatar` | `trigger_check_referrer_unlock` | portfolio_posts | Idem |
| `profiles` | `on_profile_created_create_global_stats` | `create_user_global_stats` | user_global_stats | DROP TRIGGER |
| `profiles` | `on_profile_updated_sync_global_stats` | `sync_profile_to_global_stats` | user_global_stats | DROP TRIGGER |

> Los 8 se ejecutan **antes** del primer `DROP TABLE`. Con `trigger_check_referrer_unlock` basta un `CREATE OR REPLACE` (los 4 triggers apuntan a la misma función).

---

## 3. Vistas / matviews — 2

| Objeto | Tipo | Uso en código | Veredicto |
|---|---|---|---|
| `season_leaderboard_live` | matview (reputation_seasons, user_reputation_totals) | `src/hooks/useSeasonLeaderboard.ts:57`; leída por `close_season_and_distribute_rewards` y `get_season_rewards_with_eligibility` (`20260407100006_gamification_part6_triggers.sql`) | Solo la consume el módulo de reputación → **DROP MATERIALIZED VIEW**, y borrar `useSeasonLeaderboard.ts` |
| `creator_availability_status` | view (creator_availability) | Cero referencias en `src/` y `supabase/functions/`. Solo en el baseline (con guard `EXCEPTION WHEN undefined_table`) | **DROP VIEW**, sin impacto |

Nada del core las consulta.

---

## 4. FKs entrantes — 8

| # | Sentencia recomendada | Impacto en frontend |
|---|---|---|
| 1 | `ALTER TABLE public.marketplace_projects DROP COLUMN campaign_id;` | 🔴 **Se lee hoy**: `useMarketplaceProjects.ts:329,362` (`.eq('campaign_id', …)`), `marketplace/types/projects.ts`. Hay que limpiar hook + tipos en el mismo PR |
| 2 | `ALTER TABLE public.marketplace_projects DROP COLUMN application_id;` | 🔴 Igual: `useMarketplaceProjects.ts:125,330,361` |
| 3 | `ALTER TABLE public.brand_credit_transactions DROP COLUMN related_campaign_id;` | 🟡 Solo tipado (`components/marketplace/types/marketplace.ts:932`); no hay query que lo filtre |
| 4 | `ALTER TABLE public.marketplace_media DROP COLUMN campaign_id;` | 🟡 Revisar `CampaignMediaUpload.tsx` — el componente muere con el módulo |
| 5 | `ALTER TABLE public.scheduled_posts DROP COLUMN campaign_id;` | 🟡 `modules/social/hooks/useScheduledPosts.ts` (1 uso). Alternativa conservadora: `DROP CONSTRAINT scheduled_posts_campaign_id_fkey` y dejar la columna huérfana |
| 6 | `ALTER TABLE public.portfolio_items DROP COLUMN legacy_post_id;` | 🟢 Cero usos en `src/`. Solo en la migración de backfill. Ojo: se pierde la trazabilidad post→item |
| 7 | `ALTER TABLE public.alerts DROP COLUMN campaign_mapping_id;` | 🟢 Cero usos en `src/` |
| 8 | `ALTER TABLE public.creatives DROP COLUMN campaign_mapping_id;` | 🟢 Cero usos en `src/` |

Si se prefiere no perder datos ya: `DROP CONSTRAINT <nombre>` en vez de `DROP COLUMN` (los nombres exactos están en `06_dependencias.md`). Deja columnas huérfanas pero es reversible.

---

## 5. Orden de borrado (55 FKs internas al set)

Regla: hojas → padres. **Antes de todo**: los 8 triggers del §2, las 2 vistas del §3, las 8 FKs del §4, y todas las funciones (a)+(c).

**Booking (16)**
1. `booking_reminder_logs`, `booking_webhook_logs`, `booking_question_answers`, `calendar_event_mappings`
2. `bookings`, `booking_custom_questions`, `booking_reminder_settings`, `calendar_blocked_events`
3. `booking_event_types`, `booking_webhooks`, `calendar_integrations`
4. `booking_availability`, `booking_exceptions`, `booking_branding`

**Live streaming (34)**
1. `live_stream_comments`, `live_stream_products`, `live_stream_reactions`, `live_stream_viewers`, `live_hosting_status_history`, `streaming_analytics_v2`, `streaming_chat_messages_v2`, `streaming_guests_v2`, `streaming_session_channels_v2`, `streaming_event_products`, `live_usage_logs`, `live_hour_assignments`, `live_event_creators`, `live_event_monitoring`, `streaming_sales`, `streaming_logs`, `streaming_overlays_v2`, `live_stream_history`
2. `creator_live_streams`, `live_hosting_hosts`, `streaming_products_v2`, `streaming_channels_v2`
3. `live_hosting_requests` → 4. `streaming_sessions_v2`
5. `streaming_events`, `streaming_accounts`, `live_hour_wallets`, `live_hour_purchases`, `live_packages`, `live_client_settings`, `live_platform_config`, `live_feature_flags`, `live_hosting_templates`, `live_org_oauth_tokens`, `live_streaming_channels`, `organization_streaming_config`, `streaming_providers_config`

> ⚠️ `live_hosting_requests` ↔ `streaming_sessions_v2` se referencian en ambos sentidos: primero `ALTER TABLE live_hosting_requests DROP CONSTRAINT …_session_id_fkey`, luego el orden de arriba.

**Campañas (18)**
1. `publication_verification_queue`, `campaign_metrics`, `campaign_redemptions`
2. `activation_publications` → 3. `campaign_deliverables` → 4. `campaign_applications`
5. `campaign_case_studies`, `campaign_invitations`, `campaign_media`, `campaign_notifications`
6. `marketplace_campaigns` → 7. `campaign_templates`
8. `campaign_mappings`, `promotional_campaigns`, `managed_campaign_subscriptions`

**UP / reputación (34)**
1. `up_creadores_totals`, `up_editores_totals`, `up_user_scores`, `up_season_snapshots`, `up_quest_progress`, `up_arbiter_log`, `up_fraud_alerts`, `up_quality_scores`, `up_events`, `up_chronometer_pauses`, `up_creadores`, `up_editores`, `up_client_trust_scores`, `up_currency_conversions`
2. `up_seasons`, `up_quests`, `up_rules`, `up_event_types`, `up_permissions`, `up_ai_config`, `up_settings`
3. `season_reward_claims` → `season_rewards` → `achievements`
4. `reputation_events`, `user_reputation_totals`, `reputation_global` → `reputation_seasons`
5. `user_global_badges` → `global_badges`; `user_daily_missions` → `mission_templates`
6. `user_achievements`, `user_points`, `point_transactions`, `user_streaks`, `user_global_stats`, `role_multipliers`, `role_points_config`, `role_weight_config`, `reputation_configs`, `unified_reputation_config`, `season_goals`

**Social / feed (33)**
1. `post_hashtags` → `hashtags`
2. `portfolio_post_likes`, `portfolio_post_comments`, `story_views`, `post_metrics` → `portfolio_posts`
3. `portfolio_stories`, `content_likes`, `kreadores_content_likes`, `feed_reactions`, `followers`, `company_followers`, `favorites`, `saved_items`, `saved_creators`, `saved_searches` → `saved_collections`
4. `profile_views`, `link_previews`, `social_notifications`, `suggested_profiles_cache`, `user_feed_events`, `user_interest_profile`, `creator_availability`, `chronometer_pauses`

**Sobre `CASCADE`**: no hace falta si se sigue este orden y se hacen antes los §2–§4. Usarlo enmascara dependencias descubiertas después del snapshot (una vista o FK creada entre el dump y el borrado) y las elimina en silencio. Recomendación: `DROP TABLE public.x;` sin CASCADE; si falla, leer el error y añadir la dependencia al plan, no ponerle CASCADE.

---

## 6. Datos con valor de negocio que se pierden

| Tabla | Qué se pierde | ¿Lo muestra hoy un módulo que SE QUEDA? |
|---|---|---|
| `up_creadores_totals`, `up_editores_totals`, `up_user_scores` | Scores históricos de talento (creadores/editores) | 🔴 **Sí** — `get_org_talent_roster` / `get_unified_talent` en `useUnifiedTalent.ts` y `CreatorsContent.tsx` (página Talento) |
| `user_reputation_totals`, `reputation_events`, `reputation_global` | Reputación histórica por org y rol | 🟠 Parcial — `sync_marketplace_reputation` alimenta `marketplace_reputation` (se queda) |
| `up_quality_scores` | Calidad histórica de talento | 🟠 Alimenta `talent_performance_history` (se queda) vía `update_talent_performance_scores` |
| `user_points`, `point_transactions`, `user_achievements`, `user_global_stats`, `user_streaks` | Puntos, logros, rachas, ranking global | 🟡 Solo el módulo que se va |
| `marketplace_campaigns` + `campaign_applications` | Histórico de campañas pagadas y postulaciones | 🟠 `brand_credit_transactions` y `marketplace_projects` apuntan ahí; los proyectos quedan sin origen |
| `portfolio_posts` | Feed social histórico | 🟢 Ya migrado a `portfolio_items` (backfill `20260708040000`) |
| `streaming_sales`, `live_usage_logs`, `live_hour_wallets` | Ventas de live shopping y horas consumidas/compradas | 🟡 Ninguno lo muestra hoy |
| `bookings` | Agenda histórica y respuestas de invitados | 🟡 Ninguno |

**Recomendación**: exportar a CSV `up_*_totals`, `up_user_scores`, `user_reputation_totals`, `reputation_events`, `marketplace_campaigns`, `campaign_applications` antes del DROP, aunque el manifest ya tenga el schema.

---

## 7. Cron jobs (pg_cron activo, 20 jobs)

| jobid | Job | Toca el set | Acción |
|---|---|---|---|
| 16 | `auto-approve-stale-content` (`0 6 * * *`) → `auto_approve_stale_content()` | **Sí**: `reputation_events`, `reputation_seasons` | 🔴 Podar la función (§1-b nº2). **No desactivar el job** — es la auto-aprobación de 5 días del board |

Los otros 19 (escrows, referidos, tokens IA, exchange rates, social-scheduler ×3, nómina quincenal, Academia ×8, Stripe reconcile) **no tocan ninguna tabla del set**: ninguna de sus funciones aparece en las 133. Sin acción.

---

## 8. Publicación `supabase_realtime` — 13 tablas del set

`creator_live_streams`, `live_stream_comments`, `point_transactions`, `social_notifications`, `story_views`, `streaming_events`, `up_events`, `up_quest_progress`, `up_quests`, `up_user_scores`, `user_achievements`, `user_points`, `user_reputation_totals`

Antes del DROP:

```sql
ALTER PUBLICATION supabase_realtime DROP TABLE
  public.creator_live_streams, public.live_stream_comments, public.point_transactions,
  public.social_notifications, public.story_views, public.streaming_events,
  public.up_events, public.up_quest_progress, public.up_quests, public.up_user_scores,
  public.user_achievements, public.user_points, public.user_reputation_totals;
```

Adicionalmente hay que buscar y eliminar los `.channel(...).on('postgres_changes', { table: '<x>' })` en `src/` para esas 13 tablas, o los suscriptores quedan colgados sin error visible.
