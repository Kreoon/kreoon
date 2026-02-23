/**
 * Configuración centralizada de IA por módulo y organización.
 * Usa organization_ai_modules, organization_ai_defaults y organization_ai_providers.
 */

export interface ModuleAIConfig {
  provider: string;
  model: string;
  apiKey: string;
  temperature?: number;
  maxTokens?: number;
}

export interface GetModuleAIConfigOptions {
  /** Si true, lanza MODULE_INACTIVE cuando el módulo no está activo. Default: true */
  requireActive?: boolean;
  /** Si true, cuando organizationId es null retorna config por defecto (para casos sin org). Default: false */
  allowNullOrg?: boolean;
  /** Clave para defaults de org (ej: "tablero" usa tablero_provider/tablero_model). Default: usa default_provider/default_model */
  defaultsKey?: string;
}

function getEnvApiKey(provider: string): string {
  switch (provider) {
    case "gemini":
      return Deno.env.get("GOOGLE_AI_API_KEY") || "";
    case "openai":
      return Deno.env.get("OPENAI_API_KEY") || "";
    case "anthropic":
      return Deno.env.get("ANTHROPIC_API_KEY") || "";
    case "perplexity":
      return Deno.env.get("PERPLEXITY_API_KEY") || "";
    case "fal":
      return Deno.env.get("FAL_KEY") || "";
    default:
      return Deno.env.get("GOOGLE_AI_API_KEY") || "";
  }
}

function normalizeProviderModel(provider: string, model: string): { provider: string; model: string } {
  let p = provider;
  let m = model;

  // Handle model prefixes (google/, openai/, anthropic/, perplexity/)
  if (m.startsWith("google/")) {
    p = "gemini";
    m = m.replace("google/", "");
  } else if (m.startsWith("openai/")) {
    p = "openai";
    m = m.replace("openai/", "");
  } else if (m.startsWith("anthropic/")) {
    p = "anthropic";
    m = m.replace("anthropic/", "");
  } else if (m.startsWith("perplexity/")) {
    p = "perplexity";
    m = m.replace("perplexity/", "");
  }

  // Kreoon IA usa Gemini por defecto
  if (p === "kreoon") {
    p = "gemini";
    m = m || "gemini-2.5-flash";
  }

  return { provider: p, model: m };
}

export async function getModuleAIConfig(
  supabase: { from: (table: string) => { select: (cols: string) => any } },
  organizationId: string | null,
  moduleKey: string,
  options: GetModuleAIConfigOptions = {}
): Promise<ModuleAIConfig> {
  const { requireActive = true, allowNullOrg = false, defaultsKey } = options;

  if (!organizationId) {
    if (!allowNullOrg) {
      throw new Error("organizationId is required");
    }
    const apiKey = getEnvApiKey("gemini");
    if (!apiKey) {
      throw new Error("No hay API keys de IA configuradas. Configura GOOGLE_AI_API_KEY.");
    }
    return {
      provider: "gemini",
      model: "gemini-2.5-flash",
      apiKey,
    };
  }

  const googleApiKey = Deno.env.get("GOOGLE_AI_API_KEY");
  const openaiApiKey = Deno.env.get("OPENAI_API_KEY");

  const { data: moduleData } = await supabase
    .from("organization_ai_modules")
    .select("is_active, provider, model")
    .eq("organization_id", organizationId)
    .eq("module_key", moduleKey)
    .maybeSingle();

  if (requireActive && moduleData !== null && moduleData?.is_active === false) {
    throw new Error(`MODULE_INACTIVE:${moduleKey}`);
  }

  let provider = moduleData?.provider || "gemini";
  let model = moduleData?.model || "gemini-2.5-flash";

  if (!moduleData?.provider || !moduleData?.model) {
    const derivedDefaultsKey = defaultsKey ?? (moduleKey.startsWith("board_") ? "tablero" : undefined);
    const { data: defaults } = await supabase
      .from("organization_ai_defaults")
      .select("default_provider, default_model, tablero_provider, tablero_model")
      .eq("organization_id", organizationId)
      .maybeSingle();

    if (defaults) {
      if (derivedDefaultsKey === "tablero") {
        provider = defaults.tablero_provider || defaults.default_provider || "gemini";
        model = defaults.tablero_model || defaults.default_model || "gemini-2.5-flash";
      } else {
        provider = defaults.default_provider || "gemini";
        model = defaults.default_model || "gemini-2.5-flash";
      }
    }
  }

  const normalized = normalizeProviderModel(provider, model);
  provider = normalized.provider;
  model = normalized.model;

  if (provider !== "gemini" && provider !== "openai" && provider !== "anthropic") {
    const { data: providerData } = await supabase
      .from("organization_ai_providers")
      .select("api_key_encrypted")
      .eq("organization_id", organizationId)
      .eq("provider_key", provider)
      .eq("is_enabled", true)
      .maybeSingle();

    if (providerData?.api_key_encrypted) {
      return { provider, model, apiKey: providerData.api_key_encrypted };
    }
    provider = "gemini";
    model = "gemini-2.5-flash";
  }

  let apiKey = getEnvApiKey(provider);

  if (!apiKey) {
    if (googleApiKey) {
      provider = "gemini";
      model = "gemini-2.5-flash";
      apiKey = googleApiKey;
    } else if (openaiApiKey) {
      provider = "openai";
      model = "gpt-4o-mini";
      apiKey = openaiApiKey;
    }
  }

  if (!apiKey) {
    throw new Error("No hay API keys de IA configuradas. Configura GOOGLE_AI_API_KEY o OPENAI_API_KEY.");
  }

  return { provider, model, apiKey };
}

/** Config para callAIWithFallback (array de provider/model/apiKey) */
export type AIConfigForFallback = { provider: string; model: string; apiKey: string };

/**
 * Obtiene lista de configs para cadena de fallback (ej: board-ai).
 * Orden: preferido → gemini → openai → anthropic.
 */
export async function getModuleAIConfigsWithFallback(
  supabase: { from: (table: string) => { select: (cols: string) => any } },
  organizationId: string,
  defaultsKey: "tablero" | "default" = "tablero"
): Promise<AIConfigForFallback[]> {
  const googleApiKey = Deno.env.get("GOOGLE_AI_API_KEY");
  const openaiApiKey = Deno.env.get("OPENAI_API_KEY");

  const { data: defaults } = await supabase
    .from("organization_ai_defaults")
    .select("default_provider, default_model, tablero_provider, tablero_model")
    .eq("organization_id", organizationId)
    .maybeSingle();

  type OrgProviderRow = {
    provider_key: string;
    api_key_encrypted: string | null;
    available_models: string[] | null;
  };

  const { data: enabledProviders } = await supabase
    .from("organization_ai_providers")
    .select("provider_key, api_key_encrypted, available_models")
    .eq("organization_id", organizationId)
    .eq("is_enabled", true);

  const providerByKey = new Map<string, OrgProviderRow>(
    ((enabledProviders as OrgProviderRow[] | null) || []).map((p) => [p.provider_key, p])
  );

  let preferredProvider = (defaultsKey === "tablero"
    ? defaults?.tablero_provider || defaults?.default_provider
    : defaults?.default_provider) || "gemini";
  let preferredModel = (defaultsKey === "tablero"
    ? defaults?.tablero_model || defaults?.default_model
    : defaults?.default_model) || "gemini-2.5-flash";

  // Kreoon IA usa Gemini por defecto
  if (preferredProvider === "kreoon") {
    preferredProvider = "gemini";
    if (preferredModel.startsWith("google/")) {
      preferredModel = preferredModel.replace("google/", "");
    }
  }

  const configs: AIConfigForFallback[] = [];

  const addConfig = (provider: string, model: string, apiKey: string) => {
    if (apiKey && !configs.some((c) => c.provider === provider)) {
      configs.push({ provider, model, apiKey });
    }
  };

  if (preferredProvider === "gemini" && googleApiKey) {
    addConfig("gemini", preferredModel || "gemini-2.5-flash", googleApiKey);
  } else if (preferredProvider === "openai" && openaiApiKey) {
    addConfig("openai", preferredModel || "gpt-4o-mini", openaiApiKey);
  } else if (preferredProvider !== "gemini" && preferredProvider !== "openai") {
    const p = providerByKey.get(preferredProvider);
    if (p?.api_key_encrypted) {
      const defaultModel =
        preferredProvider === "anthropic" ? "claude-sonnet-4-20250514" : "gemini-2.5-flash";
      const model =
        preferredModel ||
        (Array.isArray(p.available_models) && p.available_models.length ? p.available_models[0] : defaultModel);
      addConfig(preferredProvider, model, p.api_key_encrypted);
    }
  }

  addConfig("gemini", "gemini-2.5-flash", googleApiKey || "");
  addConfig("openai", "gpt-4o-mini", openaiApiKey || "");

  for (const key of ["anthropic"]) {
    const p = providerByKey.get(key);
    if (p?.api_key_encrypted) {
      const model = Array.isArray(p.available_models) && p.available_models.length ? p.available_models[0] : "claude-sonnet-4-20250514";
      addConfig(key, model, p.api_key_encrypted);
    }
  }

  const filtered = configs.filter((c) => c.apiKey);
  if (filtered.length === 0) {
    throw new Error("No hay proveedores de IA configurados. Configura GOOGLE_AI_API_KEY o OPENAI_API_KEY.");
  }
  return filtered;
}

/** Helper para Perplexity (usado por product-research) */
export function getPerplexityApiKey(): string | null {
  return Deno.env.get("PERPLEXITY_API_KEY") || null;
}

/** Config de Perplexity para research de tendencias (streaming-ai, product-research) */
export async function getPerplexityConfig(
  _supabase: { from: (table: string) => any },
  _organizationId: string
): Promise<{ apiKey: string; model: string }> {
  const apiKey = getPerplexityApiKey() || "";
  return {
    apiKey,
    model: "llama-3.1-sonar-large-128k-online",
  };
}
