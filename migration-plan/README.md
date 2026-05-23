# Migration Plan — Kreoon × UGC Colombia

Carpeta con los artefactos de la **Fase 1: Auditoría y mapeo** del plan de fusión documentado en `C:\Users\SICOMMER SAS\.claude\plans\async-enchanting-cookie.md`.

## Contenido

| Archivo | Propósito | Estado |
| --- | --- | --- |
| `redirects.csv` | Mapa 1-a-1 de URLs públicas (ugccolombia.co + kreoon SPA → kreoon.com Next.js) | Borrador inicial — completar con datos de Search Console |
| `tables-mapping.md` | Mapeo de tablas Supabase UGC → Supabase Kreoon y resolución de conflictos | Borrador — validar con Supabase MCP en Fase 5 |
| `edge-functions-inventory.md` | Inventario de Edge Functions que UGC Next.js consume hoy de Kreoon | Completo — verificar antes del cutover |

## Cómo usar estos archivos

- **Fase 2** (monorepo) y **Fase 3** (rebranding) no dependen de esta auditoría — son seguros de empezar.
- **Fase 4** (DNS switch) usa `redirects.csv` para configurar el middleware Next.js.
- **Fase 5** (Supabase migration) usa `tables-mapping.md` y `edge-functions-inventory.md` para escribir los SQL de migración.
- **Fase 6** (301) re-usa `redirects.csv` directo.

## Cuándo se mueve esto al monorepo

Cuando se cree `kreoon-platform`, esta carpeta se mueve a la raíz del monorepo (`/migration-plan/`) y se mantiene como source of truth durante todo el proceso. Una vez completada la Fase 7, archivar como `docs/history/2026-fusion-ugc.md`.

## Convenciones

- Fechas en formato `YYYY-MM-DD`.
- "URL origen" siempre incluye el dominio completo con `https://` para evitar ambigüedades.
- Códigos de estado HTTP: `301` para redirects permanentes, `410` solo si se decide eliminar contenido sin reemplazo.
