import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { GeneratedBanner } from '../types/ad-generator.types';

export function useGeneratedBanners(productId?: string) {
  const queryClient = useQueryClient();

  const {
    data: banners = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['ad-banners', productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ad_generated_banners' as any)
        .select('*')
        .eq('product_id', productId!)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as GeneratedBanner[];
    },
    enabled: !!productId,
    staleTime: 1 * 60 * 1000,
  });

  const deleteBanner = useMutation({
    mutationFn: async (bannerId: string) => {
      const { error } = await supabase
        .from('ad_generated_banners' as any)
        .delete()
        .eq('id', bannerId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ad-banners', productId] });
      queryClient.invalidateQueries({ queryKey: ['ad-products'] });
    },
  });

  return {
    banners,
    isLoading,
    error: error as Error | null,
    refetch,
    deleteBanner,
  };
}
