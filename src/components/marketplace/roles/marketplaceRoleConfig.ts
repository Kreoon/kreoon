import type { MarketplaceRoleDefinition, MarketplaceRoleCategory, MarketplaceRoleId, CampaignPricingMode } from '../types/marketplace';

// --- Role Categories (4 principales) ---

export const MARKETPLACE_ROLE_CATEGORIES: Record<MarketplaceRoleCategory, { label: string; icon: string; color: string }> = {
  creators: { label: 'Creadores', icon: 'Video', color: 'text-pink-400' },
  production: { label: 'Produccion', icon: 'Film', color: 'text-blue-400' },
  strategy: { label: 'Estrategas', icon: 'Target', color: 'text-green-400' },
  client: { label: 'Cliente', icon: 'Briefcase', color: 'text-amber-400' },
};

// --- Marketplace Roles (especializaciones por categoria) ---

export const MARKETPLACE_ROLES: MarketplaceRoleDefinition[] = [
  // Creadores de Contenido (12)
  { id: 'ugc_creator', category: 'creators', label: 'Creador UGC', description: 'Crea contenido autentico generado por usuarios', icon: 'Camera', color: 'text-pink-400', bgColor: 'bg-pink-500/15' },
  { id: 'lifestyle_creator', category: 'creators', label: 'Creador Lifestyle', description: 'Contenido de estilo de vida y tendencias', icon: 'Sparkles', color: 'text-rose-400', bgColor: 'bg-rose-500/15' },
  { id: 'micro_influencer', category: 'creators', label: 'Micro-Influencer', description: 'Influencer con 10K-100K seguidores', icon: 'Users', color: 'text-fuchsia-400', bgColor: 'bg-fuchsia-500/15' },
  { id: 'nano_influencer', category: 'creators', label: 'Nano-Influencer', description: 'Influencer con 1K-10K seguidores', icon: 'User', color: 'text-purple-400', bgColor: 'bg-purple-500/15' },
  { id: 'macro_influencer', category: 'creators', label: 'Macro-Influencer', description: 'Influencer con 100K-1M seguidores', icon: 'Crown', color: 'text-amber-400', bgColor: 'bg-amber-500/15' },
  { id: 'brand_ambassador', category: 'creators', label: 'Embajador de Marca', description: 'Representante de marca a largo plazo', icon: 'Award', color: 'text-yellow-400', bgColor: 'bg-yellow-500/15' },
  { id: 'live_streamer', category: 'creators', label: 'Streamer en Vivo', description: 'Transmisiones en vivo y live shopping', icon: 'Radio', color: 'text-red-400', bgColor: 'bg-red-500/15' },
  { id: 'podcast_host', category: 'creators', label: 'Conductor de Podcast', description: 'Creador y conductor de podcasts', icon: 'Mic', color: 'text-violet-400', bgColor: 'bg-violet-500/15' },
  { id: 'photographer', category: 'creators', label: 'Fotografo Profesional', description: 'Fotografia de producto, lifestyle y editorial', icon: 'ImageIcon', color: 'text-sky-400', bgColor: 'bg-sky-500/15' },
  { id: 'copywriter', category: 'creators', label: 'Copywriter', description: 'Textos publicitarios, guiones y captions', icon: 'PenTool', color: 'text-emerald-400', bgColor: 'bg-emerald-500/15' },
  { id: 'graphic_designer', category: 'creators', label: 'Disenador Grafico', description: 'Branding, posts, banners y thumbnails', icon: 'Palette', color: 'text-orange-400', bgColor: 'bg-orange-500/15' },
  { id: 'voice_artist', category: 'creators', label: 'Locutor / Voz en Off', description: 'Narracion, doblaje y voiceover', icon: 'AudioLines', color: 'text-teal-400', bgColor: 'bg-teal-500/15' },

  // Produccion / Editores (7)
  { id: 'video_editor', category: 'production', label: 'Editor de Video', description: 'Edicion profesional de video', icon: 'Film', color: 'text-blue-400', bgColor: 'bg-blue-500/15' },
  { id: 'motion_graphics', category: 'production', label: 'Motion Graphics', description: 'Animacion y graficos en movimiento', icon: 'Layers', color: 'text-indigo-400', bgColor: 'bg-indigo-500/15' },
  { id: 'sound_designer', category: 'production', label: 'Disenador de Sonido', description: 'Diseno sonoro y mezcla de audio', icon: 'Volume2', color: 'text-sky-400', bgColor: 'bg-sky-500/15' },
  { id: 'colorist', category: 'production', label: 'Colorista', description: 'Correccion y gradacion de color', icon: 'Paintbrush', color: 'text-teal-400', bgColor: 'bg-teal-500/15' },
  { id: 'director', category: 'production', label: 'Director Creativo', description: 'Direccion creativa y conceptual', icon: 'Clapperboard', color: 'text-purple-400', bgColor: 'bg-purple-500/15' },
  { id: 'producer', category: 'production', label: 'Productor Audiovisual', description: 'Produccion integral de contenido', icon: 'MonitorPlay', color: 'text-rose-400', bgColor: 'bg-rose-500/15' },
  { id: 'animator_2d3d', category: 'production', label: 'Animador 2D/3D', description: 'Animacion de personajes y explainers', icon: 'Wand2', color: 'text-fuchsia-400', bgColor: 'bg-fuchsia-500/15' },

  // Estrategas (Digital + Creativo + CM) (10)
  { id: 'content_strategist', category: 'strategy', label: 'Estratega de Contenido', description: 'Planificacion y estrategia de contenido', icon: 'Target', color: 'text-green-400', bgColor: 'bg-green-500/15' },
  { id: 'social_media_manager', category: 'strategy', label: 'Social Media Manager', description: 'Gestion de redes sociales', icon: 'Share2', color: 'text-emerald-400', bgColor: 'bg-emerald-500/15' },
  { id: 'community_manager', category: 'strategy', label: 'Community Manager', description: 'Gestion de comunidades online', icon: 'MessageCircle', color: 'text-lime-400', bgColor: 'bg-lime-500/15' },
  { id: 'digital_strategist', category: 'strategy', label: 'Estratega Digital', description: 'Planificacion digital integral', icon: 'Compass', color: 'text-orange-400', bgColor: 'bg-orange-500/15' },
  { id: 'trafficker', category: 'strategy', label: 'Trafficker / Media Buyer', description: 'Gestion de pauta y anuncios pagos', icon: 'Megaphone', color: 'text-red-400', bgColor: 'bg-red-500/15' },
  { id: 'seo_specialist', category: 'strategy', label: 'Especialista SEO/SEM', description: 'Posicionamiento organico y pagado', icon: 'Search', color: 'text-green-300', bgColor: 'bg-green-400/15' },
  { id: 'email_marketer', category: 'strategy', label: 'Email Marketer', description: 'Automatizacion, newsletters y funnels', icon: 'Mail', color: 'text-blue-400', bgColor: 'bg-blue-500/15' },
  { id: 'growth_hacker', category: 'strategy', label: 'Growth Hacker', description: 'Crecimiento acelerado y experimentos', icon: 'Rocket', color: 'text-violet-400', bgColor: 'bg-violet-500/15' },
  { id: 'crm_specialist', category: 'strategy', label: 'Especialista CRM', description: 'Gestion de relaciones con clientes', icon: 'HeartHandshake', color: 'text-pink-400', bgColor: 'bg-pink-500/15' },
  { id: 'conversion_optimizer', category: 'strategy', label: 'Optimizador de Conversion', description: 'CRO, A/B testing y landing pages', icon: 'BarChart3', color: 'text-amber-400', bgColor: 'bg-amber-500/15' },

  // Cliente / Marcas (oculto del marketplace publico) (2)
  { id: 'brand_manager', category: 'client', label: 'Gerente de Marca', description: 'Gestion de marca y reputacion', icon: 'Briefcase', color: 'text-orange-400', bgColor: 'bg-orange-500/15' },
  { id: 'marketing_director', category: 'client', label: 'Director de Marketing', description: 'Direccion de marketing y campanas', icon: 'TrendingUp', color: 'text-red-300', bgColor: 'bg-red-400/15' },
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
  // Creadores - Tarifas mas altas para influencers
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

  // Produccion
  video_editor: 100,
  motion_graphics: 150,
  sound_designer: 100,
  colorist: 100,
  director: 300,
  producer: 250,
  animator_2d3d: 200,

  // Estrategas
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
