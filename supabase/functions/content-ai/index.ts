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
  product?: any;
  script_params?: any;
  generation_type?: string;
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
          
          let masterPrompt = MASTER_SYSTEM_PROMPT;
          let formatRules = "";
          let criticalRules = "";
          let rolePrompt = "";
          
          if (customPrompts) {
            masterPrompt = customPrompts.master_prompt || MASTER_SYSTEM_PROMPT;
            formatRules = customPrompts.format_rules || "";
            criticalRules = customPrompts.critical_rules || "";
            rolePrompt = getGenerationTypePrompt(generation_type, customPrompts.role_prompts);
          } else {
            rolePrompt = getGenerationTypePrompt(generation_type);
          }
          
          const fullSystemPrompt = customPrompts 
            ? `${masterPrompt}

${criticalRules}

${formatRules}

${rolePrompt}

IMPORTANTE:
- Analiza toda la información del producto proporcionada
- La cantidad de hooks debe ser EXACTAMENTE la que se indica en el prompt del usuario
- Usa expresiones y modismos del país objetivo cuando sea apropiado
- El resultado debe ser HTML limpio, sin markdown, listo para renderizar`
            : `${MASTER_SYSTEM_PROMPT}

${rolePrompt}

IMPORTANTE:
- Analiza toda la información del producto proporcionada
- La cantidad de hooks debe ser EXACTAMENTE la que se indica en el prompt del usuario
- Usa expresiones y modismos del país objetivo cuando sea apropiado
- El resultado debe ser HTML limpio, sin markdown, listo para renderizar`;

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
