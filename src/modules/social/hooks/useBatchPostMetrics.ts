import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { PostMetrics } from '../types/social.types';

/**
 * Batch-loads metrics for multiple published posts in a single query.
 * Returns a Map of postId → PostMetrics[] for efficient lookup.
 */
export function useBatchPostMetrics(postIds: string[]) {
  const query = useQuery({
    queryKey: ['batch-post-metrics', postIds],
    queryFn: async () => {
      if (postIds.length === 0) return new Map<string, PostMetrics[]>();

      const { data, error } = await supabase
        .from('post_metrics')
        .select('*')
        .in('scheduled_post_id', postIds)
        .order('fetched_at', { ascending: false });

      if (error) throw error;

      const map = new Map<string, PostMetrics[]>();
      for (const row of (data || []) as unknown as PostMetrics[]) {
        const existing = map.get(row.scheduled_post_id) || [];
        existing.push(row);
        map.set(row.scheduled_post_id, existing);
      }
      return map;
    },
    enabled: postIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  // Ensure we always return a valid Map, even if cache returned a plain object
  // (Maps lose their methods when serialized/deserialized from localStorage)
  const data = query.data;
  const safeMap = data instanceof Map
    ? data
    : data && typeof data === 'object'
      ? new Map(Object.entries(data as Record<string, PostMetrics[]>))
      : new Map<string, PostMetrics[]>();

  return { ...query, data: safeMap };
}
