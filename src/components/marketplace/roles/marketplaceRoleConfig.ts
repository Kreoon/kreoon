import type { MarketplaceRoleDefinition, MarketplaceRoleCategory, MarketplaceRoleId, CampaignPricingMode } from '../types/marketplace';

// --- Role Categories ---

export const MARKETPLACE_ROLE_CATEGORIES: Record<MarketplaceRoleCategory, { label: string; icon: string; color: string }> = {
  content_creation: { label: 'Creación de Contenido', icon: 'Video', color: 'text-pink-400' },
  post_production: { label: 'Post-Producción', icon: 'Film', color: 'text-blue-400' },
  strategy: { label: 'Estrategia', icon: 'Target', color: 'text-green-400' },
  technology: { label: 'Tecnología', icon: 'Code', color: 'text-cyan-400' },
  education: { label: 'Educación', icon: 'GraduationCap', color: 'text-yellow-400' },
  client: { label: 'Cliente', icon: 'Briefcase', color: 'text-orange-400' },
};

// --- 20 Marketplace Roles ---

export const MARKETPLACE_ROLES: MarketplaceRoleDefinition[] = [
  // Content Creation (6)
  { id: 'ugc_creator', category: 'content_creation', label: 'Creador UGC', description: 'Crea contenido auténtico generado por usuarios', icon: 'Camera', color: 'text-pink-400', bgColor: 'bg-pink-500/15' },
  { id: 'lifestyle_creator', category: 'content_creation', label: 'Creador Lifestyle', description: 'Contenido de estilo de vida y tendencias', icon: 'Sparkles', color: 'text-rose-400', bgColor: 'bg-rose-500/15' },
  { id: 'micro_influencer', category: 'content_creation', label: 'Micro-Influencer', description: 'Influencer con 10K-100K seguidores', icon: 'Users', color: 'text-fuchsia-400', bgColor: 'bg-fuchsia-500/15' },
  { id: 'nano_influencer', category: 'content_creation', label: 'Nano-Influencer', description: 'Influencer con 1K-10K seguidores', icon: 'User', color: 'text-purple-400', bgColor: 'bg-purple-500/15' },
  { id: 'live_streamer', category: 'content_creation', label: 'Streamer en Vivo', description: 'Transmisiones en vivo y live shopping', icon: 'Radio', color: 'text-red-400', bgColor: 'bg-red-500/15' },
  { id: 'podcast_host', category: 'content_creation', label: 'Conductor de Podcast', description: 'Creador y conductor de podcasts', icon: 'Mic', color: 'text-violet-400', bgColor: 'bg-violet-500/15' },

  // Post-Producción (4)
  { id: 'video_editor', category: 'post_production', label: 'Editor de Video', description: 'Edición profesional de video', icon: 'Film', color: 'text-blue-400', bgColor: 'bg-blue-500/15' },
  { id: 'motion_graphics', category: 'post_production', label: 'Motion Graphics', description: 'Animación y gráficos en movimiento', icon: 'Layers', color: 'text-indigo-400', bgColor: 'bg-indigo-500/15' },
  { id: 'sound_designer', category: 'post_production', label: 'Diseñador de Sonido', description: 'Diseño sonoro y mezcla de audio', icon: 'Volume2', color: 'text-sky-400', bgColor: 'bg-sky-500/15' },
  { id: 'colorist', category: 'post_production', label: 'Colorista', description: 'Corrección y gradación de color', icon: 'Palette', color: 'text-teal-400', bgColor: 'bg-teal-500/15' },

  // Estrategia (3)
  { id: 'content_strategist', category: 'strategy', label: 'Estratega de Contenido', description: 'Planificación y estrategia de contenido', icon: 'Target', color: 'text-green-400', bgColor: 'bg-green-500/15' },
  { id: 'social_media_manager', category: 'strategy', label: 'Social Media Manager', description: 'Gestión de redes sociales', icon: 'Share2', color: 'text-emerald-400', bgColor: 'bg-emerald-500/15' },
  { id: 'community_manager', category: 'strategy', label: 'Community Manager', description: 'Gestión de comunidades online', icon: 'MessageCircle', color: 'text-lime-400', bgColor: 'bg-lime-500/15' },

  // Tecnología (3)
  { id: 'web_developer', category: 'technology', label: 'Desarrollador Web', description: 'Desarrollo web y landing pages', icon: 'Code', color: 'text-cyan-400', bgColor: 'bg-cyan-500/15' },
  { id: 'app_developer', category: 'technology', label: 'Desarrollador de Apps', description: 'Desarrollo de aplicaciones móviles', icon: 'Smartphone', color: 'text-blue-300', bgColor: 'bg-blue-400/15' },
  { id: 'ai_specialist', category: 'technology', label: 'Especialista en IA', description: 'Especialista en inteligencia artificial', icon: 'Brain', color: 'text-purple-300', bgColor: 'bg-purple-400/15' },

  // Educación (2)
  { id: 'online_instructor', category: 'education', label: 'Instructor Online', description: 'Cursos y formación digital', icon: 'GraduationCap', color: 'text-yellow-400', bgColor: 'bg-yellow-500/15' },
  { id: 'workshop_facilitator', category: 'education', label: 'Facilitador de Talleres', description: 'Talleres presenciales y virtuales', icon: 'Presentation', color: 'text-amber-400', bgColor: 'bg-amber-500/15' },

  // Cliente (2)
  { id: 'brand_manager', category: 'client', label: 'Gerente de Marca', description: 'Gestión de marca y reputación', icon: 'Briefcase', color: 'text-orange-400', bgColor: 'bg-orange-500/15' },
  { id: 'marketing_director', category: 'client', label: 'Director de Marketing', description: 'Dirección de marketing y campañas', icon: 'TrendingUp', color: 'text-red-300', bgColor: 'bg-red-400/15' },
];

// --- Quick lookup map ---

export const MARKETPLACE_ROLES_MAP: Record<MarketplaceRoleId, MarketplaceRoleDefinition> = Object.fromEntries(
  MARKETPLACE_ROLES.map(r => [r.id, r])
) as Record<MarketplaceRoleId, MarketplaceRoleDefinition>;

// --- Constants ---

export const MAX_ROLES_PER_CREATOR = 5;

// --- Pricing Mode Config ---

export const PRICING_MODE_CONFIG: Record<CampaignPricingMode, { label: string; description: string; icon: string; color: string }> = {
  fixed: { label: 'Precio Fijo', description: 'Precio definido por la marca', icon: 'DollarSign', color: 'text-green-400' },
  auction: { label: 'Subasta Abierta', description: 'Los creadores hacen ofertas libremente', icon: 'Gavel', color: 'text-orange-400' },
  range: { label: 'Rango de Presupuesto', description: 'Marca define min/max, creadores pujan dentro del rango', icon: 'ArrowUpDown', color: 'text-blue-400' },
};
