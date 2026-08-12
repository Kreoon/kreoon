# Auditoría UX — "que un niño lo entienda"

Rama `simplificacion-2026` · 12 pantallas auditadas · criterio: usuario nuevo, sin explicación previa.

---

## Resumen — los 5 problemas más graves

1. **El tour de bienvenida está roto: 28 de 43 pasos apuntan a elementos que ya no existen.** Solo `Sidebar.tsx:738` emite `data-tour`; los 20 pasos que apuntan a KPIs, kanbans y campana de notificaciones no tienen destino en el DOM. Encima, las claves de rol del tour son legacy (`creator`, `strategist`, `ambassador`) y no coinciden con las canónicas (`content_creator`, `digital_strategist`), así que para la mayoría de usuarios el tour **ni siquiera arranca** (`tourSteps.ts:352-359`).
2. **Ningún dashboard tiene estado vacío.** Un creador, editor o estratega recién llegado ve una grilla de ceros y nada más — ni una frase que diga qué hacer. El banner de actividad es condicional (`CreatorDashboard.tsx:264`), los KPIs son 0 y el bloque de videos también es condicional. Cero orientación.
3. **Sobrecarga de acciones en las 2 pantallas más usadas.** ContentBoard presenta 9 controles compitiendo en el mismo bloque; Dashboard abre con 5 pestañas + 8 KPIs + 7 items de "Pipeline" + 3 filtros antes de que el usuario entienda qué mira.
4. **Restos de módulos eliminados visibles al usuario.** Pestaña "UP System" viva en el Dashboard admin (`Dashboard.tsx:1044`), filtro `filterCampaignWeek` en ContentBoard, y un diálogo que dice "Crea una campaña primero en el módulo de Marketing" (`CampaignAssignmentDialog.tsx:177`) — módulo que ya no existe.
5. **Botón principal de "Clientes" que no hace nada.** `Clients.tsx:26` — `onClick={() => guardAction(() => {})}`. El usuario pulsa "Nuevo Cliente" y no pasa absolutamente nada.

**Pantallas con más de 1 acción primaria compitiendo: 5 de 12** (Dashboard, ContentBoard, UnifiedClientsPage, ClientDashboard sin empresa, Settings).

---

## admin · `src/pages/Dashboard.tsx`

| Problema | Evidencia | Propuesta |
|---|---|---|
| 5 pestañas al abrir, una de módulo eliminado | `Dashboard.tsx:1035-1056` (`up` = "UP System" → `CollaborativeStats`) | Borrar pestaña `up`. Dejar 3: Principal / Dinero / Gente |
| Título en inglés sin significado | `Dashboard.tsx:859` `title="KREOON Board"` | "Inicio" |
| "Pipeline de Contenidos" — jerga | `Dashboard.tsx:1199` | "Cómo van los videos" |
| 7 columnas de estado a la vez | `Dashboard.tsx:1200` `md:grid-cols-7` | Agrupar en 3: Por hacer / En proceso / Listos |
| 8 KPIs antes del pipeline | `Dashboard.tsx:1061`, `:1116` (2 filas de 4) | Máx 4 en la vista inicial |
| "En vivo" con punto pulsante sin función | `Dashboard.tsx:876-879` | Eliminar (ruido) |
| Sin estado vacío global | no existe rama para `content.length === 0` | "Todavía no hay videos. Empieza creando el primero." + 1 botón |
| Empty states pobres | `Dashboard.tsx:1768`, `:1795` "No hay creadores activos en este período" | Añadir "Cambia el rango de fechas" como acción |
| 3 filtros + selector de fechas antes del contenido | `Dashboard.tsx:861-960` | Colapsar todo tras un único botón "Filtrar" |

## admin · `src/pages/ContentBoard.tsx`

| Problema | Evidencia | Propuesta |
|---|---|---|
| 9 acciones compitiendo en un bloque | `:636` Generar en lote · `:645` buscar · `:714` Configurar · `:723` Nueva Producción · `:815` Analizar IA · `:779` ViewSelector · `:808` BoardViewSwitcher · 2 switches `:762,:774` · `:742` Reset | Dejar **1 primaria**: "Nueva Producción". El resto a un menú "⋯" |
| "Powered by AI" en el subtítulo | `ContentBoard.tsx:630` | Quitar |
| "items" y "Reset" (anglicismos) | `:709`, `:748` | "videos" · "Quitar filtros" |
| Filtro de campañas (módulo eliminado) | `:695` `filterCampaignWeek` | Eliminar el filtro |
| Diálogo referencia "módulo de Marketing" inexistente | `CampaignAssignmentDialog.tsx:177` | Borrar el diálogo |
| Rol legacy: el switch "Solo mis asignaciones" no aparece a `content_creator` | `ContentBoard.tsx:763` `['creator','editor'].includes(primaryRole)` | Usar claves canónicas |
| Empty state pobre | `BoardListView.tsx:368` / `BoardTableView.tsx:787` "No hay contenido para mostrar"; `ContentBoardKanbanView.tsx:184` "Sin contenido" | "Todavía no hay videos aquí. Crea el primero →" |

## admin · `src/pages/UnifiedClientsPage.tsx`

| Problema | Evidencia | Propuesta |
|---|---|---|
| "Pipeline" como etiqueta de KPI | `:403-405` | "Valor contratado" |
| 5 pestañas de filtro + 3 tarjetas-filtro duplicando lo mismo | `:81-87` (FILTER_TABS) y `:411-465` (Activos/Entregados/Sin paquetes) | Elegir una sola forma de filtrar |
| "Sin paquetes" / "prospects" mezclados | `:84` label vs `:185` `prospects` | Un solo término: "Sin plan contratado" |
| Acción principal escondida tras dropdown | `:587` "Nuevo" → 2 opciones | Botón directo "Nueva empresa" + secundario "Contacto" |
| Empty states sin salida | `:734` "No se encontraron clientes"; `:637` "No hay usuarios cliente vinculados a empresas" | Añadir botón "Crear el primero" |
| Tablas de 5 columnas con `min-w` | `:661` `min-w-[600px]`, `:767` `min-w-[500px]` | Contenido (tienen `overflow-x-auto`), pero en 375px se leen mal → usar tarjetas por defecto en móvil |

## admin · `src/pages/UnifiedTalentPage.tsx`

| Problema | Evidencia | Propuesta |
|---|---|---|
| Nombre inconsistente: la página dice "Talento", el menú dice "Creadores" | `:271` vs `Sidebar.tsx:114` | Unificar en "Creadores" |
| Falta tilde en el subtítulo | `:272` "Gestion de equipo interno" | "Gestión" |
| Empty state sin acción | `:566-568` "No se encontró talento" | "Todavía no tienes creadores. Invita al primero →" |
| Panel lateral fijo de 440px | `:558` `md:mr-[440px]` | OK en desktop; verificar que en móvil abra como hoja completa |

**1 sola acción primaria ("Invitar Miembro", `:278`). Correcto.**

## admin · `src/pages/Scripts.tsx`

| Problema | Evidencia | Propuesta |
|---|---|---|
| "Kreoon IA" no dice qué se hace aquí | `:16-17` | Título "Guiones", subtítulo "Escribe guiones con ayuda de la IA" |

**1 sola acción. Es la pantalla más limpia del set.**

## estratega · `src/pages/StrategistDashboard.tsx`

| Problema | Evidencia | Propuesta |
|---|---|---|
| "KREOON Board" | `:249` | "Inicio" |
| 5 KPIs en 2 columnas en móvil | `:258` `grid-cols-2 lg:grid-cols-5` | Máx 3 KPIs |
| Sin estado vacío | no hay rama para `content.length === 0` | "Todavía no tienes guiones asignados" |
| 2 acciones compitiendo | `:452` "Generar Guión" (dorado, llamativo) + `:481` "Copiar" | OK: la segunda solo aparece tras generar |

## creador · `src/pages/CreatorDashboard.tsx` · editor · `src/pages/EditorDashboard.tsx`

| Problema | Evidencia | Propuesta |
|---|---|---|
| Hasta 10 tarjetas KPI de golpe | `CreatorDashboard.tsx:319-410` (Asignados, En Proceso, Entregados, Novedades, Aprobados, Por Cobrar COP, Por Cobrar USD, Cobrado COP, Cobrado USD, Balance Wallet) | 3 en Estudio ("Por grabar / En proceso / Listos"); el dinero vive ya en la pestaña "Mis Cobros" |
| Sin estado vacío: banner y videos son condicionales | `CreatorDashboard.tsx:264`, `:411`; `EditorDashboard.tsx:258` | "Todavía no tienes trabajos. Te avisamos cuando llegue el primero." |
| "Estudio" y "Novedades" ambiguos | `CreatorDashboard.tsx:29`, `:344` | "Mi trabajo" · "Requieren arreglo" |

**1 acción primaria ("Ver tablero"). Correcto en ambas.**

## cliente · `src/pages/ClientDashboard.tsx` + `components/client-portal/`

**Referencia de calidad del repo.** `ClientPipelineChecklist.tsx` cumple el criterio: lenguaje llano ("Así entendimos tu marca", "Léelo y dinos si te representa"), 1 acción primaria por paso y 1 secundaria (`:237-254`, `:284-305`).

| Problema | Evidencia | Propuesta |
|---|---|---|
| Estado "sin empresa": 3 botones al mismo nivel y texto contradictorio | `:882-898` — dice "El equipo de KREOON está vinculando tu empresa" y ofrece "Crear mi Empresa" | Un solo botón: "Crear mi empresa". Mover "Cerrar sesión" al menú de cuenta |
| Convive el checklist nuevo con el resumen viejo | `:1043` (`overview`) y `:1053` (`resumen`) | Borrar `resumen`; absorber lo útil en el checklist |
| 3 enlaces secundarios al pie del checklist | `ClientPipelineChecklist.tsx:393-401` | Máx 2 |

## comunes · `src/pages/settings/SettingsSidebar.tsx`

| Problema | Evidencia | Propuesta |
|---|---|---|
| 18 secciones (8 + 10) | `:40-47`, `:56-65` | Máx 5 en "Mi Cuenta": Perfil · Notificaciones · Seguridad · Mi Plan · Ayuda |
| Grupo y sección con el mismo nombre | `:51` grupo "Administración" y `:61` sección "Administración"; ídem "Configuración" `:60` | Renombrar secciones |
| Jerga cruda | `:45` "Integraciones MCP" · `:62` "Tracking" · `:64` "Tokens IA" · `:65` "Prompts AI" · `:43` "2FA" · `:58` "Marketplace & Portafolio" | "Conectar con otras apps" · "Medición" · "Consumo de IA" · "Instrucciones de la IA" · "Verificación en dos pasos" · "Perfil público" |
| "Tour Guiado" apunta a un tour roto | `:46` → `TourSection.tsx:7` | No mostrar hasta arreglar el tour |

## comunes · `src/pages/Team.tsx`

| Problema | Evidencia | Propuesta |
|---|---|---|
| 8 pestañas de rol | `:805-829` | 3: Equipo · Sin asignar · Clientes; el rol como filtro |
| Subtítulo con 3 métricas y "en riesgo" sin explicar | `:260` | "12 personas en tu equipo" |
| "Activos (salud ≥70)" — score sin contexto | `:775` | "Trabajando esta semana" |
| "Community" a secas | `:825` | "Community managers" |
| Duplicación: dos implementaciones de lista en el mismo archivo | `:65` `SinAsignarSection` y `:405` `Team` (894 líneas) | Extraer `MemberList` a un componente único |

## comunes · `src/pages/Clients.tsx`

| Problema | Evidencia | Propuesta |
|---|---|---|
| **El botón principal no hace nada** | `:26` `onClick={() => guardAction(() => {})}` | Conectar al diálogo de creación o quitar el botón |
| "Gestión inteligente de marcas y representantes" | `:20` | "Tus clientes" |
| Página redundante con `UnifiedClientsPage` | ambas viven en el repo | Decidir cuál queda; borrar la otra |

---

## Onboarding por rol

### Estado actual

| Rol (clave del tour) | Pasos | Pasos rotos | Nota |
|---|---|---|---|
| `admin` | 9 | 4 | `stats-section`, `sidebar-team` (hoy es `sidebar-talent`), `sidebar-portfolio`, `notification-bell` |
| `ambassador` | 6 | 3 | Embajador **no es un rol** (es un badge) — el tour entero sobra |
| `strategist` | 6 | 5 | Solo `sidebar-scripts` existe |
| `creator` | 7 | 5 | Solo `sidebar-board` y `sidebar-settings` |
| `editor` | 7 | 5 | Ídem |
| `client` | 8 | 6 | `sidebar-board` no existe en el menú de cliente (es `sidebar-projects`) |
| **Total** | **43** | **28** | 65% roto |

Dos fallos estructurales adicionales:
- **Ningún `data-tour` fuera del menú lateral.** `Sidebar.tsx:738` es la única emisión; los 20 pasos que apuntan a KPIs, kanbans, generador de IA o campana no tienen ancla. `TourTooltip.tsx:44-46` los salta en silencio, así que el usuario ve un tour que brinca sin explicación.
- **Claves de rol legacy.** `tourSteps.ts:352-359` busca `creator` / `strategist` / `ambassador`, pero los roles canónicos son `content_creator`, `digital_strategist`, `creative_strategist` (`src/lib/roles.ts:22-29`). Para un usuario con rol canónico `getTourConfig` devuelve `null` → el tour **nunca se muestra**. Solo funciona con filas legacy en BD.

### Propuesta: 3 pasos por rol, sobre elementos que existen

Requisito previo: añadir `data-tour` a los 3 anclas de cada rol y migrar las claves a las canónicas.

| Rol | Paso 1 | Paso 2 | Paso 3 |
|---|---|---|---|
| `admin` | "Aquí ves cómo va todo" → `sidebar-dashboard` | "Aquí viven los videos" → `sidebar-board` | "Aquí están tus clientes" → `sidebar-clients` |
| `digital_strategist` / `creative_strategist` | "Aquí escribes guiones" → `sidebar-scripts` | "Aquí ves los videos en marcha" → `sidebar-board` | "Aquí están tus clientes" → `sidebar-clients` |
| `content_creator` | "Aquí está tu trabajo" → `sidebar-board` | "Aquí cobras" → pestaña *Mis Cobros* | "Aquí cambias tus datos" → `sidebar-settings` |
| `editor` | idéntico a creador | | |
| `client` | "Aquí ves tu proceso paso a paso" → checklist | "Aquí están tus videos" → `sidebar-projects` | "Aquí están tus facturas" → `sidebar-facturas` |
| `community_manager` | sin tour hoy | — | — |

Eliminar el tour `ambassador` completo. Reducir `WelcomeDialog.tsx` (hoy 3 viñetas + 2 botones) a título + 1 botón.

---

## Mobile 375px — sospechosos

| Archivo:línea | Qué pasa |
|---|---|
| `Dashboard.tsx:1035` | `TabsList grid-cols-3 sm:grid-cols-5` con 5 pestañas y `h-10` fijo → en 375px las 5 se aprietan en 3 columnas con altura fija: se cortan |
| `Dashboard.tsx:1200`, `:332` | `grid-cols-2 sm:grid-cols-4 md:grid-cols-7` — 7 items de pipeline en 2 columnas = 4 filas de scroll antes del contenido |
| `Dashboard.tsx:1668`, `:1355`, `:1393` | Bloques de 4 KPIs en `grid-cols-2` → apilado muy largo |
| `Team.tsx:805` | `TabsList flex flex-wrap h-auto` con 8 pestañas → 3-4 filas de pestañas antes del contenido |
| `Team.tsx:45` | `min-w-[80px]` en `HealthBar` dentro de filas ya estrechas |
| `CreatorDashboard.tsx:319` / `EditorDashboard.tsx:311` | `grid-cols-2` con hasta 10 KPIs = 5 filas |
| `StrategistDashboard.tsx:258` | `grid-cols-2 lg:grid-cols-5` con 5 KPIs — sin breakpoint `sm`/`md` intermedio |
| `UnifiedClientsPage.tsx:411` | `grid-cols-3` sin breakpoint: 3 tarjetas-filtro con texto largo ("Contenido pendiente", "Sin paquete contratado") en 375px → truncan |
| `UnifiedClientsPage.tsx:661`, `:767` | Tablas `min-w-[600px]` / `min-w-[500px]` — contenidas por `overflow-x-auto`, pero exigen scroll lateral para ver "Empresas" y "Valor" |
| `UnifiedTalentPage.tsx:598` | Tabla `min-w-[550px]`, mismo caso |
| `BoardTableView.tsx:692` | `min-w-[700px]` — contenido, pero casi 2 pantallas de ancho |
| `BoardConfigDialog.tsx:570` | `min-w-[600px]` dentro de un diálogo en móvil |
| `ContentBoard.tsx:762`, `:774` | `whitespace-nowrap` en "Solo mis asignaciones" / "Ocultar archivados" junto a switches → empujan la fila |
| `dashboard/DroppableKanbanColumn.tsx:44` | Columna fija `w-[350px]`: ocupa casi toda la pantalla de 375px (`board/EnhancedKanbanColumn.tsx:33` ya usa `w-[280px] sm:w-[320px]` — unificar en el valor bueno) |
| `UnifiedClientsPage.tsx:653` / `UnifiedTalentPage.tsx:558` | Panel lateral `md:mr-[440px]`: sin equivalente móvil declarado — verificar que abra como hoja completa |
| `ClientDashboard.tsx:987` | Nombre de empresa `hidden md:inline` — en móvil el selector de empresa queda sin etiqueta, solo un icono |

---

## Consistencia visual

Auditadas las 6 pantallas supervivientes contra el tema (tokens HSL de
`src/index.css` + `tailwind.config.ts`).

### El hallazgo grave: texto invisible en modo claro

`text-white` dentro de contenedores que sí cambian con el tema (`bg-muted`,
`border-border`). En modo oscuro no se nota; en **modo claro se escribía blanco
sobre fondo claro**.

| Dónde | Qué pasaba |
|---|---|
| `UnifiedClientsPage.tsx`, `UnifiedTalentPage.tsx` | El texto tecleado en el buscador y su lupa, invisibles |
| Los mismos, estado vacío | Iconos a `text-white/20`, invisibles |
| `StrategistDashboard.tsx` | Dos textos dentro de una tarjeta con tema |

Corregido a `text-foreground` / `text-muted-foreground`, que es el patrón que ya
seguían `Team.tsx` y `ContentBoard.tsx`.

### Valores crudos sustituidos por su token

| Dónde | Antes | Ahora |
|---|---|---|
| `StrategistDashboard.tsx` (3 usos) | `text-[hsl(270,100%,60%)]` | `text-primary` (valor idéntico en claro y oscuro) |
| `settings/SettingsSidebar.tsx` (3 usos) | `dark:bg-[#1a1a24]` | `dark:bg-kreoon-bg-card` |

### Glassmorphism

Ninguna de las 6 pantallas usa `backdrop-blur`: todas siguen el estilo plano del
tema, de forma consistente. Con `--radius: 0.125rem`, la diferencia entre
`rounded-sm/md/lg` es imperceptible. **No había nada que unificar.**

### Pendiente de decisión — los colores de estado en modo oscuro

`src/index.css` define el semáforo dos veces, y en oscuro los tres colores
colapsan en morado:

| Token | Modo claro | Modo oscuro |
|---|---|---|
| `--success` | `150°` verde | **`270°` morado** |
| `--warning` | `35°` ámbar | **`280°` morado** |
| `--info` | `210°` azul | **`260°` morado** |

Quien use la app en modo oscuro **no distingue un aviso de un error por el
color**. Por eso las pantallas usan verde/rojo/ámbar sueltos en los distintivos
de estado: no es descuido, es que los tokens no sirven para semáforo. Arreglarlo
son tres líneas, pero repinta distintivos en toda la app — **requiere decisión
del dueño**, no se toca por iniciativa propia.

---

## Performance

### Bundle contra la línea base

| Medida | Fase 0 | Tras simplificar | Tras esta pasada |
|---|---|---|---|
| `dist` total | 23.307.089 B | 22.612.913 B | 22.591.977 B |
| Fragmentos JS | 390 | 350 | 349 |

**Honestidad sobre la cifra**: el total baja un 3,1 % y esta pasada aporta solo
20 kB. Lo que mejora aquí no es *cuánto pesa* el conjunto, sino **cuándo se
carga cada cosa** — y eso el peso total no lo mide.

### Lo que cargaba la portada pública sin necesitarlo

1. **`vendor-charts`, ~503 kB de librería de gráficas, en una página sin una sola
   gráfica.** Causa: el orbe 3D del hero depende de un paquete `d3-*` pequeño, y
   `vite.config.ts` metía *todo* `d3-*` en el mismo fragmento que `recharts`. Un
   paquete de 60 kB arrastraba medio megabyte. **Separados.**

2. **El canvas 3D del hero, 877 kB — el fragmento más grande de toda la app —
   se importaba de forma estática** en `HomePage.tsx` y bloqueaba el pintado.
   **Ahora carga aparte**: el texto del hero aparece primero.

### Lo que NO era problema (comprobado antes de tocar)

- **Troceado por ruta**: ya resuelto. 112 de 144 rutas cargan bajo demanda, y
  ninguna página se importa de forma estática en `App.tsx`.
- **`hls.js` (525 kB) y `dash.js` (854 kB)**: *no* son residuo del streaming
  eliminado. Los usan de verdad el tablero y Academia, y ya cargan bajo demanda.
  **No tocar.**

### Causa raíz pendiente — por qué `vendor-charts` sigue precargándose

Separar `d3` no bastó: `vendor-charts` sigue en el `modulepreload` de la
portada. El culpable es `src/components/ui/lazy-charts.tsx`, que hace carga
diferida en las líneas 41-61 y luego, **en la línea 95, reexporta 26 símbolos de
`recharts` de forma estática**. El comentario dice que son "más livianos", pero
salen del mismo paquete: cualquiera que importe de ahí se trae la librería
entera, y son 10 archivos.

Arreglarlo es real pero toca esos 10 importadores: **no es un cambio de bajo
riesgo**, queda propuesto y sin aplicar.

Menores, sin aplicar: `SocialHubPage`, `AdGeneratorPage` y `ProductBannersPage`
usan `lazy()` en vez de `lazyWithRetry()` (pierden la recarga automática cuando
el fragmento queda obsoleto). `src/components/ui/chart.tsx` no lo importa nadie:
código muerto.

---

## Antes / después

*(capturas a cargo del dueño — 375px y 1440px. No se pueden generar desde aquí:
requieren sesión iniciada.)*

| Pantalla | Antes | Después |
|---|---|---|
| Dashboard admin | _(pendiente)_ | _(pendiente)_ |
| ContentBoard | _(pendiente)_ | _(pendiente)_ |
| Clientes | _(pendiente)_ | _(pendiente)_ |
| Creador — Estudio | _(pendiente)_ | _(pendiente)_ |
| Cliente — checklist | _(pendiente)_ | _(pendiente)_ |
| Ajustes | _(pendiente)_ | _(pendiente)_ |
| Tour de bienvenida | _(pendiente)_ | _(pendiente)_ |
