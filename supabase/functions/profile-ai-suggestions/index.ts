/**
 * profile-ai-suggestions
 * Analiza el perfil actual y sugiere qué bloques/secciones agregar
 * para maximizar conversiones y completitud (Creator Premium).
 * Costo: 150 tokens de IA.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  callAIWithFallback,
  getAPIKey,
  corsHeaders,
} from "../_shared/ai-providers.ts";
import {
  checkAndDeductTokens,
  insufficientTokensResponse,
} from "../_shared/ai-token-guard.ts";
import { logAIUsage } from "../_shared/ai-usage-logger.ts";

const TOKEN_COST = 150;
const AI_ACTION = "profile.block_suggestions";

// Bloques disponibles en la plataforma Kreoon
const AVAILABLE_BLOCKS = [
  "portfolio_grid",
  "video_reel",
  "stats_counter",
  "testimonials",
  "brands_worked_with",
  "services_pricing",
  "social_proof",
  "case_study",
  "contact_form",
  "availability_calendar",
  "ugc_examples",
  "before_after",
  "content_categories",
  "press_mentions",
  "achievements_badges",
];

interface SuggestionsRequest {
  profile_id: string;
  current_blocks: string[];
  specializations: string[];
  goal?: "brand_deals" | "agency_clients" | "freelance" | "visibility";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // 1. Verificar autenticación
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Token inválido o sesión expirada" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Verificar plan Creator Premium
    const { data: creatorProfile, error: profileError } = await supabase
      .from("creator_profiles")
      .select("id, subscription_tier, organization_id, niche, experience_level")
      .eq("user_id", user.id)
      .single();

    if (profileError || !creatorProfile) {
      return new Response(
        JSON.stringify({ error: "Perfil de creador no encontrado" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (creatorProfile.subscription_tier !== "creator_premium") {
      return new Response(
        JSON.stringify({
          error: "Esta función requiere Creator Premium",
          required_tier: "creator_premium",
          current_tier: creatorProfile.subscription_tier,
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Verificar y descontar tokens
    const organizationId = creatorProfile.organization_id;
    const tokenCheck = await checkAndDeductTokens(
      supabase,
      organizationId,
      AI_ACTION,
      TOKEN_COST,
      { description: "Sugerencias de bloques de perfil con IA" }
    );

    if (!tokenCheck.allowed) {
      return insufficientTokensResponse(tokenCheck);
    }

    // 4. Parsear body
    const body = (await req.json()) as SuggestionsRequest;
    const {
      profile_id,
      current_blocks = [],
      specializations = [],
      goal = "brand_deals",
    } = body;

    if (!profile_id) {
      return new Response(
        JSON.stringify({ error: "profile_id es requerido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (profile_id !== user.id) {
      return new Response(
        JSON.stringify({ error: "No tienes permiso para analizar este perfil" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 5. Obtener datos base del perfil
    const { data: baseProfile } = await supabase
      .from("profiles")
      .select("full_name, bio, tagline, experience_level, best_at, content_categories, industries, avatar_url, cover_url")
      .eq("id", profile_id)
      .single();

    // Calcular bloques faltantes
    const missingBlocks = AVAILABLE_BLOCKS.filter((b) => !current_blocks.includes(b));

    // Mapeo de objetivo a descripción legible
    const goalLabels: Record<string, string> = {
      brand_deals: "conseguir contratos directos con marcas",
      agency_clients: "atraer agencias de marketing y publicidad",
      freelance: "ofrecer servicios freelance de creación de contenido",
      visibility: "aumentar visibilidad y alcance orgánico",
    };

    // 6. Construir prompts
    const systemPrompt = `Eres un experto en optimización de perfiles de creadores de contenido UGC para marketplaces de LATAM.
Tu trabajo es recomendar qué bloques/secciones agregar al perfil para maximizar conversiones según el objetivo del creador.

Cada recomendación debe ser:
- Específica para el nicho y especialización del creador
- Justificada con un argumento de valor claro
- Priorizada por impacto en el objetivo
- Accionable: explicar exactamente qué poner en ese bloque

Bloques disponibles en la plataforma: ${AVAILABLE_BLOCKS.join(", ")}

Responde ÚNICAMENTE con JSON válido:
{
  "profile_completeness_score": <número del 0 al 100>,
  "suggested_blocks": [
    {
      "block_type": "<tipo exacto del bloque de la lista disponible>",
      "priority": "<alta|media|baja>",
      "impact_score": <número del 1 al 10>,
      "title": "<nombre amigable del bloque>",
      "reason": "<por qué este bloque es importante para el objetivo>",
      "content_guide": "<qué contenido específico poner en este bloque>"
    }
  ],
  "missing_critical": ["<lista de bloques críticos que faltan>"],
  "quick_wins": ["<acciones rápidas de máximo impacto para mejorar el perfil ya>"],
  "conversion_tips": ["<tips específicos para convertir visitas en contactos/contratos>"]
}`;

    const userPrompt = `Analiza este perfil y sugiere mejoras:

PERFIL ACTUAL:
- Nombre: ${baseProfile?.full_name || "No especificado"}
- Bio: ${baseProfile?.bio || "Sin bio"}
- Tagline: ${baseProfile?.tagline || "Sin tagline"}
- Mejor en: ${baseProfile?.best_at || "No especificado"}
- Nivel de experiencia: ${baseProfile?.experience_level || creatorProfile.experience_level || "No especificado"}
- Tiene avatar: ${baseProfile?.avatar_url ? "Sí" : "No"}
- Tiene portada: ${baseProfile?.cover_url ? "Sí" : "No"}

ESPECIALIZACIÓN:
- Especializaciones: ${specializations.join(", ") || "No especificadas"}
- Categorías de contenido: ${baseProfile?.content_categories?.join(", ") || "No especificadas"}
- Industrias: ${baseProfile?.industries?.join(", ") || "No especificadas"}
- Nicho: ${creatorProfile.niche || "No especificado"}

OBJETIVO DEL CREADOR:
- Objetivo principal: ${goalLabels[goal] || goal}

BLOQUES ACTUALES DEL PERFIL (${current_blocks.length}):
${current_blocks.length > 0 ? current_blocks.join(", ") : "El perfil no tiene bloques agregados aún"}

BLOQUES DISPONIBLES PARA AGREGAR (${missingBlocks.length}):
${missingBlocks.join(", ")}

Recomienda máximo 5 bloques priorizados por impacto. Sé específico sobre el contenido de cada bloque.`;

    // 7. Llamar a IA con fallback
    const geminiKey = getAPIKey("gemini");
    const openaiKey = getAPIKey("openai");

    const aiConfigs = [
      geminiKey && { provider: "gemini", model: "gemini-2.5-flash", apiKey: geminiKey },
      openaiKey && { provider: "openai", model: "gpt-4o-mini", apiKey: openaiKey },
    ].filter(Boolean) as Array<{ provider: string; model: string; apiKey: string }>;

    if (aiConfigs.length === 0) {
      throw new Error("No hay proveedores de IA configurados");
    }

    const startTime = Date.now();
    let usedProvider = "";
    let usedModel = "";
    let aiResult: any;

    try {
      const { result, usedProvider: provider, usedModel: model } = await callAIWithFallback(
        aiConfigs,
        systemPrompt,
        userPrompt
      );
      aiResult = result;
      usedProvider = provider;
      usedModel = model;
    } catch (aiError: any) {
      logAIUsage(supabase, {
        organization_id: organizationId,
        user_id: user.id,
        module: "profile-ai-suggestions",
        action: AI_ACTION,
        provider: "unknown",
        model: "unknown",
        tokens_input: 0,
        tokens_output: 0,
        success: false,
        error_message: aiError.message,
        edge_function: "profile-ai-suggestions",
        response_time_ms: Date.now() - startTime,
      }).catch(console.error);

      throw aiError;
    }

    const response_time_ms = Date.now() - startTime;

    // 8. Parsear respuesta
    let parsedResult: any;
    try {
      const jsonMatch = typeof aiResult === "string"
        ? aiResult.match(/\{[\s\S]*\}/)
        : null;
      const jsonStr = jsonMatch ? jsonMatch[0] : typeof aiResult === "string" ? aiResult : JSON.stringify(aiResult);
      parsedResult = JSON.parse(jsonStr);
    } catch {
      console.error("[profile-ai-suggestions] No se pudo parsear respuesta:", aiResult);
      parsedResult = {
        profile_completeness_score: 0,
        suggested_blocks: [],
        missing_critical: [],
        quick_wins: [],
        conversion_tips: [],
        raw: aiResult,
      };
    }

    // 9. Loguear uso exitoso
    logAIUsage(supabase, {
      organization_id: organizationId,
      user_id: user.id,
      module: "profile-ai-suggestions",
      action: AI_ACTION,
      provider: usedProvider,
      model: usedModel,
      tokens_input: 0,
      tokens_output: 0,
      success: true,
      edge_function: "profile-ai-suggestions",
      response_time_ms,
    }).catch(console.error);

    console.log(`[profile-ai-suggestions] Éxito para user ${user.id} usando ${usedProvider}/${usedModel}`);

    return new Response(
      JSON.stringify({
        success: true,
        ...parsedResult,
        available_blocks: AVAILABLE_BLOCKS,
        current_blocks,
        tokens_used: TOKEN_COST,
        tokens_remaining: tokenCheck.tokensRemaining,
        provider: usedProvider,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[profile-ai-suggestions] Error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Error interno del servidor",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
