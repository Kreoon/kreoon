/**
 * KREOON PROMPTS LIBRARY
 *
 * Biblioteca centralizada de todos los prompts de AI de la plataforma.
 *
 * Uso:
 * ```typescript
 * import { SCRIPT_PROMPTS, getScriptPrompt, interpolatePrompt } from '@/lib/prompts';
 *
 * const creatorPrompt = getScriptPrompt('creator');
 * const filled = interpolatePrompt(creatorPrompt.user, {
 *   producto_nombre: 'Mi Producto',
 *   angulo_venta: 'Transformacion',
 * });
 * ```
 */

// Base prompts (identidad, ESFERA, formatos)
export * from './base';

// Script prompts (guiones por rol)
export * from './scripts';

// Research prompts (investigacion de productos)
export * from './research';

// Re-exportar utilidades
export { interpolatePrompt, getScriptPrompt } from './scripts';

/**
 * Indice de todos los modulos de prompts disponibles
 */
export const PROMPT_MODULES = {
  base: ['identity', 'esfera', 'formats'],
  scripts: ['creator', 'editor', 'strategist', 'trafficker', 'designer', 'admin'],
  research: ['product'],
  // Futuros modulos:
  // content: ['video-analysis', 'thumbnail'],
  // dna: ['client', 'product'],
  // social: ['metrics', 'scraper'],
  // marketing: ['campaigns', 'ads'],
  // assistant: ['copilot'],
} as const;
