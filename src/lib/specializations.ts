import type { AppRole, Specialization, SpecializationCategory } from '@/types/database';
import type { LucideIcon } from 'lucide-react';
// Tree-shakeable imports - only include icons actually used in specializations
import {
  AudioLines,
  BarChart3,
  Briefcase,
  Building2,
  Clapperboard,
  Crown,
  Film,
  HeartHandshake,
  HelpCircle,
  ImageIcon,
  Layers,
  Lightbulb,
  Mail,
  Megaphone,
  Mic,
  MonitorPlay,
  MousePointerClick,
  Paintbrush,
  Palette,
  PenTool,
  Radio,
  Rocket,
  Search,
  Share2,
  Sparkles,
  Target,
  TrendingUp,
  User,
  Users,
  Video,
  Volume2,
  Wand2,
} from 'lucide-react';

// Static icon map for specializations (avoids import * which breaks tree-shaking)
const SPECIALIZATION_ICON_MAP: Record<string, LucideIcon> = {
  AudioLines,
  BarChart3,
  Briefcase,
  Building2,
  Clapperboard,
  Crown,
  Film,
  HeartHandshake,
  HelpCircle,
  ImageIcon,
  Layers,
  Lightbulb,
  Mail,
  Megaphone,
  Mic,
  MonitorPlay,
  MousePointerClick,
  Paintbrush,
  Palette,
  PenTool,
  Radio,
  Rocket,
  Search,
  Share2,
  Sparkles,
  Target,
  TrendingUp,
  User,
  Users,
  Video,
  Volume2,
  Wand2,
};

// ============================================================================
// SPECIALIZATION CONFIGURATION
// ============================================================================
// Configuracion centralizada de especializaciones para la plataforma
// Las especializaciones son metadata adicional para cada rol base

/** Configuracion de una especializacion */
export interface SpecializationConfig {
  id: Specialization;
  label: string;
  description: string;
  icon: string; // Lucide icon name
  color: string;
  bgColor: string;
  parentRole: SpecializationCategory;
}

// ============================================================================
// SPECIALIZATION_CONFIG - Mapeo completo de especializaciones
// ============================================================================

export const SPECIALIZATION_CONFIG: Record<Specialization, SpecializationConfig> = {
  // =========================================================================
  // CONTENT CREATOR (9 especializaciones)
  // =========================================================================
  ugc: {
    id: 'ugc',
    label: 'Creador UGC',
    description: 'Contenido autentico generado por usuarios',
    icon: 'Video',
    color: 'text-pink-400',
    bgColor: 'bg-pink-500/15',
    parentRole: 'content_creator',
  },
  nano_influencer: {
    id: 'nano_influencer',
    label: 'Nano-Influencer',
    description: 'Influencer con 1K-10K seguidores',
    icon: 'User',
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/15',
    parentRole: 'content_creator',
  },
  micro_influencer: {
    id: 'micro_influencer',
    label: 'Micro-Influencer',
    description: 'Influencer con 10K-100K seguidores',
    icon: 'Users',
    color: 'text-fuchsia-400',
    bgColor: 'bg-fuchsia-500/15',
    parentRole: 'content_creator',
  },
  macro_influencer: {
    id: 'macro_influencer',
    label: 'Macro-Influencer',
    description: 'Influencer con 100K-1M seguidores',
    icon: 'Crown',
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/15',
    parentRole: 'content_creator',
  },
  lifestyle: {
    id: 'lifestyle',
    label: 'Creador Lifestyle',
    description: 'Contenido de estilo de vida y tendencias',
    icon: 'Sparkles',
    color: 'text-rose-400',
    bgColor: 'bg-rose-500/15',
    parentRole: 'content_creator',
  },
  photographer: {
    id: 'photographer',
    label: 'Fotografo Profesional',
    description: 'Fotografia de producto, lifestyle y editorial',
    icon: 'ImageIcon',
    color: 'text-sky-400',
    bgColor: 'bg-sky-500/15',
    parentRole: 'content_creator',
  },
  live_streamer: {
    id: 'live_streamer',
    label: 'Streamer en Vivo',
    description: 'Transmisiones en vivo y live shopping',
    icon: 'Radio',
    color: 'text-red-400',
    bgColor: 'bg-red-500/15',
    parentRole: 'content_creator',
  },
  podcast_host: {
    id: 'podcast_host',
    label: 'Conductor de Podcast',
    description: 'Creador y conductor de podcasts',
    icon: 'Mic',
    color: 'text-violet-400',
    bgColor: 'bg-violet-500/15',
    parentRole: 'content_creator',
  },
  voice_artist: {
    id: 'voice_artist',
    label: 'Locutor / Voz en Off',
    description: 'Narracion, doblaje y voiceover',
    icon: 'AudioLines',
    color: 'text-teal-400',
    bgColor: 'bg-teal-500/15',
    parentRole: 'content_creator',
  },

  // =========================================================================
  // EDITOR / POST-PRODUCCION (7 especializaciones)
  // =========================================================================
  video_editor: {
    id: 'video_editor',
    label: 'Editor de Video',
    description: 'Edicion profesional de video',
    icon: 'Film',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/15',
    parentRole: 'editor',
  },
  motion_graphics: {
    id: 'motion_graphics',
    label: 'Motion Graphics',
    description: 'Animacion y graficos en movimiento',
    icon: 'Layers',
    color: 'text-indigo-400',
    bgColor: 'bg-indigo-500/15',
    parentRole: 'editor',
  },
  colorist: {
    id: 'colorist',
    label: 'Colorista',
    description: 'Correccion y gradacion de color',
    icon: 'Paintbrush',
    color: 'text-teal-400',
    bgColor: 'bg-teal-500/15',
    parentRole: 'editor',
  },
  sound_designer: {
    id: 'sound_designer',
    label: 'Disenador de Sonido',
    description: 'Diseno sonoro y mezcla de audio',
    icon: 'Volume2',
    color: 'text-sky-400',
    bgColor: 'bg-sky-500/15',
    parentRole: 'editor',
  },
  animator: {
    id: 'animator',
    label: 'Animador 2D/3D',
    description: 'Animacion de personajes y explainers',
    icon: 'Wand2',
    color: 'text-fuchsia-400',
    bgColor: 'bg-fuchsia-500/15',
    parentRole: 'editor',
  },
  director: {
    id: 'director',
    label: 'Director Creativo',
    description: 'Direccion creativa y conceptual',
    icon: 'Clapperboard',
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/15',
    parentRole: 'editor',
  },
  producer: {
    id: 'producer',
    label: 'Productor Audiovisual',
    description: 'Produccion integral de contenido',
    icon: 'MonitorPlay',
    color: 'text-rose-400',
    bgColor: 'bg-rose-500/15',
    parentRole: 'editor',
  },

  // =========================================================================
  // DIGITAL STRATEGIST (7 especializaciones)
  // =========================================================================
  seo: {
    id: 'seo',
    label: 'Especialista SEO',
    description: 'Posicionamiento organico en buscadores',
    icon: 'Search',
    color: 'text-green-400',
    bgColor: 'bg-green-500/15',
    parentRole: 'digital_strategist',
  },
  sem: {
    id: 'sem',
    label: 'Especialista SEM',
    description: 'Publicidad en buscadores (Google Ads)',
    icon: 'MousePointerClick',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/15',
    parentRole: 'digital_strategist',
  },
  trafficker: {
    id: 'trafficker',
    label: 'Trafficker / Media Buyer',
    description: 'Gestion de pauta y anuncios pagos',
    icon: 'Megaphone',
    color: 'text-red-400',
    bgColor: 'bg-red-500/15',
    parentRole: 'digital_strategist',
  },
  email_marketing: {
    id: 'email_marketing',
    label: 'Email Marketer',
    description: 'Automatizacion, newsletters y funnels',
    icon: 'Mail',
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/15',
    parentRole: 'digital_strategist',
  },
  growth_hacker: {
    id: 'growth_hacker',
    label: 'Growth Hacker',
    description: 'Crecimiento acelerado y experimentos',
    icon: 'Rocket',
    color: 'text-violet-400',
    bgColor: 'bg-violet-500/15',
    parentRole: 'digital_strategist',
  },
  cro: {
    id: 'cro',
    label: 'Optimizador de Conversion',
    description: 'CRO, A/B testing y landing pages',
    icon: 'BarChart3',
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/15',
    parentRole: 'digital_strategist',
  },
  crm: {
    id: 'crm',
    label: 'Especialista CRM',
    description: 'Gestion de relaciones con clientes',
    icon: 'HeartHandshake',
    color: 'text-pink-400',
    bgColor: 'bg-pink-500/15',
    parentRole: 'digital_strategist',
  },

  // =========================================================================
  // CREATIVE STRATEGIST (4 especializaciones)
  // =========================================================================
  content_strategy: {
    id: 'content_strategy',
    label: 'Estratega de Contenido',
    description: 'Planificacion y estrategia de contenido',
    icon: 'Target',
    color: 'text-green-400',
    bgColor: 'bg-green-500/15',
    parentRole: 'creative_strategist',
  },
  social_media: {
    id: 'social_media',
    label: 'Social Media Manager',
    description: 'Gestion de redes sociales',
    icon: 'Share2',
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/15',
    parentRole: 'creative_strategist',
  },
  copywriting: {
    id: 'copywriting',
    label: 'Copywriter',
    description: 'Textos publicitarios, guiones y captions',
    icon: 'PenTool',
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/15',
    parentRole: 'creative_strategist',
  },
  graphic_design: {
    id: 'graphic_design',
    label: 'Disenador Grafico',
    description: 'Branding, posts, banners y thumbnails',
    icon: 'Palette',
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/15',
    parentRole: 'creative_strategist',
  },

  // =========================================================================
  // CLIENT (3 especializaciones)
  // =========================================================================
  brand_manager: {
    id: 'brand_manager',
    label: 'Gerente de Marca',
    description: 'Gestion de marca y reputacion',
    icon: 'Briefcase',
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/15',
    parentRole: 'client',
  },
  marketing_director: {
    id: 'marketing_director',
    label: 'Director de Marketing',
    description: 'Direccion de marketing y campanas',
    icon: 'TrendingUp',
    color: 'text-red-300',
    bgColor: 'bg-red-400/15',
    parentRole: 'client',
  },
  agency: {
    id: 'agency',
    label: 'Agencia',
    description: 'Agencia de marketing o publicidad',
    icon: 'Building2',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/15',
    parentRole: 'client',
  },
};

// ============================================================================
// SPECIALIZATIONS_BY_ROLE - Agrupadas por rol
// ============================================================================

export const SPECIALIZATIONS_BY_ROLE: Record<SpecializationCategory, Specialization[]> = {
  content_creator: [
    'ugc',
    'nano_influencer',
    'micro_influencer',
    'macro_influencer',
    'lifestyle',
    'photographer',
    'live_streamer',
    'podcast_host',
    'voice_artist',
  ],
  editor: [
    'video_editor',
    'motion_graphics',
    'colorist',
    'sound_designer',
    'animator',
    'director',
    'producer',
  ],
  digital_strategist: [
    'seo',
    'sem',
    'trafficker',
    'email_marketing',
    'growth_hacker',
    'cro',
    'crm',
  ],
  creative_strategist: [
    'content_strategy',
    'social_media',
    'copywriting',
    'graphic_design',
  ],
  client: [
    'brand_manager',
    'marketing_director',
    'agency',
  ],
};

// ============================================================================
// ROLE CATEGORY LABELS - Etiquetas para categorias de especializacion
// ============================================================================

export const SPECIALIZATION_CATEGORY_LABELS: Record<SpecializationCategory, string> = {
  content_creator: 'Creador de Contenido',
  editor: 'Editor / Post-Produccion',
  digital_strategist: 'Estratega Digital',
  creative_strategist: 'Estratega Creativo',
  client: 'Cliente',
};

export const SPECIALIZATION_CATEGORY_ICONS: Record<SpecializationCategory, string> = {
  content_creator: 'Video',
  editor: 'Film',
  digital_strategist: 'Target',
  creative_strategist: 'Lightbulb',
  client: 'Briefcase',
};

export const SPECIALIZATION_CATEGORY_COLORS: Record<SpecializationCategory, string> = {
  content_creator: 'text-pink-400',
  editor: 'text-blue-400',
  digital_strategist: 'text-green-400',
  creative_strategist: 'text-purple-400',
  client: 'text-amber-400',
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Obtiene las especializaciones disponibles para un rol
 * @param role - El rol base (AppRole o SpecializationCategory)
 * @returns Array de especializaciones disponibles
 */
export function getSpecializationsForRole(role: AppRole | SpecializationCategory): Specialization[] {
  // Mapear AppRole a SpecializationCategory si es necesario
  const categoryMap: Partial<Record<AppRole, SpecializationCategory>> = {
    content_creator: 'content_creator',
    editor: 'editor',
    digital_strategist: 'digital_strategist',
    creative_strategist: 'creative_strategist',
    client: 'client',
  };

  const category = categoryMap[role as AppRole] || (role as SpecializationCategory);
  return SPECIALIZATIONS_BY_ROLE[category] || [];
}

/**
 * Obtiene la etiqueta de una especializacion
 * @param spec - El ID de la especializacion
 * @returns La etiqueta en espanol
 */
export function getSpecializationLabel(spec: Specialization): string {
  return SPECIALIZATION_CONFIG[spec]?.label || spec;
}

/**
 * Obtiene el nombre del icono de una especializacion
 * @param spec - El ID de la especializacion
 * @returns El nombre del icono de Lucide
 */
export function getSpecializationIcon(spec: Specialization): string {
  return SPECIALIZATION_CONFIG[spec]?.icon || 'HelpCircle';
}

/**
 * Obtiene el componente Lucide del icono de una especializacion
 * @param spec - El ID de la especializacion
 * @returns El componente LucideIcon
 */
export function getSpecializationIconComponent(spec: Specialization): LucideIcon {
  const iconName = SPECIALIZATION_CONFIG[spec]?.icon || 'HelpCircle';
  return SPECIALIZATION_ICON_MAP[iconName] || HelpCircle;
}

/**
 * Obtiene la configuracion completa de una especializacion
 * @param spec - El ID de la especializacion
 * @returns La configuracion completa o undefined
 */
export function getSpecializationConfig(spec: Specialization): SpecializationConfig | undefined {
  return SPECIALIZATION_CONFIG[spec];
}

/**
 * Obtiene el color de texto de una especializacion
 * @param spec - El ID de la especializacion
 * @returns La clase de color de Tailwind
 */
export function getSpecializationColor(spec: Specialization): string {
  return SPECIALIZATION_CONFIG[spec]?.color || 'text-muted-foreground';
}

/**
 * Obtiene el color de fondo de una especializacion
 * @param spec - El ID de la especializacion
 * @returns La clase de background de Tailwind
 */
export function getSpecializationBgColor(spec: Specialization): string {
  return SPECIALIZATION_CONFIG[spec]?.bgColor || 'bg-muted/50';
}

/**
 * Obtiene la descripcion de una especializacion
 * @param spec - El ID de la especializacion
 * @returns La descripcion en espanol
 */
export function getSpecializationDescription(spec: Specialization): string {
  return SPECIALIZATION_CONFIG[spec]?.description || '';
}

/**
 * Obtiene el rol padre de una especializacion
 * @param spec - El ID de la especializacion
 * @returns La categoria/rol padre
 */
export function getSpecializationParentRole(spec: Specialization): SpecializationCategory | undefined {
  return SPECIALIZATION_CONFIG[spec]?.parentRole;
}

/**
 * Verifica si una especializacion pertenece a un rol
 * @param spec - El ID de la especializacion
 * @param role - El rol a verificar
 * @returns true si la especializacion pertenece al rol
 */
export function isSpecializationForRole(spec: Specialization, role: AppRole | SpecializationCategory): boolean {
  const specializations = getSpecializationsForRole(role);
  return specializations.includes(spec);
}

/**
 * Obtiene todas las especializaciones como array
 * @returns Array de configuraciones de especializacion
 */
export function getAllSpecializations(): SpecializationConfig[] {
  return Object.values(SPECIALIZATION_CONFIG);
}

/**
 * Obtiene especializaciones filtradas por categoria
 * @param category - La categoria a filtrar
 * @returns Array de configuraciones de especializacion
 */
export function getSpecializationsByCategory(category: SpecializationCategory): SpecializationConfig[] {
  const specs = SPECIALIZATIONS_BY_ROLE[category] || [];
  return specs.map(s => SPECIALIZATION_CONFIG[s]).filter(Boolean);
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Max specializations per user */
export const MAX_SPECIALIZATIONS_PER_USER = 5;

/** Lista de todas las especializaciones como array de IDs */
export const ALL_SPECIALIZATIONS: Specialization[] = Object.keys(SPECIALIZATION_CONFIG) as Specialization[];

/** Categorias de especializacion de talento (excluye client) */
export const TALENT_SPECIALIZATION_CATEGORIES: SpecializationCategory[] = [
  'content_creator',
  'editor',
  'digital_strategist',
  'creative_strategist',
];
