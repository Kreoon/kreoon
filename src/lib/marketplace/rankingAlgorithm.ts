/**
 * Marketplace Creator Ranking Algorithm
 *
 * Calcula un score de 0-100 para ordenar y clasificar creadores en el marketplace.
 * Sin dependencias externas — funciona standalone.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export type RankingTier = 'top' | 'rising' | 'new' | 'standard';

export type MarketplaceSortBy =
  | 'ranking'
  | 'profileCompleteness'
  | 'portfolioQuality'
  | 'responseRate'
  | 'projectsCompleted'
  | 'recentActivity';

export interface RankingBreakdown {
  subscriptionBoost: number;
  profileCompleteness: number;
  portfolioQuality: number;
  responseRate: number;
  projectsCompleted: number;
  recentActivity: number;
}

export interface RankingScore {
  total: number;
  breakdown: RankingBreakdown;
  tier: RankingTier;
}

/**
 * Status del perfil basado en el porcentaje de completitud.
 * - optimal:    >= 90% — perfil muy completo y competitivo
 * - good:       >= 70% — buen perfil, listo para el marketplace
 * - incomplete: >= 40% — perfil parcial, mejoras recomendadas
 * - minimal:     < 40% — perfil básico, requiere atención
 */
export type ProfileScoreStatus = 'optimal' | 'good' | 'incomplete' | 'minimal';

/**
 * Desglose detallado del Profile Score (0-30 puntos totales).
 * Cada factor refleja un aspecto distinto de la calidad del perfil.
 */
export interface ProfileScoreBreakdown {
  /** Tiene foto de perfil (0-3) */
  avatar: number;
  /** Tiene imagen de banner/portada (0-3) */
  banner: number;
  /** Bio con >= 100 caracteres e incluye keywords relevantes (0-5) */
  bio: number;
  /** País y ciudad definidos (0-2) */
  location: number;
  /** Al menos 2 redes conectadas con followers (0-3) */
  socialLinks: number;
  /** Tiene base_price definido y servicios con precios (0-4) */
  pricing: number;
  /** >= 3 videos en portfolio (0-5) */
  portfolioVideos: number;
  /** Al menos 1 foto/imagen en portfolio (0-2) */
  portfolioImages: number;
  /** Videos en HD (720p+) en portfolio (0-3) */
  videoQuality: number;
  /** Suma total de los 9 factores (0-30) */
  total: number;
  /** Porcentaje sobre el máximo posible (0-100) */
  percentage: number;
  /** Clasificación cualitativa del perfil */
  status: ProfileScoreStatus;
}

/** Datos mínimos del creador que el algoritmo necesita para operar. */
export interface CreatorRankingInput {
  // Suscripción
  subscription_plan?: 'free' | 'pro' | 'premium' | string | null;

  // Completitud de perfil — campos originales
  avatar_url?: string | null;
  bio?: string | null;
  niches?: string[] | null;
  location_country?: string | null;

  // Completitud de perfil — campos extendidos para Profile Score
  banner_url?: string | null;
  location_city?: string | null;
  /** Mapa de red social a URL del perfil. Ej: { instagram: "https://..." } */
  social_links?: Record<string, string> | null;
  /** Mapa de red social a cantidad de seguidores. Ej: { instagram: 15000 } */
  social_followers?: Record<string, number> | null;
  /** Precio base del creador en su moneda local */
  base_price?: number | null;
  /** Cantidad de servicios que tienen precio definido */
  services_with_prices?: number | null;

  // Portfolio — campos originales
  portfolio_count?: number | null;
  portfolio_views?: number | null;

  // Portfolio — campos extendidos para Profile Score
  /** Cantidad de imágenes/fotos en portfolio */
  portfolio_images_count?: number | null;
  /** Cantidad de videos en calidad HD (720p o superior) */
  portfolio_hd_count?: number | null;

  // Actividad y proyectos
  response_rate?: number | null;    // 0-100 (porcentaje)
  total_projects?: number | null;
  last_active_at?: string | null;   // ISO 8601
}

// ─── Constantes ──────────────────────────────────────────────────────────────

const TIER_THRESHOLDS = {
  top: 70,
  rising: 50,
} as const;

/**
 * Puntajes máximos por dimensión del ranking.
 * profileCompleteness vale 30 pts (era 20) para reflejar el Profile Score
 * expandido con 9 factores. El total se clampea a 100 en calculateCreatorRanking.
 */
const MAX_SCORES: RankingBreakdown = {
  subscriptionBoost:   25,
  profileCompleteness: 30,
  portfolioQuality:    20,
  responseRate:        15,
  projectsCompleted:   10,
  recentActivity:      10,
};

const PROFILE_SCORE_MAX = 30;

const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

const PROFILE_SCORE_STATUS_THRESHOLDS = {
  optimal:    90,
  good:       70,
  incomplete: 40,
} as const;

/**
 * Metadata descriptiva de cada factor del Profile Score.
 * Útil para renderizar barras de progreso, tooltips y checklist en la UI.
 */
export const PROFILE_SCORE_FACTORS: Record<
  keyof Omit<ProfileScoreBreakdown, 'total' | 'percentage' | 'status'>,
  { label: string; description: string; maxPoints: number }
> = {
  avatar: {
    label: 'Foto de perfil',
    description: 'Sube una foto de perfil para generar confianza con clientes potenciales.',
    maxPoints: 3,
  },
  banner: {
    label: 'Imagen de portada',
    description: 'Un banner personalizado hace que tu perfil destaque en el marketplace.',
    maxPoints: 3,
  },
  bio: {
    label: 'Bio completa',
    description: 'Escribe una bio de al menos 100 caracteres que describa tu especialidad y estilo.',
    maxPoints: 5,
  },
  location: {
    label: 'Ubicación',
    description: 'Indica tu país y ciudad para aparecer en búsquedas por ubicación.',
    maxPoints: 2,
  },
  socialLinks: {
    label: 'Redes sociales',
    description: 'Conecta al menos 2 redes sociales con seguidores para validar tu presencia digital.',
    maxPoints: 3,
  },
  pricing: {
    label: 'Precios definidos',
    description: 'Define tu precio base y los precios de tus servicios para recibir propuestas.',
    maxPoints: 4,
  },
  portfolioVideos: {
    label: 'Videos en portfolio',
    description: 'Agrega al menos 3 videos a tu portfolio para mostrar tu trabajo.',
    maxPoints: 5,
  },
  portfolioImages: {
    label: 'Fotos en portfolio',
    description: 'Incluye al menos una foto o imagen en tu portfolio.',
    maxPoints: 2,
  },
  videoQuality: {
    label: 'Calidad de video HD',
    description: 'Sube videos en resolución HD (720p o superior) para demostrar calidad profesional.',
    maxPoints: 3,
  },
};

// ─── Profile Score — función pública ─────────────────────────────────────────

/**
 * Convierte un porcentaje de completitud a un status cualitativo.
 *
 * @param percentage - Valor entre 0 y 100
 * @returns 'optimal' | 'good' | 'incomplete' | 'minimal'
 */
export function getProfileScoreStatus(percentage: number): ProfileScoreStatus {
  if (percentage >= PROFILE_SCORE_STATUS_THRESHOLDS.optimal)    return 'optimal';
  if (percentage >= PROFILE_SCORE_STATUS_THRESHOLDS.good)       return 'good';
  if (percentage >= PROFILE_SCORE_STATUS_THRESHOLDS.incomplete) return 'incomplete';
  return 'minimal';
}

// ─── Calculadores internos de Profile Score ──────────────────────────────────

function scoreAvatar(creator: CreatorRankingInput): number {
  return creator.avatar_url ? 3 : 0;
}

function scoreBanner(creator: CreatorRankingInput): number {
  return creator.banner_url ? 3 : 0;
}

function scoreBio(creator: CreatorRankingInput): number {
  const bio = creator.bio?.trim() ?? '';
  if (bio.length < 100) return 0;

  // 3 puntos base por bio con longitud suficiente
  let score = 3;

  // +2 puntos si la bio contiene keywords relevantes: niches del creador
  // o palabras descriptivas con al menos 5 caracteres alfabéticos
  const nicheKeywords = (creator.niches ?? []).map((n) => n.toLowerCase());
  const bioLower = bio.toLowerCase();

  const hasNicheKeyword = nicheKeywords.length > 0 && nicheKeywords.some((kw) => bioLower.includes(kw));
  const hasDescriptiveWords = bioLower.split(/\s+/).some(
    (word) => word.length >= 5 && /^[a-záéíóúüñ]+$/i.test(word),
  );

  if (hasNicheKeyword || hasDescriptiveWords) score += 2;

  return Math.min(score, 5);
}

function scoreLocation(creator: CreatorRankingInput): number {
  let score = 0;
  if (creator.location_country) score += 1;
  if (creator.location_city)    score += 1;
  return score;
}

function scoreSocialLinks(creator: CreatorRankingInput): number {
  const followers = creator.social_followers ?? {};
  const links     = creator.social_links ?? {};

  // Una red cuenta si tiene URL definida Y al menos 1 seguidor registrado
  const activeNetworks = Object.keys(links).filter((network) => {
    const hasUrl       = !!links[network];
    const hasFollowers = (followers[network] ?? 0) > 0;
    return hasUrl && hasFollowers;
  });

  const count = activeNetworks.length;
  if (count >= 3) return 3;
  if (count === 2) return 2;
  if (count === 1) return 1;
  return 0;
}

function scorePricing(creator: CreatorRankingInput): number {
  let score = 0;
  if (creator.base_price != null && creator.base_price > 0) score += 2;
  if ((creator.services_with_prices ?? 0) >= 1)              score += 2;
  return Math.min(score, 4);
}

function scorePortfolioVideos(creator: CreatorRankingInput): number {
  const count = creator.portfolio_count ?? 0;
  if (count >= 3) return 5;
  if (count === 2) return 3;
  if (count === 1) return 2;
  return 0;
}

function scorePortfolioImages(creator: CreatorRankingInput): number {
  return (creator.portfolio_images_count ?? 0) >= 1 ? 2 : 0;
}

function scoreVideoQuality(creator: CreatorRankingInput): number {
  return (creator.portfolio_hd_count ?? 0) >= 1 ? 3 : 0;
}

/**
 * Calcula el Profile Score detallado de un creador (0-30 puntos).
 *
 * Evalúa 9 factores cualitativos del perfil, cada uno con un peso distinto.
 * El resultado incluye el desglose por factor, el total, el porcentaje
 * sobre el máximo posible y un status cualitativo.
 *
 * @param creator - Datos del perfil del creador
 * @returns ProfileScoreBreakdown con desglose completo
 */
export function calculateProfileScore(creator: CreatorRankingInput): ProfileScoreBreakdown {
  const avatar          = scoreAvatar(creator);
  const banner          = scoreBanner(creator);
  const bio             = scoreBio(creator);
  const location        = scoreLocation(creator);
  const socialLinks     = scoreSocialLinks(creator);
  const pricing         = scorePricing(creator);
  const portfolioVideos = scorePortfolioVideos(creator);
  const portfolioImages = scorePortfolioImages(creator);
  const videoQuality    = scoreVideoQuality(creator);

  const total      = avatar + banner + bio + location + socialLinks + pricing + portfolioVideos + portfolioImages + videoQuality;
  const percentage = Math.round((total / PROFILE_SCORE_MAX) * 100);
  const status     = getProfileScoreStatus(percentage);

  return {
    avatar,
    banner,
    bio,
    location,
    socialLinks,
    pricing,
    portfolioVideos,
    portfolioImages,
    videoQuality,
    total,
    percentage,
    status,
  };
}

// ─── Calculadores internos de Ranking ────────────────────────────────────────

function calcSubscriptionBoost(plan: string | null | undefined): number {
  switch (plan?.toLowerCase()) {
    case 'premium': return 25;
    case 'pro':     return 15;
    default:        return 0;
  }
}

/**
 * Delega en calculateProfileScore y usa el total directamente.
 * El total del Profile Score es 0-30, igual que MAX_SCORES.profileCompleteness.
 */
function calcProfileCompleteness(creator: CreatorRankingInput): number {
  return calculateProfileScore(creator).total;
}

function calcPortfolioQuality(creator: CreatorRankingInput): number {
  const count = creator.portfolio_count ?? 0;
  const views = creator.portfolio_views ?? 0;

  // Puntaje por videos: escala hasta 5 videos (10 puntos máx)
  const videoScore = Math.min(count / 5, 1) * 10;

  // Puntaje por vistas: escala hasta 1000 vistas (10 puntos máx)
  const viewScore = Math.min(views / 1000, 1) * 10;

  return Math.round(Math.min(videoScore + viewScore, MAX_SCORES.portfolioQuality));
}

function calcResponseRate(creator: CreatorRankingInput): number {
  const rate = creator.response_rate ?? 0;
  // rate es 0-100; mapear proporcionalmente a 0-15
  return Math.round(Math.min(rate / 100, 1) * MAX_SCORES.responseRate);
}

function calcProjectsCompleted(creator: CreatorRankingInput): number {
  const total = creator.total_projects ?? 0;
  // Escala hasta 10 proyectos para puntaje completo
  return Math.round(Math.min(total / 10, 1) * MAX_SCORES.projectsCompleted);
}

function calcRecentActivity(creator: CreatorRankingInput): number {
  if (!creator.last_active_at) return 0;

  const lastActive = new Date(creator.last_active_at).getTime();
  if (isNaN(lastActive)) return 0;

  const now = Date.now();
  const isActiveThisWeek = now - lastActive <= ONE_WEEK_MS;

  return isActiveThisWeek ? MAX_SCORES.recentActivity : 0;
}

// ─── Tier resolver ───────────────────────────────────────────────────────────

function resolveTier(total: number, totalProjects: number): RankingTier {
  if (total >= TIER_THRESHOLDS.top) return 'top';
  if (total >= TIER_THRESHOLDS.rising) return 'rising';
  if (totalProjects < 3) return 'new';
  return 'standard';
}

// ─── API pública — Ranking ───────────────────────────────────────────────────

/**
 * Calcula el RankingScore completo de un creador.
 *
 * El puntaje total se clampea a 100 aunque la suma de dimensiones
 * pueda superar ese valor (profileCompleteness ahora vale hasta 30 pts).
 *
 * @param creator - Datos del perfil del creador
 * @returns RankingScore con total (0-100), breakdown por dimensión y tier
 */
export function calculateCreatorRanking(creator: CreatorRankingInput): RankingScore {
  const breakdown: RankingBreakdown = {
    subscriptionBoost:   calcSubscriptionBoost(creator.subscription_plan),
    profileCompleteness: calcProfileCompleteness(creator),
    portfolioQuality:    calcPortfolioQuality(creator),
    responseRate:        calcResponseRate(creator),
    projectsCompleted:   calcProjectsCompleted(creator),
    recentActivity:      calcRecentActivity(creator),
  };

  const rawTotal =
    breakdown.subscriptionBoost +
    breakdown.profileCompleteness +
    breakdown.portfolioQuality +
    breakdown.responseRate +
    breakdown.projectsCompleted +
    breakdown.recentActivity;

  const total = Math.min(Math.max(Math.round(rawTotal), 0), 100);
  const tier = resolveTier(total, creator.total_projects ?? 0);

  return { total, breakdown, tier };
}

/**
 * Ordena un array de creadores por su RankingScore o por una dimensión específica.
 * No muta el array original.
 *
 * @param creators - Lista de creadores con sus datos de ranking
 * @param sortBy   - Criterio de ordenamiento (por defecto 'ranking')
 * @returns Nuevo array ordenado de mayor a menor score
 */
export function sortByRanking<T extends CreatorRankingInput>(
  creators: T[],
  sortBy: MarketplaceSortBy = 'ranking',
): T[] {
  const copy = [...creators];

  copy.sort((a, b) => {
    const scoreA = calculateCreatorRanking(a);
    const scoreB = calculateCreatorRanking(b);

    const valueA = sortBy === 'ranking' ? scoreA.total : scoreA.breakdown[sortBy];
    const valueB = sortBy === 'ranking' ? scoreB.total : scoreB.breakdown[sortBy];

    return valueB - valueA; // desc: mayor score primero
  });

  return copy;
}

// ─── Helpers de presentación ─────────────────────────────────────────────────

/** Metadatos visuales por tier para uso en UI. */
export const TIER_META: Record<RankingTier, {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
}> = {
  top: {
    label: 'Top Talent',
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/15',
    borderColor: 'border-amber-500/30',
  },
  rising: {
    label: 'En Ascenso',
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/15',
    borderColor: 'border-emerald-500/30',
  },
  new: {
    label: 'Nuevo',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/15',
    borderColor: 'border-blue-500/30',
  },
  standard: {
    label: 'Estándar',
    color: 'text-slate-400',
    bgColor: 'bg-slate-500/15',
    borderColor: 'border-slate-500/30',
  },
};

/** Pesos máximos por dimensión — útil para renderizar barras de progreso. */
export const RANKING_MAX_SCORES: Readonly<RankingBreakdown> = MAX_SCORES;
