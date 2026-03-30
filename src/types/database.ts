// =============================================================================
// ROLES SIMPLIFICADOS - 7 Roles Base + Especializaciones
// =============================================================================
// Sistema unificado de roles para toda la plataforma (marketplace, agencias, etc.)
// - Talento: 5 roles combinables entre sí
// - Cliente: 1 rol exclusivo (no combinable)
// - Admin: 1 rol de sistema

/**
 * 7 Roles Base de la plataforma
 * - admin: Administrador del sistema
 * - content_creator: Creador de contenido (UGC, influencers, fotógrafos, etc.)
 * - editor: Editor y producción audiovisual
 * - digital_strategist: Estratega digital (SEO, trafficker, growth, etc.)
 * - creative_strategist: Estratega creativo (content strategy, social media, etc.)
 * - community_manager: Community manager
 * - client: Cliente/Marca (EXCLUSIVO - no combinable con otros)
 */
export type AppRole =
  | 'admin'
  | 'content_creator'
  | 'editor'
  | 'digital_strategist'
  | 'creative_strategist'
  | 'community_manager'
  | 'client';

/** Roles de talento (combinables entre sí) */
export type TalentRole = Exclude<AppRole, 'admin' | 'client'>;

/** Tipo de usuario: talento busca trabajo, cliente contrata */
export type UserType = 'talent' | 'client' | 'admin';

/**
 * Especializaciones - metadata adicional para cada rol
 * Un usuario puede tener hasta 5 especializaciones
 */
export type Specialization =
  // Content Creator (9)
  | 'ugc'
  | 'nano_influencer'
  | 'micro_influencer'
  | 'macro_influencer'
  | 'lifestyle'
  | 'photographer'
  | 'live_streamer'
  | 'podcast_host'
  | 'voice_artist'
  // Editor (7)
  | 'video_editor'
  | 'motion_graphics'
  | 'colorist'
  | 'sound_designer'
  | 'animator'
  | 'director'
  | 'producer'
  // Digital Strategist (7)
  | 'seo'
  | 'sem'
  | 'trafficker'
  | 'email_marketing'
  | 'growth_hacker'
  | 'cro'
  | 'crm'
  // Creative Strategist (4)
  | 'content_strategy'
  | 'social_media'
  | 'copywriting'
  | 'graphic_design'
  // Client (3)
  | 'brand_manager'
  | 'marketing_director'
  | 'agency';

/** Categoría de especialización para UI */
export type SpecializationCategory =
  | 'content_creator'
  | 'editor'
  | 'digital_strategist'
  | 'creative_strategist'
  | 'client';

// =============================================================================
// LEGACY TYPES - Para compatibilidad con código existente
// =============================================================================
// Estos tipos se mantienen temporalmente para no romper imports existentes
// TODO: Migrar gradualmente y eliminar

/** @deprecated Use AppRole instead */
export type SystemRole = 'admin';

/** @deprecated Use AppRole instead */
export type LegacyRole =
  | 'creator'        // → content_creator
  | 'editor'         // → editor
  | 'strategist'     // → creative_strategist
  | 'client'         // → client
  | 'trafficker'     // → digital_strategist + trafficker specialization
  | 'ambassador'     // → content_creator + brand_ambassador badge
  | 'developer'      // REMOVED
  | 'educator'       // REMOVED
  | 'team_leader';   // → admin (for orgs)

/** @deprecated Use Specialization instead - kept for migration */
export type MarketplaceRole =
  | 'ugc_creator' | 'lifestyle_creator' | 'micro_influencer' | 'nano_influencer'
  | 'macro_influencer' | 'brand_ambassador' | 'live_streamer' | 'podcast_host'
  | 'photographer' | 'copywriter' | 'graphic_designer' | 'voice_artist'
  | 'video_editor' | 'motion_graphics' | 'sound_designer' | 'colorist'
  | 'director' | 'producer' | 'animator_2d3d'
  | 'content_strategist' | 'social_media_manager' | 'community_manager'
  | 'digital_strategist' | 'seo_specialist' | 'email_marketer'
  | 'growth_hacker' | 'crm_specialist' | 'conversion_optimizer'
  | 'web_developer' | 'app_developer' | 'ai_specialist'
  | 'online_instructor' | 'workshop_facilitator'
  | 'brand_manager' | 'marketing_director';

/** @deprecated - Combined type for backwards compatibility */
export type LegacyAppRole = SystemRole | LegacyRole | MarketplaceRole | AppRole;

// Ambassador badge levels (badge system - not a role)
export type AmbassadorLevel = 'bronze' | 'silver' | 'gold';

// Badge types available in the system
export type BadgeType = 'ambassador';

export type ContentStatus = 
  | 'draft'           // Creado
  | 'script_pending'  // Pendiente guión (legacy)
  | 'script_approved' // Guión Aprobado
  | 'assigned'        // Asignado
  | 'recording'       // En grabación
  | 'recorded'        // Grabado
  | 'editing'         // En Edición
  | 'delivered'       // Entregado
  | 'issue'           // Novedad
  | 'corrected'       // Corregido
  | 'review'          // En Revisión (legacy)
  | 'approved'        // Aprobado
  | 'rejected'        // Rechazado (legacy)
  | 'paid';           // Pagado (legacy)

export type PaymentStatus = 'pending' | 'partial' | 'paid';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  username: string | null;
  avatar_url: string | null;
  phone: string | null;
  bio: string | null;
  is_ambassador: boolean;
  is_superadmin?: boolean; // Platform superadmin - can access all organizations
  is_public: boolean | null;
  portfolio_url: string | null;
  instagram: string | null;
  tiktok: string | null;
  facebook: string | null;
  youtube: string | null;
  twitter: string | null;
  linkedin: string | null;
  city: string | null;
  address: string | null;
  document_type: string | null;
  document_number: string | null;
  current_organization_id: string | null;
  organization_status?: string;
  active_role?: AppRole | string | null;
  active_brand_id?: string | null;
  platform_access_unlocked?: boolean;
  display_currency?: string | null;
  country?: string | null;
  nationality?: string | null;
  date_of_birth?: string | null;
  onboarding_completed?: boolean;
  onboarding_completed_at?: string | null;
  profile_data_completed?: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
}

export interface Client {
  id: string;
  name: string;
  contact_email: string | null;
  contact_phone: string | null;
  logo_url: string | null;
  notes: string | null;
  user_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  client_id: string;
  name: string;
  description: string | null;
  strategy: string | null;
  market_research: string | null;
  ideal_avatar: string | null;
  sales_angles: string[] | null;
  brief_url: string | null;
  onboarding_url: string | null;
  research_url: string | null;
  created_at: string | null;
  updated_at: string | null;
  // Relations
  client?: Client;
}

export interface ClientPackage {
  id: string;
  client_id: string;
  name: string;
  description: string | null;
  total_value: number;
  content_quantity: number;
  hooks_per_video: number;
  creators_count: number;
  products_count: number;
  product_ids: string[];
  payment_status: PaymentStatus;
  paid_amount: number;
  paid_at: string | null;
  payment_due_date: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Relations
  client?: Client;
  products?: Product[];
}

export interface Content {
  id: string;
  title: string;
  description: string | null;
  script: string | null;
  video_url: string | null;
  thumbnail_url: string | null;
  status: ContentStatus;
  client_id: string | null;
  creator_id: string | null;
  editor_id: string | null;
  creator_payment: number;
  editor_payment: number;
  is_ambassador_content: boolean;
  is_published: boolean;
  views_count: number;
  likes_count: number;
  deadline: string | null;
  notes: string | null;
  script_approved_at: string | null;
  script_approved_by: string | null;
  approved_at: string | null;
  approved_by: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
  // Campos adicionales
  product: string | null;
  product_id: string | null;
  sales_angle: string | null;
  campaign_week: string | null;
  strategist_id: string | null;
  start_date: string | null;
  invoiced: boolean;
  drive_url: string | null;
  creator_assigned_at: string | null;
  editor_assigned_at: string | null;
  delivered_at: string | null;
  recorded_at: string | null;
  reference_url: string | null;
  creator_paid: boolean;
  editor_paid: boolean;
  // Bunny.net fields
  bunny_embed_url: string | null;
  video_processing_status: string | null;
  video_processing_started_at: string | null;
  hooks_count: number | null;
  video_urls: string[] | null;
  raw_video_urls: string[] | null;
  // Guidelines
  editor_guidelines: string | null;
  strategist_guidelines: string | null;
  trafficker_guidelines: string | null;
  designer_guidelines: string | null;
  admin_guidelines: string | null;
  // Sphere phase
  sphere_phase: 'engage' | 'solution' | 'remarketing' | 'fidelize' | null;
  // Marketing fields
  marketing_campaign_id: string | null;
  marketing_approved_at: string | null;
  marketing_approved_by: string | null;
  marketing_rejected_at: string | null;
  marketing_rejected_by: string | null;
  marketing_rejection_reason: string | null;
  strategy_status: string | null;
  // Kreoon Social fields
  shared_on_kreoon: boolean;
  show_on_creator_profile: boolean;
  show_on_client_profile: boolean;
  is_collaborative: boolean;
  shared_at: string | null;
  // Relaciones
  client?: Partial<Client>;
  creator?: Partial<Profile>;
  editor?: Partial<Profile>;
  strategist?: Partial<Profile>;
  product_rel?: Partial<Product>;
}

export interface ContentComment {
  id: string;
  content_id: string;
  user_id: string;
  comment: string;
  created_at: string;
}

export interface ContentHistory {
  id: string;
  content_id: string;
  user_id: string | null;
  old_status: ContentStatus | null;
  new_status: ContentStatus;
  notes: string | null;
  created_at: string;
}

export interface Payment {
  id: string;
  user_id: string;
  content_id: string | null;
  amount: number;
  payment_type: 'creator' | 'editor';
  status: 'pending' | 'paid';
  notes: string | null;
  paid_at: string | null;
  created_at: string;
}

// Mapeo de estados a etiquetas en español
export const STATUS_LABELS: Record<ContentStatus, string> = {
  draft: 'Creado',
  script_pending: 'Pendiente Guión',
  script_approved: 'Guión Aprobado',
  assigned: 'Asignado',
  recording: 'En Grabación',
  recorded: 'Grabado',
  editing: 'En Edición',
  delivered: 'Entregado',
  issue: 'Novedad',
  corrected: 'Corregido',
  review: 'En Revisión',
  approved: 'Aprobado',
  rejected: 'Rechazado',
  paid: 'Pagado'
};

// Colores para cada estado
export const STATUS_COLORS: Record<ContentStatus, string> = {
  draft: 'bg-muted text-muted-foreground',
  script_pending: 'bg-warning/10 text-warning',
  script_approved: 'bg-info/10 text-info',
  assigned: 'bg-purple-500/10 text-purple-500',
  recording: 'bg-orange-500/10 text-orange-500',
  recorded: 'bg-cyan-500/10 text-cyan-500',
  editing: 'bg-pink-500/10 text-pink-500',
  delivered: 'bg-emerald-500/10 text-emerald-500',
  issue: 'bg-destructive/10 text-destructive',
  corrected: 'bg-blue-500/10 text-blue-500',
  review: 'bg-yellow-500/10 text-yellow-500',
  approved: 'bg-success/10 text-success',
  rejected: 'bg-destructive/10 text-destructive',
  paid: 'bg-success/10 text-success'
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: 'Pendiente',
  partial: 'Parcial',
  paid: 'Pagado'
};

export const PAYMENT_STATUS_COLORS: Record<PaymentStatus, string> = {
  pending: 'bg-warning/10 text-warning',
  partial: 'bg-info/10 text-info',
  paid: 'bg-success/10 text-success'
};

// Estados en orden para el flujo del Kanban
export const STATUS_ORDER: ContentStatus[] = [
  'draft',
  'script_approved',
  'assigned',
  'recording',
  'recorded',
  'editing',
  'delivered',
  'issue',
  'corrected',
  'approved',
  'paid'
];

// Definición de columnas del Kanban - incluye todas las columnas base
// Las columnas dinámicas de organization_statuses se agregan automáticamente
export interface KanbanColumnDef {
  status: ContentStatus | string; // Allow custom status keys
  title: string;
  color: string;
}

export const KANBAN_COLUMNS: KanbanColumnDef[] = [
  { status: 'draft', title: 'Creado', color: 'bg-muted-foreground' },
  { status: 'script_approved', title: 'Guión Aprobado', color: 'bg-info' },
  { status: 'assigned', title: 'Asignado', color: 'bg-purple-500' },
  { status: 'recording', title: 'En Grabación', color: 'bg-orange-500' },
  { status: 'recorded', title: 'Grabado', color: 'bg-cyan-500' },
  { status: 'editing', title: 'En Edición', color: 'bg-pink-500' },
  { status: 'delivered', title: 'Entregado', color: 'bg-emerald-500' },
  { status: 'issue', title: 'Novedad', color: 'bg-destructive' },
  { status: 'corrected', title: 'Corregido', color: 'bg-blue-500' },
  { status: 'approved', title: 'Aprobado', color: 'bg-success' },
  { status: 'paid', title: 'Pagado', color: 'bg-purple-600' }
];