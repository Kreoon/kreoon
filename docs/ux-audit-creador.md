# Auditoría UX — recorrido como creador (preview claude/focused-mendel-es4xcv)

## 1. Modal de inicio de sesión (`/` → «Iniciar sesión»)

**Hallazgos (contraste WCAG medido, mínimo AA = 4.5:1):**
- Título «Bienvenido de nuevo»: blanco sobre blanco → **1.00:1, invisible**. Solo se ve la barrita morada.
- Valor del input de correo: blanco sobre crema `#FAF8F5` → **1.06:1, el usuario no ve lo que escribe**. (El de contraseña sí se ve: 14.7:1 → inconsistencia).
- Botón «Google»: texto blanco sobre fondo casi blanco → **invisible**.
- Labels «Correo electrónico», «Contraseña», subtítulo y «¿No tienes cuenta?»: `#A1A1AA` sobre blanco → 2.56:1 (falla AA).
- Links «¿Olvidaste tu contraseña?» / «Regístrate»: `#9A82FF` sobre blanco → 3.0:1 (falla AA).
- Tab inactivo «Registrarse»: 2.24:1.
- El banner de cookies tapa la mitad inferior del modal (botón Google y enlace de registro) en la primera visita.

**Causa raíz:** `tailwind.config.ts:125` define `'kreoon-text-primary': '#ffffff'` fijo (paleta pensada solo para modo oscuro). Los componentes del design system Kreoon (`KreoonSectionTitle`, `KreoonInput`, botón Google) usan esos tokens, pero el modal se pinta en tema claro (`<html class="light">`), así que el texto queda blanco sobre blanco.

**Estado (2026-09-30): CORREGIDO en localhost** salvo el punto 5 (banner de cookies). Se reemplazaron los tokens fijos por `text-foreground` / `text-muted-foreground` / `text-primary` en `src/components/auth/*` y `src/components/ui/kreoon/{KreoonInput,KreoonSectionTitle,KreoonEmptyState,KreoonButton}.tsx`. Medido después: todo el texto del modal ≥ 5:1. Pendiente aparte: 50 archivos más usan `kreoon-text-*` sobre fondos oscuros fijos; migrarlos requiere decidir si esas pantallas son siempre oscuras.

**Prompt original para Claude Code:**
```
En Kreoon, el modal de login (src/components/auth/LoginForm.tsx dentro de AuthModal) tiene texto invisible en tema claro: el título de KreoonSectionTitle, el valor del KreoonInput de correo y el botón "Google" salen blancos sobre blanco. Causa: tailwind.config.ts:125 define los tokens kreoon-text-* con hex fijos de modo oscuro ('kreoon-text-primary': '#ffffff', etc.).

Haz:
1. Convierte todos los tokens kreoon-text-* (primary, secondary, muted) en variables CSS HSL definidas en src/index.css para :root (claro) y .dark (oscuro), siguiendo el patrón de --foreground/--muted-foreground de shadcn. Claro: primary ≈ #242135, secondary ≈ #52525B, muted ≈ #71717A. Oscuro: mantener los valores actuales.
2. Revisa src/components/ui/kreoon/* (KreoonInput, KreoonSectionTitle, KreoonButton, KreoonGlassCard) y quita cualquier text-white / bg-white hardcodeado; usa tokens.
3. Links de acento (¿Olvidaste tu contraseña?, Regístrate) en tema claro: usar un morado ≥ 4.5:1 sobre blanco (p. ej. #6D4AFF o más oscuro).
4. Tab inactivo de AuthTabs: texto ≥ 4.5:1.
5. Mientras AuthModal esté abierto, el banner de cookies no debe tapar el modal: ocúltalo hasta cerrar el modal o colócalo debajo (z-index menor y sin solapar).
Criterio de listo: en tema claro y oscuro, todo texto del modal de login y de registro ≥ 4.5:1 (verifícalo con el inspector), tsc sin errores, y una búsqueda de "kreoon-text" no deja ningún color hex fijo en tailwind.config.ts.
```

## 2. Panel de creador (`/creator-dashboard`)

**Corregido en localhost:**
- Títulos de las miniaturas de «Últimos aprobados»: blanco sobre degradado `from-background` (crema en tema claro) → **1.1:1**. Ahora `from-black/80 via-black/20` (el texto va siempre sobre imagen, el degradado debe ser oscuro en ambos temas). Archivos: `src/components/client-dashboard/NovaVerticalVideoGrid.tsx`, `ClientDashboardOverview.tsx`.
- «Ver todos» `text-purple-500` (3.96:1) → `text-primary font-medium`. Archivos: `src/pages/CreatorDashboard.tsx`, `EditorDashboard.tsx`.

**Hallazgos de UX (pendientes):**
- Subtítulo «Camerino» bajo el saludo no explica nada; el creador no sabe qué es.
- 8 tarjetas de KPI y casi todas en 0: sin estado vacío accionable. Cuando Asignados = 0 debería haber un CTA («Explora campañas en el Marketplace» / «Completa tu portafolio»).
- Tres métricas de dinero (Por cobrar, Cobrado, Balance wallet) mezcladas con las de producción; ya existe la pestaña «Mis Cobros» → duplicado.
- «Entregados y corre…» se trunca en desktop.
- Correo en fuente monoespaciada en la barra lateral (se ve técnico) y el botón de tema (sol) no tiene etiqueta.
- La mascota flotante tapa la última tarjeta del carrusel.
- Al iniciar sesión se ve un spinner de pantalla completa varios segundos sin esqueleto.

**Prompt para Claude Code:**
```
En src/pages/CreatorDashboard.tsx (vista "Estudio"):
1. Reemplaza el subtítulo "Camerino" por una línea útil y dinámica: si hay asignados → "Tienes N proyectos por iniciar"; si no → "No tienes proyectos activos".
2. Agrupa los KPI: fila 1 producción (Asignados, En proceso, Entregados, Novedades, Aprobados); mueve Por cobrar / Cobrado / Balance a la pestaña "Mis Cobros" y deja en Estudio solo un resumen compacto "Cobrado este mes $X · Ver cobros".
3. Si Asignados + En proceso = 0, muestra encima de los KPI una tarjeta de estado vacío con KreoonEmptyState: título "Aún no tienes proyectos", texto "Postúlate a campañas o mejora tu portafolio para que las marcas te encuentren" y dos botones: "Explorar Marketplace" (/marketplace) y "Completar portafolio".
4. Evita que las etiquetas de KPI se trunquen ("entregados y corregidos"): usa line-clamp-2 o textos más cortos.
5. Sustituye el spinner inicial por skeletons con la forma de las tarjetas (KreoonSkeleton).
6. Barra lateral: correo en fuente normal text-muted-foreground y truncado; botón de tema con aria-label y tooltip "Cambiar tema".
7. La mascota flotante no debe tapar contenido: añade padding-bottom al contenedor principal igual a su alto + 16px.
Criterio de listo: tsc ok, contraste ≥ 4.5:1 en tema claro y oscuro, y con una cuenta sin proyectos se ve el estado vacío con CTA.
```

## 3. Proyectos / tablero (`/board`) — rediseño Kanban de la nube ya integrado (a555e7b9)

**Corregido en localhost:**
- 12 columnas y 11 vacías: el creador tenía que desplazarse a la derecha para encontrar sus 13 videos. Ahora las etapas vacías se ocultan, reaparecen durante un arrastre (para poder soltar en cualquiera) y hay un enlace «Mostrar etapas vacías (N)». Archivo: `src/components/content-board/ContentBoardKanbanView.tsx`.
- Columna «archived» en inglés: la org guardó la clave como nombre. Respaldo a `STATUS_LABELS` cuando `label === status_key` → «Archivado». Archivo: `src/pages/ContentBoard.tsx`. (Arreglo de datos pendiente: `organization_statuses.label` de esa org.)
- **Bunny:** miniaturas de video de 2160 px (≈338 KB c/u) mostradas a 72 px → `getOptimizedThumbnail(url, 144, 256)` ≈4 KB c/u. 13 tarjetas: ~4,4 MB → <100 KB. Archivo: `kanban/KanbanCardMedia.tsx`.
- **Bunny (toda la app):** avatares de `cdn.kreoon.com` de hasta 1600 px (≈409 KB) mostrados a 28–32 px. La pull zone ya tiene Bunny Optimizer: `getOptimizedImageUrl` ahora añade `?width=&quality=` para `cdn.kreoon.com` y `AvatarImage` pide 256 px → ≈22 KB (-95 %). Archivos: `src/lib/imageOptimization.ts`, `src/components/ui/avatar.tsx`.

**Hallazgos de simplicidad (pendientes, a decidir):**
- Nombre inconsistente: menú «Proyectos» vs título «Kreoon Producciones / Centro de control de tus videos». Unificar en «Proyectos».
- Barra de herramientas con 4 vistas (Kanban, Lista, Calendario, Tabla) + 2 densidades + «Vista predeterminada» + filtros = 9 controles. Para creador: Kanban/Lista y un solo botón «Filtros»; densidad y vistas guardadas dentro de Filtros.
- «Vista guardada hace 1 minuto»: ruido para el creador.
- Etiquetas de hooks («Enganchar», «Solución») sin explicación.

## Backlog: verificación de perfil opcional (idea de Alexander)
Registro sin fricción; después, una tarjeta «Verifica tu perfil» (en Inicio y en Mi Perfil) con checklist de 3 pasos que, completos y revisados, activan la insignia de verificado (`is_verified`, ya existe en el modelo y en la tarjeta del Marketplace):
1. Video de presentación de 30 s (sube a Bunny con el flujo existente).
2. Ubicación confirmada (país/ciudad con consentimiento explícito; nada de rastreo continuo).
3. Perfil y portafolio completos (barra de progreso como gamificación ligera).
Requiere diseño de backend (quién aprueba, RLS, dónde se guarda cada paso) → pasar por `architect` antes de codear.

## 4. Detalle de tarjeta (`UnifiedProjectModal`)

**Corregido en localhost:**
- El creador abría en la subpestaña «IA» → «No tienes acceso a esta sección» (la pestaña inicial se elegía antes de cargar permisos). Ahora salta a la primera accesible y **las subpestañas sin acceso no se muestran** (`ScriptsTabContainer.tsx`).
- Subpestañas Director / B-Roll / Marketing / Captions vacías («Sin captions generados… Genera desde la pestaña IA») se ocultan cuando el usuario solo puede leer. Si queda una sola, se oculta la barra.
- Brief vacío (cuestionario para el cliente) se oculta en modo lectura (`index.tsx`, `isBriefEmpty`).
- «Workspace» → «Guión»; «Creacion de Contenido» → «Creación de contenido»; sin íconos de ojo en cada pestaña.
- Resultado para el creador: **Guión · Video · Material**, abre directo en el guión.

## 5. Regla de «Archivado» (decisión de Alexander)
«Archivado» = cierre automático: cliente aprobó + creador y editor pagados (canje/embajador: al aprobar). Nunca manual.
Fallas de la versión anterior: archivaba desde `delivered`/`corrected` (sin aprobación del cliente); si se pagaba antes de aprobar no archivaba nunca (trigger solo en columnas de pago); se podía elegir a mano.
- Migración nueva `supabase/migrations/20260930180000_content_archive_rule.sql` (**pendiente de aplicar**): un solo trigger en estado y pagos, rechaza archivado manual, reabre a «Aprobado» si se revierte un pago, backfill de atascados.
- UI: `canMoveToStatusWithRules` bloquea mover a «archived` (también admin); el selector no ofrece «Archivado»; un video archivado muestra etiqueta fija con explicación.
- Pendiente de datos: en la org del creador la etapa se llama `archived` (label = clave); respaldo de UI ya muestra «Archivado».

## 6. Tarjeta para creadores y editores (decisiones de Alexander, 2026-10-01)
- Misma tarjeta para creador y editor (hay creadores que editan): **Guión · Video · Material**.
- **Guión por escenas** en modo lectura (`SceneScriptView` + `sceneScript.ts`): bloques Hooks / Desarrollo / CTA; cada hook es una escena y en desarrollo/CTA cada línea hablada es una escena, con sus acotaciones. Numeración continua (Chaski #05 → 9 escenas). Dirección y B-Roll en «Indicaciones de grabación» plegable; Captions oculto.
- Sin «Refinar Guión con IA» para quien solo lee.
- Material: subir archivos y link de Drive **sin pulsar «Editar»** (se guardan al instante). Cada archivo se asigna a su escena con un selector — requiere la migración `20260930190000_raw_assets_scene.sql` (columna `scene_number` + política para que quien subió edite lo suyo). Sin migración la lista sigue funcionando (consulta de respaldo).
- Cliente de la tarjeta: visible para todos, editable solo por admin.
- Mapa de movimientos por rol aplicado en `contentBoardPermissions.ts` (creador: Asignado→En grabación→Grabado, Novedad→Corregido; editor: Grabado→En edición→Entregado, Novedad→Corregido; cliente: aprobar guión, Entregado→Aprobado/Novedad; gestión: todo menos Archivado). Normaliza `content_creator`→`creator`. **Pendiente:** el mismo mapa en la base de datos.

## 7. Alcance del creador y editor (decisión 2026-10-01)
- Menú (lateral, móvil, barra inferior y «Más»): **Inicio · Proyectos · Campañas · Portafolio · Configuración** (+ Mis Cobros en «Más» móvil). Fuera: Marketplace, Mi Plan, Social Hub, Guiones/Kreoon IA, Generador de anuncios, Academia, contador de tokens IA. Barra inferior renombrada (Hub/Producciones/Market → Inicio/Proyectos/Campañas).
- Bloqueo por URL: `src/lib/creatorScope.ts` (`ProtectedRoute` + `TalentGate`) para quien solo tiene roles de producción; `/marketplace` sigue público para visitantes y marcas.
- Encabezado: «Marketplace» → «Mi perfil público» (`/p/:username`).
- «Campañas» = `/marketplace/invitations`. **Backlog:** reconstruir campañas abiertas (módulo eliminado el 2026-08-12, `20260812010000_drop_campaigns_module.sql`) — requiere diseño con `architect`.
- Responsive: menú lateral contraído automático bajo 1280px (en tablet aplastaba las tarjetas); subtítulos de KPI en 2 líneas y color del tema.
- Notificaciones: `NOTIFICATIONS_PAUSED=true` (email) + plantillas WhatsApp desactivadas con respaldo en `notification_pause_backup`. Restaurar al terminar pruebas.
