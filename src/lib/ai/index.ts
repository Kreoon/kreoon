/**
 * Módulo centralizado de IA - prompts, variables y utilidades.
 */

export * from "./types";
export * from "./variables";
export * from "./utils";
export * from "./prompts";
export {
  PLAN_AI_TOKENS,
  AI_TOKEN_COSTS,
  getTokenCost,
  getTokensForPlan,
} from "./tokenization";
export type { PlanKey, AIActionKey } from "./tokenization";
