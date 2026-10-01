# Pantallas móviles del creador — diseño (wireframes textuales)

> Ancho de referencia: 360 px (funciona desde 320 px). Márgenes laterales 16 px. Objetivos táctiles ≥ 44 px (48 en la barra inferior).
> Marca: la de la landing (crema `#FAF8F5`, acento `#6D4AFF`, texto `#242135`, tarjetas redondeadas con borde suave). Tokens semánticos (`bg-background`, `bg-card`, `text-foreground`, `text-muted-foreground`, `primary`), nada de colores fijos ni del tema «Nova» oscuro.
> Componentes: los de `src/components/ui/` (shadcn) que ya existen. No se añade ninguna librería.
> Estados comunes a todas las pantallas (patrón único, ver §7): **cargando** (esqueleto con la forma final), **vacío** (una frase + una acción), **sin conexión** (barra fina arriba + datos en memoria si los hay), **error** (mensaje humano + «Reintentar»), **pendiente de guardar** (indicador junto al título).

---

## 1. Inicio — «qué tengo que hacer ahora» (`/creator-dashboard`)

**Objetivo:** en 3 segundos el creador sabe cuál es su siguiente tarea y la abre con un toque.
**Acción principal:** el botón de la primera tarea.

```
┌──────────────────────────────────────┐
│ Hola, Valentina                   🔔 │  cabecera compacta (sin «Panel Creador»)
├──────────────────────────────────────┤
│ ┌──────────────────────────────────┐ │
│ │ AHORA                            │ │  tarjeta destacada (Card, borde primary/20)
│ │ Grabar «Chaski #05»              │ │  título del proyecto
│ │ Marca Chaski · entrega jue 3 oct │ │  cliente · fecha límite (rojo si vence hoy)
│ │ [ Abrir proyecto ]               │ │  Button primary, ancho completo
│ └──────────────────────────────────┘ │
│                                      │
│ Por hacer (3)                Ver todo│  → /board?estado=por-hacer
│ ○ Corregir «Dapta #02»   Novedad  ›  │  lista de filas 56 px, badge de estado
│ ○ Subir material «X #01» En grab. ›  │
│ ○ Empezar «Y #04»        Asignado ›  │
│                                      │
│ Invitaciones (1)             Ver todo│  → /marketplace/invitations
│ ┌ Marca Z te invitó · 2 videos  › ┐  │
│                                      │
│ Tu portafolio                        │
│ ┌──────────────────────────────────┐ │
│ │ ● Publicado · 12 piezas          │ │  o «Sin publicar — las marcas aún no te ven»
│ │ [Compartir]  [Editar]            │ │
│ └──────────────────────────────────┘ │
│                                      │
│ Cobros: $320.000 por cobrar     ›    │  una sola línea → Cuenta › Mis cobros
├──────────────────────────────────────┤
│ Inicio  Proyectos  Portafolio  Invit.  Cuenta │
└──────────────────────────────────────┘
```

Orden de prioridad de «Ahora» (todo con estados reales de `STATUS_LABELS`, `src/types/database.ts:440`, y movimientos permitidos al creador según `contentBoardPermissions.ts`):
1. `issue` (Novedad) → «Corregir».
2. `recording` (En grabación) → «Subir material / marcar Grabado».
3. `assigned` (Asignado) → «Empezar a grabar».
4. Invitación pendiente de respuesta.
5. Portafolio sin publicar o con menos de 3 piezas.
6. Si no hay nada: estado vacío «Estás al día» + «Ver mis proyectos».

Se quitan respecto a hoy (`CreatorDashboard.tsx`): las 8 tarjetas de KPI casi todas en 0, el subtítulo «Camerino», las 3 métricas de dinero mezcladas con producción (quedan en Mis cobros), el carrusel «Últimos aprobados» (pasa a Portafolio). El editor (`/editor-dashboard`) usa la misma estructura con sus estados (`recorded`→«Editar», `issue`→«Corregir»).

Estados:
- Cargando: 1 esqueleto de tarjeta grande + 3 filas.
- Vacío: ilustración pequeña de la landing + «Estás al día. Cuando una marca te asigne un video aparecerá aquí.» + «Ver mis proyectos».
- Sin conexión: datos en memoria con la nota «Sin conexión · datos de hace 5 min».
- Error: «No pudimos cargar tus tareas» + «Reintentar».

Componentes: `Card`, `Button`, `Badge`, `Skeleton`, `Separator`; filas como `<Link>` reales (no `div onClick`, para que funcionen el clic largo y «abrir en pestaña»).

---

## 2. Proyectos — lista + tablero (`/board`)

**Acción principal:** abrir un proyecto.

### 2a. Lista (vista inicial en < 768 px)
```
┌──────────────────────────────────────┐
│ Proyectos                 [≡ Tablero]│  conmutador Lista/Tablero (ToggleGroup)
│ ┌────────────────────────────┐ [⚲] │  búsqueda (input type=search) + Filtros
│ │ Buscar por título o marca  │      │
│ └────────────────────────────┘      │
│ [Por hacer 3] [En marcha 5] [Hechos] │  chips de grupo (scroll horizontal, snap)
├──────────────────────────────────────┤
│ ┌──────────────────────────────────┐ │
│ │ ▣ Chaski #05            Novedad  │ │  miniatura 48×64 + título + badge estado
│ │   Chaski · vence jue 3 oct       │ │
│ │   «El cliente pidió cambiar…» ›  │ │  1 línea de contexto (última novedad)
│ └──────────────────────────────────┘ │
│ … (lista virtualizada si > 50)       │
└──────────────────────────────────────┘
```
- Grupos = agrupación de estados reales, no estados nuevos: **Por hacer** (`assigned`, `recording`, `issue`), **En marcha** (`recorded`, `editing`, `delivered`, `corrected`, `review`), **Hechos** (`approved`, `paid`, `archived`). Para el editor cambia el reparto.
- Filtros (panel inferior `Drawer`): estado exacto, marca, fecha. Todo en la URL (`?grupo=&estado=&q=`).
- Tocar una fila → detalle a pantalla completa con `?item=<id>` en la URL.

### 2b. Tablero (`?vista=tablero`)
```
┌──────────────────────────────────────┐
│ Proyectos                   [☰ Lista]│
│ Asignado (2)  ‹  ›                   │  cabecera de columna con navegación
│ ┌──────────────┐┌──────────┐         │  columnas de 85 % del ancho, scroll-snap
│ │ tarjeta      ││ tarjeta  │         │  (asoma la siguiente columna)
│ └──────────────┘└──────────┘         │
│ Etapas vacías ocultas · Mostrar (4)  │  (ya existe en ContentBoardKanbanView)
└──────────────────────────────────────┘
```
- En táctil **no se arrastra** como acción principal: cada tarjeta tiene «Mover a…» que abre un panel inferior con **solo** los destinos permitidos por `canMoveToStatusWithRules`. El arrastre con retardo (`kanbanDnd.ts`) se conserva para quien lo use.
- Columnas = estados de la organización (`organization_statuses`), sin cambios.

### 2c. Detalle de proyecto (pantalla completa, `?item=<id>`)
```
┌──────────────────────────────────────┐
│ ‹ Proyectos   Chaski #05        ⋯    │
│ Novedad · vence jue 3 oct            │  badge + fecha
│ [Guión] [Video] [Material]           │  Tabs (ya decididos: Guión · Video · Material)
├──────────────────────────────────────┤
│ (contenido de la pestaña)            │
├──────────────────────────────────────┤
│ [ Marcar como Grabado ]              │  barra de acción fija abajo (safe-area)
└──────────────────────────────────────┘
```
- La barra inferior global se oculta aquí; la acción del estado siguiente permitido va fija abajo.
- **Material**: subida con progreso real por archivo, Cancelar, Reintentar y aviso si se intenta salir con subidas activas (ver §8).
- Las pestañas no desmontan una subida en curso (hoy `TabsContent` de Radix desmonta `RawAssetsUploader` al cambiar de pestaña).

Estados: lista con esqueletos de 6 filas; vacío por grupo («Nada por hacer ahora»); sin conexión (lectura de lo que hay en memoria, «Mover a…» deshabilitado con explicación); error de movimiento: toast + la tarjeta vuelve a su columna (ya existe rollback en el tablero).

Componentes: `ToggleGroup`, `Input`, `Drawer`, `Badge`, `Tabs`, `virtualized-grid`/lista, `Skeleton`, `Progress`.

---

## 3. Portafolio (`/content`, vista del creador)

**Objetivo:** ver el portafolio como lo ve una marca y compartirlo.
**Acción principal:** Compartir (si está publicado) o Publicar (si no).

```
┌──────────────────────────────────────┐
│ Portafolio                           │
│ ┌──────────────────────────────────┐ │
│ │ ● Publicado  kreoon.com/p/vale   │ │  estado + URL corta
│ │ [ Compartir ]   [ Editar ]       │ │  Compartir = navigator.share → copiar
│ │ Ver como lo ven las marcas ›     │ │  → /p/:slug
│ └──────────────────────────────────┘ │
│ Hay cambios sin publicar · Revisar › │  solo si builder_has_draft
│                                      │
│ Destacados                ‹ › Ver todo│  portfolio_items.is_featured = true
│ [▮][▮][▯                             │  carrusel scroll-snap, 2,25 tarjetas visibles
│                                      │
│ Moda y estilo (8)         ‹ › Ver todo│  colección = portfolio_items.category
│ [▮][▮][▯                             │
│ Belleza (5)               ‹ › Ver todo│
│                                      │
│ Ver todo el archivo (23) ›           │
└──────────────────────────────────────┘
```
Reglas tomadas del prototipo `docs/hermes/enlace-profesional/portafolio-muestra.js` (no se modifica):
- ≤ 4 piezas: una fila estática sin flechas. ≤ 8: un solo carrusel. > 8: destacados + hasta 3 colecciones + «Ver todo».
- Carrusel con scroll horizontal nativo y `scroll-snap`; máx. 10 tarjetas y la última es «Ver las N piezas»; flechas solo con puntero fino, ocultas si todo cabe.
- «Ver todo» / colección: `?ver=todo` o `?coleccion=<slug>`, rejilla de 2 columnas, lotes de 12 con «Ver más (N restantes)», cabecera «‹ Portafolio»; al volver se restaura scroll y foco.
- Visor a pantalla completa (`100dvh`) con contador «3 de 12», deslizar (umbral 50 px), video sin autoplay y `preload="none"`, pausa al ocultar la pestaña. **Mejora sobre el prototipo:** el visor añade su propia entrada al historial para que Atrás lo cierre sin salir de «Ver todo».
- Tarjetas son `<button>` con `aria-label` completo; si la miniatura falla, texto de respaldo.

Datos: solo columnas existentes (`portfolio_items.is_featured`, `category`, `is_public`, `media_type`, `tags`; ojo: `creator_id` = `creator_profiles.id`, no `user_id`). Las entregas de la organización (lo que hoy muestra «Mi Contenido») quedan como colección «Trabajos con marcas» de solo lectura.

Estados:
- Cargando: tarjeta de estado + 2 carruseles esqueleto.
- Vacío: «Tu portafolio está vacío. Sube tus 3 mejores videos para que las marcas te encuentren.» + «Añadir videos» (abre el constructor en el paso Contenido).
- Sin publicar: tarjeta de estado en ámbar «Sin publicar — solo tú lo ves» + «Publicar».
- Error / sin conexión: patrón común.

Componentes: `Card`, `Button`, `Badge`, `Dialog` (visor) o `<dialog>` nativo, `Skeleton`. Reutilizar el CSS de `.gf-pista` del prototipo como clase utilitaria en `index.css`, no Embla.

---

## 4. Constructor por pasos (`/profile-builder`, pantalla completa)

**Objetivo:** editar el portafolio sin ver tres paneles a la vez. Una tarea visible.
**Acción principal:** depende del paso; en el último, «Publicar».

```
┌──────────────────────────────────────┐
│ ✕ Cerrar     Editar portafolio   ● Guardado │  estado: Guardado / Guardando… / Sin guardar / Error
│ ① Contenido ─ ② Diseño ─ ③ Vista previa ─ ④ Publicar │ stepper (4 pasos, scroll si no cabe)
├──────────────────────────────────────┤
│ (una sola tarea)                     │
├──────────────────────────────────────┤
│ [ Atrás ]            [ Siguiente › ] │  barra fija abajo + safe-area
└──────────────────────────────────────┘
```

| Paso | Contenido | Interacción móvil |
|---|---|---|
| ① Contenido | Lista de secciones del perfil (bloques existentes de `BLOCK_DEFINITIONS`): Portada, Trabajos, Sobre mí, Servicios, Reseñas. Cada fila: nombre, resumen, interruptor visible/oculto, «Editar». | **Tocar para añadir** («+ Añadir sección» abre un panel inferior con los tipos de bloque); reordenar con botones «Subir/Bajar» además del arrastre. «Editar» abre la sección a pantalla completa con su formulario (los campos del panel de configuración actual). Subida de fotos/videos con progreso (§8). |
| ② Diseño | Plantilla, color de acento, tipografía (controles existentes de estilos). | Un control por fila; vista miniatura en vivo arriba (altura 40 % del alto visible). Cambios van a `builder_config_draft`. |
| ③ Vista previa | El borrador renderizado como lo verá la marca, con conmutador Móvil/Escritorio. | Pantalla completa con banner «Vista previa · no publicado». Usa `ProfilePageRenderer isPreview` (existe pero hoy no se usa). |
| ④ Publicar | Lista de verificación (`PublishPanel.tsx` de V2): foto, 3+ piezas, bio, sin datos de contacto. | Botón «Publicar» → `publish_profile_blocks`. Al terminar: «Publicado» + «Compartir» + «Ver perfil». |

- Guardado: **autoguardado** del borrador cada 1,5 s de inactividad (reutilizar `useBuilderAutosave` de V2). El indicador dice «Guardado» **solo** tras confirmación del servidor; si falla, «No se pudo guardar · Reintentar» y el borrador local se conserva.
- Borrador local por `userId:orgId` para no perder nada si se cierra la app o llega una actualización.
- «Cerrar» con cambios sin guardar en el servidor → panel inferior «Tienes cambios sin guardar. [Guardar y salir] [Salir sin guardar]».
- Publicar es el **único** acto que hace visible el perfil (regla de producto: privado hasta publicar; borrador separado de lo publicado).
- Base técnica: V2 (`ProfileBuilderV2`, ya guarda estilo en borrador y publica con la RPC). V1 queda solo para escritorio hasta retirarla.

Componentes: `Progress`/stepper propio simple, `Drawer`, `Switch`, `Input`, `Textarea`, `Button`, `autosave-indicator.tsx` (existe en `ui/`).

---

## 5. Cuenta (`/settings`, vista móvil del creador)

**Acción principal:** ninguna dominante; es un índice.

```
┌──────────────────────────────────────┐
│ Cuenta                               │
│ ┌──────────────────────────────────┐ │
│ │ (avatar) Valentina Giraldo       │ │
│ │ Creadora · UGC Colombia          │ │  rol y organización (solo lectura)
│ └──────────────────────────────────┘ │
│ Mi perfil público                  › │  → /p/:slug
│ Mis cobros                         › │  → /creator-dashboard?tab=wallet
│ Datos personales                   › │  → /settings?section=profile
│ Seguridad y contraseña             › │
│ Notificaciones                     › │
│ Apariencia                         › │
│ ─────────────                        │
│ Usar como app                      › │  solo si se puede (pwa-offline.md §6)
│ Ayuda                              › │
│ Documentos legales                 › │  /legal/*
│ ─────────────                        │
│ Cerrar sesión                        │  destructivo, confirmación en panel inferior
│ Versión 2026.10.01                   │
└──────────────────────────────────────┘
```
- Cada sección de configuración se abre como pantalla con «‹ Cuenta», manteniendo `?section=` (existe).
- Formularios: guardar por sección con botón fijo abajo; «Guardado» solo con respuesta del servidor.
- No se muestran: Mi Plan, Social Hub, Academia, integraciones de redes del creador (regla: sin redes ni contactos del creador en esta fase).

---

## 6. Registro y acceso

**Dependencia:** otra sesión está cambiando el consentimiento legal del registro (`ConsentBlock.tsx`, `docs/legal/registro-2026-10`). Aquí solo se diseña la capa móvil; el contenido legal y su lógica no se tocan.

### 6a. Acceso (`/auth`)
```
┌──────────────────────────────────────┐
│ (logo)                               │
│ Inicia sesión                        │
│ [ Continuar con Google ]             │
│ ─── o con tu correo ───              │
│ Correo                               │  type=email, autocomplete=email, inputmode=email, enterkeyhint=next
│ [______________________]             │
│ Contraseña                  Mostrar  │  autocomplete=current-password, enterkeyhint=go
│ [______________________]             │
│ ¿Olvidaste tu contraseña?            │
│ [ Entrar ]                           │  48 px, ancho completo
│ ¿Eres creador y no tienes cuenta? Únete › │ → /registro/:slug por defecto
└──────────────────────────────────────┘
```
- Inputs a **16 px** y 48 px de alto (hoy 14 px y 40 px: iOS hace zoom al enfocar).
- Sin pantalla de bienvenida de 2 s (hoy `PageLoader` la muestra en `/auth`).
- Error junto al campo (`aria-invalid` + `aria-describedby`), no solo toast. Error de credenciales bajo el botón, en texto.
- Tras entrar, vuelve al destino guardado (`?volver=`).

### 6b. Registro (`/registro/:organizationSlug`) — ya está bien resuelto en móvil
- Verificado en el preview: inputs de 48 px, 16 px, `autocomplete` correcto (`name`, `email`, `new-password`), `inputmode=email`, pista bajo la contraseña con `aria-describedby`. Sin barra de navegación.
- Ajustes menores: `enterkeyhint`, botón de enviar visible sobre el teclado (la casilla de consentimiento queda por debajo en 375×812), y el resto según lo que defina la sesión legal.

---

## 7. Patrones transversales

| Patrón | Regla |
|---|---|
| Cargando | Esqueleto con la forma final (`Skeleton`). Nunca spinner y texto de vacío a la vez (hoy `/p/:slug` muestra ambos). Nunca splash de 2 s en navegación interna. |
| Vacío | Una frase + una acción. Sin KPIs en cero. |
| Sin conexión | Barra fina bajo la cabecera «Sin conexión. Mostrando lo último que cargaste.» Acciones que escriben, deshabilitadas con explicación. Se apoya en `useOnlineStatus` (existe, sin uso). |
| Error | «No pudimos …» + «Reintentar». Código técnico solo en detalles plegables. |
| Pendiente de guardar | Punto ámbar + «Sin guardar» junto al título; «Guardando…»; «Guardado» solo tras confirmación; «No se pudo guardar · Reintentar». |
| Paneles inferiores | `Drawer` (vaul, ya existe) para acciones breves: Mover a…, Filtros, Compartir, Confirmar. Máx. 70 dvh, asa visible, Atrás lo cierra. |
| Diálogos | `Dialog` solo en escritorio; en móvil, pantalla completa o `Drawer`. Alto con `dvh`, no `vh`. |
| Compartir | `navigator.share({ title, url })` → si no existe o falla (no `AbortError`), copiar al portapapeles con toast «Enlace copiado» → si tampoco, campo de solo lectura seleccionado. URL siempre `/p/:slug`. |
| Formularios | `type`/`inputmode`/`autocomplete`/`enterkeyhint` correctos, 16 px, etiqueta visible, error junto al campo con `FormMessage` (react-hook-form + zod, ya en el stack). |
| Movimiento | Sin animación de página de 0,4 s en cada navegación (hoy `PageWrapper` en `MainLayout.tsx:155-169`); transiciones ≤ 150 ms y respetar `prefers-reduced-motion`. |

## 8. Subidas (fotos y video)

```
┌──────────────────────────────────────┐
│ Material · Escena 3                  │
│ [ + Grabar ]  [ + Elegir archivos ]  │  capture="environment" en «Grabar»
│ ┌──────────────────────────────────┐ │
│ │ toma_03.mov   412 MB             │ │
│ │ ███████████░░░░  68 % · 2 min    │ │  Progress real + tiempo estimado
│ │ [Cancelar]                       │ │
│ ├──────────────────────────────────┤ │
│ │ toma_04.mov   Falló la conexión  │ │
│ │ [Reintentar] [Quitar]            │ │
│ └──────────────────────────────────┘ │
└──────────────────────────────────────┘
```
- Validación **antes** de subir: tipo (lista blanca por extensión además de MIME, porque algunos Android envían `file.type` vacío), tamaño máximo por flujo, duración leída con `<video>.duration` cuando aplique. Mensaje junto al archivo.
- Progreso real (`xhr.upload.onprogress` o `tus.onProgress`), Cancelar (`xhr.abort()` / `upload.abort()`), Reintentar.
- **Reanudable solo si el backend lo admite**: hoy solo Academia firma TUS (`academy-video-upload-init`). Para contenido no existe; requiere una función nueva de firma TUS para la librería de contenido (ver plan, ola de subidas). Hasta entonces: no prometer «reanudar», solo «reintentar».
- Al intentar salir con subidas activas: panel «Hay 2 subidas en curso. Si sales se cancelan.» y `beforeunload`.
- Las subidas viven en un gestor fuera del componente de la pestaña (para que cambiar de pestaña no las mate).
