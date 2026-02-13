// ============================================
// generate-full-research - ADN Recargado
// Combines Client DNA + Product DNA → Full 12-step research
// Fills ALL product strategy tabs
// ============================================

import { createClient } from "npm:@supabase/supabase-js@2.46.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ── 12 research steps ──────────────────────────────────────────────────────
const RESEARCH_STEPS = [
  { id: "market_overview", name: "Panorama de Mercado" },
  { id: "jtbd", name: "Jobs To Be Done" },
  { id: "pains_desires", name: "Dolores y Deseos" },
  { id: "competitors", name: "Analisis de Competencia" },
  { id: "avatars", name: "Avatares de Cliente" },
  { id: "differentiation", name: "Diferenciacion y ESFERA" },
  { id: "sales_angles", name: "Angulos de Venta" },
  { id: "puv_transformation", name: "PUV y Transformacion" },
  { id: "lead_magnets", name: "Lead Magnets" },
  { id: "video_creatives", name: "Creativos de Video" },
  { id: "content_calendar", name: "Parrilla de Contenido" },
  { id: "launch_strategy", name: "Estrategia de Lanzamiento" },
];

// ── Token limits per step ──────────────────────────────────────────────────
const TOKEN_MAP: Record<string, number> = {
  market_overview: 6000,
  jtbd: 5000,
  pains_desires: 7000,
  competitors: 8000,
  avatars: 8000,
  differentiation: 8000,
  sales_angles: 8000,
  puv_transformation: 6000,
  lead_magnets: 5000,
  video_creatives: 8000,
  content_calendar: 16000,
  launch_strategy: 10000,
};

// ── JSON repair ────────────────────────────────────────────────────────────
function repairJsonForParse(str: string): string {
  let s = str
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
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
    properties: { competitors: { type: "array", minItems: 8, maxItems: 10, items: { type: "object", additionalProperties: false, required: ["name","promise","price","strengths","weaknesses"],
      properties: { name: { type: "string" }, website: { type: "string" }, instagram: { type: "string" }, tiktok: { type: "string" }, promise: { type: "string" }, differentiator: { type: "string" }, price: { type: "string" }, tone: { type: "string" }, channels: { type: "array", items: { type: "string" } }, strengths: { type: "array", minItems: 2, items: { type: "string" } }, weaknesses: { type: "array", minItems: 2, items: { type: "string" } } }
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
    type: "object", additionalProperties: false, required: ["differentiation","esferaInsights","executiveSummary"],
    properties: {
      differentiation: { type: "object", additionalProperties: false, required: ["repeatedMessages","positioningOpportunities"], properties: {
        repeatedMessages: { type: "array", minItems: 4, maxItems: 6, items: { type: "object", properties: { message: { type: "string" }, opportunity: { type: "string" } } } },
        poorlyAddressedPains: { type: "array", minItems: 4, maxItems: 6, items: { type: "object", properties: { pain: { type: "string" }, opportunity: { type: "string" }, howToUse: { type: "string" } } } },
        positioningOpportunities: { type: "array", minItems: 4, maxItems: 6, items: { type: "object", properties: { opportunity: { type: "string" }, why: { type: "string" }, execution: { type: "string" } } } },
        unexploitedEmotions: { type: "array", minItems: 3, maxItems: 5, items: { type: "object", properties: { emotion: { type: "string" }, howToUse: { type: "string" } } } },
      }},
      esferaInsights: { type: "object", additionalProperties: false, properties: {
        enganchar: { type: "object", properties: { marketDominance: { type: "string" }, saturated: { type: "string" }, opportunities: { type: "array", items: { type: "string" } }, hookTypes: { type: "array", items: { type: "string" } }, platforms: { type: "array", items: { type: "string" } }, contentFormats: { type: "array", items: { type: "string" } } } },
        solucion: { type: "object", properties: { currentPromises: { type: "string" }, unresolvedObjections: { type: "string" }, trustOpportunities: { type: "array", items: { type: "string" } }, educationAngles: { type: "array", items: { type: "string" } }, proofTypes: { type: "array", items: { type: "string" } } } },
        remarketing: { type: "object", properties: { existingProof: { type: "string" }, gaps: { type: "string" }, decisionMessages: { type: "array", items: { type: "string" } }, urgencyTactics: { type: "array", items: { type: "string" } }, objectionHandling: { type: "array", items: { type: "string" } }, touchpointSequence: { type: "array", items: { type: "string" } } } },
        fidelizar: { type: "object", properties: { commonErrors: { type: "string" }, communityOpportunities: { type: "array", items: { type: "string" } }, retentionStrategies: { type: "array", items: { type: "string" } }, referralAngles: { type: "array", items: { type: "string" } }, postPurchaseContent: { type: "array", items: { type: "string" } } } },
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
    properties: { creatives: { type: "array", minItems: 23, maxItems: 27, items: { type: "object", additionalProperties: false, required: ["number","title","idea","structure","format","esferaPhase"],
      properties: { number: { type: "number" }, angle: { type: "string" }, avatar: { type: "string" }, title: { type: "string" }, idea: { type: "string" },
        structure: { type: "object", properties: { hook: { type: "string" }, body: { type: "string" }, climax: { type: "string" }, cta: { type: "string" } } },
        format: { type: "string" }, esferaPhase: { type: "string", enum: ["enganchar","solucion","remarketing","fidelizar"] }, duration: { type: "string" }, platform: { type: "string" }, productionNotes: { type: "string" },
      }
    }}},
  },
  content_calendar: {
    type: "object", additionalProperties: false, required: ["calendar"],
    properties: {
      calendar: { type: "array", minItems: 28, maxItems: 35, items: { type: "object", additionalProperties: false, required: ["week","day","dayLabel","platform","format","pillar","title","hook","description","copy","cta","hashtags","esferaPhase","avatar","productionNotes"],
        properties: { week: { type: "number" }, day: { type: "number" }, dayLabel: { type: "string" }, platform: { type: "string" }, format: { type: "string" }, pillar: { type: "string", enum: ["educativo","emocional","autoridad","venta","comunidad"] }, title: { type: "string" }, hook: { type: "string" }, description: { type: "string" }, copy: { type: "string" }, cta: { type: "string" }, hashtags: { type: "array", minItems: 3, maxItems: 5, items: { type: "string" } }, esferaPhase: { type: "string", enum: ["enganchar","solucion","remarketing","fidelizar"] }, avatar: { type: "string" }, productionNotes: { type: "string" } }
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
};

// ── Perplexity call with Gemini fallback ────────────────────────────────────
async function callAI(
  systemPrompt: string,
  userPrompt: string,
  schema: any,
  schemaName: string,
  maxTokens: number,
): Promise<any> {
  const perplexityKey = Deno.env.get("PERPLEXITY_API_KEY");
  const geminiKey = Deno.env.get("GEMINI_API_KEY");

  // Try Perplexity first
  if (perplexityKey) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 120000);
      const res = await fetch("https://api.perplexity.ai/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${perplexityKey}`, "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          model: "sonar-pro",
          max_tokens: maxTokens,
          temperature: 0.2,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          response_format: { type: "json_schema", json_schema: { name: schemaName, schema } },
        }),
      });
      clearTimeout(timeout);
      if (res.ok) {
        const data = await res.json();
        const content = (data.choices?.[0]?.message?.content || "").toString().trim();
        return JSON.parse(repairJsonForParse(content));
      }
      console.warn(`[full-research] Perplexity HTTP ${res.status} for ${schemaName}, falling back to Gemini`);
    } catch (err: any) {
      console.warn(`[full-research] Perplexity failed for ${schemaName}:`, err.message);
    }
  }

  // Gemini fallback
  if (!geminiKey) throw new Error("No AI API key available");
  const res = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
    {
      method: "POST",
      headers: { Authorization: `Bearer ${geminiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gemini-2.5-flash",
        max_tokens: maxTokens,
        temperature: 0.2,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    },
  );
  if (!res.ok) throw new Error(`Gemini HTTP ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const content = (data.choices?.[0]?.message?.content || "").toString().trim();
  return JSON.parse(repairJsonForParse(content));
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

  // Emotional analysis from Client DNA
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

  // Wizard transcription
  if (pd.transcription) {
    parts.push(`\nTRANSCRIPCION DEL EMPRENDEDOR:\n${pd.transcription.substring(0, 2000)}`);
  }

  // Audience locations from client DNA
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
- BUSCA competidores REALES con presencia online VERIFICABLE
- Incluye tanto competidores directos como indirectos
- Analiza su posicionamiento, no solo lo que venden
- Se especifico con URLs y precios reales
- INTEGRA los competidores ya identificados en el ADN de producto para profundizar

Lista 8-10 COMPETIDORES REALES con: nombre, website, instagram, tiktok, promesa de marketing, diferenciador, tono, canales, precios, fortalezas (3+), debilidades (3+).`,

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

    differentiation: `Realiza un ANALISIS ESTRATEGICO DE DIFERENCIACION usando el framework ESFERA.

${baseContext}

COMPETIDORES ANALIZADOS:
${prevCompetitors?.competitors?.slice(0, 5).map((c: any) => `- ${c.name}: ${c.promise} | Debilidades: ${c.weaknesses?.join(", ")}`).join("\n") || "N/A"}

AVATARES DEFINIDOS:
${prevAvatars?.avatars?.map((a: any) => `- ${a.name}: ${a.situation?.currentFeeling || "Sin descripcion"}`).join("\n") || "N/A"}

INSTRUCCIONES CRITICAS:
- Identifica GAPS reales en el mercado
- Cada oportunidad debe ser accionable
- Conecta la diferenciacion con los avatares
- Framework ESFERA: Enganchar > Solucion > Remarketing > Fidelizar
- INTEGRA la identidad de marca y voz del ADN de marca

Genera: Analisis de diferenciacion (mensajes saturados, dolores mal comunicados, oportunidades de posicionamiento, emociones no explotadas), Insights ESFERA detallados (enganchar/solucion/remarketing/fidelizar), Resumen ejecutivo (marketSummary, opportunityScore, keyInsights, psychologicalDrivers, immediateActions, quickWins, risksToAvoid, finalRecommendation).`,

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

    video_creatives: `Crea 25 IDEAS DE CONTENIDO con guiones resumidos por fase ESFERA.

${baseContext}

ANGULOS DISPONIBLES:
${prevSales?.salesAngles?.slice(0, 12).map((a: any) => `- [${a.type}] "${a.hookExample}" > Avatar: ${a.avatar}`).join("\n") || "N/A"}

AVATARES:
${prevAvatars?.avatars?.map((a: any) => a.name).join(", ") || "N/A"}

INSTRUCCIONES CRITICAS:
- PRIORIZAR formatos faciles de producir: Carruseles, Reels con texto, Stories, Posts estaticos, Infografias, Memes, Threads
- Maximo 5 de 25 deben ser videos con persona hablando
- 7 para ENGANCHAR, 7 para SOLUCION, 6 para REMARKETING, 5 para FIDELIZAR
- INTEGRA las plataformas recomendadas del ADN de marca

Cada creativo con: number, angle, avatar, title (max 15 palabras), idea (3-4 oraciones), structure (hook/body/climax/cta), format, esferaPhase, duration, platform, productionNotes.`,

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

28-35 piezas con: week, day, dayLabel, platform, format, pillar, title, hook, description, copy (listo), cta, hashtags, esferaPhase, avatar, productionNotes. Ademas: 4 weeklyThemes y 3 leadMagnetDays.`,

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
  };

  return prompts[stepId] || "";
}


// (reconstructPrevResults and buildIncrementalUpdate removed —
//  sequential loop accumulates results in memory, no need to re-fetch from DB)

// ── MAIN HANDLER — runs ALL 12 steps sequentially in one invocation ──────────
// Same proven pattern as product-research. No self-invocation needed.
// Key optimization: minimal SELECT to avoid 3MB+ product rows hitting CPU limit.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  let productId: string | null = null;

  try {
    const body = await req.json();
    productId = body.product_id;

    if (!productId) {
      return new Response(
        JSON.stringify({ success: false, error: "product_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    console.log(`[full-research] Starting 12-step research for product: ${productId}`);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // ── 1. Fetch ONLY lightweight product columns (avoid 3MB+ rows) ───
    const { data: product, error: productErr } = await supabase
      .from("products")
      .select("id, name, client_id, brief_data")
      .eq("id", productId)
      .single();
    if (productErr || !product) throw new Error(`Product not found: ${productErr?.message}`);

    // ── 2. Fetch DNAs for context ─────────────────────────────────────
    const clientId = product.client_id;
    const productDnaId = (product.brief_data as any)?.product_dna_id;

    let productDna: any = null;
    if (productDnaId) {
      const { data } = await supabase
        .from("product_dna")
        .select("*")
        .eq("id", productDnaId)
        .maybeSingle();
      productDna = data;
    }

    let clientDna: any = null;
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
    }

    const baseContext = buildBaseContext(clientDna, productDna, product.name || "Producto");
    const targetMarket = getTargetMarket(clientDna, productDna);

    const systemPrompt =
      "Eres un experto en investigacion de mercado. Responde SOLO en espanol. Devuelve UNICAMENTE JSON valido, sin explicaciones, sin markdown, sin texto adicional.";

    // ── 3. Run all 12 steps sequentially ──────────────────────────────
    // Results accumulate in memory — no need to re-fetch from DB.
    const stepResults: Record<string, any> = {};
    const completedSteps: string[] = [];

    // In-memory column accumulators (avoid re-fetching large JSONB)
    let marketResearch: any = {};
    let competitorAnalysis: any = {};
    let salesAnglesData: any = {};

    for (let i = 0; i < RESEARCH_STEPS.length; i++) {
      const step = RESEARCH_STEPS[i];

      console.log(`[full-research] === Step ${i + 1}/12: ${step.name} ===`);

      // Update progress (starting this step)
      await supabase
        .from("products")
        .update({
          research_progress: {
            step: i,
            total: 12,
            label: step.name,
            stepId: step.id,
          },
        })
        .eq("id", productId);

      // Build prompt using in-memory previous results
      const prompt = getStepPrompt(step.id, baseContext, targetMarket, stepResults);
      const schema = SCHEMAS[step.id];
      const maxTokens = TOKEN_MAP[step.id] || 6000;

      let result: any = null;
      try {
        result = await callAI(systemPrompt, prompt, schema, step.id, maxTokens);
        console.log(`[full-research] Step ${i + 1} OK`);
      } catch (err: any) {
        console.error(`[full-research] Step ${i + 1} (${step.id}) AI failed:`, err.message);
      }

      // Save results incrementally
      if (result) {
        stepResults[step.id] = result;
        completedSteps.push(step.id);

        const now = new Date().toISOString();
        const update: Record<string, any> = {
          updated_at: now,
          research_progress: {
            step: i + 1,
            total: 12,
            label: step.name,
            stepId: step.id,
          },
        };

        switch (step.id) {
          case "market_overview":
            marketResearch = { market_overview: result.market_overview, generatedAt: now };
            update.market_research = marketResearch;
            break;

          case "jtbd":
            marketResearch = { ...marketResearch, jtbd: result.jtbd, generatedAt: now };
            update.market_research = marketResearch;
            update.ideal_avatar = JSON.stringify({
              jtbd: result.jtbd,
              summary: result.jtbd?.functional,
            });
            break;

          case "pains_desires":
            marketResearch = {
              ...marketResearch,
              jtbd: { ...(marketResearch.jtbd || {}), ...result },
              generatedAt: now,
            };
            update.market_research = marketResearch;
            break;

          case "competitors":
            competitorAnalysis = { competitors: result.competitors, generatedAt: now };
            update.competitor_analysis = competitorAnalysis;
            break;

          case "avatars":
            update.avatar_profiles = { profiles: result.avatars, generatedAt: now };
            break;

          case "differentiation":
            competitorAnalysis = { ...competitorAnalysis, differentiation: result.differentiation, generatedAt: now };
            update.competitor_analysis = competitorAnalysis;
            update.content_strategy = {
              esferaInsights: result.esferaInsights || {},
              executiveSummary: result.executiveSummary || {},
              generatedAt: now,
            };
            break;

          case "sales_angles":
            salesAnglesData = { angles: result.salesAngles, generatedAt: now };
            update.sales_angles_data = salesAnglesData;
            update.sales_angles = (result.salesAngles || [])
              .map((a: any) => a.hookExample || a.angle?.substring(0, 80))
              .filter(Boolean)
              .slice(0, 20);
            break;

          case "puv_transformation":
            salesAnglesData = { ...salesAnglesData, puv: result.puv, transformation: result.transformation, generatedAt: now };
            update.sales_angles_data = salesAnglesData;
            break;

          case "lead_magnets":
            salesAnglesData = { ...salesAnglesData, leadMagnets: result.leadMagnets, generatedAt: now };
            update.sales_angles_data = salesAnglesData;
            break;

          case "video_creatives":
            salesAnglesData = { ...salesAnglesData, videoCreatives: result.creatives, generatedAt: now };
            update.sales_angles_data = salesAnglesData;
            break;

          case "content_calendar":
            update.content_calendar = { ...result, generatedAt: now };
            break;

          case "launch_strategy":
            update.launch_strategy = { ...result, generatedAt: now };
            break;
        }

        const { error: updateErr } = await supabase
          .from("products")
          .update(update)
          .eq("id", productId);

        if (updateErr) {
          console.error(`[full-research] Save error step ${i + 1}:`, updateErr.message);
        }
      } else {
        // Step failed — update progress and continue
        await supabase
          .from("products")
          .update({
            research_progress: {
              step: i + 1,
              total: 12,
              label: `${step.name} (omitido)`,
              stepId: step.id,
            },
          })
          .eq("id", productId);
      }

      // Small delay between API calls to avoid rate limiting
      if (i < RESEARCH_STEPS.length - 1) {
        await new Promise((r) => setTimeout(r, 1000));
      }
    }

    // ── 4. Finalize ──────────────────────────────────────────────────
    const briefData = {
      ...(product.brief_data || {}),
      product_dna_id: productDnaId,
      client_dna_id: clientDna?.id || null,
      research_source: "adn_recargado",
      research_version: 2,
    };

    await supabase
      .from("products")
      .update({
        research_generated_at: new Date().toISOString(),
        research_progress: { step: 12, total: 12, label: "Completado", done: true },
        brief_status: "completed",
        brief_completed_at: new Date().toISOString(),
        brief_data: briefData,
      })
      .eq("id", productId);

    console.log(`[full-research] All 12 steps complete for product ${productId}. Completed: ${completedSteps.join(", ")}`);

    return new Response(
      JSON.stringify({ success: true, completedSteps, totalSteps: 12 }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error procesando solicitud";
    console.error("[full-research] Error:", message);

    // Mark progress as failed so frontend stops polling
    if (productId) {
      try {
        const sb = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
        );
        await sb
          .from("products")
          .update({
            research_progress: {
              step: 0,
              total: 12,
              label: `Error: ${message.substring(0, 100)}`,
              error: true,
            },
          })
          .eq("id", productId);
      } catch { /* best-effort */ }
    }

    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
