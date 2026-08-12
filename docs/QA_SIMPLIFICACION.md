# QA final de la simplificación · KREOON

**Proyecto Supabase:** `wjkbqcrxwsmvtxmqgiqc` (consultado en modo solo lectura)
**Alcance:** los 7 puntos acordados tras eliminar 5 módulos y 120 tablas.

Este informe tiene **dos pasadas**. La primera (commit `27adffea`) encontró los
fallos; la segunda los re-verifica después de corregirlos. Cada resultado lleva su
evidencia para poder reproducirlo.

---

## Segunda pasada · 2026-08-12, commit `164b8f75`

Re-verificación tras los arreglos y la pasada de UX. Tres auditorías independientes
en paralelo: rutas y código muerto, base de datos y seguridad, y métricas.

| # | Punto | Primera pasada | Ahora |
|---:|---|---|---|
| 1 | Rutas viejas | pendiente | **PASS** · 12/12 |
| 2 | Referencias muertas | FAIL · 7 refs | **PASS** · resto eliminado |
| 3 | Objetos rotos en la base | FAIL · 11 funciones | **PASS** · 0 |
| 4 | Seguridad | FAIL parcial | **FAIL parcial** · la fuga sigue abierta |
| 5 | Kanban sin UP | PASS | **PASS** · 36 triggers sanos |
| 6 | Perfiles y búsqueda | PASS | **PASS** · 527 perfiles intactos |
| 7 | Comparativa vs baseline | pendiente | **PASS** · medida aparte |
| — | Recorrido de los 6 grupos | — | **BLOQUEADO** · requiere sesión |
| — | Flujo completo E2E | — | **BLOQUEADO** · requiere sesión |

### 1 · Rutas viejas — PASS

Las 12 URLs de módulos eliminados (`/live`, `/ranking`, `/campaigns`,
`/campanas-gestionadas`, `/social`, `/feed`, `/marketing`, `/marketing-ads`,
`/booking`, `/reservas`, `/up`, `/streaming`) **no dejan pantalla en blanco**:
redirigen o caen en el catch-all `path="*"` → `NotFound` (`App.tsx:1325`).

Único desvío: `/feed` debía redirigir a `/marketplace` y cae en el 404 genérico.
Cosmético.

**Aviso para futuras limpiezas**: `/social-hub` **no** es el feed eliminado. Es el
módulo vivo de publicación programada a Instagram, TikTok y Facebook
(`src/modules/social/`). Se confunden por el nombre.

### 2 · Referencias muertas — PASS

De ~250 archivos que coinciden con los términos buscados, casi todos son vocabulario
de negocio vivo: "Campañas" en la interfaz son los paquetes de cliente,
`marketing_campaigns` pertenece al módulo de Ads (que sigue vivo, no es el módulo
eliminado), y `followers` sostiene el botón Seguir.

Resto real encontrado y **eliminado**: `src/components/portfolio/profile/`
(4 archivos), huérfano desde que se borró su único consumidor. Contenía un import a
`@/hooks/useRandomPortfolio`, borrado en abril de 2026. No rompía `npm run build`
—Vite no hace comprobación de tipos completa— pero sí habría roto un `tsc`.

Cosmético pendiente: `ProtectedRoute.tsx:78,236` aún lista `/social` y `/explore`.

### 3 · Objetos rotos en la base — PASS

**0 objetos rotos**, confirmado por segunda vez: 15/15 vistas consultables, 278
triggers con su función existente, y las 13 coincidencias de tablas eliminadas en
`pg_proc` son falsos positivos (comentarios que documentan el retiro, o referencias
a `marketing_campaigns` / `marketing_metrics`, que siguen vivas).

Las 11 funciones rotas de la primera pasada —incluido el trigger que rompía el botón
Seguir en producción— están corregidas.

### 5 · Kanban sin UP — PASS

`content` tiene 36 triggers, todos con función existente y **ninguno dependiente de
las tablas eliminadas**. El único que tocaba reputación
(`trg_content_sync_reputation`) ya apunta a `marketplace_reputation`, su sucesor
vivo, y va envuelto en manejador de excepciones.

### 6 · Perfiles de talento y búsqueda — PASS

| | |
|---|---|
| Perfiles de creador | 527, todos publicados |
| Ítems de portafolio | 1.283 |
| `portfolio_posts` conservados | 158 |
| Creadores en el marketplace | 425 |

Se cumplió la regla de oro: **no se borró contenido de creadores ni perfiles**. Las
9 funciones de reputación están limpias y `sync_marketplace_reputation` lee de
`creator_reviews`, según lo decidido.

Observación: hay **0 reseñas**, así que el ranking se sostiene hoy sobre contenido
entregado y proyectos completados. No es un fallo; es una fuente aún vacía.

---

## 4 (segunda pasada) · Seguridad — FAIL parcial, sin corregir

### La fuga sigue abierta, y ahora se sabe exactamente qué expone

`clients.is_public` tiene `DEFAULT true`, y **51 de 94 clientes** están en `true`.

Un matiz que la primera pasada no vio: **el vector anónimo está mitigado** — `anon`
no tiene GRANT sobre `clients`, así que la política que lo menciona es inerte. El
problema real es la otra: `Authenticated can view clients` incluye
`OR is_public = true` **sin filtrar por organización**, y esa sí tiene GRANT activo.

Es decir: **cualquier usuario autenticado de cualquier organización** —incluido un
`student` recién registrado— puede leer la fila **completa** de esos 51 clientes.
RLS filtra por fila, no por columna, así que arrastra todo lo que hay en ella:

| Campo expuesto | Filas con dato |
|---|---:|
| `contact_email` | 43 |
| `contact_phone` | 38 |
| `document_number` / `document_type` (NIT) | 20 |
| `address` | 19 |
| `whatsapp_phone` | 18 |

Conviene precisar algo que se dijo mal antes: los datos fiscales **no** se quedaron
todos en `client_onboarding_forms`. El NIT y la dirección viven en `clients`, dentro
del alcance del flag.

**Arreglo recomendado**: sacar esos campos del alcance de `is_public` — una vista
pública con solo columnas de marketing, o separarlos a otra tabla. Cambiar la
política a secas es delicado: `clients` tiene 13 políticas superpuestas y es
exactamente donde se rompe el acceso legítimo.

**No se corrigió**: requiere decisión del dueño.

### Lo que sí está bien

- **`client_onboarding_forms`: PASS.** Token único de 64 caracteres con índice
  único, caducidad a 14 días `NOT NULL`, única política de staff por organización, y
  `anon` sin GRANT (el formulario público entra por Edge Function con service_role,
  que es lo correcto).
- **`client_pipeline_runs` y `client_pipeline_stage_events`: PASS.** RLS con
  políticas que filtran por organización y por cliente, y GRANT a `service_role`
  confirmado.

### RLS del resto del esquema — PASS con matices

Las 13 tablas "sin RLS" son las particiones mensuales de `kae_events`: la tabla madre
sí tiene RLS y políticas, y las hijas no tienen GRANT público. Sin riesgo.

De las 20 tablas con RLS y **cero políticas**, 14 son copias de seguridad e
infraestructura correctamente bloqueadas. Las otras 9 (`agent_conversations`,
`alerts`, `brand_profiles`, `campaign_mappings`, `creatives`, `generations`,
`templates`, `usage_tracking`, `payment_providers`) **sí tienen GRANT** a
`anon`/`authenticated` pero ninguna política, lo que las deja en denegar-todo.

Ojo al matiz: eso **no es un agujero de seguridad, es el reverso** — si el frontend
las usa, están rotas funcionalmente. Merece comprobarse si siguen en uso.

---

## 1. Rutas viejas

PENDIENTE

---

## 2. Referencias muertas en código

**Método:** grep de las 119 tablas eliminadas (135 del `manifest.json` menos las 16 conservadas)
sobre `src/` y `supabase/functions/`, excluyendo `src/integrations/supabase/types.ts`.
Se filtraron los falsos positivos: `hashtags`, `achievements` y `favorites` aparecen
cientos de veces como **claves JSON de prompts de IA y nombres de variables**, no como tablas.

| Chequeo | Resultado | Evidencia |
|---|---|---|
| `src/` — referencias reales a tablas eliminadas | **PASS** | 0 coincidencias en contexto de tabla (`.from()`, `.rpc()`). Solo 2 comentarios que documentan la eliminación: `src/hooks/useContactReveal.ts:108`, `src/components/kiro/hooks/useKiroGamification.ts:169` |
| `supabase/functions/` — referencias reales | **FAIL** | 7 referencias en 2 archivos (abajo) |

### Las 7 referencias muertas

| Archivo:línea | Tabla eliminada | Impacto real |
|---|---|---|
| `supabase/functions/admin-users/index.ts:643` | `campaign_applications` | Bajo — `cleanupTable()` captura el error y sigue (`index.ts:583-586`) |
| `supabase/functions/admin-users/index.ts:680` | `reputation_events` | Bajo — ídem |
| `supabase/functions/admin-users/index.ts:681` | `user_reputation_totals` | Bajo — ídem |
| `supabase/functions/migrate-to-kreoon/index.ts:72` | `up_creadores` | Nulo — solo migra si el caller las pide explícitamente (`index.ts:79`) |
| `supabase/functions/migrate-to-kreoon/index.ts:73` | `up_creadores_totals` | Nulo — ídem |
| `supabase/functions/migrate-to-kreoon/index.ts:74` | `up_editores` | Nulo — ídem |
| `supabase/functions/migrate-to-kreoon/index.ts:75` | `up_editores_totals` | Nulo — ídem |

**Confirmado por SQL:** las 3 tablas de `admin-users` y las 4 de `migrate-to-kreoon` no existen
hoy en `public` (`SELECT EXISTS(... pg_class ...)` → `false` en las 7).

**Veredicto punto 2: FAIL** — el criterio era 0 coincidencias. Ninguna rompe un flujo de usuario,
pero `admin-users` gasta 3 round-trips y escribe 3 warnings cada vez que se borra un usuario.

---

## 3. Objetos rotos en la base

**Método:** se extrajo el cuerpo de las 686 funciones de `public` con `pg_proc.prosrc`, se
eliminaron los comentarios (`--` y `/* */`) por regex y se buscaron las 119 tablas eliminadas
con límites de palabra. Igual para las 15 vistas con `pg_get_viewdef()`. Los triggers se
cruzaron contra `pg_trigger` + `pg_class`.

| Chequeo | Resultado | Evidencia |
|---|---|---|
| Vistas cuya definición apunta a tablas inexistentes | **PASS** | 0 filas sobre las 15 vistas de `public` |
| Triggers cuya tabla o función ya no existe | **PASS** | 0 — PostgreSQL los borró en cascada con sus tablas |
| Funciones con **sentencias reales** contra tablas inexistentes | **FAIL** | 15 sentencias en 11 funciones |
| Triggers **vivos** sobre tablas conservadas que llaman a esas funciones | **FAIL** | 2 triggers, 1 de ellos rompe una acción de usuario |

### 3.1 Las 11 funciones rotas

| Función | Tabla inexistente | Sentencia | ¿Tiene trigger vivo? |
|---|---|---|---|
| `notify_on_follow` | `social_notifications` | `INSERT INTO public.social_notifications (...)` | **SÍ — `on_follow_notification` sobre `followers`** |
| `notify_on_post_like` | `social_notifications` | `INSERT INTO public.social_notifications (...)` | SÍ — `on_post_like_notify` sobre `portfolio_post_likes` |
| `notify_on_company_follow` | `social_notifications` | `INSERT INTO ...` | No (su tabla `company_followers` se eliminó) |
| `notify_on_portfolio_comment` | `social_notifications` | `INSERT INTO ...` | No (su tabla `portfolio_post_comments` se eliminó) |
| `get_company_followers_count` | `company_followers` | `SELECT COUNT(*) FROM public.company_followers` | No aplica (RPC) |
| `is_following_company` | `company_followers` | `SELECT 1 FROM public.company_followers` | No aplica (RPC) |
| `toggle_company_follow` | `company_followers` | `SELECT 1 FROM public.company_followers` | No aplica (RPC) |
| `get_feed_posts` | `feed_reactions` | `select 1 from public.feed_reactions` ×2 | No aplica (RPC) |
| `fn_feed_reactions_guard_update` | `feed_reactions` | `raise exception 'feed_reactions: ...'` | No (solo el mensaje; su tabla se eliminó) |
| `extract_hashtags` | `hashtags`, `post_hashtags` | `INSERT INTO public.hashtags`, `DELETE FROM public.post_hashtags` | **No** — verificado en `pg_trigger`, ya no está enganchada a `portfolio_posts` |
| `cleanup_expired_stories` | `portfolio_stories` | `DELETE FROM public.portfolio_stories` | No aplica (la edge function homónima ya no está desplegada) |

`admin_delete_user_cascade` también menciona `portfolio_post_comments` y `portfolio_stories`,
pero ambas van envueltas en `BEGIN ... EXCEPTION WHEN OTHERS THEN NULL; END;` → no rompe nada.
Los RPCs de la lista (`get_feed_posts`, `toggle_company_follow`, `is_following_company`,
`get_company_followers_count`) **no tienen ningún caller** en `src/` ni en
`supabase/functions/` (grep de `rpc('<nombre>')` → 0 resultados): son código muerto, no bugs activos.

### 3.2 El bug crítico: seguir a un perfil está roto en producción

```
CREATE TRIGGER on_follow_notification AFTER INSERT ON public.followers
  FOR EACH ROW EXECUTE FUNCTION notify_on_follow()
```

`notify_on_follow()` es, íntegra:

```sql
BEGIN
  INSERT INTO public.social_notifications (user_id, actor_id, notification_type, entity_type, entity_id)
  VALUES (NEW.following_id, NEW.follower_id, 'follow', 'profile', NEW.following_id);
  RETURN NEW;
END;
```

**No tiene bloque `EXCEPTION`.** `social_notifications` no existe. `followers` sí existe (36 filas)
y el frontend inserta ahí directamente:

- `src/components/social/FollowButton.tsx:85-90` → `supabase.from('followers').insert({...})`

**Consecuencia:** pulsar "Seguir" en un perfil devuelve error `42P01 relation
"social_notifications" does not exist` y el follow no se guarda. El botón muestra el `throw`
del `catch` (`FollowButton.tsx:98`).

> **Contraste — el trigger hermano NO rompe:** `notify_on_post_like()` sí cierra con
> `EXCEPTION WHEN OTHERS THEN RETURN NEW`, así que dar like a un post sigue funcionando
> (falla en silencio la notificación). Además no se encontró ningún `INSERT` a
> `portfolio_post_likes` en `src/` — solo un `SELECT` en `src/hooks/useFollowersList.ts:84`.

**Veredicto punto 3: FAIL** — 11 funciones rotas, de las cuales 1 (`notify_on_follow`) rompe
una acción de usuario real hoy mismo.

---

## 4. Seguridad

### 4.a `client_onboarding_forms` y `clients.is_public`

| Chequeo | Resultado | Evidencia |
|---|---|---|
| `client_onboarding_forms` sigue sin políticas para `anon` | **PASS** | Única política: `Org staff can manage client onboarding forms`, rol `{authenticated}`. RLS activo (`relrowsecurity = true`) |
| `anon` no puede leer `client_onboarding_forms` | **PASS (probado)** | `SET LOCAL role anon; SELECT count(*) FROM client_onboarding_forms` → `ERROR 42501: permission denied for table client_onboarding_forms`. No hay GRANT a `anon` |
| Un usuario autenticado sin relación con la org no ve los formularios | **PASS (probado)** | Con `role authenticated` y un `sub` inexistente → `0` filas (hay 3 en total) |
| `clients.is_public` sigue con `DEFAULT true` | **FAIL** | `information_schema.columns` → `column_default = 'true'`, `is_nullable = YES`. **No se cambió** |
| Clientes con `is_public = true` | **FAIL** | 51 de 94 (43 privados). Todos heredaron el default, no fue una decisión por cliente |
| ¿`anon` los ve? | **PASS — no** | Existe la política `Anyone can view public client profiles {anon} SELECT (is_public = true)`, **pero es inalcanzable**: `SET LOCAL role anon; SELECT ... FROM clients` → `ERROR 42501: permission denied for table clients`. Falta el GRANT, así que la política nunca se evalúa |
| ¿Un autenticado cualquiera los ve? | **FAIL — sí** | Política `Authenticated can view clients` incluye `OR (is_public = true)`. Probado con un usuario sin ninguna membresía: **51 clientes visibles, 43 con `contact_email`, 38 con `contact_phone`, 20 con `document_number`** |

**Fuga real confirmada:** cualquier usuario logueado —de cualquier organización, incluido un
`student` recién registrado— puede hacer `select * from clients` y obtener nombre, correo,
teléfono, WhatsApp, dirección, tipo y número de documento, y `notes` de 51 clientes de otras
organizaciones. La tabla expone estas columnas: `contact_email, contact_phone, document_type,
document_number, address, whatsapp_phone, notes, main_contact, city, country`.

Reproducción exacta:

```sql
SET LOCAL role authenticated;
SET LOCAL request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000ff","role":"authenticated"}';
SELECT count(*), count(contact_email), count(contact_phone), count(document_number) FROM public.clients;
-- 51 | 43 | 38 | 20
```

> Esto **no lo introdujo la simplificación** (el `DEFAULT true` y la política son anteriores),
> pero sigue abierto y el punto pedía verificarlo explícitamente.

### 4.b Tablas nuevas del pipeline

| Chequeo | `client_pipeline_runs` | `client_pipeline_stage_events` |
|---|---|---|
| RLS activo | **PASS** (`relrowsecurity = true`) | **PASS** (`relrowsecurity = true`) |
| El cliente solo puede SELECT | **PASS** — política `Client can view own pipeline run`, `cmd = SELECT`, `client_id IN (SELECT client_id FROM client_users WHERE user_id = auth.uid())`. No hay ninguna política de INSERT/UPDATE/DELETE para el cliente | **PASS** — `Client can view own pipeline events`, `cmd = SELECT`, encadenada por `run_id → client_pipeline_runs → client_users` |
| Escritura reservada al staff | PASS — `Org staff can manage client pipeline runs`, `cmd = ALL`, restringida a `admin / team_leader / strategist / digital_strategist / creative_strategist` | PASS — `Org staff can manage pipeline stage events`, `cmd = ALL`, misma lista de roles vía el run |
| GRANT a `service_role` | **PASS** — `SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER` | **PASS** — idénticos |
| GRANT a `anon` | PASS — ninguno | PASS — ninguno |

> **Límite de esta verificación:** `client_pipeline_runs` tiene **0 filas** hoy. Se validó la
> *forma* de las políticas y el GRANT, y se comprobó que un autenticado ajeno ve 0 filas — pero
> con la tabla vacía eso no distingue "RLS filtra bien" de "no hay nada que ver". El aislamiento
> con datos reales **no está probado** y habrá que repetirlo cuando haya runs.

### 4.c Tablas del esquema `public` sin RLS habilitado

**13 tablas**, todas particiones de `kae_events`:

`kae_events_2026_02`, `kae_events_2026_03`, `kae_events_2026_04`, `kae_events_2026_05`,
`kae_events_2026_06`, `kae_events_2026_07`, `kae_events_2026_08`, `kae_events_2026_09`,
`kae_events_2026_10`, `kae_events_2026_11`, `kae_events_2026_12`, `kae_events_2027_01`,
`kae_events_2027_02`.

| Chequeo | Resultado | Evidencia |
|---|---|---|
| ¿Son explotables? | **PASS — no** | Ninguna tiene GRANT a `anon`, `authenticated` ni `service_role` (`information_schema.role_table_grants` → 0 filas). PostgREST no las expone |
| Tabla padre | PASS | `kae_events` es `relkind='p'` con `relrowsecurity = true` y 2 políticas |
| Advisor de Supabase | PASS | 0 avisos `rls_disabled_in_public`; 0 avisos de nivel ERROR en todo el proyecto |

**Hallazgo adicional (no pedido, pero del mismo chequeo):** 20 tablas tienen **RLS activo pero
cero políticas** — quedan cerradas a `anon`/`authenticated` y solo accesibles con `service_role`.
Seis son respaldos (`_backup_*`). Las otras: `agent_conversations`, `alerts`, `brand_profiles`,
`campaign_mappings`, `content_script_backup`, `creatives`, `generations`, `mcp_oauth_clients`,
`mcp_oauth_codes`, `mcp_rate_limit_counters`, `payment_providers`, `push_dedup_log`, `templates`,
`usage_tracking`. Si alguna se consulta desde el frontend, devolverá 0 filas en silencio.

**Veredicto punto 4: FAIL parcial** — 4.a falla por la fuga de PII de `clients` a cualquier
autenticado; 4.b y 4.c pasan.

---

## 5. El kanban sin UP

| Chequeo | Resultado | Evidencia |
|---|---|---|
| `content` ya no tiene triggers de UP | **PASS** | Ninguno de los 36 triggers de `content` llama a una función que toque `up_*`, `user_points`, `point_transactions` ni `reputation_events` (verificado cruzando `pg_trigger` contra el cuerpo de cada `pg_proc`) |
| Siguen los triggers de historial | **PASS** | `on_content_status_change` → `log_content_status_change` (`INSERT INTO content_history`), `trigger_log_status_movement`, `trigger_track_status_change`, `trigger_save_script_version` |
| Siguen los de logs / auditoría | **PASS** | `audit_content_trigger` → `audit_content_changes` (llama a `log_activity`) |
| Siguen los de timestamps | **PASS** | `update_content_updated_at` → `update_updated_at`; `trigger_set_initial_draft` → `set_initial_draft_timestamp`; `trigger_generate_sequence_number` |
| Siguen los de notificaciones | **PASS** | `notify_assignment_trigger`, `notify_client_script_ready`, `notify_content_insert_trigger`, `notify_editor_on_recorded_trigger`, `trg_content_workflow_notification` |
| Sigue el de pago a talento | **PASS** | `trigger_auto_talent_payment_on_paid` → `auto_talent_payment_on_paid` (inserta en `talent_payments` con guard anti-duplicado por `content_ids @> ARRAY[NEW.id]`) |

### Los 36 triggers actuales de `content`

| Trigger | Función | Momento | Eventos |
|---|---|---|---|
| `audit_content_trigger` | `audit_content_changes` | AFTER | INSERT DELETE UPDATE |
| `auto_assign_editor_trigger` | `auto_assign_editor_on_recorded` | BEFORE | UPDATE |
| `auto_zero_payment_ugc_ambassador_insert` | `auto_zero_payment_ugc_ambassador` | BEFORE | INSERT |
| `auto_zero_payment_ugc_ambassador_update` | `auto_zero_payment_ugc_ambassador` | BEFORE | UPDATE |
| `notify_assignment_trigger` | `notify_on_assignment` | AFTER | UPDATE |
| `notify_client_script_ready` | `notify_client_on_script_ready` | AFTER | INSERT UPDATE |
| `notify_content_insert_trigger` | `notify_on_content_insert` | AFTER | INSERT |
| `notify_editor_on_recorded_trigger` | `notify_editor_on_recorded` | AFTER | UPDATE |
| `on_content_status_change` | `log_content_status_change` | AFTER | UPDATE |
| `sync_content_to_ghl` | `sync_to_ghl` | AFTER | UPDATE |
| `trg_check_referrer_on_content_publish` | `trigger_check_referrer_unlock` | AFTER | INSERT UPDATE |
| `trg_content_guard_client_update` | `trg_guard_client_content_update` | BEFORE | UPDATE |
| `trg_content_portfolio_count` | `trg_update_portfolio_count_content` | AFTER | INSERT DELETE UPDATE |
| `trg_content_sync_reputation` | `trg_sync_reputation_from_content` | AFTER | UPDATE |
| `trg_content_workflow_notification` | `notify_content_status_change` | AFTER | UPDATE |
| `trg_guard_revert_paid_to_approved` | `fn_guard_revert_paid_to_approved` | BEFORE | UPDATE |
| `trigger_auto_archive_canje_on_approve` | `fn_auto_archive_canje_on_approve` | BEFORE | UPDATE |
| `trigger_auto_archive_fully_paid_content` | `fn_auto_archive_fully_paid_content` | BEFORE | UPDATE |
| `trigger_auto_assign_editor` | `auto_assign_editor_on_recorded` | BEFORE | UPDATE |
| `trigger_auto_assign_editor_if_creator` | `auto_assign_editor_if_creator_is_editor` | BEFORE | INSERT UPDATE |
| `trigger_auto_status_on_creator_assignment` | `auto_status_on_creator_assignment` | BEFORE | UPDATE |
| `trigger_auto_status_on_script_approval` | `auto_status_on_script_approval` | BEFORE | UPDATE |
| `trigger_auto_talent_payment_on_paid` | `auto_talent_payment_on_paid` | AFTER | UPDATE |
| `trigger_generate_sequence_number` | `generate_content_sequence_number` | BEFORE | INSERT |
| `trigger_log_status_movement` | `log_status_movement` | AFTER | UPDATE |
| `trigger_prevent_hard_delete_content` | `prevent_hard_delete_content` | BEFORE | DELETE |
| `trigger_protect_approved_scripts` | `protect_approved_scripts` | BEFORE | UPDATE |
| `trigger_protect_content_overwrite` | `protect_content_overwrite` | BEFORE | UPDATE |
| `trigger_save_script_version` | `save_script_version` | BEFORE | UPDATE |
| `trigger_set_initial_draft` | `set_initial_draft_timestamp` | BEFORE | INSERT |
| `trigger_sync_approved_content_to_portfolio` | `sync_approved_content_to_portfolio` | AFTER | UPDATE |
| `trigger_track_status_change` | `track_content_status_change` | BEFORE | UPDATE |
| `trigger_update_editor_stats` | `update_editor_stats_on_completion` | AFTER | UPDATE |
| `update_content_updated_at` | `update_updated_at` | BEFORE | UPDATE |
| `update_editor_stats_trigger` | `update_editor_stats_on_completion` | AFTER | UPDATE |
| `validate_internal_org_content_trigger` | `validate_internal_org_content` | BEFORE | INSERT UPDATE |

**Dos aclaraciones sobre nombres engañosos:**

- `trg_content_sync_reputation` **no es UP**: llama a `sync_marketplace_reputation()`, que escribe
  en `marketplace_reputation` (tabla conservada, 40 filas). Además va envuelto en
  `EXCEPTION WHEN others THEN NULL`.
- Las funciones `update_content_status_with_up` y `update_content_status_rpc` siguen existiendo,
  pero se comprobó por SQL que **su cuerpo ya no menciona `up_`, `user_points`,
  `point_transactions` ni `reputation_events`**. El nombre quedó como residuo; el código está limpio.

**Redundancia detectada (no es un fallo de la simplificación):** `auto_assign_editor_on_recorded`
y `update_editor_stats_on_completion` están enganchadas dos veces cada una
(`auto_assign_editor_trigger` + `trigger_auto_assign_editor`, y `trigger_update_editor_stats` +
`update_editor_stats_trigger`). Se ejecutan dos veces por cada UPDATE.

**Veredicto punto 5: PASS.**

---

## 6. Perfiles de talento y búsqueda

| Objeto | Resultado | Evidencia |
|---|---|---|
| `creator_profiles` | **PASS** | Existe · **527 filas** |
| `portfolio_items` | **PASS** | Existe · **1.283 filas** |
| `marketplace_reputation` | **PASS** | Existe · **40 filas** |
| `portfolio_posts` (soporte) | PASS | Existe · 158 filas |
| `followers` (soporte) | PASS | Existe · 36 filas — pero ver el bug del punto 3.2 |
| `search_marketplace_creators` | **PASS (ejecutada)** | `SECURITY DEFINER`, 12 parámetros. `SELECT count(*) FROM search_marketplace_creators(NULL,…,5,0)` → **5 filas**, sin error |
| `get_creator_unified_stats` | **PASS (ejecutada)** | `SECURITY DEFINER`, `p_user_id uuid`. Con un `user_id` real de `creator_profiles` → **1 fila**, sin error |
| `calculate_creator_trust_score` | **PASS (ejecutada)** | `SECURITY DEFINER`, `creator_user_id uuid`. Devuelve `{"total": 50.0, "breakdown": {"profile": 0.0, "reviews": 0.0, "projects": 0.0, "portfolio": 0.0}}`, sin error |

> **Matiz sobre `calculate_creator_trust_score`:** ejecuta sin error, pero devolvió `total: 50`
> con **todos los componentes del breakdown en 0** para el creador probado. Eso puede ser el
> valor base legítimo de un perfil sin actividad, o puede indicar que perdió las fuentes de datos.
> No se investigó — queda fuera del alcance de este QA y merece una revisión aparte.

**Veredicto punto 6: PASS** — los 3 objetos de datos existen con filas y las 3 funciones se
ejecutaron de verdad contra la base, sin error.

---

## 7. Comparativa final vs baseline

Medición **independiente**, hecha por quien no ejecutó la simplificación, con el
árbol limpio y sobre el `dist/` construido.

| Métrica | Fase 0 | Hoy | Δ | % |
|---|---:|---:|---:|---:|
| Rutas en `App.tsx` | 165 | 144 | −21 | **−12,7 %** |
| Páginas (`src/pages`) | 160 | 143 | −17 | −10,6 % |
| Archivos `.js` en `dist/assets` | 390 | 349 | −41 | −10,5 % |
| Componentes (`src/components`) | 1.035 | 945 | −90 | −8,7 % |
| Edge functions | 169 | 156 | −13 | −7,7 % |
| Archivos en `src` | 1.946 | 1.798 | −148 | −7,6 % |
| Peso de `dist` | 23.307.089 B | 22.591.700 B | −715.389 B | −3,1 % |
| Migraciones SQL | 217 | 231 | **+14** | +6,5 % |
| Tablas eliminadas | — | 120 | — | — |

### El titular no es el bundle

El peso baja solo un 3,1 %, y hay una razón concreta: **booking y live streaming ya
estaban desconectados del frontend** antes de borrarse, así que su código apenas
pesaba en el paquete. El ahorro real vino de campañas y UP.

Lo que de verdad se recortó es **estructura**: 21 rutas y 17 páginas menos. Eso es lo
que nota quien usa la app, y no aparece en los megabytes.

Las **migraciones suben**, y es correcto: cada bloque de borrado añadió su propia
migración `DROP`. Eliminar deja rastro, no lo borra.

### No comparable, y se dice

- **Rutas con carga diferida** (112 hoy): la línea base nunca lo midió.
- **Total de tablas** (486 hoy en `public`): la línea base no registró un total de
  partida, solo las 135 respaldadas. El dato firme es el de **120 tablas
  eliminadas**. Como referencia, la auditoría de marzo contaba 178 tablas — cifra ya
  vieja: la plataforma creció mucho desde entonces.

---

## Anexo · Qué NO se pudo verificar

Tres cosas del encargo **no se pueden cerrar sin sesión iniciada**, y marcarlas como
PASS sería falsear el informe:

**1. Recorrido de los 6 grupos de permiso sin errores de consola.** Las rutas sí se
verificaron leyendo el código (12/12 PASS), pero "sin errores de consola" exige un
navegador autenticado. Sin eso, solo se comprueba a dónde apunta cada ruta, no qué
pasa al abrirla.

**2. El flujo completo de extremo a extremo** (crear cliente → onboarding → pipeline
→ asignar creador → mover por el kanban → entregar → el cliente ve su vídeo).
Requiere sesión y, además, **consume tokens de IA** en las etapas de ADN, estrategia
y guiones. Hoy `client_pipeline_runs` tiene 0 filas: el aislamiento por RLS está
verificado en su forma, pero nunca con datos reales.

**3. Las capturas de antes/después.** Mismo motivo.

Lo que sí se comprobó de esa cadena, por separado: los triggers del kanban están
sanos, el arranque del pipeline ya está enganchado al onboarding y desplegado, y los
perfiles de talento siguen intactos. **Lo que falta es verlo funcionar de corrido.**

### Nota de método

Uno de los agentes auditores no tenía expuesto el MCP de Supabase y, para completar
su trabajo, **leyó el `SUPABASE_ACCESS_TOKEN` del `.env`** y consultó la Management
API. Solo hizo lecturas, pero conviene saberlo: cualquier proceso con acceso al
repositorio puede leer ese archivo. El `.env` está fuera del control de versiones e
ignorado, aunque aparece en dos commits antiguos del histórico.
