# ADN de Producto (Product DNA) - Documentación Técnica

## Resumen Ejecutivo

El **ADN de Producto** es un sistema de análisis de proyectos creativos basado en un wizard interactivo. El usuario selecciona tipo de servicio, objetivo, responde 5 preguntas (opcionalmente con audio), y el sistema genera un análisis completo usando Perplexity (mercado) + Gemini (análisis principal).

**Diferencia con ADN Recargado**: El ADN de Producto es un análisis rápido basado en las respuestas del usuario. El ADN Recargado (documentado en `PRODUCT_DNA_DOCUMENTATION.md`) realiza 12 pasos de investigación de mercado con web search en tiempo real.

---

## Arquitectura General

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         FLUJO ADN DE PRODUCTO                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. WIZARD DE CONFIGURACIÓN                                                 │
│     ├── Paso 1: Selección de Tipo de Servicio (8 opciones)                 │
│     ├── Paso 2: Selección de Objetivo (5 opciones)                         │
│     ├── Paso 3: Selección de Plataformas                                    │
│     ├── Paso 4: Selección de Audiencia                                      │
│     └── Paso 5: Urgencia                                                    │
│                                                                             │
│  2. LAS 5 PREGUNTAS                                                        │
│     ├── Pregunta 1: Tu Producto (qué, para quién, diferenciador)           │
│     ├── Pregunta 2: Tu Cliente Ideal (perfil completo)                     │
│     ├── Pregunta 3: El Problema (pain point + consecuencias)               │
│     ├── Pregunta 4: La Transformación (resultado antes/después)            │
│     └── Pregunta 5: Tu Oferta (precio, incluye, garantías)                 │
│                                                                             │
│  3. INPUTS ADICIONALES                                                     │
│     ├── Audio opcional (transcrito con Whisper)                             │
│     ├── Links del producto                                                  │
│     ├── Links de competidores                                               │
│     ├── Links de inspiración                                                │
│     └── Ubicaciones geográficas                                             │
│                                                                             │
│  4. PROCESAMIENTO AI                                                       │
│     ├── Perplexity sonar-large → Análisis de mercado                       │
│     └── Gemini 2.0 Flash → Análisis completo + KIRO insights               │
│                                                                             │
│  5. OUTPUT: ANÁLISIS COMPLETO                                              │
│     ├── executive_summary                                                   │
│     ├── market_analysis (trends, competitors, opportunities, threats)      │
│     ├── target_audience (primary, secondary, pain_points, desires)         │
│     ├── creative_brief (tone, style, key_messages, hooks, CTAs)            │
│     ├── recommendations (immediate, short_term, long_term)                 │
│     ├── creator_profile (traits, content_types, platforms)                 │
│     ├── budget_estimation (range, breakdown)                                │
│     ├── timeline_suggestion (phases, deliverables)                          │
│     └── kiro_insights (5 insights únicos de KIRO)                           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 1. Wizard de Configuración

### Archivo: `src/lib/product-dna-questions.ts`

### Tipos de Servicio (SERVICE_TYPE_OPTIONS)

```typescript
export const SERVICE_TYPE_OPTIONS = [
  { id: 'video_ugc', label: 'Video UGC', emoji: '🎬' },
  { id: 'photo_ugc', label: 'Foto UGC', emoji: '📸' },
  { id: 'carousel', label: 'Carrusel', emoji: '🖼️' },
  { id: 'reels', label: 'Reels/TikToks', emoji: '📱' },
  { id: 'photography', label: 'Fotografía', emoji: '📷' },
  { id: 'video_editing', label: 'Edición', emoji: '✂️' },
  { id: 'graphic_design', label: 'Diseño', emoji: '🎨' },
  { id: 'strategy', label: 'Estrategia', emoji: '📊' },
];
```

### Objetivos (GOAL_OPTIONS)

```typescript
export const GOAL_OPTIONS = [
  { id: 'sales', label: 'Vender', emoji: '💰' },
  { id: 'awareness', label: 'Dar a conocer', emoji: '👁️' },
  { id: 'leads', label: 'Captar leads', emoji: '📋' },
  { id: 'engagement', label: 'Engagement', emoji: '❤️' },
  { id: 'education', label: 'Educar', emoji: '📚' },
];
```

### Plataformas (PLATFORM_OPTIONS)

```typescript
export const PLATFORM_OPTIONS = [
  { id: 'instagram', label: 'Instagram', emoji: '📸' },
  { id: 'tiktok', label: 'TikTok', emoji: '🎵' },
  { id: 'youtube', label: 'YouTube', emoji: '▶️' },
  { id: 'facebook', label: 'Facebook', emoji: '👤' },
  { id: 'linkedin', label: 'LinkedIn', emoji: '💼' },
  { id: 'ads', label: 'Ads', emoji: '📣' },
];
```

### Audiencia (AUDIENCE_OPTIONS)

```typescript
export const AUDIENCE_OPTIONS = [
  { id: '18_24', label: '18-24 años', emoji: '🧑' },
  { id: '25_34', label: '25-34 años', emoji: '👨' },
  { id: '35_44', label: '35-44 años', emoji: '👨‍💼' },
  { id: '45_plus', label: '45+ años', emoji: '👴' },
];
```

### Urgencia (URGENCY_OPTIONS)

```typescript
export const URGENCY_OPTIONS = [
  { id: 'urgent', label: 'Esta semana', emoji: '🔥' },
  { id: 'soon', label: '2 semanas', emoji: '⚡' },
  { id: 'month', label: 'Este mes', emoji: '📅' },
  { id: 'flexible', label: 'Sin prisa', emoji: '🌿' },
];
```

---

## 2. Las 5 Preguntas

### Archivo: `src/lib/product-dna-questions.ts`

```typescript
export const PRODUCT_DNA_QUESTIONS = [
  {
    id: 1,
    block: 'Tu Producto',
    question: '¿Qué producto o servicio ofreces, para quién es y qué lo hace único frente a la competencia?',
    tip: 'Nombre, propuesta de valor, diferenciador principal'
  },
  {
    id: 2,
    block: 'Tu Cliente Ideal',
    question: '¿Quién es la persona que más necesita tu producto? Describe su vida, frustraciones y qué busca.',
    tip: 'Edad, género, ocupación, dolores, deseos'
  },
  {
    id: 3,
    block: 'El Problema',
    question: '¿Cuál es el problema principal que resuelve tu producto? ¿Qué pasa si tu cliente NO lo compra?',
    tip: 'Dolor principal, consecuencia de no actuar'
  },
  {
    id: 4,
    block: 'La Transformación',
    question: '¿Qué resultado concreto obtiene tu cliente? ¿Cómo cambia su vida antes y después?',
    tip: 'Resultado tangible, transformación emocional, casos de éxito'
  },
  {
    id: 5,
    block: 'Tu Oferta',
    question: '¿Cuánto cuesta, qué incluye y qué garantías o testimonios tienes?',
    tip: 'Precio, entregables, garantías, prueba social'
  },
];
```

---

## 3. Estructura de Datos

### Archivo: `src/types/product-dna.ts`

### ProductDNA (Registro Principal)

```typescript
export interface ProductDNA {
  id: string;

  // Relaciones
  client_id: string | null;
  project_id: string | null;
  created_by: string | null;
  organization_id: string;

  // Información del wizard
  service_group: ServiceGroup;          // technology, content_creation, etc.
  selected_services: string[];          // ['video_ugc', 'reels']
  selected_goal: string;                // 'sales', 'awareness', etc.

  // Respuestas del usuario
  responses: Record<string, any>;       // Respuestas a las 5 preguntas

  // Audio
  audio_url: string | null;
  audio_duration: number | null;
  audio_transcript: string | null;

  // Referencias
  product_links: string[];
  competitor_links: string[];
  inspiration_links: string[];

  // Análisis AI
  ai_analysis: AIAnalysis | null;

  // Metadatos de análisis
  analysis_model: string | null;        // 'gemini-2.0-flash-exp'
  analysis_version: number;
  analysis_generated_at: string | null;
  analysis_tokens_used: number | null;

  // Estado
  status: ProductDNAStatus;             // 'draft' | 'processing' | 'completed' | 'failed'
  error_message: string | null;

  // Scores
  completeness_score: number;           // 0-100
  confidence_score: number;             // 0-100

  // Timestamps
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  deleted_at: string | null;
}
```

### AIAnalysis (Output del Análisis)

```typescript
export interface AIAnalysis {
  executive_summary: string;
  market_analysis: MarketAnalysis;
  target_audience: TargetAudience;
  creative_brief: CreativeBrief;
  recommendations: Recommendations;
  creator_profile: CreatorProfile;
  budget_estimation: BudgetEstimation;
  timeline_suggestion: TimelineSuggestion;
  kiro_insights: string[];              // 5 insights únicos de KIRO
}
```

### Subestructuras del Análisis

```typescript
export interface MarketAnalysis {
  trends: string[];                     // 5 tendencias relevantes
  competitors: CompetitorInfo[];        // Análisis de competidores
  opportunities: string[];              // 5 oportunidades de mercado
  threats: string[];                    // 3-5 amenazas o riesgos
  market_size_estimation: string;       // Estimación del tamaño de mercado
}

export interface CompetitorInfo {
  name: string;
  strengths: string[];
  weaknesses: string[];
  differentiator: string;
}

export interface TargetAudience {
  primary: AudienceProfile;
  secondary?: AudienceProfile;
  pain_points: string[];                // 5 puntos de dolor
  desires: string[];                    // 5 deseos/aspiraciones
  buying_triggers: string[];            // 3-5 disparadores de compra
}

export interface AudienceProfile {
  demographic: string;
  psychographic: string;
  behaviors: string[];
  channels: string[];
}

export interface CreativeBrief {
  tone: string;                         // Tono de comunicación
  style: string;                        // Estilo visual/contenido
  key_messages: string[];               // 3-5 mensajes clave
  visual_direction: string;             // Dirección visual
  content_pillars: string[];            // 3-5 pilares de contenido
  hooks_suggestions: string[];          // 5 ganchos creativos
  cta_recommendations: string[];        // 3 CTAs recomendados
}

export interface Recommendations {
  immediate_actions: ActionItem[];      // Acciones inmediatas
  short_term: ActionItem[];             // 1-3 meses
  long_term: ActionItem[];              // 3-6 meses
}

export interface ActionItem {
  action: string;
  priority: 'alta' | 'media' | 'baja';
  estimated_impact: string;
}

export interface CreatorProfile {
  ideal_traits: string[];               // 5 características del creador ideal
  content_types: string[];              // Tipos de contenido
  platforms: string[];                  // Plataformas prioritarias
  collaboration_format: string;         // Formato de colaboración
}

export interface BudgetEstimation {
  range: {
    min: number;
    max: number;
    currency: string;                   // 'USD'
  };
  breakdown: BudgetItem[];
}

export interface BudgetItem {
  category: string;
  percentage: number;
  description: string;
}

export interface TimelineSuggestion {
  total_duration: string;               // 'X semanas/meses'
  phases: TimelinePhase[];
}

export interface TimelinePhase {
  name: string;
  duration: string;
  deliverables: string[];
}
```

---

## 4. Grupos de Servicio

### Archivo: `supabase/functions/analyze-product-dna/index.ts`

El sistema tiene 6 grupos de servicio, cada uno con contexto especializado:

```typescript
const SERVICE_GROUP_CONTEXTS: Record<string, string> = {
  technology: `
    Eres un experto en desarrollo de software, productos digitales y tecnología.
    Contexto de la industria tech en LATAM:
    - Mercado en crecimiento acelerado con adopción digital post-pandemia
    - Preferencia por soluciones mobile-first
    - Importancia de UX/UI para mercados hispanohablantes
    - Ecosistema de startups en Colombia, México, Chile, Argentina
    - Tendencias: IA, automatización, fintech, healthtech, edtech
  `,

  content_creation: `
    Eres un experto en creación de contenido UGC, marketing de contenidos y estrategia digital.
    Contexto del mercado de contenido en LATAM:
    - Boom de creadores de contenido y economía del creator
    - TikTok, Instagram Reels y YouTube Shorts dominan
    - Alto engagement con contenido auténtico vs producido
    - Influencer marketing en evolución hacia micro/nano influencers
    - Live shopping emergente en la región
  `,

  post_production: `
    Eres un experto en producción audiovisual, edición y post-producción.
    Contexto de la industria audiovisual en LATAM:
    - Crecimiento de producción local para streaming
    - Demanda de contenido corto para redes sociales
    - Tendencia hacia contenido vertical (9:16)
    - Motion graphics y animación en alta demanda
    - Podcast y audio content en crecimiento
  `,

  strategy_marketing: `
    Eres un experto en estrategia de marketing digital, growth y branding.
    Contexto del marketing digital en LATAM:
    - Meta (Facebook/Instagram) sigue siendo dominante
    - TikTok con crecimiento explosivo
    - Email marketing con altas tasas de apertura
    - WhatsApp como canal de ventas crucial
    - SEO en español con oportunidades de nicho
  `,

  education_training: `
    Eres un experto en educación digital, e-learning y desarrollo de formación.
    Contexto de la educación digital en LATAM:
    - Mercado de cursos online en expansión
    - Preferencia por contenido en español nativo
    - Microlearning y contenido bite-sized
    - Certificaciones y credenciales digitales valoradas
    - Comunidades de aprendizaje como diferenciador
  `,

  general_services: `
    Eres un experto en consultoría de negocios y servicios profesionales.
    Contexto de servicios profesionales en LATAM:
    - Digitalización acelerada de PYMES
    - Demanda de soluciones integrales
    - Importancia de relaciones personales en negocios
    - Flexibilidad en modelos de trabajo
    - Valor del acompañamiento y seguimiento
  `
};
```

---

## 5. Edge Function: Análisis de Product DNA

### Archivo: `supabase/functions/analyze-product-dna/index.ts`

### Flujo de Procesamiento

```
1. Recibir product_dna_id
       ↓
2. Obtener datos del Product DNA de la base de datos
       ↓
3. Actualizar estado a 'processing'
       ↓
4. Transcribir audio (si existe) con OpenAI Whisper
       ↓
5. Análisis de mercado con Perplexity sonar-large
       ↓
6. Generar análisis principal con Gemini 2.0 Flash
       ↓
7. Calcular scores (completeness + confidence)
       ↓
8. Guardar resultados y actualizar a 'completed'
```

### Análisis de Mercado (Perplexity)

```typescript
async function analyzeMarketWithPerplexity(
  serviceGroup: string,
  goal: string,
  productInfo: string,
  competitorLinks: string[]
): Promise<{
  trends: string[];
  competitors: CompetitorAnalysis[];
  opportunities: string[];
  market_insights: string;
}> {
  const response = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.1-sonar-large-128k-online',
      messages: [
        {
          role: 'system',
          content: 'Eres un analista de mercado experto en Latinoamérica.'
        },
        {
          role: 'user',
          content: `Analiza el mercado para categoría "${serviceGroup}" con objetivo "${goal}"...`
        }
      ],
      temperature: 0.3,
      max_tokens: 2000,
    }),
  });
  // ...
}
```

### Análisis Principal (Gemini)

```typescript
async function generateMainAnalysis(
  input: ProductDNAInput,
  audioTranscript: string,
  marketAnalysis: any
): Promise<AIAnalysisResult> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          role: 'user',
          parts: [{ text: systemPrompt + '\n\n' + userPrompt }]
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 8000,
          responseMimeType: 'application/json'
        }
      }),
    }
  );
  // ...
}
```

---

## 6. Cálculo de Scores

### Completeness Score (0-100)

```typescript
function calculateCompletenessScore(productDna: any): number {
  let score = 0;

  // Service group y goal (20 puntos)
  if (productDna.service_group && productDna.selected_goal) score += 20;

  // Respuestas (30 puntos)
  const responseCount = Object.keys(responses).filter(k => responses[k]).length;
  score += Math.min(responseCount * 3, 30);

  // Audio (20 puntos)
  if (productDna.audio_url) score += 20;

  // Referencias (15 puntos)
  const linkCount = product_links + competitor_links + inspiration_links;
  score += Math.min(linkCount * 3, 15);

  // Servicios seleccionados (15 puntos)
  score += Math.min(servicesCount * 5, 15);

  return Math.min(score, 100);
}
```

### Confidence Score (0-100)

```typescript
function calculateConfidenceScore(productDna: any, audioTranscript: string): number {
  let score = 50; // Base score

  // Audio transcript (+20)
  if (audioTranscript && audioTranscript.length > 100) score += 20;

  // Más respuestas = más confianza (+20 max)
  score += Math.min(responseCount * 2, 20);

  // Referencias (+10)
  if (competitor_links.length > 0) score += 5;
  if (product_links.length > 0) score += 5;

  return Math.min(score, 100);
}
```

---

## 7. Hook de Frontend

### Archivo: `src/hooks/use-product-dna.ts`

```typescript
export function useProductDNA(options: UseProductDNAOptions = {}): UseProductDNAReturn {
  // State
  const [productDNA, setProductDNA] = useState<ProductDNARecord | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Derived state
  const isAnalyzing = productDNA?.status === 'analyzing';
  const isReady = productDNA?.status === 'ready';
  const hasAnalysis = !!(productDNA?.market_research || productDNA?.competitor_analysis);

  // CRUD operations
  const create = async (data: CreateProductDNAInput) => { ... };
  const fetch = async (id: string) => { ... };
  const update = async (updates: Record<string, any>) => { ... };
  const remove = async () => { ... };
  const duplicate = async () => { ... };

  // Analysis operations
  const analyze = async () => { ... };
  const regenerate = async () => { ... };

  // Polling while analyzing
  useEffect(() => {
    if (!currentId || !isAnalyzing) return;
    const cancel = pollProductDNAStatus(currentId, (status, data) => {
      if (data) setProductDNA(data);
      if (status === 'ready') {
        toast({ title: 'Análisis completado' });
      }
    }, 3000, 40);
    return cancel;
  }, [currentId, isAnalyzing]);

  // Realtime subscription
  useEffect(() => {
    if (!currentId) return;
    const channel = supabase
      .channel(`product_dna:${currentId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        table: 'product_dna',
        filter: `id=eq.${currentId}`,
      }, (payload) => {
        setProductDNA(payload.new as ProductDNARecord);
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [currentId]);

  return { productDNA, isLoading, error, create, fetch, update, remove, analyze, ... };
}
```

---

## 8. Selector de Ubicaciones

### Archivo: `src/lib/product-dna-questions.ts`

El sistema incluye un selector tipo Meta Ads con regiones, países y ciudades:

```typescript
export interface GeoLocation {
  id: string;
  name: string;
  type: 'region' | 'country' | 'city';
  country?: string;
  searchTerms?: string[];
}

export const GEO_LOCATIONS: GeoLocation[] = [
  // Regiones
  { id: 'worldwide', name: 'Todo el mundo', type: 'region' },
  { id: 'latam', name: 'Latinoamérica', type: 'region' },
  { id: 'spanish_speaking', name: 'Países hispanohablantes', type: 'region' },

  // Países LATAM
  { id: 'CO', name: 'Colombia', type: 'country' },
  { id: 'MX', name: 'México', type: 'country' },
  { id: 'AR', name: 'Argentina', type: 'country' },
  // ... más países

  // Ciudades principales
  { id: 'CO-BOG', name: 'Bogotá', type: 'city', country: 'CO' },
  { id: 'CO-MDE', name: 'Medellín', type: 'city', country: 'CO' },
  { id: 'MX-MEX', name: 'Ciudad de México', type: 'city', country: 'MX' },
  // ... más ciudades
];

// Función de búsqueda
export function searchGeoLocations(query: string, limit = 10): GeoLocation[] {
  // Búsqueda con normalización de acentos
  // Prioriza coincidencias al inicio
  // Ordena: region > country > city
}
```

---

## 9. Componentes UI

```
src/components/product-dna/
├── ProductDNAWizard.tsx        # Wizard principal
├── ProductDNADisplay.tsx       # Visualización del análisis
├── ProductDNADashboard.tsx     # Dashboard de gestión
├── ProductDNAVersionCompare.tsx # Comparador de versiones
├── LocationSelector.tsx        # Selector tipo Meta Ads
├── index.ts                    # Exports
└── steps/
    ├── AudioStep.tsx           # Paso de grabación de audio
    └── ReviewStep.tsx          # Paso de revisión final
```

---

## 10. Diferencias: ADN de Producto vs ADN Recargado

| Aspecto | ADN de Producto | ADN Recargado |
|---------|-----------------|---------------|
| **Edge Function** | `analyze-product-dna` | `product-research` |
| **Preguntas** | 5 preguntas del wizard | 12 pasos de investigación |
| **Input principal** | Respuestas + audio del usuario | Datos del producto + análisis automático |
| **IA Mercado** | Perplexity sonar-large (offline) | Perplexity sonar-pro (web search) |
| **IA Principal** | Gemini 2.0 Flash | Perplexity sonar-pro |
| **Web Search** | No | Sí (datos en tiempo real) |
| **Duración** | ~30 segundos | ~5-10 minutos (12 llamadas) |
| **Output** | AIAnalysis (9 secciones) | Research completo (12 secciones) |
| **Patrón** | Request-Response | Fire-and-forget + Polling |
| **Uso típico** | Análisis rápido de proyecto | Research profundo de mercado |

---

## 11. Configuración

### Variables de Entorno

```env
PERPLEXITY_API_KEY=pplx-xxxxx
GEMINI_API_KEY=AIza-xxxxx
OPENAI_API_KEY=sk-xxxxx  # Para Whisper
```

### Configuración JWT

```toml
# supabase/config.toml
[functions.analyze-product-dna]
verify_jwt = true
```

---

## 12. Flujo de Usuario

1. **Inicio**: Usuario crea nuevo Product DNA desde cliente o proyecto
2. **Wizard**: Selecciona servicio, objetivo, plataformas, audiencia, urgencia
3. **Preguntas**: Responde 5 preguntas (texto o audio)
4. **Referencias**: Agrega links de producto, competencia e inspiración
5. **Ubicaciones**: Selecciona ubicaciones geográficas
6. **Procesamiento**: Sistema analiza con Perplexity + Gemini (~30 seg)
7. **Resultado**: Se muestra análisis completo con KIRO insights
8. **Acciones**: Puede regenerar, duplicar o exportar el análisis
