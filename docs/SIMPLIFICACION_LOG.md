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
