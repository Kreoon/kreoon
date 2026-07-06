import { corsHeaders } from "../../_shared/ai-providers.ts";
import { PerplexitySearches, searchWithPerplexity } from "../../_shared/perplexity-client.ts";
import { checkAndDeductTokens, insufficientTokensResponse } from "../../_shared/ai-token-guard.ts";
import { getPrompt } from "../../_shared/prompts/db-prompts.ts";
import { MASTER_SCRIPT_PROMPT } from "../../_shared/prompts/scripts.ts";
import {
  getSkillPhases,
  buildSkillInput,
  callAIWithSkill,
  type SkillContext,
  type SkillExecution,
  type Skill,
} from "../../_shared/skills/index.ts";
import {
  BLOCK_FORMAT_INSTRUCTIONS,
  SYSTEM_PROMPTS,
  buildProductContext,
  callAI,
  getGenerationTypePrompt,
  getOrganizationPrompts,
  logAIUsage,
  replaceTemplateVariables,
} from "./_shared-helpers.ts";
import type { ContentAIContext } from "./types.ts";

// Caso "research_and_generate" / "generate_script".
// Puede devolver una Response propia (skills, SSE, o flujo legacy con prompt+product)
// o { result } para que index.ts siga el mismo flujo compartido de log+successResponse
// que hoy corre para el fallback final (sin prompt/product).
export async function handleGenerateScript(ctx: ContentAIContext): Promise<Response | { result: string }> {
  const { supabase, body, organizationId, callerUserId, product, data, prompt, generation_type, aiConfig, fallbacks } = ctx;

  // ═══════════════════════════════════════════════════════════════
  // OPCIÓN: Redirigir a Skills si use_skills=true
  // ═══════════════════════════════════════════════════════════════
  if (body.use_skills === true && prompt && product) {
    console.log("[content-ai] 🔀 Redirigiendo generate_script → Skills system");

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
            niche: productName, platform, country: targetCountry,
          }).then((r) => ({ type: "🔥 TENDENCIAS", result: r }))
        );
      }
      if (queries.hooks !== false) {
        searchPromises.push(
          PerplexitySearches.hookResearch(supabase, organizationId, {
            productType: productName, platform,
            targetAudience: idealAvatar || undefined,
            salesAngle: salesAngle || undefined,
            targetCountry: targetCountry || undefined,
          }).then((r) => ({ type: "🎣 HOOKS DE APERTURA", result: r }))
        );
      }
      if (queries.narratives !== false) {
        searchPromises.push(
          PerplexitySearches.scriptNarratives(supabase, organizationId, {
            productType: productName, platform,
            narrativeStructure: narrativeStructure || undefined,
            targetCountry: targetCountry || undefined,
          }).then((r) => ({ type: "🧠 NARRATIVAS QUE CONVIERTEN", result: r }))
        );
      }
      if (queries.objections) {
        searchPromises.push(
          PerplexitySearches.audienceObjections(supabase, organizationId, {
            productType: productName, productName,
            targetCountry: targetCountry || undefined,
            selectedPain: selectedPain || undefined,
          }).then((r) => ({ type: "💬 OBJECIONES REALES", result: r }))
        );
      }
      if (queries.competitors) {
        searchPromises.push(
          PerplexitySearches.competitorAnalysis(supabase, organizationId, {
            productName, market: targetCountry,
          }).then((r) => ({ type: "🏢 COMPETENCIA", result: r }))
        );
      }
      if (queries.audience) {
        searchPromises.push(
          PerplexitySearches.audienceResearch(supabase, organizationId, {
            productName, currentAvatar: idealAvatar || undefined,
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

    // Construir contexto para Skills — incluye buildBaseContext() completo via `prompt`
    const skillAdditionalContext = [
      prompt, // fullPrompt = customPrompt + buildBaseContext() con TODO el ADN
      body.script_params?.additional_instructions,
    ].filter(Boolean).join('\n\n');

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
        generation_type: generation_type || "script",
        video_duration: body.script_params?.video_duration || "60s",
        additional_context: skillAdditionalContext,
      },
      perplexityResearch: perplexityResearch || undefined,
    };

    // ═══════════════════════════════════════════════════════════════
    // EJECUTAR FASES EN PARALELO — función reutilizable
    // ═══════════════════════════════════════════════════════════════
    const phases = getSkillPhases(skillContext.formData.generation_type);

    async function runSkillPhases() {
      if (!phases || phases.length === 0) {
        throw new Error('No hay fases definidas para este tipo de generación');
      }
      const allExecutions: SkillExecution[] = [];
      const allErrors: string[] = [];
      let phaseOutput = '';
      const skillsStartTime = Date.now();

      for (const phase of phases) {
        const phaseResults = await Promise.allSettled(
          phase.map(async (skill: Skill) => {
            const t0 = Date.now();
            const input = buildSkillInput(skill, skillContext, phaseOutput, allExecutions);
            const response = await callAIWithSkill(skill, input, [
              { provider: aiConfig.provider, apiKey: aiConfig.apiKey, model: aiConfig.model },
              ...fallbacks,
            ]);
            return { skill, content: response.content, confidence: response.confidence, durationMs: Date.now() - t0 };
          })
        );

        const phaseParts: string[] = [];
        for (const result of phaseResults) {
          if (result.status === 'fulfilled') {
            const { skill, content, confidence, durationMs } = result.value;
            allExecutions.push({ skillId: skill.id, input: '...', output: content, confidence, executedAt: new Date(), durationMs });
            phaseParts.push(`### ${skill.name}\n${content}`);
          } else {
            allErrors.push(String(result.reason));
          }
        }
        phaseOutput = phaseParts.join('\n\n---\n\n');
      }

      const totalDurationMs = Date.now() - skillsStartTime;
      await logAIUsage(supabase, {
        organizationId,
        userId: callerUserId,
        provider: aiConfig.provider,
        model: aiConfig.model,
        action: "generate_script_with_skills",
        success: allExecutions.length > 0,
        response_time_ms: totalDurationMs,
      });

      return { phaseOutput, allExecutions, totalDurationMs };
    }

    // ═══════════════════════════════════════════════════════════════
    // MODO JSON (stream: false) — para MCP y clientes sin SSE
    // ═══════════════════════════════════════════════════════════════
    if (body.stream === false) {
      const { phaseOutput, allExecutions, totalDurationMs } = await runSkillPhases();
      return new Response(
        JSON.stringify({
          success: true,
          script: phaseOutput,
          ai_provider: aiConfig.provider,
          ai_model: aiConfig.model,
          used_skills: true,
          used_perplexity: body.use_perplexity && perplexityResearch.length > 0,
          skills_metadata: {
            skills_executed: allExecutions.map((e: SkillExecution) => ({ skill: e.skillId, confidence: e.confidence, duration_ms: e.durationMs })),
            total_duration_ms: totalDurationMs,
          },
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ═══════════════════════════════════════════════════════════════
    // MODO SSE — fases en background, progreso en tiempo real
    // ═══════════════════════════════════════════════════════════════
    const sseEncoder = new TextEncoder();
    const { readable: sseReadable, writable: sseWritable } = new TransformStream<Uint8Array, Uint8Array>();
    const sseWriter = sseWritable.getWriter();

    const sendSSE = async (event: string, data: unknown) => {
      try {
        await sseWriter.write(sseEncoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      } catch (_) { /* client may have disconnected */ }
    };

    ;(async () => {
      try {
        if (!phases || phases.length === 0) {
          await sendSSE('error', { message: 'No hay fases definidas para este tipo de generación' });
          return;
        }

        const allExecutions: SkillExecution[] = [];
        const allErrors: string[] = [];
        let phaseOutput = '';
        const skillsStartTime = Date.now();

        await sendSSE('start', {
          total_phases: phases.length,
          total_skills: phases.reduce((s: number, p: Skill[]) => s + p.length, 0),
        });

        for (let phaseIdx = 0; phaseIdx < phases.length; phaseIdx++) {
          const phase = phases[phaseIdx];

          await sendSSE('phase_start', {
            phase: phaseIdx + 1,
            total: phases.length,
            skills: phase.map((s: Skill) => s.id),
            pct: Math.round((phaseIdx / phases.length) * 100),
          });

          const phaseResults = await Promise.allSettled(
            phase.map(async (skill: Skill) => {
              const t0 = Date.now();
              const input = buildSkillInput(skill, skillContext, phaseOutput, allExecutions);
              const response = await callAIWithSkill(skill, input, [
                { provider: aiConfig.provider, apiKey: aiConfig.apiKey, model: aiConfig.model },
                ...fallbacks,
              ]);
              return { skill, content: response.content, confidence: response.confidence, durationMs: Date.now() - t0 };
            })
          );

          const phaseParts: string[] = [];
          for (const result of phaseResults) {
            if (result.status === 'fulfilled') {
              const { skill, content, confidence, durationMs } = result.value;
              allExecutions.push({ skillId: skill.id, input: '...', output: content, confidence, executedAt: new Date(), durationMs });
              phaseParts.push(`### ${skill.name}\n${content}`);
            } else {
              allErrors.push(String(result.reason));
            }
          }
          phaseOutput = phaseParts.join('\n\n---\n\n');

          await sendSSE('phase_complete', {
            phase: phaseIdx + 1,
            pct: Math.round(((phaseIdx + 1) / phases.length) * 100),
          });
        }

        const totalDurationMs = Date.now() - skillsStartTime;

        await logAIUsage(supabase, {
          organizationId,
          userId: callerUserId,
          provider: aiConfig.provider,
          model: aiConfig.model,
          action: "generate_script_with_skills",
          success: allExecutions.length > 0,
          response_time_ms: totalDurationMs,
        });

        await sendSSE('complete', {
          success: allExecutions.length > 0,
          script: phaseOutput,
          ai_provider: aiConfig.provider,
          ai_model: aiConfig.model,
          used_perplexity: body.use_perplexity && perplexityResearch.length > 0,
          used_skills: true,
          skills_metadata: {
            skills_executed: allExecutions.map((e: SkillExecution) => ({ skill: e.skillId, confidence: e.confidence, duration_ms: e.durationMs })),
            total_duration_ms: totalDurationMs,
          },
        });
      } catch (err) {
        await sendSSE('error', { message: (err as Error).message });
      } finally {
        try { await sseWriter.close(); } catch (_) { /* already closed */ }
      }
    })();

    return new Response(sseReadable, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'X-Accel-Buffering': 'no',
      },
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // FLUJO LEGACY (sin skills)
  // ═══════════════════════════════════════════════════════════════

  // Token guard: deduct tokens per block when generation_type is specified
  if (generation_type && organizationId) {
    const actionKey = `scripts.block.${generation_type}`;
    const tokenCheck = await checkAndDeductTokens(supabase, organizationId, callerUserId, actionKey, undefined, {
      ai_provider: body.ai_provider,
      ai_model: body.ai_model,
      description: `Script block: ${generation_type}`,
    });
    if (!tokenCheck.allowed) {
      return insufficientTokensResponse(tokenCheck);
    }
  }

  if (prompt && product) {
    // Check if Perplexity research is requested
    const usePerplexity = body.use_perplexity === true;
    let perplexityResearch = "";

    if (usePerplexity) {
      const queries = body.perplexity_queries || { trends: true, hooks: true };
      const productName = product.name || "";
      const productCategory = body.script_params?.product_category || productName;
      const platform = body.script_params?.platform || "TikTok";
      const targetCountry = body.script_params?.target_country || "Colombia";
      const idealAvatar = product.ideal_avatar || body.script_params?.ideal_avatar || "";
      const competitors = body.script_params?.competitors;

      const searchPromises: Promise<{ type: string; result: { content: string; citations?: string[] } }>[] = [];

      if (queries.trends !== false) {
        searchPromises.push(
          PerplexitySearches.contentTrends(supabase, organizationId, {
            niche: productCategory,
            platform,
            country: targetCountry,
          }).then((r) => ({ type: "trends", result: r }))
        );
      }
      if (queries.hooks !== false) {
        searchPromises.push(
          PerplexitySearches.hookResearch(supabase, organizationId, {
            productType: productCategory,
            platform,
            targetAudience: idealAvatar || undefined,
          }).then((r) => ({ type: "hooks", result: r }))
        );
      }
      if (queries.competitors && (competitors?.length || productName)) {
        searchPromises.push(
          PerplexitySearches.competitorAnalysis(supabase, organizationId, {
            productName,
            competitors: Array.isArray(competitors) ? competitors : undefined,
            market: targetCountry,
          }).then((r) => ({ type: "competitors", result: r }))
        );
      }
      if (queries.audience) {
        searchPromises.push(
          PerplexitySearches.audienceResearch(supabase, organizationId, {
            productName,
            currentAvatar: idealAvatar || undefined,
          }).then((r) => ({ type: "audience", result: r }))
        );
      }
      if (body.custom_perplexity_query) {
        searchPromises.push(
          searchWithPerplexity(supabase, organizationId, body.custom_perplexity_query).then((r) => ({
            type: "custom",
            result: r,
          }))
        );
      }

      // Fallback: si no hay búsquedas específicas, usar query genérico
      if (searchPromises.length === 0) {
        const fallbackQuery = `Investiga información actualizada sobre "${productName}" para crear contenido publicitario:

PRODUCTO: ${productName}
DESCRIPCIÓN: ${product.description || "No disponible"}
ÁNGULO DE VENTA: ${body.script_params?.sales_angle || "General"}
PAÍS OBJETIVO: ${targetCountry}

NECESITO: Tendencias actuales, estadísticas recientes, puntos de dolor de la audiencia, frases populares, competidores. Responde conciso, máximo 500 palabras.`;
        searchPromises.push(
          searchWithPerplexity(supabase, organizationId, fallbackQuery, {
            recencyFilter: "week",
            maxTokens: 1500,
          }).then((r) => ({ type: "market", result: r }))
        );
      }

      try {
        console.log("[content-ai] Running Perplexity research, queries:", searchPromises.length);
        const searchResults = await Promise.allSettled(searchPromises);
        const results: string[] = [];

        for (const res of searchResults) {
          if (res.status === "fulfilled" && res.value.result.content) {
            const { type, result: data } = res.value;
            const citations = data.citations?.slice(0, 3).join(", ") || "No disponibles";
            results.push(
              `### Investigación: ${type.toUpperCase()}\n${data.content}\n\nFuentes: ${citations}`
            );
          }
        }

        if (results.length > 0) {
          perplexityResearch = `
=== INVESTIGACIÓN EN TIEMPO REAL (Perplexity) ===
${results.join("\n---\n")}
=== FIN DE INVESTIGACIÓN ===

IMPORTANTE: Usa la información de la investigación para:
- Incluir hooks y formatos que están funcionando actualmente
- Evitar contenido sobreutilizado o penalizado
- Adaptar el tono a las tendencias actuales
- Incluir referencias relevantes si aplica

`;
          console.log("[content-ai] Perplexity research added, sections:", results.length);
        }
      } catch (e) {
        console.log("[content-ai] Perplexity research skipped:", (e as Error).message);
      }
    }

    // Get custom prompts from organization if available
    const customPrompts = await getOrganizationPrompts(supabase, organizationId);

    // Extract document content from script_params if available
    const documents = {
      brief: body.script_params?.document_brief || '',
      onboarding: body.script_params?.document_onboarding || '',
      research: body.script_params?.document_research || '',
    };

    // Build product context to inject into prompts (legacy support)
    const productContext = buildProductContext(product);

    // Obtener prompt maestro desde DB (con cache y fallback a hardcodeados)
    const dbPromptConfig = await getPrompt(supabase, "scripts", "creator");

    let masterPrompt = dbPromptConfig.systemPrompt || MASTER_SCRIPT_PROMPT;
    let formatRules = "";
    let criticalRules = "";
    let rolePrompt = "";

    if (customPrompts) {
      // Apply template variable replacements to custom prompts
      // masterPrompt ya tiene el valor de DB como fallback
      masterPrompt = replaceTemplateVariables(
        customPrompts.master_prompt || masterPrompt,
        product, body.script_params, documents
      );
      formatRules = replaceTemplateVariables(
        customPrompts.format_rules || "",
        product, body.script_params, documents
      );
      criticalRules = replaceTemplateVariables(
        customPrompts.critical_rules || "",
        product, body.script_params, documents
      );
      rolePrompt = replaceTemplateVariables(
        getGenerationTypePrompt(generation_type, customPrompts.role_prompts),
        product, body.script_params, documents
      );
    } else {
      rolePrompt = getGenerationTypePrompt(generation_type);
    }

    // Include block format instructions for better output
    const fullSystemPrompt = customPrompts
      ? `${masterPrompt}

${criticalRules}

${formatRules}

${BLOCK_FORMAT_INSTRUCTIONS}

${rolePrompt}

${productContext}
${perplexityResearch}
IMPORTANTE:
- Analiza toda la información del producto proporcionada arriba
- La cantidad de hooks debe ser EXACTAMENTE la que se indica en el prompt del usuario
- Usa expresiones y modismos del país objetivo cuando sea apropiado
- El resultado debe ser HTML limpio, sin markdown, listo para renderizar
- ORGANIZA el contenido usando la estructura de bloques indicada`
      : `${masterPrompt}

${BLOCK_FORMAT_INSTRUCTIONS}

${rolePrompt}

${productContext}
${perplexityResearch}
IMPORTANTE:
- Analiza toda la información del producto proporcionada arriba
- La cantidad de hooks debe ser EXACTAMENTE la que se indica en el prompt del usuario
- Usa expresiones y modismos del país objetivo cuando sea apropiado
- El resultado debe ser HTML limpio, sin markdown, listo para renderizar
- ORGANIZA el contenido usando la estructura de bloques indicada`;

    console.log("[content-ai] Product context length:", productContext.length);
    console.log("[content-ai] Full system prompt length:", fullSystemPrompt.length);
    console.log("[content-ai] Template variables replaced, Perplexity:", usePerplexity);

    const startTime1 = Date.now();
    const result = await callAI(aiConfig.provider, aiConfig.apiKey, aiConfig.model, fullSystemPrompt, prompt, fallbacks);
    const responseTime1 = Date.now() - startTime1;

    await logAIUsage(supabase, {
      organizationId,
      userId: callerUserId,
      provider: aiConfig.provider,
      model: aiConfig.model,
      action: usePerplexity ? "generate_script_with_research" : "generate_script",
      success: true,
      response_time_ms: responseTime1,
    });

    return new Response(
      JSON.stringify({
        success: true,
        script: result,
        ai_provider: aiConfig.provider,
        ai_model: aiConfig.model,
        used_perplexity: usePerplexity && perplexityResearch.length > 0
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const legacyPrompt = `Genera un guion de video para:

CLIENTE: ${data?.client_name || "Cliente"}
PRODUCTO/SERVICIO: ${data?.product || "Producto"}
OBJETIVO: ${data?.objective || "Generar awareness"}
DURACIÓN: ${data?.duration || "60 segundos"}
TONO: ${data?.tone || "Profesional y dinámico"}

Genera un guion completo con timestamps, descripciones visuales y sugerencias de audio.`;

  const result = await callAI(aiConfig.provider, aiConfig.apiKey, aiConfig.model, SYSTEM_PROMPTS.generate_script, legacyPrompt, fallbacks);
  return { result };
}
