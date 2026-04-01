import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { MarketplaceFilterOptions } from '@/components/marketplace/types/marketplace';

/**
 * Hook para obtener opciones dinámicas de filtros del marketplace.
 * Trae ubicaciones y tipos de contenido reales de creadores registrados.
 * Cachea por 5 minutos para evitar llamadas innecesarias.
 */
export function useMarketplaceFilterOptions() {
  return useQuery({
    queryKey: ['marketplace-filter-options'],
    queryFn: async (): Promise<MarketplaceFilterOptions> => {
      const { data, error } = await supabase.rpc('get_marketplace_filter_options');

      if (error) {
        console.error('[useMarketplaceFilterOptions] Error:', error);
        throw error;
      }

      // Asegurar estructura válida incluso si la BD retorna null
      return {
        locations: data?.locations ?? [],
        content_types: data?.content_types ?? [],
        categories: data?.categories ?? [],
      };
    },
    staleTime: 5 * 60 * 1000,   // 5 minutos
    gcTime: 30 * 60 * 1000,     // 30 minutos en memoria
    refetchOnWindowFocus: false,
  });
}
