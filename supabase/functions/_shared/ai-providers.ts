/**
 * Configuración centralizada de proveedores de IA
 * NOTA: Este archivo elimina Lovable AI Gateway y usa APIs directas
 */

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export interface AIProviderConfig {
  url: string;
  getHeaders: (apiKey: string) => Record<string, string>;
  getBody: (model: string, systemPrompt: string, userPrompt: string, tools?: any[]) => any;
  extractContent: (data: any, hasTools?: boolean) => any;
}

// Proveedores de IA directos (sin Lovable Gateway)
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
    }
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
    }
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
    extractContent: (data: any) => data.content?.[0]?.text || ""
  }
};

// Mapeo de modelos Lovable a modelos directos
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

// Obtener API key según el proveedor
export function getAPIKey(provider: string): string | null {
  switch (provider) {
    case "gemini":
      return Deno.env.get("GOOGLE_AI_API_KEY") || null;
    case "openai":
      return Deno.env.get("OPENAI_API_KEY") || null;
    case "anthropic":
      return Deno.env.get("ANTHROPIC_API_KEY") || null;
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
