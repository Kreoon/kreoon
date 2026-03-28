/**
 * AI Token Gate — Wraps AI edge function calls with automatic token consumption.
 *
 * Usage:
 *   // Tokens personales (por defecto)
 *   const data = await invokeAIWithTokens('board-ai', 'board.analyze_card', body);
 *
 *   // Tokens de la org (para acciones de clientes)
 *   const data = await invokeAIWithTokens('dna-ai', 'dna.full_analysis', body, {
 *     clientId: client.id,
 *     organizationId: orgId
 *   });
 *
 * Flow:
 *   1. Consume tokens via ai-tokens-service/consume (atomic deduction)
 *   2. If insufficient tokens → throws with user-friendly message
 *   3. If tokens OK → calls the AI edge function
 *   4. Returns the AI function response
 */

import { supabase } from '@/integrations/supabase/client';
import { AI_TOKEN_COSTS, AI_TOKEN_DEFAULT_COST } from '@/lib/finance/constants';

type AIActionKey = keyof typeof AI_TOKEN_COSTS;

/**
 * Contexto para determinar de qué balance consumir tokens.
 * - Si hay clientId → usa tokens de la organización
 * - Si no hay clientId → usa tokens personales del usuario
 */
interface TokenContext {
  /** ID del cliente (si la acción es en contexto de cliente → usa tokens de org) */
  clientId?: string;
  /** ID de la organización (requerido si clientId está presente) */
  organizationId?: string;
}

/**
 * Invoke an AI edge function with automatic token consumption.
 * Tokens are deducted BEFORE the AI call to prevent abuse.
 *
 * @param functionName - Nombre de la edge function a invocar
 * @param actionType - Tipo de acción (ej: 'dna.full_analysis', 'scripts.generate')
 * @param body - Body de la request
 * @param context - Contexto opcional: si hay clientId, usa tokens de la org
 */
export async function invokeAIWithTokens<T = any>(
  functionName: string,
  actionType: string,
  body: Record<string, any>,
  context?: TokenContext | string // string para backwards compatibility (organizationId)
): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('No autenticado');

  const headers = { Authorization: `Bearer ${session.access_token}` };

  // Determinar el organizationId para el consumo de tokens
  // - Si context es string → backwards compatibility, usar como organizationId
  // - Si context tiene clientId → usar organizationId del context (tokens de org)
  // - Si no hay context o no hay clientId → null (tokens personales)
  let tokenOrgId: string | undefined;
  if (typeof context === 'string') {
    // Backwards compatibility: context es directamente el organizationId
    tokenOrgId = context;
  } else if (context?.clientId && context?.organizationId) {
    // Acción en contexto de cliente → usar tokens de la org
    tokenOrgId = context.organizationId;
  }
  // Si no hay clientId → tokenOrgId queda undefined → tokens personales

  // 1. Consume tokens (atomic check + deduction)
  const { data: consumeResult, error: consumeError } = await supabase.functions.invoke(
    'ai-tokens-service/consume',
    {
      body: {
        action_type: actionType,
        organization_id: tokenOrgId,
      },
      headers,
    }
  );

  if (consumeError) {
    console.warn('Token consumption error:', consumeError.message);
    // Don't block AI if token service is down — graceful degradation
  } else if (consumeResult && !consumeResult.success) {
    const cost = AI_TOKEN_COSTS[actionType as AIActionKey] || AI_TOKEN_DEFAULT_COST;
    const available = consumeResult.available ?? 0;
    throw new Error(
      `Tokens IA insuficientes. Esta acción requiere ${cost} tokens y tienes ${available} disponibles.`
    );
  }

  // 2. Call the AI edge function
  const { data, error } = await supabase.functions.invoke(functionName, {
    body,
    headers,
  });

  if (error) throw error;
  return data as T;
}

/**
 * Check if user has enough tokens for an action without consuming.
 *
 * @param actionType - Tipo de acción
 * @param context - Contexto opcional: si hay clientId, verifica tokens de la org
 */
export async function canAffordAIAction(
  actionType: string,
  context?: TokenContext | string // string para backwards compatibility
): Promise<{ canAfford: boolean; cost: number; available: number }> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { canAfford: false, cost: 0, available: 0 };

  // Determinar organizationId (misma lógica que invokeAIWithTokens)
  let tokenOrgId: string | undefined;
  if (typeof context === 'string') {
    tokenOrgId = context;
  } else if (context?.clientId && context?.organizationId) {
    tokenOrgId = context.organizationId;
  }

  const { data, error } = await supabase.functions.invoke(
    'ai-tokens-service/check-can-consume',
    {
      body: {
        action_type: actionType,
        organization_id: tokenOrgId,
      },
      headers: { Authorization: `Bearer ${session.access_token}` },
    }
  );

  if (error || !data) {
    return { canAfford: true, cost: 0, available: 0 }; // Graceful: allow if check fails
  }

  return {
    canAfford: data.can_consume ?? true,
    cost: data.cost ?? 0,
    available: data.available ?? 0,
  };
}

/**
 * Get the token cost for an action type.
 */
export function getActionCost(actionType: string): number {
  return AI_TOKEN_COSTS[actionType as AIActionKey] || AI_TOKEN_DEFAULT_COST;
}
