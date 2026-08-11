# Auditoría — Flujo actual de creación de clientes y acceso al portal

**Fecha:** 2026-08-11
**Alcance:** solo lectura (código fuente + schema/RLS en vivo vía MCP Supabase, project_id `wjkbqcrxwsmvtxmqgiqc`). No se modificó nada.
**Objetivo:** mapa fiel del estado actual antes de construir "Onboarding de Clientes". No incluye propuestas de solución.

---

## 1. Tabla `clients`

### Columnas reales (schema en vivo, 93 filas)

| Columna | Tipo | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| name | text | NO | — |
| contact_email | text | YES | — |
| contact_phone | text | YES | — |
| logo_url | text | YES | — |
| notes | text | YES | — |
| user_id | uuid | YES | — |
| created_by | uuid | YES | — |
| created_at / updated_at | timestamptz | YES | now() |
| bio | text | YES | — |
| instagram / tiktok / facebook / linkedin / website / portfolio_url | text | YES | — |
| is_public | boolean | YES | **true** |
| username | text | YES | — |
| is_vip | boolean | YES | false |
| document_type / document_number | text | YES | — |
| main_contact | text | YES | — |
| address / city / country | text | YES | — |
| category | text | YES | — |
| profile_completed | boolean | YES | false |
| organization_id | uuid | YES | — |
| is_internal_brand | boolean | YES | false |
| strategy_service_enabled / traffic_service_enabled | boolean | YES | false |
| strategy_service_started_at / traffic_service_started_at | timestamptz | YES | — |
| brand_id | uuid | YES | — |
| deleted_at / deleted_by | — | YES | — (soft delete) |
| partner_community_id | uuid | YES | — |
| community_badge_text / community_badge_color | text | YES | — |
| whatsapp_phone | text | YES | — |
| whatsapp_enabled | boolean | NO | true |
| lead_source / community_name / referred_by | text | YES | — |

`organization_id` se agregó vía `ALTER TABLE` posterior al baseline (multi-tenant). `user_id` es el vínculo legacy pre-`client_users` (ver sección 2).

### RLS — 13 políticas activas (todas PERMISSIVE, se combinan con OR)

- `Anyone can view public client profiles` — rol `anon`, `is_public = true`.
- `Authenticated can view clients` — org member OR vinculado en `client_users` OR `is_public`.
- `Org members can view clients` / `Org members can view org clients` — dos políticas SELECT distintas, helpers distintos (`is_org_configurer`/`is_org_member` vs `is_org_member` solo).
- `Org members can manage clients` — ALL, solo roles `admin`/`team_leader`/`strategist` de `organization_members`.
- `Platform admins can manage clients in current org` — ALL, `has_role(admin)` + org actual.
- `Platform root can insert/update/delete any client` — 3 políticas separadas para `is_platform_root`.
- `Brand members can view their brand client` / `Brand owners can insert/update their brand client` — vía `brand_members`.
- `Associated users can view/update their client` — vía `client_users`.

**13 políticas PERMISSIVE superpuestas** para el mismo conjunto de operaciones, con al menos 4 rutas distintas para llegar al mismo SELECT (org member, client_user, brand member, is_public). Difícil de auditar/razonar; ver riesgo en sección 6.

### Qué llena hoy el formulario de creación

**`ClientsContent.tsx`** (`handleCreateClient`, dialog "Crear Nueva Empresa") — INSERT en `clients` con solo: `name`, `contact_email`, `contact_phone`, `notes`, `organization_id` (org actual). **No setea `is_public`** → queda en su default `true`, es decir el cliente creado por un admin es visible por `anon` desde el día 1 (política `Anyone can view public client profiles`).

**`ClientDetailDialog.tsx`** no crea clientes — solo edita uno existente (`handleSave`: name/contact_email/contact_phone/notes/is_vip; tab "Origen" además guarda `lead_source`/`community_name`/`referred_by`; toggle VIP aparte). El resto de columnas (bio, redes sociales, documento, ubicación, categoría) se editan vía `CompanyProfileEditor` (botón "Editar perfil completo"), fuera del alcance pedido pero es el componente real que toca esos campos.

Ningún flujo en `src/components/clients/` llena `document_type/number`, `category`, `address/city/country`, `whatsapp_phone` al crear — solo al editar después.

---

## 2. Tabla `client_users`

### Columnas reales (72 filas)

| Columna | Tipo | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| client_id | uuid | NO | — |
| user_id | uuid | NO | — |
| role | text | YES | 'viewer' |
| created_at | timestamptz | YES | now() |
| created_by | uuid | YES | — |
| whatsapp_notify | boolean | NO | false |

`UNIQUE(client_id, user_id)`. Roles usados: `owner` / `admin` / `viewer`.

### RLS — 4 políticas

- `Admins can manage all client_users` — `has_role(admin)` global.
- `Client owners can manage users` — `is_client_owner(auth.uid(), client_id)` → función `SECURITY DEFINER` que chequea `role='owner'` en `client_users` para ese `client_id` (correctamente escopeada, sin fuga cross-org).
- `Users can view client associations` y `Users can view their own client associations` — **dos políticas SELECT redundantes** (una usa `get_my_client_ids()`, la otra un `user_id = auth.uid()` inline); ambas hacen lo mismo, deuda de limpieza.

No hay ninguna política que valide `organization_id` directamente sobre `client_users` — el aislamiento por org depende 100% de que `client_id` ya esté acotado a la org vía la tabla `clients`. Con una sola org activa hoy (KREOON) no es explotable, pero es un punto ciego si se abre multi-org.

### Cómo se invita hoy a un usuario cliente (`ClientUsersDialog.tsx`)

**No es una invitación por email.** El flujo es:
1. `fetchAvailableUsers()` lista usuarios que YA son miembros de la organización con `organization_members.role = 'client'`.
2. Admin selecciona uno de esa lista + rol (`owner`/`admin`/`viewer`) → INSERT directo en `client_users`.
3. Switch de `whatsapp_notify` por persona (independiente del rol).

Es decir: el usuario debe **existir previamente** en `organization_members` con rol `client` (vía registro público en `/org/:slug`, ver sección 4) antes de poder vincularlo a una empresa. `ClientsContent.tsx` (tab "Usuarios Cliente") además muestra explícitamente a los miembros `role='client'` sin empresa vinculada (`UnassignedClientUsersAlert`) y permite vincularlos manualmente vía `handleLinkClientToUser`.

No existe un flujo de invitación por correo específico para clientes (`send-invitation` existe en el repo pero es para el flujo de equipo interno, no se referencia desde `ClientUsersDialog`/`ClientsContent`).

### Cómo `ClientDashboard.tsx` resuelve a qué cliente pertenece el usuario logueado

`fetchUserClients()`, en este orden exacto:
1. Si está en modo impersonación admin → usa `effectiveClientId` directo, ignora todo lo demás.
2. Si es "brand member independiente" (`isIndependentBrand`, sin `organization_id`) → usa `brandClient.id` (resuelto vía `useBrandClient`, tabla `brands`/`brand_members`).
3. Si no, query `client_users` por `user_id` → `client_id[]`.
4. **Fallback legacy**: si `client_users` no devolvió nada, `SELECT id FROM clients WHERE user_id = auth.uid()` (usa la columna legacy directamente).
5. Con los `clientIds` resultantes, carga `clients` y si hay >1 muestra selector; si hay exactamente 1, auto-selecciona y persiste en `localStorage`.
6. Si no hay ningún cliente asociado (ni por `client_users` ni por legacy `user_id`) y tampoco hay `brand` → pantalla "Tu cuenta está siendo configurada" con botón "Crear mi Empresa" (`handleCreateBrand`, crea `brands` + `brand_members` + `clients` + `client_users` en ese orden).

### Confirmación de `clients.user_id` (legacy)

**Sigue existiendo en el schema y sigue activo en código**, no es solo un remanente muerto:

- `ClientDashboard.tsx` lo usa como **fallback real** de resolución (paso 4 arriba).
- Múltiples funciones SQL (`complete_onboarding`, `auto_create_client_from_profile`, backfills) siguen **escribiendo** `clients.user_id` al auto-crear el registro de empresa para un cliente que completa onboarding.
- `ClientsContent.tsx` lo trae en el `interface Client` (`user_id: string | null`) aunque no lo usa activamente en la UI de admin.
- La migración `20260518150000_fix_client_creation_flow.sql` documenta un incidente: el trigger automático (`trg_auto_create_client_from_member`) creaba filas de `clients` con el nombre del perfil del usuario en vez del nombre real de la empresa — se eliminó ese trigger, pero la lógica de auto-creación vía `complete_onboarding` y el trigger `trg_auto_create_client_on_onboarding` (en `profiles`, `AFTER UPDATE OF onboarding_completed`) siguen vivos y siguen poblando `user_id`.

---

## 3. Tabla `products` + creación de producto

### Columnas reales (88 filas)

id, client_id, name, description, strategy, market_research (jsonb), ideal_avatar, sales_angles (array), brief_url/onboarding_url/research_url, brief_file_url/onboarding_file_url/research_file_url, brief_status (default 'pending'), brief_completed_at, **brief_data (jsonb, default `{}`)**, competitor_analysis (jsonb), avatar_profiles (jsonb), sales_angles_data (jsonb), content_strategy (jsonb), research_generated_at, research_document_url, business_type (default 'product_service'), research_progress (jsonb), content_calendar (jsonb), launch_strategy (jsonb), product_code (integer), deleted_at/deleted_by, **full_research_v3 (jsonb)**, **research_v3_progress (jsonb)**, created_at/updated_at.

### RLS — 9 políticas (misma sobre-superposición que `clients`)

Cuatro rutas SELECT distintas hacia lo mismo: vía `client_users` directo, vía `clients.organization_id` + `organization_members` (dos variantes: `is_org_member` y join manual), y vía `has_role(admin)` + org actual. INSERT/UPDATE/DELETE replican el patrón (política por `client_users` + política separada por `organization_members`). Ninguna política referencia `clients.is_public`, así que un producto de un cliente público no queda expuesto a `anon` (contenido, a diferencia de `clients`).

### ⚠️ Hallazgo importante: dos wizards, uno de ellos muerto

- **`CreateProductBriefWizard.tsx`** (`src/components/products/`) — wizard de 7 pasos con formulario extenso (brief completo: neuromarketing, avatar, fases ESFERA, etc.). Al completar: INSERT en `products` (`brief_data`, `brief_status: 'in_progress'`, `business_type`) y dispara `fireProductResearch()` → **fetch directo** (no `supabase.functions.invoke`) a `https://wjkbqcrxwsmvtxmqgiqc.supabase.co/functions/v1/product-research`, fire-and-forget con self-invocación (~12 pasos) + polling de `products.research_progress`. También crea filas en `content` (una por fase ESFERA con `sphere_phase`, `funnel_stage`, `strategist_guidelines`).
  **Grep confirma: ningún componente en `src/` importa `CreateProductBriefWizard`.** Es código huérfano — no está montado en ninguna ruta ni diálogo activo hoy.

- **`ProductDNAWizard.tsx`** (`src/components/product-dna/`) — es el wizard REAL usado por `ClientDetailDialog.tsx` y `ClientDashboard.tsx` (vía `ClientProductsTab.tsx`) en el botón "Crear Nuevo Producto"/"Crear Producto con IA". Flujo: grabación de audio → transcripción → `supabase.functions.invoke('generate-product-dna', ...)` (además de otros pasos dinámicos vía `invokeWithRetry(fnName, ...)`). El callback `onComplete` en ambos padres solo hace `fetchProducts()`, ignorando el id devuelto.

Esto significa que el brief estructurado (7 pasos, sin audio) descrito en el pedido original **no es el que se usa hoy en producción** — el flujo real es por audio + `generate-product-dna`, no por formulario + `product-research`.

### Confusión adicional: `products` vs `product_dna`

El schema en vivo tiene **dos tablas separadas**: `public.products` (88 filas, la de arriba) y `public.product_dna` (135 filas). Por `ARCHITECTURE_LEDGER.md` / `CLAUDE.md`, `product_dna` correspondería al pipeline "ADN Recargado" (`generate-full-research`, 21 fases, invocado desde `product-dna.service.ts`), que es un sistema distinto y no debe confundirse con los campos `research_*`/`full_research_v3` que viven dentro de `products`. Para la nueva feature de onboarding hay que tener claro contra cuál de las dos tablas se está diseñando.

---

## 4. Patrón de página pública `/org/:slug` (`OrgRegister.tsx`)

- Ruta pública, no requiere sesión previa. Carga datos de la organización vía edge function `org-public-info` (con fallback a `SELECT` directo sobre `organizations` si la función falla — ese fallback exige que el cliente anon tenga permiso de lectura sobre `organizations` filtrado por `slug` + `is_registration_open`).
- Valida: organización existe, `is_registration_open = true`. Si no, pantalla de error ("Organización no encontrada" / "El registro no está habilitado").
- El registro real ocurre en `WizardContainer` (`flow="org"`, `src/components/registration-v2/`) — no auditado en detalle (fuera del listado de componentes pedido), pero el patrón post-signup es:
  1. Usuario se registra (Supabase Auth `signUp`), metadata `pending_org_id`/`pending_org_role` o `localStorage.pendingOrgRegistration` guardan la intención.
  2. Tras confirmar email, vuelve a `/org/:slug?confirmed=true` → `completeOrgRegistration()`: espera (polling, hasta 5×300ms) a que el trigger de Supabase cree la fila en `profiles`; si no aparece, hace `upsert` manual.
  3. Llama RPC `register_user_to_organization(p_organization_id, p_user_id, p_role)` — esta es la escritura real "sin sesión completa" (se ejecuta apenas se confirma el email, antes de cualquier flujo de onboarding UI).
  4. Dispara `notify-new-member` (edge function, fire-and-forget, error silenciado con `.catch(() => {})`).
  5. Limpia `localStorage`, `refetchUserData()`, navega a `/welcome?role=...`.
- Si el rol pendiente es `client`, es este punto — `register_user_to_organization` — el que deja al usuario en `organization_members` con `role='client'`, que es el prerequisito que `ClientUsersDialog` necesita para poder vincularlo a una empresa (sección 2), y el que dispara (vía `complete_onboarding` más adelante en el flujo de onboarding legal/perfil) la auto-creación en `clients`.

---

## 5. Sistema de notificaciones in-app

**Hay dos tablas activas en paralelo hoy** (una tercera, `social_notifications`, existe pero es para el feed social, no para el portal de cliente — no se toca en este flujo):

### `notifications` (legacy, 3598 filas)
Columnas: id, user_id, type, title, message, link, is_read, created_at. Sin `organization_id`.
RLS: usuario ve/actualiza/borra solo lo propio (`user_id = auth.uid()`) — **pero el INSERT** (`Authenticated can insert notifications`) solo exige `user_id IS NOT NULL`, **sin validar que el `user_id` insertado sea el propio ni que exista relación alguna con el emisor**. Cualquier usuario autenticado puede insertar una notificación arbitraria para cualquier otro `user_id`.

### `user_notifications` (activa, 4672 filas) — la que usa `useUserNotifications.ts` / el bell del dashboard
Columnas: id, user_id, **organization_id** (NOT NULL), type (enum de app: `content_update`/`mention`/`assignment`/`status_change`/`recruitment_request`), title, message, entity_type, entity_id, is_read, created_at.
RLS: SELECT/UPDATE/DELETE restringidos a `user_id = auth.uid()` (dos sets de políticas duplicadas con nombres distintos, mismo efecto — deuda de limpieza igual que en `client_users`). **INSERT** (`system_insert`) es `with_check: true` sin ninguna restricción — diseñado para ser alimentado por funciones/triggers `SECURITY DEFINER` de la base de datos (confirmado: múltiples `INSERT INTO public.user_notifications` dentro de funciones de trigger en `supabase/migrations/00000000000000_baseline.sql`, disparadas por cambios de estado de contenido, asignaciones, etc.), no por el cliente directamente. Si los GRANTs de tabla permiten `INSERT` a `authenticated` (no verificado en esta auditoría), la política por sí sola no lo impediría.

`useUserNotifications.ts` (`src/hooks/`) hace fetch filtrado por `user_id` + `profile.current_organization_id`, con canal realtime `user_notifications_realtime-{user.id}-{uuid}` y notificación de navegador si hay permiso concedido.

---

## 6. Deuda y riesgos (solo diagnóstico, sin propuesta de fix)

1. **`clients.is_public` default `true`, no seteado por el form de creación** → toda empresa nueva creada desde `ClientsContent.tsx` queda visible para `anon` de inmediato vía la política `Anyone can view public client profiles`, salvo que alguien lo desactive manualmente después en `ClientDetailDialog`.
2. **RLS con sprawl severo en `clients` (13 políticas) y `products` (9 políticas)** — múltiples rutas PERMISSIVE redundantes (helpers distintos: `is_org_member`, `is_org_configurer`, `get_current_organization_id`, joins manuales a `organization_members`) para lograr el mismo resultado. Alto riesgo de que una futura migración toque una y deje una ruta de acceso más permisiva sin notarlo, y complica razonar sobre "quién puede ver qué" para la feature nueva.
3. **`clients.user_id` legacy sigue vivo y se sigue escribiendo** por `complete_onboarding` y el trigger `trg_auto_create_client_on_onboarding`, y `ClientDashboard.tsx` depende de él como fallback real de resolución de cliente. Cualquier cambio al modelo de onboarding tiene que decidir explícitamente si mantiene, migra o congela esta columna — no es solo un vestigio inerte.
4. **Política INSERT de `notifications` (legacy) no valida al emisor** — cualquier usuario autenticado puede escribir una notificación arbitraria a nombre de cualquier `user_id`. No se pudo confirmar en esta auditoría si algún componente cliente sigue usando `notifications` directamente (el hook activo usa `user_notifications`), pero la tabla y su política siguen habilitadas.
5. **Políticas SELECT duplicadas** en `client_users` (`Users can view client associations` vs `Users can view their own client associations`) y en `user_notifications` (`Users can view own notifications` vs `users_own_select`, mismo patrón en UPDATE/DELETE) — mismo efecto, doble mantenimiento.
6. **`CreateProductBriefWizard.tsx` es código huérfano** (0 importadores) pero convive en el repo con `ProductDNAWizard.tsx`, que es el flujo real. Riesgo concreto para la feature nueva: fácil confundir cuál es "el" flujo de creación de producto a integrar/extender.
7. **Dos tablas de producto/DNA coexistiendo** (`products` con sus campos `research_*`/`full_research_v3`, y `product_dna` separada para el pipeline ADN Recargado/`generate-full-research`) — falta de una única fuente de verdad si el onboarding nuevo necesita mostrar o generar datos de producto.
8. **No hay invitación por email para usuarios cliente** — el modelo actual asume que el usuario ya pasó por `/org/:slug` (rol `client` en `organization_members`) antes de que un admin pueda vincularlo en `ClientUsersDialog`. Cualquier onboarding que quiera "invitar a un cliente que aún no tiene cuenta" no tiene un mecanismo existente que lo cubra directamente.
9. **14 tablas con RLS deshabilitado a nivel de proyecto** (particiones `kae_events_*` + `kte_tracking_events_deprecated`, detectado por el advisor de seguridad del MCP) — no pertenecen al flujo de onboarding de clientes, pero es una exposición activa de datos de analytics/tracking a `anon`/`authenticated` que vale la pena resolver independientemente de esta feature.
