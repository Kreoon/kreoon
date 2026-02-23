export type AdPlatform = "meta" | "tiktok" | "google";

export interface AdLibrarySearch {
  id: string;
  created_by: string;
  name: string;
  platform: AdPlatform;
  search_config: Record<string, any>;
  is_active: boolean;
  sync_interval_hours: number;
  last_synced_at: string | null;
  total_ads_found: number;
  created_at: string;
  updated_at: string;
}

export interface AdLibraryAd {
  id: string;
  search_id: string | null;
  platform: AdPlatform;
  platform_ad_id: string;
  page_id: string | null;
  page_name: string | null;
  ad_creative_bodies: string[];
  ad_creative_link_titles: string[];
  ad_creative_link_descriptions: string[];
  ad_snapshot_url: string | null;
  publisher_platforms: string[];
  languages: string[];
  media_type: string | null;
  ad_delivery_start: string | null;
  ad_delivery_stop: string | null;
  is_active: boolean;
  spend_lower: number | null;
  spend_upper: number | null;
  impressions_lower: number | null;
  impressions_upper: number | null;
  currency: string | null;
  raw_data: Record<string, any>;
  ai_analysis: AdAIAnalysis | null;
  ai_analyzed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdAIAnalysis {
  analysis: {
    hook_type?: string;
    hook_text?: string;
    cta_type?: string;
    emotion_primary?: string;
    format_notes?: string;
    target_audience?: string;
    strengths?: string[];
    weaknesses?: string[];
    effectiveness_score?: number;
    why_it_works?: string;
  };
  replicated: {
    versions?: Array<{
      title: string;
      body: string;
      cta: string;
      adaptation_notes: string;
    }>;
  };
  analyzed_at: string;
}

export interface AdLibraryCollection {
  id: string;
  created_by: string;
  name: string;
  description: string | null;
  color: string;
  created_at: string;
}

export interface AdLibraryCollectionItem {
  id: string;
  collection_id: string;
  ad_id: string;
  notes: string | null;
  created_at: string;
  ad?: AdLibraryAd;
}

export interface AdSearchFilters {
  platform: AdPlatform;
  search_terms?: string;
  page_ids?: string[];
  countries?: string[];
  date_min?: string;
  date_max?: string;
  media_type?: string;
  publisher_platforms?: string[];
  ad_active_status?: string;
  // TikTok-specific
  period?: number;
  country_code?: string;
  // Google-specific
  advertiser_id?: string;
  region?: string;
  format?: string;
  // Common
  limit?: number;
}

export interface AdSearchResult {
  ads_found: number;
  new_ads: number;
  updated_ads: number;
  ads: AdLibraryAd[];
}

export interface TokenStatus {
  meta: { configured: boolean; valid: boolean };
  tiktok: { configured: boolean; valid: boolean };
  google: { configured: boolean; valid: boolean };
}
