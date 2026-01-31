import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getKreoonClient, isKreoonConfigured } from "../_shared/kreoon-client.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ContentAIRequest {
  action: "generate_script" | "analyze_content" | "chat" | "improve_script" | "research_and_generate";
  organizationId: string;
  ai_provider?: "gemini" | "openai" | "anthropic";
  ai_model?: string;
  use_perplexity?: boolean; // Enable pre-research with Perplexity
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

// AI Provider configurations - Direct APIs only (no Lovable Gateway)
type AIProvider = "gemini" | "openai" | "anthropic";

interface AIConfig {
  url: string;
  getHeaders: (apiKey: string) => Record<string, string>;
  getBody: (model: string, systemPrompt: string, userPrompt: string) => any;
  extractContent: (data: any) => string;
}

const AI_PROVIDERS: Record<AIProvider, AIConfig> = {
  gemini: {
    url: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
    getHeaders: (apiKey) => ({
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    }),
    getBody: (model, systemPrompt, userPrompt) => ({
      model: model || "gemini-2.5-flash",
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

// Map of model names to their provider
const MODEL_PROVIDER_MAP: Record<string, AIProvider> = {
  // Gemini models
  "gemini-2.5-flash": "gemini",
  "gemini-2.5-pro": "gemini",
  "gemini-2.0-flash": "gemini",
  // OpenAI models  
  "gpt-4o": "openai",
  "gpt-4o-mini": "openai",
  "gpt-4-turbo": "openai",
  // Legacy mappings (from Lovable naming)
  "google/gemini-2.5-flash": "gemini",
  "google/gemini-2.5-pro": "gemini",
  "google/gemini-3-flash-preview": "gemini",
  "openai/gpt-5": "openai",
  "openai/gpt-5-mini": "openai",
};

// Get the actual model name for the provider
function normalizeModelName(model: string): string {
  // Strip provider prefix if present
  if (model.startsWith("google/")) {
    const stripped = model.replace("google/", "");
    if (stripped === "gemini-3-flash-preview") return "gemini-2.5-flash";
    return stripped;
  }
  if (model.startsWith("openai/")) {
    const stripped = model.replace("openai/", "");
    if (stripped === "gpt-5") return "gpt-4o";
    if (stripped === "gpt-5-mini") return "gpt-4o-mini";
    return stripped;
  }
  return model;
}

// Map action to module key
const ACTION_TO_MODULE: Record<string, string> = {
  generate_script: "scripts",
  analyze_content: "content_detail",
  chat: "content_detail",
  improve_script: "scripts",
};

// Get module AI configuration with validation and fallback chain
// IMPORTANT: This function now allows bypass when module config is not accessible
async function getModuleAIConfig(supabase: any, organizationId: string, moduleKey: string, requestedModel?: string): Promise<{
  provider: AIProvider;
  model: string;
  apiKey: string;
  fallbackProvider: AIProvider | null;
  fallbackModel: string | null;
  fallbackApiKey: string | null;
}> {
  const googleApiKey = Deno.env.get("GOOGLE_AI_API_KEY");
  const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
  
  let configuredProvider: AIProvider = "gemini";
  let configuredModel = requestedModel || "gemini-2.5-flash";
  
  // Try to check if module is active (but don't fail if we can't access it)
  try {
    const { data: moduleData, error: moduleError } = await supabase
      .from("organization_ai_modules")
      .select("is_active, provider, model")
      .eq("organization_id", organizationId)
      .eq("module_key", moduleKey)
      .maybeSingle();
    
    // Only enforce module check if we successfully queried the table
    if (!moduleError && moduleData !== null) {
      if (!moduleData.is_active) {
        throw new Error(`MODULE_INACTIVE:${moduleKey}`);
      }
      configuredProvider = (moduleData.provider || "gemini") as AIProvider;
      configuredModel = moduleData.model || configuredModel;
    } else {
      // Can't access module config - use defaults with API keys
      console.log(`[content-ai] Could not access module config for ${moduleKey}, using defaults`);
    }
  } catch (checkError: any) {
    // If error is MODULE_INACTIVE, re-throw it
    if (checkError?.message?.includes("MODULE_INACTIVE")) {
      throw checkError;
    }
    // Otherwise, proceed with defaults
    console.log(`[content-ai] Module check failed: ${checkError?.message}, proceeding with defaults`);
  }
  
  // Normalize provider name (convert "lovable" to "gemini")
  if (configuredProvider === "lovable" as any) {
    configuredProvider = "gemini";
  }
  
  // Normalize model name
  configuredModel = normalizeModelName(configuredModel);
  
  // Determine provider from model if not already set
  const modelProvider = MODEL_PROVIDER_MAP[configuredModel] || MODEL_PROVIDER_MAP[requestedModel || ""];
  if (modelProvider) {
    configuredProvider = modelProvider;
  }
  
  // Check for organization-specific API keys first (optional - don't fail)
  try {
    if (configuredProvider !== "gemini" && configuredProvider !== "openai") {
      const { data: providerData } = await supabase
        .from("organization_ai_providers")
        .select("api_key_encrypted")
        .eq("organization_id", organizationId)
        .eq("provider_key", configuredProvider)
        .eq("is_enabled", true)
        .maybeSingle();
      
      if (providerData?.api_key_encrypted) {
        const fallbackProv: AIProvider | null = googleApiKey ? "gemini" : (openaiApiKey ? "openai" : null);
        return { 
          provider: configuredProvider, 
          model: configuredModel, 
          apiKey: providerData.api_key_encrypted,
          fallbackProvider: fallbackProv,
          fallbackModel: fallbackProv === "gemini" ? "gemini-2.5-flash" : (fallbackProv === "openai" ? "gpt-4o-mini" : null),
          fallbackApiKey: googleApiKey || openaiApiKey || null
        };
      }
    }
  } catch (provError) {
    console.log(`[content-ai] Could not check org providers: ${provError}`);
  }
  
  // Build fallback chain: Gemini -> OpenAI
  const providers: Array<{ provider: AIProvider; model: string; apiKey: string }> = [];
  
  if (googleApiKey) {
    providers.push({ 
      provider: "gemini", 
      model: configuredProvider === "gemini" ? configuredModel : "gemini-2.5-flash", 
      apiKey: googleApiKey 
    });
  }
  
  if (openaiApiKey) {
    providers.push({ 
      provider: "openai", 
      model: configuredProvider === "openai" ? configuredModel : "gpt-4o-mini", 
      apiKey: openaiApiKey 
    });
  }
  
  if (providers.length === 0) {
    throw new Error("No hay API keys configuradas. Configura GOOGLE_AI_API_KEY o OPENAI_API_KEY");
  }
  
  // Return primary with fallback info
  const primary = providers[0];
  const fallback = providers[1] || null;
  
  return { 
    provider: primary.provider, 
    model: primary.model, 
    apiKey: primary.apiKey,
    fallbackProvider: fallback?.provider || null,
    fallbackModel: fallback?.model || null,
    fallbackApiKey: fallback?.apiKey || null
  };
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

// ============= PERPLEXITY PRE-RESEARCH =============
async function runPerplexityResearch(
  productName: string,
  productDescription: string,
  salesAngle: string,
  targetCountry: string
): Promise<{ success: boolean; research?: string; error?: string }> {
  const perplexityApiKey = Deno.env.get('PERPLEXITY_API_KEY');
  
  if (!perplexityApiKey) {
    console.log("[Perplexity] No API key configured, skipping research");
    return { success: false, error: "Perplexity API key not configured" };
  }
  
  const prompt = `Investiga información actualizada sobre "${productName}" para crear contenido publicitario:

PRODUCTO: ${productName}
DESCRIPCIÓN: ${productDescription || 'No disponible'}
ÁNGULO DE VENTA: ${salesAngle || 'General'}
PAÍS OBJETIVO: ${targetCountry || 'Latinoamérica'}

NECESITO:
1. Tendencias actuales del mercado relacionadas
2. Estadísticas o datos recientes que respalden el ángulo de venta
3. Puntos de dolor comunes de la audiencia objetivo
4. Frases o expresiones populares en ${targetCountry || 'el mercado latino'}
5. Competidores principales y cómo se diferencian

Responde de forma concisa y directa, máximo 500 palabras.`;

  try {
    console.log("[Perplexity] Starting research for:", productName);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout
    
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${perplexityApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar',
        max_tokens: 1500,
        temperature: 0.2,
        messages: [
          { role: 'system', content: 'Eres un investigador de mercado experto. Responde en español con datos actuales y verificables.' },
          { role: 'user', content: prompt }
        ],
      }),
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Perplexity] API error:", response.status, errorText);
      return { success: false, error: `Perplexity error: ${response.status}` };
    }
    
    const data = await response.json();
    const research = data.choices?.[0]?.message?.content || "";
    
    console.log("[Perplexity] Research completed, length:", research.length);
    
    return { success: true, research };
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.error("[Perplexity] Request timeout");
      return { success: false, error: "Research timeout" };
    }
    console.error("[Perplexity] Error:", error.message);
    return { success: false, error: error.message };
  }
}

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

// Fallback between Gemini and OpenAI when one fails
async function callWithFallback(
  primaryConfig: AIConfig,
  primaryApiKey: string,
  primaryModel: string,
  systemPrompt: string,
  userPrompt: string,
  fallbackProvider?: AIProvider | null,
  fallbackApiKey?: string | null,
  fallbackModel?: string | null
): Promise<{ content: string; usedFallback: boolean; provider: string }> {
  
  // Try primary provider first
  try {
    const content = await callAISingle(primaryConfig, primaryApiKey, primaryModel, systemPrompt, userPrompt);
    return { content, usedFallback: false, provider: Object.keys(AI_PROVIDERS).find(k => AI_PROVIDERS[k as AIProvider] === primaryConfig) || "unknown" };
  } catch (error: any) {
    console.warn(`[callAI] Primary provider failed: ${error.message}`);
    
    // If fallback available, try it
    if (fallbackProvider && fallbackApiKey && AI_PROVIDERS[fallbackProvider]) {
      console.log(`[callAI] Attempting fallback to ${fallbackProvider}...`);
      try {
        const content = await callAISingle(
          AI_PROVIDERS[fallbackProvider], 
          fallbackApiKey, 
          fallbackModel || (fallbackProvider === "gemini" ? "gemini-2.5-flash" : "gpt-4o-mini"), 
          systemPrompt, 
          userPrompt
        );
        console.log(`[callAI] Fallback to ${fallbackProvider} successful`);
        return { content, usedFallback: true, provider: fallbackProvider };
      } catch (fallbackError: any) {
        console.error(`[callAI] Fallback to ${fallbackProvider} also failed:`, fallbackError.message);
        throw fallbackError;
      }
    }
    
    throw error;
  }
}

async function callAISingle(
  config: AIConfig,
  apiKey: string,
  model: string,
  systemPrompt: string,
  userPrompt: string,
  maxRetries: number = 2
): Promise<string> {
  console.log(`[callAI] Request to: ${config.url}, Model: ${model}`);

  const requestBody = config.getBody(model, systemPrompt, userPrompt);
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[callAI] Attempt ${attempt}/${maxRetries}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 90000);

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
          console.error(`[callAI] Rate limit (attempt ${attempt}/${maxRetries})`);
          if (attempt < maxRetries) {
            const waitTime = Math.pow(2, attempt) * 1000 + Math.random() * 500;
            console.log(`[callAI] Waiting ${Math.round(waitTime)}ms...`);
            await sleep(waitTime);
            continue;
          }
          throw new Error("Rate limit - intenta de nuevo en unos segundos");
        }
        if (response.status === 402) {
          throw new Error("Créditos de IA agotados - contacta al administrador");
        }
        const errorText = await response.text();
        throw new Error(`Error IA: ${response.status}`);
      }

      const data = await response.json();
      const content = config.extractContent(data);
      
      if (!content) {
        throw new Error("La IA no generó contenido");
      }
      
      console.log(`[callAI] Success, content length: ${content.length}`);
      return content;
    } catch (error: any) {
      lastError = error;
      if (error.name === 'AbortError') {
        throw new Error("Timeout - intenta con un prompt más corto");
      }
      if (!error.message?.includes('Rate limit')) {
        throw error;
      }
    }
  }
  
  throw lastError || new Error("Error de IA después de varios intentos");
}

async function callAI(
  config: AIConfig,
  apiKey: string,
  model: string,
  systemPrompt: string,
  userPrompt: string,
  fallbackProvider?: AIProvider | null,
  fallbackApiKey?: string | null,
  fallbackModel?: string | null
): Promise<string> {
  const { content } = await callWithFallback(config, apiKey, model, systemPrompt, userPrompt, fallbackProvider, fallbackApiKey, fallbackModel);
  return content;
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

    // Get AI configuration (validates module is active)
    // Pass requested model from body for fallback if module config is not accessible
    let aiConfig;
    try {
      aiConfig = await getModuleAIConfig(supabase, organizationId, moduleKey, body.ai_model);
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
      case "research_and_generate":
      case "generate_script": {
        if (prompt && product) {
          // Check if Perplexity research is requested
          const usePerplexity = body.use_perplexity === true;
          let perplexityResearch = "";
          
          if (usePerplexity) {
            console.log("[content-ai] Running Perplexity pre-research...");
            const researchResult = await runPerplexityResearch(
              product.name || "",
              product.description || "",
              body.script_params?.sales_angle || "",
              body.script_params?.target_country || "México"
            );
            
            if (researchResult.success && researchResult.research) {
              perplexityResearch = `
📊 INVESTIGACIÓN DE MERCADO EN TIEMPO REAL (Perplexity):
${researchResult.research}

⚠️ USA ESTA INFORMACIÓN para hacer el contenido más relevante y actual.
`;
              console.log("[content-ai] Perplexity research added, length:", perplexityResearch.length);
            } else {
              console.log("[content-ai] Perplexity research skipped:", researchResult.error);
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
            : `${MASTER_SYSTEM_PROMPT}

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

          result = await callAI(providerConfig, aiConfig.apiKey, aiConfig.model, fullSystemPrompt, prompt, aiConfig.fallbackProvider, aiConfig.fallbackApiKey, aiConfig.fallbackModel);

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

        result = await callAI(providerConfig, aiConfig.apiKey, aiConfig.model, SYSTEM_PROMPTS.generate_script, legacyPrompt, aiConfig.fallbackProvider, aiConfig.fallbackApiKey, aiConfig.fallbackModel);
        break;
      }

      case "analyze_content": {
        const analyzePrompt = `Analiza el siguiente contenido y proporciona feedback detallado:

${data?.script ? `GUION:\n${data.script}` : ""}
${data?.video_url ? `VIDEO URL: ${data.video_url}` : ""}

Proporciona un análisis completo con puntuación del 1-10 para cada aspecto y sugerencias específicas de mejora.`;

        result = await callAI(providerConfig, aiConfig.apiKey, aiConfig.model, SYSTEM_PROMPTS.analyze_content, analyzePrompt, aiConfig.fallbackProvider, aiConfig.fallbackApiKey, aiConfig.fallbackModel);
        break;
      }

      case "chat": {
        if (!data?.messages || data.messages.length === 0) {
          throw new Error("Messages are required for chat");
        }

        // For chat, build the full conversation
        const userMessage = data.messages[data.messages.length - 1]?.content || "";
        result = await callAI(providerConfig, aiConfig.apiKey, aiConfig.model, SYSTEM_PROMPTS.chat, userMessage, aiConfig.fallbackProvider, aiConfig.fallbackApiKey, aiConfig.fallbackModel);
        break;
      }

      case "improve_script": {
        const improvePrompt = `Mejora el siguiente guion basándote en el feedback proporcionado:

GUION ORIGINAL:
${data?.original_script || ""}

FEEDBACK:
${data?.feedback || "Hazlo más dinámico y atractivo"}

Devuelve el guion mejorado manteniendo el formato HTML estructurado.`;

        result = await callAI(providerConfig, aiConfig.apiKey, aiConfig.model, SYSTEM_PROMPTS.improve_script, improvePrompt, aiConfig.fallbackProvider, aiConfig.fallbackApiKey, aiConfig.fallbackModel);
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
