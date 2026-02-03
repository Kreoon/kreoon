/**
 * Tipos de salida para acciones de portfolio-ai.
 * Los prompts están centralizados en supabase/functions/_shared/portfolio-prompts.ts
 */

export interface PortfolioSearchResult {
  entities: Array<{ type: string; value: string; confidence: number }>;
  keywords: string[];
  location?: string | null;
  categories: string[];
  skills?: string[];
  filters?: {
    location?: string;
    specialty?: string;
    min_followers?: number;
    max_followers?: number;
    min_engagement?: number;
  };
  expanded_query?: string;
  suggestions?: string[];
}

export interface PortfolioBioResult {
  improved_bio: string;
  key_changes: string[];
  seo_keywords?: string[];
  tone_analysis?: { detected: string; recommended: string };
  character_count?: number;
}

export interface PortfolioCaptionResult {
  captions: Array<{
    text: string;
    hashtags: string[];
    platform?: string;
    hook_type?: string;
  }>;
  best_posting_times?: string;
  engagement_prediction?: "low" | "medium" | "high";
}

export interface PortfolioBlocksResult {
  suggested_blocks: Array<{
    block_key: string;
    title: string;
    reason: string;
    priority: number;
    description?: string;
    content_suggestion?: string;
  }>;
  profile_completeness?: number;
  improvement_potential?: number;
}

export interface PortfolioModerationResult {
  is_flagged: boolean;
  severity: "none" | "low" | "medium" | "high" | "critical";
  categories?: string[];
  reasoning?: string;
  suggested_action?: "approve" | "review" | "hide" | "remove";
  reasons?: string[];
  action_recommended?: string;
  confidence?: number;
}

export interface PortfolioRecommendationsResult {
  creator_recommendations?: Array<{
    reason: string;
    match_score?: number;
  }>;
  content_recommendations?: Array<{
    reason: string;
    match_score?: number;
  }>;
}

export type PortfolioAIAction =
  | "search"
  | "caption"
  | "bio"
  | "recommendations"
  | "moderation"
  | "blocks";
