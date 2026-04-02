/**
 * profile-ai-bio
 * Genera una bio profesional optimizada para conversiones (Creator Premium).
 * Costo: 200 tokens de IA.
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

const TOKEN_COST = 200;
const AI_ACTION = "profile.bio_premium";

interface BioRequest {
  specializations: string[];
  experience_years: number;
  style: string;
  language?: "es" | "en";
  name?: string;
  niche?: string;
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
      .select("id, subscription_tier, organization_id")
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

    // 3. Verificar y descontar tokens de la organización
    const organizationId = creatorProfile.organization_id;
    const tokenCheck = await checkAndDeductTokens(
      supabase,
      organizationId,
      AI_ACTION,
      TOKEN_COST,
      { description: "Generación de bio premium con IA" }
    );

    if (!tokenCheck.allowed) {
      return insufficientTokensResponse(tokenCheck);
    }

    // 4. Parsear body
    const body = (await req.json()) as BioRequest;
    const { specializations, experience_years, style, language = "es", name, niche } = body;

    if (!specializations?.length || !style) {
      return new Response(
        JSON.stringify({ error: "specializations y style son requeridos" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 5. Construir prompts
    const idioma = language === "en" ? "inglés" : "español";
    const systemPrompt = `Eres un experto en copywriting para creadores de contenido UGC y marketing digital en LATAM.
Tu especialidad es escribir bios profesionales que convierten: perfiles que atraen marcas, agencias y clientes.

Reglas:
- La bio debe ser en ${idioma}
- Máximo 160 caracteres para versión corta, máximo 300 para versión larga
- Incluir CTA implícito (sin ser agresivo)
- Tono profesional pero cercano
- Resaltar especialización y propuesta de valor única
- Usar verbos de acción en primera persona
- Responde ÚNICAMENTE con JSON válido, sin texto adicional

Formato de respuesta:
{
  "bio_short": "<bio de máximo 160 caracteres>",
  "bio_long": "<bio de máximo 300 caracteres>",
  "headline": "<titular de perfil de máximo 80 caracteres>",
  "value_proposition": "<propuesta de valor en una línea>",
  "cta_suggestion": "<sugerencia de CTA para el perfil>"
}`;

    const userPrompt = `Genera la bio para este creador:
${name ? `- Nombre: ${name}` : ""}
- Especializaciones: ${specializations.join(", ")}
- Años de experiencia: ${experience_years}
- Estilo de contenido: ${style}
${niche ? `- Nicho principal: ${niche}` : ""}
- Idioma de la bio: ${idioma}

La bio debe posicionar al creador como experto en su área y motivar a marcas/agencias a contactarlo.`;

    // 6. Llamar a IA con fallback
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
      // Loguear fallo
      logAIUsage(supabase, {
        organization_id: organizationId,
        user_id: user.id,
        module: "profile-ai-bio",
        action: AI_ACTION,
        provider: "unknown",
        model: "unknown",
        tokens_input: 0,
        tokens_output: 0,
        success: false,
        error_message: aiError.message,
        edge_function: "profile-ai-bio",
        response_time_ms: Date.now() - startTime,
      }).catch(console.error);

      throw aiError;
    }

    const response_time_ms = Date.now() - startTime;

    // 7. Parsear respuesta de la IA
    let parsedResult: any;
    try {
      const jsonMatch = typeof aiResult === "string"
        ? aiResult.match(/\{[\s\S]*\}/)
        : null;
      const jsonStr = jsonMatch ? jsonMatch[0] : typeof aiResult === "string" ? aiResult : JSON.stringify(aiResult);
      parsedResult = JSON.parse(jsonStr);
    } catch {
      console.error("[profile-ai-bio] No se pudo parsear respuesta:", aiResult);
      // Fallback: retornar raw con estructura esperada
      parsedResult = {
        bio_short: typeof aiResult === "string" ? aiResult.slice(0, 160) : "",
        bio_long: typeof aiResult === "string" ? aiResult.slice(0, 300) : "",
        headline: "",
        value_proposition: "",
        cta_suggestion: "",
        raw: aiResult,
      };
    }

    // 8. Loguear uso exitoso
    logAIUsage(supabase, {
      organization_id: organizationId,
      user_id: user.id,
      module: "profile-ai-bio",
      action: AI_ACTION,
      provider: usedProvider,
      model: usedModel,
      tokens_input: 0,
      tokens_output: 0,
      success: true,
      edge_function: "profile-ai-bio",
      response_time_ms,
    }).catch(console.error);

    console.log(`[profile-ai-bio] Éxito para user ${user.id} usando ${usedProvider}/${usedModel}`);

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
    console.error("[profile-ai-bio] Error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Error interno del servidor",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
