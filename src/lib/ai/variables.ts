/**
 * Sistema unificado de variables de plantilla.
 * Soporta las 3 sintaxis encontradas en el código:
 * - {variable} (useScriptPrompts)
 * - {{variable}} (product-research, portfolio)
 * - ${variable} (Edge Functions con template literals)
 */

export function replaceVariables(
  template: string,
  variables: Record<string, unknown>,
  options: {
    throwOnMissing?: boolean;
    defaultValue?: string;
  } = {}
): string {
  const { throwOnMissing = false, defaultValue = "" } = options;

  let result = template;

  // Reemplazar {variable}
  result = result.replace(/\{(\w+)\}/g, (_match, key) => {
    if (key in variables) {
      return String(variables[key] ?? defaultValue);
    }
    if (throwOnMissing) {
      throw new Error(`Missing variable: ${key}`);
    }
    return defaultValue;
  });

  // Reemplazar {{variable}}
  result = result.replace(/\{\{(\w+)\}\}/g, (_match, key) => {
    if (key in variables) {
      return String(variables[key] ?? defaultValue);
    }
    if (throwOnMissing) {
      throw new Error(`Missing variable: ${key}`);
    }
    return defaultValue;
  });

  // Reemplazar ${variable}
  result = result.replace(/\$\{(\w+)\}/g, (_match, key) => {
    if (key in variables) {
      return String(variables[key] ?? defaultValue);
    }
    if (throwOnMissing) {
      throw new Error(`Missing variable: ${key}`);
    }
    return defaultValue;
  });

  return result;
}

export function extractVariables(template: string): string[] {
  const singleBrace = [...template.matchAll(/\{(\w+)\}/g)].map((m) => m[1]);
  const doubleBrace = [...template.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]);
  const dollarBrace = [...template.matchAll(/\$\{(\w+)\}/g)].map((m) => m[1]);
  return [...new Set([...singleBrace, ...doubleBrace, ...dollarBrace])];
}

export function validateVariables(
  template: string,
  provided: Record<string, unknown>,
  required: string[] = []
): { valid: boolean; missing: string[]; extra: string[] } {
  const templateVars = extractVariables(template);
  const providedKeys = Object.keys(provided);

  const missing = required.filter((v) => !(v in provided));
  const extra = providedKeys.filter((v) => !templateVars.includes(v));

  return {
    valid: missing.length === 0,
    missing,
    extra,
  };
}
