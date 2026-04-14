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

// ─── Error Details ──────────────────────────────────────────────────────────

export interface AdnResearchV3ErrorDetails {
  step?: number;
  step_name?: string;
  error_type?: string;
  error_code?: string;
  provider?: string;
  retry_count?: number;
  stack_trace?: string;
  timestamp?: string;
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
  result_snapshot: AdnResearchV3Result | null;
  error_message: string | null;
  error_details: AdnResearchV3ErrorDetails | null;
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

export interface Tab6NeuromarketingData {
  cognitive_biases: Array<{
    bias: string;
    how_to_activate: string;
    copy_example: string;
    visual_recommendation: string;
  }>;
  decision_architecture: {
    default_option: string;
    decoy_strategy: string;
    choice_architecture: string;
    friction_points_to_remove: string[];
  };
  sensory_triggers: {
    visual: string[];
    auditory: string[];
    kinesthetic: string[];
    dominant_sense: string;
  };
  memory_rules: {
    peak_end_rule: { peak_moment: string; end_moment: string };
    primacy_recency: { first_impression: string; last_impression: string };
    chunking_strategy: string;
  };
  pricing_psychology: {
    anchor_price: string;
    charm_pricing: boolean;
    payment_framing: string;
    value_perception_tactics: string[];
  };
  neuro_copywriting: {
    power_words: string[];
    sensory_language: string[];
    rhythm_patterns: string;
    headline_formulas: string[];
  };
}

export interface Tab6Neuromarketing {
  data: Tab6NeuromarketingData;
  generated_at: string;
  tokens_used: number;
}

export interface EsferaStage {
  objective: string;
  key_message: string;
  content_types: string[];
  channels: string[];
  metrics: string[];
  tactics: string[];
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
      enganchar: EsferaStage;
      solucion: EsferaStage;
      fidelizar: EsferaStage;
      remarketing: EsferaStage;
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

export interface Tab9PUVOfferData {
  value_stack: {
    core_offer: { name: string; value: string; description: string };
    bonuses: Array<{ name: string; value: string; why_included: string }>;
    total_value: string;
  };
  guarantees: {
    primary_guarantee: { type: string; duration: string; conditions: string };
    risk_reversal_messaging: string;
  };
  pricing_strategy: {
    price_point: string;
    payment_options: string[];
    price_justification: string;
    tiers?: Array<{ name: string; price: string; features: string[] }>;
  };
  scarcity_urgency: {
    scarcity_type: string;
    urgency_trigger: string;
    deadline_strategy: string;
  };
  offer_comparison: {
    vs_competitors: Array<{ competitor: string; their_offer: string; our_advantage: string }>;
    vs_alternatives: Array<{ alternative: string; why_inferior: string }>;
  };
  irresistible_offer_statement: string;
}

export interface Tab9PUVOffer {
  data: Tab9PUVOfferData;
  generated_at: string;
  tokens_used: number;
}

export interface VideoCreativeScript {
  format: string;
  duration_seconds: number;
  platform: string;
  objective: string;
  hook: { text: string; visual: string; duration: string };
  body: Array<{ timestamp: string; script: string; visual: string; text_overlay?: string }>;
  cta: { text: string; visual: string };
  music_style: string;
  editing_notes: string;
}

export interface Tab10VideoCreativesData {
  ugc_scripts: VideoCreativeScript[];
  talking_head_scripts: VideoCreativeScript[];
  broll_scripts: VideoCreativeScript[];
  hooks_bank: {
    curiosity: string[];
    pain: string[];
    transformation: string[];
    social_proof: string[];
    controversy: string[];
  };
  visual_guidelines: {
    color_palette: string[];
    typography_style: string;
    transition_style: string;
    thumbnail_templates: string[];
  };
}

export interface Tab10VideoCreatives {
  data: Tab10VideoCreativesData;
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

export interface LeadMagnetConcept {
  type: string;
  title: string;
  description: string;
  target_avatar: string;
  problem_solved: string;
  format: string;
  estimated_conversion_rate: string;
  production_effort: string;
}

export interface Tab12LeadMagnetsData {
  funnel_strategy: {
    awareness_magnets: LeadMagnetConcept[];
    consideration_magnets: LeadMagnetConcept[];
    decision_magnets: LeadMagnetConcept[];
  };
  primary_lead_magnet: {
    concept: LeadMagnetConcept;
    outline: string[];
    landing_page_headline: string;
    delivery_sequence: string[];
  };
  challenge_concept: {
    name: string;
    duration_days: number;
    daily_structure: Array<{ day: number; topic: string; deliverable: string }>;
    conversion_mechanism: string;
  };
  distribution_strategy: {
    organic_channels: string[];
    paid_channels: string[];
    partner_opportunities: string[];
  };
}

export interface Tab12LeadMagnets {
  data: Tab12LeadMagnetsData;
  generated_at: string;
  tokens_used: number;
}

export interface PlatformStrategy {
  platform: string;
  priority: 'primary' | 'secondary' | 'experimental';
  tone_of_voice: string;
  posting_frequency: string;
  best_times: string[];
  content_pillars: string[];
  engagement_tactics: string[];
  hashtag_strategy: string[];
  growth_tactics: string[];
}

export interface Tab13SocialMediaData {
  platform_strategies: PlatformStrategy[];
  content_pillars: Array<{
    pillar: string;
    percentage: number;
    content_types: string[];
    example_topics: string[];
  }>;
  influencer_strategy: {
    target_tiers: string[];
    collaboration_types: string[];
    outreach_approach: string;
    budget_allocation: string;
  };
  ugc_strategy: {
    incentives: string[];
    campaign_ideas: string[];
    rights_management: string;
  };
  community_building: {
    engagement_rituals: string[];
    user_recognition: string[];
    community_events: string[];
  };
  analytics_focus: string[];
}

export interface Tab13SocialMedia {
  data: Tab13SocialMediaData;
  generated_at: string;
  tokens_used: number;
}

export interface MetaAdsCampaign {
  objective: string;
  optimization_goal: string;
  audiences: string[];
  placements: string[];
  creative_types: string[];
  budget_split: string;
  kpis: string[];
}

export interface MetaAdsDemographics {
  age_range: string;
  genders: string[];
  locations: string[];
  languages: string[];
  education?: string[];
  relationship_status?: string[];
  job_titles?: string[];
}

export interface Tab14MetaAds {
  data: {
    campaign_architecture: {
      tofu_campaign: MetaAdsCampaign;
      mofu_campaign: MetaAdsCampaign;
      bofu_campaign: MetaAdsCampaign;
    };
    cold_audiences: Array<{
      name: string;
      targeting: {
        interests: string[];
        behaviors: string[];
        demographics: MetaAdsDemographics;
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

export interface TikTokAdCreative {
  format: string;
  hook_3s: string;
  script_outline: string[];
  cta: string;
  sound_recommendation: string;
  hashtags: string[];
}

export interface Tab15TikTokAdsData {
  campaign_strategy: {
    objective: string;
    funnel_stage: string;
    budget_recommendation: string;
    bidding_strategy: string;
  };
  audience_targeting: {
    interest_categories: string[];
    behaviors: string[];
    custom_audiences: string[];
    lookalike_strategy: string;
  };
  creatives: {
    spark_ads: TikTokAdCreative[];
    native_ads: TikTokAdCreative[];
    ugc_style_ads: TikTokAdCreative[];
  };
  viral_hooks: string[];
  hashtag_strategy: {
    branded: string[];
    trending: string[];
    niche: string[];
  };
  kpis: {
    awareness: string[];
    engagement: string[];
    conversion: string[];
  };
}

export interface Tab15TikTokAds {
  data: Tab15TikTokAdsData;
  generated_at: string;
  tokens_used: number;
}

export interface GoogleAdsCampaign {
  campaign_type: string;
  objective: string;
  targeting: Record<string, string[]>;
  ad_copy: Array<{ headline: string; description: string }>;
  budget: string;
}

export interface Tab16GoogleAdsData {
  keyword_strategy: {
    primary_keywords: Array<{ keyword: string; intent: string; volume: string; competition: string }>;
    long_tail_keywords: string[];
    negative_keywords: string[];
  };
  campaigns: {
    search: GoogleAdsCampaign;
    display: GoogleAdsCampaign;
    youtube: GoogleAdsCampaign;
    pmax: GoogleAdsCampaign;
  };
  bid_strategy: {
    recommended_strategy: string;
    target_cpa: string;
    target_roas: string;
  };
  campaign_structure: {
    account_hierarchy: string;
    ad_group_themes: string[];
    match_type_strategy: string;
  };
  conversion_tracking: {
    primary_conversion: string;
    micro_conversions: string[];
    attribution_model: string;
  };
  optimization_checklist: string[];
}

export interface Tab16GoogleAds {
  data: Tab16GoogleAdsData;
  generated_at: string;
  tokens_used: number;
}

export interface EmailSequenceEmail {
  day: number;
  subject_line: string;
  preview_text: string;
  purpose: string;
  key_content: string[];
  cta: string;
}

export interface Tab17EmailMarketingData {
  welcome_sequence: EmailSequenceEmail[];
  nurture_sequence: EmailSequenceEmail[];
  sales_sequence: EmailSequenceEmail[];
  post_purchase_sequence: EmailSequenceEmail[];
  broadcast_templates: Array<{
    type: string;
    subject_line_formula: string;
    content_structure: string[];
  }>;
  subject_line_formulas: {
    curiosity: string[];
    benefit: string[];
    urgency: string[];
    social_proof: string[];
  };
  segmentation_strategy: {
    segments: Array<{ name: string; criteria: string; content_focus: string }>;
    personalization_tactics: string[];
  };
  automation_triggers: Array<{
    trigger: string;
    action: string;
    timing: string;
  }>;
}

export interface Tab17EmailMarketing {
  data: Tab17EmailMarketingData;
  generated_at: string;
  tokens_used: number;
}

export interface LandingPageSection {
  section_name: string;
  purpose: string;
  headline: string;
  subheadline?: string;
  body_copy: string;
  cta?: string;
  visual_elements: string[];
}

export interface LandingPageDesign {
  style: string;
  description: string;
  sections: LandingPageSection[];
  color_scheme: string[];
  typography: { headline_font: string; body_font: string };
  cro_elements: string[];
}

export interface Tab18LandingPagesData {
  designs: {
    minimalist: LandingPageDesign;
    story_driven: LandingPageDesign;
  };
  above_the_fold: {
    headline_options: string[];
    subheadline_options: string[];
    hero_image_concept: string;
    primary_cta: string;
  };
  social_proof_section: {
    testimonial_format: string;
    logos_to_feature: string[];
    statistics_to_highlight: string[];
  };
  faq_section: Array<{ question: string; answer: string }>;
  cro_recommendations: string[];
}

export interface Tab18LandingPages {
  data: Tab18LandingPagesData;
  generated_at: string;
  tokens_used: number;
}

export interface LaunchPhase {
  phase_name: string;
  duration: string;
  objectives: string[];
  key_activities: string[];
  content_calendar: Array<{ day: number; content_type: string; topic: string; channel: string }>;
  milestones: string[];
}

export interface Tab19LaunchStrategyData {
  launch_type: string;
  pre_launch: LaunchPhase;
  launch: LaunchPhase;
  post_launch: LaunchPhase;
  launch_offers: {
    early_bird: { discount: string; deadline: string; messaging: string };
    founding_member: { benefits: string[]; limit: number };
    bonuses: Array<{ name: string; availability: string }>;
  };
  waitlist_strategy: {
    incentives: string[];
    engagement_sequence: string[];
    conversion_tactics: string[];
  };
  partner_strategy: {
    affiliate_program: { commission: string; terms: string };
    collaboration_opportunities: string[];
    influencer_launches: string[];
  };
  contingency_plans: Array<{ scenario: string; response: string }>;
  post_launch_optimization: {
    feedback_collection: string[];
    iteration_priorities: string[];
    scaling_triggers: string[];
  };
}

export interface Tab19LaunchStrategy {
  data: Tab19LaunchStrategyData;
  generated_at: string;
  tokens_used: number;
}

export interface MetricDefinition {
  name: string;
  description: string;
  formula: string;
  target: string;
  frequency: string;
}

export interface Tab20MetricsData {
  north_star_metric: {
    metric: string;
    definition: string;
    why_chosen: string;
    target: string;
  };
  primary_metrics: MetricDefinition[];
  funnel_metrics: {
    awareness: MetricDefinition[];
    consideration: MetricDefinition[];
    conversion: MetricDefinition[];
    retention: MetricDefinition[];
  };
  channel_metrics: Record<string, MetricDefinition[]>;
  cohort_analysis: {
    cohorts_to_track: string[];
    retention_benchmarks: Record<string, string>;
  };
  leading_indicators: MetricDefinition[];
  lagging_indicators: MetricDefinition[];
  dashboard_recommendations: {
    executive_dashboard: string[];
    marketing_dashboard: string[];
    sales_dashboard: string[];
  };
  alert_thresholds: Array<{ metric: string; warning_threshold: string; critical_threshold: string }>;
  reporting_cadence: {
    daily: string[];
    weekly: string[];
    monthly: string[];
  };
}

export interface Tab20Metrics {
  data: Tab20MetricsData;
  generated_at: string;
  tokens_used: number;
}

export interface BlogPost {
  title: string;
  target_keyword: string;
  search_intent: string;
  outline: string[];
  word_count: number;
  internal_links: string[];
}

export interface Tab21OrganicContentData {
  content_pillars: Array<{
    pillar: string;
    topics: string[];
    content_types: string[];
    seo_keywords: string[];
  }>;
  seo_strategy: {
    primary_keywords: Array<{ keyword: string; volume: string; difficulty: string; intent: string }>;
    content_gaps: string[];
    competitor_keywords: string[];
    featured_snippet_opportunities: string[];
  };
  blog_plan: {
    posting_frequency: string;
    content_calendar: BlogPost[];
    pillar_pages: string[];
    cluster_strategy: string;
  };
  youtube_strategy: {
    channel_positioning: string;
    content_series: string[];
    seo_tactics: string[];
    collaboration_opportunities: string[];
  };
  podcast_opportunity: {
    show_concept: string;
    episode_formats: string[];
    guest_strategy: string;
    distribution_channels: string[];
  };
  content_repurposing: {
    workflows: Array<{ source: string; derivatives: string[] }>;
    automation_opportunities: string[];
  };
  link_building: {
    strategies: string[];
    target_sites: string[];
    outreach_templates: string[];
  };
  measurement_framework: {
    content_kpis: string[];
    attribution_model: string;
    reporting_cadence: string;
  };
}

export interface Tab21OrganicContent {
  data: Tab21OrganicContentData;
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
