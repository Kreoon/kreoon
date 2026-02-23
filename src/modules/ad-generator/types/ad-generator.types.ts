export interface AdProduct {
  id: string;
  organization_id: string;
  created_by: string;
  name: string;
  description: string | null;
  product_images: string[];
  banners_count: number;
  created_at: string;
  updated_at: string;
  client_id: string | null;
  crm_product_id: string | null;
}

export interface AdTemplate {
  id: string;
  organization_id: string | null;
  created_by: string | null;
  name: string;
  category: string;
  thumbnail_url: string;
  template_url: string;
  output_width: number;
  output_height: number;
  tags: string[];
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

export interface GeneratedBanner {
  id: string;
  organization_id: string;
  product_id: string;
  created_by: string;
  reference_image_url: string | null;
  template_id: string | null;
  product_image_urls: string[];
  output_size: string;
  copy_language: string;
  customization: string | null;
  generated_image_url: string | null;
  generated_copy: string | null;
  ai_provider: string | null;
  ai_model: string | null;
  generation_time_ms: number | null;
  status: 'pending' | 'generating' | 'completed' | 'failed';
  error_message: string | null;
  created_at: string;
}

export type VisualStyle = 'professional' | 'minimal' | 'vibrant' | 'luxury' | 'organic' | 'custom';

export interface ResearchVariables {
  // Research fields
  selectedAvatar?: string;
  selectedAngleOrHook?: string;
  selectedPain?: string;
  selectedDesire?: string;
  selectedObjection?: string;
  selectedJTBD?: string;
  // DNA fields
  selectedArchetype?: string;
  selectedTone?: string;
  selectedKeyMessage?: string;
  selectedTagline?: string;
  selectedVisualStyle?: string;
  selectedBuyingTrigger?: string;
}

export interface GenerateBannerParams {
  organizationId: string;
  productId: string;
  userId: string;
  referenceImageUrl?: string;
  productImageUrls: string[];
  outputSize?: string;
  aspectRatio?: string;
  copyLanguage?: string;
  stylePreset?: VisualStyle;
  customization?: string;
  researchContext?: string;
  researchVariables?: ResearchVariables;
  brandDNA?: {
    visual_identity?: {
      primary_colors?: string[];
      imagery_style?: string;
      mood_keywords?: string[];
    };
    brand_identity?: {
      brand_archetype?: string;
      tone_of_voice?: string;
      key_messages?: string[];
    };
    value_proposition?: {
      main_usp?: string;
      brand_promise?: string;
    };
    ads_targeting?: {
      hook_suggestions?: string[];
      ad_copy_angles?: string[];
    };
  };
}

export type TemplateCategory =
  | 'all'
  | 'ecommerce'
  | 'fashion'
  | 'food'
  | 'tech'
  | 'beauty'
  | 'services'
  | 'infoproduct'
  | 'general';
