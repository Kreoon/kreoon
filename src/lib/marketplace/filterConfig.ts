import {
  Video,
  Smartphone,
  Sparkles,
  Dumbbell,
  UtensilsCrossed,
  Gamepad2,
  Plane,
  Shirt,
  GraduationCap,
  type LucideIcon,
} from 'lucide-react';
import type { SupabaseClient } from '@supabase/supabase-js';

// ─────────────────────────────────────────────────────────────────────────────
// Tipos base de configuración
// ─────────────────────────────────────────────────────────────────────────────

export interface FilterCategory {
  id: string;
  label: string;
  icon: LucideIcon;
}

export interface FilterExperienceLevel {
  id: 'new' | 'intermediate' | 'expert';
  label: string;
  min: number;
  max: number | null;
}

export interface FilterPriceRange {
  min: number;
  max: number;
  step: number;
  currency: 'COP';
}

export interface FilterLocation {
  code: string;
  label: string;
  flag: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Interfaz principal de filtros activos
// ─────────────────────────────────────────────────────────────────────────────

export interface MarketplaceFilters {
  search: string;
  categories: string[];
  experience: 'new' | 'intermediate' | 'expert' | null;
  priceMin: number;
  priceMax: number;
  platforms: string[];
  location: string | null;
  sortBy: 'ranking' | 'price_asc' | 'price_desc' | 'newest';
  /**
   * Filtra creadores cuyo profile_score.total sea mayor o igual a este valor.
   * Calculado client-side despues de traer los datos de Supabase.
   * Rango util: 0-100. Si es 0 o undefined, no se aplica el filtro.
   */
  minProfileScore?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Configuración completa de filtros
// ─────────────────────────────────────────────────────────────────────────────

export const FILTER_CONFIG = {
  categories: [
    { id: 'ugc',       label: 'UGC',        icon: Video           },
    { id: 'lifestyle', label: 'Lifestyle',   icon: Smartphone      },
    { id: 'beauty',    label: 'Beauty',      icon: Sparkles        },
    { id: 'fitness',   label: 'Fitness',     icon: Dumbbell        },
    { id: 'food',      label: 'Food',        icon: UtensilsCrossed },
    { id: 'gaming',    label: 'Gaming',      icon: Gamepad2        },
    { id: 'travel',    label: 'Travel',      icon: Plane           },
    { id: 'fashion',   label: 'Fashion',     icon: Shirt           },
    { id: 'tech',      label: 'Tech',        icon: Smartphone      },
    { id: 'education', label: 'Educación',   icon: GraduationCap   },
  ] satisfies FilterCategory[],

  experience: [
    { id: 'new',          label: 'Nuevo (0–2 años)',         min: 0,  max: 2    },
    { id: 'intermediate', label: 'Intermedio (3–10 años)',   min: 3,  max: 10   },
    { id: 'expert',       label: 'Experto (11+ años)',       min: 11, max: null },
  ] satisfies FilterExperienceLevel[],

  priceRange: {
    min: 50_000,
    max: 5_000_000,
    step: 50_000,
    currency: 'COP',
  } satisfies FilterPriceRange,

  platforms: ['instagram', 'tiktok', 'youtube', 'twitter'] as const,

  languages: ['es', 'en', 'pt'] as const,

  locations: [
    { code: 'CO', label: 'Colombia',          flag: '🇨🇴' },
    { code: 'MX', label: 'México',            flag: '🇲🇽' },
    { code: 'AR', label: 'Argentina',         flag: '🇦🇷' },
    { code: 'CL', label: 'Chile',             flag: '🇨🇱' },
    { code: 'PE', label: 'Perú',              flag: '🇵🇪' },
    { code: 'EC', label: 'Ecuador',           flag: '🇪🇨' },
    { code: 'VE', label: 'Venezuela',         flag: '🇻🇪' },
    { code: 'BO', label: 'Bolivia',           flag: '🇧🇴' },
    { code: 'UY', label: 'Uruguay',           flag: '🇺🇾' },
    { code: 'PY', label: 'Paraguay',          flag: '🇵🇾' },
    { code: 'PA', label: 'Panamá',            flag: '🇵🇦' },
    { code: 'CR', label: 'Costa Rica',        flag: '🇨🇷' },
    { code: 'GT', label: 'Guatemala',         flag: '🇬🇹' },
    { code: 'DO', label: 'Rep. Dominicana',   flag: '🇩🇴' },
    { code: 'BR', label: 'Brasil',            flag: '🇧🇷' },
  ] satisfies FilterLocation[],
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Valores por defecto
// ─────────────────────────────────────────────────────────────────────────────

export const DEFAULT_FILTERS: MarketplaceFilters = {
  search:          '',
  categories:      [],
  experience:      null,
  priceMin:        FILTER_CONFIG.priceRange.min,
  priceMax:        FILTER_CONFIG.priceRange.max,
  platforms:       [],
  location:        null,
  sortBy:          'ranking',
  minProfileScore: undefined,
};

// ─────────────────────────────────────────────────────────────────────────────
// Builder de query Supabase
// ─────────────────────────────────────────────────────────────────────────────

type PostgrestFilterBuilder = ReturnType<SupabaseClient['from']>;

/**
 * Aplica los filtros activos a un query de Supabase sobre `creator_profiles`.
 * Retorna el query builder modificado, listo para ejecutarse con `.select()`.
 *
 * Nota: minProfileScore NO se aplica aqui porque es un calculo client-side.
 * El hook useMarketplaceExplore lo filtra despues de recibir los datos.
 *
 * @example
 * const query = supabase.from('creator_profiles').select('*');
 * const filtered = buildFilterQuery(query, filters);
 * const { data, error } = await filtered;
 */
export function buildFilterQuery(
  query: PostgrestFilterBuilder,
  filters: MarketplaceFilters,
): PostgrestFilterBuilder {
  let q = query;

  // Búsqueda de texto libre (fulltext en display_name y bio)
  if (filters.search.trim().length > 0) {
    const term = filters.search.trim();
    q = q.or(`display_name.ilike.%${term}%,bio.ilike.%${term}%`);
  }

  // Categorías (overlap con array de categorías del perfil)
  if (filters.categories.length > 0) {
    q = q.overlaps('categories', filters.categories);
  }

  // Nivel de experiencia → rango de años
  if (filters.experience !== null) {
    const level = FILTER_CONFIG.experience.find((e) => e.id === filters.experience);
    if (level) {
      q = q.gte('years_experience', level.min);
      if (level.max !== null) {
        q = q.lte('years_experience', level.max);
      }
    }
  }

  // Precio
  if (filters.priceMin > FILTER_CONFIG.priceRange.min) {
    q = q.gte('base_price', filters.priceMin);
  }
  if (filters.priceMax < FILTER_CONFIG.priceRange.max) {
    q = q.lte('base_price', filters.priceMax);
  }

  // Plataformas (overlap con array de plataformas del perfil)
  if (filters.platforms.length > 0) {
    q = q.overlaps('platforms', filters.platforms);
  }

  // Ubicación (país)
  if (filters.location !== null) {
    q = q.eq('location_country', filters.location);
  }

  // Ordenamiento
  switch (filters.sortBy) {
    case 'ranking':
      q = q.order('ranking_score', { ascending: false });
      break;
    case 'price_asc':
      q = q.order('base_price', { ascending: true });
      break;
    case 'price_desc':
      q = q.order('base_price', { ascending: false });
      break;
    case 'newest':
      q = q.order('created_at', { ascending: false });
      break;
  }

  return q;
}
