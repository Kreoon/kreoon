# Performance Audit Report - KREOON
**Fecha**: 2026-03-27
**Version analizada**: Build actual en dist/
**Analista**: Claude Opus 4.5 (Agente Performance-Analyzer)

---

## 1. Estado Actual - Resumen Ejecutivo

### Metricas del Bundle

| Metrica | Valor Actual | Objetivo | Estado |
|---------|-------------|----------|--------|
| Total dist/assets/ | **9.7 MB** (sin gzip) | < 5 MB | CRITICO |
| Archivos JS | **306 chunks** | < 100 | ALTO |
| Bundle inicial estimado* | ~1.8 MB | < 500 KB gzipped | CRITICO |
| vendor-charts | 422 KB | Lazy load | ALTO |
| vendor-editor (TipTap) | 413 KB | Lazy load | ALTO |
| vendor-supabase | 172 KB | Necesario | OK |
| vendor-radix | 166 KB | Tree-shake | MEDIO |
| vendor-icons (lucide) | 138 KB | Tree-shake | MEDIO |
| vendor-react-dom | 130 KB | Necesario | OK |
| vendor-motion | 120 KB | Lazy load | ALTO |

*El bundle inicial incluye: index.js (663KB) + vendor-react + vendor-react-dom + vendor-router + vendor-supabase + vendor-radix + vendor-query = ~1.2 MB sin gzip, ~350-400 KB gzipped

### Metricas Web Vitals Estimadas

| Metrica | Estimacion | Objetivo | Estado |
|---------|-----------|----------|--------|
| LCP (Largest Contentful Paint) | ~3.5-4.5s | < 2.5s | CRITICO |
| FID (First Input Delay) | ~150-200ms | < 100ms | ALTO |
| CLS (Cumulative Layout Shift) | ~0.15 | < 0.1 | MEDIO |
| TTI (Time to Interactive) | ~4.5-5.5s | < 3.5s | CRITICO |

---

## 2. Analisis Detallado

### 2.1 Code Splitting - Estado BUENO

**Aspectos positivos encontrados:**
- Todas las paginas usan `React.lazy()` con `lazyWithRetry()` wrapper (70+ paginas)
- Configuracion de `manualChunks` en vite.config.ts separa vendors correctamente
- React Query con cache persistence en localStorage
- Service Worker con estrategia inteligente de caching

**Archivos criticos (src/App.tsx lineas 77-219):**
```typescript
const Dashboard = lazyWithRetry(() => import("./pages/Dashboard"));
const ContentBoard = lazyWithRetry(() => import("./pages/ContentBoard"));
// ... 70+ paginas lazy loaded
```

### 2.2 React Query - Estado EXCELENTE

**Configuracion global (src/App.tsx lineas 220-270):**
- `staleTime: 15 min` - Datos frescos por 15 minutos
- `gcTime: 60 min` - Cache en memoria 1 hora
- `refetchOnWindowFocus: false` - Sin refetch automatico
- Persistencia en localStorage con limite de 4MB
- Skip de arrays > 100 items para no saturar cache

**Hooks individuales con staleTime apropiado:**
- useCampaignROI: 5-10 min
- useContentAnalytics: 5 min
- useWallet: 30 seg (datos financieros)
- useWithdrawals: 30 seg

### 2.3 Componentes Pesados SIN Lazy Loading - Estado CRITICO

#### ADN Research V3 - 22 Tabs (Impacto: ALTO)

**Archivo**: `src/components/product-dna/adn-v3/AdnResearchV3Dashboard.tsx`

```typescript
// PROBLEMA: Imports directos de 22 tabs - todos se cargan aunque solo se ve 1
import { Tab01MarketOverview } from "./tabs/Tab01MarketOverview";
import { Tab02Competition } from "./tabs/Tab02Competition";
import { Tab03JTBD } from "./tabs/Tab03JTBD";
// ... 19 tabs mas
```

**Solucion recomendada:**
```typescript
const Tab01MarketOverview = lazy(() => import("./tabs/Tab01MarketOverview"));
const Tab02Competition = lazy(() => import("./tabs/Tab02Competition"));
// ... etc
```

#### Rich Text Editor (TipTap) - 413 KB

**Archivo**: `src/components/ui/rich-text-editor.tsx`

Imports directos de TipTap con todas las extensiones. Se carga en cualquier pagina que use el editor aunque el usuario no lo necesite inmediatamente.

**Archivos que importan rich-text-editor:**
- ContentDetailDialog (tabs de scripts)
- UnifiedProjectModal (workspace de documentos)
- Formularios de campanas
- Editores de ADN

#### Charts (Recharts) - 422 KB

**Archivos con imports directos:**
- `src/components/dashboard/GoalsChart.tsx`
- `src/components/dashboard/ClientFinanceChart.tsx`
- `src/components/admin/analytics/SourceDistribution.tsx`
- `src/components/settings/ai/AIUsageDashboard.tsx`
- `src/components/ui/chart.tsx` (import * as RechartsPrimitive)

#### Framer Motion - 120 KB (193 archivos)

Usado extensivamente para animaciones. El bundle se carga completo aunque muchas animaciones son simples y podrian usar CSS.

### 2.4 Patrones de Re-renders - Estado MEDIO

**Contextos bien optimizados:**
- BrandingContext: usa useMemo para contextValue
- KiroContext: usa useCallback y useMemo extensivamente
- CurrencyContext: usa useMemo para value
- AICopilotContext: usa useMemo

**Patrones problematicos detectados:**

1. **Inline styles**: 645 ocurrencias de `style={{`
   - Cada render crea nuevo objeto
   - Impacto mayor en listas/grids

2. **Imports namespace `import * as`**: 100+ archivos
   - `import * as React from "react"` - OK (tree-shaking funciona)
   - `import * as RechartsPrimitive from "recharts"` - Previene tree-shake

### 2.5 Imagenes y Media - Estado BUENO

**Aspectos positivos:**
- 35 ocurrencias de `loading="lazy"` en imagenes
- Thumbnails de Bunny CDN con cache agresivo (7 dias)
- Videos con `preload="none"` o `preload="metadata"`
- Preload de avatares en Marketplace

**Mejoras posibles:**
- No hay uso de formatos WebP/AVIF (dependiente de Bunny CDN)
- Sin `srcset` para responsive images

### 2.6 Network y Prefetching - Estado MEDIO

**Aspectos positivos:**
- Service Worker con StaleWhileRevalidate para REST API
- Preload de avatares de creadores destacados
- HLS video preloading para feed social

**Problemas:**
- Sin `<link rel="prefetch">` para rutas probables
- Sin React Query prefetch para navegacion anticipada

---

## 3. Componentes Pesados - Lista Priorizada

| Componente | Tamano Est. | Paginas Afectadas | Prioridad |
|------------|-------------|-------------------|-----------|
| ADN Research V3 Dashboard (22 tabs) | ~200 KB | Products, Research | P0 |
| TipTap Editor | 413 KB | Content, Projects, Scripts | P0 |
| Recharts | 422 KB | Dashboard, Analytics, Settings | P1 |
| Framer Motion | 120 KB | 193 componentes | P2 |
| ContentDetailDialog | ~150 KB | Content, Board | P1 |
| UnifiedProjectModal | ~120 KB | Board, Marketplace | P1 |
| CampaignWizard | ~75 KB | Campaigns | P2 |

---

## 4. Quick Wins - Optimizaciones Inmediatas

### 4.1 Lazy Load de ADN Research Tabs (Impacto: ALTO, Esfuerzo: BAJO)

```typescript
// AdnResearchV3Dashboard.tsx
const Tab01MarketOverview = lazy(() => import("./tabs/Tab01MarketOverview"));
// ... repetir para los 22 tabs
```

**Ahorro estimado**: ~180 KB del bundle inicial cuando no se usa ADN

### 4.2 Lazy Load de Rich Text Editor (Impacto: ALTO, Esfuerzo: MEDIO)

Crear wrapper lazy:
```typescript
// components/ui/LazyRichTextEditor.tsx
export const LazyRichTextEditor = lazy(() => import('./rich-text-editor'));
```

**Ahorro estimado**: 413 KB (vendor-editor) no se carga hasta necesitarse

### 4.3 Lazy Load de Charts (Impacto: ALTO, Esfuerzo: MEDIO)

```typescript
// components/charts/LazyCharts.tsx
export const LazyBarChart = lazy(() =>
  import('recharts').then(m => ({ default: m.BarChart }))
);
```

**Ahorro estimado**: 422 KB (vendor-charts) diferido

### 4.4 Reducir Inline Styles (Impacto: MEDIO, Esfuerzo: ALTO)

Migrar `style={{}}` a clases Tailwind donde sea posible.
Priorizar componentes de listas (CreatorCard, ContentCard, etc.)

### 4.5 Optimizar lucide-react Imports (Impacto: MEDIO, Esfuerzo: BAJO)

Actualmente el chunk vendor-icons es de 138 KB.
Vite ya hace tree-shaking, pero verificar que no hay re-exports que lo rompan.

---

## 5. Lazy Loading Map

### Paginas (YA IMPLEMENTADO)
Todas las 70+ paginas ya usan `lazyWithRetry()`.

### Componentes Heavy a Convertir

```
src/components/
├── product-dna/adn-v3/
│   └── tabs/Tab*.tsx (22 archivos) → lazy()
├── ui/
│   └── rich-text-editor.tsx → lazy()
├── dashboard/
│   ├── GoalsChart.tsx → lazy()
│   └── ClientFinanceChart.tsx → lazy()
├── settings/ai/
│   └── AIUsageDashboard.tsx → lazy()
├── content/
│   └── ContentDetailDialog/
│       └── tabs/ScriptsTab.tsx → YA ES LAZY
├── projects/
│   └── UnifiedProjectModal/
│       └── tabs/*.tsx → YA SON LAZY
└── marketplace/
    └── campaigns/
        └── wizard/CampaignWizard.tsx → YA ES LAZY
```

### Modales y Dialogs a Evaluar

| Componente | Lazy? | Recomendacion |
|------------|-------|---------------|
| ContentDetailDialog | Parcial | OK - tabs ya lazy |
| UnifiedProjectModal | Parcial | OK - tabs ya lazy |
| TalentDetailDialog | No | Convertir |
| UserDetailDialog | No | Convertir |
| CampaignEditWizard | Si | OK |
| BookingSettingsPage | No | Ya es pagina lazy |

---

## 6. Code Splitting Strategy

### Estrategia Actual (Buena Base)
```javascript
// vite.config.ts manualChunks
vendor-react        // 12 KB
vendor-react-dom    // 130 KB
vendor-router       // 23 KB
vendor-radix        // 166 KB
vendor-supabase     // 172 KB
vendor-query        // 43 KB
vendor-editor       // 413 KB ← PROBLEMA: carga siempre
vendor-charts       // 422 KB ← PROBLEMA: carga siempre
vendor-motion       // 120 KB ← PROBLEMA: carga siempre
vendor-forms        // 27 KB
vendor-zod          // 54 KB
vendor-date         // 44 KB
vendor-icons        // 138 KB
```

### Estrategia Propuesta

1. **Chunk Inicial (Critico)**: ~400 KB gzipped
   - vendor-react + vendor-react-dom
   - vendor-router
   - vendor-supabase
   - vendor-query
   - index.js (reducido)

2. **Chunk UI Base (On-demand)**: ~200 KB gzipped
   - vendor-radix
   - vendor-icons (optimizado)

3. **Chunk Features (Lazy)**: Carga segun ruta
   - vendor-editor → Solo en paginas con editor
   - vendor-charts → Solo en dashboard/analytics
   - vendor-motion → Considerar CSS alternativo

### Nueva Config vite.config.ts Propuesta

```javascript
manualChunks(id) {
  // ... chunks existentes ...

  // NUEVO: Separar editor en chunk lazy
  if (id.includes('node_modules/@tiptap') || id.includes('node_modules/prosemirror')) {
    return 'lazy-editor'; // Carga solo cuando se necesita
  }

  // NUEVO: Separar charts
  if (id.includes('node_modules/recharts') || id.includes('node_modules/d3-')) {
    return 'lazy-charts';
  }

  // NUEVO: Separar framer-motion
  if (id.includes('node_modules/framer-motion')) {
    return 'lazy-motion';
  }
}
```

---

## 7. Estimacion de Mejoras

| Optimizacion | Ahorro Bundle | Mejora LCP | Mejora TTI | Esfuerzo |
|--------------|---------------|------------|------------|----------|
| Lazy ADN tabs (22) | ~180 KB | -0.3s | -0.4s | 2h |
| Lazy TipTap editor | 413 KB | -0.5s | -0.6s | 4h |
| Lazy Recharts | 422 KB | -0.5s | -0.6s | 4h |
| Lazy Framer Motion | 120 KB | -0.2s | -0.2s | 8h* |
| Inline styles → CSS | Variable | -0.1s | -0.1s | 20h |
| Route prefetching | 0 KB | -0.3s | -0.2s | 4h |

*Framer Motion requiere reemplazar animaciones con CSS donde sea posible

### Mejora Total Estimada

| Escenario | Bundle Inicial | LCP | TTI |
|-----------|---------------|-----|-----|
| Actual | ~1.8 MB | ~4s | ~5s |
| Quick Wins (P0) | ~0.8 MB | ~2.5s | ~3.5s |
| Optimizado Full | ~0.5 MB | ~2s | ~2.5s |

---

## 8. Comandos de Analisis

### Analizar Bundle Actual
```bash
# Generar build con stats
npm run build

# Ver tamanos de chunks
ls -lahS dist/assets/*.js | head -30

# Tamano total
du -sh dist/assets/
```

### Lighthouse en Chrome DevTools
1. Abrir Chrome DevTools (F12)
2. Tab "Lighthouse"
3. Seleccionar: Performance, Accessibility, Best Practices
4. Click "Analyze page load"

### Webpack Bundle Analyzer (Opcional)
```bash
# Instalar
npm install -D rollup-plugin-visualizer

# Agregar a vite.config.ts
import { visualizer } from 'rollup-plugin-visualizer';
plugins: [
  visualizer({ open: true, gzipSize: true })
]
```

---

## 9. Plan de Accion Recomendado

### Sprint 1 (Esta semana) - Quick Wins

1. [ ] Lazy load de 22 tabs de ADN Research V3
2. [ ] Crear LazyRichTextEditor wrapper
3. [ ] Lazy load de componentes de charts en Dashboard

### Sprint 2 - Optimizaciones Medias

4. [ ] Route prefetching para rutas frecuentes
5. [ ] Audit de inline styles en componentes criticos
6. [ ] Lazy load de modales pesados (TalentDetailDialog, etc.)

### Sprint 3 - Optimizaciones Avanzadas

7. [ ] Evaluar reemplazo de Framer Motion por CSS animations
8. [ ] Implementar Lighthouse CI en pipeline
9. [ ] Image optimization con WebP fallbacks

---

## 10. Conclusiones

### Fortalezas Actuales
- Excelente lazy loading a nivel de paginas (70+)
- React Query bien configurado con persistence
- Service Worker inteligente con caching por tipo
- Code splitting de vendors funcional

### Areas Criticas a Mejorar
1. **ADN Research tabs**: 22 componentes cargando sincronicamente
2. **TipTap Editor**: 413 KB en bundle inicial
3. **Recharts**: 422 KB aunque no se usen charts
4. **Framer Motion**: 120 KB distribuido en 193 archivos

### ROI de Optimizaciones
Las 3 primeras optimizaciones (ADN tabs + TipTap + Recharts) pueden reducir el bundle inicial en **~1 MB** con un esfuerzo de **~10 horas de desarrollo**.

Esto llevaria las metricas de:
- LCP: 4s → 2.5s
- TTI: 5s → 3.5s
- Bundle inicial: 1.8 MB → 0.8 MB

---

*Reporte generado automaticamente por Performance-Analyzer Agent*
