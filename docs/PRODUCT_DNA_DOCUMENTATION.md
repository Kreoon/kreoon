# ADN Recargado de Producto (Product DNA) - Documentacion Tecnica Completa

## Resumen Ejecutivo

El **ADN Recargado de Producto** es una funcionalidad que genera investigacion de mercado completa, estrategias de contenido, y planes de lanzamiento para productos/servicios de clientes. El sistema utiliza IA (Perplexity + Gemini) para analizar el producto, investigar el mercado y generar 12 secciones de analisis profundo.

---

## Arquitectura General

```
+--------------------+     +---------------------------+     +-----------------------+
|     FRONTEND       |     |      EDGE FUNCTIONS       |     |     BASE DE DATOS     |
+--------------------+     +---------------------------+     +-----------------------+
|                    |     |                           |     |                       |
| ProductDNAWizard   |---->| transcribe-audio-gemini   |---->| product_dna           |
| (Audio + Selects)  |     | (Whisper transcripcion)   |     | (Datos wizard)        |
|                    |     |                           |     |                       |
| ProductDNADisplay  |<----| generate-product-dna      |---->| products              |
| (Visualizacion)    |     | (Analisis basico)         |     | (market_research)     |
|                    |     |                           |     |                       |
| ProductDNADashboard|<----| product-research          |     |                       |
| (Dashboard ADN)    |     | (12 pasos investigacion)  |     |                       |
|                    |     |                           |     |                       |
| useProductDNA      |     | generate-full-research    |     |                       |
| (Hook de estado)   |     | (Orquestador fire&forget) |     |                       |
+--------------------+     +---------------------------+     +-----------------------+
```

---

## Flujo Completo

### Fase 1: Wizard de Captura (ProductDNAWizard)

**Archivo:** `src/components/product-dna/ProductDNAWizard.tsx`

El usuario completa un wizard con:

#### 1. Audio (2-5 minutos)
Responde 5 preguntas predefinidas:

| # | Bloque | Pregunta |
|---|--------|----------|
| 1 | Tu Producto | Que producto o servicio ofreces, para quien es y que lo hace unico frente a la competencia? |
| 2 | Tu Cliente Ideal | Quien es la persona que mas necesita tu producto? Describe su vida, frustraciones y que busca. |
| 3 | El Problema | Cual es el problema principal que resuelve tu producto? Que pasa si tu cliente NO lo compra? |
| 4 | La Transformacion | Que resultado concreto obtiene tu cliente? Como cambia su vida antes y despues? |
| 5 | Tu Oferta | Cuanto cuesta, que incluye y que garantias o testimonios tienes? |

**Preguntas definidas en:** `src/lib/product-dna-questions.ts`

#### 2. Selecciones Rapidas (max 3 cada una)

**Tipo de Servicio:**
- Video UGC, Foto UGC, Carrusel, Reels/TikToks, Fotografia, Edicion, Diseno, Estrategia

**Objetivos:**
- Vender, Dar a conocer, Captar leads, Engagement, Educar

**Plataformas:**
- Instagram, TikTok, YouTube, Facebook, LinkedIn, Ads

**Audiencia:**
- 18-24 anos, 25-34 anos, 35-44 anos, 45+ anos

#### 3. Ubicaciones de Mercado
Selector tipo Meta Ads con regiones, paises y ciudades:
- Regiones: Latinoamerica, Europa, Norteamerica, etc.
- Paises: 25+ paises
- Ciudades: 30+ ciudades principales

---

### Fase 2: Transcripcion + Analisis Emocional

**Edge Function:** `supabase/functions/transcribe-audio-gemini/index.ts`

**Proceso:**
1. Recibe audio (FormData .webm)
2. **OpenAI Whisper** transcribe a texto
3. **Gemini 2.0 Flash** analiza emociones del texto

**Output:**
```typescript
{
  success: true,
  transcription: "Texto transcrito...",
  emotional_analysis: {
    overall_mood: "enthusiastic" | "confident" | "uncertain" | "stressed" | "calm" | "passionate",
    confidence_level: 75, // 0-100
    passion_topics: ["tema1", "tema2"],
    concern_areas: ["tema1"],
    content_recommendations: {
      suggested_tone: "cercano y profesional",
      avoid_topics: ["tema"],
      emphasize_topics: ["tema"]
    }
  }
}
```

---

### Fase 3: Investigacion de Mercado (12 Pasos)

**Edge Function:** `supabase/functions/product-research/index.ts`

El corazon del ADN Recargado. Ejecuta 12 pasos secuenciales usando **Perplexity sonar-pro** con busqueda web en tiempo real.

#### Los 12 Pasos del Research

| # | Step ID | Nombre | Depende De |
|---|---------|--------|------------|
| 1 | market_overview | Panorama de Mercado | - |
| 2 | jtbd | Jobs To Be Done | market_overview |
| 3 | pains_desires | Dolores y Deseos | jtbd |
| 4 | competitors | Analisis de Competencia | market_overview |
| 5 | avatars | Avatares de Cliente | pains_desires, competitors |
| 6 | differentiation | Diferenciacion y ESFERA | avatars, competitors |
| 7 | sales_angles | Angulos de Venta | avatars, differentiation |
| 8 | puv_transformation | PUV y Transformacion | sales_angles |
| 9 | lead_magnets | Lead Magnets | avatars, pains_desires |
| 10 | video_creatives | Creativos de Video | sales_angles, differentiation |
| 11 | content_calendar | Parrilla de Contenido 30 Dias | avatars, sales_angles, differentiation |
| 12 | launch_strategy | Estrategia de Lanzamiento | avatars, sales_angles, puv_transformation |

---

## Detalle de Cada Paso

### 1. MARKET_OVERVIEW - Panorama de Mercado

**Output:**
```typescript
{
  market_overview: {
    marketSize: "TAM: $50B USD (Statista 2024)",
    marketSizeSegments: [{ segment: "Premium", value: "$15B" }],
    growthTrend: "CAGR 12.5% proyectado a 2028",
    marketState: "crecimiento" | "saturacion" | "declive",
    consumerBehavior: {
      searchBehavior: "Como busca soluciones",
      preferredChannels: ["Instagram", "YouTube"],
      preferredFormats: ["Video corto", "Carruseles"],
      seasonality: "Mayor demanda Q4",
      averageTicket: "$50-200 USD",
      purchaseFrequency: "Trimestral"
    },
    macroVariables: [
      { factor: "Economico", impact: "alto", description: "..." }
    ],
    awarenessLevel: "solution_aware",
    summary: "Resumen ejecutivo...",
    opportunities: ["Oportunidad 1", "Oportunidad 2"],
    threats: ["Amenaza 1", "Amenaza 2"]
  }
}
```

### 2. JTBD - Jobs To Be Done

**Output:**
```typescript
{
  functionalJob: "Descripcion del trabajo funcional",
  emotionalJob: "Trabajo emocional (como quiere sentirse)",
  socialJob: "Trabajo social (como quiere ser percibido)",
  contextDescription: "Situaciones donde surge la necesidad",
  alternativeSolutions: ["Alternativa 1", "Alternativa 2"],
  switchingTriggers: ["Trigger 1", "Trigger 2"],
  hiringCriteria: ["Criterio 1", "Criterio 2"],
  jtbdStatement: "Cuando [situacion], quiero [motivacion], para poder [resultado]"
}
```

### 3. PAINS_DESIRES - Dolores y Deseos

**Output:**
```typescript
{
  pains: {
    functional: [{ pain: "Dolor", intensity: "alto", frequency: "diario" }],
    emotional: [...],
    secondary: [...]
  },
  desires: {
    functional: [{ desire: "Deseo", importance: "critico" }],
    emotional: [...],
    aspirational: [...]
  },
  objections: [{ objection: "Objecion", response: "Respuesta" }]
}
```

### 4. COMPETITORS - Analisis de Competencia

**Output:**
```typescript
{
  directCompetitors: [{
    name: "Competidor X",
    url: "https://...",
    priceRange: "$100-500",
    positioning: "Premium",
    strengths: ["Fortaleza 1"],
    weaknesses: ["Debilidad 1"],
    contentStrategy: "Descripcion",
    marketShare: "15%"
  }],
  indirectCompetitors: [...],
  substitutes: [...],
  competitiveGaps: ["Gap 1", "Gap 2"]
}
```

### 5. AVATARS - Avatares de Cliente

**Output:**
```typescript
{
  primaryAvatar: {
    name: "Maria la Emprendedora",
    demographics: { age: "28-35", gender: "femenino", location: "CDMX", income: "$2,000-5,000/mes" },
    psychographics: { values: [...], interests: [...], lifestyle: "..." },
    dayInLife: "Descripcion de un dia tipico",
    mediaConsumption: { platforms: [...], influencers: [...], contentTypes: [...] },
    purchaseBehavior: { decisionFactors: [...], researchProcess: "...", timeline: "..." },
    messagingTone: "Cercano y profesional"
  },
  secondaryAvatars: [...]
}
```

### 6. DIFFERENTIATION - Diferenciacion y ESFERA

**Output:**
```typescript
{
  uniqueValueProposition: "Propuesta de valor unica",
  differentiationAxis: [{ axis: "Velocidad", ourPosition: "Rapido", competitorPosition: "Lento" }],
  positioningStatement: "Para [avatar] que [necesidad], [producto] es [categoria] que [beneficio diferencial]",
  esfera: {
    enganchar: { objetivo: "...", tacticas: [...], metricas: [...] },
    solucion: { objetivo: "...", tacticas: [...], metricas: [...] },
    remarketing: { objetivo: "...", tacticas: [...], metricas: [...] },
    fidelizar: { objetivo: "...", tacticas: [...], metricas: [...] }
  },
  brandArchetype: { archetype: "El Sabio", justification: "...", tone: [...] }
}
```

### 7. SALES_ANGLES - Angulos de Venta

**Output:**
```typescript
{
  angles: [{
    angleName: "Angulo del Dolor",
    targetAvatar: "Maria la Emprendedora",
    emotionalTrigger: "Frustracion",
    headline: "Headline principal",
    hook: "Primera linea que engancha",
    bodyFramework: "PAS/AIDA/etc",
    proof: ["Prueba social 1"],
    cta: "Llamada a accion",
    platform: "Instagram",
    format: "Carrusel"
  }]
}
```

### 8. PUV_TRANSFORMATION - PUV y Transformacion

**Output:**
```typescript
{
  puvStatement: "Propuesta Unica de Venta completa",
  beforeState: { situation: "...", feelings: [...], problems: [...] },
  afterState: { situation: "...", feelings: [...], results: [...] },
  transformationStory: "Narrativa de transformacion",
  guarantees: [{ type: "Garantia de satisfaccion", description: "..." }],
  testimonialTemplates: [{ scenario: "...", quote: "..." }]
}
```

### 9. LEAD_MAGNETS - Lead Magnets

**Output:**
```typescript
{
  leadMagnets: [{
    name: "Checklist de X",
    type: "checklist" | "guide" | "template" | "calculator" | "webinar" | "quiz",
    targetAvatar: "Maria",
    problem: "Problema que resuelve",
    promise: "Promesa del lead magnet",
    outline: ["Seccion 1", "Seccion 2"],
    deliveryMethod: "Email + Drive",
    followUpSequence: [{ day: 1, subject: "...", objective: "..." }]
  }]
}
```

### 10. VIDEO_CREATIVES - Creativos de Video

**Output:**
```typescript
{
  adCreatives: [{
    name: "Ad Hook Dolor",
    format: "Reel 30s",
    hook: "Primeros 3 segundos",
    script: "Guion completo",
    visualNotes: "Notas de produccion",
    cta: "CTA final",
    platform: "Instagram",
    productionNotes: "Instrucciones para el equipo"
  }]
}
```

### 11. CONTENT_CALENDAR - Parrilla de Contenido 30 Dias

**Output:**
```typescript
{
  calendar: [{
    week: 1,
    day: 1,
    dayLabel: "Lunes - Dia 1",
    platform: "Instagram",
    format: "Carrusel",
    pillar: "educativo" | "emocional" | "autoridad" | "venta" | "comunidad",
    title: "Titulo del contenido",
    hook: "Hook de apertura",
    description: "De que trata",
    copy: "Copy listo para publicar",
    cta: "Llamada a accion",
    hashtags: ["#hashtag1", "#hashtag2"],
    esferaPhase: "enganchar" | "solucion" | "remarketing" | "fidelizar",
    avatar: "Maria la Emprendedora",
    productionNotes: "Instrucciones para disenador"
  }], // 28-35 items
  weeklyThemes: [{ week: 1, theme: "...", objective: "..." }],
  leadMagnetDays: [{ week: 1, day: 3, leadMagnetName: "...", promotionCopy: "..." }]
}
```

### 12. LAUNCH_STRATEGY - Estrategia de Lanzamiento

**Output:**
```typescript
{
  preLaunch: {
    duration: "2-3 semanas",
    objectives: ["Objetivo 1"],
    actions: [{ action: "...", week: "Semana 1", channel: "Email", details: "..." }],
    contentPlan: ["Contenido 1"],
    checklist: ["Item 1"]
  },
  launch: {
    dayPlan: [{ time: "9:00 AM", action: "...", channel: "...", details: "..." }],
    offer: { description: "...", price: "$X", bonuses: [...], urgency: "...", scarcity: "...", guarantee: "..." },
    emailSequence: [{ day: "Dia 1", subject: "...", preview: "...", bodyOutline: "...", cta: "..." }],
    channels: [{ channel: "Instagram", role: "...", content: "..." }]
  },
  postLaunch: {
    retentionActions: ["Accion 1"],
    postSaleContent: ["Contenido 1"],
    referralStrategy: "...",
    nonBuyerFollowUp: ["Accion 1"],
    analysisChecklist: ["Metrica 1"]
  },
  budget: {
    organic: [{ item: "...", cost: "$0" }],
    paid: [{ item: "Ads", cost: "$500", platform: "Meta" }],
    totalEstimated: "$1,500"
  },
  timeline: [{ phase: "Pre-lanzamiento", week: "Semana 1-2", milestone: "...", deliverables: [...] }],
  team: [{ role: "Content Manager", responsibilities: [...], hoursPerWeek: "10h" }],
  metrics: {
    preLaunch: [{ metric: "Lista de espera", target: "500 leads" }],
    launch: [{ metric: "Ventas", target: "50 unidades" }],
    postLaunch: [{ metric: "Retention", target: "80%" }]
  }
}
```

---

## Estructura de Datos

### Tabla: product_dna

```sql
CREATE TABLE product_dna (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id),

  -- Wizard data
  service_group TEXT,
  service_types TEXT[],
  audio_url TEXT,
  audio_duration_seconds INTEGER,
  transcription TEXT,
  reference_links JSONB DEFAULT '[]',
  competitor_links JSONB DEFAULT '[]',
  inspiration_links JSONB DEFAULT '[]',
  wizard_responses JSONB DEFAULT '{}',

  -- AI Analysis (basico)
  market_research JSONB,
  competitor_analysis JSONB,
  strategy_recommendations JSONB,
  content_brief JSONB,

  -- Scores
  ai_confidence_score NUMERIC,
  estimated_complexity TEXT,

  -- Control
  status TEXT DEFAULT 'draft', -- draft, analyzing, ready, error
  version INTEGER DEFAULT 1,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### Tabla: products (market_research)

El research completo de 12 pasos se guarda en `products.market_research`:

```sql
ALTER TABLE products
ADD COLUMN market_research JSONB,
ADD COLUMN research_progress JSONB,
ADD COLUMN research_generated_at TIMESTAMPTZ;
```

---

## Componentes Frontend

### 1. ProductDNAWizard
**Archivo:** `src/components/product-dna/ProductDNAWizard.tsx`

**Responsabilidad:** Wizard de captura de audio + selecciones.

**Props:**
```typescript
interface ProductDNAWizardProps {
  clientId: string;
  onComplete: (productDnaId: string) => void;
  onCancel?: () => void;
}
```

### 2. ProductDNADisplay
**Archivo:** `src/components/product-dna/ProductDNADisplay.tsx`

**Responsabilidad:** Visualiza el analisis generado con secciones expandibles.

### 3. ProductDNADashboard
**Archivo:** `src/components/product-dna/ProductDNADashboard.tsx`

**Responsabilidad:** Dashboard con progreso del research y resultados.

### 4. useProductDNA Hook
**Archivo:** `src/hooks/use-product-dna.ts`

**API:**
```typescript
const {
  productDNA,       // ProductDNARecord | null
  isLoading,        // boolean
  error,            // string | null
  isAnalyzing,      // boolean
  isReady,          // boolean
  hasAnalysis,      // boolean
  confidenceScore,  // number

  // CRUD
  create,           // (data) => Promise<ProductDNARecord | null>
  fetch,            // (id) => Promise<ProductDNARecord | null>
  update,           // (updates) => Promise<boolean>
  remove,           // () => Promise<boolean>
  duplicate,        // () => Promise<ProductDNARecord | null>

  // Analysis
  analyze,          // () => Promise<boolean>
  regenerate,       // () => Promise<boolean>

  // Utils
  refresh,          // () => Promise<void>
  reset,            // () => void
} = useProductDNA({ id: "..." });
```

### 5. product-dna.service.ts
**Archivo:** `src/lib/services/product-dna.service.ts`

**Funciones principales:**
```typescript
// CRUD
createProductDNA(input: CreateProductDNAInput): Promise<ServiceResult>
getProductDNA(id: string): Promise<ProductDNARecord | null>
updateProductDNA(id: string, updates: Record<string, any>): Promise<ServiceResult>
deleteProductDNA(id: string): Promise<ServiceResult>
duplicateProductDNA(id: string): Promise<ServiceResult>

// Analysis
analyzeProductDNA(productDnaId: string): Promise<ServiceResult>
regenerateProductDNAAnalysis(productDnaId: string): Promise<ServiceResult>

// Full Research (ADN Recargado)
generateFullResearch(productId: string, tokenContext?: TokenContext): Promise<ServiceResult>
pollResearchProgress(productId: string, onUpdate: callback): () => void
```

---

## Edge Functions

### 1. transcribe-audio-gemini
**Funcion:** Transcribe audio con Whisper, analiza emociones con Gemini.
**Input:** FormData con audio
**Output:** { transcription, emotional_analysis }

### 2. generate-product-dna
**Funcion:** Genera analisis basico del producto.
**Input:** { productDnaId }
**Guarda en:** product_dna (market_research, competitor_analysis, etc.)

### 3. product-research
**Funcion:** Ejecuta los 12 pasos del research completo.
**Input:** { product_id, ... }
**Guarda en:** products.market_research
**Tiempo:** 5-10 minutos (fire-and-forget)

### 4. generate-full-research
**Funcion:** Orquestador que invoca product-research.
**Input:** { product_id, user_id, organization_id, ... }
**Patron:** Fire-and-forget con polling de progreso

---

## Proveedores de IA

| Funcion | Proveedor | Modelo |
|---------|-----------|--------|
| Transcripcion | OpenAI | Whisper |
| Analisis Emocional | Google | Gemini 2.0 Flash |
| Research (12 pasos) | Perplexity | sonar-pro |
| Fallback | Google | Gemini 2.5 Flash |

---

## Flujo de Ejecucion del Research

```
1. Usuario completa wizard en ProductDNAWizard
   |
2. Audio se sube a Supabase Storage
   |
3. transcribe-audio-gemini transcribe + analiza emociones
   |
4. Se crea registro en product_dna
   |
5. Usuario hace clic en "Generar ADN Recargado"
   |
6. generateFullResearch() dispara product-research (fire-and-forget)
   |
7. product-research ejecuta 12 pasos secuencialmente:
   |
   +-- Paso 1: market_overview (Perplexity sonar-pro + busqueda web)
   +-- Paso 2: jtbd (depende de paso 1)
   +-- Paso 3: pains_desires (depende de paso 2)
   +-- Paso 4: competitors (depende de paso 1)
   +-- Paso 5: avatars (depende de pasos 3,4)
   +-- Paso 6: differentiation (depende de pasos 4,5)
   +-- Paso 7: sales_angles (depende de pasos 5,6)
   +-- Paso 8: puv_transformation (depende de paso 7)
   +-- Paso 9: lead_magnets (depende de pasos 3,5)
   +-- Paso 10: video_creatives (depende de pasos 6,7)
   +-- Paso 11: content_calendar (depende de pasos 5,6,7)
   +-- Paso 12: launch_strategy (depende de pasos 5,7,8)
   |
8. Cada paso actualiza products.research_progress
   |
9. Frontend hace polling cada 3s para mostrar progreso
   |
10. Al completar, se guarda en products.market_research
    |
11. Frontend muestra ProductDNADashboard con resultados
```

---

## Archivos Relacionados

### Frontend
- `src/components/product-dna/ProductDNAWizard.tsx` - Wizard de captura
- `src/components/product-dna/ProductDNADisplay.tsx` - Visualizacion
- `src/components/product-dna/ProductDNADashboard.tsx` - Dashboard
- `src/components/product-dna/LocationSelector.tsx` - Selector de ubicaciones
- `src/components/product-dna/steps/*.tsx` - Pasos del wizard
- `src/hooks/use-product-dna.ts` - Hook de estado
- `src/lib/services/product-dna.service.ts` - Servicio CRUD
- `src/lib/product-dna-questions.ts` - Preguntas y opciones
- `src/types/product-dna.ts` - Tipos TypeScript

### Edge Functions
- `supabase/functions/transcribe-audio-gemini/index.ts` - Transcripcion
- `supabase/functions/generate-product-dna/index.ts` - Analisis basico
- `supabase/functions/product-research/index.ts` - Research 12 pasos
- `supabase/functions/generate-full-research/index.ts` - Orquestador

### Migraciones
- `supabase/migrations/20260211200000_product_dna_wizard_v2.sql`
- `supabase/migrations/20260302220000_fix_product_dna_client_access.sql`
- `supabase/migrations/20260303130000_product_dna_prompts.sql`
- `supabase/migrations/20260303140000_improve_product_dna_prompts.sql`

---

## Notas de Implementacion

1. **Fire-and-forget:** El research de 12 pasos toma 5-10 minutos. Se dispara sin esperar respuesta y se hace polling del progreso.

2. **Dependencias entre pasos:** Cada paso puede depender de resultados anteriores (ej: avatars usa pains_desires y competitors).

3. **Busqueda web en tiempo real:** Perplexity sonar-pro busca informacion actualizada de internet para cada paso.

4. **Reintentos automaticos:** 3 intentos por paso con backoff exponencial para errores 429/500.

5. **JSON Schema:** Cada paso tiene un schema JSON estricto para garantizar estructura del output.

6. **Timeout por paso:** 90 segundos maximo por paso individual.

7. **Progreso en tiempo real:** `products.research_progress` se actualiza en cada paso para mostrar avance.
