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

/** `EdgeRuntime.waitUntil` lo expone el runtime de Supabase; no está en los
 *  tipos de Deno. Retiene el disparo de la fase siguiente para que el runtime
 *  no lo cancele al devolver la respuesta. */
declare const EdgeRuntime: { waitUntil?: (p: Promise<unknown>) => void } | undefined;
import type { Skill, SkillType } from "../_shared/skills/types.ts";
import {
  batchScrape,
  extractUrlsFromText,
  formatScrapeContextForLLM,
} from "../_shared/firecrawl-client.ts";
import { validateCompetitorUrls } from "../_shared/url-validator.ts";
import { getPrompt } from "../_shared/prompts/db-prompts.ts";
import { KIRO_MASTER_PROMPT as KIRO_MASTER_PROMPT_FALLBACK } from "../_shared/prompts/research.ts";
import { assertOrgMembership } from "../_shared/assertOrgMembership.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ── Research Unificado: 9 pasos + la parrilla partida en 4 ─────────────────
// Ver docs/RESEARCH_UNIFICADO.md. Los 10 pasos de consultoría de negocio
// (lanzamiento, landings, WhatsApp, ads, email, precios, KPIs de negocio, SEO,
// alianzas, comunidad) salieron del flujo el 2026-08-13 y viven archivados en
// _shared/prompts/_archivo/. La evidencia de mercado ya no se investiga aquí:
// la trae `research-engine` con datos scrapeados de verdad.
const RESEARCH_STEPS = [
  { id: "market_overview", name: "Como compra tu cliente" },
  { id: "jtbd", name: "Que busca de verdad" },
  { id: "pains_desires", name: "Dolores y Deseos" },
  { id: "competitors", name: "Tu competencia" },
  { id: "avatars", name: "Avatares de Cliente" },
  { id: "differentiation", name: "Diferenciacion y huecos" },
  { id: "sales_angles", name: "Angulos de Venta" },
  { id: "puv_transformation", name: "PUV y Transformacion" },
  { id: "lead_magnets", name: "Lead Magnets" },
  { id: "video_creatives_a", name: "Ideas de Contenido (1 de 2)" },
  { id: "video_creatives_b", name: "Ideas de Contenido (2 de 2)" },
  { id: "content_calendar_w1", name: "Parrilla — semana 1" },
  { id: "content_calendar_w2", name: "Parrilla — semana 2" },
  { id: "content_calendar_w3", name: "Parrilla — semana 3" },
  { id: "content_calendar_w4", name: "Parrilla — semana 4" },
  { id: "content_kpis", name: "Que medir de tu contenido" },
];

/** Las cuatro sub-invocaciones que arman la parrilla de 4 semanas. */
const SEMANAS_PARRILLA = [
  "content_calendar_w1",
  "content_calendar_w2",
  "content_calendar_w3",
  "content_calendar_w4",
] as const;

// ── Step sequence: 1 phase = 1 step = 1 invocation ──────────────────────
// Cada paso es una edge function entera para él (~20-40 s), encadenada por
// self-invocation. La parrilla se parte en 4 porque en un solo paso pedía
// 24.000 tokens y no salían en los ~120 s que le deja la función: el JSON
// llegaba cortado y se perdía la fase entera.
const STEP_SEQUENCE: string[] = [
  "market_overview",     // Fase 0  — cómo compra (slim, único con Perplexity)
  "jtbd",                // Fase 1  — análisis
  "pains_desires",       // Fase 2  — análisis
  "competitors",         // Fase 3  — SINTETIZA lo scrapeado (ya no investiga)
  "avatars",             // Fase 4  — generación
  "differentiation",     // Fase 5  — síntesis + gaps
  "sales_angles",        // Fase 6  — creativo (hook_source obligatorio)
  "puv_transformation",  // Fase 7  — creativo
  "lead_magnets",        // Fase 8  — creativo
  "video_creatives_a",   // Fase 9  — creativo (partido en dos: ver TOKEN_MAP)
  "video_creatives_b",   // Fase 10
  "content_calendar_w1", // Fase 10 — parrilla, semana a semana
  "content_calendar_w2", // Fase 11
  "content_calendar_w3", // Fase 12
  "content_calendar_w4", // Fase 13
  "content_kpis",        // Fase 14 — herencia ligera de kpis_dashboard
];
const TOTAL_PHASES = STEP_SEQUENCE.length; // 16

// Steps that use web search (Perplexity as first provider)
// Solo este paso sigue usando búsqueda web. `competitors` ya no investiga:
// sintetiza los competidores REALES que scrapeó research-engine.
const RESEARCH_STEPS_SET = new Set(["market_overview"]);

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
  competitors:         [],  // síntesis de datos scrapeados — sin skills
  avatars:             ["consciousness_mapper", "avatar_mirrorer", "neuro_persuader", "cultural_adapter"],
  differentiation:     ["consciousness_mapper", "storybrand_architect", "neuro_persuader", "hooks_specialist", "copy_sharpener"],
  sales_angles:        ["consciousness_mapper", "storybrand_architect", "hooks_specialist", "social_funnel_builder", "cta_specialist", "objection_crusher"],
  puv_transformation:  ["storybrand_architect", "copy_sharpener", "neuro_persuader", "storytelling_specialist"],
  lead_magnets:        ["offer_engineer", "hooks_specialist", "cta_specialist", "copy_sharpener"],
  video_creatives_a:   ["consciousness_mapper", "hooks_specialist", "storytelling_specialist", "production_director", "social_funnel_builder", "virality_optimizer"],
  video_creatives_b:   ["consciousness_mapper", "hooks_specialist", "storytelling_specialist", "production_director", "social_funnel_builder", "virality_optimizer"],
  // Las cuatro semanas de la parrilla comparten skills: es el mismo trabajo
  // repartido, no cuatro trabajos distintos.
  content_kpis:        [],  // analisis puro
  content_calendar_w1: ["consciousness_mapper", "social_funnel_builder", "platform_optimizer", "virality_optimizer", "seo_discoverer", "hooks_specialist"],
  content_calendar_w2: ["consciousness_mapper", "social_funnel_builder", "platform_optimizer", "virality_optimizer", "seo_discoverer", "hooks_specialist"],
  content_calendar_w3: ["consciousness_mapper", "social_funnel_builder", "platform_optimizer", "virality_optimizer", "seo_discoverer", "hooks_specialist"],
  content_calendar_w4: ["consciousness_mapper", "social_funnel_builder", "platform_optimizer", "virality_optimizer", "seo_discoverer", "hooks_specialist"],
};

// ── Token limits per step ──────────────────────────────────────────────────
// NOTA: Gemini 2.5-flash usa "thinking tokens" internos que consumen budget.
// Margen de ~3000 tokens extras para evitar truncación.
// REGLA DURA del Research Unificado: ningún paso pide más de 9.000 tokens.
// El motivo es de tiempo, no de capacidad del modelo: la función vive ~150 s y
// a Mistral se le dan 120 s como mucho. Un paso de 24.000 tokens exigiría
// sostener ~200 tokens/s y el JSON llegaba cortado. Suma total: 80.000
// (antes eran 227.000 repartidos en 21 pasos).
const TOKEN_MAP: Record<string, number> = {
  market_overview: 4000,     // slim: solo cómo compra + nivel de conciencia
  jtbd: 4000,                // slim: 3 jobs en 1 párrafo + 6-8 insights
  pains_desires: 8000,       // 10 dolores + 10 deseos + 10 objeciones (oro para guiones)
  competitors: 5000,         // sintetiza lo scrapeado, ya no investiga
  avatars: 8000,             // 3-5 avatares
  differentiation: 5000,     // slim: diferenciación + gaps
  sales_angles: 9000,        // 20 ángulos con hook_source
  puv_transformation: 4000,
  lead_magnets: 4000,
  // Partido en dos (2026-08-13): con Gemini sin cuota, 12-15 ideas de una vez
  // no salían de Mistral dentro del wall-clock REAL de la función (~112 s, no
  // los 150 s que se suponían). Siete ideas por invocación sí caben.
  video_creatives_a: 3200,
  video_creatives_b: 3200,
  content_calendar_w1: 5500, // 7-9 posts por semana × 4 = la parrilla completa
  content_calendar_w2: 5500,
  content_calendar_w3: 5500,
  content_calendar_w4: 5500,
  content_kpis: 2000,        // bloque corto: 5-6 metricas con su disparador
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

    // Último recurso: si el JSON sigue roto (típico cuando el modelo mete una
    // comilla doble sin escapar en mitad de un texto), en vez de perder el
    // paso entero nos quedamos con los elementos del array que SÍ están
    // completos. 10 creativos buenos valen mucho más que cero.
    try {
      JSON.parse(s);
      return s;
    } catch {
      return rescatarArrayParcial(s) ?? s;
    }
  }
}

/**
 * Recorta un JSON roto hasta el último elemento COMPLETO del primer array que
 * encuentra y lo cierra. Devuelve null si no consigue nada parseable.
 */
function rescatarArrayParcial(s: string): string | null {
  const inicioArray = s.indexOf("[");
  if (inicioArray === -1) return null;

  let profundidad = 0;
  let enTexto = false;
  let escapado = false;
  let finUltimoElemento = -1;

  for (let i = inicioArray + 1; i < s.length; i++) {
    const ch = s[i];
    if (escapado) { escapado = false; continue; }
    if (ch === "\\" && enTexto) { escapado = true; continue; }
    if (ch === '"') { enTexto = !enTexto; continue; }
    if (enTexto) continue;

    if (ch === "{") profundidad++;
    else if (ch === "}") {
      profundidad--;
      if (profundidad === 0) finUltimoElemento = i;
    }
  }

  if (finUltimoElemento === -1) return null;

  const recortado = `${s.slice(0, finUltimoElemento + 1)}]`;
  // Cerrar los objetos que envolvían al array (p. ej. { "creatives": [ ... )
  let abiertos = 0;
  enTexto = false;
  escapado = false;
  for (let i = 0; i < recortado.length; i++) {
    const ch = recortado[i];
    if (escapado) { escapado = false; continue; }
    if (ch === "\\" && enTexto) { escapado = true; continue; }
    if (ch === '"') { enTexto = !enTexto; continue; }
    if (enTexto) continue;
    if (ch === "{") abiertos++;
    else if (ch === "}") abiertos--;
  }

  const candidato = recortado + "}".repeat(Math.max(abiertos, 0));
  try {
    JSON.parse(candidato);
    console.warn(`[full-research] JSON roto rescatado parcialmente (${candidato.length} chars)`);
    return candidato;
  } catch {
    return null;
  }
}

// ── Schemas (same as product-research) ─────────────────────────────────────
const SCHEMAS: Record<string, any> = {
  market_overview: {
    type: "object", additionalProperties: false, required: ["market_overview"],
    properties: { market_overview: { type: "object", additionalProperties: false,
      required: ["consumerBehavior","awarenessLevel","summary","opportunities"],
      properties: {
        // SLIM (2026-08-13): fuera TAM/SAM/SOM, CAGR y PESTEL — eran consultoría
        // de negocio, no alimentaban ningún guion. Queda cómo compra la gente.
        consumerBehavior: { type: "object", additionalProperties: false,
          required: ["howTheyBuy","whereTheyDiscover","decisionTriggers","buyingObjections"],
          properties: {
            howTheyBuy: { type: "string" },
            whereTheyDiscover: { type: "array", minItems: 3, maxItems: 6, items: { type: "string" } },
            decisionTriggers: { type: "array", minItems: 3, maxItems: 6, items: { type: "string" } },
            buyingObjections: { type: "array", minItems: 3, maxItems: 6, items: { type: "string" } },
            seasonality: { type: "string" },
          } },
        awarenessLevel: { type: "string", enum: ["unaware","problem_aware","solution_aware","product_aware","most_aware"] },
        awarenessExplanation: { type: "string" },
        summary: { type: "string" },
        opportunities: { type: "array", minItems: 3, maxItems: 5, items: { type: "object", properties: { opportunity: { type: "string" }, why: { type: "string" }, howToCapture: { type: "string" } } } },
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
        insights: { type: "array", minItems: 6, maxItems: 8, items: { type: "object", properties: { insight: { type: "string" }, category: { type: "string", enum: ["trigger","momento_verdad","barrera","decision","influenciador","competencia_indirecta"] }, actionable: { type: "string" } } } },
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
    properties: { avatars: { type: "array", minItems: 3, maxItems: 5, items: { type: "object", additionalProperties: false, required: ["name","demographics","situation","psychographics","communication","behavior","purchaseTrigger"],
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
    type: "object", additionalProperties: false, required: ["differentiation"],
    properties: {
      differentiation: { type: "object", additionalProperties: false, required: ["repeatedMessages","positioningOpportunities"], properties: {
        repeatedMessages: { type: "array", minItems: 4, maxItems: 6, items: { type: "object", properties: { message: { type: "string" }, opportunity: { type: "string" } } } },
        poorlyAddressedPains: { type: "array", minItems: 4, maxItems: 6, items: { type: "object", properties: { pain: { type: "string" }, opportunity: { type: "string" }, howToUse: { type: "string" } } } },
        positioningOpportunities: { type: "array", minItems: 4, maxItems: 6, items: { type: "object", properties: { opportunity: { type: "string" }, why: { type: "string" }, execution: { type: "string" } } } },
        unexploitedEmotions: { type: "array", minItems: 3, maxItems: 5, items: { type: "object", properties: { emotion: { type: "string" }, howToUse: { type: "string" } } } },
      }},
      // METODO CAST (propio de Alexander Cast): C-A-S-T = Conocer, Atraer, Seducir, Transformar.
      // Estructura ejecutable de playbook: 4 capas + acciones + quick wins + riesgos + drivers + calendario 7 dias.
      // castPlaybook y executiveSummary salieron del research el 2026-08-13:
      // el playbook de 7 dias y el score de oportunidad eran consultoria, no
      // alimentaban guiones. Lo ya generado en productos viejos se conserva en
      // content_strategy y se sigue leyendo sin problema.
    },
  },
  sales_angles: {
    type: "object", additionalProperties: false, required: ["salesAngles"],
    properties: { salesAngles: { type: "array", minItems: 20, maxItems: 20, items: { type: "object", additionalProperties: false, required: ["angle","type","avatar","emotion","hookExample","whyItWorks","hook_source"],
      properties: {
        angle: { type: "string" }, type: { type: "string", enum: ["educativo","emocional","aspiracional","autoridad","comparativo","anti-mercado","storytelling","prueba-social","error-comun"] },
        avatar: { type: "string" }, emotion: { type: "string" }, whyItWorks: { type: "string" }, contentType: { type: "string" },
        hookExample: { type: "string" }, ctaExample: { type: "string" }, funnelPhase: { type: "string", enum: ["tofu","mofu","bofu"] },
        consciousness_level: { type: "string", enum: ["dormido","despertando","buscando","comparando","listo"] },
        funnel_temperature: { type: "string", enum: ["frio","tibio","caliente"] },
        hashtags: { type: "array", minItems: 3, maxItems: 5, items: { type: "string" } }, developmentTips: { type: "string" },
        // De qué hook REAL del nicho desciende este ángulo. "gap" si ataca un
        // hueco que nadie usa. Se acabaron los hooks imaginados.
        hook_source: { type: "string" },
        hook_source_evidence: { type: "string", description: "URL del video o anuncio del que sale, o cuál gap" },
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
  video_creatives_a: {
    type: "object", additionalProperties: false, required: ["creatives"],
    properties: { creatives: { type: "array", minItems: 6, maxItems: 8, items: { type: "object", additionalProperties: false, required: ["number","title","idea","structure","format","cast_phase"],
      properties: { number: { type: "number" }, angle: { type: "string" }, avatar: { type: "string" }, title: { type: "string" }, idea: { type: "string" },
        structure: { type: "object", properties: { hook: { type: "string" }, body: { type: "string" }, climax: { type: "string" }, cta: { type: "string" } } },
        format: { type: "string" }, cast_phase: { type: "string", enum: ["conocer","atraer","seducir","transformar"], description: "Fase del Metodo CAST: Conocer-Atraer-Seducir-Transformar" }, duration: { type: "string" }, platform: { type: "string" }, productionNotes: { type: "string" },
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
        // Herencia de paid_ads (paso archivado): la recomendación de pauta
        // sobrevive; la estructura de campaña publicitaria no.
        pauta_recomendada: {
          type: "object",
          properties: {
            temperatura: { type: "string", enum: ["frio","tibio","caliente"] },
            nota: { type: "string" },
          },
        },
      }
    }},
    },
  },

  // Herencia de kpis_dashboard (paso archivado): qué medir del CONTENIDO. El
  // framework AARRR de negocio se fue con el paso. Va en su propio paso porque
  // metido dentro de los creativos los hacía morir por tiempo.
  video_creatives_b: {
    type: "object", additionalProperties: false, required: ["creatives"],
    properties: { creatives: { type: "array", minItems: 6, maxItems: 8, items: { type: "object", additionalProperties: false, required: ["number","title","idea","structure","format","cast_phase"],
      properties: { number: { type: "number" }, angle: { type: "string" }, avatar: { type: "string" }, title: { type: "string" }, idea: { type: "string" },
        structure: { type: "object", properties: { hook: { type: "string" }, body: { type: "string" }, climax: { type: "string" }, cta: { type: "string" } } },
        format: { type: "string" }, cast_phase: { type: "string", enum: ["conocer","atraer","seducir","transformar"], description: "Fase del Metodo CAST: Conocer-Atraer-Seducir-Transformar" }, duration: { type: "string" }, platform: { type: "string" }, productionNotes: { type: "string" },
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
        // Herencia de paid_ads (paso archivado): la recomendación de pauta
        // sobrevive; la estructura de campaña publicitaria no.
        pauta_recomendada: {
          type: "object",
          properties: {
            temperatura: { type: "string", enum: ["frio","tibio","caliente"] },
            nota: { type: "string" },
          },
        },
      }
    }},
    },
  },

  // Herencia de kpis_dashboard (paso archivado): qué medir del CONTENIDO. El
  // framework AARRR de negocio se fue con el paso. Va en su propio paso porque
  // metido dentro de los creativos los hacía morir por tiempo.
  content_kpis: {
    type: "object", additionalProperties: false, required: ["content_kpis"],
    properties: {
      content_kpis: { type: "array", minItems: 5, maxItems: 6, items: { type: "object", additionalProperties: false,
        required: ["kpi","como_medirlo","meta","trigger"],
        properties: {
          kpi: { type: "string" },
          como_medirlo: { type: "string" },
          meta: { type: "string" },
          trigger: { type: "string", description: "Regla if/then ejecutable" },
        } } },
    },
  },
  content_calendar_w1: {
    type: "object", additionalProperties: false, required: ["calendar"],
    properties: {
      calendar: { type: "array", minItems: 7, maxItems: 9, items: { type: "object", additionalProperties: false, required: ["week","day","dayLabel","platform","format","pillar","title","hook","description","copy","cta","hashtags","cast_phase","avatar","productionNotes"],
        properties: { week: { type: "number" }, day: { type: "number" }, dayLabel: { type: "string" }, platform: { type: "string" }, format: { type: "string" }, pillar: { type: "string", enum: ["educativo","emocional","autoridad","venta","comunidad"] }, title: { type: "string" }, hook: { type: "string" }, description: { type: "string" }, copy: { type: "string" }, cta: { type: "string" }, hashtags: { type: "array", minItems: 3, maxItems: 5, items: { type: "string" } }, cast_phase: { type: "string", enum: ["conocer","atraer","seducir","transformar"], description: "Fase del Metodo CAST: Conocer-Atraer-Seducir-Transformar" }, avatar: { type: "string" }, productionNotes: { type: "string" },
          consciousness_level: { type: "string", enum: ["dormido","despertando","buscando","comparando","listo"] },
          funnel_temperature: { type: "string", enum: ["frio","tibio","caliente"] }
        }
      } },
      weeklyThemes: { type: "array", minItems: 4, maxItems: 4, items: { type: "object", properties: { week: { type: "number" }, theme: { type: "string" }, objective: { type: "string" }, focusPhase: { type: "string" } } } },
      leadMagnetDays: { type: "array", minItems: 3, maxItems: 3, items: { type: "object", properties: { week: { type: "number" }, day: { type: "number" }, leadMagnetName: { type: "string" }, promotionCopy: { type: "string" } } } },
    },
  },
  content_calendar_w2: {
    type: "object", additionalProperties: false, required: ["calendar"],
    properties: {
      calendar: { type: "array", minItems: 7, maxItems: 9, items: { type: "object", additionalProperties: false, required: ["week","day","dayLabel","platform","format","pillar","title","hook","description","copy","cta","hashtags","cast_phase","avatar","productionNotes"],
        properties: { week: { type: "number" }, day: { type: "number" }, dayLabel: { type: "string" }, platform: { type: "string" }, format: { type: "string" }, pillar: { type: "string", enum: ["educativo","emocional","autoridad","venta","comunidad"] }, title: { type: "string" }, hook: { type: "string" }, description: { type: "string" }, copy: { type: "string" }, cta: { type: "string" }, hashtags: { type: "array", minItems: 3, maxItems: 5, items: { type: "string" } }, cast_phase: { type: "string", enum: ["conocer","atraer","seducir","transformar"], description: "Fase del Metodo CAST: Conocer-Atraer-Seducir-Transformar" }, avatar: { type: "string" }, productionNotes: { type: "string" },
          consciousness_level: { type: "string", enum: ["dormido","despertando","buscando","comparando","listo"] },
          funnel_temperature: { type: "string", enum: ["frio","tibio","caliente"] }
        }
      } },
    },
  },
  content_calendar_w3: {
    type: "object", additionalProperties: false, required: ["calendar"],
    properties: {
      calendar: { type: "array", minItems: 7, maxItems: 9, items: { type: "object", additionalProperties: false, required: ["week","day","dayLabel","platform","format","pillar","title","hook","description","copy","cta","hashtags","cast_phase","avatar","productionNotes"],
        properties: { week: { type: "number" }, day: { type: "number" }, dayLabel: { type: "string" }, platform: { type: "string" }, format: { type: "string" }, pillar: { type: "string", enum: ["educativo","emocional","autoridad","venta","comunidad"] }, title: { type: "string" }, hook: { type: "string" }, description: { type: "string" }, copy: { type: "string" }, cta: { type: "string" }, hashtags: { type: "array", minItems: 3, maxItems: 5, items: { type: "string" } }, cast_phase: { type: "string", enum: ["conocer","atraer","seducir","transformar"], description: "Fase del Metodo CAST: Conocer-Atraer-Seducir-Transformar" }, avatar: { type: "string" }, productionNotes: { type: "string" },
          consciousness_level: { type: "string", enum: ["dormido","despertando","buscando","comparando","listo"] },
          funnel_temperature: { type: "string", enum: ["frio","tibio","caliente"] }
        }
      } },
    },
  },
  content_calendar_w4: {
    type: "object", additionalProperties: false, required: ["calendar"],
    properties: {
      calendar: { type: "array", minItems: 7, maxItems: 9, items: { type: "object", additionalProperties: false, required: ["week","day","dayLabel","platform","format","pillar","title","hook","description","copy","cta","hashtags","cast_phase","avatar","productionNotes"],
        properties: { week: { type: "number" }, day: { type: "number" }, dayLabel: { type: "string" }, platform: { type: "string" }, format: { type: "string" }, pillar: { type: "string", enum: ["educativo","emocional","autoridad","venta","comunidad"] }, title: { type: "string" }, hook: { type: "string" }, description: { type: "string" }, copy: { type: "string" }, cta: { type: "string" }, hashtags: { type: "array", minItems: 3, maxItems: 5, items: { type: "string" } }, cast_phase: { type: "string", enum: ["conocer","atraer","seducir","transformar"], description: "Fase del Metodo CAST: Conocer-Atraer-Seducir-Transformar" }, avatar: { type: "string" }, productionNotes: { type: "string" },
          consciousness_level: { type: "string", enum: ["dormido","despertando","buscando","comparando","listo"] },
          funnel_temperature: { type: "string", enum: ["frio","tibio","caliente"] }
        }
      } },
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
    // Timeout dinamico segun tamaño del output (max_tokens grandes = mas tiempo).
    //
    // Subido un escalon (2026-08-13): con Gemini sin cuota, la fase 2
    // ("Dolores y Deseos", 9000 tokens) caia en la rama de 75s y Mistral no
    // alcanzaba a terminar — se perdia la etapa entera con TIMEOUT teniendo
    // creditos de sobra. Hay margen para darselo: cuando Gemini responde 429 lo
    // hace en 1-2 segundos, asi que Mistral hereda casi todo el wall-clock de
    // ~150s de la funcion.
    // Subido otra vez (2026-08-13, research unificado): con Gemini sin cuota,
    // `video_creatives` (8.000 tokens) moría en TIMEOUT a los 109 s teniendo
    // creditos de Mistral de sobra. Ya ningun paso pide mas de 9.000, asi que
    // el escalon de arriba sobra y lo que hace falta es darle a Mistral casi
    // todo el wall-clock: Gemini responde 429 en 1-2 segundos y le deja el
    // resto. 118 s + el arranque cabe holgado en los ~150 s de la funcion.
    const dynamicTimeout = maxTokens >= 8000 ? 118000 : 100000;
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

  /**
   * Tercer proveedor, y el que salva el sistema cuando Gemini se queda sin
   * cuota (2026-08-13): con solo Gemini y Mistral, un 429 de Gemini dejaba a
   * Mistral solo, y Mistral no termina un JSON largo dentro del wall-clock
   * REAL de la función (~112 s, no los 150 s que se suponían). Resultado: el
   * paso moría en TIMEOUT con créditos de sobra.
   *
   * gpt-4o-mini es rápido, barato y tiene JSON mode. La clave ya estaba en los
   * secrets del proyecto: no hacía falta configurar nada nuevo.
   */
  const tryOpenAI = async (): Promise<any> => {
    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiKey) throw new Error("No OPENAI_API_KEY");
    console.log(`[AI] → Paso 2b: OpenAI gpt-4o-mini estructurando (${stepId})`);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 75000);
    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${openaiKey}`, "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          model: "gpt-4o-mini",
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
        throw new Error(`OpenAI HTTP ${res.status}: ${errBody.substring(0, 200)}`);
      }

      const data = await res.json();
      const content = (data.choices?.[0]?.message?.content || "").toString().trim();
      if (!content) throw new Error(`OpenAI returned empty content for ${stepId}`);
      console.log(`[AI] OpenAI response received (${stepId}) — ${content.length} chars`);

      try {
        const parsed = JSON.parse(repairJsonForParse(content));
        console.log(`[AI] ✓ OpenAI OK (${stepId}) — JSON parsed correctly`);
        return parsed;
      } catch (parseErr: any) {
        DEBUG_RESPONSES.push({
          provider: "openai",
          parseError: parseErr.message,
          contentLength: content.length,
          first800: content.substring(0, 800),
          last300: content.substring(Math.max(0, content.length - 300)),
        });
        throw new Error(`OpenAI JSON inválido: ${parseErr.message}`);
      }
    } finally {
      clearTimeout(timeout);
    }
  };

  // Perplexity investiga → Gemini estructura → OpenAI (rápido) → Mistral (último).
  // Mistral va al final justo por ser el más lento: si los dos de arriba están
  // caídos, al menos hereda todo el wall-clock que quede.
  const providerLabels = ["gemini", "openai", "mistral"];
  const attempts = [tryGemini, tryOpenAI, tryMistral];
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

/**
 * Regla global del Research Unificado (2026-08-13). Se añade al system prompt
 * de TODOS los pasos.
 *
 * Antes, cada paso investigaba por su cuenta y podía contradecir la evidencia
 * que el cliente ya había aprobado en su portal. Ahora hay una sola fuente de
 * verdad, y está scrapeada.
 */
const REGLA_EVIDENCIA = `
## REGLA INNEGOCIABLE — LA EVIDENCIA MANDA

La evidencia scrapeada que aparece en el contexto (competidores reales con sus
numeros, anuncios que estan corriendo ahora mismo, hooks transcritos de videos
del nicho) es la FUENTE DE VERDAD de este research.

- Prohibido contradecirla, corregirla o "mejorarla" con tu conocimiento previo.
- Prohibido inventar testimonios, URLs, handles, marcas o metricas. Si un dato
  no esta, se dice que no esta: un campo vacio es honesto, uno inventado es una
  mentira que el cliente va a descubrir.
- Todo dato de producto (que incluye, precios, garantias, componentes) viene del
  cliente. No se deduce, no se completa, no se redondea.
- Si la evidencia viene marcada como INCOMPLETA, trabaja con lo que hay y dilo.

## FORMATO DEL JSON — NO ROMPAS LA SALIDA

Dentro de los valores de texto NO uses comillas dobles ("). Si necesitas citar
algo, usa comillas simples ('). Una comilla doble sin escapar parte el JSON a
la mitad y se pierde el paso entero, con todo lo que costó generarlo.
Tampoco uses saltos de linea sin escapar dentro de un valor.
`;

// ── Evidencia scrapeada por research-engine ────────────────────────────────
/**
 * Lee la última corrida del motor de investigación del cliente y la deja lista
 * para inyectar. Se acepta una corrida 'partial' a propósito: una investigación
 * con huecos declarados vale mucho más que ninguna — pero se marca, para que
 * los prompts sepan que no tienen la foto completa.
 */
interface EvidenciaMotor {
  adnMercado: any;
  adnViral: any;
  ads: number;
  competidores: number;
  tieneViral: boolean;
  parcial: boolean;
  texto: string;
}

async function cargarEvidenciaDelMotor(
  supabase: any,
  clientId: string | null,
): Promise<EvidenciaMotor | null> {
  if (!clientId) return null;

  try {
    const { data } = await supabase
      .from("research_runs")
      .select("status, niche, country, result")
      .eq("client_id", clientId)
      .in("status", ["done", "partial"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!data) return null;

    const result = data.result || {};
    const mercado = result.adn_mercado || null;
    const viral = result.adn_viral || result.adn_viral_heredado || null;
    const ads = Array.isArray(result.ads) ? result.ads : [];
    const competidores = Array.isArray(mercado?.competidores) ? mercado.competidores : [];

    if (!mercado && !viral && ads.length === 0) return null;

    const lineas: string[] = [];
    lineas.push("\n--- EVIDENCIA REAL SCRAPEADA (manda sobre cualquier suposicion) ---");
    if (data.niche) lineas.push(`NICHO: ${data.niche}${data.country ? ` | PAIS: ${data.country}` : ""}`);
    if (data.status === "partial") {
      lineas.push("AVISO: la investigacion quedo INCOMPLETA. Usa lo que hay y NO rellenes lo que falta.");
    }

    if (competidores.length > 0) {
      lineas.push("\nCOMPETIDORES REALES (datos medidos, no estimados):");
      for (const c of competidores.slice(0, 6)) {
        lineas.push(
          `- ${c.handle ?? "?"}: ${c.posicionamiento ?? "sin posicionamiento detectado"} | ` +
          `${c.seguidores ?? "?"} seguidores | publica ${c.frecuencia_real ?? "?"} | ` +
          `engagement ${c.engagement_medio ?? "?"}%${c.ads_30_dias ? ` | ${c.ads_30_dias} anuncios con 30+ dias` : ""}`,
        );
      }
    }

    const huecos = Array.isArray(mercado?.huecos_de_mercado) ? mercado.huecos_de_mercado : [];
    if (huecos.length > 0) {
      lineas.push("\nHUECOS DE MERCADO DETECTADOS:");
      for (const h of huecos.slice(0, 5)) lineas.push(`- ${h.hueco}: ${h.como_atacarlo ?? ""}`);
    }

    const hooks = Array.isArray(viral?.hooks_dominantes) ? viral.hooks_dominantes : [];
    if (hooks.length > 0) {
      lineas.push("\nHOOKS QUE DE VERDAD FUNCIONAN EN ESTE NICHO (transcritos de videos reales):");
      for (const h of hooks.slice(0, 6)) {
        const ejemplo = Array.isArray(h.ejemplos) && h.ejemplos[0]
          ? ` | ejemplo textual: "${String(h.ejemplos[0].texto ?? "").slice(0, 180)}" (${h.ejemplos[0].url ?? ""})`
          : "";
        lineas.push(`- [${h.taxonomia}] presente en ${h.porcentaje_del_top ?? "?"}% del top${ejemplo}`);
      }
    }

    if (viral?.duracion) {
      lineas.push(
        `\nDURACION GANADORA: ${viral.duracion.moda_segundos ?? "?"}s (rango ${viral.duracion.rango ?? "?"}) | ` +
        `mezcla: ${viral.duracion.mezcla_tutorial_vs_emocion ?? "?"}`,
      );
    }

    const gaps = Array.isArray(viral?.gaps) ? viral.gaps : [];
    if (gaps.length > 0) {
      lineas.push("\nANGULOS QUE NADIE DEL NICHO ESTA USANDO (oportunidad):");
      for (const g of gaps.slice(0, 5)) lineas.push(`- ${g.oportunidad}: ${g.por_que_nadie_lo_usa ?? ""}`);
    }

    const ganadores = ads.filter((a: any) => (a?.dias_corriendo ?? 0) >= 30).slice(0, 6);
    if (ganadores.length > 0) {
      lineas.push("\nANUNCIOS DEL GREMIO QUE YA IMPRIMEN DINERO (30+ dias corriendo):");
      for (const a of ganadores) {
        lineas.push(`- [${a.dias_corriendo} dias] ${a.pagina}: "${String(a.texto ?? "").slice(0, 200)}"`);
      }
    }

    return {
      adnMercado: mercado,
      adnViral: viral,
      ads: ads.length,
      competidores: competidores.length,
      tieneViral: !!viral,
      parcial: data.status === "partial",
      texto: lineas.join("\n"),
    };
  } catch (e) {
    console.warn(`[full-research] no se pudo leer la evidencia del motor: ${(e as Error).message}`);
    return null;
  }
}

/** Cuántos OTROS productos del mismo cliente ya existen (para medir el reuso). */
async function contarProductosDelCliente(
  supabase: any,
  clientId: string | null,
  productIdActual: string,
): Promise<number> {
  if (!clientId) return 0;
  try {
    const { count } = await supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("client_id", clientId)
      .neq("id", productIdActual);
    return count ?? 0;
  } catch {
    return 0;
  }
}

// ── Build enriched base context from Client DNA + Product DNA ──────────────
function buildBaseContext(
  clientDna: any,
  productDna: any,
  productName: string,
  evidencia?: EvidenciaMotor | null,
): string {
  const dna = clientDna?.dna_data || {};
  const pd = productDna || {};
  const parts: string[] = [];

  parts.push(`PRODUCTO/SERVICIO: ${productName}`);

  // La evidencia va ARRIBA del todo: es lo primero que el modelo debe leer y
  // lo que no puede contradecir.
  if (evidencia?.texto) parts.push(evidencia.texto);

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
  const prevCreativesA = prev.video_creatives_a;
  const prevCreatives = { creatives: [...(prev.video_creatives_a?.creatives || []), ...(prev.video_creatives_b?.creatives || [])] };
  const prevW1 = prev.content_calendar_w1;
  const prevW2 = prev.content_calendar_w2;
  const prevW3 = prev.content_calendar_w3;

  const prompts: Record<string, string> = {
    market_overview: `Analiza COMO COMPRA la gente en este mercado. NO hagas un informe de consultoria: lo que escribas alimenta guiones de contenido.

${baseContext}

MERCADO OBJETIVO: ${targetMarket}

INSTRUCCIONES CRITICAS:
- Enfocate SOLO en comportamiento de compra: como decide, donde descubre, que la dispara, que la frena.
- NO calcules tamano de mercado, ni CAGR, ni PESTEL: eso ya no se pide en este research.
- Si la evidencia scrapeada (ADN de Mercado / ADN Viral) dice algo sobre el comportamiento, MANDA sobre cualquier dato general.
- Se ESPECIFICO: nada de "el consumidor busca calidad".

Genera market_overview con: consumerBehavior (howTheyBuy en 1 parrafo, whereTheyDiscover 3-6 canales concretos, decisionTriggers 3-6, buyingObjections 3-6, seasonality), awarenessLevel (unaware|problem_aware|solution_aware|product_aware|most_aware) con awarenessExplanation, summary de 2-3 parrafos y 3-5 opportunities (opportunity, why, howToCapture).`,

    jtbd: `Analiza los Jobs To Be Done del cliente ideal. Version corta y util, no un ensayo.

${baseContext}

INSTRUCCIONES CRITICAS:
- Piensa como el cliente, no como el vendedor.
- Usa lenguaje que el cliente realmente usaria.
- UN parrafo por cada job (funcional, emocional, social). No mas.

Genera jtbd con: functional, emotional y social (cada uno con su description de 1 parrafo y sus campos), y EXACTAMENTE 6-8 insights accionables, cada uno con insight, category (trigger|momento_verdad|barrera|decision|influenciador|competencia_indirecta) y actionable.`,

    pains_desires: `Realiza un analisis PSICOLOGICO PROFUNDO de los dolores, deseos y objeciones del cliente ideal.

${baseContext}

JOBS TO BE DONE (paso anterior):
${prevJtbd?.jtbd?.functional?.statement || "N/A"}
Emocional: ${prevJtbd?.jtbd?.emotional?.description?.substring(0, 200) || "N/A"}
Social: ${prevJtbd?.jtbd?.social?.description?.substring(0, 200) || "N/A"}

INSTRUCCIONES CRITICAS:
- Piensa como un psicologo que entiende motivaciones profundas.
- Usa el lenguaje EXACTO que usaria el cliente (esto se convierte en hooks de guiones).
- Conecta cada dolor/deseo con una emocion especifica.
- Si el ADN Viral trae comentarios o frases reales del nicho, USALAS como materia prima.

Genera EXACTAMENTE 10 pains (pain, why, impact), 10 desires (desire, emotion, idealState) y 10 objections (objection, belief, counter).`,

    competitors: `SINTETIZA el analisis de la competencia a partir de los datos REALES ya scrapeados. NO investigues: los competidores, sus numeros y sus anuncios ya estan en el contexto.

${baseContext}

INSTRUCCIONES CRITICAS:
- Trabaja SOLO con los competidores que aparecen en el ADN de Mercado. NO agregues marcas de tu conocimiento previo.
- Las URLs y los handles vienen del scraping: copialos EXACTOS. Prohibido inventar o completar rutas.
- Si un competidor tiene pocos datos, dilo en su ficha en vez de rellenar.
- El posicionamiento sale de lo que su bio y sus publicaciones dicen REALMENTE, no de lo que suene bien.

Genera competitors: para cada uno name, positioning, promise, strengths (2+), weaknesses (2+), website y redes tal como vienen del scraping, y que esta pautando si hay anuncios suyos en la evidencia.`,

    avatars: `Crea BUYER PERSONAS ULTRA-DETALLADOS basados en la investigacion previa.

${baseContext}

DOLORES PRINCIPALES:
${prevPains?.pains?.slice(0, 5).map((p: any) => `- ${p.pain}`).join("\n") || "N/A"}

DESEOS PRINCIPALES:
${prevPains?.desires?.slice(0, 5).map((d: any) => `- ${d.desire}`).join("\n") || "N/A"}

OBJECIONES:
${prevPains?.objections?.slice(0, 5).map((o: any) => `- ${o.objection}`).join("\n") || "N/A"}

INSTRUCCIONES CRITICAS:
- Entre 3 y 5 avatares: los que el producto REALMENTE tenga. No inventes uno para llegar a cinco.
- Cada avatar debe sentirse como una PERSONA REAL, con nombre simbolico.
- Las frases deben sonar 100% naturales. Si el ADN Viral trae comentarios reales del nicho, usalos como fuente de esas frases.

Cada avatar con: name, demographics, situation, psychographics (drivers/biases/values 3+), communication (5-7 phrases textuales), behavior, purchaseTrigger y awarenessLevel.`,

    differentiation: `Eres el estratega del METODO CAST de Alexander Cast. Encuentra el hueco por donde entra esta marca.

${baseContext}

COMPETENCIA REAL (scrapeada):
${prevCompetitors?.competitors?.slice(0, 5).map((c: any) => `- ${c.name}: ${c.promise || c.positioning || ""} | Debilidades: ${Array.isArray(c.weaknesses) ? c.weaknesses.join(", ") : ""}`).join("\n") || "N/A"}

AVATARES:
${prevAvatars?.avatars?.map((a: any) => `- ${a.name}: ${a.situation?.currentFeeling || ""}`).join("\n") || "N/A"}

DOLORES:
${prevPains?.pains?.slice(0, 5).map((p: any) => `- ${p.pain}`).join("\n") || "N/A"}

INSTRUCCIONES CRITICAS:
- METODO CAST (propio): Conocer > Atraer > Seducir > Transformar. Es el UNICO framework de este research.
- Los GAPS del ADN Viral (angulos que nadie del nicho usa) son la materia prima: cruzalos con las debilidades de la competencia.
- Usa el nombre real del producto y dolores reales del avatar. Nada generico.
- No generes plan de 7 dias ni score de oportunidad: eso ya no forma parte de este paso.

Genera differentiation con: repeatedMessages (4-6, lo que TODOS dicen y aburre), poorlyAddressedPains (4-6), positioningOpportunities (4-6, cruzando gaps del nicho con debilidades reales) y unexploitedEmotions (3-5).`,

    sales_angles: `Crea 20 ANGULOS DE VENTA ESTRATEGICOS basados en la investigacion completa.

${baseContext}

AVATARES Y SUS DRIVERS:
${prevAvatars?.avatars?.map((a: any) => `- ${a.name}: Drivers: ${Array.isArray(a.psychographics?.drivers) ? a.psychographics.drivers.join(", ") : "N/A"}`).join("\n") || "N/A"}

OPORTUNIDADES DE DIFERENCIACION:
${prevDiff?.differentiation?.positioningOpportunities?.map((o: any) => `- ${o.opportunity}`).join("\n") || "N/A"}

DOLORES MAL COMUNICADOS:
${prevDiff?.differentiation?.poorlyAddressedPains?.map((p: any) => `- ${p.pain}`).join("\n") || "N/A"}

INSTRUCCIONES CRITICAS:
- Cada angulo debe ser UNICO y diferenciado.
- Varia los tipos: educativo, emocional, aspiracional, autoridad, comparativo, anti-mercado, storytelling, prueba-social, error-comun.
- INTEGRA la voz de marca del ADN de marca en los hooks y CTAs.
- REGLA NUEVA E INNEGOCIABLE — hook_source: cada angulo declara de que hook REAL del nicho desciende su gancho.
  * Si desciende de un hook del ADN Viral: hook_source = la taxonomia de ese hook (ej "kill-shot", "anclaje-precio") y hook_source_evidence = la URL del video o anuncio del que salio.
  * Si ataca un GAP (un angulo que NADIE del nicho usa): hook_source = "gap" y hook_source_evidence = cual gap.
  * Se acabaron los hooks imaginados: si no puedes trazarlo, no lo escribas.
- consciousness_level: en que punto esta la cabeza del avatar cuando ve este angulo (dormido = ni sabe que tiene el problema; despertando = lo siente pero no lo nombra; buscando = busca solucion; comparando = evalua opciones; listo = solo necesita un empujon).
- funnel_temperature: frio = nunca oyo de la marca; tibio = ya interactuo; caliente = listo para comprar.

Genera EXACTAMENTE 20 ANGULOS con: angle (3-4 oraciones), type, avatar, emotion, contentType, hookExample (listo para usar), ctaExample, funnelPhase (tofu/mofu/bofu), hashtags (3-5), whyItWorks, developmentTips, hook_source, hook_source_evidence, consciousness_level y funnel_temperature.`,

    puv_transformation: `Construye una PROPUESTA UNICA DE VALOR PODEROSA y TABLA DE TRANSFORMACION.

${baseContext}

ANGULOS MAS FUERTES:
${prevSales?.salesAngles?.slice(0, 8).map((a: any) => `- [${a.type}] ${a.hookExample}`).join("\n") || "N/A"}

DIFERENCIADORES:
${prevDiff?.differentiation?.positioningOpportunities?.slice(0, 3).map((o: any) => `- ${o.opportunity}`).join("\n") || "N/A"}

INSTRUCCIONES CRITICAS:
- La PUV debe ser MEMORABLE y pasar la "prueba del taxi".
- La transformacion debe ser VIVIDA y especifica.
- INTEGRA la propuesta de valor del ADN de marca como base.
- Los datos del producto (que incluye, precio, garantias) vienen del cliente: NUNCA los inventes ni los ajustes.

Genera: PUV (centralProblem, tangibleResult, marketDifference, idealClient, statement max 25 palabras, credibility), Transformacion (functional/emotional/identity/social/financial con before/after).`,

    lead_magnets: `Disena 3 LEAD MAGNETS IRRESISTIBLES.

${baseContext}

AVATARES:
${prevAvatars?.avatars?.map((a: any) => `- ${a.name}: ${a.situation?.currentFeeling || ""}`).join("\n") || "N/A"}

DOLORES PRINCIPALES:
${prevPains?.pains?.slice(0, 6).map((p: any) => `- ${p.pain}`).join("\n") || "N/A"}

INSTRUCCIONES CRITICAS:
- Cada lead magnet debe ser tan valioso que lo querrian pagar.
- Nombres irresistibles y especificos. Variar formatos.
- Estos imanes alimentan los CTA de los guiones: tienen que poder nombrarse en 5 segundos a camara.

Crea 3 LEAD MAGNETS: 1 para PROBLEM AWARE, 1 para SOLUTION AWARE, 1 para PRODUCT AWARE. Cada uno con: name, format, objective, pain, avatar, awarenessPhase, promise, structure (5-7 secciones), deliveryMethod, estimatedTime.`,

    video_creatives_a: `Crea 7 IDEAS DE CONTENIDO (primera mitad del lote) con guiones resumidos, clasificadas por el METODO CAST.Crea 12-15 IDEAS DE CONTENIDO con guiones resumidos, clasificadas por el METODO CAST.

${baseContext}

ANGULOS DISPONIBLES:
${prevSales?.salesAngles?.slice(0, 8).map((a: any) => `- [${a.type}] "${a.hookExample}" > Avatar: ${a.avatar} > desciende de: ${a.hook_source || "N/A"}`).join("\n") || "N/A"}

AVATARES:
${prevAvatars?.avatars?.map((a: any) => a.name).join(", ") || "N/A"}

INSTRUCCIONES CRITICAS:
- METODO CAST (propio, y el UNICO de este research): Conocer > Atraer > Seducir > Transformar.
- Esta primera mitad cubre CONOCER y ATRAER: 4 de conocer + 3 de atraer.
- FORMATOS Y DURACIONES: tomalos del ADN Viral (lo que de verdad funciona en este nicho), no de tu intuicion. Si el ADN Viral dice que la duracion ganadora son 25 segundos, no propongas piezas de 3 minutos.
- PRIORIZAR formatos faciles de producir: Carruseles, Reels con texto, Stories, Posts estaticos, Infografias, Memes, Threads.
- Maximo 2 de estas 7 deben ser videos con persona hablando.
- Se conciso: titles cortos, idea en 2-3 oraciones, structure compacta.

CAMPOS QUE HAY QUE LLENAR CON CRITERIO (no los dejes al azar):
- cast_phase: conocer | atraer | seducir | transformar.
- consciousness_level: dormido | despertando | buscando | comparando | listo — la cabeza del avatar al ver ESTA pieza.
- funnel_temperature: frio | tibio | caliente.
- production_brief: escenario, luz, encuadre, vestuario, notas de edicion y si lleva subtitulos. Que un creador pueda grabarlo leyendo solo eso.
- pauta_recomendada: { temperatura: frio|tibio|caliente, nota: una linea diciendo a quien se le pondria plata detras y por que }. Solo la recomendacion; la estructura de campana ya no es parte de este research.

Numera del 1 al 7. Cada creativo con: number, angle, avatar, title (max 12 palabras), idea (2-3 oraciones), structure (hook/body/climax/cta breves), format, cast_phase, duration, platform, productionNotes, consciousness_level, funnel_temperature, production_brief y pauta_recomendada.`,

    video_creatives_b: `Crea 8 IDEAS DE CONTENIDO (segunda mitad del lote) con guiones resumidos, clasificadas por el METODO CAST.Crea 12-15 IDEAS DE CONTENIDO con guiones resumidos, clasificadas por el METODO CAST.

${baseContext}

ANGULOS DISPONIBLES:
${prevSales?.salesAngles?.slice(0, 8).map((a: any) => `- [${a.type}] "${a.hookExample}" > Avatar: ${a.avatar} > desciende de: ${a.hook_source || "N/A"}`).join("\n") || "N/A"}

AVATARES:
${prevAvatars?.avatars?.map((a: any) => a.name).join(", ") || "N/A"}

INSTRUCCIONES CRITICAS:
- METODO CAST (propio, y el UNICO de este research): Conocer > Atraer > Seducir > Transformar.
- Esta segunda mitad cubre SEDUCIR y TRANSFORMAR: 4 de seducir + 4 de transformar.
- FORMATOS Y DURACIONES: tomalos del ADN Viral (lo que de verdad funciona en este nicho), no de tu intuicion. Si el ADN Viral dice que la duracion ganadora son 25 segundos, no propongas piezas de 3 minutos.
- PRIORIZAR formatos faciles de producir: Carruseles, Reels con texto, Stories, Posts estaticos, Infografias, Memes, Threads.
- Maximo 2 de estas 8 deben ser videos con persona hablando.
- Se conciso: titles cortos, idea en 2-3 oraciones, structure compacta.

CAMPOS QUE HAY QUE LLENAR CON CRITERIO (no los dejes al azar):
- cast_phase: conocer | atraer | seducir | transformar.
- consciousness_level: dormido | despertando | buscando | comparando | listo — la cabeza del avatar al ver ESTA pieza.
- funnel_temperature: frio | tibio | caliente.
- production_brief: escenario, luz, encuadre, vestuario, notas de edicion y si lleva subtitulos. Que un creador pueda grabarlo leyendo solo eso.
- pauta_recomendada: { temperatura: frio|tibio|caliente, nota: una linea diciendo a quien se le pondria plata detras y por que }. Solo la recomendacion; la estructura de campana ya no es parte de este research.

Numera del 8 al 15. Cada creativo con: number, angle, avatar, title (max 12 palabras), idea (2-3 oraciones), structure (hook/body/climax/cta breves), format, cast_phase, duration, platform, productionNotes, consciousness_level, funnel_temperature, production_brief y pauta_recomendada.

YA EXISTEN ESTAS IDEAS (primera mitad, NO las repitas):
${prevCreativesA?.creatives?.map((c: any) => `- ${c.title}`).join("\n") || "N/A"}`,

    content_kpis: `Define QUE MEDIR del contenido de esta marca. Corto y ejecutable.

${baseContext}

IDEAS DE CONTENIDO YA DEFINIDAS:
${prevCreatives?.creatives?.slice(0, 8).map((c: any) => `- [${c.cast_phase}] ${c.title} (${c.format})`).join("\n") || "N/A"}

INSTRUCCIONES CRITICAS:
- Son metricas de CONTENIDO, no de negocio: retencion, guardados, comentarios, alcance de no seguidores, clics al perfil. NADA de CAC, LTV ni AARRR.
- Cada metrica lleva un disparador if/then EJECUTABLE, del tipo "si un hook baja de 3s de retencion a los 3 dias, rotarlo".
- Metas realistas para una marca que empieza, no de cuenta consolidada.

Genera 5-6 content_kpis con: kpi, como_medirlo, meta y trigger.`,

    content_calendar_w1: `Crea la SEMANA 1 de la parrilla de contenido (7 a 9 piezas).

${baseContext}

AVATARES:
${prevAvatars?.avatars?.map((a: any) => a.name).join(", ") || "N/A"}

ANGULOS DISPONIBLES:
${prevSales?.salesAngles?.slice(0, 10).map((a: any) => `- [${a.type}] "${a.hookExample}"`).join("\n") || "N/A"}

IDEAS DE CONTENIDO YA DEFINIDAS:
${prevCreatives?.creatives?.slice(0, 10).map((c: any) => `- [${c.cast_phase}] ${c.title}`).join("\n") || "N/A"}

INSTRUCCIONES CRITICAS:
- Contenido LISTO PARA PUBLICAR: copy completo, hashtags y CTA. Nada de "hablar sobre X".
- La semana 1 es de CONOCER: la gente todavia no sabe quien eres.
- Varia formatos: Carruseles, Stories, Reels, Posts, Threads, Memes, Infografias, Quotes, BTS, Encuestas.
- cast_phase de cada pieza: conocer | atraer | seducir | transformar.
- Los campos week y day: week = 1, day = 1 a 7.
- INTEGRA la voz de marca y los pilares del ADN de marca.

Genera 7-9 piezas con: week, day, dayLabel, platform, format, pillar (educativo|emocional|autoridad|venta|comunidad), title, hook, description, copy, cta, hashtags (3-5), cast_phase, avatar, productionNotes, consciousness_level y funnel_temperature.
Ademas, y SOLO en esta semana: weeklyThemes (los 4 temas de las 4 semanas, uno por semana) y leadMagnetDays (3 dias del mes en los que se promociona un lead magnet).`,

    content_calendar_w2: `Crea la SEMANA 2 de la parrilla de contenido (7 a 9 piezas).

${baseContext}

TEMA DE ESTA SEMANA (definido en la semana 1):
${prevW1?.weeklyThemes?.find((t: any) => t.week === 2)?.theme || "Atraer: demostrar que entiendes el problema"}

LO QUE YA SE PUBLICO EN LA SEMANA 1 (no lo repitas):
${prevW1?.calendar?.map((c: any) => `- ${c.title}`).join("\n") || "N/A"}

ANGULOS DISPONIBLES:
${prevSales?.salesAngles?.slice(0, 10).map((a: any) => `- [${a.type}] "${a.hookExample}"`).join("\n") || "N/A"}

INSTRUCCIONES CRITICAS:
- Contenido LISTO PARA PUBLICAR. La semana 2 pesa hacia ATRAER.
- NO repitas titulos ni angulos de la semana 1: esto es continuidad, no un reinicio.
- week = 2, day = 8 a 14.

Genera 7-9 piezas con los mismos campos de la semana 1 (sin weeklyThemes ni leadMagnetDays: esos ya se definieron).`,

    content_calendar_w3: `Crea la SEMANA 3 de la parrilla de contenido (7 a 9 piezas).

${baseContext}

TEMA DE ESTA SEMANA (definido en la semana 1):
${prevW1?.weeklyThemes?.find((t: any) => t.week === 3)?.theme || "Seducir: demostrar que tu solucion funciona"}

LO QUE YA SE PUBLICO (semanas 1 y 2, no lo repitas):
${[...(prevW1?.calendar || []), ...(prevW2?.calendar || [])].map((c: any) => `- ${c.title}`).join("\n") || "N/A"}

ANGULOS DISPONIBLES:
${prevSales?.salesAngles?.slice(0, 10).map((a: any) => `- [${a.type}] "${a.hookExample}"`).join("\n") || "N/A"}

INSTRUCCIONES CRITICAS:
- Contenido LISTO PARA PUBLICAR. La semana 3 pesa hacia SEDUCIR: prueba, demostracion, testimonio real del cliente si existe en el brief.
- Prohibido inventar testimonios. Si el cliente no dio ninguno, usa demostracion en vez de testimonio.
- week = 3, day = 15 a 21.

Genera 7-9 piezas con los mismos campos de la semana 1 (sin weeklyThemes ni leadMagnetDays).`,

    content_calendar_w4: `Crea la SEMANA 4 de la parrilla de contenido (7 a 9 piezas).

${baseContext}

TEMA DE ESTA SEMANA (definido en la semana 1):
${prevW1?.weeklyThemes?.find((t: any) => t.week === 4)?.theme || "Transformar: llevar a la accion"}

LO QUE YA SE PUBLICO (semanas 1, 2 y 3, no lo repitas):
${[...(prevW1?.calendar || []), ...(prevW2?.calendar || []), ...(prevW3?.calendar || [])].map((c: any) => `- ${c.title}`).join("\n") || "N/A"}

ANGULOS DISPONIBLES:
${prevSales?.salesAngles?.slice(0, 10).map((a: any) => `- [${a.type}] "${a.hookExample}"`).join("\n") || "N/A"}

INSTRUCCIONES CRITICAS:
- Contenido LISTO PARA PUBLICAR. La semana 4 pesa hacia TRANSFORMAR: cierre, oferta, llamado claro.
- Cierra el mes: la ultima pieza debe dejar al avatar sabiendo exactamente que hacer.
- week = 4, day = 22 a 28.

Genera 7-9 piezas con los mismos campos de la semana 1 (sin weeklyThemes ni leadMagnetDays).`,

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
      "market_research, competitor_analysis, avatar_profiles, sales_angles_data, content_strategy, content_calendar",
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
  if (hasData(sa.videoCreatives)) {
    const todas = sa.videoCreatives as any[];
    // La primera mitad son las 7 primeras; si hay más, la segunda ya corrió.
    stepResults.video_creatives_a = { creatives: todas.slice(0, 7) };
    if (todas.length > 7) stepResults.video_creatives_b = { creatives: todas.slice(7) };
  }
  if (hasData(sa.contentKpis)) stepResults.content_kpis = { content_kpis: sa.contentKpis };
  // La parrilla se guarda entera en una columna, pero se genera semana a
  // semana. Al reanudar hay que devolverle a cada sub-paso lo que le
  // corresponde: una semana solo se considera hecha si tiene piezas propias.
  if (hasData(p.content_calendar?.calendar)) {
    const piezas = p.content_calendar.calendar as any[];
    for (const semana of [1, 2, 3, 4]) {
      const deLaSemana = piezas.filter((c) => Number(c?.week) === semana);
      if (deLaSemana.length === 0) continue;
      stepResults[`content_calendar_w${semana}`] = {
        calendar: deLaSemana,
        ...(semana === 1
          ? {
            weeklyThemes: p.content_calendar.weeklyThemes || [],
            leadMagnetDays: p.content_calendar.leadMagnetDays || [],
          }
          : {}),
      };
    }
  }

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
  kiroMasterPrompt: string = KIRO_MASTER_PROMPT_FALLBACK,
): Promise<{ stepId: string; result: any; debugResponses?: any[] }> {
  console.log(`[full-research] Running step: ${stepId}`);

  // Build skills-enhanced system prompt usando KIRO master + research-mode builder
  const skillIds = STEP_SKILLS[stepId] || [];
  const skills = skillIds
    .map(id => getSkillById(id))
    .filter(Boolean) as Skill[];

  // La regla que ordena todo el research unificado. Va en TODOS los pasos,
  // por encima de las skills: la evidencia scrapeada no se discute.
  const kiroConRegla = `${kiroMasterPrompt}\n${REGLA_EVIDENCIA}`;

  const systemPrompt = skills.length > 0
    ? buildCombinedSystemPromptForResearch(skills, kiroConRegla)
    : kiroConRegla;

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
    research_progress: { step: TOTAL_PHASES, total: TOTAL_PHASES, label: "Completado", done: true },
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

  const disparoSiguienteFase = fetch(`${supabaseUrl}/functions/v1/generate-full-research`, {
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
          total: TOTAL_PHASES,
          label: `Error al continuar (${getStepName(STEP_SEQUENCE[nextPhase])})`,
          error: true,
        },
      }).eq("id", productId).then(() => {});
    });

  // Sin esto la cadena de fases se corta sola: al devolver la respuesta, el
  // runtime cancela lo que quede pendiente y este disparo moría a medio
  // salir. Era intermitente —a veces alcanzaba a salir, a veces no— y se veía
  // como "la fase N falló" sin que la IA hubiera fallado en absoluto.
  try {
    EdgeRuntime?.waitUntil?.(disparoSiguienteFase);
  } catch { /* fuera del runtime de Supabase no hay nada que retener */ }

  await new Promise(r => setTimeout(r, 400));
  console.log(`[full-research] Phase ${currentPhase} (${STEP_SEQUENCE[currentPhase]}) done. Chaining to ${nextPhase}.`);
}

// ── PROCESSING LOGIC ──────────────────────────────────────────────────────────
async function processRequest(body: any): Promise<void> {
  // Es `string` y no `string | null` porque el handler ya rechaza con 400 las
  // llamadas sin product_id: aquí siempre hay uno. Tenerlo como nullable solo
  // generaba siete errores de tipos que nadie miraba.
  let productId = "";

  try {
    productId = String(body.product_id ?? "");
    if (!productId) {
      console.error("[full-research] processRequest sin product_id");
      return;
    }
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

    // Cargar KIRO master prompt desde BD (con fallback al hardcodeado)
    const kiroPromptConfig = await getPrompt(supabase as any, "research", "kiro_master");
    const kiroMasterPrompt = kiroPromptConfig.systemPrompt;

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
        research_progress: { step: 0, total: TOTAL_PHASES, label: "Iniciando...", lockId },
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
      // - Base ADN 360: 1500 tokens (research unificado: 9 pasos + parrilla en 4)
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
          research_progress: { step: 0, total: TOTAL_PHASES, label: "Tokens insuficientes", error: true },
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

    // ── La evidencia scrapeada entra al contexto ──────────────────────
    // Es LA fusión: lo que research-engine scrapeó de verdad (competidores con
    // sus números, anuncios corriendo, hooks transcritos del nicho) manda sobre
    // cualquier cosa que la IA pueda imaginar. Sin esto, cada paso volvía a
    // investigar por su cuenta lo que ya estaba pagado y guardado.
    // MULTI-PRODUCTO: la evidencia y el ADN de marca son del CLIENTE, no del
    // producto. El segundo producto del mismo cliente los reutiliza tal cual —
    // no se vuelve a scrapear ni a pagar nada. Solo su ADN de Producto y su
    // estrategia son suyos.
    const clientIdEfectivo = product.client_id ?? (body.client_id ? String(body.client_id) : null);
    const evidencia = await cargarEvidenciaDelMotor(supabase, clientIdEfectivo);

    if (evidencia) {
      const otrosProductos = await contarProductosDelCliente(supabase, clientIdEfectivo, productId);
      console.log(
        `[step 3/6] Evidencia del motor: ${evidencia.competidores} competidores, ` +
        `${evidencia.ads} anuncios, ADN Viral ${evidencia.tieneViral ? "sí" : "no"}` +
        `${evidencia.parcial ? " (investigación PARCIAL)" : ""}` +
        (otrosProductos > 0
          ? ` — REUSADA de nivel cliente, compartida con otros ${otrosProductos} producto(s): 0 scrapes nuevos`
          : ""),
      );
    } else {
      console.log(`[step 3/6] Sin evidencia del motor: el research corre solo con lo declarado`);
    }

    const baseContext = buildBaseContext(clientDna, productDna, product.name || "Producto", evidencia);
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
        research_generated_at: null,
        research_progress: { step: 0, total: TOTAL_PHASES, label: "Iniciando regeneracion..." },
      }).eq("id", productId);
    }

    // ── Smart phase jump on resume ─────────────────────────────────────
    if (phase === 0 && !isFreshStart) {
      const firstPending = STEP_SEQUENCE.findIndex(id => !stepResults[id]);
      if (firstPending > 0) {
        console.log(`[full-research] Smart resume: jumping to phase ${firstPending} (${STEP_SEQUENCE[firstPending]})`);
        const disparoSalto = fetch(`${supabaseUrl}/functions/v1/generate-full-research`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${supabaseKey}` },
          body: JSON.stringify({ ...body, phase: firstPending, _internal: true }),
        }).catch(() => {});
        // Mismo motivo que en el encadenado de fases: si el runtime cancela
        // este disparo, la reanudación no arranca y el producto se queda
        // quieto sin que nadie sepa por qué.
        try {
          EdgeRuntime?.waitUntil?.(disparoSalto);
        } catch { /* fuera del runtime de Supabase */ }
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
      research_progress: { step: phase, total: TOTAL_PHASES, label: getStepName(stepId), stepId },
    }).eq("id", productId);

    console.log(`[step 5/6] Running AI: phase=${phase} step="${stepId}"`);
    const t0 = Date.now();

    // ── Run the step ──────────────────────────────────────────────────
    // Deep Research solo se activa en pasos donde aporta valor real (datos competitivos/precios/anuncios)
    const DEEP_RESEARCH_STEPS = new Set([
      "market_overview",
      "competitors",
      "sales_angles",
    ]);
    // Distribucion del budget de scraping (max 8 URLs por activacion):
    // 5 competidores top + 1 pricing + 1 ad library + 1 landing inspiracion = 8
    const FIRECRAWL_URLS_PER_STEP: Record<string, number> = {
      competitors: 5,
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
    const { result, debugResponses } = await runStep(stepId, baseContext, targetMarket, stepResults, useDeepResearch, firecrawlBudget, kiroMasterPrompt);
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
          total: TOTAL_PHASES,
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
        total: TOTAL_PHASES,
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
          // castPlaybook y executiveSummary ya no se generan (salieron del
          // research el 2026-08-13). Lo de productos viejos se conserva tal cual.
          esferaInsights: result.esferaInsights || {},
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

      // Las dos mitades de las ideas de contenido se acumulan en la misma
      // lista: para quien las lee (UI, PDF, portal) sigue siendo un solo lote.
      case "video_creatives_a":
      case "video_creatives_b": {
        const creData = result.creatives || result;
        const creList = Array.isArray(creData) ? creData : (creData?.creatives || []);
        const previas = stepId === "video_creatives_b"
          ? (Array.isArray(salesAnglesData.videoCreatives) ? salesAnglesData.videoCreatives : [])
          : [];
        salesAnglesData = {
          ...salesAnglesData,
          videoCreatives: [...previas, ...creList],
          generatedAt: now,
        };
        update.sales_angles_data = salesAnglesData;
        break;
      }

      case "content_kpis": {
        salesAnglesData = {
          ...salesAnglesData,
          contentKpis: result.content_kpis || result || [],
          generatedAt: now,
        };
        update.sales_angles_data = salesAnglesData;
        break;
      }

      // ── La parrilla se arma semana a semana ────────────────────────────
      // Cada sub-paso trae 7-9 piezas y se ACUMULAN sobre lo ya guardado, de
      // modo que el JSON final tiene la misma forma que cuando era un solo
      // paso de 24.000 tokens: { calendar: [...28-35], weeklyThemes, leadMagnetDays }.
      // Se acumula leyendo lo que hay en BD y no en memoria porque cada semana
      // corre en una invocación distinta de la función.
      case "content_calendar_w1":
      case "content_calendar_w2":
      case "content_calendar_w3":
      case "content_calendar_w4": {
        const semana = Number(stepId.slice(-1));
        const piezasNuevas = Array.isArray(result.calendar) ? result.calendar : [];

        const previo = (await readColumnFromDB(supabase, productId, "content_calendar")) || {};
        const piezasPrevias = Array.isArray(previo.calendar) ? previo.calendar : [];

        // Reintentos y reanudaciones: se descartan las piezas de ESTA semana
        // que ya estuvieran guardadas, para no duplicar la parrilla.
        const sinEstaSemana = piezasPrevias.filter((c: any) => Number(c?.week) !== semana);

        update.content_calendar = {
          ...previo,
          calendar: [...sinEstaSemana, ...piezasNuevas],
          // Los temas y los días de lead magnet los define la semana 1.
          weeklyThemes: result.weeklyThemes || previo.weeklyThemes || [],
          leadMagnetDays: result.leadMagnetDays || previo.leadMagnetDays || [],
          generatedAt: now,
        };
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
          research_progress: { step: 0, total: TOTAL_PHASES, label: `Error: ${message.substring(0, 100)}`, error: true },
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

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const authHeader = req.headers.get("Authorization");
  // El self-invoke entre phases siempre manda el service role key como Bearer.
  // body._internal es controlable por cualquiera, por eso NUNCA se confía solo en ese flag.
  const isTrustedInternalCall = !!authHeader && authHeader === `Bearer ${supabaseKey}`;

  // Internal call (chaining entre phases, ya validado en el primer hop externo)
  if (body._internal === true && isTrustedInternalCall) {
    await processRequest(body);
    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // External call: validar caller + ownership del producto ANTES de disparar nada
  // (antes: organization_id/user_id/is_client_user se tomaban del body sin validar —
  // cualquiera sin login podía correr research de 21 fases para cualquier product_id
  // quemando tokens de otra org).
  const supabaseAdmin = createClient(supabaseUrl, supabaseKey);
  const supabaseUser = createClient(
    supabaseUrl,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader ?? "" } } },
  );

  const { data: { user: callerUser } = { user: null } } = authHeader
    ? await supabaseUser.auth.getUser()
    : { data: { user: null } };

  if (!callerUser) {
    return new Response(
      JSON.stringify({ success: false, error: "unauthorized" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const { data: product } = await supabaseAdmin
    .from("products")
    .select("id, client_id")
    .eq("id", body.product_id)
    .maybeSingle();

  if (!product) {
    return new Response(
      JSON.stringify({ success: false, error: "product not found" }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  let realOrgId: string | null = null;
  let ownershipOk = false;

  if (product.client_id) {
    const { data: clientRow } = await supabaseAdmin
      .from("clients")
      .select("id, organization_id, user_id")
      .eq("id", product.client_id)
      .maybeSingle();

    realOrgId = clientRow?.organization_id ?? null;

    if (clientRow?.user_id === callerUser.id) {
      ownershipOk = true;
    } else {
      const { data: clientUserRow } = await supabaseAdmin
        .from("client_users")
        .select("id")
        .eq("client_id", product.client_id)
        .eq("user_id", callerUser.id)
        .maybeSingle();
      if (clientUserRow) ownershipOk = true;
    }
  }

  if (!ownershipOk && realOrgId) {
    const membershipRejection = await assertOrgMembership(req, supabaseAdmin, callerUser.id, realOrgId);
    ownershipOk = !membershipRejection;
  }

  if (!ownershipOk) {
    return new Response(
      JSON.stringify({ success: false, error: "forbidden: no access to this product" }),
      { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // Fire-and-forget self-invocation con user_id/organization_id derivados server-side
  // (nunca los valores originales del body — esos siguen sin ser confiables).
  const disparoArranque = fetch(`${supabaseUrl}/functions/v1/generate-full-research`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${supabaseKey}`,
    },
    body: JSON.stringify({
      ...body,
      user_id: callerUser.id,
      organization_id: realOrgId,
      phase: body.phase ?? 0,
      _internal: true,
    }),
  }).catch(() => {});

  // El más crítico de los tres disparos del archivo: este ARRANCA la fase 0.
  // Justo debajo se responde 202, y si el runtime cancela la petición antes
  // de que salga, la investigación no empieza nunca y `research_progress` se
  // queda en null — indistinguible de "no pasó nada". Quien vigila la etapa
  // lee ese null como "todavía sin novedades" y no avisa a nadie, así que el
  // cliente se queda esperando una estrategia que jamás arrancó.
  try {
    EdgeRuntime?.waitUntil?.(disparoArranque);
  } catch { /* fuera del runtime de Supabase no hay nada que retener */ }

  return new Response(
    JSON.stringify({ success: true, status: "processing" }),
    { status: 202, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
