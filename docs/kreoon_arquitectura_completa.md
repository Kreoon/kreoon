# KREOON - Arquitectura Completa de la Plataforma

> **Versión:** 2.0 | **Fecha:** Marzo 2026 | **Autor:** Equipo KREOON

---

## 1. Visión General

**KREOON** es una plataforma SaaS multi-tenant que funciona como un "sistema operativo para creadores". Es una Progressive Web Application (PWA) diseñada para LATAM que gestiona operaciones creativas, incluyendo creación de contenido, gestión de talento, relaciones con clientes, colaboración de equipos, portfolios sociales, streaming en vivo y funcionalidades potenciadas por IA.

### 1.1 Propósito

- **Para Organizaciones:** Gestión completa de equipos creativos, clientes y contenido
- **Para Creadores:** Portfolio profesional, marketplace de servicios, gestión de proyectos
- **Para Marcas:** Acceso a talento creativo, campañas de marketing, colaboraciones
- **Para Clientes:** Dashboard de seguimiento de proyectos y contenido

---

## 2. Stack Tecnológico

### 2.1 Frontend

| Tecnología      | Versión | Propósito                                  |
| --------------- | ------- | ------------------------------------------ |
| React           | 18.3    | Framework UI                               |
| TypeScript      | 5.8     | Tipado estático                            |
| Vite            | 5.4     | Build tool (SWC)                           |
| React Router    | v6      | Navegación                                 |
| TanStack Query  | v5      | Estado del servidor (5min stale, 10min GC) |
| shadcn/ui       | Latest  | Componentes UI (Radix primitives)          |
| Tailwind CSS    | 3.4     | Estilos                                    |
| React Hook Form | Latest  | Formularios                                |
| Zod             | Latest  | Validación                                 |
| TipTap          | Latest  | Editor de texto enriquecido                |

### 2.2 Backend

| Tecnología        | Propósito                                           |
| ----------------- | --------------------------------------------------- |
| Supabase          | BaaS (PostgreSQL + Auth + Storage + Edge Functions) |
| Bunny CDN         | Hosting de video y archivos                         |
| Cloudflare Stream | Live streaming (WebRTC WHIP/WHEP)                   |
| Stripe            | Pagos y suscripciones                               |

### 2.3 Integraciones IA

| Proveedor     | Uso                                 |
| ------------- | ----------------------------------- |
| Perplexity    | Investigación y búsqueda (primario) |
| Google Gemini | Generación y análisis (fallback)    |
| OpenAI        | Generación de contenido (fallback)  |
| fal.ai        | Generación de imágenes              |

### 2.4 Otras Integraciones

- **n8n:** Automatización de workflows
- **GHL (GoHighLevel):** Sincronización CRM
- **Restream:** Multi-plataforma streaming
- **Resend:** Emails transaccionales

---

## 3. Arquitectura Multi-Tenant

```
┌─────────────────────────────────────────────────────────────┐
│                    PLATFORM (Kreoon)                        │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐ │
│  │  Organization A │  │  Organization B │  │  Org C ...  │ │
│  │  ┌───────────┐  │  │  ┌───────────┐  │  │             │ │
│  │  │  Members  │  │  │  │  Members  │  │  │             │ │
│  │  │  ├─ Roles │  │  │  │  ├─ Roles │  │  │             │ │
│  │  │  └─Badges │  │  │  │  └─Badges │  │  │             │ │
│  │  ├───────────┤  │  │  ├───────────┤  │  │             │ │
│  │  │  Clients  │  │  │  │  Clients  │  │  │             │ │
│  │  ├───────────┤  │  │  ├───────────┤  │  │             │ │
│  │  │  Content  │  │  │  │  Content  │  │  │             │ │
│  │  └───────────┘  │  │  └───────────┘  │  │             │ │
│  └─────────────────┘  └─────────────────┘  └─────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### 3.1 Aislamiento de Datos

- **RLS (Row Level Security):** Todas las tablas tienen políticas RLS por `organization_id`
- **Statuses Personalizados:** Cada org tiene sus propios estados de board/contenido
- **Configuración Aislada:** Settings, branding y permisos por organización

---

## 4. Sistema de Roles (RBAC)

### 4.1 Roles Funcionales (8 roles globales)

| Rol           | Etiqueta                 | Color    | Descripción                |
| ------------- | ------------------------ | -------- | -------------------------- |
| `admin`       | Administrador            | Púrpura  | Acceso completo al sistema |
| `team_leader` | Líder de Equipo          | Índigo   | Gestión de equipos         |
| `strategist`  | Estratega & Marketing    | Naranja  | Planificación y estrategia |
| `creator`     | Creador de Contenido     | Púrpura  | Creación de contenido      |
| `editor`      | Editor / Post-Producción | Azul     | Edición audiovisual        |
| `developer`   | Desarrollador            | Cyan     | Desarrollo técnico         |
| `educator`    | Educador                 | Amarillo | Formación y educación      |
| `client`      | Cliente                  | Verde    | Acceso de cliente          |

### 4.2 Prioridad de Roles

```
admin > team_leader > strategist > trafficker > creator > editor > client
```

### 4.3 Sistema de Badges (Embajador)

Los badges son **privilegios/logros**, NO roles funcionales.

| Nivel    | Etiqueta         | Color  |
| -------- | ---------------- | ------ |
| `bronze` | Embajador Bronce | Ámbar  |
| `silver` | Embajador Plata  | Slate  |
| `gold`   | Embajador Oro    | Dorado |

**Tabla:** `organization_member_badges`

---

## 5. Módulos Principales

### 5.1 Dashboard & Content Management

- **Dashboard Principal:** Vista general por rol
- **Content Board (Kanban):** Gestión de contenido con estados personalizables
- **Content Pipeline:** Flujo de producción de contenido

### 5.2 Booking System

- **Tipos de Eventos:** Configuración de citas y sesiones
- **Preguntas Personalizadas:** Formularios dinámicos
- **Políticas de Cancelación:** Reglas de rembolso
- **Recordatorios:** Emails automáticos
- **Integraciones de Calendario:** Google Calendar OAuth2
- **Webhooks:** Notificaciones externas

### 5.3 CRM

- **Clientes:** Gestión de clientes por organización
- **Talentos:** Base de datos de creadores
- **Usuarios:** Gestión de miembros
- **Marcas:** CRM de marcas y empresas

### 5.4 Marketplace

- **Perfiles de Creador:** Portfolios públicos
- **Campañas:** Sistema de campañas con marcas
- **Aplicaciones:** Proceso de aplicación a campañas
- **Proyectos:** Gestión de entregables
- **Reviews:** Sistema de reputación

### 5.5 Streaming V2

- **Live Discover:** Exploración de streams activos
- **Live Broadcast:** Transmisión con Cloudflare Stream
- **Live Viewer:** Visualización de streams
- **Streaming Hub:** Centro de control de streaming
- **Streaming Studio:** Producción en vivo
- **Live Commerce:** Ventas durante streams

### 5.6 Live Hosting

- **Solicitudes:** Sistema de solicitud de hosts
- **Marketplace de Hosts:** Búsqueda de presentadores
- **Asignación por Org:** Asignación interna de hosts

### 5.7 Sistema Financiero Unificado

- **Wallets:** Billeteras unificadas por usuario
- **Escrow:** Sistema de custodia para transacciones
- **Suscripciones:** Gestión vía Stripe
- **Tokens AI:** Balance de tokens para IA
- **Referidos:** Sistema de comisiones por referidos

### 5.8 Sistema de Reputación

- **Eventos de Reputación:** Tracking de acciones
- **Niveles:** Novato → Pro → Elite → Master → Legend
- **Arquetipos:** 43 tipos de roles especializados
- **Trust Scores:** Puntuación de confianza para clientes

### 5.9 Analytics (KAE)

- **Visitantes:** Tracking de usuarios
- **Sesiones:** Gestión de sesiones
- **Eventos:** Captura de eventos
- **Conversiones:** Tracking de conversiones
- **Plataformas:** Integración con Meta, TikTok, Google, LinkedIn

### 5.10 Módulos Adicionales

- **Ad Generator:** Generación de anuncios con IA
- **Ad Intelligence:** Análisis de rendimiento
- **Social Scraper:** Extracción de datos sociales
- **Marketing:** Campañas y métricas
- **Wallet:** Sistema de pagos

---

## 6. Edge Functions (137 funciones)

### 6.1 Categorías Principales

#### AI & Content

- `content-ai`, `board-ai`, `portfolio-ai`
- `multi-ai`, `ai-assistant`, `up-ai-copilot`
- `generate-script`, `generate-thumbnail`
- `analyze-video-content`, `build-image-prompt`

#### CDN (Bunny)

- `bunny-upload`, `bunny-download`, `bunny-delete`
- `bunny-storage`, `bunny-webhook`, `bunny-thumbnail`
- `bunny-portfolio-upload`, `bunny-marketplace-upload`

#### Streaming

- `cloudflare-live-service`, `cloudflare-live-webhook`
- `streaming-hub`, `streaming-webhook-v2`
- `streaming-chat-aggregator`, `streaming-shopping`
- `streaming-obs-bridge`, `live-hosting-service`

#### Booking

- `booking-confirm`, `booking-create`, `booking-reminder`
- `booking-webhook-dispatch`, `booking-webhook-test`
- `calendar-google-auth`, `calendar-google-callback`
- `calendar-google-sync`, `calendar-sync`

#### Financial

- `stripe-webhook`, `subscription-service`
- `escrow-service`, `referral-service`
- `ai-tokens-service`, `wallet-connect`

#### Integrations

- `n8n-proxy`, `ghl-sync`, `restream-api`
- `social-auth`, `social-publish`, `social-metrics`

---

## 7. Branding & Lineamientos Visuales

### 7.1 Paleta de Colores Principal

#### Colores de Marca KREOON

```css
/* Fondos principales */
--kreoon-bg-primary: #0a0a0f; /* Fondo oscuro principal */
--kreoon-bg-secondary: #12121a; /* Fondo secundario */
--kreoon-bg-card: #1a1a24; /* Fondo de tarjetas */

/* Púrpura KREOON (color principal) */
--kreoon-purple-400: #a855f7; /* Claro */
--kreoon-purple-500: #7c3aed; /* Principal */
--kreoon-purple-600: #6d28d9; /* Oscuro */
--kreoon-purple-glow: rgba(124, 58, 237, 0.3);

/* Bordes */
--kreoon-border: rgba(139, 92, 246, 0.2);

/* Texto */
--kreoon-text-primary: #ffffff;
--kreoon-text-secondary: #a1a1aa;
--kreoon-text-muted: #71717a;
```

#### Sistema de Colores HSL (CSS Variables)

**Modo Claro:**

```css
--background: 0 0% 100%;
--foreground: 250 25% 10%;
--primary: 270 90% 50%;
--secondary: 270 20% 93%;
--muted: 250 15% 93%;
--accent: 270 30% 94%;
--destructive: 350 80% 50%;
--success: 150 60% 40%;
--warning: 40 80% 50%;
--info: 210 70% 50%;
```

**Modo Oscuro:**

```css
--background: 250 20% 2%;
--foreground: 0 0% 95%;
--primary: 270 100% 60%;
--secondary: 270 40% 8%;
--muted: 250 15% 8%;
--accent: 270 60% 50%;
```

### 7.2 Colores por Nivel (Gamificación)

| Nivel   | Variable          | Color              |
| ------- | ----------------- | ------------------ |
| Bronze  | `--level-bronze`  | `hsl(30 50% 40%)`  |
| Silver  | `--level-silver`  | `hsl(220 8% 55%)`  |
| Gold    | `--level-gold`    | `hsl(45 80% 45%)`  |
| Diamond | `--level-diamond` | `hsl(200 70% 50%)` |

### 7.3 Colores de Reacciones Sociales

```css
--reaction-love: /* Rosa/Rojo */ --reaction-fire: /* Naranja */
  --reaction-clap: /* Amarillo */ --reaction-wow: /* Púrpura */
  --reaction-sad: /* Azul */;
```

---

## 8. Tipografía

### 8.1 Fuentes Principales

```css
font-family:
  "Inter",
  "Satoshi",
  -apple-system,
  BlinkMacSystemFont,
  "Segoe UI",
  sans-serif;
```

| Uso            | Fuente         |
| -------------- | -------------- |
| Sans (default) | Inter, Satoshi |
| Display        | Inter, Satoshi |
| Body           | Inter, Satoshi |

### 8.2 Escala Tipográfica

| Elemento | Tamaño Desktop | Tamaño Mobile | Peso           | Line Height |
| -------- | -------------- | ------------- | -------------- | ----------- |
| h1       | text-4xl       | text-3xl      | bold (700)     | 1.2         |
| h2       | text-3xl       | text-2xl      | semibold (600) | 1.3         |
| h3       | text-2xl       | text-xl       | semibold (600) | 1.4         |
| h4       | text-lg        | text-lg       | medium (500)   | -           |
| h5, h6   | text-base      | text-base     | medium (500)   | -           |
| body     | text-base      | text-base     | normal (400)   | 1.6         |

### 8.3 Clases de Texto Especiales

```css
/* Texto con gradiente */
.text-gradient {
  background-image: var(--gradient-primary);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

/* Texto con gradiente violeta */
.text-gradient-violet {
  background-image: linear-gradient(
    135deg,
    hsl(282 100% 36%) 0%,
    hsl(282 90% 50%) 100%
  );
}
```

---

## 9. Efectos Visuales

### 9.1 Glassmorphism

```css
/* Glass básico */
.glass {
  backdrop-filter: blur(16px);
  background: hsl(var(--card) / 0.8);
}

/* Glass social */
.glass-social {
  backdrop-filter: blur(16px);
  background: hsl(var(--glass-bg));
  border: 1px solid hsl(var(--glass-border));
}

/* Glass card con gradiente */
.glass-card {
  backdrop-filter: blur(20px);
  background: linear-gradient(
    180deg,
    hsl(0 0% 12% / 0.6) 0%,
    hsl(0 0% 8% / 0.8) 100%
  );
  border: 1px solid hsl(0 0% 100% / 0.06);
  box-shadow: 0 8px 32px hsl(0 0% 0% / 0.3);
}
```

### 9.2 Efectos Glow

```css
/* Glow básico */
.glow {
  box-shadow: var(--shadow-glow);
}

/* Glow violeta */
.glow-violet {
  box-shadow: 0 4px 20px hsl(270 90% 50% / 0.1);
}

/* Glow animado */
.animate-glow-pulse {
  animation: glowPulse 2s ease-in-out infinite;
}
```

### 9.3 Gradientes

```css
/* Gradiente principal */
--gradient-primary: linear-gradient(
  135deg,
  hsl(280 100% 55%) 0%,
  hsl(260 100% 60%) 50%,
  hsl(270 100% 65%) 100%
);

/* Gradiente KREOON */
.bg-kreoon-gradient: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%);

/* Gradiente sutil */
--gradient-subtle: linear-gradient(
  180deg,
  hsl(250 20% 5%) 0%,
  hsl(250 20% 3%) 100%
);
```

---

## 10. Animaciones

### 10.1 Transiciones Micro (150-250ms)

```css
.transition-micro {
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}
.transition-fast {
  transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
}
.transition-smooth {
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}
```

### 10.2 Animaciones Principales

| Nombre         | Duración | Uso                               |
| -------------- | -------- | --------------------------------- |
| `fade-in`      | 0.2s     | Aparición suave                   |
| `fade-up`      | 0.2s     | Aparición con movimiento vertical |
| `scale-in`     | 0.15s    | Aparición con escala              |
| `slide-up`     | 0.2s     | Deslizamiento hacia arriba        |
| `pop-in`       | 0.3s     | Aparición con rebote              |
| `bounce-heart` | 0.4s     | Animación de like                 |
| `glow-pulse`   | 2s       | Pulso de brillo                   |
| `shimmer`      | 2s       | Efecto skeleton loading           |
| `float`        | 3s       | Flotación suave                   |

### 10.3 Animaciones Studio (El Estudio Theme)

```css
.animate-studio-glow {
  animation: studioGlow 3s ease-in-out infinite;
}
.animate-studio-pulse {
  animation: studioPulse 2s ease-in-out infinite;
}
.animate-studio-float {
  animation: studioFloat 3s ease-in-out infinite;
}
.animate-neon-flicker {
  animation: neonFlicker 4s linear infinite;
}
```

---

## 11. Componentes de Diseño

### 11.1 Border Radius

```css
--radius: 1rem; /* Base */
--radius-sm: 0.75rem; /* Pequeño */
--radius-md: 0.875rem; /* Medio */
--radius-lg: 1rem; /* Grande */
--radius-xl: 1.25rem; /* Extra grande */
--radius-2xl: 1.5rem; /* 2x grande */
```

### 11.2 Sombras

```css
/* Sombras base */
--shadow-sm: 0 1px 3px hsl(0 0% 0% / 0.08);
--shadow-md: 0 4px 12px hsl(0 0% 0% / 0.08);
--shadow-lg: 0 8px 24px hsl(0 0% 0% / 0.1);

/* Sombras glow */
--shadow-glow: 0 0 30px hsl(270 90% 50% / 0.08);
--shadow-glow-lg: 0 0 60px hsl(270 90% 50% / 0.1);
--shadow-violet: 0 4px 20px hsl(270 90% 50% / 0.1);

/* Sombras KREOON */
.shadow-kreoon-glow: 0 0 40px rgba(124, 58, 237, 0.3);
.shadow-kreoon-glow-lg: 0 0 60px rgba(124, 58, 237, 0.4);
```

### 11.3 Studio Components

```css
/* Studio Card */
.studio-card {
  background: linear-gradient(
    145deg,
    hsl(250 20% 6% / 0.9),
    hsl(250 20% 3% / 0.98)
  );
  border: 1px solid hsl(270 100% 60% / 0.1);
  backdrop-filter: blur(20px);
}

/* Studio Button Primary */
.studio-button-primary {
  background: linear-gradient(135deg, hsl(270 100% 55%), hsl(280 100% 50%));
  box-shadow: 0 4px 20px hsl(270 100% 60% / 0.4);
}

/* Studio Input */
.studio-input {
  background: hsl(250 20% 6% / 0.8);
  border: 1px solid hsl(270 100% 60% / 0.1);
}
```

---

## 12. Estructura de Directorios

```
kreoon/
├── src/
│   ├── pages/              # Componentes de ruta (50+ páginas)
│   │   ├── admin/          # Panel de administración
│   │   ├── auth/           # Autenticación
│   │   ├── crm/            # CRM (org/platform)
│   │   ├── legal/          # Páginas legales
│   │   ├── live/           # Streaming en vivo
│   │   ├── marketplace/    # Marketplace
│   │   ├── settings/       # Configuraciones
│   │   ├── streaming/      # Streaming V2
│   │   └── unete/          # Landing de registro
│   ├── components/         # Componentes UI organizados por feature
│   │   ├── ui/             # shadcn/ui base components
│   │   ├── ai/             # Componentes de IA
│   │   ├── board/          # Kanban board
│   │   ├── booking/        # Sistema de reservas
│   │   ├── chat/           # Chat y mensajería
│   │   ├── content/        # Gestión de contenido
│   │   ├── crm/            # CRM components
│   │   ├── dashboard/      # Dashboard widgets
│   │   ├── layout/         # Layout (Sidebar, Header)
│   │   ├── live-streaming/ # Componentes de live
│   │   ├── marketplace/    # Marketplace components
│   │   ├── streaming-v2/   # Streaming V2 components
│   │   └── ...
│   ├── hooks/              # 60+ Custom React hooks
│   ├── contexts/           # React Context providers
│   ├── lib/                # Utilidades, prompts, roles
│   ├── modules/            # Módulos feature-complete
│   │   ├── ad-generator/
│   │   ├── ad-intelligence/
│   │   ├── booking/
│   │   ├── marketing/
│   │   ├── social/
│   │   ├── social-scraper/
│   │   └── wallet/
│   ├── types/              # TypeScript definitions
│   └── integrations/       # Clientes de servicios externos
│
├── supabase/
│   ├── migrations/         # 200+ migraciones de DB
│   ├── functions/          # 137 Edge Functions
│   │   └── _shared/        # Utilidades compartidas
│   └── config.toml         # Configuración de JWT
│
├── public/                 # Assets estáticos
├── docs/                   # Documentación
└── ...config files
```

---

## 13. Path Aliases

```typescript
// tsconfig.json / vite.config.ts
{
  "@/": "./src/"
}

// Uso
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { getRoleLabel } from "@/lib/roles";
```

---

## 14. PWA Configuration

### 14.1 Service Worker

- **Estrategia:** Network-first para Supabase
- **Cache:** `supabase-rest-v1` (1h), `supabase-storage-v1` (7d)
- **Límite:** 5MB por archivo
- **Precache:** 14 archivos (~1.2MB)
- **Cache ID:** `kreoon-v3`

### 14.2 React Query

- **Stale Time:** 15 minutos
- **GC Time:** 60 minutos
- **Persistencia:** localStorage (`kreoon-rq-v1`)
- **Max Age:** 1 hora
- **Límite:** 4MB, skip arrays >100 items

---

## 15. Seguridad

### 15.1 Autenticación

- **Proveedor:** Supabase Auth
- **JWT:** Verificación por función en `supabase/config.toml`
- **Sesiones:** Refresh automático

### 15.2 Autorización

- **RLS:** Todas las tablas con políticas por organización
- **RBAC:** Sistema de roles por permission groups
- **Impersonation:** Sistema de simulación para soporte admin

### 15.3 Protección de Funciones

```toml
# Edge Functions con JWT requerido
[functions.bunny-upload]
verify_jwt = true

# Edge Functions públicas (webhooks, APIs externas)
[functions.stripe-webhook]
verify_jwt = false
```

---

## 16. Variables de Entorno

### 16.1 Frontend (Vite)

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

### 16.2 Edge Functions

```env
# AI Providers
PERPLEXITY_API_KEY=
GEMINI_API_KEY=
OPENAI_API_KEY=

# CDN
BUNNY_API_KEY=
BUNNY_LIBRARY_ID=

# Streaming
CLOUDFLARE_ACCOUNT_ID=
CLOUDFLARE_API_TOKEN=
CLOUDFLARE_CUSTOMER_SUBDOMAIN=

# Payments
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_*= (12 price IDs)

# Integrations
GHL_API_KEY=
RESTREAM_API_KEY=
RESEND_API_KEY=

# General
FRONTEND_URL=
SUPABASE_SERVICE_ROLE_KEY=
```

---

## 17. Convenciones de Código

### 17.1 Idioma

- **Código:** Inglés (nombres de variables, funciones, componentes)
- **UI/UX:** Español (labels, mensajes, documentación)
- **Commits:** Español
- **Comentarios:** Español preferido

### 17.2 Naming Conventions

```typescript
// Componentes: PascalCase
export function UserDetailPanel() {}

// Hooks: camelCase con "use" prefix
export function useAuth() {}

// Utilidades: camelCase
export function getRoleLabel() {}

// Constantes: SCREAMING_SNAKE_CASE
const ROLE_LABELS = {};

// Types/Interfaces: PascalCase
interface UserProfile {}
type AppRole = 'admin' | 'creator' | ...;
```

### 17.3 Estructura de Componentes

```typescript
// 1. Imports
import { useState } from 'react';
import { cn } from '@/lib/utils';

// 2. Types/Interfaces
interface Props {}

// 3. Component
export function MyComponent({ prop }: Props) {
  // 3a. Hooks
  const [state, setState] = useState();

  // 3b. Handlers
  const handleClick = () => {};

  // 3c. Render
  return <div />;
}
```

---

## 18. Comandos de Desarrollo

```bash
# Desarrollo local
npm run dev              # Servidor en localhost:8080

# Build
npm run build            # Build producción
npm run build:dev        # Build desarrollo
npm run preview          # Preview build

# Linting
npm run lint             # ESLint

# Supabase
npx supabase db push     # Aplicar migraciones
npx supabase functions deploy <name>  # Deploy función

# Deploy específico sin JWT
npx supabase functions deploy <name> --no-verify-jwt
```

---

## 19. URLs de Producción

| Servicio       | URL                                                    |
| -------------- | ------------------------------------------------------ |
| Frontend       | https://kreoon.com                                     |
| App            | https://app.kreoon.com                                 |
| Supabase       | https://wjkbqcrxwsmvtxmqgiqc.supabase.co               |
| Edge Functions | https://wjkbqcrxwsmvtxmqgiqc.supabase.co/functions/v1/ |

---

## 20. Changelog Reciente (Marzo 2026)

### Streaming V2 + Live

- Sistema completo de streaming con Cloudflare Stream
- WebRTC WHIP/WHEP para baja latencia
- Live commerce con 20% comisión
- Módulo restringido a admins (en construcción)

### Booking System

- Preguntas personalizadas
- Integración Google Calendar
- Sistema de webhooks
- Políticas de cancelación

### CRM Improvements

- Diálogos unificados de talento/usuario
- Mejoras en portfolio section

### Sistema de Prompts AI

- Prompts editables desde UI admin
- Edge Functions leen de DB con cache

---

_Documento generado automáticamente - KREOON Platform_
