/**
 * ADN Research v3 - Types
 * Tipos para el sistema de research de 22 pasos
 */

// ─── Configuration ───────────────────────────────────────────────────────────

export interface AdnResearchV3Config {
  include_client_dna: boolean;
  include_social_intelligence: boolean;
  include_ad_intelligence: boolean;
  locations?: string[];
}

// ─── Session ─────────────────────────────────────────────────────────────────

export type AdnResearchV3Status =
  | "initializing"
  | "gathering_intelligence"
  | "researching"
  | "completed"
  | "error"
  | "cancelled";

export interface AdnResearchV3Session {
  id: string;
  product_id: string;
  product_dna_id: string | null;
  client_dna_id: string | null;
  organization_id: string;
  created_by: string | null;
  inputs_config: AdnResearchV3Config;
  status: AdnResearchV3Status;
  progress: AdnResearchV3Progress;
  current_step: number;
  total_steps: number;
  tokens_consumed: number;
  estimated_cost_usd: number;
  result_snapshot: any;
  error_message: string | null;
  error_details: any;
  started_at: string;
  intelligence_completed_at: string | null;
  research_completed_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdnResearchV3Progress {
  intelligence_gathering?: {
    status: "pending" | "running" | "completed" | "error";
    social_intelligence?: boolean;
    ad_intelligence?: boolean;
    competitors_analyzed?: number;
  };
  steps?: Array<{
    step: number;
    name: string;
    status: "pending" | "running" | "completed" | "error";
    tokens_used?: number;
    updated_at?: string;
  }>;
  started_at?: string;
}

// ─── Result ──────────────────────────────────────────────────────────────────

export interface AdnResearchV3Result {
  version: 3;
  generated_at: string;
  tabs: {
    tab_1_market_overview?: Tab1MarketOverview;
    tab_2_competition?: Tab2Competition;
    tab_3_jtbd?: Tab3JTBD;
    tab_4_avatars?: Tab4Avatars;
    tab_5_psychology?: Tab5Psychology;
    tab_6_neuromarketing?: Tab6Neuromarketing;
    tab_7_positioning?: Tab7Positioning;
    tab_8_copywriting?: Tab8Copywriting;
    tab_9_puv_offer?: Tab9PUVOffer;
    tab_10_video_creatives?: Tab10VideoCreatives;
    tab_11_content_calendar?: Tab11ContentCalendar;
    tab_12_lead_magnets?: Tab12LeadMagnets;
    tab_13_social_media?: Tab13SocialMedia;
    tab_14_meta_ads?: Tab14MetaAds;
    tab_15_tiktok_ads?: Tab15TikTokAds;
    tab_16_google_ads?: Tab16GoogleAds;
    tab_17_email_marketing?: Tab17EmailMarketing;
    tab_18_landing_pages?: Tab18LandingPages;
    tab_19_launch_strategy?: Tab19LaunchStrategy;
    tab_20_metrics?: Tab20Metrics;
    tab_21_organic_content?: Tab21OrganicContent;
    tab_22_executive_summary?: Tab22ExecutiveSummary;
  };
  metadata: {
    inputs_used: AdnResearchV3Config;
    ai_providers: string[];
    tokens_consumed: number;
  };
}

// ─── Tab Types ───────────────────────────────────────────────────────────────

export interface Tab1MarketOverview {
  data: {
    market_size: {
      tam: string;
      sam_latam: string;
      som_year1: string;
      som_year3: string;
    };
    market_state: string;
    cagr: string;
    adoption_stage: string;
    consumer_behavior: {
      how_they_search: string;
      preferred_channels: string[];
      preferred_formats: string[];
      average_ticket_latam: string;
      purchase_cycle_days: number;
      seasonality: string;
      latam_cultural_barriers: string[];
    };
    awareness_level: string;
    awareness_implication: string;
    macro_variables: Array<{ factor: string; impact: string; description: string }>;
    opportunities: Array<{ opportunity: string; impact: string; time_window: string }>;
    threats: Array<{ threat: string; probability: string; urgency: string }>;
    category_design: {
      existing_category: string | null;
      new_category_suggestion: string;
      category_pov: string;
    };
    summary: string;
  };
  generated_at: string;
  tokens_used: number;
}

export interface Tab2Competition {
  data: {
    market_type: string;
    competitive_position_available: string;
    direct_competitors: Array<{
      name: string;
      url: string;
      price_range: string;
      declared_positioning: string;
      main_message: string;
      strengths: string[];
      exploitable_weaknesses: string[];
      content_strategy: string;
      acquisition_channels: string[];
      ugc_usage: string;
      unfulfilled_promise: string;
      negative_reviews_themes: string[];
    }>;
    indirect_competitors: Array<{ name: string; threat_level: string; why_chosen: string }>;
    substitutes: Array<{ solution: string; why_used: string; weakness: string }>;
    competitive_gaps: Array<{ type: string; gap: string; opportunity: string }>;
    content_benchmarks: {
      dominant_hooks: string[];
      dominant_formats: string[];
      dominant_emotional_angles: string[];
      fatigued_creatives: string[];
      untested_opportunities: string[];
    };
    review_sentiment: {
      what_market_values: string[];
      what_market_complains_about: string[];
      vocabulary_of_praise: string[];
      vocabulary_of_complaint: string[];
    };
  };
  generated_at: string;
  tokens_used: number;
}

export interface Tab3JTBD {
  data: {
    primary_jtbd: {
      job_statement: string;
      functional_job: string;
      emotional_job: string;
      social_job: string;
    };
    secondary_jtbds: Array<{ job_statement: string; importance: string }>;
    hiring_criteria: {
      must_haves: string[];
      nice_to_haves: string[];
      deal_breakers: string[];
    };
    progress_forces: {
      push_of_situation: string[];
      pull_of_new_solution: string[];
      anxiety_of_new_solution: string[];
      habit_of_present: string[];
    };
    switch_triggers: Array<{ trigger: string; timing: string; opportunity: string }>;
    consumption_chain: {
      awareness: string;
      consideration: string;
      decision: string;
      use: string;
      post_use: string;
    };
  };
  generated_at: string;
  tokens_used: number;
}

export interface Tab4Avatars {
  data: {
    primary_avatar: AvatarProfile;
    secondary_avatar: AvatarProfile;
    tertiary_avatar: AvatarProfile;
    anti_avatar: {
      description: string;
      why_not: string[];
      red_flags: string[];
    };
  };
  generated_at: string;
  tokens_used: number;
}

export interface AvatarProfile {
  name: string;
  age: number;
  occupation: string;
  income_level: string;
  location: string;
  family_status: string;
  day_in_life: string;
  frustrations: string[];
  goals: string[];
  values: string[];
  media_consumption: {
    platforms: string[];
    content_types: string[];
    influencers: string[];
  };
  purchase_behavior: {
    decision_process: string;
    price_sensitivity: string;
    triggers: string[];
  };
  objections: string[];
  quote: string;
}

export interface Tab5Psychology {
  data: {
    pain_map: {
      functional_pains: Array<{ pain: string; intensity: number; frequency: string; trigger: string }>;
      emotional_pains: Array<{ emotion: string; what_causes_it: string; peak_moment: string }>;
      social_pains: Array<{ fear: string }>;
      root_pain: string;
    };
    desire_map: {
      functional_desires: Array<{ desire: string; urgency: number; blocker: string }>;
      emotional_desires: Array<{ state: string; intensity: number; delivery: string }>;
      aspirational_desires: Array<{ aspiration: string }>;
      deep_desire: string;
    };
    cialdini_principles: {
      reciprocity: { what_to_give_first: string; implementation: string };
      commitment: { micro_commitment: string; how_to_escalate: string };
      social_proof: { most_powerful_type: string; implementation: string };
      authority: { how_to_build: string; signals_to_use: string[] };
      scarcity: { type: string; how_to_communicate: string };
      liking: { what_creates_affinity: string; brand_similarity: string };
    };
    cognitive_biases: Array<{
      bias: string;
      description: string;
      how_to_use: string;
      copy_example: string;
    }>;
    objections_bank: Array<{
      objection: string;
      source: string;
      type: string;
      underlying_emotion: string;
      handling_technique: string;
      sales_response: string;
      content_to_neutralize: string;
    }>;
    client_vocabulary: {
      pain_headlines: string[];
      search_phrases: string[];
      result_phrases: string[];
      recommendation_phrases: string[];
      words_to_avoid: string[];
    };
  };
  generated_at: string;
  tokens_used: number;
}

export interface Tab6Neuromarketing {
  data: any; // Estructura completa en el prompt
  generated_at: string;
  tokens_used: number;
}

export interface Tab7Positioning {
  data: {
    current_positioning_diagnosis: {
      current_category: string;
      positioning_problem: string;
      description: string;
    };
    puv: {
      statement: string;
      positioning_statement: string;
      ownable_word: string;
      differentiation_axes: Array<{
        axis: string;
        our_position: string;
        competitor_position: string;
        strength: string;
      }>;
    };
    brand_archetype: {
      primary: string;
      justification: string;
      secondary: string;
      shadow_to_avoid: string;
      communication_tone: string[];
      global_brand_examples: string[];
    };
    purple_cow: {
      remarkable_factor: string;
      word_of_mouth_trigger: string;
      how_to_amplify: string;
    };
    category_design: {
      new_category_name: string;
      category_pov: string;
      why_existing_solutions_fail: string;
    };
    esfera_framework: {
      enganchar: any;
      solucion: any;
      fidelizar: any;
      remarketing: any;
    };
  };
  generated_at: string;
  tokens_used: number;
}

export interface Tab8Copywriting {
  data: {
    angles: Array<{
      angle_name: string;
      description: string;
      emotion: string;
      best_for: string;
      hook_examples: string[];
      headline_examples: string[];
      body_copy_example: string;
    }>;
    frameworks_applied: {
      pas: { problem: string; agitate: string; solve: string; full_copy: string };
      aida: { attention: string; interest: string; desire: string; action: string; full_copy: string };
      bab: { before: string; after: string; bridge: string; full_copy: string };
      four_ps: { promise: string; picture: string; proof: string; push: string; full_copy: string };
    };
    hooks_bank: {
      curiosity_hooks: string[];
      pain_hooks: string[];
      desire_hooks: string[];
      social_proof_hooks: string[];
      controversial_hooks: string[];
    };
    headlines_bank: {
      benefit_headlines: string[];
      how_to_headlines: string[];
      number_headlines: string[];
      question_headlines: string[];
    };
    ctas_bank: {
      urgency_ctas: string[];
      value_ctas: string[];
      curiosity_ctas: string[];
      fear_of_loss_ctas: string[];
      social_ctas: string[];
    };
  };
  generated_at: string;
  tokens_used: number;
}

export interface Tab9PUVOffer {
  data: any;
  generated_at: string;
  tokens_used: number;
}

export interface Tab10VideoCreatives {
  data: any;
  generated_at: string;
  tokens_used: number;
}

export interface Tab11ContentCalendar {
  data: {
    strategy: {
      posting_frequency: Record<string, number>;
      best_times: Record<string, string[]>;
      content_pillars: string[];
    };
    calendar: Array<{
      day: number;
      date: string;
      platform: string;
      format: string;
      pillar: string;
      esfera_stage: string;
      hook: string;
      caption: string;
      cta: string;
      hashtags: string[];
      production_notes: string;
    }>;
  };
  generated_at: string;
  tokens_used: number;
}

export interface Tab12LeadMagnets {
  data: any;
  generated_at: string;
  tokens_used: number;
}

export interface Tab13SocialMedia {
  data: any;
  generated_at: string;
  tokens_used: number;
}

export interface Tab14MetaAds {
  data: {
    campaign_architecture: {
      tofu_campaign: any;
      mofu_campaign: any;
      bofu_campaign: any;
    };
    cold_audiences: Array<{
      name: string;
      targeting: {
        interests: string[];
        behaviors: string[];
        demographics: any;
      };
      estimated_reach: string;
    }>;
    retargeting_audiences: Array<{
      name: string;
      source: string;
      window_days: number;
      message_focus: string;
    }>;
    ad_copies: Array<{
      audience: string;
      primary_text: string;
      headline: string;
      description: string;
      cta_button: string;
    }>;
    budget_recommendation: {
      daily_budget: string;
      monthly_budget: string;
      testing_budget: string;
      scaling_triggers: string[];
    };
    pixel_events: string[];
  };
  generated_at: string;
  tokens_used: number;
}

export interface Tab15TikTokAds {
  data: any;
  generated_at: string;
  tokens_used: number;
}

export interface Tab16GoogleAds {
  data: any;
  generated_at: string;
  tokens_used: number;
}

export interface Tab17EmailMarketing {
  data: any;
  generated_at: string;
  tokens_used: number;
}

export interface Tab18LandingPages {
  data: any;
  generated_at: string;
  tokens_used: number;
}

export interface Tab19LaunchStrategy {
  data: any;
  generated_at: string;
  tokens_used: number;
}

export interface Tab20Metrics {
  data: any;
  generated_at: string;
  tokens_used: number;
}

export interface Tab21OrganicContent {
  data: any;
  generated_at: string;
  tokens_used: number;
}

export interface Tab22ExecutiveSummary {
  data: {
    executive_summary: {
      opportunity: string;
      positioning: string;
      strategy: string;
      execution: string;
      metrics: string;
    };
    opportunity_score: {
      market_attractiveness: number;
      competitive_advantage: number;
      execution_feasibility: number;
      overall_score: number;
      justification: string;
    };
    emotional_analysis_insights: {
      founder_confidence: string;
      passion_areas: string[];
      concern_areas: string[];
      recommendation: string;
    };
    brand_coherence: {
      alignment_score: number;
      aligned_elements: string[];
      misaligned_elements: string[];
      recommendations: string[];
    };
    kiro_insights: string[];
    action_plan_90_days: Array<{
      week: string;
      focus: string;
      actions: string[];
      deliverables: string[];
    }>;
  };
  generated_at: string;
  tokens_used: number;
}

// ─── Tab Info ────────────────────────────────────────────────────────────────

export const TAB_INFO: Record<string, { name: string; icon: string; block: number }> = {
  tab_1_market_overview: { name: "Panorama de Mercado", icon: "TrendingUp", block: 1 },
  tab_2_competition: { name: "Competencia", icon: "Users", block: 1 },
  tab_3_jtbd: { name: "Jobs To Be Done", icon: "Target", block: 1 },
  tab_4_avatars: { name: "Avatares", icon: "User", block: 2 },
  tab_5_psychology: { name: "Psicología", icon: "Brain", block: 2 },
  tab_6_neuromarketing: { name: "Neuromarketing", icon: "Zap", block: 2 },
  tab_7_positioning: { name: "Posicionamiento", icon: "Compass", block: 3 },
  tab_8_copywriting: { name: "Copywriting", icon: "PenTool", block: 3 },
  tab_9_puv_offer: { name: "Oferta", icon: "Gift", block: 3 },
  tab_10_video_creatives: { name: "Creativos", icon: "Video", block: 4 },
  tab_11_content_calendar: { name: "Calendario", icon: "Calendar", block: 4 },
  tab_12_lead_magnets: { name: "Lead Magnets", icon: "Magnet", block: 4 },
  tab_13_social_media: { name: "Redes Sociales", icon: "Share2", block: 5 },
  tab_14_meta_ads: { name: "Meta Ads", icon: "Facebook", block: 5 },
  tab_15_tiktok_ads: { name: "TikTok Ads", icon: "Music", block: 5 },
  tab_16_google_ads: { name: "Google Ads", icon: "Search", block: 5 },
  tab_17_email_marketing: { name: "Email", icon: "Mail", block: 5 },
  tab_18_landing_pages: { name: "Landing Pages", icon: "Layout", block: 5 },
  tab_19_launch_strategy: { name: "Lanzamiento", icon: "Rocket", block: 6 },
  tab_20_metrics: { name: "KPIs", icon: "BarChart2", block: 6 },
  tab_21_organic_content: { name: "Orgánico", icon: "Leaf", block: 6 },
  tab_22_executive_summary: { name: "Resumen", icon: "FileText", block: 6 },
};

export const BLOCK_INFO: Record<number, { name: string; color: string }> = {
  1: { name: "Inteligencia de Mercado", color: "blue" },
  2: { name: "Psicología del Cliente", color: "purple" },
  3: { name: "Estrategia", color: "green" },
  4: { name: "Contenido", color: "orange" },
  5: { name: "Canales y Publicidad", color: "red" },
  6: { name: "Síntesis", color: "pink" },
};
