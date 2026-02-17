// Plataformas de publicacion
export type SocialPlatform =
  | 'instagram_feed'
  | 'instagram_reels'
  | 'instagram_stories'
  | 'tiktok'
  | 'youtube'
  | 'youtube_shorts'
  | 'facebook'
  | 'twitter'
  | 'linkedin'
  | 'threads';

// Estado de verificacion de publicacion
export type PublicationVerificationStatus =
  | 'pending_content'
  | 'content_approved'
  | 'pending_publication'
  | 'pending_verification'
  | 'verified'
  | 'violation'
  | 'completed';

// Metodo de verificacion
export type VerificationMethod = 'manual' | 'api' | 'screenshot' | 'creator_confirm';

// Configuracion de bonus por engagement
export interface EngagementBonusConfig {
  enabled: boolean;
  per_1k_likes?: number;
  per_1k_comments?: number;
  per_1k_shares?: number;
  per_1k_views?: number;
  max_bonus: number;
}

// Configuracion completa de activacion de marca
export interface BrandActivationConfig {
  required_platforms: SocialPlatform[];
  min_followers: Record<string, number>;
  required_hashtags: string[];
  required_mentions: string[];
  min_post_duration_days: number;
  content_approval_required: boolean;
  allow_reshare_brand: boolean;
  usage_rights_duration_days: number;
  engagement_bonus: EngagementBonusConfig;
  verification_method: VerificationMethod;
  requires_insights_screenshot: boolean;
}

// Publicacion de activacion
export interface ActivationPublication {
  id: string;
  campaign_id: string;
  application_id: string;
  creator_id: string;
  deliverable_id?: string;

  // Plataforma y publicacion
  platform: SocialPlatform;
  publication_url?: string;
  publication_id?: string;

  // Contenido
  caption?: string;
  hashtags_used: string[];
  mentions_used: string[];

  // Verificacion
  verification_status: PublicationVerificationStatus;
  verification_method?: VerificationMethod;
  verified_at?: string;
  verified_by?: string;
  verification_notes?: string;

  // Screenshots
  publication_screenshot_url?: string;
  insights_screenshot_url?: string;

  // Metricas
  metrics_captured_at?: string;
  followers_at_post?: number;
  likes_count: number;
  comments_count: number;
  shares_count: number;
  saves_count: number;
  views_count: number;
  reach_count: number;
  impressions_count: number;
  engagement_rate?: number;
  metrics_last_updated?: string;

  // Duracion
  must_stay_until?: string;
  is_still_live: boolean;
  removed_detected_at?: string;

  // Pagos
  base_payment?: number;
  engagement_bonus?: number;
  total_payment?: number;
  bonus_calculated_at?: string;

  // Fechas
  content_submitted_at?: string;
  content_approved_at?: string;
  published_at?: string;
  created_at: string;
  updated_at: string;
}

// Stats de redes sociales del creador
export interface CreatorSocialStats {
  id: string;
  creator_profile_id: string;
  platform: SocialPlatform;
  username?: string;
  profile_url?: string;

  // Metricas
  followers_count: number;
  following_count: number;
  posts_count: number;
  avg_likes_per_post: number;
  avg_comments_per_post: number;
  avg_views_per_reel: number;
  engagement_rate?: number;

  // Demografia
  audience_demographics?: {
    age_ranges?: Record<string, number>;
    genders?: Record<string, number>;
    top_countries?: string[];
    top_cities?: string[];
  };

  // Verificacion
  is_verified: boolean;
  verified_at?: string;
  verification_screenshot_url?: string;

  stats_updated_at: string;
  created_at: string;
  updated_at: string;
}

// Resultado de elegibilidad
export interface ActivationEligibilityResult {
  meets_requirements: boolean;
  missing_requirements: Array<{
    type: 'min_followers';
    platform: string;
    required: number;
    actual: number;
  }>;
  creator_stats: Record<string, { required: number; actual: number }>;
}

// ── Constantes de plataformas ──────────────────────────────────────────────

export const SOCIAL_PLATFORMS: Record<SocialPlatform, {
  label: string;
  icon: string;
  color: string;
  bgColor: string;
}> = {
  instagram_feed: {
    label: 'Instagram Feed',
    icon: 'Instagram',
    color: 'text-pink-600',
    bgColor: 'bg-gradient-to-br from-purple-600 to-pink-500',
  },
  instagram_reels: {
    label: 'Instagram Reels',
    icon: 'Film',
    color: 'text-pink-600',
    bgColor: 'bg-gradient-to-br from-purple-600 to-pink-500',
  },
  instagram_stories: {
    label: 'Instagram Stories',
    icon: 'Circle',
    color: 'text-pink-600',
    bgColor: 'bg-gradient-to-br from-purple-600 to-pink-500',
  },
  tiktok: {
    label: 'TikTok',
    icon: 'Music',
    color: 'text-black dark:text-white',
    bgColor: 'bg-black',
  },
  youtube: {
    label: 'YouTube',
    icon: 'Youtube',
    color: 'text-red-600',
    bgColor: 'bg-red-600',
  },
  youtube_shorts: {
    label: 'YouTube Shorts',
    icon: 'Smartphone',
    color: 'text-red-600',
    bgColor: 'bg-red-600',
  },
  facebook: {
    label: 'Facebook',
    icon: 'Facebook',
    color: 'text-blue-600',
    bgColor: 'bg-blue-600',
  },
  twitter: {
    label: 'X (Twitter)',
    icon: 'Twitter',
    color: 'text-black dark:text-white',
    bgColor: 'bg-black',
  },
  linkedin: {
    label: 'LinkedIn',
    icon: 'Linkedin',
    color: 'text-blue-700',
    bgColor: 'bg-blue-700',
  },
  threads: {
    label: 'Threads',
    icon: 'AtSign',
    color: 'text-black dark:text-white',
    bgColor: 'bg-black',
  },
};

// ── Estados de verificacion con colores ────────────────────────────────────

export const VERIFICATION_STATUS_CONFIG: Record<PublicationVerificationStatus, {
  label: string;
  color: string;
  bgColor: string;
  description: string;
}> = {
  pending_content: {
    label: 'Pendiente Contenido',
    color: 'text-gray-600 dark:text-gray-400',
    bgColor: 'bg-gray-100 dark:bg-gray-800',
    description: 'El creador debe subir el contenido para aprobacion',
  },
  content_approved: {
    label: 'Contenido Aprobado',
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    description: 'Contenido aprobado, pendiente de publicacion',
  },
  pending_publication: {
    label: 'Pendiente Publicacion',
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-100 dark:bg-amber-900/30',
    description: 'El creador debe publicar y enviar el link',
  },
  pending_verification: {
    label: 'En Verificacion',
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30',
    description: 'Verificando que la publicacion cumple requisitos',
  },
  verified: {
    label: 'Verificado',
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    description: 'Publicacion verificada correctamente',
  },
  violation: {
    label: 'Violacion',
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
    description: 'El post fue eliminado antes de tiempo',
  },
  completed: {
    label: 'Completado',
    color: 'text-cyan-600 dark:text-cyan-400',
    bgColor: 'bg-cyan-100 dark:bg-cyan-900/30',
    description: 'Campana completada exitosamente',
  },
};
