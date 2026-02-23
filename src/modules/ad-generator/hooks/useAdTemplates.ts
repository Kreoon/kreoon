import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { AdTemplate, TemplateCategory } from '../types/ad-generator.types';

export function useAdTemplates(category?: TemplateCategory) {
  const { profile } = useAuth();
  const orgId = profile?.current_organization_id;

  const {
    data: templates = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['ad-templates', orgId, category],
    queryFn: async () => {
      let query = supabase
        .from('ad_templates' as any)
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (category && category !== 'all') {
        query = query.eq('category', category);
      }

      if (orgId) {
        query = query.or(`organization_id.is.null,organization_id.eq.${orgId}`);
      } else {
        query = query.is('organization_id', null);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as AdTemplate[];
    },
    staleTime: 10 * 60 * 1000,
  });

  return { templates, isLoading, error: error as Error | null };
}
