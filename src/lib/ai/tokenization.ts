/**
 * Sistema de tokenización de IA - control de uso por plan
 */

/** Tokens incluidos por tipo de plan */
export const PLAN_AI_TOKENS = {
  // Marcas
  marcas_free: 0, // Explorar: sin campañas ni contactos
  starter: 3000, // $29/mes: 5 campañas, 10 contactos
  pro: 6000,
  business: 24000,

  // Creadores
  creator_free: 1500, // Free
  creator_pro: 3600,

  // Agencias
  agency_starter: 12000,
  agency_pro: 36000,
  agency_enterprise: 120000, // o ilimitado con custom API
} as const;

export type PlanKey = keyof typeof PLAN_AI_TOKENS;

/** Costo aproximado en tokens por acción de IA */
export const AI_TOKEN_COSTS = {
  "scripts.generate": 100,
  "scripts.improve": 50,
  "research.full": 500,
  "research.phase": 80,
  "board.suggestions": 30,
  "board.prioritize": 40,
  "board.analyze_card": 60,
  "board.analyze_board": 100,
  "board.research_context": 150,
  "talent.match": 60,
  "talent.suggest_creator": 120,
  "live.generate": 150,
  "portfolio.bio": 40,
  "portfolio.caption": 25,
  "content.generate_script": 100,
  "content.improve_script": 50,
  "content.analyze": 40,
  "script_chat": 30,
} as const;

export type AIActionKey = keyof typeof AI_TOKEN_COSTS;

/**
 * Obtiene el costo en tokens para una acción
 */
export function getTokenCost(moduleKey: string, action: string): number {
  const key = `${moduleKey}.${action}` as AIActionKey;
  return AI_TOKEN_COSTS[key] ?? 40; // default 40 si no está definido
}

/**
 * Obtiene los tokens incluidos para un plan
 */
export function getTokensForPlan(planKey: PlanKey): number {
  return PLAN_AI_TOKENS[planKey] ?? 0;
}
