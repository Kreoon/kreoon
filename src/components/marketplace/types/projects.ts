// ============================================================
// ESTADOS DE PROYECTO
// ============================================================

export type ProjectStatus =
  | 'pending'      // Esperando que el creador acepte
  | 'briefing'     // En fase de brief
  | 'in_progress'  // En producción
  | 'review'       // En revisión por la marca
  | 'revision'     // Necesita revisiones
  | 'approved'     // Aprobado, pendiente pago
  | 'completed'    // Completado y pagado
  | 'cancelled';   // Cancelado

export type DeliverableStatus =
  | 'pending'
  | 'submitted'
  | 'approved'
  | 'rejected'
  | 'revision_requested';

export type PaymentMethod = 'payment' | 'exchange' | 'hybrid';

export type PaymentStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';

// ============================================================
// INTERFACES PRINCIPALES
// ============================================================

export type MarketplaceProjectType = 'creators' | 'production' | 'strategy';

export interface MarketplaceProject {
  id: string;
  brand_id?: string;
  creator_id: string;
  editor_id?: string;
  campaign_id?: string;
  application_id?: string;
  service_id?: string;
  organization_id?: string;
  package_name?: string;
  title: string;
  brief: ProjectBrief;
  status: ProjectStatus;
  project_type?: MarketplaceProjectType;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  total_price: number;
  platform_fee: number;
  creator_payout: number;
  currency: string;
  deliverables_count: number;
  deliverables_approved: number;
  revisions_used: number;
  revisions_limit: number;
  deadline?: string;
  started_at?: string;
  completed_at?: string;
  last_message_at?: string;
  unread_brand_messages: number;
  unread_creator_messages: number;
  created_at: string;
  updated_at: string;

  // Relaciones (pobladas según la consulta)
  campaign?: ProjectCampaign;
  creator?: ProjectCreator;
  brand?: ProjectBrand;
  organization?: ProjectOrganization;
  deliverables?: ProjectDeliverable[];
  application?: ProjectApplication;
}

export interface ProjectBrief {
  objectives?: string;
  target_audience?: string;
  key_messages?: string[];
  tone?: string;
  references?: string[];
  dos?: string[];
  donts?: string[];
  technical_specs?: {
    resolution?: string;
    aspect_ratio?: string;
    duration?: number;
    format?: string;
  };
  [key: string]: any;
}

export interface ProjectCampaign {
  id: string;
  title: string;
  description?: string;
  category?: string;
  content_requirements?: ContentRequirement[];
  brand_name_override?: string;
  is_brand_activation?: boolean;
  activation_config?: BrandActivationConfig;
}

export interface ContentRequirement {
  content_type: string;
  quantity: number;
  duration_seconds?: number;
  description?: string;
  specifications?: {
    aspect_ratio?: string;
    resolution?: string;
    format?: string;
  };
}

export interface BrandActivationConfig {
  required_platforms: string[];
  min_followers: Record<string, number>;
  required_hashtags: string[];
  required_mentions: string[];
  min_post_duration_days: number;
  content_approval_required: boolean;
  allow_reshare_brand: boolean;
  usage_rights_duration_days: number;
  engagement_bonus: {
    enabled: boolean;
    per_1k_likes?: number;
    per_1k_comments?: number;
    per_1k_shares?: number;
    max_bonus: number;
  };
  verification_method: 'manual' | 'api' | 'screenshot' | 'creator_confirm';
  requires_insights_screenshot: boolean;
}

export interface ProjectCreator {
  id: string;
  user_id: string;
  display_name: string;
  slug?: string;
  avatar_url?: string;
  marketplace_roles?: string[];
  rating_avg?: number;
  rating_count?: number;
  completed_projects?: number;
  location_city?: string;
  location_country?: string;
}

export interface ProjectBrand {
  id: string;
  name: string;
  logo_url?: string;
  website?: string;
}

export interface ProjectOrganization {
  id: string;
  name: string;
  logo_url?: string;
}

export interface ProjectApplication {
  id: string;
  bid_amount?: number;
  proposal?: string;
  portfolio_links?: string[];
  estimated_delivery_days?: number;
}

export interface ProjectDeliverable {
  id: string;
  campaign_id: string;
  creator_id: string;
  application_id?: string;
  title?: string;
  description?: string;
  file_url: string;
  file_type?: string;
  thumbnail_url?: string;
  duration_seconds?: number;
  file_size_mb?: number;
  revision_number: number;
  max_revisions: number;
  status: DeliverableStatus;
  feedback?: string;
  approved_by?: string;
  submitted_at?: string;
  reviewed_at?: string;
  updated_at?: string;
}

// ============================================================
// CONFIGURACIÓN DE UI
// ============================================================

export interface StatusConfig {
  label: string;
  color: string;
  bgColor: string;
  icon: string;
  description: string;
}

export const PROJECT_STATUS_CONFIG: Record<ProjectStatus, StatusConfig> = {
  pending: {
    label: 'Pendiente',
    color: 'text-amber-600',
    bgColor: 'bg-amber-100',
    icon: 'Clock',
    description: 'Esperando confirmación del creador',
  },
  briefing: {
    label: 'En Brief',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    icon: 'FileText',
    description: 'Definiendo detalles del proyecto',
  },
  in_progress: {
    label: 'En Producción',
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
    icon: 'Zap',
    description: 'El creador está trabajando en el contenido',
  },
  review: {
    label: 'En Revisión',
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-100',
    icon: 'Eye',
    description: 'Contenido enviado para revisión',
  },
  revision: {
    label: 'Revisiones',
    color: 'text-orange-600',
    bgColor: 'bg-orange-100',
    icon: 'RotateCcw',
    description: 'Se solicitaron cambios al contenido',
  },
  approved: {
    label: 'Aprobado',
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    icon: 'CheckCircle',
    description: 'Contenido aprobado, procesando pago',
  },
  completed: {
    label: 'Completado',
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-100',
    icon: 'Check',
    description: 'Proyecto finalizado exitosamente',
  },
  cancelled: {
    label: 'Cancelado',
    color: 'text-red-600',
    bgColor: 'bg-red-100',
    icon: 'XCircle',
    description: 'Proyecto cancelado',
  },
};

export const DELIVERABLE_STATUS_CONFIG: Record<DeliverableStatus, StatusConfig> = {
  pending: {
    label: 'Pendiente',
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
    icon: 'Clock',
    description: 'Esperando entregable',
  },
  submitted: {
    label: 'Enviado',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    icon: 'Upload',
    description: 'Entregable enviado para revisión',
  },
  approved: {
    label: 'Aprobado',
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    icon: 'Check',
    description: 'Entregable aprobado',
  },
  rejected: {
    label: 'Rechazado',
    color: 'text-red-600',
    bgColor: 'bg-red-100',
    icon: 'X',
    description: 'Entregable rechazado',
  },
  revision_requested: {
    label: 'Revisión',
    color: 'text-orange-600',
    bgColor: 'bg-orange-100',
    icon: 'RotateCcw',
    description: 'Se solicitaron cambios',
  },
};

// ============================================================
// ROLES DE MARKETPLACE
// ============================================================

export interface RoleConfig {
  id: string;
  label: string;
  category: RoleCategory;
  icon: string;
  color: string;
  description?: string;
}

export type RoleCategory =
  | 'creators'
  | 'production'
  | 'strategy'
  | 'client';

export const ROLE_CATEGORIES: Record<RoleCategory, { label: string; color: string }> = {
  creators: { label: 'Creadores', color: 'purple' },
  production: { label: 'Produccion', color: 'blue' },
  strategy: { label: 'Estrategas', color: 'green' },
  client: { label: 'Cliente', color: 'gray' },
};

export const MARKETPLACE_ROLES: RoleConfig[] = [
  // Creadores (12)
  { id: 'ugc_creator', label: 'Creador UGC', category: 'creators', icon: 'Camera', color: 'purple' },
  { id: 'lifestyle_creator', label: 'Creador Lifestyle', category: 'creators', icon: 'Heart', color: 'pink' },
  { id: 'micro_influencer', label: 'Micro-Influencer (10K-100K)', category: 'creators', icon: 'Users', color: 'blue' },
  { id: 'nano_influencer', label: 'Nano-Influencer (1K-10K)', category: 'creators', icon: 'Users', color: 'cyan' },
  { id: 'macro_influencer', label: 'Macro-Influencer (100K-1M)', category: 'creators', icon: 'Megaphone', color: 'orange' },
  { id: 'brand_ambassador', label: 'Embajador de Marca', category: 'creators', icon: 'Star', color: 'amber' },
  { id: 'live_streamer', label: 'Streamer en Vivo', category: 'creators', icon: 'Radio', color: 'red' },
  { id: 'podcast_host', label: 'Conductor de Podcast', category: 'creators', icon: 'Mic', color: 'green' },
  { id: 'photographer', label: 'Fotografo Profesional', category: 'creators', icon: 'Camera', color: 'slate' },
  { id: 'copywriter', label: 'Copywriter', category: 'creators', icon: 'PenTool', color: 'indigo' },
  { id: 'graphic_designer', label: 'Disenador Grafico', category: 'creators', icon: 'Palette', color: 'fuchsia' },
  { id: 'voice_artist', label: 'Locutor / Voz en Off', category: 'creators', icon: 'Mic', color: 'teal' },

  // Produccion (7)
  { id: 'video_editor', label: 'Editor de Video', category: 'production', icon: 'Film', color: 'blue' },
  { id: 'motion_graphics', label: 'Motion Graphics', category: 'production', icon: 'Sparkles', color: 'purple' },
  { id: 'sound_designer', label: 'Disenador de Sonido', category: 'production', icon: 'Music', color: 'cyan' },
  { id: 'colorist', label: 'Colorista', category: 'production', icon: 'Palette', color: 'orange' },
  { id: 'director', label: 'Director Creativo', category: 'production', icon: 'Film', color: 'slate' },
  { id: 'producer', label: 'Productor Audiovisual', category: 'production', icon: 'Clapperboard', color: 'gray' },
  { id: 'animator_2d3d', label: 'Animador 2D/3D', category: 'production', icon: 'Sparkles', color: 'pink' },

  // Estrategas (10)
  { id: 'content_strategist', label: 'Estratega de Contenido', category: 'strategy', icon: 'Target', color: 'green' },
  { id: 'social_media_manager', label: 'Social Media Manager', category: 'strategy', icon: 'Share2', color: 'blue' },
  { id: 'community_manager', label: 'Community Manager', category: 'strategy', icon: 'Users', color: 'purple' },
  { id: 'digital_strategist', label: 'Estratega Digital', category: 'strategy', icon: 'TrendingUp', color: 'cyan' },
  { id: 'trafficker', label: 'Trafficker / Media Buyer', category: 'strategy', icon: 'Zap', color: 'orange' },
  { id: 'seo_specialist', label: 'Especialista SEO/SEM', category: 'strategy', icon: 'Search', color: 'green' },
  { id: 'email_marketer', label: 'Email Marketer', category: 'strategy', icon: 'Mail', color: 'red' },
  { id: 'growth_hacker', label: 'Growth Hacker', category: 'strategy', icon: 'Rocket', color: 'purple' },
  { id: 'crm_specialist', label: 'Especialista CRM', category: 'strategy', icon: 'Users', color: 'blue' },
  { id: 'conversion_optimizer', label: 'Optimizador de Conversion', category: 'strategy', icon: 'Target', color: 'amber' },

  // Cliente (2)
  { id: 'brand_manager', label: 'Gerente de Marca', category: 'client', icon: 'Building2', color: 'gray' },
  { id: 'marketing_director', label: 'Director de Marketing', category: 'client', icon: 'Megaphone', color: 'slate' },
];

// Helper para obtener rol por ID
export const getRoleById = (id: string): RoleConfig | undefined => {
  return MARKETPLACE_ROLES.find(role => role.id === id);
};

// Helper para obtener roles por categoría
export const getRolesByCategory = (category: RoleCategory): RoleConfig[] => {
  return MARKETPLACE_ROLES.filter(role => role.category === category);
};

// ============================================================
// TIPOS DE CONTENIDO
// ============================================================

export interface ContentTypeConfig {
  id: string;
  label: string;
  icon: string;
  color: string;
  acceptedFiles: string;
  category: 'video' | 'image' | 'audio' | 'document' | 'mixed';
  defaultDuration?: number;
}

export const CONTENT_TYPES: ContentTypeConfig[] = [
  // Video
  { id: 'reels_tiktok', label: 'Reel / TikTok', icon: 'Film', color: 'pink', acceptedFiles: 'video/*', category: 'video', defaultDuration: 30 },
  { id: 'ugc', label: 'Video UGC', icon: 'Video', color: 'purple', acceptedFiles: 'video/*', category: 'video', defaultDuration: 60 },
  { id: 'testimonio', label: 'Testimonio', icon: 'Mic', color: 'blue', acceptedFiles: 'video/*,audio/*', category: 'mixed', defaultDuration: 90 },
  { id: 'unboxing', label: 'Unboxing', icon: 'Package', color: 'amber', acceptedFiles: 'video/*', category: 'video', defaultDuration: 120 },
  { id: 'story', label: 'Story', icon: 'Circle', color: 'orange', acceptedFiles: 'video/*,image/*', category: 'mixed', defaultDuration: 15 },
  { id: 'youtube_short', label: 'YouTube Short', icon: 'Youtube', color: 'red', acceptedFiles: 'video/*', category: 'video', defaultDuration: 60 },
  { id: 'youtube_video', label: 'Video YouTube', icon: 'Youtube', color: 'red', acceptedFiles: 'video/*', category: 'video', defaultDuration: 600 },

  // Image
  { id: 'foto_producto', label: 'Foto de Producto', icon: 'Camera', color: 'cyan', acceptedFiles: 'image/*', category: 'image' },
  { id: 'foto_lifestyle', label: 'Foto Lifestyle', icon: 'Heart', color: 'rose', acceptedFiles: 'image/*', category: 'image' },
  { id: 'carousel', label: 'Carrusel', icon: 'Images', color: 'indigo', acceptedFiles: 'image/*', category: 'image' },
  { id: 'infografia', label: 'Infografía', icon: 'BarChart', color: 'emerald', acceptedFiles: 'image/*,.pdf', category: 'image' },

  // Audio
  { id: 'podcast_clip', label: 'Clip de Podcast', icon: 'Mic', color: 'green', acceptedFiles: 'audio/*', category: 'audio', defaultDuration: 180 },
  { id: 'voiceover', label: 'Voz en Off', icon: 'Mic', color: 'teal', acceptedFiles: 'audio/*', category: 'audio' },
  { id: 'jingle', label: 'Jingle / Audio Ad', icon: 'Music', color: 'violet', acceptedFiles: 'audio/*', category: 'audio', defaultDuration: 30 },

  // Post-production
  { id: 'edicion_video', label: 'Edición de Video', icon: 'Film', color: 'violet', acceptedFiles: 'video/*', category: 'video' },
  { id: 'motion_graphics', label: 'Motion Graphics', icon: 'Sparkles', color: 'fuchsia', acceptedFiles: 'video/*', category: 'video' },
  { id: 'animacion_2d', label: 'Animación 2D', icon: 'Sparkles', color: 'purple', acceptedFiles: 'video/*', category: 'video' },
  { id: 'animacion_3d', label: 'Animación 3D', icon: 'Cube', color: 'blue', acceptedFiles: 'video/*', category: 'video' },

  // Design
  { id: 'diseno_grafico', label: 'Diseño Gráfico', icon: 'Palette', color: 'emerald', acceptedFiles: 'image/*,.pdf,.ai,.psd', category: 'image' },
  { id: 'logo', label: 'Logo / Identidad', icon: 'Hexagon', color: 'slate', acceptedFiles: 'image/*,.pdf,.ai,.svg', category: 'image' },
  { id: 'banner', label: 'Banner / Ad', icon: 'Rectangle', color: 'orange', acceptedFiles: 'image/*', category: 'image' },

  // Documents
  { id: 'copy', label: 'Copy / Texto', icon: 'FileText', color: 'slate', acceptedFiles: '.doc,.docx,.pdf,.txt', category: 'document' },
  { id: 'guion', label: 'Guión / Script', icon: 'FileText', color: 'gray', acceptedFiles: '.doc,.docx,.pdf,.txt', category: 'document' },
  { id: 'estrategia', label: 'Documento Estratégico', icon: 'FileText', color: 'blue', acceptedFiles: '.doc,.docx,.pdf,.pptx', category: 'document' },
];

// Helper para obtener tipo de contenido por ID
export const getContentTypeById = (id: string): ContentTypeConfig | undefined => {
  return CONTENT_TYPES.find(ct => ct.id.toLowerCase() === id.toLowerCase());
};
