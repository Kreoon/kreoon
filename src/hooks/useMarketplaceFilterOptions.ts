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
      try {
        const { data, error } = await supabase.rpc('get_marketplace_filter_options');

        if (error) {
          // Si la RPC no existe, retornar valores por defecto en vez de fallar
          if (error.code === '42883' || error.message?.includes('does not exist')) {
            console.warn('[useMarketplaceFilterOptions] RPC no existe, usando fallback');
            return { locations: [], content_types: [], categories: [] };
          }
          console.error('[useMarketplaceFilterOptions] Error:', error);
          throw error;
        }

        // Asegurar estructura valida incluso si la BD retorna null
        return {
          locations: data?.locations ?? [],
          cities: data?.cities ?? [],
          content_types: data?.content_types ?? [],
          categories: data?.categories ?? [],
          languages: data?.languages ?? [],
          levels: data?.levels ?? [],
        };
      } catch (err) {
        // Fallback silencioso para no romper la UI
        console.warn('[useMarketplaceFilterOptions] Fallback por error:', err);
        return { locations: [], content_types: [], categories: [] };
      }
    },
    staleTime: 5 * 60 * 1000,   // 5 minutos
    gcTime: 30 * 60 * 1000,     // 30 minutos en memoria
    refetchOnWindowFocus: false,
  });
}
