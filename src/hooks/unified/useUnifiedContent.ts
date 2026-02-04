import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { ContentStatus } from '@/types/database';

export interface UnifiedContentItem {
  id: string;
  type: 'work' | 'post';
  title?: string;
  caption?: string;
  description?: string;
  media_url: string;
  media_type: 'image' | 'video';
  thumbnail_url?: string;
  video_urls?: string[];
  bunny_embed_url?: string;
  status?: ContentStatus;
  is_published?: boolean;

  // User/Creator info
  user_id?: string;
  creator_id?: string;
  user_name?: string;
  user_avatar?: string;
  creator?: {
    full_name?: string;
    avatar_url?: string;
  } | null;

  // Client info
  client_id?: string;
  client_name?: string;
  client_username?: string;

  // Stats
  views_count: number;
  likes_count: number;
  comments_count: number;

  // Kreoon Social settings
  shared_on_kreoon?: boolean;
  show_on_creator_profile?: boolean;
  show_on_client_profile?: boolean;
  is_collaborative?: boolean;

  // Metadata
  created_at: string;
  updated_at?: string;
  is_liked?: boolean;
  is_saved?: boolean;

  // Script (for client review)
  script?: string | null;
}

export type ContentViewMode = 'grid' | 'list' | 'kanban';
export type ContentFilterStatus = 'all' | ContentStatus | 'published';

interface UseUnifiedContentOptions {
  organizationId?: string;
  clientId?: string;
  creatorId?: string;
  viewMode?: ContentViewMode;
  filterStatus?: ContentFilterStatus;
  includePortfolioPosts?: boolean;
  limit?: number;
}

interface UseUnifiedContentReturn {
  items: UnifiedContentItem[];
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  updateItemStatus: (itemId: string, newStatus: ContentStatus) => Promise<void>;
  getVideoUrls: (item: UnifiedContentItem) => string[];
  filterByStatus: (status: ContentFilterStatus) => void;
  searchItems: (query: string) => void;
  currentFilter: ContentFilterStatus;
  searchQuery: string;
  filteredItems: UnifiedContentItem[];
}

export function useUnifiedContent(options: UseUnifiedContentOptions = {}): UseUnifiedContentReturn {
  const { user } = useAuth();
  const {
    organizationId,
    clientId,
    creatorId,
    filterStatus = 'all',
    includePortfolioPosts = false,
    limit = 100
  } = options;

  const [items, setItems] = useState<UnifiedContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [currentFilter, setCurrentFilter] = useState<ContentFilterStatus>(filterStatus);
  const [searchQuery, setSearchQuery] = useState('');

  const getVideoUrls = useCallback((item: UnifiedContentItem): string[] => {
    if (item.video_urls && item.video_urls.length > 0) return item.video_urls;
    if (item.media_url) return [item.media_url];
    if (item.bunny_embed_url) return [item.bunny_embed_url];
    return [];
  }, []);

  const fetchContent = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Build query for content (work items)
      let contentQuery = supabase
        .from('content')
        .select(`
          id,
          title,
          description,
          video_url,
          video_urls,
          bunny_embed_url,
          thumbnail_url,
          status,
          is_published,
          creator_id,
          client_id,
          views_count,
          likes_count,
          script,
          created_at,
          updated_at,
          profiles:creator_id (
            full_name,
            avatar_url
          ),
          clients:client_id (
            name,
            username
          )
        `)
        .order('created_at', { ascending: false })
        .limit(limit);

      // Apply filters
      if (organizationId) {
        contentQuery = contentQuery.eq('organization_id', organizationId);
      }
      if (clientId) {
        contentQuery = contentQuery.eq('client_id', clientId);
      }
      if (creatorId) {
        contentQuery = contentQuery.eq('creator_id', creatorId);
      }

      const { data: contentData, error: contentError } = await contentQuery;

      if (contentError) throw contentError;

      // Transform content data to unified format
      const workItems: UnifiedContentItem[] = (contentData || []).map((item: any) => ({
        id: item.id,
        type: 'work' as const,
        title: item.title,
        description: item.description,
        media_url: item.video_urls?.[0] || item.video_url || item.bunny_embed_url || '',
        media_type: 'video' as const,
        thumbnail_url: item.thumbnail_url,
        video_urls: item.video_urls,
        bunny_embed_url: item.bunny_embed_url,
        status: item.status,
        is_published: item.is_published,
        creator_id: item.creator_id,
        user_id: item.creator_id,
        user_name: item.profiles?.full_name,
        user_avatar: item.profiles?.avatar_url,
        creator: item.profiles,
        client_id: item.client_id,
        client_name: item.clients?.name,
        client_username: item.clients?.username,
        views_count: item.views_count || 0,
        likes_count: item.likes_count || 0,
        comments_count: 0,
        script: item.script,
        created_at: item.created_at,
        updated_at: item.updated_at
      }));

      let allItems = workItems;

      // Optionally include portfolio posts
      if (includePortfolioPosts) {
        const { data: postsData, error: postsError } = await supabase
          .from('portfolio_posts')
          .select(`
            id,
            user_id,
            media_url,
            media_type,
            thumbnail_url,
            caption,
            views_count,
            likes_count,
            comments_count,
            created_at
          `)
          .order('created_at', { ascending: false })
          .limit(limit);

        if (!postsError && postsData) {
          // Fetch user profiles for posts
          const userIds = [...new Set(postsData.map(p => p.user_id))];
          const { data: profilesData } = userIds.length > 0
            ? await supabase
                .from('profiles')
                .select('id, full_name, avatar_url')
                .in('id', userIds)
            : { data: [] };

          const profilesMap = new Map((profilesData || []).map(p => [p.id, p]));

          const postItems: UnifiedContentItem[] = postsData.map(post => {
            const profile = profilesMap.get(post.user_id);
            return {
              id: post.id,
              type: 'post' as const,
              caption: post.caption,
              media_url: post.media_url,
              media_type: post.media_type as 'image' | 'video',
              thumbnail_url: post.thumbnail_url,
              user_id: post.user_id,
              user_name: profile?.full_name,
              user_avatar: profile?.avatar_url,
              views_count: post.views_count || 0,
              likes_count: post.likes_count || 0,
              comments_count: post.comments_count || 0,
              created_at: post.created_at,
              is_published: true, // Posts are always published
              status: 'published' as ContentStatus
            };
          });

          allItems = [...workItems, ...postItems].sort(
            (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
        }
      }

      setItems(allItems);
    } catch (err) {
      console.error('[useUnifiedContent] Error:', err);
      setError(err instanceof Error ? err : new Error('Error fetching content'));
    } finally {
      setLoading(false);
    }
  }, [organizationId, clientId, creatorId, includePortfolioPosts, limit]);

  const updateItemStatus = useCallback(async (itemId: string, newStatus: ContentStatus) => {
    try {
      const { error } = await supabase
        .from('content')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', itemId);

      if (error) throw error;

      // Update local state
      setItems(prev =>
        prev.map(item =>
          item.id === itemId ? { ...item, status: newStatus } : item
        )
      );
    } catch (err) {
      console.error('[useUnifiedContent] Error updating status:', err);
      throw err;
    }
  }, []);

  const filterByStatus = useCallback((status: ContentFilterStatus) => {
    setCurrentFilter(status);
  }, []);

  const searchItems = useCallback((query: string) => {
    setSearchQuery(query.toLowerCase());
  }, []);

  // Compute filtered items
  const filteredItems = items.filter(item => {
    // Apply status filter
    if (currentFilter !== 'all') {
      if (currentFilter === 'published') {
        if (!item.is_published) return false;
      } else if (item.status !== currentFilter) {
        return false;
      }
    }

    // Apply search filter
    if (searchQuery) {
      const searchFields = [
        item.title,
        item.caption,
        item.description,
        item.user_name,
        item.client_name
      ].filter(Boolean).join(' ').toLowerCase();

      if (!searchFields.includes(searchQuery)) {
        return false;
      }
    }

    return true;
  });

  useEffect(() => {
    fetchContent();
  }, [fetchContent]);

  return {
    items,
    loading,
    error,
    refresh: fetchContent,
    updateItemStatus,
    getVideoUrls,
    filterByStatus,
    searchItems,
    currentFilter,
    searchQuery,
    filteredItems
  };
}
