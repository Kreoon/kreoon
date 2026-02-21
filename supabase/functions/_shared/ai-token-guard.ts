/**
 * Middleware de verificación y deducción de tokens de IA para Edge Functions.
 * Requiere supabase con service role para leer/escribir organization_ai_tokens.
 */

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Costo en tokens por acción de IA.
 * SYNC: src/lib/finance/constants.ts v2026.02.17
 * Estos valores deben coincidir con AI_TOKEN_COSTS del frontend.
 */
const AI_TOKEN_COSTS: Record<string, number> = {
  "research.full": 600,
  "dna.full_analysis": 500,
  "dna.project_analysis": 400,
  "scripts.generate": 120,
  "content.generate_script": 120,
  "research.phase": 100,
  "board.analyze_board": 100,
  "board.research_context": 150,
  "talent.suggest_creator": 120,
  "live.generate": 150,
  "board.analyze_card": 80,
  "talent.match": 60,
  "scripts.block.script": 25,
  "scripts.block.editor": 20,
  "scripts.block.trafficker": 20,
  "scripts.block.strategist": 20,
  "scripts.block.designer": 20,
  "scripts.block.admin": 15,
  "scripts.improve": 60,
  "content.improve_script": 60,
  "portfolio.bio": 50,
  "content.analyze": 40,
  "board.suggestions": 40,
  "board.prioritize": 40,
  "portfolio.caption": 25,
  "script_chat": 20,
  "transcription": 15,
};

export interface TokenCheckResult {
  allowed: boolean;
  reason?: "no_tokens" | "custom_api" | "has_tokens";
  tokensRemaining?: number;
  useCustomApi?: boolean;
  _debug?: string;
}

/**
 * Verifica tokens disponibles, deduce el costo y registra la transacción.
 * Si custom_api_enabled: retorna allowed sin deducir.
 * Si no hay tokens suficientes: retorna allowed: false.
 */
export async function checkAndDeductTokens(
  supabase: SupabaseClient,
  organizationId: string,
  action: string,
  estimatedCost?: number,
  metadata?: {
    ai_provider?: string;
    ai_model?: string;
    input_tokens?: number;
    output_tokens?: number;
    description?: string;
  }
): Promise<TokenCheckResult> {
  // 1. Obtener config de tokens de la org
  const { data: tokenData, error: fetchError } = await supabase
    .from("organization_ai_tokens")
    .select("*")
    .eq("organization_id", organizationId)
    .single();

  // Si no existe fila: permitir (org aún no en sistema de tokens = acceso ilimitado durante rollout)
  if (fetchError || !tokenData) {
    return {
      allowed: true,
      reason: "no_tokens",
      tokensRemaining: undefined,
    };
  }

  // 2. Si tiene API custom habilitada, bypass tokens
  if (tokenData.custom_api_enabled) {
    return {
      allowed: true,
      reason: "custom_api",
      useCustomApi: true,
    };
  }

  // 3. Calcular costo
  const cost = estimatedCost ?? AI_TOKEN_COSTS[action] ?? 40;

  // 4. Tokens disponibles (plan + purchased)
  const tokensRemaining = tokenData.tokens_remaining ?? 0;
  const purchasedTokens = tokenData.purchased_tokens ?? 0;
  const available = tokensRemaining + purchasedTokens;

  if (available < cost) {
    return {
      allowed: false,
      reason: "no_tokens",
      tokensRemaining: available,
    };
  }

  // 5. Deducir tokens (RPC atómica)
  const [moduleKey, actionName] = action.includes(".")
    ? action.split(".")
    : [action, "run"];

  const { data: deductResult, error: deductError } = await supabase.rpc(
    "deduct_ai_tokens",
    {
      p_org_id: organizationId,
      p_cost: cost,
      p_module_key: moduleKey,
      p_action: actionName,
      p_ai_provider: metadata?.ai_provider ?? null,
      p_ai_model: metadata?.ai_model ?? null,
      p_input_tokens: metadata?.input_tokens ?? null,
      p_output_tokens: metadata?.output_tokens ?? null,
      p_description: metadata?.description ?? null,
    }
  );

  if (deductError || !deductResult?.ok) {
    // Log para debug: RPC falló pese a tener tokens
    console.error("[ai-token-guard] deduct_ai_tokens failed:", {
      organizationId,
      cost,
      available,
      deductError: deductError?.message,
      deductResult,
    });
    return {
      allowed: false,
      reason: "no_tokens",
      tokensRemaining: available,
      _debug: deductError?.message || deductResult?.error,
    };
  }

  return {
    allowed: true,
    reason: "has_tokens",
    tokensRemaining:
      (deductResult.tokens_remaining as number) ?? available - cost,
  };
}

/** Headers CORS para respuestas de Edge Functions */
export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/**
 * Respuesta 402 para tokens insuficientes. Uso:
 * if (!tokenCheck.allowed) return insufficientTokensResponse(tokenCheck);
 */
export function insufficientTokensResponse(tokenCheck: TokenCheckResult): Response {
  return new Response(
    JSON.stringify({
      error: "insufficient_tokens",
      tokensRemaining: tokenCheck.tokensRemaining ?? 0,
      message:
        "No tienes tokens suficientes. Compra más o conecta tu propia API.",
      ...(tokenCheck._debug && { detail: tokenCheck._debug }),
    }),
    {
      status: 402,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
}

/**
 * Solo verifica tokens sin deducir. Útil para pre-checks en UI.
 */
export async function checkTokensOnly(
  supabase: SupabaseClient,
  organizationId: string,
  action: string,
  estimatedCost?: number
): Promise<TokenCheckResult> {
  const { data: tokenData, error } = await supabase
    .from("organization_ai_tokens")
    .select("custom_api_enabled, tokens_remaining, purchased_tokens")
    .eq("organization_id", organizationId)
    .single();

  if (error || !tokenData) {
    return {
      allowed: false,
      reason: "no_tokens",
      tokensRemaining: 0,
    };
  }

  if (tokenData.custom_api_enabled) {
    return {
      allowed: true,
      reason: "custom_api",
      useCustomApi: true,
    };
  }

  const cost = estimatedCost ?? AI_TOKEN_COSTS[action] ?? 40;
  const available = (tokenData.tokens_remaining ?? 0) + (tokenData.purchased_tokens ?? 0);

  if (available < cost) {
    return {
      allowed: false,
      reason: "no_tokens",
      tokensRemaining: available,
    };
  }

  return {
    allowed: true,
    reason: "has_tokens",
    tokensRemaining: available,
  };
}
