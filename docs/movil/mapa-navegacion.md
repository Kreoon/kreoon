# Mapa de navegación móvil — creador

> Solo rutas que **existen hoy** en `src/App.tsx`. Ninguna pantalla inventada; donde se propone cambiar el contenido de una ruta se dice explícitamente.
> Alcance del creador según decisión de Alexander (2026-10-01): sin marketplace de otros creadores, Mi Plan, Social Hub, Guionizador ni Academia (`src/lib/creatorScope.ts`).

## 1. Barra inferior (máximo 5 destinos, solo rol creador y editor)

| # | Etiqueta | Ruta real | Hoy | Cambio propuesto |
|---|---|---|---|---|
| 1 | **Inicio** | `/creator-dashboard` | Existe (barra inferior y lateral). | Pasa a ser «qué tengo que hacer ahora» (ver `pantallas.md` §1). Editor: `/editor-dashboard`. |
| 2 | **Proyectos** | `/board` | Existe. | Lista como vista inicial en móvil, con acceso al tablero Kanban (`?vista=tablero`). |
| 3 | **Portafolio** | `/content` | Existe como «Mi Contenido» (entregas). En el menú se llama «Portafolio». | Para el creador se convierte en el centro de su portafolio: vista de cómo lo ven las marcas (destacados + colecciones), «Editar», «Ver público», «Compartir». La vista de admin/estrategas no cambia. |
| 4 | **Invitaciones** | `/marketplace/invitations` | Existe con la etiqueta «Campañas». | Etiqueta «Invitaciones» (lo que realmente muestra mientras el módulo de campañas abiertas siga eliminado). **Decisión de Alexander:** hoy el menú dice «Campañas» por decisión del 2026-10-01; el encargo propone «Invitaciones». Recomendado: «Invitaciones», y volver a «Campañas» cuando se reconstruya el módulo. |
| 5 | **Cuenta** | `/settings` | Existe como «Configuración» dentro de «Más» y del menú del avatar. | Pantalla de cuenta móvil: Mi perfil público, Mis cobros, Datos y preferencias, Instalar app, Ayuda, Cerrar sesión. Sustituye al botón «Más» y al menú del avatar en móvil. |

Qué desaparece en móvil del creador:
- El botón **«Más»** (`MoreMenuSheet`): sus 3 ítems (Portafolio, Mis Cobros, Configuración) quedan cubiertos por las pestañas 3 y 5.
- El **menú del avatar** en la cabecera (`AccountMenu`): sus 3 ítems (Mi Perfil, Configuración, Cerrar sesión) pasan a Cuenta. Se elimina la duplicidad de rutas «Mi perfil» (`/p/:slug` desde el avatar y `/marketplace/creator/:id` desde el encabezado de escritorio).
- El rótulo «Panel Creador» con icono rosa (`MainLayout.tsx:322-326`): fuera de marca; la cabecera muestra el título de la pantalla.

Reglas de la barra:
- Fija abajo, altura 56 px + `env(safe-area-inset-bottom)`, fondo `bg-background/95` con borde superior; objetivos de 48 px; etiqueta siempre visible (12 px, no 10 px).
- Activa por **prefijo de ruta** (hoy es igualdad exacta: `/board?item=…` o `/settings?section=…` apagan la pestaña).
- Tocar la pestaña activa: vuelve a la raíz de esa sección y sube al inicio (patrón nativo).
- Se oculta solo con teclado abierto en formularios largos y en flujos de pantalla completa (constructor, visor, subida).
- Insignias: Proyectos (pendientes de acción del creador) e Invitaciones (pendientes de responder). Nunca números de dinero.
- Admin, cliente y estrategas conservan su barra actual (`MainLayout.tsx:88-131`); este documento solo cambia la del creador y editor.

## 2. Cabecera compacta

```
┌─────────────────────────────────────────┐
│ ‹ Volver   Título de la pantalla   🔔   │  56 px + safe-area-inset-top
└─────────────────────────────────────────┘
```
- En raíces de pestaña: sin «Volver», título a la izquierda, campana a la derecha.
- En pantallas secundarias: «‹» con etiqueta accesible «Volver» + título truncado + acción contextual opcional (máx. 1).
- «Volver» = `navigate(-1)` **si** la entrada anterior es de la app (`location.key !== 'default'` y marcador propio en `history.state`); si se llegó por enlace directo, `navigate(rutaPadre, { replace: true })`. Nunca saca al usuario de la app.
- La campana (`MobileNotificationsBell`) se mantiene; KIRO sigue oculto para creador/editor (`MainLayout.tsx:189`).

## 3. Pantallas secundarias (todas existentes)

| Desde | Pantalla | Ruta / estado | Presentación móvil |
|---|---|---|---|
| Inicio, Proyectos | Detalle de proyecto (Guión · Video · Material) | `/board?item=<id>` (existe; hoy se borra el parámetro al abrir — `ContentBoard.tsx:341-347`) | Pantalla completa con cabecera «‹ Proyectos». El parámetro **se conserva** mientras está abierto (deep link y Atrás). |
| Proyectos | Tablero Kanban | `/board?vista=tablero` (nuevo parámetro sobre ruta existente) | Columnas con scroll horizontal y «Mover a…» en panel inferior. |
| Proyectos | Filtros | estado en la URL (`?estado=…&q=…`) | Panel inferior (Drawer). |
| Portafolio | Ver todo / colección | `/content?ver=todo` · `/content?coleccion=<slug>` | Rejilla con carga por lotes; «‹ Portafolio». |
| Portafolio | Editar portafolio (constructor) | `/profile-builder` | Pantalla completa sin barra inferior, por pasos (ver `pantallas.md` §4). |
| Portafolio | Vista previa del borrador | `/preview/:token` (hoy redirige al publicado — ver diagnóstico) | Pantalla completa con banner «Vista previa · no publicado». |
| Portafolio, Cuenta | Mi perfil público | `/p/:slug` | Se abre como página pública (sin chrome privado) con barra mínima «‹ Volver a Kreoon» solo si el visitante es el dueño. |
| Invitaciones | Detalle de invitación | estado local (sin ruta propia hoy) | Panel inferior con Aceptar / Rechazar. Propuesto `?invitacion=<id>` para deep link desde notificación. |
| Cuenta | Mis cobros | `/creator-dashboard?tab=wallet` (existe) | Se enlaza desde Cuenta; propuesto mover a `/settings?section=cobros` en una ola posterior si el contenido es el mismo. |
| Cuenta | Secciones de configuración | `/settings?section=<id>` (existe) | Lista → detalle con «‹ Cuenta». |
| Cualquiera | Visor de video/foto | estado + entrada `history.pushState({ visor: id })` | Pantalla completa; Atrás lo cierra. |

## 4. Comportamiento de Atrás (orden de prioridad)

1. **Visor** abierto → se cierra (consume su propia entrada de historial).
2. **Panel inferior / diálogo** abierto → se cierra (misma técnica: entrada `{ capa: id }` al abrir, `popstate` la cierra; al cerrar con la X se hace `history.back()` para no dejar entradas huérfanas).
3. **Teclado abierto** → el sistema lo cierra (no se intercepta).
4. **Pantalla secundaria** → vuelve a la anterior **con scroll, filtros y pestaña restaurados**.
5. **Raíz de pestaña distinta de Inicio** → vuelve a Inicio (Android); en iOS no aplica gesto.
6. **Inicio** → comportamiento del navegador / sale de la PWA. No se muestra «¿Seguro que quieres salir?» salvo que haya cambios sin guardar o una subida en curso.

Hoy nada de esto existe: no hay ningún `popstate` en `src/` y `ScrollToTop` (`src/components/ScrollToTop.tsx`) sube al inicio en **cada** cambio de ruta, también al volver atrás.

Implementación propuesta: un hook `useBackLayer(open, onClose)` reutilizable por `Dialog`, `Drawer`, `Sheet` y el visor; y `ScrollToTop` que solo actúe en navegaciones `PUSH`/`REPLACE` y restaure posiciones guardadas por `location.key` en `POP` (la app usa `BrowserRouter`, no el router de datos, así que `<ScrollRestoration>` no está disponible sin migrar).

## 5. Conservar contexto

| Contexto | Dónde vive hoy | Propuesta |
|---|---|---|
| Filtros del tablero | `useBoardPersistence` (`board_state_${orgId}`, localStorage, sin usuario) | URL como fuente de verdad (`?estado=&q=&vista=`) + preferencia por `userId:orgId`. |
| Pestaña de Portafolio | `?view=marketplace` (`Content.tsx:48-59`) | Se mantiene en URL. |
| Sección de Cuenta | `?section=` (existe) | Se mantiene. |
| Scroll de listas | Se pierde (`ScrollToTop`) | Restaurar por `location.key` en `POP`. |
| Pestaña activa de la barra | Se reconstruye por ruta | Cada pestaña recuerda su última sub-ruta (pila por pestaña en memoria de sesión). |

## 6. Deep links

| Enlace | Destino | Estado hoy | Propuesta |
|---|---|---|---|
| `/board?item=<id>` | Detalle de proyecto | Funciona si el contenido está cargado; luego borra el parámetro. | Mantenerlo mientras está abierto; si el id no está en la lista, cargarlo individualmente y mostrar «No encontrado» si no hay acceso. |
| Cualquier ruta privada sin sesión | `/auth` | `ProtectedRoute.tsx:163` redirige a `/auth` **sin** guardar el destino. | `/auth?volver=<ruta>`; tras iniciar sesión, `postAuth.ts` ya tiene `sanitizeReturnTo` para usarlo. |
| `/p/:slug` | Perfil público | Funciona. | Es el enlace canónico para compartir. |
| `/@:slug` | Perfil público | **No funciona**: React Router 6 no admite `/@:username` (ledger 2026-10-01); cae en NotFound. `ProfileShareDialog.tsx:84` comparte `https://kreoon.com/@slug`. | Compartir siempre `/p/:slug`; redirección de `/@slug` a `/p/slug` vía `vercel.json` (rewrite) o ruta comodín. |
| Notificaciones (`push-sw.js` `data.url`) | Ruta interna | Sin SW registrado no aplica. | Cuando se active, las URL deben ser rutas de esta tabla. |
| `/marketplace/creator/:id` | Perfil «Estudio UGC» | Público; con sesión añade toda la navegación privada + otra cabecera. | Para el dueño con sesión, mostrar la misma vista pública que `/p/:slug` (ver diagnóstico, una sola URL). |

## 7. Rutas sin barra inferior

| Grupo | Rutas | Chrome |
|---|---|---|
| Pública / marketing | `/`, `/blog`, `/privacy`, `/terms`, `/legal/:documentType`, `/data-deletion` | Cabecera pública existente (`PublicHeader`). |
| Acceso y registro | `/auth`, `/auth/callback`, `/reset-password`, `/registro/:organizationSlug`, `/registro/:organizationSlug/continuar`, `/bienvenida` | Sin navegación; solo logo y, si aplica, «‹ Volver». |
| Portafolio público | `/p/:slug`, `/marketplace/creator/:id` (visitante), `/preview/:token` | Sin navegación privada; acciones: Compartir, Contratar (solo visitante/marca). |
| Flujos de pantalla completa del creador | `/profile-builder`, visor, subida de material | Cabecera propia con «‹ Volver» / «Cerrar» y estado de guardado. |
| Onboarding obligatorio | Lo que tapa `OnboardingGateProvider` | Sin navegación hasta terminar. |
