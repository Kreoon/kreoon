import { useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { MarketplaceFilters } from '@/lib/marketplace/filterConfig';
import {
  calculateCreatorRanking,
  calculateProfileScore,
  type ProfileScoreBreakdown,
} from '@/lib/marketplace/rankingAlgorithm';

// ── Constantes ──────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

// ── Tipos internos ──────────────────────────────────────────────────────────

/**
 * Fila raw que devuelve Supabase para creator_profiles con join de profiles.
 * Los campos coinciden exactamente con el SELECT del hook.
 */
interface CreatorProfileRow {
  id: string;
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  bio: string | null;
  niches: string[] | null;
  base_price: number | null;
  currency: string | null;
  location: string | null;
  location_city: string | null;
  location_country: string | null;
  response_rate: number | null;
  subscription_tier: string | null;
  portfolio_video_count: number | null;
  projects_completed: number | null;
  last_active_at: string | null;
  created_at: string;
  profiles: {
    instagram: string | null;
    tiktok: string | null;
    youtube: string | null;
    instagram_followers: number | null;
    tiktok_followers: number | null;
    youtube_followers: number | null;
  } | null;
}

/**
 * Creator enriquecido con ranking y profile score calculados, listo para renderizar.
 */
export interface ExploreCreator extends CreatorProfileRow {
  ranking_score: number;
  profile_score: ProfileScoreBreakdown;
}

/**
 * Parametros de una pagina devuelta por useInfiniteQuery.
 */
interface CreatorPage {
  creators: ExploreCreator[];
  nextCursor: number | null;
}

// ── Helper: aplicar filtros a la query de Supabase ──────────────────────────

/**
 * Aplica los filtros que se pueden resolver a nivel de base de datos
 * para reducir el payload antes del ranking client-side.
 */
function applySupabaseFilters(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  query: any,
  filters: MarketplaceFilters,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): any {
  // Precio minimo
  if (filters.priceMin != null) {
    query = query.gte('base_price', filters.priceMin);
  }

  // Precio maximo
  if (filters.priceMax != null) {
    query = query.lte('base_price', filters.priceMax);
  }

  // Busqueda de texto en display_name y bio (ilike para case-insensitive)
  if (filters.search && filters.search.trim().length > 0) {
    const term = filters.search.trim();
    query = query.or(`display_name.ilike.%${term}%,bio.ilike.%${term}%`);
  }

  // Ubicacion
  if (filters.location != null) {
    query = query.eq('location_country', filters.location);
  }

  // Plataformas (overlap con array del perfil)
  if (filters.platforms && filters.platforms.length > 0) {
    query = query.overlaps('platforms', filters.platforms);
  }

  // Categorias (overlap con array del perfil)
  if (filters.categories && filters.categories.length > 0) {
    query = query.overlaps('categories', filters.categories);
  }

  return query;
}

// ── Helper: ordenar resultados segun sortBy ─────────────────────────────────

function sortCreators(
  creators: ExploreCreator[],
  sortBy: MarketplaceFilters['sortBy'],
): ExploreCreator[] {
  const sorted = [...creators];

  switch (sortBy) {
    case 'price_asc':
      return sorted.sort((a, b) => (a.base_price ?? Infinity) - (b.base_price ?? Infinity));

    case 'price_desc':
      return sorted.sort((a, b) => (b.base_price ?? 0) - (a.base_price ?? 0));

    case 'newest':
      return sorted.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );

    case 'ranking':
    default:
      // Ordenar por ranking_score (algoritmo centralizado)
      return sorted.sort((a, b) => b.ranking_score - a.ranking_score);
  }
}

/**
 * Construye los mapas social_links y social_followers a partir de los
 * campos planos que devuelve el join con profiles.
 * Solo incluye una red si tiene URL definida.
 */
function buildSocialMaps(profiles: CreatorProfileRow['profiles']): {
  social_links: Record<string, string>;
  social_followers: Record<string, number>;
} {
  const social_links: Record<string, string> = {};
  const social_followers: Record<string, number> = {};

  if (!profiles) return { social_links, social_followers };

  if (profiles.instagram) {
    social_links.instagram     = profiles.instagram;
    social_followers.instagram = profiles.instagram_followers ?? 0;
  }
  if (profiles.tiktok) {
    social_links.tiktok     = profiles.tiktok;
    social_followers.tiktok = profiles.tiktok_followers ?? 0;
  }
  if (profiles.youtube) {
    social_links.youtube     = profiles.youtube;
    social_followers.youtube = profiles.youtube_followers ?? 0;
  }

  return { social_links, social_followers };
}

// ── Hook principal ──────────────────────────────────────────────────────────

/**
 * Hook principal del marketplace explore con infinite scroll.
 *
 * Usa useInfiniteQuery para paginar los resultados de creator_profiles,
 * aplica filtros dinamicos, calcula el ranking y el profile_score de cada creador.
 *
 * @param filters - Filtros activos del marketplace (de MarketplaceFilters)
 */
export function useMarketplaceExplore(filters: MarketplaceFilters) {
  const {
    data,
    isLoading,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
    refetch,
  } = useInfiniteQuery<CreatorPage, Error>({
    queryKey: ['marketplace-explore', filters],
    staleTime: 5 * 60 * 1000, // 5 minutos

    initialPageParam: 0,

    queryFn: async ({ pageParam }) => {
      const offset = (pageParam as number) * PAGE_SIZE;

      // ── Base query ───────────────────────────────────────────────────────
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let query = (supabase as any)
        .from('creator_profiles')
        .select(`
          id, user_id, display_name,
          avatar_url, banner_url,
          bio, niches,
          base_price, currency,
          location, location_city, location_country,
          response_rate,
          subscription_tier, portfolio_video_count,
          projects_completed, last_active_at, created_at,
          profiles!inner(
            instagram, tiktok, youtube,
            instagram_followers, tiktok_followers, youtube_followers
          )
        `)
        .eq('is_active', true)
        .range(offset, offset + PAGE_SIZE - 1);

      // ── Aplicar filtros a nivel DB ────────────────────────────────────────
      query = applySupabaseFilters(query, filters);

      const { data: rows, error } = await query;

      if (error) {
        throw new Error(`[useMarketplaceExplore] Error al cargar creadores: ${error.message}`);
      }

      const typedRows = (rows ?? []) as CreatorProfileRow[];

      // ── Calcular ranking y profile_score para cada creador ────────────────
      let enriched: ExploreCreator[] = typedRows.map((row) => {
        const { social_links, social_followers } = buildSocialMaps(row.profiles);

        return {
          ...row,
          ranking_score: calculateCreatorRanking({
            subscription_plan: row.subscription_tier,
            avatar_url: row.avatar_url,
            bio: row.bio,
            niches: row.niches,
            location_country: row.location_country ?? row.location,
            portfolio_count: row.portfolio_video_count,
            response_rate: row.response_rate,
            total_projects: row.projects_completed,
            last_active_at: row.last_active_at,
          }).total,
          profile_score: calculateProfileScore({
            avatar_url: row.avatar_url,
            banner_url: row.banner_url,
            bio: row.bio,
            niches: row.niches,
            location_country: row.location_country ?? row.location,
            location_city: row.location_city,
            base_price: row.base_price,
            portfolio_count: row.portfolio_video_count,
            social_links,
            social_followers,
          }),
        };
      });

      // ── Filtro client-side por minProfileScore (si aplica) ────────────────
      if (filters.minProfileScore != null && filters.minProfileScore > 0) {
        enriched = enriched.filter(
          (c) => c.profile_score.total >= (filters.minProfileScore as number),
        );
      }

      // ── Ordenar segun sortBy ──────────────────────────────────────────────
      const sorted = sortCreators(enriched, filters.sortBy);

      // ── Calcular cursor siguiente ─────────────────────────────────────────
      // Si se devolvieron menos de PAGE_SIZE resultados, no hay mas paginas
      const nextCursor =
        typedRows.length === PAGE_SIZE ? (pageParam as number) + 1 : null;

      return { creators: sorted, nextCursor };
    },

    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });

  return {
    data,
    isLoading,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
    refetch,
  };
}
