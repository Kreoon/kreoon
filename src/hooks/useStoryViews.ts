import { useCallback, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface StoryViewerInfo {
  viewer_id: string;
  viewed_at: string;
  profile?: {
    full_name: string;
    avatar_url: string;
  };
}

export function useStoryViews() {
  const { user } = useAuth();
  const [viewedStoryIds, setViewedStoryIds] = useState<Set<string>>(new Set());

  // Load initial viewed stories on mount
  useEffect(() => {
    if (!user?.id) return;

    const loadViewedStories = async () => {
      const { data } = await supabase
        .from('story_views')
        .select('story_id')
        .eq('viewer_id', user.id);

      if (data) {
        setViewedStoryIds(new Set(data.map(v => v.story_id)));
      }
    };

    loadViewedStories();
  }, [user?.id]);

  // Mark a story as viewed (persisted to DB)
  const markStoryAsViewed = useCallback(async (storyId: string) => {
    if (!user?.id) return;
    
    // Optimistically update local state
    setViewedStoryIds(prev => new Set([...prev, storyId]));

    try {
      await supabase
        .from('story_views')
        .upsert({
          story_id: storyId,
          viewer_id: user.id,
        }, { onConflict: 'story_id,viewer_id' });
    } catch (error) {
      console.error('[useStoryViews] Error marking story as viewed:', error);
    }
  }, [user?.id]);

  // Check if story has been viewed
  const isStoryViewed = useCallback((storyId: string): boolean => {
    return viewedStoryIds.has(storyId);
  }, [viewedStoryIds]);

  // Check if user has unseen stories from a given list
  const hasUnseenStories = useCallback((storyIds: string[]): boolean => {
    return storyIds.some(id => !viewedStoryIds.has(id));
  }, [viewedStoryIds]);

  // Get viewers for a story (only owner can see this)
  const getStoryViewers = useCallback(async (storyId: string): Promise<StoryViewerInfo[]> => {
    const { data } = await supabase
      .from('story_views')
      .select(`
        viewer_id,
        viewed_at,
        profiles:viewer_id (
          full_name,
          avatar_url
        )
      `)
      .eq('story_id', storyId)
      .order('viewed_at', { ascending: false });

    return (data || []).map(v => ({
      viewer_id: v.viewer_id,
      viewed_at: v.viewed_at,
      profile: v.profiles as unknown as { full_name: string; avatar_url: string },
    }));
  }, []);

  return {
    markStoryAsViewed,
    isStoryViewed,
    hasUnseenStories,
    getStoryViewers,
    viewedStoryIds,
  };
}
