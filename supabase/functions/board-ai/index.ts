import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getKreoonClient, isKreoonConfigured, validateKreoonAuth } from "../_shared/kreoon-client.ts";
import {
  corsHeaders,
  callAIWithFallback,
} from "../_shared/ai-providers.ts";
import { errorResponse, successResponse, moduleInactiveResponse } from "../_shared/error-response.ts";
import { getModuleAIConfigsWithFallback } from "../_shared/get-module-ai-config.ts";
// Nuevo: Prompts desde DB con fallback a hardcodeados
import { getPrompt, interpolatePrompt } from "../_shared/prompts/db-prompts.ts";
// Fallback legacy (se usa internamente por db-prompts)
import { replaceBoardVariables } from "../_shared/prompts/board.ts";
import { PerplexitySearches } from "../_shared/perplexity-client.ts";

// Action types
type BoardAIAction =
  | "analyze_card"
  | "analyze_board"
  | "suggest_next_state"
  | "detect_bottlenecks"
  | "recommend_automation"
  | "research_context";

interface RequestBody {
  action: BoardAIAction;
  organizationId: string;
  contentId?: string;
  researchType?: "trends" | "competitors" | "hooks";
  boardData?: any;
}

// Map action to module key for validation
const ACTION_TO_MODULE: Record<BoardAIAction, string> = {
  analyze_card: "board_cards",
  analyze_board: "board_flows",
  suggest_next_state: "board_cards",
  detect_bottlenecks: "board_states",
  recommend_automation: "board_flows",
  research_context: "board_cards",
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

// Log AI usage; returns execution id for feedback loop
async function logAIUsage(supabase: any, params: {
  organizationId: string;
  userId: string;
  provider: string;
  model: string;
  action: string;
  success: boolean;
  errorMessage?: string;
}): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from("ai_usage_logs")
      .insert({
        organization_id: params.organizationId,
        user_id: params.userId,
        provider: params.provider,
        model: params.model,
        module: "tablero",
        action: params.action,
        success: params.success,
        error_message: params.errorMessage,
      })
      .select("id")
      .single();
    if (error) {
      console.error("Failed to log AI usage:", error);
      return null;
    }
    return data?.id ?? null;
  } catch (e) {
    console.error("Failed to log AI usage:", e);
    return null;
  }
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
  const configs = await getModuleAIConfigsWithFallback(supabase, organizationId, "tablero");

  // Get card details with related data (incl. product for context)
  const { data: content, error } = await supabase
    .from("content")
    .select(`
      *,
      client:clients(name),
      creator:profiles!content_creator_id_fkey(full_name, avatar_url, specialties_tags, best_at),
      editor:profiles!content_editor_id_fkey(full_name, avatar_url),
      product:products(
        name,
        description,
        sales_angles,
        sales_angles_data,
        avatar_profiles,
        market_research,
        content_strategy
      )
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

  // Build product context block when product exists
  let productContextBlock = "";
  if (content.product) {
    const p = content.product as any;
    const firstAvatar = (() => {
      try {
        const ap = typeof p.avatar_profiles === "string" ? JSON.parse(p.avatar_profiles || "{}") : (p.avatar_profiles || {});
        const profiles = ap.profiles || ap.avatars || (Array.isArray(ap) ? ap : []);
        return Array.isArray(profiles) ? profiles[0] : null;
      } catch {
        return null;
      }
    })();
    productContextBlock = `
CONTEXTO DEL PRODUCTO:
- Producto: ${p.name || "Sin nombre"}
- Descripción: ${(p.description || "No disponible").slice(0, 500)}
- Ángulo de venta: ${content.sales_angle || "No definido"}
- Fase ESFERA: ${content.sphere_phase || "No definida"}
${firstAvatar ? `
- Avatar principal: ${firstAvatar.name || firstAvatar.nombre || "Sin nombre"}
  - Situación: ${firstAvatar.situation || firstAvatar.situacion || "No definida"}
  - Dolor/Drivers: ${firstAvatar.primary_pain || firstAvatar.drivers || firstAvatar.objeciones || "No definido"}
` : p.ideal_avatar ? `
- Avatar ideal (resumen): ${String(p.ideal_avatar).slice(0, 300)}
` : ""}
${p.market_research ? `- Research de mercado (resumen): ${String(p.market_research).slice(0, 400)}...` : ""}`;
  } else {
    productContextBlock = "\nPRODUCTO: No asociado";
  }

  // Obtener prompts desde DB (con cache y fallback a hardcodeados)
  const promptConfig = await getPrompt(supabase, "board", "analyze_card");
  const systemPrompt = promptConfig.systemPrompt;
  const userPrompt = interpolatePrompt(promptConfig.userPrompt || "", {
    title: content.title,
    client_name: content.client?.name || "Sin cliente",
    status: STATUS_LABELS[content.status] || content.status,
    days_in_status: daysInCurrentStatus,
    deadline: content.deadline
      ? `${new Date(content.deadline).toLocaleDateString()}${daysUntilDeadline !== null ? ` (${daysUntilDeadline} días)` : ""}${isOverdue ? " — VENCIDO" : ""}`
      : "Sin deadline",
    creator_name: content.creator?.full_name || "Sin asignar",
    editor_name: content.editor?.full_name || "Sin asignar",
    has_script: content.script ? "Sí" : "No",
    has_video: content.video_url ? "Sí" : "No",
    status_history: JSON.stringify(
      (content.status_history ||
        statusLogs?.slice(0, 5).map((l: any) => ({ from: l.from_status, to: l.to_status, at: l.moved_at })) ||
        []
      ).slice(0, 5)
    ),
    product_context: productContextBlock.trim(),
  });

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
          },
          product_insights: {
            type: "object",
            description: "Insights de alineación con producto/campaña (solo si hay producto asociado)",
            properties: {
              alignment_with_avatar: {
                type: "string",
                description: "Evaluación de si el contenido está alineado con el avatar objetivo"
              },
              esfera_phase_notes: {
                type: "string",
                description: "Notas sobre la fase ESFERA y su impacto en prioridad/urgencia"
              },
              content_fit_score: {
                type: "number",
                description: "Puntuación 0-100 de ajuste del contenido al producto y campaña"
              }
            }
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
  const configs = await getModuleAIConfigsWithFallback(supabase, organizationId, "tablero");

  // Get all content for the organization with product/campaign context
  const { data: contents } = await supabase
    .from("content")
    .select(`
      id, title, status, deadline, created_at, updated_at, creator_id, editor_id, sphere_phase, sales_angle,
      product:products(name),
      client:clients(name)
    `)
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

  const statusDistributionStr = statusDistribution
    .map((s) => `- ${s.label}: ${s.count} (${s.percentage}%)`)
    .join("\n");

  const tasksByCreator = (() => {
    const byCreator: Record<string, number> = {};
    contents.forEach((c: any) => {
      const id = c.creator_id || "sin_asignar";
      byCreator[id] = (byCreator[id] || 0) + 1;
    });
    return Object.entries(byCreator)
      .map(([k, v]) => `${k}: ${v}`)
      .join(", ");
  })();
  const tasksByEditor = (() => {
    const byEditor: Record<string, number> = {};
    contents.forEach((c: any) => {
      const id = c.editor_id || "sin_asignar";
      byEditor[id] = (byEditor[id] || 0) + 1;
    });
    return Object.entries(byEditor)
      .map(([k, v]) => `${k}: ${v}`)
      .join(", ");
  })();

  // Build aggregated product/campaign context
  const productCounts: Record<string, number> = {};
  const phaseCounts: Record<string, number> = {};
  const clientNames = new Set<string>();
  contents.forEach((c: any) => {
    const pName = c.product?.name || "Sin producto";
    productCounts[pName] = (productCounts[pName] || 0) + 1;
    const phase = c.sphere_phase || "Sin fase";
    phaseCounts[phase] = (phaseCounts[phase] || 0) + 1;
    if (c.client?.name) clientNames.add(c.client.name);
  });
  const productLines = Object.entries(productCounts)
    .map(([name, count]) => `  - ${name}: ${count} tarjetas`)
    .join("\n");
  const phaseLines = Object.entries(phaseCounts)
    .filter(([k]) => k !== "Sin fase")
    .map(([phase, count]) => `  - ${phase}: ${count} tarjetas`)
    .join("\n");
  let campaignContextBlock = "";
  if (productLines || phaseLines || clientNames.size > 0) {
    campaignContextBlock = `
CONTEXTO PRODUCTOS/CAMPAÑAS (agregado del tablero):
${productLines ? `Productos en el tablero:\n${productLines}` : ""}
${phaseLines ? `\nFases ESFERA:\n${phaseLines}` : ""}
${clientNames.size > 0 ? `\nClientes: ${[...clientNames].join(", ")}` : ""}
`;
  }

  // Obtener prompts desde DB (con cache y fallback a hardcodeados)
  const promptConfig = await getPrompt(supabase, "board", "analyze_board");
  const systemPrompt = promptConfig.systemPrompt;
  const userPrompt = interpolatePrompt(promptConfig.userPrompt || "", {
    total_cards: totalCards,
    overdue_count: overdueItems.length,
    status_distribution: `${statusDistributionStr}\n- Tarjetas sin movimiento (7+ días): ${staleItems.length}`,
    tasks_by_creator: tasksByCreator || "N/A",
    tasks_by_editor: tasksByEditor || "N/A",
    campaign_context: campaignContextBlock.trim() || "No hay productos/campañas asociados en el tablero.",
  });

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

  const executionId = await logAIUsage(supabase, {
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
    ai_model: usedModel,
    execution_id: executionId ?? undefined
  };
}

async function suggestNextState(supabase: any, contentId: string, organizationId: string, userId: string) {
  const configs = await getModuleAIConfigsWithFallback(supabase, organizationId, "tablero");

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

  // Obtener prompts desde DB (con cache y fallback a hardcodeados)
  const promptConfig = await getPrompt(supabase, "board", "suggest_next_state");
  const systemPrompt = promptConfig.systemPrompt;
  const userPrompt = interpolatePrompt(promptConfig.userPrompt || "", {
    current_status: STATUS_LABELS[content.status] || content.status,
    has_script: content.script ? "Sí" : "No",
    has_video: content.video_url ? "Sí" : "No",
    has_creator: content.creator?.full_name ? `Sí (${content.creator.full_name})` : "No",
    has_editor: content.editor?.full_name ? `Sí (${content.editor.full_name})` : "No",
    recent_comments: "",
  });

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
    ai_model: analysis.ai_model,
    execution_id: (analysis as any).execution_id
  };
}

async function recommendAutomation(supabase: any, organizationId: string, userId: string) {
  const configs = await getModuleAIConfigsWithFallback(supabase, organizationId, "tablero");

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

  const transitionLines = Object.entries(transitions)
    .sort((a, b) => b[1] - a[1])
    .map(([t, c]) => `- ${t}: ${c} veces`)
    .join("\n");

  // Obtener prompts desde DB (con cache y fallback a hardcodeados)
  const promptConfig = await getPrompt(supabase, "board", "recommend_automation");
  const systemPrompt = promptConfig.systemPrompt;
  const userPrompt = interpolatePrompt(promptConfig.userPrompt || "", {
    transition_patterns: transitionLines || "(sin patrones)",
    current_rules: "",
  });

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

  const executionId = await logAIUsage(supabase, {
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
    execution_id: executionId ?? undefined
  };
}

// ==================== RESEARCH CONTEXT (Perplexity) ====================

async function handleResearchContext(
  supabase: any,
  contentId: string,
  organizationId: string,
  researchType: "trends" | "competitors" | "hooks"
) {
  const { data: content, error } = await supabase
    .from("content")
    .select(`
      title,
      sales_angle,
      sphere_phase,
      product:products(name, description)
    `)
    .eq("id", contentId)
    .single();

  if (error || !content) {
    throw new Error("Content not found");
  }

  const product = content.product as { name?: string; description?: string; category?: string } | null;
  if (!product?.name) {
    throw new Error("No product associated with this content");
  }

  const niche = (product as any).category || product.name;

  let research;
  switch (researchType) {
    case "trends":
      research = await PerplexitySearches.contentTrends(supabase, organizationId, {
        niche,
        platform: "TikTok",
      });
      break;
    case "competitors":
      research = await PerplexitySearches.competitorAnalysis(supabase, organizationId, {
        productName: product.name,
        market: "Latinoamérica",
      });
      break;
    case "hooks":
      research = await PerplexitySearches.hookResearch(supabase, organizationId, {
        productType: niche,
        platform: "TikTok",
      });
      break;
    default:
      research = await PerplexitySearches.contentTrends(supabase, organizationId, {
        niche,
        platform: "TikTok",
      });
  }

  return {
    research: research.content,
    citations: research.citations,
    contentContext: {
      title: content.title,
      salesAngle: content.sales_angle,
      spherePhase: content.sphere_phase,
    },
    researchType,
  };
}

// ==================== MAIN HANDLER ====================

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  let body: RequestBody | null = null;
  let userId = "system";

  try {
    // Use Kreoon (external) database if configured
    let supabase;
    
    if (isKreoonConfigured()) {
      console.log("[board-ai] Using Kreoon database");
      supabase = getKreoonClient();
      
      // Get user from auth header
      const authHeader = req.headers.get("Authorization");
      if (authHeader) {
        try {
          const auth = await validateKreoonAuth(authHeader);
          userId = auth.user.id;
        } catch (e) {
          // Silently continue with system user
        }
      }
    } else {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      supabase = createClient(supabaseUrl, supabaseKey);
      
      const authHeader = req.headers.get("Authorization");
      if (authHeader) {
        const token = authHeader.replace("Bearer ", "");
        const { data: { user } } = await supabase.auth.getUser(token);
        if (user) userId = user.id;
      }
    }

    body = await req.json();
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
      return moduleInactiveResponse(moduleKey);
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
      case "research_context": {
        const researchType = (body as RequestBody).researchType || "trends";
        if (!contentId) throw new Error("contentId is required for research_context");
        result = await handleResearchContext(supabase, contentId, organizationId, researchType);
        break;
      }
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    // Log module execution
    await supabase.rpc("log_ai_module_execution", {
      _org_id: organizationId,
      _module_key: moduleKey
    });

    return successResponse(result);
  } catch (e) {
    return errorResponse(e, {
      action: `board-ai:${body?.action || 'unknown'}`,
      resourceId: body?.contentId,
      userId,
    });
  }
});
