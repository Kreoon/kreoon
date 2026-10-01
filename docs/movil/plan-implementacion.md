# Plan de implementación móvil — olas pequeñas y revisables en preview

> Base: `diagnostico.md`, `mapa-navegacion.md`, `pantallas.md`, `pwa-offline.md`.
> Cada ola = una rama/commit revisable en el preview de Vercel, sin cambiar permisos, estados ni reglas comerciales.
> Reglas de producto que NO cambian: registro público solo de creadores por organización; rol asignado en servidor; perfiles y contenido privados hasta publicar; borradores separados de lo publicado; sin contactos ni redes del creador; plugins/widgets/suscripciones fuera de fase; compartir enlace público sí; no pedir permisos push.
> Verificación por ola: `npm test` (Vitest) + `npm run build`; `tsc` completo (~35 min, baseline de ~1 565 errores preexistentes) **una vez al final de la ola**, comparando solo archivos tocados.

## Decisiones que necesita Alexander antes de empezar

| # | Decisión | Recomendación |
|---|---|---|
| D1 | Etiqueta de la pestaña 4: «Campañas» (decisión 2026-10-01) o «Invitaciones» (encargo). | «Invitaciones» hasta reconstruir campañas abiertas. |
| D2 | URL pública única del perfil: `/p/:slug` (bloques del constructor) o `/marketplace/creator/:id` («Estudio UGC» fijo, cambio sin commitear de otra sesión). | Una sola vista para ambas rutas; la otra redirige. Depende de aprobar la propuesta de `docs/hermes/enlace-profesional/`. |
| D3 | Constructor: retirar V1 y construir los pasos sobre V2. | **Decidido (Alexander): retiro en dos pasos.** Paso 1 ✅ 2026-10-01: V2 es el editor por defecto en `/profile-builder`; `?v=1` abre V1 como respaldo; `?v=2` queda como alias; aviso único «Renovamos el editor…» (recordado por usuario). Paso 2 (borrar V1, `?v=1` y el aviso) previsto para **2026-10-22** (máx. 2026-10-29), si en ese periodo no hay reportes que exijan V1. |
| D4 | `start_url` del manifest: `/` (todos los roles) o `/creator-dashboard`. | `/` con redirección por sesión (`postAuth.ts`). |
| D5 | Atender ya la exposición de claves de Bunny (S1/S2) y rotarlas. | Sí, antes de la ola de subidas; es independiente de lo móvil. |

---

## Ola 0 — Seguridad de subidas (prerrequisito, fuera de la rama móvil)
**Responsable sugerido:** `security-auditor` + `backend-dev`. **No es trabajo de UI.**
- `supabase/functions/bunny-portfolio-upload/index.ts`: exigir JWT en `create`, `save-hash`, `save-raw-video`; tomar `user_id` del token; **no devolver** `BUNNY_API_KEY` (firmar TUS como `academy-video-upload-init`).
- `bunny-raw-upload`, `bunny-media-upload`, `bunny-upload`, `bunny-upload-v2`: no devolver contraseñas/API keys; autorizar `storagePath` por organización/proyecto (`assertOrgMembership`).
- Rotar `BUNNY_API_KEY` y contraseñas de zonas tras desplegar.
- **Riesgo:** rompe los 4 uploaders actuales si no se cambian a la vez → coordinar con la Ola 9 o desplegar primero un modo compatible.
- **Aceptación:** sin JWT → 401; con JWT ajeno a la organización → 403; ninguna respuesta contiene claves.

## Ola 1 — Privacidad local y sesión (sin cambio visual) ← **primera ola recomendada**
**Por qué primero:** cierra 3 hallazgos críticos (P1–P3) y 1 alto (P4/N2) con pocos archivos, es prerrequisito de la PWA y no choca con las sesiones que están tocando UI.

| Archivo | Cambio |
|---|---|
| `src/lib/storage/scopedStorage.ts` (nuevo) | `scopeKey(userId, orgId)`, `get/set/remove`, `clearScope`, `clearUserData()` (lista explícita de claves privadas). |
| `src/hooks/useAuth.tsx:713-716` (+ `:388-390` baneo, evento `SIGNED_OUT`) | `signOut` centralizado: cancelar y limpiar `queryClient`, borrar claves privadas y de borrador, `sessionStorage` (salvo `kreoon_access_gate`), `caches` de datos si existen, `authStore.reset()`. |
| `src/App.tsx:410-453` | Persistencia de React Query: clave `kreoon-rq-v2:${userId}:${orgId}`, **lista blanca** de `queryKey` de catálogo; hidratar solo si coincide la sesión. Alternativa más simple: desactivarla (medir impacto de arranque). Borrar `kreoon-rq-v1`. |
| `vite.config.ts:193-224` | `supabase/rest/v1` → `NetworkOnly`; Storage: `CacheFirst` solo para `/object/public/`, `NetworkOnly` para `sign/` y `authenticated/`; `cacheId: 'kreoon-v7'`. (Afecta a usuarios con SW antiguo en su próxima actualización.) |
| `src/components/ProtectedRoute.tsx:163` + `src/lib/routing/postAuth.ts` | `/auth?volver=<ruta>` y uso de `sanitizeReturnTo` tras iniciar sesión. |
| `src/components/onboarding/NovaProfileDataStep.tsx:268-451` | Borrador con ámbito de usuario y **sin** documento ni fecha de nacimiento en localStorage. |

- **Riesgos:** `queryClient.clear()` puede dejar componentes montados sin datos un instante antes de la navegación → navegar a `/auth` con `replace` antes de limpiar memoria. Impersonación (`sessionStorage.impersonation`) debe cerrarse limpia.
- **Aceptación:**
  1. Usuario A inicia y cierra sesión; en DevTools → Application no queda `kreoon-rq-*`, `currentOrganizationId`, `selectedClientId`, `kiro-chat-history`, `kreoon_onboarding_quiz`.
  2. Usuario B entra en la misma pestaña: ninguna pantalla muestra datos de A ni siquiera un instante.
  3. `/board` sin sesión → `/auth?volver=%2Fboard` → tras entrar, abre `/board`. `?volver=https://evil.com` se ignora.
  4. `dist/sw.js` no contiene regla de caché para `/rest/v1/`.
- **QA:** 2 cuentas de prueba (las crea Alexander; esta fase no crea cuentas).
- **Hotfix independiente que puede ir junto (1 línea, gran impacto):** normalizar el rol en `src/components/board/StatusChangeDropdown.tsx:39,92` (`content_creator` → `creator`, igual que `contentBoardPermissions.ts:75`) para que el creador vea «Iniciar grabación / Grabado / Novedad». Añadir caso a `KanbanCard.test.tsx` con `userRole: "content_creator"`.

## Ola 2 — Shell móvil del creador (barra inferior + cabecera)
| Archivo | Cambio |
|---|---|
| `src/components/layout/mobile/CreatorBottomNav.tsx` (nuevo) | 5 destinos (`mapa-navegacion.md` §1), activo por prefijo, 48 px, etiquetas 12 px, insignias, «tocar activa = subir». |
| `src/components/layout/mobile/MobileTopBar.tsx` (nuevo) | Título, «‹ Volver» con regla de historial, campana; `padding-top: env(safe-area-inset-top)`. |
| `src/components/layout/MainLayout.tsx:313-411` (y rama editor `:413-512`) | Usar los dos componentes; quitar «Panel Creador» y `bg-pink-500`; corregir `hasMobileBottomNav` para `creator` legado (`:226`); `PageWrapper` sin animación de salida (≤150 ms, `prefers-reduced-motion`). |
| `src/components/layout/AccountMenu.tsx`, `MoreMenuSheet.tsx` | No se muestran al creador en móvil (siguen para otros roles). |
| `src/components/PageLoader.tsx:10-11` | Sin splash en `/auth`, `/p/*`, `/marketplace/creator/*` ni en navegación interna. |
| `FloatingGenerationBadge.tsx:16`, `UpdatePrompt.tsx:89`, `ui/sonner.tsx` | Desplazar por `--kreoon-bottom-nav-h` + safe-area. |
| `MarketplaceReadinessPopup.tsx` | Persistir «descartado» por usuario (scopedStorage). |

- **Dependencia:** otra sesión tiene cambios sin commitear en `MainLayout.tsx` (añade `ProfileCompletionBanner` dentro de `PageWrapper`). Esperar a que se integre o coordinar el rebase.
- **Riesgos:** 4 ramas de layout por rol con código duplicado → tocar solo la del creador/editor; admin/cliente sin cambios. Tours (`TourProvider`) con `data-tour` sobre ítems de la barra antigua.
- **Aceptación:** a 320, 360, 390 px y 844×390 la barra muestra 5 destinos sin cortar texto; ningún flotante tapa la barra; la cabecera no queda bajo la muesca (emulación iPhone con safe-area); escritorio idéntico al actual (captura comparada).

## Ola 3 — Atrás, scroll y contexto
| Archivo | Cambio |
|---|---|
| `src/hooks/useBackLayer.ts` (nuevo) | Al abrir una capa: `history.pushState({ capa: id })`; `popstate` la cierra; cerrar con X → `history.back()`. Pila para capas anidadas (visor dentro de detalle). |
| `src/components/ui/responsive-dialog.tsx` (nuevo, envoltorio) | `Dialog` en ≥ 768 px, pantalla completa o `Drawer` en móvil, con `useBackLayer`, botón cerrar de 44 px «Cerrar», `dvh`, safe-area. Opt-in: no se cambia `ui/dialog.tsx` globalmente. |
| `src/components/ScrollToTop.tsx` | Solo en `PUSH`/`REPLACE`; en `POP` restaurar la posición guardada por `location.key` (sessionStorage). |
| `src/pages/ContentBoard.tsx:339-349` | `?item=<id>` se conserva mientras el detalle está abierto; cerrar = volver; si el id no está cargado, pedirlo individualmente. |
| `src/pages/CreatorDashboard.tsx:56-60` | Pestaña sincronizada con `?tab=` (arregla «Mis Cobros»). |
| `src/pages/settings/SettingsPage.tsx:121-127` | Sección con `push` (no `replace`); un solo «Volver». **Hay cambios sin commitear de otra sesión en este archivo.** |
| `src/components/projects/UnifiedProjectModal/index.tsx:351-352` | Ancho completo en móvil (quitar `max-w-[90vw]` en `max-sm`), safe-area, X accesible en español. |

- **Aceptación:** con un detalle, panel o visor abierto, Atrás (Android, `history.back()`) cierra solo la capa; al volver de un detalle, la lista conserva scroll y filtros; abrir `/board?item=<id>` en una pestaña nueva abre el detalle; ningún «Close» en inglés.

## Ola 4 — Proyectos móvil (lista + tablero)
- `src/components/board/BoardListView.tsx`: fila `<button>`/`<Link>` de 56–72 px con miniatura, título, marca, **fecha de entrega visible**, badge de estado y acción siguiente (`QuickStatusButtons`); sin «100» fijo; sin personalizador de campos para el creador.
- Grupos «Por hacer / En marcha / Hechos» como chips (agrupan estados existentes, no crean estados).
- Filtros y vista en la URL (`?grupo=&estado=&q=&vista=`), preferencia por `userId:orgId`.
- «Mover a…» en `Drawer` con solo destinos permitidos (`canMoveToStatusWithRules`), reutilizando `useContentMove.tsx`.
- Estado vacío también en Lista (`ContentBoard.tsx:707,759`).
- Tablero: columnas al 85 % con `scroll-snap`.
- **Aceptación:** creador de prueba con proyectos en `assigned`, `recording`, `issue`: desde la lista, sin abrir el detalle, ve la fecha y pulsa la acción siguiente; el movimiento se refleja y el toast permite deshacer/reintentar como hoy; sin proyectos, mensaje y acción.

## Ola 5 — Inicio «qué hago ahora»
- `src/pages/CreatorDashboard.tsx` (y `EditorDashboard.tsx`): tarjeta «Ahora» + «Por hacer» + invitaciones + estado del portafolio + una línea de cobros (`pantallas.md` §1). Reutiliza `useContent`, `useCreatorReceivedInvitations`, datos de `creator_profiles`.
- Usar `error` de `useContent` y `useMarketplaceProjects`: error ≠ vacío.
- Esqueletos en vez de spinner; quitar doble padding.
- `UnifiedKpiDialog.tsx:263`: enlace válido.
- **Aceptación:** con datos de prueba, la primera tarjeta es la tarea de mayor prioridad; con red cortada en DevTools aparece el error con «Reintentar», nunca «no tienes videos».

## Ola 6 — Invitaciones y Cuenta
- `MarketplaceInvitationsPage.tsx`: error propio (exponer `error` en `useMarketplaceOrgInvitations.ts:41-74`), confirmación de «Rechazar» en `Drawer`, pendiente por fila, layout apilado con botones de 44 px, `ROLE_LABELS` desde `src/lib/roles.ts`, contraste en claro.
- `/settings` vista móvil del creador = índice «Cuenta» (`pantallas.md` §5) con **Cerrar sesión**, Mis cobros, Mi perfil público, «Usar como app» (oculto hasta Ola 10).
- **Aceptación:** cerrar sesión alcanzable en ≤ 2 toques desde cualquier pantalla; rechazar pide confirmación; un fallo de red muestra error.

## Ola 7 — Portafolio y perfil público
**Depende de D2** y de la propuesta visual de `docs/hermes/enlace-profesional/` (pendiente de aprobación; ese directorio no se toca).
- `src/pages/Content.tsx` (vista creador): estado de publicación + Compartir/Editar/Ver; destacados (`portfolio_items.is_featured`) y colecciones (`category`) en carruseles; «Ver todo» con `?ver=`/`?coleccion=`; visor con `useBackLayer`. Reglas del prototipo (`pantallas.md` §3). Vista de admin/estrategas sin cambios.
- Componentes compartidos nuevos en `src/components/portfolio-gallery/` (Carrusel, VerTodo, Visor) usados por la vista del creador y por la página pública.
- `ProfileShareButton` → `navigator.share` → copiar → campo seleccionado; URL `/p/:slug`. Redirección `/@slug` → `/p/slug` (`vercel.json` rewrite o ruta comodín; `vercel.json` es configuración: confirmar).
- Página pública: sin navegación privada también con sesión (`ProfileLayout.tsx:25-27`), sin doble cabecera, tema de la landing, estado de carga sin texto de vacío simultáneo.
- **Aceptación:** a 320 px carruseles sin desbordar, «Ver todo» y visor; Atrás cierra el visor y luego vuelve al portafolio con el scroll intacto; compartir abre la hoja nativa en Android emulado y copia en escritorio.

## Ola 8 — Constructor por pasos
> **Hecho en D3 paso 1 (2026-10-01), sin el rediseño por pasos:** V2 por defecto; «Añadir sección» tocando (`panels/AddSectionPanel.tsx`, sin layout/contacto/redes/WhatsApp); en < md el carril pasa a barra inferior y el panel a hoja inferior (70 dvh), barra superior compacta con «Salir»; carga única de datos (antes el refetch tras autoguardar pisaba lo escrito y, sin bloques guardados, había bucle de renders); el editor carga solo borradores si existen (la RPC `get_profile_builder_data` mezcla borrador y publicado → secciones duplicadas). Carril sin «Medios»/«IA» (eran «Pronto»).
> **Pendiente de paridad con V1 (no imprescindible para editar y publicar):** estilos por bloque (pestaña avanzada de `BlockSettingsPanel`), añadir bloques dentro de columnas/contenedores, duplicar sección, panel ADN, «Guardar como plantilla», editores de formulario para servicios/precios/portafolio (hoy se editan en el lienzo), modal de mejora de plan.
> **Propuesta (no aplicada) borrador obsoleto:** al cargar, si hay filas `is_draft=true` con `created_at` anterior al `created_at` de las publicadas (o `builder_has_draft=true` sin filas de borrador), V2 muestra un aviso «Tienes un borrador anterior a lo publicado · [Descartar borrador antiguo] [Seguir editándolo]»; «Descartar» = RPC nueva `discard_profile_draft(profile_id)` (borra filas draft, `builder_config_draft=NULL`, `builder_has_draft=false`, mismo chequeo `user_id = auth.uid()`). Hoy (2026-10-01) hay **0** perfiles afectados, así que puede esperar al paso 2.
- Sobre `ProfileBuilderV2`: pasos Contenido / Diseño / Vista previa / Publicar (`pantallas.md` §4), «tocar para añadir», subir/bajar sin arrastre, panel de sección a pantalla completa.
- Autoguardado (`useBuilderAutosave`) + borrador local con ámbito; indicador con `autosave-indicator.tsx`; «Guardado» solo con confirmación del servidor.
- `ProfilePreviewPage.tsx:133-139`: renderizar el borrador con `ProfilePageRenderer isPreview` en lugar de redirigir.
- V1: retirar o, como mínimo, publicar vía `publish_profile_blocks` (`ProfileBuilder.tsx:379-416`).
- Lista de verificación de Publicar: detectar correos/teléfonos/@redes en la bio (regla «sin contactos»); solo avisa, no reescribe.
- **Aceptación:** en 360 px se puede añadir, ordenar, editar y publicar sin arrastrar; cerrar con cambios sin guardar pregunta; tras publicar `builder_has_draft = false` y `/p/:slug` muestra lo publicado; la vista previa muestra el borrador con banner.

## Ola 9 — Subidas
**Depende de la Ola 0.**
- Gestor de subidas fuera de los componentes de pestaña (`src/lib/uploads/uploadManager.ts`): cola, progreso real, `abort()`, reintento, aviso al salir (`beforeunload` + `useBackLayer`).
- Validación previa por extensión + MIME (Android con `file.type` vacío), tamaño y duración (`<video>.duration`).
- Material crudo: aceptar fotos; botón «Grabar» con `capture="environment"`; asignación a escena (ya existe `scene_number`).
- Reanudable **solo** si se crea la firma TUS para la librería de contenido (función nueva tipo `academy-video-upload-init`); `tus-js-client` ya está instalado. Si no, «Reintentar» sin prometer reanudar.
- Quitar `timeout` fijo de 10 min o hacerlo proporcional; escuchar `timeout` (`MediaLibraryUploader.tsx:130-140`).
- Eliminar los 5 uploaders muertos.
- **Aceptación:** con «Slow 3G» en DevTools: progreso real, Cancelar detiene la red, Reintentar recupera; cambiar de pestaña del detalle no corta la subida; salir con subida activa pregunta.

## Ola 10 — PWA
**Depende de la Ola 1** (sin caché autenticada) y, para push, de una decisión futura (hoy no se piden permisos).
- Registrar el SW con `useRegisterSW` (`virtual:pwa-register/react`); `UpdatePrompt` como barra discreta y con `flushDrafts()` antes de recargar; posponer si hay subidas o cambios sin guardar.
- Una sola fuente de manifest (`pwa-offline.md` §7): `id`, `lang: es`, `orientation: any`, iconos `any` y `maskable` separados, `apple-touch-icon` 180; `status-bar-style: default`.
- `navigateFallback` + denylist; pantalla «Sin conexión»; barra «Sin conexión» con `useOnlineStatus`; `refetchOnReconnect: true` para queries críticas.
- «Usar como app» en Cuenta solo con `beforeinstallprompt` (Android) o instrucciones (Safari iOS).
- **Aceptación:** `pwa-offline.md` §8.

## Ola 11 — Acceso y registro
**Depende de la sesión legal** (consentimiento del registro en curso; `ConsentBlock.tsx` y `docs/legal/registro-2026-10` no se tocan aquí).
- `/auth` y `/reset-password`: inputs 16 px / 48 px (`KreoonInput.tsx:55`, `LoginForm.tsx:185`), error junto al campo con `aria-describedby`, sin banner + toast duplicados, mensajes de Supabase traducidos, ojo de contraseña de 44 px enfocable, `enterKeyHint`.
- Registro: `enterKeyHint`; pasos con entrada de historial para que Atrás vuelva al paso anterior.
- Avisar a la sesión legal: `registro.test.tsx:105-109` probablemente falla con su cambio; nombre accesible de la casilla partido.
- **Aceptación:** sin zoom al enfocar en Safari iOS (dispositivo real o, si no hay, comprobación de `font-size ≥ 16px` computado); errores leídos por lector de pantalla junto al campo.

---

## Orden y paralelismo

```
Ola 0 (seguridad, backend) ───────────────────────────────┐
Ola 1 (privacidad) ──► Ola 10 (PWA)                       │
Ola 2 (shell) ──► Ola 3 (Atrás) ──► Ola 4 (Proyectos)     │
                              ├──► Ola 5 (Inicio)          │
                              ├──► Ola 6 (Invit./Cuenta)   │
                              ├──► Ola 7 (Portafolio) ◄── D2
                              └──► Ola 8 (Constructor) ◄── D3
                                    Ola 9 (Subidas) ◄──────┘
Ola 11 (Acceso) ◄── sesión legal
```
Ola 1 y Ola 2 pueden ir en paralelo (archivos distintos salvo `App.tsx`, donde Ola 1 toca solo el bloque de React Query).

## Plan de QA

**Dispositivos:** no hay dispositivos reales disponibles en esta sesión. Todo lo verificable se hará con **emulación** del navegador integrado (Chrome) y se declarará así en cada entrega. Antes de dar por cerrada la Ola 10 y la Ola 11 se necesita al menos **un iPhone con Safari** y **un Android con Chrome** reales (instalación, áreas seguras, teclado, zoom, hoja de compartir).

| Matriz de emulación | Ancho × alto |
|---|---|
| Teléfono pequeño | 320 × 568 |
| Android común | 360 × 800 |
| iPhone | 390 × 844 (con safe-area simulada) |
| Horizontal | 844 × 390 |
| Tablet | 768 × 1024 |
| Escritorio (regresión) | 1440 × 900 |

**Por ola:**
1. Recorrido del creador en el preview: Inicio → Proyectos → detalle → Atrás → Portafolio → Ver todo → visor → Atrás ×2 → Cuenta → Cerrar sesión.
2. Sin desbordamiento horizontal (`scrollWidth === innerWidth`) en las 5 pestañas a 320 px.
3. Zoom del navegador al 200 % sin pérdida de contenido (no se bloquea zoom).
4. Teclado: foco visible, orden lógico, Escape cierra capas.
5. Lector de pantalla (TalkBack emulado no existe → revisar árbol de accesibilidad con `read_page`): nombres de botones en español, `aria-current` en la pestaña activa.
6. Red: «Slow 3G» y «Offline» en DevTools para estados de carga, sin conexión y error.
7. Contraste: `npm run check:contrast` (existe) + revisión manual en claro y oscuro.
8. Regresión de escritorio: capturas antes/después de `/creator-dashboard`, `/board`, `/settings` a 1440 px.
9. Privacidad (Ola 1 y 10): prueba A/B de cuentas en el mismo navegador.

**Cuentas:** se necesitan una cuenta de creador de prueba con proyectos en varios estados y una segunda cuenta de creador, ambas en una organización de prueba. Esta fase no crea cuentas ni toca datos reales: las prepara Alexander (o `db-seeder` sobre una rama de Supabase, nunca producción).

**Hermes:** puede ejecutar el recorrido de QA por ola con agent-browser; verificar siempre sus entregas (ya marcó «done» sin hacer nada una vez).
