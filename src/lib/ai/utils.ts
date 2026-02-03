/**
 * Utilidades para construcción y manipulación de prompts.
 */

import { replaceVariables, extractVariables, validateVariables } from "./variables";
import type { PromptConfig, PromptVariables } from "./types";

export { replaceVariables, extractVariables, validateVariables };

/**
 * Construye el prompt completo combinando system y user con variables reemplazadas.
 */
export function buildPrompt(
  config: Pick<PromptConfig, "systemPrompt" | "userPromptTemplate">,
  variables: PromptVariables = {},
  options: { throwOnMissing?: boolean } = {}
): { systemPrompt: string; userPrompt: string } {
  const systemPrompt = replaceVariables(config.systemPrompt, variables, options);
  const userPrompt = config.userPromptTemplate
    ? replaceVariables(config.userPromptTemplate, variables, options)
    : "";
  return { systemPrompt, userPrompt };
}

/**
 * Valida que un PromptConfig tenga todas las variables requeridas.
 */
export function validatePromptConfig(
  config: PromptConfig,
  provided: PromptVariables
): { valid: boolean; missing: string[] } {
  const required = config.variables.filter((v) => v.required).map((v) => v.key);
  const result = validateVariables(config.systemPrompt, provided, required);
  if (config.userPromptTemplate) {
    const userResult = validateVariables(config.userPromptTemplate, provided, required);
    return {
      valid: result.valid && userResult.valid,
      missing: [...new Set([...result.missing, ...userResult.missing])],
    };
  }
  return { valid: result.valid, missing: result.missing };
}
