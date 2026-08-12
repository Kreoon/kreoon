import type { Specialization } from '@/types/database';

// --- Dynamic Filter Options (from RPC) ---

export interface LocationOption {
  country_code: string;
  country_name: string;
  country_flag: string;
  city: string | null;
}

export interface MarketplaceFilterOptions {
  locations: LocationOption[];
  content_types: string[];
  categories: string[];
}

/** Desglose del Trust Score por dimensión */
export interface TrustScoreBreakdown {
  reviews: number;   // max 30
  delivery: number;  // max 25
  projects: number;  // max 20
  profile: number;   // max 10
  portfolio: number; // max 10
  response: number;  // max 5
}

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
  /** URL de imagen/video destacado seleccionado por el creador */
  featured_media_url?: string | null;
  /** Tipo de media destacado: image o video */
  featured_media_type?: 'image' | 'video' | null;
  /** Projects completed within organizations (from content table) */
  org_projects?: number;
  joined_at: string;
  accepts_product_exchange: boolean;
  /** Average response time label e.g. "< 2h" */
  response_time_label?: string;
  marketplace_roles?: MarketplaceRoleId[];
  /** User has an active paid subscription (basic or pro) */
  is_subscribed?: boolean;
  /** Introductory discount % for first hires (Airbnb model) — null = not opted in */
  introductory_discount_pct?: number | null;
  /** Organization this creator belongs to */
  organization_id?: string | null;
  organization_name?: string | null;
  organization_logo?: string | null;
  /** Creator has Talent DNA profile applied */
  has_talent_dna?: boolean;
  /** Experience level from Talent DNA */
  experience_level?: 'beginner' | 'intermediate' | 'advanced' | 'expert' | null;
  /** Content style from Talent DNA */
  content_style?: {
    tone_descriptors?: string[];
    primary_style?: string;
  } | null;
  /** Creator specializations */
  specializations?: Specialization[];
  /** Trust Score 0-100, calculado automáticamente */
  trust_score?: number;
  /** Desglose del Trust Score por dimensión */
  trust_score_breakdown?: TrustScoreBreakdown;
  /** Es un perfil nuevo (< 30 días, 0 proyectos completados) */
  is_new_profile?: boolean;
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
  city: string | null;
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
  // Specialization filters
  specializations: Specialization[];
  // Organization filter
  organization_id: string | null;
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
  specializations?: Specialization[];
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

export type MarketplaceProjectType = 'creators' | 'production' | 'strategy';
export type ProjectStatus = 'pending' | 'briefing' | 'in_progress' | 'revision' | 'approved' | 'completed' | 'cancelled' | 'overdue';
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
  project_type?: MarketplaceProjectType;
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
  // Editor & payment split
  requires_editor?: boolean;
  editor_id?: string;
  editor_payout?: number;
  creator_payout?: number;
  platform_fee?: number;
  delivery_days?: number;
  // Overdue / novedades
  overdue_at?: string;
  overdue_action?: 'extend' | 'reassign' | 'cancel';
  overdue_notes?: string;
  deadline_extension_reason?: string;
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
  city: null,
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
  // Specialization filters
  specializations: [],
  // Organization filter
  organization_id: null,
};

// --- Phase 5: Marketplace Specialization Roles ---
// 4 categorias principales: creators, production, strategy, client

export type MarketplaceRoleCategory =
  | 'creators'    // Creadores de Contenido
  | 'production'  // Editores y Produccion
  | 'strategy'    // Estrategas (Digital + Creativo + CM)
  | 'client';     // Clientes/Marcas (oculto del marketplace publico)

export type MarketplaceRoleId =
  // Creadores (creators)
  | 'ugc_creator' | 'lifestyle_creator' | 'micro_influencer'
  | 'nano_influencer' | 'macro_influencer' | 'brand_ambassador'
  | 'live_streamer' | 'podcast_host'
  | 'photographer' | 'copywriter' | 'graphic_designer' | 'voice_artist'
  // Produccion (production)
  | 'video_editor' | 'motion_graphics' | 'sound_designer' | 'colorist'
  | 'director' | 'producer' | 'animator_2d3d'
  // Estrategas (strategy)
  | 'content_strategist' | 'social_media_manager' | 'community_manager'
  | 'digital_strategist' | 'trafficker' | 'seo_specialist'
  | 'email_marketer' | 'growth_hacker' | 'crm_specialist' | 'conversion_optimizer'
  // Cliente (client)
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

// --- Role-based Marketplace View ---

export type MarketplaceViewMode = 'all' | MarketplaceRoleCategory | 'agencies';

// --- Organization Marketplace Profile Types ---

export type MarketplaceTab = 'creators' | 'agencies';
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
  is_official_agency?: boolean;
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

export interface CaseStudy {
  id: string;
  campaign_id: string;
  brand_id: string;
  title: string;
  summary_html: string | null;
  metrics: Record<string, any>;
  creator_highlights: Array<{ name: string; avatar_url?: string; role?: string }>;
  gallery_urls: string[];
  is_published: boolean;
  is_featured: boolean;
  slug: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface BrandCredit {
  id: string;
  brand_id: string;
  balance: number;
  lifetime_earned: number;
  lifetime_spent: number;
  updated_at: string;
}

export interface BrandCreditTransaction {
  id: string;
  brand_id: string;
  amount: number;
  type: 'earned' | 'spent' | 'expired';
  source: 'referral' | 'promo' | 'manual';
  description: string | null;
  related_campaign_id: string | null;
  related_brand_id: string | null;
  created_at: string;
}

export interface SmartMatchResult {
  creator_id: string;
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  slug: string | null;
  rating_avg: number;
  completed_projects: number;
  match_score: number;
  match_reasons: string[];
}
