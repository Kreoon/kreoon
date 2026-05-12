# KREOON - Arquitectura y Estructura Completa de la Plataforma

> **Documento generado**: Febrero 2026
> **Versión**: 1.0
> **Propósito**: Documentación exhaustiva de todos los módulos, submódulos, herramientas y funcionamiento de la plataforma KREOON

---

## Tabla de Contenidos

1. [Visión General](#1-visión-general)
2. [Stack Tecnológico](#2-stack-tecnológico)
3. [Arquitectura de Alto Nivel](#3-arquitectura-de-alto-nivel)
4. [Sistema de Roles y Permisos](#4-sistema-de-roles-y-permisos)
5. [Módulo de Páginas (121 páginas)](#5-módulo-de-páginas-121-páginas)
6. [Módulo de Componentes (861 archivos)](#6-módulo-de-componentes-861-archivos)
7. [Hooks y Contextos (100+ hooks)](#7-hooks-y-contextos-100-hooks)
8. [Edge Functions (116 funciones)](#8-edge-functions-116-funciones)
9. [Sistema de Tipos y Utilidades](#9-sistema-de-tipos-y-utilidades)
10. [Base de Datos y Migraciones](#10-base-de-datos-y-migraciones)
11. [Integraciones Externas](#11-integraciones-externas)
12. [Flujos de Negocio Principales](#12-flujos-de-negocio-principales)

---

## 1. Visión General

### ¿Qué es KREOON?

KREOON es una **Progressive Web Application (PWA) full-stack** que funciona como un "sistema operativo para creadores" - una plataforma SaaS multi-tenant para gestión de operaciones creativas en LATAM.

### Funcionalidades Principales

- **Gestión de Contenido**: Flujo Kanban completo desde brief hasta entrega
- **Marketplace Creativo**: Conexión entre marcas y creadores
- **Sistema de Talento**: Gestión de creadores, editores y equipos
- **CRM Integrado**: A nivel organizacional y de plataforma
- **Live Streaming**: Integración con Restream para multi-plataforma
- **IA Generativa**: Scripts, research, thumbnails, matching
- **Sistema de Reputación (UP)**: Gamificación y rankings
- **Analytics (KAE)**: Motor de analytics propio con CAPI
- **Sistema Financiero Unificado**: Escrow, referidos, wallets, suscripciones
- **White Label**: Dominios personalizados y branding

---

## 2. Stack Tecnológico

### Frontend

| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| React | 18.3 | Framework UI |
| TypeScript | 5.8 | Tipado estático |
| Vite | 5.4 | Build tool (SWC) |
| React Router | v6 | Navegación |
| TanStack React Query | v5 | Estado servidor (15min stale, 60min GC) |
| shadcn/ui | - | Componentes base (Radix UI) |
| Tailwind CSS | 3.4 | Estilos |
| React Hook Form | - | Formularios |
| Zod | - | Validación |
| TipTap | - | Editor rich text |
| vite-plugin-pwa | - | PWA + Workbox |

### Backend

| Tecnología | Propósito |
|------------|-----------|
| Supabase | BaaS (PostgreSQL + Auth + Storage + Edge Functions) |
| Deno | Runtime para Edge Functions |
| Bunny CDN | Video hosting y file storage |
| Stripe | Pagos y suscripciones |
| Resend | Email transaccional |

### Proveedores de IA

| Proveedor | Uso |
|-----------|-----|
| Perplexity | Research principal (10+ pasos) |
| Gemini | Generación de contenido |
| OpenAI | Fallback y generación de imágenes |
| Anthropic | Fallback |

### Integraciones

| Servicio | Propósito |
|----------|-----------|
| n8n | Automatización de workflows |
| GoHighLevel | Sincronización CRM |
| Restream | Multi-platform streaming |
| Meta/TikTok/Google/LinkedIn CAPI | Server-side conversions |
| Apify | Web scraping |
| Mercury | Payouts a creadores |

---

## 3. Arquitectura de Alto Nivel

### Estructura Multi-Tenant

```
Organizations (tenants aislados)
  └── Members (usuarios en org)
      ├── Roles (7 tipos base + 36 marketplace, múltiples por usuario)
      ├── Badges (sistema embajador, separado de roles)
      └── Clients (clientes de la org)
          └── Products (productos/briefs)
              └── Content (contenido en producción)
```

### Aislamiento de Datos

- **Row-Level Security (RLS)** en todas las tablas
- Filtrado obligatorio por `organization_id`
- Cada organización tiene sus propios:
  - Estados de contenido
  - Estados de board
  - Configuraciones
  - Miembros y permisos

### Stack de Providers (React Context)

```typescript
AuthProvider (useAuth)
  ↓
AnalyticsProvider (useAnalytics - KAE)
  ↓
BrandingProvider (white-label + branding)
  ↓
CurrencyProvider (modelo Airbnb - USD interno)
  ↓
TrialProvider (gestión de trial/billing)
  ↓
ImpersonationProvider (soporte admin)
  ↓
UnsavedChangesProvider (auto-save)
  ↓
VideoPlayerProvider (1 video a la vez)
  ↓
StrategistClientProvider (solo estrategas)
  ↓
KiroProvider (asistente IA 3D)
  ↓
App
```

---

## 4. Sistema de Roles y Permisos

### Roles del Sistema (8 roles base)

| Rol | Prioridad | Descripción |
|-----|-----------|-------------|
| `admin` | 1 | Acceso completo al sistema |
| `team_leader` | 2 | Gestión de equipos |
| `strategist` | 3 | Estrategia y planificación |
| `trafficker` | 4 | Publicidad pagada |
| `creator` | 5 | Creación de contenido |
| `editor` | 6 | Producción audiovisual |
| `client` | 7 | Acceso cliente |
| `developer` | - | Desarrollo técnico |
| `educator` | - | Educación y formación |

### Roles del Marketplace (36 especializados)

**Content Creation (12 roles)**
- ugc_creator, lifestyle_creator, micro_influencer, nano_influencer, macro_influencer
- brand_ambassador, live_streamer, podcast_host, photographer
- copywriter, graphic_designer, voice_artist

**Post-Production (7 roles)**
- video_editor, motion_graphics, sound_designer, colorist
- director, producer, animator_2d3d

**Strategy & Marketing (10 roles)**
- content_strategist, social_media_manager, community_manager
- digital_strategist, seo_specialist, email_marketer
- growth_hacker, crm_specialist, conversion_optimizer

**Technology (3 roles)**
- web_developer, app_developer, ai_specialist

**Education (2 roles)**
- online_instructor, workshop_facilitator

**Client (2 roles)**
- brand_manager, marketing_director

### Grupos de Permiso (6 grupos)

Los 44 roles se mapean a 6 grupos de permiso para simplificar la autorización:

```typescript
admin      → Administrador
team_leader → Líder de equipo
creator    → Creador (incluye 12 roles de content creation)
editor     → Editor (incluye 7 roles de post-production)
strategist → Estratega (incluye 10 roles de strategy/marketing)
client     → Cliente
```

### Sistema de Embajadores (Badge, NO rol)

| Nivel | Nombre | Descripción |
|-------|--------|-------------|
| bronze | Embajador Bronce | Nivel inicial |
| silver | Embajador Plata | Nivel medio |
| gold | Embajador Oro | Nivel máximo |

Almacenado en tabla `organization_member_badges`, separado del sistema de roles.

---

## 5. Módulo de Páginas (121 páginas)

### Distribución por Categoría

| Categoría | Cantidad | Descripción |
|-----------|----------|-------------|
| Páginas raíz | 21 | Dashboard, Content, Clients, etc. |
| Autenticación | 5 | Login, registro, recuperación |
| Dashboards por rol | 8 | Vista específica por rol |
| Marketplace - Campañas | 7 | Feed, detalle, wizard |
| Marketplace - Talento | 5 | Perfiles, listas, contratación |
| Portfolio & Perfiles | 6 | Perfiles públicos, feed |
| Pagos | 4 | Success/cancel pages |
| Legal | 3 | Privacidad, términos, GDPR |
| CRM - Organización | 5 | Dashboard, contactos, finanzas |
| CRM - Plataforma | 7 | Gestión centralizada |
| Admin | 1 | Tokenización IA |
| Settings | 42 | 2 contenedores + 40 secciones |

### Páginas Principales

#### HomePage.tsx - Landing Principal
- Hero section con propuesta de valor
- Secciones: LogosSection, ValuePropositionSection, HowItWorksSection
- FeaturesSection, TestimonialsSection, PricingSection, CTASection
- AuthModal para registro/login inline
- Redirige usuarios autenticados a su dashboard

#### Dashboard.tsx - Panel Central
- DateRangePresetPicker para filtros
- ClientMetricsPanel / TalentMetricsPanel
- Métricas de contenido y actividad
- Vista diferenciada por rol

#### ContentBoard.tsx - Tablero Kanban
- Sistema de Esferas (Engage, Solution, Remarketing, Fidelize)
- Drag & drop con DnD Kit
- Máximo 8 tarjetas por columna
- Filtros, búsqueda, vista por proyecto
- Integración con sistema UP (reputación)

#### Marketing.tsx - Centro de Marketing
- 6 tabs: Dashboard, Contenido, Campañas, Tráfico, Reportes, Insights IA
- UnifiedClientSwitcher para cambio rápido de cliente
- Integración con métricas de redes sociales

#### Live.tsx - Live Streaming
- Integración con Restream
- Gestión de canales y eventos
- Métricas en tiempo real
- Configuración de multi-plataforma

#### Settings.tsx - Configuración Completa

**Secciones de Usuario (8)**
- ProfileSection (7 sub-tabs), AppearanceSection, SecuritySection
- AppSettingsSection, UserPlansSection, ReferralSection
- SubscriptionManagementSection, TourSection

**Secciones de Organización (14)**
- OrganizationSection, PermissionsSection, PlansSection
- AISection, RegistrationsSection, MarketplaceSection
- AgencyProfileSection, ReferralsSection, LiveStreamingSection
- BillingUnifiedSection, NotificationsUnifiedSection, etc.

**Secciones de Plataforma (9)**
- PlatformConfigSection, SecuritySection, AdminSection
- UsersSection, RootAdminSection, AISettingsSection
- IntegrationsSection, CurrencySection, LiveStreamingPlatformSection

### Dashboards por Rol

| Dashboard | Rol | Características |
|-----------|-----|-----------------|
| ClientDashboard | client | Vista de contenido del cliente |
| CreatorDashboard | creator | Proyectos y métricas personales |
| EditorDashboard | editor | Cola de edición y entregas |
| StrategistDashboard | strategist | KPIs y panel de estrategia |
| MarketplaceDashboard | - | Métricas del marketplace |
| MarketplaceKanban | - | Vista kanban de proyectos |

### Marketplace Pages

```
/campaigns                    → CampaignsFeedPage (feed público)
/campaigns/:id                → CampaignDetailPage
/campaigns/create             → CampaignWizardPage (lazy loaded)
/brand/campaigns              → BrandCampaignsPage (gestión marca)
/creator/campaigns            → CreatorCampaignsPage
/case-studies                 → CaseStudies (galería)
/case-studies/:id             → CaseStudyDetail
```

### CRM Pages

**Organización**
- /crm/org/dashboard
- /crm/org/contacts
- /crm/org/creators
- /crm/org/finances
- /crm/org/pipelines

**Plataforma**
- /crm/platform/dashboard
- /crm/platform/creators
- /crm/platform/organizations
- /crm/platform/users
- /crm/platform/leads
- /crm/platform/finances
- /crm/platform/email-marketing

---

## 6. Módulo de Componentes (861 archivos)

### Distribución por Dominio

| Directorio | Archivos | Propósito |
|------------|----------|-----------|
| ui/ | 52 | Componentes base shadcn/ui |
| points/ | 33 | Sistema de reputación UP |
| marketplace/ | 29+ | Sistema de contratación |
| content/ | 28+ | Gestión de contenido |
| settings/ | 39+ | Panel de configuración |
| marketing/ | 26 | Centro de marketing |
| board/ | 20+ | Sistema Kanban |
| portfolio/ | 36 | Portfolios públicos |
| crm/ | 24+ | CRM empresarial |
| studio/ | 13 | Gamificación "El Estudio" |
| dashboard/ | 15 | Paneles de análisis |
| kiro/ | 10+ | Asistente IA 3D |
| live-streaming/ | 20+ | Streaming en vivo |

### Componentes UI Base (52)

**Layouts**
- accordion, collapsible, tabs, drawer, sheet, scroll-area

**Inputs**
- input, textarea, checkbox, radio-group, slider, switch, toggle, input-otp

**Selección**
- select, searchable-select, command, dropdown-menu, popover

**Diálogos**
- dialog, alert-dialog

**Datos**
- table, chart, calendar, date-range-preset-picker

**Información**
- badge, avatar, alert, card, progress, skeleton

**Financieros (Feb 2026)**
- Price (display con conversión automática)
- PriceInput (input con USD interno)

### Sistema de Puntos / Reputación (33 archivos)

**Widgets**
- UPWidget, RoleUPWidget, QualityScoreWidget, SidebarAchievementsWidget

**Gestión**
- UPControlCenter, UPManualAdjustment, UPRulesBuilder
- UPAIPanel, UPLevelsManager, UPPermissionsEditor

**Rankings**
- UPSeasonLeaderboard, UPSeasonHistory, UPLeaderboardTabs
- RoleLeaderboard, UPHistoryTable

**Logros**
- AchievementsShowcase, AchievementBadge, AchievementUnlockToast

### Marketplace (29+ archivos raíz)

**Subdirectorios**
- `profile/` (14) - Perfiles de creadores
- `org-profile/` (11) - Perfiles organizacionales
- `campaigns/` - Wizard, management, activation, applications, feed
- `roles/` (3) - Sistema de 8 roles financieros
- `hiring/` (6) - Sistema de contratación
- `dashboard/` - Paneles de marca/creador
- `kanban/` - Vista kanban de proyectos
- `talent-lists/` - Listas de talento guardadas
- `case-studies/` - Estudios de caso
- `calculator/` - Calculadora de comisiones

### Contenido (28+ archivos)

**Diálogos principales**
- ContentDetailDialog (con 8+ tabs)
- ClientContentDetailDialog
- CreateContentDialog
- ContentSettingsDialog

**Video**
- BunnyVideoUploader, BunnyMultiVideoUploader, RawVideoUploader
- FullscreenContentViewer, FullscreenVideoViewer

**Scripts**
- ScriptGenerator, ScriptViewer, ScriptReviewCard

**Thumbnails**
- ThumbnailSelector, AIThumbnailGenerator

### Board/Kanban (20 archivos)

**Vistas**
- EnhancedKanbanColumn, BoardCalendarView, BoardTableView
- BoardListView, BoardViewSwitcher, MarketplaceBoardView

**Tarjetas**
- EnhancedContentCard, KanbanCardVideoPreview
- UserChip, UserAssignmentSection

**Configuración**
- BoardConfigDialog, ColorPicker, IconPicker, SortableStatusRow

### KIRO - Asistente IA 3D (10+ archivos)

**Core**
- KiroWidget (widget flotante)
- Kiro3D (modelo 3D animado)
- KiroChat, KiroActions, KiroGame
- KiroNotificationPanel

**Subdirectorios**
- `chat/` - MarkdownRenderer, TypingIndicator, MessageFeedback
- `hooks/` - useMouseTracking, useKiroPersistence, useKiroNotifications
- `config/` - zoneActions (8 zonas de la plataforma)
- `animations/` - Animaciones y efectos
- `agentic/` - Motor proactivo de sugerencias

---

## 7. Hooks y Contextos (100+ hooks)

### Contextos Globales (10)

#### AuthContext / useAuth
- **Estado**: user, session, profile, roles[], activeRole
- **Funciones**: signIn, signUp, signOut, hasRole, setActiveRole
- **Booleans**: isAdmin, isCreator, isEditor, isClient, isStrategist

#### AnalyticsContext / useAnalytics (KAE)
- **Estado**: visitorContext, eventQueue, session
- **Funciones**: track, trackPageView, trackConversion, identify
- **Tracking**: UTMs, click IDs (fbclid, gclid, ttclid), page duration

#### BrandingContext / useBranding
- **Estado**: branding (logo, colors, name), resolved_org_id
- **Efectos**: CSS variables, favicon, theme-color, PWA manifest
- **Realtime**: Escucha cambios en app_settings

#### CurrencyContext / useCurrency (Modelo Airbnb)
- **Estado**: displayCurrency, ratesMap
- **Funciones**: convertFromUsd, convertToUsd, formatPrice, setDisplayCurrency
- **Regla**: Todo interno en USD, display en moneda del usuario

#### KiroContext / useKiro (MASIVO)
- **Estado**: kiroState (8 estados), expression (6 expresiones)
- **Zonas**: 8 zonas de la app (sala-de-control, camerino, etc.)
- **Mensajes**: pendingMessages, chatHistory (persistido)
- **Gamificación**: userPoints, currentLevel, progress
- **Agéntico**: platformSyncState, proactiveSuggestions
- **Voz**: TTS engine integrado

#### ImpersonationContext
- **Estado**: isImpersonating, impersonationTarget
- **Funciones**: startImpersonation, stopImpersonation
- **Restricción**: Solo ROOT_ADMIN_EMAIL

#### TrialContext
- **Estado**: isTrialActive, isExpired, daysRemaining, isReadOnly
- **Lógica**: isReadOnly = billingEnabled && isExpired

#### UnsavedChangesContext
- **Estado**: changedKeys, hasUnsavedChanges, isSaving
- **Funciones**: markAsChanged, markAsSaved, saveAll
- **Efectos**: beforeunload warning, localStorage backup

### Hooks Críticos

#### useProfile
- Gestión de perfil con 50+ campos
- Upload de avatar/cover a Supabase Storage
- Validación de username async
- Sincronización bidireccional con clients table

#### useUnifiedTokens
- Balance de tokens IA (subscription, purchased, bonus)
- Consumo atómico via RPC `consume_ai_tokens`
- Compra via Stripe Checkout
- Caching: 5min balance, 1h costs

#### useUnifiedReputation
- Sub-hooks: useOrgRanking, useUserReputation, useUserEvents
- Niveles: Novato(0) → Pro(500) → Elite(2000) → Master(5000) → Legend(15000)
- 43 role_archetypes para normalización

#### useContent (via RPCs)
- **CRÍTICO**: No usa `.from('content')` directo
- RPCs SECURITY DEFINER: get_org_content, get_content_by_id, update_content_by_id
- Bypass de 18 RLS policies que causaban timeout

#### useOrgOwner
- Module-level cache (5min TTL)
- Deduplicación in-flight
- RPC `get_user_org_context()`

### Otros Hooks Importantes

| Hook | Propósito |
|------|-----------|
| useOrgAssignableUsers | Creadores + editores asignables |
| useExchangeRates | Tasas de cambio USD → X |
| useBoardSettings | Configuración del kanban |
| usePortfolioItems | CRUD portfolio + Bunny CDN |
| useUnifiedEscrow | Gestión de escrow |
| useReferralProgram | Programa de referidos |
| useMarketplaceStats | Estadísticas marketplace |
| useCreatorProfile | Perfil marketplace |
| useInternalBrandClient | Cliente interno de marca (singleton) |

---

## 8. Edge Functions (116 funciones)

### Distribución por Categoría

| Categoría | Cantidad | JWT Required |
|-----------|----------|--------------|
| AI y Generación | 15 | Mixto |
| Investigación | 9 | Mayoría No |
| CDN Bunny | 19 | Mayoría Sí |
| Autenticación | 13 | Mixto |
| Finanzas | 9 | Mixto |
| Analytics | 13 | Mayoría No |
| Integraciones | 11 | Mixto |
| Chat | 4 | Mixto |
| Automatización | 6 | No |
| Migraciones | 7 | No |
| Utilitarios | 5 | No |
| Marketing | 3 | Sí |

### AI y Generación de Contenido

| Función | JWT | Propósito |
|---------|-----|-----------|
| multi-ai | No | Multi-proveedor fallback (Gemini → OpenAI → Anthropic) |
| content-ai | No | Scripts, análisis, chat, mejoras con Perplexity |
| board-ai | No | Asistente IA para tableros |
| portfolio-ai | No | Descripciones de portafolios |
| up-ai-copilot | No | Copiloto para sistema UP |
| generate-script | No | Scripts de video |
| build-image-prompt | Sí | Prompts para DALL-E |
| generate-thumbnail | Sí | Thumbnails con IA |
| talent-ai | Sí | Matching de talento |
| ai-creator-matching | Sí | Scoring de creadores |
| ai-assistant | Sí | Asistente contextual por rol |

### Investigación y Análisis

| Función | Propósito |
|---------|-----------|
| product-research | 12-step DNA analysis con Perplexity |
| generate-product-dna | DNA del producto |
| generate-full-research | Research completo (12 pasos) |
| generate-client-dna | Análisis del cliente |
| generate-project-dna | DNA del proyecto |
| analyze-video-content | Hooks, CTA, ad copy |
| interest-extractor | Keywords y intereses |

### CDN Bunny (19 funciones)

**Upload**
- bunny-upload, bunny-upload-v2 (video stream)
- bunny-raw-upload (storage directo)
- bunny-portfolio-upload
- bunny-marketplace-upload
- bunny-chat-upload

**Download**
- bunny-download, bunny-download-v2
- bunny-raw-download
- bunny-download-zip

**Gestión**
- bunny-delete, bunny-delete-v2, bunny-raw-delete
- bunny-status, bunny-status-v2
- bunny-storage, bunny-thumbnail, bunny-thumbnail-v2
- bunny-webhook (transcoding callbacks)

### Sistema Financiero

| Función | JWT | Propósito |
|---------|-----|-----------|
| ai-tokens-service | No | Balance, compra, consumo de tokens |
| subscription-service | No | Gestión de suscripciones |
| stripe-webhook | No | Handler de eventos Stripe |
| escrow-service | No | Fondos en garantía |
| referral-service | No | Programa de referidos |
| campaign-checkout | No | Checkout para campañas |
| wallet-process-withdrawal | Sí | Procesar retiros |
| wallet-mercury-payout | Sí | Payouts Mercury |
| update-exchange-rates | No | Tasas de cambio |

### Analytics (KAE)

| Función | Propósito |
|---------|-----------|
| kae-track | Batch de eventos |
| kae-identify | Merge anonymous → user |
| kae-conversion | Forward a Meta/TikTok/Google/LinkedIn CAPI |
| kae-test-connection | Test de plataformas |
| marketing-metrics | Métricas de marketing |
| feed-recommendations | Recomendaciones de feed |
| ad-intelligence | Scraping + análisis de ads |

### Integraciones Externas

| Función | Servicio | Propósito |
|---------|----------|-----------|
| ghl-sync | GoHighLevel | Sincronización CRM |
| n8n-proxy | n8n | Proxy para automations |
| restream-api | Restream | Multi-platform streaming |
| streaming-webhook | - | Eventos de streaming |
| resend-webhook | Resend | Eventos de email |
| resend-domain-management | Resend | Dominios white-label |
| email-marketing-service | Resend | Email marketing |
| social-publish | Multiple | Publicar en redes |
| social-scheduler | Multiple | Programar publicaciones |

---

## 9. Sistema de Tipos y Utilidades

### Archivos de Tipos (17 archivos)

#### database.ts - Tipos Core
- `AppRole` - 44 roles (8 base + 36 marketplace)
- `ContentStatus` - 14 estados del flujo
- `Profile` - 50+ campos de perfil
- `Content` - Metadata completa de contenido
- `STATUS_LABELS`, `STATUS_COLORS`, `STATUS_ORDER`

#### unified-finance.types.ts - Sistema Financiero (~500 líneas)
- 9 enums principales (WalletType, TransactionStatus, EscrowStatus, etc.)
- 30+ interfaces (UnifiedWallet, UnifiedTransaction, EscrowHold, etc.)
- Request/Response types para edge functions

#### marketplace.ts - Marketplace
- `ServiceType` - 48 tipos de servicio
- `CreatorService`, `MarketplaceProposal`, `MarketplaceReview`
- Labels e icons en español

#### crm.types.ts - CRM (~900 líneas)
- Lead Management (6 enums, 10+ interfaces)
- Organization CRM (8 enums, 15+ interfaces)
- Detail Interfaces (FullUserDetail, FullCreatorDetail)

#### analytics.ts - KAE
- `UTMParams`, `ClickIds`, `VisitorContext`
- `AnalyticsEvent`, `EventPayload`, `EventBatch`
- Configuración de plataformas ad

### Constantes Financieras (finance/constants.ts - 495 líneas)

```typescript
// Comisiones por tipo de proyecto
COMMISSION_RATES = {
  marketplace_direct: 25%,
  campaigns_managed: 30%,
  live_shopping: 20%,
  professional_services: 25%,
  corporate_packages: 35%
}

// Split interno (post-comisión)
INTERNAL_SPLIT = {
  creator: 70%,
  editor: 15%,
  organization: 15%
}

// Referidos (perpetuos)
REFERRAL_RATES = {
  subscription_commission: 20%,
  transaction_commission: 5%
}

// Tokens IA por acción (40+ acciones)
AI_TOKEN_COSTS = {
  'research.full': 600,
  'scripts.generate': 120,
  'talent.suggest_creator': 120,
  // ... DEFAULT_COST: 40
}

// 9 planes de suscripción
SUBSCRIPTION_PLANS = [
  { segment: 'marcas', plans: [free, starter, pro, business] },
  { segment: 'creadores', plans: [free, pro] },
  { segment: 'agencias', plans: [starter, pro, enterprise] }
]

// 8 monedas soportadas
SUPPORTED_CURRENCIES = ['USD', 'COP', 'MXN', 'PEN', 'CLP', 'ARS', 'BRL', 'EUR']
```

### Roles y Permisos (roles.ts + permissionGroups.ts)

```typescript
// Mapeo de 44 roles → 6 grupos de permiso
getPermissionGroup(role: AppRole): PermissionGroup

// Helpers
getRoleLabel(roleId) // → "UGC Creator"
getRoleGroup(roleId) // → "content_creation"
hasPermissionGroup(role, group) // → boolean

// 7 Role Areas
type RoleArea =
  | 'content_creation'
  | 'post_production'
  | 'strategy_marketing'
  | 'technology'
  | 'education'
  | 'client'
  | 'system'
```

### Utilidades (src/lib/)

| Archivo | Funciones |
|---------|-----------|
| utils.ts | `cn()` - Combina clases Tailwind |
| formatters.ts | formatDate, formatCurrency, formatCompactNumber, truncate, slugify |
| sanitizeHTML.ts | Sanitización XSS con DOMPurify |
| edgeFunctions.ts | Referencia de edge functions |
| ai/prompts/ | Prompts centralizados (base, scripts, board, talent, up) |
| reputation/ | Factory pattern para calculadores |
| white-label/ | Domain resolver, feature gates |

---

## 10. Base de Datos y Migraciones

### Tablas Principales

**Multi-tenancy**
- `organizations` - Tenants
- `organization_members` - Usuarios en orgs
- `organization_member_roles` - Roles por usuario
- `organization_member_badges` - Badges de embajador

**Contenido**
- `clients` - Clientes/marcas
- `products` - Productos/briefs
- `product_research` - Research de IA (12 pasos)
- `content` - Contenido en producción
- `content_comments`, `content_history`

**Marketplace**
- `creator_profiles` - Perfiles de creadores
- `portfolio_items` - Items de portfolio
- `marketplace_campaigns` - Campañas
- `campaign_applications` - Aplicaciones
- `marketplace_projects` - Proyectos
- `project_deliveries` - Entregas
- `creator_reviews` - Reviews

**Financiero**
- `unified_wallets` - Billeteras
- `unified_transactions` - Transacciones
- `escrow_holds` - Escrow
- `platform_subscriptions` - Suscripciones
- `withdrawal_requests` - Retiros
- `referral_relationships`, `referral_codes`, `referral_earnings`
- `ai_token_balances`, `ai_token_transactions`

**Reputación (UP)**
- `reputation_seasons` - Temporadas
- `unified_reputation_config` - Configuración
- `role_archetypes` - 43 arquetipos
- `reputation_events` - Eventos
- `user_reputation_totals` - Totales por usuario
- `marketplace_reputation` - Reputación pública

**Analytics (KAE)**
- `kae_visitors` - Visitantes
- `kae_sessions` - Sesiones
- `kae_events` - Eventos (particionado mensual)
- `kae_conversions` - Conversiones
- `kae_ad_platforms` - Configuración de plataformas
- `kae_platform_logs` - Logs de envío

### Migraciones Notables

| Migración | Propósito |
|-----------|-----------|
| 20260208100000 | Marketplace infrastructure (9 tablas, 33 RLS) |
| 20260210000000 | Unified Reputation Engine |
| 20260217100000 | KAE Analytics Engine |
| 20260218000000 | Unified Financial System (11 tablas) |
| 20260224000000 | Display Currency (modelo Airbnb) |

### Patrones RLS Críticos

```sql
-- NUNCA usar TO public para SELECT con subqueries auth-only
-- SIEMPRE usar TO authenticated
CREATE POLICY "select_policy" ON content
FOR SELECT TO authenticated
USING (
  organization_id = (SELECT organization_id FROM organization_members WHERE user_id = auth.uid())
  OR client_id IN (SELECT client_id FROM client_users WHERE user_id = auth.uid())
);

-- SIEMPRE agregar GRANTs en nuevas tablas
GRANT ALL ON new_table TO authenticated;
GRANT ALL ON new_table TO service_role;
NOTIFY pgrst, 'reload schema';
```

---

## 11. Integraciones Externas

### Proveedores de IA

| Proveedor | Endpoint | Uso Principal |
|-----------|----------|---------------|
| Perplexity | sonar-reasoning-pro | Research (10+ pasos) |
| Gemini | gemini-2.0-flash | Generación rápida |
| OpenAI | gpt-4o | Fallback + DALL-E |
| Anthropic | claude-3-opus | Fallback |

### Pagos y Finanzas

| Servicio | Uso |
|----------|-----|
| Stripe | Suscripciones, pagos, payouts |
| Mercury | Payouts a creadores (ACH) |
| PayU | Pagos locales LATAM |
| MercadoPago | Pagos locales LATAM |

### CDN y Storage

| Servicio | Uso |
|----------|-----|
| Bunny Stream | Video hosting con transcoding |
| Bunny Storage | Archivos raw |
| Supabase Storage | Avatars, attachments |

### Marketing y CRM

| Servicio | Uso |
|----------|-----|
| GoHighLevel | Sincronización de leads/clientes |
| n8n | Automatización de workflows |
| Resend | Email transaccional |

### Redes Sociales

| Servicio | Uso |
|----------|-----|
| Meta CAPI | Conversiones server-side |
| TikTok CAPI | Conversiones server-side |
| Google GA4 MP | Medición de protocolo |
| LinkedIn CAPI | Conversiones B2B |
| Restream | Multi-platform streaming |

### Scraping y Data

| Servicio | Uso |
|----------|-----|
| Apify | Web scraping de social media |

---

## 12. Flujos de Negocio Principales

### Flujo: Brief → Research → Contenido

```
1. Cliente crea Product Brief (CreateProductBriefWizard)
   ↓
2. INSERT en tabla `products`
   ↓
3. Trigger invoca `product-research` edge function
   ↓
4. 12 pasos de research con Perplexity:
   - Market Overview
   - JTBD Analysis
   - Competition Analysis
   - Avatar Segmentation
   - ESFERA Strategy
   - Sales Angles
   - PUV Transformation
   - Lead Magnets
   - Video Creatives
   - 30-Day Calendar
   - Launch Strategy
   - Executive Summary
   ↓
5. Guarda en `product_research`
   ↓
6. Wizard crea contenido por fase ESFERA:
   - Engage (awareness)
   - Solution (consideration)
   - Remarketing (retargeting)
   - Fidelize (retention)
```

### Flujo: Contenido Kanban

```
Estados del flujo:
draft → script_pending → script_approved → assigned → recording → recorded
→ editing → delivered → issue? → corrected → review → approved → paid

Cada cambio de estado:
1. Actualiza `content.current_status`
2. Inserta en `content_history`
3. Trigger de reputación (reputation_events)
4. Notificación a usuarios relevantes
```

### Flujo: Marketplace Campaign

```
1. Marca crea campaña (CampaignWizardPage)
   ↓
2. INSERT en `marketplace_campaigns`
   ↓
3. Configuración de budget (fixed/auction/range)
   ↓
4. Publicación en feed
   ↓
5. Creadores aplican (campaign_applications)
   ↓
6. Marca revisa y selecciona
   ↓
7. Checkout con Stripe (campaign-checkout)
   ↓
8. Fondos en escrow (escrow_holds)
   ↓
9. Creación de proyecto (marketplace_projects)
   ↓
10. Entregas y milestones (project_deliveries)
    ↓
11. Aprobación → Release de escrow
    ↓
12. Distribución: Creator 70%, Editor 15%, Org 15%
    + Comisión plataforma (25-35%)
    + Comisión referidos (si aplica)
```

### Flujo: Sistema de Reputación (UP)

```
1. Acción del usuario (entrega, review, etc.)
   ↓
2. logReputationEvent() inserta en `reputation_events`
   ↓
3. Trigger `trg_reputation_totals` actualiza `user_reputation_totals`
   ↓
4. Cálculo de nivel:
   - Novato: 0-499
   - Pro: 500-1999
   - Elite: 2000-4999
   - Master: 5000-14999
   - Legend: 15000+
   ↓
5. Sync a `marketplace_reputation` para perfil público
```

### Flujo: Analytics (KAE)

```
1. Usuario navega la app
   ↓
2. useAnalytics captura:
   - UTMs de URL
   - Click IDs (fbclid, gclid, ttclid)
   - Page views con duration
   - Eventos custom
   ↓
3. Batch cada 3s a kae-track
   ↓
4. Edge function procesa:
   - Upsert visitor
   - Upsert session
   - Insert events
   ↓
5. Conversiones importantes → kae-conversion
   ↓
6. Forward a plataformas (Meta CAPI, etc.)
```

---

## Apéndice: Estadísticas del Proyecto

| Métrica | Valor |
|---------|-------|
| Páginas | 121 |
| Componentes | 861 archivos en 42 directorios |
| Hooks | 90+ |
| Contextos | 10 |
| Edge Functions | 116 |
| Roles | 44 (8 base + 36 marketplace) |
| Tablas principales | 50+ |
| Migraciones | 200+ |
| Integraciones | 15+ servicios externos |
| Monedas soportadas | 8 |
| Proveedores IA | 4 |

---

## Notas para Desarrolladores

### Anti-patterns a Evitar

1. **NO hardcodear roles** - usar `getPermissionGroup()`
2. **NO hardcodear comisiones** - importar de `finance/constants.ts`
3. **NO usar `.from('content')` directo** - usar RPCs SECURITY DEFINER
4. **NO usar `.in()` con >50 valores** - usar JOINs server-side
5. **NO usar `TO public` en RLS** con subqueries auth-only

### Best Practices

1. **Siempre filtrar por `organization_id`**
2. **Usar `cn()` para clases Tailwind**
3. **Usar formatters.ts para output de usuario**
4. **Agregar GRANTs en nuevas tablas**
5. **Usar React Query para caching**
6. **Documentar cambios en CLAUDE.md**

---

*Documento generado automáticamente. Para actualizaciones, ejecutar el análisis de arquitectura nuevamente.*
