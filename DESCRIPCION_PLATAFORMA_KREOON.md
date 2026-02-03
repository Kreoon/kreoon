# Descripción detallada de la plataforma KREOON

## ¿Qué es KREOON?

**KREOON** es un **sistema operativo creativo** (Creative Operating System) para agencias, creadores, empresas y comunidades. Centraliza la operación de contenido en un solo lugar: gestión de proyectos, talento, clientes, IA, live streaming, pagos, gamificación y red social profesional.

El eslogan de la plataforma es: *"El sistema donde se construyen imperios creativos"*.

---

## Propósito y público objetivo

- **Agencias y estudios creativos:** gestionar múltiples clientes, creadores y proyectos desde un único tablero.
- **Empresas con equipos de contenido:** controlar flujos de aprobación, scripts, videos y entregas.
- **Comunidades y redes de creadores:** ranking, logros, portafolios y descubrimiento de talento.
- **Marcas (clientes):** ver su contenido, aprobar entregas y acceder a su portal sin entrar en la operación interna.

La plataforma es **multi-organización**: cada empresa/agencia tiene su propio espacio aislado, con sus usuarios, clientes, contenido y configuración.

---

## Roles de usuario

| Rol | Descripción | Acceso típico |
|-----|-------------|----------------|
| **Admin** | Dueño o administrador de la organización. Ve todo, configura permisos, equipo, clientes y tablero. | Dashboard, Board, Content, Creators, Clients, Team, Marketing, Live, Settings (org + plataforma si es root). |
| **Strategist** | Estratega / account. Gestiona proyectos, clientes y marketing; no administra equipo ni facturación global. | Strategist Dashboard, Board, Scripts, Marketing, Content, Creators, Clients, Live, Settings (org). |
| **Editor** | Editor de video. Recibe asignaciones, edita contenido, sube entregas. | Editor Dashboard, Board, Scripts, Social, Settings. |
| **Creator** | Creador de contenido. Graba, entrega, ve sus proyectos y ranking. | Creator Dashboard, Board, Scripts, Social, Settings. |
| **Client** | Cliente/marca. Solo ve sus proyectos y entregas en su dashboard y board. | Client Dashboard, Client Board, Social, Settings. |
| **Team leader** | Líder de equipo (admin con foco en equipo y operación). | Mismo nivel que Admin en navegación. |
| **Ambassador** | Embajador/referidos. Acceso limitado o especial según configuración. | Definido por permisos. |

Hay soporte para **impersonación**: un admin puede “entrar como” otro usuario para soporte o revisión.

---

## Módulos principales

### 1. Board (Tablero Kanban)

- **Qué es:** Tablero tipo Kanban unificado para todos los roles. Columnas = estados del flujo (Creado, Guión aprobado, Asignado, En grabación, Grabado, En edición, Entregado, etc.).
- **Quién lo usa:** Admin, Strategist, Editor, Creator ven el mismo board; la diferencia es qué contenido ven (filtros por asignación, cliente, etc.). El cliente tiene su propio board solo con su contenido.
- **Funcionalidad:** Drag & drop entre columnas, asignación de creador/editor por tarjeta, preview de video inline (Bunny.net), fechas, comentarios, configuración de estados/permisos/transiciones por organización.
- **Configuración:** Estados personalizables (nombre, color, icono), permisos por rol por estado, reglas de transición, campos personalizados, vistas (lista/calendario/tabla).

### 2. Content / Portafolio (Proyectos de contenido)

- **Qué es:** CRUD de proyectos de contenido. Cada proyecto tiene: título, cliente, estado, fechas, script/guiones, versiones de video, material crudo, equipo asignado, pagos, comentarios.
- **Quién lo usa:** Admin y Strategist gestionan; Editor y Creator trabajan en los asignados; Client solo ve los suyos.
- **Funcionalidad:**
  - **Detalle de proyecto (ContentDetailDialog):** pestañas General, Scripts, Video, Material, Team, Dates, Payments.
  - **Scripts:** bloques editables, IA para generación y mejora, permisos por rol (admin, diseñador, editor, estratega, trafficker), revisión por cliente.
  - **Video:** subida de variantes (hooks) vía Bunny.net; preview y reproductor.
  - **Material:** material crudo para el editor (subida/descarga vía Bunny o storage); pestaña “Material” vs “Video” (final).
- **Integraciones:** Bunny.net (upload, thumbnail, streaming), Supabase Storage, Edge Functions para IA y procesamiento.

### 3. IA / Scripts

- **Qué es:** Módulo de guiones y asistentes IA. Generación de scripts, análisis de contenido, chat con contexto del proyecto.
- **Quién lo usa:** Admin, Strategist, Editor (según permisos por bloque).
- **Funcionalidad:** Generación de guiones por brief, sugerencias por sección, chat IA en el contexto del script, integración con proveedores (OpenAI, etc.) configurables por organización.
- **Backend:** Edge Functions (generate-script, content-ai, script-chat, multi-ai, etc.).

### 4. Marketing

- **Qué es:** Calendario de contenido, campañas, clientes de marketing y reportes.
- **Quién lo usa:** Admin, Strategist.
- **Funcionalidad:** Calendario editorial, campañas con asignación de estratega, clientes marketing, selección de contenido para campañas, validación, reportes, alertas de presupuesto. Posible integración con tráfico y métricas.

### 5. Sistema UP (Puntos y gamificación)

- **Qué es:** Sistema de puntos, niveles, logros y ranking para motivar a creadores y editores.
- **Quién lo usa:** Admin, Creator, Editor (ranking y logros); Admin configura temporadas y reglas.
- **Funcionalidad:** Puntos por entregas, puntualidad, calidad; logros desbloqueables (primera entrega, rachas, niveles); leaderboards por rol y temporada; historial y documentación del sistema UP.

### 6. Network / Social (Portfolio y feed)

- **Qué es:** Red social interna tipo TikTok/Instagram: feed vertical, portafolios públicos, seguidos/seguidores, explorar.
- **Quién lo usa:** Todos los roles (con distinto nivel de visibilidad).
- **Funcionalidad:** Feed de videos, explorar contenido, perfiles públicos (creadores/empresas), guardados, historias (si aplica), búsqueda y descubrimiento de talento.

### 7. KREOON Live

- **Qué es:** Módulo de live streaming y live shopping integrado.
- **Quién lo usa:** Admin, Strategist; clientes pueden tener canales/paquetes asignados.
- **Funcionalidad:** Transmisiones en vivo, canales por cliente, paquetes de horas, métricas de stream, facturación Kreoon Live, proveedores de streaming. Tabs: Overview, Eventos, Canales, Paquetes, Clientes, Creadores, Facturación, Configuración, Monitoreo.

### 8. Gestión: Creadores, Clientes, Equipo

- **Creadores:** Listado de talento, perfiles, asignación a proyectos, métricas.
- **Clientes:** CRM de marcas: datos, paquetes, productos por cliente, usuarios asociados (portal cliente), servicios, canales de streaming.
- **Equipo:** Miembros de la organización, roles, invitaciones, permisos.

### 9. Chat y notificaciones

- **Chat:** Mensajería interna 1:1 y grupal, adjuntos (Bunny chat upload), historial, indicadores de presencia, IA en el chat (AIChatPanel, AIAssistantButton). Reglas RBAC por organización (quién puede chatear con quién).
- **Notificaciones:** Notificaciones in-app por usuario y organización (contenido, menciones, asignaciones, etc.), con opción de notificaciones push (PWA).

### 10. Configuración (Settings)

- **Mi cuenta:** Perfil, notificaciones, seguridad (contraseña, 2FA), tour guiado.
- **Organización:** Datos de la org, registro e invitaciones, plan/suscripción, IA y modelos, embajadores, permisos por rol, historial (audit log), red social, KREOON Live (org).
- **Plataforma (solo root admin):** Organizaciones, usuarios globales, referidos, facturación, configuración global, administración, tracking/analytics, IA tokenización, KREOON Live (plataforma).

---

## Stack técnico

- **Frontend:** React 18, TypeScript, Vite, React Router, TanStack Query, Tailwind CSS, shadcn/ui, Framer Motion.
- **Backend:** Supabase (PostgreSQL, Auth, Realtime, Storage).
- **Edge Functions:** Deno/TypeScript en Supabase (generación de scripts, IA, Bunny, notificaciones, limpieza, etc.).
- **Video y almacenamiento:** Bunny.net (streaming, thumbnails, uploads de video y material crudo); Supabase Storage para archivos y thumbnails generados.
- **Despliegue:** Vercel (SPA con rewrites para rutas client-side).
- **PWA:** Service worker, manifest, notificaciones push, aviso de actualización (UpdatePrompt).

---

## Flujos de datos relevantes

- **Auth:** Supabase Auth (email/password); perfiles en `profiles`; roles en `user_roles` y `organization_members` / `organization_member_roles`. Redirección post-login según rol (dashboard por rol).
- **Multi-org:** `organizations`, `organization_members`, `current_organization_id` en perfil; RootOrgSwitcher para admins con varias orgs.
- **Contenido:** Tabla `content` (estado, fechas, cliente, creador, editor, script, video_url, etc.); flujo de estados alineado con el Board.
- **Board:** Columnas desde `organization_statuses`; permisos desde `state_permissions` y `kanban_config`; filtros de contenido por rol y “solo mis asignaciones”.
- **Video:** Subida vía Edge Functions `bunny-upload` / `bunny-raw-upload`; URLs de Bunny en `content`; preview en tarjetas con `KanbanCardVideoPreview` (iframe o `<video>` según tipo de URL).

---

## Seguridad y permisos

- **RLS (Row Level Security):** En tablas críticas (content, clients, organization_members, kanban_config, state_permissions, project_raw_assets, etc.). Funciones como `is_org_member`, `is_org_configurer`, `is_org_owner`, `has_role` definen quién puede leer/escribir.
- **Rutas:** `ProtectedRoute` por rol; rutas públicas: `/`, `/auth`, `/company/:username`, `/profile/:userId`, `/org/:slug`.
- **Impersonación:** Contexto y banner para que el admin sepa que está “como” otro usuario.

---

## Resumen en una frase

**KREOON** es una plataforma todo-en-uno para operaciones creativas: Kanban de proyectos, gestión de contenido y scripts con IA, material y video (Bunny), marketing, live streaming, gamificación UP, red social interna, chat, CRM de clientes y creadores, y configuración por organización y rol, desplegada en React + Supabase + Vercel.
