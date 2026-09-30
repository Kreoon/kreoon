# 05 · Pendientes, decisiones y riesgos

## Validación ejecutada (con sus límites)

| Validación | Resultado | Límite |
|---|---|---|
| `eslint` en archivos tocados | 0 errores (4 *warnings* de fast-refresh preexistentes) | |
| `tsc --noEmit` completo | 1.429 errores (línea base del ledger ~1.566): **0 en archivos nuevos**; 1 error nuevo en línea modificada (`navigate` sin definir en `PortfolioShowcasePage`) **corregido**; el resto preexistente | La base ya estaba con errores; se comparó por archivo/línea, no contra un `tsc` de `main` |
| `npm run build` | OK | |
| Vitest | 67 pruebas OK (rutas, `returnTo`, atribución, redirects, destino, onboarding, formulario, consentimiento, cooldown) | No hay pruebas E2E automatizadas en CI |
| Arnés SQL | 72/72 migrado; 14 de 23 fallan sin migrar (evidencia de los huecos) | **Esquema simulado** a partir de las policies vivas, no la base real |
| Navegador (Playwright, backend simulado) | Flujo de registro, estados (cerrada, no encontrada, marcas cerrado), redirects heredados, móvil 390 px y escritorio 1280 px | El backend es simulado: **no** se probaron correo real, Google real ni Supabase real |
| axe-core (WCAG 2.1 AA + buenas prácticas) | 0 violaciones en 6 estados | Solo las pantallas del viaje del creador |
| Teclado | Orden lógico, foco visible en todos los controles | |
| Contraste | `npm run check:contrast` AA completo en claro y oscuro | Solo tokens; los 203 archivos con colores duros no se auditaron |
| Revisión adversarial independiente | Sin críticos en el diff; 1 alto y 7 medios, **corregidos** salvo lo listado abajo | Un agente distinto leyó el diff y atacó un arnés propio; lo dependiente de producción quedó marcado |

**No validado:** callbacks reales de correo y OAuth, apertura del enlace en otro dispositivo con Supabase real, pruebas A/B de aislamiento
contra el backend real (requiere rama de Supabase y una 2.ª organización), Storage firmado, Realtime, exportaciones, búsqueda, IA, MCP,
webhooks e integraciones externas, regresión de roles con cuentas reales, migración en ensayo.

## Revisión adversarial: qué se corrigió y qué queda

| Hallazgo | Acción |
|---|---|
| **A1** `current_organization_id` editable a mano (acceso cruzado latente) | Corregido: guard ampliado (`…170000`), con pruebas |
| **M1** org con `registration_require_invite=true` quedaba abierta | Corregido: abierta = inscripción abierta **y** sin invitación obligatoria (get_registration_org, estado, alta y wrapper) |
| **M2** un admin/team_leader podía degradar o borrar al owner | Corregido: el owner queda fuera de las policies de admin |
| **M3** `register_user_to_organization` saltaba consentimientos y rompía marcas independientes en el onboarding legado | Corregido: exige consentimientos al creador; acepta `client` solo de cuentas de marca/cliente existentes |
| **M4** `sanitizeReturnTo("/.//evil.com")` devolvía `//evil.com` | Corregido y con pruebas |
| **M5** HTML sin escapar en correos (`public-registration`, `notify-new-member`, `auth-email-proxy`); `full_name` ausente causaba 500 tras crear la cuenta | Corregido (`escapeHtml`, validación de nombre) |
| **M6** miembro retirado (`deleted_at`) se reincorporaba solo | Corregido: queda como inscripción cerrada para esa persona |
| **M7** `UpgradeToBrandWizard` montado en el panel de estudiantes | Retirado de la UI. **`brands_insert` sigue abierto en BD** (decisión 8) |
| Consentimiento previo `accepted=false` quedaba sin aceptar | Corregido (`ON CONFLICT … DO UPDATE WHERE accepted = false`) |
| Intención en `sessionStorage` heredable por otra persona en la pestaña | Mitigado: se liga al correo del registro (en Google se desconoce el correo; TTL 1 h) |
| Marcas independientes sin roles mandadas a "unirte como creador" | Corregido: `profiles.active_brand_id` las mantiene en su flujo |
| IP de aceptación tomada del primer `x-forwarded-for` | **Abierto** (bajo): puede venir del cliente; tomar el valor que inyecta el proxy de Supabase |
| `complete_creator_signup` no verifica `email_confirmed_at` | **Abierto** (bajo): depende de "Confirm email" activo; sin confirmación no hay sesión |
| Pre-secuestro por `public-registration` (correo de la víctima con contraseña del atacante, sin captcha/rate limit) | **Abierto**: mitigar apagando el puente (`PUBLIC_REGISTRATION_ENABLED=false`) apenas ugccolombia.co enlace al registro canónico |
| `send-invitation`, `auth-email-proxy` (un admin de org enterprise puede enviar cualquier tipo de enlace a cualquier correo) | **Abierto** (medio-bajo) |

## Decisiones que necesito de Alexander

1. **Autorizar el Tiempo A** (migraciones `…100000` y `…160000`): H1/H3/H6 son explotables hoy. Recomiendo hacerlo antes que el resto.
2. **Canal ugccolombia.co:** es el 63 % de las altas. Actualizar el formulario para enlazar a `/registro/ugc-colombia` y luego `PUBLIC_REGISTRATION_ENABLED=false`. ¿Fecha?
3. **642 perfiles ya públicos.** Solo los nuevos nacen sin publicar. ¿Despublicar a los existentes que nunca publicaron un portafolio? Es una decisión de producto con impacto en el marketplace.
4. **268 perfiles sin membresía** (255 con solicitud pendiente): ¿que confirmen al iniciar sesión (soportado) o aprobar desde el panel? No aprobar en masa sin revisar.
5. **283 filas huérfanas** (configuración de organizaciones que ya no existen + 1 membresía): ¿archivar, remapear a UGC Colombia o eliminar? Clasificar por tabla.
6. **Consentimientos:** hoy son 5 documentos en el registro. ¿Mover DMCA y moderación al momento de publicar? Revisar con jurídico los HTML de `age_declaration`/`general_terms` (~48 caracteres) y el doble contrato `talent_agreement` + `creator_agreement`.
7. **Tema por defecto:** sigue `dark` porque 203 archivos fijan fondos oscuros y 465 `text-white`. Cambiar a claro exige un *codemod* y QA visual por superficie.
8. **`brands_insert`:** cualquier autenticado puede crear una marca por PostgREST (ver `sql-pendientes/`, bloque E). ¿Cerrar ya para clientes sin marca previa?
9. **Nombre de la plataforma/dominio:** se mantiene Kreoon y kreoon.com (aprobado en el brief). La organización pasa a llamarse "UGC Colombia" en BD.

## Riesgos residuales

| Riesgo | Mitigación / siguiente paso |
|---|---|
| `organizations` y `organization_members` legibles por `anon` (fuga de `registration_code`, correos y pertenencia/rol) | `sql-pendientes/fase2-aislamiento.sql` A y B; antes inventariar consumidores |
| `product-documents` sin filtro de organización | Bloque C del mismo archivo |
| Deriva repo↔producción (`admin-users` con `verify_jwt=false` en vivo; `auth-email-proxy`) | Alinear `config.toml` con lo desplegado; regenerar desde producción |
| `send-invitation`: `role` viaja en la URL sin lista blanca y el magic link crea usuarios; el ledger ya la marca rota (tabla `invitations` inexistente) | Reescribir al definir invitaciones opcionales |
| `academy_join_space` (RPC) sigue creando membresías `student` a usuarios autenticados | El alta pública como estudiante se retiró; la RPC atiende a cuentas existentes. Decidir si se restringe |
| `src/lib/kreoon-org.ts` conserva el UUID como fallback de `useOrgOwner`/`ContentBoard` | Reemplazar por el contexto de organización antes de una 2.ª organización |
| `is_platform_root` con 3 correos fijos | Mover a tabla/variable |
| Doble gate legal (`creator_agreement` modal) puede aparecer sobre el onboarding | Decisión 6 |
| Las RPC nuevas se llaman con *cast* (tipos no regenerados) | Runbook paso 6 |
| `/r/:code` no resuelve la organización del referidor (la tabla de referidos no la guarda) | Conduce a la org del host con `ref`; añadir columna si se quiere por organización |
| Segundas organizaciones: ninguna función asume una sola, pero `complete_onboarding` (legado) usa "la más antigua" | Sustituida para creadores; retirar para el resto en su momento |

## Configuración externa pendiente (no verificable desde el repo)
Redirect URLs de Supabase Auth (`/registro/**`, `/auth/callback`), proveedor Google, plantilla *Confirm signup*, variables de las edge
functions, `VITE_GOOGLE_AUTH_ENABLED`, DNS/dominios por organización futura, y `branding-aprobado.png` (no está en el repositorio).
