// =====================================================
// TIPOS PARA EL MARKETPLACE DE KREOON SOCIAL
// =====================================================

// Tipos de servicio disponibles (agrupados por categoría)
export type ServiceType =
  // Content Creation — Videos UGC
  | 'ugc_video'
  | 'video_testimonial'
  | 'video_unboxing'
  | 'video_review'
  | 'video_tutorial'
  | 'video_before_after'
  | 'video_problem_solution'
  // Content Creation — Videos Comerciales
  | 'video_ad'
  | 'video_vsl'
  | 'video_product_demo'
  // Content Creation — Videos por Formato
  | 'video_reel_short'
  | 'video_stories'
  // Content Creation — Videos Tendencia
  | 'video_behind_scenes'
  // Content Creation — Otros
  | 'ugc_photo'
  | 'ugc_carousel'
  | 'photography'
  | 'live_streaming'
  | 'voice_over'
  | 'script_writing'
  | 'podcast_production'
  | 'influencer_post'
  | 'graphic_design'
  // Post-Production
  | 'video_editing'
  | 'motion_graphics'
  | 'thumbnail_design'
  | 'sound_design'
  | 'color_grading'
  | 'animation_2d3d'
  | 'creative_direction'
  | 'audiovisual_production'
  // Strategy & Marketing
  | 'social_management'
  | 'content_strategy'
  | 'community_management'
  | 'digital_strategy'
  | 'paid_advertising'
  | 'seo_sem'
  | 'email_marketing'
  | 'growth_hacking'
  | 'crm_management'
  | 'conversion_optimization'
  // Technology
  | 'web_development'
  | 'app_development'
  | 'ai_automation'
  // Education
  | 'online_courses'
  | 'workshops'
  // General
  | 'consulting'
  | 'custom';

export const SERVICE_TYPE_LABELS: Record<ServiceType, string> = {
  // Content Creation — Videos UGC
  ugc_video: 'Video UGC',
  video_testimonial: 'Video Testimonial',
  video_unboxing: 'Video Unboxing',
  video_review: 'Video Review',
  video_tutorial: 'Video Tutorial / How-to',
  video_before_after: 'Video Before/After',
  video_problem_solution: 'Video Problema/Solución',
  // Content Creation — Videos Comerciales
  video_ad: 'Video Ad / Comercial',
  video_vsl: 'Video VSL (Carta de Ventas)',
  video_product_demo: 'Video Demo de Producto',
  // Content Creation — Videos por Formato
  video_reel_short: 'Video Reel / Short',
  video_stories: 'Video Stories',
  // Content Creation — Videos Tendencia
  video_behind_scenes: 'Video Behind the Scenes',
  // Content Creation — Otros
  ugc_photo: 'Foto UGC',
  ugc_carousel: 'Carrusel UGC',
  photography: 'Fotografía',
  live_streaming: 'Live Streaming',
  voice_over: 'Locución',
  script_writing: 'Guionismo',
  podcast_production: 'Producción de Podcast',
  influencer_post: 'Post de Influencer',
  graphic_design: 'Diseño Gráfico',
  // Post-Production
  video_editing: 'Edición de Video',
  motion_graphics: 'Motion Graphics',
  thumbnail_design: 'Diseño de Thumbnails',
  sound_design: 'Diseño de Sonido',
  color_grading: 'Colorización',
  animation_2d3d: 'Animación 2D/3D',
  creative_direction: 'Dirección Creativa',
  audiovisual_production: 'Producción Audiovisual',
  // Strategy & Marketing
  social_management: 'Gestión de Redes',
  content_strategy: 'Estrategia de Contenido',
  community_management: 'Community Management',
  digital_strategy: 'Estrategia Digital',
  paid_advertising: 'Pauta Digital / Media Buying',
  seo_sem: 'SEO / SEM',
  email_marketing: 'Email Marketing',
  growth_hacking: 'Growth Hacking',
  crm_management: 'Gestión CRM',
  conversion_optimization: 'Optimización de Conversión',
  // Technology
  web_development: 'Desarrollo Web',
  app_development: 'Desarrollo de Apps',
  ai_automation: 'IA y Automatización',
  // Education
  online_courses: 'Cursos Online',
  workshops: 'Talleres y Capacitaciones',
  // General
  consulting: 'Consultoría',
  custom: 'Personalizado',
};

export const SERVICE_TYPE_ICONS: Record<ServiceType, string> = {
  // Content Creation — Videos UGC
  ugc_video: '📹',
  video_testimonial: '🗣️',
  video_unboxing: '📦',
  video_review: '⭐',
  video_tutorial: '📚',
  video_before_after: '🔄',
  video_problem_solution: '💡',
  // Content Creation — Videos Comerciales
  video_ad: '📺',
  video_vsl: '💰',
  video_product_demo: '🎯',
  // Content Creation — Videos por Formato
  video_reel_short: '🎞️',
  video_stories: '📱',
  // Content Creation — Videos Tendencia
  video_behind_scenes: '🎬',
  // Content Creation — Otros
  ugc_photo: '📸',
  ugc_carousel: '🎠',
  photography: '📷',
  live_streaming: '🔴',
  voice_over: '🎙️',
  script_writing: '✍️',
  podcast_production: '🎧',
  influencer_post: '🌟',
  graphic_design: '🎨',
  // Post-Production
  video_editing: '🎬',
  motion_graphics: '✨',
  thumbnail_design: '🖼️',
  sound_design: '🔊',
  color_grading: '🌈',
  animation_2d3d: '🎭',
  creative_direction: '🎯',
  audiovisual_production: '🎥',
  // Strategy & Marketing
  social_management: '📱',
  content_strategy: '📊',
  community_management: '💬',
  digital_strategy: '🧭',
  paid_advertising: '📣',
  seo_sem: '🔍',
  email_marketing: '📧',
  growth_hacking: '🚀',
  crm_management: '🤝',
  conversion_optimization: '📈',
  // Technology
  web_development: '💻',
  app_development: '📲',
  ai_automation: '🤖',
  // Education
  online_courses: '🎓',
  workshops: '👨‍🏫',
  // General
  consulting: '💼',
  custom: '⚙️',
};

// Categorías de servicios para agrupar en dropdowns
export type ServiceTypeCategory = 'content_creation' | 'post_production' | 'strategy_marketing' | 'technology' | 'education' | 'general';

export const SERVICE_TYPE_CATEGORIES: Record<ServiceTypeCategory, { label: string; types: ServiceType[] }> = {
  content_creation: {
    label: 'Creación de Contenido',
    types: [
      'ugc_video', 'video_testimonial', 'video_unboxing', 'video_review', 'video_tutorial', 'video_before_after', 'video_problem_solution',
      'video_ad', 'video_vsl', 'video_product_demo',
      'video_reel_short', 'video_stories',
      'video_behind_scenes',
      'ugc_photo', 'ugc_carousel', 'photography', 'live_streaming', 'voice_over', 'script_writing', 'podcast_production', 'influencer_post', 'graphic_design',
    ],
  },
  post_production: {
    label: 'Post-Producción',
    types: ['video_editing', 'motion_graphics', 'thumbnail_design', 'sound_design', 'color_grading', 'animation_2d3d', 'creative_direction', 'audiovisual_production'],
  },
  strategy_marketing: {
    label: 'Estrategia & Marketing',
    types: ['social_management', 'content_strategy', 'community_management', 'digital_strategy', 'paid_advertising', 'seo_sem', 'email_marketing', 'growth_hacking', 'crm_management', 'conversion_optimization'],
  },
  technology: {
    label: 'Tecnología',
    types: ['web_development', 'app_development', 'ai_automation'],
  },
  education: {
    label: 'Educación',
    types: ['online_courses', 'workshops'],
  },
  general: {
    label: 'General',
    types: ['consulting', 'custom'],
  },
};

// Tipos de precio
export type PriceType = 'fixed' | 'starting' | 'hourly' | 'custom';

export const PRICE_TYPE_LABELS: Record<PriceType, string> = {
  fixed: 'Precio fijo',
  starting: 'Desde',
  hourly: 'Por hora',
  custom: 'A convenir',
};

// Entregable de un servicio
export interface ServiceDeliverable {
  item: string;
  quantity: number;
}

// Servicio del creador
export interface CreatorService {
  id: string;
  user_id: string;
  service_type: ServiceType;
  title: string;
  description: string | null;
  deliverables: ServiceDeliverable[];
  price_type: PriceType;
  price_amount: number | null;
  price_currency: string;
  delivery_days: number | null;
  revisions_included: number;
  requirements: string | null;
  portfolio_items: string[];
  is_active: boolean;
  is_featured: boolean;
  display_order: number;
  orders_count: number;
  avg_rating: number | null;
  created_at: string;
  updated_at: string;
}

// Input para crear/actualizar servicio
export interface CreatorServiceInput {
  service_type: ServiceType;
  title: string;
  description?: string;
  deliverables?: ServiceDeliverable[];
  price_type?: PriceType;
  price_amount?: number;
  price_currency?: string;
  delivery_days?: number;
  revisions_included?: number;
  requirements?: string;
  portfolio_items?: string[];
  is_active?: boolean;
  is_featured?: boolean;
  display_order?: number;
}

// Estados de disponibilidad
export type AvailabilityStatus = 'available' | 'busy' | 'unavailable' | 'vacation';

export const AVAILABILITY_STATUS_LABELS: Record<AvailabilityStatus, string> = {
  available: 'Disponible',
  busy: 'Ocupado',
  unavailable: 'No disponible',
  vacation: 'De vacaciones',
};

export const AVAILABILITY_STATUS_COLORS: Record<AvailabilityStatus, string> = {
  available: 'text-green-500',
  busy: 'text-yellow-500',
  unavailable: 'text-red-500',
  vacation: 'text-blue-500',
};

// Tamaño de proyecto preferido
export type PreferredProjectSize = 'small' | 'medium' | 'large' | 'any';

// Disponibilidad del creador
export interface CreatorAvailability {
  user_id: string;
  status: AvailabilityStatus;
  status_message: string | null;
  vacation_until: string | null;
  max_concurrent_projects: number;
  current_projects_count: number;
  typical_response_hours: number;
  preferred_project_size: PreferredProjectSize;
  preferred_industries: string[];
  do_not_work_with: string[];
  auto_busy_threshold: number;
  updated_at: string;
}

// Input para actualizar disponibilidad
export interface CreatorAvailabilityInput {
  status?: AvailabilityStatus;
  status_message?: string;
  vacation_until?: string;
  max_concurrent_projects?: number;
  typical_response_hours?: number;
  preferred_project_size?: PreferredProjectSize;
  preferred_industries?: string[];
  do_not_work_with?: string[];
  auto_busy_threshold?: number;
}

// Estados de verificación
export type VerificationStatus = 'none' | 'pending' | 'verified' | 'suspended';

// Badges del marketplace
export type MarketplaceBadge = 'top_rated' | 'fast_delivery' | 'rising_talent' | 'kreoon_pick';

export const BADGE_LABELS: Record<MarketplaceBadge, string> = {
  top_rated: 'Top Rated',
  fast_delivery: 'Entrega Rápida',
  rising_talent: 'Rising Talent',
  kreoon_pick: 'Kreoon Pick',
};

export const BADGE_ICONS: Record<MarketplaceBadge, string> = {
  top_rated: '🏆',
  fast_delivery: '⚡',
  rising_talent: '🌟',
  kreoon_pick: '✨',
};

// Verificación del marketplace
export interface MarketplaceVerification {
  user_id: string;
  verification_status: VerificationStatus;
  verification_level: number;
  email_verified: boolean;
  phone_verified: boolean;
  identity_verified: boolean;
  portfolio_reviewed: boolean;
  interview_completed: boolean;
  identity_document_url: string | null;
  identity_verified_at: string | null;
  identity_verified_by: string | null;
  portfolio_reviewed_at: string | null;
  portfolio_reviewed_by: string | null;
  portfolio_notes: string | null;
  quality_score: number | null;
  reliability_score: number | null;
  communication_score: number | null;
  badges: MarketplaceBadge[];
  verified_at: string | null;
  suspended_at: string | null;
  suspension_reason: string | null;
  created_at: string;
  updated_at: string;
}

// Estados de propuesta
export type ProposalStatus =
  | 'pending'
  | 'viewed'
  | 'interested'
  | 'negotiating'
  | 'accepted'
  | 'declined'
  | 'expired'
  | 'withdrawn';

export const PROPOSAL_STATUS_LABELS: Record<ProposalStatus, string> = {
  pending: 'Pendiente',
  viewed: 'Vista',
  interested: 'Interesado',
  negotiating: 'En negociación',
  accepted: 'Aceptada',
  declined: 'Rechazada',
  expired: 'Expirada',
  withdrawn: 'Retirada',
};

export const PROPOSAL_STATUS_COLORS: Record<ProposalStatus, string> = {
  pending: 'bg-blue-500/20 text-blue-500',
  viewed: 'bg-yellow-500/20 text-yellow-500',
  interested: 'bg-green-500/20 text-green-500',
  negotiating: 'bg-purple-500/20 text-purple-500',
  accepted: 'bg-green-600/20 text-green-600',
  declined: 'bg-red-500/20 text-red-500',
  expired: 'bg-gray-500/20 text-gray-500',
  withdrawn: 'bg-gray-500/20 text-gray-500',
};

// Tipo de presupuesto
export type BudgetType = 'fixed' | 'range' | 'hourly' | 'open';

// Adjunto de propuesta
export interface ProposalAttachment {
  name: string;
  url: string;
  type: string;
  size: number;
}

// Propuesta del marketplace
export interface MarketplaceProposal {
  id: string;
  client_id: string;
  provider_id: string;
  service_id: string | null;
  title: string;
  description: string;
  attachments: ProposalAttachment[];
  proposed_budget: number | null;
  budget_currency: string;
  budget_type: BudgetType;
  budget_max: number | null;
  desired_deadline: string | null;
  status: ProposalStatus;
  provider_response: string | null;
  counter_offer_amount: number | null;
  counter_offer_deadline: string | null;
  responded_at: string | null;
  contract_id: string | null;
  expires_at: string;
  viewed_at: string | null;
  created_at: string;
  updated_at: string;
  // Relaciones
  client?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
    username: string | null;
  };
  provider?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
    username: string | null;
  };
  service?: CreatorService;
}

// Input para crear propuesta
export interface MarketplaceProposalInput {
  provider_id: string;
  service_id?: string;
  title: string;
  description: string;
  attachments?: ProposalAttachment[];
  proposed_budget?: number;
  budget_currency?: string;
  budget_type?: BudgetType;
  budget_max?: number;
  desired_deadline?: string;
}

// Mensaje de propuesta
export interface ProposalMessage {
  id: string;
  proposal_id: string;
  sender_id: string;
  message: string;
  attachments: ProposalAttachment[];
  is_system_message: boolean;
  created_at: string;
  // Relación
  sender?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  };
}

// Tipo de reviewer
export type ReviewerType = 'client' | 'provider';

// Review del marketplace
export interface MarketplaceReview {
  id: string;
  contract_id: string | null;
  proposal_id: string | null;
  reviewer_id: string;
  reviewer_type: ReviewerType;
  reviewed_id: string;
  overall_rating: number;
  quality_rating: number | null;
  communication_rating: number | null;
  timeliness_rating: number | null;
  value_rating: number | null;
  review_text: string | null;
  response_text: string | null;
  response_at: string | null;
  would_recommend: boolean | null;
  is_public: boolean;
  is_flagged: boolean;
  flagged_reason: string | null;
  moderated_at: string | null;
  moderated_by: string | null;
  created_at: string;
  // Relaciones
  reviewer?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
    username: string | null;
  };
}

// Input para crear review
export interface MarketplaceReviewInput {
  proposal_id?: string;
  contract_id?: string;
  reviewed_id: string;
  reviewer_type: ReviewerType;
  overall_rating: number;
  quality_rating?: number;
  communication_rating?: number;
  timeliness_rating?: number;
  value_rating?: number;
  review_text?: string;
  would_recommend?: boolean;
}

// Favorito del marketplace
export interface MarketplaceFavorite {
  id: string;
  user_id: string;
  creator_id: string;
  notes: string | null;
  created_at: string;
  // Relación
  creator?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
    username: string | null;
    bio: string | null;
  };
}

// Vista de perfil
export interface ProfileView {
  id: string;
  profile_id: string;
  viewer_id: string | null;
  viewer_anon_id: string | null;
  source: string | null;
  viewed_at: string;
}

// Tipos de notificación del marketplace
export type MarketplaceNotificationType =
  | 'new_proposal'
  | 'proposal_accepted'
  | 'proposal_declined'
  | 'proposal_expired'
  | 'new_message'
  | 'new_review'
  | 'availability_reminder'
  | 'contract_started'
  | 'contract_completed'
  | 'payment_received';

// Notificación del marketplace
export interface MarketplaceNotification {
  id: string;
  user_id: string;
  actor_id: string | null;
  notification_type: MarketplaceNotificationType;
  entity_type: string | null;
  entity_id: string | null;
  message: string | null;
  is_read: boolean;
  created_at: string;
  // Relación
  actor?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  };
}

// Stats del marketplace para un perfil
export interface MarketplaceProfileStats {
  total_contracts_completed: number;
  total_earnings: number;
  avg_rating: number | null;
  response_rate: number | null;
  on_time_delivery_rate: number | null;
  reviews_count: number;
  services_count: number;
  is_verified: boolean;
  verification_level: number;
  badges: MarketplaceBadge[];
}

// Perfil de creador completo para marketplace
export interface CreatorMarketplaceProfile {
  id: string;
  full_name: string;
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
  is_available_for_hire: boolean;
  marketplace_enabled: boolean;
  minimum_budget: number | null;
  preferred_contact_method: string;
  is_featured_creator: boolean;
  featured_until: string | null;
  is_independent: boolean;
  organization_id: string | null;
  organization_name: string | null;
  // Stats
  stats: MarketplaceProfileStats;
  // Disponibilidad
  availability: CreatorAvailability | null;
  // Servicios
  services: CreatorService[];
  // Reviews recientes
  recent_reviews: MarketplaceReview[];
}

// Filtros para buscar creadores
export interface CreatorSearchFilters {
  service_type?: ServiceType;
  min_rating?: number;
  max_budget?: number;
  delivery_days?: number;
  availability_status?: AvailabilityStatus;
  is_verified?: boolean;
  has_badge?: MarketplaceBadge;
  industry?: string;
  search_query?: string;
}

// Resultado de búsqueda de creadores
export interface CreatorSearchResult {
  id: string;
  full_name: string;
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
  avg_rating: number | null;
  reviews_count: number;
  starting_price: number | null;
  services_preview: Array<{
    id: string;
    title: string;
    service_type: ServiceType;
    price_amount: number | null;
  }>;
  availability_status: AvailabilityStatus;
  badges: MarketplaceBadge[];
  is_verified: boolean;
}
