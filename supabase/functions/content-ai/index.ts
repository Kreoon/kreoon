import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ContentAIRequest {
  action: "generate_script" | "analyze_content" | "chat" | "improve_script";
  organizationId: string;
  ai_provider?: "lovable" | "openai" | "anthropic";
  ai_model?: string;
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

// AI Provider configurations
type AIProvider = "lovable" | "openai" | "anthropic";

interface AIConfig {
  url: string;
  getHeaders: (apiKey: string) => Record<string, string>;
  getBody: (model: string, systemPrompt: string, userPrompt: string) => any;
  extractContent: (data: any) => string;
}

const AI_PROVIDERS: Record<AIProvider, AIConfig> = {
  lovable: {
    url: "https://ai.gateway.lovable.dev/v1/chat/completions",
    getHeaders: (apiKey) => ({
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    }),
    getBody: (model, systemPrompt, userPrompt) => ({
      model: model || "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
    extractContent: (data) => data.choices?.[0]?.message?.content || "",
  },
  openai: {
    url: "https://api.openai.com/v1/chat/completions",
    getHeaders: (apiKey) => ({
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    }),
    getBody: (model, systemPrompt, userPrompt) => ({
      model: model || "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
    extractContent: (data) => data.choices?.[0]?.message?.content || "",
  },
  anthropic: {
    url: "https://api.anthropic.com/v1/messages",
    getHeaders: (apiKey) => ({
      "x-api-key": apiKey,
      "Content-Type": "application/json",
      "anthropic-version": "2023-06-01",
    }),
    getBody: (model, systemPrompt, userPrompt) => ({
      model: model || "claude-sonnet-4-20250514",
      max_tokens: 8192,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    }),
    extractContent: (data) => data.content?.[0]?.text || "",
  },
};

// Map action to module key
const ACTION_TO_MODULE: Record<string, string> = {
  generate_script: "scripts",
  analyze_content: "content_detail",
  chat: "content_detail",
  improve_script: "scripts",
};

// Get module AI configuration with validation
async function getModuleAIConfig(supabase: any, organizationId: string, moduleKey: string) {
  const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
  
  // Check if module is active
  const { data: moduleData } = await supabase
    .from("organization_ai_modules")
    .select("is_active, provider, model")
    .eq("organization_id", organizationId)
    .eq("module_key", moduleKey)
    .maybeSingle();
  
  if (!moduleData?.is_active) {
    throw new Error(`MODULE_INACTIVE:${moduleKey}`);
  }
  
  let provider = moduleData?.provider || "lovable";
  let model = moduleData?.model || "google/gemini-2.5-flash";
  let apiKey: string | null = null;
  
  if (provider !== "lovable") {
    const { data: providerData } = await supabase
      .from("organization_ai_providers")
      .select("api_key_encrypted")
      .eq("organization_id", organizationId)
      .eq("provider_key", provider)
      .eq("is_enabled", true)
      .maybeSingle();
    
    if (providerData?.api_key_encrypted) {
      apiKey = providerData.api_key_encrypted;
    } else {
      // Fallback to lovable
      provider = "lovable";
      model = "google/gemini-2.5-flash";
    }
  }
  
  if (provider === "lovable") {
    apiKey = lovableApiKey || null;
  }
  
  if (!apiKey) {
    throw new Error("No hay API key configurada para el proveedor de IA");
  }
  
  return { provider: provider as AIProvider, model, apiKey };
}

// Log AI usage
async function logAIUsage(supabase: any, params: {
  organizationId: string;
  userId: string;
  provider: string;
  model: string;
  action: string;
  success: boolean;
  errorMessage?: string;
}) {
  try {
    await supabase.from("ai_usage_logs").insert({
      organization_id: params.organizationId,
      user_id: params.userId,
      provider: params.provider,
      model: params.model,
      module: "content",
      action: params.action,
      success: params.success,
      error_message: params.errorMessage,
    });
  } catch (e) {
    console.error("Failed to log AI usage:", e);
  }
}

// PROMPT MAESTRO - Sistema avanzado de generación de guiones con Prompt Engineering
const MASTER_SYSTEM_PROMPT = `🎯 ROL DEL SISTEMA

Actúa como un Prompt Engineer senior y estratega digital experto en UGC, performance ads y storytelling, encargado de construir prompts de alta precisión antes de generar cualquier guion.

Tu función principal es convertir la información del formulario en prompts claros, completos y alineados al objetivo del negocio.

📥 INPUT OBLIGATORIO (DESDE EL FORMULARIO)

Antes de generar cualquier prompt o guion, DEBES analizar y usar explícitamente los siguientes campos del formulario:

- CTA (Llamado a la acción)
- Ángulo de venta seleccionado
- Cantidad de hooks
- País objetivo
- Estructura narrativa
- Avatar / Cliente ideal
- Estrategias / estructuras de video
- Transcripción de video de referencia (si existe)
- Hooks sugeridos por el usuario (si existen)
- Instrucciones adicionales del usuario
- Documentos del producto (Brief, Onboarding, Research)

⚠️ REGLAS CRÍTICAS:
- NINGÚN CAMPO debe ser ignorado si tiene información
- Si un campo está vacío, NO lo inventes
- Todo el contenido generado debe ser COHERENTE entre sí
- Cada proyecto genera 1 SOLO GUION completo
- La cantidad de hooks debe respetar EXACTAMENTE el valor configurado

🎨 FORMATO VISUAL DEL RESULTADO (OBLIGATORIO):
- Devuelve SOLO HTML (sin Markdown, sin backticks, sin texto fuera de etiquetas)
- Usa HTML semántico: <h2>, <h3>, <h4>, <p>, <ul>, <li>, <strong>, <em>
- Usar <strong> para ideas clave y frases importantes
- Usar <em> para intención emocional o tono
- Usar <u> SOLO para CTAs o frases accionables
- Emojis: máximo 1–2 por bloque, solo como guía visual (🎯🔥🚀🎥)
- Espaciado amplio entre secciones (cada bloque debe ser claro)
- Párrafos cortos (máx. 2–3 líneas por bloque)

🚫 EVITAR:
- Markdown visible (##, **, \`\`\`)
- Bloques largos sin aire
- Texto genérico o repetitivo
- Lenguaje publicitario forzado`;

const SYSTEM_PROMPTS = {
  generate_script: MASTER_SYSTEM_PROMPT,
  
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

async function callAI(
  config: AIConfig,
  apiKey: string,
  model: string,
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  console.log(`[callAI] Starting request to: ${config.url}`);
  console.log(`[callAI] Model: ${model}`);
  console.log(`[callAI] System prompt length: ${systemPrompt.length}`);
  console.log(`[callAI] User prompt length: ${userPrompt.length}`);

  const requestBody = config.getBody(model, systemPrompt, userPrompt);
  console.log(`[callAI] Request body keys:`, Object.keys(requestBody));

  try {
    // Add timeout with AbortController (90 seconds)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.error(`[callAI] Request timeout after 90 seconds`);
      controller.abort();
    }, 90000);

    const response = await fetch(config.url, {
      method: "POST",
      headers: config.getHeaders(apiKey),
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    console.log(`[callAI] Response status: ${response.status}`);

    if (!response.ok) {
      if (response.status === 429) {
        console.error(`[callAI] Rate limit exceeded`);
        throw new Error("Rate limit exceeded - intenta de nuevo en unos segundos");
      }
      if (response.status === 402) {
        console.error(`[callAI] Payment required`);
        throw new Error("Créditos de IA agotados - contacta al administrador");
      }
      const errorText = await response.text();
      console.error(`[callAI] AI Error response:`, errorText);
      throw new Error(`Error de IA: ${response.status} - ${errorText.slice(0, 200)}`);
    }

    const data = await response.json();
    console.log(`[callAI] Response received, extracting content...`);
    
    const content = config.extractContent(data);
    
    if (!content) {
      console.error(`[callAI] Empty content in response:`, JSON.stringify(data).slice(0, 500));
      throw new Error("La IA no generó contenido. Intenta de nuevo.");
    }
    
    console.log(`[callAI] Content extracted successfully, length: ${content.length}`);
    return content;
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.error(`[callAI] Request was aborted due to timeout`);
      throw new Error("La solicitud tardó demasiado. Intenta con un prompt más corto.");
    }
    console.error(`[callAI] Error during AI call:`, error.message);
    throw error;
  }
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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

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

    // Get AI configuration (validates module is active)
    let aiConfig;
    try {
      aiConfig = await getModuleAIConfig(supabase, organizationId, moduleKey);
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

    const providerConfig = AI_PROVIDERS[aiConfig.provider];
    let result: string;

    switch (action) {
      case "generate_script": {
        if (prompt && product) {
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
          
          let masterPrompt = MASTER_SYSTEM_PROMPT;
          let formatRules = "";
          let criticalRules = "";
          let rolePrompt = "";
          
          if (customPrompts) {
            // Apply template variable replacements to custom prompts
            masterPrompt = replaceTemplateVariables(
              customPrompts.master_prompt || MASTER_SYSTEM_PROMPT,
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
          
          const fullSystemPrompt = customPrompts 
            ? `${masterPrompt}

${criticalRules}

${formatRules}

${rolePrompt}

${productContext}

IMPORTANTE:
- Analiza toda la información del producto proporcionada arriba
- La cantidad de hooks debe ser EXACTAMENTE la que se indica en el prompt del usuario
- Usa expresiones y modismos del país objetivo cuando sea apropiado
- El resultado debe ser HTML limpio, sin markdown, listo para renderizar`
            : `${MASTER_SYSTEM_PROMPT}

${rolePrompt}

${productContext}

IMPORTANTE:
- Analiza toda la información del producto proporcionada arriba
- La cantidad de hooks debe ser EXACTAMENTE la que se indica en el prompt del usuario
- Usa expresiones y modismos del país objetivo cuando sea apropiado
- El resultado debe ser HTML limpio, sin markdown, listo para renderizar`;

          console.log("[content-ai] Product context length:", productContext.length);
          console.log("[content-ai] Full system prompt length:", fullSystemPrompt.length);
          console.log("[content-ai] Template variables replaced in custom prompts");

          result = await callAI(providerConfig, aiConfig.apiKey, aiConfig.model, fullSystemPrompt, prompt);

          await logAIUsage(supabase, {
            organizationId,
            userId: "system",
            provider: aiConfig.provider,
            model: aiConfig.model,
            action: "generate_script",
            success: true
          });

          return new Response(
            JSON.stringify({ success: true, script: result, ai_provider: aiConfig.provider, ai_model: aiConfig.model }),
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

        result = await callAI(providerConfig, aiConfig.apiKey, aiConfig.model, SYSTEM_PROMPTS.generate_script, legacyPrompt);
        break;
      }

      case "analyze_content": {
        const analyzePrompt = `Analiza el siguiente contenido y proporciona feedback detallado:

${data?.script ? `GUION:\n${data.script}` : ""}
${data?.video_url ? `VIDEO URL: ${data.video_url}` : ""}

Proporciona un análisis completo con puntuación del 1-10 para cada aspecto y sugerencias específicas de mejora.`;

        result = await callAI(providerConfig, aiConfig.apiKey, aiConfig.model, SYSTEM_PROMPTS.analyze_content, analyzePrompt);
        break;
      }

      case "chat": {
        if (!data?.messages || data.messages.length === 0) {
          throw new Error("Messages are required for chat");
        }

        // For chat, build the full conversation
        const userMessage = data.messages[data.messages.length - 1]?.content || "";
        result = await callAI(providerConfig, aiConfig.apiKey, aiConfig.model, SYSTEM_PROMPTS.chat, userMessage);
        break;
      }

      case "improve_script": {
        const improvePrompt = `Mejora el siguiente guion basándote en el feedback proporcionado:

GUION ORIGINAL:
${data?.original_script || ""}

FEEDBACK:
${data?.feedback || "Hazlo más dinámico y atractivo"}

Devuelve el guion mejorado manteniendo el formato HTML estructurado.`;

        result = await callAI(providerConfig, aiConfig.apiKey, aiConfig.model, SYSTEM_PROMPTS.improve_script, improvePrompt);
        break;
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    await logAIUsage(supabase, {
      organizationId,
      userId: "system",
      provider: aiConfig.provider,
      model: aiConfig.model,
      action,
      success: true
    });

    return new Response(
      JSON.stringify({ success: true, result, ai_provider: aiConfig.provider, ai_model: aiConfig.model }),
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
