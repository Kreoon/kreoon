/**
 * useCampaignTemplates
 *
 * Hook para obtener plantillas de campañas del marketplace.
 * Usa React Query para manejo de cache y estado del servidor.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { CampaignTemplate } from '@/components/marketplace/types/marketplace';

interface RawCampaignTemplate {
  id: string;
  name: string;
  description: string | null;
  category: string;
  default_content_types: string[] | null;
  default_platforms: string[] | null;
  default_deliverables: string[] | null;
  is_active: boolean;
  sort_order: number;
  [key: string]: unknown;
}

function normalizeTemplate(t: RawCampaignTemplate): CampaignTemplate {
  return {
    ...t,
    default_content_types: Array.isArray(t.default_content_types) ? t.default_content_types : [],
    default_platforms: Array.isArray(t.default_platforms) ? t.default_platforms : [],
    default_deliverables: Array.isArray(t.default_deliverables) ? t.default_deliverables : [],
  } as CampaignTemplate;
}

async function fetchCampaignTemplates(): Promise<CampaignTemplate[]> {
  const { data, error } = await supabase
    .from('campaign_templates')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (error) throw error;

  return (data || []).map(normalizeTemplate);
}

export function useCampaignTemplates() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['campaign-templates'],
    queryFn: fetchCampaignTemplates,
    staleTime: 10 * 60 * 1000, // 10 minutos - templates cambian poco
    gcTime: 30 * 60 * 1000, // 30 minutos
  });

  return {
    templates: data ?? [],
    loading: isLoading,
    error,
    refetch,
  };
}
