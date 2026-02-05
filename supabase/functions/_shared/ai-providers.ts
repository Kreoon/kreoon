/**
 * Configuración centralizada de proveedores de IA - Kreoon
 * Usa APIs directas de los proveedores de IA
 */

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

export type AIProviderKey = "gemini" | "openai" | "anthropic" | "perplexity" | "kreoon";

export interface AIMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AIProviderConfig {
  url: string;
  getHeaders: (apiKey: string) => Record<string, string>;
  getBody: (model: string, systemPrompt: string, userPrompt: string, tools?: any[]) => any;
  extractContent: (data: any, hasTools?: boolean) => any;
}

// Proveedores de IA directos
export const AI_PROVIDERS: Record<string, AIProviderConfig> = {
  gemini: {
    url: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
    getHeaders: (apiKey: string) => ({
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    }),
    getBody: (model: string, systemPrompt: string, userPrompt: string, tools?: any[]) => {
      const body: any = {
        model: model || "gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 4096,
        temperature: 0.7,
      };
      if (tools) {
        body.tools = tools;
        body.tool_choice = { type: "function", function: { name: tools[0].function.name } };
      }
      return body;
    },
    extractContent: (data: any, hasTools?: boolean) => {
      if (hasTools && data.choices?.[0]?.message?.tool_calls?.[0]) {
        return JSON.parse(data.choices[0].message.tool_calls[0].function.arguments);
      }
      return data.choices?.[0]?.message?.content || "";
    },
  },
  openai: {
    url: "https://api.openai.com/v1/chat/completions",
    getHeaders: (apiKey: string) => ({
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    }),
    getBody: (model: string, systemPrompt: string, userPrompt: string, tools?: any[]) => {
      const body: any = {
        model: model || "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 4096,
        temperature: 0.7,
      };
      if (tools) {
        body.tools = tools;
        body.tool_choice = { type: "function", function: { name: tools[0].function.name } };
      }
      return body;
    },
    extractContent: (data: any, hasTools?: boolean) => {
      if (hasTools && data.choices?.[0]?.message?.tool_calls?.[0]) {
        return JSON.parse(data.choices[0].message.tool_calls[0].function.arguments);
      }
      return data.choices?.[0]?.message?.content || "";
    },
  },
  anthropic: {
    url: "https://api.anthropic.com/v1/messages",
    getHeaders: (apiKey: string) => ({
      "x-api-key": apiKey,
      "Content-Type": "application/json",
      "anthropic-version": "2023-06-01",
    }),
    getBody: (model: string, systemPrompt: string, userPrompt: string) => ({
      model: model || "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    }),
    extractContent: (data: any) => data.content?.[0]?.text || "",
  },
  perplexity: {
    url: "https://api.perplexity.ai/chat/completions",
    getHeaders: (apiKey: string) => ({
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    }),
    getBody: (model: string, systemPrompt: string, userPrompt: string) => ({
      model: model || "llama-3.1-sonar-large-128k-online",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 4096,
      temperature: 0.2,
      return_citations: true,
    }),
    extractContent: (data: any) => data.choices?.[0]?.message?.content || "",
  },
  // Kreoon IA - usa Gemini por defecto (sin API key externa requerida)
  kreoon: {
    url: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
    getHeaders: (apiKey: string) => AI_PROVIDERS.gemini.getHeaders(apiKey),
    getBody: (model: string, systemPrompt: string, userPrompt: string, tools?: any[]) =>
      AI_PROVIDERS.gemini.getBody(model, systemPrompt, userPrompt, tools),
    extractContent: (data: any, hasTools?: boolean) => AI_PROVIDERS.gemini.extractContent(data, hasTools),
  },
};

/** Resuelve provider (kreoon -> gemini) */
export function resolveProvider(provider: string): string {
  if (provider === "kreoon") return "gemini";
  return provider;
}

/** Obtiene headers para un proveedor */
export function getHeaders(provider: string, apiKey: string): Record<string, string> {
  const p = resolveProvider(provider);
  const config = AI_PROVIDERS[p] || AI_PROVIDERS.gemini;
  return config.getHeaders(apiKey);
}

/** Obtiene body para un proveedor */
export function getBody(provider: string, model: string, systemPrompt: string, userPrompt: string, tools?: any[]): any {
  const p = resolveProvider(provider);
  const config = AI_PROVIDERS[p] || AI_PROVIDERS.gemini;
  return config.getBody(model, systemPrompt, userPrompt, tools);
}

/** Extrae contenido de la respuesta */
export function extractContent(provider: string, response: any, hasTools?: boolean): any {
  const p = resolveProvider(provider);
  const config = AI_PROVIDERS[p] || AI_PROVIDERS.gemini;
  return config.extractContent(response, hasTools);
}

// Mapeo de modelos a proveedores directos
export const MODEL_MAP: Record<string, { provider: string; model: string }> = {
  // Gemini models
  "google/gemini-2.5-flash": { provider: "gemini", model: "gemini-2.5-flash" },
  "google/gemini-2.5-pro": { provider: "gemini", model: "gemini-2.5-pro" },
  "google/gemini-2.5-flash-lite": { provider: "gemini", model: "gemini-2.5-flash-8b" },
  "google/gemini-2.5-flash-image-preview": { provider: "gemini", model: "gemini-2.0-flash-exp-image-generation" },
  "google/gemini-3-flash-preview": { provider: "gemini", model: "gemini-2.5-flash" },
  "google/gemini-3-pro-preview": { provider: "gemini", model: "gemini-2.5-pro" },
  // OpenAI models
  "openai/gpt-5": { provider: "openai", model: "gpt-4o" },
  "openai/gpt-5-mini": { provider: "openai", model: "gpt-4o-mini" },
  "openai/gpt-5-nano": { provider: "openai", model: "gpt-4o-mini" },
  "openai/gpt-5.2": { provider: "openai", model: "gpt-4o" },
  // Fallbacks
  "gpt-4o": { provider: "openai", model: "gpt-4o" },
  "gpt-4o-mini": { provider: "openai", model: "gpt-4o-mini" },
  "gemini-2.5-flash": { provider: "gemini", model: "gemini-2.5-flash" },
  "gemini-2.5-pro": { provider: "gemini", model: "gemini-2.5-pro" },
};

/** Llamada única a un proveedor de IA (con soporte para tools) */
export async function callAISingle(
  provider: string,
  model: string,
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
  tools?: any[]
): Promise<any> {
  const config = AI_PROVIDERS[resolveProvider(provider)] || AI_PROVIDERS.gemini;
  const response = await fetch(config.url, {
    method: "POST",
    headers: config.getHeaders(apiKey),
    body: JSON.stringify(config.getBody(model, systemPrompt, userPrompt, tools)),
  });

  if (!response.ok) {
    const errorText = await response.text();
    const err: any = new Error(`AI API Error: ${response.status} ${errorText}`);
    err.status = response.status;
    err.details = errorText;
    throw err;
  }

  const data = await response.json();
  return config.extractContent(data, !!tools);
}

/** Llamada con fallback automático a otros proveedores.
 * Si un proveedor devuelve 429 (rate limit) o 402 (créditos), prueba con el siguiente.
 */
export async function callAIWithFallback(
  configs: Array<{ provider: string; model: string; apiKey: string }>,
  systemPrompt: string,
  userPrompt: string,
  tools?: any[]
): Promise<{ result: any; usedProvider: string; usedModel: string }> {
  const errors: string[] = [];
  let lastError: any = null;

  for (const cfg of configs) {
    try {
      const result = await callAISingle(
        cfg.provider,
        cfg.model,
        cfg.apiKey,
        systemPrompt,
        userPrompt,
        tools
      );
      return { result, usedProvider: cfg.provider, usedModel: cfg.model };
    } catch (err: any) {
      lastError = err;
      errors.push(`${cfg.provider}: ${err.message}`);
      const status = err?.status;
      if (status === 429 || status === 402) {
        console.warn(`[AI] ${cfg.provider} ${status === 429 ? "rate limit" : "créditos agotados"}, probando siguiente...`);
      }
      continue;
    }
  }

  const finalError = new Error(`Todos los proveedores de IA fallaron: ${errors.join("; ")}`) as any;
  if (lastError?.status) finalError.status = lastError.status;
  throw finalError;
}

/**
 * Función unificada para hacer requests a la IA (sin tools).
 * Usa AI_PROVIDERS existente para compatibilidad con el resto del código.
 */
export async function makeAIRequest(config: {
  provider: string;
  model: string;
  apiKey: string;
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
  maxTokens?: number;
}): Promise<{ success: boolean; content?: string; error?: string }> {
  const { provider, model, apiKey, systemPrompt, userPrompt, temperature = 0.7, maxTokens = 4096 } = config;

  try {
    const prov = AI_PROVIDERS[provider] || AI_PROVIDERS.gemini;
    const baseBody = prov.getBody(model, systemPrompt, userPrompt);
    const body = { ...baseBody, temperature, max_tokens: maxTokens };

    const response = await fetch(prov.url, {
      method: "POST",
      headers: prov.getHeaders(apiKey),
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { success: false, error: `${response.status}: ${errorText}` };
    }

    const data = await response.json();
    const content = prov.extractContent(data, false);
    return { success: true, content: typeof content === "string" ? content : String(content ?? "") };
  } catch (err: any) {
    return { success: false, error: err?.message ?? String(err) };
  }
}

// Obtener API key según el proveedor
export function getAPIKey(provider: string): string | null {
  const p = resolveProvider(provider);
  switch (p) {
    case "gemini":
      return Deno.env.get("GOOGLE_AI_API_KEY") || null;
    case "openai":
      return Deno.env.get("OPENAI_API_KEY") || null;
    case "anthropic":
      return Deno.env.get("ANTHROPIC_API_KEY") || null;
    case "perplexity":
      return Deno.env.get("PERPLEXITY_API_KEY") || null;
    default:
      return null;
  }
}

// Resolver modelo a proveedor y modelo real
export function resolveModel(model: string): { provider: string; model: string; apiKey: string | null } {
  const mapped = MODEL_MAP[model];
  if (mapped) {
    return {
      provider: mapped.provider,
      model: mapped.model,
      apiKey: getAPIKey(mapped.provider)
    };
  }
  
  // Default to Gemini
  return {
    provider: "gemini",
    model: "gemini-2.5-flash",
    apiKey: getAPIKey("gemini")
  };
}

// Función para hacer llamadas a la IA con fallback automático
export async function callAI(
  systemPrompt: string,
  userPrompt: string,
  options?: {
    model?: string;
    provider?: string;
    tools?: any[];
    temperature?: number;
  }
): Promise<{ content: any; provider: string; model: string }> {
  const { model = "gemini-2.5-flash", provider: preferredProvider, tools } = options || {};
  
  // Determinar proveedor y modelo
  let resolvedProvider = preferredProvider || "gemini";
  let resolvedModel = model;
  let apiKey = getAPIKey(resolvedProvider);
  
  // Si el modelo está mapeado, usar esa configuración
  const mapped = MODEL_MAP[model];
  if (mapped) {
    resolvedProvider = mapped.provider;
    resolvedModel = mapped.model;
    apiKey = getAPIKey(resolvedProvider);
  }
  
  // Fallback chain: Gemini -> OpenAI
  const providers = [
    { provider: resolvedProvider, model: resolvedModel, apiKey },
    { provider: "gemini", model: "gemini-2.5-flash", apiKey: getAPIKey("gemini") },
    { provider: "openai", model: "gpt-4o-mini", apiKey: getAPIKey("openai") },
  ].filter((p, i, arr) => 
    p.apiKey && arr.findIndex(x => x.provider === p.provider) === i
  );
  
  if (providers.length === 0) {
    throw new Error("No hay proveedores de IA configurados. Configura GOOGLE_AI_API_KEY o OPENAI_API_KEY");
  }
  
  let lastError: Error | null = null;
  
  for (const { provider, model: currentModel, apiKey: key } of providers) {
    if (!key) continue;
    
    const config = AI_PROVIDERS[provider];
    if (!config) continue;
    
    try {
      console.log(`[AI] Intentando con ${provider}/${currentModel}`);
      
      const response = await fetch(config.url, {
        method: "POST",
        headers: config.getHeaders(key),
        body: JSON.stringify(config.getBody(currentModel, systemPrompt, userPrompt, tools)),
      });
      
      if (!response.ok) {
        if (response.status === 429) {
          console.warn(`[AI] Rate limit en ${provider}, probando siguiente...`);
          continue;
        }
        if (response.status === 402) {
          throw new Error("Créditos de IA agotados. Verifica tu cuenta.");
        }
        const errorText = await response.text();
        console.error(`[AI] Error ${provider}:`, response.status, errorText);
        lastError = new Error(`Error ${provider}: ${response.status}`);
        continue;
      }
      
      const data = await response.json();
      const content = config.extractContent(data, !!tools);
      
      console.log(`[AI] Éxito con ${provider}/${currentModel}`);
      return { content, provider, model: currentModel };
    } catch (err) {
      console.error(`[AI] Error con ${provider}:`, err);
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }
  
  throw lastError || new Error("Todos los proveedores de IA fallaron");
}

// Función específica para generación de imágenes con Gemini
export async function callGeminiImage(
  prompt: string,
  options?: { aspectRatio?: string; width?: number; height?: number }
): Promise<string | null> {
  const apiKey = getAPIKey("gemini");
  if (!apiKey) {
    throw new Error("GOOGLE_AI_API_KEY no configurada");
  }
  
  const response = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gemini-2.0-flash-exp-image-generation",
      messages: [{ role: "user", content: prompt }],
      modalities: ["image", "text"],
    }),
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error("[AI Image] Error:", response.status, errorText);
    throw new Error(`Error generando imagen: ${response.status}`);
  }
  
  const data = await response.json();
  return data.choices?.[0]?.message?.images?.[0]?.image_url?.url || null;
}
