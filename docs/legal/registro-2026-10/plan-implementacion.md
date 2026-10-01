# Plan de implementación: registro con dos documentos

> Fase actual: **plan**. Nada de esto está aplicado. Las migraciones están en `migraciones/` (fuera de `supabase/migrations/`). Los textos legales son borradores pendientes de revisión jurídica.

## 0. Orden propuesto

| Ola | Qué | Depende de | ¿Bloquea a cuentas existentes? |
|---|---|---|---|
| **0 — Hotfix de seguridad** | `04_endurecer_consentimientos_legados.sql` = `supabase/migrations/20261001140000_endurecer_consentimientos_legados.sql` (revocar `anon`, quitar INSERT/UPDATE directos, guard `auth.uid()` en las 3 funciones legadas). **Preparada, pendiente de aplicar por Alexander** | Revisar en preview los flujos que las llaman (B1) | No |
| **1 — Estructura** | `01`, `02`, `03` y parte A de `05` | Nada (no cambian el comportamiento visible: v1 sigue activa) | No |
| **2 — Frontend v2 en preview** | Cambios F1–F9 detrás de `VITE_LEGAL_V2=true` | Ola 1 aplicada en una rama de Supabase o en local; textos cargados como `draft` | No |
| **3 — Revisión jurídica** | `pendientes-juridicos.md` respondido; textos finales sin `[PENDIENTE]` | — | — |
| **4 — Publicación** | Cargar versiones aprobadas (parte C de `05`), publicarlas con `publish_legal_document_version`, desplegar frontend v2, ejecutar parte B de `05` | Olas 1–3 | No (ver §4) |
| **5 — Reaceptación de cuentas existentes** | Aviso + pantalla de reaceptación según la decisión jurídica | Ola 4 | Solo si el abogado lo exige, y nunca sin aviso previo |

## 1. Backend

### B1. Hotfix de evidencia (ola 0)

**Estado (2026-10-01): preparada, pendiente de aplicar por Alexander.** Archivo listo: `supabase/migrations/20261001140000_endurecer_consentimientos_legados.sql` (copia idéntica en `migraciones/04_endurecer_consentimientos_legados.sql`). Cuerpos reescritos desde la definición viva (`pg_get_functiondef`, leída el 2026-10-01); no toca filas ni el `ON DELETE CASCADE`.

Qué cambia: `auth.uid() = p_user_id` obligatorio salvo `service_role` (o sesión SQL directa); para el usuario se ignoran `p_ip_address`/`p_user_agent` y se toman de `request.headers`; `EXECUTE` fuera de `PUBLIC`/`anon` (también en `check_role_legal_gate` y `get_role_gate_documents`); fuera las políticas `user_creates_own_consent`/`user_updates_own_consent` y la escritura de `anon`/`authenticated` en `user_legal_consents` y `legal_documents`. No hace falta tocar frontend: todos los llamadores pasan `user.id` de la propia sesión, y `client-onboarding-claim` escribe con `service_role`.

Pasos para aplicarla:
1. Revisar el archivo (cabecera: llamadores verificados; final: verificación y rollback).
2. Opcional pero recomendado: aplicarla primero en una rama de Supabase (`create_branch` o `supabase db push` contra la rama) y probar en preview: onboarding Nova (aceptar documentos + edad), `SignatureModal`, «Convertirme en creador» (`UpgradeToCreatorWizard`) y el gate de rol (`RoleLegalGateProvider`).
3. Aplicar en producción con **una** de estas vías (no ambas):
   - CLI: `supabase db push` (aplica `20261001140000_endurecer_consentimientos_legados.sql` si es la única pendiente; comprobar antes con `supabase migration list` que no arrastra migraciones 20260930* aún sin aplicar), o
   - MCP de Supabase: `apply_migration` con `name = "endurecer_consentimientos_legados"` y el contenido del archivo, o
   - Editor SQL del panel: pegar el archivo completo (ejecuta en una sola transacción implícita; si algo falla no queda a medias).
4. Ejecutar el bloque «VERIFICACIÓN POST-APLICACIÓN» del final del archivo: consultas a), b), c), d) y las pruebas `curl` negativas e), f) con la clave anon (deben devolver 401/403 con 42501, nunca un uuid ni 201).
5. Prueba positiva g) con una cuenta de prueba propia.
6. Si algo legítimo se rompe: «ROLLBACK MANUAL» del final del archivo (reabre la vulnerabilidad; usarlo solo como puente).
7. Anotar en `ARCHITECTURE_LEDGER.md` (UPDATES) la fecha de aplicación.

Pendiente jurídico que esta migración NO resuelve: `user_legal_consents.user_id`, `age_verifications.user_id` y `digital_signatures.user_id` tienen `ON DELETE CASCADE` hacia `auth.users`; borrar una cuenta borra su prueba. Decidir plazo de conservación vs. supresión (ver `pendientes-juridicos.md`) antes de cambiarlo.

Notas de diseño (histórico del análisis):
- Leer en producción `pg_get_functiondef` de `record_consent`, `record_age_verification`, `sign_legal_document`; añadir `PERFORM public._assert_self(p_user_id);` como primera sentencia y leer la IP de `request.headers` en vez de `p_ip_address`.
- Llamadores a revisar antes: `src/components/registration-v2/shared/recordLegalConsents.ts:11,26`, `src/components/legal/RoleLegalConsentModal.tsx`, `src/components/legal/SignatureModal.tsx`, `src/components/onboarding/NovaLegalConsentStep.tsx`, `src/components/legal/LegalConsentModal.tsx`, y funciones del servidor que usen `service_role` (estas no se ven afectadas por el guard si pasan por otra ruta; comprobar `client-onboarding-claim`).
- Quitar las políticas `user_creates_own_consent` / `user_updates_own_consent` (no se encontraron escrituras directas en `src/`, solo lecturas: `useLegalConsent.ts:107`, `LegalConsentsAdminPanel.tsx:96-122`).

### B2. Versiones inmutables (`01`)
- Tabla `legal_document_versions`: contenido Markdown canónico, `content_sha256` y `statement_sha256` calculados por disparador, estados `draft → published → retired`, una sola versión publicada por documento, sin borrado ni edición tras publicar.
- Lectura pública de versiones publicadas **y retiradas** (las URL antiguas siguen funcionando).

### B3. Registro de aceptaciones (`02`)
- Tabla `legal_acceptances` de solo inserción: usuario, organización de contexto, versión exacta (id + clave + número + huellas), tipo, acción (`accept`/`revoke`), método (derivado del token), flujo, `client_request_id`, IP, navegador, `now()` del servidor.
- Sin políticas de escritura; disparador que rechaza UPDATE/DELETE y que verifica que las copias coincidan con la versión.
- `user_id` sin `ON DELETE CASCADE` para conservar la prueba; el plazo de conservación lo fija el abogado.

### B4. RPC (`03`)
- `get_creator_signup_documents_v2()` (anon): versiones vigentes, textos de casilla, huellas y datos del aviso.
- `complete_creator_signup_v2(slug, acceptances, client_request_id, flow, attribution, explicit)`: idempotente; `document_version_outdated` si la versión vista ya no es la vigente; aceptaciones y membresía en una sola transacción; marca `profiles.legal_consents_completed` solo cuando hay filas reales.
- `accept_current_legal_documents(acceptances, client_request_id)`: reaceptación.
- `get_my_legal_status()`: qué aceptó cada persona y qué le falta.
- La autorización opcional de imagen (fuera del registro) tendrá su propia RPC `set_optional_authorization(version_id, sha, statement_sha, grant boolean, client_request_id)` que inserta `accept`/`revoke`. No se incluye en `03` porque su texto aún no existe.

### B5. Conservación de históricos y URL antiguas
- `legal_documents` y `user_legal_consents` **no se modifican** (salvo el endurecimiento de permisos de la ola 0). Siguen sirviéndose en `/legal/:documentType`.
- Las versiones nuevas viven en `/legal/:documentKey/:version` (permanente) y `/legal/:documentKey` (vigente).
- Los archivos `public/legal/*.html` **no se borran ni se editan**: son la única copia del texto que vieron quienes aceptaron las versiones legadas. Recomendación: congelar una copia con su SHA-256 en `docs/legal/archivo/` (hoy mismo, como evidencia del estado al 2026-10-01) — pendiente de autorización porque crea archivos fuera de este entregable.

### B6. Pancake y datos antes del consentimiento
- Decidir (producto + abogado) si los creadores se sincronizan con Pancake. Si **no**: condicionar `sync_user_to_pancake` a que el usuario no sea creador o a que tenga aceptación vigente de la política (y declararlo); si **sí**: declararlo en la política con país y contrato de transmisión.
- Hasta decidirlo, no publicar la política v2.

### B7. Puertas legadas que pueden reaparecer
- `RoleLegalGateProvider.tsx:189-199` abre `creator_agreement` (gate `creator`, BD) al crearse `creator_profiles`. En la ola 4 desactivar el gate (`05`, parte B.2) y comprobar en preview que un creador nuevo no vea ningún modal adicional.
- `useOnboardingGate.ts:216-228,440` consulta `get_pending_consents` y `legal_consents_completed`: con los requisitos legados en `deprecated` (`05`, B.1) y `legal_consents_completed=true` en v2, no debe pedir nada más. **Verificar** que `get_pending_consents` no devuelva documentos de `user_role='all'` usados por clientes.

### B8. Analítica de conversiones
- `src/hooks/useAnalytics.ts:338-350` (`trackConversion`) debe comprobar `hasAnalyticsConsent()` (o un consentimiento de marketing) antes de llamar a `kae-conversion`, que reenvía a Meta, TikTok y GA4. Sin esto, la frase de la política sobre píxeles no es cierta fuera del registro.

## 2. Frontend (archivos concretos)

| # | Archivo | Cambio |
|---|---|---|
| F1 | `src/lib/registration/service.ts` | Tipo `SignupDocumentV2` (`version_id, document_key, version, title, acceptance_statement, content_sha256, statement_sha256, notice_*`); `getCreatorSignupDocumentsV2()`; `completeCreatorSignupV2({slug, acceptances, clientRequestId, flow, attribution, explicit})`; mapear `document_version_outdated`; la intención guarda `acceptances` (ids + huellas), `clientRequestId` y `nonce`; para Google, la intención solo se usa si `user.created_at` es posterior a `intent.at - 5 min` (evita heredarla otra cuenta). |
| F2 | `src/components/registro/ConsentBlock.tsx` | Reemplazar por `LegalConsentFields`: dos casillas independientes (`creator_terms`, `privacy_policy`), labels con el `acceptance_statement` que viene del servidor, enlaces fuera del `<label>`, errores por casilla. **Descartar el cambio sin confirmar actual** (diálogo que esconde los documentos) previa conversación con quien lo hizo. |
| F3 | `src/components/registro/PrivacyNotice.tsx` (nuevo) | Aviso breve con responsable, finalidad, derechos y canal (de `notice_controller` / `notice_contact`). |
| F4 | `src/components/legal/LegalDocumentViewer.tsx` (nuevo) | `Sheet`/`Dialog` de Radix que renderiza el Markdown de una versión (no hay librería de Markdown en `package.json`: o se añade `react-markdown`, o se guarda también un HTML derivado y saneado junto a la versión; la huella se calcula siempre sobre el Markdown), índice, versión, fecha, huella, botones Descargar `.md` / Copiar / Imprimir / Abrir en pestaña. |
| F5 | `src/components/registro/CreatorSignupForm.tsx` | Estado `acceptances: Record<document_key, boolean>`; deshabilitar envío si los documentos no cargaron (hoy se permite con lista vacía: `OrganizationRegistrationPage.tsx:105-106`); Google exige ambas casillas (`:69-73`). |
| F6 | `src/pages/registro/OrganizationRegistrationPage.tsx` | Usar F1; generar `clientRequestId` al montar; pasar `nonce` en `redirectTo`; manejar `document_version_outdated` sin borrar campos. |
| F7 | `src/components/registro/ContinueSignup.tsx` | Usar `completeCreatorSignupV2`; si falta aceptación, mostrar F2 + F3; reintento con el mismo `clientRequestId`; mostrar «Ya aceptaste…» cuando no falte nada; nunca navegar a onboarding si la RPC falla (hoy ya es así: `:151-155`). |
| F8 | `src/pages/legal/LegalDocumentPage.tsx` + `src/App.tsx:489-493` | Rutas `/legal/:documentKey/:version` y `/legal/:documentKey` contra `legal_document_versions`, con caída a `legal_documents` para claves legadas. `/privacy` y `/terms` redirigen a la versión vigente de los documentos nuevos (cuando se publiquen). Mantener `/data-deletion`. |
| F9 | `src/components/legal/LegalReacceptanceGate.tsx` (nuevo) + `src/providers/OnboardingGateProvider.tsx` | Solo ola 5: si `get_my_legal_status` marca `requires_reacceptance` y no está aceptada, pantalla con las dos casillas; antes de la fecha de vigencia, solo un aviso no bloqueante. |
| F10 | `src/components/registro/registro.test.tsx` | Actualizar pruebas (ver `pruebas.md`). |
| F11 | `src/integrations/supabase/types.ts` | Regenerar tras aplicar `01–03`. |

Interruptor: `VITE_LEGAL_V2` (por defecto `false`) para poder desplegar el código sin activar los documentos nuevos.

## 3. Reglas de comportamiento que el código debe garantizar

1. **Fallo = sin éxito ni capacidades.** Aceptación y membresía son una sola transacción en el servidor; el cliente solo navega con `status in (joined, already_member)`.
2. **Reintentos seguros.** El mismo `client_request_id` no duplica aceptaciones; tras un éxito, el reintento devuelve `already_member`.
3. **Versión exacta.** El cliente envía id + huellas de lo que mostró; si no coincide con lo vigente → `document_version_outdated`, nada se escribe.
4. **Método y hora del servidor.** El cliente no envía fecha, IP ni método.
5. **No retroactividad.** Aceptar la versión nueva no reescribe ni borra aceptaciones anteriores; cada fila dice qué versión se aceptó y cuándo. Las cesiones de los documentos legados no se «convalidan» con la casilla nueva; su suerte la define el abogado.
6. **Una casilla no es firma digital certificada.** No se usa el término «firma» en la interfaz del registro.

## 4. Transición sin bloquear cuentas existentes

- Las 304 cuentas de creador actuales (BD) **no** se bloquean al publicar: siguen operando con lo que aceptaron.
- Se les informa del cambio (correo + aviso en la app) con la antelación que fije el abogado.
- **Cuándo informar vs. pedir nueva aceptación (propuesta, sujeta a revisión jurídica):**
  - *Informar sin pedir aceptación:* correcciones de redacción, datos de contacto, nuevos proveedores equivalentes que no cambian finalidades.
  - *Pedir nueva aceptación o autorización:* cambios en derechos sobre contenido o imagen, pagos, responsabilidad, ley aplicable, nuevas finalidades de tratamiento o datos nuevos.
  - Para las cuentas existentes, como los documentos nuevos son más favorables al creador, el abogado debe decidir si basta informar o si conviene pedir aceptación (para tener una base clara y sustituir las cesiones legadas).
- Las 70 cuentas de creador **sin ningún consentimiento** registrado (BD) son las primeras candidatas a la pantalla de aceptación.

## 5. Riesgos y cómo se cubren

| Riesgo | Mitigación |
|---|---|
| Publicar un texto con `[PENDIENTE]` | `publish_legal_document_version` rechaza `[PENDIENTE]`, `[VERIFICAR]` y «Borrador» |
| Romper el onboarding de empresas al deprecar `general_terms`/`age_declaration` | `05` parte B.1 exige separar por `account_type` antes de ejecutar |
| Que reaparezca el modal de `creator_agreement` | B7 + prueba P-14 |
| Desfase migraciones/frontend (como el relanzamiento) | v2 convive con v1; el frontend nuevo se activa por variable; parte B de `05` va al final |
| Derivas entre repo y producción | Antes de aplicar, leer `pg_get_functiondef` vivo (regla del ledger) |
