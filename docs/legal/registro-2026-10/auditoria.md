# Auditoría de la documentación legal del registro de creadores

- **Fecha:** 1 de octubre de 2026
- **Alcance:** registro público de creadores (`/registro/:organizationSlug` y `/registro/:organizationSlug/continuar`) de la rama `claude/focused-mendel-es4xcv`, más el estado vivo de la base de datos del proyecto Supabase `wjkbqcrxwsmvtxmqgiqc` (consultado **solo con SQL de lectura** el 2026-10-01).
- **Estado:** documento técnico de trabajo. **No es una opinión jurídica** ni aprueba ningún texto.

> Convención: «archivo:línea» se refiere al repositorio en esta rama. «BD» significa que el dato se leyó en producción con `SELECT`. Nada se escribió en la base de datos.

---

## 1. Resumen ejecutivo

1. El registro de creadores exige hoy **5 documentos** (BD, `list_registration_documents('talent')`): Declaración de Edad (`age_declaration` v1.0), Términos Generales KREOON (`general_terms` v1.0), Acuerdo de Talento KREOON (`talent_agreement` 1.0), Política de Moderación de Contenido (`content_moderation_policy` 1.0) y Política de Derechos de Autor DMCA (`dmca_policy` 1.0).
2. **La evidencia de aceptación no es verificable.** 4 de esos 5 documentos guardan en BD solo un comentario HTML (`<!-- Ver public/legal/... -->`) y la Política de Moderación guarda literalmente `<!-- Documento pendiente de generar -->`. El texto que la persona lee sale de archivos estáticos de `public/legal/` que pueden cambiar sin dejar rastro. `content_hash` es `NULL` en todos menos `client_agreement` v2.0.
3. **Los registros de consentimiento se pueden falsificar.** Las funciones `record_consent`, `record_age_verification` y `sign_legal_document` son `SECURITY DEFINER`, reciben `p_user_id` y la IP como parámetros, **no comprueban `auth.uid()`** y las puede ejecutar el rol `anon` (BD). Además, la tabla `user_legal_consents` permite a cualquier usuario autenticado `INSERT` y `UPDATE` de sus propias filas (políticas `user_creates_own_consent` y `user_updates_own_consent`), con lo que puede reescribir `accepted_at`, IP, versión o revocación.
4. **Contradicciones de fondo** entre documentos que la persona acepta a la vez: los Términos Generales dicen que el creador conserva sus derechos y otorga una licencia no exclusiva; el Acuerdo de Talento impone una cesión de imagen «ilimitada, irrevocable, perpetua» y una cesión automática de todos los derechos patrimoniales, con prohibición de usar el propio trabajo en el portafolio. Ley aplicable: Florida en tres documentos, Colombia en `/terms`.
5. **Datos del operador contradictorios** (dos domicilios distintos para SICOMMER INT LLC) y sin verificar. Ver §7.
6. El bloque de consentimiento que está **modificado sin confirmar en el árbol de trabajo** (`src/components/registro/ConsentBlock.tsx`) dice «acepto … la Política de privacidad», pero la política de privacidad **no está entre los documentos que se registran** (está `deprecated` para el registro) y el enlace `/privacy` abre otro texto distinto de `privacy_policy_v1.html`. Ese cambio también **esconde los cinco documentos detrás de un diálogo**, que es justo lo que el encargo pide no hacer. No se tocó: es trabajo de otra sesión.
7. Tras el registro existe una **segunda puerta legal**: `RoleLegalGateProvider` vigila la tabla `creator_profiles` y abre el `creator_agreement` v2.0 (cesión perpetua + autorización de imagen perpetua, firma por nombre escrito) para el rol `creator` (BD: `role_legal_gates.target_role='creator'`). Debe verificarse en preview si salta para los creadores nuevos; si salta, contradice el registro simplificado.
8. Los datos del perfil (nombre, correo, teléfono…) se envían por disparadores de base de datos a **Pancake** (CRM externo, `pos.pages.fm` / `crm.pancake.vn`) en cuanto el perfil tiene nombre y correo, **antes** de que exista ningún consentimiento registrado. Ninguna política lo menciona.

---

## 2. Inventario de documentos

### 2.1 Documentos exigidos hoy en el registro de creadores (BD)

| `document_type` | versión | título | contenido en BD | texto que se muestra | aceptaciones en BD |
|---|---|---|---|---|---|
| `age_declaration` | v1.0 (2026-03-24) | Declaración de Edad | comentario `<!-- Ver public/legal/age_declaration_v1.html -->` | `public/legal/age_declaration_v1.html` | 221 |
| `general_terms` | v1.0 (2026-03-24) | Términos Generales KREOON | comentario | `public/legal/general_terms_v1.html` (480 líneas; incluye Términos + Privacidad + Tratamiento LATAM + Cookies + Licencia para clientes) | 216 |
| `talent_agreement` | 1.0 (2026-03-30) | Acuerdo de Talento KREOON | HTML completo (13 524 caracteres), `published_at` NULL | el de BD | 153 (+128 firmas en `digital_signatures`) |
| `content_moderation_policy` | 1.0 (2026-03-05) | Política de Moderación de Contenido | `<!-- Documento pendiente de generar -->` | `public/legal/content_moderation_policy_v1.html` | 76 |
| `dmca_policy` | 1.0 (2026-03-05) | Política de Derechos de Autor (DMCA) | comentario | `public/legal/dmca_policy_v1.html` | 77 |

Requisitos (BD, `legal_consent_requirements`): `age_declaration` y `general_terms` con `user_role='all'`; `talent_agreement` con `account_type='talent'`; `dmca_policy` y `content_moderation_policy` con `user_role='creator'` y `required_at='first_upload'`, pero `trigger_event='registration'`, así que se piden **en el registro** aunque su propio requisito diga «primera subida». `live_shopping_terms` (creator) no aparece porque no hay fila vigente en `legal_documents`.

### 2.2 Otros documentos que tocan al creador

| Documento | Estado | Observación |
|---|---|---|
| `creator_agreement` v2.0 | vigente, `applies_to = {creator, editor}`, `trigger_event='role_assignment'` | Cesión perpetua de derechos patrimoniales, incluido contenido **ya publicado** (§2.4 del archivo) y autorización de imagen perpetua sin compensación. Se pide por `RoleLegalGateProvider` (ver §5.4). 28 aceptaciones + 34 firmas. |
| `creator_agreement` 1.0 | no vigente | 43 aceptaciones. Archivo `public/legal/creator_agreement_v1.html`. |
| `privacy_policy` 1.0 | vigente pero `deprecated` para el registro | 119 aceptaciones antiguas. Archivo `public/legal/privacy_policy_v1.html` (593 líneas). |
| `terms_of_service` 1.0, `acceptable_use_policy` 1.0, `age_verification_policy` 1.0, `cookie_policy` 1.0 | vigentes, `deprecated` para el registro | Se siguen sirviendo en `/legal/:tipo`. `cookie_policy` es un párrafo de 268 caracteres. |
| `/privacy` y `/terms` | páginas React (`src/pages/legal/PrivacyPolicy.tsx`, `TermsOfService.tsx`) | Textos **distintos** de los de `public/legal/`. Preparados para la revisión de apps de Meta (`src/App.tsx:489`). `/privacy` no identifica al responsable; `/terms` dice ley colombiana (`TermsOfService.tsx:143-145`). |
| `/data-deletion` | `src/pages/legal/DataDeletion.tsx:26` | Inserta en `data_deletion_requests` y promete eliminar en 30 días. Es el único canal de supresión real que existe en el código. |

### 2.3 Almacenamiento y rutas

- Catálogo: tabla `legal_documents` (columnas: `id, document_type, version, version_date, title, content_html, summary, is_current, is_required, applies_to, content_hash, published_at…`). RLS activo; políticas solo de `SELECT` (`anon` ve `is_current=true`, `authenticated` ve todo). `authenticated` tiene `GRANT` de escritura pero sin política que la permita.
- Evidencia: tabla `user_legal_consents` (`UNIQUE (user_id, document_id)`; sin `organization_id`; `consent_method` libre). Métodos en BD: `clickwrap` 1 332, `typed_name` 97, `registration` 5.
- Firmas: tabla `digital_signatures` (guarda `document_hash` = SHA-256 de `content_html`; para los documentos con comentario, el hash es del comentario, no del texto leído).
- Ruta pública: `/legal/:documentType` (`src/App.tsx:493`) → `src/pages/legal/LegalDocumentPage.tsx`:
  - solo muestra la versión `is_current` (`LegalDocumentPage.tsx:37-42`): **no hay URL estable para versiones anteriores**;
  - si `content_html` empieza por `<!--` o mide menos de 100 caracteres, descarga `/legal/{tipo}_v{mayor}.html` (`LegalDocumentPage.tsx:55-69`). La versión aceptada en BD y el archivo mostrado no están ligados por nada verificable.
- No hay descarga ni copia del documento aceptado, ni comprobante para el creador.

---

## 3. Flujo de registro por correo (rama actual)

1. `OrganizationRegistrationPage.tsx:55-60` pide los documentos con `get_creator_signup_documents()` (BD: envoltorio de `list_registration_documents('talent')`).
2. `CreatorSignupForm.tsx:176` muestra `ConsentBlock` con **una sola casilla** para los 5 documentos (versión confirmada en git: lista visible de enlaces; versión modificada sin confirmar: dos enlaces y un diálogo). Los enlaces abren en pestaña nueva (`target="_blank"`), así que el formulario no pierde los datos.
3. El botón «Crear mi cuenta» exige la casilla en el cliente (`CreatorSignupForm.tsx:65`).
4. `OrganizationRegistrationPage.tsx:114` guarda en `sessionStorage` la intención (`slug`, correo, `documentIds`) y `:115` llama a `supabase.auth.signUp` (`service.ts:175-208`). **La cuenta (`auth.users` + `profiles` + `creator_profiles` por disparador) existe desde aquí, sin consentimiento registrado.**
5. Si `docsQuery` aún no cargó o falló, `docIds` es `[]` (`OrganizationRegistrationPage.tsx:105-106`) y el alta se permite igual; el servidor lo detecta después (`consents_required`) y `ContinueSignup` vuelve a pedir la aceptación. Es seguro, pero confuso.
6. Tras confirmar el correo, `/continuar` (`ContinueSignup.tsx:107-116`) llama a `complete_creator_signup` con los `documentIds` guardados.
7. `complete_creator_signup` (BD, **ya aplicada en producción**, aunque el ledger la da por pendiente; repo: `supabase/migrations/20260930110000_creator_registration_core.sql:137-274`):
   - exige que estén aceptados todos los documentos vigentes (`:206-216`); un `document_id` obsoleto produce `consents_required` (bien: no se acepta una versión vieja);
   - inserta en `user_legal_consents` con `now()` del servidor, IP de `x-forwarded-for` y `user_agent` (`:219-240`), `consent_method='registration'` (no distingue correo de Google), **sin organización de contexto**;
   - en la misma transacción crea la membresía con rol fijo `content_creator`. Si falla el registro de consentimientos, no hay membresía (correcto).
   - `ON CONFLICT (user_id, document_id) DO UPDATE … WHERE accepted = false` (`:237-240`): una reaceptación del mismo documento no deja una fila nueva.

## 4. Flujo de registro con Google

1. `CreatorSignupForm.tsx:69-73`: «Continuar con Google» exige la casilla marcada antes de redirigir.
2. `OrganizationRegistrationPage.tsx:135` guarda la intención **sin correo** (en Google se desconoce) y `service.ts:210-216` llama a `signInWithOAuth`. Supabase crea la cuenta al volver de Google, antes de cualquier aceptación registrada.
3. En `/continuar`, si hay intención en la misma pestaña y la persona no tiene otras membresías, se completa sola (`ContinueSignup.tsx:107-116`).
4. **¿Se puede saltar la aceptación?** No para obtener la membresía: sin documentos aceptados, `complete_creator_signup` lanza `consents_required` y `ContinueSignup` muestra la casilla (`ContinueSignup.tsx:121-127`, `:227`). Quien entra con Google desde `/auth` sin pasar por `/registro` queda sin roles y `OnboardingGateProvider` lo envía a `/registro` (ledger 2026-09-30). Riesgos que sí existen:
   - **Herencia de la intención:** como la intención de Google no lleva correo, la comprobación de `service.ts:145` no aplica; si otra persona inicia sesión en la misma pestaña dentro de la hora (`INTENT_TTL_MS`, `service.ts:129`), hereda la aceptación marcada por la primera. Riesgo bajo, pero la evidencia sería falsa.
   - Los `documentIds` los aporta el cliente; el servidor valida que sean los vigentes, no que la persona los haya visto.
   - **Google no parece configurado en producción:** `auth.identities` solo tiene proveedor `email` (648 identidades, BD), pero el botón se muestra por defecto (`CreatorSignupForm.tsx:33`, `VITE_GOOGLE_AUTH_ENABLED !== "false"`). Verificar en el panel de Supabase antes de anunciarlo.
5. El canal externo `public-registration` (ugccolombia.co) **no registra consentimientos** (`supabase/functions/public-registration/index.ts:17-18`); guarda `legal_accepted_at` en metadatos (`:382-383`) y difiere la aceptación al onboarding (`accept_registration_documents`, migración `20260930130000…:292-333`, **no aplicada**: la función no existe en BD).

## 5. Hallazgos críticos (con archivo:línea o evidencia de BD)

### 5.1 Integridad de la evidencia (seguridad)

| # | Hallazgo | Evidencia | Gravedad |
|---|---|---|---|
| E1 | `record_consent(p_user_id, p_document_id, p_ip_address, p_user_agent)` es `SECURITY DEFINER`, no usa `auth.uid()` y la ejecuta `anon`. Cualquiera puede crear consentimientos a nombre de cualquier usuario y con cualquier IP. | BD (`pg_proc`, `has_function_privilege`) | Crítica |
| E2 | Igual con `record_age_verification(p_user_id, …)` y `sign_legal_document(p_user_id, …)` (este último además crea firmas en `digital_signatures`). | BD | Crítica |
| E3 | Políticas `user_creates_own_consent` (INSERT) y `user_updates_own_consent` (UPDATE) en `user_legal_consents`: el propio usuario puede reescribir fecha, IP, versión, método o revocación. | BD (`pg_policies`) | Alta |
| E4 | `check_role_legal_gate` y `get_role_gate_documents` aceptan `p_user_id` arbitrario y los ejecuta `anon`: revelan qué documentos firmó cualquier usuario. | BD | Media |
| E5 | No hay versión inmutable: `legal_documents.content_html` es un comentario en la mayoría de los documentos; el texto real está en `public/legal/*.html`, desplegado con Vercel y modificable sin traza. | BD + `LegalDocumentPage.tsx:55-69` | Alta |
| E6 | `user_legal_consents` es `UNIQUE (user_id, document_id)` y las funciones hacen `ON CONFLICT DO UPDATE`: una reaceptación sobrescribe la anterior (se pierde historial). | BD + `20260930110000…:237-240`; `sign_legal_document` (BD) | Media |
| E7 | `user_legal_consents.user_id` tiene `ON DELETE CASCADE` a `auth.users`: al borrar la cuenta se borra la prueba de la autorización, que la ley exige conservar (Ley 1581, art. 17 b). La política de conservación es decisión jurídica. | BD (`pg_constraint`) | Media |

### 5.2 Contradicciones de contenido

| Tema | Documento A | Documento B | Comentario |
|---|---|---|---|
| Propiedad del contenido | `general_terms_v1.html:93-98`: «Usted conserva los derechos… otorga… una licencia mundial, no exclusiva, sublicenciable… para… fines de marketing». | `talent_agreement` §3 (BD): «Los trabajos… NO son propiedad del Talento», cesión automática, irrevocable, sin límite temporal ni territorial; «trabajo por encargo» con cita a 17 U.S.C. § 101; prohíbe el portafolio (§3.5). `creator_agreement_v2.html:68-115`: cesión perpetua, incluye contenido ya publicado antes de aceptar. | Se aceptan juntos en el mismo clic. Además, en Colombia la transferencia de derechos patrimoniales debe constar por escrito y limitarse a las modalidades, tiempo y territorio pactados (Ley 23 de 1982, art. 183, modificado por la Ley 1450 de 2011, art. 30); los derechos morales son irrenunciables (Ley 23, art. 30; Decisión Andina 351). La validez de una cesión general por casilla es una pregunta jurídica abierta. |
| Imagen | `general_terms` §V.3 (licencia para clientes con vencimiento y alertas). | `talent_agreement` §2: cesión de imagen «ILIMITADA, IRREVOCABLE», perpetua, sublicenciable sin compensación. `creator_agreement_v2` §3: autorización perpetua. | La Ley 23, art. 87, exige consentimiento **expreso** para exponer el retrato en el comercio. Contradicción interna, además de la duda de validez. |
| Pagos | `general_terms` §5: el cliente paga 100 % por adelantado, KREOON retiene y libera. | `talent_agreement` §4: «mes vencido», corte el día 10, comisión 20–30 %. | Ninguno de los dos flujos existe hoy para creadores (pagos no implementados; payout manual según `CLAUDE.md`). Se aceptan como si existieran. |
| Moderación | `content_moderation_policy_v1.html` §7-8: sistema de strikes (4 niveles) y botón «Apelar esta decisión». | Código: no existe sistema de strikes ni apelaciones (búsqueda sin resultados en `src/` y `supabase/migrations/`). | Promete procesos inexistentes. |
| Ley aplicable | `general_terms_v1.html:440-449`, `talent_agreement` §9, `creator_agreement_v2` §9.1-9.2: Florida; arbitraje AAA en Miami. | `TermsOfService.tsx:143-145` (`/terms`): leyes de Colombia. | Contradicción directa. |
| Responsable de datos | `privacy_policy_v1.html:14` y `general_terms` §III.6: SICOMMER INT LLC; correos `dpo@`, `privacy@`, `arco@kreoon.com`. | `PrivacyPolicy.tsx` (`/privacy`): no nombra responsable; solo `privacy@kreoon.com`. | `/privacy` es la que enlaza el bloque modificado. |
| Proveedores | `/privacy` enumera Supabase, Bunny, Stripe y «proveedores de IA». | Código: también Vercel (hosting), Pancake (CRM, recibe nombre/correo/teléfono por disparador), correo transaccional (Resend en funciones; proveedor del correo de confirmación de Supabase sin verificar), Google (OAuth si se activa). | Ver `politica-privacidad.md` §8. |
| Cookies | `/privacy` §8: «No utilizamos cookies de seguimiento de terceros con fines publicitarios». | `src/hooks/useAnalytics.ts:79-87`: la analítica propia respeta el banner; **pero** `trackConversion` (`useAnalytics.ts:338-350`) llama a `kae-conversion`, que reenvía a Meta CAPI, TikTok y GA4 (`supabase/functions/kae-conversion/index.ts:79, 158, 241`) **sin comprobar el consentimiento**. El registro nuevo no la invoca; `useAuthAnalytics.ts:37` sí (usado en `LoginForm`). | Verificar y condicionar antes de afirmar nada en la política. |
| Edad | `age_declaration_v1.html`: «mayor de 18 o mayoría de edad de mi país, lo que sea mayor», declaración «bajo juramento». | Casilla de registro. | Una casilla no es una declaración juramentada; mantener «declaro que soy mayor de edad» y la consecuencia de falsedad, sin lenguaje de juramento. |
| DMCA | `dmca_policy_v1.html` §2: «Agente DMCA designado» con correo `dmca@kreoon.com`. | No consta registro del agente en el directorio de la Oficina de Derechos de Autor de EE. UU. | El puerto seguro del 17 U.S.C. § 512(c) exige designar el agente ante esa Oficina y renovarlo cada 3 años ([copyright.gov/512](https://www.copyright.gov/512/), [FAQ del directorio](https://www.copyright.gov/rulemaking/onlinesp/NPR/faq.html)). Ver §6. |

### 5.3 Duplicados y placeholders

- `content_moderation_policy` 1.0: contenido en BD = `<!-- Documento pendiente de generar -->`; 76 personas lo «aceptaron».
- Política de privacidad en **cuatro lugares** con textos distintos: `privacy_policy_v1.html`, sección II/III de `general_terms_v1.html`, `PrivacyPolicy.tsx` (`/privacy`) y `cookie_policy` (BD, un párrafo).
- Términos en **tres lugares**: `general_terms_v1.html`, `terms_of_service_v1.html` (617 líneas), `TermsOfService.tsx`.
- Edad en dos: `age_declaration` y `age_verification_policy`.
- `talent_agreement` (2026-03-30) y `creator_agreement` v2.0 (2026-03-24) regulan lo mismo para el mismo creador con cláusulas distintas.

### 5.4 `talent_agreement` frente a `creator_agreement`

| Aspecto | `talent_agreement` 1.0 | `creator_agreement` v2.0 |
|---|---|---|
| Cuándo se pide | Registro (`account_type='talent'`) | Asignación de rol (`role_legal_gates`, `target_role in (creator, editor)`) |
| Cómo se acepta | Casilla (`clickwrap`/`registration`) o firma (`digital_signatures`: 128) | Firma por nombre escrito (`typed_name`) |
| Contenido en BD | HTML completo | Comentario → `public/legal/creator_agreement_v2.html` |
| Imagen | Cesión ilimitada, irrevocable, perpetua, sublicenciable | Autorización perpetua, sin compensación |
| Obra | Cesión automática al aprobar; «work made for hire»; sin portafolio | Cesión perpetua mundial; incluye contenido ya publicado |
| Pagos | Mes vencido, corte día 10, comisión 20–30 % | Proyectos contratados / contenido espontáneo / uso promocional |
| Ley | Florida, arbitraje en Miami | Florida, arbitraje AAA en Miami |
| Domicilio | 12550 Biscayne Blvd, Ste 218, North Miami, FL 33181 | (no verificado en este archivo) |

`RoleLegalGateProvider.tsx:189-199` abre el gate `creator` cuando se inserta una fila en `creator_profiles` del usuario; el gate pide `creator_agreement`. `complete_creator_signup` asigna el rol `content_creator`, que **no** tiene gate (BD), así que la suscripción de `organization_member_roles` (`:166`) no lo dispara; la de `creator_profiles` depende de si la sesión ya está abierta cuando el disparador `trigger_auto_create_creator_profile` crea el perfil (BD: `AFTER INSERT ON profiles`). Hay que comprobarlo en preview.

### 5.5 Privacidad operativa

- **Pancake:** disparadores `trigger_pancake_sync`, `trigger_sync_profile_to_pancake`, `trigger_sync_profile_first_complete` (tabla `profiles`), `trigger_sync_org_member_to_pancake` (`organization_members`), `trigger_sync_org_roles_to_pancake` (`organization_member_roles`) y `trigger_sync_creator_profile_to_pancake` (`creator_profiles`) llaman a las funciones `pancake-sync` / `pancake-sync-user`, que envían a `https://pos.pages.fm/api/v1` (`supabase/functions/pancake-sync-user/index.ts:7`). Además, `trigger_pancake_sync` contiene **la clave anónima de Supabase embebida** en el cuerpo de la función (es pública por diseño, pero conviene no versionarla así). Verificar si `PANCAKE_API_KEY` está configurada en producción (no se pudo comprobar con SQL).
- **Datos de la cuenta antes del consentimiento:** el correo, el nombre y el perfil de creador existen desde el `signUp`; el consentimiento se registra al completar el alta. Si la persona nunca confirma el correo, queda una cuenta sin evidencia. Ver pregunta jurídica en `pendientes-juridicos.md`.
- **Perfiles sin publicar:** la migración `20260930130000` (no aplicada) hace que los perfiles nazcan sin publicar; hoy siguen naciendo públicos (ledger 2026-09-30). La política de privacidad debe describir el estado que exista cuando se publique.
- **Analítica:** consentimiento por banner (`CookieConsentBanner`, por defecto todo desactivado salvo lo esencial) — correcto para `kae-track`; no para `kae-conversion` (ver 5.2).

### 5.6 Cifras de referencia (BD, 2026-10-01)

- 304 usuarios con rol de creador: 116 con `talent_agreement` aceptado, 35 con `content_moderation_policy`, **70 sin ningún consentimiento registrado**.
- 1 434 filas en `user_legal_consents`; 223 filas en `digital_signatures`.
- Una sola organización (`UGC Colombia`, slug `ugc-colombia`, inscripción abierta, sin invitación).
- Proyecto Supabase en región `us-east-1`.

## 6. ¿Tiene sentido invocar la DMCA?

- La DMCA (17 U.S.C. § 512) es ley de EE. UU. Da un puerto seguro al proveedor que, entre otros requisitos, **designa un agente ante la U.S. Copyright Office** y lo publica ([copyright.gov/512](https://www.copyright.gov/512/)). Si el operador es efectivamente una LLC de Florida, podría interesarle registrarlo; si no se registra, citar la DMCA no aporta la protección y puede confundir.
- Para personas en Colombia, el marco es la Ley 23 de 1982 y la Decisión Andina 351 ([texto CAN](https://www.comunidadandina.org/StaticFiles/201761102019%20en%20Propiedad%20Intelectual.pdf)). Colombia no tiene un procedimiento legal de «notificación y retirada» equivalente con puerto seguro general; un procedimiento contractual de avisos y retirada es válido como política de la plataforma.
- **Propuesta de borrador:** una sección «Derechos de autor y retirada de contenido» con procedimiento propio, neutral en jurisdicción, y una nota condicional: «si el operador registra un agente DMCA, se añadirán sus datos». Decisión final: abogado (ver `pendientes-juridicos.md`).

## 7. Datos del operador: pendientes y contradicciones

| Dato | Valor encontrado | Fuente | Estado |
|---|---|---|---|
| Razón social | SICOMMER INT LLC | todos los `public/legal/*.html`, `talent_agreement` (BD), `client_agreement` v2.0 | **DATO PENDIENTE de verificación** (no hay documento de constitución en el repo) |
| Tipo y ley de constitución | LLC del Estado de Florida | `general_terms_v1.html:25-26`, `talent_agreement` | Pendiente |
| Identificación | EIN 87-0943710; «Registro No. L21000234908» | `talent_agreement` (BD); `20260824120100_client_agreement_v2.sql:49` | Pendiente; no figura en los documentos del creador salvo el Acuerdo de Talento |
| Domicilio | **(a)** 12550 Biscayne Blvd, Ste 218, North Miami, FL 33181 · **(b)** 1989 NE 163rd St, North Miami Beach, FL 33162 | (a) `talent_agreement` (BD); (b) `20260824120100_client_agreement_v2.sql:49` | **DATO PENDIENTE: contradictorio** |
| Representante legal | Un nombre aparece en `client_agreement` v2.0 | `20260824120100…:50` | Pendiente; no se reproduce en los borradores |
| Contacto | `legal@`, `privacy@`, `dpo@`, `arco@`, `talento@`, `dmca@`, `moderation@`, `report@kreoon.com` | varios | **DATO PENDIENTE:** no se verificó que existan ni quién los atiende. Los borradores proponen solo dos buzones. |
| Presencia en Colombia | Ninguna razón social colombiana encontrada | — | Pendiente: ¿hay sociedad o establecimiento en Colombia? Determina responsable, RNBD y ley aplicable |
| Papel de «UGC Colombia» | `client_agreement` v2.0 la llama «marca comercial» de SICOMMER; en BD es el **nombre de la organización** en la que se inscriben los creadores | BD, migración citada | **No se asume razón social.** Pendiente: ¿la organización es solo un espacio dentro de Kreoon operado por el mismo titular, o un tercero (cliente de la plataforma) que actúa como responsable o encargado de los datos de sus creadores? |
| Papel de «KREOON» | «marca registrada de SICOMMER INT LLC» | `privacy_policy_v1.html:587` | Pendiente verificar el registro de marca |

## 8. Fuentes consultadas

- Ley 1581 de 2012 (Función Pública): <https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=49981> — arts. 2, 8, 9, 12, 14, 15, 17, 26.
- Decreto 1377 de 2013 (Cancillería, compilación): <https://www.cancilleria.gov.co/normograma/compilacion/docs/decreto_1377_2013.htm> — arts. 5, 7 («en ningún caso el silencio podrá asimilarse a una conducta inequívoca»), 8, 9, 11, 13, 14-15, 24-25. Compilado en el Decreto 1074 de 2015, Capítulo 25 (arts. 2.2.2.25.x): <https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=76608>.
- SIC, Circular Externa 005 de 2017 (países con nivel adecuado, incluye EE. UU.): <https://www.alcaldiabogota.gov.co/sisjur/normas/Norma1.jsp?i=70498&dt=S>; contexto: <https://habeasdatacolombia.uniandes.edu.co/antecedentes-de-la-circular-5-de-2017-de-la-sic-transferencias-internacionales-de-datos-personales/>.
- Ley 23 de 1982 (Cancillería): <https://www.cancilleria.gov.co/sites/default/files/Normograma/docs/ley_0023_1982.htm> — arts. 20 (modificado por Ley 1450 de 2011, art. 28), 30, 87; art. 183 modificado por Ley 1450 de 2011, art. 30: <https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=43101>.
- Decisión Andina 351 de 1993 (compilación CAN): <https://www.comunidadandina.org/StaticFiles/201761102019%20en%20Propiedad%20Intelectual.pdf>.
- 17 U.S.C. § 512 y directorio de agentes: <https://www.copyright.gov/512/>, <https://www.copyright.gov/rulemaking/onlinesp/NPR/faq.html>.
- No se consultó texto oficial de la Ley 1480 de 2011 en esta fase; su aplicación a creadores (que actúan como prestadores, no como consumidores finales) es pregunta para el abogado.
- Nota: el portal de la Secretaría del Senado no respondió desde este entorno (conexión rechazada); se usaron Función Pública y Cancillería.
