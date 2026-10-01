import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ContentSocialStatus {
  count: number;
  hasPublished: boolean;
  hasScheduled: boolean;
}

/** Record-based return type (JSON-safe, survives React Query dehydration). */
export type ContentSocialStatusMap = Record<string, ContentSocialStatus>;

const SOCIAL_STATUS_CHUNK = 100;

/**
 * Batch-fetches social publishing status for a list of content IDs.
 * Returns a plain object keyed by contentId (JSON-safe for RQ cache persistence).
 */
export function useContentSocialStatus(contentIds: string[]) {
  return useQuery({
    queryKey: ['content-social-status', [...contentIds].sort().join(',')],
    queryFn: async (): Promise<ContentSocialStatusMap> => {
      if (contentIds.length === 0) return {};

      // Query scheduled_posts por lotes: un .in() con ~500 UUID genera una URL de ~18 KB que muchos
      // proxies/servidores rechazan (y el error se tragaba, dejando el tablero sin indicadores sociales).
      const chunks: string[][] = [];
      for (let i = 0; i < contentIds.length; i += SOCIAL_STATUS_CHUNK) chunks.push(contentIds.slice(i, i + SOCIAL_STATUS_CHUNK));
      const results = await Promise.all(
        chunks.map((ids) =>
          supabase
            .from('scheduled_posts')
            .select('content_id, status')
            .in('content_id', ids)
            .not('content_id', 'is', null),
        ),
      );
      const data: Array<{ content_id: string | null; status: string | null }> = [];
      for (const res of results) {
        if (res.error) {
          console.error('Error fetching content social status:', res.error);
          continue;
        }
        data.push(...((res.data as typeof data) || []));
      }

      // Group by content_id
      const statusMap: ContentSocialStatusMap = {};
      for (const row of data) {
        if (!row.content_id) continue;
        const existing = statusMap[row.content_id] || {
          count: 0,
          hasPublished: false,
          hasScheduled: false,
        };
        existing.count++;
        if (row.status === 'published') existing.hasPublished = true;
        if (row.status === 'scheduled') existing.hasScheduled = true;
        statusMap[row.content_id] = existing;
      }

      return statusMap;
    },
    enabled: contentIds.length > 0,
    staleTime: 5 * 60 * 1000, // 5 min
    gcTime: 15 * 60 * 1000,
  });
}
