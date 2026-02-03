/**
 * Cliente compartido de Perplexity para búsqueda e investigación en toda la plataforma.
 * Usa getPerplexityConfig (env o por organización) y la API de chat/completions.
 */

import { getPerplexityConfig } from "./get-module-ai-config.ts";

export interface PerplexitySearchOptions {
  recencyFilter?: "day" | "week" | "month" | "year";
  searchDomains?: string[];
  maxTokens?: number;
  temperature?: number;
  returnCitations?: boolean;
}

export interface PerplexityResult {
  content: string;
  citations: string[];
  searchQuery: string;
}

const PERPLEXITY_URL = "https://api.perplexity.ai/chat/completions";

/**
 * Búsqueda/investigación con Perplexity usando la API de chat completions.
 * Soporta filtro de recencia, dominios y citaciones.
 */
export async function searchWithPerplexity(
  supabase: any,
  organizationId: string,
  query: string,
  options: PerplexitySearchOptions = {}
): Promise<PerplexityResult> {
  const config = await getPerplexityConfig(supabase, organizationId);

  if (!config.apiKey) {
    throw new Error("Perplexity API key not configured. Set PERPLEXITY_API_KEY or configure it for the organization.");
  }

  const body: Record<string, unknown> = {
    model: config.model || "llama-3.1-sonar-large-128k-online",
    messages: [{ role: "user", content: query }],
    max_tokens: options.maxTokens ?? 4096,
    temperature: options.temperature ?? 0.2,
    return_citations: options.returnCitations !== false,
  };

  if (options.recencyFilter) {
    body.search_recency_filter = options.recencyFilter;
  }
  if (options.searchDomains?.length) {
    body.search_domain_filter = options.searchDomains;
  }

  const response = await fetch(PERPLEXITY_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Perplexity API error: ${response.status} ${errorText}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    citations?: string[] | null;
    search_results?: Array<{ url?: string }>;
  };

  const content = data.choices?.[0]?.message?.content ?? "";
  const citations: string[] = Array.isArray(data.citations)
    ? data.citations
    : (data.search_results?.map((r) => r.url).filter(Boolean) as string[]) ?? [];

  return {
    content,
    citations,
    searchQuery: query,
  };
}

// --- Búsquedas especializadas preconfiguradas ---

export const PerplexitySearches = {
  /** Tendencias de contenido para un producto/nicho */
  contentTrends: async (
    supabase: any,
    orgId: string,
    params: { niche: string; platform?: string; country?: string }
  ): Promise<PerplexityResult> => {
    const query = `¿Cuáles son las tendencias actuales de contenido UGC para ${params.niche} en ${params.platform || "redes sociales"}${params.country ? ` en ${params.country}` : " en Latinoamérica"}?

Incluye:
1. Formatos que están funcionando (duración, estilo)
2. Hooks y ganchos efectivos
3. Sonidos/audios trending
4. Hashtags relevantes
5. Mejores horarios de publicación
6. Ejemplos de contenido viral reciente

Sé específico con datos actuales.`;

    return searchWithPerplexity(supabase, orgId, query, { recencyFilter: "week" });
  },

  /** Análisis de competidores */
  competitorAnalysis: async (
    supabase: any,
    orgId: string,
    params: { productName: string; competitors?: string[]; market?: string }
  ): Promise<PerplexityResult> => {
    const competitorList =
      params.competitors?.length ? `Competidores específicos: ${params.competitors.join(", ")}` : "Identifica los principales competidores";

    const query = `Análisis competitivo para "${params.productName}" en el mercado de ${params.market || "Latinoamérica"}:

${competitorList}

Para cada competidor incluye:
1. Estrategia de contenido UGC actual
2. Tipos de creadores que usan
3. Mensajes y ángulos de venta principales
4. Engagement promedio
5. Qué les funciona y qué no
6. Oportunidades de diferenciación

Basa tu análisis en datos reales y recientes.`;

    return searchWithPerplexity(supabase, orgId, query, { recencyFilter: "month" });
  },

  /** Mejores prácticas para hooks */
  hookResearch: async (
    supabase: any,
    orgId: string,
    params: { productType: string; platform: string; targetAudience?: string }
  ): Promise<PerplexityResult> => {
    const query = `¿Cuáles son los hooks/ganchos más efectivos para videos de ${params.productType} en ${params.platform}${params.targetAudience ? ` dirigidos a ${params.targetAudience}` : ""}?

Dame:
1. 10 ejemplos de hooks que han funcionado recientemente (con métricas si están disponibles)
2. Patrones comunes en hooks exitosos
3. Hooks a evitar (sobreutilizados o penalizados)
4. Técnicas de storytelling efectivas
5. Primeras 3 palabras más impactantes

Incluye ejemplos reales de contenido viral.`;

    return searchWithPerplexity(supabase, orgId, query, { recencyFilter: "week" });
  },

  /** Investigación de avatar/audiencia */
  audienceResearch: async (
    supabase: any,
    orgId: string,
    params: { productName: string; currentAvatar?: string }
  ): Promise<PerplexityResult> => {
    const query = `Investigación de audiencia para "${params.productName}":

${params.currentAvatar ? `Avatar actual: ${params.currentAvatar}` : ""}

Necesito información actualizada sobre:
1. Demografía de compradores típicos
2. Comportamientos de compra online
3. Plataformas donde pasan más tiempo
4. Influencers/creadores que siguen
5. Objeciones comunes de compra
6. Triggers emocionales de compra
7. Horarios de mayor actividad online

Basa tu respuesta en estudios y datos recientes del mercado latinoamericano.`;

    return searchWithPerplexity(supabase, orgId, query, { recencyFilter: "month" });
  },

  /** Precios y ofertas del mercado */
  pricingResearch: async (
    supabase: any,
    orgId: string,
    params: { productCategory: string; priceRange?: string }
  ): Promise<PerplexityResult> => {
    const query = `Investigación de precios y ofertas para ${params.productCategory}${params.priceRange ? ` en el rango de ${params.priceRange}` : ""} en el mercado latinoamericano:

1. Precios promedio del mercado
2. Estrategias de descuento que funcionan
3. Ofertas de competidores actuales
4. Bundles o combos populares
5. Estrategias de envío gratis vs precio
6. Fechas clave de promociones próximas

Incluye datos específicos y fuentes.`;

    return searchWithPerplexity(supabase, orgId, query, { recencyFilter: "week" });
  },
};
