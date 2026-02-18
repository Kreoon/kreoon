/**
 * AI Token Gate — Wraps AI edge function calls with automatic token consumption.
 *
 * Usage:
 *   const data = await invokeAIWithTokens('board-ai', 'board.analyze_card', body, orgId);
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
 * Invoke an AI edge function with automatic token consumption.
 * Tokens are deducted BEFORE the AI call to prevent abuse.
 */
export async function invokeAIWithTokens<T = any>(
  functionName: string,
  actionType: string,
  body: Record<string, any>,
  organizationId?: string
): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('No autenticado');

  const headers = { Authorization: `Bearer ${session.access_token}` };

  // 1. Consume tokens (atomic check + deduction)
  const { data: consumeResult, error: consumeError } = await supabase.functions.invoke(
    'ai-tokens-service/consume',
    {
      body: {
        action_type: actionType,
        organization_id: organizationId,
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
      `Kreoon Coins insuficientes. Esta acción requiere ${cost} coins y tienes ${available} disponibles.`
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
 */
export async function canAffordAIAction(
  actionType: string,
  organizationId?: string
): Promise<{ canAfford: boolean; cost: number; available: number }> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { canAfford: false, cost: 0, available: 0 };

  const { data, error } = await supabase.functions.invoke(
    'ai-tokens-service/check-can-consume',
    {
      body: {
        action_type: actionType,
        organization_id: organizationId,
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
