# KREOON - Creative Operating System

El sistema operativo creativo. Gestiona creadores, contenido, proyectos y resultados desde una plataforma.

## Project Info

**Production URL**: https://kreoon.app

## How to Edit This Code

### Local Development

Requirements: Node.js & npm - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

```sh
# Clone the repository
git clone <YOUR_GIT_URL>

# Navigate to the project directory
cd kreoon

# Install dependencies
npm i

# Start development server (localhost:8080)
npm run dev
```

### Other Options

- **GitHub**: Edit files directly in the GitHub web interface
- **Codespaces**: Use GitHub Codespaces for cloud-based development

## Project Structure (src/)

```
src/
├── components/
│   ├── ui/          # Base reusable components (shadcn-ui, buttons, cards, etc.)
│   ├── board/       # Kanban, EnhancedContentCard, EnhancedKanbanColumn, BoardConfigDialog
│   ├── dashboard/   # DraggableContentCard, DroppableKanbanColumn, TechKpi*, GoalsChart, etc.
│   ├── content/     # ContentDetailDialog, ReviewCard, ContentVideoCard
│   ├── settings/    # Settings panels (NotificationSettings, Billing, etc.)
│   ├── points/      # UP, achievements, leaderboards, badges
│   ├── portfolio/   # Feed, public profile, social
│   ├── layout/      # MainLayout, PageHeader
│   └── ...
├── hooks/           # Custom hooks (useAuth, useContent, useBoardSettings, etc.)
├── lib/             # utils, statusUtils, edgeFunctions, roles, prompts
├── types/           # database.ts, tracking.ts (centralized TypeScript types)
├── integrations/supabase/  # client.ts, types
├── contexts/        # Auth, Impersonation, Trial, Tracking, Branding, etc.
└── pages/           # Main routes; settings/sections for configuration
```

## Tech Stack

- **Framework**: React 18 + TypeScript + Vite
- **UI**: shadcn-ui + Tailwind CSS
- **Backend**: Supabase (Auth, Database, Edge Functions, Storage)
- **State**: TanStack Query v5
- **CDN**: Bunny CDN

## Deployment

- **Frontend**: Vercel (auto-deploy from GitHub)
- **Edge Functions**: `npx supabase functions deploy <function-name>`
- **Database**: Supabase PostgreSQL

## Commands

```sh
npm run dev      # Development server (localhost:8080)
npm run build    # Production build
npm run lint     # Run ESLint
npm run preview  # Preview production build
```
