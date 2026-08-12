# Registro de la simplificación · KREOON

Bitácora de la eliminación de módulos. Un bloque por sesión.
Punto de retorno global: tag `pre-simplificacion`. Respaldo de datos: `backups/pre-simplificacion/`.
Línea base: `docs/SIMPLIFICACION_BASELINE.md`. Mapa: `docs/MAPA_ELIMINACION.md`.

---

## Bloque 0 · Pre-requisitos de base de datos — 2026-08-11

No se eliminó ninguna tabla. Se desacoplaron las 5 piezas vivas que se habrían roto al dropear.

| Pieza | Cambio | Verificación |
|---|---|---|
| `auto_approve_stale_content()` | Sin `reputation_events` / `reputation_seasons` | Criterio del cursor idéntico carácter por carácter; cron `jobid 16` intacto |
| `admin_delete_user_cascade()` | 111 → 91 `DELETE` | Conjunto y orden verificados; ejecutada sobre un usuario real en transacción revertida |
| `kreoon_merge_client()` | Sin los 10 reapuntes a live/streaming/campañas | 0 sentencias a tablas muertas |
| Gate de referidos (3 funciones) | De `portfolio_posts` a `portfolio_items` | Ejecutan sin error (antes lanzaban 42703) |
| `evaluate-profile-tokens` | Sin la lectura de `user_achievements` | Desplegada; responde error controlado |
| `trg_escrow_create_streaming_session` | Eliminado de `escrow_holds` | Los otros 2 triggers del escrow intactos |

Commit: `1605c5db`.

---

## Bloque 1 · Booking / Agenda — 2026-08-11

**Estado previo:** el módulo ya estaba desmontado del frontend. La ruta `/booking/*` era un
redirect, no había páginas ni componentes, y las 3 edge functions no tenían un solo caller.

### Archivos borrados (4)

| Archivo | Qué era |
|---|---|
| `src/hooks/useCreatorAvailability.ts` | Único consumidor de `creator_availability`, sin callers |
| `supabase/functions/calendar-google-auth/` | OAuth de Google Calendar (0 callers) |
| `supabase/functions/calendar-google-callback/` | Callback OAuth (0 callers) |
| `supabase/functions/calendar-google-sync/` | Sync de eventos como bloqueos (0 callers) |

Las 3 funciones se retiraron también del proyecto Supabase con `supabase functions delete`
(verificado: responden 404; `academy-google-calendar` sigue viva y responde 401).

### Archivos modificados (7)

| Archivo | Cambio |
|---|---|
| `src/App.tsx` | Fuera los redirects `/booking/*` y `/book/*` |
| `src/hooks/index.ts` | Fuera el re-export de `useCreatorAvailability` |
| `src/hooks/useCreatorMarketplaceProfile.ts` | Fuera la consulta a `creator_availability` del `Promise.all`, su desestructuración, el bloque de procesado y el campo `availability` del perfil |
| `src/types/marketplace.ts` | Fuera `AvailabilityStatus`, `AVAILABILITY_STATUS_LABELS/COLORS`, `CreatorAvailability`, `CreatorAvailabilityInput`, `PreferredProjectSize` y los 3 campos que los usaban |
| `src/hooks/usePlatformTrash.ts` | Fuera la etiqueta `booking_event_types` |
| `supabase/config.toml` | Fuera el bloque de las 3 funciones |
| `supabase/functions/ai-creator-matching/index.ts` | **No estaba en el mapa.** Consultaba `creator_availability` para puntuar disponibilidad. Ahora lee `creator_profiles.is_available`: `true` suma 10 puntos, `false` no suma, `null` mantiene el comportamiento anterior (7 puntos, "asumimos disponible"). Redesplegada |
| `src/integrations/supabase/types.ts` | Regenerado con `supabase gen types` |

### Base de datos

Migración `20260811234000_drop_booking_module.sql`. Orden: vista → RPCs → tablas → funciones de
trigger → enums. Los dos primeros intentos fallaron con `2BP01` y enseñaron el orden correcto:
`get_creator_availability` devuelve el row-type de la tabla (va antes que ella) y
`auto_booking_event_type_slug` tiene un trigger encima (va después).

- **15 tablas**: `bookings`, `booking_availability` (5 filas), `booking_branding`,
  `booking_custom_questions`, `booking_event_types` (1 fila), `booking_exceptions`,
  `booking_question_answers`, `booking_reminder_logs`, `booking_reminder_settings`,
  `booking_webhook_logs`, `booking_webhooks`, `calendar_blocked_events`,
  `calendar_event_mappings`, `calendar_integrations`, `creator_availability`.
- **1 vista**: `creator_availability_status`.
- **12 funciones** y **2 enums** (`booking_status`, `booking_location_type`).

Comprobado antes de ejecutar: 0 llaves foráneas entrantes, 0 tablas en `supabase_realtime`,
0 RPCs con callers. Comprobado después: 0 objetos restantes y ninguna función del resto de la
base referencia una tabla borrada.

**No se tocó**, pese al parecido de nombres: `get_booking_tracking_pixels` y `log_ad_conversion`
(son del módulo de ads, usan `booking_config_id`, que no tiene relación con esto),
`academy-google-calendar` y las tablas `academy_*_calendar_tokens` (Academia),
`creator_profiles.is_available` (la disponibilidad real del marketplace, 526 filas intactas) y
`daily-reminders` (digest del board de contenido).

### Rollback

1. Estructura: `backups/pre-simplificacion/schema/01_tables.sql` (+ `02`…`05`), buscando el
   bloque de cada tabla.
2. Datos: `node backups/pre-simplificacion/tools/make-restore-sql.mjs booking <tabla>` y pegar
   el SQL resultante en el editor de Supabase.
3. Código: `git revert` del commit de este bloque.

### Verificación

| Chequeo | Resultado |
|---|---|
| `npm run build` | ✅ en verde, 4 min 2 s |
| `npx tsc --noEmit -p tsconfig.app.json` | ✅ exit 0 |
| Imports rotos (grep de `useCreatorAvailability`, `creator_availability`, `/booking`) | ✅ ninguno |
| Objetos rotos en la base | ✅ ninguno |

### Números

| Métrica | Antes (línea base) | Después | Δ |
|---|---:|---:|---:|
| Peso de `dist/` | 23.307.089 B | 23.306.902 B | −187 B |
| Chunks JS | 390 | 390 | 0 |
| Rutas (`<Route`) | 165 | 163 | −2 |
| Páginas | 160 | 160 | 0 |
| Archivos en `src` | 1.946 | 1.945 | −1 |
| Edge functions | 169 | 166 | −3 |
| Tablas en la base | — | — | −15 |

**Lectura honesta:** el bundle baja 187 bytes. Booking era código muerto: no había nada que
descargar al navegador. Lo que se gana es base de datos y superficie mental, no peso.

### Lección para los bloques siguientes

El mapa daba booking como "0 dependencias inversas" y había una: la edge function
`ai-creator-matching` consultaba `creator_availability`. No apareció en el mapa porque la
búsqueda de dependencias inversas se centró en `src/`. **En los bloques 2 a 5 hay que hacer el
grep de nombres de tabla también sobre `supabase/functions/`, y hacerlo DESPUÉS del `DROP`**,
que es cuando salta lo que quedó colgando.

### Pendiente

Probar en el navegador el flujo core (login → clientes → board → mover tarjeta → guiones).
Se intentó automatizar con la extensión de Chrome y falló al fijar la pestaña; queda para
verificación manual. Riesgo bajo: `npm run build` y `tsc --noEmit` están en verde, no queda
ninguna referencia a tablas borradas y las consultas del perfil público responden.

---

## Bloque 2 · Live streaming — 2026-08-11

**Estado previo:** igual que booking, el frontend ya estaba desmontado (`/live`, `/live/*` y
`/streaming/*` eran redirects). Quedaban 2 componentes residuales y las 37 tablas.

### Archivos borrados (2)

| Archivo | Qué era |
|---|---|
| `src/components/clients/ClientStreamingChannels.tsx` | CRUD de canales de streaming en el detalle de cliente (tab "Canales") |
| `src/components/landing/LiveShoppingComingSoon.tsx` | Banner "Live Shopping — próximamente" de la landing, ya sin consumidores |

### Archivos modificados (11)

| Archivo | Cambio |
|---|---|
| `src/App.tsx` | Fuera los 3 redirects (`/streaming/*`, `/live`, `/live/*`) |
| `src/components/clients/ClientDetailDialog.tsx` | Fuera el import, el tab "Canales" y su contenido; fuera el icono `Radio`, ya huérfano |
| `src/components/landing/index.ts` | Fuera los 2 re-exports |
| `src/components/ProtectedRoute.tsx` | Fuera `/live` de `CLIENT_ALLOWED_ROUTES` y de `SHARED_ROUTES` |
| `src/lib/i18n/terminos.ts` | Fuera el bloque de términos de streaming |
| `src/lib/finance/constants.ts` | Fuera 3 tarifas de `COMMISSION_RATES`: `live_shopping`, `live_hosting_direct`, `live_hosting_whitelabel`. Verificado: `CommissionType` se deriva de ese objeto pero nadie usaba esas 3 claves, y `ambassador_commission_config` no tiene ninguna fila con ellas |
| `src/config/service-catalog.ts` | Fuera el servicio `live_streaming` (0 productos lo habían elegido) y el icono `Radio` |
| `src/lib/profile-builder/generateBlocksFromTemplate.ts` | Fuera el mapeo `live_streaming: 'Video'` (0 bloques guardados de ese tipo) |
| `src/components/layout/Sidebar.tsx`, `MobileNav.tsx` | Comentarios que mencionaban el módulo |
| `src/integrations/supabase/types.ts` | Regenerado |

**Se conserva `live_streamer`**: es una etiqueta de especialidad de perfil de creador, no el módulo.

### Base de datos

Migración `20260812000000_drop_live_streaming_module.sql`, más una de cola para un huérfano.

- **96 políticas RLS** (van primero: `org_members_select_hosting_requests` referencia
  `live_hosting_hosts`, que a su vez tiene una FK hacia `live_hosting_requests` — sin soltar la
  política antes no existe ningún orden de DROP posible entre esas dos tablas)
- **3 tablas fuera de `supabase_realtime`** antes del DROP
- **37 tablas** (19 filas en total: `creator_live_streams` 9, `live_stream_viewers` 5,
  `live_feature_flags` 4, `live_platform_config` 1; las otras 33 vacías)
- **29 funciones** (28 + `is_streaming_org_member`, un helper de RLS que quedó huérfano y se
  detectó al regenerar los tipos)
- **17 enums** y la columna `custom_pricing_agreements.live_shopping_fee_override` (0 filas con valor)

Verificado antes: 0 FKs entrantes, 0 vistas, 0 cron jobs, ningún enum usado por tablas que se
quedan, y `complete_live_hosting` —la única función que tocaba `escrow_holds`— sin callers y con
0 filas en ambas tablas. Verificado después: 0 objetos restantes; la única mención que queda es
un comentario dentro de `kreoon_merge_client`, sin ninguna sentencia real.

**El "ciclo" que anunciaba el mapa no existía**: solo hay FK en un sentido
(`live_hosting_requests.streaming_session_id` → `streaming_sessions_v2`). La bidireccionalidad
era lógica, del trigger, no declarativa.

### Rollback

Documentado al final de la migración: estructura desde `backups/pre-simplificacion/schema/01..05`,
datos con `make-restore-sql.mjs live-streaming <tabla>` (solo 4 tablas tenían filas), y los
cuerpos de las 29 funciones desde el historial de git (`git show pre-simplificacion`), porque el
respaldo de esquema cubre tablas, índices, políticas y triggers, pero no funciones.

### Verificación

| Chequeo | Resultado |
|---|---|
| `npm run build` | ✅ en verde |
| Referencias a las 37 tablas en `src/` y `supabase/functions/` | ✅ ninguna (grep post-DROP) |
| `live_shopping_fee_override` en código | ✅ ninguna |
| Objetos rotos en la base | ✅ ninguno |
| `escrow_holds`, `custom_pricing_agreements` | ✅ intactas (0 y 10 filas) |

### Números

| Métrica | Línea base | Tras bloque 1 | Tras bloque 2 | Δ acumulado |
|---|---:|---:|---:|---:|
| Peso de `dist/` | 23.307.089 B | 23.306.902 B | 23.299.180 B | −7.909 B |
| Rutas | 165 | 163 | 160 | −5 |
| Archivos en `src` | 1.946 | 1.945 | 1.943 | −3 |
| Componentes | 1.035 | 1.035 | 1.033 | −2 |
| Edge functions | 169 | 166 | 166 | −3 |
| Tablas dropeadas | — | 15 | 52 | −52 |

Sigue sin haber ahorro de peso real: los dos módulos eliminados hasta ahora ya no cargaban nada
en el navegador. Lo que baja es la base de datos: **52 tablas menos**.

### Textos públicos que prometían el módulo (segunda pasada)

Un barrido más amplio, después del commit principal, encontró que la plataforma **seguía
vendiendo live streaming de cara al público**:

| Dónde | Qué decía | Acción |
|---|---|---|
| `LandingSections.tsx` · sección `KreoonLiveSection` | Sección entera "KREOON Live — Transmite en vivo, vende productos…" con 4 features | Borrada (39 líneas). Estaba definida pero **no se usaba en ninguna página**: código muerto que igualmente había que retirar |
| `LandingSections.tsx` · hero | "Gestión integral de contenido, IA, talento, pagos, **live streaming** y más" | Reescrito sin la promesa |
| `LandingSections.tsx` · módulos | Tarjeta "KREOON Live" con `status: 'live'` | Borrada |
| `LandingSections.tsx` · plan Growth ($139/mes) | Vendía **"KREOON Live"** como feature del plan | Borrada — se estaba cobrando por algo que ya no existe |
| `LandingSections.tsx` · lista de features | "Live streaming integrado" | Borrada |
| `UnifiedTalentDetailDialog.tsx` | Opción `<option value="live_streaming">` en el selector de tipo de contenido del talento | Borrada, por coherencia con `service-catalog` |

**Se conservan** por ser etiquetas de especialidad de creador, no del módulo: `live_streamer`
(`marketplaceRoleConfig.ts`, `specializations.ts`), `streaming` como categoría de perfil
(`HeroBannerBlock.tsx`), y las opciones "TV / Streaming" y "Video en vivo" del cuestionario de ADN.

**Pendiente para los bloques 4 y 5:** la landing todavía vende "Sistema UP" (`LandingHeader.tsx:27`,
`LandingSections.tsx:173`, `:296`) y "Red social profesional" (`:168`, `:295`), y el plan Starter
los incluye como features. Se limpian al eliminar esos módulos.

**Lección:** el grep de nombres de tabla no basta. Hay que buscar también el **nombre comercial**
del módulo en la interfaz y en los planes de precios.

---

## Bloque 3 · Marketplace de campañas — 2026-08-12

Primer módulo con frontend **vivo**. Aquí empieza el ahorro real de bundle.

### Dinero: la decisión 4, resuelta sin tocar Stripe

`stripe-campaign-checkout` construía los precios con `price_data` **inline** (planes inicio /
crecimiento / escala, importes escritos en el propio código), no con productos ni precios
persistentes del catálogo de Stripe. Al borrar la función desaparece el checkout: **no queda
ningún link de pago vivo que desactivar**. Las sesiones ya creadas y no pagadas expiran solas.

### Código

**Borrados: 66 archivos** — 12 páginas, la carpeta `components/marketplace/campaigns/` entera,
`MembershipGate`, `OrgCampaignsSection`, `CampaignEscrowSection`, `CampaignMetricsDashboard`,
10 hooks, los tipos de activación de marca, y `useSmartMatch` (recibía un `campaignId`, 0 consumidores).

**Modificados: ~25 archivos.** Los delicados:

| Archivo | Cambio |
|---|---|
| `supabase/functions/stripe-webhook/index.ts` | Fuera la rama `campaign_*` y la de `managed_campaign_payment`, y sus dos imports. **Intactas las 5 ramas vivas**: paquetes de cliente, contratación directa, curso de Academia, suscripción de Academia y acceso de organización |
| `handlers/campaigns.ts` | Borrado entero |
| `handlers/marketplace.ts` | Fuera `handleManagedCampaignPaymentCompleted`. El resto (hire directo, paquetes) intacto |
| `handlers/payments.ts` | Fuera el early-return de `campaign_*` |
| `kreoon-mcp-server` | Fuera `tools/campaigns.ts`, `score_creator_for_campaign` (definición, dispatch, implementación y tipos), y las entradas de los 4 tools en permisos, scopes y registro. **El scope `campaigns:read/write` NO se toca**: lo reusan 20+ tools de contenido y ADN |
| `src/hooks/useMarketplaceProjects.ts` | Fuera `getProjectsByCampaign` y los campos `campaign_id`/`application_id` del contrato de creación |
| `src/App.tsx` | 12 rutas y 12 lazy imports |

### Base de datos

Migración `20260812010000_drop_campaigns_module.sql`:

- **35 políticas RLS**, incluidas 2 de `marketplace_projects` (tabla que se queda) que
  referenciaban `marketplace_campaigns`. **Se recrean acto seguido sin la rama de campañas**:
  sin ellas nadie podría ver ni crear proyectos
- **1 vista** (`campaign_social_summary`), **12 tablas**, **21 funciones**, **5 funciones de
  trigger**, **3 enums**
- **2 funciones reescritas** que se quedan: `sync_user_health` (contaba postulaciones) y
  `assign_editor_to_project` (derivaba los tipos de contenido de la campaña; ahora busca entre
  todos los editores libres)
- **5 FKs entrantes**: se suelta la constraint pero **se conserva la columna** en
  `marketplace_projects.campaign_id`, `.application_id` y `scheduled_posts.campaign_id` porque el
  código las lee; se dropea la columna en `marketplace_media` y `brand_credit_transactions`,
  donde nadie las nombra. Las 5 tenían 0 filas con valor

**No se tocó**, pese al nombre: `promotional_campaigns`, `campaign_redemptions` y
`campaign_mappings` (sistema de referidos), `marketing_campaigns` y el enum `ad_campaign_status`
(módulo de ads), `marketplace_projects` y todo el flujo de contratación directa, escrow y wallets.

### Verificación

| Chequeo | Resultado |
|---|---|
| `npm run build` | ✅ verde |
| Tablas del módulo restantes | ✅ 0 |
| Tablas que debían quedar (8) | ✅ 8 |
| Políticas RLS de `marketplace_projects` | ✅ 4 (incluidas las 2 recreadas) |
| Funciones con referencias reales a lo borrado | ✅ 0 (solo comentarios) |
| Grep en `src/`, `supabase/functions/` y `kreoon-mcp-server/` | ✅ ninguna |

### Números

| Métrica | Línea base | Tras bloque 2 | Tras bloque 3 | Δ acumulado |
|---|---:|---:|---:|---:|
| Peso de `dist/` | 23.307.089 B | 23.299.180 B | **22.933.107 B** | **−373.982 B (−1,6 %)** |
| Chunks JS | 390 | 390 | 364 | −26 |
| Rutas | 165 | 160 | 148 | −17 |
| Archivos en `src` | 1.946 | 1.943 | 1.886 | −60 |
| Componentes | 1.035 | 1.033 | 1.002 | −33 |
| Edge functions | 169 | 166 | 160 | −9 |
| Tablas dropeadas | — | 52 | **64** | −64 |

---

## Bloque 4 · UP / Reputación / Gamificación — 2026-08-12

El bloque más enredado hasta ahora: no por volumen, sino porque **tres sistemas que se quedan
guardaban sus datos en tablas de UP**.

### Lo primero: verificar que el kanban sobrevive

Antes de tocar tablas, se quitaron los 3 triggers de UP sobre `content` y se midió el efecto
moviendo una tarjeta real (en transacción revertida):

| Prueba: mover tarjeta a `delivered` | Con triggers | Sin triggers |
|---|---|---|
| `up_events` | +1 | **0** |
| `point_transactions` | +2 | **0** |
| `content_history` | +1 | **+1** |
| `content_status_logs` | +1 | **+1** |

El board registra exactamente igual; solo deja de escribir puntos.

### Los 3 sistemas que se quedan y dependían de UP

| Sistema | Qué pasaba | Solución |
|---|---|---|
| **Referidos** 🔴 | `award_referral_coins` insertaba en `reputation_events` **sin `EXCEPTION`**: al dropear la tabla habría lanzado error duro y roto el flujo (2 callers vivos en `referral-service`) | Reescrita como no-op. **Hallazgo:** ese INSERT era su único efecto — las monedas las acredita el edge function por su cuenta, así que no se pierde nada |
| **Academia** 🟠 | `award_space_points` e `issue_academy_certificate` escribían ahí dentro de un `EXCEPTION`: no rompían, pero habrían fallado en silencio para siempre | Limpiadas |
| **KIRO** 🟠 | Su gamificación persistía en `point_transactions` y `user_points` | Desacoplado: KIRO usa solo `localStorage`, **que ya era su camino de respaldo diseñado** (detectaba el error "tabla no existe" y caía ahí). `award_kiro_points` dropeada |

### Decisiones 2 y 3 implementadas

`marketplace_reputation`, `get_org_talent_roster`, `get_unified_talent` y
`update_talent_performance_scores` se reescribieron sobre señales reales:

```
score = ( 40·(calidad/5) + 35·min(entregas/20,1) + 25·(puntualidad/100) )
        / (peso de los componentes que SÍ tienen datos)
```

- **calidad**: `creator_reviews` + estrellas del board
- **entregas**: contenido aprobado/pagado + proyectos completados
- **puntualidad**: `content.delivered_at` vs `deadline`

**Aviso honesto sobre los datos de hoy:** `creator_reviews` tiene 0 filas y ningún contenido
está valorado, así que la señal de calidad está vacía y el score sale solo de volumen y
puntualidad. La fórmula se renormaliza sola: en cuanto entren reseñas, la calidad entra sin
tocar nada. **La escala cambia**: de "puntos acumulados" (10–5.660) a 0–100. Los 40 registros
quedaron entre 0 y 47. El vocabulario de niveles (Novato/Pro/Elite/Master/Legend) se conserva.

### Base de datos

- **94 políticas RLS**, **45 tablas** (44 del módulo + `role_archetypes`), **1 matview**
  (`season_leaderboard_live`), **47 funciones**, **8 enums**, **3 triggers**, 8 tablas fuera
  de Realtime. **85.654 filas** eliminadas (76.125 solo de `user_global_badges`).

### El barrido post-DROP volvió a pagar

Igual que en booking, aparecieron referencias vivas que el mapa no listaba — esta vez **en
edge functions de producción**:

| Dónde | Qué leía | Solución |
|---|---|---|
| `pancake-sync-user` 🔴 | `user_reputation_totals` para mandar el nivel al CRM | Reapuntada a `marketplace_reputation` (`global_level` + score/100) |
| `ProfileTrustBadges` | `user_reputation_totals`, `user_achievements`, `achievements` | Reapuntado a `marketplace_reputation`; la sección de logros queda vacía |
| `EnhancedSmartSearch` | `up_creadores_totals`, `user_achievements` | Reapuntado a `marketplace_reputation` |
| `kreoon-bootstrap`, `sync-to-kreoon`, `kreoon-sql` | Listas de tablas a sincronizar/copiar | Depuradas |

Las 4 edge functions se redesplegaron.

### Números

| Métrica | Línea base | Tras bloque 3 | Tras bloque 4 | Δ acumulado |
|---|---:|---:|---:|---:|
| Peso de `dist/` | 23.307.089 B | 22.933.107 B | **22.753.732 B** | **−553.357 B (−2,4 %)** |
| Chunks JS | 390 | 364 | 357 | −33 |
| Rutas | 165 | 148 | 146 | −19 |
| Archivos en `src` | 1.946 | 1.886 | 1.833 | −113 |
| Componentes | 1.035 | 1.002 | 972 | −63 |
| Edge functions | 169 | 160 | 158 | −11 |
| Tablas dropeadas | — | 64 | **109** | −109 |
