import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getKreoonClient, isKreoonConfigured, validateKreoonAuth } from "../_shared/kreoon-client.ts";
import { getModuleAIConfig } from "../_shared/get-module-ai-config.ts";
import { callAISingle } from "../_shared/ai-providers.ts";
import { searchWithPerplexity } from "../_shared/perplexity-client.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

interface TalentSuggestCreatorRequest {
  action: "suggest_creator_profile";
  organizationId: string;
  productName: string;
  productCategory?: string;
}

type RequestBody =
  | TalentMatchingRequest
  | TalentQualityRequest
  | TalentRiskRequest
  | TalentReputationRequest
  | TalentAmbassadorRequest
  | TalentSuggestCreatorRequest;

async function handleMatching(supabase: any, req: TalentMatchingRequest, provider: string, model: string, apiKey: string) {
  const roleFilter = req.role === "editor" ? "editor" : "creator";

  // Si tenemos contentId, obtener contexto del producto y avatares
  let productContext: {
    productName: string;
    contentTitle?: string | null;
    salesAngle: string | null;
    spherePhase: string | null;
    avatar: {
      name: string;
      age?: string;
      gender?: string;
      occupation?: string;
      situation?: string;
      characteristics?: string[] | string;
      drivers?: Record<string, unknown> | string;
      tone?: string;
      style?: string;
    } | null;
  } | null = null;

  if (req.contentId) {
    const { data: content } = await supabase
      .from("content")
      .select(`
        title,
        product_id,
        sales_angle,
        sphere_phase,
        product:products(
          name,
          avatar_profiles,
          market_research
        )
      `)
      .eq("id", req.contentId)
      .single();

    if (content?.product) {
      const p = content.product as any;
      const ap = typeof p.avatar_profiles === "string" ? (() => { try { return JSON.parse(p.avatar_profiles || "{}"); } catch { return {}; } })() : (p.avatar_profiles || {});
      const profilesArr = ap.profiles || ap.avatars || (Array.isArray(ap) ? ap : []);
      const primaryAvatar = Array.isArray(profilesArr) ? profilesArr[0] : null;
      productContext = {
        productName: p.name || "Sin nombre",
        contentTitle: content.title || null,
        salesAngle: content.sales_angle || null,
        spherePhase: content.sphere_phase || null,
        avatar: primaryAvatar ? {
          name: primaryAvatar.name || primaryAvatar.nombre || "Sin nombre",
          age: primaryAvatar.age || primaryAvatar.edad,
          gender: primaryAvatar.gender || primaryAvatar.genero,
          occupation: primaryAvatar.occupation || primaryAvatar.ocupacion,
          situation: primaryAvatar.situation || primaryAvatar.situacion,
          characteristics: primaryAvatar.characteristics || primaryAvatar.caracteristicas,
          drivers: primaryAvatar.drivers || primaryAvatar.drivers_emocionales || primaryAvatar.primary_pain || primaryAvatar.objeciones,
          tone: primaryAvatar.ideal_message_tone || primaryAvatar.tone || primaryAvatar.tono_comunicacion || primaryAvatar.tono,
          style: Array.isArray(primaryAvatar.content_consumption?.content_types)
            ? primaryAvatar.content_consumption.content_types.join(", ")
            : (primaryAvatar.content_consumption?.content_types || primaryAvatar.style || ""),
        } : null,
      };
    }
  }

  // Get available talent
  const { data: members } = await supabase
    .from("organization_member_roles")
    .select("user_id")
    .eq("organization_id", req.organizationId)
    .eq("role", roleFilter);

  if (!members?.length) {
    return { selected_id: null, reasoning: ["No hay talento disponible con el rol especificado"], risk_level: "high", confidence: 0, fit_score: 0 };
  }

  const userIds = members.map((m: any) => m.user_id);

  // Get talent profiles with performance data + fit-relevant fields (bio, specialties, style)
  const { data: profiles } = await supabase
    .from("profiles")
    .select(`
      id, full_name, bio, quality_score_avg, reliability_score, velocity_score,
      editor_rating, editor_completed_count, editor_on_time_count,
      is_active, ai_recommended_level, ai_risk_flag,
      specialties_tags, style_keywords, content_categories, industries, interests
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

  const avatarContextBlock = productContext?.avatar ? `
AVATAR OBJETIVO DEL CONTENIDO:
- Nombre: ${productContext.avatar.name}
- Edad: ${productContext.avatar.age || "No definido"}
- Género: ${productContext.avatar.gender || "No definido"}
- Ocupación: ${productContext.avatar.occupation || "No definido"}
- Características: ${Array.isArray(productContext.avatar.characteristics) ? productContext.avatar.characteristics.join(", ") : (productContext.avatar.characteristics || "No definidas")}
- Drivers emocionales: ${typeof productContext.avatar.drivers === "object" ? JSON.stringify(productContext.avatar.drivers) : (productContext.avatar.drivers || "No definidos")}
- Situación: ${productContext.avatar.situation || "No especificada"}
- Tono preferido: ${productContext.avatar.tone || "No definido"}
- Tipo de contenido: ${productContext.avatar.style || "No definido"}

CONSIDERACIÓN PARA MATCHING:
Prioriza creadores cuyo estilo, demografía o especialidad conecten mejor con este avatar.
Por ejemplo, si el avatar es una mujer joven interesada en skincare, un creador con audiencia similar tendría mejor "fit".
Incluye un fit_score (0-100) que evalúe qué tan bien el talento encaja con el avatar objetivo.
` : "";

  const systemPrompt = `Eres un asistente experto en asignación de talento para producción de contenido UGC.

Tu tarea es seleccionar el mejor ${req.role === "editor" ? "editor" : "creador"} para un proyecto específico considerando:
1. Carga de trabajo actual (no sobrecargar)
2. Score de calidad histórico
3. Confiabilidad y velocidad de entrega
4. Nivel recomendado por IA
5. Banderas de riesgo activas
6. FIT CON EL AVATAR OBJETIVO (si está disponible)
${avatarContextBlock}

Responde en español. Proporciona reasoning detallado.`;

  const userPrompt = `Rol buscado: ${req.role}
${req.deadline ? `Deadline: ${req.deadline}` : ""}
${req.priority ? `Prioridad: ${req.priority}` : ""}
${req.contentType ? `Tipo de contenido: ${req.contentType}` : ""}
${productContext ? `
Producto: ${productContext.productName}
${productContext.contentTitle ? `Contenido: ${productContext.contentTitle}` : ""}
Fase ESFERA: ${productContext.spherePhase || "No definida"}
Ángulo de venta: ${productContext.salesAngle || "No definido"}
` : ""}

Talentos disponibles:
${JSON.stringify(talentWithWorkload, null, 2)}

Selecciona el mejor talento. Responde con JSON.`;

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
          fit_score: {
            type: "number",
            description: "Score de fit con avatar/campaña (0-100). 100 = perfecto match. Prioriza creadores cuyo estilo/demografía conecten con el avatar. Usa 50 si no hay contexto de producto."
          },
          alternatives: {
            type: "array",
            items: {
              type: "object",
              properties: {
                talent_id: { type: "string", description: "UUID del talento alternativo" },
                id: { type: "string", description: "Alias de talent_id" },
                name: { type: "string" },
                score: { type: "number", description: "Score de aptitud 0-100" },
                reason: { type: "string" }
              }
            }
          }
        },
        required: ["selected_id", "reasoning", "risk_level", "confidence", "fit_score"]
      }
    }
  }];

  const result = await callAISingle(provider, model, apiKey, systemPrompt, userPrompt, tools);

  // Parse if string
  const parsed = typeof result === "string" ? JSON.parse(result) : result;

  // Ensure fit_score exists (default 50 when AI no lo proporciona)
  if (typeof parsed.fit_score !== "number") {
    parsed.fit_score = 50;
  }

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

async function handleQuality(supabase: any, req: TalentQualityRequest, provider: string, model: string, apiKey: string) {
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

  const result = await callAISingle(provider, model, apiKey, systemPrompt, userPrompt, tools);

  const parsed = typeof result === "string" ? JSON.parse(result) : result;

  // Update content with quality score
  await supabase
    .from("content")
    .update({ ai_quality_score: parsed.quality_score })
    .eq("id", req.contentId);

  return parsed;
}

async function handleRisk(supabase: any, req: TalentRiskRequest, provider: string, model: string, apiKey: string) {
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

  const result = await callAISingle(provider, model, apiKey, systemPrompt, userPrompt, tools);

  const parsed = typeof result === "string" ? JSON.parse(result) : result;

  // Update profile with risk flag
  await supabase
    .from("profiles")
    .update({ ai_risk_flag: parsed.risk_level })
    .eq("id", req.userId);

  return parsed;
}

async function handleReputation(supabase: any, req: TalentReputationRequest, provider: string, model: string, apiKey: string) {
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

  const result = await callAISingle(provider, model, apiKey, systemPrompt, userPrompt, tools);

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

async function handleAmbassador(supabase: any, req: TalentAmbassadorRequest, provider: string, model: string, apiKey: string) {
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

  const result = await callAISingle(provider, model, apiKey, systemPrompt, userPrompt, tools);

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

async function handleSuggestCreatorProfile(supabase: any, req: TalentSuggestCreatorRequest) {
  const productCategory = req.productCategory || req.productName || "productos en general";

  const trendsResearch = await searchWithPerplexity(
    supabase,
    req.organizationId,
    `¿Qué tipo de creadores de contenido UGC están generando mejores resultados para productos de ${productCategory} en Latinoamérica?

Incluye:
1. Características demográficas ideales
2. Estilo de contenido que funciona
3. Tamaño de audiencia óptimo (micro, medio, macro)
4. Plataformas donde son más efectivos
5. Ejemplos de creadores exitosos en el nicho`,
    { recencyFilter: "month" }
  );

  return {
    externalResearch: trendsResearch.content,
    citations: trendsResearch.citations,
    recommendedProfile: {
      summary: "Perfil ideal basado en investigación de tendencias actuales",
      productCategory,
      productName: req.productName,
    },
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: RequestBody = await req.json();

    // Use Kreoon (external) database if configured
    let supabase;
    if (isKreoonConfigured()) {
      console.log("[talent-ai] Using Kreoon database");
      supabase = getKreoonClient();
    } else {
      supabase = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );
    }

    // Get AI config based on action
    const moduleKeyMap: Record<string, string> = {
      matching: "talent.matching.ai",
      quality: "talent.quality.ai",
      risk: "talent.risk.ai",
      reputation: "talent.reputation.ai",
      ambassador: "talent.ambassador.ai",
    };

    const moduleKey = moduleKeyMap[body.action];
    const aiConfig = await getModuleAIConfig(supabase, body.organizationId, moduleKey, { requireActive: false });

    let result;
    switch (body.action) {
      case "matching":
        result = await handleMatching(supabase, body, aiConfig.provider, aiConfig.model, aiConfig.apiKey);
        break;
      case "quality":
        result = await handleQuality(supabase, body, aiConfig.provider, aiConfig.model, aiConfig.apiKey);
        break;
      case "risk":
        result = await handleRisk(supabase, body, aiConfig.provider, aiConfig.model, aiConfig.apiKey);
        break;
      case "reputation":
        result = await handleReputation(supabase, body, aiConfig.provider, aiConfig.model, aiConfig.apiKey);
        break;
      case "ambassador":
        result = await handleAmbassador(supabase, body as TalentAmbassadorRequest, aiConfig.provider, aiConfig.model, aiConfig.apiKey);
        break;
      case "suggest_creator_profile":
        result = await handleSuggestCreatorProfile(supabase, body as TalentSuggestCreatorRequest);
        break;
      default:
        throw new Error("Invalid action");
    }

    // Log usage
    const authHeader = req.headers.get("Authorization");
    let userId = "system";
    if (authHeader) {
      if (isKreoonConfigured()) {
        try {
          const auth = await validateKreoonAuth(authHeader);
          userId = auth.user.id;
        } catch (e) {
          // Silently continue with system user
        }
      } else {
        const { data: { user } } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
        if (user) userId = user.id;
      }
    }

    const { data: logRow } = await supabase
      .from("ai_usage_logs")
      .insert({
        organization_id: body.organizationId,
        user_id: userId,
        module: moduleKey,
        action: body.action,
        provider: aiConfig.provider,
        model: aiConfig.model,
        success: true,
      })
      .select("id")
      .single();

    return new Response(
      JSON.stringify({
        success: true,
        ...result,
        provider: aiConfig.provider,
        model: aiConfig.model,
        execution_id: logRow?.id ?? undefined,
      }),
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
