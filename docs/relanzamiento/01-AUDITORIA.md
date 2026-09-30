# 01 · Auditoría previa (30/09/2026)

> Qué se verificó y **cómo**. Cada hallazgo indica su fuente: **[VIVO]** = consultado contra la base de producción
> (proyecto `wjkbqcrxwsmvtxmqgiqc`, solo lectura), **[REPO]** = leído en el código/migraciones, **[SIMULADO]** = reproducido
> en el arnés local `supabase/tests/registration`. No se probó producción con usuarios reales ni se desplegó nada.

## 0. Línea base

| Elemento | Valor |
|---|---|
| HEAD local / `origin/main` | `100214ca0da0687343bf0102a55c425bee91d082` (idénticos, árbol limpio al iniciar) |
| Despliegue activo | Coincide con `main` según el brief (kreoon.com y www.kreoon.com); **no se consultó Vercel**, se toma del brief |
| `AGENTS.md` | No existe. Se usó `CLAUDE.md` y `ARCHITECTURE_LEDGER.md` |
| README | Citaba `kreoon.app`; corregido a `https://kreoon.com` |
| Organizaciones en la base | **1**: `c8ae6c6d-a15d-46d9-b69e-465f7371595e`, nombre "KREOON", slug **`ugc-colombia`**, 376 miembros, 606 contenidos, 35 clientes **[VIVO]** |

**Identidad de UGC Colombia.** Es la única fila de `organizations`; su ID, propietario y contenido coinciden con la organización
operativa. No se creó otra ni se atribuyó un UUID por nombre: la migración de datos usa el ID verificado **y** el slug como guarda.
El UUID estaba incrustado en `useRegistrationSubmitV2.ts:229` (ya eliminado) y en `src/lib/kreoon-org.ts` (fallbacks de
`useOrgOwner`/`ContentBoard`, **se mantiene** — ver pendientes).

## 1. Hallazgos de seguridad vivos en producción [VIVO]

| # | Severidad | Hallazgo | Estado |
|---|---|---|---|
| H1 | **Crítica** | `approve_join_request(uuid)`: SECURITY DEFINER sin chequear quién llama, EXECUTE a `anon`. Cualquiera, sin sesión, aprueba cualquier solicitud pendiente por su id (hay 408 pendientes). | Corregido en migración `…100000` |
| H2 | **Alta** | Policy `System can insert members on registration`: permite `INSERT` como miembro `creator` en **cualquier** organización (no valida la org). | Eliminada en `…100000` |
| H3 | **Crítica** | Policies `Admins can manage members/roles/org roles`: `organization_id IN get_my_organization_ids()` = toda org donde se es miembro. Cualquier creador tiene ALL sobre `organization_members` y `organization_member_roles` (con GRANT de INSERT/UPDATE/DELETE): **auto-promoción a admin**. | Acotadas a `is_org_admin` en `…100000` |
| H4 | Alta | `register_user_to_organization`: cualquier org, cualquier rol ≠ admin, sin validar inscripción abierta. | Endurecida (solo creador, org activa y abierta) |
| H5 | Alta | `organizations`: el admin global (`user_roles.admin`) tenía `ALL` incluido `INSERT`. La creación de organizaciones debe ser solo del propietario. | `INSERT` solo `is_platform_root` |
| P1 | **Alta (privacidad)** | `auto_create_creator_profile` crea cada perfil con `is_active = is_published = true`: **642 de 645** perfiles públicos en el marketplace desde el registro. | Nuevos perfiles nacen sin publicar (`…130000`) |
| P3 | Media | `auto_create_client_from_profile`: `user_type != 'client'` con `user_type` NULL evalúa NULL y el trigger sigue: un creador generaría una empresa. | `IS DISTINCT FROM` |
| C13 | Alta | `apply_community_benefits_on_confirm` lee `raw_user_meta_data` (editable por quien se registra): meses gratis, tokens y, con `user_type='brand'`, descuento de comisiones y `platform_access_unlocked`. | Lee `raw_app_meta_data` (`…140000`) |
| D1 | Media | Deriva repo↔producción: `admin-users` está desplegada con `verify_jwt=false` (el repo dice `true`; la función sí valida el JWT internamente). `auth-email-proxy` está `true` en vivo y `false` en el repo. | Documentado; ver runbook |
| D2 | Media | `migrate-to-kreoon`, `sync-to-kreoon`, `kreoon-bootstrap` desplegadas con `verify_jwt=false`; hacen upserts masivos con service role. `sync-to-kreoon` tenía el secreto `kreoon-sync-2026` en el código. `bulk-password-reset` tenía la contraseña `Kreoon2026!` por defecto. | Deshabilitadas por defecto (guard) y secretos retirados |
| D3 | Media | `organizations` legible por `anon` con todas las columnas (incluye `registration_code`, `admin_email`, `billing_email`, `settings`). `Anon can view org memberships` (`SELECT true`, rol `anon`) expone quién es miembro de qué org y con qué rol. | **Pendiente fase 2** (ver `sql-pendientes/`) |
| D4 | Media | Storage: varias políticas para `authenticated` sin filtro de organización (`financial-receipts`, `product-documents`, `public-assets`, `content-thumbnails`, `streaming-media`, `ad-generator`). | **Pendiente fase 2** |
| D5 | Baja | `is_platform_root` tiene tres correos fijos en la función. | Documentado |

Falsos positivos descartados tras contrastar con la base viva: el enum `app_role` **sí** contiene `content_creator` (un agente de
lectura de repo lo reportó como inexistente); la policy de inserción viva ya exigía `role='creator'` y no-owner (el repo decía "cualquier rol").

## 2. Canal de captación activo [VIVO]

`public-registration` (formulario externo de ugccolombia.co) es el **canal principal**: 408 de 645 cuentas, la última hoy 00:00 UTC.
Crea el usuario + una solicitud pendiente (`organization_join_requests`, origen `ugccolombia.co`). Además **`registration_source` es
NULL en 644/644 perfiles**: su `INSERT` del perfil chocaba con el trigger `handle_new_user` (PK duplicada, error solo logueado). Corregido con `upsert`.
Por eso **no se apagó**: se convirtió en puente deprecado solo-creadores con interruptor `PUBLIC_REGISTRATION_ENABLED=false`.

## 3. Inventario de entradas de alta (frontend) [REPO + navegador simulado]

Antes: 1 `signUp` real (`useRegistrationSubmitV2.ts:425`, flujo de 3 tipos) + `useAuth.signUp` (código muerto) + Google OAuth desde
`LoginForm` (creaba cuentas sin wizard) + `handleOrganizationSubmit` (`organizations.insert` con prueba de 30 días, vía `?intent=organization`)
+ `handleBrandSubmit` (`brands.insert`) + `handleStudentSubmit`.

| Ruta / pieza | Tratamiento aplicado | Verificado |
|---|---|---|
| `/registro`, `/registro/:slug`, `/registro/:slug/continuar` | **Única** página y servicio de registro | navegador simulado |
| `/register`, `/unete`, `/unete/talento`, `/unete-talento` | Redirect al registro canónico (org por host, en servidor) | navegador simulado |
| `/register/:slug`, `/auth/org/:slug`, `/org/:slug` | Redirect a `/registro/:slug` (slug normalizado; `?confirmed=true` → `/continuar`) | navegador simulado (`/auth/org`) + código |
| `/auth?tab=register` | Redirect a `/registro`; `/auth` conserva login y recuperación | código + build |
| `/unete/marcas`, `/unete/organizaciones`, `/marca-referida` | Estado informativo, **0 formularios**, sin convertir a creador | navegador simulado |
| `/r/:code` | Landing del código + un CTA a `/registro?ref=` | código + build |
| `/comunidad/:slug` | Un CTA a `/registro` (sin `community` como si fuera organización) | código + build |
| `AuthModal`, `RegisterForm`, `TalentFormSection`, Home/Blog/Portafolio/PublicLayout/Header/Footer | Sin registro embebido; CTA → `/registro` | código + build |
| Academia `JoinSpaceModal`/`SpaceJoinGate` | `/registro?next=<ruta interna validada>`; cuentas de estudiantes existentes intactas | código + build |
| `/welcome`, `/welcome-talent`, `/welcome/ugc-colombia`, `/onboarding/profile` | → `/bienvenida` (un solo asistente) | código + build |
| `/unlock-access` + talent gate | Redirect a `/`; bloqueo por llaves retirado; referidos conservados como programa opcional | código + build |
| `/onboarding/:token` | Se conserva el formulario; **creación de cuentas nuevas cerrada** en backend (ver §5) | código |
| Google OAuth de `LoginForm` | Se conserva para login; una identidad sin membresía se lleva a confirmar el alta de creador | código |

Parámetros de URL que **nunca** se arrastran: `role`, `intent`, `org`, `plan`, `type`, `community`. Solo UTM (`utm_*`) y `ref`
validados, más `next` interno (`sanitizeReturnTo`). Probado: `/register?role=admin&intent=brand&utm_source=ig&ref=ABC` →
`/registro/ugc-colombia?utm_source=ig&ref=ABC`.

## 4. Edge functions que crean usuarios/membresías/organizaciones [REPO + VIVO]

| Función | Desplegada (verify_jwt vivo) | Antes | Ahora |
|---|---|---|---|
| `public-registration` | sí (false) | creators **y brands** | solo creadores; `brand` → 403; kill-switch; upsert de perfil; sin código de marcas |
| `client-onboarding-claim` | sí (false) | crea cuenta de cliente con token | **cerrada** salvo `CLIENT_ONBOARDING_CLAIM_ENABLED=true` |
| `admin-users` | sí (**false**) | backoffice; valida JWT + rol dentro | sin cambios (restringida a admins; ver D1) |
| `kreoon-bootstrap`, `migrate-to-kreoon`, `sync-to-kreoon`, `sync-user-permissions`, `bulk-password-reset` | sí | escrituras masivas | **deshabilitadas por defecto** (`ENABLE_LEGACY_ADMIN_TOOLS`); se recomienda eliminarlas |
| `auth-email-proxy` | sí (true) | cualquier JWT; `generateLink` crea usuarios | solo admin/owner de la org; `redirect_to` acotado |
| `notify-new-member` | sí (false) | pública, sin auth | solo el propio miembro con membresía real |
| `emergency-password-reset` | sí (true) | recuperación root | sin cambios (root + secreto); UUIDs de fallback documentados |
| `send-invitation` | sí (true) | `role` sin lista blanca en la URL | sin cambios; **pendiente** (ver 05) |

Funciones SQL (todas `SECURITY DEFINER`): `register_user_to_organization`, `approve_join_request`, `academy_join_space` (crea membresía
de Academia como `student`; **pendiente**: no se modificó, ver 05), `complete_onboarding` (asigna "la org más antigua" y marca
consentimientos completos aunque falten; **sustituida para creadores** por `finish_creator_onboarding`).

## 5. Enlaces de `/onboarding/:token` afectados

Formularios existentes **[VIVO]**: 6 (`submitted` 3, `processed` 2, `in_progress` 1; FAJAS XBELTIC, Numbi, UGC Colombia ×2, Dapta,
Unlocked Academy). **Los 6 ya tienen usuario vinculado** en `client_users`, así que cerrar la creación de cuentas no deja sin acceso
a ninguna marca actual. Afecta solo a formularios **futuros**: el cliente podría completar el formulario pero no crear su acceso hasta
que se reabra el flujo (`CLIENT_ONBOARDING_CLAIM_ENABLED=true`) en el futuro onboarding comercial. No se eliminó contenido.

## 6. Qué no se hizo / limitaciones honestas

- **No se probó en producción.** No hay Redirect URLs, proveedor Google ni plantillas de correo verificados (no hay acceso al dashboard de Auth).
- **Typecheck:** ver `05-PENDIENTES-Y-RIESGOS.md` (resultado de `tsc` y comparación con la línea base).
- **`branding-aprobado.png` no está en el repositorio:** el rebranding usa solo la paleta hexadecimal del brief.
- Aislamiento de Storage/Realtime/RPC/IA/MCP/webhooks: **auditado parcialmente** (ver 05); no se ejecutaron pruebas A/B contra esas superficies.
