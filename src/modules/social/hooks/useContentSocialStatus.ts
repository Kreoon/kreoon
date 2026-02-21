import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ContentSocialStatus {
  count: number;
  hasPublished: boolean;
  hasScheduled: boolean;
}

/** Record-based return type (JSON-safe, survives React Query dehydration). */
export type ContentSocialStatusMap = Record<string, ContentSocialStatus>;

/**
 * Batch-fetches social publishing status for a list of content IDs.
 * Returns a plain object keyed by contentId (JSON-safe for RQ cache persistence).
 */
export function useContentSocialStatus(contentIds: string[]) {
  return useQuery({
    queryKey: ['content-social-status', contentIds.sort().join(',')],
    queryFn: async (): Promise<ContentSocialStatusMap> => {
      if (contentIds.length === 0) return {};

      // Query scheduled_posts for the given content IDs
      const { data, error } = await supabase
        .from('scheduled_posts')
        .select('content_id, status')
        .in('content_id', contentIds)
        .not('content_id', 'is', null);

      if (error) {
        console.error('Error fetching content social status:', error);
        return {};
      }

      // Group by content_id
      const statusMap: ContentSocialStatusMap = {};
      for (const row of data || []) {
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
