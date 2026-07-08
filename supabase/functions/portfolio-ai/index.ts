import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callAI, corsHeaders } from "../_shared/ai-providers.ts";
import { logAIUsage } from "../_shared/ai-usage-logger.ts";
// Fallback legacy
import { PORTFOLIO_PROMPTS } from "../_shared/portfolio-prompts.ts";
// Nuevo: Prompts desde DB con cache y fallback
import { getPrompt, interpolatePrompt } from "../_shared/prompts/db-prompts.ts";
// SECURITY: Rate limiting para proteger APIs costosas
import { checkRateLimit, RATE_LIMIT_PRESETS, rateLimitResponse, getClientIp } from "../_shared/rate-limiter.ts";
import { assertOrgMembership } from "../_shared/assertOrgMembership.ts";
import { corsJsonResponse } from "../_shared/cors.ts";

interface AIRequest {
  action: "search" | "caption" | "bio" | "recommendations" | "moderation" | "blocks";
  payload: Record<string, unknown>;
  organizationId?: string;
  model?: string;
}

/** Prompts centralizados - fallback cuando el frontend no envía prompts */
function getLocalPrompts(action: string, payload: Record<string, unknown>): { system: string; user: string } {
  const config = PORTFOLIO_PROMPTS[action];
  if (config) {
    return {
      system: config.system,
      user: config.userTemplate(payload ?? {}),
    };
  }
  return {
    system: "Eres un asistente útil. Responde SOLO en JSON válido.",
    user: JSON.stringify(payload),
  };
}

/** Obtiene prompts desde DB con fallback a hardcodeados */
async function getPromptsFromDB(
  supabase: any,
  action: string,
  payload: Record<string, unknown>
): Promise<{ system: string; user: string }> {
  try {
    const promptConfig = await getPrompt(supabase, "portfolio", action);
    if (promptConfig.systemPrompt) {
      return {
        system: promptConfig.systemPrompt,
        user: promptConfig.userPrompt
          ? interpolatePrompt(promptConfig.userPrompt, payload as Record<string, string>)
          : JSON.stringify(payload),
      };
    }
  } catch (err) {
    console.warn(`[portfolio-ai] Error fetching prompt from DB, using fallback:`, err);
  }
  return getLocalPrompts(action, payload);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Crear cliente Supabase para leer prompts desde DB y rate limit
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // ── SECURITY: Rate limiting por IP (20 req/min para AI) ──
    const clientIp = getClientIp(req);
    const rateLimitResult = await checkRateLimit(supabase, clientIp, RATE_LIMIT_PRESETS.ai);
    if (!rateLimitResult.allowed) {
      console.warn(`[portfolio-ai] Rate limit exceeded for IP: ${clientIp}`);
      return rateLimitResponse(req, rateLimitResult, RATE_LIMIT_PRESETS.ai.limit);
    }
    // ─────────────────────────────────────────────────────────

    const { action, payload, organizationId, model: requestedModel } = (await req.json()) as AIRequest;

    console.log(`[portfolio-ai] Action: ${action}, Org: ${organizationId}, model: ${requestedModel ?? 'default'}`);

    // FASE 1: exigir auth real siempre. organizationId es opcional (el
    // portfolio personal no siempre tiene org), pero si viene, valida
    // membresía. Antes: cero auth y prompts.system/user crudos del body
    // se mandaban tal cual al LLM (relay abierto) — se retira esa rama,
    // ningún caller real la usaba (siempre viene de getPromptsFromDB).
    const authHeader = req.headers.get("Authorization");
    const authToken = authHeader?.replace(/^Bearer\s+/i, "").trim();
    const { data: { user: callerUser } = { user: null } } = authToken
      ? await supabase.auth.getUser(authToken)
      : { data: { user: null } };
    if (!callerUser) {
      return corsJsonResponse(req, { error: "unauthorized" }, 401);
    }
    if (organizationId) {
      const membershipRejection = await assertOrgMembership(req, supabase, callerUser.id, organizationId);
      if (membershipRejection) return membershipRejection;
    }
    const userId = callerUser.id;

    const dbPrompts = await getPromptsFromDB(supabase, action, payload ?? {});
    const systemPrompt = dbPrompts.system;
    const userPrompt = dbPrompts.user;

    let result: any;
    const startTime = Date.now();

    // Use callAI with Mistral as primary (falls back to Gemini → OpenAI automatically)
    const { content: aiContent, provider: usedProvider, model: usedModel } = await callAI(
      systemPrompt,
      userPrompt,
      { model: requestedModel || "mistral-small-latest" }
    );

    const response_time_ms = Date.now() - startTime;

    try {
      result = JSON.parse(aiContent);
    } catch {
      console.error("[portfolio-ai] Failed to parse AI response:", aiContent);
      result = { raw: aiContent };
    }

    console.log(`[portfolio-ai] Success for action: ${action} using ${usedProvider}/${usedModel}`);

    // Log successful AI call
    logAIUsage(supabase, {
      organization_id: organizationId || "00000000-0000-0000-0000-000000000000",
      user_id: userId || "00000000-0000-0000-0000-000000000000",
      module: "portfolio-ai",
      action,
      provider: usedProvider,
      model: usedModel,
      tokens_input: 0,
      tokens_output: 0,
      success: true,
      edge_function: "portfolio-ai",
      response_time_ms,
    }).catch(console.error);

    return new Response(JSON.stringify({ success: true, data: result, provider: usedProvider }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[portfolio-ai] Error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
