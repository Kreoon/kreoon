// =====================================================
// TIPOS PARA MODELO CERRADO + IA MATCHING
// =====================================================

// =====================================================
// INDUSTRIAS
// =====================================================

export type IndustryId =
  | 'beauty'
  | 'fashion'
  | 'tech'
  | 'food'
  | 'fitness'
  | 'home'
  | 'travel'
  | 'finance'
  | 'education'
  | 'entertainment'
  | 'health'
  | 'pets'
  | 'baby'
  | 'automotive'
  | 'services';

export interface Industry {
  id: IndustryId;
  name_es: string;
  name_en: string;
  icon: string;
  keywords: string[];
  parent_id?: string;
}

export const INDUSTRY_DATA: Record<IndustryId, Industry> = {
  beauty: { id: 'beauty', name_es: 'Belleza y Cuidado Personal', name_en: 'Beauty', icon: '💄', keywords: ['skincare', 'makeup', 'haircare'] },
  fashion: { id: 'fashion', name_es: 'Moda y Accesorios', name_en: 'Fashion', icon: '👗', keywords: ['clothing', 'style', 'accessories'] },
  tech: { id: 'tech', name_es: 'Tecnología', name_en: 'Technology', icon: '📱', keywords: ['apps', 'software', 'gadgets'] },
  food: { id: 'food', name_es: 'Alimentos y Bebidas', name_en: 'Food & Beverage', icon: '🍔', keywords: ['restaurants', 'recipes', 'drinks'] },
  fitness: { id: 'fitness', name_es: 'Fitness y Deportes', name_en: 'Fitness', icon: '💪', keywords: ['gym', 'workout', 'sports'] },
  home: { id: 'home', name_es: 'Hogar y Decoración', name_en: 'Home & Decor', icon: '🏠', keywords: ['furniture', 'decor', 'diy'] },
  travel: { id: 'travel', name_es: 'Viajes y Turismo', name_en: 'Travel', icon: '✈️', keywords: ['hotels', 'destinations', 'experiences'] },
  finance: { id: 'finance', name_es: 'Finanzas y Fintech', name_en: 'Finance', icon: '💰', keywords: ['banking', 'investment', 'crypto'] },
  education: { id: 'education', name_es: 'Educación', name_en: 'Education', icon: '📚', keywords: ['courses', 'learning', 'skills'] },
  entertainment: { id: 'entertainment', name_es: 'Entretenimiento', name_en: 'Entertainment', icon: '🎬', keywords: ['gaming', 'streaming', 'music'] },
  health: { id: 'health', name_es: 'Salud y Bienestar', name_en: 'Health', icon: '🏥', keywords: ['medical', 'wellness', 'supplements'] },
  pets: { id: 'pets', name_es: 'Mascotas', name_en: 'Pets', icon: '🐾', keywords: ['dogs', 'cats', 'pet care'] },
  baby: { id: 'baby', name_es: 'Bebés y Maternidad', name_en: 'Baby', icon: '👶', keywords: ['parenting', 'baby products', 'pregnancy'] },
  automotive: { id: 'automotive', name_es: 'Automotriz', name_en: 'Automotive', icon: '🚗', keywords: ['cars', 'motorcycles', 'accessories'] },
  services: { id: 'services', name_es: 'Servicios Profesionales', name_en: 'Services', icon: '💼', keywords: ['consulting', 'marketing', 'legal'] },
};

// =====================================================
// PERFIL DE EMPRESA/MARCA
// =====================================================

export type BudgetRange = 'low' | 'medium' | 'high';

export const BUDGET_RANGE_LABELS: Record<BudgetRange, string> = {
  low: 'Bajo (<$200)',
  medium: 'Medio ($200-$1000)',
  high: 'Alto (>$1000)',
};

export interface CompanyProfile {
  id: string;
  user_id: string;
  company_name: string;
  company_logo_url: string | null;
  industry: IndustryId;
  sub_industry: string | null;
  niche_tags: string[];
  company_description: string | null;
  target_audience: string | null;
  brand_voice: string | null;
  content_goals: string | null;
  preferred_content_types: string[];
  preferred_platforms: string[];
  typical_budget_range: BudgetRange | null;
  successful_creator_ids: string[];
  preferred_creator_styles: string[];
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface CompanyProfileInput {
  company_name: string;
  company_logo_url?: string;
  industry: IndustryId;
  sub_industry?: string;
  niche_tags?: string[];
  company_description?: string;
  target_audience?: string;
  brand_voice?: string;
  content_goals?: string;
  preferred_content_types?: string[];
  preferred_platforms?: string[];
  typical_budget_range?: BudgetRange;
  preferred_creator_styles?: string[];
}

// =====================================================
// PERFIL DE CREADOR EXTENDIDO
// =====================================================

export type ContentStyle =
  | 'minimalist'
  | 'energetic'
  | 'educational'
  | 'funny'
  | 'aesthetic'
  | 'authentic'
  | 'professional'
  | 'casual';

export const CONTENT_STYLE_LABELS: Record<ContentStyle, string> = {
  minimalist: 'Minimalista',
  energetic: 'Energético',
  educational: 'Educativo',
  funny: 'Divertido',
  aesthetic: 'Estético',
  authentic: 'Auténtico',
  professional: 'Profesional',
  casual: 'Casual',
};

export type AudienceAgeRange = '18-24' | '25-34' | '35-44' | '45-54' | '55+';
export type AudienceGender = 'mostly_female' | 'mostly_male' | 'balanced';

export interface CreatorProfileExtended {
  id: string;
  user_id: string;
  primary_category: IndustryId | null;
  secondary_categories: IndustryId[];
  specialization_tags: string[];
  content_style: ContentStyle[];
  brand_voice_description: string | null;
  audience_age_range: AudienceAgeRange | null;
  audience_gender: AudienceGender | null;
  audience_locations: string[];
  audience_interests: string[];
  avg_engagement_rate: number | null;
  content_quality_score: number | null;
  consistency_score: number | null;
  communication_score: number | null;
  strong_platforms: string[];
  industry_experience: Record<string, { projects: number; avg_rating: number }>;
  created_at: string;
  updated_at: string;
}

export interface CreatorProfileInput {
  primary_category?: IndustryId;
  secondary_categories?: IndustryId[];
  specialization_tags?: string[];
  content_style?: ContentStyle[];
  brand_voice_description?: string;
  audience_age_range?: AudienceAgeRange;
  audience_gender?: AudienceGender;
  audience_locations?: string[];
  audience_interests?: string[];
  strong_platforms?: string[];
}

// =====================================================
// IA MATCHING
// =====================================================

export interface MatchingCriteria {
  industry?: IndustryId;
  niche_tags?: string[];
  content_types?: string[];
  platforms?: string[];
  budget_range?: BudgetRange;
  min_rating?: number;
  content_styles?: ContentStyle[];
  audience_age?: AudienceAgeRange;
  audience_gender?: AudienceGender;
  limit?: number;
}

export interface CreatorMatch {
  creator_id: string;
  match_score: number;  // 0-100
  match_reasons: MatchReason[];
  creator: {
    id: string;
    full_name: string;
    username: string | null;
    avatar_url: string | null;
    bio: string | null;
    avg_rating: number | null;
    reviews_count: number;
    total_projects: number;
  };
  profile: {
    primary_category: IndustryId | null;
    content_style: ContentStyle[];
    industry_experience: Record<string, { projects: number; avg_rating: number }>;
  };
  top_service: {
    id: string;
    title: string;
    price_amount: number | null;
    price_type: string;
  } | null;
}

export interface MatchReason {
  type: 'industry' | 'style' | 'experience' | 'rating' | 'platform' | 'audience' | 'budget';
  label: string;
  score: number;  // Contribución al score total
}

export interface AIMatchingResponse {
  matches: CreatorMatch[];
  total_found: number;
  search_context: MatchingCriteria;
  ai_summary?: string;  // Resumen generado por IA
}

// =====================================================
// HISTORIAL DE MATCHES
// =====================================================

export interface MatchHistoryEntry {
  id: string;
  searcher_id: string;
  creator_id: string;
  match_score: number;
  match_reason: string;
  was_clicked: boolean;
  was_contacted: boolean;
  was_hired: boolean;
  final_rating: number | null;
  position_shown: number;
  created_at: string;
}

// =====================================================
// BÚSQUEDAS GUARDADAS
// =====================================================

export interface SavedSearch {
  id: string;
  user_id: string;
  search_name: string | null;
  industry: IndustryId | null;
  content_types: string[];
  budget_range: BudgetRange | null;
  min_rating: number | null;
  tags: string[];
  notify_new_matches: boolean;
  notify_frequency: 'instant' | 'daily' | 'weekly';
  last_notified_at: string | null;
  created_at: string;
}

// =====================================================
// CHAT INTERNO
// =====================================================

export interface MarketplaceConversation {
  id: string;
  company_user_id: string;
  creator_user_id: string;
  proposal_id: string | null;
  status: 'active' | 'archived' | 'blocked';
  last_message_at: string;
  last_message_preview: string | null;
  company_unread_count: number;
  creator_unread_count: number;
  created_at: string;
  // Relations
  company_user?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  };
  creator_user?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  };
  proposal?: {
    id: string;
    title: string;
    status: string;
  };
}

export type MessageType = 'text' | 'file' | 'proposal' | 'system';

export interface MarketplaceMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  message_type: MessageType;
  content: string;
  attachments: MessageAttachment[];
  embedded_proposal_id: string | null;
  is_read: boolean;
  read_at: string | null;
  flagged_external_contact: boolean;
  moderation_status: 'approved' | 'flagged' | 'blocked';
  created_at: string;
  // Relations
  sender?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  };
}

export interface MessageAttachment {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
}

// =====================================================
// VIOLACIONES DE CONTACTO
// =====================================================

export type ViolationType =
  | 'phone_number'
  | 'email'
  | 'instagram'
  | 'whatsapp'
  | 'telegram'
  | 'tiktok'
  | 'twitter'
  | 'linkedin'
  | 'external_url';

export interface ContactViolation {
  id: string;
  user_id: string;
  violation_type: ViolationType;
  detected_content: string;
  context_type: string;
  context_id: string | null;
  action_taken: string;
  violation_count: number;
  created_at: string;
}

// =====================================================
// ONBOARDING
// =====================================================

export interface CompanyOnboardingStep {
  step: number;
  title: string;
  description: string;
  fields: string[];
  required: boolean;
}

export const COMPANY_ONBOARDING_STEPS: CompanyOnboardingStep[] = [
  {
    step: 1,
    title: 'Información básica',
    description: 'Cuéntanos sobre tu empresa',
    fields: ['company_name', 'company_logo_url', 'industry'],
    required: true,
  },
  {
    step: 2,
    title: 'Tu audiencia',
    description: 'Describe a quién quieres llegar',
    fields: ['target_audience', 'niche_tags'],
    required: true,
  },
  {
    step: 3,
    title: 'Voz de marca',
    description: 'Define el tono de tu contenido',
    fields: ['brand_voice', 'preferred_creator_styles'],
    required: false,
  },
  {
    step: 4,
    title: 'Preferencias de contenido',
    description: 'Qué tipo de contenido necesitas',
    fields: ['preferred_content_types', 'preferred_platforms', 'typical_budget_range'],
    required: false,
  },
];

export interface CreatorOnboardingStep {
  step: number;
  title: string;
  description: string;
  fields: string[];
  required: boolean;
}

export const CREATOR_ONBOARDING_STEPS: CreatorOnboardingStep[] = [
  {
    step: 1,
    title: 'Tu especialidad',
    description: 'En qué tipo de contenido te especializas',
    fields: ['primary_category', 'secondary_categories', 'specialization_tags'],
    required: true,
  },
  {
    step: 2,
    title: 'Tu estilo',
    description: 'Cómo describes tu estilo de contenido',
    fields: ['content_style', 'brand_voice_description'],
    required: true,
  },
  {
    step: 3,
    title: 'Tu audiencia',
    description: 'Quién consume tu contenido',
    fields: ['audience_age_range', 'audience_gender', 'audience_locations'],
    required: false,
  },
  {
    step: 4,
    title: 'Plataformas',
    description: 'Dónde eres más fuerte',
    fields: ['strong_platforms'],
    required: false,
  },
];

// =====================================================
// FEED MEJORADO CON IA
// =====================================================

export interface AIFeedItem {
  id: string;
  type: 'content' | 'creator' | 'suggestion';
  item_id: string;
  ai_score: number;
  ai_reasons: string[];
  position: number;
}

export interface AIFeedConfig {
  personalization_level: 'low' | 'medium' | 'high';
  include_suggestions: boolean;
  discovery_ratio: number;  // 0-1, cuánto contenido nuevo vs personalizado
  refresh_interval_ms: number;
}
