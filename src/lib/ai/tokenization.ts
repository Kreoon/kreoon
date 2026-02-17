/**
 * Sistema de tokenización de IA - control de uso por plan
 *
 * Delegates to the single source of truth: @/lib/finance/constants.ts
 * This file re-exports for backward compatibility.
 */

import {
  AI_TOKEN_COSTS as COSTS,
  AI_TOKEN_DEFAULT_COST,
  PLAN_AI_TOKENS as PLAN_TOKENS,
} from "@/lib/finance/constants";

/** Tokens incluidos por tipo de plan */
export const PLAN_AI_TOKENS = PLAN_TOKENS;

export type PlanKey = keyof typeof PLAN_AI_TOKENS;

/** Costo aproximado en tokens por acción de IA */
export const AI_TOKEN_COSTS = COSTS;

export type AIActionKey = keyof typeof AI_TOKEN_COSTS;

/**
 * Obtiene el costo en tokens para una acción
 */
export function getTokenCost(moduleKey: string, action: string): number {
  const key = `${moduleKey}.${action}` as AIActionKey;
  return AI_TOKEN_COSTS[key] ?? AI_TOKEN_DEFAULT_COST;
}

/**
 * Obtiene los tokens incluidos para un plan
 */
export function getTokensForPlan(planKey: PlanKey): number {
  return PLAN_AI_TOKENS[planKey] ?? 0;
}
