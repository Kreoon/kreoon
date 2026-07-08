import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getKreoonClient, isKreoonConfigured } from "../_shared/kreoon-client.ts";
import { getModuleAIConfig } from "../_shared/get-module-ai-config.ts";
import { corsHeaders } from "../_shared/ai-providers.ts";
import { errorResponse, successResponse, moduleInactiveResponse, validationErrorResponse } from "../_shared/error-response.ts";
import { checkRateLimit, RATE_LIMIT_PRESETS, rateLimitResponse, getClientIp } from "../_shared/rate-limiter.ts";
import { assertOrgMembership } from "../_shared/assertOrgMembership.ts";
import { ACTION_TO_MODULE, getAllAvailableFallbacks, logAIUsage } from "./handlers/_shared-helpers.ts";
import { handleGenerateWithSkills } from "./handlers/generateWithSkills.ts";
import { handleGenerateScript } from "./handlers/generateScript.ts";
import { handleAnalyzeContent } from "./handlers/analyzeContent.ts";
import { handleChat } from "./handlers/chatHandler.ts";
import { handleImproveScript } from "./handlers/improveScript.ts";
import type { ContentAIRequest, ContentAIContext } from "./handlers/types.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  let body: ContentAIRequest | null = null;

  try {
    // Use Kreoon database if configured, otherwise fallback to default
    let supabase;
    if (isKreoonConfigured()) {
      console.log("[content-ai] Using Kreoon database");
      supabase = getKreoonClient();
    } else {
      console.log("[content-ai] Kreoon not configured, using default database");
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      supabase = createClient(supabaseUrl, supabaseKey);
    }

    // ── SECURITY: Rate limiting por IP (20 req/min para AI) ──
    const clientIp = getClientIp(req);
    const rateLimitResult = await checkRateLimit(supabase, clientIp, RATE_LIMIT_PRESETS.ai);
    if (!rateLimitResult.allowed) {
      console.warn(`[content-ai] Rate limit exceeded for IP: ${clientIp}`);
      return rateLimitResponse(req, rateLimitResult, RATE_LIMIT_PRESETS.ai.limit);
    }
    // ─────────────────────────────────────────────────────────

    body = await req.json();
    const {
      action,
      organizationId,
      data,
      prompt,
      product,
      generation_type
    } = body;

    console.log("Content AI Request:", { action, organizationId, generation_type });

    if (!organizationId) {
      return validationErrorResponse("organizationId es requerido", "organizationId");
    }

    // FASE 1: validar que el caller pertenezca a organizationId — antes
    // cualquier autenticado quemaba tokens IA de cualquier org.
    const authHeader = req.headers.get("Authorization");
    const authToken = authHeader?.replace(/^Bearer\s+/i, "").trim();
    const { data: { user: callerUser } = { user: null } } = authToken
      ? await supabase.auth.getUser(authToken)
      : { data: { user: null } };
    const membershipRejection = await assertOrgMembership(req, supabase, callerUser?.id, organizationId);
    if (membershipRejection) return membershipRejection;
    const callerUserId = callerUser!.id;

    // Get module key for this action
    const moduleKey = ACTION_TO_MODULE[action] || "content_detail";

    let aiConfig;
    let fallbacks: Array<{ provider: string; model: string; apiKey: string }> = [];
    try {
      aiConfig = await getModuleAIConfig(supabase, organizationId, moduleKey);
      fallbacks = getAllAvailableFallbacks(aiConfig.provider);
    } catch (error: any) {
      if (error.message?.startsWith("MODULE_INACTIVE:")) {
        const module = error.message.split(":")[1];
        return moduleInactiveResponse(module);
      }
      throw error;
    }

    let result: string;
    const startTime = Date.now();

    const ctx: ContentAIContext = {
      supabase,
      body,
      organizationId,
      callerUserId,
      product,
      data,
      prompt,
      generation_type,
      aiConfig,
      fallbacks,
    };

    switch (action) {
      // ══════════════════════════════════════════════════════════════
      // NUEVA ACCIÓN: Generación con Sistema de Skills (Agentes)
      // ══════════════════════════════════════════════════════════════
      case "generate_with_skills":
        return await handleGenerateWithSkills(ctx);

      case "research_and_generate":
      case "generate_script": {
        const scriptOutcome = await handleGenerateScript(ctx);
        if (scriptOutcome instanceof Response) return scriptOutcome;
        result = scriptOutcome.result;
        break;
      }

      case "analyze_content": {
        result = (await handleAnalyzeContent(ctx)).result;
        break;
      }

      case "chat": {
        result = (await handleChat(ctx)).result;
        break;
      }

      case "improve_script": {
        result = (await handleImproveScript(ctx)).result;
        break;
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    const executionId = await logAIUsage(supabase, {
      organizationId,
      userId: callerUserId,
      provider: aiConfig.provider,
      model: aiConfig.model,
      action,
      success: true,
      response_time_ms: Date.now() - startTime,
    });

    return successResponse({
      success: true,
      result,
      ai_provider: aiConfig.provider,
      ai_model: aiConfig.model,
      execution_id: executionId ?? undefined
    });
  } catch (error) {
    return errorResponse(error, {
      action: `content-ai:${body?.action || 'unknown'}`,
      resourceId: body?.product?.id,
    });
  }
});
