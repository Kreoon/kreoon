/**
 * AI Usage Logger - Sistema centralizado de logging de uso de IA
 *
 * Este módulo registra automáticamente todas las llamadas a proveedores de IA
 * incluyendo tokens, costos estimados y métricas de rendimiento.
 */

import { AI_PROVIDERS, resolveProvider } from "./ai-providers.ts";

// Costos estimados por 1K tokens (USD) - Actualizado marzo 2026
const TOKEN_COSTS: Record<string, { input: number; output: number }> = {
  // OpenAI
  "gpt-4o": { input: 0.0025, output: 0.01 },
  "gpt-4o-mini": { input: 0.00015, output: 0.0006 },
  "gpt-4-turbo": { input: 0.01, output: 0.03 },
  // Gemini
  "gemini-2.5-flash": { input: 0.000075, output: 0.0003 },
  "gemini-2.5-pro": { input: 0.00125, output: 0.005 },
  "gemini-1.5-flash": { input: 0.000075, output: 0.0003 },
  // Anthropic
  "claude-sonnet-4-20250514": { input: 0.003, output: 0.015 },
  "claude-3-5-sonnet": { input: 0.003, output: 0.015 },
  // Perplexity
  "llama-3.1-sonar-large-128k-online": { input: 0.001, output: 0.001 },
  "llama-3.1-sonar-small-128k-online": { input: 0.0002, output: 0.0002 },
  // FAL (imágenes - por imagen, no por token)
  "flux-pro": { input: 0, output: 0.05 }, // ~$0.05 por imagen
  "flux-2-pro-edit": { input: 0, output: 0.05 },
  "nano-banana-pro": { input: 0, output: 0.03 },
};

// Default cost para modelos no listados
const DEFAULT_COST = { input: 0.001, output: 0.002 };

export interface AIUsageLog {
  organization_id: string;
  user_id: string;
  module: string;
  action?: string;
  provider: string;
  model: string;
  tokens_input?: number;
  tokens_output?: number;
  estimated_cost?: number;
  success: boolean;
  error_message?: string;
  edge_function?: string;
  response_time_ms?: number;
}

export interface AICallResult<T = any> {
  content: T;
  provider: string;
  model: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  response_time_ms: number;
}

/**
 * Calcula el costo estimado basado en tokens y modelo
 */
export function calculateCost(model: string, tokensInput: number, tokensOutput: number): number {
  const costs = TOKEN_COSTS[model] || DEFAULT_COST;
  const inputCost = (tokensInput / 1000) * costs.input;
  const outputCost = (tokensOutput / 1000) * costs.output;
  return Math.round((inputCost + outputCost) * 1000000) / 1000000; // 6 decimales
}

/**
 * Extrae información de uso de la respuesta de la API
 */
function extractUsage(provider: string, data: any): { prompt_tokens: number; completion_tokens: number; total_tokens: number } | undefined {
  // OpenAI y Gemini (formato compatible)
  if (data.usage) {
    return {
      prompt_tokens: data.usage.prompt_tokens || 0,
      completion_tokens: data.usage.completion_tokens || 0,
      total_tokens: data.usage.total_tokens || 0,
    };
  }

  // Anthropic
  if (data.usage?.input_tokens !== undefined) {
    return {
      prompt_tokens: data.usage.input_tokens || 0,
      completion_tokens: data.usage.output_tokens || 0,
      total_tokens: (data.usage.input_tokens || 0) + (data.usage.output_tokens || 0),
    };
  }

  return undefined;
}

/**
 * Hace una llamada a la IA y retorna el resultado con métricas de uso
 */
export async function callAIWithUsage(
  provider: string,
  model: string,
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
  tools?: any[]
): Promise<AICallResult> {
  const startTime = Date.now();
  const resolvedProvider = resolveProvider(provider);
  const config = AI_PROVIDERS[resolvedProvider] || AI_PROVIDERS.gemini;

  const response = await fetch(config.url, {
    method: "POST",
    headers: config.getHeaders(apiKey),
    body: JSON.stringify(config.getBody(model, systemPrompt, userPrompt, tools)),
  });

  const response_time_ms = Date.now() - startTime;

  if (!response.ok) {
    const errorText = await response.text();
    const err: any = new Error(`AI API Error: ${response.status} ${errorText}`);
    err.status = response.status;
    err.details = errorText;
    throw err;
  }

  const data = await response.json();
  const content = config.extractContent(data, !!tools);
  const usage = extractUsage(resolvedProvider, data);

  return {
    content,
    provider: resolvedProvider,
    model,
    usage,
    response_time_ms,
  };
}

/**
 * Registra el uso de IA en la base de datos
 */
export async function logAIUsage(
  supabase: any,
  log: AIUsageLog
): Promise<string | null> {
  try {
    // Calcular costo si tenemos tokens
    let estimated_cost = log.estimated_cost;
    if (estimated_cost === undefined && log.tokens_input !== undefined && log.tokens_output !== undefined) {
      estimated_cost = calculateCost(log.model, log.tokens_input, log.tokens_output);
    }

    const { data, error } = await supabase
      .from("ai_usage_logs")
      .insert({
        organization_id: log.organization_id,
        user_id: log.user_id,
        module: log.module,
        action: log.action,
        provider: log.provider,
        model: log.model,
        tokens_input: log.tokens_input || null,
        tokens_output: log.tokens_output || null,
        estimated_cost: estimated_cost || null,
        success: log.success,
        error_message: log.error_message || null,
        edge_function: log.edge_function || null,
        response_time_ms: log.response_time_ms || null,
      })
      .select("id")
      .single();

    if (error) {
      console.error("[AI Logger] Error logging usage:", error);
      return null;
    }

    return data?.id || null;
  } catch (err) {
    console.error("[AI Logger] Exception:", err);
    return null;
  }
}

/**
 * Helper completo: Hace la llamada a IA y registra automáticamente el uso
 */
export async function callAndLogAI(
  supabase: any,
  config: {
    organizationId: string;
    userId: string;
    module: string;
    action?: string;
    edgeFunction?: string;
  },
  aiConfig: {
    provider: string;
    model: string;
    apiKey: string;
  },
  systemPrompt: string,
  userPrompt: string,
  tools?: any[]
): Promise<AICallResult & { logId: string | null }> {
  let result: AICallResult;
  let success = true;
  let errorMessage: string | undefined;

  try {
    result = await callAIWithUsage(
      aiConfig.provider,
      aiConfig.model,
      aiConfig.apiKey,
      systemPrompt,
      userPrompt,
      tools
    );
  } catch (err: any) {
    success = false;
    errorMessage = err.message || String(err);
    throw err;
  } finally {
    // Siempre intentar loguear, incluso si falló
    const logId = await logAIUsage(supabase, {
      organization_id: config.organizationId,
      user_id: config.userId,
      module: config.module,
      action: config.action,
      provider: aiConfig.provider,
      model: aiConfig.model,
      tokens_input: result!?.usage?.prompt_tokens,
      tokens_output: result!?.usage?.completion_tokens,
      success,
      error_message: errorMessage,
      edge_function: config.edgeFunction,
      response_time_ms: result!?.response_time_ms,
    });

    if (result!) {
      (result as any).logId = logId;
    }
  }

  return result! as AICallResult & { logId: string | null };
}

/**
 * Logger para servicios de imágenes (fal.ai, etc.)
 * Estos no usan tokens, pero sí tienen costo por imagen
 */
export async function logImageGeneration(
  supabase: any,
  config: {
    organizationId: string;
    userId: string;
    module: string;
    action?: string;
    provider: string;
    model: string;
    imageCount?: number;
    success: boolean;
    errorMessage?: string;
    edgeFunction?: string;
    responseTimeMs?: number;
  }
): Promise<string | null> {
  // Para imágenes, el "costo" se estima por imagen generada
  const imageCount = config.imageCount || 1;
  const costs = TOKEN_COSTS[config.model] || { input: 0, output: 0.05 };
  const estimated_cost = imageCount * costs.output;

  return logAIUsage(supabase, {
    organization_id: config.organizationId,
    user_id: config.userId,
    module: config.module,
    action: config.action,
    provider: config.provider,
    model: config.model,
    tokens_input: 0,
    tokens_output: imageCount, // Usamos output para contar imágenes
    estimated_cost,
    success: config.success,
    error_message: config.errorMessage,
    edge_function: config.edgeFunction,
    response_time_ms: config.responseTimeMs,
  });
}
