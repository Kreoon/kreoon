import { corsHeaders } from "../../_shared/ai-providers.ts";
import { PerplexitySearches } from "../../_shared/perplexity-client.ts";
import { checkAndDeductTokens, insufficientTokensResponse } from "../../_shared/ai-token-guard.ts";
import {
  executeSkillChain,
  getActiveSkills,
  type SkillContext,
  type SkillChainResult,
} from "../../_shared/skills/index.ts";
import { logAIUsage } from "./_shared-helpers.ts";
import type { ContentAIContext } from "./types.ts";

// Caso "generate_with_skills": genera con el sistema de Skills (Agentes).
export async function handleGenerateWithSkills(ctx: ContentAIContext): Promise<Response> {
  const { supabase, body, organizationId, callerUserId, product, aiConfig, fallbacks } = ctx;

  console.log("[content-ai] 🎯 Usando sistema de Skills");

  // Token guard
  if (organizationId) {
    const tokenCheck = await checkAndDeductTokens(supabase, organizationId, callerUserId, "scripts.skills_generation", undefined, {
      ai_provider: body.ai_provider,
      ai_model: body.ai_model,
      description: "Script generation with Skills system",
    });
    if (!tokenCheck.allowed) {
      return insufficientTokensResponse(tokenCheck);
    }
  }

  // Preparar investigación Perplexity si está habilitada
  let perplexityResearch = "";
  if (body.use_perplexity) {
    const queries = body.perplexity_queries || { trends: true, hooks: true, narratives: true };
    const productName = product?.name || "";
    const platform = body.script_params?.platform || "TikTok";
    const targetCountry = body.script_params?.target_country || "Colombia";
    const idealAvatar = product?.ideal_avatar || body.script_params?.ideal_avatar || "";
    const salesAngle = body.script_params?.sales_angle || "";
    const selectedPain = body.script_params?.selected_pain || "";
    const narrativeStructure = body.script_params?.narrative_structure || "";

    const searchPromises: Promise<{ type: string; result: { content: string; citations?: string[] } }>[] = [];

    if (queries.trends !== false) {
      searchPromises.push(
        PerplexitySearches.contentTrends(supabase, organizationId, {
          niche: productName,
          platform,
          country: targetCountry,
        }).then((r) => ({ type: "🔥 TENDENCIAS", result: r }))
      );
    }
    if (queries.hooks !== false) {
      searchPromises.push(
        PerplexitySearches.hookResearch(supabase, organizationId, {
          productType: productName,
          platform,
          targetAudience: idealAvatar || undefined,
          salesAngle: salesAngle || undefined,
          targetCountry: targetCountry || undefined,
        }).then((r) => ({ type: "🎣 HOOKS DE APERTURA", result: r }))
      );
    }
    if (queries.narratives !== false) {
      searchPromises.push(
        PerplexitySearches.scriptNarratives(supabase, organizationId, {
          productType: productName,
          platform,
          narrativeStructure: narrativeStructure || undefined,
          targetCountry: targetCountry || undefined,
        }).then((r) => ({ type: "🧠 NARRATIVAS QUE CONVIERTEN", result: r }))
      );
    }
    if (queries.objections) {
      searchPromises.push(
        PerplexitySearches.audienceObjections(supabase, organizationId, {
          productType: productName,
          productName,
          targetCountry: targetCountry || undefined,
          selectedPain: selectedPain || undefined,
        }).then((r) => ({ type: "💬 OBJECIONES REALES", result: r }))
      );
    }
    if (queries.competitors) {
      searchPromises.push(
        PerplexitySearches.competitorAnalysis(supabase, organizationId, {
          productName,
          market: targetCountry,
        }).then((r) => ({ type: "🏢 COMPETENCIA", result: r }))
      );
    }
    if (queries.audience) {
      searchPromises.push(
        PerplexitySearches.audienceResearch(supabase, organizationId, {
          productName,
          currentAvatar: idealAvatar || undefined,
        }).then((r) => ({ type: "👥 AUDIENCIA", result: r }))
      );
    }

    try {
      const searchResults = await Promise.allSettled(searchPromises);
      const results: string[] = [];

      for (const res of searchResults) {
        if (res.status === "fulfilled" && res.value.result.content) {
          const { type, result: data } = res.value;
          results.push(`### ${type}\n${data.content}`);
        }
      }

      if (results.length > 0) {
        perplexityResearch = results.join("\n---\n");
        console.log(`[content-ai] Perplexity: ${results.length} queries completados`);
      }
    } catch (e) {
      console.log("[content-ai] Perplexity skipped:", (e as Error).message);
    }
  }

  // Construir contexto para los Skills
  const skillContext: SkillContext = {
    product: {
      name: product?.name || "",
      description: product?.description || "",
      strategy: product?.strategy || "",
      market_research: product?.market_research || "",
      ideal_avatar: product?.ideal_avatar || "",
      sales_angles: product?.sales_angles || [],
    },
    formData: {
      sales_angle: body.script_params?.sales_angle || "",
      cta: body.script_params?.cta || "",
      hooks_count: body.script_params?.hooks_count || 3,
      target_country: body.script_params?.target_country || "Colombia",
      narrative_structure: body.script_params?.narrative_structure || "problema-solución",
      sphere_phase: body.script_params?.sphere_phase || "solution",
      consciousness_level: body.script_params?.consciousness_level || "problem_aware",
      additional_context: body.script_params?.additional_instructions || "",
    },
    perplexityResearch: perplexityResearch || undefined,
  };

  // Log skills que se van a ejecutar
  const activeSkills = getActiveSkills({
    sphere_phase: skillContext.formData.sphere_phase,
    consciousness_level: skillContext.formData.consciousness_level,
    narrative_structure: skillContext.formData.narrative_structure,
  });
  console.log(`[content-ai] Skills activos: ${activeSkills.map(s => s.id).join(", ")}`);

  // Ejecutar cadena de skills
  const skillsStartTime = Date.now();
  const skillsResult: SkillChainResult = await executeSkillChain(skillContext, {
    provider: aiConfig.provider,
    apiKey: aiConfig.apiKey,
    model: aiConfig.model,
  });
  const skillsResponseTime = Date.now() - skillsStartTime;

  console.log("[content-ai] Skills chain result:", {
    success: skillsResult.success,
    executionsCount: skillsResult.executions.length,
    totalDurationMs: skillsResult.totalDurationMs,
    errors: skillsResult.errors,
  });

  // Log de uso
  await logAIUsage(supabase, {
    organizationId,
    userId: callerUserId,
    provider: aiConfig.provider,
    model: aiConfig.model,
    action: "generate_with_skills",
    success: skillsResult.success,
    response_time_ms: skillsResponseTime,
    errorMessage: skillsResult.errors?.join("; "),
  });

  return new Response(
    JSON.stringify({
      success: skillsResult.success,
      script: skillsResult.finalOutput,
      ai_provider: aiConfig.provider,
      ai_model: aiConfig.model,
      used_perplexity: body.use_perplexity && perplexityResearch.length > 0,
      skills_metadata: {
        skills_executed: skillsResult.executions.map((e) => ({
          skill: e.skillId,
          confidence: e.confidence,
          duration_ms: e.durationMs,
          executed_at: e.executedAt,
        })),
        total_duration_ms: skillsResult.totalDurationMs,
        errors: skillsResult.errors,
      },
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}
