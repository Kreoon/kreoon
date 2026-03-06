/**
 * Calcula % de completitud de un perfil de creador
 * Mostrar al creador como barra de progreso en su configuración
 */
export function computeProfileCompleteness(profile: {
  avatar_url?: string | null;
  bio?: string | null;
  primary_role?: string | null;
  location_city?: string | null;
  location_country?: string | null;
  base_price?: number | null;
  portfolio_count?: number;
  skills?: string[];
  niches?: string[];
  categories?: string[];
  marketplace_roles?: string[];
  response_time_hours?: number | null;
  content_types?: string[];
  languages?: string[];
}): { score: number; missing: string[] } {
  const checks: [boolean, string][] = [
    [!!profile.avatar_url, 'Foto de perfil'],
    [!!profile.bio && profile.bio.length >= 80, 'Bio (mín. 80 caracteres)'],
    [!!(profile.primary_role || (profile.marketplace_roles && profile.marketplace_roles.length > 0)), 'Rol principal'],
    [!!profile.location_country, 'País'],
    [!!profile.location_city, 'Ciudad'],
    [!!profile.base_price, 'Precio base'],
    [(profile.portfolio_count ?? 0) >= 3, 'Mínimo 3 videos en portfolio'],
    [((profile.skills?.length ?? 0) >= 3 || (profile.categories?.length ?? 0) >= 1), 'Mínimo 3 habilidades o 1 categoría'],
    [((profile.niches?.length ?? 0) >= 1 || (profile.categories?.length ?? 0) >= 1), 'Mínimo 1 nicho o categoría'],
    [(profile.content_types?.length ?? 0) >= 1, 'Tipos de contenido'],
    [(profile.languages?.length ?? 0) >= 1, 'Idiomas'],
  ];

  const missing = checks.filter(([ok]) => !ok).map(([, label]) => label);
  const score = Math.round((checks.filter(([ok]) => ok).length / checks.length) * 100);

  return { score, missing };
}

/**
 * Calcula el nivel de confianza basado en métricas del perfil
 */
export function computeTrustLevel(profile: {
  is_verified?: boolean;
  rating_avg?: number;
  rating_count?: number;
  total_projects?: number;
  repeat_client_rate?: number;
}): 'new' | 'rising' | 'trusted' | 'top' {
  const { is_verified, rating_avg = 0, rating_count = 0, total_projects = 0, repeat_client_rate = 0 } = profile;

  // Top: verificado + rating alto + muchos proyectos
  if (is_verified && rating_avg >= 4.8 && total_projects >= 20 && repeat_client_rate >= 0.3) {
    return 'top';
  }

  // Trusted: buen rating + proyectos completados
  if (rating_avg >= 4.5 && total_projects >= 5 && rating_count >= 3) {
    return 'trusted';
  }

  // Rising: algunos proyectos o reviews
  if (total_projects >= 1 || rating_count >= 1) {
    return 'rising';
  }

  return 'new';
}

/**
 * Texto descriptivo del nivel de confianza
 */
export const TRUST_LEVEL_LABELS: Record<string, { label: string; color: string; bgColor: string }> = {
  new: {
    label: 'Nuevo',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/15',
  },
  rising: {
    label: 'En ascenso',
    color: 'text-green-400',
    bgColor: 'bg-green-500/15',
  },
  trusted: {
    label: 'Confiable',
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/15',
  },
  top: {
    label: 'Top Talent',
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/15',
  },
};
