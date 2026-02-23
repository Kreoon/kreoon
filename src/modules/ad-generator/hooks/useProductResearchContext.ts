import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { parseProductResearch, formatResearchForPrompt, type ParsedResearchData } from '@/lib/productResearchParser';

/**
 * Full Brand DNA passed to the ad generation edge function.
 * All 8 sections from client_dna.dna_data are included.
 */
export interface BrandDNA {
  // ── Section 1: Business Identity ──
  business_identity?: {
    name?: string;
    industry?: string;
    sub_industry?: string;
    description?: string;
    business_model?: string;
    years_in_market?: string;
    competitive_landscape?: string;
    origin_story?: string;
    mission?: string;
    unique_factor?: string;
  };
  // ── Section 2: Value Proposition ──
  value_proposition?: {
    main_usp?: string;
    differentiators?: string[];
    proof_points?: string[];
    brand_promise?: string;
    main_problem_solved?: string;
    solution_description?: string;
    key_benefits?: string[];
    transformation_promise?: string;
  };
  // ── Section 3: Ideal Customer ──
  ideal_customer?: {
    demographic?: {
      age_range?: string;
      gender?: string;
      location?: string;
      income_level?: string;
      occupation?: string;
    };
    psychographic?: {
      values?: string[];
      interests?: string[];
      personality_traits?: string[];
      lifestyle?: string;
    };
    pain_points?: string[];
    desires?: string[];
    objections?: string[];
    buying_triggers?: string[];
  };
  // ── Section 4: Flagship Offer ──
  flagship_offer?: {
    name?: string;
    description?: string;
    price_range?: string;
    main_benefit?: string;
    funnel_role?: string;
    price?: string;
    price_justification?: string;
    included_features?: string[];
    guarantees?: string[];
    urgency_elements?: string[];
  };
  // ── Section 5: Brand Identity ──
  brand_identity?: {
    brand_archetype?: string;
    personality_traits?: string[];
    tone_of_voice?: string;
    communication_style?: string;
    tagline_suggestions?: string[];
    key_messages?: string[];
    voice?: {
      tone?: string[];
      do_say?: string[];
      dont_say?: string[];
    };
    messaging?: {
      tagline?: string;
      elevator_pitch?: string;
      key_messages?: string[];
    };
  };
  // ── Section 6: Visual Identity ──
  visual_identity?: {
    primary_colors?: string[];
    secondary_colors?: string[];
    color_psychology?: string;
    typography_style?: string;
    imagery_style?: string;
    mood_keywords?: string[];
    brand_colors?: string[];
    color_meaning?: string;
    visual_style?: string[];
    content_themes?: string[];
    photography_style?: string;
    mood?: string;
  };
  // ── Section 7: Marketing Strategy ──
  marketing_strategy?: {
    content_pillars?: Array<{ name?: string; description?: string }>;
    content_formats?: string[];
    engagement_tactics?: string[];
    hashtag_strategy?: string[];
    primary_objective?: string;
    main_cta?: string;
    funnel_strategy?: string;
  };
  // ── Section 8: Ads Targeting ──
  ads_targeting?: {
    meta_targeting?: {
      interests?: string[];
      behaviors?: string[];
      demographics?: string[];
    };
    hook_suggestions?: string[];
    ad_copy_angles?: Array<{ angle_name?: string; headline?: string; body?: string; cta?: string }> | string[];
    interests?: string[];
    behaviors?: string[];
    keywords_google?: string[];
    hashtags?: string[];
  };
}

export function useProductResearchContext(crmProductId: string | null, clientId: string | null) {
  // Fetch CRM product research data
  const { data: productData, isLoading: loadingProduct } = useQuery({
    queryKey: ['crm-product-research', crmProductId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('market_research, avatar_profiles, sales_angles, sales_angles_data, competitor_analysis, brief_data, research_generated_at')
        .eq('id', crmProductId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!crmProductId,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch client DNA data
  const { data: dnaData, isLoading: loadingDNA } = useQuery({
    queryKey: ['client-dna-for-ads', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_dna')
        .select('dna_data')
        .eq('client_id', clientId!)
        .eq('is_active', true)
        .order('version', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data?.dna_data as Record<string, unknown> | null;
    },
    enabled: !!clientId,
    staleTime: 5 * 60 * 1000,
  });

  // Parse and format research context
  let researchContext: string | undefined;
  let parsedResearch: ParsedResearchData | undefined;
  let hasResearch = false;

  if (productData?.research_generated_at) {
    const parsed = parseProductResearch(productData as any);
    const formatted = formatResearchForPrompt(parsed);
    if (formatted.trim()) {
      researchContext = formatted;
      parsedResearch = parsed;
      hasResearch = true;
    }
  }

  // Extract ALL 8 brand DNA sections (pass everything to the edge function)
  let brandDNA: BrandDNA | undefined;
  let hasDNA = false;

  if (dnaData) {
    hasDNA = true;
    brandDNA = {
      business_identity: (dnaData.business_identity || dnaData.identidad_negocio) as BrandDNA['business_identity'],
      value_proposition: (dnaData.value_proposition || dnaData.propuesta_valor) as BrandDNA['value_proposition'],
      ideal_customer: (dnaData.ideal_customer || dnaData.cliente_ideal) as BrandDNA['ideal_customer'],
      flagship_offer: (dnaData.flagship_offer || dnaData.oferta_estrella) as BrandDNA['flagship_offer'],
      brand_identity: (dnaData.brand_identity || dnaData.identidad_marca) as BrandDNA['brand_identity'],
      visual_identity: (dnaData.visual_identity || dnaData.identidad_visual) as BrandDNA['visual_identity'],
      marketing_strategy: (dnaData.marketing_strategy || dnaData.estrategia_marketing) as BrandDNA['marketing_strategy'],
      ads_targeting: (dnaData.ads_targeting || dnaData.segmentacion_publicitaria) as BrandDNA['ads_targeting'],
    };
  }

  return {
    researchContext,
    brandDNA,
    hasResearch,
    hasDNA,
    isLoading: loadingProduct || loadingDNA,
    parsedResearch,
  };
}
