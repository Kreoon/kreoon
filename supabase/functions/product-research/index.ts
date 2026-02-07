import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.46.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// 12 pasos granulares para evitar truncamiento por límite de tokens
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
  { id: "content_calendar", name: "Parrilla de Contenido 30 Días", dependsOn: ["avatars", "sales_angles", "differentiation"] },
  { id: "launch_strategy", name: "Estrategia de Lanzamiento", dependsOn: ["avatars", "sales_angles", "puv_transformation"] },
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
    // Step 1: Fix unterminated strings (common when AI output is truncated)
    let inString = false;
    let escaped = false;
    for (let i = 0; i < s.length; i++) {
      if (escaped) { escaped = false; continue; }
      if (s[i] === '\\' && inString) { escaped = true; continue; }
      if (s[i] === '"') inString = !inString;
    }
    if (inString) {
      // Remove trailing backslash(es) that would escape our closing quote
      while (s.endsWith('\\')) s = s.slice(0, -1);
      s += '"';
    }

    // Step 2: Clean up dangling partial entries
    // Remove dangling key without value: , "key"  at end
    s = s.replace(/,\s*"[^"]*"\s*$/, '');
    // Remove key with colon but no value: , "key":  at end
    s = s.replace(/,\s*"[^"]*"\s*:\s*$/, '');
    // Remove trailing comma
    s = s.replace(/,\s*$/, '');

    // Step 3: Count and close brackets/braces (string-aware)
    let open = 0, bracket = 0;
    inString = false;
    escaped = false;
    for (let i = 0; i < s.length; i++) {
      if (escaped) { escaped = false; continue; }
      if (s[i] === '\\' && inString) { escaped = true; continue; }
      if (s[i] === '"') { inString = !inString; continue; }
      if (inString) continue;
      if (s[i] === '{') open++;
      else if (s[i] === '}') open--;
      else if (s[i] === '[') bracket++;
      else if (s[i] === ']') bracket--;
    }
    while (bracket > 0) { s += ']'; bracket--; }
    while (open > 0) { s += '}'; open--; }
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

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 90000); // 90s timeout per step

    let res: Response;
    try {
      res = await fetch("https://api.perplexity.ai/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${perplexityApiKey}`,
          "Content-Type": "application/json",
        },
        signal: controller.signal,
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
    } catch (fetchErr: any) {
      clearTimeout(timeoutId);
      if (fetchErr.name === "AbortError") {
        throw new Error(`Perplexity timeout after 90s for ${schemaName}`);
      }
      throw fetchErr;
    } finally {
      clearTimeout(timeoutId);
    }

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
            marketSize: { type: "string", description: "Tamaño del mercado con cifras específicas y fuente" },
            marketSizeSegments: { type: "array", items: { type: "object", properties: { segment: { type: "string" }, value: { type: "string" } } } },
            growthTrend: { type: "string", description: "CAGR con porcentaje y proyección a 5 años" },
            growthFactors: { type: "array", minItems: 3, items: { type: "string" } },
            marketState: { type: "string", enum: ["crecimiento", "saturacion", "declive"] },
            marketStateExplanation: { type: "string", description: "Justificación detallada del estado del mercado" },
            marketLifecyclePhase: { type: "string", description: "Fase del ciclo de vida (introducción, crecimiento, madurez, declive)" },
            macroVariables: {
              type: "array",
              minItems: 6,
              maxItems: 8,
              items: {
                type: "object",
                properties: {
                  factor: { type: "string" },
                  type: { type: "string", enum: ["politico", "economico", "social", "tecnologico", "ecologico", "legal"] },
                  impact: { type: "string" },
                  implication: { type: "string" }
                }
              }
            },
            awarenessLevel: { type: "string", enum: ["unaware", "problem_aware", "solution_aware", "product_aware", "most_aware"] },
            awarenessExplanation: { type: "string", description: "Por qué el mercado está en este nivel de conciencia" },
            summary: { type: "string", description: "Resumen ejecutivo de 3-4 párrafos con datos concretos" },
            opportunities: {
              type: "array",
              minItems: 5,
              maxItems: 7,
              items: {
                type: "object",
                properties: {
                  opportunity: { type: "string" },
                  why: { type: "string" },
                  howToCapture: { type: "string" }
                }
              }
            },
            threats: {
              type: "array",
              minItems: 5,
              maxItems: 7,
              items: {
                type: "object",
                properties: {
                  threat: { type: "string" },
                  riskLevel: { type: "string", enum: ["alto", "medio", "bajo"] },
                  mitigation: { type: "string" }
                }
              }
            },
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
            functional: {
              type: "object",
              properties: {
                description: { type: "string", description: "Descripción detallada del JTBD funcional (3-4 párrafos)" },
                situation: { type: "string", description: "En qué situación surge esta necesidad" },
                currentAlternatives: { type: "string", description: "Qué alternativas usa actualmente" },
                desiredOutcome: { type: "string", description: "El resultado funcional deseado" },
                statement: { type: "string", description: "Cuando [situación], quiero [motivación], para poder [resultado]" }
              }
            },
            emotional: {
              type: "object",
              properties: {
                description: { type: "string", description: "Descripción detallada del JTBD emocional (3-4 párrafos)" },
                duringUse: { type: "string", description: "Cómo quiere sentirse durante el uso" },
                afterUse: { type: "string", description: "Cómo quiere sentirse después" },
                avoidFeelings: { type: "array", items: { type: "string" }, description: "Emociones negativas que quiere evitar" },
                underlyingFears: { type: "array", items: { type: "string" }, description: "Miedos subyacentes" },
                hopesAndDreams: { type: "array", items: { type: "string" }, description: "Esperanzas y sueños que alimenta" }
              }
            },
            social: {
              type: "object",
              properties: {
                description: { type: "string", description: "Descripción detallada del JTBD social (3-4 párrafos)" },
                perceivedBy: { type: "array", items: { type: "string" }, description: "Por quién quiere ser percibido (familia, amigos, colegas)" },
                desiredStatus: { type: "string", description: "Estatus o identidad que quiere proyectar" },
                avoidJudgments: { type: "array", items: { type: "string" }, description: "Juicios que quiere evitar" },
                belongingGroup: { type: "string", description: "A qué grupo quiere pertenecer" },
                differentiateFrom: { type: "string", description: "De qué grupo quiere diferenciarse" }
              }
            },
            insights: {
              type: "array",
              minItems: 10,
              maxItems: 14,
              items: {
                type: "object",
                properties: {
                  insight: { type: "string" },
                  category: { type: "string", enum: ["trigger", "momento_verdad", "barrera", "decision", "influenciador", "competencia_indirecta"] },
                  actionable: { type: "string", description: "Cómo usar este insight en marketing" }
                }
              }
            },
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
            required: ["name", "demographics", "situation", "psychographics", "communication", "behavior", "purchaseTrigger"],
            properties: {
              name: { type: "string", description: "Nombre simbólico memorable que refleje su personalidad" },
              demographics: {
                type: "object",
                properties: {
                  age: { type: "string", description: "Edad específica (no rango)" },
                  occupation: { type: "string" },
                  familySituation: { type: "string" },
                  location: { type: "string" },
                  socioeconomicLevel: { type: "string" }
                }
              },
              situation: {
                type: "object",
                properties: {
                  dayToDay: { type: "string", description: "Descripción detallada de su día a día (1 párrafo)" },
                  previousAttempts: { type: "string", description: "Qué ha intentado antes" },
                  whyDidntWork: { type: "string", description: "Por qué no le ha funcionado" },
                  currentFeeling: { type: "string", description: "Cómo se siente con su situación actual" }
                }
              },
              psychographics: {
                type: "object",
                properties: {
                  awarenessLevel: { type: "string", enum: ["unaware", "problem_aware", "solution_aware", "product_aware", "most_aware"] },
                  drivers: { type: "array", minItems: 3, items: { type: "string" }, description: "Drivers psicológicos principales" },
                  biases: { type: "array", minItems: 3, items: { type: "string" }, description: "Sesgos cognitivos relevantes" },
                  objections: { type: "array", minItems: 3, items: { type: "string" }, description: "Objeciones específicas de este avatar" },
                  values: { type: "array", minItems: 3, items: { type: "string" }, description: "Valores personales" },
                  deepestFears: { type: "array", minItems: 2, items: { type: "string" }, description: "Miedos más profundos" }
                }
              },
              communication: {
                type: "object",
                properties: {
                  phrases: { type: "array", minItems: 5, maxItems: 7, items: { type: "string" }, description: "Frases textuales en primera persona" },
                  frequentExpressions: { type: "array", items: { type: "string" }, description: "Palabras y expresiones que usa" },
                  preferredTone: { type: "string", description: "Tono de comunicación que prefiere" }
                }
              },
              behavior: {
                type: "object",
                properties: {
                  shortTermGoals: { type: "string", description: "Metas a 3-6 meses" },
                  longTermGoals: { type: "string", description: "Metas a 1-3 años" },
                  contentPlatforms: { type: "array", items: { type: "string" }, description: "Dónde consume contenido" },
                  influencersFollowed: { type: "string", description: "Tipo de influencers o marcas que sigue" },
                  researchProcess: { type: "string", description: "Cómo investiga antes de comprar" }
                }
              },
              purchaseTrigger: {
                type: "object",
                properties: {
                  triggerEvent: { type: "string", description: "Qué evento lo llevaría a buscar una solución" },
                  trustSignals: { type: "string", description: "Qué necesita ver/escuchar para confiar" },
                  ahamoment: { type: "string", description: "Cuál sería su momento aha" },
                  actionToday: { type: "string", description: "Qué lo haría actuar HOY" }
                }
              }
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
            enganchar: {
              type: "object",
              properties: {
                marketDominance: { type: "string" },
                saturated: { type: "string" },
                opportunities: { type: "array", items: { type: "string" } },
                hookTypes: { type: "array", items: { type: "string" } },
                platforms: { type: "array", items: { type: "string" } },
                contentFormats: { type: "array", items: { type: "string" } }
              }
            },
            solucion: {
              type: "object",
              properties: {
                currentPromises: { type: "string" },
                unresolvedObjections: { type: "string" },
                trustOpportunities: { type: "array", items: { type: "string" } },
                educationAngles: { type: "array", items: { type: "string" } },
                proofTypes: { type: "array", items: { type: "string" } }
              }
            },
            remarketing: {
              type: "object",
              properties: {
                existingProof: { type: "string" },
                gaps: { type: "string" },
                decisionMessages: { type: "array", items: { type: "string" } },
                urgencyTactics: { type: "array", items: { type: "string" } },
                objectionHandling: { type: "array", items: { type: "string" } },
                touchpointSequence: { type: "array", items: { type: "string" } }
              }
            },
            fidelizar: {
              type: "object",
              properties: {
                commonErrors: { type: "string" },
                communityOpportunities: { type: "array", items: { type: "string" } },
                retentionStrategies: { type: "array", items: { type: "string" } },
                referralAngles: { type: "array", items: { type: "string" } },
                postPurchaseContent: { type: "array", items: { type: "string" } }
              }
            },
          }
        },
        executiveSummary: {
          type: "object",
          additionalProperties: false,
          properties: {
            marketSummary: { type: "string", description: "Resumen del mercado con datos concretos (2 párrafos)" },
            opportunityScore: { type: "number", description: "Score de oportunidad 1-10" },
            opportunityScoreJustification: { type: "string", description: "Justificación del score" },
            keyInsights: { type: "array", minItems: 3, maxItems: 5, items: { type: "object", properties: { insight: { type: "string" }, importance: { type: "string" }, action: { type: "string" } }, additionalProperties: false } },
            psychologicalDrivers: { type: "array", minItems: 3, maxItems: 5, items: { type: "object", properties: { driver: { type: "string" }, why: { type: "string" }, howToUse: { type: "string" } }, additionalProperties: false } },
            immediateActions: { type: "array", minItems: 3, maxItems: 5, items: { type: "object", properties: { action: { type: "string" }, howTo: { type: "string" }, expectedResult: { type: "string" } }, additionalProperties: false } },
            quickWins: { type: "array", minItems: 2, maxItems: 4, items: { type: "object", properties: { win: { type: "string" }, effort: { type: "string" }, impact: { type: "string" } }, additionalProperties: false } },
            risksToAvoid: { type: "array", minItems: 2, maxItems: 4, items: { type: "object", properties: { risk: { type: "string" }, why: { type: "string" } }, additionalProperties: false } },
            finalRecommendation: { type: "string", description: "Recomendación estratégica priorizada con timeline" }
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
            required: ["angle", "type", "avatar", "emotion", "hookExample", "whyItWorks"],
            properties: {
              angle: { type: "string", description: "Descripción completa del ángulo (3-4 oraciones)" },
              type: { type: "string", enum: ["educativo", "emocional", "aspiracional", "autoridad", "comparativo", "anti-mercado", "storytelling", "prueba-social", "error-comun"] },
              avatar: { type: "string", description: "Nombre del avatar específico" },
              emotion: { type: "string", description: "Emoción específica que activa (no genérica)" },
              whyItWorks: { type: "string", description: "Por qué funciona psicológicamente este ángulo" },
              contentType: { type: "string", description: "Formato ideal (Video UGC, Carrusel, Story, etc.)" },
              hookExample: { type: "string", description: "Hook completo y listo para usar (1-2 oraciones)" },
              ctaExample: { type: "string", description: "CTA específico para este ángulo" },
              funnelPhase: { type: "string", enum: ["tofu", "mofu", "bofu"], description: "Fase del funnel" },
              hashtags: { type: "array", minItems: 3, maxItems: 5, items: { type: "string" }, description: "Hashtags relevantes" },
              developmentTips: { type: "string", description: "Cómo desarrollar este ángulo en contenido" }
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
            required: ["name", "format", "objective", "pain", "avatar", "promise", "structure"],
            properties: {
              name: { type: "string", description: "Nombre irresistible que genere curiosidad" },
              format: { type: "string", description: "PDF, Video Training, Quiz, Plantilla, etc." },
              objective: { type: "string", description: "Objetivo de conversión post-descarga" },
              pain: { type: "string", description: "Dolor principal que ataca" },
              avatar: { type: "string", description: "Avatar específico" },
              awarenessPhase: { type: "string", enum: ["problem_aware", "solution_aware", "product_aware"] },
              promise: { type: "string", description: "Promesa en una oración poderosa" },
              structure: {
                type: "array",
                minItems: 5,
                maxItems: 7,
                items: { type: "string" },
                description: "Secciones o módulos del lead magnet"
              },
              deliveryMethod: { type: "string", description: "Cómo se entrega" },
              estimatedTime: { type: "string", description: "Tiempo de consumo estimado" }
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
          minItems: 23,
          maxItems: 27,
          items: {
            type: "object",
            additionalProperties: false,
            required: ["number", "title", "idea", "structure", "format", "esferaPhase"],
            properties: {
              number: { type: "number" },
              angle: { type: "string", description: "Ángulo de venta que usa" },
              avatar: { type: "string", description: "Avatar específico objetivo" },
              title: { type: "string", description: "Hook/Título irresistible (máx 15 palabras)" },
              idea: { type: "string", description: "Descripción de la idea (3-4 oraciones)" },
              structure: {
                type: "object",
                properties: {
                  hook: { type: "string", description: "Primeros 3 segundos" },
                  body: { type: "string", description: "Desarrollo del contenido" },
                  climax: { type: "string", description: "Punto culminante o revelación" },
                  cta: { type: "string", description: "Llamada a la acción" }
                }
              },
              format: { type: "string", description: "Video UGC, Talking Head, Carrusel, etc." },
              esferaPhase: { type: "string", enum: ["enganchar", "solucion", "remarketing", "fidelizar"] },
              duration: { type: "string", description: "Duración sugerida" },
              platform: { type: "string", description: "Plataforma ideal" },
              productionNotes: { type: "string", description: "Qué se necesita para producirlo" }
            }
          }
        },
      },
    },

    content_calendar: {
      type: "object",
      additionalProperties: false,
      required: ["calendar"],
      properties: {
        calendar: {
          type: "array",
          minItems: 28,
          maxItems: 35,
          items: {
            type: "object",
            additionalProperties: false,
            required: ["week", "day", "dayLabel", "platform", "format", "pillar", "title", "hook", "description", "copy", "cta", "hashtags", "esferaPhase", "avatar", "productionNotes"],
            properties: {
              week: { type: "number", description: "Semana 1-4" },
              day: { type: "number", description: "Día 1-7 de la semana" },
              dayLabel: { type: "string", description: "Ej: 'Lunes - Día 1'" },
              platform: { type: "string", description: "Instagram, TikTok, LinkedIn, Twitter" },
              format: { type: "string", description: "Carrusel, Story, Reel texto, Post estático, Thread, Meme, Infografía, Quote, BTS, Encuesta" },
              pillar: { type: "string", enum: ["educativo", "emocional", "autoridad", "venta", "comunidad"] },
              title: { type: "string", description: "Título/concepto del contenido" },
              hook: { type: "string", description: "Primera línea o gancho de apertura" },
              description: { type: "string", description: "Descripción de qué va el contenido (2-3 oraciones)" },
              copy: { type: "string", description: "Copy listo para publicar (2-3 oraciones)" },
              cta: { type: "string", description: "Llamada a la acción específica" },
              hashtags: { type: "array", minItems: 3, maxItems: 5, items: { type: "string" } },
              esferaPhase: { type: "string", enum: ["enganchar", "solucion", "remarketing", "fidelizar"] },
              avatar: { type: "string", description: "Nombre del avatar objetivo" },
              productionNotes: { type: "string", description: "Instrucciones para diseñador/editor" }
            }
          }
        },
        weeklyThemes: {
          type: "array",
          minItems: 4,
          maxItems: 4,
          items: {
            type: "object",
            properties: {
              week: { type: "number" },
              theme: { type: "string" },
              objective: { type: "string" },
              focusPhase: { type: "string" }
            }
          }
        },
        leadMagnetDays: {
          type: "array",
          minItems: 3,
          maxItems: 3,
          items: {
            type: "object",
            properties: {
              week: { type: "number" },
              day: { type: "number" },
              leadMagnetName: { type: "string" },
              promotionCopy: { type: "string" }
            }
          }
        }
      },
    },

    launch_strategy: {
      type: "object",
      additionalProperties: false,
      required: ["preLaunch", "launch", "postLaunch", "budget", "timeline", "team", "metrics"],
      properties: {
        preLaunch: {
          type: "object",
          properties: {
            duration: { type: "string", description: "Ej: '2-3 semanas'" },
            objectives: { type: "array", minItems: 3, items: { type: "string" } },
            actions: { type: "array", minItems: 5, items: {
              type: "object",
              properties: {
                action: { type: "string" },
                week: { type: "string" },
                channel: { type: "string" },
                details: { type: "string" }
              }
            }},
            contentPlan: { type: "array", minItems: 5, items: { type: "string" } },
            checklist: { type: "array", minItems: 8, items: { type: "string" } }
          }
        },
        launch: {
          type: "object",
          properties: {
            dayPlan: { type: "array", minItems: 5, items: {
              type: "object",
              properties: {
                time: { type: "string" },
                action: { type: "string" },
                channel: { type: "string" },
                details: { type: "string" }
              }
            }},
            offer: {
              type: "object",
              properties: {
                description: { type: "string" },
                price: { type: "string" },
                bonuses: { type: "array", items: { type: "string" } },
                urgency: { type: "string" },
                scarcity: { type: "string" },
                guarantee: { type: "string" }
              }
            },
            emailSequence: { type: "array", minItems: 5, maxItems: 7, items: {
              type: "object",
              properties: {
                day: { type: "string" },
                subject: { type: "string" },
                preview: { type: "string" },
                bodyOutline: { type: "string" },
                cta: { type: "string" }
              }
            }},
            channels: { type: "array", items: {
              type: "object",
              properties: {
                channel: { type: "string" },
                role: { type: "string" },
                content: { type: "string" }
              }
            }}
          }
        },
        postLaunch: {
          type: "object",
          properties: {
            retentionActions: { type: "array", minItems: 4, items: { type: "string" } },
            postSaleContent: { type: "array", minItems: 4, items: { type: "string" } },
            referralStrategy: { type: "string" },
            nonBuyerFollowUp: { type: "array", minItems: 3, items: { type: "string" } },
            analysisChecklist: { type: "array", minItems: 4, items: { type: "string" } }
          }
        },
        budget: {
          type: "object",
          properties: {
            organic: { type: "array", items: {
              type: "object",
              properties: { item: { type: "string" }, cost: { type: "string" } }
            }},
            paid: { type: "array", items: {
              type: "object",
              properties: { item: { type: "string" }, cost: { type: "string" }, platform: { type: "string" } }
            }},
            totalEstimated: { type: "string" }
          }
        },
        timeline: { type: "array", minItems: 6, items: {
          type: "object",
          properties: {
            phase: { type: "string" },
            week: { type: "string" },
            milestone: { type: "string" },
            deliverables: { type: "array", items: { type: "string" } }
          }
        }},
        team: { type: "array", items: {
          type: "object",
          properties: {
            role: { type: "string" },
            responsibilities: { type: "array", items: { type: "string" } },
            hoursPerWeek: { type: "string" }
          }
        }},
        metrics: {
          type: "object",
          properties: {
            preLaunch: { type: "array", items: {
              type: "object",
              properties: { metric: { type: "string" }, target: { type: "string" } }
            }},
            launch: { type: "array", items: {
              type: "object",
              properties: { metric: { type: "string" }, target: { type: "string" } }
            }},
            postLaunch: { type: "array", items: {
              type: "object",
              properties: { metric: { type: "string" }, target: { type: "string" } }
            }}
          }
        }
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
      market_overview: `Realiza una INVESTIGACIÓN PROFUNDA del mercado usando búsqueda web actualizada y datos reales de ${targetMarket}.

${baseContext}

MERCADO OBJETIVO: ${targetMarket}

INSTRUCCIONES CRÍTICAS:
- USA DATOS REALES Y ACTUALES (busca estadísticas 2024-2025)
- Cita fuentes cuando sea posible
- Sé ESPECÍFICO con números, porcentajes y cifras
- Evita generalidades, cada punto debe tener información concreta

Genera un ANÁLISIS EXHAUSTIVO incluyendo:

1. TAMAÑO DEL MERCADO (TAM/SAM/SOM):
   - TAM (Total Addressable Market): Valor total global en USD (con fuente)
   - SAM (Serviceable Addressable Market): Segmento alcanzable en ${targetMarket}
   - SOM (Serviceable Obtainable Market): Cuota realista a capturar en 12-24 meses
   - Segmentación por sub-categorías relevantes
   - Comparación vs años anteriores

2. TENDENCIA DE CRECIMIENTO:
   - CAGR (tasa de crecimiento anual compuesta) con porcentaje específico
   - Proyección a 3-5 años
   - Factores que impulsan el crecimiento
   - Factores que podrían frenarlo

3. ESTADO DEL MERCADO:
   - Clasifica como "crecimiento", "saturacion" o "declive"
   - Justifica con datos concretos por qué está en ese estado
   - Describe la fase del ciclo de vida del mercado

4. COMPORTAMIENTO DEL CONSUMIDOR:
   - Cómo busca soluciones el consumidor en este nicho
   - Canales predominantes donde está la audiencia (Instagram, TikTok, YouTube, Google, LinkedIn, etc.)
   - Formatos de contenido que consume más (video corto, carruseles, blogs, podcasts)
   - Estacionalidad: meses/épocas del año con mayor demanda
   - Momentos clave del año para campañas (fechas importantes, eventos del sector)
   - Ticket promedio y frecuencia de compra

5. VARIABLES MACROECONÓMICAS (5-7 factores PESTEL):
   - Políticos/Regulatorios que afectan el mercado
   - Económicos (inflación, poder adquisitivo, capacidad de pago digital)
   - Sociales (cambios demográficos, tendencias culturales)
   - Tecnológicos (innovaciones disruptivas, adopción digital)
   - Ecológicos/Ambientales si aplica
   - Legales específicos del sector

6. NIVEL DE CONCIENCIA (Eugene Schwartz):
   - Determina el nivel predominante del mercado
   - Explica por qué llegaste a esa conclusión
   - Implicaciones para la comunicación de marketing

7. RESUMEN EJECUTIVO (3-4 párrafos):
   - Panorama general del mercado con datos cuantificados
   - Principales players y dinámica competitiva
   - Hacia dónde se dirige el mercado
   - Score de oportunidad (1-10) con justificación
   - Recomendación estratégica priorizada (semana 1, mes 1, mes 3)

8. OPORTUNIDADES (5 mínimo):
   - Oportunidades concretas y accionables
   - Por qué representan una oportunidad (con datos)
   - Cómo aprovecharlas (táctica específica)

9. AMENAZAS (5 mínimo):
   - Amenazas reales y específicas
   - Nivel de riesgo (alto/medio/bajo)
   - Cómo mitigarlas`,

      jtbd: `Analiza a PROFUNDIDAD los Jobs To Be Done (JTBD) del cliente ideal para este producto.

${baseContext}

MARCO TEÓRICO: El framework JTBD de Clayton Christensen nos dice que los clientes "contratan" productos para completar trabajos específicos en sus vidas.

INSTRUCCIONES CRÍTICAS:
- Piensa como el cliente, no como el vendedor
- Usa lenguaje que el cliente realmente usaría
- Sé extremadamente específico en cada tipo de job
- Incluye el contexto y las circunstancias

Genera un análisis EXHAUSTIVO:

1. JTBD FUNCIONAL (3-4 párrafos):
   - ¿Qué tarea específica necesita completar el cliente?
   - ¿En qué situación surge esta necesidad?
   - ¿Qué alternativas está usando actualmente?
   - ¿Cuál es el resultado funcional deseado?
   - Ejemplo de declaración: "Cuando [situación], quiero [motivación], para poder [resultado esperado]"

2. JTBD EMOCIONAL (3-4 párrafos):
   - ¿Cómo quiere SENTIRSE el cliente mientras usa el producto?
   - ¿Qué emociones negativas quiere evitar?
   - ¿Qué estado emocional espera alcanzar después?
   - ¿Qué miedos subyacentes tiene?
   - ¿Qué esperanzas y sueños alimenta?

3. JTBD SOCIAL (3-4 párrafos):
   - ¿Cómo quiere ser PERCIBIDO por otros?
   - ¿Ante quién quiere verse bien? (familia, amigos, colegas, sociedad)
   - ¿Qué estatus o identidad quiere proyectar?
   - ¿Qué juicios quiere evitar?
   - ¿A qué grupo quiere pertenecer o de cuál quiere diferenciarse?

4. INSIGHTS ESTRATÉGICOS (10-12 insights):
   - Cada insight debe ser ACCIONABLE para marketing
   - Incluye insights sobre: triggers de compra, momentos de verdad, barreras ocultas
   - Insights sobre el proceso de decisión
   - Insights sobre influenciadores en la compra
   - Insights sobre competencia indirecta (alternativas no obvias)`,

      pains_desires: `Realiza un análisis PSICOLÓGICO PROFUNDO de los dolores, deseos y objeciones del cliente ideal.

${baseContext}

JTBD identificado:
- Funcional: ${prevJtbd?.jtbd?.functional || 'N/A'}
- Emocional: ${prevJtbd?.jtbd?.emotional || 'N/A'}
- Social: ${prevJtbd?.jtbd?.social || 'N/A'}

INSTRUCCIONES CRÍTICAS:
- Piensa como un psicólogo que entiende motivaciones profundas
- Usa el lenguaje EXACTO que usaría el cliente (frases entre comillas)
- Conecta cada dolor/deseo con una emoción específica
- Sé concreto, evita generalidades como "quiere mejorar su vida"

Genera EXACTAMENTE:

1. 10 DOLORES PROFUNDOS:
Para cada dolor incluye:
- pain: El dolor específico (2-3 oraciones descriptivas)
- why: Por qué duele tanto (la raíz psicológica)
- impact: Cómo afecta su vida diaria, relaciones, trabajo, autoestima

Tipos de dolores a cubrir:
- 2-3 dolores funcionales (problemas prácticos)
- 2-3 dolores emocionales (cómo se siente)
- 2-3 dolores sociales (cómo lo ven otros)
- 2-3 dolores financieros/de tiempo

2. 10 DESEOS ASPIRACIONALES:
Para cada deseo incluye:
- desire: El deseo específico (2-3 oraciones descriptivas)
- emotion: La emoción que sentiría al lograrlo
- idealState: Descripción vívida de cómo sería su vida (un párrafo)

Tipos de deseos a cubrir:
- 2-3 deseos de logro/éxito
- 2-3 deseos de libertad/autonomía
- 2-3 deseos de conexión/pertenencia
- 2-3 deseos de reconocimiento/estatus

3. 10 OBJECIONES Y MIEDOS:
Para cada objeción incluye:
- objection: La objeción textual ("Es muy caro", "No tengo tiempo")
- belief: La creencia limitante detrás (por qué realmente objeta)
- counter: Cómo responder efectivamente (técnica + ejemplo de copy)

Tipos de objeciones a cubrir:
- 2-3 sobre precio/inversión
- 2-3 sobre tiempo/esfuerzo
- 2-3 sobre confianza/credibilidad
- 2-3 sobre si funcionará para ellos`,

      competitors: `Realiza una INVESTIGACIÓN COMPETITIVA EXHAUSTIVA en el mercado ${targetMarket} usando búsqueda web actualizada.

${baseContext}

INSTRUCCIONES CRÍTICAS:
- BUSCA competidores REALES con presencia online VERIFICABLE
- Incluye tanto competidores directos como indirectos
- Analiza su posicionamiento, no solo lo que venden
- Sé específico con URLs y precios reales

Lista 8-10 COMPETIDORES REALES. Para cada uno analiza:

1. INFORMACIÓN BÁSICA:
- Nombre real de la empresa/marca
- Website completo (ej: https://ejemplo.com)
- Instagram (ej: @cuenta)
- TikTok (ej: @cuenta)
- Otros canales relevantes

2. ESTRATEGIA DE MARKETING:
- Promesa de marketing principal (su headline o claim principal)
- Diferenciador clave (qué los hace únicos según ellos)
- Tono de comunicación (formal, casual, inspiracional, técnico, etc.)
- Canales de adquisición principales (ads, SEO, influencers, etc.)

3. ANÁLISIS DE CONTENIDO:
- Qué tipo de contenido publican (videos, carruseles, posts, blogs, etc.)
- Frecuencia de publicación estimada
- Engagement promedio (alto/medio/bajo)
- Gaps en su comunicación: ¿qué NO están diciendo que deberían?
- Qué funciona bien de su contenido y qué se puede mejorar

4. OFERTA COMERCIAL:
- Rango de precios específico (ej: "$197-$997 USD")
- Modelo de negocio (suscripción, pago único, freemium, etc.)
- Garantías que ofrecen
- Feature comparison: qué incluyen vs qué NO incluyen

5. ANÁLISIS SWOT + NIVEL DE AMENAZA:
- Fortalezas (3 mínimo): ¿qué hacen bien? ¿por qué los clientes los eligen?
- Debilidades (3 mínimo): ¿dónde fallan? ¿qué quejas tienen sus clientes?
- Oportunidad para nosotros: ¿cómo podemos diferenciarnos de este competidor?
- Nivel de amenaza (1-10): ¿qué tan peligroso es este competidor para nosotros y por qué?

TIPOS DE COMPETIDORES A INCLUIR:
- 3-4 competidores directos (mismo producto/servicio)
- 2-3 competidores indirectos (soluciones alternativas)
- 1-2 competidores aspiracionales (líderes del mercado)
- 1-2 competidores emergentes (nuevos pero creciendo)`,

      avatars: `Crea 5 BUYER PERSONAS ULTRA-DETALLADOS basados en la investigación psicográfica previa.

${baseContext}

DOLORES PRINCIPALES IDENTIFICADOS:
${prevPains?.pains?.slice(0, 5).map((p: any) => `- ${p.pain}: ${p.why}`).join('\n') || 'N/A'}

DESEOS PRINCIPALES IDENTIFICADOS:
${prevPains?.desires?.slice(0, 5).map((d: any) => `- ${d.desire}: ${d.emotion}`).join('\n') || 'N/A'}

OBJECIONES IDENTIFICADAS:
${prevPains?.objections?.slice(0, 5).map((o: any) => `- ${o.objection}`).join('\n') || 'N/A'}

INSTRUCCIONES CRÍTICAS:
- Cada avatar debe sentirse como una PERSONA REAL, no un estereotipo
- Usa nombres que reflejen su personalidad o situación
- Incluye detalles específicos que hagan al avatar memorable
- Las frases deben sonar 100% naturales, como si las escucharas en una conversación

Crea EXACTAMENTE 5 AVATARES. Para cada uno:

1. PERFIL DEMOGRÁFICO:
- Nombre simbólico memorable (ej: "María La Emprendedora Saturada", "Carlos El Escéptico")
- Edad específica y etapa de vida (no rangos, una edad concreta)
- Ocupación/profesión detallada
- Situación familiar
- Ubicación típica
- Nivel socioeconómico
- Rango de ingreso mensual estimado (ej: "$1,500-$3,000 USD")

2. SITUACIÓN ACTUAL (ANTES del producto):
- Descripción detallada de su RUTINA DIARIA (desde que se levanta hasta que se duerme - un párrafo de 4-5 oraciones)
- Qué ha intentado antes para resolver su problema (mínimo 3 intentos fallidos)
- Por qué no le ha funcionado cada intento
- Cómo se siente con su situación actual (emociones específicas)
- Su diálogo interno: qué se dice a sí mismo sobre este problema

3. PSICOGRAFÍA PROFUNDA:
- Nivel de conciencia Eugene Schwartz (Unaware/Problem Aware/Solution Aware/Product Aware/Most Aware)
- 3 drivers psicológicos principales (qué lo mueve a actuar)
- 3 sesgos cognitivos que tiene (cómo toma decisiones irracionales)
- 3 objeciones específicas de ESTE avatar (no genéricas, con la frase exacta que diría)
- Valores personales (qué es lo más importante para esta persona)
- 3 miedos más profundos (no superficiales)
- Su identidad: cómo se define a sí mismo en una oración

4. COMUNICACIÓN:
- 5-6 frases TEXTUALES que dice (entre comillas, en primera persona)
- Ejemplos: "Ya no sé qué más intentar", "Siento que estoy dejando pasar el tiempo"
- Palabras y expresiones que usa frecuentemente
- Tono de comunicación que prefiere (casual, profesional, inspiracional)

5. COMPORTAMIENTO Y CONSUMO DE CONTENIDO:
- Metas a corto plazo (siguiente 3-6 meses)
- Metas a largo plazo (1-3 años)
- Dónde consume contenido (plataformas específicas con horas de uso estimadas)
- Formatos que prefiere (videos cortos, carruseles, blogs, podcasts, stories)
- Cuentas específicas de referencia que sigue (influencers, marcas, medios)
- Horarios en que está más activo en redes
- Cómo investiga antes de comprar (Google, YouTube reviews, pregunta a amigos, etc.)
- Qué lo haría actuar HOY (el empujón final)

6. TRIGGER DE COMPRA:
- ¿Qué evento o situación lo llevaría a buscar una solución AHORA? (momento específico)
- ¿Qué necesita ver/escuchar para confiar? (tipo de prueba social)
- ¿Cuál sería su momento "aha"? (la revelación que lo convence)
- ¿Cuánto tiempo le toma decidirse desde que conoce la solución?`,

      differentiation: `Realiza un ANÁLISIS ESTRATÉGICO DE DIFERENCIACIÓN usando el framework ESFERA y los datos de competencia.

${baseContext}

COMPETIDORES ANALIZADOS:
${prevCompetitors?.competitors?.slice(0, 5).map((c: any) => `- ${c.name}: ${c.promise} | Debilidades: ${c.weaknesses?.join(', ')}`).join('\n') || 'N/A'}

AVATARES DEFINIDOS:
${prevAvatars?.avatars?.map((a: any) => `- ${a.name}: ${a.situation?.dayToDay?.substring(0, 100) || a.situation?.currentFeeling || 'Sin descripción'}...`).join('\n') || 'N/A'}

INSTRUCCIONES CRÍTICAS:
- Identifica GAPS reales en el mercado, no suposiciones
- Cada oportunidad debe ser accionable y específica
- Conecta la diferenciación con los avatares identificados
- El framework ESFERA es: Enganchar → Solución → Remarketing → Fidelizar

Genera un análisis EXHAUSTIVO:

1. ANÁLISIS DE DIFERENCIACIÓN:

a) MENSAJES SATURADOS (5-6):
Para cada mensaje saturado incluye:
- message: El mensaje que todos repiten
- opportunity: Cómo decir lo mismo de forma diferente o qué decir en su lugar
- example: Ejemplo de copy diferenciado

b) DOLORES MAL COMUNICADOS (5-6):
Para cada dolor incluye:
- pain: El dolor que la competencia no comunica bien
- opportunity: Por qué es una oportunidad
- howToUse: Cómo usarlo en nuestra comunicación (con ejemplo)

c) OPORTUNIDADES DE POSICIONAMIENTO (5-6):
Para cada oportunidad incluye:
- opportunity: La oportunidad específica
- why: Por qué nadie la está aprovechando
- execution: Cómo ejecutarla (táctica concreta)
- forAvatar: Para qué avatar es más relevante

d) EMOCIONES NO EXPLOTADAS (4-5):
Para cada emoción incluye:
- emotion: La emoción que nadie está activando
- howToUse: Cómo activarla en contenido (con ejemplo de hook)

2. INSIGHTS ESFERA DETALLADOS:

ENGANCHAR (Top of Funnel):
- whatDominates: Qué tipo de contenido domina actualmente
- whatIsSaturated: Qué está saturado y ya no funciona
- opportunities: 3-4 oportunidades de diferenciación
- hookTypes: 5-6 tipos de hooks que funcionarían
- platforms: Plataformas prioritarias para enganchar
- contentFormats: Formatos recomendados

SOLUCIÓN (Middle of Funnel):
- currentPromises: Promesas actuales del mercado
- unresolvedObjections: Objeciones que nadie está resolviendo
- authorityOpportunities: Cómo construir autoridad diferenciada
- educationAngles: Ángulos educativos únicos
- proofTypes: Tipos de prueba que funcionarían

REMARKETING (Decision Stage):
- existingSocialProof: Qué prueba social usa la competencia
- gaps: Vacíos en la comunicación de remarketing
- decisionMessages: Mensajes que ayudan a decidir (mínimo 5)
- urgencyTactics: Tácticas de urgencia éticas (mínimo 3)
- objectionHandling: Cómo manejar objeciones finales (mínimo 5, una por objeción principal)
- touchpointSequence: Secuencia de 5-7 touchpoints con mensajes específicos para remarketing (emails, DMs, stories, ads)
- retargetingAngles: 3 ángulos diferentes para retargetear a quienes visitaron pero no compraron

FIDELIZAR (Post-Purchase):
- commonMistakes: Errores comunes post-venta (mínimo 4)
- communityOpportunities: Oportunidades de comunidad (mínimo 3)
- retentionStrategies: Estrategias de retención específicas (mínimo 4)
- referralAngles: Cómo incentivar referidos (mínimo 3 tácticas con ejemplo)
- postPurchaseContent: 5 tipos de contenido post-compra (onboarding, tutoriales, casos de éxito, behind the scenes, Q&A)
- loyaltyProgram: Estructura sugerida de programa de lealtad o embajadores
- npsStrategy: Cuándo y cómo medir satisfacción + qué hacer con las respuestas

3. POSICIONAMIENTO DE MARCA:

a) TERRITORIO DE MARCA:
- brandTerritory: El espacio mental que la marca debe ocupar (ej: "la marca que hace X simple para Y")
- brandNarrative: La narrativa central de la marca (ej: "De [situación actual] a [transformación] sin [obstáculo común]")
- commonEnemy: El enemigo común contra el que pelea la marca junto con su audiencia (ej: "los gurús que prometen resultados fáciles", "la complejidad innecesaria del mercado")
- categoryCreation: Si aplica, sugerir una nueva categoría vs competir en la existente (ej: en vez de "curso de marketing", ser "sistema de atracción de clientes")

4. RESUMEN EJECUTIVO:

- marketSummary: Resumen del estado del mercado con datos concretos (2 párrafos)
- opportunityScore: Score de oportunidad del 1 al 10 (número)
- opportunityScoreJustification: Justificación clara del score con datos
- keyInsights: 5 insights clave (cada uno con: insight, importance, action recomendada)
- psychologicalDrivers: 3-5 drivers psicológicos del comprador (cada uno con: driver, why - por qué es poderoso, howToUse - cómo usarlo en marketing)
- immediateActions: 3-5 acciones concretas para esta semana (cada una con: action, howTo - paso a paso, expectedResult)
- quickWins: 2-4 victorias rápidas de bajo esfuerzo y alto impacto (cada una con: win, effort - nivel de esfuerzo, impact - impacto esperado)
- risksToAvoid: 2-4 riesgos estratégicos a evitar (cada uno con: risk, why - consecuencia de ignorarlo)
- finalRecommendation: Recomendación estratégica priorizada con timeline (semana 1, mes 1, mes 3)`,

      sales_angles: `Crea 20 ÁNGULOS DE VENTA ESTRATÉGICOS Y CREATIVOS basados en la investigación completa.

${baseContext}

AVATARES Y SUS DRIVERS:
${prevAvatars?.avatars?.map((a: any) => `- ${a.name}: Drivers: ${Array.isArray(a.psychographics?.drivers) ? a.psychographics.drivers.join(', ') : (a.drivers || 'N/A')} | Frases: ${Array.isArray(a.communication?.phrases) ? a.communication.phrases.slice(0, 2).join(', ') : (a.phrases || 'N/A')}`).join('\n') || 'N/A'}

OPORTUNIDADES DE DIFERENCIACIÓN:
${prevDiff?.differentiation?.positioningOpportunities?.map((o: any) => `- ${o.opportunity}: ${o.why}`).join('\n') || 'N/A'}

DOLORES MAL COMUNICADOS:
${prevDiff?.differentiation?.poorlyAddressedPains?.map((p: any) => `- ${p.pain}`).join('\n') || 'N/A'}

INSTRUCCIONES CRÍTICAS:
- Cada ángulo debe ser ÚNICO y diferenciado
- Los hooks deben ser irresistibles y específicos
- Varía los tipos para tener arsenal completo
- Conecta cada ángulo con un avatar y emoción específicos

Genera EXACTAMENTE 20 ÁNGULOS DE VENTA:

DISTRIBUCIÓN POR TIPO (2-3 de cada uno):
- educativo: Enseñar algo nuevo que cambie su perspectiva
- emocional: Conectar con sentimientos profundos
- aspiracional: Mostrar la versión mejorada de sí mismos
- autoridad: Demostrar expertise y credibilidad
- comparativo: Contrastar con alternativas (sin atacar)
- anti-mercado: Ir contra lo establecido, ser contrarian
- storytelling: Narrativas que enganchen
- prueba-social: Validación externa, testimonios
- error-comun: Alertar sobre errores que están cometiendo

Para CADA ÁNGULO incluye:

1. angle (3-4 oraciones):
   - Descripción completa del ángulo
   - Por qué funciona psicológicamente
   - Cómo desarrollarlo en contenido

2. type: El tipo de ángulo (de la lista anterior)

3. avatar: Nombre del avatar específico al que apunta

4. emotion: Emoción principal que activa (sé específico: no "felicidad" sino "alivio de finalmente encontrar la solución")

5. contentType: Formato ideal para este ángulo (Video UGC, Carrusel, Story, Reel, Video largo, Imagen, etc.)

6. hookExample: Ejemplo de HOOK completo y listo para usar. Debe ser:
   - Específico, no genérico
   - Provocador o intrigante
   - En primera o segunda persona
   - Máximo 2 oraciones

7. ctaExample: CTA específico para este ángulo (ej: "Comenta 'GUÍA' y te envío el método gratis", "Link en bio para tu diagnóstico gratuito")

8. funnelPhase: Fase del funnel donde funciona mejor
   - "tofu" (Top of Funnel - awareness)
   - "mofu" (Middle of Funnel - consideración)
   - "bofu" (Bottom of Funnel - decisión)

9. hashtags: 5 hashtags relevantes para este ángulo

EJEMPLOS DE BUENOS HOOKS:
- "Gasté $5,000 en cursos de marketing y esto es lo único que funcionó"
- "El error que comete el 90% de [avatar] y que está saboteando sus resultados"
- "Dejé de [solución común] y mis ventas se triplicaron"`,

      puv_transformation: `Construye una PROPUESTA ÚNICA DE VALOR PODEROSA y una TABLA DE TRANSFORMACIÓN completa.

${baseContext}

ÁNGULOS DE VENTA MÁS FUERTES:
${prevSales?.salesAngles?.slice(0, 8).map((a: any) => `- [${a.type}] ${a.hookExample}`).join('\n') || 'N/A'}

DIFERENCIADORES CLAVE:
${prevDiff?.differentiation?.positioningOpportunities?.slice(0, 3).map((o: any) => `- ${o.opportunity}`).join('\n') || 'N/A'}

INSTRUCCIONES CRÍTICAS:
- La PUV debe ser MEMORABLE y fácil de comunicar
- El statement debe pasar la "prueba del taxi" (explicable en 10 segundos)
- La transformación debe ser VÍVIDA y específica

Genera:

1. PUV - PROPUESTA ÚNICA DE VALOR:

a) centralProblem (2-3 oraciones):
   - El problema central ESPECÍFICO que resuelve
   - Por qué es un problema tan importante
   - Qué pasa si no se resuelve

b) tangibleResult (2-3 oraciones):
   - El resultado tangible y MEDIBLE que obtienen
   - En cuánto tiempo lo obtienen
   - Cómo sabrán que lo lograron

c) marketDifference (2-3 oraciones):
   - Qué hace a esta solución FUNDAMENTALMENTE diferente
   - Por qué las alternativas no funcionan tan bien
   - El "secreto" o metodología única

d) idealClient (1 oración):
   - Descripción del cliente ideal en una oración memorable
   - Ejemplo: "Emprendedores que ya facturan pero no pueden escalar sin quemarse"

e) statement (máximo 25 palabras):
   - El statement PUV completo y poderoso
   - Debe incluir: para quién, qué logran, cómo/por qué es único
   - Ejemplo: "Ayudamos a coaches a conseguir clientes high-ticket sin ads, usando un sistema de contenido que vende mientras duermes"

f) credibility (2-3 oraciones):
   - Por qué es creíble esta promesa
   - Qué respalda la afirmación
   - Por qué es sostenible en el tiempo

g) variations (3 variaciones de la PUV para diferentes canales):
   - instagramBio: Versión corta para bio de Instagram (máx 150 caracteres)
   - elevatorPitch: Versión para pitch verbal de 10 segundos (1-2 oraciones)
   - adHeadline: Versión para headline de anuncio (máx 10 palabras, impactante)

2. TABLA DE TRANSFORMACIÓN (Antes → Después):

Para CADA dimensión, describe vívidamente el ANTES y el DESPUÉS:

a) functional (transformación práctica):
   - before: Qué NO puede hacer, qué le cuesta, qué le toma tiempo (2-3 oraciones)
   - after: Qué PUEDE hacer ahora, qué le resulta fácil, cuánto tiempo ahorra (2-3 oraciones)

b) emotional (transformación emocional):
   - before: Cómo se SIENTE (frustrado, ansioso, abrumado, etc.) - ser específico
   - after: Cómo se SIENTE (confiado, tranquilo, emocionado, etc.) - ser específico

c) identity (transformación de identidad):
   - before: Cómo se VE a sí mismo (inseguro, estancado, amateur, etc.)
   - after: Cómo se VE a sí mismo (experto, líder, profesional, etc.)

d) social (transformación social):
   - before: Cómo lo VEN los demás (su familia, colegas, clientes)
   - after: Cómo lo VEN los demás (respeto, admiración, referencia)

e) financial (transformación económica):
   - before: Situación financiera actual (ingresos, gastos, estrés)
   - after: Situación financiera futura (números específicos si es posible)`,

      lead_magnets: `Diseña 3 LEAD MAGNETS IRRESISTIBLES basados en la investigación de avatares y dolores.

${baseContext}

AVATARES DEFINIDOS:
${prevAvatars?.avatars?.map((a: any) => `- ${a.name}: ${a.situation?.dayToDay?.substring(0, 80) || a.situation?.currentFeeling || 'Sin descripción'}...`).join('\n') || 'N/A'}

DOLORES PRINCIPALES:
${prevPains?.pains?.slice(0, 6).map((p: any) => `- ${p.pain}: ${p.why}`).join('\n') || 'N/A'}

DESEOS PRINCIPALES:
${prevPains?.desires?.slice(0, 4).map((d: any) => `- ${d.desire}`).join('\n') || 'N/A'}

INSTRUCCIONES CRÍTICAS:
- Cada lead magnet debe ser tan valioso que lo querrían pagar
- Los nombres deben ser irresistibles y específicos
- La estructura debe ser práctica y accionable
- Variar formatos para diferentes preferencias de consumo

Crea EXACTAMENTE 3 LEAD MAGNETS:

Lead Magnet 1: Para avatar en fase PROBLEM AWARE
Lead Magnet 2: Para avatar en fase SOLUTION AWARE
Lead Magnet 3: Para avatar en fase PRODUCT AWARE

Para CADA lead magnet incluye:

1. name: Nombre irresistible (debe generar curiosidad y prometer un resultado)
   - Ejemplos buenos: "El Método de 7 Días para [resultado]", "La Guía Definitiva de [tema]", "Los 5 Errores que [avatar] Cometen"

2. format: Formato específico
   - PDF/Ebook, Video Training, Quiz/Assessment, Plantilla/Template, Checklist, Webinar, Mini-Curso, Calculadora

3. objective: Objetivo de conversión (qué queremos que hagan después)
   - Ejemplo: "Agendar llamada de descubrimiento", "Comprar oferta de entrada"

4. pain: El dolor PRINCIPAL que ataca (conectar con los dolores investigados)

5. avatar: Nombre del avatar específico para el que es

6. awarenessPhase: Fase de conciencia target
   - "problem_aware", "solution_aware", "product_aware"

7. promise: Promesa en UNA oración poderosa
   - Debe ser específica, creíble y deseable
   - Ejemplo: "Descubre el sistema exacto que usamos para generar $10K/mes en solo 2 horas diarias"

8. structure: Array de 5-7 secciones/módulos del lead magnet
   - Cada bullet debe ser un título de sección atractivo
   - Debe haber progresión lógica
   - El último bullet debe ser un CTA o próximo paso

9. deliveryMethod: Cómo se entrega (email, acceso inmediato, drip, etc.)

10. estimatedTime: Tiempo estimado de consumo`,

      video_creatives: `Crea 25 IDEAS DE CONTENIDO/VIDEO con guiones resumidos, distribuidas por fase ESFERA.

${baseContext}

ÁNGULOS DE VENTA DISPONIBLES:
${prevSales?.salesAngles?.slice(0, 12).map((a: any) => `- [${a.type}] "${a.hookExample}" → Avatar: ${a.avatar}`).join('\n') || 'N/A'}

AVATARES:
${prevAvatars?.avatars?.map((a: any) => `- ${a.name}`).join(', ') || 'N/A'}

ESFERA INSIGHTS:
- Enganchar: ${Array.isArray(prevDiff?.esferaInsights?.enganchar?.opportunities) ? prevDiff.esferaInsights.enganchar.opportunities.slice(0, 2).join(', ') : (prevDiff?.esferaInsights?.enganchar?.opportunities || 'captar atención')}
- Solución: ${Array.isArray(prevDiff?.esferaInsights?.solucion?.educationAngles) ? prevDiff.esferaInsights.solucion.educationAngles.slice(0, 2).join(', ') : (prevDiff?.esferaInsights?.solucion?.educationAngles || 'educar y presentar')}
- Remarketing: ${Array.isArray(prevDiff?.esferaInsights?.remarketing?.decisionMessages) ? prevDiff.esferaInsights.remarketing.decisionMessages.slice(0, 2).join(', ') : (prevDiff?.esferaInsights?.remarketing?.decisionMessages || 'reforzar decisión')}
- Fidelizar: ${Array.isArray(prevDiff?.esferaInsights?.fidelizar?.communityOpportunities) ? prevDiff.esferaInsights.fidelizar.communityOpportunities.slice(0, 2).join(', ') : (prevDiff?.esferaInsights?.fidelizar?.communityOpportunities || 'retener y referir')}

INSTRUCCIONES CRÍTICAS:
- Cada idea debe ser PRODUCIBLE rápidamente por un equipo pequeño
- Los hooks deben ser IRRESISTIBLES
- PRIORIZAR formatos que NO requieren producción audiovisual compleja:
  * Carruseles de Instagram/LinkedIn (PRIORIDAD ALTA - fáciles de producir, alto engagement)
  * Reels con texto en pantalla (sin necesidad de grabar persona hablando)
  * Stories con stickers, encuestas, quizzes
  * Posts estáticos con copy potente
  * Memes y contenido de tendencia
  * Infografías y datos visuales
  * Quotes/Frases motivacionales
  * Behind the scenes (fotos simples)
  * Threads/Hilos
- Los videos UGC y Talking Head son SECUNDARIOS (máximo 5 de 25)
- Variar formatos para mantener el feed fresco

Crea EXACTAMENTE 25 CREATIVOS distribuidos:
- 7 para ENGANCHAR (Top of Funnel - atención y curiosidad)
- 7 para SOLUCIÓN (Middle of Funnel - educar y presentar)
- 6 para REMARKETING (Decision Stage - reforzar y convertir)
- 5 para FIDELIZAR (Post-Purchase - retener y referir)

DISTRIBUCIÓN DE FORMATOS RECOMENDADA:
- 6-8 Carruseles (educativos, comparativos, paso a paso)
- 4-5 Reels con texto/caption (sin persona hablando, solo texto animado + música)
- 3-4 Stories interactivas (encuestas, quizzes, preguntas)
- 2-3 Posts estáticos (quotes, datos, memes de nicho)
- 2-3 Infografías
- 2-3 Behind the scenes / Threads
- Máximo 3-5 Videos con persona hablando (UGC o Talking Head)

Para CADA creativo incluye:

1. number: Número del creativo (1-25)

2. angle: El ángulo de venta que usa (de los investigados)

3. avatar: Avatar específico al que apunta

4. title: Hook/Título IRRESISTIBLE (máximo 15 palabras)
   - Debe generar curiosidad o provocar emoción
   - Puede ser pregunta, afirmación controversial, o promesa

5. idea: Descripción de la idea (3-4 oraciones)
   - De qué trata el contenido
   - Qué mensaje transmite
   - Por qué funcionaría

6. structure: Estructura del contenido en 4 pasos
   - hook: Primeros 3 segundos o primera slide/línea (gancho)
   - body: Desarrollo del contenido
   - climax: Punto culminante o revelación
   - cta: Llamada a la acción

7. format: Formato específico
   - Carrusel, Reel texto, Story interactiva, Post estático, Infografía, Meme/Trend, Thread, Behind the Scenes, Quote, Video UGC, Talking Head, Tutorial, Comparación

8. esferaPhase: Fase del funnel
   - "enganchar", "solucion", "remarketing", "fidelizar"

9. duration: Duración sugerida (ej: "5 slides", "15-30 seg", "7 slides", "Story 3 partes")

10. platform: Plataforma ideal (Instagram, TikTok, LinkedIn, Twitter/X, Stories)

11. productionNotes: Notas de producción (qué se necesita: diseñador para carrusel, editor para reel, solo copy, foto simple, etc.)`,

      content_calendar: `Crea una PARRILLA DE CONTENIDO PROFESIONAL PARA 28 DÍAS (4 semanas) basada en toda la investigación estratégica previa.

${baseContext}

AVATARES DEFINIDOS:
${prevAvatars?.avatars?.map((a: any) => `- ${a.name}`).join(', ') || 'N/A'}

ÁNGULOS DE VENTA DISPONIBLES:
${prevSales?.salesAngles?.slice(0, 10).map((a: any) => `- [${a.type}] "${a.hookExample}" → Avatar: ${a.avatar}`).join('\n') || 'N/A'}

ESFERA INSIGHTS:
- Enganchar: ${Array.isArray(prevDiff?.esferaInsights?.enganchar?.opportunities) ? prevDiff.esferaInsights.enganchar.opportunities.slice(0, 3).join(', ') : 'captar atención'}
- Solución: ${Array.isArray(prevDiff?.esferaInsights?.solucion?.educationAngles) ? prevDiff.esferaInsights.solucion.educationAngles.slice(0, 3).join(', ') : 'educar y presentar'}
- Remarketing: ${Array.isArray(prevDiff?.esferaInsights?.remarketing?.decisionMessages) ? prevDiff.esferaInsights.remarketing.decisionMessages.slice(0, 3).join(', ') : 'reforzar decisión'}
- Fidelizar: ${Array.isArray(prevDiff?.esferaInsights?.fidelizar?.communityOpportunities) ? prevDiff.esferaInsights.fidelizar.communityOpportunities.slice(0, 3).join(', ') : 'retener y referir'}

INSTRUCCIONES CRÍTICAS:
- Genera contenido LISTO PARA PUBLICAR (copy completo, hashtags, CTA)
- Cada pieza debe estar conectada con un avatar, ángulo y fase ESFERA
- Varía formatos: Carruseles, Stories, Reels con texto, Posts estáticos, Threads, Memes, Infografías, Quotes, BTS, Encuestas
- Distribución de pilares: 40% educativo, 20% emocional, 15% autoridad, 15% venta, 10% comunidad
- Incluye 3 días estratégicos para promocionar lead magnets
- Cada semana debe tener un tema/objetivo claro

GENERA EXACTAMENTE:

1. CALENDARIO (28-35 piezas de contenido):
Para CADA pieza incluye:
- week: Semana (1-4)
- day: Día de la semana (1-7, donde 1=Lunes)
- dayLabel: Etiqueta legible (ej: "Lunes - Semana 1")
- platform: Plataforma principal (Instagram, TikTok, LinkedIn, Twitter)
- format: Formato específico (Carrusel, Story, Reel con texto, Post estático, Thread, Meme, Infografía, Quote, BTS, Encuesta)
- pillar: Pilar de contenido ("educativo", "emocional", "autoridad", "venta", "comunidad")
- title: Título/concepto del contenido
- hook: Primera línea o gancho de apertura (IRRESISTIBLE, máx 2 oraciones)
- description: De qué trata el contenido (2-3 oraciones)
- copy: Copy listo para publicar (2-3 oraciones con emojis)
- cta: Llamada a la acción específica
- hashtags: Array de 3-5 hashtags relevantes
- esferaPhase: Fase ESFERA ("enganchar", "solucion", "remarketing", "fidelizar")
- avatar: Nombre del avatar objetivo
- productionNotes: Instrucciones para el diseñador/editor (qué diseñar, referencias visuales)

DISTRIBUCIÓN POR SEMANA:
- Semana 1: Awareness y Educación (enganchar + educativo)
- Semana 2: Autoridad y Conexión (solucion + emocional)
- Semana 3: Conversión y Prueba Social (remarketing + venta + autoridad)
- Semana 4: Comunidad y Fidelización (fidelizar + comunidad + venta)

FRECUENCIA: 7 publicaciones por semana (1 diaria)

2. TEMAS SEMANALES (4 temas):
Para cada semana incluye:
- week: Número de semana
- theme: Tema central de la semana
- objective: Objetivo estratégico (ej: "Generar awareness del problema")
- focusPhase: Fase ESFERA dominante

3. DÍAS DE LEAD MAGNET (3 días):
Para cada día incluye:
- week: Semana
- day: Día
- leadMagnetName: Nombre del lead magnet a promocionar
- promotionCopy: Copy de promoción del lead magnet (2-3 oraciones)`,

      launch_strategy: `Diseña una ESTRATEGIA DE LANZAMIENTO COMPLETA para el producto, con plan detallado de Pre-Lanzamiento, Día de Lanzamiento y Post-Lanzamiento.

${baseContext}

AVATARES DEFINIDOS:
${prevAvatars?.avatars?.map((a: any) => `- ${a.name}: Trigger de compra: ${typeof a.purchaseTrigger === 'string' ? a.purchaseTrigger : (a.purchaseTrigger?.event || a.trigger || 'N/A')}`).join('\n') || 'N/A'}

PUV:
${prevSales?.salesAngles?.length ? `Ángulos principales: ${prevSales.salesAngles.slice(0, 5).map((a: any) => a.hookExample).join(' | ')}` : 'N/A'}

TRANSFORMACIÓN:
${(previousResults as any).puv_transformation?.puv?.statement || 'N/A'}

INSTRUCCIONES CRÍTICAS:
- Plan REALISTA y ejecutable por un equipo pequeño (1-5 personas)
- Incluye tanto estrategia orgánica como de pago
- Cada acción debe tener fecha/semana, canal y responsable
- Incluye secuencia de emails con copy resumido
- Presupuesto adaptado al mercado LATAM
- Métricas claras para medir éxito en cada fase

GENERA UN PLAN COMPLETO:

1. PRE-LANZAMIENTO (2-3 semanas antes):
- duration: Duración del pre-lanzamiento
- objectives: 3-5 objetivos medibles del pre-lanzamiento
- actions: 5-8 acciones específicas con semana, canal y detalles
- contentPlan: 5-7 tipos de contenido a publicar durante el pre-lanzamiento
- checklist: 8-12 items del checklist pre-lanzamiento (todo lo que debe estar listo)

2. DÍA DE LANZAMIENTO:
- dayPlan: Plan hora a hora (5-8 acciones con time, action, channel, details)
  Ejemplo: "8:00 AM - Publicar video de anuncio en Instagram"
- offer: Estructura de oferta completa:
  - description: Qué incluye la oferta
  - price: Precio y estructura (early bird, regular, premium)
  - bonuses: 3-5 bonos que aumenten el valor percibido
  - urgency: Táctica de urgencia (timer, cupos limitados, etc.)
  - scarcity: Táctica de escasez (primeros X, edición limitada, etc.)
  - guarantee: Garantía que elimine el riesgo
- emailSequence: 5-7 emails de lanzamiento:
  Para cada email:
  - day: Cuándo se envía (ej: "Día -3", "Día 0 AM", "Día +1")
  - subject: Asunto del email (debe generar apertura)
  - preview: Texto de preview (50-80 caracteres)
  - bodyOutline: Resumen del cuerpo del email (3-4 bullets)
  - cta: Llamada a la acción específica
- channels: Canales a usar con rol y contenido específico

3. POST-LANZAMIENTO (2 semanas después):
- retentionActions: 4-6 acciones de retención de compradores
- postSaleContent: 4-6 tipos de contenido post-venta (onboarding, tutoriales, etc.)
- referralStrategy: Estrategia de referidos (1-2 párrafos)
- nonBuyerFollowUp: 3-5 acciones para quienes no compraron
- analysisChecklist: 4-6 métricas y análisis a realizar post-lanzamiento

4. PRESUPUESTO:
- organic: Items del presupuesto orgánico con costo estimado
- paid: Items del presupuesto de pauta con costo y plataforma
- totalEstimated: Total estimado en USD

5. TIMELINE (6-8 hitos):
Para cada hito:
- phase: Pre-launch / Launch / Post-launch
- week: Semana relativa (ej: "Semana -3", "Día 0", "Semana +1")
- milestone: Hito específico
- deliverables: Entregables de esa semana

6. EQUIPO:
Para cada rol:
- role: Nombre del rol
- responsibilities: 3-5 responsabilidades específicas
- hoursPerWeek: Horas estimadas por semana

7. MÉTRICAS DE ÉXITO:
- preLaunch: Métricas y targets del pre-lanzamiento
- launch: Métricas y targets del lanzamiento
- postLaunch: Métricas y targets del post-lanzamiento`,
    };

    return prompts[stepId] || '';
  };

  const schema = schemas[stepId];
  const prompt = getPrompt(stepId);

  if (!schema || !prompt) {
    return { success: false, error: `Unknown step: ${stepId}` };
  }

  // Tokens aumentados para generar contenido más descriptivo y detallado
  const tokenMap: Record<string, number> = {
    market_overview: 6000,    // Antes: 3500 - Ahora incluye más análisis PESTEL y tendencias
    jtbd: 5000,               // Antes: 2500 - Más profundidad en cada tipo de job
    pains_desires: 7000,      // Antes: 4000 - 10 pains, 10 desires, 10 objections con más detalle
    competitors: 8000,        // Antes: 4500 - 10 competidores con análisis completo
    avatars: 8000,            // Antes: 4500 - 5 avatares ultra-detallados con psicografía
    differentiation: 8000,    // Antes: 4500 - ESFERA completo + oportunidades detalladas
    sales_angles: 8000,       // Antes: 5000 - 20 ángulos con ejemplos completos
    puv_transformation: 6000, // Antes: 3000 - PUV elaborada + tabla de transformación
    lead_magnets: 5000,       // Antes: 2500 - 3 lead magnets con estructura completa
    video_creatives: 8000,    // Antes: 5000 - 25 creativos con guiones resumidos
    content_calendar: 16000,  // 30-45 piezas de contenido con copy completo - needs extra tokens to avoid truncation
    launch_strategy: 10000,   // Estrategia completa con emails, presupuesto, timeline
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
    // Don't throw - we don't want to lose progress in memory even if DB write fails
    // The consolidation at the end will retry the full save
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

  // Content Calendar (step 11)
  if (r.content_calendar) {
    update.content_calendar = {
      ...r.content_calendar,
      generatedAt: new Date().toISOString(),
    };
  }

  // Launch Strategy (step 12)
  if (r.launch_strategy) {
    update.launch_strategy = {
      ...r.launch_strategy,
      generatedAt: new Date().toISOString(),
    };
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

  // Basic Info
  if (briefData.productName) parts.push(`**Producto/Servicio:** ${briefData.productName}`);
  if (briefData.businessType) parts.push(`**Tipo de negocio:** ${briefData.businessType === 'personal_brand' ? 'Marca Personal' : 'Producto/Servicio'}`);
  if (briefData.category) parts.push(`**Categoría:** ${briefData.category}${briefData.customCategory ? ` - ${briefData.customCategory}` : ''}`);
  if (briefData.slogan) parts.push(`**Slogan:** ${briefData.slogan}`);
  if (briefData.currentObjective) parts.push(`**Objetivo actual:** ${briefData.currentObjective}`);

  // Product Details (NEW)
  if (briefData.priceRange) parts.push(`**Rango de precio:** ${briefData.priceRange}`);
  if (briefData.yearsInMarket) parts.push(`**Tiempo en el mercado:** ${briefData.yearsInMarket}`);
  if (briefData.deliveryMethod) parts.push(`**Método de entrega:** ${briefData.deliveryMethod}`);
  if (briefData.productFormat) parts.push(`**Formato/Estructura:** ${briefData.productFormat}`);
  if (briefData.guarantees) parts.push(`**Garantías:** ${briefData.guarantees}`);
  if (briefData.socialProof) parts.push(`**Prueba social existente:** ${briefData.socialProof}`);
  if (briefData.successStories) parts.push(`**Casos de éxito:** ${briefData.successStories}`);

  // Value Proposition
  if (briefData.mainBenefit) parts.push(`**Beneficio principal:** ${briefData.mainBenefit}`);
  if (briefData.transformation) parts.push(`**Transformación:** ${briefData.transformation}`);
  if (briefData.differentiator) parts.push(`**Diferenciador único:** ${briefData.differentiator}`);
  if (briefData.keyIngredients) parts.push(`**Componentes clave:** ${briefData.keyIngredients}`);
  if (briefData.mustCommunicate) parts.push(`**Comunicación obligatoria:** ${briefData.mustCommunicate}`);

  // Problem & Desire
  if (briefData.problemSolved) parts.push(`**Problema que resuelve:** ${briefData.problemSolved}`);
  if (briefData.rootCause) parts.push(`**Raíz del problema:** ${briefData.rootCause}`);
  if (briefData.failedSolutions) parts.push(`**Soluciones que han fallado antes:** ${briefData.failedSolutions}`);
  if (briefData.urgencyLevel) parts.push(`**Nivel de urgencia:** ${briefData.urgencyLevel}`);
  if (briefData.mainDesire) parts.push(`**Deseo principal:** ${briefData.mainDesire}`);
  if (briefData.consequenceOfNotBuying) parts.push(`**Consecuencia de no comprar:** ${briefData.consequenceOfNotBuying}`);
  if (briefData.competitiveAdvantage) parts.push(`**Ventaja competitiva:** ${briefData.competitiveAdvantage}`);

  // Neuromarketing
  if (briefData.reptileBrain?.length > 0) parts.push(`**Gatillos reptilianos:** ${briefData.reptileBrain.join(', ')}`);
  if (briefData.limbicBrain?.length > 0) parts.push(`**Emociones objetivo:** ${briefData.limbicBrain.join(', ')}`);
  if (briefData.cortexBrain) parts.push(`**Justificación racional:** ${briefData.cortexBrain}`);

  // Target Audience
  const audienceParts = [];
  if (briefData.targetGender) audienceParts.push(`Género: ${briefData.targetGender}`);
  if (briefData.targetAgeRange?.length > 0) audienceParts.push(`Edad: ${Array.isArray(briefData.targetAgeRange) ? briefData.targetAgeRange.join(', ') : briefData.targetAgeRange}`);
  if (briefData.targetOccupation) audienceParts.push(`Ocupación: ${briefData.targetOccupation}`);
  if (audienceParts.length > 0) parts.push(`**Público objetivo:** ${audienceParts.join(' | ')}`);

  if (briefData.targetInterests?.length > 0) parts.push(`**Intereses:** ${briefData.targetInterests.join(', ')}`);
  if (briefData.targetHabits) parts.push(`**Hábitos:** ${briefData.targetHabits}`);
  if (briefData.buyingPower) parts.push(`**Capacidad de pago:** ${briefData.buyingPower}`);
  if (briefData.decisionInfluencers) parts.push(`**Influenciadores de decisión:** ${briefData.decisionInfluencers}`);
  if (briefData.informationSources) parts.push(`**Fuentes de información:** ${briefData.informationSources}`);
  if (briefData.purchaseTriggers) parts.push(`**Triggers de compra:** ${briefData.purchaseTriggers}`);
  if (briefData.commonObjections?.length > 0) parts.push(`**Objeciones comunes:** ${briefData.commonObjections.join(', ')}`);
  if (briefData.idealScenario) parts.push(`**Escenario ideal post-compra:** ${briefData.idealScenario}`);

  // Content Strategy
  if (briefData.platforms?.length > 0) parts.push(`**Plataformas:** ${briefData.platforms.join(', ')}`);
  if (briefData.contentTypes?.length > 0) parts.push(`**Tipos de contenido:** ${briefData.contentTypes.join(', ')}`);
  if (briefData.useForAds) parts.push(`**Uso para Ads:** ${briefData.useForAds}`);
  if (briefData.brandVoice) parts.push(`**Voz de marca:** ${briefData.brandVoice}`);
  if (briefData.brandStrengths) parts.push(`**Fortalezas de marca:** ${briefData.brandStrengths}`);
  if (briefData.brandRestrictions) parts.push(`**Restricciones:** ${briefData.brandRestrictions}`);
  if (briefData.competitorContent) parts.push(`**Contenido de competencia:** ${briefData.competitorContent}`);
  if (briefData.budgetRange) parts.push(`**Presupuesto de producción:** ${briefData.budgetRange}`);
  if (briefData.referenceContent) parts.push(`**Referencias de contenido:** ${briefData.referenceContent}`);
  if (briefData.expectedResult) parts.push(`**Resultado esperado:** ${briefData.expectedResult}`);
  if (briefData.additionalNotes) parts.push(`**Notas adicionales:** ${briefData.additionalNotes}`);

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

      // Check dependencies - fail if a required step hasn't completed
      const missingDeps = step.dependsOn.filter((d) => !completedSteps.includes(d));
      if (missingDeps.length > 0) {
        const errMsg = `Dependencies not met for ${step.id}: missing ${missingDeps.join(', ')}`;
        console.error(`[product-research] ${errMsg}`);
        await savePartialResults(supabase, productId, results, completedSteps);
        return new Response(
          JSON.stringify({
            success: false,
            completedSteps,
            failedStep: step.id,
            error: errMsg,
          }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
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
