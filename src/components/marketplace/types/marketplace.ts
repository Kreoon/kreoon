export interface MarketplaceCreator {
  id: string;
  user_id: string;
  slug: string | null;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  location_city: string | null;
  location_country: string | null;
  country_flag: string | null;
  categories: string[];
  content_types: string[];
  level: 'bronze' | 'silver' | 'gold' | 'elite';
  is_verified: boolean;
  rating_avg: number;
  rating_count: number;
  base_price: number | null;
  currency: string;
  portfolio_media: PortfolioMedia[];
  is_available: boolean;
  languages: string[];
  completed_projects: number;
  joined_at: string;
  accepts_product_exchange: boolean;
  marketplace_roles?: MarketplaceRoleId[];
  /** User has an active paid subscription (basic or pro) */
  is_subscribed?: boolean;
  /** Introductory discount % for first hires (Airbnb model) — null = not opted in */
  introductory_discount_pct?: number | null;
}

export interface PortfolioMedia {
  id: string;
  url: string;
  thumbnail_url: string | null;
  type: 'image' | 'video';
}

export interface MarketplaceFilters {
  search: string;
  category: string | null;
  country: string | null;
  content_type: string[];
  price_min: number | null;
  price_max: number | null;
  rating_min: number | null;
  level: string[];
  languages: string[];
  availability: 'now' | 'week' | 'any';
  sort_by: 'relevance' | 'rating' | 'price_low' | 'price_high' | 'newest' | 'most_projects';
  // Role-based filters
  role_category: MarketplaceViewMode;
  marketplace_roles: MarketplaceRoleId[];
  // Adaptive filters (applicable depending on role_category)
  platforms: string[];
  software: string[];
  accepts_exchange: boolean | null;
  tech_stack: string[];
  education_format: string[];
}

export interface MarketplaceSection {
  id: string;
  title: string;
  subtitle?: string;
  emoji?: string;
  type: 'carousel' | 'grid';
  see_all_link?: string;
}

// --- Full profile types (Phase 2) ---

export interface CreatorService {
  id: string;
  icon: string;
  title: string;
  description: string;
}

export interface CreatorStats {
  completed_projects: number;
  rating_avg: number;
  rating_count: number;
  response_time_hours: number;
  on_time_delivery_pct: number;
  repeat_clients_pct: number;
}

export interface CreatorReview {
  id: string;
  brand_name: string;
  brand_logo?: string;
  campaign_type: string;
  rating: number;
  text: string;
  date: string;
}

export interface CreatorPackage {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  delivery_days: string;
  includes: string[];
  is_popular: boolean;
  discount_pct?: number;
}

export interface SocialLinks {
  instagram?: boolean;
  tiktok?: boolean;
  youtube?: boolean;
  linkedin?: boolean;
}

export interface CreatorFullProfile extends MarketplaceCreator {
  bio_full: string;
  banner_url?: string | null;
  services: CreatorService[];
  stats: CreatorStats;
  reviews: CreatorReview[];
  packages: CreatorPackage[];
  similar_creator_ids: string[];
  social_links: SocialLinks;
  platforms: string[];
  response_time: string;
  delivery_time: string;
  exchange_conditions?: string;
}

export const MARKETPLACE_CATEGORIES = [
  { id: 'all', label: 'Todos', icon: 'LayoutGrid' },
  { id: 'ugc', label: 'UGC', icon: 'Video' },
  { id: 'fitness', label: 'Fitness', icon: 'Dumbbell' },
  { id: 'moda', label: 'Moda', icon: 'Shirt' },
  { id: 'tech', label: 'Tech', icon: 'Laptop' },
  { id: 'belleza', label: 'Belleza', icon: 'Sparkles' },
  { id: 'food', label: 'Food', icon: 'UtensilsCrossed' },
  { id: 'hogar', label: 'Hogar', icon: 'Home' },
  { id: 'educacion', label: 'Educación', icon: 'GraduationCap' },
  { id: 'gaming', label: 'Gaming', icon: 'Gamepad2' },
  { id: 'mascotas', label: 'Mascotas', icon: 'PawPrint' },
  { id: 'bebes', label: 'Bebés', icon: 'Baby' },
  { id: 'salud', label: 'Salud', icon: 'Heart' },
  { id: 'musica', label: 'Música', icon: 'Music' },
  { id: 'viajes', label: 'Viajes', icon: 'Plane' },
  { id: 'finanzas', label: 'Finanzas', icon: 'TrendingUp' },
] as const;

export const COUNTRIES = [
  { code: 'CO', label: 'Colombia', flag: '🇨🇴' },
  { code: 'MX', label: 'México', flag: '🇲🇽' },
  { code: 'CL', label: 'Chile', flag: '🇨🇱' },
  { code: 'PE', label: 'Perú', flag: '🇵🇪' },
  { code: 'AR', label: 'Argentina', flag: '🇦🇷' },
  { code: 'EC', label: 'Ecuador', flag: '🇪🇨' },
  { code: 'US', label: 'Estados Unidos', flag: '🇺🇸' },
] as const;

export const CONTENT_TYPES = [
  'UGC',
  'Reels/TikTok',
  'VSL',
  'Unboxing',
  'Testimonio',
  'Reseña',
  'Tutorial',
  'Compra en Vivo',
] as const;

// --- Predefined Expertise Tags (grouped) ---

export interface ExpertiseTagGroup {
  label: string;
  tags: string[];
}

export const EXPERTISE_TAG_GROUPS: ExpertiseTagGroup[] = [
  {
    label: 'Nichos / Industrias',
    tags: [
      'UGC', 'Moda & Estilo', 'Belleza & Skincare', 'Fitness & Deporte',
      'Salud & Bienestar', 'Tecnología', 'Gaming', 'Food & Cocina',
      'Viajes & Turismo', 'Educación', 'Finanzas & Inversión',
      'Hogar & Decoración', 'Mascotas', 'Bebés & Maternidad',
      'Música', 'Arte & Diseño', 'Automotriz', 'Entretenimiento',
      'Lifestyle', 'Negocios & Emprendimiento',
    ],
  },
  {
    label: 'Habilidades de Producción',
    tags: [
      'Edición de Video', 'Fotografía Profesional', 'Motion Graphics',
      'Diseño Gráfico', 'Copywriting', 'Guionismo',
      'Locución & Voz en Off', 'Animación 2D/3D',
      'Color Grading', 'Producción de Audio',
    ],
  },
  {
    label: 'Formatos de Contenido',
    tags: [
      'Reels & Shorts', 'Livestream', 'Podcast',
      'Video Largo (YouTube)', 'Stories', 'Blog & Artículos',
      'VSL', 'Unboxing', 'Reviews & Reseñas',
      'Tutoriales & How-to', 'Testimonios', 'Compra en Vivo',
    ],
  },
  {
    label: 'Servicios Especializados',
    tags: [
      'Dirección Creativa', 'Community Management', 'Influencer Marketing',
      'Paid Media', 'SEO & Contenido Web', 'Email Marketing',
      'Branding & Identidad', 'Estrategia de Contenido',
      'Analítica & Data', 'Social Listening',
    ],
  },
];

// --- Phase 3: Hiring & Project types ---

export type ProjectStatus = 'pending' | 'briefing' | 'in_progress' | 'revision' | 'approved' | 'completed' | 'cancelled';
export type ProjectPaymentMethod = 'payment' | 'exchange';
export type ProjectPaymentStatus = 'pending' | 'escrow' | 'released' | 'refunded';

export interface HiringBrief {
  product_name: string;
  product_url?: string;
  objective: string;
  target_audience: string;
  key_messages: string[];
  references: string[];
  tone: string;
  dos: string[];
  donts: string[];
  deadline?: string;
  notes?: string;
}

export interface MarketplaceProject {
  id: string;
  creator_id: string;
  brand_user_id: string;
  creator: MarketplaceCreator;
  brand_name: string;
  brand_logo?: string;
  package_id: string;
  package_name: string;
  payment_method: ProjectPaymentMethod;
  payment_status: ProjectPaymentStatus;
  status: ProjectStatus;
  brief: HiringBrief;
  total_price: number;
  currency: string;
  created_at: string;
  updated_at: string;
  deadline?: string;
  deliverables_count: number;
  deliverables_approved: number;
  last_message_at?: string;
  unread_messages: number;
}

export interface ProjectMessage {
  id: string;
  project_id: string;
  sender_id: string;
  sender_name: string;
  sender_avatar?: string;
  sender_role: 'brand' | 'creator' | 'editor' | 'system';
  content: string;
  attachment_url?: string;
  attachment_type?: string;
  created_at: string;
}

export interface KanbanColumnConfig {
  id: ProjectStatus;
  label: string;
  color: string;
  allowedTransitions: ProjectStatus[];
}

export const DEFAULT_FILTERS: MarketplaceFilters = {
  search: '',
  category: null,
  country: null,
  content_type: [],
  price_min: null,
  price_max: null,
  rating_min: null,
  level: [],
  languages: [],
  availability: 'any',
  sort_by: 'relevance',
  // Role-based filters
  role_category: 'all',
  marketplace_roles: [],
  // Adaptive filters
  platforms: [],
  software: [],
  accepts_exchange: null,
  tech_stack: [],
  education_format: [],
};

// --- Phase 5: Marketplace Specialization Roles ---

export type MarketplaceRoleCategory =
  | 'content_creation'
  | 'post_production'
  | 'strategy_marketing'
  | 'technology'
  | 'education'
  | 'client';

export type MarketplaceRoleId =
  // Content Creation
  | 'ugc_creator' | 'lifestyle_creator' | 'micro_influencer'
  | 'nano_influencer' | 'macro_influencer' | 'brand_ambassador'
  | 'live_streamer' | 'podcast_host'
  | 'photographer' | 'copywriter' | 'graphic_designer' | 'voice_artist'
  // Post-Production
  | 'video_editor' | 'motion_graphics' | 'sound_designer' | 'colorist'
  | 'director' | 'producer' | 'animator_2d3d'
  // Estrategia & Marketing
  | 'content_strategist' | 'social_media_manager' | 'community_manager'
  | 'digital_strategist' | 'trafficker' | 'seo_specialist'
  | 'email_marketer' | 'growth_hacker' | 'crm_specialist' | 'conversion_optimizer'
  // Technology
  | 'web_developer' | 'app_developer' | 'ai_specialist'
  // Education
  | 'online_instructor' | 'workshop_facilitator'
  // Client
  | 'brand_manager' | 'marketing_director';

export interface MarketplaceRoleDefinition {
  id: MarketplaceRoleId;
  category: MarketplaceRoleCategory;
  label: string;
  description: string;
  icon: string;
  color: string;
  bgColor: string;
}

// --- Phase 5: Auction / Bidding System ---

export type CampaignPricingMode = 'fixed' | 'auction' | 'range';
export type BidVisibility = 'public' | 'sealed';

export interface CounterOffer {
  id: string;
  application_id: string;
  brand_amount: number;
  brand_message?: string;
  creator_response?: 'accepted' | 'rejected';
  creator_response_at?: string;
  created_at: string;
}

// --- Phase 4: Campaign / Casting types ---

export type CampaignStatus = 'draft' | 'active' | 'paused' | 'in_progress' | 'completed' | 'cancelled';
export type CampaignType = 'paid' | 'exchange' | 'hybrid';
export type CampaignBudgetMode = 'per_video' | 'total_budget';
export type ApplicationStatus = 'pending' | 'approved' | 'rejected' | 'assigned' | 'delivered' | 'completed' | 'withdrawn';

// --- Campaign Visibility System ---

export type CampaignVisibility = 'public' | 'internal' | 'selective';
export type CompensationType = 'paid' | 'product_exchange' | 'hybrid' | 'credits';
export type UsageRights = 'platform_only' | 'social_media' | 'all_channels' | 'exclusive' | 'custom';
export type InvitationStatus = 'pending' | 'accepted' | 'declined' | 'expired';
export type DeliverableStatus = 'submitted' | 'revision_requested' | 'approved' | 'rejected';

export const VISIBILITY_CONFIG: Record<CampaignVisibility, { label: string; description: string; color: string; bgColor: string }> = {
  public: {
    label: 'Publica',
    description: 'Visible para todos los creadores del marketplace que cumplan los requisitos',
    color: 'text-green-400',
    bgColor: 'bg-green-500/15',
  },
  internal: {
    label: 'Interna',
    description: 'Solo los miembros de tu organizacion podran ver esta campana',
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/15',
  },
  selective: {
    label: 'Selectiva',
    description: 'Solo los creadores que invites podran ver y aplicar',
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/15',
  },
};

export const COMPENSATION_TYPE_CONFIG: Record<CompensationType, { label: string; icon: string; color: string }> = {
  paid: { label: 'Pago monetario', icon: 'DollarSign', color: 'text-green-400' },
  product_exchange: { label: 'Canje por producto', icon: 'Gift', color: 'text-pink-400' },
  hybrid: { label: 'Hibrido (Pago + Producto)', icon: 'Repeat', color: 'text-blue-400' },
  credits: { label: 'Creditos de plataforma', icon: 'Coins', color: 'text-amber-400' },
};

export const USAGE_RIGHTS_CONFIG: Record<UsageRights, { label: string; description: string }> = {
  platform_only: { label: 'Solo en plataforma Kreoon', description: 'El contenido solo se usara dentro de Kreoon' },
  social_media: { label: 'Redes sociales de la marca', description: 'La marca puede publicarlo en sus redes' },
  all_channels: { label: 'Todos los canales (incluye ads)', description: 'Incluye publicidad pagada y todos los medios' },
  exclusive: { label: 'Uso exclusivo', description: 'Derechos completos transferidos a la marca' },
  custom: { label: 'Personalizado', description: 'Condiciones especificas acordadas' },
};

export interface CampaignInvitation {
  id: string;
  campaign_id: string;
  invited_profile_id: string;
  invited_by: string;
  message?: string;
  status: InvitationStatus;
  sent_at: string;
  responded_at?: string;
  expires_at: string;
  // Joined data
  invited_profile?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  };
}

export interface CampaignDeliverable {
  id: string;
  campaign_id: string;
  creator_id: string;
  application_id?: string;
  title?: string;
  description?: string;
  file_url: string;
  file_type: 'video' | 'image' | 'document';
  thumbnail_url?: string;
  duration_seconds?: number;
  file_size_mb?: number;
  revision_number: number;
  max_revisions: number;
  status: DeliverableStatus;
  feedback?: string;
  approved_by?: string;
  submitted_at: string;
  reviewed_at?: string;
  updated_at: string;
}

export interface CampaignVisibilityData {
  visibility: CampaignVisibility;
  organization_id?: string;
  max_creators: number;
  max_applications?: number;
  auto_approve_applications: boolean;
  requires_portfolio: boolean;
  invited_profiles: string[]; // profile IDs for selective
}

export interface CampaignContentRequirement {
  content_type: string;
  quantity: number;
  duration_seconds?: number;
  description: string;
}

export interface CampaignCreatorRequirements {
  min_rating: number;
  min_completed_projects: number;
  categories: string[];
  countries: string[];
  languages: string[];
  min_followers?: number;
  content_types: string[];
  desired_roles?: MarketplaceRoleId[];
}

export interface Campaign {
  id: string;
  brand_user_id: string;
  brand_name: string;
  brand_logo?: string;
  title: string;
  description: string;
  category: string;
  campaign_type: CampaignType;
  budget_mode: CampaignBudgetMode;
  budget_per_video?: number;
  total_budget?: number;
  currency: string;
  platform_fee_pct: number;
  content_requirements: CampaignContentRequirement[];
  creator_requirements: CampaignCreatorRequirements;
  max_creators: number;
  applications_count: number;
  approved_count: number;
  status: CampaignStatus;
  deadline: string;
  created_at: string;
  updated_at: string;
  exchange_product_name?: string;
  exchange_product_value?: number;
  exchange_product_description?: string;
  tags: string[];
  pricing_mode?: CampaignPricingMode;
  min_bid?: number;
  max_bid?: number;
  bid_deadline?: string;
  bid_visibility?: BidVisibility;
  desired_roles?: MarketplaceRoleId[];
  // Visibility system
  visibility: CampaignVisibility;
  organization_id?: string;
  organization_name?: string;
  brief?: string;
  cover_image_url?: string;
  brand_name_override?: string;
  brand_logo_override?: string;
  // Compensation
  compensation_type?: CompensationType;
  compensation_description?: string;
  product_value?: number;
  // Extended deadlines
  application_deadline?: string;
  content_deadline?: string;
  campaign_start_date?: string;
  campaign_end_date?: string;
  // Capacity
  max_applications?: number;
  current_applications?: number;
  // Configuration
  auto_approve_applications?: boolean;
  requires_portfolio?: boolean;
  allow_counter_offers?: boolean;
  nda_required?: boolean;
  usage_rights?: UsageRights;
  usage_rights_description?: string;
  // Flags
  is_urgent?: boolean;
  is_featured?: boolean;
  published_at?: string;
  // Content guidelines
  content_guidelines?: string;
  reference_urls?: string[];
}

export interface CampaignApplication {
  id: string;
  campaign_id: string;
  creator_id: string;
  creator: MarketplaceCreator;
  status: ApplicationStatus;
  cover_letter: string;
  proposed_price?: number;
  portfolio_links: string[];
  availability_date: string;
  created_at: string;
  updated_at: string;
  brand_notes?: string;
  bid_amount?: number;
  bid_message?: string;
  counter_offer?: CounterOffer;
}

export interface CampaignFilters {
  search: string;
  category: string | null;
  campaign_type: CampaignType | null;
  budget_min: number | null;
  budget_max: number | null;
  sort_by: 'newest' | 'budget_high' | 'budget_low' | 'deadline' | 'applications';
  pricing_mode: CampaignPricingMode | null;
}

export const DEFAULT_CAMPAIGN_FILTERS: CampaignFilters = {
  search: '',
  category: null,
  campaign_type: null,
  budget_min: null,
  budget_max: null,
  sort_by: 'newest',
  pricing_mode: null,
};

// --- Role-based Marketplace View ---

export type MarketplaceViewMode = 'all' | MarketplaceRoleCategory | 'agencies';

// --- Organization Marketplace Profile Types ---

export type MarketplaceTab = 'creators' | 'agencies' | 'campaigns';
export type OrgType = 'agency' | 'studio' | 'brand' | 'independent';

export interface MarketplaceOrg {
  id: string;
  slug: string;
  org_display_name: string;
  logo_url: string | null;
  org_tagline: string | null;
  org_type: OrgType;
  org_cover_url: string | null;
  org_specialties: string[];
  org_team_size_range: string | null;
  org_marketplace_rating_avg: number;
  org_marketplace_rating_count: number;
  org_marketplace_projects_count: number;
  org_min_budget: number | null;
  org_max_budget: number | null;
  org_budget_currency: string;
  org_response_time: string | null;
  portfolio_color: string | null;
}

export interface OrgFullProfile extends MarketplaceOrg {
  name: string;
  description: string | null;
  org_gallery: string[];
  org_year_founded: number | null;
  org_website: string | null;
  org_linkedin: string | null;
  org_instagram: string | null;
  org_tiktok: string | null;
  primary_color: string | null;
}

export interface OrgService {
  id: string;
  organization_id: string;
  icon: string;
  title: string;
  description: string | null;
  is_featured: boolean;
  sort_order: number;
}

export interface OrgReview {
  id: string;
  organization_id: string;
  reviewer_name: string;
  reviewer_avatar: string | null;
  rating: number;
  review_text: string;
  project_type: string | null;
  created_at: string;
}

export const ORG_TYPE_LABELS: Record<OrgType, string> = {
  agency: 'Agencia',
  studio: 'Estudio',
  brand: 'Marca',
  independent: 'Independiente',
};

export const ORG_TYPE_COLORS: Record<OrgType, { bg: string; text: string }> = {
  agency: { bg: 'bg-purple-500/15', text: 'text-purple-400' },
  studio: { bg: 'bg-blue-500/15', text: 'text-blue-400' },
  brand: { bg: 'bg-amber-500/15', text: 'text-amber-400' },
  independent: { bg: 'bg-green-500/15', text: 'text-green-400' },
};

export const TEAM_SIZE_LABELS: Record<string, string> = {
  solo: '1 persona',
  '2-5': '2-5 personas',
  '6-15': '6-15 personas',
  '16-50': '16-50 personas',
  '50+': '50+ personas',
};

export const RESPONSE_TIME_LABELS: Record<string, string> = {
  same_day: 'Mismo día',
  within_24h: 'Dentro de 24h',
  within_48h: 'Dentro de 48h',
  within_week: 'Dentro de 1 semana',
};

// --- Talent Lists Types ---

export interface TalentList {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  color: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  member_count: number;
}

export interface TalentListMember {
  id: string;
  list_id: string;
  creator_user_id: string;
  added_by: string;
  added_at: string;
  notes: string | null;
  creator?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  };
}

// --- Organization Invitation Types ---

export type OrgInvitationStatus = 'pending' | 'accepted' | 'declined' | 'cancelled';

export interface MarketplaceOrgInvitation {
  id: string;
  organization_id: string;
  creator_user_id: string;
  invited_by: string;
  message: string | null;
  proposed_role: string | null;
  status: OrgInvitationStatus;
  created_at: string;
  responded_at: string | null;
  response_message: string | null;
  creator?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  };
  organization?: {
    id: string;
    name: string;
    logo_url: string | null;
  };
}

// --- Organization Inquiry Types ---

export type InquiryStatus = 'new' | 'reviewed' | 'contacted' | 'closed';
export type InquiryType = 'general' | 'collaboration' | 'hiring' | 'partnership' | 'other';

export interface OrgInquiry {
  id: string;
  organization_id: string;
  sender_user_id: string | null;
  sender_name: string;
  sender_email: string;
  sender_company: string | null;
  sender_phone: string | null;
  subject: string;
  message: string;
  inquiry_type: InquiryType;
  budget_range: string | null;
  status: InquiryStatus;
  internal_notes: string | null;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
}

export const INQUIRY_STATUS_LABELS: Record<InquiryStatus, { label: string; color: string }> = {
  new: { label: 'Nueva', color: 'bg-blue-500/15 text-blue-400' },
  reviewed: { label: 'Revisada', color: 'bg-yellow-500/15 text-yellow-400' },
  contacted: { label: 'Contactado', color: 'bg-green-500/15 text-green-400' },
  closed: { label: 'Cerrada', color: 'bg-gray-500/15 text-gray-400' },
};

export interface OrgMemberContent {
  id: string;
  url: string;
  thumbnail_url: string | null;
  type: 'video' | 'image';
  title: string | null;
  creator_name: string;
  creator_avatar: string | null;
  creator_slug: string | null;
}

export const INQUIRY_TYPE_LABELS: Record<InquiryType, string> = {
  general: 'General',
  collaboration: 'Colaboración',
  hiring: 'Contratación',
  partnership: 'Alianza',
  other: 'Otro',
};
