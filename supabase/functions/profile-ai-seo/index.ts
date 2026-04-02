/**
 * profile-ai-seo
 * Analiza un perfil de creador y genera sugerencias de SEO para mejorar
 * visibilidad en búsquedas internas y externas (Creator Premium).
 * Costo: 300 tokens de IA.
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

const TOKEN_COST = 300;
const AI_ACTION = "profile.seo_analysis";

interface SEORequest {
  profile_id: string;
  current_bio?: string;
  current_title?: string;
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
      .select("id, subscription_tier, organization_id, specializations, niche, style_tags")
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
      { description: "Análisis SEO del perfil con IA" }
    );

    if (!tokenCheck.allowed) {
      return insufficientTokensResponse(tokenCheck);
    }

    // 4. Parsear body
    const body = (await req.json()) as SEORequest;
    const { profile_id, current_bio, current_title } = body;

    if (!profile_id) {
      return new Response(
        JSON.stringify({ error: "profile_id es requerido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verificar que el profile_id corresponde al usuario autenticado
    if (profile_id !== user.id) {
      return new Response(
        JSON.stringify({ error: "No tienes permiso para analizar este perfil" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 5. Obtener datos adicionales del perfil base (profiles)
    const { data: baseProfile } = await supabase
      .from("profiles")
      .select("full_name, username, bio, tagline, specialties_tags, content_categories, industries, experience_level, best_at")
      .eq("id", profile_id)
      .single();

    // 6. Construir prompts
    const systemPrompt = `Eres un experto en SEO para perfiles de creadores de contenido y marketplaces UGC.
Tu objetivo es maximizar la visibilidad del perfil en búsquedas de marcas y agencias buscando creators.

Analiza el perfil y genera recomendaciones SEO accionables considerando:
- Keywords de alta demanda en el mercado UGC de LATAM
- Optimización del título/tagline para búsquedas
- Estructura óptima de la bio para buscabilidad
- Keywords long-tail relevantes para el nicho
- Meta descripción para compartir en redes

Responde ÚNICAMENTE con JSON válido con esta estructura:
{
  "score_actual": <número del 0 al 100 representando el SEO actual>,
  "score_potencial": <número del 0 al 100 si aplica todas las sugerencias>,
  "keywords": {
    "principales": ["<keyword1>", "<keyword2>", "<keyword3>"],
    "long_tail": ["<frase1>", "<frase2>", "<frase3>"],
    "hashtags_sugeridos": ["<#tag1>", "<#tag2>", "<#tag3>"]
  },
  "meta_description": "<meta descripción de 150-160 caracteres optimizada para SEO>",
  "suggestions": [
    {
      "campo": "<nombre del campo a mejorar>",
      "prioridad": "<alta|media|baja>",
      "problema": "<qué está mal o qué falta>",
      "solucion": "<cómo corregirlo>",
      "ejemplo": "<ejemplo concreto de cómo quedaría>"
    }
  ],
  "titulo_optimizado": "<título/tagline sugerido de máximo 80 caracteres>",
  "bio_optimizada": "<bio sugerida con keywords integradas de máximo 300 caracteres>"
}`;

    const userPrompt = `Analiza el SEO de este perfil de creador:

DATOS ACTUALES:
- Nombre: ${baseProfile?.full_name || "No especificado"}
- Username: ${baseProfile?.username ? "@" + baseProfile.username : "No especificado"}
- Bio actual: ${current_bio || baseProfile?.bio || "Sin bio"}
- Título/Tagline actual: ${current_title || baseProfile?.tagline || "Sin tagline"}
- Mejor en: ${baseProfile?.best_at || "No especificado"}
- Nivel de experiencia: ${baseProfile?.experience_level || "No especificado"}

ESPECIALIZACIÓN:
- Especializaciones (creator_profile): ${creatorProfile.specializations?.join(", ") || "No especificadas"}
- Tags de estilo: ${creatorProfile.style_tags?.join(", ") || "No especificados"}
- Especialidades (perfil base): ${baseProfile?.specialties_tags?.join(", ") || "No especificadas"}
- Categorías de contenido: ${baseProfile?.content_categories?.join(", ") || "No especificadas"}
- Industrias: ${baseProfile?.industries?.join(", ") || "No especificadas"}
- Nicho principal: ${creatorProfile.niche || "No especificado"}

Contexto: Plataforma marketplace UGC en LATAM. Las marcas buscan creators por tipo de contenido, industria y estilo.
Genera sugerencias específicas y accionables para mejorar la visibilidad en búsquedas.`;

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
        module: "profile-ai-seo",
        action: AI_ACTION,
        provider: "unknown",
        model: "unknown",
        tokens_input: 0,
        tokens_output: 0,
        success: false,
        error_message: aiError.message,
        edge_function: "profile-ai-seo",
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
      console.error("[profile-ai-seo] No se pudo parsear respuesta:", aiResult);
      parsedResult = {
        score_actual: 0,
        score_potencial: 0,
        keywords: { principales: [], long_tail: [], hashtags_sugeridos: [] },
        meta_description: "",
        suggestions: [],
        titulo_optimizado: "",
        bio_optimizada: "",
        raw: aiResult,
      };
    }

    // 9. Loguear uso exitoso
    logAIUsage(supabase, {
      organization_id: organizationId,
      user_id: user.id,
      module: "profile-ai-seo",
      action: AI_ACTION,
      provider: usedProvider,
      model: usedModel,
      tokens_input: 0,
      tokens_output: 0,
      success: true,
      edge_function: "profile-ai-seo",
      response_time_ms,
    }).catch(console.error);

    console.log(`[profile-ai-seo] Éxito para user ${user.id} usando ${usedProvider}/${usedModel}`);

    return new Response(
      JSON.stringify({
        success: true,
        ...parsedResult,
        tokens_used: TOKEN_COST,
        tokens_remaining: tokenCheck.tokensRemaining,
        provider: usedProvider,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[profile-ai-seo] Error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Error interno del servidor",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
