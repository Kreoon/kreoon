import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// AI Provider configurations
interface AIProviderConfig {
  url: string;
  getHeaders: (apiKey: string) => Record<string, string>;
  formatBody: (messages: any[], tools?: any[]) => any;
  extractContent: (response: any, tools?: any[]) => any;
}

const AI_PROVIDERS: Record<string, AIProviderConfig> = {
  gemini: {
    url: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
    getHeaders: (apiKey: string) => ({
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    }),
    formatBody: (messages: any[], tools?: any[]) => ({
      model: "gemini-2.5-flash",
      messages,
      ...(tools ? { tools, tool_choice: { type: "function", function: { name: tools[0].function.name } } } : {}),
    }),
    extractContent: (response: any, tools?: any[]) => {
      if (tools && response.choices[0].message.tool_calls) {
        return JSON.parse(response.choices[0].message.tool_calls[0].function.arguments);
      }
      return response.choices[0].message.content;
    },
  },
  openai: {
    url: "https://api.openai.com/v1/chat/completions",
    getHeaders: (apiKey: string) => ({
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    }),
    formatBody: (messages: any[], tools?: any[]) => ({
      model: "gpt-4o-mini",
      messages,
      ...(tools ? { tools, tool_choice: { type: "function", function: { name: tools[0].function.name } } } : {}),
    }),
    extractContent: (response: any, tools?: any[]) => {
      if (tools && response.choices[0].message.tool_calls) {
        return JSON.parse(response.choices[0].message.tool_calls[0].function.arguments);
      }
      return response.choices[0].message.content;
    },
  },
  anthropic: {
    url: "https://api.anthropic.com/v1/messages",
    getHeaders: (apiKey: string) => ({
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    }),
    formatBody: (messages: any[]) => ({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      messages: messages.map((m) => ({
        role: m.role === "system" ? "user" : m.role,
        content: m.content,
      })),
    }),
    extractContent: (response: any) => {
      return response.content?.[0]?.text || "";
    },
  },
};

interface TalentMatchingRequest {
  action: "matching";
  organizationId: string;
  contentId?: string;
  contentType?: string;
  deadline?: string;
  priority?: string;
  role: "editor" | "creator";
}

interface TalentQualityRequest {
  action: "quality";
  organizationId: string;
  userId: string;
  contentId: string;
}

interface TalentRiskRequest {
  action: "risk";
  organizationId: string;
  userId: string;
}

interface TalentReputationRequest {
  action: "reputation";
  organizationId: string;
  userId: string;
}

interface TalentAmbassadorRequest {
  action: "ambassador";
  organizationId: string;
  userId: string;
}

type RequestBody = TalentMatchingRequest | TalentQualityRequest | TalentRiskRequest | TalentReputationRequest | TalentAmbassadorRequest;

async function getModuleAIConfig(supabase: any, organizationId: string, moduleKey: string) {
  const googleApiKey = Deno.env.get("GOOGLE_AI_API_KEY");
  const openaiApiKey = Deno.env.get("OPENAI_API_KEY");

  // First try to get module-specific config
  const { data: moduleData } = await supabase
    .from("organization_ai_modules")
    .select("provider, model")
    .eq("organization_id", organizationId)
    .eq("module_key", moduleKey)
    .eq("is_active", true)
    .single();

  // Then get organization defaults
  const { data: defaults } = await supabase
    .from("organization_ai_defaults")
    .select("default_provider, default_model")
    .eq("organization_id", organizationId)
    .single();

  // Use module config if available, otherwise use org defaults
  let provider = moduleData?.provider || defaults?.default_provider || "gemini";
  let model = moduleData?.model || defaults?.default_model || "gemini-2.5-flash";

  // Map lovable provider to gemini
  if (provider === "lovable") {
    provider = "gemini";
    if (model.startsWith("google/")) {
      model = model.replace("google/", "");
    } else if (model.startsWith("openai/")) {
      provider = "openai";
      model = model.replace("openai/", "").replace("gpt-5", "gpt-4o").replace("gpt-5-mini", "gpt-4o-mini");
    }
  }

  // Get the appropriate API key based on provider
  let apiKey = "";
  switch (provider) {
    case "openai":
      apiKey = openaiApiKey || "";
      break;
    case "gemini":
      apiKey = googleApiKey || "";
      break;
    case "anthropic":
      apiKey = Deno.env.get("ANTHROPIC_API_KEY") || "";
      break;
    default:
      apiKey = googleApiKey || "";
      provider = "gemini";
      model = "gemini-2.5-flash";
      break;
  }

  // Fallback if no API key for selected provider
  if (!apiKey) {
    if (googleApiKey) {
      provider = "gemini";
      model = "gemini-2.5-flash";
      apiKey = googleApiKey;
    } else if (openaiApiKey) {
      provider = "openai";
      model = "gpt-4o-mini";
      apiKey = openaiApiKey;
    }
  }

  console.log(`AI Config for module ${moduleKey}: provider=${provider}, model=${model}, hasKey=${!!apiKey}`);

  return { provider, model, apiKey };
}

async function callAI(
  provider: string,
  messages: any[],
  apiKey: string,
  tools?: any[]
): Promise<any> {
  const config = AI_PROVIDERS[provider] || AI_PROVIDERS.lovable;
  const response = await fetch(config.url, {
    method: "POST",
    headers: config.getHeaders(apiKey),
    body: JSON.stringify(config.formatBody(messages, tools)),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`AI API error: ${error}`);
  }

  const data = await response.json();
  return config.extractContent(data, tools);
}

async function handleMatching(supabase: any, req: TalentMatchingRequest, provider: string, apiKey: string) {
  // Get available talent
  const roleFilter = req.role === "editor" ? "editor" : "creator";
  
  const { data: members } = await supabase
    .from("organization_member_roles")
    .select("user_id")
    .eq("organization_id", req.organizationId)
    .eq("role", roleFilter);

  if (!members?.length) {
    return { selected_id: null, reasoning: ["No hay talento disponible con el rol especificado"], risk_level: "high", confidence: 0 };
  }

  const userIds = members.map((m: any) => m.user_id);

  // Get talent profiles with performance data
  const { data: profiles } = await supabase
    .from("profiles")
    .select(`
      id, full_name, quality_score_avg, reliability_score, velocity_score,
      editor_rating, editor_completed_count, editor_on_time_count,
      is_active, ai_recommended_level, ai_risk_flag
    `)
    .in("id", userIds)
    .eq("is_active", true);

  // Get current workload for each talent
  const workloadPromises = profiles?.map(async (p: any) => {
    const { count } = await supabase
      .from("content")
      .select("*", { count: "exact", head: true })
      .eq(req.role === "editor" ? "editor_id" : "creator_id", p.id)
      .eq("organization_id", req.organizationId)
      .in("status", ["assigned", "recording", "recorded", "editing", "review", "issue"]);
    return { ...p, active_tasks: count || 0 };
  }) || [];

  const talentWithWorkload = await Promise.all(workloadPromises);

  const systemPrompt = `Eres un asistente de asignación de talento para una agencia de contenido.
Tu tarea es seleccionar el mejor ${req.role === "editor" ? "editor" : "creador"} para un proyecto.

Considera:
1. Carga de trabajo actual (menos es mejor)
2. Score de calidad (mayor es mejor)
3. Score de confiabilidad/puntualidad (mayor es mejor)
4. Nivel de riesgo del talento (evitar "high")
5. Nivel recomendado por IA (elite > pro > junior)

${req.deadline ? `Deadline del proyecto: ${req.deadline}` : ""}
${req.priority ? `Prioridad: ${req.priority}` : ""}
${req.contentType ? `Tipo de contenido: ${req.contentType}` : ""}`;

  const userPrompt = `Selecciona el mejor talento de esta lista:

${JSON.stringify(talentWithWorkload, null, 2)}

Responde en JSON con:
{
  "selected_id": "uuid del seleccionado",
  "selected_name": "nombre del seleccionado",
  "reasoning": ["razón 1", "razón 2"],
  "risk_level": "low" | "medium" | "high",
  "confidence": 0-100,
  "alternatives": [{"id": "uuid", "name": "nombre", "reason": "por qué es alternativa"}]
}`;

  const tools = [{
    type: "function",
    function: {
      name: "select_talent",
      description: "Selecciona el mejor talento para asignar",
      parameters: {
        type: "object",
        properties: {
          selected_id: { type: "string", description: "UUID del talento seleccionado" },
          selected_name: { type: "string", description: "Nombre del talento seleccionado" },
          reasoning: { type: "array", items: { type: "string" }, description: "Razones de la selección" },
          risk_level: { type: "string", enum: ["low", "medium", "high"] },
          confidence: { type: "number", description: "Confianza de 0 a 100" },
          alternatives: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "string" },
                name: { type: "string" },
                reason: { type: "string" }
              }
            }
          }
        },
        required: ["selected_id", "reasoning", "risk_level", "confidence"]
      }
    }
  }];

  const result = await callAI(
    provider,
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ],
    apiKey,
    tools
  );

  // Parse if string
  const parsed = typeof result === "string" ? JSON.parse(result) : result;

  // Update content with assignment reason if contentId provided
  if (req.contentId && parsed.selected_id) {
    await supabase
      .from("content")
      .update({
        [req.role === "editor" ? "editor_id" : "creator_id"]: parsed.selected_id,
        ai_assignment_reason: parsed.reasoning.join(". "),
      })
      .eq("id", req.contentId);
  }

  return parsed;
}

async function handleQuality(supabase: any, req: TalentQualityRequest, provider: string, apiKey: string) {
  // Get content details
  const { data: content } = await supabase
    .from("content")
    .select(`
      *,
      client:clients(name),
      creator:profiles!content_creator_id_fkey(full_name),
      editor:profiles!content_editor_id_fkey(full_name)
    `)
    .eq("id", req.contentId)
    .single();

  if (!content) {
    throw new Error("Content not found");
  }

  // Get user's recent delivery history
  const { data: history } = await supabase
    .from("content")
    .select("id, title, status, delivered_at, deadline, created_at")
    .or(`creator_id.eq.${req.userId},editor_id.eq.${req.userId}`)
    .eq("organization_id", req.organizationId)
    .order("created_at", { ascending: false })
    .limit(10);

  const systemPrompt = `Eres un evaluador de calidad de trabajo para una agencia de contenido.
Evalúa el trabajo del talento en este proyecto específico.`;

  const userPrompt = `Evalúa la calidad del trabajo en este contenido:

Contenido: ${JSON.stringify(content, null, 2)}

Historial reciente del talento: ${JSON.stringify(history, null, 2)}

Responde en JSON con:
{
  "quality_score": 0-10,
  "strengths": ["fortaleza 1", "fortaleza 2"],
  "improvements": ["mejora 1", "mejora 2"],
  "on_time": true/false,
  "bonus_points": 0-50 (puntos UP extra por excelencia)
}`;

  const tools = [{
    type: "function",
    function: {
      name: "evaluate_quality",
      description: "Evalúa la calidad del trabajo del talento",
      parameters: {
        type: "object",
        properties: {
          quality_score: { type: "number", description: "Score de 0 a 10" },
          strengths: { type: "array", items: { type: "string" } },
          improvements: { type: "array", items: { type: "string" } },
          on_time: { type: "boolean" },
          bonus_points: { type: "number", description: "Puntos UP bonus (0-50)" }
        },
        required: ["quality_score", "strengths", "improvements", "on_time", "bonus_points"]
      }
    }
  }];

  const result = await callAI(
    provider,
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ],
    apiKey,
    tools
  );

  const parsed = typeof result === "string" ? JSON.parse(result) : result;

  // Update content with quality score
  await supabase
    .from("content")
    .update({ ai_quality_score: parsed.quality_score })
    .eq("id", req.contentId);

  return parsed;
}

async function handleRisk(supabase: any, req: TalentRiskRequest, provider: string, apiKey: string) {
  // Get user profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", req.userId)
    .single();

  // Get active tasks
  const { data: activeTasks } = await supabase
    .from("content")
    .select("id, title, status, deadline, created_at")
    .or(`creator_id.eq.${req.userId},editor_id.eq.${req.userId}`)
    .eq("organization_id", req.organizationId)
    .in("status", ["assigned", "recording", "recorded", "editing", "review", "issue"])
    .order("deadline", { ascending: true });

  // Get recent delivery history
  const { data: history } = await supabase
    .from("content")
    .select("id, title, status, delivered_at, deadline, approved_at")
    .or(`creator_id.eq.${req.userId},editor_id.eq.${req.userId}`)
    .eq("organization_id", req.organizationId)
    .eq("status", "approved")
    .order("approved_at", { ascending: false })
    .limit(20);

  const systemPrompt = `Eres un analista de riesgo para una agencia de contenido.
Detecta riesgos de retraso, burnout o sobrecarga de trabajo en el talento.`;

  const userPrompt = `Analiza el riesgo del siguiente talento:

Perfil: ${JSON.stringify(profile, null, 2)}

Tareas activas: ${JSON.stringify(activeTasks, null, 2)}

Historial reciente: ${JSON.stringify(history, null, 2)}

Responde en JSON con:
{
  "risk_level": "none" | "warning" | "high",
  "risk_factors": ["factor 1", "factor 2"],
  "recommended_action": "acción recomendada",
  "max_recommended_tasks": número,
  "burnout_probability": 0-100
}`;

  const tools = [{
    type: "function",
    function: {
      name: "analyze_risk",
      description: "Analiza el riesgo del talento",
      parameters: {
        type: "object",
        properties: {
          risk_level: { type: "string", enum: ["none", "warning", "high"] },
          risk_factors: { type: "array", items: { type: "string" } },
          recommended_action: { type: "string" },
          max_recommended_tasks: { type: "number" },
          burnout_probability: { type: "number" }
        },
        required: ["risk_level", "risk_factors", "recommended_action"]
      }
    }
  }];

  const result = await callAI(
    provider,
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ],
    apiKey,
    tools
  );

  const parsed = typeof result === "string" ? JSON.parse(result) : result;

  // Update profile with risk flag
  await supabase
    .from("profiles")
    .update({ ai_risk_flag: parsed.risk_level })
    .eq("id", req.userId);

  return parsed;
}

async function handleReputation(supabase: any, req: TalentReputationRequest, provider: string, apiKey: string) {
  // Get user profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", req.userId)
    .single();

  // Get organization membership
  const { data: membership } = await supabase
    .from("organization_members")
    .select("*, organization:organizations(name)")
    .eq("user_id", req.userId)
    .eq("organization_id", req.organizationId)
    .single();

  // Get all completed content
  const { data: completedContent } = await supabase
    .from("content")
    .select("id, title, status, ai_quality_score, approved_at, delivered_at, deadline")
    .or(`creator_id.eq.${req.userId},editor_id.eq.${req.userId}`)
    .eq("organization_id", req.organizationId)
    .eq("status", "approved")
    .order("approved_at", { ascending: false })
    .limit(50);

  // Get user points
  const { data: userPoints } = await supabase
    .from("up_user_points")
    .select("*")
    .eq("user_id", req.userId)
    .eq("organization_id", req.organizationId)
    .single();

  const systemPrompt = `Eres un analista de reputación y desarrollo de talento para una agencia de contenido.
Evalúa la reputación del talento y genera recomendaciones de desarrollo.`;

  const userPrompt = `Evalúa la reputación del siguiente talento:

Perfil: ${JSON.stringify(profile, null, 2)}

Membresía: ${JSON.stringify(membership, null, 2)}

Contenido completado (últimos 50): ${JSON.stringify(completedContent, null, 2)}

Puntos UP: ${JSON.stringify(userPoints, null, 2)}

Responde en JSON con:
{
  "recommended_level": "junior" | "pro" | "elite",
  "level_reasoning": "razón del nivel",
  "ambassador_potential": 0-100,
  "ambassador_reasoning": "razón del potencial de embajador",
  "recommendations": [
    {"type": "level_up" | "make_ambassador" | "increase_load" | "training", "reason": "razón", "confidence": 0-100}
  ],
  "strengths": ["fortaleza 1", "fortaleza 2"],
  "development_areas": ["área 1", "área 2"]
}`;

  const tools = [{
    type: "function",
    function: {
      name: "evaluate_reputation",
      description: "Evalúa la reputación del talento",
      parameters: {
        type: "object",
        properties: {
          recommended_level: { type: "string", enum: ["junior", "pro", "elite"] },
          level_reasoning: { type: "string" },
          ambassador_potential: { type: "number" },
          ambassador_reasoning: { type: "string" },
          recommendations: {
            type: "array",
            items: {
              type: "object",
              properties: {
                type: { type: "string" },
                reason: { type: "string" },
                confidence: { type: "number" }
              }
            }
          },
          strengths: { type: "array", items: { type: "string" } },
          development_areas: { type: "array", items: { type: "string" } }
        },
        required: ["recommended_level", "recommendations", "strengths"]
      }
    }
  }];

  const result = await callAI(
    provider,
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ],
    apiKey,
    tools
  );

  const parsed = typeof result === "string" ? JSON.parse(result) : result;

  // Update profile with recommended level
  await supabase
    .from("profiles")
    .update({ ai_recommended_level: parsed.recommended_level })
    .eq("id", req.userId);

  // Save recommendations
  for (const rec of parsed.recommendations || []) {
    await supabase
      .from("talent_ai_recommendations")
      .insert({
        user_id: req.userId,
        organization_id: req.organizationId,
        recommendation_type: rec.type,
        reason: rec.reason,
        confidence: rec.confidence,
        ai_model: `${provider}/talent-ai`,
      });
  }

  return parsed;
}

async function handleAmbassador(supabase: any, req: TalentAmbassadorRequest, provider: string, apiKey: string) {
  // Get user profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", req.userId)
    .single();

  // Get organization membership with ambassador data
  const { data: membership } = await supabase
    .from("organization_members")
    .select("*, organization:organizations(name)")
    .eq("user_id", req.userId)
    .eq("organization_id", req.organizationId)
    .single();

  // Get ambassador referrals
  const { data: referrals } = await supabase
    .from("ambassador_referrals")
    .select("*")
    .eq("ambassador_id", req.userId)
    .eq("organization_id", req.organizationId);

  // Get network stats
  const { data: networkStats } = await supabase
    .from("ambassador_network_stats")
    .select("*")
    .eq("ambassador_id", req.userId)
    .eq("organization_id", req.organizationId)
    .order("period_year", { ascending: false })
    .order("period_month", { ascending: false })
    .limit(6);

  // Get content produced by referrals
  const referredUserIds = referrals?.filter((r: any) => r.referred_user_id).map((r: any) => r.referred_user_id) || [];
  let networkContent = [];
  if (referredUserIds.length > 0) {
    const { data } = await supabase
      .from("content")
      .select("id, title, status, approved_at, ai_quality_score")
      .eq("organization_id", req.organizationId)
      .or(referredUserIds.map((id: string) => `creator_id.eq.${id},editor_id.eq.${id}`).join(","))
      .eq("status", "approved")
      .order("approved_at", { ascending: false })
      .limit(50);
    networkContent = data || [];
  }

  // Get user points
  const { data: userPoints } = await supabase
    .from("up_user_points")
    .select("*")
    .eq("user_id", req.userId)
    .eq("organization_id", req.organizationId)
    .single();

  const systemPrompt = `Eres un analista de embajadores para una agencia de contenido.
Los embajadores son actores clave de crecimiento: producen + atraen + validan + representan la marca.

Evalúa:
1. Impacto de red (referidos activos, contenido generado por su red)
2. Calidad del trabajo personal
3. Retención de su red
4. Potencial de ascenso/descenso de nivel (bronze → silver → gold)
5. Riesgos (embajador pasivo, red inactiva, pérdida de engagement)`;

  const userPrompt = `Evalúa el rendimiento de este embajador:

Perfil: ${JSON.stringify(profile, null, 2)}

Membresía actual: ${JSON.stringify(membership, null, 2)}

Referidos (${referrals?.length || 0}): ${JSON.stringify(referrals, null, 2)}

Estadísticas de red (últimos 6 meses): ${JSON.stringify(networkStats, null, 2)}

Contenido de su red (últimos 50): ${JSON.stringify(networkContent, null, 2)}

Puntos UP: ${JSON.stringify(userPoints, null, 2)}

Responde en JSON con:
{
  "recommended_level": "none" | "bronze" | "silver" | "gold",
  "current_level": "nivel actual",
  "level_change": "up" | "down" | "same",
  "justification": ["razón 1", "razón 2"],
  "risk_flags": ["riesgo 1", "riesgo 2"],
  "suggested_actions": [
    {"type": "ascend" | "descend" | "reward" | "warning" | "training", "description": "descripción", "priority": "high" | "medium" | "low"}
  ],
  "network_metrics": {
    "active_referrals": número,
    "network_content_count": número,
    "network_quality_avg": 0-10,
    "retention_rate": 0-100,
    "estimated_revenue_impact": número
  },
  "confidence": 0-100
}`;

  const tools = [{
    type: "function",
    function: {
      name: "evaluate_ambassador",
      description: "Evalúa el rendimiento y potencial del embajador",
      parameters: {
        type: "object",
        properties: {
          recommended_level: { type: "string", enum: ["none", "bronze", "silver", "gold"] },
          current_level: { type: "string" },
          level_change: { type: "string", enum: ["up", "down", "same"] },
          justification: { type: "array", items: { type: "string" } },
          risk_flags: { type: "array", items: { type: "string" } },
          suggested_actions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                type: { type: "string" },
                description: { type: "string" },
                priority: { type: "string" }
              }
            }
          },
          network_metrics: {
            type: "object",
            properties: {
              active_referrals: { type: "number" },
              network_content_count: { type: "number" },
              network_quality_avg: { type: "number" },
              retention_rate: { type: "number" },
              estimated_revenue_impact: { type: "number" }
            }
          },
          confidence: { type: "number" }
        },
        required: ["recommended_level", "justification", "confidence"]
      }
    }
  }];

  const result = await callAI(
    provider,
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ],
    apiKey,
    tools
  );

  const parsed = typeof result === "string" ? JSON.parse(result) : result;

  // Save evaluation to history
  await supabase
    .from("ambassador_ai_evaluations")
    .insert({
      organization_id: req.organizationId,
      user_id: req.userId,
      recommended_level: parsed.recommended_level,
      current_level: membership?.ambassador_level || "none",
      confidence: parsed.confidence || 0,
      justification: parsed.justification || [],
      risk_flags: parsed.risk_flags || [],
      suggested_actions: parsed.suggested_actions || [],
      network_metrics: parsed.network_metrics || null,
    });

  return parsed;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: RequestBody = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get AI config based on action
    const moduleKeyMap: Record<string, string> = {
      matching: "talent.matching.ai",
      quality: "talent.quality.ai",
      risk: "talent.risk.ai",
      reputation: "talent.reputation.ai",
      ambassador: "talent.ambassador.ai",
    };

    const moduleKey = moduleKeyMap[body.action];
    const aiConfig = await getModuleAIConfig(supabase, body.organizationId, moduleKey);

    let result;
    switch (body.action) {
      case "matching":
        result = await handleMatching(supabase, body, aiConfig.provider, aiConfig.apiKey);
        break;
      case "quality":
        result = await handleQuality(supabase, body, aiConfig.provider, aiConfig.apiKey);
        break;
      case "risk":
        result = await handleRisk(supabase, body, aiConfig.provider, aiConfig.apiKey);
        break;
      case "reputation":
        result = await handleReputation(supabase, body, aiConfig.provider, aiConfig.apiKey);
        break;
      case "ambassador":
        result = await handleAmbassador(supabase, body as TalentAmbassadorRequest, aiConfig.provider, aiConfig.apiKey);
        break;
      default:
        throw new Error("Invalid action");
    }

    // Log usage
    const authHeader = req.headers.get("Authorization");
    let userId = "system";
    if (authHeader) {
      const { data: { user } } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
      if (user) userId = user.id;
    }

    await supabase.from("ai_usage_logs").insert({
      organization_id: body.organizationId,
      user_id: userId,
      module: moduleKey,
      action: body.action,
      provider: aiConfig.provider,
      model: aiConfig.model,
      success: true,
    });

    return new Response(
      JSON.stringify({ success: true, ...result, provider: aiConfig.provider, model: aiConfig.model }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Talent AI error:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
