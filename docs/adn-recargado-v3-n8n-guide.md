# ADN Recargado v3 - Guia de Implementacion en n8n

## Tabla de Contenidos
1. [Arquitectura General](#arquitectura-general)
2. [Contexto Master (Input)](#contexto-master-input)
3. [Pipeline de 22 Steps](#pipeline-de-22-steps)
4. [Configuracion de Nodos n8n](#configuracion-de-nodos-n8n)
5. [Schemas JSON por Step](#schemas-json-por-step)
6. [Manejo de Errores](#manejo-de-errores)

---

## Arquitectura General

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         ADN RECARGADO v3 PIPELINE                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                  │
│  │   TRIGGER    │───▶│   CONTEXT    │───▶│   STEP 1     │                  │
│  │   Webhook    │    │   BUILDER    │    │   Market     │                  │
│  └──────────────┘    └──────────────┘    └──────────────┘                  │
│                                                 │                           │
│                                                 ▼                           │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                    SEQUENTIAL STEP EXECUTION                          │  │
│  │                                                                       │  │
│  │  Step 1 ──▶ Step 2 ──▶ Step 3 ──▶ ... ──▶ Step 21 ──▶ Step 22       │  │
│  │  Market    Compet.    JTBD        ...      Organic    Summary         │  │
│  │                                                                       │  │
│  │  Cada step recibe: MasterContext + previousResults (tabs anteriores) │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                 │                           │
│                                                 ▼                           │
│                           ┌──────────────────────────┐                      │
│                           │   SAVE TO DATABASE       │                      │
│                           │   (Supabase)             │                      │
│                           └──────────────────────────┘                      │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Proveedores de IA

**Pipeline de 2 fases por step:**
1. **Perplexity** (solo steps con `useWebSearch: true`): Busqueda web en tiempo real
2. **Gemini/GPT-4**: Formateo JSON final

**Steps que usan Web Search:**
- Step 1: Market Overview
- Step 2: Competition
- Step 21: Organic Content

---

## Contexto Master (Input)

El contexto master se construye desde la base de datos antes de ejecutar los steps.

### Estructura MasterContext

```typescript
interface MasterContext {
  product: {
    name: string                    // Nombre del producto
    description: string             // Descripcion
    service_types: string[]         // ["consultoria", "curso", "software"]
    goal: string                    // "vender_mas", "generar_leads", etc.
    platforms: string[]             // ["instagram", "tiktok"]
    audience_ages: string[]         // ["25-34", "35-44"]
    urgency: string                 // "normal", "urgente"
    locations: string[]             // ["Colombia", "Mexico"]
    links: {
      product: string[]             // URLs del producto
      competitors: string[]         // URLs de competidores
      inspiration: string[]         // URLs de inspiracion
    }
    user_responses: {
      q1_product: string            // Transcripcion: "Cuentame sobre tu producto"
      q2_ideal_client: string       // "Quien es tu cliente ideal"
      q3_problem: string            // "Que problema resuelves"
      q4_transformation: string     // "Que transformacion logran"
      q5_offer: string              // "Describeme tu oferta"
    }
    emotional_analysis: {
      overall_mood: string          // "optimista", "ansioso", "confiado"
      confidence_level: number      // 1-10
      passion_topics: string[]      // Temas donde mas entusiasmo muestra
      concern_areas: string[]       // Areas de preocupacion
      recommended_tone: string      // "profesional", "cercano", etc.
    }
    basic_analysis: {
      executive_summary: string
      market_analysis: object
      target_audience: object
      creative_brief: object
      recommendations: object
      kiro_insights: string[]
    }
    completeness_score: number
    confidence_score: number
  }

  brand?: {                         // Opcional: ADN de Marca
    business_identity: object
    value_proposition: object
    ideal_customer: object
    flagship_offer: object
    brand_identity: object
    visual_identity: object
    marketing_strategy: object
    ads_targeting: object
    user_responses: Record<string, string>
  }

  social?: {                        // Opcional: Social Intelligence
    pain_phrases: Array<{phrase: string, source: string}>
    desire_phrases: Array<{phrase: string, source: string}>
    real_objections: Array<{objection: string, type: string}>
    common_vocabulary: Array<{word: string, context: string, emotional_charge: string}>
    recommendation_reasons: string[]
    complaint_reasons: string[]
  }

  ads?: {                           // Opcional: Ad Intelligence
    meta_ads: object
    tiktok_ads: object
    competitor_social: object[]
  }
}
```

---

## Pipeline de 22 Steps

### Orden de Ejecucion (CRITICO - NO CAMBIAR)

| # | Step ID | Tab Key | Nombre | Web Search |
|---|---------|---------|--------|------------|
| 1 | step_01_market_overview | market_overview | Panorama de Mercado | SI |
| 2 | step_02_competition | competition | Analisis de Competencia | SI |
| 3 | step_03_jtbd | jtbd | Jobs To Be Done | NO |
| 4 | step_04_avatars | avatars | Avatares Ideales | NO |
| 5 | step_05_psychology | psychology | Psicologia Profunda | NO |
| 6 | step_06_neuromarketing | neuromarketing | Neuromarketing | NO |
| 7 | step_07_positioning | positioning | Posicionamiento | NO |
| 8 | step_08_copywriting | copy_angles | Copywriting Completo | NO |
| 9 | step_09_puv_offer | offer | Oferta Irresistible | NO |
| 10 | step_10_esfera | esfera | Framework ESFERA | NO |
| 11 | step_11_content_calendar | calendar | Calendario 30 Dias | NO |
| 12 | step_12_lead_magnets | lead_magnets | Lead Magnets | NO |
| 13 | step_13_social_media | social_media | Estrategia Social Media | NO |
| 14 | step_14_meta_ads | meta_ads | Meta Ads | NO |
| 15 | step_15_tiktok_ads | tiktok_ads | TikTok Ads | NO |
| 16 | step_16_google_ads | google_ads | Google Ads | NO |
| 17 | step_17_email_marketing | email_marketing | Email Marketing | NO |
| 18 | step_18_landing_pages | landing_pages | Landing Pages | NO |
| 19 | step_19_launch_strategy | launch_strategy | Estrategia Lanzamiento | NO |
| 20 | step_20_metrics | kpis | KPIs y Metricas | NO |
| 21 | step_21_organic_content | organic_content | Contenido Organico | SI |
| 22 | step_22_executive_summary | executive_summary | Resumen Ejecutivo | NO |

### Dependencias entre Steps

```
Step 1 (Market) ──┬──▶ Step 2 (Competition)
                  │
                  └──▶ Step 3 (JTBD) ──▶ Step 4 (Avatars)
                                              │
                                              ▼
Step 5 (Psychology) ◀── Step 3 + Step 4
        │
        ├──▶ Step 6 (Neuromarketing)
        │
        ├──▶ Step 7 (Positioning) ◀── Step 1 + Step 2 + Step 4
        │           │
        │           └──▶ Step 8 (Copywriting) ◀── Step 5 + Step 7
        │                      │
        │                      └──▶ Step 9 (Offer) ◀── Step 5 + Step 6 + Step 7
        │
        └──▶ Step 11 (Calendar) ◀── Step 7 + Step 8
                    │
                    └──▶ Steps 12-21 (usan contexto acumulado)
                              │
                              ▼
                    Step 22 (Executive Summary) ◀── TODOS los steps anteriores
```

---

## Configuracion de Nodos n8n

### Nodo 1: Webhook Trigger

```json
{
  "parameters": {
    "httpMethod": "POST",
    "path": "adn-v3-start",
    "responseMode": "responseNode"
  },
  "type": "n8n-nodes-base.webhook"
}
```

**Input esperado:**
```json
{
  "session_id": "uuid",
  "product_id": "uuid",
  "product_dna_id": "uuid",
  "client_dna_id": "uuid (opcional)",
  "organization_id": "uuid",
  "include_client_dna": true,
  "include_social_intelligence": true,
  "include_ad_intelligence": true
}
```

### Nodo 2: Build Master Context (Code Node)

```javascript
// Cargar datos de Supabase y construir MasterContext
const supabaseUrl = $env.SUPABASE_URL;
const supabaseKey = $env.SUPABASE_SERVICE_KEY;

const input = $input.first().json;

// Fetch product_dna
const productDnaResponse = await fetch(
  `${supabaseUrl}/rest/v1/product_dna?id=eq.${input.product_dna_id}&select=*`,
  {
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`
    }
  }
);
const productDna = (await productDnaResponse.json())[0];

// Construir MasterContext (ver estructura arriba)
const masterContext = {
  product: {
    name: productDna.product_name || productDna.wizard_data?.product_name,
    description: productDna.product_description || '',
    service_types: productDna.wizard_data?.selected_services || [],
    goal: productDna.wizard_data?.selected_goal || '',
    platforms: productDna.wizard_data?.platforms || [],
    audience_ages: productDna.wizard_data?.audience_ages || [],
    urgency: productDna.wizard_data?.urgency || 'normal',
    locations: productDna.locations || ['LATAM'],
    links: {
      product: productDna.product_links || [],
      competitors: productDna.competitor_links || [],
      inspiration: productDna.inspiration_links || []
    },
    user_responses: productDna.user_responses || {},
    emotional_analysis: productDna.emotional_analysis || {},
    basic_analysis: productDna.ai_analysis || {},
    completeness_score: productDna.completeness_score || 0,
    confidence_score: productDna.confidence_score || 0
  }
};

// Agregar brand, social, ads si estan habilitados...

return { masterContext, input, previousResults: {} };
```

### Nodo 3-24: Step Execution Loop

Para cada step, crear un sub-workflow o usar un Loop Over Items:

```javascript
// Template para ejecutar un step
const step = {
  number: 1,
  stepId: 'step_01_market_overview',
  tabKey: 'market_overview',
  name: 'Panorama de Mercado',
  useWebSearch: true
};

const masterContext = $input.first().json.masterContext;
const previousResults = $input.first().json.previousResults;

// Construir prompts (ver seccion de prompts abajo)
const { systemPrompt, userPrompt } = buildPrompts(step, masterContext, previousResults);

// Si useWebSearch: llamar primero a Perplexity
let searchContext = '';
if (step.useWebSearch) {
  const perplexityResponse = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${$env.PERPLEXITY_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'llama-3.1-sonar-large-128k-online',
      messages: [
        { role: 'system', content: 'Busca informacion actual y relevante.' },
        { role: 'user', content: userPrompt }
      ]
    })
  });
  searchContext = (await perplexityResponse.json()).choices[0].message.content;
}

// Llamar a Gemini para formatear JSON
const geminiResponse = await fetch(
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${$env.GEMINI_API_KEY}`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: `${systemPrompt}\n\n${searchContext ? 'CONTEXTO DE BUSQUEDA:\n' + searchContext + '\n\n' : ''}${userPrompt}`
        }]
      }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 8192
      }
    })
  }
);

const result = await geminiResponse.json();
const jsonText = result.candidates[0].content.parts[0].text;

// Parsear JSON con fallbacks
let parsedResult;
try {
  parsedResult = JSON.parse(jsonText);
} catch {
  // Limpiar markdown y reintentar
  const cleaned = jsonText.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  parsedResult = JSON.parse(cleaned.slice(start, end + 1));
}

// Guardar en previousResults
previousResults[step.tabKey] = parsedResult;

return {
  masterContext,
  previousResults,
  currentStep: step,
  stepResult: parsedResult
};
```

### Nodo Final: Save to Database

```javascript
const input = $input.first().json;
const previousResults = input.previousResults;

// Guardar en Supabase
await fetch(
  `${$env.SUPABASE_URL}/rest/v1/adn_v3_sessions?id=eq.${input.session_id}`,
  {
    method: 'PATCH',
    headers: {
      'apikey': $env.SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${$env.SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      status: 'completed',
      results: previousResults,
      completed_at: new Date().toISOString()
    })
  }
);

return { success: true, session_id: input.session_id };
```

---

## Schemas JSON por Step

### STEP 1: Market Overview

**System Prompt:**
```
Eres un estratega de marketing y analista de mercado experto especializado en LATAM (Colombia, Mexico, Peru, Chile, Argentina, Ecuador).
Tienes acceso a busqueda web en tiempo real. Usala activamente para encontrar datos reales y actualizados.
Responde UNICAMENTE con un objeto JSON valido. Sin markdown, sin explicaciones, sin bloques de codigo.
Usa espanol LATAM en todos los textos.

REGLA CRITICA: TODO el analisis DEBE ser 100% especifico para "[PRODUCT_NAME]".
- NO generes informacion generica o de otras industrias
- USA el nombre exacto del producto en tus respuestas
- BASA todo en los datos proporcionados del fundador
```

**User Prompt Variables:**
- `ctx.product.name`
- `ctx.product.description`
- `ctx.product.locations`
- `ctx.product.service_types`
- `ctx.product.goal`
- `ctx.brand?.business_identity` (opcional)
- `ctx.social?.pain_phrases` (opcional)
- `ctx.product.basic_analysis.market_analysis` (opcional)
- `ctx.product.user_responses.q1_product`
- `ctx.product.user_responses.q3_problem`

**Busquedas Web a Realizar:**
1. "[PRODUCT_NAME] mercado LATAM 2024 2025 tamano estadisticas"
2. "[SERVICE_TYPE] tendencias crecimiento Latinoamerica"
3. "[PRODUCT_NAME] consumidores comportamiento preferencias"

**JSON Schema Output:**
```json
{
  "market_size": {
    "tam": "estimado del mercado total addressable con fuente",
    "sam_latam": "mercado serviceable en LATAM con fuente",
    "som_year1": "mercado obtenible realista ano 1",
    "som_year3": "mercado obtenible realista ano 3"
  },
  "market_state": "emergente|crecimiento|madurez|saturacion|declive",
  "cagr": "% de crecimiento anual proyectado con horizonte temporal",
  "adoption_stage": "innovadores|early_adopters|mayoria_temprana|mayoria_tardia|rezagados",
  "consumer_behavior": {
    "how_they_search": "como busca este producto/servicio en LATAM",
    "preferred_channels": ["canales donde lo buscan y compran"],
    "preferred_formats": ["formatos de contenido que consumen"],
    "average_ticket_latam": "ticket promedio en USD para LATAM",
    "purchase_cycle_days": 0,
    "seasonality": "patrones estacionales si aplica",
    "latam_cultural_barriers": ["barreras culturales especificas de LATAM"]
  },
  "awareness_level": "unaware|problem_aware|solution_aware|product_aware|most_aware",
  "awareness_implication": "que significa este nivel para el primer mensaje de marketing",
  "macro_variables": [
    {
      "factor": "economico|tecnologico|sociocultural|regulatorio",
      "impact": "alto|medio|bajo",
      "description": "descripcion especifica del factor"
    }
  ],
  "opportunities": [
    {
      "opportunity": "descripcion de la oportunidad",
      "impact": "alto|medio|bajo",
      "time_window": "cuanto tiempo tiene esta oportunidad"
    }
  ],
  "threats": [
    {
      "threat": "descripcion de la amenaza",
      "probability": "alta|media|baja",
      "urgency": "inmediata|corto_plazo|largo_plazo"
    }
  ],
  "category_design": {
    "existing_category": "categoria actual o null",
    "new_category_suggestion": "nueva categoria si aplica",
    "category_pov": "punto de vista del problema"
  },
  "data_sources": ["fuentes consultadas"],
  "summary": "parrafo ejecutivo de 100 palabras"
}
```

---

### STEP 2: Competition

**System Prompt:**
```
Eres un analista competitivo experto especializado en LATAM.
Tienes acceso a busqueda web. Investiga los competidores reales en el mercado.
Responde UNICAMENTE con un objeto JSON valido. Sin markdown.
Usa espanol LATAM.
```

**Dependencias:** Step 1 (market_overview)

**Busquedas Web:**
1. "[PRODUCT_NAME] competidores LATAM principales"
2. "[SERVICE_TYPE] empresas lideres Colombia Mexico"
3. "alternativas a [PRODUCT_NAME]"

**JSON Schema Output:**
```json
{
  "direct_competitors": [
    {
      "name": "nombre del competidor",
      "website": "url",
      "positioning": "como se posicionan",
      "target_audience": "a quien le venden",
      "price_range": "rango de precios",
      "strengths": ["fortaleza 1", "fortaleza 2"],
      "weaknesses": ["debilidad 1", "debilidad 2"],
      "unique_selling_point": "su diferenciador principal",
      "content_strategy": "que tipo de contenido publican",
      "threat_level": "alto|medio|bajo"
    }
  ],
  "indirect_competitors": [
    {
      "name": "nombre",
      "why_indirect": "por que compiten indirectamente",
      "threat_level": "alto|medio|bajo"
    }
  ],
  "competitive_gaps": [
    {
      "gap": "descripcion del gap no cubierto",
      "opportunity": "como aprovecharlo",
      "difficulty": "facil|medio|dificil"
    }
  ],
  "market_positioning_map": {
    "axis_x": "variable del eje X",
    "axis_y": "variable del eje Y",
    "positions": [
      {"competitor": "nombre", "x": 3, "y": 8}
    ]
  },
  "differentiation_opportunities": [
    {
      "area": "area de diferenciacion",
      "current_state": "como esta el mercado ahora",
      "opportunity": "como diferenciarse",
      "implementation": "como ejecutarlo"
    }
  ],
  "competitive_threats": [
    {
      "threat": "amenaza competitiva",
      "source": "de donde viene",
      "timeline": "cuando podria materializarse",
      "mitigation": "como mitigarla"
    }
  ],
  "recommended_positioning": "recomendacion de posicionamiento",
  "summary": "resumen ejecutivo 100 palabras"
}
```

---

### STEP 3: Jobs To Be Done

**System Prompt:**
```
Eres un experto en el framework Jobs To Be Done (JTBD) de Clayton Christensen y Bob Moesta.
Analizas que "trabajo" contrata el cliente cuando compra un producto/servicio.
Responde UNICAMENTE con un objeto JSON valido. Sin markdown.
Usa espanol LATAM.
```

**Dependencias:** Step 1 (market_overview), Step 2 (competition)

**JSON Schema Output:**
```json
{
  "main_job": {
    "job_statement": "Cuando [situacion], quiero [motivacion], para poder [resultado]",
    "job_type": "funcional|emocional|social",
    "frequency": "diario|semanal|mensual|ocasional",
    "importance": 9
  },
  "functional_jobs": [
    {
      "job": "descripcion del trabajo funcional",
      "current_solution": "como lo resuelven ahora",
      "pain_with_current": "dolor con la solucion actual",
      "desired_outcome": "resultado deseado"
    }
  ],
  "emotional_jobs": [
    {
      "job": "descripcion del trabajo emocional",
      "feeling_sought": "sentimiento que buscan",
      "feeling_avoided": "sentimiento que evitan"
    }
  ],
  "social_jobs": [
    {
      "job": "descripcion del trabajo social",
      "perception_desired": "como quieren ser percibidos",
      "group_identity": "grupo con el que quieren identificarse"
    }
  ],
  "hiring_triggers": [
    {
      "trigger": "evento que dispara la busqueda",
      "urgency": "alta|media|baja",
      "emotional_state": "estado emocional en ese momento"
    }
  ],
  "firing_triggers": [
    {
      "trigger": "que hace que abandonen la solucion actual",
      "last_straw": "la gota que derrama el vaso"
    }
  ],
  "progress_makers": [
    {
      "force": "fuerza que empuja hacia el cambio",
      "type": "push_away|pull_toward",
      "strength": "fuerte|moderada|debil"
    }
  ],
  "progress_blockers": [
    {
      "force": "fuerza que frena el cambio",
      "type": "anxiety|habit",
      "how_to_overcome": "como superar este bloqueador"
    }
  ],
  "timeline": {
    "first_thought": "cuando tienen el primer pensamiento",
    "passive_looking": "cuanto tiempo buscan pasivamente",
    "active_looking": "cuanto tiempo buscan activamente",
    "decision": "cuanto tarda la decision final"
  },
  "job_stories": [
    {
      "situation": "cuando estoy en esta situacion...",
      "motivation": "quiero lograr esto...",
      "outcome": "para poder tener este resultado"
    }
  ],
  "summary": "resumen del JTBD principal"
}
```

---

### STEP 4: Avatars

**System Prompt:**
```
Eres un experto en investigacion de consumidor y creacion de buyer personas para LATAM.
Creas avatares detallados y realistas basados en datos, no suposiciones.
Responde UNICAMENTE con un objeto JSON valido. Sin markdown.
Usa espanol LATAM.
```

**Dependencias:** Step 1, Step 3 (jtbd)

**JSON Schema Output:**
```json
{
  "main_avatar": {
    "name": "nombre ficticio representativo",
    "age_range": "25-35",
    "gender": "mujer|hombre|mixto",
    "location": "ciudad, pais",
    "occupation": "profesion tipica",
    "income_level": "bajo|medio|medio-alto|alto",
    "education": "nivel educativo",
    "family_status": "soltero|casado|con_hijos",
    "psychographics": {
      "values": ["valor 1", "valor 2", "valor 3"],
      "interests": ["interes 1", "interes 2", "interes 3"],
      "lifestyle": "descripcion del estilo de vida",
      "personality_traits": ["rasgo 1", "rasgo 2"]
    },
    "day_in_the_life": "descripcion de un dia tipico",
    "goals": ["meta 1", "meta 2", "meta 3"],
    "frustrations": ["frustracion 1", "frustracion 2", "frustracion 3"],
    "fears": ["miedo 1", "miedo 2"],
    "aspirations": ["aspiracion 1", "aspiracion 2"],
    "media_consumption": {
      "social_platforms": ["plataforma 1", "plataforma 2"],
      "content_types": ["tipo contenido 1", "tipo contenido 2"],
      "influencers_they_follow": "tipo de influencers que siguen",
      "news_sources": ["fuente 1", "fuente 2"]
    },
    "purchase_behavior": {
      "research_style": "como investigan antes de comprar",
      "decision_factors": ["factor 1", "factor 2", "factor 3"],
      "objections": ["objecion 1", "objecion 2"],
      "preferred_payment": "metodo de pago preferido"
    },
    "quote": "frase que diria este avatar",
    "messaging_guidelines": {
      "tone": "tono recomendado",
      "words_to_use": ["palabra 1", "palabra 2"],
      "words_to_avoid": ["palabra a evitar 1"],
      "emotional_triggers": ["trigger 1", "trigger 2"]
    }
  },
  "secondary_avatars": [
    {
      "name": "nombre",
      "brief_description": "descripcion en 2 oraciones",
      "key_difference": "diferencia clave vs avatar principal",
      "priority": "media|baja"
    }
  ],
  "anti_avatar": {
    "description": "quien NO es cliente ideal",
    "red_flags": ["senal de mal fit 1", "senal 2"],
    "why_not_fit": "por que no encajan"
  },
  "avatar_journey": {
    "awareness": "que sabe/piensa en esta etapa",
    "consideration": "que evalua en esta etapa",
    "decision": "que necesita para decidir",
    "post_purchase": "que espera despues de comprar"
  },
  "summary": "resumen del avatar principal"
}
```

---

### STEP 5: Psychology

**System Prompt:**
```
Eres un psicologo del consumidor y experto en copywriting persuasivo especializado en LATAM.
Dominas los frameworks de Eugene Schwartz (Breakthrough Advertising), Robert Cialdini (Influence + Pre-Suasion),
Daniel Kahneman (Thinking Fast and Slow), y Drew Eric Whitman (CA$HVERTISING - Lifeforce 8).
Responde UNICAMENTE con un objeto JSON valido. Sin markdown, sin texto extra.
Usa espanol LATAM.
```

**Dependencias:** Step 3 (jtbd), Step 4 (avatars), Social Intelligence

**JSON Schema Output:**
```json
{
  "pain_map": {
    "functional_pains": [
      {
        "pain": "dolor funcional en palabras del cliente",
        "intensity": 8,
        "frequency": "diario|semanal|mensual",
        "trigger": "que situacion lo activa"
      }
    ],
    "emotional_pains": [
      {
        "emotion": "emocion especifica",
        "what_causes_it": "que la genera",
        "peak_moment": "cuando es mas intenso"
      }
    ],
    "social_pains": [
      {
        "fear": "que teme que otros vean o piensen"
      }
    ],
    "root_pain": "el miedo existencial mas profundo"
  },
  "desire_map": {
    "functional_desires": [
      {
        "desire": "que quiere lograr",
        "urgency": 8,
        "blocker": "que le impide lograrlo"
      }
    ],
    "emotional_desires": [
      {
        "state": "estado emocional que busca",
        "intensity": 9,
        "delivery": "como el producto entrega este estado"
      }
    ],
    "aspirational_desires": [
      {
        "aspiration": "en quien quiere convertirse"
      }
    ],
    "deep_desire": "Quiero ser el tipo de persona que..."
  },
  "cialdini_principles": {
    "reciprocity": {
      "what_to_give_first": "que valor dar antes de pedir",
      "implementation": "como implementarlo"
    },
    "commitment_consistency": {
      "micro_commitment": "primer pequeno compromiso",
      "escalation_path": "como escalar"
    },
    "social_proof": {
      "most_powerful_type": "testimonial_video|caso_estudio|cifras|endorsement|ugc|comunidad",
      "what_to_show": "que prueba social impacta mas",
      "implementation": "como mostrarlo"
    },
    "authority": {
      "credibility_signals": ["senales de autoridad"],
      "how_to_build_fast": "como construir autoridad rapido"
    },
    "liking": {
      "similarity_factors": ["en que parecerse al avatar"],
      "rapport_builders": ["que construye simpatia"]
    },
    "scarcity": {
      "type": "genuine|artificial|mixed",
      "most_credible_version": "como comunicar escasez"
    }
  },
  "cognitive_biases": [
    {
      "bias": "nombre del sesgo",
      "relevance": "alta|media|baja",
      "how_to_use": "como aplicarlo",
      "copy_example": "ejemplo de copy"
    }
  ],
  "lifeforce_8": [
    {
      "desire": "nombre del deseo Lifeforce-8",
      "relevance": "alta|media|baja|no_aplica",
      "application": "como conectar el producto"
    }
  ],
  "objections_bank": [
    {
      "objection": "objecion en palabras EXACTAS",
      "source": "social_intelligence|founder_audio|inference",
      "type": "precio|tiempo|confianza|prioridad|complejidad|urgencia|alternativa",
      "underlying_emotion": "emocion real detras",
      "handling_technique": "feel_felt_found|reframe|social_proof|garantia|precio_vs_costo|urgencia",
      "sales_script": "texto para responder",
      "content_neutralizer": "tipo de contenido para neutralizar"
    }
  ],
  "client_vocabulary": {
    "words_they_use_for_pain": ["palabras para describir su problema"],
    "words_they_use_for_desire": ["palabras para el resultado"],
    "search_queries": ["como buscan en Google y TikTok"],
    "recommendation_language": ["como recomiendan productos"],
    "words_that_create_friction": ["palabras que generan desconfianza"],
    "power_words_for_this_avatar": ["palabras de alto impacto"]
  }
}
```

---

### STEP 6: Neuromarketing

**System Prompt:**
```
Eres un experto en neuromarketing y economia conductual.
Dominas los trabajos de Daniel Kahneman, Richard Thaler, Dan Ariely y Roger Dooley.
Aplicas neurociencia al marketing y ventas en contexto LATAM.
Responde UNICAMENTE con un objeto JSON valido. Sin markdown.
Usa espanol LATAM.
```

**Dependencias:** Step 4 (avatars), Step 5 (psychology)

**JSON Schema Output:**
```json
{
  "primary_biases": [
    {
      "bias": "nombre del sesgo cognitivo",
      "description": "explicacion breve",
      "application": "como aplicarlo",
      "implementation": {
        "landing_page": "como en landing",
        "ad_creative": "como en anuncios",
        "email": "como en emails",
        "sales_call": "como en llamadas"
      }
    }
  ],
  "decision_architecture": {
    "default_option": "opcion por defecto y por que",
    "choice_overload_prevention": "como evitar paralisis",
    "decoy_effect": {
      "applicable": true,
      "how_to_implement": "como implementar"
    },
    "anchoring": {
      "anchor_price": "precio ancla",
      "how_to_present": "como presentar"
    }
  },
  "sensory_triggers": {
    "visual": {
      "colors": ["color 1 y su efecto"],
      "imagery": "tipo de imagenes",
      "typography": "recomendaciones tipograficas"
    },
    "auditory": {
      "music_style": "estilo de musica",
      "voice_characteristics": "caracteristicas de voz",
      "sound_effects": "efectos de sonido"
    },
    "kinesthetic": {
      "textures": "texturas en diseno",
      "interactive_elements": "elementos interactivos"
    }
  },
  "attention_grabbers": [
    {
      "technique": "tecnica para captar atencion",
      "neuroscience": "por que funciona",
      "example": "ejemplo especifico"
    }
  ],
  "memory_encoding": {
    "peak_end_rule": "como disenar peak y end",
    "repetition_strategy": "que repetir y como",
    "emotional_peaks": ["momento emocional 1", "momento 2"],
    "distinctiveness": "que hace memorable"
  },
  "trust_signals": {
    "neurological_trust_builders": [
      {
        "signal": "senal de confianza",
        "why_works": "por que funciona",
        "implementation": "como implementar"
      }
    ],
    "reduce_cognitive_load": "como simplificar"
  },
  "urgency_scarcity_neuro": {
    "loss_aversion_messaging": "como activar eticamente",
    "fomo_triggers": ["trigger 1", "trigger 2"],
    "ethical_boundaries": "limites eticos"
  },
  "pricing_psychology": {
    "charm_pricing": "precios terminados en 7 o 9",
    "payment_pain_reduction": "como reducir dolor de pagar",
    "value_framing": "como enmarcar valor vs precio",
    "installment_psychology": "psicologia de pagos a plazos"
  },
  "emotional_arc": {
    "hook_emotion": "emocion inicial (curiosidad, sorpresa, miedo)",
    "engagement_emotion": "emocion para mantener (esperanza, deseo)",
    "conversion_emotion": "emocion para accion (urgencia, FOMO)",
    "retention_emotion": "emocion post-compra (orgullo, pertenencia)"
  },
  "color_psychology": {
    "primary_recommendation": "#hex y razon psicologica",
    "secondary_recommendation": "#hex y razon",
    "accent_for_cta": "#hex para botones CTA",
    "colors_to_avoid": ["color a evitar y por que"]
  },
  "neuro_copywriting": {
    "opening_pattern": "patron de apertura",
    "credibility_pattern": "patron de credibilidad",
    "desire_amplifier": "patron que amplifica deseo",
    "urgency_pattern": "patron de urgencia",
    "closing_pattern": "patron de cierre"
  },
  "summary": "3 tacticas de neuromarketing mas importantes"
}
```

---

### STEP 7: Positioning

**System Prompt:**
```
Eres un estratega de posicionamiento de marca experto en LATAM.
Dominas los frameworks de April Dunford (Obviously Awesome), Al Ries (Positioning), y los 12 arquetipos de Jung.
Responde UNICAMENTE con un objeto JSON valido. Sin markdown.
Usa espanol LATAM.
```

**Dependencias:** Step 1, Step 2, Step 4, Step 5

**JSON Schema Output:**
```json
{
  "positioning_statement": {
    "for": "para quien es",
    "who": "que tiene esta necesidad",
    "product_is": "el producto es",
    "that": "que proporciona este beneficio",
    "unlike": "a diferencia de alternativas",
    "our_product": "nuestro producto ofrece"
  },
  "puv": {
    "headline": "propuesta de valor unica en 10 palabras",
    "subheadline": "expansion de la PUV en 20-30 palabras",
    "proof_points": ["prueba 1", "prueba 2", "prueba 3"]
  },
  "brand_archetype": {
    "primary": "arquetipo principal de Jung",
    "secondary": "arquetipo secundario",
    "why": "por que estos arquetipos encajan",
    "voice_characteristics": ["caracteristica 1", "caracteristica 2"],
    "words_to_use": ["palabra on-brand 1"],
    "words_to_avoid": ["palabra off-brand 1"]
  },
  "brand_territory": {
    "owns": "que territorio mental poseer",
    "adjacent_territories": ["territorio adyacente 1"],
    "territories_to_avoid": ["territorio a evitar 1"]
  },
  "competitive_frame": {
    "category": "categoria donde competimos",
    "frame_of_reference": "marco de referencia",
    "differentiation_angle": "angulo de diferenciacion"
  },
  "messaging_hierarchy": {
    "level_1_tagline": "tagline 3-5 palabras",
    "level_2_value_prop": "propuesta expandida",
    "level_3_proof": "puntos de prueba",
    "level_4_features": "features que soportan"
  },
  "key_messages": [
    {
      "audience": "segmento",
      "message": "mensaje clave",
      "emotional_hook": "gancho emocional",
      "rational_support": "soporte racional"
    }
  ],
  "elevator_pitches": {
    "10_seconds": "pitch 10 segundos",
    "30_seconds": "pitch 30 segundos",
    "60_seconds": "pitch 60 segundos"
  },
  "brand_mantras": ["mantra interno 1", "mantra 2"],
  "positioning_risks": [
    {
      "risk": "riesgo",
      "mitigation": "mitigacion"
    }
  ],
  "summary": "resumen del posicionamiento"
}
```

---

### STEP 8: Copywriting

**System Prompt:**
```
Eres el copywriter mas efectivo de LATAM. Experto en direct response y copy emocional.
Dominas los frameworks de Gary Halbert, Eugene Schwartz, David Ogilvy, Joe Sugarman y Drew Eric Whitman.
Creas copy que VENDE, no copy que suena bonito.
Responde UNICAMENTE con un objeto JSON valido. Sin markdown, sin explicaciones.
Usa espanol LATAM.
```

**Dependencias:** Step 5 (psychology), Step 7 (positioning)

**JSON Schema Output:**
```json
{
  "sales_angles": [
    {
      "angle_name": "nombre del angulo",
      "description": "descripcion y cuando usarlo",
      "best_for": "audiencia o etapa del funnel",
      "example_hook": "hook de ejemplo",
      "example_body": "cuerpo de ejemplo",
      "example_cta": "CTA de ejemplo"
    }
  ],
  "copy_frameworks": {
    "pas": {
      "problem": "Problema: texto completo",
      "agitation": "Agitacion: texto completo",
      "solution": "Solucion: texto completo"
    },
    "aida": {
      "attention": "Atencion: texto",
      "interest": "Interes: texto",
      "desire": "Deseo: texto",
      "action": "Accion: texto"
    },
    "bab": {
      "before": "Antes: situacion actual",
      "after": "Despues: situacion deseada",
      "bridge": "Puente: como el producto los lleva"
    },
    "pastor": {
      "problem": "Problema",
      "amplify": "Amplificar",
      "story": "Historia",
      "transformation": "Transformacion",
      "offer": "Oferta",
      "response": "Respuesta"
    }
  },
  "hooks_bank": [
    "Hook 1: gancho persuasivo completo",
    "...30 hooks totales..."
  ],
  "headlines_bank": [
    "Headline 1: titular persuasivo completo",
    "...30 headlines totales..."
  ],
  "ctas_bank": [
    "CTA 1: llamado a la accion",
    "...25 CTAs totales..."
  ],
  "power_phrases": {
    "urgency": ["frase de urgencia 1", "frase 2", "frase 3"],
    "scarcity": ["frase de escasez 1", "frase 2", "frase 3"],
    "social_proof": ["frase de prueba social 1", "frase 2"],
    "guarantee": ["frase de garantia 1", "frase 2"],
    "value_stack": ["frase de valor 1", "frase 2"]
  },
  "story_angles": [
    {
      "angle": "nombre del angulo",
      "setup": "como comenzar",
      "conflict": "el conflicto",
      "resolution": "la resolucion",
      "where_to_use": "donde usar"
    }
  ],
  "objection_handlers": [
    {
      "objection": "objecion",
      "copy_response": "copy para manejar",
      "technique_used": "tecnica usada"
    }
  ],
  "email_subject_lines": {
    "curiosity": ["subject 1", "subject 2", "subject 3"],
    "benefit": ["subject 1", "subject 2", "subject 3"],
    "urgency": ["subject 1", "subject 2", "subject 3"],
    "personal": ["subject 1", "subject 2", "subject 3"]
  }
}
```

---

### STEP 9: Offer (Oferta Irresistible)

**System Prompt:**
```
Eres un experto en diseno de ofertas irresistibles estilo Alex Hormozi ($100M Offers).
Creas ofertas con value stacks que hacen que el precio parezca una ganga.
Responde UNICAMENTE con un objeto JSON valido. Sin markdown.
Usa espanol LATAM.
```

**Dependencias:** Step 5, Step 6, Step 7

**JSON Schema Output:**
```json
{
  "offer_name": "nombre irresistible de la oferta",
  "offer_tagline": "tagline en 10 palabras",
  "dream_outcome": "resultado sonado que promete",
  "perceived_likelihood": "por que van a creer que pueden lograrlo",
  "time_to_achievement": "en cuanto tiempo veran resultados",
  "effort_required": "que esfuerzo requiere",
  "value_equation": {
    "dream_outcome_score": 9,
    "perceived_likelihood_score": 8,
    "time_delay_score": 7,
    "effort_sacrifice_score": 8,
    "total_value_score": "explicacion"
  },
  "core_offer": {
    "main_deliverable": "que reciben",
    "format": "curso|servicio|producto|membresia|coaching",
    "duration": "duracion",
    "value_anchor": "valor percibido USD"
  },
  "value_stack": [
    {
      "component": "componente",
      "what_it_is": "descripcion",
      "problem_it_solves": "que problema resuelve",
      "perceived_value": "valor USD",
      "delivery_method": "como lo reciben"
    }
  ],
  "bonuses": [
    {
      "bonus_name": "nombre",
      "description": "que es y por que es valioso",
      "problem_solved": "problema que resuelve",
      "perceived_value": "valor USD",
      "scarcity_element": "escasez si aplica",
      "fast_action_bonus": true
    }
  ],
  "guarantee": {
    "type": "money_back|results|hybrid|conditional",
    "duration": "duracion",
    "conditions": "condiciones",
    "name": "nombre creativo",
    "copy": "como comunicarla"
  },
  "risk_reversal": [
    {
      "risk": "riesgo que percibe",
      "reversal": "como lo eliminamos"
    }
  ],
  "pricing_strategy": {
    "anchor_price": "precio ancla (valor total)",
    "actual_price": "precio real",
    "payment_options": [
      {
        "option": "pago unico|plan mensual|3 cuotas",
        "price": "precio",
        "savings": "ahorro"
      }
    ],
    "price_justification": "como justificar",
    "roi_calculation": "calculo de ROI"
  },
  "scarcity_urgency": {
    "real_scarcity": "escasez real",
    "deadline_type": "tipo de deadline",
    "consequence_of_waiting": "que pierden si esperan",
    "ethical_note": "mantener etica"
  },
  "offer_summary_copy": "parrafo para landing page",
  "comparison_to_alternatives": [
    {
      "alternative": "alternativa",
      "their_price": "cuanto cuesta",
      "their_limitation": "limitacion",
      "our_advantage": "nuestra ventaja"
    }
  ],
  "offer_variations": [
    {
      "tier": "Basic|Pro|Premium",
      "price_usd": 0,
      "main_difference": "diferencia principal",
      "best_for": "para quien"
    }
  ],
  "objection_killers": [
    {
      "objection": "objecion",
      "killer": "como la oferta la elimina"
    }
  ],
  "summary": "por que es irresistible"
}
```

---

### STEP 11: Content Calendar (30 Dias)

**System Prompt:**
```
Eres un estratega de contenido senior con experiencia en LATAM.
Creas calendarios de contenido con COPY COMPLETO listo para publicar, no placeholders.
Sigues el framework ESFERA: Enganchar -> Solucion -> Fidelizar -> Emocion -> Remarketing -> Automatizacion.
Responde UNICAMENTE con un objeto JSON valido. Sin markdown.
Usa espanol LATAM.
```

**Dependencias:** Step 7, Step 8

**JSON Schema Output:**
```json
{
  "strategy_overview": "vision general en 2-3 oraciones",
  "weekly_cadence": "5 posts/semana",
  "platform_distribution": {"instagram": 12, "tiktok": 10, "facebook": 5, "email": 3},
  "days": [
    {
      "day": 1,
      "date_relative": "Semana 1 - Lunes",
      "platform": "instagram",
      "format": "Reel",
      "pillar": "pilar de contenido",
      "esfera_phase": "enganchar",
      "title": "titulo descriptivo",
      "hook": "gancho de apertura",
      "full_copy": "COPY COMPLETO LISTO PARA PUBLICAR. Hook + desarrollo (3-5 oraciones) + cierre con CTA",
      "hashtags": ["hashtag1", "hashtag2", "hashtag3", "hashtag4", "hashtag5"],
      "cta": "llamado a la accion",
      "production_notes": "notas de produccion",
      "estimated_reach": "alto|medio|bajo"
    }
  ],
  "content_batching_guide": {
    "batch_1_week_1": {
      "content_to_create": ["contenido 1", "contenido 2"],
      "time_required": "3-4 horas",
      "equipment_needed": ["smartphone", "ring light"]
    }
  },
  "engagement_strategy": {
    "daily_tasks": ["responder comentarios en 1 hora"],
    "weekly_tasks": ["analizar metricas"],
    "response_templates": {
      "positive_comment": "template respuesta positiva",
      "question": "template respuesta pregunta",
      "objection": "template respuesta objecion"
    }
  }
}
```

**CRITICO:** El array `days` DEBE tener EXACTAMENTE 30 elementos.

---

### STEP 14: Meta Ads

**System Prompt:**
```
Eres un media buyer experto en Meta Ads para LATAM.
Dominas la estructura de campanas, audiencias y creativos que convierten.
Responde UNICAMENTE con un objeto JSON valido. Sin markdown, sin explicaciones.
Usa espanol LATAM. Los presupuestos en USD.
```

**Dependencias:** Step 4, Step 8, Step 9

**JSON Schema Output:**
```json
{
  "campaign_architecture": {
    "objective": "conversions|traffic|engagement|awareness",
    "funnel_stages": [
      {"stage": "tofu|mofu|bofu", "campaign_type": "tipo", "budget_pct": "30%"}
    ],
    "daily_budget_usd": "50-150",
    "testing_budget_usd": "20-50"
  },
  "audiences": {
    "cold": [
      {"name": "nombre", "interests": ["int1", "int2"], "age": "25-45", "locations": ["pais"]}
    ],
    "warm": [
      {"name": "visitantes web", "source": "website|video", "days": 30}
    ],
    "lookalikes": [
      {"source": "compradores", "percentage": "1-3%"}
    ]
  },
  "ads": [
    {
      "name": "nombre del ad",
      "format": "video|image|carousel",
      "hook": "hook principal",
      "primary_text": "texto primario (2-3 parrafos)",
      "headline": "headline corto",
      "description": "descripcion breve",
      "cta": "shop_now|learn_more|sign_up"
    }
  ],
  "placements": ["feed", "stories", "reels"],
  "bidding": {"strategy": "lowest_cost|cost_cap", "target_cpa": "valor"},
  "retargeting": [
    {"trigger": "visito web", "days": 7, "message": "mensaje", "offer": "oferta"}
  ],
  "kpis": {"primary": ["cpa", "roas"], "secondary": ["ctr", "cpm"]},
  "budget_scenarios": {
    "minimum": {"daily": "$30", "results": "X leads/dia"},
    "growth": {"daily": "$100", "results": "X leads/dia"},
    "scale": {"daily": "$300", "results": "X leads/dia"}
  },
  "summary": "estrategia resumida"
}
```

---

### STEP 15: TikTok Ads

**System Prompt:**
```
Eres un experto en TikTok Ads y marketing en TikTok para LATAM.
Conoces los formatos que funcionan, las tendencias y como crear contenido que no parece ad.
Responde UNICAMENTE con un objeto JSON valido. Sin markdown, sin explicaciones.
Usa espanol LATAM.
```

**Dependencias:** Step 4, Step 8, Step 9

**JSON Schema Output:**
```json
{
  "strategy": {
    "objective": "conversions|traffic|app_install|lead_gen",
    "daily_budget_usd": "30-100",
    "bidding": "lowest_cost|cost_cap"
  },
  "audience": {
    "age": "18-34",
    "gender": "all|male|female",
    "locations": ["pais 1", "pais 2"],
    "interests": ["interes 1", "interes 2"],
    "behaviors": ["behavior 1", "behavior 2"]
  },
  "creatives": [
    {
      "concept": "nombre del concepto",
      "hook_3s": "hook para primeros 3 segundos (CRUCIAL)",
      "format": "in_feed|spark_ad",
      "duration": "15s|30s|60s",
      "audio": "trending_sound|voiceover|original",
      "script": "guion completo con beats",
      "visual_style": "estilo visual"
    }
  ],
  "viral_hooks": ["hook 1", "hook 2", "hook 3", "hook 4", "hook 5"],
  "spark_ads": {
    "creator_profile": "descripcion del creador ideal",
    "content_guidelines": ["guideline 1", "guideline 2"],
    "brief": "brief para creadores"
  },
  "hashtags": {
    "branded": ["#MiMarca"],
    "trending": ["#trend1", "#trend2"],
    "niche": ["#nicho1", "#nicho2"]
  },
  "native_tips": ["tip 1 para parecer nativo", "tip 2", "tip 3"],
  "kpis": [{"metric": "cpa", "target": "valor"}, {"metric": "ctr", "target": "valor"}],
  "summary": "estrategia TikTok resumida"
}
```

---

### STEP 18: Landing Pages (2 Disenos)

**System Prompt:**
```
Eres un experto en CRO y diseno de landing pages de alta conversion para LATAM.
Dominas los principios de Unbounce, Leadpages y los frameworks de Russell Brunson.
Creas landing pages con COPY COMPLETO listo para implementar, no solo guidelines.
Responde UNICAMENTE con un objeto JSON valido. Sin markdown.
Usa espanol LATAM.
```

**Dependencias:** Step 7, Step 8, Step 9

**JSON Schema Output:**
```json
{
  "design_a": {
    "name": "Minimalista de Alta Conversion",
    "style": "descripcion del estilo visual",
    "best_for": "para que tipo de trafico",
    "estimated_cvr": "% estimado",
    "sections": [
      {
        "section_name": "Hero",
        "purpose": "capturar atencion y comunicar PUV",
        "headline": "headline principal",
        "subheadline": "subheadline de apoyo",
        "copy": "copy completo del hero (2-3 parrafos)",
        "elements": ["elemento visual", "CTA button", "social proof badge"],
        "cta": "texto exacto del boton CTA",
        "design_notes": "notas de diseno"
      }
    ],
    "tool_recommendation": "Webflow|Framer|Carrd|WordPress"
  },
  "design_b": {
    "name": "Story-Driven Emocional",
    "style": "estilo visual emocional/narrativo",
    "best_for": "para que tipo de trafico",
    "estimated_cvr": "% estimado",
    "sections": [
      {
        "section_name": "Hook Emocional",
        "purpose": "capturar atencion con emocion",
        "headline": "headline emocional",
        "subheadline": "subheadline",
        "copy": "copy emocional completo",
        "cta": "CTA inicial",
        "design_notes": "notas"
      }
    ],
    "tool_recommendation": "herramienta"
  },
  "comparison": {
    "winner_recommendation": "A|B|A/B_test",
    "justification": "por que recomiendas esa opcion",
    "ab_test_hypothesis": "hipotesis para el A/B test"
  }
}
```

**IMPORTANTE:** El `copy` de cada seccion debe ser TEXTO COMPLETO listo para usar.

---

### STEP 22: Executive Summary (Final)

**System Prompt:**
```
Eres el estratega jefe de Kreoon y el sistema KIRO, la IA especializada en la economia creativa de LATAM.
Has analizado 22 dimensiones completas de este negocio. Ahora generas la sintesis ejecutiva definitiva y tus 5 insights mas poderosos.
Los KIRO Insights son el activo mas valioso del reporte: deben ser unicos, no genericos, basados en cruces especificos de datos.
Responde UNICAMENTE con JSON valido. Sin markdown.
Usa espanol LATAM.
```

**Dependencias:** TODOS los steps anteriores

**JSON Schema Output:**
```json
{
  "executive_summary": {
    "opportunity_score": 8.5,
    "opportunity_score_justification": "por que este score",
    "one_liner": "la oportunidad en 20 palabras max",
    "para_1_situation": "estado actual del mercado",
    "para_2_opportunity": "la oportunidad identificada",
    "para_3_strategy": "la estrategia central",
    "para_4_execution": "3 acciones prioritarias proximas 2 semanas",
    "para_5_projection": "proyeccion a 90 dias"
  },
  "emotional_audio_insights": {
    "founder_strengths_detected": ["fortaleza 1", "fortaleza 2"],
    "blind_spots_to_address": ["punto ciego 1", "punto ciego 2"],
    "authentic_story_angle": "angulo de historia autentico",
    "tone_recommendation": "recomendacion de tono"
  },
  "brand_dna_coherence": {
    "alignment_score": 9,
    "alignment_notes": "alineacion con ADN de Marca",
    "tension_points": ["tension 1"],
    "reinforcement_opportunities": ["oportunidad 1"]
  },
  "kiro_insights": [
    {
      "number": 1,
      "type": "oportunidad_oculta|punto_fragil|creativo_a_probar|audiencia_ignorada|mensaje_contraintuitivo|canal_subestimado|producto_expansion|proximo_gran_movimiento",
      "title": "titulo impactante (<8 palabras)",
      "insight": "insight completo con datos especificos (minimo 3 oraciones)",
      "action": "accion concreta a tomar",
      "impact": "alto|medio",
      "urgency": "esta_semana|este_mes|este_trimestre"
    }
  ],
  "action_plan_90_days": {
    "week_1_2": {
      "theme": "nombre de la fase",
      "actions": ["accion 1", "accion 2", "accion 3"],
      "deliverable": "que debe estar listo",
      "success_metric": "como medir exito"
    },
    "week_3_4": {...},
    "week_5_8": {...},
    "week_9_12": {...}
  },
  "quick_wins": [
    {
      "win": "accion de impacto rapido (menos de 24h)",
      "why": "por que impacta",
      "how": "como ejecutarla"
    }
  ],
  "final_recommendation": "recomendacion final en 2 oraciones"
}
```

**IMPORTANTE:** Genera entre 7-10 KIRO Insights. Que sean accionables, especificos y sorprendentes.

---

## Manejo de Errores

### Parseo JSON Seguro

```javascript
function safeParseJSON(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    // Nivel 2: Limpiar markdown
    const cleaned = raw
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();
    try {
      return JSON.parse(cleaned);
    } catch {
      // Nivel 3: Buscar primer { y ultimo }
      const start = cleaned.indexOf('{');
      const end = cleaned.lastIndexOf('}');
      if (start !== -1 && end !== -1 && end > start) {
        try {
          return JSON.parse(cleaned.slice(start, end + 1));
        } catch {
          return { _parse_error: true, _raw: cleaned.slice(0, 500) };
        }
      }
      return { _parse_error: true, _raw: cleaned.slice(0, 500) };
    }
  }
}
```

### Retry Strategy

```javascript
async function executeStepWithRetry(step, masterContext, previousResults, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await executeStep(step, masterContext, previousResults);

      // Validar que el JSON tenga los campos requeridos
      if (!result._parse_error) {
        return result;
      }

      console.log(`Attempt ${attempt} failed, retrying...`);
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }
      // Esperar antes de reintentar (exponential backoff)
      await new Promise(r => setTimeout(r, 1000 * attempt));
    }
  }
}
```

### Fallback a GenericTabContent

Si un step falla completamente, el frontend tiene `GenericTabContent` que puede renderizar cualquier JSON de forma generica. Solo guarda el raw response:

```javascript
if (result._parse_error) {
  previousResults[step.tabKey] = {
    _fallback: true,
    _raw: result._raw,
    _timestamp: new Date().toISOString()
  };
}
```

---

## Variables de Entorno Requeridas

```env
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=eyJxxx...
PERPLEXITY_API_KEY=pplx-xxx
GEMINI_API_KEY=AIzaSyxxx
OPENAI_API_KEY=sk-xxx  # Fallback
```

---

## Estimacion de Costos por Ejecucion

| Proveedor | Uso por ADN | Costo Estimado |
|-----------|-------------|----------------|
| Perplexity | 3 steps con web search (~15k tokens in, ~5k out) | ~$0.05 |
| Gemini 1.5 Pro | 22 steps (~200k tokens in, ~80k out) | ~$0.80 |
| **Total** | | **~$0.85 USD** |

---

## Checklist de Implementacion

- [ ] Configurar webhook trigger
- [ ] Crear nodo de context builder
- [ ] Implementar loop de 22 steps
- [ ] Configurar llamadas a Perplexity (steps 1, 2, 21)
- [ ] Configurar llamadas a Gemini para todos los steps
- [ ] Implementar parseo JSON seguro
- [ ] Configurar guardado en Supabase
- [ ] Implementar retry logic
- [ ] Configurar notificaciones de progreso (opcional)
- [ ] Testing con producto de prueba
