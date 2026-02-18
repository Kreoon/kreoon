// =====================================================
// TIPOS PARA EL CRM DE KREOON
// =====================================================

// =====================================================
// ENUMS / UNION TYPES
// =====================================================

// --- Platform Leads ---

export type LeadType = 'talent' | 'brand' | 'organization' | 'other';

export type LeadStage = 'new' | 'contacted' | 'interested' | 'demo_scheduled' | 'converted' | 'lost';

export type TalentCategory =
  | 'content_creation'
  | 'post_production'
  | 'strategy_marketing'
  | 'technology'
  | 'education'
  | 'client';

export type SpecificRole =
  // Content Creation (12)
  | 'ugc_creator' | 'lifestyle_creator' | 'micro_influencer' | 'nano_influencer'
  | 'macro_influencer' | 'brand_ambassador' | 'live_streamer' | 'podcast_host'
  | 'photographer' | 'copywriter' | 'graphic_designer' | 'voice_artist'
  // Post-Production (7)
  | 'video_editor' | 'motion_graphics' | 'sound_designer' | 'colorist'
  | 'director' | 'producer' | 'animator_2d3d'
  // Strategy & Marketing (10)
  | 'content_strategist' | 'social_media_manager' | 'community_manager'
  | 'digital_strategist' | 'trafficker' | 'seo_specialist' | 'email_marketer'
  | 'growth_hacker' | 'crm_specialist' | 'conversion_optimizer'
  // Technology (3)
  | 'web_developer' | 'app_developer' | 'ai_specialist'
  // Education (2)
  | 'online_instructor' | 'workshop_facilitator'
  // Client (2)
  | 'brand_manager' | 'marketing_director';

export type TalentSubtype = 'creator' | 'editor' | 'both';

export type RegistrationIntent = 'talent' | 'brand' | 'organization' | 'join';

export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert';

export type LeadSource = 'tiktok' | 'instagram' | 'referral' | 'website' | 'event' | 'whatsapp';

export type LeadInteractionType =
  | 'email_sent' | 'email_opened' | 'email_clicked'
  | 'whatsapp_sent' | 'whatsapp_reply'
  | 'call' | 'meeting' | 'demo'
  | 'form_submitted' | 'page_visited'
  | 'note';

// --- Platform User Health ---

export type HealthStatus = 'healthy' | 'at_risk' | 'churning' | 'churned';

// --- Org Contacts ---

export type ContactType = 'lead' | 'client' | 'partner' | 'vendor' | 'influencer' | 'other';

export type RelationshipStrength = 'cold' | 'warm' | 'hot';

// --- Org Creator Relationships ---

export type CreatorRelationshipType = 'favorite' | 'blocked' | 'team_member' | 'contacted' | 'worked_with';

// --- Org Contact Interactions ---

export type OrgInteractionType = 'email' | 'call' | 'meeting' | 'whatsapp' | 'proposal_sent' | 'contract_signed' | 'note';

export type InteractionOutcome = 'positive' | 'neutral' | 'negative';

// --- Org Pipelines ---

export type PipelineType = 'sales' | 'creators' | 'partnerships' | 'custom';

// =====================================================
// LABELS
// =====================================================

export const LEAD_TYPE_LABELS: Record<LeadType, string> = {
  talent: 'Talento',
  brand: 'Marca',
  organization: 'Organización',
  other: 'Otro',
};

export const TALENT_CATEGORY_LABELS: Record<TalentCategory, string> = {
  content_creation: 'Creación de Contenido',
  post_production: 'Post-Producción',
  strategy_marketing: 'Estrategia & Marketing',
  technology: 'Tecnología',
  education: 'Educación',
  client: 'Cliente/Marca',
};

export const TALENT_CATEGORY_COLORS: Record<TalentCategory, string> = {
  content_creation: 'bg-pink-500/20 text-pink-300 border-pink-500/30',
  post_production: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  strategy_marketing: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  technology: 'bg-green-500/20 text-green-300 border-green-500/30',
  education: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  client: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
};

export const SPECIFIC_ROLE_LABELS: Record<SpecificRole, string> = {
  // Content Creation
  ugc_creator: 'Creador UGC',
  lifestyle_creator: 'Creador Lifestyle',
  micro_influencer: 'Micro-Influencer (10K-100K)',
  nano_influencer: 'Nano-Influencer (1K-10K)',
  macro_influencer: 'Macro-Influencer (100K-1M)',
  brand_ambassador: 'Embajador de Marca',
  live_streamer: 'Streamer en Vivo',
  podcast_host: 'Conductor de Podcast',
  photographer: 'Fotógrafo Profesional',
  copywriter: 'Copywriter',
  graphic_designer: 'Diseñador Gráfico',
  voice_artist: 'Locutor / Voz en Off',
  // Post-Production
  video_editor: 'Editor de Video',
  motion_graphics: 'Motion Graphics',
  sound_designer: 'Diseñador de Sonido',
  colorist: 'Colorista',
  director: 'Director Creativo',
  producer: 'Productor Audiovisual',
  animator_2d3d: 'Animador 2D/3D',
  // Strategy & Marketing
  content_strategist: 'Estratega de Contenido',
  social_media_manager: 'Social Media Manager',
  community_manager: 'Community Manager',
  digital_strategist: 'Estratega Digital',
  trafficker: 'Trafficker / Media Buyer',
  seo_specialist: 'Especialista SEO/SEM',
  email_marketer: 'Email Marketer',
  growth_hacker: 'Growth Hacker',
  crm_specialist: 'Especialista CRM',
  conversion_optimizer: 'Optimizador de Conversión',
  // Technology
  web_developer: 'Desarrollador Web',
  app_developer: 'Desarrollador de Apps',
  ai_specialist: 'Especialista en IA',
  // Education
  online_instructor: 'Instructor Online',
  workshop_facilitator: 'Facilitador de Talleres',
  // Client
  brand_manager: 'Gerente de Marca',
  marketing_director: 'Director de Marketing',
};

export const TALENT_SUBTYPE_LABELS: Record<TalentSubtype, string> = {
  creator: 'Talento',
  editor: 'Editor/Productor',
  both: 'Ambos',
};

export const EXPERIENCE_LEVEL_LABELS: Record<ExperienceLevel, string> = {
  beginner: 'Principiante',
  intermediate: 'Intermedio',
  advanced: 'Avanzado',
  expert: 'Experto',
};

export const REGISTRATION_INTENT_LABELS: Record<RegistrationIntent, string> = {
  talent: 'Quiero ofrecer mis servicios',
  brand: 'Busco talento para mi marca',
  organization: 'Gestiono equipos/agencia',
  join: 'Quiero unirme al equipo Kreoon',
};

export const CATEGORY_ROLES: Record<TalentCategory, SpecificRole[]> = {
  content_creation: [
    'ugc_creator', 'lifestyle_creator', 'micro_influencer', 'nano_influencer',
    'macro_influencer', 'brand_ambassador', 'live_streamer', 'podcast_host',
    'photographer', 'copywriter', 'graphic_designer', 'voice_artist',
  ],
  post_production: [
    'video_editor', 'motion_graphics', 'sound_designer', 'colorist',
    'director', 'producer', 'animator_2d3d',
  ],
  strategy_marketing: [
    'content_strategist', 'social_media_manager', 'community_manager',
    'digital_strategist', 'trafficker', 'seo_specialist', 'email_marketer',
    'growth_hacker', 'crm_specialist', 'conversion_optimizer',
  ],
  technology: [
    'web_developer', 'app_developer', 'ai_specialist',
  ],
  education: [
    'online_instructor', 'workshop_facilitator',
  ],
  client: [
    'brand_manager', 'marketing_director',
  ],
};

export const LEAD_STAGE_LABELS: Record<LeadStage, string> = {
  new: 'Nuevo',
  contacted: 'Contactado',
  interested: 'Interesado',
  demo_scheduled: 'Demo agendada',
  converted: 'Convertido',
  lost: 'Perdido',
};

export const LEAD_STAGE_COLORS: Record<LeadStage, string> = {
  new: 'bg-blue-500/20 text-blue-500',
  contacted: 'bg-purple-500/20 text-purple-500',
  interested: 'bg-yellow-500/20 text-yellow-500',
  demo_scheduled: 'bg-orange-500/20 text-orange-500',
  converted: 'bg-green-500/20 text-green-500',
  lost: 'bg-red-500/20 text-red-500',
};

export const LEAD_SOURCE_LABELS: Record<LeadSource, string> = {
  tiktok: 'TikTok',
  instagram: 'Instagram',
  referral: 'Referido',
  website: 'Sitio web',
  event: 'Evento',
  whatsapp: 'WhatsApp',
};

export const CONTACT_TYPE_LABELS: Record<ContactType, string> = {
  lead: 'Lead',
  client: 'Cliente',
  partner: 'Socio',
  vendor: 'Proveedor',
  influencer: 'Influencer',
  other: 'Otro',
};

export const RELATIONSHIP_STRENGTH_LABELS: Record<RelationshipStrength, string> = {
  cold: 'Fría',
  warm: 'Tibia',
  hot: 'Caliente',
};

export const RELATIONSHIP_STRENGTH_COLORS: Record<RelationshipStrength, string> = {
  cold: 'bg-blue-500/20 text-blue-500',
  warm: 'bg-yellow-500/20 text-yellow-500',
  hot: 'bg-red-500/20 text-red-500',
};

export const CREATOR_RELATIONSHIP_TYPE_LABELS: Record<CreatorRelationshipType, string> = {
  favorite: 'Favorito',
  blocked: 'Bloqueado',
  team_member: 'Miembro de equipo',
  contacted: 'Contactado',
  worked_with: 'Colaborador',
};

export const HEALTH_STATUS_LABELS: Record<HealthStatus, string> = {
  healthy: 'Saludable',
  at_risk: 'En riesgo',
  churning: 'Abandonando',
  churned: 'Perdido',
};

export const HEALTH_STATUS_COLORS: Record<HealthStatus, string> = {
  healthy: 'bg-green-500/20 text-green-500',
  at_risk: 'bg-yellow-500/20 text-yellow-500',
  churning: 'bg-orange-500/20 text-orange-500',
  churned: 'bg-red-500/20 text-red-500',
};

export const INTERACTION_OUTCOME_LABELS: Record<InteractionOutcome, string> = {
  positive: 'Positivo',
  neutral: 'Neutral',
  negative: 'Negativo',
};

export const PIPELINE_TYPE_LABELS: Record<PipelineType, string> = {
  sales: 'Ventas',
  creators: 'Talento',
  partnerships: 'Alianzas',
  custom: 'Personalizado',
};

// =====================================================
// INTERFACES - PLATFORM CRM
// =====================================================

// --- platform_leads ---

export interface SocialProfiles {
  instagram?: string;
  tiktok?: string;
  linkedin?: string;
  youtube?: string;
  twitter?: string;
  [key: string]: string | undefined;
}

export interface PlatformLead {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  lead_type: LeadType | null;
  lead_source: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  stage: LeadStage;
  lead_score: number;
  converted_at: string | null;
  converted_user_id: string | null;
  assigned_to: string | null;
  notes: string | null;
  tags: string[] | null;
  custom_fields: Record<string, unknown>;
  // Marketplace role/category fields
  talent_category: TalentCategory | null;
  specific_role: SpecificRole | null;
  talent_subtype: TalentSubtype | null;
  registration_intent: RegistrationIntent | null;
  experience_level: ExperienceLevel | null;
  interests: string[];
  portfolio_url: string | null;
  social_profiles: SocialProfiles;
  city: string | null;
  country: string | null;
  created_at: string;
  updated_at: string;
}

export interface PlatformLeadInsert {
  full_name?: string;
  email?: string;
  phone?: string;
  lead_type?: LeadType;
  lead_source?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  stage?: LeadStage;
  lead_score?: number;
  assigned_to?: string;
  notes?: string;
  tags?: string[];
  custom_fields?: Record<string, unknown>;
  // Marketplace role/category fields
  talent_category?: TalentCategory;
  specific_role?: SpecificRole;
  talent_subtype?: TalentSubtype;
  registration_intent?: RegistrationIntent;
  experience_level?: ExperienceLevel;
  interests?: string[];
  portfolio_url?: string;
  social_profiles?: SocialProfiles;
  city?: string;
  country?: string;
}

export type PlatformLeadUpdate = Partial<PlatformLeadInsert>;

// --- platform_lead_interactions ---

export interface PlatformLeadInteraction {
  id: string;
  lead_id: string;
  interaction_type: LeadInteractionType;
  subject: string | null;
  content: string | null;
  metadata: Record<string, unknown>;
  performed_by: string | null;
  created_at: string;
}

export interface PlatformLeadInteractionInsert {
  lead_id: string;
  interaction_type: LeadInteractionType;
  subject?: string;
  content?: string;
  metadata?: Record<string, unknown>;
  performed_by?: string;
}

// --- platform_user_health ---

export interface PlatformUserHealth {
  id: string;
  user_id: string;
  last_login_at: string | null;
  total_logins: number;
  days_since_last_activity: number | null;
  total_applications: number;
  total_completed_projects: number;
  average_rating: number | null;
  total_campaigns_created: number;
  total_content_received: number;
  total_spent: number;
  health_score: number;
  health_status: HealthStatus | null;
  needs_attention: boolean;
  last_contact_at: string | null;
  updated_at: string;
}

export interface PlatformUserHealthUpdate {
  last_login_at?: string;
  total_logins?: number;
  days_since_last_activity?: number;
  total_applications?: number;
  total_completed_projects?: number;
  average_rating?: number;
  total_campaigns_created?: number;
  total_content_received?: number;
  total_spent?: number;
  health_score?: number;
  health_status?: HealthStatus;
  needs_attention?: boolean;
  last_contact_at?: string;
}

// =====================================================
// INTERFACES - ORG CRM
// =====================================================

// --- org_contacts ---

export interface OrgContact {
  id: string;
  organization_id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  position: string | null;
  avatar_url: string | null;
  contact_type: ContactType | null;
  pipeline_stage: string | null;
  deal_value: number | null;
  expected_close_date: string | null;
  relationship_strength: RelationshipStrength | null;
  notes: string | null;
  tags: string[] | null;
  custom_fields: Record<string, unknown>;
  social_links: Record<string, string>;
  created_by: string | null;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrgContactInsert {
  organization_id: string;
  full_name: string;
  email?: string;
  phone?: string;
  company?: string;
  position?: string;
  avatar_url?: string;
  contact_type?: ContactType;
  pipeline_stage?: string;
  deal_value?: number;
  expected_close_date?: string;
  relationship_strength?: RelationshipStrength;
  notes?: string;
  tags?: string[];
  custom_fields?: Record<string, unknown>;
  social_links?: Record<string, string>;
  assigned_to?: string;
}

export type OrgContactUpdate = Partial<Omit<OrgContactInsert, 'organization_id'>>;

// --- org_creator_relationships ---

export interface OrgCreatorRelationship {
  id: string;
  organization_id: string;
  creator_id: string;
  relationship_type: CreatorRelationshipType | null;
  times_worked_together: number;
  total_paid: number;
  average_rating_given: number | null;
  last_collaboration_at: string | null;
  internal_notes: string | null;
  internal_tags: string[] | null;
  list_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrgCreatorRelationshipInsert {
  organization_id: string;
  creator_id: string;
  relationship_type: CreatorRelationshipType;
  times_worked_together?: number;
  total_paid?: number;
  average_rating_given?: number;
  last_collaboration_at?: string;
  internal_notes?: string;
  internal_tags?: string[];
  list_name?: string;
}

export type OrgCreatorRelationshipUpdate = Partial<Omit<OrgCreatorRelationshipInsert, 'organization_id' | 'creator_id' | 'relationship_type'>>;

// --- org_contact_interactions ---

export interface OrgContactInteraction {
  id: string;
  organization_id: string;
  contact_id: string;
  interaction_type: OrgInteractionType | null;
  subject: string | null;
  content: string | null;
  outcome: InteractionOutcome | null;
  next_action: string | null;
  next_action_date: string | null;
  performed_by: string | null;
  created_at: string;
}

export interface OrgContactInteractionInsert {
  organization_id: string;
  contact_id: string;
  interaction_type: OrgInteractionType;
  subject?: string;
  content?: string;
  outcome?: InteractionOutcome;
  next_action?: string;
  next_action_date?: string;
  performed_by?: string;
}

// --- org_pipelines ---

export interface PipelineStage {
  name: string;
  order: number;
  color?: string;
}

export interface OrgPipeline {
  id: string;
  organization_id: string;
  name: string;
  pipeline_type: PipelineType | null;
  stages: PipelineStage[];
  is_default: boolean;
  created_at: string;
}

export interface OrgPipelineInsert {
  organization_id: string;
  name: string;
  pipeline_type?: PipelineType;
  stages: PipelineStage[];
  is_default?: boolean;
}

export type OrgPipelineUpdate = Partial<Omit<OrgPipelineInsert, 'organization_id'>>;

// =====================================================
// INTERFACES - VIEWS
// =====================================================

export interface PlatformLeadSummary extends PlatformLead {
  interaction_count: number;
  last_interaction_at: string | null;
  last_interaction_type: LeadInteractionType | null;
  assigned_to_name: string | null;
}

export interface OrgCreatorWithStats extends OrgCreatorRelationship {
  creator_name: string;
  creator_email: string;
  creator_avatar: string | null;
  creator_bio: string | null;
  categories: string[] | null;
  content_types: string[] | null;
  creator_platforms: string[] | null;
}

export interface UserNeedingAttention extends PlatformUserHealth {
  full_name: string;
  email: string;
  avatar_url: string | null;
}

// =====================================================
// INTERFACES - FUNCTION RESPONSES
// =====================================================

export interface LeadStats {
  by_stage: Record<LeadStage, number>;
  by_source: Record<string, number>;
  conversion_rate: number;
  leads_in_period: number;
  total_leads: number;
}

// =====================================================
// FULL DETAIL INTERFACES (for expanded panels)
// =====================================================

export interface PortfolioItemSummary {
  id: string;
  title: string | null;
  media_type: string;
  media_url: string;
  thumbnail_url: string | null;
  bunny_video_id: string | null;
  category: string | null;
  is_featured: boolean;
}

export interface ServiceSummary {
  id: string;
  title: string;
  service_type: string;
  price_type: string;
  price_amount: number | null;
  price_currency: string;
  delivery_days: number | null;
  is_featured: boolean;
}

export interface RoleSummary {
  role: string;
  organization_id: string;
  organization_name: string;
}

export interface BadgeSummary {
  badge: string;
  level: string;
  is_active: boolean;
  granted_at: string;
}

export interface OrganizationMembership {
  organization_id: string;
  organization_name: string;
  role: string | null;
  is_owner: boolean;
  joined_at: string;
}

export interface CompanyLink {
  client_id: string;
  client_name: string;
  organization_id: string;
  organization_name: string;
  role: string;
  created_at: string;
}

export interface FullUserDetail {
  // profiles
  id: string;
  email: string;
  full_name: string;
  username: string | null;
  avatar_url: string | null;
  phone: string | null;
  bio: string | null;
  tagline: string | null;
  cover_url: string | null;
  document_type: string | null;
  document_number: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  instagram: string | null;
  tiktok: string | null;
  facebook: string | null;
  social_linkedin: string | null;
  social_twitter: string | null;
  social_youtube: string | null;
  portfolio_url: string | null;
  featured_video_url: string | null;
  experience_level: string | null;
  availability_status: string | null;
  best_at: string | null;
  content_categories: string[];
  specialties_tags: string[];
  style_keywords: string[];
  industries: string[];
  interests: string[];
  languages: string[];
  rate_per_content: number | null;
  rate_currency: string | null;
  quality_score_avg: number | null;
  reliability_score: number | null;
  velocity_score: number | null;
  editor_rating: number | null;
  is_ambassador: boolean;
  is_platform_founder: boolean;
  founder_badge_type: string | null;
  active_role: string | null;
  ai_recommended_level: string | null;
  ai_risk_flag: string | null;
  is_active: boolean;
  crm_custom_fields: Record<string, unknown>;
  created_at: string;
  // creator_profiles (nullable)
  creator_profile_id: string | null;
  slug: string | null;
  bio_full: string | null;
  banner_url: string | null;
  creator_social_links: Record<string, string> | null;
  level: string | null;
  is_verified: boolean;
  is_available: boolean;
  rating_avg: number;
  rating_count: number;
  completed_projects: number;
  base_price: number | null;
  currency: string;
  categories: string[];
  content_types: string[];
  platforms: string[];
  marketplace_roles: string[];
  accepts_product_exchange: boolean;
  response_time_hours: number | null;
  on_time_delivery_pct: number | null;
  repeat_clients_pct: number | null;
  showreel_video_id: string | null;
  showreel_url: string | null;
  showreel_thumbnail: string | null;
  // health
  health_score: number;
  health_status: string;
  total_logins: number;
  days_since_last_activity: number | null;
  last_login_at: string | null;
  needs_attention: boolean;
  total_applications: number;
  total_completed_projects: number;
  total_spent: number;
  // org context
  organization_id: string | null;
  organization_name: string | null;
  is_owner: boolean;
  ambassador_level: string | null;
  // cross-org
  organizations: OrganizationMembership[];
  companies: CompanyLink[];
  // nested
  roles: RoleSummary[];
  badges: BadgeSummary[];
  portfolio: PortfolioItemSummary[];
  services: ServiceSummary[];
}

export interface FullCreatorDetail {
  // profiles
  id: string;
  email: string;
  full_name: string;
  username: string | null;
  avatar_url: string | null;
  phone: string | null;
  bio: string | null;
  tagline: string | null;
  cover_url: string | null;
  city: string | null;
  country: string | null;
  instagram: string | null;
  tiktok: string | null;
  facebook: string | null;
  social_linkedin: string | null;
  social_twitter: string | null;
  social_youtube: string | null;
  portfolio_url: string | null;
  featured_video_url: string | null;
  experience_level: string | null;
  availability_status: string | null;
  best_at: string | null;
  content_categories: string[];
  specialties_tags: string[];
  style_keywords: string[];
  industries: string[];
  interests: string[];
  languages: string[];
  rate_per_content: number | null;
  rate_currency: string | null;
  quality_score_avg: number | null;
  reliability_score: number | null;
  velocity_score: number | null;
  editor_rating: number | null;
  active_role: string | null;
  is_ambassador: boolean;
  crm_custom_fields: Record<string, unknown>;
  profile_created_at: string;
  // creator_profiles
  creator_profile_id: string;
  user_id: string;
  slug: string;
  display_name: string;
  bio_full: string | null;
  banner_url: string | null;
  location_city: string | null;
  location_country: string | null;
  country_flag: string | null;
  creator_social_links: Record<string, string> | null;
  level: string;
  is_verified: boolean;
  is_available: boolean;
  is_active: boolean;
  rating_avg: number;
  rating_count: number;
  completed_projects: number;
  base_price: number | null;
  currency: string;
  categories: string[];
  content_types: string[];
  platforms: string[];
  marketplace_roles: string[];
  accepts_product_exchange: boolean;
  exchange_conditions: string | null;
  response_time_hours: number | null;
  on_time_delivery_pct: number | null;
  repeat_clients_pct: number | null;
  showreel_video_id: string | null;
  showreel_url: string | null;
  showreel_thumbnail: string | null;
  created_at: string;
  total_earned: number;
  // nested
  portfolio: PortfolioItemSummary[];
  services: ServiceSummary[];
}

export interface FullOrgCreatorDetail {
  // relationship
  relationship_id: string;
  relationship_type: CreatorRelationshipType | null;
  times_worked_together: number;
  total_paid: number;
  average_rating_given: number | null;
  last_collaboration_at: string | null;
  internal_notes: string | null;
  internal_tags: string[] | null;
  list_name: string | null;
  custom_fields: Record<string, unknown>;
  relationship_created_at: string;
  // profiles
  id: string;
  email: string;
  full_name: string;
  username: string | null;
  avatar_url: string | null;
  phone: string | null;
  bio: string | null;
  tagline: string | null;
  cover_url: string | null;
  city: string | null;
  country: string | null;
  instagram: string | null;
  tiktok: string | null;
  facebook: string | null;
  social_linkedin: string | null;
  social_twitter: string | null;
  social_youtube: string | null;
  portfolio_url: string | null;
  experience_level: string | null;
  content_categories: string[];
  specialties_tags: string[];
  languages: string[];
  // creator_profiles
  creator_profile_id: string | null;
  slug: string | null;
  display_name: string | null;
  bio_full: string | null;
  banner_url: string | null;
  location_city: string | null;
  location_country: string | null;
  country_flag: string | null;
  creator_social_links: Record<string, string> | null;
  level: string | null;
  is_verified: boolean;
  is_available: boolean;
  is_active: boolean;
  rating_avg: number;
  rating_count: number;
  completed_projects: number;
  base_price: number | null;
  currency: string;
  categories: string[];
  content_types: string[];
  platforms: string[];
  marketplace_roles: string[];
  accepts_product_exchange: boolean;
  response_time_hours: number | null;
  on_time_delivery_pct: number | null;
  repeat_clients_pct: number | null;
  showreel_video_id: string | null;
  showreel_url: string | null;
  showreel_thumbnail: string | null;
  created_at: string;
  // nested
  portfolio: PortfolioItemSummary[];
  services: ServiceSummary[];
}

export type CrmCustomFieldType =
  | 'text' | 'textarea' | 'number' | 'date' | 'datetime'
  | 'select' | 'multiselect' | 'checkbox' | 'currency'
  | 'url' | 'email' | 'phone' | 'rating' | 'color' | 'tags';

export type CrmEntityType = 'user' | 'creator' | 'org_creator' | 'contact' | 'lead';

export interface CrmCustomFieldDefinition {
  id: string;
  organization_id: string;
  entity_type: CrmEntityType;
  name: string;
  field_type: CrmCustomFieldType;
  options: string[] | null;
  is_required: boolean;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface OrgCreatorStats {
  total_favorites: number;
  total_blocked: number;
  total_spent: number;
  top_collaborators: Array<{
    creator_id: string;
    full_name: string;
    avatar_url: string | null;
    times_worked_together: number;
    total_paid: number;
    average_rating_given: number | null;
  }>;
  by_list: Record<string, number>;
}
