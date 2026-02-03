import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// 10 pasos granulares para evitar truncamiento por límite de tokens
const RESEARCH_STEPS = [
  { id: "market_overview", name: "Panorama de Mercado", dependsOn: [] as string[] },
  { id: "jtbd", name: "Jobs To Be Done", dependsOn: ["market_overview"] },
  { id: "pains_desires", name: "Dolores y Deseos", dependsOn: ["jtbd"] },
  { id: "competitors", name: "Análisis de Competencia", dependsOn: ["market_overview"] },
  { id: "avatars", name: "Avatares de Cliente", dependsOn: ["pains_desires", "competitors"] },
  { id: "differentiation", name: "Diferenciación y ESFERA", dependsOn: ["avatars", "competitors"] },
  { id: "sales_angles", name: "Ángulos de Venta", dependsOn: ["avatars", "differentiation"] },
  { id: "puv_transformation", name: "PUV y Transformación", dependsOn: ["sales_angles"] },
  { id: "lead_magnets", name: "Lead Magnets", dependsOn: ["avatars", "pains_desires"] },
  { id: "video_creatives", name: "Creativos de Video", dependsOn: ["sales_angles", "differentiation"] },
];

// Function to fetch document content from URL
async function fetchDocumentContent(url: string): Promise<string> {
  try {
    if (url.includes('drive.google.com')) {
      let fileId = '';
      const fileMatch = url.match(/\/file\/d\/([^\/]+)/);
      if (fileMatch) fileId = fileMatch[1];
      const openMatch = url.match(/[?&]id=([^&]+)/);
      if (openMatch) fileId = openMatch[1];
      const docsMatch = url.match(/\/document\/d\/([^\/]+)/);
      if (docsMatch) fileId = docsMatch[1];

      if (fileId) {
        const exportUrl = `https://docs.google.com/document/d/${fileId}/export?format=txt`;
        console.log('[fetchDocumentContent] Trying Google Docs export:', exportUrl);
        const response = await fetch(exportUrl, { headers: { 'Accept': 'text/plain' } });
        if (response.ok) {
          const text = await response.text();
          return text.substring(0, 12000);
        }
      }
    }

    const response = await fetch(url, {
      headers: {
        'Accept': 'text/plain, text/html, application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; ProductResearch/1.0)'
      }
    });

    if (!response.ok) return '';

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('text/plain') || contentType.includes('text/html')) {
      const text = await response.text();
      const cleanText = text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
      return cleanText.substring(0, 12000);
    }
    if (contentType.includes('application/json')) {
      const json = await response.json();
      return JSON.stringify(json, null, 2).substring(0, 12000);
    }
    return '';
  } catch (error) {
    console.error("[fetchDocumentContent] Error:", error);
    return "";
  }
}

function repairJsonForParse(str: string): string {
  let s = str.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim();
  // Remove markdown code blocks if present
  s = s.replace(/^```json?\s*/i, '').replace(/\s*```$/i, '');

  try {
    JSON.parse(s);
    return s;
  } catch {
    s = s.replace(/,\s*$/, "");
    let open = 0, bracket = 0;
    for (let i = 0; i < s.length; i++) {
      const c = s[i];
      if (c === "{") open++;
      else if (c === "}") open--;
      else if (c === "[") bracket++;
      else if (c === "]") bracket--;
    }
    while (bracket > 0) { s += "]"; bracket--; }
    while (open > 0) { s += "}"; open--; }
    return s;
  }
}

/** Ejecuta un paso del research usando Perplexity con prompts optimizados */
async function executeResearchStep(
  stepId: string,
  baseContext: string,
  targetMarket: string,
  previousResults: Record<string, unknown>,
  perplexityApiKey: string
): Promise<{ success: boolean; result?: unknown; error?: string }> {

  const runPerplexity = async (prompt: string, schema: any, schemaName: string, maxTokens = 4000) => {
    console.log(`[product-research] Running step: ${schemaName} with ${maxTokens} tokens`);

    const res = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${perplexityApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "sonar-pro",
        max_tokens: maxTokens,
        temperature: 0.2,
        messages: [
          {
            role: "system",
            content: "Eres un experto en investigación de mercado. Responde SOLO en español. Devuelve ÚNICAMENTE JSON válido, sin explicaciones, sin markdown, sin texto adicional."
          },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_schema", json_schema: { name: schemaName, schema } },
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Perplexity HTTP ${res.status}: ${errorText}`);
    }

    const data = await res.json();
    const content = (data.choices?.[0]?.message?.content || "").toString();
    console.log(`[product-research] ${schemaName} response length: ${content.length}`);

    const repaired = repairJsonForParse(content.trim());
    return JSON.parse(repaired);
  };

  // Schemas específicos para cada paso
  const schemas: Record<string, any> = {
    market_overview: {
      type: "object",
      additionalProperties: false,
      required: ["market_overview"],
      properties: {
        market_overview: {
          type: "object",
          additionalProperties: false,
          required: ["marketSize", "growthTrend", "marketState", "macroVariables", "awarenessLevel", "summary", "opportunities", "threats"],
          properties: {
            marketSize: { type: "string", description: "Tamaño del mercado con cifras" },
            growthTrend: { type: "string", description: "Tendencia de crecimiento con %" },
            marketState: { type: "string", enum: ["crecimiento", "saturacion", "declive"] },
            marketStateExplanation: { type: "string" },
            macroVariables: { type: "array", minItems: 5, maxItems: 7, items: { type: "string" } },
            awarenessLevel: { type: "string", description: "Nivel de conciencia Eugene Schwartz" },
            summary: { type: "string", description: "Resumen ejecutivo 2-3 párrafos" },
            opportunities: { type: "array", minItems: 3, maxItems: 5, items: { type: "string" } },
            threats: { type: "array", minItems: 3, maxItems: 5, items: { type: "string" } },
          },
        },
      },
    },

    jtbd: {
      type: "object",
      additionalProperties: false,
      required: ["jtbd"],
      properties: {
        jtbd: {
          type: "object",
          additionalProperties: false,
          required: ["functional", "emotional", "social", "insights"],
          properties: {
            functional: { type: "string", description: "JTBD funcional detallado" },
            emotional: { type: "string", description: "JTBD emocional detallado" },
            social: { type: "string", description: "JTBD social detallado" },
            insights: { type: "array", minItems: 8, maxItems: 12, items: { type: "string" } },
          },
        },
      },
    },

    pains_desires: {
      type: "object",
      additionalProperties: false,
      required: ["pains", "desires", "objections"],
      properties: {
        pains: {
          type: "array",
          minItems: 10,
          maxItems: 10,
          items: {
            type: "object",
            additionalProperties: false,
            required: ["pain", "why", "impact"],
            properties: {
              pain: { type: "string" },
              why: { type: "string" },
              impact: { type: "string" }
            }
          }
        },
        desires: {
          type: "array",
          minItems: 10,
          maxItems: 10,
          items: {
            type: "object",
            additionalProperties: false,
            required: ["desire", "emotion", "idealState"],
            properties: {
              desire: { type: "string" },
              emotion: { type: "string" },
              idealState: { type: "string" }
            }
          }
        },
        objections: {
          type: "array",
          minItems: 10,
          maxItems: 10,
          items: {
            type: "object",
            additionalProperties: false,
            required: ["objection", "belief", "counter"],
            properties: {
              objection: { type: "string" },
              belief: { type: "string" },
              counter: { type: "string" }
            }
          }
        },
      },
    },

    competitors: {
      type: "object",
      additionalProperties: false,
      required: ["competitors"],
      properties: {
        competitors: {
          type: "array",
          minItems: 8,
          maxItems: 10,
          items: {
            type: "object",
            additionalProperties: false,
            required: ["name", "promise", "price", "strengths", "weaknesses"],
            properties: {
              name: { type: "string" },
              website: { type: "string" },
              instagram: { type: "string" },
              tiktok: { type: "string" },
              promise: { type: "string" },
              differentiator: { type: "string" },
              price: { type: "string" },
              tone: { type: "string" },
              channels: { type: "array", items: { type: "string" } },
              strengths: { type: "array", minItems: 2, items: { type: "string" } },
              weaknesses: { type: "array", minItems: 2, items: { type: "string" } },
            }
          },
        },
      },
    },

    avatars: {
      type: "object",
      additionalProperties: false,
      required: ["avatars"],
      properties: {
        avatars: {
          type: "array",
          minItems: 5,
          maxItems: 5,
          items: {
            type: "object",
            additionalProperties: false,
            required: ["name", "age", "situation", "drivers", "phrases"],
            properties: {
              name: { type: "string", description: "Nombre simbólico memorable" },
              age: { type: "string", description: "Edad y contexto de vida" },
              situation: { type: "string", description: "Situación actual ANTES del producto" },
              awarenessLevel: { type: "string" },
              drivers: { type: "string", description: "3 drivers psicológicos principales" },
              biases: { type: "string", description: "3 sesgos cognitivos" },
              objections: { type: "string", description: "3 objeciones específicas" },
              phrases: { type: "array", minItems: 4, maxItems: 6, items: { type: "string" } },
              goals: { type: "string" },
              contentConsumption: { type: "string" }
            }
          }
        },
      },
    },

    differentiation: {
      type: "object",
      additionalProperties: false,
      required: ["differentiation", "esferaInsights", "executiveSummary"],
      properties: {
        differentiation: {
          type: "object",
          additionalProperties: false,
          required: ["repeatedMessages", "positioningOpportunities"],
          properties: {
            repeatedMessages: { type: "array", minItems: 4, maxItems: 6, items: {
              type: "object",
              properties: { message: { type: "string" }, opportunity: { type: "string" } }
            }},
            poorlyAddressedPains: { type: "array", minItems: 4, maxItems: 6, items: {
              type: "object",
              properties: { pain: { type: "string" }, opportunity: { type: "string" }, howToUse: { type: "string" } }
            }},
            positioningOpportunities: { type: "array", minItems: 4, maxItems: 6, items: {
              type: "object",
              properties: { opportunity: { type: "string" }, why: { type: "string" }, execution: { type: "string" } }
            }},
            unexploitedEmotions: { type: "array", minItems: 3, maxItems: 5, items: {
              type: "object",
              properties: { emotion: { type: "string" }, howToUse: { type: "string" } }
            }},
          }
        },
        esferaInsights: {
          type: "object",
          additionalProperties: false,
          properties: {
            enganchar: { type: "object", additionalProperties: true },
            solucion: { type: "object", additionalProperties: true },
            remarketing: { type: "object", additionalProperties: true },
            fidelizar: { type: "object", additionalProperties: true },
          }
        },
        executiveSummary: {
          type: "object",
          additionalProperties: false,
          properties: {
            marketSummary: { type: "string" },
            keyInsights: { type: "array", minItems: 3, maxItems: 5, items: { type: "object", additionalProperties: true } },
            immediateActions: { type: "array", minItems: 3, maxItems: 3, items: { type: "object", additionalProperties: true } },
            finalRecommendation: { type: "string" }
          }
        }
      },
    },

    sales_angles: {
      type: "object",
      additionalProperties: false,
      required: ["salesAngles"],
      properties: {
        salesAngles: {
          type: "array",
          minItems: 20,
          maxItems: 20,
          items: {
            type: "object",
            additionalProperties: false,
            required: ["angle", "type", "avatar", "emotion", "hookExample"],
            properties: {
              angle: { type: "string", description: "Descripción del ángulo 2-3 oraciones" },
              type: { type: "string", enum: ["educativo", "emocional", "aspiracional", "autoridad", "comparativo", "anti-mercado", "storytelling", "prueba-social", "error-comun"] },
              avatar: { type: "string" },
              emotion: { type: "string" },
              contentType: { type: "string" },
              hookExample: { type: "string" }
            }
          }
        },
      },
    },

    puv_transformation: {
      type: "object",
      additionalProperties: false,
      required: ["puv", "transformation"],
      properties: {
        puv: {
          type: "object",
          additionalProperties: false,
          required: ["centralProblem", "tangibleResult", "marketDifference", "statement"],
          properties: {
            centralProblem: { type: "string" },
            tangibleResult: { type: "string" },
            marketDifference: { type: "string" },
            idealClient: { type: "string" },
            statement: { type: "string", description: "Statement PUV máximo 25 palabras" },
            credibility: { type: "string" }
          }
        },
        transformation: {
          type: "object",
          additionalProperties: false,
          properties: {
            functional: { type: "object", properties: { before: { type: "string" }, after: { type: "string" } } },
            emotional: { type: "object", properties: { before: { type: "string" }, after: { type: "string" } } },
            identity: { type: "object", properties: { before: { type: "string" }, after: { type: "string" } } },
            social: { type: "object", properties: { before: { type: "string" }, after: { type: "string" } } },
            financial: { type: "object", properties: { before: { type: "string" }, after: { type: "string" } } },
          }
        }
      },
    },

    lead_magnets: {
      type: "object",
      additionalProperties: false,
      required: ["leadMagnets"],
      properties: {
        leadMagnets: {
          type: "array",
          minItems: 3,
          maxItems: 3,
          items: {
            type: "object",
            additionalProperties: false,
            required: ["name", "format", "objective", "pain", "avatar", "promise"],
            properties: {
              name: { type: "string" },
              format: { type: "string" },
              objective: { type: "string" },
              pain: { type: "string" },
              avatar: { type: "string" },
              awarenessPhase: { type: "string" },
              promise: { type: "string" },
              structure: { type: "array", minItems: 3, maxItems: 5, items: { type: "string" } }
            }
          }
        },
      },
    },

    video_creatives: {
      type: "object",
      additionalProperties: false,
      required: ["creatives"],
      properties: {
        creatives: {
          type: "array",
          minItems: 20,
          maxItems: 25,
          items: {
            type: "object",
            additionalProperties: false,
            required: ["title", "idea", "format", "esferaPhase"],
            properties: {
              number: { type: "number" },
              angle: { type: "string" },
              avatar: { type: "string" },
              title: { type: "string" },
              idea: { type: "string" },
              format: { type: "string" },
              esferaPhase: { type: "string", enum: ["enganchar", "solucion", "remarketing", "fidelizar"] },
              duration: { type: "string" }
            }
          }
        },
      },
    },
  };

  // Prompts optimizados para cada paso
  const getPrompt = (stepId: string): string => {
    const prevJtbd = previousResults.jtbd as any;
    const prevPains = previousResults.pains_desires as any;
    const prevAvatars = previousResults.avatars as any;
    const prevCompetitors = previousResults.competitors as any;
    const prevDiff = previousResults.differentiation as any;
    const prevSales = previousResults.sales_angles as any;

    const prompts: Record<string, string> = {
      market_overview: `Analiza el mercado usando búsqueda web actualizada.

${baseContext}

MERCADO OBJETIVO: ${targetMarket}

Genera un análisis de mercado completo con:
- Tamaño del mercado (cifras específicas)
- Tendencia de crecimiento (porcentajes)
- Estado: "crecimiento", "saturacion" o "declive"
- 5-7 variables macroeconómicas relevantes
- Nivel de conciencia predominante (Unaware/Problem Aware/Solution Aware/Product Aware/Most Aware)
- Resumen ejecutivo de 2-3 párrafos
- 3-5 oportunidades específicas
- 3-5 amenazas específicas`,

      jtbd: `Basándote en el contexto del producto, define los Jobs To Be Done.

${baseContext}

Define:
- JTBD Funcional: La tarea concreta que el cliente quiere completar (detallado)
- JTBD Emocional: Cómo quiere sentirse durante y después (detallado)
- JTBD Social: Cómo quiere ser percibido por otros (detallado)
- 8-12 insights estratégicos basados en investigación real`,

      pains_desires: `Basándote en el producto y el JTBD identificado, genera dolores, deseos y objeciones.

${baseContext}

JTBD identificado:
- Funcional: ${prevJtbd?.jtbd?.functional || 'N/A'}
- Emocional: ${prevJtbd?.jtbd?.emotional || 'N/A'}

Genera EXACTAMENTE:
- 10 dolores profundos (cada uno con: pain, why, impact)
- 10 deseos aspiracionales (cada uno con: desire, emotion, idealState)
- 10 objeciones/miedos (cada uno con: objection, belief, counter)`,

      competitors: `Investiga competidores REALES en el mercado ${targetMarket} usando búsqueda web.

${baseContext}

Lista 8-10 competidores REALES con presencia online verificable.
Para cada uno incluye:
- Nombre real de la empresa
- Website (si disponible)
- Instagram/TikTok (si disponible)
- Promesa de marketing
- Diferenciador
- Rango de precios
- Tono de comunicación
- Canales principales
- 2+ fortalezas
- 2+ debilidades`,

      avatars: `Crea 5 buyer personas estratégicos basados en la investigación previa.

${baseContext}

Dolores principales identificados:
${prevPains?.pains?.slice(0, 3).map((p: any) => `- ${p.pain}`).join('\n') || 'N/A'}

Deseos principales identificados:
${prevPains?.desires?.slice(0, 3).map((d: any) => `- ${d.desire}`).join('\n') || 'N/A'}

Crea EXACTAMENTE 5 avatares detallados. Cada uno debe tener:
- Nombre simbólico memorable
- Edad y contexto de vida completo
- Situación actual ANTES del producto
- Nivel de conciencia (Eugene Schwartz)
- 3 drivers psicológicos principales
- 3 sesgos cognitivos relevantes
- 3 objeciones específicas de este avatar
- 4-6 frases REALES que usa (entre comillas)
- Metas a corto y largo plazo
- Dónde consume contenido`,

      differentiation: `Analiza oportunidades de diferenciación basándote en la competencia y avatares.

${baseContext}

Competidores analizados: ${prevCompetitors?.competitors?.map((c: any) => c.name).join(', ') || 'N/A'}

Avatares: ${prevAvatars?.avatars?.map((a: any) => a.name).join(', ') || 'N/A'}

Genera:
1. DIFERENCIACIÓN:
   - 4-6 mensajes saturados del mercado (con oportunidad de diferenciarse)
   - 4-6 dolores mal comunicados (con oportunidad)
   - 4-6 oportunidades de posicionamiento único
   - 3-5 emociones no explotadas

2. INSIGHTS ESFERA (para cada fase):
   - Enganchar: qué domina, qué está saturado, oportunidades, tipos de hooks
   - Solución: promesas actuales, objeciones no resueltas, oportunidades de autoridad
   - Remarketing: prueba social existente, vacíos, mensajes de decisión
   - Fidelizar: errores comunes, oportunidades de comunidad

3. RESUMEN EJECUTIVO:
   - Resumen del mercado (1 párrafo)
   - 3-5 insights clave
   - 3 acciones inmediatas prioritarias
   - Recomendación final`,

      sales_angles: `Crea 20 ángulos de venta estratégicos variados.

${baseContext}

Avatares: ${prevAvatars?.avatars?.map((a: any) => a.name).join(', ') || 'N/A'}

Oportunidades de diferenciación: ${prevDiff?.differentiation?.positioningOpportunities?.slice(0, 3).map((o: any) => o.opportunity).join(', ') || 'N/A'}

Genera EXACTAMENTE 20 ángulos de venta. Distribuye entre estos tipos:
- educativo (enseñar algo nuevo)
- emocional (conectar con sentimientos)
- aspiracional (mostrar el yo futuro)
- autoridad (demostrar expertise)
- comparativo (vs alternativas)
- anti-mercado (ir contra lo establecido)
- storytelling (narrativas)
- prueba-social (validación externa)
- error-comun (alertar sobre problemas)

Cada ángulo debe incluir:
- Descripción del ángulo (2-3 oraciones)
- Tipo de ángulo
- Avatar principal
- Emoción que activa
- Tipo de contenido ideal
- Ejemplo de hook/primera frase`,

      puv_transformation: `Construye la Propuesta Única de Valor y tabla de transformación.

${baseContext}

Ángulos de venta principales:
${prevSales?.salesAngles?.slice(0, 5).map((a: any) => `- ${a.angle}`).join('\n') || 'N/A'}

1. PUV - Propuesta Única de Valor:
   - Problema central que resuelve (específico)
   - Resultado tangible y medible
   - Diferencia fundamental vs mercado
   - Cliente ideal en una frase
   - Statement completo (máximo 25 palabras poderosas)
   - Por qué es creíble y sostenible

2. TRANSFORMACIÓN (antes → después):
   - Funcional: qué no puede hacer → qué puede hacer
   - Emocional: cómo se siente antes → cómo se siente después
   - Identidad: cómo se ve a sí mismo antes → después
   - Social: cómo lo ven los demás antes → después
   - Financiero: impacto económico antes → después`,

      lead_magnets: `Diseña 3 lead magnets estratégicos.

${baseContext}

Avatares: ${prevAvatars?.avatars?.map((a: any) => a.name).join(', ') || 'N/A'}

Dolores principales:
${prevPains?.pains?.slice(0, 5).map((p: any) => `- ${p.pain}`).join('\n') || 'N/A'}

Crea EXACTAMENTE 3 lead magnets. Cada uno debe tener:
- Nombre atractivo
- Formato (PDF, Video, Quiz, Plantilla, etc.)
- Objetivo de conversión
- Dolor principal que ataca
- Avatar específico al que apunta
- Fase de conciencia objetivo
- Promesa en una oración
- 3-5 bullets de contenido/estructura`,

      video_creatives: `Crea 20-25 ideas de contenido/video distribuidas por fase ESFERA.

${baseContext}

Ángulos de venta:
${prevSales?.salesAngles?.slice(0, 10).map((a: any) => `- ${a.type}: ${a.hookExample}`).join('\n') || 'N/A'}

ESFERA Insights:
${prevDiff?.esferaInsights ? JSON.stringify(prevDiff.esferaInsights, null, 2).substring(0, 500) : 'N/A'}

Crea 20-25 creativos distribuidos así:
- 5-6 para Enganchar (atención y curiosidad)
- 5-6 para Solución (presentar y educar)
- 5-6 para Remarketing (reforzar decisión)
- 5-6 para Fidelizar (retención y referidos)

Formatos variados: Video UGC, Carrusel, Imagen, Story, Testimonio, etc.

Cada creativo debe tener:
- Número
- Ángulo usado
- Avatar objetivo
- Título/Hook atractivo
- Idea principal (2-3 líneas)
- Formato específico
- Fase ESFERA: "enganchar", "solucion", "remarketing" o "fidelizar"
- Duración sugerida`,
    };

    return prompts[stepId] || '';
  };

  const schema = schemas[stepId];
  const prompt = getPrompt(stepId);

  if (!schema || !prompt) {
    return { success: false, error: `Unknown step: ${stepId}` };
  }

  // Tokens según complejidad del paso
  const tokenMap: Record<string, number> = {
    market_overview: 3500,
    jtbd: 2500,
    pains_desires: 4000,
    competitors: 4500,
    avatars: 4500,
    differentiation: 4500,
    sales_angles: 5000,
    puv_transformation: 3000,
    lead_magnets: 2500,
    video_creatives: 5000,
  };

  try {
    const parsed = await runPerplexity(prompt, schema, stepId, tokenMap[stepId] || 4000);
    return { success: true, result: parsed };
  } catch (error) {
    console.error(`[product-research] Step ${stepId} failed:`, error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

/** Guarda progreso parcial */
async function savePartialResults(
  supabase: any,
  productId: string,
  results: Record<string, unknown>,
  completedSteps: string[]
) {
  const { error } = await supabase
    .from("products")
    .update({
      research_progress: {
        completed_steps: completedSteps,
        partial_results: results,
        updated_at: new Date().toISOString(),
      },
      brief_status: "in_progress",
      updated_at: new Date().toISOString(),
    })
    .eq("id", productId);

  if (error) {
    console.error("[product-research] savePartialResults error:", error);
  }
}

/** Consolida resultados en columnas finales del producto */
async function consolidateFinalResults(
  supabase: any,
  productId: string,
  results: Record<string, unknown>,
  briefData: any
) {
  const r = results as any;

  console.log("[product-research] Consolidating results. Keys:", Object.keys(results));

  const update: Record<string, unknown> = {
    brief_status: "completed",
    brief_completed_at: new Date().toISOString(),
    brief_data: briefData,
    research_generated_at: new Date().toISOString(),
    research_progress: null,
    updated_at: new Date().toISOString(),
  };

  // Market Research (market_overview + jtbd + pains_desires)
  const marketResearch: any = {
    generatedAt: new Date().toISOString(),
  };

  if (r.market_overview?.market_overview) {
    marketResearch.market_overview = r.market_overview.market_overview;
  }
  if (r.jtbd?.jtbd) {
    marketResearch.jtbd = {
      ...r.jtbd.jtbd,
      // Merge pains/desires/objections from separate step
      ...(r.pains_desires || {})
    };
  } else if (r.pains_desires) {
    marketResearch.jtbd = r.pains_desires;
  }

  if (Object.keys(marketResearch).length > 1) {
    update.market_research = marketResearch;
  }

  // Ideal Avatar (jtbd summary)
  if (r.jtbd?.jtbd) {
    update.ideal_avatar = JSON.stringify({
      jtbd: {
        ...r.jtbd.jtbd,
        ...(r.pains_desires || {})
      },
      summary: r.jtbd.jtbd.functional
    });
  }

  // Competitor Analysis (competitors + differentiation)
  const competitorAnalysis: any = {
    generatedAt: new Date().toISOString(),
  };

  if (r.competitors?.competitors) {
    competitorAnalysis.competitors = r.competitors.competitors;
  }
  if (r.differentiation?.differentiation) {
    competitorAnalysis.differentiation = r.differentiation.differentiation;
  }

  if (Object.keys(competitorAnalysis).length > 1) {
    update.competitor_analysis = competitorAnalysis;
  }

  // Avatar Profiles
  if (r.avatars?.avatars) {
    update.avatar_profiles = {
      profiles: r.avatars.avatars,
      generatedAt: new Date().toISOString(),
    };
  }

  // Content Strategy (esferaInsights + executiveSummary)
  if (r.differentiation?.esferaInsights || r.differentiation?.executiveSummary) {
    update.content_strategy = {
      esferaInsights: r.differentiation?.esferaInsights || {},
      executiveSummary: r.differentiation?.executiveSummary || {},
      generatedAt: new Date().toISOString(),
    };
  }

  // Sales Angles Data (sales_angles + puv + transformation + lead_magnets + video_creatives)
  const salesAnglesData: any = {
    generatedAt: new Date().toISOString(),
  };

  if (r.sales_angles?.salesAngles) {
    salesAnglesData.angles = r.sales_angles.salesAngles;
  }
  if (r.puv_transformation?.puv) {
    salesAnglesData.puv = r.puv_transformation.puv;
  }
  if (r.puv_transformation?.transformation) {
    salesAnglesData.transformation = r.puv_transformation.transformation;
  }
  if (r.lead_magnets?.leadMagnets) {
    salesAnglesData.leadMagnets = r.lead_magnets.leadMagnets;
  }
  if (r.video_creatives?.creatives) {
    salesAnglesData.videoCreatives = r.video_creatives.creatives;
  }

  if (Object.keys(salesAnglesData).length > 1) {
    update.sales_angles_data = salesAnglesData;
  }

  console.log("[product-research] Update keys:", Object.keys(update));

  const { error } = await supabase
    .from("products")
    .update(update)
    .eq("id", productId);

  if (error) {
    console.error("[product-research] consolidateFinalResults error:", error);
    throw error;
  }

  console.log("[product-research] Consolidation complete");
}

function buildProductDescription(briefData: any): string {
  const parts = [];

  if (briefData.productName) parts.push(`**Producto:** ${briefData.productName}`);
  if (briefData.category) parts.push(`**Categoría:** ${briefData.category}${briefData.customCategory ? ` - ${briefData.customCategory}` : ''}`);
  if (briefData.slogan) parts.push(`**Slogan:** ${briefData.slogan}`);
  if (briefData.mainBenefit) parts.push(`**Beneficio principal:** ${briefData.mainBenefit}`);
  if (briefData.transformation) parts.push(`**Transformación:** ${briefData.transformation}`);
  if (briefData.differentiator) parts.push(`**Diferenciador:** ${briefData.differentiator}`);
  if (briefData.problemSolved) parts.push(`**Problema que resuelve:** ${briefData.problemSolved}`);
  if (briefData.mainDesire) parts.push(`**Deseo principal:** ${briefData.mainDesire}`);
  if (briefData.competitiveAdvantage) parts.push(`**Ventaja competitiva:** ${briefData.competitiveAdvantage}`);

  if (briefData.reptileBrain?.length > 0) parts.push(`**Gatillos reptilianos:** ${briefData.reptileBrain.join(', ')}`);
  if (briefData.limbicBrain?.length > 0) parts.push(`**Emociones objetivo:** ${briefData.limbicBrain.join(', ')}`);
  if (briefData.cortexBrain) parts.push(`**Justificación racional:** ${briefData.cortexBrain}`);

  const audienceParts = [];
  if (briefData.targetGender) audienceParts.push(`Género: ${briefData.targetGender}`);
  if (briefData.targetAgeRange) audienceParts.push(`Edad: ${briefData.targetAgeRange}`);
  if (briefData.targetOccupation) audienceParts.push(`Ocupación: ${briefData.targetOccupation}`);
  if (audienceParts.length > 0) parts.push(`**Público:** ${audienceParts.join(', ')}`);

  if (briefData.targetInterests?.length > 0) parts.push(`**Intereses:** ${briefData.targetInterests.join(', ')}`);
  if (briefData.commonObjections?.length > 0) parts.push(`**Objeciones comunes:** ${briefData.commonObjections.join(', ')}`);
  if (briefData.platforms?.length > 0) parts.push(`**Plataformas:** ${briefData.platforms.join(', ')}`);
  if (briefData.additionalNotes) parts.push(`**Notas:** ${briefData.additionalNotes}`);

  return parts.join('\n');
}

serve(async (req) => {
  console.log("[product-research] Request received:", req.method);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { productId, briefData, startFromStep, previousResults } = body;

    if (!productId || !briefData) {
      return new Response(
        JSON.stringify({ success: false, error: "Product ID and brief data are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const perplexityApiKey = Deno.env.get("PERPLEXITY_API_KEY");
    if (!perplexityApiKey) {
      return new Response(
        JSON.stringify({ success: false, error: "Perplexity API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Build context
    let productDescription = buildProductDescription(briefData);
    const targetMarket = briefData.targetMarket || "Latinoamérica (LATAM)";

    // Fetch document content if URL provided
    if (briefData.documentUrl) {
      try {
        const documentContent = await fetchDocumentContent(briefData.documentUrl);
        if (documentContent) {
          productDescription += `\n\n**Información adicional:**\n${documentContent}`;
        }
      } catch (e) {
        console.warn("[product-research] Could not fetch document:", e);
      }
    }

    const baseContext = `${productDescription}\n\nMercado objetivo: ${targetMarket}`;

    // Get existing progress
    const { data: product } = await supabase
      .from("products")
      .select("research_progress")
      .eq("id", productId)
      .single();

    const progress = (product as any)?.research_progress;
    let results: Record<string, unknown> = previousResults || progress?.partial_results || {};
    let completedSteps: string[] = progress?.completed_steps || [];

    // Find starting point
    const startIdx = startFromStep
      ? Math.max(0, RESEARCH_STEPS.findIndex((s) => s.id === startFromStep))
      : 0;

    console.log(`[product-research] Starting from step ${startIdx}, completed: ${completedSteps.join(', ')}`);

    // Execute steps sequentially
    for (let i = startIdx; i < RESEARCH_STEPS.length; i++) {
      const step = RESEARCH_STEPS[i];

      // Skip if already completed
      if (completedSteps.includes(step.id)) {
        console.log(`[product-research] Skipping completed step: ${step.id}`);
        continue;
      }

      // Check dependencies
      const depsMet = step.dependsOn.every((d) => completedSteps.includes(d));
      if (!depsMet) {
        console.log(`[product-research] Dependencies not met for ${step.id}, skipping`);
        continue;
      }

      console.log(`[product-research] === Step ${i + 1}/${RESEARCH_STEPS.length}: ${step.name} ===`);

      const stepResult = await executeResearchStep(
        step.id,
        baseContext,
        targetMarket,
        results,
        perplexityApiKey
      );

      if (!stepResult.success) {
        console.error(`[product-research] Step ${step.id} failed:`, stepResult.error);
        await savePartialResults(supabase, productId, results, completedSteps);

        return new Response(
          JSON.stringify({
            success: false,
            completedSteps,
            failedStep: step.id,
            error: stepResult.error,
          }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      results[step.id] = stepResult.result;
      completedSteps.push(step.id);

      // Save progress after each step
      await savePartialResults(supabase, productId, results, completedSteps);

      console.log(`[product-research] Step ${step.id} completed`);

      // Small delay between API calls to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // All steps completed - consolidate results
    await consolidateFinalResults(supabase, productId, results, briefData);

    return new Response(
      JSON.stringify({
        success: true,
        completedSteps,
        totalSteps: RESEARCH_STEPS.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[product-research] Error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
