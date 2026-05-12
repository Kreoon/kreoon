# Frontend Audit Report - Kreoon

**Fecha**: 2026-03-27
**Auditor**: Claude Opus 4.5
**Scope**: Board/Kanban, Content, Marketplace modules

---

## Resumen Ejecutivo

| Area | Score | Critico | Alto | Medio | Bajo |
|------|-------|---------|------|-------|------|
| **Board/Kanban** | 7/10 | 0 | 3 | 5 | 4 |
| **Content** | 6/10 | 1 | 5 | 8 | 3 |
| **Marketplace** | 5/10 | 2 | 7 | 10 | 5 |
| **Hooks** | 8/10 | 0 | 1 | 3 | 2 |

**Score General**: 6.5/10

---

## 1. TypeScript Issues

### 1.1 Casting `as any` - ALTO

Se encontraron **75+ instancias** de `as any` casting que evitan el type-checking.

#### Board Module (12 instancias)
| Archivo | Linea | Problema |
|---------|-------|----------|
| `BoardAIPanel.tsx` | 367 | `setActiveTab(v as any)` - Tab type deberia ser union literal |
| `EnhancedContentCard.tsx` | 143, 148, 229, 231, 416, 437 | Multiple accesos a props no tipadas de `Content` |
| `KanbanCardVideoPreview.tsx` | 24, 29 | Same issue - `video_urls`, `bunny_embed_url` no en tipo |
| `MarketplaceBoardView.tsx` | 137-146 | `profile as any` - `active_brand_id`, `active_role` faltantes |

**Recomendacion**: Extender interface `Content` en `types/database.ts`:
```typescript
interface Content {
  // Existentes...
  video_urls?: string[];
  bunny_embed_url?: string;
  hooks_count?: number;
  raw_video_urls?: string[];
}
```

#### Content Module (50+ instancias)
| Archivo | Instancias | Problema Principal |
|---------|------------|---------------------|
| `ContentDetailDialog.tsx` | 15 | Props no tipadas: `editor_guidelines`, `is_published` |
| `ClientContentDetailDialog.tsx` | 10 | `video_urls`, `hooks_count`, `editor_guidelines` |
| `ContentVideoCard.tsx` | 12 | `creator`, `editor`, ratings |
| `ClientScriptReview.tsx` | 8 | `change_requests`, `designer_guidelines` |
| `ContentAIAnalysis.tsx` | 4 | Error handling + sphere_phase |

#### Marketplace Module (30+ instancias)
| Archivo | Problema |
|---------|----------|
| `OrgAgencyProfileForm.tsx` | 6x `supabase as any` - DB tipos faltantes |
| `AIRecommendations.tsx` | 5x criteria casting |
| `ProjectDetailModal.tsx` | 8x `supabase as any` |
| `GalleryLightbox.tsx` | 10x Supabase queries sin tipos |
| `OrgProfilePage.tsx` | 12x mapping sin tipos |

### 1.2 Variables Tipo `any` - MEDIO

```typescript
// ContentVideoCard.tsx:271
const actions: { status: ContentStatus; label: string; icon: any; ... }[]

// ClientScriptReview.tsx:600
icon: any;

// useContent.ts:29
let contentData: any[] = [];

// MarketplaceDashboardTab.tsx:35-97
kpis: (stats: any) => [...],
quickActions: (navigate: any) => [...]
```

**Recomendacion**: Crear types especificos para estas estructuras.

### 1.3 Supabase Client Sin Tipos - CRITICO (Marketplace)

Multiples archivos usan `(supabase as any)` para evitar errores de tipos:

```typescript
// OrgProfilePage.tsx:51, 65, 70, 76, 78, 141, 157
const { data } = await (supabase as any).from('tabla')...
```

**Causa raiz**: `types/database.ts` no incluye todas las tablas del marketplace.

**Recomendacion**: Regenerar tipos con `supabase gen types typescript`.

---

## 2. Memory Leaks Potenciales

### 2.1 useEffect Sin Cleanup - ALTO

#### BoardConfigDialog.tsx:153-168
```typescript
useEffect(() => {
  if (!open || !organizationId) return;
  const loadContentCounts = async () => {
    const { data } = await supabase.from("content")...
    setContentCountsByStatus(counts);
  };
  loadContentCounts();
}, [open, organizationId]);
// FALTA: AbortController para cancelar fetch si desmonta
```

#### MarketingInfoPanel.tsx:82-87
```typescript
useEffect(() => {
  if (!content || !open) {
    setCampaign(null);
    return;
  }
  // async fetch sin cleanup
}, [content, open]);
```

#### CampaignWizard.tsx:172-199
```typescript
useEffect(() => {
  if (!editCampaignId) return;
  let cancelled = false; // OK - tiene flag
  (async () => {
    // ... fetch
    if (cancelled) return;
    // ...
  })();
  // FALTA: return () => { cancelled = true; }
}, [...]);
```

### 2.2 Timers Sin Cleanup - MEDIO

#### BunnyVideoCard.tsx:139-153
```typescript
useEffect(() => {
  if (isPlaying && !viewTracked.current && onView) {
    viewTimerRef.current = setTimeout(() => {
      onView();
    }, 3000);
  }
  // Cleanup correcto en linea 155-163
}, [isPlaying, onView]);
```

### 2.3 Event Listeners - OK

`useBoardPersistence.ts` tiene cleanup correcto:
```typescript
useEffect(() => {
  document.addEventListener('visibilitychange', handleVisibilityChange);
  window.addEventListener('beforeunload', handleBeforeUnload);

  return () => {
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    window.removeEventListener('beforeunload', handleBeforeUnload);
    if (debounceRef.current) clearTimeout(debounceRef.current);
  };
}, [isDirty, forceSave]);
```

### 2.4 IntersectionObserver - OK

`AutoPauseVideo.tsx` hace cleanup correcto:
```typescript
useEffect(() => {
  const observer = new IntersectionObserver(...);
  observer.observe(containerRef.current);
  return () => observer.disconnect();
}, []);
```

---

## 3. Performance Issues

### 3.1 Re-renders Innecesarios - ALTO

#### BoardCalendarView.tsx:49-59
```typescript
const contentByDate = useMemo(() => {
  const map = new Map<string, Content[]>();
  content.forEach(c => {
    if (c.deadline) {
      const dateKey = toDateKeyInTz(c.deadline, orgTz);
      // ...
    }
  });
  return map;
}, [content]); // FALTA: orgTz en deps
```

#### BoardListView.tsx - Sin Memoizacion
```typescript
// Linea 105-110: groupedContent se recalcula en cada render
const groupedContent = content.reduce((acc, c) => {
  const key = getGroupKey(c);
  if (!acc[key]) acc[key] = [];
  acc[key].push(c);
  return acc;
}, {} as Record<string, Content[]>);
// Deberia ser useMemo con [content, groupBy]
```

#### MarketplaceBoardView.tsx:153-157
```typescript
const columns = useMemo(() => {
  if (isCreator || isFreelancer) return CREATOR_COLUMNS;
  if (isEditor) return EDITOR_COLUMNS;
  return BRAND_COLUMNS;
}, [isCreator, isEditor, isFreelancer]); // OK
```

### 3.2 Callbacks Sin useCallback - MEDIO

#### BoardListView.tsx
```typescript
// Lineas 72-102: getGroupKey y getGroupLabel son funciones inline
// Se recrean en cada render
const getGroupKey = (c: Content): string => { ... };
const getGroupLabel = (key: string): string => { ... };
```

### 3.3 Lazy Loading - OK

`ContentDetailDialog/index.tsx` implementa lazy loading correctamente:
```typescript
const ScriptsTab = lazy(() => import('./tabs/ScriptsTab'));
const VideoTab = lazy(() => import('./tabs/VideoTab'));
// etc.
```

`MarketplaceBoardView.tsx`:
```typescript
const UnifiedProjectModal = lazy(() => import('@/components/projects/UnifiedProjectModal'));
```

### 3.4 Expensive Computations - MEDIO

#### CreatorProfilePage.tsx
```typescript
// dbToCreatorFullProfile hace muchas transformaciones
// Se llama via useMemo - OK
const creator = useMemo(() => {
  if (dbData) return dbToCreatorFullProfile(dbData);
  return null;
}, [dbData]);
```

---

## 4. React Patterns

### 4.1 Props Drilling - MEDIO

`EnhancedKanbanColumn.tsx` recibe 10 props, algunas podrian agruparse:
```typescript
interface EnhancedKanbanColumnProps {
  id: string;
  title: string;
  color: string;
  count: number;
  children: ReactNode;
  isDropTarget?: boolean;
  canDrop?: boolean;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onDragEnter: () => void;
}
```

**Recomendacion**: Crear `DragHandlers` type:
```typescript
interface DragHandlers {
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onDragEnter: () => void;
}
```

### 4.2 State Colocation - OK

Los hooks estan bien organizados:
- `useBoardPersistence` - localStorage state
- `useBoardSettings` - org settings
- `useContent` - content fetching con realtime

### 4.3 Error Boundaries - FALTA

No se encontraron error boundaries especificos para estos modulos.

**Recomendacion**: Agregar boundaries en:
- `ContentDetailDialog` - maneja muchos sub-componentes
- `MarketplaceBoardView` - tiene lazy loading
- `CampaignWizard` - multiple steps con state

---

## 5. Hooks Analysis

### 5.1 useBoardPersistence.ts - 9/10
- Cleanup de event listeners
- Debounce con ref
- Manejo de visibility change
- **Issue menor**: No invalida cache cuando cambia organizationId muy rapido

### 5.2 useBoardSettings.ts - 8/10
- Multiples queries bien organizadas
- **Issue**: No tiene AbortController en fetchAll
- Loading/error states correctos

### 5.3 useContent.ts - 8/10
- RPC optimizado (`get_org_content`)
- Profile cache con refs
- Realtime integration
- **Issue**: `any[]` en varias partes

### 5.4 useMarketplaceCampaigns.ts - 7/10
- Tipos bien definidos
- **Issue**: `mapCampaignRow(row: any, ...)`
- Cleanup correcto en polls

---

## 6. Recomendaciones Prioritarias

### Critico (Hacer ya)

1. **Regenerar database types**
   ```bash
   npx supabase gen types typescript --project-id wjkbqcrxwsmvtxmqgiqc > src/types/database.ts
   ```

2. **Extender Content interface** con props faltantes

3. **Agregar AbortController** en useEffects con async:
   ```typescript
   useEffect(() => {
     const controller = new AbortController();
     fetchData({ signal: controller.signal });
     return () => controller.abort();
   }, []);
   ```

### Alto

4. **Memoizar groupedContent** en BoardListView
5. **Eliminar `as any`** en MarketplaceBoardView profile access
6. **Tipar stats/navigate** en MarketplaceDashboardTab

### Medio

7. **useCallback** para funciones inline repetidas
8. **Error boundaries** para modulos complejos
9. **Agrupar props** de drag handlers

---

## 7. Archivos Mas Afectados

| Archivo | Issues | Prioridad |
|---------|--------|-----------|
| `ContentDetailDialog.tsx` | 15 any + 2 memory leaks | ALTA |
| `ContentVideoCard.tsx` | 12 any | ALTA |
| `OrgProfilePage.tsx` | 12 any + sin tipos DB | ALTA |
| `ProjectDetailModal.tsx` | 8 any supabase | ALTA |
| `ClientScriptReview.tsx` | 8 any | MEDIA |
| `BoardListView.tsx` | 1 perf + 2 callbacks | MEDIA |
| `EnhancedContentCard.tsx` | 7 any | MEDIA |

---

## 8. Metricas de Codigo

```
Archivos auditados: 35+
Instancias as any: 75+
Instancias : any: 20+
useEffect sin cleanup: 6
useMemo faltantes: 3
useCallback faltantes: 5
Error boundaries: 0 (de 3 recomendados)
```

---

*Generado automaticamente por Claude Opus 4.5*
