# Páginas de Marketing (futuro: migrar a sitio estático)

Estas páginas son landings públicas de marketing de KREOON.
Ya están lazy-loaded (`lazyWithRetry`) en `src/App.tsx`, cada una en su propio chunk —
no afectan el bundle principal ni la carga de usuarios logueados.

## Plan futuro
Migrar a blog.kreoon.com (Next.js + Strapi headless CMS).
Al migrar, eliminar estas páginas de este repo y las rutas de App.tsx.

## Páginas incluidas
- `/blog` → `BlogPage.tsx` — Blog de KREOON
- `/casos-de-exito` → `CaseStudies.tsx` + `CaseStudyDetail.tsx` — Casos de éxito
- `/calculadora-ugc` → `components/marketplace/calculator/UGCPriceCalculator.tsx` — Calculadora de precios UGC
- `/research/:productId` → `ResearchLanding.tsx` — Landing de resultados de research
- `/mcp-docs` → `MCPDocumentation.tsx` — Documentación MCP (para desarrolladores externos)
- `/up-documentation` → `UPDocumentation.tsx` — Documentación sistema UP Points

## Dependencias
Estas páginas NO deben importar componentes pesados del core (board, kanban, kiro, dashboards).
Solo componentes de UI base (shadcn/ui) y componentes propios de marketing/landing.

`HeroOrbCanvas` (three.js, ~877 kB) se usa en `HomePage.tsx`, `BlogPage.tsx` y
`PortfolioShowcasePage.tsx` — las tres son rutas lazy, así que three.js solo se
descarga cuando alguien visita esas páginas públicas, nunca en el shell logueado.
