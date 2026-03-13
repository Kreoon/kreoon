/**
 * ADN Research v3 - Configuration
 * Master Context y configuración de pasos
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export interface MasterContext {
  product: {
    name: string;
    description: string;
    service_types: string[];
    goal: string;
    platforms: string[];
    audience_ages: string[];
    urgency: string;
    locations: string[];
    links: {
      product: string[];
      competitors: string[];
      inspiration: string[];
    };
    user_responses: {
      q1_product: string;
      q2_ideal_client: string;
      q3_problem: string;
      q4_transformation: string;
      q5_offer: string;
    };
    emotional_analysis: {
      overall_mood: string;
      confidence_level: number;
      passion_topics: string[];
      concern_areas: string[];
      recommended_tone: string;
    } | null;
    basic_analysis: {
      executive_summary: string;
      market_analysis: any;
      target_audience: any;
      creative_brief: any;
      recommendations: any;
      kiro_insights: string[];
    } | null;
  };
  brand?: {
    business_identity: any;
    value_proposition: any;
    ideal_customer: any;
    flagship_offer: any;
    brand_identity: any;
    visual_identity: any;
    marketing_strategy: any;
    ads_targeting: any;
    user_responses: {
      q1_negocio: string;
      q2_cliente: string;
      q3_problema: string;
      q4_solucion: string;
      q5_oferta: string;
      q6_canales: string;
      q7_dudas: string;
    };
  };
  social?: {
    pain_phrases: any[];
    desire_phrases: any[];
    real_objections: any[];
    common_vocabulary: any[];
    recommendation_reasons: string[];
    complaint_reasons: string[];
  };
  ads?: {
    meta_ads: any;
    tiktok_ads: any;
    competitor_social: any[];
  };
}

export interface StepConfig {
  key: string;
  name: string;
  dependencies: number[];
  useWebSearch: boolean;
}

// ─── Step Configurations ─────────────────────────────────────────────────────

export const STEP_CONFIGS: Record<number, StepConfig> = {
  1: { key: "tab_1_market_overview", name: "Panorama de Mercado", dependencies: [], useWebSearch: true },
  2: { key: "tab_2_competition", name: "Análisis de Competencia", dependencies: [1], useWebSearch: true },
  3: { key: "tab_3_jtbd", name: "Jobs To Be Done", dependencies: [1], useWebSearch: false },
  4: { key: "tab_4_avatars", name: "Avatares Ideales", dependencies: [1, 3], useWebSearch: false },
  5: { key: "tab_5_psychology", name: "Psicología Profunda", dependencies: [3, 4], useWebSearch: false },
  6: { key: "tab_6_neuromarketing", name: "Neuromarketing", dependencies: [4, 5], useWebSearch: false },
  7: { key: "tab_7_positioning", name: "Posicionamiento", dependencies: [1, 2, 4], useWebSearch: false },
  8: { key: "tab_8_copywriting", name: "Ángulos de Copy", dependencies: [5, 7], useWebSearch: false },
  9: { key: "tab_9_puv_offer", name: "Oferta Irresistible", dependencies: [7, 8], useWebSearch: false },
  11: { key: "tab_11_content_calendar", name: "Calendario 30 Días", dependencies: [7, 8, 9], useWebSearch: false },
  12: { key: "tab_12_lead_magnets", name: "Lead Magnets", dependencies: [4, 5], useWebSearch: false },
  13: { key: "tab_13_social_media", name: "Redes Sociales", dependencies: [7, 8, 11], useWebSearch: true },
  14: { key: "tab_14_meta_ads", name: "Meta Ads", dependencies: [5, 8, 9], useWebSearch: false },
  15: { key: "tab_15_tiktok_ads", name: "TikTok Ads", dependencies: [5, 8, 9], useWebSearch: false },
  16: { key: "tab_16_google_ads", name: "Google Ads", dependencies: [5, 8], useWebSearch: true },
  17: { key: "tab_17_email_marketing", name: "Email Marketing", dependencies: [4, 8, 9, 12], useWebSearch: false },
  18: { key: "tab_18_landing_pages", name: "Landing Pages", dependencies: [7, 8, 9, 5], useWebSearch: false },
  19: { key: "tab_19_launch_strategy", name: "Estrategia de Lanzamiento", dependencies: [7, 9, 14, 15], useWebSearch: false },
  20: { key: "tab_20_metrics", name: "KPIs y Métricas", dependencies: [14, 15, 16, 19], useWebSearch: false },
  21: { key: "tab_21_organic_content", name: "Contenido Orgánico", dependencies: [7, 11, 13], useWebSearch: true },
  22: { key: "tab_22_executive_summary", name: "Resumen Ejecutivo", dependencies: [1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21], useWebSearch: false },
};

// ─── Build Master Context ────────────────────────────────────────────────────

export async function buildMasterContext(
  supabase: any,
  params: {
    product_dna_id: string;
    client_dna_id?: string;
    include_social_intelligence: boolean;
    include_ad_intelligence: boolean;
  }
): Promise<MasterContext> {
  // 1. Cargar Product DNA completo
  const { data: productDna, error: pdError } = await supabase
    .from("product_dna")
    .select("*")
    .eq("id", params.product_dna_id)
    .single();

  if (pdError || !productDna) {
    throw new Error(`Product DNA no encontrado: ${pdError?.message}`);
  }

  // Extraer respuestas del wizard
  const wizardResponses = productDna.wizard_responses || {};

  // Construir contexto del producto
  const productContext: MasterContext["product"] = {
    name: wizardResponses.product_name || wizardResponses.name || "Producto sin nombre",
    description: wizardResponses.product_description || wizardResponses.description || "",
    service_types: productDna.service_types || [],
    goal: wizardResponses.goal || wizardResponses.objective || "",
    platforms: wizardResponses.platforms || [],
    audience_ages: wizardResponses.audience_ages || [],
    urgency: wizardResponses.urgency || "flexible",
    locations: wizardResponses.locations || [],
    links: {
      product: productDna.reference_links?.map((l: any) => l.url) || [],
      competitors: productDna.competitor_links?.map((l: any) => l.url || l) || [],
      inspiration: productDna.inspiration_links?.map((l: any) => l.url || l) || [],
    },
    user_responses: {
      q1_product: wizardResponses.q1_product || productDna.transcription || "",
      q2_ideal_client: wizardResponses.q2_ideal_client || "",
      q3_problem: wizardResponses.q3_problem || "",
      q4_transformation: wizardResponses.q4_transformation || "",
      q5_offer: wizardResponses.q5_offer || "",
    },
    emotional_analysis: productDna.emotional_analysis || null,
    basic_analysis: productDna.market_research
      ? {
          executive_summary: productDna.market_research?.executive_summary || "",
          market_analysis: productDna.market_research?.market_analysis || {},
          target_audience: productDna.market_research?.target_audience || {},
          creative_brief: productDna.content_brief || {},
          recommendations: productDna.strategy_recommendations || {},
          kiro_insights: productDna.market_research?.kiro_insights || [],
        }
      : null,
  };

  const context: MasterContext = { product: productContext };

  // 2. Cargar Client DNA si está disponible
  if (params.client_dna_id) {
    const { data: clientDna } = await supabase
      .from("client_dna")
      .select("*")
      .eq("id", params.client_dna_id)
      .single();

    if (clientDna?.dna_data) {
      context.brand = {
        business_identity: clientDna.dna_data.business_identity || {},
        value_proposition: clientDna.dna_data.value_proposition || {},
        ideal_customer: clientDna.dna_data.ideal_customer || {},
        flagship_offer: clientDna.dna_data.flagship_offer || {},
        brand_identity: clientDna.dna_data.brand_identity || {},
        visual_identity: clientDna.dna_data.visual_identity || {},
        marketing_strategy: clientDna.dna_data.marketing_strategy || {},
        ads_targeting: clientDna.dna_data.ads_targeting || {},
        user_responses: {
          q1_negocio: clientDna.transcription || "",
          q2_cliente: "",
          q3_problema: "",
          q4_solucion: "",
          q5_oferta: "",
          q6_canales: "",
          q7_dudas: "",
        },
      };
    }
  }

  // 3. Cargar Social Intelligence si está disponible
  if (params.include_social_intelligence && productDna.social_intelligence) {
    context.social = {
      pain_phrases: productDna.social_intelligence.pain_phrases || [],
      desire_phrases: productDna.social_intelligence.desire_phrases || [],
      real_objections: productDna.social_intelligence.real_objections || [],
      common_vocabulary: productDna.social_intelligence.common_vocabulary || [],
      recommendation_reasons: productDna.social_intelligence.recommendation_reasons || [],
      complaint_reasons: productDna.social_intelligence.complaint_reasons || [],
    };
  }

  // 4. Cargar Ad Intelligence si está disponible
  if (params.include_ad_intelligence && productDna.ad_intelligence) {
    context.ads = {
      meta_ads: productDna.ad_intelligence.meta_ads || {},
      tiktok_ads: productDna.ad_intelligence.tiktok_ads || {},
      competitor_social: productDna.ad_intelligence.competitor_social || [],
    };
  }

  return context;
}

// ─── Helper: Get Dependencies Data ───────────────────────────────────────────

export function getDependenciesData(
  stepNumber: number,
  previousResults: Record<string, any>
): Record<string, any> {
  const config = STEP_CONFIGS[stepNumber];
  const deps: Record<string, any> = {};

  for (const depStep of config.dependencies) {
    const depKey = STEP_CONFIGS[depStep].key;
    if (previousResults[depKey]) {
      deps[depKey] = previousResults[depKey];
    }
  }

  return deps;
}
