# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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
- **Integrations**: n8n automation, GHL sync, Restream, Spotify

### Edge Functions
50+ Supabase Edge Functions (Deno-based serverless) in `supabase/functions/`:
- **Content**: `content-ai`, `board-ai`, `portfolio-ai`, `generate-script`, `analyze-video-content`
- **AI**: `multi-ai`, `up-ai-copilot`, `ai-assistant`, `generate-thumbnail`, `build-image-prompt`
- **CDN**: `bunny-*` functions (upload, download, storage, webhook, thumbnail, portfolio, raw operations, chat)
- **Integrations**: `n8n-proxy`, `ghl-sync`, `spotify-search`, `restream-api`, `streaming-webhook`
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

**7 Roles** (defined in `src/lib/roles.ts`):
1. `admin` - Full system access
2. `team_leader` - Team management
3. `strategist` - Strategy and planning
4. `trafficker` - Paid advertising
5. `creator` - Content creation
6. `editor` - Audio-visual production
7. `client` - Client/customer access

**Role Priority**: admin > team_leader > strategist > trafficker > creator > editor > client

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
├── functions/      # 50+ Edge Functions
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

### Edge Function Development
- All functions in `supabase/functions/[function-name]/`
- Shared utilities in `supabase/functions/_shared/`
- Configure JWT verification in `supabase/config.toml`
- Deno runtime (TypeScript native)

### Bunny CDN Integration
- Video upload: `bunny-upload`, `bunny-raw-upload`, `bunny-portfolio-upload`, `bunny-chat-upload`
- Video download: `bunny-download`, `bunny-raw-download`, `bunny-download-zip`
- Management: `bunny-delete`, `bunny-raw-delete`, `bunny-status`, `bunny-storage`, `bunny-thumbnail`
- Webhooks: `bunny-webhook` (handles CDN callbacks)

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
- Most AI/webhook functions have `verify_jwt = false` for external access
- Protected operations (upload, delete, admin) have `verify_jwt = true`
- RLS policies on all tables

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

Database migrations in `supabase/migrations/` (~16k lines total):
- Main migration: `20251226225342_a5e1ca5d-8216-41f9-8498-2db90d429716.sql`
- Multiple part files (`parte_1.sql` through `parte_10.sql`)
- `migracion_completa.sql`, `fix_migration.sql`

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
