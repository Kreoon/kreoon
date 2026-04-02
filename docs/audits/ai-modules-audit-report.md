# Auditoria Completa de Modulos IA - KREOON

**Fecha**: 2026-03-27
**Auditor**: Claude Opus 4.5 (AI-Modules-Auditor Agent)
**Version**: 1.0

---

## Resumen Ejecutivo

Kreoon cuenta con una arquitectura de IA robusta y bien estructurada, compuesta por **50+ Edge Functions** de Supabase, un sistema de tokens centralizado, y un asistente KIRO con capacidades agenticas. La cadena de fallback multi-provider (Gemini -> OpenAI -> Anthropic) proporciona alta disponibilidad.

### Puntuacion General: 7.5/10

| Categoria | Score | Comentario |
|-----------|-------|------------|
| Arquitectura | 8/10 | Bien modularizada, fallback chain solido |
| Sistema de Tokens | 8/10 | Completo con costos granulares |
| Calidad de Outputs | 7/10 | Buenos prompts, pero faltan few-shot examples |
| Costos | 6/10 | Falta caching, algunos prompts muy largos |
| UX | 7/10 | Falta streaming en modulos clave |
| RAG | 4/10 | No implementado (oportunidad de mejora) |

---

## 1. Inventario de Modulos AI

### 1.1 Sistema de Tokens (ai-token-guard)

**Ubicacion**: `supabase/functions/_shared/ai-token-guard.ts`

**Funcionalidades**:
- Verificacion de tokens disponibles antes de cada operacion
- Deduccion atomica via RPC `deduct_ai_tokens`
- Soporte para API custom (bypass de tokens)
- Costos granulares por accion (40+ acciones definidas)

**Tabla de Costos Principales**:

| Accion | Tokens | Categoria |
|--------|--------|-----------|
| research.full | 600 | Alto |
| dna.full_analysis | 500 | Alto |
| dna.project_analysis | 400 | Alto |
| scripts.generate | 120 | Medio |
| board.research_context | 150 | Medio |
| live.generate | 150 | Medio |
| board.analyze_card | 80 | Medio |
| scripts.block.* | 15-25 | Bajo |
| portfolio.caption | 25 | Bajo |
| transcription | 15 | Bajo |

**Frontend**:
- `src/components/ai/AITokensPanel.tsx` - Panel de visualizacion
- `src/hooks/useAITokens.ts` - Hook de gestion
- `src/lib/finance/constants.ts` - Constantes centralizadas

**Planes de Tokens Mensuales**:
```
marcas_free:      300 tokens
starter:        4,000 tokens
pro:           12,000 tokens
business:      40,000 tokens
creator_free:     800 tokens
creator_pro:    6,000 tokens
agency_starter: 20,000 tokens
agency_pro:     60,000 tokens
agency_enterprise: 200,000 tokens
```

**Evaluacion**: 8/10
- Fortalezas: Sistema completo, costos granulares, RPC atomica
- Debilidades: Falta estimacion pre-operacion en UI, no hay alertas proactivas

---

### 1.2 Multi-Provider Fallback

**Ubicacion**: `supabase/functions/multi-ai/index.ts`, `supabase/functions/_shared/ai-providers.ts`

**Proveedores Soportados**:
| Provider | Modelos | API Key Env |
|----------|---------|-------------|
| Gemini | gemini-2.5-flash, gemini-2.5-pro | GOOGLE_AI_API_KEY |
| OpenAI | gpt-4o, gpt-4o-mini | OPENAI_API_KEY |
| Anthropic | claude-sonnet-4-20250514 | ANTHROPIC_API_KEY |
| Perplexity | llama-3.1-sonar-large-128k-online | PERPLEXITY_API_KEY |

**Cadena de Fallback**:
```
Provider Preferido (org config)
    |
    v
Gemini (gemini-2.5-flash)
    |
    v
OpenAI (gpt-4o-mini)
    |
    v
Anthropic (claude-sonnet-4)
```

**Modos de Operacion**:
1. `combine` - Llama a multiples modelos y sintetiza respuestas
2. `first` - Retorna primera respuesta exitosa
3. `individual` - Retorna respuestas de todos los modelos

**Manejo de Errores**:
- 429 (Rate Limit): Salta al siguiente provider
- 402 (Creditos): Salta al siguiente provider
- Logging de fallbacks en consola

**Evaluacion**: 8/10
- Fortalezas: Alta disponibilidad, configuracion por org, deteccion automatica de providers
- Debilidades: No hay metricas de fallback en dashboard, falta retry con backoff exponencial

---

### 1.3 KIRO (AI Assistant)

**Ubicacion Frontend**: `src/components/kiro/`
**Ubicacion Backend**: `supabase/functions/ai-assistant/index.ts`

**Arquitectura**:
```
KiroWidget
    |
    +-- KiroChat (chat principal)
    |      |
    |      +-- ChatBubble
    |      +-- ChatInput
    |      +-- TypingIndicator
    |      +-- ActionSuggestions (Phase 9 - Agentic)
    |
    +-- KiroActions (acciones rapidas)
    +-- KiroNotificationPanel
    +-- Kiro3D (avatar 3D opcional)
```

**Capacidades**:
1. Chat contextual por zona (general, tablero, contenido, etc.)
2. Historial de conversacion (8 mensajes previos)
3. Deteccion de intents para acciones (Phase 9)
4. Feedback de usuarios con persistencia a DB
5. Sistema de gamificacion (puntos UP por feedback)
6. Voice output opcional

**Sistema de Conocimiento**:
- Base de conocimiento de plataforma (hardcodeada)
- Knowledge base por organizacion (ai_assistant_knowledge)
- Flujos conversacionales (ai_conversation_flows)
- Ejemplos positivos (ai_positive_examples)
- Reglas negativas (ai_negative_rules)

**Control de Acceso por Rol**:
```javascript
ROLE_ACCESS_LEVELS = {
  admin: ['all', 'financials', 'team_management', 'client_details', ...],
  strategist: ['content_strategy', 'clients', 'creators', 'scripts', ...],
  editor: ['content_editing', 'assigned_content', 'scripts', ...],
  creator: ['own_content', 'own_assignments', 'own_scripts', ...],
  client: ['own_brand_content', 'own_packages', 'own_products'],
  ambassador: ['referrals', 'own_network', 'commissions', ...],
  viewer: ['public_content', 'basic_info'],
}
```

**Evaluacion**: 7/10
- Fortalezas: Contexto por zona, RBAC solido, feedback loop
- Debilidades: No streaming, sistema de memoria limitado (solo 8 msgs), prompts largos

---

### 1.4 Content AI

**Ubicacion**: `supabase/functions/content-ai/index.ts`

**Acciones Disponibles**:

| Accion | Descripcion | Costo Tokens |
|--------|-------------|--------------|
| generate_script | Genera guion con producto/estrategia | 120 |
| research_and_generate | Guion con investigacion Perplexity | 120+ |
| analyze_content | Analiza guion/video, da feedback | 40 |
| improve_script | Mejora guion basado en feedback | 60 |
| chat | Asistente de contenido general | 20 |

**Integracion con Perplexity** (investigacion en tiempo real):
- `contentTrends` - Tendencias de contenido por nicho/plataforma
- `hookResearch` - Hooks virales por tipo de producto
- `competitorAnalysis` - Analisis de competidores
- `audienceResearch` - Investigacion de audiencia

**Variables de Template**:
```
{producto_nombre}, {producto_descripcion}, {producto_estrategia}
{cta}, {angulo_venta}, {pais_objetivo}, {estructura_narrativa}
{documento_brief}, {documento_research}
{transcripcion_referencia}, {hooks_sugeridos}
```

**Formato de Output** (HTML estructurado):
```html
<div class="script-block" data-type="hooks">
  <div class="block-header">
    <h2 class="block-title">HOOKS</h2>
  </div>
  <div class="block-content">
    <ul class="hook-list">...</ul>
  </div>
</div>
```

**Evaluacion**: 8/10
- Fortalezas: Integracion Perplexity, prompts configurables por org, output estructurado
- Debilidades: Prompts muy largos (~5k chars), falta streaming para generacion larga

---

### 1.5 Board AI

**Ubicacion**: `supabase/functions/board-ai/index.ts`

**Acciones Disponibles**:

| Accion | Descripcion | Tool Call |
|--------|-------------|-----------|
| analyze_card | Analiza tarjeta individual | card_analysis |
| analyze_board | Analiza tablero completo | board_analysis |
| suggest_next_state | Sugiere siguiente estado | next_state_suggestion |
| detect_bottlenecks | Detecta cuellos de botella | (usa analyze_board) |
| recommend_automation | Sugiere automatizaciones | automation_recommendations |
| research_context | Investigacion con Perplexity | (hooks/trends/competitors) |

**Output Estructurado** (via Function Calling):
```json
{
  "current_interpretation": "string",
  "risk_level": "bajo|medio|alto",
  "risk_percentage": 0-100,
  "risk_factors": ["string"],
  "probable_next_state": "string",
  "recommendation": "string",
  "confidence": 0-100,
  "product_insights": { ... }
}
```

**Contexto Enriquecido**:
- Historial de estados (status_logs)
- Dias en estado actual
- Producto asociado (avatar, sales_angles, market_research)
- Equipo asignado (creator, editor, strategist)
- Comentarios recientes

**Evaluacion**: 8/10
- Fortalezas: Function calling para output estructurado, contexto rico, integracion producto
- Debilidades: Puede ser costoso para tableros grandes

---

### 1.6 UP AI Copilot (Sistema de Puntos)

**Ubicacion**: `supabase/functions/up-ai-copilot/index.ts`

**Acciones**:

| Accion | Descripcion |
|--------|-------------|
| quality_score | Evalua calidad de contenido (0-100) |
| detect_events | Detecta eventos para otorgar puntos |
| anti_fraud | Detecta patrones de fraude |
| generate_quests | Genera misiones dinamicas |
| rule_recommendations | Sugiere reglas de puntos |

**Quality Score Breakdown**:
```json
{
  "score": 0-100,
  "breakdown": {
    "hook": 0-100,
    "structure": 0-100,
    "cta": 0-100,
    "coherence": 0-100,
    "viralPotential": 0-100
  },
  "reasons": ["..."],
  "suggestions": ["..."]
}
```

**Evaluacion**: 7/10
- Fortalezas: Sistema completo de gamificacion, evaluacion multi-criterio
- Debilidades: Evaluaciones pueden ser subjetivas sin ejemplos de referencia

---

### 1.7 ADN Research V3 (22 Tabs)

**Ubicacion**: `supabase/functions/adn-research-v3/`

**Estructura**:
```
adn-research-v3/
├── index.ts (orchestrator)
├── context-builder.ts
├── prompts/
│   ├── config.ts
│   └── steps.ts
└── steps/
    ├── step-01-market-overview.ts
    ├── step-02-competition.ts
    ├── step-03-jtbd.ts
    ├── step-04-avatars.ts
    ├── step-05-psychology.ts
    ├── step-06-neuromarketing.ts
    ├── step-07-positioning.ts
    ├── step-08-copywriting.ts
    ├── step-09-puv-offer.ts
    ├── step-11-content-calendar.ts
    ├── step-12-lead-magnets.ts
    ├── step-13-social-media.ts
    ├── step-14-meta-ads.ts
    ├── step-15-tiktok-ads.ts
    ├── step-16-google-ads.ts
    ├── step-17-email-marketing.ts
    ├── step-18-landing-pages.ts
    ├── step-19-launch-strategy.ts
    ├── step-20-metrics.ts
    ├── step-21-organic-content.ts
    └── step-22-executive-summary.ts
```

**Costo Total Estimado**: 600-1200 tokens (research.full)

**Evaluacion**: 7/10
- Fortalezas: Cobertura completa de estrategia, modular por pasos
- Debilidades: Sin caching entre pasos relacionados, puede ser muy costoso

---

### 1.8 Otros Modulos AI

| Modulo | Funcion | Descripcion |
|--------|---------|-------------|
| portfolio-ai | Portfolio/Bio | Genera bios y captions |
| talent-ai | Matching | Sugiere creadores para proyectos |
| streaming-ai | Live | Genera contenido para lives |
| generate-thumbnail | Imagenes | Genera thumbnails con prompts |
| build-image-prompt | Imagenes | Construye prompts para generacion |
| marketplace-ai-search | Busqueda | Busqueda semantica de creadores |

---

## 2. Analisis de Costos

### 2.1 Estimacion de Tokens por Operacion

| Operacion | Tokens Entrada | Tokens Salida | Total Estimado |
|-----------|----------------|---------------|----------------|
| ADN Research Full | ~8,000 | ~15,000 | ~23,000 |
| Script Generate (con research) | ~4,000 | ~2,000 | ~6,000 |
| Script Generate (simple) | ~2,000 | ~1,500 | ~3,500 |
| Board Analyze | ~1,500 | ~800 | ~2,300 |
| Card Analyze | ~1,000 | ~500 | ~1,500 |
| KIRO Chat | ~2,000 | ~500 | ~2,500 |
| Quality Score | ~1,500 | ~300 | ~1,800 |

### 2.2 Costo Monetario Aproximado (Gemini 2.5 Flash)

| Operacion | Costo USD |
|-----------|-----------|
| ADN Research Full | $0.05-0.10 |
| Script Generate | $0.01-0.03 |
| Board Analyze | $0.01 |
| KIRO Chat | $0.01 |

### 2.3 Identificacion de Operaciones Costosas

1. **ADN Research V3**: 22 llamadas secuenciales, sin caching
2. **KIRO Assistant**: System prompt muy largo (~5k chars)
3. **Content AI con Perplexity**: Multiples llamadas paralelas
4. **Board Analyze Board**: Procesa todo el contenido de la org

---

## 3. Calidad de Outputs

### 3.1 Evaluacion por Modulo

| Modulo | Score | Observaciones |
|--------|-------|---------------|
| Content AI | 8/10 | Prompts bien estructurados, output HTML |
| Board AI | 8/10 | Function calling, outputs consistentes |
| KIRO | 7/10 | Buen RBAC, pero respuestas pueden ser genericas |
| UP Copilot | 7/10 | Evaluaciones pueden ser inconsistentes |
| ADN Research | 7/10 | Contenido util pero variable |
| Thumbnail Gen | 6/10 | Depende mucho del prompt del usuario |

### 3.2 Problemas de Calidad Identificados

1. **Falta de Few-Shot Examples**: Los prompts no incluyen ejemplos de respuestas ideales
2. **Validacion de Output**: No hay validacion de JSON/HTML antes de retornar
3. **Consistencia**: Outputs varian significativamente entre ejecuciones
4. **Alucinaciones**: Sin ground truth para verificar datos de mercado

---

## 4. Optimizaciones de Costo (Priorizadas)

### P0 - Criticas (Implementar Inmediatamente)

#### 4.1 Cache de Respuestas Similares
```typescript
// Propuesta: Hash de input -> cache en Redis/KV
const cacheKey = hashPrompt(systemPrompt + userPrompt);
const cached = await kv.get(cacheKey);
if (cached && !forceRefresh) return cached;
```

**Ahorro Estimado**: 30-50% en operaciones repetitivas

#### 4.2 Prompts Mas Cortos para KIRO
- Reducir `PLATFORM_BASE_KNOWLEDGE` de ~2k a ~500 chars
- Cargar knowledge base dinamicamente solo si es relevante

**Ahorro Estimado**: 20% en tokens de entrada

### P1 - Importantes (Implementar en 2-4 semanas)

#### 4.3 Batch Processing para ADN Research
```typescript
// En lugar de 22 llamadas secuenciales
const batchedSteps = [
  [step01, step02], // Market + Competition
  [step03, step04], // JTBD + Avatars
  // ...
];
await Promise.all(batchedSteps.map(batch =>
  Promise.all(batch.map(step => step.execute()))
));
```

**Ahorro Estimado**: 40% en tiempo, mismo costo pero mejor UX

#### 4.4 Modelo por Complejidad de Tarea
```typescript
const MODEL_BY_COMPLEXITY = {
  simple: "gemini-2.5-flash", // captions, chat simple
  medium: "gpt-4o-mini",      // scripts, analisis
  complex: "gpt-4o"           // research, estrategia
};
```

**Ahorro Estimado**: 15-25% usando modelos mas baratos para tareas simples

### P2 - Nice to Have (Backlog)

#### 4.5 Pre-computar Contexto de Producto
- Generar embeddings de productos al crear/actualizar
- Usar similarity search para contexto relevante

#### 4.6 Compresion de Historial de Chat
```typescript
// Resumir mensajes antiguos en lugar de enviar raw
const compressed = await summarizeHistory(oldMessages);
```

---

## 5. Optimizaciones de Calidad (Priorizadas)

### P0 - Criticas

#### 5.1 Agregar Few-Shot Examples a Prompts Clave
```typescript
// content-ai generate_script
const FEW_SHOT = `
EJEMPLO DE GUION EXCELENTE:
[Hook] "Esto me paso hace 3 dias y no lo puedo creer..."
[Desarrollo] Cuenta historia personal, muestra producto naturalmente
[CTA] "Link en bio si quieres probarlo"

EJEMPLO DE GUION MALO:
[Hook] "Hola, hoy les voy a hablar de..."
[Razon] Generico, no genera curiosidad
`;
```

#### 5.2 Validacion de Output Estructurado
```typescript
import { z } from "zod";

const ScriptBlockSchema = z.object({
  type: z.enum(["hook", "script", "cta", "visuals"]),
  content: z.string().min(10),
});

const result = await callAI(...);
const validated = ScriptBlockSchema.safeParse(JSON.parse(result));
if (!validated.success) {
  // Retry o return error
}
```

### P1 - Importantes

#### 5.3 Human-in-the-Loop para Casos Edge
- Flag automatico cuando confidence < 70%
- Queue de revision para admins

#### 5.4 A/B Testing de Prompts
```typescript
// Rotar entre variantes de prompts
const promptVariant = selectVariant(userId, "script_prompt");
// Track metricas: feedback, tiempo de edicion post-generacion
```

### P2 - Nice to Have

#### 5.5 Feedback Loop para Mejora Continua
- Usar ai_chat_feedback para fine-tuning de prompts
- Dashboard de metricas de calidad

---

## 6. Optimizaciones de UX (Priorizadas)

### P0 - Criticas

#### 6.1 Streaming para Respuestas Largas
```typescript
// content-ai, board-ai
const stream = await callAIStream(provider, model, messages);
return new Response(stream, {
  headers: { "Content-Type": "text/event-stream" }
});
```

**Impacto**: Tiempo percibido de espera -70%

#### 6.2 Progress Indicators Granulares
```typescript
// ADN Research V3
const steps = [
  { id: "market", label: "Analizando mercado...", weight: 10 },
  { id: "competition", label: "Investigando competencia...", weight: 15 },
  // ...
];
```

### P1 - Importantes

#### 6.3 Retry Automatico con Backoff
```typescript
const RETRY_CONFIG = {
  maxAttempts: 3,
  baseDelay: 1000,
  backoffMultiplier: 2
};
```

#### 6.4 Fallback Graceful en UI
- Mostrar resultados parciales si falla un step
- Opcion de "reintentar solo este paso"

---

## 7. Arquitectura Recomendada

### 7.1 Implementar RAG (Retrieval Augmented Generation)

**Componentes Sugeridos**:

```
┌─────────────────────────────────────────────────────────┐
│                    RAG Pipeline                          │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌─────────────┐    ┌──────────────┐    ┌────────────┐ │
│  │ Documentos  │ -> │  Embeddings  │ -> │  pgvector  │ │
│  │ (products,  │    │ (text-emb-  │    │  (index)   │ │
│  │  DNA, docs) │    │  ada-002)    │    │            │ │
│  └─────────────┘    └──────────────┘    └────────────┘ │
│                                                          │
│  ┌─────────────┐    ┌──────────────┐    ┌────────────┐ │
│  │ User Query  │ -> │  Similarity  │ -> │  Context   │ │
│  │             │    │  Search      │    │  Injection │ │
│  └─────────────┘    └──────────────┘    └────────────┘ │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

**Tablas a Indexar**:
- `products` (description, strategy, market_research)
- `client_dna` (full document)
- `ai_assistant_knowledge` (content)
- `organization_statuses` (descriptions)

**Beneficios**:
- Contexto mas relevante
- Prompts mas cortos
- Mejor calidad de respuestas

### 7.2 Cache Layer Centralizado

```
┌─────────────────────────────────────────────────────────┐
│                   Cache Architecture                     │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌─────────────┐    ┌──────────────┐    ┌────────────┐ │
│  │ Edge Func   │ -> │ Cache Check  │ -> │  Hit?      │ │
│  │             │    │ (hash key)   │    │  Return    │ │
│  └─────────────┘    └──────────────┘    └────────────┘ │
│         │                                     │ Miss    │
│         v                                     v         │
│  ┌─────────────┐    ┌──────────────┐    ┌────────────┐ │
│  │ AI Provider │ <- │ Rate Limit   │ <- │  Generate  │ │
│  │             │    │ + Fallback   │    │  + Cache   │ │
│  └─────────────┘    └──────────────┘    └────────────┘ │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

**Implementacion Sugerida**: Supabase Edge Config o Upstash Redis

### 7.3 Observabilidad y Metricas

**Dashboard Propuesto**:
```
┌─────────────────────────────────────────────────────────┐
│                 AI Metrics Dashboard                     │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Tokens Consumidos (24h)     │  Fallbacks (24h)         │
│  ████████████████░░░░ 45.2k  │  Gemini->OpenAI: 23      │
│  Limit: 60k                   │  OpenAI->Anthropic: 5   │
│                                                          │
│  Tiempo de Respuesta (p95)   │  Error Rate              │
│  content-ai: 2.3s            │  Rate Limit: 0.5%        │
│  board-ai: 1.8s              │  API Error: 0.1%         │
│  kiro: 1.2s                  │  Timeout: 0.2%           │
│                                                          │
│  Feedback Score              │  Top Actions             │
│  ★★★★☆ 4.2/5                 │  1. scripts.generate     │
│  +12% vs last week           │  2. board.analyze_card   │
│                               │  3. content.chat         │
└─────────────────────────────────────────────────────────┘
```

---

## 8. Plan de Implementacion

### Fase 1 (2 semanas)
- [ ] Implementar streaming en content-ai
- [ ] Agregar few-shot examples a prompts clave
- [ ] Validacion de output con Zod

### Fase 2 (4 semanas)
- [ ] Cache layer con Upstash Redis
- [ ] RAG basico con pgvector
- [ ] Dashboard de metricas AI

### Fase 3 (6 semanas)
- [ ] Optimizar prompts de KIRO
- [ ] A/B testing de prompts
- [ ] Human-in-the-loop para baja confianza

### Fase 4 (8 semanas)
- [ ] Fine-tuning basado en feedback
- [ ] Modelo por complejidad automatico
- [ ] Alertas proactivas de tokens

---

## 9. Conclusion

Kreoon tiene una base solida de IA con buena modularizacion y alta disponibilidad gracias al sistema de fallback. Las principales areas de mejora son:

1. **Costo**: Implementar caching y optimizar prompts
2. **Calidad**: Agregar few-shot examples y validacion
3. **UX**: Streaming para operaciones largas
4. **Observabilidad**: Dashboard de metricas de AI

La implementacion de RAG seria un game-changer para mejorar la relevancia del contexto y reducir el tamano de prompts.

---

**Proximos Pasos Recomendados**:
1. Revisar este documento con el equipo
2. Priorizar items del plan de implementacion
3. Crear tickets en el backlog
4. Asignar ownership por area

---

*Generado automaticamente por AI-Modules-Auditor Agent*
*Claude Opus 4.5 - Marzo 2026*
