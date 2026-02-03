import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getKreoonClient, isKreoonConfigured } from "../_shared/kreoon-client.ts";
import { getModuleAIConfig } from "../_shared/get-module-ai-config.ts";
import { callAIWithFallback, corsHeaders } from "../_shared/ai-providers.ts";
import { PerplexitySearches, searchWithPerplexity } from "../_shared/perplexity-client.ts";
import { MASTER_SCRIPT_PROMPT } from "../_shared/prompts/scripts.ts";

interface ContentAIRequest {
  action: "generate_script" | "analyze_content" | "chat" | "improve_script" | "research_and_generate";
  organizationId: string;
  ai_provider?: "gemini" | "openai" | "anthropic";
  ai_model?: string;
  use_perplexity?: boolean; // Enable pre-research with Perplexity
  perplexity_queries?: {
    trends?: boolean;
    hooks?: boolean;
    competitors?: boolean;
    audience?: boolean;
  };
  custom_perplexity_query?: string;
  data?: {
    client_name?: string;
    product?: string;
    objective?: string;
    duration?: string;
    tone?: string;
    script?: string;
    video_url?: string;
    messages?: Array<{ role: string; content: string }>;
    original_script?: string;
    feedback?: string;
  };
  prompt?: string;
  product?: {
    id?: string;
    name?: string;
    description?: string;
    strategy?: string;
    market_research?: string;
    ideal_avatar?: string;
    sales_angles?: string[];
  };
  script_params?: any;
  generation_type?: string;
}

// Template variable definitions - all available placeholders
const TEMPLATE_VARIABLES: Record<string, { description: string; category: string }> = {
  // Product variables
  '{producto_nombre}': { description: 'Nombre del producto', category: 'Producto' },
  '{producto_descripcion}': { description: 'Descripción detallada del producto', category: 'Producto' },
  '{producto_estrategia}': { description: 'Estrategia de marketing del producto', category: 'Producto' },
  '{producto_investigacion}': { description: 'Investigación de mercado', category: 'Producto' },
  '{producto_avatar}': { description: 'Avatar / Cliente ideal', category: 'Producto' },
  '{producto_angulos}': { description: 'Lista de ángulos de venta', category: 'Producto' },
  
  // Form/Script params variables
  '{cta}': { description: 'Llamado a la acción (CTA)', category: 'Formulario' },
  '{angulo_venta}': { description: 'Ángulo de venta seleccionado', category: 'Formulario' },
  '{cantidad_hooks}': { description: 'Cantidad de hooks solicitados', category: 'Formulario' },
  '{pais_objetivo}': { description: 'País objetivo del contenido', category: 'Formulario' },
  '{estructura_narrativa}': { description: 'Estructura narrativa seleccionada', category: 'Formulario' },
  '{avatar_ideal}': { description: 'Avatar ideal del formulario', category: 'Formulario' },
  '{estrategias_video}': { description: 'Estrategias/estructuras de video', category: 'Formulario' },
  '{transcripcion_referencia}': { description: 'Transcripción de video de referencia', category: 'Formulario' },
  '{hooks_sugeridos}': { description: 'Lista de hooks sugeridos por el usuario', category: 'Formulario' },
  '{instrucciones_adicionales}': { description: 'Instrucciones adicionales del usuario', category: 'Formulario' },
  
  // Document variables
  '{documento_brief}': { description: 'Contenido del brief del producto', category: 'Documentos' },
  '{documento_onboarding}': { description: 'Contenido del onboarding', category: 'Documentos' },
  '{documento_research}': { description: 'Contenido del research/investigación', category: 'Documentos' },
};

// Replace template variables in prompts
function replaceTemplateVariables(
  text: string, 
  product?: ContentAIRequest['product'],
  scriptParams?: any,
  documents?: { brief?: string; onboarding?: string; research?: string }
): string {
  if (!text) return text;
  
  let result = text;
  
  // Product variables
  result = result.replace(/\{producto_nombre\}/gi, product?.name || '');
  result = result.replace(/\{producto_descripcion\}/gi, product?.description || '');
  result = result.replace(/\{producto_estrategia\}/gi, product?.strategy || '');
  result = result.replace(/\{producto_investigacion\}/gi, product?.market_research || '');
  result = result.replace(/\{producto_avatar\}/gi, product?.ideal_avatar || '');
  result = result.replace(/\{producto_angulos\}/gi, 
    product?.sales_angles?.map((a, i) => `${i + 1}. ${a}`).join('\n') || ''
  );
  
  // Form/Script params variables
  result = result.replace(/\{cta\}/gi, scriptParams?.cta || '');
  result = result.replace(/\{angulo_venta\}/gi, scriptParams?.sales_angle || '');
  result = result.replace(/\{cantidad_hooks\}/gi, scriptParams?.hooks_count || '');
  result = result.replace(/\{pais_objetivo\}/gi, scriptParams?.target_country || '');
  result = result.replace(/\{estructura_narrativa\}/gi, scriptParams?.narrative_structure || '');
  result = result.replace(/\{avatar_ideal\}/gi, scriptParams?.ideal_avatar || product?.ideal_avatar || '');
  result = result.replace(/\{estrategias_video\}/gi, scriptParams?.video_strategies || '');
  result = result.replace(/\{transcripcion_referencia\}/gi, scriptParams?.reference_transcription || '');
  result = result.replace(/\{hooks_sugeridos\}/gi, 
    Array.isArray(scriptParams?.hooks) ? scriptParams.hooks.join('\n') : ''
  );
  result = result.replace(/\{instrucciones_adicionales\}/gi, scriptParams?.additional_instructions || '');
  
  // Document variables
  result = result.replace(/\{documento_brief\}/gi, documents?.brief || '');
  result = result.replace(/\{documento_onboarding\}/gi, documents?.onboarding || '');
  result = result.replace(/\{documento_research\}/gi, documents?.research || '');
  
  return result;
}

// Build product context for AI prompts (legacy support)
function buildProductContext(product?: ContentAIRequest['product']): string {
  if (!product) return "";
  
  const sections: string[] = [];
  
  sections.push("📦 INFORMACIÓN COMPLETA DEL PRODUCTO:");
  
  if (product.name) {
    sections.push(`\n🏷️ NOMBRE: ${product.name}`);
  }
  
  if (product.description) {
    sections.push(`\n📝 DESCRIPCIÓN:\n${product.description}`);
  }
  
  if (product.strategy) {
    sections.push(`\n🎯 ESTRATEGIA DE PRODUCTO:\n${product.strategy}`);
  }
  
  if (product.market_research) {
    sections.push(`\n📊 INVESTIGACIÓN DE MERCADO:\n${product.market_research}`);
  }
  
  if (product.ideal_avatar) {
    sections.push(`\n👤 AVATAR / CLIENTE IDEAL:\n${product.ideal_avatar}`);
  }
  
  if (product.sales_angles && product.sales_angles.length > 0) {
    sections.push(`\n💡 ÁNGULOS DE VENTA DISPONIBLES:\n${product.sales_angles.map((a, i) => `${i + 1}. ${a}`).join('\n')}`);
  }
  
  return sections.join('\n');
}

// Map action to module key
const ACTION_TO_MODULE: Record<string, string> = {
  generate_script: "scripts",
  research_and_generate: "scripts",
  analyze_content: "content_detail",
  chat: "content_detail",
  improve_script: "scripts",
};

// Get fallback config when primary fails (from env)
function getFallbackConfig(primaryProvider: string): { provider: string; model: string; apiKey: string } | null {
  const googleKey = Deno.env.get("GOOGLE_AI_API_KEY");
  const openaiKey = Deno.env.get("OPENAI_API_KEY");
  if (primaryProvider === "gemini" && openaiKey) {
    return { provider: "openai", model: "gpt-4o-mini", apiKey: openaiKey };
  }
  if (primaryProvider === "openai" && googleKey) {
    return { provider: "gemini", model: "gemini-2.5-flash", apiKey: googleKey };
  }
  return null;
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
        module: "content",
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

// Usa prompt maestro centralizado desde _shared/prompts/scripts.ts
const SYSTEM_PROMPTS = {
  generate_script: MASTER_SCRIPT_PROMPT,
  
  analyze_content: `Eres un experto en análisis de contenido de video y marketing digital.
Tu trabajo es analizar guiones y videos para dar feedback constructivo y específico.

Evalúa:
1. Enganche inicial (¿Captura atención en los primeros 3 segundos?)
2. Estructura narrativa
3. Claridad del mensaje
4. Llamada a la acción
5. Potencial viral
6. Áreas de mejora

Sé específico y da ejemplos concretos de cómo mejorar.`,

  chat: `Eres un asistente experto en producción de contenido de video y marketing digital.
Ayudas al equipo de Creartor Studio con:
- Ideas creativas para videos
- Estrategias de contenido
- Mejores prácticas de redes sociales
- Optimización de guiones
- Consejos de producción

Responde de manera profesional pero amigable, en español.`,

  improve_script: `Eres un editor experto de guiones para contenido de video.
Tu tarea es mejorar guiones existentes basándote en el feedback proporcionado.
Mantén la esencia del mensaje original mientras optimizas:
- Claridad
- Engagement
- Estructura
- Impacto emocional

Devuelve el guion mejorado en formato HTML estructurado.`,
};

// ============= IMPROVED HTML BLOCK FORMAT =============
const BLOCK_FORMAT_INSTRUCTIONS = `
🎨 FORMATO DE BLOQUES HTML (OBLIGATORIO):

Estructura cada bloque con estas clases CSS para mejor organización:

<div class="script-block" data-type="{tipo}">
  <div class="block-header">
    <h2 class="block-title">{Emoji} {Título del Bloque}</h2>
    <span class="block-badge">{Tipo}</span>
  </div>
  <div class="block-content">
    {Contenido estructurado}
  </div>
</div>

TIPOS DE BLOQUE:
- hooks: Para los ganchos/hooks del video
- script: Para el guion principal
- visuals: Para indicaciones visuales
- audio: Para indicaciones de audio/música
- cta: Para el llamado a la acción
- notes: Para notas adicionales

ESTRUCTURA INTERNA:
- Usa <ul class="hook-list"> para listas de hooks
- Usa <div class="scene"> para separar escenas
- Usa <p class="dialogue"> para diálogos
- Usa <p class="action"> para acciones/visuales
- Usa <blockquote class="cta-text"> para el CTA destacado
- Usa <div class="timestamp">[00:00]</div> para marcas de tiempo

EJEMPLO:
<div class="script-block" data-type="hooks">
  <div class="block-header">
    <h2 class="block-title">🎣 HOOKS</h2>
    <span class="block-badge">Ganchos Iniciales</span>
  </div>
  <div class="block-content">
    <ul class="hook-list">
      <li><strong>Hook 1:</strong> "¿Sabías que el 80% de las personas...?"</li>
      <li><strong>Hook 2:</strong> "Esto me cambió la vida..."</li>
    </ul>
  </div>
</div>
`;


// Helper function to sleep for a given number of milliseconds
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/** Wrapper para content-ai que usa callAIWithFallback del shared */
async function callAI(
  provider: string,
  apiKey: string,
  model: string,
  systemPrompt: string,
  userPrompt: string,
  fallbackProvider?: string | null,
  fallbackApiKey?: string | null,
  fallbackModel?: string | null
): Promise<string> {
  const configs = [
    { provider, model, apiKey },
    ...(fallbackProvider && fallbackApiKey
      ? [
          {
            provider: fallbackProvider,
            model: fallbackModel || (fallbackProvider === "gemini" ? "gemini-2.5-flash" : "gpt-4o-mini"),
            apiKey: fallbackApiKey,
          },
        ]
      : []),
  ];
  const { result } = await callAIWithFallback(configs, systemPrompt, userPrompt);
  return typeof result === "string" ? result : String(result ?? "");
}

// Genera el bloque HTML para cada rol (simplified version)
function getGenerationTypePrompt(generation_type?: string, customRolePrompts?: any): string {
  if (customRolePrompts) {
    switch (generation_type) {
      case "editor":
        return customRolePrompts.editor || `📦 GENERANDO: BLOQUE EDITOR ✂️ - Pensado para edición fluida y rápida.`;
      case "strategist":
        return customRolePrompts.strategist || `📦 GENERANDO: BLOQUE ESTRATEGA ♟️ - Pensamiento de fondo y estrategia.`;
      case "trafficker":
        return customRolePrompts.trafficker || `📦 GENERANDO: BLOQUE TRAFFICKER 📊 - Pensado para escalar en pauta.`;
      case "designer":
        return customRolePrompts.designer || `📦 GENERANDO: BLOQUE DISEÑADOR 🎨 - Guía visual clara.`;
      case "admin":
        return customRolePrompts.admin || `📦 GENERANDO: BLOQUE ADMIN / PROJECT MANAGER 📅 - Control y ejecución.`;
      default:
        return customRolePrompts.creator || `📦 GENERANDO: BLOQUE CREADOR 🎥 - Guion estructurado por escenas, listo para grabar.`;
    }
  }
  
  switch (generation_type) {
    case "editor":
      return `📦 GENERANDO: BLOQUE EDITOR ✂️ - Pensado para edición fluida y rápida.`;
    case "strategist":
      return `📦 GENERANDO: BLOQUE ESTRATEGA ♟️ - Pensamiento de fondo y estrategia.`;
    case "trafficker":
      return `📦 GENERANDO: BLOQUE TRAFFICKER 📊 - Pensado para escalar en pauta.`;
    case "designer":
      return `📦 GENERANDO: BLOQUE DISEÑADOR 🎨 - Guía visual clara.`;
    case "admin":
      return `📦 GENERANDO: BLOQUE ADMIN / PROJECT MANAGER 📅 - Control y ejecución.`;
    default:
      return `📦 GENERANDO: BLOQUE CREADOR 🎥 - Guion estructurado por escenas, listo para grabar.`;
  }
}

// Get custom prompts from organization
async function getOrganizationPrompts(supabase: any, organizationId: string) {
  try {
    const { data } = await supabase
      .from("organization_ai_prompts")
      .select("prompt_config, is_active")
      .eq("organization_id", organizationId)
      .eq("module_key", "scripts")
      .eq("is_active", true)
      .maybeSingle();

    if (data?.prompt_config && data.is_active) {
      return data.prompt_config;
    }
  } catch (e) {
    console.error("Error fetching organization prompts:", e);
  }
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Use Kreoon (external) database if configured, otherwise fallback to Lovable Cloud
    let supabase;
    if (isKreoonConfigured()) {
      console.log("[content-ai] Using Kreoon database");
      supabase = getKreoonClient();
    } else {
      console.log("[content-ai] Kreoon not configured, using Lovable Cloud");
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      supabase = createClient(supabaseUrl, supabaseKey);
    }

    const body: ContentAIRequest = await req.json();
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
      return new Response(
        JSON.stringify({ error: "organizationId es requerido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get module key for this action
    const moduleKey = ACTION_TO_MODULE[action] || "content_detail";

    let aiConfig;
    let fallback: { provider: string; model: string; apiKey: string } | null = null;
    try {
      aiConfig = await getModuleAIConfig(supabase, organizationId, moduleKey);
      fallback = getFallbackConfig(aiConfig.provider);
    } catch (error: any) {
      if (error.message?.startsWith("MODULE_INACTIVE:")) {
        const module = error.message.split(":")[1];
        return new Response(
          JSON.stringify({ 
            error: "MODULE_INACTIVE",
            module,
            message: `El módulo de IA "${module}" no está habilitado para tu organización. Actívalo en Configuración → IA & Modelos.`
          }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw error;
    }

    let result: string;

    switch (action) {
      case "research_and_generate":
      case "generate_script": {
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
          
          let masterPrompt = MASTER_SCRIPT_PROMPT;
          let formatRules = "";
          let criticalRules = "";
          let rolePrompt = "";
          
          if (customPrompts) {
            // Apply template variable replacements to custom prompts
            masterPrompt = replaceTemplateVariables(
              customPrompts.master_prompt || MASTER_SCRIPT_PROMPT,
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
            : `${MASTER_SCRIPT_PROMPT}

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

          result = await callAI(aiConfig.provider, aiConfig.apiKey, aiConfig.model, fullSystemPrompt, prompt, fallbackProvider, fallbackApiKey, fallbackModel);

          await logAIUsage(supabase, {
            organizationId,
            userId: "system",
            provider: aiConfig.provider,
            model: aiConfig.model,
            action: usePerplexity ? "generate_script_with_research" : "generate_script",
            success: true
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

        result = await callAI(aiConfig.provider, aiConfig.apiKey, aiConfig.model, SYSTEM_PROMPTS.generate_script, legacyPrompt, fallbackProvider, fallbackApiKey, fallbackModel);
        break;
      }

      case "analyze_content": {
        const analyzePrompt = `Analiza el siguiente contenido y proporciona feedback detallado:

${data?.script ? `GUION:\n${data.script}` : ""}
${data?.video_url ? `VIDEO URL: ${data.video_url}` : ""}

Proporciona un análisis completo con puntuación del 1-10 para cada aspecto y sugerencias específicas de mejora.`;

        result = await callAI(aiConfig.provider, aiConfig.apiKey, aiConfig.model, SYSTEM_PROMPTS.analyze_content, analyzePrompt, fallbackProvider, fallbackApiKey, fallbackModel);
        break;
      }

      case "chat": {
        if (!data?.messages || data.messages.length === 0) {
          throw new Error("Messages are required for chat");
        }

        // For chat, build the full conversation
        const userMessage = data.messages[data.messages.length - 1]?.content || "";
        result = await callAI(aiConfig.provider, aiConfig.apiKey, aiConfig.model, SYSTEM_PROMPTS.chat, userMessage, fallbackProvider, fallbackApiKey, fallbackModel);
        break;
      }

      case "improve_script": {
        const improvePrompt = `Mejora el siguiente guion basándote en el feedback proporcionado:

GUION ORIGINAL:
${data?.original_script || ""}

FEEDBACK:
${data?.feedback || "Hazlo más dinámico y atractivo"}

Devuelve el guion mejorado manteniendo el formato HTML estructurado.`;

        result = await callAI(aiConfig.provider, aiConfig.apiKey, aiConfig.model, SYSTEM_PROMPTS.improve_script, improvePrompt, fallbackProvider, fallbackApiKey, fallbackModel);
        break;
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    const executionId = await logAIUsage(supabase, {
      organizationId,
      userId: "system",
      provider: aiConfig.provider,
      model: aiConfig.model,
      action,
      success: true
    });

    return new Response(
      JSON.stringify({ success: true, result, ai_provider: aiConfig.provider, ai_model: aiConfig.model, execution_id: executionId ?? undefined }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in content-ai function:", error);

    let status = 500;
    if (errorMessage.includes("Rate limit")) status = 429;
    if (errorMessage.includes("Payment required")) status = 402;

    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
