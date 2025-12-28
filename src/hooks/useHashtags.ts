import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Hashtag {
  id: string;
  tag: string;
  use_count: number;
  created_at: string;
}

export function useHashtags() {
  const [trending, setTrending] = useState<Hashtag[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchTrending = useCallback(async (limit = 10) => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('hashtags')
        .select('*')
        .order('use_count', { ascending: false })
        .limit(limit);

      if (error) throw error;
      setTrending((data || []) as Hashtag[]);
    } catch (error) {
      console.error('Error fetching trending hashtags:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const searchHashtags = useCallback(async (query: string): Promise<Hashtag[]> => {
    if (!query || query.length < 2) return [];

    try {
      const { data, error } = await (supabase as any)
        .from('hashtags')
        .select('*')
        .ilike('tag', `%${query}%`)
        .order('use_count', { ascending: false })
        .limit(10);

      if (error) throw error;
      return (data || []) as Hashtag[];
    } catch (error) {
      console.error('Error searching hashtags:', error);
      return [];
    }
  }, []);

  const getPostsByHashtag = useCallback(async (tag: string) => {
    try {
      // Get hashtag id
      const { data: hashtagData } = await (supabase as any)
        .from('hashtags')
        .select('id')
        .eq('tag', tag.toLowerCase())
        .single();

      if (!hashtagData) return [];

      // Get post ids
      const { data: postHashtags } = await (supabase as any)
        .from('post_hashtags')
        .select('post_id')
        .eq('hashtag_id', hashtagData.id);

      if (!postHashtags || postHashtags.length === 0) return [];

      const postIds = postHashtags.map((ph: any) => ph.post_id);

      // Get posts
      const { data: posts, error } = await (supabase as any)
        .from('portfolio_posts')
        .select('*')
        .in('id', postIds)
        .eq('visibility', 'public')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return posts || [];
    } catch (error) {
      console.error('Error fetching posts by hashtag:', error);
      return [];
    }
  }, []);

  return {
    trending,
    loading,
    fetchTrending,
    searchHashtags,
    getPostsByHashtag,
  };
}
