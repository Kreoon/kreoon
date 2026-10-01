# QA público v3 — landing, login, registro y legales

Sitio: https://kreoon-git-claude-focused-mendel-es4xcv-kreoon-s-projects.vercel.app/
Tarea: t_b38c6e87 · Fecha: 2026-10-01 · Navegador: Chromium (emulación 1440 / 768 / 390 px)
Capturas: carpeta `capturas-landing/` (junto a este archivo). Se citan por nombre.

## Método y límites (leer primero)
- Probado con navegador real: clics en todos los botones/enlaces/anclas/FAQ/menú móvil/modal de login/pestañas/recuperar/cookies/footer/legales.
- Cookies: siempre «Solo esenciales» (salvo para abrir el panel «Personalizar» y ver su contenido; no se guardó nada más).
- NO se creó cuenta, NO se inició sesión, NO se enviaron formularios. Solo se escribieron textos ficticios obvios (`no-es-un-correo`, `abc`, `xx`) para ver validaciones.
- Medición: DOM (scrollWidth, tamaños, estilos calculados), contraste calculado (WCAG) y muestreo de píxeles en capturas para confirmar texto invisible. Cargas, red y consola con hooks de `fetch`/`error`.
- LIMITACIÓN HONESTA: el análisis visual por IA de las capturas falló (error 402 de créditos del proveedor de visión), así que no revisé las imágenes «a ojo». Todo lo visual se apoya en métricas del DOM y en píxeles muestreados. Las capturas están guardadas para revisión humana.
- Falsos positivos descartados: el texto blanco sobre botones/pestaña activa con degradado morado aparece como contraste 1.0–1.15 en el cálculo automático, pero el fondo real es el degradado (#6D4AFF→#9A82FF); no se reporta.
- No se investigó la causa de `/registro` (indicado en la tarea).
- Dispositivos: M = móvil 390 px, T = tablet 768 px, D = escritorio 1440 px.
- Tema oscuro: no hay selector de tema; el sitio ignora `prefers-color-scheme: dark` (html fijo en `class="light"`), por eso no hay pantallas oscuras que probar (capturas 50 y 51 muestran claro).

## Resumen de lo que SÍ está bien
- Landing (/) sin scroll horizontal en 390/768/1440, sin errores de consola, sin peticiones fallidas en la landing, carga en ~0.9 s (DCL 898 ms), imágenes AVIF ligeras (hero 17 KB), anclas `#como-funciona` y `#tu-espacio` aterrizan bien bajo el header (88 px vs header 65 px), menú móvil abre/cierra y cierra al elegir ancla, FAQ (5 preguntas) abre todas con respuestas coherentes, foco de teclado visible en todos los enlaces, Esc cierra el modal.
- Fondo crema `#FAF8F5`, texto `#242135`, tipografía Manrope/Outfit, botones «Crear mi cuenta» morados y redondeados: la landing es consistente con la marca.
- Botón «Solo esenciales» guarda `{essential:true, analytics:false, marketing:false, personalization:false}`.

---

## 1. Landing `/`

| ruta | severidad | tipo | dispositivo | qué pasa | pasos para reproducir | propuesta concreta | captura |
|---|---|---|---|---|---|---|---|
| / | crítica | bug | M/T/D | Los 3 botones «Crear mi cuenta» (header, hero y cierre) y el de «Así funciona» llevan a `/registro`, que muestra «No pudimos cargar la inscripción». El CTA principal de toda la página termina en un error. (Causa conocida, solo registrado.) Red: `rpc/get_default_registration_org` → 404, y «Reintentar» repite el 404. | Abrir `/` → pulsar «Crear mi cuenta» | Mientras no esté arreglado: ocultar o desactivar los CTA, o enviar a «Iniciar sesión»/lista de espera; si se mantiene, que el error diga «Estamos arreglando el registro, vuelve en un rato» en vez de «problema de conexión» (no es de conexión). | 10-desktop-registro-error |
| / | alta | UX | M/T/D | En el modal de login la pestaña «Registrarse» no muestra campos: expulsa a `/registro` (error). La tarea pedía validar campos del registro: no existen en el modal. También el enlace «¿No tienes cuenta? Regístrate». | Abrir `/` → «Iniciar sesión» → pestaña «Registrarse» | Documentar el flujo: si el registro es solo en `/registro`, quitar la pestaña del modal (dos caminos al mismo sitio es redundante) o mostrar un aviso antes de salir. | 09-desktop-registro-tab, 13-desktop-auth-registrarse |
| / | alta | privacidad/bug | D | Con el banner de cookies aún sin responder (`kreoon_cookie_consent` = null) ya se guardan `kae_anonymous_id`, `kae_session_id`, `kae_visitor_data` (con landing_page y marcas UTM) en localStorage y se envía `kae-track` con `page_view`. Tras elegir «Solo esenciales» (analytics:false) siguen enviándose `page_view` y `page_exit` a `functions/v1/kae-track`. | Borrar localStorage → abrir `/` → observar red/localStorage; luego «Solo esenciales» y recargar | Bloquear `kae-track`, ids y UTM hasta que `analytics=true`; con «Solo esenciales» no enviar nada que no sea estrictamente necesario. Revisar con el responsable legal. | 71-desktop-banner-cookies-inicial |
| / | media | UX | M | El banner de cookies ocupa el 50 % de la pantalla (420 de 844 px) y tapa el hero hasta que se decide. Botones 324×36 y 324×40 (<44 px). | Abrir `/` en 390 px sin consentimiento | Banner compacto de una fila (texto de 2 líneas + 2 botones de 44 px) o «Solo esenciales» como botón principal; subir altura mínima a 44 px. | 72-movil-banner-cookies |
| / | media | UX | D | Panel «Personalizar» del banner: los 4 interruptores (44×24) no tienen etiqueta accesible en el botón (`aria-label` vacío); el texto está al lado pero no asociado. Los 3 botones del banner (Personalizar, Solo esenciales) son «contorno» sin relleno y «Aceptar todas» es el morado: el botón más llamativo es el de aceptar todo. | Banner → «Personalizar» | Añadir `aria-label`/`aria-labelledby` a cada switch; igualar peso visual de «Solo esenciales» y «Aceptar todas». | 70-desktop-cookies-personalizar |
| / | media | rendimiento | D | La landing descarga ~632 KB de JS (17 archivos) incluido `vendor-charts` (104 KB) y `vendor-d3` (21 KB) que una landing no usa; además hace 8 consultas a Supabase innecesarias (countries, cities, document_types, tasas de cambio USD, legal_documents, billing_enabled, trial_warning_days). | Abrir `/` con Network | Cargar charts/d3 solo en rutas con gráficos (import dinámico) y diferir las consultas de catálogos al entrar en `/registro`. | — |
| / | baja | UI | M/T/D | Rótulos de 10 px («Vista ilustrativa» ×3, «Video», «Foto», «Texto») y de 11 px en móvil («Bienestar», «Gastronomía», «Foto y video»): por debajo del mínimo legible de 12 px. «Imágenes ilustrativas» se repite 4 veces. | Desplazarse por las secciones | Subir a 12 px mínimo y dejar un único aviso «Imágenes ilustrativas» al final de la sección. | 03-desktop-landing-full, 41-movil-landing-full |
| / | baja | UI | T/D | Enlaces del header «Cómo funciona» (121×36) y «Tu espacio creativo» (148×36) y el logo (122×36) miden 36 px de alto (<44). | Inspeccionar header en 768/1440 | Padding vertical para llegar a 44 px de alto (área tocable, no necesariamente visual). | 02-desktop-landing-top |
| / | baja | copy | M/T/D | «Empieza en UGC Colombia», «¿Por qué entro por UGC Colombia?» y «tu cuenta queda asociada a ella»: jerga de organización que un usuario nuevo (o un niño) no entiende; y «si esta función está habilitada en tu organización» repetido en 3 tarjetas suena a texto legal. | Leer hero, tarjetas y FAQ | Reemplazar por «Kreoon Colombia: aquí empiezas» y una frase corta; quitar condicionales de las tarjetas o enviarlos al FAQ. | 05-desktop-faq |
| / | baja | UI | M | En móvil el menú hamburguesa muestra «Cómo funciona / Tu espacio creativo / Iniciar sesión» sin «Crear mi cuenta» dentro (sí queda fuera, en el header, 138×44). Correcto, pero el menú abierto repite «Iniciar sesión» como texto sin botón morado. | Abrir menú en 390 px | Opcional: CTA «Crear mi cuenta» también dentro del menú. | 42-movil-menu |
| / | baja | UX | D/M | No hay selector de tema ni respeta `prefers-color-scheme`. Informativo. | Emular modo oscuro del sistema | Si se desea modo oscuro, probarlo antes de lanzar; si no, no mostrar variables `.dark` en el CSS crítico. | 50-oscuro-landing |
| (todas) | baja | UX/SEO | D | `document.title` es «🐴 Kreoon · Tu talento merece ser visto» en TODAS las rutas (legales, /auth, /registro, 404) y lleva emoji de caballo; el caballo no aparece en la marca de la landing. | Abrir cualquier ruta y mirar la pestaña | Título por página («Términos de uso · Kreoon»…) y quitar el emoji. | — |

## 2. Modal «Iniciar sesión» y página `/auth` (misma pantalla)

La landing abre el modal sobre `/`; `/auth` es la misma pantalla como página. Los fallos de color son idénticos.

| ruta | severidad | tipo | dispositivo | qué pasa | pasos para reproducir | propuesta concreta | captura |
|---|---|---|---|---|---|---|---|
| modal en / · /auth | crítica | contraste/bug | M/T/D | El texto escrito en el campo «Correo electrónico» es BLANCO (`rgb(255,255,255)`) sobre fondo crema (`#FAF8F5`): lo que el usuario teclea no se ve (el de contraseña sí es `#242135`). Igual en el campo de «Recuperar contraseña». | Abrir modal → clic en el correo → escribir `prueba-ficticia` | Dar al input `color: #242135` (igual que el de contraseña); usar el mismo componente de input para ambos campos. | 08-desktop-login-validacion, 12-desktop-recuperar |
| modal en / · /auth | crítica | contraste | M/T/D | Título «Bienvenido de nuevo» (blanco sobre blanco, contraste 1.00:1) y el rótulo del botón «Google» (blanco sobre `#FAF8FB`, 1.05:1): píxeles muestreados confirman que el título es solo blanco puro (invisible). | Abrir modal | Título `#242135`; botón Google con texto `#242135` y borde suave. | 07-desktop-login-modal, 11-desktop-auth-pagina |
| modal en / · /auth | alta | contraste | M/T/D | Textos gris `#A1A1AA` sobre blanco: «Ingresa a tu cuenta para continuar», rótulos «Correo electrónico» y «Contraseña», «¿No tienes cuenta?» → 2.56:1 (mín. 4.5). Pestaña inactiva «Registrarse» `#A1A1AA` sobre `#F2EEF6` → 2.24:1. | Abrir modal | Usar `#625E78` (el gris de la landing, ≥5:1) o `#242135`. | 07-desktop-login-modal |
| modal en / · /auth | alta | contraste | M/T/D | Enlaces «¿Olvidaste tu contraseña?» y «Regístrate» en `#9A82FF` sobre blanco: 3.0:1. | Abrir modal | Usar el morado de marca `#6D4AFF` (≈5.6:1) en enlaces. | 07-desktop-login-modal |
| modal en / · /auth | media | branding | M/T/D | Estilo distinto al de la landing: submit con degradado `#6D4AFF→#9A82FF` y radio 12 px (la landing usa morado plano `rgb(112,77,255)` y radio 20–24 px); el campo contraseña tiene radio 2 px y el de correo 12 px; pestañas tipo píldora con brillo (`shadow-kreoon-glow-sm`); modal radio 12 px sobre overlay negro 80 %. | Comparar modal con botón de la landing | Mismo botón que la landing (morado plano, radio 20 px), inputs radio 12 px en ambos, overlay crema/morado suave. | 07-desktop-login-modal vs 02-desktop-landing-top |
| /auth | media | branding/copy | D | Panel izquierdo de `/auth`: «KREOON / El sistema operativo para creadores / CONECTA. CREA. CRECE.» (mayúsculas), mientras la landing dice «Un espacio para quienes crean» y «Conecta. Crea. Crece.». Dos promesas distintas. | Abrir `/auth` en escritorio | Unificar eslogan con la landing. | 11-desktop-auth-pagina |
| modal en / · /auth | media | UX | M/T/D | Objetivos táctiles <44 px: pestañas 40 px de alto, inputs 40, «Mostrar contraseña» 16×16, «¿Olvidaste tu contraseña?» 168×20, «Regístrate» 68×20, botón cerrar «Close» 16×16. | Inspeccionar modal en 390 px | Inputs y pestañas a 48 px, icono de ojo y cerrar con área 44×44, enlaces con padding vertical. | 44-movil-login-modal |
| modal en / · /auth | media | copy | M/T/D | El botón de cerrar del modal se lee «Close» (inglés) para lectores de pantalla. La validación nativa del navegador sale en inglés («Please include an '@' in the email address…») y no hay mensaje visible en español bajo el campo (0 elementos `role=alert`). | Escribir `no-es-un-correo` → Tab | Traducir a «Cerrar»; usar `noValidate` y mensajes propios en español bajo el campo («Escribe un correo como nombre@ejemplo.com»). | 08-desktop-login-validacion |
| modal | baja | UX | D | El modal mide 782 px de alto en una pantalla de 900 (casi toda) para solo 2 campos; en móvil ocupa 828 de 844. | Abrir modal en 1440 y 390 | Reducir espaciados: debería caber con aire en ~560 px. | 07-desktop-login-modal |
| modal | baja | UX | M | OK: Esc cierra el modal; «Mostrar contraseña» alterna a «Ocultar contraseña». No hay fallo, solo confirmación. | — | — | 44-movil-login-modal |

## 3. Recuperar contraseña (dentro de `/auth`, sin enviar)

| ruta | severidad | tipo | dispositivo | qué pasa | pasos para reproducir | propuesta concreta | captura |
|---|---|---|---|---|---|---|---|
| /auth (recuperar) | crítica | contraste | D | Mismo defecto del correo: texto tecleado blanco sobre crema. | «¿Olvidaste tu contraseña?» → escribir `xx` | Ver fila crítica de modal. | 12-desktop-recuperar |
| /auth (recuperar) | media | copy | D | Validación solo nativa y en inglés («'xx' is missing an '@'»); no se muestra error visible en español. «Volver al login» (anglicismo; el resto dice «Iniciar sesión»). | Escribir `xx` → Tab | «Volver a iniciar sesión»; mensaje propio visible. | 12-desktop-recuperar |
| /auth (recuperar) | baja | UX | D | «Enviar instrucciones» pegado a «Volver al login» sin separación vertical visible en el texto extraído; botón 48 px OK, enlace 20 px de alto. | Abrir recuperar | Área tocable 44 px en «Volver…». | 12-desktop-recuperar |

## 4. `/registro`

| ruta | severidad | tipo | dispositivo | qué pasa | pasos para reproducir | propuesta concreta | captura |
|---|---|---|---|---|---|---|---|
| /registro | crítica | bug | M/T/D | «No pudimos cargar la inscripción». Red: `rpc/get_default_registration_org` 404 (se repite al pulsar «Reintentar»). Registrado según lo pedido; no investigado. | Abrir `/registro` | Ver causa en la base de datos (conocida). | 10-desktop-registro-error, 60-tablet-registro, 61-movil-registro |
| /registro | media | copy | M/T/D | El mensaje habla de «problema de conexión» cuando es fallo del servidor; con «Reintentar» que nunca funcionará da sensación de bucle. | Pulsar «Reintentar» 2 veces | Tras 1 reintento fallido mostrar «Estamos en mantenimiento» y un enlace útil (inicio / soporte). | 10-desktop-registro-error |
| /registro | baja | UX | M/T | «Inicia sesión» (enlace de pie) mide 68×17 px. Botones «Reintentar» y «Ya tengo cuenta…» sí 48 px. Fondo y colores sí coinciden con la marca. | Inspeccionar en 390 px | Subir enlace a 44 px. | 61-movil-registro |

## 5. Footer de la landing

El footer enlaza: «Iniciar sesión» (abre modal), «Términos» → `/legal/terms_of_service`, «Privacidad» → `/legal/privacy_policy`, «Cookies» → `/legal/cookie_policy`. Tres enlaces funcionan (200, sin 4xx).

| ruta | severidad | tipo | dispositivo | qué pasa | pasos para reproducir | propuesta concreta | captura |
|---|---|---|---|---|---|---|---|
| / (footer) | media | UX | M/T/D | Hay DOS URLs por cada documento legal con el mismo contenido: el footer usa `/legal/terms_of_service`, `/legal/privacy_policy`, `/legal/cookie_policy`; el banner de cookies y las páginas legales usan `/legal/cookies`, `/legal/terms`, `/legal/privacy`. Además existen `/terms` y `/privacy` (versión antigua distinta, ver §6). | Comparar enlaces del banner, footer y legales | Una sola ruta por documento y redirección 301 de las demás. | 22-desktop-legal-legal-cookie_policy, 23-desktop-legal-legal-cookies |
| / (footer) | baja | UX | M | Los enlaces del footer miden aprox. 58×20, 66×20, 51×20 px. | Inspeccionar footer en 390 px | Padding para 44 px de alto y separación. | 61-movil-legal-cookies |

## 6. Páginas legales

### 6.1 `/legal/terms_of_service` (= `/legal/terms`) y `/legal/privacy_policy` (= `/legal/privacy`)

| ruta | severidad | tipo | dispositivo | qué pasa | pasos para reproducir | propuesta concreta | captura |
|---|---|---|---|---|---|---|---|
| /legal/privacy_policy | alta | contraste | M/T/D | 212 textos con contraste bajo: celdas de tablas en gris claro `#D1D5DB` sobre crema (1.39:1), etiquetas en blanco (1.06:1), enlaces `#C084FC` (2.49:1). Tablas de datos recopilados, finalidades, proveedores y retención prácticamente ilegibles (colores pensados para fondo oscuro). | Abrir `/legal/privacy_policy` y mirar las tablas | Texto de tablas `#242135`/`#625E78`, etiquetas `#242135`, enlaces `#6D4AFF`. Estilo único «prosa legal» con los tokens de la landing. | 21-desktop-legal-legal-privacy_policy |
| /legal/terms_of_service | alta | contraste | M/T/D | 53 textos con bajo contraste: etiquetas «Plataforma:», «Titular:», «Versión:», «Fecha de vigencia:», «Última actualización:» en blanco sobre `#F6F3F6` (1.10:1); muestreo de píxeles confirma que son invisibles. | Abrir `/legal/terms_of_service` | Igual que arriba. | 20-desktop-legal-legal-terms_of_service |
| /legal/privacy_policy | alta | bug | M | Scroll horizontal en móvil: el documento mide 485 px en pantalla de 390 px por la tabla de proveedores (469 px). No pasa en 768/1440 ni en los otros documentos. | Abrir en 390 px y desplazar lateralmente | Envolver tablas en `overflow-x:auto` o convertirlas en tarjetas apiladas en móvil. | 61-movil-legal-privacidad |
| /legal/privacy_policy | alta | bug | D | El documento enlaza a `https://kreoon.com/legal/privacy-request` (dominio de producción, 3 veces) como vía para ejercer derechos; en este despliegue la ruta `/legal/privacy-request` queda en BLANCO (sin contenido, `legal_documents?document_type=eq.privacy-request` → 406). | Abrir `/legal/privacy-request` | Crear la página/formulario o quitar el enlace; usar ruta relativa; mientras tanto indicar `dpo@kreoon.com`. | 33-desktop-legal-privacy-request |
| /legal/terms_of_service y /legal/privacy_policy | media | copy | D | Fechas incoherentes: la cabecera dice «4 de marzo de 2026» y el cuerpo «Fecha de vigencia / Última actualización: 5 de marzo de 2026». | Leer la cabecera y el primer bloque | Mostrar una sola fecha (la del cuerpo). | 20-desktop-legal-legal-terms_of_service |
| /legal/terms_of_service | baja | UX | D | Documento de 19.5 mil caracteres sin índice ni anclas; «Volver» (99×36 px). Los 10+ encabezados en MAYÚSCULAS cuesta leer. | Abrir y desplazarse | Tabla de contenidos al inicio; encabezados en capitalización normal. | 20-desktop-legal-legal-terms_of_service |
| /legal/privacy_policy | baja | UX | M/T/D | Enlaces a correos (`dpo@…`, `soporte@…`) con alto 22 px. | Inspeccionar | Padding. | 21-desktop-legal-legal-privacy_policy |

### 6.2 `/legal/cookie_policy` (= `/legal/cookies`)

| ruta | severidad | tipo | dispositivo | qué pasa | pasos para reproducir | propuesta concreta | captura |
|---|---|---|---|---|---|---|---|
| /legal/cookies | alta | copy/contenido | M/T/D | Política casi vacía (315 caracteres): «Utilizamos cookies esenciales, de rendimiento, funcionalidad y publicidad. Puedes gestionar tus preferencias en la configuración del navegador.» No lista cookies, duración ni terceros y contradice al banner (que ofrece Analíticas, Marketing y Personalización dentro del sitio). El mismo enlace se abre desde el banner de cookies. | Banner → «Política de Cookies» | Redactar la política: tabla de cookies, finalidad, duración, cómo cambiar el consentimiento dentro de Kreoon. | 22-desktop-legal-legal-cookie_policy |
| /legal/cookies | baja | copy | M/T/D | Pie duplicado: «© 2026 SICOMMER INT LLC.» y justo debajo «© 2026 SICOMMER INT LLC. Todos los derechos reservados.» | Ir al final | Dejar una sola línea. | 23-desktop-legal-legal-cookies |

### 6.3 `/terms`, `/privacy` y `/data-deletion` (versión antigua)

| ruta | severidad | tipo | dispositivo | qué pasa | pasos para reproducir | propuesta concreta | captura |
|---|---|---|---|---|---|---|---|
| /terms · /privacy | alta | contenido | D | Existen dos versiones de los mismos documentos: `/terms` y `/privacy` («Última actualización: 19 de febrero de 2026», 5 mil caracteres) distintas a las del footer (versión 1.0, 5 de marzo, 19 mil / 11 mil caracteres). Pueden contradecirse; el usuario puede acabar en cualquiera (desde `/data-deletion` se enlaza a las viejas). | Abrir `/terms` y `/legal/terms_of_service` y comparar | Retirar las antiguas o redirigirlas a las vigentes; actualizar enlaces de `/data-deletion`. | 24-desktop-legal-terms, 25-desktop-legal-privacy |
| /data-deletion | media | fórmula/dato | D | Dice que la facturación se conserva «generalmente 5 años»; la Política de Privacidad vigente dice «Facturas y datos fiscales: 10 años» y «Registros de transacciones: 7 años». | Leer «¿Qué datos se conservan?» vs tabla de retención en `/legal/privacy_policy` | Unificar plazos con el responsable legal [POR CONFIRMAR cuál es el correcto]. | 32-desktop-data-deletion |
| /data-deletion | baja | copy | D | Trato de «usted» («su derecho», «su@email.com»), mientras la landing usa «tú»; el botón de enviar es rojo `#C6243A` (destructivo, razonable) pero distinto del morado de marca. No se envió el formulario. | Leer la página | Unificar a «tú» y confirmar el rojo con diseño. | 32-desktop-data-deletion |
| /terms · /privacy · /data-deletion | baja | UX | M | Enlaces del pie y «Volver al inicio» 20 px de alto (<44). Sin scroll horizontal. | Inspeccionar en 390 px | Padding. | 61-movil-terms |

### 6.4 Rutas inexistentes

| ruta | severidad | tipo | dispositivo | qué pasa | pasos para reproducir | propuesta concreta | captura |
|---|---|---|---|---|---|---|---|
| /legal · /cookies · cualquier ruta falsa | baja | UX | D | La 404 funciona y respeta la marca (crema, `#242135`), pero ofrece enlaces a «Dashboard», «Explorar» y «Configuración» a visitantes sin sesión (se redirigirán a login), y «404» en grande. | Abrir `/ruta-inexistente-xyz` | Mostrar solo «Ir al inicio» e «Iniciar sesión»; añadir `/legal` como índice de documentos. | 80-desktop-404, 35-desktop-legal |

---

## Red, consola y rendimiento (resumen)
- Consola: 0 errores/advertencias capturados en `/`, `/auth`, `/registro` y legales.
- Peticiones fallidas: 404 `rpc/get_default_registration_org` (en `/registro`, conocido); 406 `legal_documents?document_type=eq.privacy-request` (en `/legal/privacy-request`). Nada más 4xx/5xx.
- Carga: landing 898 ms hasta DOMContentLoaded; ninguna ruta pasó de 3 s.
- No confirmado: una petición `functions/v1/access-gate` aparecía sin estado en la primera carga de la sesión (status 0 en Resource Timing, normal en peticiones cruzadas); no se repitió, no se reporta como fallo.

## Top 10 priorizado
1. **/registro roto y todos los «Crear mi cuenta» (3 CTA + pestaña «Registrarse») llevan a él** — sin registro no hay producto. Arreglar la función o ocultar/redirigir los CTA (crítica).
2. **Texto del campo correo invisible (blanco sobre crema)** en login y recuperar contraseña — nadie ve lo que escribe (crítica).
3. **Título «Bienvenido de nuevo» y botón «Google» blanco sobre blanco** en login (crítica).
4. **Contraste de login ≤3:1**: subtítulo, rótulos, pestaña «Registrarse», «¿Olvidaste…?», «Regístrate» (alta). Pasar a `#625E78`/`#6D4AFF`.
5. **Políticas legales ilegibles** (`/legal/privacy_policy` 212 y `/legal/terms_of_service` 53 textos con contraste 1.0–2.5): corregir colores con tokens claros (alta).
6. **Tracking `kae-track` + ids en localStorage antes de consentir y tras «Solo esenciales»** (alta, riesgo legal).
7. **`/legal/privacy-request` en blanco y enlazada con dominio de producción** — derecho de datos sin vía de ejercicio (alta).
8. **Dos versiones de términos y privacidad** (`/terms`/`/privacy` de febrero vs `/legal/*` de marzo) con plazos distintos (5 vs 10 años) (alta/media).
9. **Scroll horizontal en móvil en `/legal/privacy_policy`** (485 px en 390) por tabla de proveedores (alta).
10. **Política de cookies vacía y contradictoria con el banner**; banner móvil ocupa 50 % de la pantalla y botones <44 px (alta/media).

Siguientes (no en el top): validaciones y «Close» en inglés, objetivos táctiles <44 px en modal/footer, branding del modal (degradado, radios 2 px/12 px) vs landing, jerga «UGC Colombia», JS de charts/d3 en la landing, título único con emoji en todas las rutas.
