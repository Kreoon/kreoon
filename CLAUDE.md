# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Communication & Style
- **Idioma**: Siempre responde en español
- **Git commits**: Escribir mensajes de commit en español
- **Perfil**: Eres un experto en React, TypeScript, Supabase y Tailwind CSS
- **Contexto**: Kreoon es una plataforma SaaS de marketplace creativo para LATAM
- **Prioridades**: Código limpio, tipado estricto y mejores prácticas

## Context7 — Documentación actualizada

**REGLA OBLIGATORIA:** Antes de escribir código que use cualquier librería
del stack, consultar Context7 para obtener la documentación actualizada:

- TanStack Query v5 → query-docs("tanstack query v5")
- Supabase JS → query-docs("supabase javascript")
- shadcn/ui → query-docs("shadcn ui")
- React Hook Form → query-docs("react hook form")
- Deno APIs → query-docs("deno")
- Framer Motion → query-docs("framer motion")

Nunca asumir que la sintaxis del training data es correcta — siempre verificar.

## Project Overview

**KREOON** is a full-stack Progressive Web Application (PWA) that serves as a creative operations management system - an "operating system for creators." It's a multi-tenant SaaS platform managing content creation, talent management, client relationships, team collaboration, social media portfolios, live streaming, and AI-powered features.

## Technology Stack

### Frontend
- **Framework**: React 18.3 + TypeScript 5.8 with Vite 5.4 (SWC compilation)
- **Router**: React Router v6
- **State Management**: TanStack React Query v5 (5min stale time, 10min GC)
- **UI**: shadcn/ui (Radix UI primitives) + Tailwind CSS 3.4
- **Forms**: React Hook Form + Zod validation
- **Rich Text**: TipTap (markdown, tables, images, task lists)
- **PWA**: vite-plugin-pwa with Workbox (network-first caching)

### Backend
- **BaaS**: Supabase (PostgreSQL + Auth + Storage + Edge Functions)
- **CDN**: Bunny CDN (video hosting, file storage)
- **AI**: Multi-provider fallback chain (Perplexity → Gemini → OpenAI)
- **Integrations**: n8n automation, GHL sync, Restream

### Edge Functions
50+ Supabase Edge Functions (Deno-based serverless) in `supabase/functions/`:
- **Content**: `content-ai`, `board-ai`, `portfolio-ai`, `generate-script`, `analyze-video-content`
- **AI**: `multi-ai`, `up-ai-copilot`, `ai-assistant`, `generate-thumbnail`, `build-image-prompt`
- **CDN**: `bunny-*` functions (upload, download, storage, webhook, thumbnail, portfolio, raw operations, chat)
- **Integrations**: `n8n-proxy`, `ghl-sync`, `restream-api`, `streaming-webhook`
- **Automation**: `daily-reminders`, `cleanup-expired-stories`, `cleanup-chat-attachments`, `feed-recommendations`
- **Security**: `security-check`, `admin-users`
- **Other**: `send-invitation`, `notify-*`, `interest-extractor`, `evaluate-profile-tokens`, `suggest-role`

JWT verification is configured per-function in `supabase/config.toml` (project_id: wjkbqcrxwsmvtxmqgiqc).

## Development Commands

```bash
# Development server (runs on localhost:8080)
npm run dev

# Production build
npm run build

# Development build (preserves dev mode)
npm run build:dev

# Linting
npm run lint

# Preview production build
npm run preview
```

## Architecture

### Multi-Tenant Structure
```
Organizations (isolated tenants)
  └── Members (users in org)
      ├── Roles (7 types, multiple per user)
      └── Badges (ambassador status, separate from roles)
```

**Organization Isolation**: Each organization has its own custom statuses, settings, and data enforced by PostgreSQL Row-Level Security (RLS) policies.

### Role-Based Access Control (RBAC)

**8 Roles** (single source of truth: `src/lib/roles.ts`):
1. `admin` - Full system access
2. `content_creator` - Audiovisual and written content creation
3. `editor` - Video/audio editing and post-production
4. `digital_strategist` - Digital marketing strategy and analytics
5. `creative_strategist` - Creative direction and brand concept
6. `community_manager` - Community and social media management
7. `client` - Client/customer access (review and approval)
8. `student` - Global role, Academia-only access, no organization required (express registration, no org membership)

**Role Priority**: admin > content_creator > editor > digital_strategist > creative_strategist > community_manager > client > student

Use canonical role keys everywhere (`content_creator`, not the legacy `creator`) — legacy values still appear in some older `organization_members.role` rows and must be mapped, not perpetuated in new code.

**Ambassador Badge System** (separate from roles):
- Bronze, Silver, Gold levels
- Stored in `organization_member_badges` table
- Not a role - it's a privilege/achievement

### Frontend Provider Stack

Global state managed through React Context providers (nested in `src/main.tsx`):
- `AuthProvider` - Authentication & user management
- `ImpersonationProvider` - Admin impersonation for support
- `AICopilotProvider` - AI features
- `TrackingProvider` - Analytics
- `TrialProvider` - Feature trial management
- `BrandingProvider` - Organization customization
- `UnsavedChangesProvider` - Auto-save functionality

### Directory Structure

```
src/
├── pages/          # Route components (Dashboard, ContentBoard, Creators, Settings, etc.)
├── components/     # Feature-organized UI components (ai/, board/, chat/, clients/, content/, etc.)
├── hooks/          # 50+ custom React hooks (auth, chat, AI, content management)
├── contexts/       # React Context providers
├── lib/            # Utilities, prompts, role definitions, sanitization
├── types/          # TypeScript definitions (database.ts, tracking.ts)
└── integrations/   # External service clients (supabase/)

supabase/
├── migrations/     # Database schema migrations (~16k lines total)
├── functions/      # 150+ Edge Functions
└── config.toml     # Function JWT settings
```

### Path Aliases
- `@/` → `./src/`
- All imports use `@/` prefix (e.g., `@/components`, `@/hooks`, `@/lib`)

## Key Development Patterns

### Database Queries
- Use React Query hooks from `src/hooks/` directory
- Supabase client from `src/integrations/supabase/client.ts`
- RLS policies enforce organization isolation automatically
- Custom statuses per organization (board statuses, content statuses)

### AI Integration
- Multi-provider fallback: Perplexity → Gemini → OpenAI
- AI functions: `multi-ai`, `content-ai`, `board-ai`, `portfolio-ai`, `up-ai-copilot`
- Prompts stored in `src/lib/` directory
- **ADN Recargado (Product DNA research)**: el pipeline real y único en producción es
  `generate-full-research` (21 fases, self-invocation chain, Perplexity+Firecrawl+Gemini+Mistral,
  invocado desde `src/lib/services/product-dna.service.ts`). `adn-orchestrator`, `adn-continue` y
  `adn-orchestrator-lite` eran un árbol paralelo sin ningún caller real (uno de ellos apuntaba a
  `adn-research-v3`, función que nunca existió) — se eliminaron de producción y del repo el 2026-07-05.
  No recrear ese árbol sin confirmar antes que hace falta.

### Edge Function Development
- All functions in `supabase/functions/[function-name]/`
- Shared utilities in `supabase/functions/_shared/`
- Configure JWT verification in `supabase/config.toml`
- Deno runtime (TypeScript native)

### Bunny CDN Integration
- Video upload: `bunny-upload`, `bunny-raw-upload`, `bunny-portfolio-upload`
- Video download: `bunny-download`, `bunny-raw-download`, `bunny-download-zip`
- Management: `bunny-delete`, `bunny-raw-delete`, `bunny-status`, `bunny-storage`, `bunny-thumbnail`
- Webhooks: `bunny-webhook` (handles CDN callbacks)
- Academia (librería Bunny separada): `academy-video-upload-init` (credenciales TUS de subida, solo el instructor del curso), `academy-signed-video-url` (URL firmada de reproducción para lecciones desbloqueadas)
- **CRÍTICO**: la librería de Bunny de Academia usa el secret `BUNNY_ACADEMY_LIBRARY_ID`, NUNCA `BUNNY_LIBRARY_ID` — ese nombre ya lo usan 15+ funciones del módulo de contenido (`bunny-*`, `upload-campaign-media`, `cleanup-expired-stories`, etc.) apuntando a la librería original. Pisar `BUNNY_LIBRARY_ID` con el valor de Academia rompe la subida de video en TODA la plataforma, no solo Academia (incidente real: 2026-07-06)

### Component Patterns
- shadcn/ui components in `src/components/ui/`
- Feature components organized by domain (e.g., `board/`, `content/`, `chat/`)
- Radix UI primitives for accessibility
- Tailwind CSS for styling (custom theme in `tailwind.config.ts`)

### Form Handling
- React Hook Form + Zod schemas
- `@hookform/resolvers` for validation integration

### Real-time Features
- Supabase Realtime for live updates
- Chat with presence and reactions
- Real-time board updates

### Payments
- **Marketplace / paquetes de cliente / hire directo**: Stripe es el ÚNICO gateway. `wompi-webhook` y `mercadopago-webhook` existen en el repo pero están deprecados para este flujo — no agregar lógica nueva ahí.
- **Academia (venta de cursos)**: gateway independiente — Hotmart co-producción sigue activo (`hotmart-webhook`, feature reciente), además de checkout intents propios (`academy_checkout_intents`). No es lo mismo que el financiero general — no asumir que "deprecar Wompi/MP" aplica a Academia.
- **Payout a talento**: manual — el admin registra el método (DolarApp/Mercury) y marca como pagado con comprobante; no hay automatización de payout saliente.

## Important Notes

### Multi-tenancy
- **ALWAYS** filter by `organization_id` in queries
- RLS policies enforce this at database level
- Each org has custom statuses (board, content)
- Never mix data between organizations

### Role vs Badge
- **Roles**: Functional permissions (admin, creator, editor, etc.)
- **Badges**: Achievement status (ambassador bronze/silver/gold)
- Ambassador is NOT a role - stored in separate `organization_member_badges` table
- Users can have multiple roles but one ambassador level

### Security
- JWT verification configured per edge function
- Most AI/webhook functions have `verify_jwt = false` for external access — cuando es así, la función DEBE validar membresía/ownership internamente (patrón `assertOrgMembership` en `_shared/assertOrgMembership.ts`, usado por `content-ai`, `board-ai`, `up-ai-copilot`, `generate-script`, `portfolio-ai`, `generate-full-research`, `generate-project-dna`, `generate-ad-banner`, `intelligence-gatherer`, `script-chat`, `restream-api`, `bunny-raw-download`, `bunny-raw-zip` — antes de esto, un usuario autenticado de CUALQUIER organización podía invocarlas contra datos de otra org)
- Protected operations (upload, delete, admin) have `verify_jwt = true`
- RLS policies on all tables
- Streaming (chat, viewers, reactions): RLS escopeado por sesión/ownership real, no `USING(true)`; webhooks de streaming (`streaming-webhook`, `streaming-webhook-v2`, `cloudflare-live-webhook`) validan firma fail-closed (si el secret no está seteado, rechazan — no dejan pasar)

### Styling
- Dark mode support (class-based theme switching)
- CSS variables for theming (HSL colors)
- Custom animations (20+ keyframes in Tailwind config)
- Level-based colors (bronze/silver/gold/diamond)

### PWA Configuration
- Service worker with prompt-based registration (prevents unwanted auto-reloads)
- Network-first caching for Supabase requests
- 5MB max cache per file
- Offline support with Workbox

### Testing & Linting
- ESLint 9.32 with TypeScript support
- Lenient TypeScript config (no strict null checks, skipLibCheck)
- No automated test suite configured

## Migration Management

Database migrations in `supabase/migrations/`:
- Baseline: `00000000000000_baseline.sql` (esquema inicial)
- 40+ migraciones secuenciales con timestamp `YYYYMMDDHHMMSS_descripcion.sql`
- Áreas activas recientes: gamification (part1–part6), security RLS fixes, trust score, ADN/script flow, MCP infrastructure

When modifying database schema:
1. Always consider multi-tenant isolation
2. Add RLS policies for new tables
3. Test with different roles
4. Ensure organization_id foreign keys

## External Service Dependencies

Required environment variables in `.env`:
- Supabase: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- AI providers: Perplexity, Gemini, OpenAI API keys (in edge functions)
- Bunny CDN: API keys and library IDs
- n8n: Webhook URLs
- GHL: API credentials
- Restream: API keys

## Language & Localization

- Primary language: Spanish (role labels, UI text)
- Ambassador levels: "Embajador Bronce/Plata/Oro"
- Role labels in `src/lib/roles.ts`

## PROTOCOLO CAVEMAN — ahorro de tokens

Regla base: NO re-explorar lo ya sabido.

1. **Ledger primero.** Antes de explorar arquitectura/schema, leer `ARCHITECTURE_LEDGER.md`. Si el dato está ahí, no grep/read para confirmarlo. Confiar en el ledger.
2. **Schema vía MCP, quirúrgico.** Nunca volcar el schema completo. Usar el MCP de Supabase por tabla puntual (`execute_sql` con query a `information_schema.columns`/`pg_policies` filtrado por `table_name`, o `list_tables` en el schema específico). Una tabla a la vez.
3. **Grep antes de Read.** No leer archivos >300 líneas completos. Grep el símbolo/función → leer ventana ±40 líneas. Solo leer completo si el archivo se va a reescribir entero.
4. **Cero reads de confirmación.** No re-leer un archivo recién editado "para verificar que quedó bien" — confiar en el Edit. Solo re-leer si tsc/build falló y apunta ahí.
5. **Verificación al final, en lote.** Un tsc al final de la sesión, no por archivo. Un build si se tocó config. No correr checks intermedios repetidos.
6. **Output telegráfico.** Reporte = bullets de hechos. Cero relleno, cero prosa de cortesía, cero re-explicar lo que ya está en el prompt.
7. **Ledger vivo.** Al descubrir un hecho nuevo de arquitectura (tabla, trigger, bug, convención), apendear una línea en la sección UPDATES de `ARCHITECTURE_LEDGER.md`. Nunca re-descubrir lo mismo dos veces.
8. **No preguntar lo decidible.** Si el prompt trae regla de decisión, decidir y seguir. Solo frenar ante riesgo de pérdida de datos o cuando un check obligatorio falla sin regla.
