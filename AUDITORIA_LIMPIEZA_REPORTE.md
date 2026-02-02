# Auditoría y limpieza del proyecto – Reporte

**Fecha:** 1 de febrero de 2025  
**Alcance:** Eliminación de código muerto, identificación de redundancias y recomendaciones.

---

## 1. Archivos eliminados (código muerto)

### Componentes dashboard (no importados en ningún lugar)

| Archivo | Motivo |
|---------|--------|
| `src/components/dashboard/ContentCard.tsx` | Nunca importado; se usa `EnhancedContentCard` en ContentBoard y `DraggableContentCard` en ambos boards. |
| `src/components/dashboard/KanbanColumn.tsx` | Nunca importado; se usa `EnhancedKanbanColumn` (ContentBoard) y `DroppableKanbanColumn` (ClientContentBoard). |
| `src/components/dashboard/RecentActivity.tsx` | Nunca importado. |
| `src/components/dashboard/RecentActivityReal.tsx` | Nunca importado. |
| `src/components/dashboard/TopCreators.tsx` | Nunca importado. |
| `src/components/dashboard/TopCreatorsReal.tsx` | Nunca importado. |
| `src/components/dashboard/StatsCard.tsx` | Nunca importado; los dashboards usan componentes locales (PremiumStatsCard) o TechDashboardCards. |
| `src/components/dashboard/TechStatsCard.tsx` | Nunca importado. |
| `src/components/dashboard/KpiContentDialog.tsx` | Solo importado en EditorDashboard pero no usado; se usa `TechKpiDialog`. |

### Secciones de Settings (reemplazadas por versiones unificadas)

| Archivo | Motivo |
|---------|--------|
| `src/pages/settings/sections/NotificationsSection.tsx` | Reemplazada por `NotificationsUnifiedSection`. |
| `src/pages/settings/sections/BillingControlSection.tsx` | Reemplazada por `BillingUnifiedSection`. |
| `src/pages/settings/sections/ChatNotificationsSection.tsx` | No importada; la funcionalidad está en `NotificationsUnifiedSection` (ChatRBACSettings). |

### Hooks (nunca importados)

| Archivo | Motivo |
|---------|--------|
| `src/hooks/useAmbassadorUP.ts` | Nunca importado en el proyecto. |
| `src/hooks/useReadOnlyGuard.ts` | Nunca importado. |
| `src/hooks/useSeenStories.ts` | Nunca importado; se usa `useStoryViews` en StoriesBar. |
| `src/hooks/useUPQuality.ts` | Nunca importado. |

### Cambios adicionales

- **EditorDashboard.tsx:** Se eliminó el import no usado de `KpiContentDialog`.

**Total archivos eliminados:** 17 (10 componentes, 3 secciones settings, 4 hooks).

---

## 2. Componentes que se mantienen (no unificados)

- **ContentCard (eliminado)** vs **EnhancedContentCard** vs **DraggableContentCard**  
  - `EnhancedContentCard`: usado en ContentBoard (vista Kanban completa con estado, pagos, etc.).  
  - `DraggableContentCard`: usado en ContentBoard y ClientContentBoard para cards arrastrables; implementa su propia UI (no usa ContentCard ni EnhancedContentCard).  
  - Unificar en un solo componente base requeriría refactor grande y podría afectar rutas y permisos; se dejó como está.

- **EnhancedKanbanColumn** vs **DroppableKanbanColumn**  
  - `EnhancedKanbanColumn`: usado en ContentBoard (props: id, onDragOver, onDrop, onDragEnter).  
  - `DroppableKanbanColumn`: usado en ClientContentBoard (props: status, onDrop(e, targetStatus)).  
  - Diferentes contratos (status vs id, manejo de drop); consolidar implicaría unificar lógica de ambos boards.

- **external-client.ts**  
  - No se importa en el código; solo se menciona en `CAMBIO_BASE_DATOS.md`.  
  - Se mantiene por si se usa en migración o documentación; el cliente principal es `client.ts` (Kreoon).

---

## 3. Warnings y posibles problemas

1. ~~**Import mixto estático/dinámico de `useContentStatusWithUP`**~~ **Resuelto:** Todos los usos pasaron a import estático.

2. ~~**ExplorePage: import estático en App y lazy en PortfolioShell**~~ **Resuelto:** ExplorePage se carga solo vía lazy (App y PortfolioShell).

3. **Clase Tailwind ambigua**  
   - `ease-[cubic-bezier(0.4,0,0.2,1)]` coincide con varias utilidades.  
   - **Recomendación:** Usar la variante escapada sugerida o una clase de transición estándar de Tailwind.

4. ~~**Chunk principal grande (~4.3 MB min)**~~ **Mitigado:** Lazy loading de rutas pesadas; bundle principal ~2.8 MB. Opcional: `manualChunks` para vendor.

5. ~~**Tipos `any` en ExplorePage**~~ **Resuelto:** Eliminados `(supabase as any)`; `hashtagPosts` tipado como `TrendingPost[]`.

6. ~~**Manejo de errores de Supabase**~~ **Parcial:** Creado `lib/supabaseHelpers.ts` y usado en DraggableContentCard; se puede extender a más llamadas.

---

## 4. Estructura de carpetas actual (referencia)

```
src/
├── components/
│   ├── ui/          # Componentes base (shadcn, botones, cards, etc.)
│   ├── board/       # Kanban, EnhancedContentCard, EnhancedKanbanColumn, etc.
│   ├── dashboard/   # DraggableContentCard, DroppableKanbanColumn, TechKpi*, etc.
│   ├── content/     # ContentDetailDialog, ReviewCard, etc.
│   ├── settings/    # Paneles de configuración
│   ├── points/      # UP, logros, leaderboards
│   ├── portfolio/   # Feed, perfil público
│   └── ...
├── hooks/           # Custom hooks (useAuth, useContent, useBoardSettings, etc.)
├── lib/             # utils, statusUtils, edgeFunctions, roles, etc.
├── types/           # database.ts, tracking.ts
├── integrations/supabase/  # client, lovable-client, types (external-client no usado en código)
├── contexts/        # Auth, Impersonation, Trial, Tracking, etc.
└── pages/           # Rutas principales y settings/sections
```

---

## 5. Mejoras aplicadas (seguimiento)

- **Helper Supabase:** Creado `src/lib/supabaseHelpers.ts` con `getSupabaseErrorMessage` y `handleSupabaseError(error, toast?, fallbackTitle)`. Usado en `DraggableContentCard` para pago creador/editor.
- **Barrel export dashboard:** Añadido `src/components/dashboard/index.ts` que exporta todos los componentes del dashboard (ActiveSeasonBanner, ClientFinanceChart, DraggableContentCard, DroppableKanbanColumn, GoalsChart, GoalsDialog, KpiListDialog, ReferralStats, TechDashboardCards, TechKpiCard, TechKpiDialog, ThisMonthFilter, UPSystemKPIs).
- **Import unificado `useContentStatusWithUP`:** Sustituidos todos los `await import('@/hooks/useContentStatusWithUP')` por import estático en: ClientContentBoard, ClientDashboard, ReviewCard, ContentVideoCard, ContentDetailDialog, ClientContentDetailDialog. Elimina el warning de Vite por import mixto.
- **ExplorePage:** Carga solo vía lazy en App (`/explore`) y en PortfolioShell (tab explorar). Eliminado import estático en App. Eliminados todos los `(supabase as any)` en ExplorePage; uso directo del cliente tipado. `hashtagPosts` tipado como `TrendingPost[]` en lugar de `any[]`.
- **Lazy loading de rutas pesadas:** En App se usa `React.lazy` para: ExplorePage, Dashboard, ContentBoard, ClientContentBoard, Settings, CreatorDashboard, EditorDashboard, StrategistDashboard, ClientDashboard, Ranking, Scripts, Marketing, Live. Cada ruta lazy va envuelta en `<Suspense fallback={<PageFallback />}>`. El bundle principal pasó de ~4.3 MB a ~2.8 MB (minificado).
- **JSDoc:** Añadido JSDoc a `useBoardSettings(organizationId)` y a `updateContentStatusWithUP(params)` en los hooks correspondientes.
- **Limpieza App:** Eliminado import no usado `useLocation` de react-router-dom.

## 6. Mejoras sugeridas (pendientes)

- **Dependencias:** Ejecutar `npx depcheck` (o `npm install -g depcheck` y luego `depcheck`) para detectar paquetes no usados; revisar sin tocar Edge Functions ni auth.
- **Clase Tailwind:** Corregir `ease-[cubic-bezier(0.4,0,0.2,1)]` según el warning de build si sigue apareciendo.
- **TypeScript:** Reducir `any` restantes (p. ej. en props `icon: any` en algunos componentes).

## 7. No tocado (como se solicitó)

- Rutas y navegación en `App.tsx`.
- Autenticación y permisos (useAuth, ProtectedRoute, etc.).
- Conexiones a Supabase que ya funcionan (client.ts, lovable-client.ts para Edge Functions).
- Edge Functions desplegadas y sus invocaciones.

---

**Build:** Verificado con `npm run build` (exit code 0) tras la auditoría y tras las mejoras de seguimiento. Bundle principal reducido con lazy loading.
