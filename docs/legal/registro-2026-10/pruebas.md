# Plan de pruebas del registro con dos documentos

> Todas las pruebas manuales se hacen con **cuentas de prueba** (correos desechables o alias `+prueba` de un buzón del equipo) y en **preview** o en una rama de Supabase, nunca contra cuentas reales. No se crean cuentas en producción para probar.

Columnas: **Cuándo** = `Ya` (se puede ejecutar hoy, sin la implementación) · `Preview` (requiere la implementación desplegada en preview) · `SQL` (arnés local `supabase/tests/registration/run.sh` o rama de Supabase).

## 1. Pruebas de evidencia legada (estado actual)

| ID | Prueba | Resultado esperado hoy | Cuándo |
|---|---|---|---|
| L-1 | Como `anon`, `select has_function_privilege('anon','public.record_consent(uuid,uuid,inet,text)','EXECUTE')` | `true` (confirma el hallazgo E1) | Ya (lectura) |
| L-2 | Igual para `record_age_verification` y `sign_legal_document` | `true` (E2) | Ya (lectura) |
| L-3 | Listar políticas de `user_legal_consents` | Existen `user_creates_own_consent` y `user_updates_own_consent` (E3) | Ya (lectura) |
| L-4 | Tras aplicar `04` en una rama: llamar a `record_consent` como `anon` y como otro usuario autenticado | `permission denied` / `unauthorized` | SQL |
| L-5 | Tras `04`: `UPDATE user_legal_consents SET accepted_at = now() WHERE user_id = auth.uid()` como usuario | Denegado | SQL |

## 2. Unitarias (Vitest, `src/components/registro/registro.test.tsx`)

| ID | Prueba | Esperado | Cuándo |
|---|---|---|---|
| U-1 | Render inicial | Dos casillas sin marcar; botón «Crear mi cuenta» único; aviso de privacidad visible | Preview (código nuevo) |
| U-2 | Enviar sin marcar nada | No se llama a `signUpWithEmail`; dos mensajes de error; foco en la primera casilla | Preview |
| U-3 | Marcar solo la casilla 1 | Error solo en la casilla 2; no se envía | Preview |
| U-4 | Marcar solo la casilla 2 | Error solo en la casilla 1; no se envía | Preview |
| U-5 | Pulsar el enlace «Leer el acuerdo» | No cambia el estado de la casilla; se abre el visor; nombre/correo/contraseña conservan su valor al cerrar | Preview |
| U-6 | Documentos aún cargando o con error | Casillas y botón deshabilitados; con error, botón «Reintentar» | Preview |
| U-7 | «Continuar con Google» sin casillas | No llama a `signInWithGoogle` | Preview (hoy existe una versión equivalente con una casilla) |
| U-8 | `document_version_outdated` desde el servicio | Mensaje de versión actualizada, casillas desmarcadas, campos intactos | Preview |
| U-9 | Pruebas actuales de una casilla | Siguen pasando mientras `VITE_LEGAL_V2=false` | Ya: `npm test` |

## 3. SQL (arnés local o rama de Supabase)

| ID | Prueba | Esperado | Cuándo |
|---|---|---|---|
| S-1 | Insertar versión `draft`, editarla | Permitido; huella recalculada | SQL |
| S-2 | Publicar y luego `UPDATE content_markdown` | `legal_version_immutable` | SQL |
| S-3 | `DELETE` de una versión publicada | `legal_version_immutable` | SQL |
| S-4 | Publicar texto con `[PENDIENTE]` | `content_has_placeholders` | SQL |
| S-5 | `complete_creator_signup_v2` sin aceptaciones | `consents_required: creator_terms,privacy_policy`; sin membresía | SQL |
| S-6 | Con solo una aceptación | `consents_required: <la que falta>`; **ninguna** fila insertada (rollback) y sin membresía | SQL |
| S-7 | Con huella distinta de la vigente | `document_version_outdated`; nada escrito | SQL |
| S-8 | Con `version_id` de una versión retirada | `document_version_outdated` | SQL |
| S-9 | Éxito y repetir la llamada con el mismo `client_request_id` | Primera: `joined`; segunda: `already_member`; 2 filas en `legal_acceptances`, no 4 | SQL |
| S-10 | Repetir con otro `client_request_id` | `already_member`; no duplica (ya aceptadas) | SQL |
| S-11 | Forzar un error después de registrar las aceptaciones (p. ej. un disparador de prueba que falle en `organization_member_roles`) | La RPC falla y no queda ninguna fila en `legal_acceptances` ni membresía | SQL |
| S-12 | `UPDATE`/`DELETE` sobre `legal_acceptances` como `service_role` | `legal_acceptances_append_only` | SQL |
| S-13 | `SELECT` de aceptaciones ajenas como usuario | 0 filas | SQL |
| S-14 | Token con `app_metadata.provider='google'` | `method='google_oauth'`; con `email` → `email_password` | SQL |
| S-15 | Publicar `creator_terms` 1.1 con aceptación de 1.0 previa | `get_my_legal_status` marca `is_current_accepted=false`; la fila de 1.0 sigue intacta | SQL |
| S-16 | Borrar la organización de contexto | La aceptación queda con `organization_id = NULL`; el resto intacto | SQL |

## 4. End-to-end en preview (cuentas de prueba)

| ID | Flujo | Esperado | Cuándo |
|---|---|---|---|
| P-1 | Registro por correo con ambas casillas → confirmar correo → `/continuar` | Membresía creada; 2 filas en `legal_acceptances` con `flow='creator_signup_continue'`, `method='email_password'`, organización correcta | Preview |
| P-2 | Registro por correo, confirmar el correo **en otro navegador** | `/continuar` muestra las dos casillas sin marcar; al aceptar, membresía | Preview |
| P-3 | Google con ambas casillas (requiere proveedor Google configurado en el proyecto de preview) | Membresía; `method='google_oauth'` | Preview |
| P-4 | Iniciar sesión con Google desde `/auth` sin pasar por el registro | Llega a `/registro/:slug/continuar` (vía gate) y ve las dos casillas; sin aceptar no hay membresía ni acceso a funciones | Preview |
| P-5 | Pestaña compartida: persona A marca casillas y va a Google; cancela; persona B inicia sesión con otra cuenta antigua en la misma pestaña | B **no** hereda la aceptación (regla de `created_at`); ve las casillas | Preview |
| P-6 | Abrir cada documento desde el formulario (visor y pestaña nueva) | Campos conservados; URL de pestaña nueva es la permanente con versión | Preview |
| P-7 | Publicar una nueva versión mientras un registro está abierto, luego enviar | Mensaje de versión actualizada; tras aceptar la nueva, éxito | Preview |
| P-8 | Cortar la red (DevTools offline) al pulsar «Unirme» | Mensaje de error, sin navegación; al volver la red, «Reintentar» funciona y no duplica filas | Preview |
| P-9 | Doble clic rápido en «Crear mi cuenta» / «Unirme» | Una sola membresía, 2 filas de aceptación | Preview |
| P-10 | Solo teclado: Tab por campos, aviso, casillas y enlaces; Espacio marca; Enter envía; Esc cierra el visor y devuelve el foco | Todo operable; foco visible | Preview |
| P-11 | Lector de pantalla (NVDA o VoiceOver) | Lee el texto completo de cada casilla y su estado; errores anunciados | Preview |
| P-12 | Móvil 375 px (`resize_window` preset mobile) y Android real | Sin desplazamiento horizontal; visor a pantalla completa; áreas táctiles ≥ 44 px | Preview |
| P-13 | Descargar y copiar un documento | El SHA-256 del archivo descargado coincide con `content_sha256` | Preview |
| P-14 | Tras registrarse, navegar 2 minutos por la app | **No** aparece el modal de `creator_agreement` ni otro pedido de documentos | Preview (y hoy, con una cuenta de prueba en preview, para confirmar el hallazgo 5.4) |
| P-15 | Cuenta de prueba creada con el flujo actual (aceptaciones legadas) y luego despliegue v2 | Sigue entrando; ve el aviso de cambios; sus filas de `user_legal_consents` intactas | Preview |
| P-16 | `/legal/talent_agreement` y `/legal/dmca_policy` tras el cambio | Siguen mostrando el texto legado (URL antiguas conservadas) | Preview |
| P-17 | `/legal/creator_terms/1.0` tras publicar 1.1 | Sigue mostrando 1.0, marcada como versión anterior | Preview |
| P-18 | Onboarding de empresas (`/onboarding/:token`) tras ejecutar `05` parte B | Sigue pidiendo sus documentos (`client_agreement`, etc.) | Preview |

## 5. Lo que se puede ejecutar ya

- L-1 a L-3 (SQL de solo lectura; ya ejecutadas en esta auditoría, ver `auditoria.md` §5.1).
- U-9 (`npm test`).
- P-14 en preview con la rama actual, para confirmar si el gate de `creator_agreement` aparece hoy a un creador nuevo (cuenta de prueba en un proyecto de preview, no en producción).
- Todo lo demás requiere aplicar `01–05` en una rama o en el arnés local y el frontend de `plan-implementacion.md`.
