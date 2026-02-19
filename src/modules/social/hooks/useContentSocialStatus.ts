import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ContentSocialStatus {
  count: number;
  hasPublished: boolean;
  hasScheduled: boolean;
}

/**
 * Batch-fetches social publishing status for a list of content IDs.
 * Returns a Map<contentId, { count, hasPublished, hasScheduled }>.
 */
export function useContentSocialStatus(contentIds: string[]) {
  return useQuery({
    queryKey: ['content-social-status', contentIds.sort().join(',')],
    queryFn: async (): Promise<Map<string, ContentSocialStatus>> => {
      if (contentIds.length === 0) return new Map();

      // Query scheduled_posts for the given content IDs
      const { data, error } = await supabase
        .from('scheduled_posts')
        .select('content_id, status')
        .in('content_id', contentIds)
        .not('content_id', 'is', null);

      if (error) {
        console.error('Error fetching content social status:', error);
        return new Map();
      }

      // Group by content_id
      const statusMap = new Map<string, ContentSocialStatus>();
      for (const row of data || []) {
        if (!row.content_id) continue;
        const existing = statusMap.get(row.content_id) || {
          count: 0,
          hasPublished: false,
          hasScheduled: false,
        };
        existing.count++;
        if (row.status === 'published') existing.hasPublished = true;
        if (row.status === 'scheduled') existing.hasScheduled = true;
        statusMap.set(row.content_id, existing);
      }

      return statusMap;
    },
    enabled: contentIds.length > 0,
    staleTime: 5 * 60 * 1000, // 5 min
    gcTime: 15 * 60 * 1000,
  });
}
