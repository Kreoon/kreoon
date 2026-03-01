/**
 * Re-export de todos los prompts de scripts/guiones
 */

export * from './creator';
export * from './editor';
export * from './strategist';
export * from './trafficker';
export * from './designer';
export * from './admin';

// Importaciones para el mapa de configuraciones
import { CREATOR_CONFIG, CREATOR_SYSTEM_PROMPT, CREATOR_USER_PROMPT } from './creator';
import { EDITOR_CONFIG, EDITOR_SYSTEM_PROMPT, EDITOR_USER_PROMPT } from './editor';
import { STRATEGIST_CONFIG, STRATEGIST_SYSTEM_PROMPT, STRATEGIST_USER_PROMPT } from './strategist';
import { TRAFFICKER_CONFIG, TRAFFICKER_SYSTEM_PROMPT, TRAFFICKER_USER_PROMPT } from './trafficker';
import { DESIGNER_CONFIG, DESIGNER_SYSTEM_PROMPT, DESIGNER_USER_PROMPT } from './designer';
import { ADMIN_CONFIG, ADMIN_SYSTEM_PROMPT, ADMIN_USER_PROMPT } from './admin';

/**
 * Mapa de todos los prompts de scripts por rol
 */
export const SCRIPT_PROMPTS = {
  creator: {
    config: CREATOR_CONFIG,
    system: CREATOR_SYSTEM_PROMPT,
    user: CREATOR_USER_PROMPT,
  },
  editor: {
    config: EDITOR_CONFIG,
    system: EDITOR_SYSTEM_PROMPT,
    user: EDITOR_USER_PROMPT,
  },
  strategist: {
    config: STRATEGIST_CONFIG,
    system: STRATEGIST_SYSTEM_PROMPT,
    user: STRATEGIST_USER_PROMPT,
  },
  trafficker: {
    config: TRAFFICKER_CONFIG,
    system: TRAFFICKER_SYSTEM_PROMPT,
    user: TRAFFICKER_USER_PROMPT,
  },
  designer: {
    config: DESIGNER_CONFIG,
    system: DESIGNER_SYSTEM_PROMPT,
    user: DESIGNER_USER_PROMPT,
  },
  admin: {
    config: ADMIN_CONFIG,
    system: ADMIN_SYSTEM_PROMPT,
    user: ADMIN_USER_PROMPT,
  },
} as const;

export type ScriptRole = keyof typeof SCRIPT_PROMPTS;

/**
 * Obtener prompt por rol
 */
export function getScriptPrompt(role: ScriptRole) {
  return SCRIPT_PROMPTS[role];
}

/**
 * Reemplazar variables en un prompt
 */
export function interpolatePrompt(
  template: string,
  variables: Record<string, string | number | undefined>
): string {
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    const value = variables[key];
    return value !== undefined ? String(value) : match;
  });
}
