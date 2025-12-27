import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface QualityScoreRequest {
  action: "quality_score";
  contentId: string;
  organizationId: string;
}

interface EventDetectionRequest {
  action: "detect_events";
  contentId: string;
  organizationId: string;
  userId: string;
}

interface AntiFraudRequest {
  action: "anti_fraud";
  organizationId: string;
  timeRangeHours?: number;
}

interface QuestGenerationRequest {
  action: "generate_quests";
  organizationId: string;
  role?: string;
}

interface RuleRecommendationsRequest {
  action: "rule_recommendations";
  organizationId: string;
}

type RequestBody = 
  | QualityScoreRequest 
  | EventDetectionRequest 
  | AntiFraudRequest 
  | QuestGenerationRequest
  | RuleRecommendationsRequest;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Use OpenAI API Key for GPT
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body: RequestBody = await req.json();
    console.log("UP AI Co-Pilot action:", body.action);

    let result: any;

    switch (body.action) {
      case "quality_score":
        result = await evaluateQualityScore(supabase, body, OPENAI_API_KEY);
        break;
      case "detect_events":
        result = await detectEvents(supabase, body, OPENAI_API_KEY);
        break;
      case "anti_fraud":
        result = await checkAntiFraud(supabase, body, OPENAI_API_KEY);
        break;
      case "generate_quests":
        result = await generateQuests(supabase, body, OPENAI_API_KEY);
        break;
      case "rule_recommendations":
        result = await getRuleRecommendations(supabase, body, OPENAI_API_KEY);
        break;
      default:
        throw new Error("Invalid action");
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("UP AI Co-Pilot error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// GPT model to use - gpt-4o-mini for fast and cost-effective responses
const GPT_MODEL = "gpt-4o-mini";

async function callGPT(prompt: string, systemPrompt: string, apiKey: string, tools?: any[]) {
  console.log("Calling GPT with model:", GPT_MODEL);
  
  const body: any = {
    model: GPT_MODEL,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: prompt },
    ],
    max_tokens: 2000,
    temperature: 0.7,
  };

  if (tools) {
    body.tools = tools;
    body.tool_choice = { type: "function", function: { name: tools[0].function.name } };
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error("OpenAI API error:", response.status, text);
    throw new Error(`OpenAI API error: ${response.status} - ${text}`);
  }

  const data = await response.json();
  console.log("GPT response received");
  
  if (tools && data.choices?.[0]?.message?.tool_calls?.[0]) {
    return JSON.parse(data.choices[0].message.tool_calls[0].function.arguments);
  }
  
  return data.choices?.[0]?.message?.content || "";
}

async function evaluateQualityScore(supabase: any, req: QualityScoreRequest, apiKey: string) {
  // Fetch content details
  const { data: content, error } = await supabase
    .from("content")
    .select(`
      id, title, description, script, sales_angle, notes,
      strategist_guidelines, editor_guidelines, designer_guidelines,
      status, video_url, thumbnail_url,
      client:clients(name, category),
      product:products(name, description)
    `)
    .eq("id", req.contentId)
    .single();

  if (error) throw error;

  // Fetch correction history
  const { data: statusLogs } = await supabase
    .from("content_status_logs")
    .select("to_status, notes, moved_at")
    .eq("content_id", req.contentId)
    .eq("to_status", "issue")
    .order("moved_at", { ascending: false });

  const correctionCount = statusLogs?.length || 0;

  const systemPrompt = `Eres un evaluador experto de calidad de contenido UGC para la agencia UGC Colombia. 
Evalúa el contenido basándote en:
- Estructura del guión (hook, desarrollo, CTA)
- Coherencia con el brief/ángulo de venta
- Claridad y persuasión
- Potencial viral

Responde SOLO con la función tool_call solicitada.`;

  const prompt = `Evalúa este contenido:

TÍTULO: ${content.title}
DESCRIPCIÓN: ${content.description || "N/A"}
GUIÓN: ${content.script || "Sin guión"}
ÁNGULO DE VENTA: ${content.sales_angle || "N/A"}
CLIENTE: ${content.client?.name || "N/A"} (${content.client?.category || "N/A"})
PRODUCTO: ${content.product?.name || "N/A"} - ${content.product?.description || "N/A"}
GUIDELINES ESTRATEGA: ${content.strategist_guidelines || "N/A"}
CORRECCIONES PREVIAS: ${correctionCount}
ESTADO: ${content.status}
TIENE VIDEO: ${content.video_url ? "Sí" : "No"}
TIENE THUMBNAIL: ${content.thumbnail_url ? "Sí" : "No"}`;

  const tools = [{
    type: "function",
    function: {
      name: "evaluate_quality",
      description: "Evalúa la calidad del contenido y devuelve un score",
      parameters: {
        type: "object",
        properties: {
          score: { type: "integer", minimum: 0, maximum: 100, description: "Puntuación de calidad 0-100" },
          breakdown: {
            type: "object",
            properties: {
              hook: { type: "integer", minimum: 0, maximum: 100 },
              structure: { type: "integer", minimum: 0, maximum: 100 },
              cta: { type: "integer", minimum: 0, maximum: 100 },
              coherence: { type: "integer", minimum: 0, maximum: 100 },
              viralPotential: { type: "integer", minimum: 0, maximum: 100 }
            },
            required: ["hook", "structure", "cta", "coherence", "viralPotential"]
          },
          reasons: { 
            type: "array", 
            items: { type: "string" },
            description: "Razones principales del score"
          },
          suggestions: { 
            type: "array", 
            items: { type: "string" },
            description: "Sugerencias de mejora"
          }
        },
        required: ["score", "breakdown", "reasons", "suggestions"]
      }
    }
  }];

  const result = await callGPT(prompt, systemPrompt, apiKey, tools);

  // Save to database
  const { error: saveError } = await supabase
    .from("up_quality_scores")
    .upsert({
      content_id: req.contentId,
      organization_id: req.organizationId,
      score: result.score,
      breakdown: result.breakdown,
      reasons: result.reasons,
      suggestions: result.suggestions,
      ai_model: GPT_MODEL,
      evaluated_at: new Date().toISOString()
    }, { onConflict: "content_id" });

  if (saveError) console.error("Error saving quality score:", saveError);

  return {
    contentId: req.contentId,
    ...result,
    savedToDb: !saveError
  };
}

async function detectEvents(supabase: any, req: EventDetectionRequest, apiKey: string) {
  // Fetch recent content activity
  const { data: content } = await supabase
    .from("content")
    .select(`
      id, title, status, video_url, thumbnail_url, script,
      creator_id, editor_id, deadline, updated_at,
      raw_video_urls
    `)
    .eq("id", req.contentId)
    .single();

  if (!content) throw new Error("Content not found");

  // Fetch recent status logs
  const { data: recentLogs } = await supabase
    .from("content_status_logs")
    .select("to_status, moved_at")
    .eq("content_id", req.contentId)
    .order("moved_at", { ascending: false })
    .limit(5);

  const systemPrompt = `Eres un sistema de detección de eventos para gamificación de UGC Colombia.
Analiza la actividad del contenido y detecta eventos implícitos que podrían no haberse registrado.
Solo detecta eventos con alta confianza (>0.7).`;

  const prompt = `Analiza esta actividad de contenido:

CONTENIDO: ${content.title}
ESTADO ACTUAL: ${content.status}
TIENE VIDEO: ${content.video_url ? "Sí" : "No"}
TIENE THUMBNAIL: ${content.thumbnail_url ? "Sí" : "No"}
TIENE SCRIPT: ${content.script ? "Sí" : "No"}
RAW VIDEOS: ${content.raw_video_urls?.length || 0}
DEADLINE: ${content.deadline || "Sin deadline"}
ÚLTIMA ACTUALIZACIÓN: ${content.updated_at}
HISTORIAL RECIENTE: ${JSON.stringify(recentLogs || [])}

Detecta eventos que podrían haberse producido pero no se registraron.`;

  const tools = [{
    type: "function",
    function: {
      name: "detect_events",
      description: "Detecta eventos implícitos",
      parameters: {
        type: "object",
        properties: {
          suggestedEvents: {
            type: "array",
            items: {
              type: "object",
              properties: {
                eventType: { type: "string" },
                confidence: { type: "number", minimum: 0, maximum: 1 },
                evidence: { type: "array", items: { type: "string" } },
                recommendedPoints: { type: "integer" }
              },
              required: ["eventType", "confidence", "evidence", "recommendedPoints"]
            }
          }
        },
        required: ["suggestedEvents"]
      }
    }
  }];

  const result = await callGPT(prompt, systemPrompt, apiKey, tools);

  return {
    contentId: req.contentId,
    userId: req.userId,
    ...result
  };
}

async function checkAntiFraud(supabase: any, req: AntiFraudRequest, apiKey: string) {
  const timeRange = req.timeRangeHours || 168; // Default 7 days
  const since = new Date(Date.now() - timeRange * 60 * 60 * 1000).toISOString();

  // Fetch recent events
  const { data: events } = await supabase
    .from("up_events")
    .select("user_id, event_type_key, points_awarded, content_id, created_at")
    .eq("organization_id", req.organizationId)
    .gte("created_at", since)
    .order("created_at", { ascending: false });

  // Fetch user streaks
  const { data: userPoints } = await supabase
    .from("user_points")
    .select("user_id, consecutive_on_time, total_completions")
    .order("consecutive_on_time", { ascending: false })
    .limit(20);

  // Analyze patterns
  const userEventCounts: Record<string, number> = {};
  (events || []).forEach((e: any) => {
    userEventCounts[e.user_id] = (userEventCounts[e.user_id] || 0) + 1;
  });

  const systemPrompt = `Eres un sistema anti-fraude para el sistema de gamificación UP de UGC Colombia.
Detecta patrones sospechosos como:
- Rachas perfectas irreales
- Asignaciones repetidas entre mismos usuarios
- Aprobaciones sin review
- Spam de microtareas
Solo reporta patrones con evidencia clara.`;

  const prompt = `Analiza estos datos de actividad:

EVENTOS RECIENTES (${events?.length || 0}):
Top usuarios por eventos: ${JSON.stringify(userEventCounts)}

RACHAS ACTUALES:
${JSON.stringify(userPoints || [])}

PERIODO: Últimas ${timeRange} horas

Detecta patrones de fraude o gaming del sistema.`;

  const tools = [{
    type: "function",
    function: {
      name: "detect_fraud",
      description: "Detecta patrones de fraude",
      parameters: {
        type: "object",
        properties: {
          alerts: {
            type: "array",
            items: {
              type: "object",
              properties: {
                severity: { type: "string", enum: ["low", "medium", "high"] },
                alertType: { type: "string" },
                reason: { type: "string" },
                evidence: { type: "array", items: { type: "string" } },
                affectedUserId: { type: "string" }
              },
              required: ["severity", "alertType", "reason", "evidence"]
            }
          },
          summary: { type: "string" }
        },
        required: ["alerts", "summary"]
      }
    }
  }];

  const result = await callGPT(prompt, systemPrompt, apiKey, tools);

  // Save high-severity alerts to database
  for (const alert of result.alerts || []) {
    if (alert.severity === "high" || alert.severity === "medium") {
      await supabase.from("up_fraud_alerts").insert({
        organization_id: req.organizationId,
        user_id: alert.affectedUserId || null,
        severity: alert.severity,
        alert_type: alert.alertType,
        reason: alert.reason,
        evidence: alert.evidence
      });
    }
  }

  return result;
}

async function generateQuests(supabase: any, req: QuestGenerationRequest, apiKey: string) {
  // Fetch org stats
  const { data: recentEvents } = await supabase
    .from("up_events")
    .select("event_type_key, user_id, points_awarded")
    .eq("organization_id", req.organizationId)
    .gte("created_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

  // Analyze bottlenecks
  const eventCounts: Record<string, number> = {};
  (recentEvents || []).forEach((e: any) => {
    eventCounts[e.event_type_key] = (eventCounts[e.event_type_key] || 0) + 1;
  });

  // Fetch existing active quests
  const { data: activeQuests } = await supabase
    .from("up_quests")
    .select("title, goal_metric")
    .eq("organization_id", req.organizationId)
    .eq("is_active", true);

  const systemPrompt = `Eres un generador de misiones/retos para el sistema de gamificación UP de UGC Colombia.
Crea misiones semanales relevantes basadas en:
- Cuellos de botella detectados
- Objetivos de mejora de la agencia
- Engagement del equipo de creadores y editores
Las misiones deben ser alcanzables pero desafiantes.`;

  const prompt = `Genera misiones semanales para esta organización:

ESTADÍSTICAS (últimos 30 días):
${JSON.stringify(eventCounts)}

MISIONES ACTIVAS (evitar duplicados):
${JSON.stringify(activeQuests || [])}

ROL ESPECÍFICO: ${req.role || "todos los roles"}

Genera 3-5 misiones nuevas y relevantes para creadores de contenido UGC.`;

  const tools = [{
    type: "function",
    function: {
      name: "generate_quests",
      description: "Genera misiones semanales",
      parameters: {
        type: "object",
        properties: {
          quests: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                description: { type: "string" },
                goalMetric: { type: "string" },
                goalValue: { type: "integer" },
                rewardPoints: { type: "integer" },
                appliesTo: { type: "array", items: { type: "string" } },
                reasoning: { type: "string" }
              },
              required: ["title", "description", "goalMetric", "goalValue", "rewardPoints", "appliesTo", "reasoning"]
            }
          }
        },
        required: ["quests"]
      }
    }
  }];

  const result = await callGPT(prompt, systemPrompt, apiKey, tools);

  return {
    organizationId: req.organizationId,
    ...result
  };
}

async function getRuleRecommendations(supabase: any, req: RuleRecommendationsRequest, apiKey: string) {
  // Fetch current rules
  const { data: rules } = await supabase
    .from("up_rules")
    .select("name, event_type_key, points, is_active")
    .eq("organization_id", req.organizationId);

  // Fetch recent metrics
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  
  const { data: lateDeliveries } = await supabase
    .from("up_events")
    .select("id")
    .eq("organization_id", req.organizationId)
    .eq("event_type_key", "deadline_missed")
    .gte("created_at", thirtyDaysAgo);

  const { data: corrections } = await supabase
    .from("up_events")
    .select("id")
    .eq("organization_id", req.organizationId)
    .eq("event_type_key", "correction_requested")
    .gte("created_at", thirtyDaysAgo);

  const { data: deliveries } = await supabase
    .from("up_events")
    .select("id")
    .eq("organization_id", req.organizationId)
    .eq("event_type_key", "content_delivered")
    .gte("created_at", thirtyDaysAgo);

  const systemPrompt = `Eres un consultor de gamificación para UGC Colombia.
Analiza las métricas y sugiere ajustes a las reglas del sistema UP para mejorar:
- Entregas a tiempo de los creadores
- Reducir correcciones y retrabajo
- Aumentar engagement del equipo
Solo sugiere cambios con impacto claro.`;

  const prompt = `Analiza estas métricas y reglas:

REGLAS ACTUALES:
${JSON.stringify(rules || [])}

MÉTRICAS (últimos 30 días):
- Entregas tardías: ${lateDeliveries?.length || 0}
- Correcciones: ${corrections?.length || 0}
- Entregas totales: ${deliveries?.length || 0}
- Tasa de corrección: ${deliveries?.length ? ((corrections?.length || 0) / deliveries.length * 100).toFixed(1) : 0}%
- Tasa de tardanza: ${deliveries?.length ? ((lateDeliveries?.length || 0) / deliveries.length * 100).toFixed(1) : 0}%

Sugiere ajustes a las reglas para mejorar el rendimiento del equipo.`;

  const tools = [{
    type: "function",
    function: {
      name: "recommend_rules",
      description: "Recomienda cambios a las reglas",
      parameters: {
        type: "object",
        properties: {
          recommendations: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                why: { type: "string" },
                impact: { type: "string" },
                proposedRule: {
                  type: "object",
                  properties: {
                    eventType: { type: "string" },
                    points: { type: "integer" },
                    isNew: { type: "boolean" }
                  },
                  required: ["eventType", "points", "isNew"]
                }
              },
              required: ["title", "why", "impact", "proposedRule"]
            }
          },
          summary: { type: "string" }
        },
        required: ["recommendations", "summary"]
      }
    }
  }];

  const result = await callGPT(prompt, systemPrompt, apiKey, tools);

  return {
    organizationId: req.organizationId,
    ...result
  };
}
