import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface ApprovedContent {
  id: string;
  title: string;
  description: string | null;
  video_url: string | null;
  video_urls: string[] | null;
  thumbnail_url: string | null;
  bunny_embed_url: string | null;
  status: string;
  created_at: string;
  client_id: string | null;
  client_name: string | null;
  client_logo_url: string | null;
  product_id: string | null;
  product_name: string | null;
  creator_id: string | null;
  creator_name: string | null;
  creator_avatar: string | null;
  editor_id: string | null;
  editor_name: string | null;
  sphere_phase: string | null;
  target_platform: string | null;
  content_objective: string | null;
  hook: string | null;
  cta: string | null;
  marketing_campaign_id: string | null;
  marketing_campaign_name: string | null;
  sequence_number: string | null;
  total_count?: number;
}

export interface ApprovedContentFilters {
  search?: string;
  clientId?: string;
  status?: string;
  spherePhase?: string;
  limit?: number;
  offset?: number;
}

export function useApprovedContent(filters?: ApprovedContentFilters) {
  const { profile } = useAuth();
  const orgId = profile?.current_organization_id;

  const limit = filters?.limit ?? 50;
  const offset = filters?.offset ?? 0;

  const query = useQuery({
    queryKey: [
      'approved-content-for-social',
      orgId,
      limit,
      offset,
      filters?.search || '',
      filters?.clientId || '',
      filters?.status || '',
      filters?.spherePhase || '',
    ],
    queryFn: async () => {
      if (!orgId) return { items: [], totalCount: 0 };

      const { data, error } = await supabase.rpc(
        'get_approved_content_for_social' as any,
        {
          p_org_id: orgId,
          p_limit: limit,
          p_offset: offset,
          p_search: filters?.search || null,
          p_client_id: filters?.clientId || null,
          p_status: filters?.status || null,
          p_sphere_phase: filters?.spherePhase || null,
        }
      );

      if (error) throw error;

      const rows = (data || []) as unknown as ApprovedContent[];
      const totalCount = rows.length > 0 ? Number(rows[0].total_count) || 0 : 0;

      return { items: rows, totalCount };
    },
    enabled: !!orgId,
    staleTime: 5 * 60 * 1000,
  });

  return {
    data: query.data?.items || [],
    totalCount: query.data?.totalCount || 0,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    refetch: query.refetch,
  };
}
