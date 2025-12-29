import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Action types
type BoardAIAction = 
  | "analyze_card"
  | "analyze_board"
  | "suggest_next_state"
  | "detect_bottlenecks"
  | "recommend_automation";

interface RequestBody {
  action: BoardAIAction;
  organizationId: string;
  contentId?: string;
  boardData?: any;
}

// AI Provider configuration
interface AIProviderConfig {
  url: string;
  getHeaders: (apiKey: string) => Record<string, string>;
  getBody: (model: string, systemPrompt: string, userPrompt: string, tools?: any[]) => any;
  extractContent: (data: any, hasTools: boolean) => any;
}

const AI_PROVIDERS: Record<string, AIProviderConfig> = {
  lovable: {
    // Lovable AI Gateway (compatible with OpenAI chat.completions)
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
  openai: {
    url: "https://api.openai.com/v1/chat/completions",
    getHeaders: (apiKey: string) => ({
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    }),
    getBody: (model: string, systemPrompt: string, userPrompt: string, tools?: any[]) => {
      const isNewOpenAIModel = model.startsWith("gpt-5") || model.startsWith("o3") || model.startsWith("o4");

      const body: any = {
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        ...(isNewOpenAIModel
          ? { max_completion_tokens: 2000 }
          : { max_tokens: 2000, temperature: 0.7 }),
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
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    }),
    getBody: (model: string, systemPrompt: string, userPrompt: string) => ({
      contents: [{ parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 2000 },
    }),
    extractContent: (data: any) => data.candidates?.[0]?.content?.parts?.[0]?.text || ""
  }
};

// Map action to module key for validation
const ACTION_TO_MODULE: Record<BoardAIAction, string> = {
  analyze_card: "board_cards",
  analyze_board: "board_flows",
  suggest_next_state: "board_cards",
  detect_bottlenecks: "board_states",
  recommend_automation: "board_flows",
};

// Check if a module is active for the organization
async function isModuleActive(supabase: any, organizationId: string, moduleKey: string): Promise<boolean> {
  const { data } = await supabase
    .from("organization_ai_modules")
    .select("is_active")
    .eq("organization_id", organizationId)
    .eq("module_key", moduleKey)
    .maybeSingle();
  
  return data?.is_active ?? false;
}

// Get module-specific configuration (provider & model)
async function getModuleAIConfig(supabase: any, organizationId: string, moduleKey: string) {
  const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
  
  // First check if module is active
  const { data: moduleData } = await supabase
    .from("organization_ai_modules")
    .select("is_active, provider, model")
    .eq("organization_id", organizationId)
    .eq("module_key", moduleKey)
    .maybeSingle();
  
  if (!moduleData?.is_active) {
    throw new Error(`MODULE_INACTIVE:${moduleKey}`);
  }
  
  // Get the provider configuration from the module or fall back to org defaults
  let provider = moduleData?.provider || "lovable";
  let model = moduleData?.model || "google/gemini-2.5-flash";
  
  // If provider is external, get API key
  if (provider !== "lovable") {
    const { data: providerData } = await supabase
      .from("organization_ai_providers")
      .select("api_key_encrypted")
      .eq("organization_id", organizationId)
      .eq("provider_key", provider)
      .eq("is_enabled", true)
      .maybeSingle();
    
    if (providerData?.api_key_encrypted) {
      return { provider, model, apiKey: providerData.api_key_encrypted };
    }
    // Fall back to lovable if no API key
    provider = "lovable";
    model = "google/gemini-2.5-flash";
  }
  
  if (!lovableApiKey) {
    throw new Error("LOVABLE_API_KEY no está configurada");
  }
  
  return { provider, model, apiKey: lovableApiKey };
}

// Get all available AI configurations for an organization (for fallback)
async function getAllAIConfigs(supabase: any, organizationId: string) {
  const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
  
  const { data: defaults } = await supabase
    .from("organization_ai_defaults")
    .select("*")
    .eq("organization_id", organizationId)
    .maybeSingle();

  type OrgProviderRow = {
    provider_key: string;
    api_key_encrypted: string | null;
    available_models: string[] | null;
  };

  const { data: enabledProviders } = await supabase
    .from("organization_ai_providers")
    .select("provider_key, api_key_encrypted, available_models")
    .eq("organization_id", organizationId)
    .eq("is_enabled", true);

  const configs: Array<{ provider: string; model: string; apiKey: string }> = [];
  const providerByKey = new Map<string, OrgProviderRow>(
    ((enabledProviders as OrgProviderRow[] | null) || []).map((p) => [p.provider_key, p])
  );

  const preferredProvider = defaults?.tablero_provider || defaults?.default_provider || "lovable";
  const preferredModel = defaults?.tablero_model || defaults?.default_model || "google/gemini-2.5-flash";

  // Add preferred provider first if it has API key
  if (preferredProvider !== "lovable") {
    const orgProvider = providerByKey.get(preferredProvider);
    if (orgProvider?.api_key_encrypted) {
      const model = preferredModel || (
        Array.isArray(orgProvider.available_models) && orgProvider.available_models.length
          ? orgProvider.available_models[0]
          : preferredProvider === "openai" ? "gpt-4o" : "gemini-2.5-flash"
      );
      configs.push({ provider: preferredProvider, model, apiKey: orgProvider.api_key_encrypted });
    }
  }

  // Add other external providers as fallbacks
  const externalProviders = ["openai", "gemini"];
  for (const key of externalProviders) {
    if (key === preferredProvider) continue; // Already added
    const p = providerByKey.get(key);
    if (p?.api_key_encrypted) {
      const fallbackModel = Array.isArray(p.available_models) && p.available_models.length
        ? p.available_models[0]
        : key === "openai" ? "gpt-4o" : "gemini-2.5-flash";
      configs.push({ provider: key, model: fallbackModel, apiKey: p.api_key_encrypted });
    }
  }

  // Add Lovable AI as final fallback
  if (lovableApiKey) {
    configs.push({ 
      provider: "lovable", 
      model: preferredModel || "google/gemini-2.5-flash", 
      apiKey: lovableApiKey 
    });
  }

  if (configs.length === 0) {
    throw new Error("No hay proveedores de IA configurados. Contacta al soporte.");
  }

  return configs;
}

// Log AI usage
async function logAIUsage(supabase: any, params: {
  organizationId: string;
  userId: string;
  provider: string;
  model: string;
  action: string;
  success: boolean;
  errorMessage?: string;
}) {
  try {
    await supabase.from("ai_usage_logs").insert({
      organization_id: params.organizationId,
      user_id: params.userId,
      provider: params.provider,
      model: params.model,
      module: "tablero",
      action: params.action,
      success: params.success,
      error_message: params.errorMessage,
    });
  } catch (e) {
    console.error("Failed to log AI usage:", e);
  }
}

// Call AI provider (single attempt)
async function callAISingle(
  config: AIProviderConfig,
  apiKey: string,
  model: string,
  systemPrompt: string,
  userPrompt: string,
  tools?: any[]
): Promise<any> {
  const url = config.url.includes("generativelanguage")
    ? `${config.url}/${model}:generateContent`
    : config.url;

  const response = await fetch(url, {
    method: "POST",
    headers: config.getHeaders(apiKey),
    body: JSON.stringify(config.getBody(model, systemPrompt, userPrompt, tools)),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("AI API Error:", response.status, errorText);
    const err: any = new Error(`AI API Error: ${response.status} ${errorText}`);
    err.status = response.status;
    err.details = errorText;
    throw err;
  }

  const data = await response.json();
  return config.extractContent(data, !!tools);
}

// Call AI with automatic fallback to other providers
async function callAIWithFallback(
  configs: Array<{ provider: string; model: string; apiKey: string }>,
  systemPrompt: string,
  userPrompt: string,
  tools?: any[]
): Promise<{ result: any; usedProvider: string; usedModel: string }> {
  const errors: string[] = [];

  for (const cfg of configs) {
    const providerConfig = AI_PROVIDERS[cfg.provider] || AI_PROVIDERS.lovable;
    
    try {
      console.log(`Intentando con proveedor: ${cfg.provider}, modelo: ${cfg.model}`);
      const result = await callAISingle(providerConfig, cfg.apiKey, cfg.model, systemPrompt, userPrompt, tools);
      console.log(`Éxito con proveedor: ${cfg.provider}`);
      return { result, usedProvider: cfg.provider, usedModel: cfg.model };
    } catch (err: any) {
      const errorMsg = `${cfg.provider}: ${err.message}`;
      errors.push(errorMsg);
      console.warn(`Fallo con ${cfg.provider}, intentando siguiente...`, err.message);
      
      // If it's a rate limit error and we have more providers, continue
      // If it's the last provider, we'll throw at the end
      continue;
    }
  }

  // All providers failed
  const allErrors = errors.join("; ");
  console.error("Todos los proveedores de IA fallaron:", allErrors);
  throw new Error(`Todos los proveedores de IA fallaron: ${allErrors}`);
}

// Status labels in Spanish
const STATUS_LABELS: Record<string, string> = {
  draft: "Borrador",
  pending_script: "Guión Pendiente",
  script_review: "Revisión de Guión",
  script_approved: "Guión Aprobado",
  assigned: "Asignado",
  recording: "En Grabación",
  recorded: "Grabado",
  editing: "En Edición",
  delivered: "Entregado",
  issue: "Con Problema",
  approved: "Aprobado",
  paid: "Pagado",
};

// ==================== AI ACTIONS ====================

async function analyzeCard(supabase: any, contentId: string, organizationId: string, userId: string) {
  const configs = await getAllAIConfigs(supabase, organizationId);

  // Get card details with related data
  const { data: content, error } = await supabase
    .from("content")
    .select(`
      *,
      client:clients(name),
      creator:profiles!content_creator_id_fkey(full_name),
      editor:profiles!content_editor_id_fkey(full_name)
    `)
    .eq("id", contentId)
    .single();

  if (error || !content) {
    throw new Error("Content not found");
  }

  // Get status history
  const { data: statusLogs } = await supabase
    .from("content_status_logs")
    .select("*")
    .eq("content_id", contentId)
    .order("moved_at", { ascending: false })
    .limit(10);

  // Calculate time in current status
  const lastMove = statusLogs?.[0];
  const daysInCurrentStatus = lastMove 
    ? Math.floor((Date.now() - new Date(lastMove.moved_at).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  // Check deadline
  const isOverdue = content.deadline && new Date(content.deadline) < new Date();
  const daysUntilDeadline = content.deadline 
    ? Math.floor((new Date(content.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  const systemPrompt = `Eres un asistente de análisis de producción de contenido para una agencia.
Tu rol es analizar tarjetas de contenido en un tablero Kanban y proporcionar insights accionables.
Responde siempre en español. Sé directo y conciso.
Tus análisis deben ser explicables: indica qué datos analizaste y por qué llegas a cada conclusión.`;

  const userPrompt = `Analiza esta tarjeta de contenido:

INFORMACIÓN DE LA TARJETA:
- Título: ${content.title}
- Cliente: ${content.client?.name || "Sin asignar"}
- Estado actual: ${STATUS_LABELS[content.status] || content.status}
- Días en estado actual: ${daysInCurrentStatus}
- Deadline: ${content.deadline ? new Date(content.deadline).toLocaleDateString() : "Sin deadline"}
- Días hasta deadline: ${daysUntilDeadline !== null ? daysUntilDeadline : "N/A"}
- ¿Vencido?: ${isOverdue ? "SÍ" : "No"}
- Creador: ${content.creator?.full_name || "Sin asignar"}
- Editor: ${content.editor?.full_name || "Sin asignar"}
- Tiene guión: ${content.script ? "Sí" : "No"}
- Tiene video: ${content.video_url ? "Sí" : "No"}

HISTORIAL DE ESTADOS (últimos):
${statusLogs?.map((log: any) => `- ${log.from_status || "inicio"} → ${log.to_status} (${new Date(log.moved_at).toLocaleDateString()})`).join("\n") || "Sin historial"}

Proporciona un análisis estructurado.`;

  const tools = [{
    type: "function",
    function: {
      name: "card_analysis",
      description: "Análisis estructurado de una tarjeta de contenido",
      parameters: {
        type: "object",
        properties: {
          current_interpretation: {
            type: "string",
            description: "Interpretación del estado actual de la tarjeta (2-3 oraciones)"
          },
          risk_level: {
            type: "string",
            enum: ["bajo", "medio", "alto"],
            description: "Nivel de riesgo de atraso o problema"
          },
          risk_percentage: {
            type: "number",
            description: "Porcentaje de probabilidad de atraso (0-100)"
          },
          risk_factors: {
            type: "array",
            items: { type: "string" },
            description: "Factores que contribuyen al riesgo"
          },
          probable_next_state: {
            type: "string",
            description: "Estado más probable al que debería moverse"
          },
          recommendation: {
            type: "string",
            description: "Recomendación concreta y accionable"
          },
          data_analyzed: {
            type: "array",
            items: { type: "string" },
            description: "Lista de datos que se analizaron para llegar a esta conclusión"
          },
          confidence: {
            type: "number",
            description: "Nivel de confianza del análisis (0-100)"
          }
        },
        required: ["current_interpretation", "risk_level", "risk_percentage", "probable_next_state", "recommendation", "confidence"],
        additionalProperties: false
      }
    }
  }];

  const { result, usedProvider, usedModel } = await callAIWithFallback(configs, systemPrompt, userPrompt, tools);

  await logAIUsage(supabase, {
    organizationId,
    userId,
    provider: usedProvider,
    model: usedModel,
    action: "analyze_card",
    success: true
  });

  return {
    ...result,
    card_id: contentId,
    card_title: content.title,
    current_status: content.status,
    analyzed_at: new Date().toISOString(),
    ai_model: usedModel
  };
}

async function analyzeBoard(supabase: any, organizationId: string, userId: string) {
  const configs = await getAllAIConfigs(supabase, organizationId);

  // Get all content for the organization
  const { data: contents } = await supabase
    .from("content")
    .select("id, title, status, deadline, created_at, updated_at, creator_id, editor_id")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });

  if (!contents || contents.length === 0) {
    return {
      summary: "No hay contenido en el tablero para analizar.",
      bottlenecks: [],
      recommendations: []
    };
  }

  // Group by status
  const statusGroups: Record<string, any[]> = {};
  contents.forEach((c: any) => {
    if (!statusGroups[c.status]) statusGroups[c.status] = [];
    statusGroups[c.status].push(c);
  });

  // Calculate metrics
  const totalCards = contents.length;
  const statusDistribution = Object.entries(statusGroups).map(([status, items]) => ({
    status,
    label: STATUS_LABELS[status] || status,
    count: items.length,
    percentage: Math.round((items.length / totalCards) * 100)
  }));

  // Check for overdue items
  const overdueItems = contents.filter((c: any) => 
    c.deadline && new Date(c.deadline) < new Date() && !["approved", "paid", "delivered"].includes(c.status)
  );

  // Check for stale items (no update in 7+ days)
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const staleItems = contents.filter((c: any) => 
    new Date(c.updated_at) < sevenDaysAgo && !["approved", "paid", "delivered"].includes(c.status)
  );

  const systemPrompt = `Eres un analista de productividad para una agencia de contenido.
Tu rol es analizar tableros Kanban y detectar cuellos de botella, problemas de flujo y oportunidades de mejora.
Responde siempre en español. Sé directo y accionable.
Explica siempre el razonamiento detrás de cada conclusión.`;

  const userPrompt = `Analiza este tablero de producción de contenido:

MÉTRICAS GENERALES:
- Total de tarjetas: ${totalCards}
- Tarjetas vencidas: ${overdueItems.length}
- Tarjetas sin movimiento (7+ días): ${staleItems.length}

DISTRIBUCIÓN POR ESTADO:
${statusDistribution.map(s => `- ${s.label}: ${s.count} (${s.percentage}%)`).join("\n")}

Detecta cuellos de botella y sugiere mejoras.`;

  const tools = [{
    type: "function",
    function: {
      name: "board_analysis",
      description: "Análisis completo del tablero",
      parameters: {
        type: "object",
        properties: {
          summary: {
            type: "string",
            description: "Resumen ejecutivo del estado del tablero (2-3 oraciones)"
          },
          health_score: {
            type: "number",
            description: "Puntuación de salud del tablero (0-100)"
          },
          bottlenecks: {
            type: "array",
            items: {
              type: "object",
              properties: {
                status: { type: "string" },
                severity: { type: "string", enum: ["low", "medium", "high"] },
                description: { type: "string" },
                impact: { type: "string" },
                suggestion: { type: "string" }
              },
              required: ["status", "severity", "description", "suggestion"]
            },
            description: "Cuellos de botella detectados"
          },
          recommendations: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                description: { type: "string" },
                priority: { type: "string", enum: ["low", "medium", "high"] },
                type: { type: "string", enum: ["process", "automation", "resource", "training"] }
              },
              required: ["title", "description", "priority", "type"]
            },
            description: "Recomendaciones de mejora"
          },
          metrics_analyzed: {
            type: "array",
            items: { type: "string" },
            description: "Métricas que se analizaron"
          }
        },
        required: ["summary", "health_score", "bottlenecks", "recommendations"],
        additionalProperties: false
      }
    }
  }];

  const { result, usedProvider, usedModel } = await callAIWithFallback(configs, systemPrompt, userPrompt, tools);

  await logAIUsage(supabase, {
    organizationId,
    userId,
    provider: usedProvider,
    model: usedModel,
    action: "analyze_board",
    success: true
  });

  return {
    ...result,
    total_cards: totalCards,
    overdue_count: overdueItems.length,
    stale_count: staleItems.length,
    status_distribution: statusDistribution,
    analyzed_at: new Date().toISOString(),
    ai_model: usedModel
  };
}

async function suggestNextState(supabase: any, contentId: string, organizationId: string, userId: string) {
  const configs = await getAllAIConfigs(supabase, organizationId);

  // Get card details
  const { data: content } = await supabase
    .from("content")
    .select(`
      *,
      client:clients(name),
      creator:profiles!content_creator_id_fkey(full_name),
      editor:profiles!content_editor_id_fkey(full_name)
    `)
    .eq("id", contentId)
    .single();

  if (!content) throw new Error("Content not found");

  const systemPrompt = `Eres un asistente de flujo de trabajo para producción de contenido.
Analiza el estado actual de una tarjeta y sugiere el siguiente estado más apropiado.
Considera los prerrequisitos típicos de cada estado.`;

  const userPrompt = `Tarjeta: "${content.title}"
Estado actual: ${STATUS_LABELS[content.status] || content.status}
Tiene guión: ${content.script ? "Sí" : "No"}
Tiene video: ${content.video_url ? "Sí" : "No"}
Creador asignado: ${content.creator?.full_name || "No"}
Editor asignado: ${content.editor?.full_name || "No"}

¿Cuál debería ser el siguiente estado y por qué?`;

  const tools = [{
    type: "function",
    function: {
      name: "next_state_suggestion",
      description: "Sugerencia del siguiente estado",
      parameters: {
        type: "object",
        properties: {
          suggested_state: { type: "string" },
          confidence: { type: "number" },
          reasoning: { type: "string" },
          prerequisites_met: { type: "array", items: { type: "string" } },
          prerequisites_missing: { type: "array", items: { type: "string" } },
          alternative_state: { type: "string" },
          alternative_reasoning: { type: "string" }
        },
        required: ["suggested_state", "confidence", "reasoning"],
        additionalProperties: false
      }
    }
  }];

  const { result, usedProvider, usedModel } = await callAIWithFallback(configs, systemPrompt, userPrompt, tools);

  await logAIUsage(supabase, {
    organizationId,
    userId,
    provider: usedProvider,
    model: usedModel,
    action: "suggest_next_state",
    success: true
  });

  return {
    ...result,
    current_state: content.status,
    card_id: contentId,
    ai_model: usedModel
  };
}

async function detectBottlenecks(supabase: any, organizationId: string, userId: string) {
  // This reuses analyzeBoard but focuses only on bottlenecks
  const analysis = await analyzeBoard(supabase, organizationId, userId);
  return {
    bottlenecks: analysis.bottlenecks || [],
    health_score: analysis.health_score,
    status_distribution: analysis.status_distribution,
    analyzed_at: analysis.analyzed_at,
    ai_model: analysis.ai_model
  };
}

async function recommendAutomation(supabase: any, organizationId: string, userId: string) {
  const configs = await getAllAIConfigs(supabase, organizationId);

  // Get recent status changes
  const { data: statusLogs } = await supabase
    .from("content_status_logs")
    .select("*")
    .eq("organization_id", organizationId)
    .order("moved_at", { ascending: false })
    .limit(100);

  // Analyze patterns
  const transitions: Record<string, number> = {};
  (statusLogs || []).forEach((log: any) => {
    const key = `${log.from_status || "start"} → ${log.to_status}`;
    transitions[key] = (transitions[key] || 0) + 1;
  });

  // If there's no history, we can't infer patterns reliably
  if (!statusLogs || statusLogs.length === 0) {
    return {
      automations: [],
      patterns_analyzed: [],
      transition_patterns: {},
      analyzed_at: new Date().toISOString(),
      ai_model: configs[0]?.model || "unknown",
      note: "No hay historial de movimientos suficiente para sugerir automatizaciones.",
    };
  }

  const systemPrompt = `Eres un experto en automatización de flujos de trabajo.
Analiza patrones de movimiento de tarjetas y sugiere automatizaciones útiles.
Las automatizaciones deben ser prácticas y mejorar la eficiencia.
Responde en español.
Devuelve SIEMPRE un JSON válido con la forma: {\"automations\":[...],\"patterns_analyzed\":[...] }.`;

  const transitionLines = Object.entries(transitions)
    .sort((a, b) => b[1] - a[1])
    .map(([t, c]) => `- ${t}: ${c} veces`)
    .join("\n");

  const userPrompt = `Patrones de transición detectados (últimas 100):
${transitionLines || "(sin patrones)"}

Sugiere automatizaciones basadas en estos patrones.`;

  const tools = [{
    type: "function",
    function: {
      name: "automation_recommendations",
      description: "Recomendaciones de automatización",
      parameters: {
        type: "object",
        properties: {
          automations: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                trigger: { type: "string" },
                action: { type: "string" },
                benefit: { type: "string" },
                complexity: { type: "string", enum: ["simple", "medium", "complex"] },
              },
              required: ["title", "trigger", "action", "benefit", "complexity"],
            },
          },
          patterns_analyzed: { type: "array", items: { type: "string" } },
        },
        required: ["automations"],
        additionalProperties: false,
      },
    },
  }];

  const { result: rawResult, usedProvider, usedModel } = await callAIWithFallback(configs, systemPrompt, userPrompt, tools);

  // Normalize result across providers (some providers may return plain text)
  let normalized: any = rawResult;
  if (typeof normalized === "string") {
    try {
      normalized = JSON.parse(normalized);
    } catch {
      normalized = { automations: [], patterns_analyzed: [] };
    }
  }

  if (!normalized || typeof normalized !== "object") {
    normalized = { automations: [], patterns_analyzed: [] };
  }

  if (!Array.isArray(normalized.automations)) {
    normalized.automations = [];
  }

  await logAIUsage(supabase, {
    organizationId,
    userId,
    provider: usedProvider,
    model: usedModel,
    action: "recommend_automation",
    success: true,
  });

  return {
    ...normalized,
    transition_patterns: transitions,
    analyzed_at: new Date().toISOString(),
    ai_model: usedModel,
  };
}

// ==================== MAIN HANDLER ====================

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    let userId = "system";
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabase.auth.getUser(token);
      if (user) userId = user.id;
    }

    const body: RequestBody = await req.json();
    const { action, organizationId, contentId } = body;

    console.log(`Board AI action: ${action} for org: ${organizationId}`);

    // Get module key for this action
    const moduleKey = ACTION_TO_MODULE[action];
    if (!moduleKey) {
      throw new Error(`Unknown action: ${action}`);
    }

    // Check if module is active
    const moduleActive = await isModuleActive(supabase, organizationId, moduleKey);
    if (!moduleActive) {
      return new Response(
        JSON.stringify({ 
          error: "MODULE_INACTIVE",
          message: "Asistente no habilitado para este módulo. Actívalo en Configuración → IA & Modelos.",
          module_key: moduleKey
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let result;
    switch (action) {
      case "analyze_card":
        if (!contentId) throw new Error("contentId is required");
        result = await analyzeCard(supabase, contentId, organizationId, userId);
        break;
      case "analyze_board":
        result = await analyzeBoard(supabase, organizationId, userId);
        break;
      case "suggest_next_state":
        if (!contentId) throw new Error("contentId is required");
        result = await suggestNextState(supabase, contentId, organizationId, userId);
        break;
      case "detect_bottlenecks":
        result = await detectBottlenecks(supabase, organizationId, userId);
        break;
      case "recommend_automation":
        result = await recommendAutomation(supabase, organizationId, userId);
        break;
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    // Log module execution
    await supabase.rpc("log_ai_module_execution", {
      _org_id: organizationId,
      _module_key: moduleKey
    });

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const status = typeof (e as any)?.status === "number" ? (e as any).status : 500;

    if (status === 429) {
      const retryAfterSeconds = (e as any)?.retryAfterSeconds ?? null;
      return new Response(
        JSON.stringify({
          error: "Límite de solicitudes de IA alcanzado. Intenta de nuevo en unos segundos.",
          retry_after_seconds: retryAfterSeconds,
        }),
        {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.error("Board AI Error:", e);
    const errorMessage = e instanceof Error ? e.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
