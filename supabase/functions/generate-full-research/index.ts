// ============================================
// generate-full-research - ADN Recargado V2
// Combines Client DNA + Product DNA → Full 12-step research
// Pipeline: Perplexity (research) → Mistral (structuring) → Gemini (fallback)
// Self-invocation chain: 1 tab = 1 invocation
// ============================================

import { createClient } from "npm:@supabase/supabase-js@2.46.2";
import {
  buildCombinedSystemPromptForResearch,
  getSkillById,
} from "../_shared/skills/registry.ts";
import type { Skill, SkillType } from "../_shared/skills/types.ts";
import {
  batchScrape,
  extractUrlsFromText,
  formatScrapeContextForLLM,
} from "../_shared/firecrawl-client.ts";
import { validateCompetitorUrls } from "../_shared/url-validator.ts";

// ── KIRO Master System Prompt (V2 — Método CONVERT) ────────────────────────
const KIRO_MASTER_PROMPT = `Eres KIRO — el estratega de marketing digital de Kreoon, la plataforma de
operaciones creativas de LATAM. Tienes internalizados los mejores libros y
frameworks de marketing del mundo y los aplicas con criterio propio.

# TU CONOCIMIENTO BASE (aplicar siempre)
- Eugene Schwartz (Breakthrough Advertising): Los 5 niveles de conciencia del consumidor
- Donald Miller (StoryBrand): El cliente es el héroe, la marca es el guía
- Alex Hormozi ($100M Offers): Grand Slam Offer y Value Equation
- Russell Brunson (DotCom Secrets): Value Ladder y Hook/Story/Offer
- Robert Cialdini (Influence): Los 6 gatillos de persuasión ética
- Claude Hopkins (Scientific Advertising): Todo es testeable y medible
- David Ogilvy (Confessions): Hablar a una persona, no al mercado
- Jonah Berger (Contagious): STEPPS — por qué el contenido se comparte
- Dan Kennedy (Magnetic Marketing): USP magnética y marketing directo
- Clayton Christensen (Jobs To Be Done): El cliente contrata soluciones, no productos

# TU MÉTODO: C·O·N·V·E·R·T (el marco estratégico de Kreoon)
- C — Conciencia: ¿En qué nivel de awareness está el cliente?
- O — Origen: ¿Cuál es la historia real centrada en el cliente?
- N — Necesidad: ¿Qué trabajo real (funcional, emocional, social) intenta hacer?
- V — Valor: ¿Por qué esta solución y no otra? ¿Cuál es la oferta irresistible?
- E — Engagement: ¿Cómo atraemos, educamos y convertimos en orgánico y paid?
- R — Retención: ¿Cómo convertimos clientes en promotores?
- T — Tracción: ¿Cómo medimos y optimizamos cada pieza?

# CONTEXTO DE TRABAJO
- Operas para emprendedores y agencias de LATINOAMÉRICA
- Tu output alimenta directamente: creadores de contenido, estrategas, traffickers y marcas
- Cada entregable debe ser ejecutable mañana, no en 3 semanas

# REGLAS ABSOLUTAS DE OUTPUT
1. RESPONDE ÚNICAMENTE EN JSON VÁLIDO. Sin texto previo, sin explicaciones, sin backticks.
2. El JSON debe cumplir EXACTAMENTE el schema especificado en el user prompt.
3. Si un campo no tiene datos, usa string vacío "" o array vacío []. NUNCA omitas campos.
4. Textos en ESPAÑOL (términos técnicos de marketing universales son aceptables en inglés).
5. Sé específico: números reales, copy listo para usar, instrucciones ejecutables.
6. Tono profesional pero cercano — no corporativo, no académico, no genérico.

# SOBRE LATAM — LO QUE CAMBIA EL JUEGO
- La desconfianza del consumidor es 3x mayor que en mercados anglosajones
- La prueba social debe ser de personas de la MISMA ciudad/país cuando sea posible
- WhatsApp es un canal de ventas, no solo de mensajería
- TikTok e Instagram dominan para 18-40 años; Facebook para 35+
- Los pagos en cuotas son un diferenciador real
- "Garantía" es una de las palabras que más abre puertas en LATAM
- La escasez falsa destruye la confianza permanentemente — usar solo si es real
- La urgencia funciona mejor con fechas específicas que con "oferta por tiempo limitado"

Si recibes datos de Perplexity (investigación web en tiempo real), úsalos como evidencia.
Si no hay datos web, genera basado en el contexto y tu conocimiento actualizado.
Siempre aplica el Método CONVERT como lente para todo lo que produces.`;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ── 21 research steps ──────────────────────────────────────────────────────
const RESEARCH_STEPS = [
  { id: "market_overview", name: "Panorama de Mercado" },
  { id: "jtbd", name: "Jobs To Be Done" },
  { id: "pains_desires", name: "Dolores y Deseos" },
  { id: "competitors", name: "Analisis de Competencia" },
  { id: "avatars", name: "Avatares de Cliente" },
  { id: "differentiation", name: "Diferenciacion y Metodo CONVERT" },
  { id: "sales_angles", name: "Angulos de Venta" },
  { id: "puv_transformation", name: "PUV y Transformacion" },
  { id: "lead_magnets", name: "Lead Magnets" },
  { id: "video_creatives", name: "Creativos de Video" },
  { id: "content_calendar", name: "Parrilla de Contenido" },
  { id: "launch_strategy", name: "Estrategia de Lanzamiento" },
  { id: "landing_pages", name: "Landing Pages" },
  { id: "whatsapp_funnel", name: "Funnel de WhatsApp" },
  { id: "paid_ads", name: "Paid Ads (Meta + TikTok)" },
  { id: "email_marketing", name: "Email Marketing" },
  { id: "pricing_strategy", name: "Estrategia de Precios" },
  { id: "kpis_dashboard", name: "KPIs y Dashboard" },
  { id: "seo_strategy", name: "SEO y Contenido Largo" },
  { id: "partnerships", name: "Alianzas y Colaboraciones" },
  { id: "community_strategy", name: "Estrategia de Comunidad" },
];

// ── Step sequence: 1 phase = 1 step = 1 invocation ──────────────────────
// Each step is a dedicated Edge Function call (~20-40s per step).
// Sequential chain via self-invocation — 12 calls total.
const STEP_SEQUENCE: string[] = [
  "market_overview",    // Phase 0  — research
  "jtbd",               // Phase 1  — analysis
  "pains_desires",      // Phase 2  — analysis
  "competitors",        // Phase 3  — research
  "avatars",            // Phase 4  — generation
  "differentiation",    // Phase 5  — synthesis
  "sales_angles",       // Phase 6  — creative
  "puv_transformation", // Phase 7  — creative
  "lead_magnets",       // Phase 8  — creative
  "video_creatives",    // Phase 9  — creative
  "content_calendar",   // Phase 10 — generation
  "launch_strategy",    // Phase 11 — strategy
  "landing_pages",      // Phase 12 — conversion (CONVERT V+E)
  "whatsapp_funnel",    // Phase 13 — closer (CONVERT E LATAM)
  "paid_ads",           // Phase 14 — paid (CONVERT E+T)
  "email_marketing",    // Phase 15 — retention (CONVERT R+V)
  "pricing_strategy",   // Phase 16 — pricing (CONVERT V)
  "kpis_dashboard",     // Phase 17 — analytics (CONVERT T)
  "seo_strategy",       // Phase 18 — long-term (CONVERT E)
  "partnerships",       // Phase 19 — growth (CONVERT E)
  "community_strategy", // Phase 20 — retention (CONVERT R)
];
const TOTAL_PHASES = STEP_SEQUENCE.length; // 21

// Steps that use web search (Perplexity as first provider)
const RESEARCH_STEPS_SET = new Set(["market_overview", "competitors"]);

// Step index map for progress tracking (0-11)
const STEP_INDEX: Record<string, number> = {};
RESEARCH_STEPS.forEach((s, i) => { STEP_INDEX[s.id] = i; });

function getStepName(stepId: string): string {
  return RESEARCH_STEPS.find(s => s.id === stepId)?.name || stepId;
}

// ── Skills per step ────────────────────────────────────────────────────────
// Skills CONVERT integradas: consciousness_mapper (siempre), storybrand_architect (PUV/angulos),
// offer_engineer (lead_magnets/lanzamiento), social_funnel_builder (parrilla/creativos),
// production_director (creativos de video).
const STEP_SKILLS: Record<string, SkillType[]> = {
  market_overview:     [],  // investigación pura — sin skills
  jtbd:                ["consciousness_mapper", "neuro_persuader", "avatar_mirrorer", "emotion_architect"],
  pains_desires:       ["consciousness_mapper", "neuro_persuader", "emotion_architect", "objection_crusher", "avatar_mirrorer"],
  competitors:         [],  // investigación pura — sin skills
  avatars:             ["consciousness_mapper", "avatar_mirrorer", "neuro_persuader", "cultural_adapter"],
  differentiation:     ["consciousness_mapper", "storybrand_architect", "neuro_persuader", "hooks_specialist", "copy_sharpener"],
  sales_angles:        ["consciousness_mapper", "storybrand_architect", "hooks_specialist", "social_funnel_builder", "cta_specialist", "objection_crusher"],
  puv_transformation:  ["storybrand_architect", "copy_sharpener", "neuro_persuader", "storytelling_specialist"],
  lead_magnets:        ["offer_engineer", "hooks_specialist", "cta_specialist", "copy_sharpener"],
  video_creatives:     ["consciousness_mapper", "hooks_specialist", "storytelling_specialist", "production_director", "social_funnel_builder", "virality_optimizer"],
  content_calendar:    ["consciousness_mapper", "social_funnel_builder", "platform_optimizer", "virality_optimizer", "seo_discoverer", "hooks_specialist"],
  launch_strategy:     ["offer_engineer", "neuro_persuader", "cta_specialist", "storytelling_specialist"],
  landing_pages:       ["landing_page_architect", "consciousness_mapper", "storybrand_architect", "offer_engineer", "copy_sharpener", "cta_specialist", "objection_crusher"],
  whatsapp_funnel:     ["whatsapp_closer", "consciousness_mapper", "offer_engineer", "objection_crusher", "cta_specialist", "cultural_adapter"],
  // Tabs 360 (CONVERT completo)
  paid_ads:            ["paid_ads_architect", "consciousness_mapper", "offer_engineer", "copy_sharpener"],
  email_marketing:     ["email_sequence_builder", "storybrand_architect", "cta_specialist", "objection_crusher"],
  pricing_strategy:    ["offer_engineer", "neuro_persuader", "objection_crusher"],
  kpis_dashboard:      [],  // analisis puro
  seo_strategy:        ["seo_discoverer", "hooks_specialist", "copy_sharpener"],
  partnerships:        ["virality_optimizer", "storybrand_architect", "offer_engineer"],
  community_strategy:  ["social_funnel_builder", "emotion_architect", "cta_specialist"],
};

// ── Token limits per step ──────────────────────────────────────────────────
// NOTA: Gemini 2.5-flash usa "thinking tokens" internos que consumen budget.
// Margen de ~3000 tokens extras para evitar truncación.
const TOKEN_MAP: Record<string, number> = {
  market_overview: 8000,
  jtbd: 7000,
  pains_desires: 9000,
  competitors: 12000,
  avatars: 14000,        // 5 avatares con campos detallados
  differentiation: 12000,
  sales_angles: 14000,   // 20 ángulos completos
  puv_transformation: 8000,
  lead_magnets: 7000,
  video_creatives: 12000, // 15-20 creativos (reducido para evitar timeout en wall-clock 150s)
  content_calendar: 24000, // 28-35 posts completos
  launch_strategy: 14000,
  landing_pages: 16000,    // 2 variaciones completas con todas las secciones
  whatsapp_funnel: 14000,  // 3 secuencias completas (captacion, cierre, reactivacion)
  // Tabs 360
  paid_ads: 12000,
  email_marketing: 10000,
  pricing_strategy: 7000,
  kpis_dashboard: 6000,
  seo_strategy: 8000,
  partnerships: 6000,
  community_strategy: 7000,
};

// ── JSON repair ────────────────────────────────────────────────────────────
function repairJsonForParse(str: string): string {
  let s = str
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "")
    .trim();
  s = s.replace(/^```json?\s*/i, "").replace(/\s*```$/i, "");
  try {
    JSON.parse(s);
    return s;
  } catch {
    let inString = false;
    let escaped = false;
    for (let i = 0; i < s.length; i++) {
      if (escaped) { escaped = false; continue; }
      if (s[i] === "\\" && inString) { escaped = true; continue; }
      if (s[i] === '"') inString = !inString;
    }
    if (inString) {
      while (s.endsWith("\\")) s = s.slice(0, -1);
      s += '"';
    }
    s = s.replace(/,\s*"[^"]*"\s*$/, "");
    s = s.replace(/,\s*"[^"]*"\s*:\s*$/, "");
    s = s.replace(/,\s*$/, "");
    let open = 0, bracket = 0;
    inString = false;
    escaped = false;
    for (let i = 0; i < s.length; i++) {
      if (escaped) { escaped = false; continue; }
      if (s[i] === "\\" && inString) { escaped = true; continue; }
      if (s[i] === '"') { inString = !inString; continue; }
      if (inString) continue;
      if (s[i] === "{") open++;
      else if (s[i] === "}") open--;
      else if (s[i] === "[") bracket++;
      else if (s[i] === "]") bracket--;
    }
    while (bracket > 0) { s += "]"; bracket--; }
    while (open > 0) { s += "}"; open--; }
    return s;
  }
}

// ── Schemas (same as product-research) ─────────────────────────────────────
const SCHEMAS: Record<string, any> = {
  market_overview: {
    type: "object", additionalProperties: false, required: ["market_overview"],
    properties: { market_overview: { type: "object", additionalProperties: false,
      required: ["marketSize","growthTrend","marketState","macroVariables","awarenessLevel","summary","opportunities","threats"],
      properties: {
        marketSize: { type: "string" }, marketSizeSegments: { type: "array", items: { type: "object", properties: { segment: { type: "string" }, value: { type: "string" } } } },
        growthTrend: { type: "string" }, growthFactors: { type: "array", minItems: 3, items: { type: "string" } },
        marketState: { type: "string", enum: ["crecimiento","saturacion","declive"] }, marketStateExplanation: { type: "string" },
        marketLifecyclePhase: { type: "string" },
        macroVariables: { type: "array", minItems: 6, maxItems: 8, items: { type: "object", properties: { factor: { type: "string" }, type: { type: "string", enum: ["politico","economico","social","tecnologico","ecologico","legal"] }, impact: { type: "string" }, implication: { type: "string" } } } },
        awarenessLevel: { type: "string", enum: ["unaware","problem_aware","solution_aware","product_aware","most_aware"] }, awarenessExplanation: { type: "string" },
        summary: { type: "string" },
        opportunities: { type: "array", minItems: 5, maxItems: 7, items: { type: "object", properties: { opportunity: { type: "string" }, why: { type: "string" }, howToCapture: { type: "string" } } } },
        threats: { type: "array", minItems: 5, maxItems: 7, items: { type: "object", properties: { threat: { type: "string" }, riskLevel: { type: "string", enum: ["alto","medio","bajo"] }, mitigation: { type: "string" } } } },
      },
    }},
  },
  jtbd: {
    type: "object", additionalProperties: false, required: ["jtbd"],
    properties: { jtbd: { type: "object", additionalProperties: false, required: ["functional","emotional","social","insights"],
      properties: {
        functional: { type: "object", properties: { description: { type: "string" }, situation: { type: "string" }, currentAlternatives: { type: "string" }, desiredOutcome: { type: "string" }, statement: { type: "string" } } },
        emotional: { type: "object", properties: { description: { type: "string" }, duringUse: { type: "string" }, afterUse: { type: "string" }, avoidFeelings: { type: "array", items: { type: "string" } }, underlyingFears: { type: "array", items: { type: "string" } }, hopesAndDreams: { type: "array", items: { type: "string" } } } },
        social: { type: "object", properties: { description: { type: "string" }, perceivedBy: { type: "array", items: { type: "string" } }, desiredStatus: { type: "string" }, avoidJudgments: { type: "array", items: { type: "string" } }, belongingGroup: { type: "string" }, differentiateFrom: { type: "string" } } },
        insights: { type: "array", minItems: 10, maxItems: 14, items: { type: "object", properties: { insight: { type: "string" }, category: { type: "string", enum: ["trigger","momento_verdad","barrera","decision","influenciador","competencia_indirecta"] }, actionable: { type: "string" } } } },
      },
    }},
  },
  pains_desires: {
    type: "object", additionalProperties: false, required: ["pains","desires","objections"],
    properties: {
      pains: { type: "array", minItems: 10, maxItems: 10, items: { type: "object", additionalProperties: false, required: ["pain","why","impact"], properties: { pain: { type: "string" }, why: { type: "string" }, impact: { type: "string" } } } },
      desires: { type: "array", minItems: 10, maxItems: 10, items: { type: "object", additionalProperties: false, required: ["desire","emotion","idealState"], properties: { desire: { type: "string" }, emotion: { type: "string" }, idealState: { type: "string" } } } },
      objections: { type: "array", minItems: 10, maxItems: 10, items: { type: "object", additionalProperties: false, required: ["objection","belief","counter"], properties: { objection: { type: "string" }, belief: { type: "string" }, counter: { type: "string" } } } },
    },
  },
  competitors: {
    type: "object", additionalProperties: false, required: ["competitors"],
    properties: { competitors: { type: "array", minItems: 6, maxItems: 10, items: { type: "object", additionalProperties: false, required: ["name","promise","price","strengths","weaknesses"],
      properties: {
        name: { type: "string" },
        // URLs: usar SOLO si la fuente las menciona literalmente. Vacio "" si no se conoce. NUNCA inventar IDs/slugs.
        website: { type: "string", description: "URL HTTPS exacta del sitio oficial. Vacio si no se conoce. NO inventar." },
        instagram: { type: "string", description: "Handle @usuario o URL https://instagram.com/usuario. Vacio si no se conoce." },
        tiktok: { type: "string", description: "Handle @usuario o URL https://tiktok.com/@usuario. Vacio si no se conoce." },
        promise: { type: "string" }, differentiator: { type: "string" }, price: { type: "string" }, tone: { type: "string" }, channels: { type: "array", items: { type: "string" } },
        strengths: { type: "array", minItems: 2, items: { type: "string" } }, weaknesses: { type: "array", minItems: 2, items: { type: "string" } }
      }
    }}},
  },
  avatars: {
    type: "object", additionalProperties: false, required: ["avatars"],
    properties: { avatars: { type: "array", minItems: 5, maxItems: 5, items: { type: "object", additionalProperties: false, required: ["name","demographics","situation","psychographics","communication","behavior","purchaseTrigger"],
      properties: {
        name: { type: "string" },
        demographics: { type: "object", properties: { age: { type: "string" }, occupation: { type: "string" }, familySituation: { type: "string" }, location: { type: "string" }, socioeconomicLevel: { type: "string" } } },
        situation: { type: "object", properties: { dayToDay: { type: "string" }, previousAttempts: { type: "string" }, whyDidntWork: { type: "string" }, currentFeeling: { type: "string" } } },
        psychographics: { type: "object", properties: { awarenessLevel: { type: "string", enum: ["unaware","problem_aware","solution_aware","product_aware","most_aware"] }, drivers: { type: "array", minItems: 3, items: { type: "string" } }, biases: { type: "array", minItems: 3, items: { type: "string" } }, objections: { type: "array", minItems: 3, items: { type: "string" } }, values: { type: "array", minItems: 3, items: { type: "string" } }, deepestFears: { type: "array", minItems: 2, items: { type: "string" } } } },
        communication: { type: "object", properties: { phrases: { type: "array", minItems: 5, maxItems: 7, items: { type: "string" } }, frequentExpressions: { type: "array", items: { type: "string" } }, preferredTone: { type: "string" } } },
        behavior: { type: "object", properties: { shortTermGoals: { type: "string" }, longTermGoals: { type: "string" }, contentPlatforms: { type: "array", items: { type: "string" } }, influencersFollowed: { type: "string" }, researchProcess: { type: "string" } } },
        purchaseTrigger: { type: "object", properties: { triggerEvent: { type: "string" }, trustSignals: { type: "string" }, ahamoment: { type: "string" }, actionToday: { type: "string" } } },
      }
    }}},
  },
  differentiation: {
    type: "object", additionalProperties: false, required: ["differentiation","castPlaybook","executiveSummary"],
    properties: {
      differentiation: { type: "object", additionalProperties: false, required: ["repeatedMessages","positioningOpportunities"], properties: {
        repeatedMessages: { type: "array", minItems: 4, maxItems: 6, items: { type: "object", properties: { message: { type: "string" }, opportunity: { type: "string" } } } },
        poorlyAddressedPains: { type: "array", minItems: 4, maxItems: 6, items: { type: "object", properties: { pain: { type: "string" }, opportunity: { type: "string" }, howToUse: { type: "string" } } } },
        positioningOpportunities: { type: "array", minItems: 4, maxItems: 6, items: { type: "object", properties: { opportunity: { type: "string" }, why: { type: "string" }, execution: { type: "string" } } } },
        unexploitedEmotions: { type: "array", minItems: 3, maxItems: 5, items: { type: "object", properties: { emotion: { type: "string" }, howToUse: { type: "string" } } } },
      }},
      // METODO CAST (propio de Alexander Cast): C-A-S-T = Conocer, Atraer, Seducir, Transformar.
      // Estructura ejecutable de playbook: 4 capas + acciones + quick wins + riesgos + drivers + calendario 7 dias.
      castPlaybook: { type: "object", additionalProperties: false, required: ["resumen_estrategico","capas_cast","acciones_inmediatas"], properties: {
        resumen_estrategico: { type: "string", description: "2-3 oraciones sobre la estrategia central para este producto especifico" },
        recomendacion_final: { type: "string", description: "La recomendacion mas importante para este negocio en este momento" },
        capas_cast: { type: "object", additionalProperties: false, required: ["C","A","S","T"], properties: {
          C: { type: "object", required: ["nombre","pregunta_clave","insight_principal"], additionalProperties: false, properties: {
            nombre: { type: "string", description: "Conocer" },
            pregunta_clave: { type: "string" },
            insight_principal: { type: "string" },
            nivel_conciencia_avatar: { type: "string", enum: ["dormido","despertando","buscando","comparando","listo"] },
            descripcion_nivel: { type: "string" },
          }},
          A: { type: "object", required: ["nombre","pregunta_clave","insight_principal"], additionalProperties: false, properties: {
            nombre: { type: "string", description: "Atraer" },
            pregunta_clave: { type: "string" },
            insight_principal: { type: "string" },
          }},
          S: { type: "object", required: ["nombre","pregunta_clave","insight_principal"], additionalProperties: false, properties: {
            nombre: { type: "string", description: "Seducir" },
            pregunta_clave: { type: "string" },
            insight_principal: { type: "string" },
          }},
          T: { type: "object", required: ["nombre","pregunta_clave","insight_principal"], additionalProperties: false, properties: {
            nombre: { type: "string", description: "Transformar" },
            pregunta_clave: { type: "string" },
            insight_principal: { type: "string" },
          }},
        }},
        acciones_inmediatas: { type: "array", minItems: 4, maxItems: 7, items: { type: "object", additionalProperties: false, required: ["numero","titulo","capa_cast","descripcion"], properties: {
          numero: { type: "number" },
          titulo: { type: "string" },
          capa_cast: { type: "string", enum: ["C","A","S","T"] },
          descripcion: { type: "string" },
          como_hacerlo: { type: "string" },
          resultado_esperado: { type: "string" },
          esfuerzo: { type: "string", enum: ["bajo","medio","alto"] },
          impacto: { type: "string", enum: ["bajo","medio","alto"] },
          tiempo_implementacion: { type: "string" },
        }}},
        quick_wins: { type: "array", minItems: 3, maxItems: 6, items: { type: "object", additionalProperties: false, required: ["titulo","capa_cast","descripcion"], properties: {
          titulo: { type: "string" },
          capa_cast: { type: "string", enum: ["C","A","S","T"] },
          esfuerzo: { type: "string", enum: ["bajo","medio","alto"] },
          impacto: { type: "string", enum: ["bajo","medio","alto"] },
          descripcion: { type: "string" },
        }}},
        riesgos_a_evitar: { type: "array", minItems: 3, maxItems: 5, items: { type: "object", additionalProperties: false, required: ["riesgo","por_que"], properties: {
          riesgo: { type: "string" },
          por_que: { type: "string" },
          como_evitarlo: { type: "string" },
        }}},
        drivers_psicologicos: { type: "array", minItems: 3, maxItems: 6, items: { type: "object", additionalProperties: false, required: ["driver","por_que_funciona","como_usarlo"], properties: {
          driver: { type: "string" },
          por_que_funciona: { type: "string" },
          como_usarlo: { type: "string" },
          capa_cast: { type: "string", enum: ["C","A","S","T"] },
        }}},
        calendario_7_dias: { type: "array", minItems: 7, maxItems: 7, items: { type: "object", additionalProperties: false, required: ["dia","accion_principal","capa_cast","canal"], properties: {
          dia: { type: "string", description: "Dia 1, Dia 2, ..., Dia 7" },
          accion_principal: { type: "string" },
          capa_cast: { type: "string", enum: ["C","A","S","T"] },
          canal: { type: "string", description: "TikTok | Instagram | WhatsApp | Email | Paid Ads | Landing" },
          tipo_contenido: { type: "string" },
          hook_sugerido: { type: "string" },
        }}},
      }},
      executiveSummary: { type: "object", additionalProperties: false, properties: {
        marketSummary: { type: "string" }, opportunityScore: { type: "number" }, opportunityScoreJustification: { type: "string" },
        keyInsights: { type: "array", minItems: 3, maxItems: 5, items: { type: "object", properties: { insight: { type: "string" }, importance: { type: "string" }, action: { type: "string" } }, additionalProperties: false } },
        psychologicalDrivers: { type: "array", minItems: 3, maxItems: 5, items: { type: "object", properties: { driver: { type: "string" }, why: { type: "string" }, howToUse: { type: "string" } }, additionalProperties: false } },
        immediateActions: { type: "array", minItems: 3, maxItems: 5, items: { type: "object", properties: { action: { type: "string" }, howTo: { type: "string" }, expectedResult: { type: "string" } }, additionalProperties: false } },
        quickWins: { type: "array", minItems: 2, maxItems: 4, items: { type: "object", properties: { win: { type: "string" }, effort: { type: "string" }, impact: { type: "string" } }, additionalProperties: false } },
        risksToAvoid: { type: "array", minItems: 2, maxItems: 4, items: { type: "object", properties: { risk: { type: "string" }, why: { type: "string" } }, additionalProperties: false } },
        finalRecommendation: { type: "string" },
      }},
    },
  },
  sales_angles: {
    type: "object", additionalProperties: false, required: ["salesAngles"],
    properties: { salesAngles: { type: "array", minItems: 20, maxItems: 20, items: { type: "object", additionalProperties: false, required: ["angle","type","avatar","emotion","hookExample","whyItWorks"],
      properties: {
        angle: { type: "string" }, type: { type: "string", enum: ["educativo","emocional","aspiracional","autoridad","comparativo","anti-mercado","storytelling","prueba-social","error-comun"] },
        avatar: { type: "string" }, emotion: { type: "string" }, whyItWorks: { type: "string" }, contentType: { type: "string" },
        hookExample: { type: "string" }, ctaExample: { type: "string" }, funnelPhase: { type: "string", enum: ["tofu","mofu","bofu"] },
        // Método CONVERT — Capa C (Conciencia) + E (Engagement)
        consciousness_level: { type: "string", enum: ["dormido","despertando","buscando","comparando","listo"] },
        funnel_temperature: { type: "string", enum: ["frio","tibio","caliente"] },
        hashtags: { type: "array", minItems: 3, maxItems: 5, items: { type: "string" } }, developmentTips: { type: "string" },
      }
    }}},
  },
  puv_transformation: {
    type: "object", additionalProperties: false, required: ["puv","transformation"],
    properties: {
      puv: { type: "object", additionalProperties: false, required: ["centralProblem","tangibleResult","marketDifference","statement"], properties: {
        centralProblem: { type: "string" }, tangibleResult: { type: "string" }, marketDifference: { type: "string" }, idealClient: { type: "string" }, statement: { type: "string" }, credibility: { type: "string" },
      }},
      transformation: { type: "object", additionalProperties: false, properties: {
        functional: { type: "object", properties: { before: { type: "string" }, after: { type: "string" } } },
        emotional: { type: "object", properties: { before: { type: "string" }, after: { type: "string" } } },
        identity: { type: "object", properties: { before: { type: "string" }, after: { type: "string" } } },
        social: { type: "object", properties: { before: { type: "string" }, after: { type: "string" } } },
        financial: { type: "object", properties: { before: { type: "string" }, after: { type: "string" } } },
      }},
    },
  },
  lead_magnets: {
    type: "object", additionalProperties: false, required: ["leadMagnets"],
    properties: { leadMagnets: { type: "array", minItems: 3, maxItems: 3, items: { type: "object", additionalProperties: false, required: ["name","format","objective","pain","avatar","promise","structure"],
      properties: { name: { type: "string" }, format: { type: "string" }, objective: { type: "string" }, pain: { type: "string" }, avatar: { type: "string" }, awarenessPhase: { type: "string", enum: ["problem_aware","solution_aware","product_aware"] }, promise: { type: "string" }, structure: { type: "array", minItems: 5, maxItems: 7, items: { type: "string" } }, deliveryMethod: { type: "string" }, estimatedTime: { type: "string" } }
    }}},
  },
  video_creatives: {
    type: "object", additionalProperties: false, required: ["creatives"],
    properties: { creatives: { type: "array", minItems: 15, maxItems: 20, items: { type: "object", additionalProperties: false, required: ["number","title","idea","structure","format","esferaPhase"],
      properties: { number: { type: "number" }, angle: { type: "string" }, avatar: { type: "string" }, title: { type: "string" }, idea: { type: "string" },
        structure: { type: "object", properties: { hook: { type: "string" }, body: { type: "string" }, climax: { type: "string" }, cta: { type: "string" } } },
        format: { type: "string" }, esferaPhase: { type: "string", enum: ["conciencia","origen","necesidad","valor","engagement","retencion","traccion"], description: "Fase del Metodo CONVERT (propio): C-O-N-V-E-R-T" }, duration: { type: "string" }, platform: { type: "string" }, productionNotes: { type: "string" },
        // Método CONVERT — Capa C (Conciencia) + E (Engagement)
        consciousness_level: { type: "string", enum: ["dormido","despertando","buscando","comparando","listo"] },
        funnel_temperature: { type: "string", enum: ["frio","tibio","caliente"] },
        production_brief: {
          type: "object",
          properties: {
            scenario: { type: "string" },
            light: { type: "string" },
            framing: { type: "string" },
            wardrobe: { type: "string" },
            editing_notes: { type: "string" },
            subtitles: { type: "boolean" },
          },
        },
      }
    }}},
  },
  content_calendar: {
    type: "object", additionalProperties: false, required: ["calendar"],
    properties: {
      calendar: { type: "array", minItems: 28, maxItems: 35, items: { type: "object", additionalProperties: false, required: ["week","day","dayLabel","platform","format","pillar","title","hook","description","copy","cta","hashtags","esferaPhase","avatar","productionNotes"],
        properties: { week: { type: "number" }, day: { type: "number" }, dayLabel: { type: "string" }, platform: { type: "string" }, format: { type: "string" }, pillar: { type: "string", enum: ["educativo","emocional","autoridad","venta","comunidad"] }, title: { type: "string" }, hook: { type: "string" }, description: { type: "string" }, copy: { type: "string" }, cta: { type: "string" }, hashtags: { type: "array", minItems: 3, maxItems: 5, items: { type: "string" } }, esferaPhase: { type: "string", enum: ["conciencia","origen","necesidad","valor","engagement","retencion","traccion"], description: "Fase del Metodo CONVERT (propio): C-O-N-V-E-R-T" }, avatar: { type: "string" }, productionNotes: { type: "string" },
          // Método CONVERT — Capa C (Conciencia) + E (Engagement)
          consciousness_level: { type: "string", enum: ["dormido","despertando","buscando","comparando","listo"] },
          funnel_temperature: { type: "string", enum: ["frio","tibio","caliente"] }
        }
      }},
      weeklyThemes: { type: "array", minItems: 4, maxItems: 4, items: { type: "object", properties: { week: { type: "number" }, theme: { type: "string" }, objective: { type: "string" }, focusPhase: { type: "string" } } } },
      leadMagnetDays: { type: "array", minItems: 3, maxItems: 3, items: { type: "object", properties: { week: { type: "number" }, day: { type: "number" }, leadMagnetName: { type: "string" }, promotionCopy: { type: "string" } } } },
    },
  },
  launch_strategy: {
    type: "object", additionalProperties: false, required: ["preLaunch","launch","postLaunch","budget","timeline","team","metrics"],
    properties: {
      preLaunch: { type: "object", properties: { duration: { type: "string" }, objectives: { type: "array", minItems: 3, items: { type: "string" } }, actions: { type: "array", minItems: 5, items: { type: "object", properties: { action: { type: "string" }, week: { type: "string" }, channel: { type: "string" }, details: { type: "string" } } } }, contentPlan: { type: "array", minItems: 5, items: { type: "string" } }, checklist: { type: "array", minItems: 8, items: { type: "string" } } } },
      launch: { type: "object", properties: { dayPlan: { type: "array", minItems: 5, items: { type: "object", properties: { time: { type: "string" }, action: { type: "string" }, channel: { type: "string" }, details: { type: "string" } } } }, offer: { type: "object", properties: { description: { type: "string" }, price: { type: "string" }, bonuses: { type: "array", items: { type: "string" } }, urgency: { type: "string" }, scarcity: { type: "string" }, guarantee: { type: "string" } } }, emailSequence: { type: "array", minItems: 5, maxItems: 7, items: { type: "object", properties: { day: { type: "string" }, subject: { type: "string" }, preview: { type: "string" }, bodyOutline: { type: "string" }, cta: { type: "string" } } } }, channels: { type: "array", items: { type: "object", properties: { channel: { type: "string" }, role: { type: "string" }, content: { type: "string" } } } } } },
      postLaunch: { type: "object", properties: { retentionActions: { type: "array", minItems: 4, items: { type: "string" } }, postSaleContent: { type: "array", minItems: 4, items: { type: "string" } }, referralStrategy: { type: "string" }, nonBuyerFollowUp: { type: "array", minItems: 3, items: { type: "string" } }, analysisChecklist: { type: "array", minItems: 4, items: { type: "string" } } } },
      budget: { type: "object", properties: { organic: { type: "array", items: { type: "object", properties: { item: { type: "string" }, cost: { type: "string" } } } }, paid: { type: "array", items: { type: "object", properties: { item: { type: "string" }, cost: { type: "string" }, platform: { type: "string" } } } }, totalEstimated: { type: "string" } } },
      timeline: { type: "array", minItems: 6, items: { type: "object", properties: { phase: { type: "string" }, week: { type: "string" }, milestone: { type: "string" }, deliverables: { type: "array", items: { type: "string" } } } } },
      team: { type: "array", items: { type: "object", properties: { role: { type: "string" }, responsibilities: { type: "array", items: { type: "string" } }, hoursPerWeek: { type: "string" } } } },
      metrics: { type: "object", properties: { preLaunch: { type: "array", items: { type: "object", properties: { metric: { type: "string" }, target: { type: "string" } } } }, launch: { type: "array", items: { type: "object", properties: { metric: { type: "string" }, target: { type: "string" } } } }, postLaunch: { type: "array", items: { type: "object", properties: { metric: { type: "string" }, target: { type: "string" } } } } } },
    },
  },
  // ── Tab 12: Landing Pages (2 variaciones) ────────────────────────────────
  landing_pages: {
    type: "object", additionalProperties: false, required: ["landing_pages"],
    properties: {
      landing_pages: {
        type: "array", minItems: 2, maxItems: 2,
        items: {
          type: "object",
          required: ["variation", "variation_name", "target_consciousness", "funnel_temperature", "sections"],
          properties: {
            variation: { type: "string", enum: ["A", "B"] },
            variation_name: { type: "string" },
            target_consciousness: { type: "string", enum: ["dormido","despertando","buscando","comparando","listo"] },
            funnel_temperature: { type: "string", enum: ["frio","tibio","caliente"] },
            best_for: { type: "string" },
            strategy: { type: "string" },
            estimated_conversion_rate: { type: "string" },
            sections: {
              type: "array", minItems: 8,
              items: {
                type: "object",
                required: ["section_id", "section_name", "copy_full"],
                properties: {
                  section_id: { type: "string" },
                  section_name: { type: "string" },
                  headline: { type: "string" },
                  subheadline: { type: "string" },
                  cta_primary: { type: "string" },
                  cta_secondary: { type: "string" },
                  hero_image_description: { type: "string" },
                  trust_indicator: { type: "string" },
                  copy_full: { type: "string" },
                  product_intro: { type: "string" },
                  how_it_works: { type: "array", items: { type: "object", properties: { step: { type: "number" }, title: { type: "string" }, description: { type: "string" } } } },
                  for_who: { type: "string" },
                  not_for_who: { type: "string" },
                  testimonials: { type: "array", items: { type: "object", properties: { name: { type: "string" }, avatar_match: { type: "string" }, result: { type: "string" }, quote: { type: "string" } } } },
                  social_proof_numbers: { type: "string" },
                  authority_statement: { type: "string" },
                  origin_story_short: { type: "string" },
                  core_offer: { type: "string" },
                  bonuses: { type: "array", items: { type: "object", properties: { name: { type: "string" }, value_usd: { type: "string" }, solves_objection: { type: "string" } } } },
                  total_value: { type: "string" },
                  your_price: { type: "string" },
                  price_anchor: { type: "string" },
                  guarantee_type: { type: "string", enum: ["reembolso","resultado","satisfaccion"] },
                  duration_days: { type: "number" },
                  conditions_simple: { type: "string" },
                  faqs: { type: "array", items: { type: "object", properties: { question: { type: "string" }, answer: { type: "string" } } } },
                  recap_promise: { type: "string" },
                  cta_text: { type: "string" },
                  reassurance: { type: "string" },
                  key_insight: { type: "string" },
                },
              },
            },
            seo_title: { type: "string" },
            meta_description: { type: "string" },
            page_url_suggestion: { type: "string" },
            ab_test_hypothesis: { type: "string" },
          },
        },
      },
      ab_testing_plan: {
        type: "object",
        properties: {
          test_1: { type: "object", properties: { element: { type: "string" }, variation_a: { type: "string" }, variation_b: { type: "string" }, success_metric: { type: "string" }, minimum_sample: { type: "string" } } },
          test_2: { type: "object", properties: { element: { type: "string" }, variation_a: { type: "string" }, variation_b: { type: "string" }, success_metric: { type: "string" }, minimum_sample: { type: "string" } } },
        },
      },
      tech_stack_recommendation: {
        type: "object",
        properties: {
          builders: { type: "array", items: { type: "string" } },
          analytics: { type: "array", items: { type: "string" } },
          split_testing: { type: "array", items: { type: "string" } },
          hosting_latam: { type: "string" },
        },
      },
    },
  },
  // ── Tab 13: Funnel WhatsApp ──────────────────────────────────────────────
  whatsapp_funnel: {
    type: "object", additionalProperties: false, required: ["whatsapp_funnels"],
    properties: {
      whatsapp_funnels: {
        type: "array", minItems: 3, maxItems: 4,
        items: {
          type: "object",
          required: ["funnel_type", "funnel_name", "objective", "messages"],
          properties: {
            funnel_type: { type: "string", enum: ["captacion","cierre","upsell","reactivacion"] },
            funnel_name: { type: "string" },
            objective: { type: "string" },
            trigger: { type: "string" },
            total_messages: { type: "number" },
            total_duration_days: { type: "number" },
            messages: {
              type: "array", minItems: 3,
              items: {
                type: "object",
                required: ["message_number", "day", "type", "objective", "text"],
                properties: {
                  message_number: { type: "number" },
                  day: { type: "number" },
                  send_time: { type: "string" },
                  type: { type: "string", enum: ["texto","audio","imagen","video"] },
                  consciousness_level: { type: "string", enum: ["dormido","despertando","buscando","comparando","listo"] },
                  objective: { type: "string" },
                  text: { type: "string" },
                  audio_script: { type: ["string","null"] },
                  if_responds: { type: "string" },
                  if_no_response: { type: "string" },
                  forbidden: { type: "array", items: { type: "string" } },
                },
              },
            },
            branch_flows: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  trigger: { type: "string" },
                  action: { type: "string" },
                  response_template: { type: "string" },
                },
              },
            },
          },
        },
      },
      whatsapp_setup: {
        type: "object",
        properties: {
          account_type: { type: "string" },
          profile_optimization: { type: "array", items: { type: "string" } },
          automation_tools: { type: "array", items: { type: "object", properties: { tool: { type: "string" }, use_case: { type: "string" }, latam_availability: { type: "string" }, approximate_cost: { type: "string" } } } },
          compliance_notes: { type: "array", items: { type: "string" } },
          list_management: { type: "object", properties: { segmentation: { type: "array", items: { type: "string" } }, opt_in_strategy: { type: "string" }, opt_out_handling: { type: "string" } } },
        },
      },
      performance_benchmarks: {
        type: "object",
        properties: {
          open_rate_whatsapp: { type: "string" },
          response_rate_cold: { type: "string" },
          response_rate_warm: { type: "string" },
          conversion_rate_from_sequence: { type: "string" },
          best_days: { type: "array", items: { type: "string" } },
          best_hours: { type: "string" },
        },
      },
    },
  },
  // ── Tab 14: Paid Ads (Meta + TikTok) ─────────────────────────────────────
  paid_ads: {
    type: "object", additionalProperties: false, required: ["paid_ads_strategy"],
    properties: {
      paid_ads_strategy: {
        type: "object",
        properties: {
          budget_recommendation: {
            type: "object",
            properties: {
              minimum_usd_monthly: { type: "number" },
              recommended_usd_monthly: { type: "number" },
              distribution: { type: "object", properties: { cold_percentage: { type: "number" }, warm_percentage: { type: "number" }, hot_percentage: { type: "number" } } },
              rationale: { type: "string" },
            },
          },
          meta_ads: {
            type: "object",
            properties: {
              account_structure: {
                type: "object",
                properties: {
                  campaigns: { type: "array", items: { type: "object", properties: { name: { type: "string" }, objective: { type: "string" }, temperature: { type: "string", enum: ["frio","tibio","caliente"] }, daily_budget_usd: { type: "number" }, ad_sets: { type: "array", items: { type: "object" } }, creatives: { type: "array", items: { type: "object" } } } } },
                },
              },
              testing_plan: { type: "object", properties: { week_1: { type: "string" }, week_2: { type: "string" }, scaling_criteria: { type: "string" }, kill_criteria: { type: "string" } } },
              benchmarks_latam: { type: "object", properties: { cpm_cold: { type: "string" }, cpm_warm: { type: "string" }, ctr_target: { type: "string" }, cpa_target: { type: "string" }, roas_target: { type: "string" } } },
            },
          },
          tiktok_ads: {
            type: "object",
            properties: {
              account_structure: { type: "object", properties: { campaigns: { type: "array", items: { type: "object" } } } },
              spark_ads_strategy: { type: "string" },
              benchmarks_latam: { type: "object" },
            },
          },
          retargeting_sequences: { type: "array", items: { type: "object" } },
          monthly_execution_calendar: { type: "array", items: { type: "object", properties: { week: { type: "number" }, focus: { type: "string" }, budget_allocation: { type: "string" }, key_action: { type: "string" } } } },
          common_mistakes_to_avoid: { type: "array", items: { type: "string" } },
        },
      },
    },
  },
  // ── Tab 15: Email Marketing ──────────────────────────────────────────────
  email_marketing: {
    type: "object", additionalProperties: false, required: ["email_strategy"],
    properties: {
      email_strategy: {
        type: "object",
        properties: {
          platform_recommendation: { type: "object", properties: { tool: { type: "string" }, reason: { type: "string" }, estimated_cost_usd_monthly: { type: "string" }, key_features_needed: { type: "array", items: { type: "string" } } } },
          welcome_sequence: {
            type: "object",
            properties: {
              name: { type: "string" },
              trigger: { type: "string" },
              total_emails: { type: "number" },
              emails: {
                type: "array", minItems: 5, maxItems: 10,
                items: {
                  type: "object",
                  required: ["number", "day", "subject", "body"],
                  properties: {
                    number: { type: "number" },
                    day: { type: "number" },
                    send_time: { type: "string" },
                    subject: { type: "string" },
                    preview_text: { type: "string" },
                    objective: { type: "string" },
                    consciousness_level: { type: "string", enum: ["dormido","despertando","buscando","comparando","listo"] },
                    body: { type: "string" },
                    cta_text: { type: "string" },
                    cta_url_placeholder: { type: "string" },
                    open_rate_benchmark: { type: "string" },
                  },
                },
              },
            },
          },
          launch_sequence: {
            type: "object",
            properties: {
              pre_launch_emails: { type: "array", items: { type: "object" } },
              launch_emails: { type: "array", items: { type: "object" } },
            },
          },
          reactivation_sequence: { type: "object", properties: { trigger: { type: "string" }, emails: { type: "array", items: { type: "object" } } } },
          best_practices_latam: { type: "object", properties: { best_days: { type: "array", items: { type: "string" } }, best_hours: { type: "string" }, subject_formulas: { type: "array", items: { type: "string" } }, words_to_avoid: { type: "array", items: { type: "string" } }, words_that_work: { type: "array", items: { type: "string" } } } },
          list_building_strategy: { type: "object", properties: { primary_channel: { type: "string" }, opt_in_incentive: { type: "string" }, growth_tactics: { type: "array", items: { type: "string" } }, monthly_growth_target: { type: "string" } } },
          kpis: { type: "object", properties: { open_rate_target: { type: "string" }, click_rate_target: { type: "string" }, conversion_rate_target: { type: "string" }, list_growth_rate_target: { type: "string" } } },
        },
      },
    },
  },
  // ── Tab 16: Pricing Strategy ─────────────────────────────────────────────
  pricing_strategy: {
    type: "object", additionalProperties: false, required: ["pricing_strategy"],
    properties: {
      pricing_strategy: {
        type: "object",
        properties: {
          market_positioning: { type: "object", properties: { current_position: { type: "string", enum: ["economico","medio","premium","super-premium"] }, recommended_position: { type: "string" }, rationale: { type: "string" } } },
          price_analysis: { type: "object", properties: { competition_range: { type: "object", properties: { lowest: { type: "string" }, average: { type: "string" }, highest: { type: "string" } } }, recommended_price_usd: { type: "number" }, price_in_local_currency: { type: "array", items: { type: "object", properties: { country: { type: "string" }, currency: { type: "string" }, price: { type: "string" }, psychological_price: { type: "string" } } } }, price_justification: { type: "string" } } },
          psychological_pricing: { type: "object", properties: { anchoring_strategy: { type: "string" }, charm_pricing: { type: "string" }, decoy_pricing: { type: "string" }, bundle_options: { type: "array", items: { type: "object" } } } },
          payment_plans: { type: "object", properties: { recommended_for_latam: { type: "boolean" }, options: { type: "array", items: { type: "object" } }, payment_platforms_latam: { type: "array", items: { type: "string" } } } },
          value_ladder_complete: { type: "object", properties: { free: { type: "object" }, entry: { type: "object" }, core: { type: "object" }, premium: { type: "object" }, continuity: { type: "object" } } },
          discount_policy: { type: "object", properties: { when_to_discount: { type: "string" }, when_not_to_discount: { type: "string" }, launch_discount: { type: "string" }, loyalty_discount: { type: "string" } } },
          revenue_projections: { type: "object", properties: { conservative_monthly_usd: { type: "number" }, realistic_monthly_usd: { type: "number" }, optimistic_monthly_usd: { type: "number" }, assumptions: { type: "string" } } },
        },
      },
    },
  },
  // ── Tab 17: KPIs Dashboard ───────────────────────────────────────────────
  kpis_dashboard: {
    type: "object", additionalProperties: false, required: ["kpis_dashboard"],
    properties: {
      kpis_dashboard: {
        type: "object",
        properties: {
          north_star_metric: { type: "object", properties: { metric: { type: "string" }, definition: { type: "string" }, current_baseline: { type: "string" }, target_90_days: { type: "string" }, target_6_months: { type: "string" } } },
          aarrr_metrics: {
            type: "object",
            properties: {
              acquisition: { type: "object", properties: { metrics: { type: "array", items: { type: "object" } } } },
              activation: { type: "object", properties: { metrics: { type: "array", items: { type: "object" } } } },
              retention: { type: "object", properties: { metrics: { type: "array", items: { type: "object" } } } },
              revenue: { type: "object", properties: { metrics: { type: "array", items: { type: "object" } } } },
              referral: { type: "object", properties: { metrics: { type: "array", items: { type: "object" } } } },
            },
          },
          channel_kpis: { type: "object", properties: { organic_social: { type: "object" }, paid_ads: { type: "object" }, email: { type: "object" }, whatsapp: { type: "object" }, landing_page: { type: "object" } } },
          decision_triggers: { type: "array", items: { type: "object", properties: { if: { type: "string" }, then: { type: "string" }, priority: { type: "string", enum: ["urgente","esta semana","proximo mes"] } } } },
          weekly_review_checklist: { type: "array", items: { type: "string" } },
          monthly_review_checklist: { type: "array", items: { type: "string" } },
          tools_stack: { type: "array", items: { type: "object", properties: { tool: { type: "string" }, purpose: { type: "string" }, cost: { type: "string" }, latam_availability: { type: "string", enum: ["disponible","limitado","no disponible"] } } } },
          red_flags: { type: "array", items: { type: "object", properties: { signal: { type: "string" }, diagnosis: { type: "string" }, action: { type: "string" } } } },
        },
      },
    },
  },
  // ── Tab 18: SEO Strategy ─────────────────────────────────────────────────
  seo_strategy: {
    type: "object", additionalProperties: false, required: ["seo_strategy"],
    properties: {
      seo_strategy: {
        type: "object",
        properties: {
          keyword_research: {
            type: "object",
            properties: {
              primary_keywords: { type: "array", items: { type: "object", properties: { keyword: { type: "string" }, search_intent: { type: "string", enum: ["informacional","comercial","transaccional","navegacional"] }, estimated_volume: { type: "string" }, difficulty: { type: "string", enum: ["baja","media","alta"] }, content_type: { type: "string" } } } },
              long_tail_keywords: { type: "array", items: { type: "object", properties: { keyword: { type: "string" }, why_valuable: { type: "string" }, content_idea: { type: "string" } } } },
              question_keywords: { type: "array", items: { type: "object", properties: { question: { type: "string" }, platform: { type: "string", enum: ["Google","YouTube","TikTok"] }, answer_format: { type: "string" } } } },
            },
          },
          blog_strategy: { type: "object", properties: { domain_recommendation: { type: "string" }, posting_frequency: { type: "string" }, pillar_articles: { type: "array", items: { type: "object" } }, cluster_topics: { type: "array", items: { type: "object" } } } },
          youtube_strategy: { type: "object", properties: { channel_positioning: { type: "string" }, video_types: { type: "array", items: { type: "string" } }, first_10_videos: { type: "array", items: { type: "object" } } } },
          local_seo: { type: "object", properties: { applies: { type: "boolean" }, google_business: { type: "string" }, local_keywords: { type: "array", items: { type: "string" } } } },
          timeline: { type: "object", properties: { month_1_2: { type: "string" }, month_3_6: { type: "string" }, results_expected: { type: "string" } } },
        },
      },
    },
  },
  // ── Tab 19: Partnerships ─────────────────────────────────────────────────
  partnerships: {
    type: "object", additionalProperties: false, required: ["partnerships_strategy"],
    properties: {
      partnerships_strategy: {
        type: "object",
        properties: {
          affiliate_program: { type: "object", properties: { should_create: { type: "boolean" }, commission_percentage: { type: "number" }, commission_type: { type: "string", enum: ["por venta","por lead","recurrente"] }, cookie_duration_days: { type: "number" }, ideal_affiliates: { type: "array", items: { type: "string" } }, recruitment_strategy: { type: "string" }, tools: { type: "array", items: { type: "string" } }, launch_sequence: { type: "array", items: { type: "string" } } } },
          influencer_marketing: { type: "object", properties: { tier_strategy: { type: "object", properties: { nano: { type: "object" }, micro: { type: "object" } } }, ideal_influencer_profile: { type: "string" }, outreach_template: { type: "string" }, metrics_to_evaluate: { type: "array", items: { type: "string" } } } },
          co_marketing: { type: "object", properties: { ideal_partners: { type: "array", items: { type: "object", properties: { type: { type: "string" }, why_complementary: { type: "string" }, collaboration_idea: { type: "string" }, mutual_benefit: { type: "string" } } } }, collaboration_formats: { type: "array", items: { type: "string" } }, outreach_strategy: { type: "string" } } },
          community_partnerships: { type: "array", items: { type: "object", properties: { community_type: { type: "string" }, approach: { type: "string" }, value_to_offer: { type: "string" } } } },
          pr_strategy: { type: "object", properties: { media_targets: { type: "array", items: { type: "string" } }, pitch_angle: { type: "string" }, guest_post_targets: { type: "array", items: { type: "string" } } } },
        },
      },
    },
  },
  // ── Tab 20: Community Strategy ───────────────────────────────────────────
  community_strategy: {
    type: "object", additionalProperties: false, required: ["community_strategy"],
    properties: {
      community_strategy: {
        type: "object",
        properties: {
          community_concept: { type: "object", properties: { name: { type: "string" }, tagline: { type: "string" }, platform: { type: "string", enum: ["WhatsApp","Telegram","Discord","Circle","Facebook Groups","Skool"] }, platform_rationale: { type: "string" }, model: { type: "string", enum: ["gratuita","paga","freemium"] }, paid_price_usd: { type: "string" }, content_pillars: { type: "array", items: { type: "string" } } } },
          onboarding_flow: { type: "object", properties: { step_1: { type: "string" }, step_2: { type: "string" }, step_3: { type: "string" }, aha_moment: { type: "string" }, time_to_aha: { type: "string" } } },
          content_calendar_community: { type: "array", items: { type: "object", properties: { day: { type: "string" }, content_type: { type: "string" }, who_posts: { type: "string", enum: ["admin","miembros","invitado"] }, example: { type: "string" } } } },
          engagement_mechanics: { type: "object", properties: { daily_rituals: { type: "array", items: { type: "string" } }, weekly_events: { type: "array", items: { type: "string" } }, monthly_events: { type: "array", items: { type: "string" } }, gamification: { type: "array", items: { type: "string" } } } },
          monetization: { type: "object", properties: { if_free_community: { type: "object" }, if_paid_community: { type: "object" } } },
          growth_strategy: { type: "object", properties: { launch_plan: { type: "string" }, first_100_members: { type: "string" }, referral_mechanism: { type: "string" }, monthly_growth_target: { type: "string" } } },
          moderation_rules: { type: "array", items: { type: "string" } },
          metrics: { type: "array", items: { type: "object", properties: { metric: { type: "string" }, target: { type: "string" }, frequency: { type: "string" } } } },
        },
      },
    },
  },
};

// ── Per-Tab Perplexity Queries (V2) ─────────────────────────────────────────
// Queries cortas y enfocadas para investigación web por pestaña.
// El productName y targetMarket vienen del contexto. La categoría se infiere
// del nombre del producto si no está disponible explícitamente.
function buildPerplexityQuery(
  stepId: string,
  productName: string,
  targetMarket: string,
  productBrief: string = "",
): string {
  const market = targetMarket || "LATAM";
  const product = productName || "el producto";

  // Prefijo de desambiguacion: SIEMPRE incluir el contexto del producto al inicio
  // de cada query para que Perplexity no confunda nombres ambiguos (ej "Mordisquitos"
  // como gomitas para niños vs snacks de mascotas).
  const contextPrefix = productBrief
    ? `## CONTEXTO DEL PRODUCTO (uselo para acotar la busqueda y evitar productos no relacionados):\n${productBrief}\n\n## INVESTIGACION SOLICITADA:\n`
    : "";

  const queries: Record<string, string> = {
    market_overview:
      `Mercado de ${product} en ${market} 2025-2026: tamaño del mercado en USD, ` +
      `tasa de crecimiento anual, principales segmentos de consumidores, tendencias actuales, ` +
      `factores macroeconómicos relevantes (PESTEL), estadísticas de consumo, barreras de entrada. ` +
      `Incluye datos específicos para ${market}.`,

    jtbd:
      `"Jobs to be done" y motivaciones reales de compra para ${product} en ${market}. ` +
      `Qué problema funcional, emocional y social resuelve realmente. ` +
      `Comportamiento del consumidor antes y después de la compra. ` +
      `Alternativas que consideran, frustraciones con soluciones actuales.`,

    pains_desires:
      `Reviews y comentarios negativos sobre ${product} en plataformas de LATAM. ` +
      `Quejas frecuentes en redes sociales, foros, grupos de Facebook/WhatsApp. ` +
      `¿Qué frustra más a los consumidores de ${market} con este tipo de producto? ` +
      `¿Qué desean que los productos actuales no les dan?`,

    competitors:
      `Identifica 8-10 competidores REALES en la MISMA CATEGORIA descrita arriba (NO en categorias adyacentes ni con nombres parecidos). ` +
      `Validacion CRITICA: cada competidor debe atender al mismo tipo de cliente (audiencia descrita arriba) y resolver el mismo problema. ` +
      `Si el producto es para personas, NO listes productos para mascotas. Si es para niños, NO listes productos para adultos. ` +
      `Por cada competidor real (con URL de su sitio web verificable): nombre, URL del sitio web oficial, precio actual con moneda y fecha, ` +
      `propuesta de valor literal de su landing, claims principales, redes sociales activas (Instagram, TikTok con @handle real), ` +
      `estrategia de contenido observada, diferenciadores, reviews/quejas reales de clientes (G2, Trustpilot, Reddit, comentarios). ` +
      `Incluye competidores DIRECTOS (mismo producto/categoria) e INDIRECTOS (alternativa funcional para el mismo problema). ` +
      `Datos 2025-2026 en ${market} y LATAM.`,

    avatars:
      `Perfil demográfico y psicográfico del consumidor de ${product} en ${market}. ` +
      `Edad, ingresos, ocupación, comportamiento digital. Qué influencers siguen, ` +
      `qué contenido consumen, qué problemas buscan resolver online. ` +
      `Nivel de sofisticación como comprador digital.`,

    differentiation:
      `Mensajes de marketing más usados para ${product} en LATAM 2025-2026. ` +
      `Qué promesas son clichés en este mercado. Qué ángulos de comunicación son originales o poco usados. ` +
      `Tendencias de posicionamiento de marca en ${market}. ` +
      `Dolores que las marcas del sector NO están resolviendo o comunicando.`,

    sales_angles:
      `Creativos publicitarios más efectivos para ${product} en ${market} 2025-2026. ` +
      `Qué ángulos de ventas funcionan en TikTok Ads, Meta Ads para este mercado. ` +
      `Tipos de hooks que mejor funcionan en LATAM para productos similares. ` +
      `Ejemplos de ads virales en ${market} en esta categoría.`,

    puv_transformation:
      `Mejores propuestas de valor únicas (PUV) en el sector de ${product} en LATAM. ` +
      `Ejemplos de marcas que tienen una PUV clara y memorable. ` +
      `Cómo comunican la transformación del cliente las marcas exitosas de ${market}.`,

    lead_magnets:
      `Lead magnets más efectivos para captar leads en el sector de ${product} en LATAM. ` +
      `Qué ofrecen gratis marcas similares para captar emails/WhatsApp. ` +
      `Formatos de lead magnets con mayor tasa de conversión en ${market} 2025-2026.`,

    video_creatives:
      `Videos virales de ${product} en TikTok e Instagram en ${market} 2025-2026. ` +
      `Formatos de video que más convierten para este tipo de producto. ` +
      `Tendencias de producción de video UGC en LATAM: qué están haciendo las marcas exitosas. ` +
      `Scripts de videos de éxito en esta categoría.`,

    content_calendar:
      `Mejores días y horarios para publicar en TikTok e Instagram para audiencia de ${market}. ` +
      `Tendencias de hashtags para ${product} en ${market} 2025-2026. ` +
      `Formatos de contenido con mayor engagement para emprendedores/marcas en LATAM. ` +
      `Pilares de contenido más efectivos para marcas digitales en ${market}.`,

    launch_strategy:
      `Estrategias de lanzamiento exitosas para productos como ${product} en ${market} 2025-2026. ` +
      `Mejores prácticas de launches en LATAM: timing, canales, secuencias de email/WhatsApp. ` +
      `Presupuestos de lanzamiento típicos para startups en ${market}. ` +
      `Casos de estudio de lanzamientos exitosos en este sector.`,

    landing_pages:
      `Mejores prácticas de landing pages de alta conversión para ${product} en ${market} 2025-2026. ` +
      `Ejemplos de landing pages exitosas en esta industria. ` +
      `Elementos above-the-fold que más convierten en mercados latinoamericanos. ` +
      `Benchmarks de tasa de conversión para este tipo de producto. ` +
      `Headlines y CTAs que mejor funcionan en ${market}. ` +
      `Longitud óptima de landing page para esta categoría en LATAM.`,

    whatsapp_funnel:
      `Estrategias de venta por WhatsApp en ${market} 2025-2026 para ${product}. ` +
      `Mejores prácticas de WhatsApp Business para PYMEs en LATAM. ` +
      `Tasas de respuesta y conversión típicas en funnels de WhatsApp para esta industria. ` +
      `Herramientas de automatización de WhatsApp permitidas en LATAM (Botcake, WATI, ManyChat, Tidio). ` +
      `Casos de estudio de empresas que venden por WhatsApp en Colombia, México, Perú. ` +
      `Horarios de mayor respuesta en WhatsApp por país en LATAM.`,

    paid_ads:
      `Benchmarks de Meta Ads y TikTok Ads para ${product} en ${market} 2025-2026. ` +
      `CPM promedio, CTR esperado, CPA típico para este tipo de producto en LATAM. ` +
      `Mejores estructuras de campaña para marcas pequeñas en ${market}. ` +
      `Creativos de ads que más convierten en este sector. ` +
      `Presupuesto mínimo recomendado para validar paid ads en este nicho.`,

    email_marketing:
      `Mejores prácticas de email marketing para ${product} en LATAM 2025-2026. ` +
      `Tasas de apertura y click promedio en ${market}. ` +
      `Herramientas de email marketing más usadas en LATAM para pequeños negocios. ` +
      `Secuencias de email que más convierten para info-productos y servicios en español. ` +
      `Mejores días y horarios para enviar emails en ${market}.`,

    pricing_strategy:
      `Estrategia de precios para ${product} en ${market} 2025-2026. ` +
      `Precios de mercado actuales para productos similares en LATAM. ` +
      `Psicología de precios que funciona en mercados latinoamericanos. ` +
      `Planes de pago y cuotas más efectivos en ${market}. ` +
      `Benchmarks de ticket promedio en este sector para emprendedores LATAM.`,

    kpis_dashboard:
      `KPIs más importantes para medir marketing digital en el sector de ${product} en LATAM. ` +
      `Benchmarks de conversión, LTV y CAC para este tipo de negocio en ${market}. ` +
      `Herramientas de analytics gratuitas y económicas para emprendedores LATAM. ` +
      `Métricas AARRR aplicadas a negocios digitales pequeños en español.`,

    seo_strategy:
      `Keywords de búsqueda más populares para ${product} en ${market} 2025-2026. ` +
      `Volumen de búsqueda y dificultad de keywords relacionadas con esta categoría. ` +
      `Preguntas que hace el avatar en Google, YouTube y TikTok sobre este tema. ` +
      `Contenido de blog y YouTube que más rankea para este nicho en español. ` +
      `Tendencias de búsqueda en ${market} para este tema.`,

    partnerships:
      `Alianzas de co-marketing más comunes en el sector de ${product} en LATAM. ` +
      `Programas de afiliados exitosos en este sector en ${market}. ` +
      `Influencers y creadores relevantes para este nicho en LATAM. ` +
      `Comunidades y grupos donde está el avatar de ${product}. ` +
      `Marcas complementarias (no competidoras) que comparten el mismo avatar.`,

    community_strategy:
      `Estrategias de comunidad online exitosas para ${product} en LATAM 2025-2026. ` +
      `Plataformas de comunidad más usadas por emprendedores en ${market}. ` +
      `Cómo las marcas exitosas en este nicho construyen comunidades leales en LATAM. ` +
      `Métricas de comunidad que predicen retención y LTV alto. ` +
      `Casos de estudio de comunidades de pago exitosas en español.`,
  };

  const baseQuery = queries[stepId] || `Investigacion actualizada sobre ${product} en ${market} 2025-2026.`;
  return contextPrefix + baseQuery;
}

// Extrae el nombre del producto del baseContext (formato: "PRODUCTO/SERVICIO: X")
function extractProductName(baseContext: string): string {
  const match = baseContext.match(/PRODUCTO\/SERVICIO:\s*([^\n]+)/i);
  return match?.[1]?.trim() || "el producto";
}

// Extrae un brief descriptivo y desambiguado del producto desde el baseContext.
// CRITICO: si solo se pasa el "nombre" del producto a Perplexity, queries genericas
// como "Mordisquitos" se confunden con productos no relacionados (e.g. snacks de mascotas).
// Este brief captura: industria, descripcion, audiencia, beneficio principal, oferta.
function extractProductBrief(baseContext: string): string {
  const lines: string[] = [];
  const get = (re: RegExp): string | null => {
    const m = baseContext.match(re);
    return m?.[1]?.trim().replace(/\s+/g, " ") || null;
  };

  const productName = extractProductName(baseContext);
  const businessName = get(/NEGOCIO:\s*([^|\n]+)/i);
  const industry = get(/Industria:\s*([^|\n]+)/i);
  const businessModel = get(/Modelo:\s*([^|\n]+)/i);
  const description = get(/Descripcion:\s*([^\n]+)/i);
  const usp = get(/USP:\s*([^\n]+)/i);
  const promise = get(/Promesa:\s*([^\n]+)/i);
  const problem = get(/Problema que resuelve:\s*([^\n]+)/i);
  const transformation = get(/Transformacion:\s*([^\n]+)/i);
  const benefits = get(/Beneficios clave:\s*([^\n]+)/i);
  const demographic = get(/Demografico:\s*([^\n]+)/i);
  const flagshipOffer = get(/OFERTA ESTRELLA:\s*([^\n]+)/i);
  const serviceGroup = get(/Grupo de servicio:\s*([^\n]+)/i);
  const serviceTypes = get(/Tipos de servicio:\s*([^\n]+)/i);

  // Nombre completo y desambiguacion
  if (businessName && businessName.toLowerCase() !== productName.toLowerCase()) {
    lines.push(`PRODUCTO: "${productName}" (marca/empresa: ${businessName})`);
  } else {
    lines.push(`PRODUCTO: "${productName}"`);
  }

  // Categoria precisa
  if (industry || serviceGroup) {
    lines.push(`CATEGORIA: ${[industry, serviceGroup, serviceTypes].filter(Boolean).join(" / ")}`);
  }
  if (businessModel) lines.push(`MODELO: ${businessModel}`);

  // Que ES el producto exactamente
  if (description) lines.push(`QUE ES: ${description.substring(0, 280)}`);
  if (problem) lines.push(`PROBLEMA QUE RESUELVE: ${problem.substring(0, 200)}`);
  if (usp) lines.push(`USP: ${usp.substring(0, 180)}`);
  if (promise) lines.push(`PROMESA: ${promise.substring(0, 180)}`);
  if (transformation) lines.push(`TRANSFORMACION: ${transformation.substring(0, 180)}`);
  if (benefits) lines.push(`BENEFICIOS CLAVE: ${benefits.substring(0, 200)}`);

  // A quien va dirigido
  if (demographic) lines.push(`AUDIENCIA: ${demographic.substring(0, 200)}`);

  // Oferta concreta (precio, formato)
  if (flagshipOffer) lines.push(`OFERTA: ${flagshipOffer.substring(0, 200)}`);

  return lines.join("\n");
}

// ── AI pipeline: Perplexity investiga → Mistral estructura → Gemini fallback ──
// Budget mutable de Firecrawl: se decrementa internamente cuando callAI scrapea
export interface FirecrawlBudget {
  remaining: number;
  maxForStep: number;
  scrapedUrls: string[];
}

async function callAI(
  systemPrompt: string,
  userPrompt: string,
  schema: any,
  schemaName: string,
  maxTokens: number,
  stepId: string,
  perplexityQuery?: string,
  deepResearchMode: boolean = false,
  firecrawlBudget?: FirecrawlBudget,
): Promise<any> {
  const perplexityKey = Deno.env.get("PERPLEXITY_API_KEY");
  const mistralKey = Deno.env.get("MISTRAL_API_KEY");
  const geminiKey = Deno.env.get("GEMINI_API_KEY") || Deno.env.get("GOOGLE_AI_API_KEY");
  const firecrawlKey = Deno.env.get("FIRECRAWL_API_KEY");

  // Debug: capturar raw responses para inspección post-mortem en BD
  const DEBUG_RESPONSES: Array<{ provider: string; parseError: string; contentLength: number; first800: string; last300: string }> = [];

  console.log(`[AI] ${stepId} | maxTokens=${maxTokens}${deepResearchMode ? " | DEEP RESEARCH" : ""}`);
  console.log(`[AI] Keys: perplexity=${!!perplexityKey} | mistral=${!!mistralKey} | gemini=${!!geminiKey}`);

  // ── PASO 1: Perplexity hace la investigación web (devuelve texto libre) ──
  // Usa una query CORTA y ENFOCADA por pestaña, no el userPrompt completo.
  // Modo Deep Research (upgrade): sonar-pro + max_tokens 3000 + instrucciones de búsqueda profunda
  let researchContext = "";
  if (perplexityKey && perplexityQuery) {
    const pplxModel = deepResearchMode ? "sonar-pro" : "sonar";
    const pplxMaxTokens = deepResearchMode ? 3000 : 1500;
    console.log(`[AI] → Paso 1: Perplexity ${pplxModel} investigando (${stepId})${deepResearchMode ? " [DEEP]" : ""}`);
    console.log(`[AI]   Query: ${perplexityQuery.substring(0, 120)}...`);

    const baseSystem =
      "Eres un investigador de mercado experto en LATAM. Busca informacion factual y actualizada sobre el tema. " +
      "Devuelve tus hallazgos en texto libre bien organizado, con datos concretos: cifras reales, fechas, " +
      "nombres de marcas, precios, estadisticas verificables. Cita fuentes cuando sea posible. " +
      "NO uses formato JSON. NO inventes datos. Si no encuentras un dato especifico, omitelo.";

    const deepSystem =
      "Eres un analista de inteligencia competitiva senior con acceso a Deep Research. " +
      "Realiza una investigacion EXHAUSTIVA y PROFUNDA sobre el tema, consultando MULTIPLES fuentes recientes (ultimos 12 meses). " +
      "Profundiza en: nombres reales de competidores, precios reales con moneda y fecha, claims publicitarios reales (textos exactos vistos en anuncios o landing pages), " +
      "cifras de mercado verificables (TAM/SAM/SOM, CAGR, share), reviews y quejas reales de usuarios (G2, Trustpilot, Reddit, Twitter), " +
      "hooks ganadores observados en TikTok/Instagram/YouTube, gaps de mercado evidenciados. " +
      "Cita SIEMPRE las fuentes con URLs. NO inventes datos. Si no encuentras un dato, dilo explicitamente. " +
      "Devuelve hallazgos extensos en texto libre estructurado por secciones tematicas.";

    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), deepResearchMode ? 60000 : 30000);
    try {
      const res = await fetch("https://api.perplexity.ai/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${perplexityKey}`, "Content-Type": "application/json" },
        signal: ctrl.signal,
        body: JSON.stringify({
          model: pplxModel,
          max_tokens: pplxMaxTokens,
          temperature: 0.1,
          messages: [
            { role: "system", content: deepResearchMode ? deepSystem : baseSystem },
            { role: "user", content: perplexityQuery },
          ],
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const text = (data.choices?.[0]?.message?.content || "").toString().trim();
        if (text) {
          researchContext = text;
          console.log(`[AI] OK Perplexity ${pplxModel} (${stepId}) - ${text.length} chars`);
        } else {
          console.warn(`[AI] Perplexity devolvio contenido vacio (${stepId})`);
        }
      } else {
        const errBody = await res.text().catch(() => "");
        console.warn(`[AI] Perplexity HTTP ${res.status} (${stepId}): ${errBody.substring(0, 200)}`);
      }
    } catch (err: any) {
      const timeoutLabel = deepResearchMode ? "TIMEOUT 60s" : "TIMEOUT 30s";
      const label = err?.name === "AbortError" ? timeoutLabel : err.message;
      console.warn(`[AI] Perplexity fallo (${stepId}): ${label} - continuando sin contexto web`);
    } finally {
      clearTimeout(t);
    }
  }

  // ── PASO 1.5: Firecrawl scrapea URLs reales (solo si upgrade activo y hay budget) ──
  let firecrawlContext = "";
  if (
    deepResearchMode &&
    firecrawlBudget &&
    firecrawlBudget.maxForStep > 0 &&
    firecrawlBudget.remaining > 0 &&
    firecrawlKey &&
    researchContext
  ) {
    const candidateUrls = extractUrlsFromText(researchContext, 15);
    const newUrls = candidateUrls.filter(u => !firecrawlBudget.scrapedUrls.includes(u));
    const limitForStep = Math.min(firecrawlBudget.maxForStep, firecrawlBudget.remaining, newUrls.length);
    const targetUrls = newUrls.slice(0, limitForStep);

    if (targetUrls.length > 0) {
      console.log(`[AI] -> Paso 1.5: Firecrawl scrapeando ${targetUrls.length} URLs (${stepId}) | budget restante: ${firecrawlBudget.remaining}/${firecrawlBudget.remaining + 0}`);
      try {
        const scrapeResults = await batchScrape(targetUrls, firecrawlKey, {
          concurrency: 4,
          timeoutMs: 25000,
          maxCharsPerUrl: 6000,
          onlyMainContent: true,
        });
        const okResults = scrapeResults.filter(r => r.ok);
        firecrawlContext = formatScrapeContextForLLM(okResults, `Datos reales scrapeados (${stepId})`);
        // Decrementar budget global con todas las URLs intentadas (no solo OK) para evitar reintentos
        for (const r of scrapeResults) firecrawlBudget.scrapedUrls.push(r.url);
        firecrawlBudget.remaining = Math.max(0, firecrawlBudget.remaining - scrapeResults.length);
        console.log(`[AI] OK Firecrawl ${stepId}: ${okResults.length}/${scrapeResults.length} OK, ${firecrawlContext.length} chars | budget restante: ${firecrawlBudget.remaining}`);
      } catch (err: any) {
        console.warn(`[AI] Firecrawl fallo (${stepId}): ${err.message} - continuando sin scraping`);
      }
    } else {
      console.log(`[AI] Skip Firecrawl ${stepId}: no hay URLs nuevas candidatas`);
    }
  }

  // ── PASO 2: Mistral (o Gemini) estructura el resultado en JSON ──
  const webContext = researchContext
    ? `\n\n---\n## Investigación web recopilada por Perplexity:\n${researchContext}\n---\n`
    : "";
  const enrichedUserPrompt = (researchContext || firecrawlContext)
    ? `${userPrompt}${webContext}${firecrawlContext}\n\nUsando la investigación y los datos reales scrapeados anteriores, genera el JSON solicitado. Cita precios y claims especificos cuando aparezcan en los datos scrapeados.`
    : userPrompt;

  const tryMistral = async (): Promise<any> => {
    if (!mistralKey) throw new Error("No MISTRAL_API_KEY");
    console.log(`[AI] → Paso 2 fallback: Mistral large (${stepId})`);
    const controller = new AbortController();
    // Timeout dinamico segun tamaño del output (max_tokens grandes = mas tiempo)
    const dynamicTimeout = maxTokens >= 14000 ? 110000 : maxTokens >= 10000 ? 95000 : 75000;
    const timeout = setTimeout(() => controller.abort(), dynamicTimeout);
    try {
      const res = await fetch("https://api.mistral.ai/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${mistralKey}`, "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          model: "mistral-large-latest",
          max_tokens: maxTokens,
          temperature: 0.2,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: enrichedUserPrompt },
          ],
          response_format: { type: "json_object" },
        }),
      });
      if (!res.ok) {
        const errBody = await res.text().catch(() => "");
        throw new Error(`Mistral HTTP ${res.status}: ${errBody.substring(0, 200)}`);
      }
      const data = await res.json();
      const content = (data.choices?.[0]?.message?.content || "").toString().trim();
      if (!content) throw new Error(`Mistral returned empty content for ${stepId}`);
      console.log(`[AI] Mistral response received (${stepId}) — ${content.length} chars`);

      try {
        const parsed = JSON.parse(repairJsonForParse(content));
        console.log(`[AI] ✓ Mistral OK (${stepId}) — JSON parsed correctly`);
        return parsed;
      } catch (parseErr: any) {
        const debugInfo = {
          provider: "mistral",
          parseError: parseErr.message,
          contentLength: content.length,
          first800: content.substring(0, 800),
          last300: content.substring(Math.max(0, content.length - 300)),
        };
        DEBUG_RESPONSES.push(debugInfo);
        console.error(`[AI] ✗ Mistral JSON parse FAILED (${stepId}): ${parseErr.message}`);
        console.error(`[AI]   Raw (first 800): ${content.substring(0, 800)}`);
        throw new Error(`Mistral JSON inválido: ${parseErr.message}`);
      }
    } finally {
      clearTimeout(timeout);
    }
  };

  const tryGemini = async (): Promise<any> => {
    if (!geminiKey) throw new Error("No GEMINI_API_KEY");
    console.log(`[AI] → Paso 2: Gemini 2.5-flash estructurando (${stepId})`);
    const controller = new AbortController();
    // Timeout dinamico segun tamaño del output
    const dynamicTimeoutG = maxTokens >= 14000 ? 100000 : maxTokens >= 10000 ? 85000 : 60000;
    const timeout = setTimeout(() => controller.abort(), dynamicTimeoutG);
    try {
      const res = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
        {
          method: "POST",
          headers: { Authorization: `Bearer ${geminiKey}`, "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            model: "gemini-2.5-flash",
            max_tokens: maxTokens,
            temperature: 0.2,
            reasoning_effort: "none", // deshabilita thinking → más tokens para JSON
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: enrichedUserPrompt },
            ],
            response_format: { type: "json_object" },
          }),
        },
      );
      if (!res.ok) {
        const errBody = await res.text().catch(() => "");
        throw new Error(`Gemini HTTP ${res.status}: ${errBody.substring(0, 200)}`);
      }
      const data = await res.json();
      const content = (data.choices?.[0]?.message?.content || "").toString().trim();
      if (!content) throw new Error(`Gemini returned empty content for ${stepId}`);
      console.log(`[AI] Gemini response received (${stepId}) — ${content.length} chars`);

      try {
        const parsed = JSON.parse(repairJsonForParse(content));
        console.log(`[AI] ✓ Gemini OK (${stepId}) — JSON parsed correctly`);
        return parsed;
      } catch (parseErr: any) {
        const debugInfo = {
          provider: "gemini",
          parseError: parseErr.message,
          contentLength: content.length,
          first800: content.substring(0, 800),
          last300: content.substring(Math.max(0, content.length - 300)),
        };
        DEBUG_RESPONSES.push(debugInfo);
        console.error(`[AI] ✗ Gemini JSON parse FAILED (${stepId}): ${parseErr.message}`);
        throw new Error(`Gemini JSON inválido: ${parseErr.message}`);
      }
    } finally {
      clearTimeout(timeout);
    }
  };

  // Pipeline V2: Perplexity investiga → Gemini estructura (primario) → Mistral fallback
  const providerLabels = ["gemini", "mistral"];
  const attempts = [tryGemini, tryMistral];
  for (let i = 0; i < attempts.length; i++) {
    const lengthBefore = DEBUG_RESPONSES.length;
    try {
      return await attempts[i]();
    } catch (err: any) {
      const isTimeout = err?.name === "AbortError";
      const label = isTimeout ? "TIMEOUT" : err.message;
      console.warn(`[full-research] ${stepId} ${providerLabels[i]} falló: ${label}`);
      // Solo push si no fue un parse error (que ya se capturó dentro del try)
      if (DEBUG_RESPONSES.length === lengthBefore) {
        DEBUG_RESPONSES.push({
          provider: providerLabels[i],
          parseError: isTimeout ? "TIMEOUT" : (err.message || "unknown error"),
          contentLength: 0,
          first800: "",
          last300: "",
        });
      }
    }
  }

  // Embed debug info into error for diagnóstico post-mortem
  const error: any = new Error(`All AI providers failed for step: ${stepId}`);
  error.debugResponses = DEBUG_RESPONSES;
  throw error;
}

// ── Build enriched base context from Client DNA + Product DNA ──────────────
function buildBaseContext(
  clientDna: any,
  productDna: any,
  productName: string,
): string {
  const dna = clientDna?.dna_data || {};
  const pd = productDna || {};
  const parts: string[] = [];

  parts.push(`PRODUCTO/SERVICIO: ${productName}`);

  // === Client DNA (Brand) ===
  parts.push("\n--- ADN DE MARCA (Client DNA) ---");

  if (dna.business_identity) {
    const bi = dna.business_identity;
    parts.push(`NEGOCIO: ${bi.name || "N/A"} | Industria: ${bi.industry || "N/A"} | Modelo: ${bi.business_model || "N/A"}`);
    if (bi.description) parts.push(`Descripcion: ${bi.description}`);
    if (bi.origin_story) parts.push(`Historia: ${bi.origin_story}`);
    if (bi.mission) parts.push(`Mision: ${bi.mission}`);
    if (bi.unique_factor) parts.push(`Factor unico: ${bi.unique_factor}`);
  }

  if (dna.value_proposition) {
    const vp = dna.value_proposition;
    parts.push(`\nPROPUESTA DE VALOR:`);
    if (vp.main_usp) parts.push(`USP: ${vp.main_usp}`);
    if (vp.brand_promise) parts.push(`Promesa: ${vp.brand_promise}`);
    if (vp.main_problem_solved) parts.push(`Problema que resuelve: ${vp.main_problem_solved}`);
    if (vp.transformation_promise) parts.push(`Transformacion: ${vp.transformation_promise}`);
    if (vp.differentiators?.length) parts.push(`Diferenciadores: ${vp.differentiators.join(", ")}`);
    if (vp.key_benefits?.length) parts.push(`Beneficios clave: ${vp.key_benefits.join(", ")}`);
  }

  if (dna.ideal_customer) {
    const ic = dna.ideal_customer;
    parts.push(`\nCLIENTE IDEAL (de marca):`);
    if (ic.demographic) parts.push(`Demografico: Edad ${ic.demographic.age_range || "N/A"}, ${ic.demographic.gender || "N/A"}, ${ic.demographic.location || "N/A"}, Ingreso ${ic.demographic.income_level || "N/A"}, ${ic.demographic.occupation || "N/A"}`);
    if (ic.psychographic) {
      if (ic.psychographic.values?.length) parts.push(`Valores: ${ic.psychographic.values.join(", ")}`);
      if (ic.psychographic.interests?.length) parts.push(`Intereses: ${ic.psychographic.interests.join(", ")}`);
    }
    if (ic.pain_points?.length) parts.push(`Dolores: ${ic.pain_points.join("; ")}`);
    if (ic.desires?.length) parts.push(`Deseos: ${ic.desires.join("; ")}`);
    if (ic.objections?.length) parts.push(`Objeciones: ${ic.objections.join("; ")}`);
    if (ic.buying_triggers?.length) parts.push(`Triggers de compra: ${ic.buying_triggers.join("; ")}`);
  }

  if (dna.flagship_offer) {
    const fo = dna.flagship_offer;
    parts.push(`\nOFERTA ESTRELLA: ${fo.name || "N/A"} | Precio: ${fo.price_range || fo.price || "N/A"} | Beneficio: ${fo.main_benefit || "N/A"}`);
    if (fo.included_features?.length) parts.push(`Incluye: ${fo.included_features.join(", ")}`);
  }

  if (dna.brand_identity) {
    const bid = dna.brand_identity;
    parts.push(`\nIDENTIDAD DE MARCA: Arquetipo: ${bid.brand_archetype || "N/A"}`);
    if (bid.personality_traits?.length) parts.push(`Personalidad: ${bid.personality_traits.join(", ")}`);
    if (bid.tone_of_voice) parts.push(`Tono: ${bid.tone_of_voice}`);
    if (bid.voice?.do_say?.length) parts.push(`Decir: ${bid.voice.do_say.join(", ")}`);
    if (bid.voice?.dont_say?.length) parts.push(`No decir: ${bid.voice.dont_say.join(", ")}`);
    if (bid.messaging?.tagline) parts.push(`Tagline: ${bid.messaging.tagline}`);
    if (bid.messaging?.key_messages?.length) parts.push(`Mensajes clave: ${bid.messaging.key_messages.join("; ")}`);
  }

  if (dna.marketing_strategy) {
    const ms = dna.marketing_strategy;
    parts.push(`\nESTRATEGIA DE MARKETING:`);
    if (ms.content_pillars?.length) parts.push(`Pilares: ${ms.content_pillars.map((p: any) => p.name || p).join(", ")}`);
    if (ms.recommended_platforms?.length) parts.push(`Plataformas: ${ms.recommended_platforms.map((p: any) => `${p.name || p} (${p.priority || ""})`).join(", ")}`);
    if (ms.hashtag_strategy?.length) parts.push(`Hashtags: ${ms.hashtag_strategy.join(", ")}`);
  }

  if (dna.ads_targeting) {
    const at = dna.ads_targeting;
    parts.push(`\nTARGETING PUBLICITARIO:`);
    if (at.meta_targeting?.interests?.length) parts.push(`Meta intereses: ${at.meta_targeting.interests.join(", ")}`);
    if (at.google_targeting?.keywords?.length) parts.push(`Google keywords: ${at.google_targeting.keywords.join(", ")}`);
    if (at.hook_suggestions?.length) parts.push(`Hooks sugeridos: ${at.hook_suggestions.slice(0, 3).join("; ")}`);
  }

  if (clientDna?.emotional_analysis) {
    const ea = clientDna.emotional_analysis;
    parts.push(`\nANALISIS EMOCIONAL DEL EMPRENDEDOR: Mood: ${ea.overall_mood || "N/A"}, Confianza: ${ea.confidence_level || "N/A"}%`);
    if (ea.passion_topics?.length) parts.push(`Temas apasionantes: ${ea.passion_topics.join(", ")}`);
    if (ea.concern_areas?.length) parts.push(`Preocupaciones: ${ea.concern_areas.join(", ")}`);
    if (ea.content_recommendations?.suggested_tone) parts.push(`Tono sugerido: ${ea.content_recommendations.suggested_tone}`);
  }

  // === Product DNA ===
  parts.push("\n--- ANALISIS PREVIO DE PRODUCTO (Product DNA) ---");
  parts.push(`Grupo de servicio: ${pd.service_group || "N/A"}`);
  parts.push(`Tipos de servicio: ${(pd.service_types || []).join(", ")}`);

  if (pd.market_research) {
    const mr = pd.market_research;
    parts.push(`\nINVESTIGACION DE MERCADO (resumida):`);
    if (mr.market_overview) parts.push(typeof mr.market_overview === "string" ? mr.market_overview.substring(0, 500) : JSON.stringify(mr.market_overview).substring(0, 500));
    if (mr.ideal_customer_profile) {
      const icp = mr.ideal_customer_profile;
      if (icp.demographics) parts.push(`ICP Demografico: ${icp.demographics}`);
      if (icp.pain_points?.length) parts.push(`ICP Dolores: ${icp.pain_points.join("; ")}`);
      if (icp.desires?.length) parts.push(`ICP Deseos: ${icp.desires.join("; ")}`);
    }
  }

  if (pd.competitor_analysis) {
    const ca = pd.competitor_analysis;
    parts.push(`\nANALISIS COMPETITIVO (resumido):`);
    if (ca.competitive_advantage) parts.push(`Ventaja competitiva: ${ca.competitive_advantage}`);
    if (ca.positioning_strategy) parts.push(`Posicionamiento: ${ca.positioning_strategy}`);
    if (ca.differentiation_points?.length) parts.push(`Diferenciacion: ${ca.differentiation_points.join("; ")}`);
  }

  if (pd.strategy_recommendations) {
    const sr = pd.strategy_recommendations;
    parts.push(`\nRECOMENDACIONES ESTRATEGICAS (resumidas):`);
    if (sr.value_proposition) parts.push(`Propuesta de valor: ${sr.value_proposition}`);
    if (sr.brand_positioning) parts.push(`Posicionamiento: ${sr.brand_positioning}`);
    if (sr.pricing_strategy) parts.push(`Estrategia de precio: ${sr.pricing_strategy}`);
  }

  if (pd.content_brief) {
    const cb = pd.content_brief;
    parts.push(`\nBRIEF DE CONTENIDO (resumido):`);
    if (cb.brand_voice) parts.push(`Voz de marca: Tono ${cb.brand_voice.tone || "N/A"}, Personalidad ${cb.brand_voice.personality || "N/A"}`);
    if (cb.key_messages?.length) parts.push(`Mensajes clave: ${cb.key_messages.join("; ")}`);
  }

  if (pd.transcription) {
    parts.push(`\nTRANSCRIPCION DEL EMPRENDEDOR:\n${pd.transcription.substring(0, 2000)}`);
  }

  if (clientDna?.audience_locations?.length) {
    const locs = clientDna.audience_locations.map((l: any) => l.name || l).join(", ");
    parts.push(`\nMERCADOS GEOGRAFICOS: ${locs}`);
  }

  parts.push("\n--- FIN CONTEXTO ---");
  return parts.join("\n");
}

// ── Get target market string ───────────────────────────────────────────────
function getTargetMarket(clientDna: any, productDna: any): string {
  if (clientDna?.audience_locations?.length) {
    return clientDna.audience_locations.map((l: any) => l.name || l).join(", ");
  }
  const ic = clientDna?.dna_data?.ideal_customer?.demographic;
  if (ic?.location) return ic.location;
  return "Latinoamerica";
}

// ── Build prompt for each step ─────────────────────────────────────────────
function getStepPrompt(
  stepId: string,
  baseContext: string,
  targetMarket: string,
  prevResults: Record<string, any>,
): string {
  const prev = prevResults;
  const prevJtbd = prev.jtbd;
  const prevPains = prev.pains_desires;
  const prevAvatars = prev.avatars;
  const prevCompetitors = prev.competitors;
  const prevDiff = prev.differentiation;
  const prevSales = prev.sales_angles;

  const prompts: Record<string, string> = {
    market_overview: `Realiza una INVESTIGACION PROFUNDA del mercado usando busqueda web actualizada y datos reales de ${targetMarket}.

${baseContext}

MERCADO OBJETIVO: ${targetMarket}

INSTRUCCIONES CRITICAS:
- USA DATOS REALES Y ACTUALES (busca estadisticas 2024-2026)
- Cita fuentes cuando sea posible
- Se ESPECIFICO con numeros, porcentajes y cifras
- Evita generalidades, cada punto debe tener informacion concreta
- INTEGRA la informacion del ADN de marca para hacer el analisis mas relevante

Genera un ANALISIS EXHAUSTIVO con: tamano del mercado (TAM/SAM/SOM), tendencia de crecimiento (CAGR), estado del mercado, comportamiento del consumidor, 6-8 variables macroeconomicas PESTEL, nivel de conciencia Eugene Schwartz, resumen ejecutivo (3-4 parrafos), 5+ oportunidades y 5+ amenazas.`,

    jtbd: `Analiza a PROFUNDIDAD los Jobs To Be Done (JTBD) del cliente ideal.

${baseContext}

INSTRUCCIONES CRITICAS:
- Piensa como el cliente, no como el vendedor
- Usa lenguaje que el cliente realmente usaria
- Se extremadamente especifico en cada tipo de job
- INTEGRA lo que ya sabemos del cliente ideal del ADN de marca

Genera: JTBD Funcional (3-4 parrafos con situacion, alternativas, resultado, statement), JTBD Emocional (3-4 parrafos con sentimientos durante/despues, miedos, esperanzas), JTBD Social (3-4 parrafos con percepcion, estatus, grupo), 10-12 Insights estrategicos accionables.`,

    pains_desires: `Realiza un analisis PSICOLOGICO PROFUNDO de los dolores, deseos y objeciones del cliente ideal.

${baseContext}

JTBD identificado:
- Funcional: ${prevJtbd?.jtbd?.functional?.statement || "N/A"}
- Emocional: ${prevJtbd?.jtbd?.emotional?.description?.substring(0, 200) || "N/A"}
- Social: ${prevJtbd?.jtbd?.social?.description?.substring(0, 200) || "N/A"}

INSTRUCCIONES CRITICAS:
- Piensa como un psicologo que entiende motivaciones profundas
- Usa el lenguaje EXACTO que usaria el cliente
- Conecta cada dolor/deseo con una emocion especifica
- Se concreto, evita generalidades
- INTEGRA los dolores y objeciones del ADN de marca para profundizar

Genera EXACTAMENTE: 10 dolores profundos (pain/why/impact), 10 deseos aspiracionales (desire/emotion/idealState), 10 objeciones y miedos (objection/belief/counter).`,

    competitors: `Realiza una INVESTIGACION COMPETITIVA EXHAUSTIVA en ${targetMarket} usando busqueda web actualizada.

${baseContext}

INSTRUCCIONES CRITICAS:
- BUSCA competidores REALES con presencia online VERIFICABLE en la MISMA categoria del producto descrito arriba
- Si el producto es para PERSONAS, NO listes productos para mascotas. Si es para NIÑOS, NO listes productos para adultos. Si es un servicio digital, NO listes productos fisicos.
- Incluye tanto competidores directos como indirectos
- Analiza su posicionamiento, no solo lo que venden
- INTEGRA los competidores ya identificados en el ADN de producto para profundizar

REGLAS CRITICAS DE URL Y HANDLES (PROHIBIDO INVENTAR):
1. WEBSITE: Usa SOLO la URL EXACTA del dominio raiz oficial (ejemplo: "https://royalcanin.com" o "https://www.pedigree.com.co"). Si NO conoces la URL real verificable, deja el campo "" (string vacio). NUNCA inventes IDs, slugs ni rutas de productos especificos. NUNCA uses URLs como "https://exito.com/producto-123456" — esos IDs son inventados.
2. INSTAGRAM: Usa SOLO el handle real que aparezca en las fuentes (formato "@usuario" o URL "https://instagram.com/usuario"). Si NO conoces el handle real, deja "". NO inventes handles probables.
3. TIKTOK: Misma regla que Instagram. Vacio si no sabes.
4. Es PREFERIBLE dejar el campo vacio antes que inventar. Un campo vacio = "no encontre fuente verificable". Un campo inventado = mentira que rompe la confianza del usuario.
5. Cuando uses Perplexity y veas que cita una URL, USA ESA URL EXACTA tal cual aparece (no la modifiques).

Lista 6-10 COMPETIDORES REALES con: nombre, website (URL raiz oficial o ""), instagram (handle o ""), tiktok (handle o ""), promesa de marketing, diferenciador, tono, canales, precios, fortalezas (3+), debilidades (3+).`,

    avatars: `Crea 5 BUYER PERSONAS ULTRA-DETALLADOS basados en la investigacion previa.

${baseContext}

DOLORES PRINCIPALES:
${prevPains?.pains?.slice(0, 5).map((p: any) => `- ${p.pain}: ${p.why}`).join("\n") || "N/A"}

DESEOS PRINCIPALES:
${prevPains?.desires?.slice(0, 5).map((d: any) => `- ${d.desire}: ${d.emotion}`).join("\n") || "N/A"}

OBJECIONES:
${prevPains?.objections?.slice(0, 5).map((o: any) => `- ${o.objection}`).join("\n") || "N/A"}

INSTRUCCIONES CRITICAS:
- Cada avatar debe sentirse como una PERSONA REAL
- Usa nombres que reflejen su personalidad
- Las frases deben sonar 100% naturales
- INTEGRA el perfil de cliente ideal del ADN de marca para mayor precision

Crea EXACTAMENTE 5 AVATARES con: nombre simbolico, edad especifica, ocupacion, situacion familiar, ubicacion, rutina diaria, intentos previos, psicografia (awareness, drivers, sesgos, objeciones, valores, miedos), 5-7 frases textuales, comportamiento de consumo, trigger de compra.`,

    differentiation: `Eres el estratega del METODO CAST de Alexander Cast.
Genera el Playbook ejecutable de marketing especifico para este producto.

${baseContext}

COMPETIDORES ANALIZADOS:
${prevCompetitors?.competitors?.slice(0, 5).map((c: any) => `- ${c.name}: ${c.promise} | Debilidades: ${c.weaknesses?.join(", ")}`).join("\n") || "N/A"}

AVATARES DEFINIDOS:
${prevAvatars?.avatars?.map((a: any) => `- ${a.name}: ${a.situation?.currentFeeling || "Sin descripcion"} | Awareness: ${a.psychographics?.awarenessLevel || "N/A"}`).join("\n") || "N/A"}

DOLORES PROFUNDOS:
${(prevPains?.pains_desires?.pains || prevPains?.pains)?.slice(0, 5).map((p: any) => `- ${p.pain || p}: ${p.why || ""}`).join("\n") || "N/A"}

INSTRUCCIONES CRITICAS:
- METODO CAST (propio): C-A-S-T = Conocer > Atraer > Seducir > Transformar
- Cada accion debe ser ESPECIFICA para este producto, no generica
- Usa el nombre real del producto, los dolores reales del avatar y los angulos identificados
- INTEGRA la identidad de marca y voz del ADN de marca
- Evita referencias a frameworks externos como ESFERA, Schwartz o Hormozi como estructura
  (Cialdini/Kahneman pueden citarse como referencia interna en drivers psicologicos)

Genera estos 3 bloques en el JSON:

1. **differentiation** (analisis de mercado):
   - repeatedMessages, poorlyAddressedPains, positioningOpportunities, unexploitedEmotions

2. **castPlaybook** (Playbook ejecutable del Metodo CAST):
   - resumen_estrategico: 2-3 oraciones sobre la estrategia central de este producto
   - recomendacion_final: La recomendacion mas importante para este negocio AHORA
   - capas_cast: Las 4 capas C/A/S/T, cada una con:
     * nombre (Conocer/Atraer/Seducir/Transformar)
     * pregunta_clave que esta capa responde para ESTE producto
     * insight_principal del research aplicado a este avatar
     * (en C: nivel_conciencia_avatar [dormido|despertando|buscando|comparando|listo] y descripcion_nivel)
   - acciones_inmediatas: 4-7 acciones numeradas con titulo, capa_cast, descripcion, como_hacerlo, resultado_esperado, esfuerzo, impacto, tiempo_implementacion
   - quick_wins: 3-6 acciones de bajo esfuerzo y alto impacto
   - riesgos_a_evitar: 3-5 errores especificos con riesgo, por_que destruye conversiones, como_evitarlo
   - drivers_psicologicos: 3-6 principios (Cialdini, Kahneman, etc.) con driver, por_que_funciona, como_usarlo, capa_cast
   - calendario_7_dias: EXACTAMENTE 7 dias con dia, accion_principal, capa_cast, canal (TikTok|Instagram|WhatsApp|Email|Paid Ads|Landing), tipo_contenido, hook_sugerido

3. **executiveSummary** (resumen ejecutivo del research):
   - marketSummary, opportunityScore (0-10), opportunityScoreJustification
   - keyInsights (3-5), psychologicalDrivers (3-5), immediateActions (3-5), quickWins (2-4), risksToAvoid (2-4), finalRecommendation`,

    sales_angles: `Crea 20 ANGULOS DE VENTA ESTRATEGICOS basados en la investigacion completa.

${baseContext}

AVATARES Y SUS DRIVERS:
${prevAvatars?.avatars?.map((a: any) => `- ${a.name}: Drivers: ${Array.isArray(a.psychographics?.drivers) ? a.psychographics.drivers.join(", ") : "N/A"}`).join("\n") || "N/A"}

OPORTUNIDADES DE DIFERENCIACION:
${prevDiff?.differentiation?.positioningOpportunities?.map((o: any) => `- ${o.opportunity}`).join("\n") || "N/A"}

DOLORES MAL COMUNICADOS:
${prevDiff?.differentiation?.poorlyAddressedPains?.map((p: any) => `- ${p.pain}`).join("\n") || "N/A"}

INSTRUCCIONES CRITICAS:
- Cada angulo debe ser UNICO y diferenciado
- Los hooks deben ser irresistibles y especificos
- Varia los tipos: educativo, emocional, aspiracional, autoridad, comparativo, anti-mercado, storytelling, prueba-social, error-comun
- INTEGRA la voz de marca del ADN de marca en los hooks y CTAs

Genera EXACTAMENTE 20 ANGULOS con: angle (3-4 oraciones), type, avatar, emotion, contentType, hookExample (listo para usar), ctaExample, funnelPhase (tofu/mofu/bofu), hashtags (5), whyItWorks, developmentTips.`,

    puv_transformation: `Construye una PROPUESTA UNICA DE VALOR PODEROSA y TABLA DE TRANSFORMACION.

${baseContext}

ANGULOS MAS FUERTES:
${prevSales?.salesAngles?.slice(0, 8).map((a: any) => `- [${a.type}] ${a.hookExample}`).join("\n") || "N/A"}

DIFERENCIADORES:
${prevDiff?.differentiation?.positioningOpportunities?.slice(0, 3).map((o: any) => `- ${o.opportunity}`).join("\n") || "N/A"}

INSTRUCCIONES CRITICAS:
- La PUV debe ser MEMORABLE y pasar la "prueba del taxi"
- La transformacion debe ser VIVIDA y especifica
- INTEGRA la propuesta de valor del ADN de marca como base

Genera: PUV (centralProblem, tangibleResult, marketDifference, idealClient, statement max 25 palabras, credibility), Transformacion (functional/emotional/identity/social/financial con before/after).`,

    lead_magnets: `Disena 3 LEAD MAGNETS IRRESISTIBLES.

${baseContext}

AVATARES:
${prevAvatars?.avatars?.map((a: any) => `- ${a.name}: ${a.situation?.currentFeeling || ""}`).join("\n") || "N/A"}

DOLORES PRINCIPALES:
${prevPains?.pains?.slice(0, 6).map((p: any) => `- ${p.pain}`).join("\n") || "N/A"}

INSTRUCCIONES CRITICAS:
- Cada lead magnet debe ser tan valioso que lo querrian pagar
- Nombres irresistibles y especificos
- Variar formatos
- INTEGRA la estrategia de marketing del ADN de marca

Crea 3 LEAD MAGNETS: 1 para PROBLEM AWARE, 1 para SOLUTION AWARE, 1 para PRODUCT AWARE. Cada uno con: name, format, objective, pain, avatar, awarenessPhase, promise, structure (5-7 secciones), deliveryMethod, estimatedTime.`,

    video_creatives: `Crea 15-18 IDEAS DE CONTENIDO con guiones resumidos por fase del METODO CONVERT (propio de KIRO).

${baseContext}

ANGULOS DISPONIBLES:
${prevSales?.salesAngles?.slice(0, 8).map((a: any) => `- [${a.type}] "${a.hookExample}" > Avatar: ${a.avatar}`).join("\n") || "N/A"}

AVATARES:
${prevAvatars?.avatars?.map((a: any) => a.name).join(", ") || "N/A"}

INSTRUCCIONES CRITICAS:
- PRIORIZAR formatos faciles de producir: Carruseles, Reels con texto, Stories, Posts estaticos, Infografias, Memes, Threads
- Maximo 4 de 18 deben ser videos con persona hablando
- METODO CONVERT (propio): C-O-N-V-E-R-T = Conciencia > Origen > Necesidad > Valor > Engagement > Retencion > Traccion
- Distribucion sugerida: 4 conciencia + 2 origen + 3 necesidad + 4 valor + 2 engagement + 2 retencion + 1 traccion = 18 piezas
- INTEGRA las plataformas recomendadas del ADN de marca
- Se conciso: titles cortos, idea en 2-3 oraciones, structure compacta. Calidad > cantidad.

Cada creativo con: number, angle, avatar, title (max 12 palabras), idea (2-3 oraciones), structure (hook/body/climax/cta breves), format, esferaPhase (una de: conciencia/origen/necesidad/valor/engagement/retencion/traccion - fase Metodo CONVERT), duration, platform, productionNotes (1-2 oraciones).`,

    content_calendar: `Crea PARRILLA DE CONTENIDO PROFESIONAL para 28 DIAS (4 semanas).

${baseContext}

AVATARES:
${prevAvatars?.avatars?.map((a: any) => a.name).join(", ") || "N/A"}

ANGULOS DISPONIBLES:
${prevSales?.salesAngles?.slice(0, 10).map((a: any) => `- [${a.type}] "${a.hookExample}"`).join("\n") || "N/A"}

INSTRUCCIONES CRITICAS:
- Contenido LISTO PARA PUBLICAR (copy completo, hashtags, CTA)
- Varia formatos: Carruseles, Stories, Reels, Posts, Threads, Memes, Infografias, Quotes, BTS, Encuestas
- Distribucion de pilares: 40% educativo, 20% emocional, 15% autoridad, 15% venta, 10% comunidad
- Incluye 3 dias para lead magnets
- INTEGRA la voz de marca y pilares de contenido del ADN de marca

28-35 piezas con: week, day, dayLabel, platform, format, pillar, title, hook, description, copy (listo), cta, hashtags, esferaPhase (debe ser una de: conciencia/origen/necesidad/valor/engagement/retencion/traccion - fase del Metodo CONVERT propio), avatar, productionNotes. Ademas: 4 weeklyThemes y 3 leadMagnetDays.`,

    launch_strategy: `Disena ESTRATEGIA DE LANZAMIENTO COMPLETA.

${baseContext}

PUV:
${prev.puv_transformation?.puv?.statement || "N/A"}

INSTRUCCIONES CRITICAS:
- Plan REALISTA para equipo de 1-5 personas
- Incluye estrategia organica y de pago
- Secuencia de emails con copy resumido
- Presupuesto adaptado a LATAM
- Metricas claras
- INTEGRA los canales y targeting del ADN de marca

Genera: preLaunch (duration, objectives, actions, contentPlan, checklist), launch (dayPlan, offer con bonuses/urgency/scarcity/guarantee, emailSequence 5-7, channels), postLaunch (retentionActions, postSaleContent, referralStrategy, nonBuyerFollowUp, analysisChecklist), budget (organic/paid/totalEstimated), timeline (6-8 hitos), team, metrics (preLaunch/launch/postLaunch).`,

    landing_pages: `Genera 2 VARIACIONES COMPLETAS de landing page para este producto.
Cada variacion es una propuesta diferente — no la misma con cambios menores.

${baseContext}

PUV (de paso anterior):
${prev.puv_transformation?.puv?.statement || "N/A"}

AVATAR PRIMARIO:
${JSON.stringify(prevAvatars?.avatars?.[0] || {}).substring(0, 800)}

DOLORES CRITICOS:
${prevPains?.pains?.slice(0, 5).map((p: any) => `- ${p.pain}: ${p.impact}`).join("\n") || "N/A"}

OBJECIONES PRINCIPALES:
${prevPains?.objections?.slice(0, 4).map((o: any) => `- ${o.objection}`).join("\n") || "N/A"}

TRANSFORMACION:
${JSON.stringify(prev.puv_transformation?.transformation || {}).substring(0, 600)}

LEAD MAGNETS:
${prev.lead_magnets?.leadMagnets?.slice(0, 2).map((l: any) => `- ${l.name}: ${l.promise}`).join("\n") || "N/A"}

ANGULOS TOP 3:
${prevSales?.salesAngles?.slice(0, 3).map((a: any) => `- ${a.hookExample}`).join("\n") || "N/A"}

INSTRUCCIONES CRITICAS:
- VARIACION A "La Directa" → para audiencia caliente (nivel 4-5 Schwartz), oferta visible desde el hero
- VARIACION B "La Educativa" → para audiencia tibia (nivel 2-3 Schwartz), construye confianza primero
- Cada variacion debe tener 8-11 secciones completas (hero, problem, agitation, solution, social_proof, authority, offer, guarantee, faq, final_cta)
- Cada seccion incluye copy_full LISTO PARA COPIAR Y PEGAR
- Headlines pasan el test de 3 segundos
- Testimoniales con nombre + ciudad + resultado especifico (ficticios pero creibles)
- Garantia simple sin condiciones complicadas
- Incluir ab_testing_plan con 2 tests + tech_stack_recommendation`,

    whatsapp_funnel: `Genera el FUNNEL COMPLETO DE VENTAS POR WHATSAPP con 3-4 tipos de secuencias.

${baseContext}

PUV:
${prev.puv_transformation?.puv?.statement || "N/A"}

LEAD MAGNET PRINCIPAL:
${prev.lead_magnets?.leadMagnets?.[0]?.name || "N/A"} - ${prev.lead_magnets?.leadMagnets?.[0]?.promise || ""}

OBJECIONES PRINCIPALES:
${prevPains?.objections?.slice(0, 5).map((o: any) => `- ${o.objection}`).join("\n") || "N/A"}

AVATAR PRIMARIO:
${JSON.stringify(prevAvatars?.avatars?.[0] || {}).substring(0, 800)}

MERCADO: ${targetMarket}

INSTRUCCIONES CRITICAS:
- 3 tipos de funnel obligatorios: CAPTACION (5-7 mensajes en 7-10 dias), CIERRE (3-5 mensajes en 3-5 dias), REACTIVACION (2-3 mensajes en 3 dias)
- Cada mensaje LISTO PARA COPIAR Y PEGAR (incluir emojis adecuados)
- Maximo 150 palabras por mensaje (se leen en movil)
- Personalizacion con [Nombre] siempre
- Primer mensaje NUNCA con pitch directo de venta
- Incluir audio_script para mensajes clave (60-90 segundos)
- branch_flows con respuestas a objeciones comunes ("muy caro", "lo pienso", "no me interesa")
- Respeta horarios LATAM (8am-8pm hora local)
- Incluir whatsapp_setup (account_type, automation_tools, compliance) y performance_benchmarks`,

    paid_ads: `Genera la ESTRATEGIA COMPLETA DE PAID ADS para Meta y TikTok.

${baseContext}

PUV: ${prev.puv_transformation?.puv?.statement || "N/A"}
AVATAR PRIMARIO: ${JSON.stringify(prevAvatars?.avatars?.[0] || {}).substring(0, 600)}
ANGULOS TOP 5: ${prevSales?.salesAngles?.slice(0, 5).map((a: any) => `- ${a.hookExample}`).join("\n") || "N/A"}
CREATIVOS DISPONIBLES: ${prev.video_creatives?.creatives?.length || 0} creativos generados
LANDING PRINCIPAL: ${prev.landing_pages?.landing_pages?.[0]?.sections?.[0]?.headline || "N/A"}
MERCADO: ${targetMarket}

BENCHMARKS:
(La investigacion web de Perplexity esta integrada en este prompt)

INSTRUCCIONES CRITICAS:
- Estructura por temperatura: 20-30% frio, 40-50% tibio, 30-40% caliente
- Meta ads: minimo 3 campanas (awareness, consideration, conversion)
- TikTok ads: incluir Spark Ads para usar contenido organico ganador
- Presupuestos en USD/dia, considerar minimos LATAM (Meta $10/dia, TikTok $20/dia)
- Cada creativo referenciado a uno de los video_creatives generados
- Incluir testing plan, kill criteria, scaling criteria
- benchmarks_latam con CPM, CTR, CPA, ROAS reales del sector
- monthly_execution_calendar con foco semanal por mes
- common_mistakes_to_avoid especificos a LATAM`,

    email_marketing: `Genera la ESTRATEGIA COMPLETA DE EMAIL MARKETING con secuencias listas.

${baseContext}

PUV: ${prev.puv_transformation?.puv?.statement || "N/A"}
LEAD MAGNET: ${prev.lead_magnets?.leadMagnets?.[0]?.name || "N/A"} - ${prev.lead_magnets?.leadMagnets?.[0]?.promise || ""}
OBJECIONES: ${prevPains?.objections?.slice(0, 5).map((o: any) => `- ${o.objection}`).join("\n") || "N/A"}
AVATAR: ${JSON.stringify(prevAvatars?.avatars?.[0] || {}).substring(0, 600)}
PRECIO: A definir (consultar baseContext)
MERCADO: ${targetMarket}

INSTRUCCIONES CRITICAS:
- welcome_sequence: 7 emails LISTOS PARA COPIAR Y PEGAR (no plantillas vacias)
- Cada email: subject (30-50 chars), preview_text, body completo (150-300 palabras)
- Tono: persona escribiendole a otra persona, NUNCA corporativo
- Parrafos maximo 3 lineas (se lee en movil)
- 1 solo CTA por email
- launch_sequence con pre-launch (5 emails) y launch (3 emails)
- reactivation_sequence: 3 emails para lista fria (60+ dias sin abrir)
- platform_recommendation: ActiveCampaign, Mailchimp, Klaviyo o Brevo segun caso
- best_practices_latam: dias, horarios, palabras a evitar y que funcionan
- KPIs target reales (open >25%, click >3%)`,

    pricing_strategy: `Genera la ESTRATEGIA COMPLETA DE PRECIOS para este producto/servicio.

${baseContext}

PUV: ${prev.puv_transformation?.puv?.statement || "N/A"}
COMPETIDORES: ${prevCompetitors?.competitors?.slice(0, 5).map((c: any) => `- ${c.name}: ${c.price}`).join("\n") || "N/A"}
DOLORES CRITICOS: ${prevPains?.pains?.slice(0, 5).map((p: any) => `- ${p.pain} (impacto: ${p.impact})`).join("\n") || "N/A"}
LEAD MAGNETS: ${JSON.stringify(prev.lead_magnets?.leadMagnets?.slice(0, 2) || []).substring(0, 400)}
MERCADO: ${targetMarket}

BENCHMARKS:
(La investigacion web de Perplexity esta integrada en este prompt)

INSTRUCCIONES CRITICAS:
- recommended_price_usd basado en analisis competitivo y posicionamiento
- price_in_local_currency con conversion + precio psicologico ($497 vs $500)
- Mostrar costo del PROBLEMA antes del precio (anclaje Hormozi)
- value_ladder_complete: free, entry, core, premium, continuity (todos los peldanos)
- payment_plans: planes de cuotas SIEMPRE en LATAM (Wompi, PayU, MercadoPago)
- discount_policy: cuando si y cuando no descontar (la urgencia falsa destruye confianza)
- revenue_projections con 3 escenarios (conservador, realista, optimista) + assumptions`,

    kpis_dashboard: `Genera el DASHBOARD COMPLETO DE KPIs para esta estrategia 360.

${baseContext}

CANALES ACTIVOS: Organico (parrilla generada), Paid (Meta+TikTok), Email, WhatsApp, Landing
PRESUPUESTO PAID: ${prev.paid_ads?.paid_ads_strategy?.budget_recommendation?.minimum_usd_monthly || 0} USD/mes minimo
PRECIO: ${prev.pricing_strategy?.pricing_strategy?.price_analysis?.recommended_price_usd || 0} USD
MERCADO: ${targetMarket}

INSTRUCCIONES CRITICAS:
- north_star_metric: LA metrica unica que define el exito (ej: clientes mensuales recurrentes)
- aarrr_metrics: completo (Acquisition, Activation, Retention, Revenue, Referral) con formula y target
- channel_kpis para cada canal con metricas, frecuencia de revision y herramientas LATAM
- decision_triggers: condiciones if/then accionables (ej: "Si CTR<1% por 3 dias → cambiar hook")
- weekly y monthly review_checklist con acciones especificas
- tools_stack con herramientas reales (GA4, Hotjar, Microsoft Clarity, Make, Zapier, etc) y costos
- red_flags con sintomas, diagnostico y accion inmediata`,

    seo_strategy: `Genera la ESTRATEGIA COMPLETA DE SEO Y CONTENIDO LARGO.

${baseContext}

AVATAR: ${JSON.stringify(prevAvatars?.avatars?.[0] || {}).substring(0, 600)}
COMPETIDORES: ${prevCompetitors?.competitors?.slice(0, 5).map((c: any) => `- ${c.name} (${c.website || "sin web"})`).join("\n") || "N/A"}
PARRILLA TEMAS: ${JSON.stringify(prev.content_calendar?.weeklyThemes?.slice(0, 2) || []).substring(0, 300)}
MERCADO: ${targetMarket}

DATOS SEO:
(La investigacion web de Perplexity esta integrada en este prompt)

INSTRUCCIONES CRITICAS:
- primary_keywords: 8-12 keywords con search_intent, volumen estimado, dificultad
- long_tail_keywords: 6-10 con menor competencia y alta intencion
- question_keywords: preguntas exactas que hace el avatar (Google + YouTube + TikTok)
- blog_strategy: 3-5 pillar articles + cluster topics (topic clusters)
- youtube_strategy: 10 primeros videos con titulos optimizados
- local_seo si aplica al negocio
- timeline realista: trafico organico tarda 3-6 meses minimo`,

    partnerships: `Genera la ESTRATEGIA COMPLETA DE ALIANZAS Y COLABORACIONES.

${baseContext}

PUV: ${prev.puv_transformation?.puv?.statement || "N/A"}
AVATAR: ${JSON.stringify(prevAvatars?.avatars?.[0] || {}).substring(0, 600)}
PRECIO: A definir (consultar baseContext)
DIFERENCIADORES: ${JSON.stringify(prev.differentiation?.differentiation?.positioningOpportunities?.slice(0, 3) || []).substring(0, 400)}
MERCADO: ${targetMarket}

POTENCIALES ALIADOS:
(La investigacion web de Perplexity esta integrada en este prompt)

INSTRUCCIONES CRITICAS:
- affiliate_program: si conviene crearlo, comision (15-30% tipico LATAM), cookie 30-60 dias
- influencer_marketing: tier nano (1K-10K) y micro (10K-100K) con compensacion realista
- ideal_influencer_profile especifico al avatar y mercado
- co_marketing: 3-5 partners IDEALES (no competidores, mismo avatar) con idea concreta de colaboracion
- community_partnerships: comunidades existentes (FB groups, Telegram, Discord) donde esta el avatar
- pr_strategy: medios, podcasts, newsletters reales del nicho
- outreach_template: mensaje listo para copiar y enviar`,

    community_strategy: `Genera la ESTRATEGIA COMPLETA DE COMUNIDAD para este negocio.

${baseContext}

AVATAR: ${JSON.stringify(prevAvatars?.avatars?.[0] || {}).substring(0, 600)}
DOLORES PROFUNDOS: ${prevPains?.pains?.slice(0, 5).map((p: any) => `- ${p.pain}`).join("\n") || "N/A"}
LEAD MAGNETS: ${JSON.stringify(prev.lead_magnets?.leadMagnets?.slice(0, 2) || []).substring(0, 400)}
MERCADO: ${targetMarket}

BENCHMARKS:
(La investigacion web de Perplexity esta integrada en este prompt)

INSTRUCCIONES CRITICAS:
- community_concept: nombre + tagline + plataforma adecuada al avatar (WhatsApp para LATAM low-tech, Discord/Skool para tech-savvy)
- onboarding_flow: que ve el nuevo miembro, cuando siente el aha_moment (max 7 dias)
- content_calendar_community: 7 dias con que postear cada dia
- engagement_mechanics: rituales diarios, eventos semanales y mensuales
- monetization clara: si gratis, como genera ingresos; si paga, que justifica
- growth_strategy con plan de los primeros 100 miembros
- moderation_rules para evitar problemas comunes (spam, trolls)
- metrics: que medir y target realista`,
  };

  return prompts[stepId] || "";
}

// ── Read current DB column value before writing ────────────────────────────
async function readColumnFromDB(
  sb: any,
  productId: string,
  column: string,
): Promise<any> {
  try {
    const { data, error } = await sb
      .from("products")
      .select(column)
      .eq("id", productId)
      .single();
    if (error || !data) return null;
    let val = data[column];
    if (typeof val === "string") {
      try { val = JSON.parse(val); } catch { val = {}; }
    }
    return val || {};
  } catch {
    return null;
  }
}

// ── Reconstruct previous step results from DB (for resume) ────────────────
async function reconstructPrevResults(
  sb: any,
  prodId: string,
): Promise<{
  stepResults: Record<string, any>;
  marketResearch: any;
  competitorAnalysis: any;
  salesAnglesData: any;
}> {
  const { data: p, error } = await sb
    .from("products")
    .select(
      "market_research, competitor_analysis, avatar_profiles, sales_angles_data, content_strategy, content_calendar, launch_strategy",
    )
    .eq("id", prodId)
    .single();

  if (error || !p) {
    return { stepResults: {}, marketResearch: {}, competitorAnalysis: {}, salesAnglesData: {} };
  }

  const stepResults: Record<string, any> = {};
  const rawMr = p.market_research;
  const mr = (typeof rawMr === "string" ? (() => { try { return JSON.parse(rawMr); } catch { return {}; } })() : rawMr) || {};
  const ca = p.competitor_analysis || {};
  const ap = p.avatar_profiles || {};
  const sa = p.sales_angles_data || {};
  const cs = p.content_strategy || {};

  // Helper: considerar "completo" solo si hay contenido real (no array vacío ni objeto vacío)
  const hasData = (v: any): boolean => {
    if (v === null || v === undefined) return false;
    if (Array.isArray(v)) return v.length > 0;
    if (typeof v === "object") return Object.keys(v).length > 0;
    return Boolean(v);
  };

  if (hasData(mr.market_overview)) stepResults.market_overview = { market_overview: mr.market_overview };
  if (hasData(mr.jtbd)) {
    stepResults.jtbd = { jtbd: mr.jtbd };
    if (hasData(mr.jtbd.pains)) {
      stepResults.pains_desires = { pains: mr.jtbd.pains, desires: mr.jtbd.desires, objections: mr.jtbd.objections };
    }
  }
  if (hasData(ca.competitors)) stepResults.competitors = { competitors: ca.competitors };
  if (hasData(ap.profiles)) stepResults.avatars = { avatars: ap.profiles };
  if (hasData(ca.differentiation)) {
    stepResults.differentiation = {
      differentiation: ca.differentiation,
      castPlaybook: cs.castPlaybook || null,
      esferaInsights: cs.esferaInsights || {},
      executiveSummary: cs.executiveSummary || {},
    };
  }
  if (hasData(sa.angles)) stepResults.sales_angles = { salesAngles: sa.angles };
  if (hasData(sa.puv)) stepResults.puv_transformation = { puv: sa.puv, transformation: sa.transformation };
  if (hasData(sa.leadMagnets)) stepResults.lead_magnets = { leadMagnets: sa.leadMagnets };
  if (hasData(sa.videoCreatives)) stepResults.video_creatives = { creatives: sa.videoCreatives };
  if (hasData(p.content_calendar?.calendar)) stepResults.content_calendar = p.content_calendar;
  if (hasData(p.launch_strategy?.preLaunch)) stepResults.launch_strategy = p.launch_strategy;
  if (hasData(sa.landingPages)) stepResults.landing_pages = { landing_pages: sa.landingPages };
  if (hasData(sa.whatsappFunnels)) stepResults.whatsapp_funnel = { whatsapp_funnels: sa.whatsappFunnels };
  if (hasData(sa.paidAds)) stepResults.paid_ads = { paid_ads_strategy: sa.paidAds };
  if (hasData(sa.emailMarketing)) stepResults.email_marketing = { email_strategy: sa.emailMarketing };
  if (hasData(sa.pricingStrategy)) stepResults.pricing_strategy = { pricing_strategy: sa.pricingStrategy };
  if (hasData(sa.kpisDashboard)) stepResults.kpis_dashboard = { kpis_dashboard: sa.kpisDashboard };
  if (hasData(sa.seoStrategy)) stepResults.seo_strategy = { seo_strategy: sa.seoStrategy };
  if (hasData(sa.partnerships)) stepResults.partnerships = { partnerships_strategy: sa.partnerships };
  if (hasData(sa.communityStrategy)) stepResults.community_strategy = { community_strategy: sa.communityStrategy };

  return { stepResults, marketResearch: mr, competitorAnalysis: ca, salesAnglesData: sa };
}

// ── Run a single AI step with skills-enhanced system prompt ────────────────
async function runStep(
  stepId: string,
  baseContext: string,
  targetMarket: string,
  prevResults: Record<string, any>,
  deepResearchMode: boolean = false,
  firecrawlBudget?: FirecrawlBudget,
): Promise<{ stepId: string; result: any; debugResponses?: any[] }> {
  console.log(`[full-research] Running step: ${stepId}`);

  // Build skills-enhanced system prompt usando KIRO master + research-mode builder
  const skillIds = STEP_SKILLS[stepId] || [];
  const skills = skillIds
    .map(id => getSkillById(id))
    .filter(Boolean) as Skill[];

  const systemPrompt = skills.length > 0
    ? buildCombinedSystemPromptForResearch(skills, KIRO_MASTER_PROMPT)
    : KIRO_MASTER_PROMPT;

  console.log(`[full-research] Step ${stepId} | skills=[${skillIds.join(", ") || "none"}] | systemPrompt=${systemPrompt.length} chars`);

  const basePrompt = getStepPrompt(stepId, baseContext, targetMarket, prevResults);
  const schema = SCHEMAS[stepId];
  const maxTokens = TOKEN_MAP[stepId] || 6000;

  // CRÍTICO: Forzar el schema EXACTO al final del prompt para evitar que la IA
  // use keys traducidas al español (e.g. "amenazas" en vez de "threats").
  const schemaInstruction = schema
    ? `\n\n---\n## ⚠️ ESTRUCTURA JSON OBLIGATORIA

Debes responder con un JSON que cumpla EXACTAMENTE este schema. Las keys deben estar en INGLÉS/camelCase como se especifica abajo. NO traduzcas las keys al español.

\`\`\`json
${JSON.stringify(schema, null, 2)}
\`\`\`

Reglas:
- Usa las keys EXACTAS del schema (en inglés/camelCase)
- El contenido (valores) sí debe estar en español
- Cumple los minItems/maxItems indicados
- Cumple los enums indicados`
    : "";

  const prompt = basePrompt + schemaInstruction;

  // Build per-tab Perplexity query (V2) con contexto rico del producto
  // CRITICO: extraer brief del baseContext para que Perplexity no confunda nombres ambiguos
  const productName = extractProductName(baseContext);
  const productBrief = extractProductBrief(baseContext);
  const perplexityQuery = buildPerplexityQuery(stepId, productName, targetMarket, productBrief);

  try {
    const result = await callAI(systemPrompt, prompt, schema, stepId, maxTokens, stepId, perplexityQuery, deepResearchMode, firecrawlBudget);
    console.log(`[full-research] Step ${stepId} OK${deepResearchMode ? " [DEEP RESEARCH]" : ""}${firecrawlBudget ? ` [budget=${firecrawlBudget.remaining}]` : ""}`);
    return { stepId, result };
  } catch (err: any) {
    console.error(`[full-research] Step ${stepId} AI failed:`, err.message);
    return { stepId, result: null, debugResponses: err?.debugResponses || [] };
  }
}

// ── Finalize: mark product as complete ────────────────────────────────────
async function finalizeProduct(
  supabase: any,
  productId: string,
  product: any,
  productDnaId: any,
  clientDna: any,
): Promise<void> {
  const briefData = {
    ...(product.brief_data || {}),
    product_dna_id: productDnaId,
    client_dna_id: clientDna?.id || null,
    research_source: "adn_recargado",
    research_version: 3,
  };

  await supabase.from("products").update({
    research_generated_at: new Date().toISOString(),
    research_progress: { step: 21, total: 21, label: "Completado", done: true },
    brief_status: "completed",
    brief_completed_at: new Date().toISOString(),
    brief_data: briefData,
  }).eq("id", productId);

  console.log(`[full-research] All 12 steps complete for product ${productId}`);
}

// ── Chain to next phase via self-invocation ────────────────────────────────
async function chainToNextPhase(
  supabase: any,
  supabaseUrl: string,
  supabaseKey: string,
  body: any,
  productId: string,
  product: any,
  productDnaId: any,
  clientDna: any,
  currentPhase: number,
  stepResults: Record<string, any>,
): Promise<void> {
  const nextPhase = currentPhase + 1;

  if (nextPhase >= TOTAL_PHASES) {
    await finalizeProduct(supabase, productId, product, productDnaId, clientDna);
    return;
  }

  fetch(`${supabaseUrl}/functions/v1/generate-full-research`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${supabaseKey}`,
    },
    body: JSON.stringify({
      product_id: productId,
      phase: nextPhase,
      user_id: body.user_id,
      organization_id: body.organization_id,
      is_client_user: body.is_client_user,
      include_client_dna: body.include_client_dna,
      with_scraping_intelligence: body.with_scraping_intelligence === true,
      // Propagar budget de Firecrawl entre phases (se decrementa cada vez que se scrapea)
      firecrawl_budget_remaining: typeof body.firecrawl_budget_remaining === "number" ? body.firecrawl_budget_remaining : 8,
      firecrawl_scraped_urls: Array.isArray(body.firecrawl_scraped_urls) ? body.firecrawl_scraped_urls : [],
      _internal: true,
    }),
  })
    .then(res => {
      console.log(`[full-research] Phase ${nextPhase} (${STEP_SEQUENCE[nextPhase]}) triggered, HTTP ${res.status} | firecrawl_budget=${body.firecrawl_budget_remaining ?? 8}`);
    })
    .catch((err: any) => {
      console.error(`[full-research] Self-invoke phase ${nextPhase} failed:`, err.message);
      supabase.from("products").update({
        research_progress: {
          step: nextPhase,
          total: 21,
          label: `Error al continuar (${getStepName(STEP_SEQUENCE[nextPhase])})`,
          error: true,
        },
      }).eq("id", productId).then(() => {});
    });

  await new Promise(r => setTimeout(r, 400));
  console.log(`[full-research] Phase ${currentPhase} (${STEP_SEQUENCE[currentPhase]}) done. Chaining to ${nextPhase}.`);
}

// ── PROCESSING LOGIC ──────────────────────────────────────────────────────────
async function processRequest(body: any): Promise<void> {
  let productId: string | null = null;

  try {
    productId = body.product_id;
    const userId: string | null = body.user_id || null;
    const organizationId: string | null = body.organization_id || null;
    const isClientUser: boolean = body.is_client_user || false;
    const includeClientDna: boolean = body.include_client_dna !== false;
    const forceRegenerate: boolean = body.force_regenerate === true;
    // Upgrade opcional: Inteligencia Competitiva Real (Perplexity Deep Research)
    // Cuando true: queries más largas, más resultados, max_tokens 2x en Perplexity
    const withScrapingIntelligence: boolean = body.with_scraping_intelligence === true;
    const phase: number = body.phase ?? 0;

    const stepId = STEP_SEQUENCE[phase];
    console.log(`[full-research] Product ${productId} — phase ${phase}/${TOTAL_PHASES} (${stepId || "finalize"}), forceRegenerate=${forceRegenerate}, withIntel=${withScrapingIntelligence}`);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(`\n${"=".repeat(60)}`);
    console.log(`[PHASE ${phase}] ${stepId || "finalize"} | product=${productId?.substring(0, 8)} | force=${forceRegenerate}`);
    console.log(`${"=".repeat(60)}`);

    // ── Deduplication lock: prevents double-click race conditions ─────
    // Only needed at phase 0 force-regenerate (fresh start).
    // Optimistic lock: last writer wins. The first writer sees a different
    // lockId after the 600ms settle window and exits gracefully.
    if (forceRegenerate && phase === 0) {
      const lockId = crypto.randomUUID();
      await supabase.from("products").update({
        research_progress: { step: 0, total: 21, label: "Iniciando...", lockId },
      }).eq("id", productId);
      await new Promise(r => setTimeout(r, 600));
      const { data: lockCheck } = await supabase
        .from("products")
        .select("research_progress")
        .eq("id", productId)
        .single();
      if (lockCheck?.research_progress?.lockId !== lockId) {
        console.log(`[full-research] Duplicate invocation detected for ${productId} — exiting`);
        return;
      }
      console.log(`[full-research] Lock acquired (${lockId.substring(0, 8)}) for ${productId}`);
    }

    // ── Pre-reconstruct previous results ─────────────────────────────
    let stepResults: Record<string, any> = {};
    let marketResearch: any = {};
    let competitorAnalysis: any = {};
    let salesAnglesData: any = {};

    if (!forceRegenerate) {
      const restored = await reconstructPrevResults(supabase, productId);
      stepResults = restored.stepResults;
      marketResearch = restored.marketResearch;
      competitorAnalysis = restored.competitorAnalysis;
      salesAnglesData = restored.salesAnglesData;
      const restoredCount = Object.keys(stepResults).length;
      console.log(`[step 1/6] Reconstruct: ${restoredCount} steps loaded — [${Object.keys(stepResults).join(", ") || "none"}]`);
    } else {
      console.log(`[step 1/6] Reconstruct: skipped (force_regenerate)`);
    }

    const isFreshStart = forceRegenerate || Object.keys(stepResults).length === 0;
    console.log(`[step 1/6] isFreshStart=${isFreshStart}`);

    // ── Token consumption (phase 0, fresh start only) ────────────────
    if (phase === 0 && isFreshStart && (userId || organizationId)) {
      // Costo dinamico segun upgrade activo:
      // - Base ADN 360: 1500 tokens (21 pasos CONVERT)
      // - + Inteligencia Competitiva Real: +2000 tokens (Perplexity Deep Research, 3500 total)
      const TOKEN_COST = withScrapingIntelligence ? 3500 : 1500;
      console.log(`[step 2/6] Tokens: consuming ${TOKEN_COST} — user=${userId?.substring(0,8)} org=${organizationId?.substring(0,8)}`);

      const { data: tokenResult, error: tokenError } = await supabase.rpc("consume_ai_tokens", {
        p_user_id: isClientUser ? userId : null,
        p_org_id: isClientUser ? null : organizationId,
        p_action_type: "research.full",
        p_tokens: TOKEN_COST,
        p_metadata: { product_id: productId },
      });

      if (tokenError || !tokenResult?.success) {
        const reason = tokenError?.message || tokenResult?.error || "insufficient_tokens";
        console.warn(`[full-research] Token consumption failed: ${reason}`);
        await supabase.from("products").update({
          research_progress: { step: 0, total: 21, label: "Tokens insuficientes", error: true },
        }).eq("id", productId);
        return;
      }
      console.log(`[step 2/6] Tokens: consumed OK`);
    } else if (phase === 0 && !isFreshStart) {
      console.log(`[step 2/6] Tokens: skipped (resume)`);
    } else {
      console.log(`[step 2/6] Tokens: skipped (phase=${phase})`);
    }

    // ── Fetch product + DNAs ──────────────────────────────────────────
    console.log(`[step 3/6] Loading product + DNAs...`);
    const { data: product, error: productErr } = await supabase
      .from("products")
      .select("id, name, client_id, brief_data")
      .eq("id", productId)
      .single();
    if (productErr || !product) throw new Error(`Product not found: ${productErr?.message}`);

    const clientId = product.client_id;
    const productDnaId = (product.brief_data as any)?.product_dna_id;
    console.log(`[step 3/6] Product="${product.name}" | clientId=${clientId?.substring(0,8)} | productDnaId=${productDnaId?.substring(0,8) || "none"}`);

    let productDna: any = null;
    if (productDnaId) {
      const { data } = await supabase.from("product_dna").select("*").eq("id", productDnaId).maybeSingle();
      productDna = data;
      console.log(`[step 3/6] ProductDNA: ${productDna ? "loaded" : "NOT FOUND"}`);
    }

    let clientDna: any = null;
    if (includeClientDna) {
      // Estrategia 1: Lookup directo por client_id del producto
      if (clientId) {
        const { data } = await supabase
          .from("client_dna")
          .select("*")
          .eq("client_id", clientId)
          .eq("is_active", true)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        clientDna = data;
        console.log(`[step 3/6] ClientDNA via client_id: ${clientDna ? "✓ loaded" : "not found"} (client=${clientId?.substring(0,8)})`);
      }

      // Estrategia 2 (fallback): si product no tiene client_id, buscar por user_id del creador
      if (!clientDna && userId) {
        const { data: userClients } = await supabase
          .from("clients")
          .select("id")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(5);

        if (userClients && userClients.length > 0) {
          const ids = userClients.map((c: any) => c.id);
          const { data } = await supabase
            .from("client_dna")
            .select("*")
            .in("client_id", ids)
            .eq("is_active", true)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          clientDna = data;
          console.log(`[step 3/6] ClientDNA via user_id fallback: ${clientDna ? "✓ loaded" : "not found"} (user=${userId?.substring(0,8)}, ${userClients.length} clients checked)`);
        }
      }

      if (!clientDna) {
        console.log(`[step 3/6] ClientDNA: continuando sin ADN de marca (sólo Product DNA disponible)`);
      }
    }

    const baseContext = buildBaseContext(clientDna, productDna, product.name || "Producto");
    const targetMarket = getTargetMarket(clientDna, productDna);
    console.log(`[step 3/6] baseContext=${baseContext.length} chars | targetMarket="${targetMarket}"`);

    // ── Clear data on force regenerate ────────────────────────────────
    if (forceRegenerate && phase === 0) {
      console.log(`[step 4/6] Force clear: wiping all research columns`);
      await supabase.from("products").update({
        market_research: null,
        competitor_analysis: null,
        avatar_profiles: null,
        sales_angles_data: null,
        content_strategy: null,
        content_calendar: null,
        launch_strategy: null,
        research_generated_at: null,
        research_progress: { step: 0, total: 21, label: "Iniciando regeneracion..." },
      }).eq("id", productId);
    }

    // ── Smart phase jump on resume ─────────────────────────────────────
    if (phase === 0 && !isFreshStart) {
      const firstPending = STEP_SEQUENCE.findIndex(id => !stepResults[id]);
      if (firstPending > 0) {
        console.log(`[full-research] Smart resume: jumping to phase ${firstPending} (${STEP_SEQUENCE[firstPending]})`);
        fetch(`${supabaseUrl}/functions/v1/generate-full-research`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${supabaseKey}` },
          body: JSON.stringify({ ...body, phase: firstPending, _internal: true }),
        }).catch(() => {});
        await new Promise(r => setTimeout(r, 400));
        return;
      }
      if (firstPending === -1) {
        console.log(`[full-research] Smart resume: all steps complete — finalizing`);
        await finalizeProduct(supabase, productId, product, productDnaId, clientDna);
        return;
      }
      // firstPending === 0: phase 0 has pending steps, continue normally
    }

    // ── Finalize if all phases done ────────────────────────────────────
    if (phase >= TOTAL_PHASES) {
      await finalizeProduct(supabase, productId, product, productDnaId, clientDna);
      return;
    }

    // ── Skip step if already complete ─────────────────────────────────
    if (stepResults[stepId]) {
      console.log(`[full-research] Phase ${phase} (${stepId}) already complete — chaining to next`);
      await chainToNextPhase(supabase, supabaseUrl, supabaseKey, body, productId, product, productDnaId, clientDna, phase, stepResults);
      return;
    }

    // ── Update progress: starting this step ──────────────────────────
    await supabase.from("products").update({
      research_progress: { step: phase, total: 21, label: getStepName(stepId), stepId },
    }).eq("id", productId);

    console.log(`[step 5/6] Running AI: phase=${phase} step="${stepId}"`);
    const t0 = Date.now();

    // ── Run the step ──────────────────────────────────────────────────
    // Deep Research solo se activa en pasos donde aporta valor real (datos competitivos/precios/anuncios)
    const DEEP_RESEARCH_STEPS = new Set([
      "market_overview",
      "competitors",
      "pricing_strategy",
      "paid_ads",
      "sales_angles",
      "seo_strategy",
    ]);
    // Distribucion del budget de scraping (max 8 URLs por activacion):
    // 5 competidores top + 1 pricing + 1 ad library + 1 landing inspiracion = 8
    const FIRECRAWL_URLS_PER_STEP: Record<string, number> = {
      competitors: 5,
      pricing_strategy: 1,
      paid_ads: 1,
      landing_pages: 1,
    };
    const FIRECRAWL_TOTAL_BUDGET = 8;
    const useDeepResearch = withScrapingIntelligence && DEEP_RESEARCH_STEPS.has(stepId);
    const firecrawlBudget: FirecrawlBudget | undefined = withScrapingIntelligence
      ? {
          remaining: typeof body.firecrawl_budget_remaining === "number" ? body.firecrawl_budget_remaining : FIRECRAWL_TOTAL_BUDGET,
          maxForStep: FIRECRAWL_URLS_PER_STEP[stepId] ?? 0,
          scrapedUrls: Array.isArray(body.firecrawl_scraped_urls) ? body.firecrawl_scraped_urls : [],
        }
      : undefined;
    const { result, debugResponses } = await runStep(stepId, baseContext, targetMarket, stepResults, useDeepResearch, firecrawlBudget);
    // Mutated by callAI: persistir el nuevo budget en el body para el proximo chain
    if (firecrawlBudget) {
      body.firecrawl_budget_remaining = firecrawlBudget.remaining;
      body.firecrawl_scraped_urls = firecrawlBudget.scrapedUrls;
    }
    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);

    if (!result) {
      console.warn(`[step 5/6] FAILED: ${stepId} in ${elapsed}s — no result from any provider`);
      await supabase.from("products").update({
        research_progress: {
          step: phase,
          total: 21,
          label: `Error: ${getStepName(stepId)} fallo`,
          error: true,
          stepId,
          debug: debugResponses || [],
          elapsed_s: parseFloat(elapsed),
        },
      }).eq("id", productId);
      return;
    }

    console.log(`[step 5/6] SUCCESS: ${stepId} in ${elapsed}s`);
    stepResults[stepId] = result;

    // ── Save step result to DB ────────────────────────────────────────
    console.log(`[step 6/6] Saving ${stepId} to DB...`);
    const now = new Date().toISOString();
    const update: Record<string, any> = {
      updated_at: now,
      research_progress: {
        step: phase + 1,
        total: 21,
        label: getStepName(stepId),
        stepId,
      },
    };

    // Helper: la IA puede devolver el JSON envuelto {key: {...}} o plano {...}
    // Esta función intenta extraer el valor con fallback al objeto entero.
    const pick = (key: string) => result?.[key] !== undefined ? result[key] : result;

    switch (stepId) {
      case "market_overview": {
        const moData = pick("market_overview");
        marketResearch = { ...marketResearch, market_overview: moData, generatedAt: now };
        update.market_research = marketResearch;
        break;
      }

      case "jtbd": {
        const jtbdData = pick("jtbd");
        marketResearch = { ...marketResearch, jtbd: jtbdData, generatedAt: now };
        update.market_research = marketResearch;
        update.ideal_avatar = JSON.stringify({ jtbd: jtbdData, summary: jtbdData?.functional });
        break;
      }

      case "pains_desires": {
        // pains_desires devuelve {pains, desires, objections} en root
        const pdData = result.pains ? result : (result.pains_desires || result);
        marketResearch = { ...marketResearch, jtbd: { ...(marketResearch.jtbd || {}), ...pdData }, generatedAt: now };
        update.market_research = marketResearch;
        break;
      }

      case "competitors": {
        const compsData = pick("competitors");
        const compsList = Array.isArray(compsData) ? compsData : (compsData?.competitors || []);
        // Validar URLs reales antes de guardar (HEAD requests + cleanup de handles)
        // Esto previene hallucination tipo "https://exito.com/producto-123456"
        try {
          const stats = await validateCompetitorUrls(compsList);
          console.log(`[full-research] URLs validadas: ${stats.valid}/${stats.checked} OK, ${stats.invalid} eliminadas, ${stats.cleaned} normalizadas`);
        } catch (err: any) {
          console.warn(`[full-research] Error validando URLs (continuando): ${err.message}`);
        }
        competitorAnalysis = { ...competitorAnalysis, competitors: compsList, generatedAt: now };
        update.competitor_analysis = competitorAnalysis;
        break;
      }

      case "avatars": {
        const avatarsData = pick("avatars");
        const avatarsList = Array.isArray(avatarsData) ? avatarsData : (avatarsData?.avatars || []);
        update.avatar_profiles = { profiles: avatarsList, generatedAt: now };
        break;
      }

      case "differentiation": {
        const diffData = result.differentiation || result;
        competitorAnalysis = { ...competitorAnalysis, differentiation: diffData, generatedAt: now };
        update.competitor_analysis = competitorAnalysis;
        update.content_strategy = {
          // Nuevo: castPlaybook (Metodo CAST de Alexander Cast). Mantenemos esferaInsights por compat con productos viejos.
          castPlaybook: result.castPlaybook || null,
          esferaInsights: result.esferaInsights || {},
          executiveSummary: result.executiveSummary || {},
          generatedAt: now,
        };
        break;
      }

      case "sales_angles": {
        const anglesData = result.salesAngles || result.sales_angles || result;
        const anglesList = Array.isArray(anglesData) ? anglesData : (anglesData?.salesAngles || anglesData?.sales_angles || []);
        salesAnglesData = { ...salesAnglesData, angles: anglesList, generatedAt: now };
        update.sales_angles_data = salesAnglesData;
        update.sales_angles = anglesList
          .map((a: any) => a.hookExample || a.angle?.substring?.(0, 80))
          .filter(Boolean)
          .slice(0, 20);
        break;
      }

      case "puv_transformation": {
        const puv = result.puv || result;
        const transformation = result.transformation;
        salesAnglesData = { ...salesAnglesData, puv, transformation, generatedAt: now };
        update.sales_angles_data = salesAnglesData;
        break;
      }

      case "lead_magnets": {
        const lmData = result.leadMagnets || result.lead_magnets || result;
        const lmList = Array.isArray(lmData) ? lmData : (lmData?.leadMagnets || []);
        salesAnglesData = { ...salesAnglesData, leadMagnets: lmList, generatedAt: now };
        update.sales_angles_data = salesAnglesData;
        break;
      }

      case "video_creatives": {
        const creData = result.creatives || result.video_creatives || result;
        const creList = Array.isArray(creData) ? creData : (creData?.creatives || []);
        salesAnglesData = { ...salesAnglesData, videoCreatives: creList, generatedAt: now };
        update.sales_angles_data = salesAnglesData;
        break;
      }

      case "content_calendar":
        update.content_calendar = { ...result, generatedAt: now };
        break;

      case "launch_strategy":
        update.launch_strategy = { ...result, generatedAt: now };
        break;

      case "landing_pages": {
        // Guardado en sales_angles_data para no requerir migracion
        const lpData = result.landing_pages || result;
        const lpList = Array.isArray(lpData) ? lpData : (lpData?.landing_pages || []);
        salesAnglesData = {
          ...salesAnglesData,
          landingPages: lpList,
          landingPagesAbTesting: result.ab_testing_plan || {},
          landingPagesTechStack: result.tech_stack_recommendation || {},
          generatedAt: now,
        };
        update.sales_angles_data = salesAnglesData;
        break;
      }

      case "whatsapp_funnel": {
        const wfData = result.whatsapp_funnels || result;
        const wfList = Array.isArray(wfData) ? wfData : (wfData?.whatsapp_funnels || []);
        salesAnglesData = {
          ...salesAnglesData,
          whatsappFunnels: wfList,
          whatsappSetup: result.whatsap_setup || result.whatsapp_setup || {},
          whatsappBenchmarks: result.performance_benchmarks || {},
          generatedAt: now,
        };
        update.sales_angles_data = salesAnglesData;
        break;
      }

      // ── Tabs 360 (todas a sales_angles_data sin migracion) ──────────────
      case "paid_ads": {
        salesAnglesData = { ...salesAnglesData, paidAds: result.paid_ads_strategy || result, generatedAt: now };
        update.sales_angles_data = salesAnglesData;
        break;
      }
      case "email_marketing": {
        salesAnglesData = { ...salesAnglesData, emailMarketing: result.email_strategy || result, generatedAt: now };
        update.sales_angles_data = salesAnglesData;
        break;
      }
      case "pricing_strategy": {
        salesAnglesData = { ...salesAnglesData, pricingStrategy: result.pricing_strategy || result, generatedAt: now };
        update.sales_angles_data = salesAnglesData;
        break;
      }
      case "kpis_dashboard": {
        salesAnglesData = { ...salesAnglesData, kpisDashboard: result.kpis_dashboard || result, generatedAt: now };
        update.sales_angles_data = salesAnglesData;
        break;
      }
      case "seo_strategy": {
        salesAnglesData = { ...salesAnglesData, seoStrategy: result.seo_strategy || result, generatedAt: now };
        update.sales_angles_data = salesAnglesData;
        break;
      }
      case "partnerships": {
        salesAnglesData = { ...salesAnglesData, partnerships: result.partnerships_strategy || result, generatedAt: now };
        update.sales_angles_data = salesAnglesData;
        break;
      }
      case "community_strategy": {
        salesAnglesData = { ...salesAnglesData, communityStrategy: result.community_strategy || result, generatedAt: now };
        update.sales_angles_data = salesAnglesData;
        break;
      }
    }

    const { error: updateErr } = await supabase.from("products").update(update).eq("id", productId);
    if (updateErr) {
      console.error(`[step 6/6] Save ERROR for ${stepId}: ${updateErr.message}`);
    } else {
      console.log(`[step 6/6] Saved OK → chaining to phase ${phase + 1}`);
    }

    // ── Chain to next phase ───────────────────────────────────────────
    await chainToNextPhase(supabase, supabaseUrl, supabaseKey, body, productId, product, productDnaId, clientDna, phase, stepResults);

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error procesando solicitud";
    console.error("[full-research] Error:", message);
    if (productId) {
      try {
        const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
        await sb.from("products").update({
          research_progress: { step: 0, total: 21, label: `Error: ${message.substring(0, 100)}`, error: true },
        }).eq("id", productId);
      } catch { /* best-effort */ }
    }
  }
}

// ── HTTP HANDLER ──────────────────────────────────────────────────────────────
// External calls (from frontend) fire-and-forget a self-invocation with _internal:true
// and return 202 immediately. Internal calls run processRequest synchronously.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const body = await req.json();

  if (!body?.product_id) {
    return new Response(
      JSON.stringify({ success: false, error: "product_id is required" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // Internal call: run processRequest synchronously and return when done
  if (body._internal === true) {
    await processRequest(body);
    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // External call: fire-and-forget an internal self-invocation, return 202 immediately
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  fetch(`${supabaseUrl}/functions/v1/generate-full-research`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${supabaseKey}`,
    },
    body: JSON.stringify({ ...body, phase: body.phase ?? 0, _internal: true }),
  }).catch(() => {});

  return new Response(
    JSON.stringify({ success: true, status: "processing" }),
    { status: 202, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
