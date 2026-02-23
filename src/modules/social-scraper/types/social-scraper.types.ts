export type SocialPlatform = "instagram" | "tiktok" | "facebook" | "youtube" | "twitter";
export type TargetType = "profile" | "hashtag" | "keyword";
export type ContentType = "post" | "reel" | "carousel" | "video" | "short" | "tweet" | "retweet" | "quote" | "story";

export interface ScrapeTarget {
  id: string;
  created_by: string;
  platform: SocialPlatform;
  target_type: TargetType;
  target_value: string;
  display_name: string | null;
  is_active: boolean;
  sync_interval_hours: number;
  last_synced_at: string | null;
  total_items_found: number;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface ScrapeItem {
  id: string;
  target_id: string | null;
  platform: SocialPlatform;
  platform_item_id: string;
  author_username: string | null;
  author_name: string | null;
  content_type: ContentType | string;
  text_content: string | null;
  media_url: string | null;
  thumbnail_url: string | null;
  permalink: string | null;
  hashtags: string[];
  mentions: string[];
  likes: number;
  comments: number;
  shares: number;
  views: number;
  saves: number;
  engagement_rate: number | null;
  published_at: string | null;
  raw_data: Record<string, any>;
  ai_analysis: ContentAIAnalysis | null;
  ai_analyzed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContentAIAnalysis {
  virality_score?: number;
  content_pillars?: string[];
  hook_type?: string;
  hook_text?: string;
  format_notes?: string;
  target_audience?: string;
  why_it_works?: string;
  improvement_suggestions?: string[];
  best_posting_time?: string;
  replication_ideas?: string[];
}

export interface ScrapeFilters {
  platform: SocialPlatform;
  target_type: TargetType;
  target_value: string;
  limit?: number;
}

export interface ScrapeResult {
  items_found: number;
  saved: number;
  errors: number;
  items: ScrapeItem[];
}
