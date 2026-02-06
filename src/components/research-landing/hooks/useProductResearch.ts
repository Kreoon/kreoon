import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useProductResearch(productId: string | undefined) {
  return useQuery({
    queryKey: ['product-research-landing', productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, description, market_research, competitor_analysis, avatar_profiles, sales_angles_data, content_strategy, content_calendar, launch_strategy, brief_data, research_generated_at, created_at')
        .eq('id', productId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!productId,
    staleTime: 10 * 60 * 1000,
  });
}
