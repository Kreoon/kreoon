/**
 * ADN Research v3 - Step Prompts
 * Prompts para los 22 pasos del research
 */

import { STEP_CONFIGS, getDependenciesData, type MasterContext } from "./config.ts";

// ─── Types ───────────────────────────────────────────────────────────────────

interface StepPromptResult {
  systemPrompt: string;
  userPrompt: string;
  useWebSearch: boolean;
}

// ─── Base System Prompt ──────────────────────────────────────────────────────

const BASE_SYSTEM = `Eres un estratega de marketing experto especializado en LATAM, con más de 15 años de experiencia en lanzamientos de productos y creación de contenido.

REGLAS OBLIGATORIAS:
1. Responde ÚNICAMENTE en JSON válido
2. NO uses markdown, NO uses \`\`\`json
3. NO incluyas explicaciones fuera del JSON
4. Usa español LATAM (no español de España)
5. Sé específico y accionable, no genérico
6. Cuando tengas datos del usuario (transcripciones, respuestas), úsalos textualmente
7. Cuando tengas frases del Social Intelligence, úsalas como vocabulario real del cliente

⚠️ REGLA CRÍTICA DE CONTEXTO:
- TODO tu análisis DEBE SER 100% ESPECÍFICO al producto/servicio descrito
- NUNCA generes contenido genérico o de otras industrias
- Si el producto es un suplemento, habla de suplementos. Si es software, habla de software
- Usa el nombre exacto del producto en tus respuestas
- Basa todo en la TRANSCRIPCIÓN y RESPUESTAS DEL WIZARD proporcionadas
- Si no hay suficiente información, infiere del tipo de producto/servicio, pero SIEMPRE mantén coherencia`;

// ─── Helper: Build Product Context Block ─────────────────────────────────────
// Este bloque se incluye en todos los prompts para mantener consistencia

function buildProductContextBlock(context: MasterContext): string {
  return `
═══════════════════════════════════════════════════════════════════════════════
🎯 PRODUCTO/SERVICIO A ANALIZAR (USA ESTA INFORMACIÓN EN TODO EL ANÁLISIS)
═══════════════════════════════════════════════════════════════════════════════

📦 NOMBRE: ${context.product.name}
📝 DESCRIPCIÓN: ${context.product.description || "No proporcionada"}
🏷️ TIPO: ${context.product.service_types?.join(", ") || "No especificado"}
🎯 OBJETIVO: ${context.product.goal || "No especificado"}
🌎 MERCADOS: ${context.product.locations?.join(", ") || "Latinoamérica"}
👥 EDADES OBJETIVO: ${context.product.audience_ages?.join(", ") || "No especificado"}
📱 PLATAFORMAS: ${context.product.platforms?.join(", ") || "No especificado"}

═══════════════════════════════════════════════════════════════════════════════
🎤 TRANSCRIPCIÓN/RESPUESTAS DEL FUNDADOR (FUENTE PRIMARIA DE VERDAD)
═══════════════════════════════════════════════════════════════════════════════

1️⃣ SOBRE EL PRODUCTO:
"${context.product.user_responses.q1_product || "No proporcionado"}"

2️⃣ CLIENTE IDEAL:
"${context.product.user_responses.q2_ideal_client || "No proporcionado"}"

3️⃣ PROBLEMA QUE RESUELVE:
"${context.product.user_responses.q3_problem || "No proporcionado"}"

4️⃣ TRANSFORMACIÓN PROMETIDA:
"${context.product.user_responses.q4_transformation || "No proporcionado"}"

5️⃣ OFERTA ACTUAL:
"${context.product.user_responses.q5_offer || "No proporcionado"}"

═══════════════════════════════════════════════════════════════════════════════
⚠️ RECUERDA: Todo el análisis debe ser específico para "${context.product.name}"
═══════════════════════════════════════════════════════════════════════════════`;
}

// ─── Step Prompts ────────────────────────────────────────────────────────────

export function getStepPrompt(
  stepNumber: number,
  context: MasterContext,
  previousResults: Record<string, any>
): StepPromptResult {
  const deps = getDependenciesData(stepNumber, previousResults);
  const config = STEP_CONFIGS[stepNumber];

  switch (stepNumber) {
    case 1:
      return getStep1Prompt(context);
    case 2:
      return getStep2Prompt(context, deps);
    case 3:
      return getStep3Prompt(context, deps);
    case 4:
      return getStep4Prompt(context, deps);
    case 5:
      return getStep5Prompt(context, deps);
    case 6:
      return getStep6Prompt(context, deps);
    case 7:
      return getStep7Prompt(context, deps);
    case 8:
      return getStep8Prompt(context, deps);
    case 9:
      return getStep9Prompt(context, deps);
    case 11:
      return getStep11Prompt(context, deps);
    case 12:
      return getStep12Prompt(context, deps);
    case 13:
      return getStep13Prompt(context, deps);
    case 14:
      return getStep14Prompt(context, deps);
    case 15:
      return getStep15Prompt(context, deps);
    case 16:
      return getStep16Prompt(context, deps);
    case 17:
      return getStep17Prompt(context, deps);
    case 18:
      return getStep18Prompt(context, deps);
    case 19:
      return getStep19Prompt(context, deps);
    case 20:
      return getStep20Prompt(context, deps);
    case 21:
      return getStep21Prompt(context, deps);
    case 22:
      return getStep22Prompt(context, deps, previousResults);
    default:
      throw new Error(`Paso ${stepNumber} no implementado`);
  }
}

// ─── PASO 1: Panorama de Mercado ─────────────────────────────────────────────

function getStep1Prompt(context: MasterContext): StepPromptResult {
  const systemPrompt = `${BASE_SYSTEM}

Eres un analista de mercados especializado en Latinoamérica. Tu tarea es investigar el mercado para el producto descrito y entregar un panorama completo.

USA BÚSQUEDA WEB para obtener datos actualizados de:
- Tamaño de mercado (TAM, SAM, SOM)
- CAGR y proyecciones
- Comportamiento del consumidor
- Variables macroeconómicas

JSON Schema esperado:
{
  "market_size": {
    "tam": "string con dato y fuente",
    "sam_latam": "string con dato y fuente",
    "som_year1": "string estimado",
    "som_year3": "string estimado"
  },
  "market_state": "emergente|crecimiento|madurez|saturacion|declive",
  "cagr": "string con % y horizonte",
  "adoption_stage": "innovadores|early_adopters|mayoria_temprana|mayoria_tardia|rezagados",
  "consumer_behavior": {
    "how_they_search": "string",
    "preferred_channels": ["string"],
    "preferred_formats": ["string"],
    "average_ticket_latam": "string",
    "purchase_cycle_days": number,
    "seasonality": "string",
    "latam_cultural_barriers": ["string"]
  },
  "awareness_level": "unaware|problem_aware|solution_aware|product_aware|most_aware",
  "awareness_implication": "string",
  "macro_variables": [
    {"factor": "economico|tecnologico|sociocultural|regulatorio", "impact": "alto|medio|bajo", "description": "string"}
  ],
  "opportunities": [
    {"opportunity": "string", "impact": "alto|medio|bajo", "time_window": "string"}
  ],
  "threats": [
    {"threat": "string", "probability": "alta|media|baja", "urgency": "inmediata|corto_plazo|largo_plazo"}
  ],
  "category_design": {
    "existing_category": "string o null",
    "new_category_suggestion": "string si aplica",
    "category_pov": "string"
  },
  "summary": "párrafo ejecutivo de 100 palabras"
}`;

  const userPrompt = `${buildProductContextBlock(context)}

${context.social ? `
VOCABULARIO REAL DEL MERCADO (de reviews y comentarios):
Frases de dolor: ${context.social.pain_phrases.slice(0, 5).map((p: any) => p.phrase).join(" | ")}
Quejas comunes: ${context.social.complaint_reasons?.slice(0, 3).join(" | ") || "No disponible"}
` : ""}

Busca datos actualizados del mercado en 2024-2025 para la categoría de "${context.product.name}" en LATAM.
⚠️ IMPORTANTE: El análisis debe ser 100% específico para este producto/servicio.`;

  return { systemPrompt, userPrompt, useWebSearch: true };
}

// ─── PASO 2: Competencia ─────────────────────────────────────────────────────

function getStep2Prompt(context: MasterContext, deps: Record<string, any>): StepPromptResult {
  const systemPrompt = `${BASE_SYSTEM}

Eres un analista de competencia. Investiga a los competidores directos e indirectos del producto "${context.product.name}".

JSON Schema esperado:
{
  "market_type": "oceano_rojo|oceano_azul|mixto",
  "competitive_position_available": "string - el gap donde puede ganar",
  "direct_competitors": [
    {
      "name": "string",
      "url": "string",
      "price_range": "string",
      "declared_positioning": "string",
      "main_message": "string",
      "strengths": ["string"],
      "exploitable_weaknesses": ["string"],
      "content_strategy": "string",
      "acquisition_channels": ["string"],
      "ugc_usage": "string",
      "unfulfilled_promise": "string",
      "negative_reviews_themes": ["string"]
    }
  ],
  "indirect_competitors": [
    {"name": "string", "threat_level": "alto|medio|bajo", "why_chosen": "string"}
  ],
  "substitutes": [
    {"solution": "string", "why_used": "string", "weakness": "string"}
  ],
  "competitive_gaps": [
    {"type": "mensaje|producto|ejecucion", "gap": "string", "opportunity": "string"}
  ],
  "content_benchmarks": {
    "dominant_hooks": ["string"],
    "dominant_formats": ["string"],
    "dominant_emotional_angles": ["string"],
    "fatigued_creatives": ["string"],
    "untested_opportunities": ["string"]
  },
  "review_sentiment": {
    "what_market_values": ["string"],
    "what_market_complains_about": ["string"],
    "vocabulary_of_praise": ["string"],
    "vocabulary_of_complaint": ["string"]
  }
}`;

  const competitorUrls = context.product.links.competitors.join("\n- ");

  const userPrompt = `${buildProductContextBlock(context)}

COMPETIDORES A ANALIZAR:
${competitorUrls || "Busca los principales competidores en la categoría de " + context.product.name}

PANORAMA DE MERCADO (del paso anterior):
${JSON.stringify(deps.tab_1_market_overview?.summary || "No disponible", null, 2)}

${context.ads ? `
INTELIGENCIA DE ADS RECOPILADA:
Hooks dominantes: ${context.ads.meta_ads?.dominant_hooks?.slice(0, 5).join(" | ") || "No disponible"}
Formatos dominantes: ${context.ads.meta_ads?.dominant_formats?.join(", ") || "No disponible"}
` : ""}

${context.social ? `
LO QUE DICE EL MERCADO:
Razones de recomendación: ${context.social.recommendation_reasons?.slice(0, 3).join(" | ") || "No disponible"}
Razones de queja: ${context.social.complaint_reasons?.slice(0, 3).join(" | ") || "No disponible"}
` : ""}

Analiza cada competidor en el contexto de "${context.product.name}".
⚠️ Los competidores deben ser de la MISMA categoría del producto.`;

  return { systemPrompt, userPrompt, useWebSearch: true };
}

// ─── PASO 3: Jobs To Be Done ─────────────────────────────────────────────────

function getStep3Prompt(context: MasterContext, deps: Record<string, any>): StepPromptResult {
  const systemPrompt = `${BASE_SYSTEM}

Aplica el framework Jobs To Be Done para entender por qué los clientes "contratan" este producto.

JSON Schema esperado:
{
  "primary_jtbd": {
    "job_statement": "Cuando [situación], quiero [motivación], para poder [resultado esperado]",
    "functional_job": "string",
    "emotional_job": "string",
    "social_job": "string"
  },
  "secondary_jtbds": [
    {
      "job_statement": "string",
      "importance": "alta|media|baja"
    }
  ],
  "hiring_criteria": {
    "must_haves": ["criterios no negociables"],
    "nice_to_haves": ["criterios deseables"],
    "deal_breakers": ["lo que hace que no compren"]
  },
  "progress_forces": {
    "push_of_situation": ["qué los empuja a buscar solución"],
    "pull_of_new_solution": ["qué los atrae del producto"],
    "anxiety_of_new_solution": ["miedos sobre el cambio"],
    "habit_of_present": ["qué los ancla a la situación actual"]
  },
  "switch_triggers": [
    {"trigger": "string", "timing": "string", "opportunity": "string"}
  ],
  "consumption_chain": {
    "awareness": "cómo descubren que tienen el problema",
    "consideration": "cómo evalúan opciones",
    "decision": "qué los hace decidir",
    "use": "cómo usan el producto",
    "post_use": "qué pasa después"
  }
}`;

  const userPrompt = `${buildProductContextBlock(context)}

PANORAMA DE MERCADO:
Nivel de awareness: ${deps.tab_1_market_overview?.awareness_level || "No determinado"}
Cómo buscan: ${deps.tab_1_market_overview?.consumer_behavior?.how_they_search || "No determinado"}

${context.social ? `
FRASES REALES DE DOLOR (del Social Intelligence):
${context.social.pain_phrases.slice(0, 8).map((p: any) => `- "${p.phrase}"`).join("\n")}

FRASES REALES DE DESEO:
${context.social.desire_phrases.slice(0, 8).map((p: any) => `- "${p.phrase}"`).join("\n")}
` : ""}

Genera los Jobs To Be Done específicos para "${context.product.name}".
⚠️ Los jobs deben ser relevantes para este tipo de producto/servicio únicamente.`;

  return { systemPrompt, userPrompt, useWebSearch: false };
}

// ─── PASO 4: Avatares ────────────────────────────────────────────────────────

function getStep4Prompt(context: MasterContext, deps: Record<string, any>): StepPromptResult {
  const systemPrompt = `${BASE_SYSTEM}

Crea 3 avatares de cliente ideal para "${context.product.name}" basándote en los datos del mercado y JTBD.

JSON Schema esperado:
{
  "primary_avatar": {
    "name": "Nombre ficticio",
    "age": number,
    "occupation": "string",
    "income_level": "string",
    "location": "string",
    "family_status": "string",
    "day_in_life": "párrafo describiendo un día típico",
    "frustrations": ["frustraciones específicas"],
    "goals": ["metas específicas"],
    "values": ["valores personales"],
    "media_consumption": {
      "platforms": ["donde pasa tiempo"],
      "content_types": ["qué consume"],
      "influencers": ["a quién sigue"]
    },
    "purchase_behavior": {
      "decision_process": "string",
      "price_sensitivity": "alta|media|baja",
      "triggers": ["qué dispara la compra"]
    },
    "objections": ["objeciones específicas"],
    "quote": "Una frase que este avatar diría"
  },
  "secondary_avatar": { /* misma estructura */ },
  "tertiary_avatar": { /* misma estructura */ },
  "anti_avatar": {
    "description": "Quién NO es cliente ideal",
    "why_not": ["razones"],
    "red_flags": ["señales de que no es buen fit"]
  }
}`;

  const userPrompt = `${buildProductContextBlock(context)}

JOBS TO BE DONE IDENTIFICADOS:
${JSON.stringify(deps.tab_3_jtbd?.primary_jtbd || "No disponible", null, 2)}

DATOS DEL MERCADO:
Comportamiento: ${JSON.stringify(deps.tab_1_market_overview?.consumer_behavior || {}, null, 2)}

${context.brand?.ideal_customer ? `
ADN DE MARCA - CLIENTE IDEAL:
${JSON.stringify(context.brand.ideal_customer, null, 2)}
` : ""}

${context.social ? `
VOCABULARIO REAL DEL CLIENTE:
${context.social.common_vocabulary.slice(0, 10).map((v: any) => `- "${v.word}" (${v.context})`).join("\n")}
` : ""}

Crea avatares específicos para compradores de "${context.product.name}" en LATAM.
⚠️ Los avatares deben ser coherentes con el tipo de producto/servicio.`;

  return { systemPrompt, userPrompt, useWebSearch: false };
}

// ─── PASO 5: Psicología Profunda ─────────────────────────────────────────────

function getStep5Prompt(context: MasterContext, deps: Record<string, any>): StepPromptResult {
  const systemPrompt = `${BASE_SYSTEM}

Analiza la psicología profunda del cliente de "${context.product.name}" para crear copy efectivo. Este es el paso MÁS IMPORTANTE para el copywriting.

JSON Schema esperado:
{
  "pain_map": {
    "functional_pains": [
      {"pain": "string", "intensity": 1-10, "frequency": "diario|semanal|mensual", "trigger": "string"}
    ],
    "emotional_pains": [
      {"emotion": "string", "what_causes_it": "string", "peak_moment": "string"}
    ],
    "social_pains": [
      {"fear": "qué teme que otros vean o piensen"}
    ],
    "root_pain": "el miedo existencial más profundo"
  },
  "desire_map": {
    "functional_desires": [
      {"desire": "string", "urgency": 1-10, "blocker": "string"}
    ],
    "emotional_desires": [
      {"state": "string", "intensity": 1-10, "delivery": "cómo el producto lo entrega"}
    ],
    "aspirational_desires": [
      {"aspiration": "string"}
    ],
    "deep_desire": "Quiero ser el tipo de persona que..."
  },
  "cialdini_principles": {
    "reciprocity": {"what_to_give_first": "string", "implementation": "string"},
    "commitment": {"micro_commitment": "string", "how_to_escalate": "string"},
    "social_proof": {"most_powerful_type": "string", "implementation": "string"},
    "authority": {"how_to_build": "string", "signals_to_use": ["string"]},
    "scarcity": {"type": "genuine|artificial|mixed", "how_to_communicate": "string"},
    "liking": {"what_creates_affinity": "string", "brand_similarity": "string"}
  },
  "cognitive_biases": [
    {
      "bias": "nombre del sesgo",
      "description": "string",
      "how_to_use": "implementación concreta",
      "copy_example": "frase de copy que aplica el sesgo"
    }
  ],
  "objections_bank": [
    {
      "objection": "en palabras exactas del cliente",
      "source": "social_intelligence|founder_audio|common_knowledge",
      "type": "precio|tiempo|confianza|prioridad|complejidad|urgencia|alternativa",
      "underlying_emotion": "string",
      "handling_technique": "feel_felt_found|reframe|social_proof|garantia",
      "sales_response": "texto exacto para ventas",
      "content_to_neutralize": "tipo de contenido para neutralizar proactivamente"
    }
  ],
  "client_vocabulary": {
    "pain_headlines": ["frases exactas para usar en headlines"],
    "search_phrases": ["cómo busca en Google/TikTok"],
    "result_phrases": ["cómo describe el resultado"],
    "recommendation_phrases": ["cómo recomienda"],
    "words_to_avoid": ["palabras que generan fricción"]
  }
}`;

  const userPrompt = `${buildProductContextBlock(context)}

AVATARES IDENTIFICADOS:
${JSON.stringify(deps.tab_4_avatars?.primary_avatar || {}, null, 2)}

JOBS TO BE DONE:
${JSON.stringify(deps.tab_3_jtbd || {}, null, 2)}

${context.product.emotional_analysis ? `
ANÁLISIS EMOCIONAL DEL FUNDADOR:
Áreas de preocupación: ${context.product.emotional_analysis.concern_areas?.join(", ") || "No disponible"}
Temas con pasión: ${context.product.emotional_analysis.passion_topics?.join(", ") || "No disponible"}
` : ""}

${context.social ? `
FRASES REALES DE DOLOR (USAR TEXTUALMENTE):
${context.social.pain_phrases.slice(0, 10).map((p: any) => `- "${p.phrase}" (${p.source})`).join("\n")}

FRASES REALES DE DESEO:
${context.social.desire_phrases.slice(0, 10).map((p: any) => `- "${p.phrase}" (${p.source})`).join("\n")}

OBJECIONES REALES:
${context.social.real_objections.slice(0, 8).map((o: any) => `- "${o.objection}" (${o.source})`).join("\n")}

VOCABULARIO COMÚN:
${context.social.common_vocabulary.slice(0, 15).map((v: any) => `- "${v.word}"`).join(", ")}
` : ""}

⚠️ IMPORTANTE: Todo el análisis psicológico debe ser específico para compradores de "${context.product.name}".
Usa las frases exactas del Social Intelligence en client_vocabulary y objections_bank.`;

  return { systemPrompt, userPrompt, useWebSearch: false };
}

// ─── PASO 6: Neuromarketing ──────────────────────────────────────────────────

function getStep6Prompt(context: MasterContext, deps: Record<string, any>): StepPromptResult {
  const systemPrompt = `${BASE_SYSTEM}

Aplica principios de neuromarketing para optimizar la comunicación de "${context.product.name}".

JSON Schema esperado:
{
  "brain_systems": {
    "reptilian_triggers": ["elementos que activan respuestas instintivas"],
    "limbic_emotions": ["emociones a activar y cómo"],
    "neocortex_logic": ["argumentos racionales para justificar"]
  },
  "attention_hooks": {
    "pattern_interrupts": ["formas de romper el scroll"],
    "curiosity_gaps": ["preguntas que generan curiosidad"],
    "emotional_openers": ["aperturas emocionales efectivas"]
  },
  "memory_anchors": {
    "distinctive_elements": ["elementos para ser recordado"],
    "repetition_strategy": "cómo repetir sin aburrir",
    "story_hooks": ["mini-historias memorables"]
  },
  "decision_facilitators": {
    "friction_reducers": ["formas de reducir fricción"],
    "choice_architecture": "cómo presentar opciones",
    "default_options": "qué hacer default"
  },
  "sensory_marketing": {
    "visual_triggers": ["elementos visuales efectivos"],
    "auditory_elements": ["sonidos/música recomendados"],
    "kinesthetic_language": ["palabras que evocan sensaciones"]
  },
  "lifeforce_8_application": [
    {"desire": "supervivencia|disfrute|libertad|social|atractividad|superioridad|protección|aprobación", "relevance": "alta|media|baja", "application": "string"}
  ]
}`;

  const userPrompt = `${buildProductContextBlock(context)}

PSICOLOGÍA DEL CLIENTE:
${JSON.stringify(deps.tab_5_psychology?.pain_map || {}, null, 2)}

DESEOS PROFUNDOS:
${JSON.stringify(deps.tab_5_psychology?.desire_map || {}, null, 2)}

AVATARES:
${JSON.stringify(deps.tab_4_avatars?.primary_avatar || {}, null, 2)}

⚠️ Aplica neuromarketing ESPECÍFICO para "${context.product.name}" y su audiencia objetivo.`;

  return { systemPrompt, userPrompt, useWebSearch: false };
}

// ─── PASO 7: Posicionamiento ─────────────────────────────────────────────────

function getStep7Prompt(context: MasterContext, deps: Record<string, any>): StepPromptResult {
  const systemPrompt = `${BASE_SYSTEM}

Define el posicionamiento estratégico y la PUV de "${context.product.name}".

JSON Schema esperado:
{
  "current_positioning_diagnosis": {
    "current_category": "string",
    "positioning_problem": "confusion|invisibility|wrong_category|no_positioning",
    "description": "string"
  },
  "puv": {
    "statement": "La PUV en una frase",
    "positioning_statement": "Para [avatar] que [necesidad], [producto] es el único [categoría] que [beneficio diferencial] porque [prueba]",
    "ownable_word": "la UNA palabra que puede poseer",
    "differentiation_axes": [
      {"axis": "string", "our_position": "string", "competitor_position": "string", "strength": "fuerte|medio|debil"}
    ]
  },
  "brand_archetype": {
    "primary": "sabio|heroe|cuidador|explorador|rebelde|mago|inocente|gobernante|creador|bufon|amante|hombre_corriente",
    "justification": "string",
    "secondary": "string",
    "shadow_to_avoid": "string",
    "communication_tone": ["string"],
    "global_brand_examples": ["string"]
  },
  "purple_cow": {
    "remarkable_factor": "qué hace que alguien lo cuente",
    "word_of_mouth_trigger": "string",
    "how_to_amplify": "string"
  },
  "category_design": {
    "new_category_name": "si aplica",
    "category_pov": "la narrativa que posiciona la categoría",
    "why_existing_solutions_fail": "string"
  },
  "esfera_framework": {
    "enganchar": {
      "objective": "string",
      "organic_tactics": ["string"],
      "paid_tactics": ["string"],
      "content_formats": ["string"],
      "kpis": ["string"],
      "example_message": "string"
    },
    "solucion": {
      "objective": "string",
      "tactics": ["string"],
      "content_formats": ["string"],
      "kpis": ["string"],
      "example_message": "string"
    },
    "fidelizar": {
      "objective": "string",
      "tactics": ["string"],
      "onboarding_steps": ["string"],
      "community_content": ["string"],
      "kpis": ["string"]
    },
    "remarketing": {
      "objective": "string",
      "retargeting_audiences": ["string"],
      "message_sequence": ["string"],
      "kpis": ["string"]
    }
  }
}`;

  const userPrompt = `${buildProductContextBlock(context)}

PANORAMA DE MERCADO:
${JSON.stringify(deps.tab_1_market_overview?.category_design || {}, null, 2)}

COMPETENCIA:
Posición disponible: ${deps.tab_2_competition?.competitive_position_available || "No determinado"}
Gaps identificados: ${JSON.stringify(deps.tab_2_competition?.competitive_gaps || [], null, 2)}

AVATAR PRINCIPAL:
${JSON.stringify(deps.tab_4_avatars?.primary_avatar || {}, null, 2)}

${context.brand ? `
ADN DE MARCA:
Identidad: ${JSON.stringify(context.brand.brand_identity || {}, null, 2)}
Propuesta de valor: ${JSON.stringify(context.brand.value_proposition || {}, null, 2)}
` : ""}

${context.product.emotional_analysis ? `
TEMAS DE PASIÓN DEL FUNDADOR:
${context.product.emotional_analysis.passion_topics?.join(", ") || "No disponible"}
` : ""}

⚠️ Define un posicionamiento único para "${context.product.name}" - debe ser coherente con el tipo de producto/servicio.`;

  return { systemPrompt, userPrompt, useWebSearch: false };
}

// ─── PASO 8: Copywriting ─────────────────────────────────────────────────────

function getStep8Prompt(context: MasterContext, deps: Record<string, any>): StepPromptResult {
  const systemPrompt = `${BASE_SYSTEM}

Genera ángulos de copywriting, hooks, headlines y CTAs para "${context.product.name}".

JSON Schema esperado:
{
  "angles": [
    {
      "angle_name": "nombre del ángulo",
      "description": "descripción breve",
      "emotion": "emoción principal",
      "best_for": "formato/plataforma ideal",
      "hook_examples": ["3 hooks para este ángulo"],
      "headline_examples": ["3 headlines"],
      "body_copy_example": "párrafo de body copy"
    }
  ],
  "frameworks_applied": {
    "pas": {
      "problem": "string",
      "agitate": "string",
      "solve": "string",
      "full_copy": "copy completo usando PAS"
    },
    "aida": {
      "attention": "string",
      "interest": "string",
      "desire": "string",
      "action": "string",
      "full_copy": "copy completo usando AIDA"
    },
    "bab": {
      "before": "string",
      "after": "string",
      "bridge": "string",
      "full_copy": "copy completo usando BAB"
    },
    "four_ps": {
      "promise": "string",
      "picture": "string",
      "proof": "string",
      "push": "string",
      "full_copy": "copy completo usando 4Ps"
    }
  },
  "hooks_bank": {
    "curiosity_hooks": ["10 hooks de curiosidad"],
    "pain_hooks": ["10 hooks de dolor"],
    "desire_hooks": ["10 hooks aspiracionales"],
    "social_proof_hooks": ["5 hooks de prueba social"],
    "controversial_hooks": ["5 hooks controversiales"]
  },
  "headlines_bank": {
    "benefit_headlines": ["10 headlines de beneficio"],
    "how_to_headlines": ["5 headlines how-to"],
    "number_headlines": ["5 headlines con números"],
    "question_headlines": ["5 headlines pregunta"]
  },
  "ctas_bank": {
    "urgency_ctas": ["5 CTAs de urgencia"],
    "value_ctas": ["5 CTAs de valor"],
    "curiosity_ctas": ["5 CTAs de curiosidad"],
    "fear_of_loss_ctas": ["5 CTAs de miedo a perder"],
    "social_ctas": ["5 CTAs sociales"]
  }
}`;

  const userPrompt = `${buildProductContextBlock(context)}

POSICIONAMIENTO:
PUV: ${deps.tab_7_positioning?.puv?.statement || "No definido"}
Palabra propia: ${deps.tab_7_positioning?.puv?.ownable_word || "No definido"}
Arquetipo: ${deps.tab_7_positioning?.brand_archetype?.primary || "No definido"}

PSICOLOGÍA DEL CLIENTE:
Dolor raíz: ${deps.tab_5_psychology?.pain_map?.root_pain || "No definido"}
Deseo profundo: ${deps.tab_5_psychology?.desire_map?.deep_desire || "No definido"}

VOCABULARIO DEL CLIENTE (usar textualmente):
${JSON.stringify(deps.tab_5_psychology?.client_vocabulary || {}, null, 2)}

OBJECIONES A MANEJAR:
${JSON.stringify(deps.tab_5_psychology?.objections_bank?.slice(0, 5) || [], null, 2)}

${context.social ? `
FRASES REALES PARA USAR EN COPY:
Pain: ${context.social.pain_phrases.slice(0, 5).map((p: any) => `"${p.phrase}"`).join(" | ")}
Desire: ${context.social.desire_phrases.slice(0, 5).map((p: any) => `"${p.phrase}"`).join(" | ")}
` : ""}

⚠️ Genera 12 ángulos únicos, 30 hooks, 30 headlines y 25 CTAs ESPECÍFICOS para "${context.product.name}".
Todo el copy debe mencionar el producto y sus beneficios reales.`;

  return { systemPrompt, userPrompt, useWebSearch: false };
}

// ─── PASOS 9-22 (simplificados por espacio) ──────────────────────────────────

function getStep9Prompt(context: MasterContext, deps: Record<string, any>): StepPromptResult {
  const systemPrompt = `${BASE_SYSTEM}

Diseña la oferta irresistible usando la Value Equation de Alex Hormozi.

JSON Schema esperado:
{
  "value_equation": {
    "dream_outcome": "string",
    "perceived_likelihood": "1-10 con justificación",
    "time_delay": "string",
    "effort_sacrifice": "string",
    "total_score": number
  },
  "value_stack": [
    {"element": "string", "value_perception": "string", "price_anchor": "string"}
  ],
  "guarantee": {
    "type": "dinero|resultado|tiempo|mixta",
    "statement": "string",
    "conditions": ["string"]
  },
  "price_positioning": {
    "anchor_price": "string",
    "actual_price": "string",
    "justification": "string"
  },
  "before_after_narrative": "narrativa de 300 palabras de la transformación",
  "testimonial_templates": [
    {"situation": "string", "problem": "string", "solution": "string", "result": "string"}
  ]
}`;

  const userPrompt = `${buildProductContextBlock(context)}

POSICIONAMIENTO:
${JSON.stringify(deps.tab_7_positioning?.puv || {}, null, 2)}

COPYWRITING - MEJORES ÁNGULOS:
${JSON.stringify(deps.tab_8_copywriting?.angles?.slice(0, 3) || [], null, 2)}

${context.product.emotional_analysis ? `
NIVEL DE CONFIANZA DEL FUNDADOR: ${context.product.emotional_analysis.confidence_level || "No medido"}
` : ""}

⚠️ Diseña una oferta irresistible ESPECÍFICA para "${context.product.name}".
La oferta debe reflejar exactamente lo que describe el fundador.`;

  return { systemPrompt, userPrompt, useWebSearch: false };
}

function getStep11Prompt(context: MasterContext, deps: Record<string, any>): StepPromptResult {
  const systemPrompt = `${BASE_SYSTEM}

Crea un calendario de contenido de 30 días para "${context.product.name}".

JSON Schema esperado:
{
  "strategy": {
    "posting_frequency": {"instagram": number, "tiktok": number, "linkedin": number},
    "best_times": {"instagram": ["string"], "tiktok": ["string"]},
    "content_pillars": ["5 pilares de contenido"]
  },
  "calendar": [
    {
      "day": number,
      "date": "string formato YYYY-MM-DD",
      "platform": "instagram|tiktok|linkedin|all",
      "format": "reel|carousel|story|post|live",
      "pillar": "string",
      "esfera_stage": "enganchar|solucion|fidelizar",
      "hook": "string",
      "caption": "copy completo con emojis y hashtags",
      "cta": "string",
      "hashtags": ["10 hashtags"],
      "production_notes": "string"
    }
  ]
}`;

  const userPrompt = `${buildProductContextBlock(context)}

POSICIONAMIENTO:
${JSON.stringify(deps.tab_7_positioning?.esfera_framework || {}, null, 2)}

COPYWRITING:
${JSON.stringify(deps.tab_8_copywriting?.frameworks_applied?.pas || {}, null, 2)}

OFERTA:
${JSON.stringify(deps.tab_9_puv_offer?.puv || {}, null, 2)}

⚠️ Crea un calendario de 30 días ESPECÍFICO para "${context.product.name}".
TODO el contenido debe hablar del producto y su industria.`;

  return { systemPrompt, userPrompt, useWebSearch: false };
}

function getStep12Prompt(context: MasterContext, deps: Record<string, any>): StepPromptResult {
  const systemPrompt = `${BASE_SYSTEM}

Diseña 4 lead magnets para "${context.product.name}".

JSON Schema esperado:
{
  "lead_magnets": [
    {
      "name": "string",
      "type": "ebook|checklist|template|quiz|webinar|minicurso",
      "promise": "string",
      "outline": ["capítulos/secciones"],
      "landing_headline": "string",
      "email_sequence": [
        {"day": number, "subject": "string", "preview": "string", "body": "string", "cta": "string"}
      ]
    }
  ],
  "quiz_segmentation": {
    "title": "string",
    "questions": [
      {"question": "string", "options": ["string"], "segment_mapping": {"option": "segment"}}
    ],
    "segments": [
      {"name": "string", "description": "string", "offer_to_show": "string"}
    ]
  }
}`;

  const userPrompt = `${buildProductContextBlock(context)}

AVATARES:
${JSON.stringify(deps.tab_4_avatars?.primary_avatar || {}, null, 2)}

PSICOLOGÍA:
Dolores: ${JSON.stringify(deps.tab_5_psychology?.pain_map?.functional_pains?.slice(0, 3) || [], null, 2)}

⚠️ Diseña 4 lead magnets con secuencias de 7 emails ESPECÍFICOS para "${context.product.name}".
Los lead magnets deben ser relevantes para este tipo de producto/servicio.`;

  return { systemPrompt, userPrompt, useWebSearch: false };
}

function getStep13Prompt(context: MasterContext, deps: Record<string, any>): StepPromptResult {
  const systemPrompt = `${BASE_SYSTEM}

Define la estrategia de redes sociales para "${context.product.name}".

JSON Schema esperado:
{
  "platform_strategy": {
    "instagram": {
      "role": "string",
      "content_mix": {"reels": number, "carousels": number, "stories": number},
      "posting_frequency": "string",
      "engagement_tactics": ["string"],
      "hashtag_strategy": {"branded": ["string"], "niche": ["string"], "broad": ["string"]}
    },
    "tiktok": { /* similar */ },
    "linkedin": { /* similar */ },
    "youtube": { /* similar */ }
  },
  "ugc_strategy": {
    "creator_criteria": ["string"],
    "collaboration_types": ["string"],
    "brief_template": "string"
  },
  "community_management": {
    "response_templates": {"positive": "string", "negative": "string", "question": "string"},
    "engagement_prompts": ["string"]
  }
}`;

  const userPrompt = `${buildProductContextBlock(context)}

POSICIONAMIENTO:
${JSON.stringify(deps.tab_7_positioning?.brand_archetype || {}, null, 2)}

CALENDARIO:
${JSON.stringify(deps.tab_11_content_calendar?.strategy || {}, null, 2)}

${context.ads?.competitor_social ? `
ANÁLISIS DE COMPETIDORES EN REDES:
${JSON.stringify(context.ads.competitor_social.slice(0, 3), null, 2)}
` : ""}

⚠️ Define estrategia de redes sociales ESPECÍFICA para "${context.product.name}".
El contenido debe ser relevante para este tipo de producto/servicio.`;

  return { systemPrompt, userPrompt, useWebSearch: true };
}

function getStep14Prompt(context: MasterContext, deps: Record<string, any>): StepPromptResult {
  const systemPrompt = `${BASE_SYSTEM}

Diseña campañas completas de Meta Ads para "${context.product.name}".

JSON Schema esperado:
{
  "campaign_architecture": {
    "tofu_campaign": {"objective": "string", "budget_allocation": number, "audiences": ["string"]},
    "mofu_campaign": {"objective": "string", "budget_allocation": number, "audiences": ["string"]},
    "bofu_campaign": {"objective": "string", "budget_allocation": number, "audiences": ["string"]}
  },
  "cold_audiences": [
    {
      "name": "string",
      "targeting": {
        "interests": ["string"],
        "behaviors": ["string"],
        "demographics": {"age_min": number, "age_max": number, "genders": ["string"]}
      },
      "estimated_reach": "string"
    }
  ],
  "retargeting_audiences": [
    {"name": "string", "source": "string", "window_days": number, "message_focus": "string"}
  ],
  "ad_copies": [
    {
      "audience": "string",
      "primary_text": "string",
      "headline": "string",
      "description": "string",
      "cta_button": "string"
    }
  ],
  "budget_recommendation": {
    "daily_budget": "string",
    "monthly_budget": "string",
    "testing_budget": "string",
    "scaling_triggers": ["string"]
  },
  "pixel_events": ["string"]
}`;

  const userPrompt = `${buildProductContextBlock(context)}

PSICOLOGÍA:
${JSON.stringify(deps.tab_5_psychology?.cialdini_principles || {}, null, 2)}

COPYWRITING:
${JSON.stringify(deps.tab_8_copywriting?.ctas_bank || {}, null, 2)}

OFERTA:
${JSON.stringify(deps.tab_9_puv_offer?.puv || {}, null, 2)}

${context.ads?.meta_ads ? `
INTELIGENCIA DE META ADS:
${JSON.stringify(context.ads.meta_ads, null, 2)}
` : ""}

⚠️ Diseña arquitectura de Meta Ads ESPECÍFICA para "${context.product.name}".
Los anuncios deben promocionar este producto/servicio exactamente.`;

  return { systemPrompt, userPrompt, useWebSearch: false };
}

function getStep15Prompt(context: MasterContext, deps: Record<string, any>): StepPromptResult {
  const systemPrompt = `${BASE_SYSTEM}

Diseña campañas de TikTok Ads para "${context.product.name}".

JSON Schema esperado:
{
  "campaign_structure": {
    "awareness": {"objective": "string", "formats": ["string"]},
    "consideration": {"objective": "string", "formats": ["string"]},
    "conversion": {"objective": "string", "formats": ["string"]}
  },
  "spark_ads_strategy": {
    "creator_selection": "string",
    "content_guidelines": ["string"],
    "boosting_criteria": ["string"]
  },
  "native_copies": [
    {
      "hook_type": "string",
      "caption": "string",
      "hashtags": ["string"],
      "sound_recommendation": "string"
    }
  ],
  "audience_targeting": [
    {"name": "string", "interests": ["string"], "behaviors": ["string"]}
  ],
  "budget_recommendation": {"daily": "string", "testing_phase": "string", "scaling": "string"},
  "creative_specs": {"aspect_ratio": "string", "duration": "string", "safe_zone": "string"}
}`;

  const userPrompt = `${buildProductContextBlock(context)}

PSICOLOGÍA:
${JSON.stringify(deps.tab_5_psychology?.client_vocabulary || {}, null, 2)}

COPYWRITING:
${JSON.stringify(deps.tab_8_copywriting?.hooks_bank || {}, null, 2)}

${context.ads?.tiktok_ads ? `
INTELIGENCIA DE TIKTOK:
${JSON.stringify(context.ads.tiktok_ads, null, 2)}
` : ""}

⚠️ Diseña campañas de TikTok ESPECÍFICAS para "${context.product.name}".
El contenido debe ser nativo y relevante para este producto/servicio.`;

  return { systemPrompt, userPrompt, useWebSearch: false };
}

function getStep16Prompt(context: MasterContext, deps: Record<string, any>): StepPromptResult {
  const systemPrompt = `${BASE_SYSTEM}

Diseña campañas de Google Ads para "${context.product.name}".

JSON Schema esperado:
{
  "keyword_strategy": {
    "high_intent": [{"keyword": "string", "match_type": "exact|phrase|broad", "estimated_cpc": "string"}],
    "long_tail": [{"keyword": "string", "intent": "string"}],
    "negative_keywords": ["string"]
  },
  "search_campaigns": {
    "brand": {"headlines": ["string"], "descriptions": ["string"]},
    "non_brand": {"headlines": ["string"], "descriptions": ["string"]}
  },
  "responsive_search_ads": [
    {"headlines": ["15 headlines"], "descriptions": ["4 descriptions"]}
  ],
  "extensions": {
    "sitelinks": [{"title": "string", "description": "string", "url": "string"}],
    "callouts": ["string"],
    "structured_snippets": {"header": "string", "values": ["string"]}
  },
  "youtube_pre_roll": {
    "script_6_seconds": "string",
    "script_15_seconds": "string",
    "targeting": ["string"]
  },
  "budget_recommendation": {"search": "string", "display": "string", "youtube": "string"}
}`;

  const userPrompt = `${buildProductContextBlock(context)}

PSICOLOGÍA:
Cómo buscan: ${deps.tab_5_psychology?.client_vocabulary?.search_phrases?.join(", ") || "No definido"}

COPYWRITING:
${JSON.stringify(deps.tab_8_copywriting?.headlines_bank || {}, null, 2)}

⚠️ Diseña campañas de Google Ads ESPECÍFICAS para "${context.product.name}".
Las keywords deben ser relevantes para este tipo de producto/servicio.`;

  return { systemPrompt, userPrompt, useWebSearch: true };
}

function getStep17Prompt(context: MasterContext, deps: Record<string, any>): StepPromptResult {
  const systemPrompt = `${BASE_SYSTEM}

Diseña la estrategia de email marketing para "${context.product.name}".

JSON Schema esperado:
{
  "architecture": {
    "lists": [{"name": "string", "purpose": "string", "entry_point": "string"}],
    "segments": [{"name": "string", "criteria": "string", "messaging_focus": "string"}],
    "automations": ["string"]
  },
  "welcome_sequence": [
    {"day": number, "subject": "string", "goal": "string", "body": "string", "cta": "string"}
  ],
  "sales_sequence": [
    {"day": number, "subject": "string", "email_type": "value|story|objection|urgency|last_chance", "body": "string", "cta": "string"}
  ],
  "automations_priority": [
    {"name": "string", "trigger": "string", "goal": "string", "emails_count": number}
  ],
  "subject_line_formulas": ["string"],
  "deliverability_tips": ["string"]
}`;

  const userPrompt = `${buildProductContextBlock(context)}

AVATARES:
${JSON.stringify(deps.tab_4_avatars?.primary_avatar || {}, null, 2)}

COPYWRITING:
${JSON.stringify(deps.tab_8_copywriting?.frameworks_applied?.aida || {}, null, 2)}

OFERTA:
${JSON.stringify(deps.tab_9_puv_offer || {}, null, 2)}

LEAD MAGNETS:
${JSON.stringify(deps.tab_12_lead_magnets?.lead_magnets?.slice(0, 2) || [], null, 2)}

⚠️ Diseña secuencias de email ESPECÍFICAS para "${context.product.name}".
El contenido debe promocionar este producto y sus beneficios.`;

  return { systemPrompt, userPrompt, useWebSearch: false };
}

function getStep18Prompt(context: MasterContext, deps: Record<string, any>): StepPromptResult {
  const systemPrompt = `${BASE_SYSTEM}

Diseña 2 propuestas de landing page para "${context.product.name}".

JSON Schema esperado:
{
  "design_a_minimal": {
    "name": "Minimalista",
    "philosophy": "string",
    "sections": [
      {"section": "hero|problem|solution|benefits|social_proof|offer|faq|cta", "headline": "string", "copy": "string", "visual_notes": "string"}
    ],
    "color_scheme": {"primary": "string", "secondary": "string", "accent": "string"},
    "typography": {"headlines": "string", "body": "string"}
  },
  "design_b_story": {
    "name": "Story-Driven",
    "philosophy": "string",
    "sections": [/* igual estructura */]
  },
  "comparison_table": {
    "criteria": ["string"],
    "design_a_scores": [number],
    "design_b_scores": [number],
    "recommendation": "string"
  },
  "conversion_elements": {
    "trust_badges": ["string"],
    "urgency_elements": ["string"],
    "social_proof_types": ["string"]
  }
}`;

  const userPrompt = `${buildProductContextBlock(context)}

POSICIONAMIENTO:
${JSON.stringify(deps.tab_7_positioning?.puv || {}, null, 2)}

COPYWRITING:
${JSON.stringify(deps.tab_8_copywriting?.frameworks_applied || {}, null, 2)}

OFERTA:
${JSON.stringify(deps.tab_9_puv_offer || {}, null, 2)}

PSICOLOGÍA:
${JSON.stringify(deps.tab_5_psychology?.cognitive_biases?.slice(0, 5) || [], null, 2)}

⚠️ Diseña 2 landing pages completas ESPECÍFICAS para "${context.product.name}".
Todo el copy debe hablar de este producto y sus beneficios únicos.`;

  return { systemPrompt, userPrompt, useWebSearch: false };
}

function getStep19Prompt(context: MasterContext, deps: Record<string, any>): StepPromptResult {
  const systemPrompt = `${BASE_SYSTEM}

Diseña una estrategia de lanzamiento 360 para "${context.product.name}".

JSON Schema esperado:
{
  "pre_launch": {
    "weeks_before": 3,
    "phases": [
      {"week": number, "focus": "string", "activities": ["string"], "content": ["string"]}
    ]
  },
  "launch_day": {
    "hour_by_hour": [
      {"time": "string", "action": "string", "channel": "string", "responsible": "string"}
    ]
  },
  "post_launch": {
    "week_1": {"focus": "string", "activities": ["string"]},
    "week_2": {"focus": "string", "activities": ["string"]},
    "ongoing": ["string"]
  },
  "timeline_visual": [
    {"date": "string", "milestone": "string", "type": "prep|launch|follow_up"}
  ],
  "budget_breakdown": {
    "pre_launch": {"amount": "string", "allocation": ["string"]},
    "launch": {"amount": "string", "allocation": ["string"]},
    "post_launch": {"amount": "string", "allocation": ["string"]}
  },
  "contingency_plans": [
    {"risk": "string", "mitigation": "string"}
  ]
}`;

  const userPrompt = `${buildProductContextBlock(context)}

POSICIONAMIENTO:
${JSON.stringify(deps.tab_7_positioning?.purple_cow || {}, null, 2)}

META ADS:
${JSON.stringify(deps.tab_14_meta_ads?.campaign_architecture || {}, null, 2)}

TIKTOK ADS:
${JSON.stringify(deps.tab_15_tiktok_ads?.campaign_structure || {}, null, 2)}

⚠️ Diseña un lanzamiento 360° ESPECÍFICO para "${context.product.name}".
Las actividades deben ser coherentes con este tipo de producto/servicio.`;

  return { systemPrompt, userPrompt, useWebSearch: false };
}

function getStep20Prompt(context: MasterContext, deps: Record<string, any>): StepPromptResult {
  const systemPrompt = `${BASE_SYSTEM}

Define KPIs y métricas para "${context.product.name}".

JSON Schema esperado:
{
  "funnel_kpis": {
    "awareness": [{"metric": "string", "target": "string", "benchmark_latam": "string"}],
    "consideration": [{"metric": "string", "target": "string", "benchmark_latam": "string"}],
    "conversion": [{"metric": "string", "target": "string", "benchmark_latam": "string"}],
    "retention": [{"metric": "string", "target": "string", "benchmark_latam": "string"}]
  },
  "platform_kpis": {
    "meta_ads": [{"metric": "string", "target": "string"}],
    "tiktok_ads": [{"metric": "string", "target": "string"}],
    "google_ads": [{"metric": "string", "target": "string"}],
    "email": [{"metric": "string", "target": "string"}]
  },
  "dashboard_layout": {
    "sections": [
      {"name": "string", "metrics": ["string"], "visualization": "string"}
    ]
  },
  "monitoring_cadence": {
    "daily": ["string"],
    "weekly": ["string"],
    "monthly": ["string"]
  },
  "alert_thresholds": [
    {"metric": "string", "warning_threshold": "string", "critical_threshold": "string", "action": "string"}
  ]
}`;

  const userPrompt = `${buildProductContextBlock(context)}

META ADS:
${JSON.stringify(deps.tab_14_meta_ads?.budget_recommendation || {}, null, 2)}

TIKTOK ADS:
${JSON.stringify(deps.tab_15_tiktok_ads?.budget_recommendation || {}, null, 2)}

GOOGLE ADS:
${JSON.stringify(deps.tab_16_google_ads?.budget_recommendation || {}, null, 2)}

LANZAMIENTO:
${JSON.stringify(deps.tab_19_launch_strategy?.budget_breakdown || {}, null, 2)}

⚠️ Define KPIs con benchmarks de LATAM ESPECÍFICOS para "${context.product.name}".`;

  return { systemPrompt, userPrompt, useWebSearch: false };
}

function getStep21Prompt(context: MasterContext, deps: Record<string, any>): StepPromptResult {
  const systemPrompt = `${BASE_SYSTEM}

Diseña la estrategia de contenido orgánico y SEO para "${context.product.name}".

JSON Schema esperado:
{
  "they_ask_you_answer": {
    "the_big_5": {
      "pricing": [{"question": "string", "content_type": "string"}],
      "problems": [{"question": "string", "content_type": "string"}],
      "comparisons": [{"question": "string", "content_type": "string"}],
      "reviews": [{"question": "string", "content_type": "string"}],
      "best": [{"question": "string", "content_type": "string"}]
    }
  },
  "content_ideas": [
    {"title": "string", "format": "string", "seo_keyword": "string", "search_intent": "string"}
  ],
  "pillar_content": [
    {"pillar": "string", "cluster_topics": ["string"], "internal_linking": "string"}
  ],
  "seo_keywords": [
    {"keyword": "string", "volume": "string", "difficulty": "string", "intent": "string"}
  ],
  "pr_digital": {
    "podcasts_to_pitch": [{"name": "string", "why": "string", "angle": "string"}],
    "media_outlets": [{"name": "string", "type": "string", "pitch_angle": "string"}],
    "influencers_to_collaborate": [{"name": "string", "platform": "string", "collaboration_type": "string"}]
  }
}`;

  const userPrompt = `${buildProductContextBlock(context)}

POSICIONAMIENTO:
${JSON.stringify(deps.tab_7_positioning?.category_design || {}, null, 2)}

CALENDARIO:
${JSON.stringify(deps.tab_11_content_calendar?.strategy?.content_pillars || [], null, 2)}

REDES SOCIALES:
${JSON.stringify(deps.tab_13_social_media?.platform_strategy || {}, null, 2)}

⚠️ Diseña estrategia orgánica y SEO ESPECÍFICA para "${context.product.name}".
Las keywords y contenido deben ser relevantes para este producto/servicio.`;

  return { systemPrompt, userPrompt, useWebSearch: true };
}

function getStep22Prompt(context: MasterContext, deps: Record<string, any>, allResults: Record<string, any>): StepPromptResult {
  const systemPrompt = `${BASE_SYSTEM}

Genera el resumen ejecutivo final de "${context.product.name}" con los KIRO Insights únicos.

JSON Schema esperado:
{
  "executive_summary": {
    "opportunity": "párrafo sobre la oportunidad de mercado",
    "positioning": "párrafo sobre el posicionamiento recomendado",
    "strategy": "párrafo sobre la estrategia general",
    "execution": "párrafo sobre la ejecución",
    "metrics": "párrafo sobre métricas de éxito"
  },
  "opportunity_score": {
    "market_attractiveness": number,
    "competitive_advantage": number,
    "execution_feasibility": number,
    "overall_score": number,
    "justification": "string"
  },
  "emotional_analysis_insights": {
    "founder_confidence": "string",
    "passion_areas": ["string"],
    "concern_areas": ["string"],
    "recommendation": "string"
  },
  "brand_coherence": {
    "alignment_score": number,
    "aligned_elements": ["string"],
    "misaligned_elements": ["string"],
    "recommendations": ["string"]
  },
  "kiro_insights": [
    "Insight 1 único y específico basado en datos del research",
    "Insight 2...",
    "Insight 3...",
    "Insight 4...",
    "Insight 5..."
  ],
  "action_plan_90_days": [
    {"week": "1-2", "focus": "string", "actions": ["string"], "deliverables": ["string"]},
    {"week": "3-4", "focus": "string", "actions": ["string"], "deliverables": ["string"]},
    {"week": "5-6", "focus": "string", "actions": ["string"], "deliverables": ["string"]},
    {"week": "7-8", "focus": "string", "actions": ["string"], "deliverables": ["string"]},
    {"week": "9-10", "focus": "string", "actions": ["string"], "deliverables": ["string"]},
    {"week": "11-12", "focus": "string", "actions": ["string"], "deliverables": ["string"]}
  ]
}`;

  // Compilar resumen de todos los pasos
  const stepsSummary = Object.entries(allResults)
    .map(([key, value]) => `${key}: ${JSON.stringify(value).substring(0, 200)}...`)
    .join("\n");

  const userPrompt = `${buildProductContextBlock(context)}

RESUMEN DE TODOS LOS PASOS COMPLETADOS:
${stepsSummary}

PANORAMA DE MERCADO:
${JSON.stringify(deps.tab_1_market_overview?.summary || "No disponible")}

POSICIONAMIENTO:
PUV: ${allResults.tab_7_positioning?.puv?.statement || "No definido"}

${context.product.emotional_analysis ? `
ANÁLISIS EMOCIONAL DEL FUNDADOR:
Confianza: ${context.product.emotional_analysis.confidence_level || "No medido"}
Pasión: ${context.product.emotional_analysis.passion_topics?.join(", ") || "No identificado"}
Preocupaciones: ${context.product.emotional_analysis.concern_areas?.join(", ") || "No identificado"}
` : ""}

${context.brand ? `
ADN DE MARCA INCLUIDO:
${JSON.stringify(context.brand.brand_identity || {}, null, 2)}
` : ""}

⚠️ Genera 5 KIRO Insights ÚNICOS y ESPECÍFICOS para "${context.product.name}".
Los insights deben cruzar datos de múltiples pasos y ser relevantes para este producto/servicio.
Ejemplo: "El mercado de [nombre del producto] en [ubicación] tiene un CAGR del 18%, pero el 73% de competidores comunica como si la audiencia fuera solution-aware cuando el análisis muestra problem-aware. Este gap es la mayor oportunidad."`;

  return { systemPrompt, userPrompt, useWebSearch: false };
}
