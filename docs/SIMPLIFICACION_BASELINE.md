# Línea base pre-simplificación · KREOON

**Fecha:** 2026-08-11
**Rama de trabajo:** `simplificacion-2026`
**Punto de retorno:** tag `pre-simplificacion` sobre `main` (commit `429dd6d9`)
**Proyecto Supabase:** `wjkbqcrxwsmvtxmqgiqc`

Este documento es la foto del "antes". Cuando la simplificación termine, se repiten estas
mismas mediciones y se comparan contra estos números. **En esta sesión no se eliminó nada**:
ni código, ni tablas, ni filas.

---

## 1. Cómo volver atrás si algo sale mal

| Qué quieres recuperar | Cómo |
|---|---|
| Todo el código como estaba hoy | `git checkout pre-simplificacion` |
| Descartar la simplificación entera | `git checkout main` (main quedó intacto) |
| Los datos de una tabla borrada | `backups/pre-simplificacion/` → ver su `README.md` |
| La estructura de una tabla borrada | `backups/pre-simplificacion/schema/01_tables.sql` y siguientes |

El tag `pre-simplificacion` es **local**: aún no está en el remoto. Para que sobreviva a una
pérdida del equipo hay que subirlo con `git push origin pre-simplificacion`.

---

## 2. Build de producción

Comando: `npm run build` · Resultado: **exitoso**, sin errores.

| Métrica | Valor |
|---|---:|
| Tiempo de compilación | 2 min 17 s |
| Archivos generados en `dist/` | 428 |
| Peso total de `dist/` | 23.307.089 bytes (22,2 MB) |
| Chunks JavaScript | 390 |
| Peso total del JavaScript | 13.129.560 bytes (12,5 MB) |
| Archivos CSS | 2 |
| Peso total del CSS | 528.790 bytes (516 KB) |
| Precache del service worker (PWA) | 21 entradas · 2.420,37 KiB |
| Advertencias de Vite | 7 chunks superan los 500 KB |

### Los 15 chunks más pesados

| # | Chunk | Tamaño | Gzip |
|---:|---|---:|---:|
| 1 | `HeroOrbCanvas` | 877,24 kB | 236,22 kB |
| 2 | `dash.all.min` | 854,00 kB | 256,61 kB |
| 3 | `index-pYspTR0m` | 852,52 kB | 241,29 kB |
| 4 | `index-BHysfCOR` | 530,56 kB | 137,56 kB |
| 5 | `hls` | 524,94 kB | 162,41 kB |
| 6 | `vendor-charts` | 503,66 kB | 131,87 kB |
| 7 | `vendor-editor` | 423,01 kB | 133,47 kB |
| 8 | `client-package-invoice-pdf` | 323,81 kB | 68,88 kB |
| 9 | `emoji-picker-react` | 309,10 kB | 74,99 kB |
| 10 | `ContentBoard` | 240,32 kB | 62,51 kB |
| 11 | `ProfileBuilderPage` | 219,66 kB | 57,90 kB |
| 12 | `vendor-supabase` | 193,56 kB | 50,65 kB |
| 13 | `ScriptWorkspace` | 181,20 kB | 50,81 kB |
| 14 | `vendor-radix` | 179,67 kB | 54,03 kB |
| 15 | `OrgCRMFinances` | 171,81 kB | 39,74 kB |

**Dato para medir el éxito de la simplificación:** `dash.all.min` (854 kB) y `hls` (525 kB) son
los reproductores de video en vivo — **1,38 MB sin comprimir que deberían desaparecer completos**
al eliminar live streaming. Otros chunks del alcance: `FeedPage` (73,17 kB), `SocialHubPage`
(68,63 kB), `SeasonBanner` (105,79 kB), `PostComposer` (85,77 kB), `ActivationCampaignConfig`
(75,32 kB).

---

## 3. Tamaño del código fuente

| Métrica | Valor |
|---|---:|
| Rutas declaradas en `src/App.tsx` (`<Route`) | 165 |
| Rutas con `path=` | 164 |
| Páginas (`src/pages/**/*.tsx`) | 160 |
| Componentes (`src/components/**/*.tsx`) | 1.035 |
| Carpetas de primer nivel en `src/components` | 60 |
| Hooks (`src/hooks`) | 224 |
| Archivos `.ts`/`.tsx` en `src` | 1.946 |
| Líneas de código en `src` | 518.084 |
| Edge Functions (`supabase/functions/*`) | 169 |
| Migraciones SQL | 217 |

### Rutas dentro del alcance de la eliminación (24)

`/social`, `/social/*`, `/social-hub`, `/feed`, `/live`, `/live/*`, `/streaming/*`,
`/booking/*`, `/ranking`, `/campanas-gestionadas`, `/marketplace/campaigns`,
`/marketplace/campaigns/:id`, `/marketplace/campaigns/create`,
`/marketplace/campaigns/:id/edit`, `/marketplace/my-campaigns`,
`/marketplace/creator-campaigns`, `/marketplace/campaign-payment/success`,
`/marketplace/campaign-payment/cancel`, `/marketplace/guardados`, `/admin/social-scraper`.

> **Cuidado:** `/academia/:spaceSlug/feed`, `/academia/:spaceSlug/calendar` y las rutas
> `/academia/calendar/*` **NO se tocan**. Son de Academia, que se queda. El nombre "feed" y
> "calendar" ahí no tiene nada que ver con el feed social ni con el módulo de booking.

### Archivos con nombre relacionado al alcance (orientativo, no es la lista de borrado)

| Palabra en el nombre | Archivos `.ts`/`.tsx` |
|---|---:|
| `campaign` | 47 |
| `badge` | 31 |
| `feed` | 21 |
| `social` | 21 |
| `calendar` | 12 |
| `season` | 10 |
| `achievement` | 7 |
| `live` | 6 |
| `stream` | 2 |
| `reputation` | 1 |
| `booking` | 0 |

---

## 4. Tests

**No hay suite de tests automatizados.** Verificado:

- `package.json` no tiene script `test`.
- No hay `vitest` ni `jest` en las dependencias.
- 0 archivos `*.test.*` o `*.spec.*` en todo el repositorio.

**Implicación directa:** la única red contra regresiones es el build de producción y la prueba
manual en la app. Después de cada bloque de eliminación hay que correr `npm run build` y navegar
a mano las rutas que se quedan.

---

## 5. Respaldo de base de datos

Ubicación: `backups/pre-simplificacion/` (fuera de `src/`, no entra al bundle).
Instrucciones completas de restauración: `backups/pre-simplificacion/README.md`.

| Módulo | Tablas respaldadas | Filas |
|---|---:|---:|
| Live streaming | 37 | 19 |
| Social / feed | 24 | 381 |
| UP / reputación | 44 | 85.603 |
| Marketplace de campañas | 15 | 15 |
| Booking | 15 | 6 |
| **Total** | **135** | **86.024** |

Cada tabla tiene un `.json` (para restaurar) y un `.csv` (para leer). Además se respaldó el
esquema completo: `CREATE TABLE`, constraints, índices, políticas RLS y triggers.

Quedan explícitamente fuera del respaldo y del borrado: `creator_profiles`, `portfolio_items`,
`marketplace_projects`, `creator_services`, `marketplace_reputation`, wallets y el módulo financiero.

### Restauración verificada

Se probó el ciclo completo con la tabla `followers`: se reimportó el backup en una tabla
temporal (`_restore_test_followers`), se compararon las 36 filas contra el origen — `EXCEPT`
devolvió 0 diferencias y el `md5` del contenido coincidió exactamente — y la tabla temporal se
eliminó (0 residuos).

---

## 6. Lo que va a bloquear el borrado

Detalle en `backups/pre-simplificacion/schema/06_dependencias.md`.

| Obstáculo | Cantidad |
|---|---:|
| Llaves foráneas entrantes desde tablas que se quedan | 8 |
| Vistas / vistas materializadas dependientes | 2 |
| Funciones de base de datos que mencionan tablas del alcance | 133 |

Las 8 FKs entrantes salen de 7 tablas que sobreviven: `alerts`, `brand_credit_transactions`,
`creatives`, `marketplace_media`, `marketplace_projects`, `portfolio_items`, `scheduled_posts`.
Hay que resolverlas antes de cualquier `DROP TABLE`.

**Función de máximo riesgo:** `admin_delete_user_cascade` toca 31 tablas del alcance. Si se
borran las tablas sin reescribirla, **eliminar un usuario deja de funcionar** (y ese es
justamente el camino que evita usuarios zombis).

---

## 7. Hallazgo colateral del respaldo

23 de las 135 tablas devolvieron `403 permission denied` al leerlas con la llave `service_role`:
les falta `GRANT ALL ... TO service_role`. Se exportaron por el otro camino (rol `postgres`), así
que el respaldo está completo, pero el defecto existe en la base y afectaría a cualquier edge
function que intente leerlas. Queda registrado en el `README.md` del respaldo.

---

## 8. Cómo se repite esta medición al terminar

```bash
npm run build
# dist: (Get-ChildItem dist -Recurse -File | Measure-Object Length -Sum).Sum
grep -c '<Route' src/App.tsx
find src/pages -name '*.tsx' | wc -l
find src -name '*.ts' -o -name '*.tsx' | wc -l
find supabase/functions -maxdepth 1 -type d | tail -n +2 | wc -l
```
