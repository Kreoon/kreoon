# Diagnóstico móvil de Kreoon (área del creador, portafolio público, acceso)

> Fecha: 2026-10-01 · Rama: `claude/focused-mendel-es4xcv` (commit `53446171` + cambios sin commitear de otras sesiones en `profile-viewer/`, `registro/ConsentBlock.tsx`, `settings/`).
> Método: lectura de código (archivo:línea) y observación del preview de la rama con **emulación** de Chrome (375×812, 320×640, 812×375 horizontal). Sin iniciar sesión: el área privada se diagnosticó por código. No hubo dispositivo real.
> Severidad: **Crítica** (seguridad/privacidad o pérdida de datos) · **Alta** (bloquea o rompe una tarea móvil) · **Media** (fricción clara) · **Baja** (pulido).

## Resumen

| # | Hallazgo | Sev. |
|---|---|---|
| S1 | `bunny-portfolio-upload` (sin JWT) devuelve la **API key completa de Bunny Stream** a cualquiera | Crítica |
| S2 | `bunny-raw-upload` / `bunny-media-upload` / `bunny-upload(-v2)` devuelven contraseñas de zona o API key a cualquier usuario con sesión, sin autorizar la ruta | Crítica |
| P1 | El service worker (cuando existe) cachea respuestas **autenticadas** de Supabase REST por URL, sin usuario | Crítica |
| P2 | La caché completa de React Query se guarda en localStorage (`kreoon-rq-v1`) y se rehidrata **sin comprobar el usuario**; el cierre de sesión no la borra | Crítica |
| P3 | Cerrar sesión no limpia caché en memoria, localStorage, sessionStorage ni cachés del SW | Crítica |
| P4 | Borrador del onboarding con documento de identidad y fecha de nacimiento en localStorage global | Alta |
| W1 | El service worker **no se registra** (nadie llama a `register`); PWA, offline y push no funcionan para usuarios nuevos | Alta |
| N1 | No existe manejo de Atrás para diálogos/paneles/visor; `ScrollToTop` borra el scroll también al volver | Alta |
| N2 | Deep link perdido al pedir sesión (`/auth` sin destino) | Alta |
| N3 | Barra inferior del creador con «Más» + menú de avatar duplicando rutas; rótulo «Panel Creador» rosa fuera de marca | Media |
| B1 | Constructor de perfil inutilizable en móvil (añadir bloques solo arrastrando; V2 sin layout móvil; barra superior desbordada) | Alta |
| B2 | «Vista previa» del constructor muestra lo publicado, no el borrador; V1 publica sin `publish_profile_blocks` | Alta |
| V1 | Mismo creador con dos perfiles públicos distintos (`/p/:slug` vs `/marketplace/creator/:id`) | Alta |
| V2 | `/p/:slug` muestra spinner y «Este perfil no tiene contenido publicado aún» a la vez | Media |
| U1 | Ninguna subida de contenido es reanudable ni cancelable; `timeout` de 10 min incompatible con el límite de 5 GB | Alta |
| Q1 | Acciones rápidas del tablero («Iniciar grabación», «Grabado», «Novedad») nunca se muestran al creador por rol sin normalizar | Alta |
| Q2 | Lista móvil del tablero (vista por defecto) sin fecha de entrega, sin acciones y sin estado vacío | Alta |
| E1 | Errores de carga mostrados como «vacío» en Inicio e Invitaciones | Alta |
| F1 | `/auth`: inputs de 14 px (zoom en iOS al enfocar) y 40 px de alto | Media |
| L1 | Splash de 2 s en `/auth`, `/p/:slug` y en cada arranque de la app | Media |

---

## 1. Seguridad detectada al revisar subidas (fuera del alcance móvil, pero bloquea la ola de subidas)

**S1 · Crítica** — `supabase/functions/bunny-portfolio-upload/index.ts:263-317`: la acción por defecto `create` no autentica (`supabase/config.toml:157-158`, `verify_jwt = false`), confía en `body.user_id` y responde `access_key: bunnyApiKey` (línea 312), la API key de la librería Stream de contenido (`BUNNY_API_KEY`). Con esa clave se pueden listar, borrar o sobrescribir videos. Las acciones `save-hash` (:53) y `save-raw-video` (:136, añade URLs a `content.raw_video_urls` de cualquier `content_id`) tampoco autentican; solo `set-final-videos` (:176-200) valida JWT. Lo usan `BunnyMultiVideoUploader.tsx:258-267` (entrega final) y `MediaLibraryUploader.tsx:96-105` (constructor). *Verificado en el código del repo; no se probó contra producción para no tocar sistemas reales.*

**S2 · Crítica** — `bunny-raw-upload/index.ts:98-106` devuelve `accessKey: storagePassword` a cualquier JWT válido, con `storagePath` libre (sin comprobar organización ni proyecto). Mismo patrón en `bunny-media-upload/index.ts:203-205` (contraseñas de zonas de imágenes/assets) y `bunny-upload`/`bunny-upload-v2` (API key de Stream). El patrón seguro ya existe: `academy-video-upload-init` firma TUS (`sha256(libraryId+apiKey+exp+videoId)`, 4 h) sin exponer la clave.

> Recomendación: tratarlo con `security-auditor` + rotación de claves **antes** de cualquier trabajo de subidas móviles. No forma parte de esta fase.

## 2. Privacidad y almacenamiento local

**P1 · Crítica** — `vite.config.ts:193-209`: regla `NetworkFirst` para `^https://.*\.supabase\.co/rest/v1/.*` (200 entradas, 1 h). La clave de caché es la URL; el `Authorization` no forma parte. Si la red tarda > 6 s o no hay red, se sirve la respuesta guardada aunque sea de otro usuario del mismo navegador. Igual `supabase-storage-v1` (`:210-224`, `CacheFirst` 7 días) guarda URLs firmadas de comprobantes de pago (`useTalentPayments.ts:263,276`). Hoy solo afecta a quien tenga un SW de versiones anteriores (ver W1), pero se activaría para todos el día que se registre el SW.

**P2 · Crítica** — `src/App.tsx:410-453`: se vuelca la caché exitosa de React Query (arrays ≤ 100, ≤ 4 MB) en `kreoon-rq-v1` y se hidrata al arrancar (`:415-427`) sin mirar quién tiene sesión. En el preview, **sin sesión** y solo con la home, ya ocupaba 268 KB. Con sesión contiene perfil, roles, contenido, finanzas.

**P3 · Crítica** — `src/hooks/useAuth.tsx:713-716`: `signOut` solo hace `localStorage.removeItem('activeRole')` y `supabase.auth.signOut()`. No llama a `queryClient.clear()` (no hay ningún `clear/removeQueries/resetQueries` en `src/`), ni borra `kreoon-rq-v1`, `kreoon-auth-store` (`authStore.ts:108-112`; `authStore.reset()` existe y nadie la llama), `currentOrganizationId`, `selectedClientId`, `kiro-chat-history` (historial privado de KIRO), borradores, `sessionStorage` (`impersonation`), ni `caches`. La expulsión por baneo (`useAuth.tsx:388-390`) tampoco.

**P4 · Alta** — `src/components/onboarding/NovaProfileDataStep.tsx:268-451`: `kreoon_onboarding_quiz` guarda teléfono, número de documento, fecha de nacimiento y género en localStorage **global**, y solo se borra al completar.

Inventario de claves (resumen; ninguna clave de borrador incluye `user_id`):

| Tipo | Claves | Aislamiento |
|---|---|---|
| Privadas | `kreoon-rq-v1`, `currentOrganizationId`, `selectedClientId`, `activeRole`, `kreoon-auth-store`, `kiro-chat-history`, `kreoon_kiro_*`, `unsaved_changes_backup`, `board_state_${orgId}` | Global u organización |
| Por usuario | `board_user_prefs_${userId}_${orgId}`, `content_notifications_${userId}` | Correcto |
| Borradores | `kreoon_onboarding_quiz` (PII), `kreoon_creator_wizard_draft`, `kreoon_hiring_draft_${creatorId}`, `kreoon_product_brief_draft_${clientId}`, `draft_${entity}_${id}` (`useDraftManager.ts`) | Sin usuario |
| Preferencias / analítica | `kreoon_feed_muted`, `kreoon:board-density:${orgId}`, `kreoon_cookie_consent`, `kae_*`, `kreoon_utm_params` | No sensibles |

Otros: `UnsavedChangesProvider` (`src/contexts/UnsavedChangesContext.tsx:109-148`) avisa con `beforeunload` pero **no guarda** contenido; su diálogo «Guardar y salir» depende de `pendingNavigation`, que nada asigna. `useOnlineStatus.ts` existe sin uso; `refetchOnReconnect: false` (`App.tsx:403`).

## 3. PWA

Detalle completo en `pwa-offline.md`. Lo esencial:
- **W1 · Alta** — `vite.config.ts:296` `injectRegister: false` y ningún `virtual:pwa-register`/`register()` en `src/`. Verificado en el preview: `navigator.serviceWorker.getRegistration()` → `null`, `/sw.js` → 200. `UpdatePrompt` (`src/components/pwa/UpdatePrompt.tsx:26`) y push (`usePushNotifications.ts:52,68`) dependen de un registro que no existe.
- **Media** — Dos `<link rel="manifest">` en el HTML servido (`index.html:65` + inyectado por el plugin) y dos fuentes de manifest (`public/manifest.webmanifest` y `vite.config.ts:115-139`). El servido dice `lang: "en"`, `orientation: "portrait-primary"` (impide horizontal instalada, el encargo pide ambas), sin `id`, iconos `"any maskable"` combinados.
- **Baja** — `apple-mobile-web-app-status-bar-style: black-translucent` (`index.html:8`) con fondo crema: texto de la barra de estado blanco sobre claro en iOS instalado.
- **Bien** — `viewport` sin bloqueo de zoom (`index.html:5`, `viewport-fit=cover`); `registerType: 'prompt'` y `skipWaiting: false` evitan recargas inesperadas; Edge Functions `NetworkOnly`; reglas HLS correctas.

## 4. Navegación y layout

**N1 · Alta** — Atrás y contexto:
- No hay ningún `popstate`/`pushState` en `src/`: Atrás con un `Dialog`, `Drawer`, `Sheet` o visor abierto **sale de la página** en vez de cerrar la capa.
- `src/components/ScrollToTop.tsx:4-11` hace `scrollTo(0,0)` en cada cambio de `pathname`, incluso en navegación `POP` → al volver de un detalle se pierde la posición de la lista. `App.tsx` usa `BrowserRouter`, así que `<ScrollRestoration>` no está disponible.
- `MainLayout.tsx:155-169` (`PageWrapper` con `AnimatePresence mode="wait"`): animación de salida + entrada de ~0,6 s en **cada** navegación; en móvil se percibe lento.
- El detalle de proyecto `?item=<id>` (`ContentBoard.tsx:341-347`) abre el diálogo y **borra el parámetro** con `replace`: no queda deep link y Atrás no lo cierra.

**N2 · Alta** — `src/components/ProtectedRoute.tsx:163` → `<Navigate to="/auth" replace />` sin el destino. Verificado: `/board` sin sesión acaba en `/auth` sin parámetros. `src/lib/routing/postAuth.ts` ya importa `sanitizeReturnTo`, no se aprovecha aquí.

**N3 · Media** — Barra inferior del creador (`MainLayout.tsx:74-79, 313-411`):
- 3 destinos + «Más» (`MoreMenuSheet.tsx:35-39`: Portafolio, Mis Cobros, Configuración) + menú del avatar (`AccountMenu.tsx:54-76`: Mi Perfil, Configuración, Cerrar sesión) → Configuración aparece en 2 sitios; «Mi perfil» lleva a `/p/:slug` desde el avatar y a `/marketplace/creator/:id` desde la cabecera de escritorio (`IntegratedNotificationHeader.tsx:251-298`).
- Activo por igualdad exacta de `pathname` (`MainLayout.tsx:356-358`): con `?tab=`/`?item=` sigue bien, pero cualquier sub-ruta apaga la pestaña.
- Etiquetas a 10 px (`text-[10px]`), por debajo de lo legible.
- Cabecera: «Panel Creador» con icono `bg-pink-500` (`MainLayout.tsx:322-326`): fuera de la marca de la landing.
- Bien: `env(safe-area-inset-bottom)` en barra y `main`, alto en variable CSS única (`layoutConstants.ts`, 64 px), objetivos de 44 px, KIRO oculto para creador/editor (`MainLayout.tsx:189`).
- Hay 4 copias casi idénticas del layout móvil por rol en `MainLayout.tsx` (794 líneas) y otra navegación en `MobileNav.tsx` (729 líneas, usada en la rama por defecto, `:693`); `MobileBottomNav.tsx` es código muerto (ledger 2026-07-10).

**L1 · Media** — `src/components/PageLoader.tsx:7-11`: splash de 2 000 ms en todas las rutas salvo `/`, `/registro*`, `/bienvenida`. Verificado en `/auth` (formulario tapado ~5 s en total con la carga) y `/p/:slug`. En una PWA instalada se vería en cada arranque.

**Altura y áreas seguras**:
- 247 usos de `100vh`/`h-screen`/`min-h-screen` frente a 44 de `dvh/svh`. Relevantes: `index.html:22` (`#root{min-height:100vh}`), `ProfileBuilder.tsx:536` (`h-screen` con barras fijas arriba y abajo → la inferior queda bajo la barra del navegador móvil), `ui/dialog.tsx:44` (`max-h-[calc(100vh-1rem)]`). `MoreMenuSheet.tsx:55` ya usa `70dvh` (patrón a copiar).
- `safe-area-inset` solo en 13 archivos; no hay `safe-area-inset-top` en la cabecera móvil (con `viewport-fit=cover` + `black-translucent`, en iOS instalado la cabecera queda bajo la muesca).
- Sin desbordamiento horizontal a 320 px en `/registro`, `/p/:slug` ni `/marketplace` (verificado `scrollWidth === innerWidth`).

## 5. Formularios de acceso

- **F1 · Media** — `/auth`: inputs con `font-size: 14px` y 40 px de alto (medido). iOS hace zoom al enfocar campos < 16 px. Tienen `autocomplete` correcto (`email`, `current-password`).
- **Bien** — `/registro/ugc-colombia`: 16 px, 48 px, `autocomplete` `name`/`email`/`new-password`, `inputmode=email`, pista de contraseña con `aria-describedby`. Falta `enterkeyhint`. El consentimiento queda bajo el pliegue en 375×812 (lo está cambiando otra sesión).

## 6. Portafolio, constructor y perfil público

**Portafolio (`/content`)** — `src/pages/Content.tsx:147-150` titula «Mi Contenido» lo que el menú llama «Portafolio»; muestra entregas de la tabla `content`, no el portafolio público. Pestaña Marketplace: botones Descargar/Ver no hacen nada (`:328-337`) y solo aparecen con hover (`opacity-0 group-hover`), invisibles en táctil; play también solo hover (`:316-320`). El creador no puede añadir nada aquí. No enlaza al constructor ni al perfil público.

**B1 · Alta — Constructor (`/profile-builder`)**:
- V1 (`ProfileBuilder.tsx`): `h-screen` (`:536`); en < md, dos `Sheet` de 288 px (`:577-616`). **Añadir bloques solo arrastrando** (`BlockPalette.tsx:124-129`, `PointerSensor` 8 px) y desde el Sheet no se puede soltar sobre el lienzo → en móvil no se pueden añadir bloques. `BuilderToolbar.tsx:38-163`: 5 botones con texto + selector de dispositivo + estado de 160 px, sin variante móvil (se desborda a 375 px) y sin botón para volver a la app.
- V2 (`ProfileBuilderV2.tsx:279-329`): carril de 64 px + panel de 320 px fijos, sin ninguna clase responsive.
- Sin `MainLayout` (`App.tsx:1099-1104`): correcto para una tarea a pantalla completa, pero sin salida clara.

**B2 · Alta — Borrador vs publicado**:
- V1 no autoguarda (`useAutoSave.ts` existe sin uso); «Guardar borrador» (`ProfileBuilder.tsx:348-377`) no guarda el estilo; «Publicar» (`:379-416`) escribe `builder_config` y bloques directamente, **sin** `publish_profile_blocks` (no limpia `builder_config_draft`/`builder_has_draft`).
- V2 lo hace bien: autoguardado 1,5 s (`useBuilderAutosave`), estilo a `builder_config_draft`, publica con la RPC (`ProfileBuilderV2.tsx:185-242`), estados «Guardando… / Error al guardar / Sin guardar / Guardado» (`:261-269`). → **Base para el constructor por pasos.**
- Vista previa (`ProfileBuilder.tsx:418-429` → `ProfilePreviewPage.tsx:72,133-139`): valida el token y **redirige a `/marketplace/creator/:id`**, que muestra lo publicado. `ProfilePageRenderer isPreview` existe y no se usa.

**V1 · Alta — Dos perfiles públicos**:
- `/p/:slug` → `PublicCreatorPage.tsx:345` → bloques del constructor (`ProfilePageRenderer`), sin navegación privada, con botones flotantes Contratar/Seguir/Compartir (`:355-381`). Tema oscuro fijo (fuera de la marca de la landing).
- `/marketplace/creator/:id` → `ProfileLayout.tsx:25-27` añade **todo `MainLayout`** si hay sesión, más la cabecera propia de `TemplateProfileRenderer.tsx:261-266` (doble cabecera). Con el cambio sin commitear, siempre pinta `StudioUgcProfile` (no los bloques): lo editado en el constructor ya no se refleja ahí.
- Compartir: `ProfileShareButton` (`/p/`) abre `ProfileShareDialog.tsx` sin `navigator.share` y comparte `https://kreoon.com/@slug` (`:84`), ruta que **no funciona** (React Router 6 no admite `/@:username`). `ProfileHeader.tsx:41-59` sí usa `navigator.share` + copiar.
- Visor: `StudioUgcProfile.tsx:91-151` reproduce dentro de la tarjeta (varios videos pueden sonar a la vez; sin anterior/siguiente, Escape ni Atrás); `ImageGalleryBlock.tsx:53-118` sin Escape, deslizar, `role="dialog"` ni foco; `PortfolioBlock.tsx:344-380` flechas solo en hover.
- Observado en el preview: la bio pública de un creador muestra su correo electrónico. La regla de producto es «sin contactos del creador»; la lista de verificación de Publicar debería detectarlo (no se cambia nada ahora).

**V2 · Media** — `/p/valegiraldor` en el preview muestra a la vez el spinner y «Este perfil no tiene contenido publicado aún» (estado contradictorio).

## 7. Subidas

| Flujo | Transporte | Validación | Progreso | Cancelar / reintentar / reanudar |
|---|---|---|---|---|
| Material crudo (`RawAssetsUploader.tsx`) | `bunny-raw-upload` → XHR PUT a Storage | Solo nombres; **sin tamaño**; no acepta fotos (`:567`) | Real (`:296`) | No / manual desde 0 / No. `timeout` 10 min (`:318`) |
| Entrega final (`BunnyMultiVideoUploader.tsx`) | `bunny-portfolio-upload` (sin auth) → XHR PUT a Stream | MIME en lista (falla con `file.type` vacío en Android) · 5 GB | Real (`:285`) + `encode_progress` | No / reset / No. `timeout` 10 min (`:312`) vs 5 GB |
| Avatar (Settings) | `bunny-media-upload` → PUT | `image/*` 5 MB | No se muestra | No |
| Portafolio video (`usePortfolioItems.ts:285-406`) | **Proxy** por Edge Function (límite de tiempo) | 500 MB | Solo spinner | No |
| Portafolio imagen (`:408-469`) | base64 en JSON | 5 MB | Spinner | No |
| Constructor (`MediaLibraryUploader.tsx`) | Imagen: `useMediaUpload` (bien); video: `bunny-portfolio-upload` | 10 MB / 500 MB | Imagen real; **video ninguno** | No; `timeout` sin listener (`:130-140`): la promesa nunca resuelve |

- `tus-js-client` ya está (`package.json:109`) pero solo lo usa Academia (`academia/course-editor/BunnyVideoUploader.tsx`). **No hay firma TUS para contenido**: reanudar exige una función nueva (similar a `academy-video-upload-init`).
- Ningún flujo usa `capture`, `AbortController`, `beforeunload` ni bloquea el cierre del modal con subidas activas (`UnifiedProjectModal/index.tsx:291-296`); cambiar de pestaña en el modal desmonta el uploader (`:643`).
- Código muerto: `RawVideoUploader.tsx`, `content/BunnyVideoUploader.tsx`, `BunnyStorageUploader.tsx`, `social/FeaturedVideoUploader.tsx`, `media/VideoUploader.tsx`.

## 8. Inicio, Proyectos, Invitaciones y Cuenta

**Inicio (`/creator-dashboard`, `src/pages/CreatorDashboard.tsx`)**
- **Media** — No responde «qué hago ahora»: saludo con contador (`:217-219`), filtro de mes, 5 KPIs que abren diálogos (`:386-427`), cuadrícula de aprobados (`:431-454`). No hay lista de tareas con fecha ni acción directa.
- **Alta** — Pestaña leída solo al montar (`:56-60`) y no escrita en la URL: «Más → Mis Cobros» (`MoreMenuSheet.tsx:37`, `?tab=wallet`) **no hace nada** si ya se está en el Inicio; recargar pierde la pestaña.
- **Media** — El `error` de `useContent` no se usa (`:50`): un fallo de carga se muestra como «Todavía no tienes videos por grabar» (`:307-313`).
- **Media** — `UnifiedKpiDialog.tsx:263` navega a `/board?view=marketplace`, parámetro que el tablero no lee.
- **Baja** — Spinner a pantalla completa (`:197-203`); doble padding (MainLayout `px-3` + página `p-4` ≈ 28 px por lado a 360 px); `ClientVideoDetailSheet.tsx:109` con `h-[90vh]`.

**Proyectos (`/board`)**
- **Alta — acciones rápidas invisibles para el creador.** `StatusChangeDropdown.tsx:39,92` compara `userRole === "creator"`, pero el tablero pasa `activeRole` sin normalizar (`ContentBoard.tsx:249-252,483`), que para la mayoría vale `content_creator` (`useAuth.tsx:121-135`). Resultado: «Iniciar grabación», «Grabado», «Novedad» no aparecen en la tarjeta. `contentBoardPermissions.ts:75` sí normaliza; este componente no. *Verificado leyendo la cadena completa.*
- **Alta — la Lista (vista por defecto < 768 px, `useBoardPersistence.ts:71`) no sirve para trabajar:** `BoardListView.tsx` sin acciones ni «Mover a…» (solo abre el detalle, `:170`); fila `div onClick` sin teclado; **fecha de entrega oculta en móvil** (`hidden sm:flex`, `:331`); puntos fijos «100» (`:343-348`); se le pasa `showFieldsCustomizer` al creador (`ContentBoard.tsx:787`).
- **Media** — Lista vacía sin mensaje (el vacío solo se pinta en Kanban, `ContentBoard.tsx:707,759`).
- **Media** — Detalle `UnifiedProjectModal` (`index.tsx:351-352`): pantalla completa con `100dvh` (bien) pero hereda `max-w-[90vw]` → hueco a la derecha; botón X de 16 px con texto «Close» en inglés (`ui/dialog.tsx:51-53`); sin safe-area; la URL no cambia.
- **Media** — «Mover a…» es un submenú lateral (`KanbanCard.tsx:417-493`, `w-56 + w-52`) poco usable a 360 px.
- Filtros en estado local persistido por organización (`ContentBoard.tsx:100-129`), no en la URL. Errores bien resueltos (banner con Reintentar, `:689-705`) y esqueleto (`:722-731`).

**Invitaciones (`/marketplace/invitations`, etiqueta «Campañas»)**
- Muestra invitaciones de organizaciones (Aceptar/Rechazar), no campañas.
- **Alta** — `useCreatorReceivedInvitations` no expone `error` (`useMarketplaceOrgInvitations.ts:41-74`): un fallo se ve como «Aún no tienes invitaciones» (`MarketplaceInvitationsPage.tsx:96-107`).
- **Media** — «Rechazar» sin confirmación (`:174`); spinner de la mutación compartido por todas las filas (`:162-183`); fila horizontal sin `flex-wrap` (`:111,141`) y botones de ~30 px; `text-green-400`/`text-red-400` con poco contraste en claro.
- **Baja** — `ROLE_LABELS` sin `content_creator` (`:32-40`, muestra la clave cruda); toasts con `error.message` crudo.

**Cuenta (`/settings`)**
- Secciones del creador: Mi Perfil, Notificaciones, Seguridad, Tour Guiado, Referidos (`SettingsSidebar.tsx:41-49,72`). En móvil: menú de tarjetas → sección con «Volver».
- **Alta** — La sección se escribe con `replace: true` (`SettingsPage.tsx:121-127`): Atrás sale de Configuración en vez de volver al menú.
- **Media** — **Cerrar sesión no está en Configuración ni en «Más»**; solo en el menú del avatar.
- **Baja** — Dos «Volver» en móvil (`:157-167` y `:206-216`); subtítulo «Configura tu cuenta y organización»; clase `font-medieval` (`:162`).

**Acceso (`/auth`, `/reset-password`)**
- Además de F1: errores duplicados (banner genérico `LoginForm.tsx:141-148` + toast `:76-92`) y lejos del campo; mensajes de Supabase en inglés (Google `:109-115`, `ForgotPasswordForm.tsx:85-105`); ojo de contraseña de ~16 px con `tabIndex=-1`. Sin react-hook-form/zod ni `enterKeyHint`. `/reset-password` a 14 px y error no asociado al campo.
- Registro: los pasos (formulario → verificar → «ya existe») son estado local (`OrganizationRegistrationPage.tsx:30,62,119-121`): Atrás sale de la página.

**Dependencia legal (cambio sin commitear de otra sesión, solo informativo)** — `ConsentBlock.tsx:64-88` mete los documentos en un diálogo cerrado; `registro.test.tsx:105-109` espera ver «Términos Generales» y probablemente falle. Nombre accesible de la casilla partido en 3 `<label>` (`:43-60`). «Política de privacidad» fija a `/privacy`. Avisar a esa sesión; no se toca aquí.

**Elementos flotantes frente a la barra inferior**

| Elemento | Posición | Efecto | Sev. |
|---|---|---|---|
| `FloatingGenerationBadge.tsx:16` | `fixed bottom-4 right-4 z-50` | Tapa la última pestaña | Media |
| `UpdatePrompt.tsx:89` | `fixed bottom-4 inset-x-4 z-[9999]` | Tapa la barra entera | Media |
| `MarketplaceReadinessPopup.tsx:30-46,93` | Diálogo a los 1,5 s | `dismissed` solo en memoria: reaparece en cada sesión para talento | Media |
| Toaster Radix (`ui/toast.tsx:17,70`) | Arriba, `z-[100]` | Tapa la cabecera; X invisible en táctil (`opacity-0` hasta hover) | Media |
| Sonner | Abajo | Pisa la barra; dos sistemas de toasts | Baja |
| `CookieConsentBanner.tsx:167` | `fixed bottom-0 z-[9999]` | Tapa la barra (aceptable: bloqueante y una vez) | Baja |
| KIRO | Usa `--kreoon-bottom-nav-h` | Oculto para creador/editor | — |

- **Baja** — `hasMobileBottomNav` (`MainLayout.tsx:226`) solo contempla `content_creator`, pero la rama del creador acepta también el legado `creator` (`:314`): con ese rol la barra se pinta y el `main` no reserva espacio.

## 9. Qué reutilizar y qué adaptar

| Reutilizar tal cual | Adaptar |
|---|---|
| `Drawer` (vaul) con `70dvh` y safe-area (`MoreMenuSheet.tsx:55`) | `MainLayout`: una sola barra inferior data-driven por rol en lugar de 4 copias |
| `layoutConstants.ts` (alto de barra en variable CSS) | `ScrollToTop` → restauración por `location.key` |
| `ProfileBuilderV2` + `useBuilderAutosave` + `PublishPanel` | Constructor V2 → pasos móviles; «tocar para añadir» |
| `ProfilePageRenderer isPreview` | `ProfilePreviewPage` para mostrar el borrador |
| `kanbanDnd.ts`, `canMoveToStatusWithRules`, «Mover a…» | Tablero → lista inicial + «Mover a…» en panel inferior |
| Formulario de `/registro` (inputs correctos) | `/auth` a 16 px / 48 px, sin splash |
| `ProfileHeader.handleShare` (share + copiar) | `ProfileShareButton` → misma cadena, URL `/p/:slug` |
| Prototipo `portafolio-muestra.js/.css` (reglas de carrusel, «Ver todo», visor) | Llevarlo a React con Atrás que cierra el visor |
| `useOnlineStatus.ts`, `autosave-indicator.tsx` | Conectar a la UI |
| `academy-video-upload-init` (firma TUS) + `tus-js-client` | Función equivalente para contenido (backend) |
| `sanitizeReturnTo` (`postAuth.ts`) | `ProtectedRoute` → `/auth?volver=` |
