import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

const warnedRecommendationsRef = { current: false };

interface ContentItem {
  id: string;
  title: string;
  creator_id: string | null;
  client_id: string | null;
  created_at: string;
  views_count: number;
  likes_count: number;
  type: 'content' | 'post';
  media_type?: 'video' | 'image';
}

interface UseRecommendationsOptions {
  limit?: number;
  followingIds?: string[];
}

export function useRecommendations(options: UseRecommendationsOptions = {}) {
  const { user } = useAuth();
  const [recommendations, setRecommendations] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasPersonalization, setHasPersonalization] = useState(false);

  const fetchRecommendations = useCallback(async (
    likedContentIds: string[] = [],
    viewedContentIds: string[] = []
  ) => {
    setLoading(true);
    
    // Generate unique seed for each refresh to randomize order
    const refreshSeed = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
    
    try {
      const response = await supabase.functions.invoke('feed-recommendations', {
        body: {
          user_id: user?.id,
          following_ids: options.followingIds || [],
          liked_content_ids: likedContentIds,
          viewed_content_ids: viewedContentIds,
          limit: options.limit || 50,
          refresh_seed: refreshSeed,
        }
      });

      if (response.error) {
        if (!warnedRecommendationsRef.current) {
          warnedRecommendationsRef.current = true;
          console.warn('[useRecommendations] La función no está disponible. Despliega: npx supabase functions deploy feed-recommendations --project-ref wjkbqcrxwsmvtxmqgiqc');
        }
        return;
      }

      const data = response.data;
      if (data?.success) {
        setRecommendations(data.recommendations || []);
        setHasPersonalization(data.has_personalization || false);
      }
    } catch (error) {
      if (!warnedRecommendationsRef.current) {
        warnedRecommendationsRef.current = true;
        console.warn('[useRecommendations] La función no está disponible. Despliega: npx supabase functions deploy feed-recommendations --project-ref wjkbqcrxwsmvtxmqgiqc');
      }
    } finally {
      setLoading(false);
    }
  }, [user?.id, options.followingIds, options.limit]);

  return {
    recommendations,
    loading,
    hasPersonalization,
    fetchRecommendations,
    refetch: fetchRecommendations,
  };
}
