# Módulos y submódulos de la plataforma Kreoon

Lista completa en orden recomendado para intervenir módulo por módulo.

---

## 1. Autenticación y acceso

| Ruta | Página / componente | Descripción |
|------|---------------------|-------------|
| `/` | `HomePage.tsx` | Landing pública |
| `/auth` | `Auth.tsx` | Login / registro |
| `/reset-password` | `ResetPassword.tsx` | Recuperar contraseña |
| `/register` | `Register.tsx` | Registro de usuario |
| `/org/:slug` | `auth/OrgRegister.tsx` | Registro a organización por slug |
| `/pending-access` | `PendingAccess.tsx` | Usuario sin acceso aprobado |
| `/no-organization` | `NoOrganization.tsx` | Sin organización |
| `/no-company` | `NoCompany.tsx` | Sin compañía |
| `/unauthorized` | `Unauthorized.tsx` | Sin permisos |
| `/welcome` | `WelcomeNewMember.tsx` | Bienvenida nuevo miembro |

**Componentes / lógica:** `ProtectedRoute.tsx`, `useAuth.tsx`, `ImpersonationContext`, `ImpersonationBanner`, `RoleSwitcher`, `RootOrgSwitcher`.

### Estructura detallada del Módulo 1 (por página)

#### 1.1 `HomePage.tsx` — Ruta: `/`

| Aspecto | Detalle |
|--------|---------|
| **Ubicación** | `src/pages/HomePage.tsx` |
| **Propósito** | Landing pública + punto de entrada para usuarios autenticados (redirección al dashboard según rol). |
| **Estado local** | `loading`, `email`, `password`, `showAuthModal`, `showForgotPassword`, `resetEmailSent`, `activeSection`. |
| **Hooks** | `useAuth` (user, roles, activeRole, signIn, rolesLoaded), `useNavigate`, `useToast`, `useRef` (hasRedirectedRef). |
| **Lógica clave** | Si hay `user` y roles cargados → redirige a `getDashboardPath(roles, activeRole)` (dashboard por rol o `/pending-access`). Si no hay user → muestra landing. |
| **Secciones landing** | `LandingHeader`, `HeroSection`, `ModulesSection`, `SecuritySection`, `WhatIsSection`, `ForWhomSection`, `HowItWorksSection`, `SistemaUPSection`, `SocialCreatorsSection`, `KreoonLiveSection`, `RoadmapSection`, `PricingSection`, `IndividualPlansSection`, `TalentAccessSection`, `TokenSystemSection`, `WhyThisModelSection`, `PrivacySection`, `CTASection`, `LandingFooter`. |
| **Auth en landing** | Modal de login (email/password), enlace “¿Olvidaste tu contraseña?” y mapeo de errores (`mapAuthErrorMessage`). |

---

#### 1.2 `Auth.tsx` — Ruta: `/auth`

| Aspecto | Detalle |
|--------|---------|
| **Ubicación** | `src/pages/Auth.tsx` |
| **Propósito** | Página de login/registro: solo redirige; no muestra formulario. |
| **Hooks** | `useAuth` (user, loading, rolesLoaded, roles), `useNavigate`. |
| **Lógica** | Si hay user y roles cargados → redirige por rol (admin → `/dashboard`, strategist → `/strategist-dashboard`, creator/ambassador → `/creator-dashboard`, editor → `/editor-dashboard`, client → `/client-dashboard`, sin roles → `/pending-access`). Si no hay user → redirige a `/`. |
| **UI** | Mientras resuelve: pantalla centrada con `Loader2` y fondos decorativos. |

---

#### 1.3 `ResetPassword.tsx` — Ruta: `/reset-password`

| Aspecto | Detalle |
|--------|---------|
| **Ubicación** | `src/pages/ResetPassword.tsx` |
| **Propósito** | Flujo de recuperación de contraseña: usuario llega por enlace de correo (type=recovery) y define nueva contraseña. |
| **Estado local** | `booting`, `submitting`, `password`, `confirmPassword`. |
| **Hooks** | `useNavigate`, `useLocation`, `useMemo` (isRecovery desde URL search/hash). |
| **Lógica** | Al montar: si hay `code` en query → `exchangeCodeForSession`; comprueba sesión. Sin sesión → deja de bootear y muestra mensaje. Formulario: validación mínima 6 caracteres y coincidencia; `supabase.auth.updateUser({ password })`; éxito → navegar a `/`. |
| **UI** | Card con título “Cambiar contraseña”, descripción según `isRecovery`, campos nueva contraseña y confirmar, botón “Guardar contraseña” y “Volver”. |

---

#### 1.4 `Register.tsx` — Ruta: `/register`

| Aspecto | Detalle |
|--------|---------|
| **Ubicación** | `src/pages/Register.tsx` |
| **Propósito** | Página de registro: delega todo en el wizard de registro. |
| **Contenido** | Solo renderiza `<RegistrationWizard />` (`src/components/register/RegistrationWizard.tsx`). |
| **Wizard (resumen)** | Pasos según modo: tipo de acceso, tipo de perfil, datos básicos, plan, talent access, confirmación, unirse a org. Si hay `slug` en URL → modo “join_org” y salta al paso de unirse. Redirige a `/` si ya hay user con roles. |

---

#### 1.5 `OrgRegister.tsx` — Ruta: `/org/:slug`

| Aspecto | Detalle |
|--------|---------|
| **Ubicación** | `src/pages/auth/OrgRegister.tsx` |
| **Propósito** | Registro a una organización concreta por slug (página de registro “branded” por org). |
| **Estado local** | `loading`, `submitting`, `organization`, `error`, `showPassword`, `codeVerified`, campos del formulario (`fullName`, `email`, `password`, `confirmPassword`, `inviteCode`, `bio`, `selectedRole`), `formErrors`, `suggestedRole`, `loadingSuggestion`. |
| **Hooks** | `useParams` (slug), `useNavigate`, Supabase (client + lovable para edge functions). |
| **Lógica** | Carga org por slug vía edge function `org-public-info` (fallback a query directa). Valida registro abierto e invite si aplica. Sugerencia de rol vía `suggest-role`. Formulario validado con Zod (`registerSchema`). Alta con Supabase Auth + inserción en `profiles` y `organization_member_roles` (rol por defecto de la org). |
| **UI** | Card con branding (banner, color primario, mensaje de bienvenida desde `registration_page_config`), formulario (nombre, email, contraseña, código de invitación si aplica, bio, rol), botón “Sugerir rol con IA”, enviar y volver. |

---

#### 1.6 `PendingAccess.tsx` — Ruta: `/pending-access`

| Aspecto | Detalle |
|--------|---------|
| **Ubicación** | `src/pages/PendingAccess.tsx` |
| **Propósito** | Usuario autenticado sin acceso aprobado (p. ej. `organization_status === 'pending_assignment'`) o sin roles asignados; muestra estado y opciones. |
| **Estado local** | `organizationName`, `loadingOrg`, `userRole`. |
| **Hooks** | `useAuth` (user, signOut, roles, loading, rolesLoaded, profile), `useNavigate`, `useToast`, Supabase. |
| **Lógica** | Si tiene roles y no está pending → redirige al dashboard según rol. Si no hay user → redirige a `/auth`. Carga nombre de org y rol desde `organizations` y `organization_member_roles`. |
| **UI** | Si tiene org y rol: card con gradiente por rol, bienvenida, aviso “Acceso pendiente de aprobación”, beneficios del rol, email del usuario, botón “Ir a la red social” y cerrar sesión. Vista por defecto: card genérica “Bienvenido a KREOON”, mismo botón a red social y cerrar sesión. `ROLE_INFO` para creator, editor, client, strategist, ambassador, admin. |

---

#### 1.7 `NoOrganization.tsx` — Ruta: `/no-organization`

| Aspecto | Detalle |
|--------|---------|
| **Ubicación** | `src/pages/NoOrganization.tsx` |
| **Propósito** | Admin de plataforma sin organización seleccionada: debe elegir una para acceder a módulos. |
| **Hooks** | `useNavigate`. |
| **UI** | Card con icono Building2, título “Selecciona una organización”, descripción, `RootOrgSwitcher` en área destacada, texto sobre Dashboard/Tablero/Contenido/etc., y botón “Ir a Configuración” (`/settings`). |

---

#### 1.8 `NoCompany.tsx` — Ruta: `/no-company`

| Aspecto | Detalle |
|--------|---------|
| **Ubicación** | `src/pages/NoCompany.tsx` |
| **Propósito** | Usuario (típicamente cliente) cuya cuenta está creada pero aún no asignado a una empresa. |
| **Hooks** | `useAuth` (user, roles, rolesLoaded, loading), `useOrgOwner` (isPlatformRoot, currentOrgId, loading), `useNavigate`. |
| **Lógica** | Si no es client y es admin/team_leader: si es platform root sin org → redirige a `/no-organization`, si no → a `/dashboard`. |
| **UI** | Card “¡Ya casi estás listo!”, mensaje de que un administrador asignará la empresa, sugerencia de explorar la red social, botón “Explorar la red social” (`/social`). |

---

#### 1.9 `Unauthorized.tsx` — Ruta: `/unauthorized`

| Aspecto | Detalle |
|--------|---------|
| **Ubicación** | `src/pages/Unauthorized.tsx` |
| **Propósito** | Página de “sin permisos” cuando el usuario intenta acceder a una ruta no permitida para su rol. |
| **Hooks** | `useAuth` (signOut, roles, isAdmin, isCreator, isEditor, isClient), `useNavigate`. |
| **Lógica** | “Ir a mi panel” según rol: admin → `/`, creator → `/creator-dashboard`, editor → `/editor-dashboard`, client → `/client-dashboard`, otro → `/auth`. |
| **UI** | Card con icono ShieldX, título “Acceso no autorizado”, texto con roles actuales, botón “Ir a mi panel” y “Cerrar sesión”. |

---

#### 1.10 `WelcomeNewMember.tsx` — Ruta: `/welcome`

| Aspecto | Detalle |
|--------|---------|
| **Ubicación** | `src/pages/WelcomeNewMember.tsx` |
| **Propósito** | Pantalla de bienvenida tras registro exitoso: resume rol y organización y ofrece ir al dashboard o a la red social. |
| **Estado local** | `organizationName`, `loadingOrg`. |
| **Hooks** | `useAuth` (user, loading, rolesLoaded, roles), `useNavigate`, `useSearchParams` (role), Supabase. |
| **Lógica** | Rol desde query `role` o primer rol del usuario. Carga nombre de org desde `profiles` + `organizations`. Si no hay user → redirige a `/auth`. |
| **UI** | Card con animaciones (framer-motion), cabecera con gradiente por rol, “¡Registro Exitoso!”, “Bienvenido como [rol]”, nombre de org, descripción del rol, lista de beneficios, botón principal al dashboard del rol y secundario “Explorar la Red Social”. `ROLE_INFO` con `dashboardPath` y `dashboardLabel` por rol. |

---

#### Componentes y lógica compartidos (Módulo 1)

| Componente / hook | Ubicación | Uso |
|-------------------|-----------|-----|
| **ProtectedRoute** | `src/components/ProtectedRoute.tsx` | Envuelve rutas que requieren autenticación y/o roles; redirige a `/auth` o `/unauthorized` según corresponda. |
| **useAuth** | `src/hooks/useAuth.tsx` | Proporciona user, loading, roles, activeRole, rolesLoaded, profile, signIn, signOut, isAdmin, isCreator, isEditor, isClient, etc. |
| **ImpersonationContext** | `src/contexts/ImpersonationContext.tsx` | Contexto para impersonación de usuarios (admin). |
| **ImpersonationBanner** | `src/components/impersonation/ImpersonationBanner.tsx` | Banner que indica que se está impersonando a otro usuario. |
| **RoleSwitcher** | `src/components/layout/RoleSwitcher.tsx` | Selector de rol activo en la barra/layout. |
| **RootOrgSwitcher** | `src/components/layout/RootOrgSwitcher.tsx` | Selector de organización (para admins de plataforma) en layout o en `/no-organization`. |

---

## 2. Dashboard principal (por rol)

| Ruta | Página | Rol | Descripción |
|------|--------|-----|-------------|
| `/dashboard` | `Dashboard.tsx` | admin, team_leader | Panel general (KPIs, resumen) |
| `/strategist-dashboard` | `StrategistDashboard.tsx` | strategist | Panel estratega |
| `/creator-dashboard` | `CreatorDashboard.tsx` | creator | Panel creador |
| `/editor-dashboard` | `EditorDashboard.tsx` | editor | Panel editor |
| `/client-dashboard` | `ClientDashboard.tsx` | client | Panel cliente |

**Componentes:** `src/components/dashboard/` (ActiveSeasonBanner, ClientFinanceChart, DraggableContentCard, GoalsChart, GoalsDialog, KpiListDialog, ReferralStats, TechDashboardCards, TechKpiCard, TechKpiDialog, ThisMonthFilter, UPSystemKPIs, index).

### Estructura detallada del Módulo 2 (por página)

#### 2.1 `Dashboard.tsx` — Ruta: `/dashboard` — Roles: admin, team_leader

| Aspecto | Detalle |
|---------|---------|
| **Ubicación** | `src/pages/Dashboard.tsx` |
| **Propósito** | Centro de comando y métricas para administradores. Vista consolidada de la organización. |
| **Estado local** | `filterClientId`, `filterCreatorId`, `filterEditorId`, `startDateFilter`, `endDateFilter`, `clients`, `creators`, `editors`, `selectedContent`, `kpiDialog`, `listDialog`, `goalsDialogOpen`, `currentGoal`, `allGoals`, `monthlyActuals`, `packages`, `clientsBilling`, `activeClients`, `activeCreators`, `activeEditors`. |
| **Hooks** | `useAuth`, `useOrgOwner`, `useContentWithFilters`, `useToast`, `useCurrency`. |
| **Fuentes de datos** | Supabase: `content`, `clients`, `client_packages`, `organization_members`, `organization_member_roles`, `profiles`, `goals`. Realtime en `clients` y `client_packages`. |
| **Tabs principales** | **Principal** (KPIs org, pipeline contenidos, videos adeudados, resumen financiero, metas vs real), **Financiero** (ingresos COP/USD, recaudado, por cobrar, pagos equipo, utilidad), **UP System** (ActiveSeasonBanner, UPSystemKPIs, placeholder), **Usuarios** (creadores/editores/clientes activos, top creators/editors, ReferralStats). |
| **Secciones** | PageHeader, filtros (cliente/creador/editor, rango fechas), 4 tabs con grids de KPIs, pipeline de estados, GoalsChart, diálogos (ContentDetail, TechKpi, KpiList, Goals). |
| **Componentes hijos** | `PageHeader`, `ThisMonthFilter`, `AmbassadorBadge`, `DashboardKpiCard`, `TechProgress`, `PipelineItem`, `TechSectionHeader`, `TechGrid`, `TechParticles`, `TechOrb`, `StaggerContainer`, `StaggerItem`, `GoalsChart`, `ActiveSeasonBanner`, `UPSystemKPIs`, `CurrencyDisplay`, `ContentDetailDialog`, `TechKpiDialog`, `KpiListDialog`, `GoalsDialog`. |
| **Validar/faltar** | Filtro por org correcto; RLS de `goals`; uso de `useOrgOwner` para contexto; `team_leader` acceso. |

---

#### 2.2 `StrategistDashboard.tsx` — Ruta: `/strategist-dashboard` — Rol: strategist

| Aspecto | Detalle |
|---------|---------|
| **Ubicación** | `src/pages/StrategistDashboard.tsx` |
| **Propósito** | Panel para estrategas: contenido asignado, generador de guiones con IA, progreso. |
| **Estado local** | `allContent`, `products`, `loading`, `selectedContent`, `thisMonthActive`, `generatingScript`, `selectedProductId`, `selectedAngle`, `additionalContext`, `generatedScript`, `kpiDialog`. |
| **Hooks** | `useAuth`, `useToast`. |
| **Fuentes de datos** | Supabase: `content` (eq strategist_id), `products` (filtrado por org). Edge function: `generate-script`. |
| **Secciones** | PageHeader, 5 TechKpiCards (Total Asignados, En Borrador, Guión Aprobado, En Progreso, Completados), card Progreso General, Generador de Guiones con IA (producto, ángulo, contexto, botón generar), Contenido Reciente (lista 6 items). |
| **Componentes hijos** | `PageHeader`, `ThisMonthFilter`, `TechKpiCard`, `TechGrid`, `TechParticles`, `TechOrb`, `ContentDetailDialog`, `TechKpiDialog`. |
| **Validar/faltar** | Rol `strategist` en RLS; edge function `generate-script` y módulo IA; `current_organization_id` para filtrar productos. |

---

#### 2.3 `CreatorDashboard.tsx` — Ruta: `/creator-dashboard` — Rol: creator

| Aspecto | Detalle |
|---------|---------|
| **Ubicación** | `src/pages/CreatorDashboard.tsx` |
| **Propósito** | Panel para creadores: contenido asignado, pagos pendientes, progreso, UP, ranking. |
| **Estado local** | `selectedContent`, `thisMonthActive`, `kpiDialog`. |
| **Hooks** | `useAuth`, `useImpersonation`, `useContent` (targetUserId, 'creator'). |
| **Fuentes de datos** | Hook `useContent` → contenido donde `creator_id = targetUserId`. |
| **Secciones** | TechPageHeader (badge Ambassador, $ pendiente, PortfolioButton), SeasonUrgencyBanner, 6 TechKpiCards (Total Asignados, En Progreso, Aprobados, Embajador, Por Pagar, Pagados), RoleUPWidget + Progreso General, alerta proyectos en progreso, Contenido Reciente (5), RoleLeaderboard, UPHistoryTable. |
| **Componentes hijos** | `TechPageHeader`, `ThisMonthFilter`, `AmbassadorBadge`, `PortfolioButton`, `SeasonUrgencyBanner`, `TechKpiCard`, `TechCard`, `TechCardContent`, `RoleUPWidget`, `RoleLeaderboard`, `UPHistoryTable`, `TechGrid`, `TechParticles`, `TechOrb`, `DataFlowLines`, `NeonText`, `ContentDetailDialog`, `TechKpiDialog`. |
| **Validar/faltar** | Impersonación con `effectiveUserId`; `PortfolioButton` correcto; UP system integrado; ranking por rol. |

---

#### 2.4 `EditorDashboard.tsx` — Ruta: `/editor-dashboard` — Rol: editor

| Aspecto | Detalle |
|---------|---------|
| **Ubicación** | `src/pages/EditorDashboard.tsx` |
| **Propósito** | Panel para editores/productores AV: contenido asignado, por editar, pagos, UP, ranking. |
| **Estado local** | `selectedContent`, `thisMonthActive`, `kpiDialog`. |
| **Hooks** | `useAuth`, `useImpersonation`, `useContent` (targetUserId, 'editor'). |
| **Fuentes de datos** | Hook `useContent` → contenido donde `editor_id = targetUserId`. |
| **Secciones** | PageHeader (Hammer, AmbassadorBadge, $ pendiente, PortfolioButton), SeasonUrgencyBanner, 6 TechKpiCards (Total Asignados, Por Editar, En Edición, Aprobados, Por Pagar, Pagados), RoleUPWidget + Progreso General, alerta “Por Editar”, Contenido Reciente (5), RoleLeaderboard, UPHistoryTable. |
| **Componentes hijos** | `PageHeader`, `ThisMonthFilter`, `AmbassadorBadge`, `PortfolioButton`, `SeasonUrgencyBanner`, `TechKpiCard`, `RoleUPWidget`, `RoleLeaderboard`, `UPHistoryTable`, `TechGrid`, `TechParticles`, `TechOrb`, `ContentDetailDialog`, `TechKpiDialog`. |
| **Validar/faltar** | Impersonación; estados `recorded`/`editing`; PortfolioButton; UP system. |

---

#### 2.5 `ClientDashboard.tsx` — Ruta: `/client-dashboard` — Rol: client

| Aspecto | Detalle |
|---------|---------|
| **Ubicación** | `src/pages/ClientDashboard.tsx` |
| **Propósito** | Portal del cliente: ver contenido, revisar guiones/videos, aprobar, finanzas, productos, datos empresa. |
| **Estado local** | `content`, `packages`, `products`, `clientInfo`, `userClients`, `selectedClientId`, `showClientSelector`, `loading`, `selectedContent`, `selectedProduct`, `feedback`, `submitting`, `activeTab`, `stageFilter`, `showFullscreenReview`, `fullscreenStartIndex`, `showCreateProductWizard`, `isEditingCompany`, `editForm`, `savingCompany`. |
| **Hooks** | `useAuth`, `useImpersonation`, `useToast`, `useClientRealtimeContent`, `updateContentStatusWithUP`. |
| **Fuentes de datos** | Supabase: `clients`, `client_users`, `content`, `client_packages`, `products`, `content_comments`, `profiles`. |
| **Tabs** | **Dashboard** (KPIs, progreso, gráficos, contenido reciente), **Finanzas** (total pagado, videos aprobados, saldo, por pagar, costo/video, gráfico inversión, lista paquetes), **Productos** (CreateProductBriefWizard, grid productos, ProductDetailDialog), **Revisar** (ScriptReviewCard, ReviewCard, guiones/videos pendientes), **Contenido** (ContentList con filtro por etapa, ContentVideoCard), **Empresa** (edición datos empresa). |
| **Componentes hijos** | `ClientFinanceChart`, `PortfolioButton`, `FullscreenContentViewer`, `ReviewCard`, `ContentVideoCard`, `ScriptReviewCard`, `CreateProductBriefWizard`, `ProductDetailDialog`, `TechKpiCard`, `TechGrid`, `TechParticles`, `TechOrb`, `ContentList` (interno). |
| **Validar/faltar** | `client_users` vs legacy `user_id` en clients; selector multi-cliente; realtime content; `ProductDetailDialog` readOnly; `ContentVideoCard` con ratings. |

---

#### Resumen comparativo — Dashboards

| Página | Rol | Tabs | KPIs principales | Diálogos | Datos clave |
|--------|-----|------|------------------|----------|-------------|
| Dashboard | admin, team_leader | 4 (Principal, Financiero, UP, Usuarios) | Contenidos, Ingresos COP/USD, Clientes, Pipeline | ContentDetail, TechKpi, KpiList, Goals | content, clients, packages, goals |
| StrategistDashboard | strategist | 0 | Total, Borrador, Guión, Progreso, Completados | ContentDetail, TechKpi | content (strategist_id), products |
| CreatorDashboard | creator | 0 | Total, Progreso, Aprobados, Embajador, Por Pagar, Pagados | ContentDetail, TechKpi | content (creator_id) |
| EditorDashboard | editor | 0 | Total, Por Editar, Edición, Aprobados, Por Pagar, Pagados | ContentDetail, TechKpi | content (editor_id) |
| ClientDashboard | client | 6 (Dashboard, Finanzas, Productos, Revisar, Contenido, Empresa) | Inversión, Videos, Vistas, Likes, Progreso | Review, ProductDetail, Fullscreen | content, packages, products, clients |

---

#### Checklist de validación — Módulo 2

- [ ] Rutas protegidas por rol en router
- [ ] `useOrgOwner` / org context en Dashboard admin
- [ ] Filtros de fecha y entidad aplican correctamente
- [ ] Realtime en clients/packages (Dashboard) y content (ClientDashboard)
- [ ] RLS de `goals`, `content`, `clients`, `client_packages`, `products`
- [ ] Edge function `generate-script` para StrategistDashboard
- [ ] UP system (ActiveSeasonBanner, UPSystemKPIs, RoleUPWidget, RoleLeaderboard, UPHistoryTable)
- [ ] Impersonación en Creator/Editor dashboards
- [ ] Client multi-empresa (client_users, selector)
- [ ] CreateProductBriefWizard y ProductDetailDialog en ClientDashboard

---

## 3. Proyectos / Board (Kanban)

| Ruta | Página | Rol | Descripción |
|------|--------|-----|-------------|
| `/board` | `ContentBoard.tsx` | admin, editor, creator | Kanban interno |
| `/client-board` | `ClientContentBoard.tsx` | client | Kanban cliente |

**Submódulos / componentes:**
- **Board:** `EnhancedKanbanColumn`, `EnhancedContentCard`, `DraggableContentCard`, `DroppableKanbanColumn`
- **Config:** `BoardConfigDialog` → pestañas: Estados, Permisos, Transiciones, Campos, Visibilidad, Automatizaciones, Notificaciones, Integraciones, Tarjetas, Scripts
- **Config UI:** `board/config/` → ColorPicker, IconPicker, SortableStatusRow
- **Video en tarjetas:** `KanbanCardVideoPreview`, `KanbanVideoModal`
- **Asignaciones:** `UserAssignmentSection`, `AssignUserDropdown`, `UserChip`, `ProjectMetadata`
- **Vistas:** `BoardTableView`, `BoardListView`, `BoardCalendarView`, `BoardViewSwitcher`
- **Otros:** `StatusChangeDropdown`, `CampaignAssignmentDialog`, `MarketingInfoPanel`, `BoardAIPanel`

**Hooks:** `useBoardSettings.ts`, `useContent.ts` (filtros por rol, showOnlyAssigned).

---

## 4. Contenido / Portafolio (CRUD)

| Ruta | Página | Rol | Descripción |
|------|--------|-----|-------------|
| `/content` | `Content.tsx` | admin | Listado y gestión de contenido |

**Submódulos / componentes:**
- **Diálogo detalle:** `ContentDetailDialog/` (index, tipos, hooks)
  - **Tabs:** GeneralTab, ScriptsTab, VideoTab, MaterialTab, TeamTab, DatesTab, PaymentsTab
  - **Scripts:** ScriptsTabContainer, subtabs (Admin, Designer, Editor, IA, Strategist, Trafficker), ScriptAIChat, ProductBriefSection
  - **Config:** ContentConfigDialog → BlocksConfig, AdvancedConfig, PermissionsConfig, StatesConfig, LayoutConfig, TextEditorConfig
  - **Componentes:** ScriptBlock, SectionCard, PermissionsGate
- **Cliente:** `ClientContentDetailDialog.tsx`, `ClientScriptReview.tsx`
- **Crear:** `CreateContentDialog.tsx`
- **Tarjetas / listas:** `ContentVideoCard.tsx`, `MediaCard.tsx`, `ReviewCard.tsx`
- **Video:** `BunnyMultiVideoUploader`, `BunnyVideoUploader`, `BunnyVideoCard`, `BunnyStorageUploader`, `RawVideoUploader`, `RawAssetsUploader`
- **Scripts / IA:** `ScriptGenerator.tsx`, `StrategistScriptForm.tsx`, `ScriptViewer.tsx`, `ScriptReviewCard.tsx`
- **Comentarios:** `CommentsSection.tsx`, `PortfolioCommentsSection.tsx`
- **Otros:** `FullscreenContentViewer`, `FullscreenVideoViewer`, `ContentRatingSection`, `ContentSettingsDialog`, `ThumbnailSelector`, `ContentAIAnalysis`, `AIThumbnailGenerator`, `TeleprompterMode`, `CollaboratorSelector`, `TikTokFeed`, `AutoPauseVideo`

**Hooks:** `useContentDetail`, `useContentCreate`, `useContentPermissions`, `useBlockConfig`, `useScriptPermissions`.

---

## 5. IA / Scripts

| Ruta | Página | Rol | Descripción |
|------|--------|-----|-------------|
| `/scripts` | `Scripts.tsx` | admin, editor, strategist | Generación de guiones y IA |

**Componentes:** `src/components/scripts/` (ScriptDetailPanel, ScriptBlockCard, StandaloneScriptGenerator, etc.).

**Edge Functions:** `generate-script`, `content-ai`, `script-chat`, `multi-ai`, etc.

---

## 6. Marketing

| Ruta | Página | Rol | Descripción |
|------|--------|-----|-------------|
| `/marketing` | `Marketing.tsx` | admin, strategist | Campañas, calendario, clientes marketing |

**Submódulos / componentes:**
- **Dashboard:** MarketingDashboard, MarketingInsights, MarketingTraffic, MarketingStrategy
- **Calendario:** MarketingCalendar, CalendarItemDetailDialog, AddCalendarItemDialog
- **Campañas:** MarketingCampaigns, CampaignDetailDialog, AddCampaignDialog, AssignStrategistDialog
- **Clientes:** MarketingClients, AddMarketingClientDialog, EditMarketingClientDialog, ClientMarketingDashboard
- **Contenido:** MarketingContent, ContentSelector, ContentValidationDialog
- **Reportes:** MarketingReports, AddReportDialog, reportPdfGenerator
- **Otros:** BudgetAlerts, DashboardConfigDialog, MarketingClientSwitcher, UnifiedClientSwitcher, StrategistCompanySwitcher, StrategyProductsSection

---

## 7. UP / Ranking / Puntos

| Ruta | Página | Rol | Descripción |
|------|--------|-----|-------------|
| `/ranking` | `Ranking.tsx` | admin, creator, editor | Leaderboard y puntos UP |
| `/up-documentation` | `UPDocumentation.tsx` | — | Documentación del sistema UP |

**Submódulos / componentes:** `src/components/points/`
- UPWidget, UPUserStats, UPLeaderboardTabs, UPHistoryTable, UPAnalytics, RoleUPWidget, RoleLeaderboard
- AchievementNotificationProvider, SidebarAchievementsWidget
- UPManualAdjustment, UPSeasonHistory, RuleSimulator
- (y resto de componentes de puntos/logros)

**Hooks:** `useAchievements.ts`, `useContentStatusWithUP.ts`.

---

## 8. Network / Social / Portfolio

| Ruta | Página | Descripción |
|------|--------|-------------|
| `/social` | `PortfolioShell.tsx` | Shell con tabs: Feed, Explorar, Guardados, Videos, Perfil |
| `/social/*` | (idem) | Subrutas del portfolio |
| `/explore` | `ExplorePage.tsx` | Explorar contenido público |
| `/company/:username` | `CompanyProfilePage.tsx` | Perfil público de empresa |
| `/profile/:userId` | `PublicProfilePage.tsx` | Perfil público de usuario |

**Submódulos / páginas portfolio:**
- `portfolio/` → FeedPage, ExplorePage, VideosPage, SavedPage, ProfilePage, PublicProfilePage, CompanyProfilePage, CreatorsPortfolioPage
- **Componentes:** FeedGridCard, FeedGridModal, FeedCard, StoryViewer, PortfolioProfile, PortfolioVideoThumbnail, MediaUploader, SmartSearch, EnhancedSmartSearch, etc.

---

## 9. Live streaming (KREOON Live)

| Ruta | Página | Rol | Descripción |
|------|--------|-----|-------------|
| `/live` | `Live.tsx` | admin, strategist | Eventos y streaming |

**Submódulos / componentes:** `src/components/live-streaming/`
- **Tabs:** KreoonOverviewTab, KreoonEventsTab, KreoonChannelsTab, KreoonPackagesTab, KreoonClientsTab, KreoonCreatorsTab, KreoonBillingTab, KreoonProvidersTab, LiveClientSettingsTab, LiveMonitoringTab, AdminPlatformHoursPanel, LivePlatformConfigTab
- **Componentes:** StreamPlayer, LiveStreamingConstants
- **Hooks:** useStreamingAI, useStreamingRealtime

---

## 10. Gestión: Creadores, Clientes, Equipo

| Ruta | Página | Rol | Descripción |
|------|--------|-----|-------------|
| `/creators` | `Creators.tsx` | admin | Listado y gestión de creadores |
| `/clients` | `Clients.tsx` | admin | Listado y gestión de clientes |
| `/team` | `Team.tsx` | admin | Miembros del equipo |

**Submódulos:**
- **Clientes:** `ClientCard`, `ClientDetailDialog`, `ClientPackageDialog`, `ClientSelectorDialog`, `ClientServicesDialog`, `ClientUsersDialog`, `ClientStreamingChannels`, `AssignStrategistsDialog`, `UnassignedClientUsersAlert`
- **Equipo:** componentes en `src/components/team/`
- **Creadores:** lógica en Creators.tsx y componentes relacionados

---

## 11. Configuración (Settings)

| Ruta | Página | Descripción |
|------|--------|-------------|
| `/settings` | `Settings.tsx` | Configuración según permisos (usuario, org, plataforma) |

**Submódulos (SettingsSidebar → secciones):**

**Mi cuenta**
- Perfil (`ProfileSection`)
- Notificaciones (`NotificationsUnifiedSection`)
- Seguridad (`SecuritySection`)
- Tour guiado (`TourSection`)

**Organización**
- Datos (`OrganizationSection`)
- Registro (`OrgRegistrationSettingsSection`, `OrganizationRegistrationsSection`)
- Plan (`OrganizationPlansSection`)
- IA y modelos (`AISettingsSection`, `OrganizationAISection`)
- Embajadores (`AmbassadorsSection`)
- Permisos (`PermissionsUnifiedSection`, `OrganizationPermissionsSection`, `GlobalPermissionsSection`)
- Historial (`AuditLogSection`)
- Red social (`OrgSocialSection`)
- KREOON Live (`LiveStreamingOrgSection`)

**Plataforma (solo root)**
- Organizaciones (`OrganizationRegistrationsSection`)
- Usuarios (`PlatformUsersSection`)
- Referidos (`ReferralSection`)
- Facturación (`BillingUnifiedSection`, `SubscriptionManagementSection`)
- Configuración (`PlatformConfigSection`)
- Administración (`PlatformAdminSection`, `RootAdminSection`)
- Tracking (`TrackingSection`)
- IA Tokenización (`AITokenizationPage` vía sección)
- KREOON Live (`LiveStreamingSection`, `LiveStreamingPlatformSection`)

**Otros:** `AppearanceSection`, `AppSettingsSection`, `CurrencySection`, `IntegrationsSection`, `UserPlansSection`, `PlatformSecuritySection`.

**Archivos:** `SettingsPage.tsx`, `SettingsSidebar.tsx`, `settings/sections/*.tsx`.

---

## 12. Chat y notificaciones

**Chat:** `src/components/chat/`
- ChatButton, ChatPanel, ChatConversationView, ChatListItem, ChatSearchDialog
- EnhancedChatButton, EnhancedChatDrawer, FloatingChatButton
- AIChatPanel, AIAssistantButton
- MentionInput, MessageReactions, LinkPreviewCard, PresenceIndicator, AdminPresencePanel

**Notificaciones:** `src/components/notifications/` (y hooks como useUserNotifications, useChatNotifications).

---

## 13. Productos y estrategia

**Componentes:** `src/components/products/`
- ProductDetailDialog, ProductSelector
- CreateProductBriefWizard
- strategy-tabs (SalesAnglesTab, LeadMagnetsCreativesTab, etc.)

---

## 14. Registro y onboarding

- **Register:** `Register.tsx`, `register/steps/` (ProfileTypeStep, PlanSelectionStep, etc.), `WizardProgress.tsx`
- **Landing:** `LandingHeader`, `LandingSections` en `src/components/landing/`

---

## 15. Layout y navegación global

- **Layout:** `MainLayout.tsx`, `Sidebar.tsx`, `MobileNav.tsx`, `PageHeader.tsx`, `TechPageHeader.tsx`
- **Otros:** `RootOrgSwitcher`, `RoleSwitcher`, `StrategistClientSelector`, `TrialBanner`, `MedievalBanner`, `UpdatePrompt` (PWA)

---

## 16. Infra y compartidos

- **UI:** `src/components/ui/` (shadcn: Button, Card, Dialog, etc.)
- **Contextos:** AuthProvider, BrandingProvider, TrackingContext, TrialContext, UnsavedChangesContext, AICopilotProvider, StrategistClientProvider
- **Integraciones:** `src/integrations/supabase/` (client, types)
- **Hooks globales:** useAuth, useOrgOwner, useTrackingEngine, etc.
- **PWA:** `UpdatePrompt`, service worker, manifest

---

## Orden sugerido para intervenir

1. **Auth y acceso** (login, roles, protección de rutas)
2. **Organizaciones y contexto** (org actual, switcher, permisos por org)
3. **Board / Kanban** (columnas, tarjetas, configuración, RLS ya tocado)
4. **Contenido** (detalle, tabs Material/Video/Scripts, crear, asignaciones)
5. **Scripts / IA** (generación, permisos, Edge Functions)
6. **Marketing** (calendario, campañas, clientes marketing)
7. **UP / Ranking** (puntos, logros, leaderboard)
8. **Portfolio / Social** (feed, explorar, perfiles públicos)
9. **Live** (eventos, canales, paquetes)
10. **Creadores, Clientes, Equipo** (CRUD y diálogos)
11. **Settings** (por sección: perfil, notificaciones, org, plataforma)
12. **Chat y notificaciones**
13. **Productos y estrategia**
14. **Registro y landing**
15. **Layout y navegación**
16. **Infra (tipos, RLS, Edge Functions, PWA)**

Cada módulo se puede abrir por ruta en la app y revisar en consola/Network; para reparar, conviene seguir el checklist de `PLAN_REPARACION_MODULOS.md`.
