import { useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { TemplateFilters, TemplateListResponse, PublicTemplate } from '../types/template';

// ─── Constantes ───────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;
const STALE_TIME = 5 * 60 * 1000; // 5 minutos

// ─── Tipos internos ───────────────────────────────────────────────────────────

/** Página individual devuelta por useInfiniteQuery. */
interface TemplatePage {
  templates: PublicTemplate[];
  nextPage: number | null;
  total: number;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Hook para explorar la biblioteca pública de plantillas con infinite scroll.
 *
 * Llama a la RPC `get_public_templates` con paginación offset-based.
 * Cada página contiene hasta 20 plantillas. Los filtros (categoría, búsqueda,
 * orden) se pasan directamente a la RPC para filtrado en base de datos.
 *
 * @param filters - Filtros activos: category, search, sortBy
 *
 * @example
 * ```tsx
 * const { data, fetchNextPage, hasNextPage, isLoading } = usePublicTemplates({ sortBy: 'popular' });
 * const templates = data?.pages.flatMap((p) => p.templates) ?? [];
 * ```
 */
export function usePublicTemplates(filters: TemplateFilters = {}) {
  return useInfiniteQuery<TemplatePage, Error>({
    queryKey: ['public-templates', filters],
    staleTime: STALE_TIME,
    gcTime: 30 * 60 * 1000,

    initialPageParam: 0,

    queryFn: async ({ pageParam }) => {
      const page = pageParam as number;

      const { data, error } = await (supabase as any).rpc('get_public_templates', {
        p_category: filters.category ?? null,
        p_search: filters.search?.trim() || null,
        p_sort_by: filters.sortBy ?? 'popular',
        p_page: page,
        p_page_size: PAGE_SIZE,
      });

      if (error) {
        throw new Error(`[usePublicTemplates] Error al cargar plantillas: ${error.message}`);
      }

      const response = data as unknown as TemplateListResponse;

      return {
        templates: response.templates ?? [],
        total: response.total ?? 0,
        nextPage: response.hasMore ? page + 1 : null,
      };
    },

    getNextPageParam: (lastPage) => lastPage.nextPage ?? undefined,
  });
}
