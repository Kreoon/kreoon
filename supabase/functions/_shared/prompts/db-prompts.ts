/**
 * Servicio centralizado para obtener prompts desde la base de datos.
 * Incluye cache en memoria con TTL y fallback a prompts hardcodeados.
 */

// Imports locales para fallback
import { MASTER_SCRIPT_PROMPT } from "./scripts.ts";
import { BOARD_SYSTEM_PROMPTS, BOARD_USER_TEMPLATES } from "./board.ts";

// ============================================================================
// TIPOS
// ============================================================================

export interface PlatformPrompt {
  id: string;
  module: string;
  prompt_key: string;
  name: string;
  description: string | null;
  system_prompt: string;
  user_prompt: string | null;
  temperature: number;
  max_tokens: number;
  model: string;
  variables: PromptVariable[];
  category: string | null;
  tags: string[] | null;
  is_active: boolean;
  version: number;
}

export interface PromptVariable {
  key: string;
  required: boolean;
  default?: string | null;
}

export interface PromptConfig {
  systemPrompt: string;
  userPrompt: string | null;
  temperature: number;
  maxTokens: number;
  model: string;
  variables: PromptVariable[];
}

// ============================================================================
// CACHE EN MEMORIA
// ============================================================================

interface CacheEntry {
  prompt: PlatformPrompt;
  expiresAt: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos
const promptCache = new Map<string, CacheEntry>();

function getCacheKey(module: string, promptKey: string): string {
  return `${module}:${promptKey}`;
}

function getFromCache(module: string, promptKey: string): PlatformPrompt | null {
  const key = getCacheKey(module, promptKey);
  const entry = promptCache.get(key);

  if (!entry) return null;

  if (Date.now() > entry.expiresAt) {
    promptCache.delete(key);
    return null;
  }

  return entry.prompt;
}

function setInCache(prompt: PlatformPrompt): void {
  const key = getCacheKey(prompt.module, prompt.prompt_key);
  promptCache.set(key, {
    prompt,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
}

/** Limpia toda la cache (útil para tests o forzar refresh) */
export function clearPromptCache(): void {
  promptCache.clear();
}

// ============================================================================
// PROMPTS HARDCODEADOS (FALLBACK)
// ============================================================================

const FALLBACK_PROMPTS: Record<string, Record<string, Partial<PlatformPrompt>>> = {
  scripts: {
    creator: {
      system_prompt: MASTER_SCRIPT_PROMPT,
      temperature: 0.7,
      max_tokens: 4096,
    },
  },
  board: {
    analyze_card: {
      system_prompt: BOARD_SYSTEM_PROMPTS.analyze_card,
      user_prompt: BOARD_USER_TEMPLATES.analyze_card,
      temperature: 0.5,
      max_tokens: 2000,
    },
    analyze_board: {
      system_prompt: BOARD_SYSTEM_PROMPTS.analyze_board,
      user_prompt: BOARD_USER_TEMPLATES.analyze_board,
      temperature: 0.5,
      max_tokens: 2000,
    },
    suggest_next_state: {
      system_prompt: BOARD_SYSTEM_PROMPTS.suggest_next_state,
      user_prompt: BOARD_USER_TEMPLATES.suggest_next_state,
      temperature: 0.3,
      max_tokens: 1000,
    },
    recommend_automation: {
      system_prompt: BOARD_SYSTEM_PROMPTS.recommend_automation,
      user_prompt: BOARD_USER_TEMPLATES.recommend_automation,
      temperature: 0.5,
      max_tokens: 2000,
    },
  },
  base: {
    identity: {
      system_prompt: `Eres KREOON AI, un asistente especializado en produccion de contenido UGC (User Generated Content) y marketing digital para Latinoamerica.

CONTEXTO DE KREOON:
- Plataforma que conecta marcas con creadores de contenido
- Metodologia ESFERA para estrategia de contenido
- Enfoque en contenido autentico, emocional y de alto impacto

PRINCIPIOS:
1. Siempre responde en espanol latinoamericano (neutro, sin modismos muy locales)
2. Se directo, accionable y especifico
3. Prioriza resultados medibles sobre teoria
4. Adapta el tono segun el contexto (marca, creador, estratega)`,
      temperature: 0.7,
      max_tokens: 2000,
    },
    esfera: {
      system_prompt: `METODO ESFERA - Fases de Contenido:

ENGANCHAR (TOFU - Top of Funnel)
- Objetivo: Captar atencion, generar curiosidad
- Audiencia: Fria, no conoce la marca
- Tono: Disruptivo, viral, emocional
- Tecnicas: Hooks potentes, pattern interrupt, controversia constructiva

SOLUCION (MOFU - Middle of Funnel)
- Objetivo: Educar, demostrar valor, generar confianza
- Audiencia: Tibia, tiene el problema, busca soluciones
- Tono: Experto, empatico, demostrativo
- Tecnicas: Testimonios, demos, comparativas, responder objeciones

REMARKETING (BOFU - Bottom of Funnel)
- Objetivo: Convertir, superar objeciones finales
- Audiencia: Caliente, considerando compra
- Tono: Urgente, especifico, de cierre
- Tecnicas: Escasez, garantias, ofertas, casos de exito especificos

FIDELIZAR (Post-venta)
- Objetivo: Retener, generar recompra y referidos
- Audiencia: Clientes actuales
- Tono: Cercano, exclusivo, de comunidad
- Tecnicas: Tutoriales, unboxing, UGC de clientes, programas de lealtad`,
      temperature: 0.5,
      max_tokens: 1000,
    },
  },
};

function getFallbackPrompt(module: string, promptKey: string): PromptConfig | null {
  const modulePrompts = FALLBACK_PROMPTS[module];
  if (!modulePrompts) return null;

  const prompt = modulePrompts[promptKey];
  if (!prompt) return null;

  return {
    systemPrompt: prompt.system_prompt || "",
    userPrompt: prompt.user_prompt || null,
    temperature: prompt.temperature ?? 0.7,
    maxTokens: prompt.max_tokens ?? 2000,
    model: prompt.model || "default",
    variables: (prompt.variables as PromptVariable[]) || [],
  };
}

// ============================================================================
// FUNCIONES PRINCIPALES
// ============================================================================

type SupabaseClient = {
  from: (table: string) => {
    select: (columns: string) => {
      eq: (column: string, value: unknown) => {
        eq: (column: string, value: unknown) => {
          maybeSingle: () => Promise<{ data: PlatformPrompt | null; error: unknown }>;
        };
      };
    };
  };
};

/**
 * Obtiene un prompt de la base de datos con cache y fallback.
 *
 * @param supabase - Cliente Supabase con service_role
 * @param module - Módulo del prompt (ej: 'scripts', 'board', 'base')
 * @param promptKey - Clave única del prompt (ej: 'creator', 'analyze_card')
 * @returns PromptConfig con systemPrompt, userPrompt, temperature, maxTokens, variables
 */
export async function getPrompt(
  supabase: SupabaseClient,
  module: string,
  promptKey: string
): Promise<PromptConfig> {
  // 1. Verificar cache
  const cached = getFromCache(module, promptKey);
  if (cached) {
    return {
      systemPrompt: cached.system_prompt,
      userPrompt: cached.user_prompt,
      temperature: cached.temperature,
      maxTokens: cached.max_tokens,
      model: cached.model,
      variables: cached.variables || [],
    };
  }

  // 2. Intentar obtener de DB
  try {
    const { data, error } = await supabase
      .from("platform_prompts")
      .select("*")
      .eq("module", module)
      .eq("prompt_key", promptKey)
      .eq("is_active", true)
      .maybeSingle();

    if (error) {
      console.warn(`[db-prompts] Error fetching prompt ${module}/${promptKey}:`, error);
    } else if (data) {
      // Guardar en cache
      setInCache(data);

      return {
        systemPrompt: data.system_prompt,
        userPrompt: data.user_prompt,
        temperature: data.temperature,
        maxTokens: data.max_tokens,
        model: data.model,
        variables: data.variables || [],
      };
    }
  } catch (err) {
    console.warn(`[db-prompts] Exception fetching prompt ${module}/${promptKey}:`, err);
  }

  // 3. Fallback a prompts hardcodeados
  const fallback = getFallbackPrompt(module, promptKey);
  if (fallback) {
    console.log(`[db-prompts] Using fallback for ${module}/${promptKey}`);
    return fallback;
  }

  // 4. Si no hay fallback, devolver prompt genérico
  console.warn(`[db-prompts] No prompt found for ${module}/${promptKey}, using generic`);
  return {
    systemPrompt: FALLBACK_PROMPTS.base?.identity?.system_prompt || "Eres un asistente útil.",
    userPrompt: null,
    temperature: 0.7,
    maxTokens: 2000,
    model: "default",
    variables: [],
  };
}

/**
 * Obtiene múltiples prompts de un módulo.
 * Útil para cargar todos los prompts de board-ai de una vez.
 */
export async function getModulePrompts(
  supabase: SupabaseClient,
  module: string
): Promise<Record<string, PromptConfig>> {
  const result: Record<string, PromptConfig> = {};

  try {
    const { data, error } = await (supabase
      .from("platform_prompts")
      .select("*")
      .eq("module", module)
      .eq("is_active", true) as unknown as Promise<{ data: PlatformPrompt[] | null; error: unknown }>);

    if (error) {
      console.warn(`[db-prompts] Error fetching module ${module}:`, error);
    } else if (data) {
      for (const prompt of data) {
        setInCache(prompt);
        result[prompt.prompt_key] = {
          systemPrompt: prompt.system_prompt,
          userPrompt: prompt.user_prompt,
          temperature: prompt.temperature,
          maxTokens: prompt.max_tokens,
          model: prompt.model,
          variables: prompt.variables || [],
        };
      }
    }
  } catch (err) {
    console.warn(`[db-prompts] Exception fetching module ${module}:`, err);
  }

  // Completar con fallbacks si hay prompts que no están en DB
  const moduleFallbacks = FALLBACK_PROMPTS[module];
  if (moduleFallbacks) {
    for (const [key, prompt] of Object.entries(moduleFallbacks)) {
      if (!result[key]) {
        result[key] = {
          systemPrompt: prompt.system_prompt || "",
          userPrompt: prompt.user_prompt || null,
          temperature: prompt.temperature ?? 0.7,
          maxTokens: prompt.max_tokens ?? 2000,
          model: prompt.model || "default",
          variables: (prompt.variables as PromptVariable[]) || [],
        };
      }
    }
  }

  return result;
}

/**
 * Interpola variables en un template de prompt.
 * Reemplaza {variable} con el valor correspondiente.
 */
export function interpolatePrompt(
  template: string,
  variables: Record<string, string | number | undefined | null>
): string {
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    const value = variables[key];
    if (value === undefined || value === null) return "";
    return String(value);
  });
}

/**
 * Obtiene un prompt e interpola las variables en el user_prompt.
 * Combina getPrompt + interpolatePrompt en una sola llamada.
 */
export async function getInterpolatedPrompt(
  supabase: SupabaseClient,
  module: string,
  promptKey: string,
  variables: Record<string, string | number | undefined | null>
): Promise<{
  systemPrompt: string;
  userPrompt: string;
  temperature: number;
  maxTokens: number;
  model: string;
}> {
  const config = await getPrompt(supabase, module, promptKey);

  return {
    systemPrompt: config.systemPrompt,
    userPrompt: config.userPrompt ? interpolatePrompt(config.userPrompt, variables) : "",
    temperature: config.temperature,
    maxTokens: config.maxTokens,
    model: config.model,
  };
}

/**
 * Obtiene solo el system prompt (sin user template).
 * Útil para prompts base como identity o esfera.
 */
export async function getSystemPrompt(
  supabase: SupabaseClient,
  module: string,
  promptKey: string
): Promise<string> {
  const config = await getPrompt(supabase, module, promptKey);
  return config.systemPrompt;
}

/**
 * Combina múltiples prompts base en un solo system prompt.
 * Útil para construir prompts complejos que usan identity + esfera + específico.
 */
export async function combinePrompts(
  supabase: SupabaseClient,
  promptRefs: Array<{ module: string; promptKey: string }>
): Promise<string> {
  const parts: string[] = [];

  for (const ref of promptRefs) {
    const prompt = await getSystemPrompt(supabase, ref.module, ref.promptKey);
    if (prompt) {
      parts.push(prompt);
    }
  }

  return parts.join("\n\n");
}
