import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface FollowerProfile {
  id: string;
  full_name: string;
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
}

export function useFollowersList(userId: string | undefined) {
  const [followers, setFollowers] = useState<FollowerProfile[]>([]);
  const [following, setFollowing] = useState<FollowerProfile[]>([]);
  const [likers, setLikers] = useState<FollowerProfile[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchFollowers = useCallback(async () => {
    if (!userId) return;
    setLoading(true);

    const { data } = await supabase
      .from('followers')
      .select(`
        follower_id,
        profiles:follower_id (
          id, full_name, username, avatar_url, bio
        )
      `)
      .eq('following_id', userId);

    if (data) {
      setFollowers(data.map((d: any) => d.profiles).filter(Boolean));
    }
    setLoading(false);
  }, [userId]);

  const fetchFollowing = useCallback(async () => {
    if (!userId) return;
    setLoading(true);

    const { data } = await supabase
      .from('followers')
      .select(`
        following_id,
        profiles:following_id (
          id, full_name, username, avatar_url, bio
        )
      `)
      .eq('follower_id', userId);

    if (data) {
      setFollowing(data.map((d: any) => d.profiles).filter(Boolean));
    }
    setLoading(false);
  }, [userId]);

  const fetchLikers = useCallback(async () => {
    if (!userId) return;
    setLoading(true);

    // Get unique users who liked any of this user's posts
    const { data: posts } = await supabase
      .from('portfolio_posts')
      .select('id')
      .eq('user_id', userId);

    if (posts && posts.length > 0) {
      const postIds = posts.map(p => p.id);
      
      const { data: likes } = await supabase
        .from('portfolio_post_likes')
        .select('viewer_id')
        .in('post_id', postIds);

      if (likes) {
        // Get unique viewer IDs (filter out anonymous)
        const uniqueViewerIds = [...new Set(
          likes.map(l => l.viewer_id).filter(id => id && !id.startsWith('anon_'))
        )];

        if (uniqueViewerIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, full_name, username, avatar_url, bio')
            .in('id', uniqueViewerIds);

          if (profiles) {
            setLikers(profiles);
          }
        }
      }
    }
    setLoading(false);
  }, [userId]);

  return {
    followers,
    following,
    likers,
    loading,
    fetchFollowers,
    fetchFollowing,
    fetchLikers,
  };
}
