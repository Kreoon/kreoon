# Flow Testing Report - Kreoon Platform

**Fecha:** 2026-03-27
**Version:** 1.0
**Autor:** Flow-Tester Agent

---

## Resumen Ejecutivo

Este documento analiza los 4 flujos principales de Kreoon:
1. Creacion de Contenido
2. Campanas en Marketplace
3. ADN Research v3 (22 pasos)
4. Proyectos Unificados

---

## 1. Flujo de Creacion de Contenido

### 1.1 Diagrama de Flujo

```
[Usuario]
    |
    v
[Click "Crear Contenido"]
    |
    v
[CreateContentDialog.tsx se abre]
    |
    v
[Formulario con campos]
    |-- Informacion General (titulo*, cliente, paquete, producto, fase Esfera)
    |-- Cantidad de Variables (hooks_count)
    |-- Equipo Asignado (creador/embajador, editor, estratega)
    |-- Fechas (inicio, deadline)
    |-- Guion (ScriptGenerator + textarea)
    |-- Pautas (editor, estratega, trafficker)
    |
    v
[Validacion]
    |-- titulo.trim() requerido
    |-- Si es_ambassador_content: creatorId requerido
    |-- Si no hay embajadores disponibles: error
    |
    v
[Submit -> supabase.from('content').insert()]
    |
    v
[onSuccess callback -> refetch board]
    |
    v
[Contenido aparece en ContentBoard/Kanban]
    |-- Estado inicial: 'draft'
```

### 1.2 Punto de Entrada

| Archivo | Componente | Trigger |
|---------|-----------|---------|
| `src/components/content/CreateContentDialog.tsx` | CreateContentDialog | `open` prop = true |

### 1.3 Estados y Transiciones

**Estados del contenido (workflow UGC Estandar):**

```
draft -> script_pending -> script_approved -> assigned -> recording
      -> recorded -> editing -> delivered -> issue/corrected/review
      -> approved
```

**Transiciones manejadas por:**
- `useContent.ts` -> `updateContentStatus()`
- `useContentStatusWithUP.ts` -> Integra puntos UP en transiciones

### 1.4 Campos Requeridos y Validacion

| Campo | Requerido | Validacion | Mensaje Error |
|-------|-----------|------------|---------------|
| `title` | Si | `trim() !== ""` | "El nombre del video es requerido" |
| `creatorId` | Si (embajador) | Si `isAmbassadorContent` | "Debes seleccionar un embajador..." |
| `ambassadors` | Si (embajador) | `ambassadorOptions.length > 0` | "No hay embajadores disponibles..." |

### 1.5 Puntos de Fallo Identificados

| Severidad | Punto de Fallo | Comportamiento Actual | Recomendacion |
|-----------|---------------|----------------------|---------------|
| **ALTA** | Falla de red en insert | Toast generico "No se pudo crear" | Agregar retry automatico |
| **MEDIA** | Cliente sin paquetes | Select deshabilitado sin mensaje | Mostrar tooltip explicativo |
| **MEDIA** | Cliente sin productos | Select deshabilitado | Mostrar CTA para crear producto |
| **BAJA** | Trial expirado | `guardAction()` bloquea | OK - comportamiento esperado |

### 1.6 Estados de Loading

| Estado | Indicador Visual | Ubicacion |
|--------|------------------|-----------|
| Cargando opciones | Ninguno | `fetchOptions()` - sin skeleton |
| Enviando formulario | `<Loader2 className="animate-spin" />` | Boton "Crear Proyecto" |
| Cargando embajadores | Texto "Cargando embajadores..." | SelectContent |

### 1.7 Gaps en Testing

- [ ] Test E2E para flujo completo de creacion
- [ ] Test de validacion de formulario
- [ ] Test de rollback en error de red
- [ ] Test de deteccion de contenido embajador
- [ ] Test de auto-seleccion de paquete activo

---

## 2. Flujo de Campana en Marketplace

### 2.1 Diagrama de Flujo

```
[Brand] ─────────────────────────────────────────────────────────────
    |
    v
[CampaignWizard.tsx - 6 steps]
    |
    |-- Step 0: Basic Info (titulo*, descripcion*, categoria, deadline, tags)
    |-- Step 1: Visibility (publico/selectivo/privado, max_creators)
    |-- Step 2: Content (content_requirements[])
    |-- Step 3: Media (cover image, video brief)
    |-- Step 4: Budget (paid/exchange/hybrid, pricing_mode)
    |-- Step 5: Review (resumen, terminos)
    |
    v
[createCampaign() -> supabase.from('marketplace_campaigns').insert()]
    |
    v
[Campana publicada, status='active']


[Creator] ───────────────────────────────────────────────────────────
    |
    v
[CampaignsFeed.tsx - Lista campanas activas]
    |
    v
[Click en CampaignCard -> navigate(`/marketplace/campaigns/${id}`)]
    |
    v
[CampaignDetail.tsx -> "Aplicar" button]
    |
    v
[CampaignApplicationModal.tsx]
    |-- coverLetter* (requerido)
    |-- availabilityDate* (requerido)
    |-- proposedPrice (opcional, requerido en auction/range)
    |-- portfolioLinks[]
    |-- includesEditing toggle
    |
    v
[submitApplication() -> supabase.from('marketplace_applications').insert()]
    |
    v
[ApplicationSuccess.tsx]


[Brand Reviews] ─────────────────────────────────────────────────────
    |
    v
[CampaignApplicationsReview.tsx]
    |
    |-- handleApprove(appId) -> approveApplication RPC
    |   |-- Auto-crea proyecto en marketplace_projects
    |   |-- Track analytics
    |   |-- Crea publicaciones si es brand activation
    |
    |-- handleReject(appId) -> updateApplicationStatus('rejected')
    |
    v
[Proyecto activo, trabajo comienza]
```

### 2.2 Puntos de Entrada

| Archivo | Componente | Trigger |
|---------|-----------|---------|
| `src/components/marketplace/campaigns/wizard/CampaignWizard.tsx` | CampaignWizard | Route `/marketplace/campaigns/create` |
| `src/components/marketplace/campaigns/feed/CampaignsFeed.tsx` | CampaignsFeed | Route `/marketplace/campaigns` |
| `src/components/marketplace/campaigns/application/CampaignApplicationModal.tsx` | CampaignApplicationModal | Click "Aplicar" |
| `src/components/marketplace/campaigns/management/CampaignApplicationsReview.tsx` | CampaignApplicationsReview | Click "Ver aplicaciones" |

### 2.3 Estados y Transiciones

**Estados de Campana:**
```
draft -> active -> completed/cancelled
```

**Estados de Aplicacion:**
```
pending -> approved/rejected
approved -> assigned (auto al crear proyecto)
```

### 2.4 Validacion por Step

| Step | Validacion | Campos |
|------|------------|--------|
| 0 (Basic) | `title.trim() && description.trim()` | titulo, descripcion |
| 1 (Visibility) | Si `selective`: `invited_profiles.length > 0` | perfiles invitados |
| 2 (Content) | `contentRequirements.length > 0 && every(r => r.content_type)` | tipos de contenido |
| 3 (Media) | Siempre valido | opcional |
| 4 (Budget) | Depende de `campaign_type` y `pricing_mode` | montos, canje |
| 5 (Review) | `termsAccepted` | checkbox terminos |

### 2.5 Puntos de Fallo Identificados

| Severidad | Punto de Fallo | Comportamiento | Recomendacion |
|-----------|---------------|----------------|---------------|
| **ALTA** | Upload de media falla | No hay retry | Agregar queue de reintentos |
| **ALTA** | Pago de subasta falla | `handlePayAndStart` sin feedback | Mostrar error detallado |
| **MEDIA** | Draft no se guarda en edit mode | `isEditMode ? null : loadDraft()` | Guardar borradores en BD |
| **MEDIA** | Counter-offer solo local | `setApplications` sin persistencia | Guardar en BD |
| **BAJA** | Sin perfil de creador | Toast "Necesitas un perfil" | OK - flujo alternativo |

### 2.6 Auto-save de Borradores

```javascript
// CampaignWizard.tsx linea 236-242
useEffect(() => {
  if (isComplete || isEditMode) return;
  const timeout = setTimeout(() => {
    saveDraftToStorage({ ...data, step: currentStep });
  }, 1000);
  return () => clearTimeout(timeout);
}, [dependencies]);
```

- **Persistencia:** localStorage (expira 24h)
- **Restauracion:** `loadDraft()` al montar
- **Limpieza:** `clearDraft()` al completar

### 2.7 Gaps en Testing

- [ ] Test E2E wizard completo (6 pasos)
- [ ] Test de validacion de rango de bid
- [ ] Test de upload de media con retry
- [ ] Test de flujo de aplicacion completo
- [ ] Test de aprobacion con auto-creacion de proyecto
- [ ] Test de counter-offer persistido

---

## 3. Flujo ADN Research v3

### 3.1 Diagrama de Flujo

```
[Usuario en ProductDNADashboard]
    |
    v
[Click "Iniciar ADN Recargado"]
    |
    v
[AdnResearchV3Modal.tsx]
    |-- state: "configuring" | "processing" | "completed"
    |
    v
[AdnResearchV3Configurator.tsx]
    |-- Seleccion de tabs a generar
    |-- Verificacion de tokens disponibles
    |-- Confirmacion de costo estimado
    |
    v
[handleStart(config)]
    |
    |-- useLiteMode: true  -> startLite() -> n8n webhook
    |-- useLiteMode: false -> start()     -> Edge Function
    |
    v
[useAdnResearchV3 hook - polling de progreso]
    |
    v
[AdnResearchV3Progress.tsx]
    |-- ProgressRing (SVG animado)
    |-- Lista de 22 tabs con estados
    |-- Mensajes motivacionales rotativos
    |
    v
[Procesamiento de 22 Tabs]

Tab01: market_overview    -> Panorama de Mercado
Tab02: competition        -> Analisis de Competencia
Tab03: jtbd               -> Jobs To Be Done
Tab04: avatars            -> Avatares Ideales
Tab05: psychology         -> Psicologia Profunda
Tab06: neuromarketing     -> Neuromarketing
Tab07: positioning        -> Posicionamiento
Tab08: copy_angles        -> Angulos de Copy
Tab09: offer              -> Oferta Irresistible
Tab11: calendar           -> Calendario 30 Dias
Tab12: lead_magnets       -> Lead Magnets
Tab13: social_media       -> Redes Sociales
Tab14: meta_ads           -> Meta Ads
Tab15: tiktok_ads         -> TikTok Ads
Tab16: google_ads         -> Google Ads
Tab17: email_marketing    -> Email Marketing
Tab18: landing_pages      -> Landing Pages
Tab19: launch_strategy    -> Estrategia de Lanzamiento
Tab20: kpis               -> KPIs y Metricas
Tab21: organic_content    -> Contenido Organico
Tab22: executive_summary  -> Resumen Ejecutivo

    |
    v
[Resultado guardado en product_dna_research_results]
    |
    v
[AdnResearchV3Dashboard.tsx - Visualizacion]
```

### 3.2 Estados del Research

```typescript
type AdnResearchV3Status =
  | "initializing"
  | "gathering_intelligence"
  | "researching"
  | "completed"
  | "error"
  | "cancelled";
```

### 3.3 Hook Principal: useAdnResearchV3

```typescript
interface UseAdnResearchV3Return {
  session: AdnResearchV3Session | null;
  result: AdnResearchV3Result | null;
  isLoading: boolean;
  isStarting: boolean;
  error: string | null;
  isRunning: boolean;      // derived
  isCompleted: boolean;    // derived
  hasError: boolean;       // derived
  progress: number;        // 0-100
  currentStepName: string | null;
  tokensUsed: number;
  progressState: ProgressState;
  tabs: Record<string, unknown>;

  // Actions
  start: (params) => Promise<boolean>;
  startLite: (config?) => Promise<boolean>;
  cancel: () => Promise<boolean>;
  refresh: () => Promise<void>;
  loadResult: () => Promise<void>;
  regenerateTab: (tabKey) => Promise<boolean>;
  clearError: () => void;
}
```

### 3.4 Puntos de Fallo Identificados

| Severidad | Punto de Fallo | Comportamiento | Recomendacion |
|-----------|---------------|----------------|---------------|
| **CRITICA** | Tokens insuficientes | Validacion en Configurator | OK - pre-check |
| **ALTA** | Error en step intermedio | `status: "error"` | Permitir retomar desde step fallido |
| **ALTA** | Timeout de Edge Function | Error generico | Implementar chunking/streaming |
| **MEDIA** | Cancelacion durante gathering | Confirmacion con AlertDialog | OK - advertencia sobre tokens |
| **MEDIA** | Polling infinito | Sin limite de reintentos | Agregar max_retries |
| **BAJA** | Tab regeneracion falla | Toast error | OK - usuario puede reintentar |

### 3.5 Progress State Structure

```typescript
interface ProgressState {
  currentStep: number;           // 0-22
  totalSteps: number;            // 22
  percentage: number;            // 0-100
  currentStepName: string | null;
  status: AdnResearchV3Status | null;
  tokensConsumed: number;
  hasPartialResults: boolean;
  completedSteps: number[];
  isIntelligenceGathering: boolean;
}
```

### 3.6 Gaps en Testing

- [ ] Test de inicio con tokens suficientes
- [ ] Test de cancelacion mid-process
- [ ] Test de retoma desde error
- [ ] Test de regeneracion de tab individual
- [ ] Test de progreso en tiempo real
- [ ] Test de modo lite vs standard
- [ ] Test de timeout handling

---

## 4. Flujo de Proyectos Unificados

### 4.1 Diagrama de Flujo

```
[Fuentes de Proyectos]
    |
    |-- content -> ContentBoard/Kanban
    |-- marketplace -> MarketplaceDashboard
    |
    v
[UnifiedProjectModal.tsx]
    |-- mode: 'view' | 'create'
    |-- source: 'content' | 'marketplace'
    |
    v
[useUnifiedProject hook]
    |-- Carga proyecto via RPC
    |-- Builds permissions
    |-- Auto-save setup
    |
    v
[Tabs Dinamicos basados en projectType]
    |
    |-- content_creation: workspace, brief, video, deliverables,
    |                     materials, thumbnail, team, dates
    |
    |-- post_production:  workspace, brief, deliverables,
    |                     materials, team, dates
    |
    |-- strategy_marketing: workspace, brief, deliverables,
    |                       materials, team, dates
    |
    |-- technology: workspace, brief, deliverables,
    |               materials, team, dates
    |
    |-- education: workspace, brief, deliverables,
    |              materials, team, dates
    |
    v
[Tab Components (lazy loaded)]
    |-- WorkspaceTab -> ScriptWorkspace | ChecklistWorkspace | etc.
    |-- BriefTab
    |-- VideoTab
    |-- DeliverablesTab
    |-- MaterialsTab (RawAssetsUploader)
    |-- ThumbnailTab (ThumbnailSelector, AIThumbnailGenerator)
    |-- TeamTab (assignments)
    |-- DatesTab
    |
    v
[Auto-save via useAutoSave hook]
    |
    v
[WorkflowProgressBar]
    |-- Muestra fases del workflow
    |-- Resalta fase actual
```

### 4.2 Project Type Registry

```typescript
const PROJECT_TYPE_REGISTRY: Record<ProjectType, ProjectTypeConfig> = {
  content_creation: {
    label: 'Creacion de Contenido',
    icon: 'Video',
    sections: { brief, workspace, materials, deliverables, review },
    workflow: { states: [...] },
    roles: { primary: [...], support: [...], reviewer: [...] },
    visibleTabs: ['workspace', 'brief', 'video', ...]
  },
  // ... 4 tipos mas
};
```

### 4.3 Sistema de Permisos Unificado

```typescript
interface UnifiedPermissions {
  can: (field: string, action: 'view' | 'edit') => boolean;
  visibleSections: UnifiedSectionKey[];
  isReadOnly: (field: string) => boolean;
  canEnterEditMode: boolean;
}
```

**Fuentes de permisos:**
- `adaptContentPermissions()` - Para source='content'
- `buildMarketplacePermissions()` - Para source='marketplace'

### 4.4 Workflows Pre-definidos

| ID | Nombre | Project Types | Fases |
|----|--------|---------------|-------|
| `ugc_standard` | UGC Estandar | content_creation | Brief -> Creacion -> Post-Prod -> Diseno -> Revision -> Distribucion |
| `tech_project` | Proyecto Tecnologico | technology | Planificacion -> Diseno -> Desarrollo -> Testing -> Despliegue |
| `strategy_project` | Proyecto Estrategico | strategy_marketing | Discovery -> Investigacion -> Ejecucion -> Analisis |

### 4.5 Auto-Save Implementation

```typescript
const handleAutoSave = useCallback(async (data: Record<string, any>) => {
  if (source === 'content') {
    await supabase.rpc('update_content_by_id', {
      p_content_id: project.id,
      p_updates: updatePayload,
    });
  } else {
    await supabase.from('marketplace_projects')
      .update(payload)
      .eq('id', project.id);
  }
}, [project, source]);
```

### 4.6 Puntos de Fallo Identificados

| Severidad | Punto de Fallo | Comportamiento | Recomendacion |
|-----------|---------------|----------------|---------------|
| **ALTA** | Auto-save falla silenciosamente | Catch generico | Mostrar indicador de error |
| **ALTA** | Permisos no calculados | `can: () => true` en create mode | OK - esperado |
| **MEDIA** | Lazy load falla | Suspense fallback | Agregar error boundary |
| **MEDIA** | Assignments no cargados | useEffect dependency | OK - fetch en mount |
| **BAJA** | Scroll collapse en mobile | CSS transition | OK - UX feature |

### 4.7 Gaps en Testing

- [ ] Test de renderizado de cada tipo de proyecto
- [ ] Test de permisos por rol
- [ ] Test de auto-save con throttle
- [ ] Test de lazy loading de tabs
- [ ] Test de workflow progress bar
- [ ] Test de modo create vs view

---

## 5. Matriz de Cobertura de Testing

| Flujo | Unit Tests | Integration | E2E | Estado |
|-------|-----------|-------------|-----|--------|
| Creacion Contenido | Parcial | No | No | Critico |
| Campana Marketplace | No | No | No | Critico |
| ADN Research v3 | No | No | No | Critico |
| Proyectos Unificados | No | No | No | Critico |

---

## 6. Recomendaciones Prioritarias

### Alta Prioridad

1. **Implementar manejo de errores consistente**
   - Todos los flujos usan `try/catch` pero con mensajes genericos
   - Agregar codigos de error especificos
   - Implementar retry automatico para operaciones de red

2. **Agregar estados de loading granulares**
   - `CreateContentDialog` no muestra skeleton mientras carga opciones
   - `CampaignWizard` no indica carga de datos en edit mode

3. **Persistir borradores en base de datos**
   - `CampaignWizard` usa localStorage (se pierde entre dispositivos)
   - Implementar tabla `draft_campaigns`

### Media Prioridad

4. **Implementar tests E2E para flujos criticos**
   - Playwright/Cypress para los 4 flujos principales
   - Coverage minimo de happy path

5. **Agregar validacion de formularios con Zod**
   - Actualmente validacion manual en cada flujo
   - Unificar con esquemas Zod compartidos

6. **Mejorar feedback de ADN Research**
   - Permitir retomar desde step fallido
   - Guardar resultados parciales en caso de error

### Baja Prioridad

7. **Optimizar lazy loading**
   - Prefetch de tabs probables
   - Error boundaries por tab

8. **Mejorar accesibilidad**
   - Algunos modales sin `aria-describedby` completo
   - Focus trapping en dialogs

---

## 7. Apendice: Archivos Clave por Flujo

### Creacion de Contenido
- `src/components/content/CreateContentDialog.tsx`
- `src/components/content/ScriptGenerator.tsx`
- `src/hooks/useContent.ts`
- `src/hooks/useInternalBrandClient.ts`
- `src/hooks/useInternalOrgContent.ts`

### Campanas Marketplace
- `src/components/marketplace/campaigns/wizard/CampaignWizard.tsx`
- `src/components/marketplace/campaigns/wizard/CampaignStep*.tsx` (6 archivos)
- `src/components/marketplace/campaigns/feed/CampaignsFeed.tsx`
- `src/components/marketplace/campaigns/application/CampaignApplicationModal.tsx`
- `src/components/marketplace/campaigns/management/CampaignApplicationsReview.tsx`
- `src/hooks/useMarketplaceCampaigns.ts`

### ADN Research v3
- `src/components/product-dna/adn-v3/AdnResearchV3Modal.tsx`
- `src/components/product-dna/adn-v3/AdnResearchV3Configurator.tsx`
- `src/components/product-dna/adn-v3/AdnResearchV3Progress.tsx`
- `src/components/product-dna/adn-v3/tabs/Tab01-Tab22*.tsx` (21 archivos)
- `src/hooks/use-adn-research-v3.ts`
- `src/lib/services/adn-research-v3.service.ts`

### Proyectos Unificados
- `src/components/projects/UnifiedProjectModal/index.tsx`
- `src/components/projects/UnifiedProjectModal/hooks/useUnifiedProject.ts`
- `src/components/projects/UnifiedProjectModal/tabs/*.tsx` (9 archivos)
- `src/components/projects/UnifiedProjectModal/workspaces/*.tsx` (5 archivos)
- `src/types/unifiedProject.types.ts`
- `src/types/workflows.ts`
- `src/lib/projectAdapter.ts`
- `src/lib/unifiedPermissions.ts`

---

*Reporte generado automaticamente por Flow-Tester Agent*
