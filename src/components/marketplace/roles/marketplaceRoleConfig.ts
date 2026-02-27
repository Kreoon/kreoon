import type { MarketplaceRoleDefinition, MarketplaceRoleCategory, MarketplaceRoleId, CampaignPricingMode } from '../types/marketplace';

// --- Role Categories ---

export const MARKETPLACE_ROLE_CATEGORIES: Record<MarketplaceRoleCategory, { label: string; icon: string; color: string }> = {
  content_creation: { label: 'Creación de Contenido', icon: 'Video', color: 'text-pink-400' },
  post_production: { label: 'Post-Producción', icon: 'Film', color: 'text-blue-400' },
  strategy_marketing: { label: 'Estrategia & Marketing', icon: 'Target', color: 'text-green-400' },
  technology: { label: 'Tecnología', icon: 'Code', color: 'text-cyan-400' },
  education: { label: 'Educación', icon: 'GraduationCap', color: 'text-yellow-400' },
  client: { label: 'Cliente', icon: 'Briefcase', color: 'text-amber-400' },
};

// --- 20 Marketplace Roles ---

export const MARKETPLACE_ROLES: MarketplaceRoleDefinition[] = [
  // Content Creation (12)
  { id: 'ugc_creator', category: 'content_creation', label: 'Creador UGC', description: 'Crea contenido auténtico generado por usuarios', icon: 'Camera', color: 'text-pink-400', bgColor: 'bg-pink-500/15' },
  { id: 'lifestyle_creator', category: 'content_creation', label: 'Creador Lifestyle', description: 'Contenido de estilo de vida y tendencias', icon: 'Sparkles', color: 'text-rose-400', bgColor: 'bg-rose-500/15' },
  { id: 'micro_influencer', category: 'content_creation', label: 'Micro-Influencer', description: 'Influencer con 10K-100K seguidores', icon: 'Users', color: 'text-fuchsia-400', bgColor: 'bg-fuchsia-500/15' },
  { id: 'nano_influencer', category: 'content_creation', label: 'Nano-Influencer', description: 'Influencer con 1K-10K seguidores', icon: 'User', color: 'text-purple-400', bgColor: 'bg-purple-500/15' },
  { id: 'macro_influencer', category: 'content_creation', label: 'Macro-Influencer', description: 'Influencer con 100K-1M seguidores', icon: 'Crown', color: 'text-amber-400', bgColor: 'bg-amber-500/15' },
  { id: 'brand_ambassador', category: 'content_creation', label: 'Embajador de Marca', description: 'Representante de marca a largo plazo', icon: 'Award', color: 'text-yellow-400', bgColor: 'bg-yellow-500/15' },
  { id: 'live_streamer', category: 'content_creation', label: 'Streamer en Vivo', description: 'Transmisiones en vivo y live shopping', icon: 'Radio', color: 'text-red-400', bgColor: 'bg-red-500/15' },
  { id: 'podcast_host', category: 'content_creation', label: 'Conductor de Podcast', description: 'Creador y conductor de podcasts', icon: 'Mic', color: 'text-violet-400', bgColor: 'bg-violet-500/15' },
  { id: 'photographer', category: 'content_creation', label: 'Fotógrafo Profesional', description: 'Fotografía de producto, lifestyle y editorial', icon: 'ImageIcon', color: 'text-sky-400', bgColor: 'bg-sky-500/15' },
  { id: 'copywriter', category: 'content_creation', label: 'Copywriter', description: 'Textos publicitarios, guiones y captions', icon: 'PenTool', color: 'text-emerald-400', bgColor: 'bg-emerald-500/15' },
  { id: 'graphic_designer', category: 'content_creation', label: 'Diseñador Gráfico', description: 'Branding, posts, banners y thumbnails', icon: 'Palette', color: 'text-orange-400', bgColor: 'bg-orange-500/15' },
  { id: 'voice_artist', category: 'content_creation', label: 'Locutor / Voz en Off', description: 'Narración, doblaje y voiceover', icon: 'AudioLines', color: 'text-teal-400', bgColor: 'bg-teal-500/15' },

  // Post-Producción (7)
  { id: 'video_editor', category: 'post_production', label: 'Editor de Video', description: 'Edición profesional de video', icon: 'Film', color: 'text-blue-400', bgColor: 'bg-blue-500/15' },
  { id: 'motion_graphics', category: 'post_production', label: 'Motion Graphics', description: 'Animación y gráficos en movimiento', icon: 'Layers', color: 'text-indigo-400', bgColor: 'bg-indigo-500/15' },
  { id: 'sound_designer', category: 'post_production', label: 'Diseñador de Sonido', description: 'Diseño sonoro y mezcla de audio', icon: 'Volume2', color: 'text-sky-400', bgColor: 'bg-sky-500/15' },
  { id: 'colorist', category: 'post_production', label: 'Colorista', description: 'Corrección y gradación de color', icon: 'Paintbrush', color: 'text-teal-400', bgColor: 'bg-teal-500/15' },
  { id: 'director', category: 'post_production', label: 'Director Creativo', description: 'Dirección creativa y conceptual', icon: 'Clapperboard', color: 'text-purple-400', bgColor: 'bg-purple-500/15' },
  { id: 'producer', category: 'post_production', label: 'Productor Audiovisual', description: 'Producción integral de contenido', icon: 'MonitorPlay', color: 'text-rose-400', bgColor: 'bg-rose-500/15' },
  { id: 'animator_2d3d', category: 'post_production', label: 'Animador 2D/3D', description: 'Animación de personajes y explainers', icon: 'Wand2', color: 'text-fuchsia-400', bgColor: 'bg-fuchsia-500/15' },

  // Estrategia & Marketing (10)
  { id: 'content_strategist', category: 'strategy_marketing', label: 'Estratega de Contenido', description: 'Planificación y estrategia de contenido', icon: 'Target', color: 'text-green-400', bgColor: 'bg-green-500/15' },
  { id: 'social_media_manager', category: 'strategy_marketing', label: 'Social Media Manager', description: 'Gestión de redes sociales', icon: 'Share2', color: 'text-emerald-400', bgColor: 'bg-emerald-500/15' },
  { id: 'community_manager', category: 'strategy_marketing', label: 'Community Manager', description: 'Gestión de comunidades online', icon: 'MessageCircle', color: 'text-lime-400', bgColor: 'bg-lime-500/15' },
  { id: 'digital_strategist', category: 'strategy_marketing', label: 'Estratega Digital', description: 'Planificación digital integral', icon: 'Compass', color: 'text-orange-400', bgColor: 'bg-orange-500/15' },
  { id: 'trafficker', category: 'strategy_marketing', label: 'Trafficker / Media Buyer', description: 'Gestión de pauta y anuncios pagos', icon: 'Megaphone', color: 'text-red-400', bgColor: 'bg-red-500/15' },
  { id: 'seo_specialist', category: 'strategy_marketing', label: 'Especialista SEO/SEM', description: 'Posicionamiento orgánico y pagado', icon: 'Search', color: 'text-green-300', bgColor: 'bg-green-400/15' },
  { id: 'email_marketer', category: 'strategy_marketing', label: 'Email Marketer', description: 'Automatización, newsletters y funnels', icon: 'Mail', color: 'text-blue-400', bgColor: 'bg-blue-500/15' },
  { id: 'growth_hacker', category: 'strategy_marketing', label: 'Growth Hacker', description: 'Crecimiento acelerado y experimentos', icon: 'Rocket', color: 'text-violet-400', bgColor: 'bg-violet-500/15' },
  { id: 'crm_specialist', category: 'strategy_marketing', label: 'Especialista CRM', description: 'Gestión de relaciones con clientes', icon: 'HeartHandshake', color: 'text-pink-400', bgColor: 'bg-pink-500/15' },
  { id: 'conversion_optimizer', category: 'strategy_marketing', label: 'Optimizador de Conversión', description: 'CRO, A/B testing y landing pages', icon: 'BarChart3', color: 'text-amber-400', bgColor: 'bg-amber-500/15' },

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

// --- Suggested Minimum Rates (USD) ---
// Used for budget validation in campaign creation

export const ROLE_MIN_RATES: Partial<Record<MarketplaceRoleId, number>> = {
  // Content Creation - Higher rates for influencers
  ugc_creator: 50,
  lifestyle_creator: 75,
  nano_influencer: 100,
  micro_influencer: 200,
  macro_influencer: 1000,
  brand_ambassador: 500,
  live_streamer: 150,
  podcast_host: 200,
  photographer: 100,
  copywriter: 50,
  graphic_designer: 75,
  voice_artist: 75,

  // Post-Production
  video_editor: 100,
  motion_graphics: 150,
  sound_designer: 100,
  colorist: 100,
  director: 300,
  producer: 250,
  animator_2d3d: 200,

  // Strategy & Marketing
  content_strategist: 150,
  social_media_manager: 100,
  community_manager: 75,
  digital_strategist: 200,
  trafficker: 150,
  seo_specialist: 150,
  email_marketer: 100,
  growth_hacker: 200,
  crm_specialist: 150,
  conversion_optimizer: 175,

  // Technology
  web_developer: 200,
  app_developer: 300,
  ai_specialist: 250,

  // Education
  online_instructor: 150,
  workshop_facilitator: 200,
};

/**
 * Get minimum suggested budget for a set of roles
 */
export function getMinBudgetForRoles(roleIds: MarketplaceRoleId[]): number {
  if (roleIds.length === 0) return 50; // Default minimum

  const rates = roleIds
    .map(id => ROLE_MIN_RATES[id] || 50)
    .sort((a, b) => b - a); // Sort descending

  // Return the highest rate among selected roles
  return rates[0];
}

// --- Pricing Mode Config ---

export const PRICING_MODE_CONFIG: Record<CampaignPricingMode, { label: string; description: string; icon: string; color: string }> = {
  fixed: { label: 'Precio Fijo', description: 'Precio definido por la marca', icon: 'DollarSign', color: 'text-green-400' },
  auction: { label: 'Subasta Abierta', description: 'Los creadores hacen ofertas libremente', icon: 'Gavel', color: 'text-orange-400' },
  range: { label: 'Rango de Presupuesto', description: 'Marca define min/max, creadores pujan dentro del rango', icon: 'ArrowUpDown', color: 'text-blue-400' },
};
