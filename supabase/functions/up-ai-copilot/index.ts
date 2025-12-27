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

// Provider configurations
interface AIProviderConfig {
  url: string;
  getHeaders: (apiKey: string) => Record<string, string>;
  getBody: (model: string, systemPrompt: string, userPrompt: string, tools?: any[]) => any;
  extractContent: (data: any, hasTools: boolean) => any;
}

const AI_PROVIDERS: Record<string, AIProviderConfig> = {
  lovable: {
    url: "https://ai.gateway.lovable.dev/v1/chat/completions",
    getHeaders: (apiKey: string) => ({
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    }),
    getBody: (model: string, systemPrompt: string, userPrompt: string, tools?: any[]) => {
      const body: any = {
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      };
      if (tools) {
        body.tools = tools;
        body.tool_choice = { type: "function", function: { name: tools[0].function.name } };
      }
      return body;
    },
    extractContent: (data: any, hasTools: boolean) => {
      if (hasTools && data.choices?.[0]?.message?.tool_calls?.[0]) {
        return JSON.parse(data.choices[0].message.tool_calls[0].function.arguments);
      }
      return data.choices?.[0]?.message?.content || "";
    }
  },
  openai: {
    url: "https://api.openai.com/v1/chat/completions",
    getHeaders: (apiKey: string) => ({
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    }),
    getBody: (model: string, systemPrompt: string, userPrompt: string, tools?: any[]) => {
      const body: any = {
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 2000,
        temperature: 0.7,
      };
      if (tools) {
        body.tools = tools;
        body.tool_choice = { type: "function", function: { name: tools[0].function.name } };
      }
      return body;
    },
    extractContent: (data: any, hasTools: boolean) => {
      if (hasTools && data.choices?.[0]?.message?.tool_calls?.[0]) {
        return JSON.parse(data.choices[0].message.tool_calls[0].function.arguments);
      }
      return data.choices?.[0]?.message?.content || "";
    }
  },
  gemini: {
    url: "https://generativelanguage.googleapis.com/v1beta/models",
    getHeaders: (apiKey: string) => ({
      "x-goog-api-key": apiKey,
      "Content-Type": "application/json",
    }),
    getBody: (model: string, systemPrompt: string, userPrompt: string, tools?: any[]) => {
      const body: any = {
        contents: [
          { role: "user", parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }
        ],
        generationConfig: {
          maxOutputTokens: 2000,
          temperature: 0.7,
        }
      };
      // Gemini uses different tool format - simplified for now
      return body;
    },
    extractContent: (data: any, hasTools: boolean) => {
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      if (hasTools) {
        try {
          // Try to parse JSON from response
          const jsonMatch = text.match(/\{[\s\S]*\}/);
          if (jsonMatch) return JSON.parse(jsonMatch[0]);
        } catch {}
      }
      return text;
    }
  }
};

// Get module AI configuration with validation
async function getModuleAIConfig(supabase: any, organizationId: string, moduleKey: string) {
  const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
  
  // Check if module is active
  const { data: moduleData } = await supabase
    .from("organization_ai_modules")
    .select("is_active, provider, model")
    .eq("organization_id", organizationId)
    .eq("module_key", moduleKey)
    .maybeSingle();
  
  if (!moduleData?.is_active) {
    throw new Error(`MODULE_INACTIVE:${moduleKey}`);
  }
  
  let provider = moduleData?.provider || "lovable";
  let model = moduleData?.model || "google/gemini-2.5-flash";
  let apiKey: string | null = null;
  
  if (provider !== "lovable") {
    const { data: providerData } = await supabase
      .from("organization_ai_providers")
      .select("api_key_encrypted")
      .eq("organization_id", organizationId)
      .eq("provider_key", provider)
      .eq("is_enabled", true)
      .maybeSingle();
    
    if (providerData?.api_key_encrypted) {
      apiKey = providerData.api_key_encrypted;
    } else {
      provider = "lovable";
      model = "google/gemini-2.5-flash";
    }
  }
  
  if (provider === "lovable") {
    apiKey = lovableApiKey || null;
  }
  
  if (!apiKey) {
    throw new Error("No hay API key configurada para el proveedor de IA");
  }
  
  return { provider, model, apiKey };
}

// Log AI usage
async function logAIUsage(
  supabase: any, 
  organizationId: string, 
  userId: string,
  provider: string,
  model: string,
  module: string,
  action: string,
  success: boolean,
  errorMessage?: string,
  tokensInput?: number,
  tokensOutput?: number
) {
  try {
    await supabase.from("ai_usage_logs").insert({
      organization_id: organizationId,
      user_id: userId,
      provider,
      model,
      module: "sistema_up",
      action,
      success,
      error_message: errorMessage,
      tokens_input: tokensInput,
      tokens_output: tokensOutput
    });
  } catch (e) {
    console.error("Error logging AI usage:", e);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body: RequestBody = await req.json();
    console.log("UP AI Co-Pilot action:", body.action);

    const orgId = body.organizationId;

    // Validate module is active and get configuration
    let aiConfig;
    try {
      aiConfig = await getModuleAIConfig(supabase, orgId, "sistema_up");
    } catch (error: any) {
      if (error.message?.startsWith("MODULE_INACTIVE:")) {
        return new Response(
          JSON.stringify({ 
            error: "MODULE_INACTIVE",
            module: "sistema_up",
            message: "El módulo de IA 'Sistema UP' no está habilitado. Actívalo en Configuración → IA & Modelos."
          }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw error;
    }

    const { provider, model, apiKey } = aiConfig;
    console.log(`Using provider: ${provider}, model: ${model}`);

    let result: any;

    switch (body.action) {
      case "quality_score":
        result = await evaluateQualityScore(supabase, body, provider, model, apiKey);
        break;
      case "detect_events":
        result = await detectEvents(supabase, body, provider, model, apiKey);
        break;
      case "anti_fraud":
        result = await checkAntiFraud(supabase, body, provider, model, apiKey);
        break;
      case "generate_quests":
        result = await generateQuests(supabase, body, provider, model, apiKey);
        break;
      case "rule_recommendations":
        result = await getRuleRecommendations(supabase, body, provider, model, apiKey);
        break;
      default:
        throw new Error("Invalid action");
    }

    // Add provider info to result
    result.aiProvider = provider;
    result.aiModel = model;

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

async function callAI(
  provider: string, 
  model: string, 
  apiKey: string,
  systemPrompt: string, 
  userPrompt: string, 
  tools?: any[]
) {
  const config = AI_PROVIDERS[provider] || AI_PROVIDERS.lovable;
  
  let url = config.url;
  if (provider === "gemini") {
    url = `${config.url}/${model}:generateContent`;
  }

  console.log(`Calling ${provider} API with model: ${model}`);
  
  const response = await fetch(url, {
    method: "POST",
    headers: config.getHeaders(apiKey),
    body: JSON.stringify(config.getBody(model, systemPrompt, userPrompt, tools)),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error(`${provider} API error:`, response.status, text);
    throw new Error(`${provider} API error: ${response.status} - ${text}`);
  }

  const data = await response.json();
  console.log(`${provider} response received`);
  
  return config.extractContent(data, !!tools);
}

async function evaluateQualityScore(
  supabase: any, 
  req: QualityScoreRequest, 
  provider: string,
  model: string,
  apiKey: string
) {
  // Fetch comprehensive content details including all guidelines and context
  const { data: content, error } = await supabase
    .from("content")
    .select(`
      id, title, description, script, sales_angle, notes, caption,
      strategist_guidelines, editor_guidelines, designer_guidelines,
      admin_guidelines, trafficker_guidelines,
      status, custom_status_id, video_url, thumbnail_url, raw_video_urls, hooks_count,
      deadline, start_date, created_at, updated_at,
      creator_payment, editor_payment, creator_id, editor_id,
      client:clients(name, category, bio, notes),
      product:products(
        name, description, strategy, market_research, 
        ideal_avatar, sales_angles, brief_url
      ),
      strategist:profiles!content_strategist_id_fkey(full_name)
    `)
    .eq("id", req.contentId)
    .single();

  if (error) {
    console.error("Error fetching content for quality score:", error);
    throw error;
  }

  // Fetch creator and editor profiles separately (no FK exists)
  let creatorName = null;
  let editorName = null;
  let customStatus: any = null;

  if (content.custom_status_id) {
    const { data: statusRow } = await supabase
      .from("organization_statuses")
      .select("label, status_key, color")
      .eq("id", content.custom_status_id)
      .single();
    customStatus = statusRow;
  }
  
  if (content.creator_id) {
    const { data: creatorProfile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", content.creator_id)
      .single();
    creatorName = creatorProfile?.full_name;
  }
  
  if (content.editor_id) {
    const { data: editorProfile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", content.editor_id)
      .single();
    editorName = editorProfile?.full_name;
  }

  // Fetch content comments for additional context
  const { data: comments } = await supabase
    .from("content_comments")
    .select("comment, comment_type, section, created_at")
    .eq("content_id", req.contentId)
    .order("created_at", { ascending: false })
    .limit(10);

  // Fetch complete status history
  const { data: statusLogs } = await supabase
    .from("content_status_logs")
    .select("to_status, from_status, notes, moved_at, user_role")
    .eq("content_id", req.contentId)
    .order("moved_at", { ascending: false })
    .limit(15);

  // Count issues/corrections
  const issueCount = statusLogs?.filter((log: any) => log.to_status === "issue").length || 0;
  
  // Fetch custom field values if any
  const { data: customFields } = await supabase
    .from("content_custom_field_values")
    .select(`
      value,
      field:board_custom_fields(name, field_type)
    `)
    .eq("content_id", req.contentId);

  // Build comprehensive context
  const customFieldsText = customFields?.length > 0
    ? customFields.map((cf: any) => `${cf.field?.name}: ${JSON.stringify(cf.value)}`).join("\n")
    : "Sin campos personalizados";

  const commentsText = comments?.length > 0
    ? comments.map((c: any) => `[${c.comment_type || 'general'}] ${c.comment}`).join("\n")
    : "Sin comentarios";

  const statusHistoryText = statusLogs?.length > 0
    ? statusLogs.slice(0, 5).map((log: any) => 
        `${log.from_status || 'inicio'} → ${log.to_status}${log.notes ? `: ${log.notes}` : ''}`
      ).join("\n")
    : "Sin historial";

  const systemPrompt = `Eres un evaluador experto de calidad de contenido UGC para agencias de marketing.
Tu evaluación debe ser ESPECÍFICA basada en el contenido real proporcionado.

Criterios de evaluación:
1. HOOK (0-100): ¿El gancho es atractivo, genera curiosidad, detiene el scroll?
2. ESTRUCTURA (0-100): ¿Tiene introducción, desarrollo y cierre claros? ¿Fluye bien?
3. CTA (0-100): ¿El llamado a la acción es claro, persuasivo y alineado con el objetivo?
4. COHERENCIA (0-100): ¿El contenido es coherente con el brief, avatar ideal y ángulo de venta?
5. POTENCIAL VIRAL (0-100): ¿Tiene elementos que lo hagan compartible, relatable, memorable?

IMPORTANTE:
- Lee TODA la información proporcionada antes de evaluar
- Sé específico en las razones, menciona partes concretas del guión
- Las sugerencias deben ser accionables y específicas
- Si falta guión o información clave, refleja eso en el score
- Considera las correcciones previas y comentarios

Responde SOLO con JSON válido:
{
  "score": number (0-100, promedio ponderado),
  "breakdown": { "hook": number, "structure": number, "cta": number, "coherence": number, "viralPotential": number },
  "reasons": ["razón específica 1", "razón específica 2", "razón 3"],
  "suggestions": ["sugerencia accionable 1", "sugerencia 2"]
}`;

  const prompt = `EVALÚA ESTE CONTENIDO EN DETALLE:

═══════════════════════════════════════
📋 INFORMACIÓN GENERAL
═══════════════════════════════════════
• Título: ${content.title}
• Descripción: ${content.description || "Sin descripción"}
• Estado actual: ${customStatus?.label || content.status || "N/A"}
• Hooks count: ${content.hooks_count || 1}
• Caption: ${content.caption || "Sin caption"}

═══════════════════════════════════════
📝 GUIÓN COMPLETO
═══════════════════════════════════════
${content.script || "⚠️ SIN GUIÓN - Esto afecta significativamente la evaluación"}

═══════════════════════════════════════
🎯 ESTRATEGIA Y CONTEXTO
═══════════════════════════════════════
• Ángulo de venta: ${content.sales_angle || "No definido"}
• Guidelines Estratega: ${content.strategist_guidelines || "Sin guidelines"}
• Guidelines Admin: ${content.admin_guidelines || "Sin guidelines"}
• Guidelines Editor: ${content.editor_guidelines || "Sin guidelines"}
• Guidelines Trafficker: ${content.trafficker_guidelines || "Sin guidelines"}
• Guidelines Diseñador: ${content.designer_guidelines || "Sin guidelines"}

═══════════════════════════════════════
🏢 CLIENTE
═══════════════════════════════════════
• Nombre: ${content.client?.name || "Sin cliente"}
• Categoría: ${content.client?.category || "N/A"}
• Bio/Descripción: ${content.client?.bio || "Sin información"}
• Notas cliente: ${content.client?.notes || "Sin notas"}

═══════════════════════════════════════
📦 PRODUCTO
═══════════════════════════════════════
• Nombre: ${content.product?.name || "Sin producto"}
• Descripción: ${content.product?.description || "Sin descripción"}
• Estrategia: ${content.product?.strategy || "Sin estrategia definida"}
• Investigación de mercado: ${content.product?.market_research || "Sin investigación"}
• Avatar ideal: ${content.product?.ideal_avatar || "Sin avatar definido"}
• Ángulos de venta disponibles: ${content.product?.sales_angles?.join(", ") || "Sin ángulos"}

═══════════════════════════════════════
👥 EQUIPO ASIGNADO
═══════════════════════════════════════
• Creator: ${creatorName || "Sin asignar"}
• Editor: ${editorName || "Sin asignar"}
• Estratega: ${content.strategist?.full_name || "Sin asignar"}

═══════════════════════════════════════
📊 HISTORIAL Y CONTEXTO
═══════════════════════════════════════
• Correcciones previas (issues): ${issueCount}
• Tiene video: ${content.video_url || content.raw_video_urls?.length > 0 ? "Sí" : "No"}
• Tiene thumbnail: ${content.thumbnail_url ? "Sí" : "No"}
• Notas adicionales: ${content.notes || "Sin notas"}

Historial de estados:
${statusHistoryText}

═══════════════════════════════════════
💬 COMENTARIOS RECIENTES
═══════════════════════════════════════
${commentsText}

═══════════════════════════════════════
📋 CAMPOS PERSONALIZADOS
═══════════════════════════════════════
${customFieldsText}

═══════════════════════════════════════
EVALÚA basándote en TODA esta información. Sé específico.`;

  console.log("Quality Score prompt length:", prompt.length);

  const tools = [{
    type: "function",
    function: {
      name: "evaluate_quality",
      description: "Evalúa la calidad del contenido UGC y devuelve un score detallado basado en el análisis completo",
      parameters: {
        type: "object",
        properties: {
          score: { type: "integer", minimum: 0, maximum: 100, description: "Puntuación global de calidad 0-100" },
          breakdown: {
            type: "object",
            properties: {
              hook: { type: "integer", minimum: 0, maximum: 100, description: "Calidad del gancho/hook inicial" },
              structure: { type: "integer", minimum: 0, maximum: 100, description: "Estructura y flujo del contenido" },
              cta: { type: "integer", minimum: 0, maximum: 100, description: "Efectividad del llamado a la acción" },
              coherence: { type: "integer", minimum: 0, maximum: 100, description: "Coherencia con brief y estrategia" },
              viralPotential: { type: "integer", minimum: 0, maximum: 100, description: "Potencial de viralidad y engagement" }
            },
            required: ["hook", "structure", "cta", "coherence", "viralPotential"]
          },
          reasons: { 
            type: "array", 
            items: { type: "string" },
            description: "Razones específicas del score, mencionando partes concretas del contenido"
          },
          suggestions: { 
            type: "array", 
            items: { type: "string" },
            description: "Sugerencias accionables y específicas para mejorar"
          }
        },
        required: ["score", "breakdown", "reasons", "suggestions"]
      }
    }
  }];

  let result: any;
  
  if (provider === "openai" || provider === "lovable") {
    result = await callAI(provider, model, apiKey, systemPrompt, prompt, tools);
  } else {
    // For providers without native tool support, parse JSON response
    const rawResult = await callAI(provider, model, apiKey, systemPrompt, prompt);
    try {
      const jsonMatch = typeof rawResult === 'string' 
        ? rawResult.match(/\{[\s\S]*\}/) 
        : null;
      result = jsonMatch ? JSON.parse(jsonMatch[0]) : rawResult;
    } catch {
      console.error("Failed to parse quality score response");
      result = { 
        score: 50, 
        breakdown: { hook: 50, structure: 50, cta: 50, coherence: 50, viralPotential: 50 }, 
        reasons: ["No se pudo evaluar correctamente el contenido"], 
        suggestions: ["Revisa que el contenido tenga un guión completo"] 
      };
    }
  }

  // Validate result structure
  if (!result.score || !result.breakdown) {
    console.error("Invalid quality score result:", result);
    result = {
      score: result.score || 50,
      breakdown: result.breakdown || { hook: 50, structure: 50, cta: 50, coherence: 50, viralPotential: 50 },
      reasons: result.reasons || ["Evaluación incompleta"],
      suggestions: result.suggestions || []
    };
  }

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
      ai_model: `${provider}/${model}`,
      evaluated_at: new Date().toISOString()
    }, { onConflict: "content_id" });

  if (saveError) console.error("Error saving quality score:", saveError);

  return {
    contentId: req.contentId,
    ...result,
    savedToDb: !saveError
  };
}

async function detectEvents(
  supabase: any, 
  req: EventDetectionRequest, 
  provider: string,
  model: string,
  apiKey: string
) {
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
Solo detecta eventos con alta confianza (>0.7).

Responde con un JSON válido con esta estructura:
{
  "suggestedEvents": [
    { "eventType": "string", "confidence": number (0-1), "evidence": ["string"], "recommendedPoints": number }
  ]
}`;

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

  let result: any;
  
  if (provider === "openai" || provider === "lovable") {
    result = await callAI(provider, model, apiKey, systemPrompt, prompt, tools);
  } else {
    const rawResult = await callAI(provider, model, apiKey, systemPrompt, prompt);
    try {
      result = typeof rawResult === 'string' ? JSON.parse(rawResult) : rawResult;
    } catch {
      result = { suggestedEvents: [] };
    }
  }

  return {
    contentId: req.contentId,
    userId: req.userId,
    ...result
  };
}

async function checkAntiFraud(
  supabase: any, 
  req: AntiFraudRequest, 
  provider: string,
  model: string,
  apiKey: string
) {
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
Solo reporta patrones con evidencia clara.

Responde con un JSON válido con esta estructura:
{
  "alerts": [
    { "severity": "low|medium|high", "alertType": "string", "reason": "string", "evidence": ["string"], "affectedUserId": "string" }
  ],
  "summary": "string"
}`;

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

  let result: any;
  
  if (provider === "openai" || provider === "lovable") {
    result = await callAI(provider, model, apiKey, systemPrompt, prompt, tools);
  } else {
    const rawResult = await callAI(provider, model, apiKey, systemPrompt, prompt);
    try {
      result = typeof rawResult === 'string' ? JSON.parse(rawResult) : rawResult;
    } catch {
      result = { alerts: [], summary: "No se pudo analizar" };
    }
  }

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

async function generateQuests(
  supabase: any, 
  req: QuestGenerationRequest, 
  provider: string,
  model: string,
  apiKey: string
) {
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
Las misiones deben ser alcanzables pero desafiantes.

Responde con un JSON válido con esta estructura:
{
  "quests": [
    { "title": "string", "description": "string", "goalMetric": "string", "goalValue": number, "rewardPoints": number, "appliesTo": ["role"], "reasoning": "string" }
  ]
}`;

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

  let result: any;
  
  if (provider === "openai" || provider === "lovable") {
    result = await callAI(provider, model, apiKey, systemPrompt, prompt, tools);
  } else {
    const rawResult = await callAI(provider, model, apiKey, systemPrompt, prompt);
    try {
      result = typeof rawResult === 'string' ? JSON.parse(rawResult) : rawResult;
    } catch {
      result = { quests: [] };
    }
  }

  return {
    organizationId: req.organizationId,
    ...result
  };
}

async function getRuleRecommendations(
  supabase: any, 
  req: RuleRecommendationsRequest, 
  provider: string,
  model: string,
  apiKey: string
) {
  // Fetch current rules
  const { data: currentRules } = await supabase
    .from("up_event_types")
    .select("key, label, points, category")
    .eq("organization_id", req.organizationId);

  // Fetch recent activity stats
  const { data: recentEvents } = await supabase
    .from("up_events")
    .select("event_type_key, points_awarded")
    .eq("organization_id", req.organizationId)
    .gte("created_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

  // Calculate event frequency
  const eventFreq: Record<string, number> = {};
  (recentEvents || []).forEach((e: any) => {
    eventFreq[e.event_type_key] = (eventFreq[e.event_type_key] || 0) + 1;
  });

  const systemPrompt = `Eres un consultor de gamificación experto para UGC Colombia.
Analiza las reglas actuales y sugiere mejoras basándote en:
- Balance de puntos
- Engagement del equipo
- Prevención de fraude
- Simplicidad del sistema

Responde con un JSON válido con esta estructura:
{
  "recommendations": [
    { "ruleKey": "string", "currentPoints": number, "suggestedPoints": number, "reasoning": "string", "priority": "low|medium|high" }
  ],
  "newRulesSuggestions": [
    { "key": "string", "label": "string", "points": number, "category": "string", "reasoning": "string" }
  ],
  "summary": "string"
}`;

  const prompt = `Analiza estas reglas de gamificación:

REGLAS ACTUALES:
${JSON.stringify(currentRules || [])}

FRECUENCIA DE EVENTOS (últimos 30 días):
${JSON.stringify(eventFreq)}

Sugiere mejoras al sistema de puntos para optimizar engagement y prevenir gaming.`;

  const tools = [{
    type: "function",
    function: {
      name: "recommend_rules",
      description: "Recomienda mejoras a las reglas",
      parameters: {
        type: "object",
        properties: {
          recommendations: {
            type: "array",
            items: {
              type: "object",
              properties: {
                ruleKey: { type: "string" },
                currentPoints: { type: "integer" },
                suggestedPoints: { type: "integer" },
                reasoning: { type: "string" },
                priority: { type: "string", enum: ["low", "medium", "high"] }
              },
              required: ["ruleKey", "currentPoints", "suggestedPoints", "reasoning", "priority"]
            }
          },
          newRulesSuggestions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                key: { type: "string" },
                label: { type: "string" },
                points: { type: "integer" },
                category: { type: "string" },
                reasoning: { type: "string" }
              },
              required: ["key", "label", "points", "category", "reasoning"]
            }
          },
          summary: { type: "string" }
        },
        required: ["recommendations", "newRulesSuggestions", "summary"]
      }
    }
  }];

  let result: any;
  
  if (provider === "openai" || provider === "lovable") {
    result = await callAI(provider, model, apiKey, systemPrompt, prompt, tools);
  } else {
    const rawResult = await callAI(provider, model, apiKey, systemPrompt, prompt);
    try {
      result = typeof rawResult === 'string' ? JSON.parse(rawResult) : rawResult;
    } catch {
      result = { recommendations: [], newRulesSuggestions: [], summary: "No se pudo analizar" };
    }
  }

  return {
    organizationId: req.organizationId,
    ...result
  };
}
