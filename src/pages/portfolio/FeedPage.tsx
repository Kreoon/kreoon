import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { usePortfolioPermissions } from '@/hooks/usePortfolioPermissions';
import { useSavedItems } from '@/hooks/useSavedItems';
import StoriesBar from '@/components/portfolio/feed/StoriesBar';
import SmartSearchBar from '@/components/portfolio/feed/SmartSearchBar';
import FeedCard from '@/components/portfolio/feed/FeedCard';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FeedItem {
  id: string;
  type: 'work' | 'post';
  title?: string;
  caption?: string;
  media_url: string;
  media_type: 'image' | 'video';
  thumbnail_url?: string;
  user_id: string;
  user_name?: string;
  user_avatar?: string;
  client_name?: string;
  views_count: number;
  likes_count: number;
  comments_count: number;
  created_at: string;
  is_liked?: boolean;
  is_saved?: boolean;
}

type FeedTab = 'for-you' | 'following';

export default function FeedPage() {
  const { user } = useAuth();
  const { can } = usePortfolioPermissions();
  const { isSaved, toggleSave } = useSavedItems();
  
  const [activeTab, setActiveTab] = useState<FeedTab>('for-you');
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [followingIds, setFollowingIds] = useState<string[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch following users
  useEffect(() => {
    if (!user?.id) return;

    const fetchFollowing = async () => {
      const { data } = await supabase
        .from('followers')
        .select('following_id')
        .eq('follower_id', user.id);
      
      setFollowingIds(data?.map(f => f.following_id) || []);
    };

    fetchFollowing();
  }, [user?.id]);

  const fetchFeed = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const isFollowing = activeTab === 'following';
      
      // Fetch work content (published videos)
      let workQuery = supabase
        .from('content')
        .select(`
          id,
          title,
          video_url,
          thumbnail_url,
          creator_id,
          views_count,
          likes_count,
          created_at,
          creator:profiles!content_creator_id_fkey(id, full_name, avatar_url),
          client:clients!content_client_id_fkey(name)
        `)
        .eq('is_published', true)
        .not('video_url', 'is', null)
        .order('created_at', { ascending: false })
        .limit(20);

      if (isFollowing && followingIds.length > 0) {
        workQuery = workQuery.in('creator_id', followingIds);
      }

      // Fetch portfolio posts
      let postsQuery = supabase
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
          created_at,
          user:profiles!portfolio_posts_user_id_fkey(id, full_name, avatar_url)
        `)
        .order('created_at', { ascending: false })
        .limit(20);

      if (isFollowing && followingIds.length > 0) {
        postsQuery = postsQuery.in('user_id', followingIds);
      }

      const [{ data: workData }, { data: postsData }] = await Promise.all([
        workQuery,
        postsQuery,
      ]);

      // Transform and merge
      const workItems: FeedItem[] = (workData || []).map(w => ({
        id: w.id,
        type: 'work' as const,
        title: w.title,
        media_url: w.video_url!,
        media_type: 'video' as const,
        thumbnail_url: w.thumbnail_url || undefined,
        user_id: w.creator_id,
        user_name: (w.creator as any)?.full_name,
        user_avatar: (w.creator as any)?.avatar_url,
        client_name: (w.client as any)?.name,
        views_count: w.views_count || 0,
        likes_count: w.likes_count || 0,
        comments_count: 0,
        created_at: w.created_at,
        is_saved: isSaved('work_video', w.id),
      }));

      const postItems: FeedItem[] = (postsData || []).map(p => ({
        id: p.id,
        type: 'post' as const,
        caption: p.caption || undefined,
        media_url: p.media_url,
        media_type: p.media_type as 'image' | 'video',
        thumbnail_url: p.thumbnail_url || undefined,
        user_id: p.user_id,
        user_name: (p.user as any)?.full_name,
        user_avatar: (p.user as any)?.avatar_url,
        views_count: p.views_count || 0,
        likes_count: p.likes_count || 0,
        comments_count: p.comments_count || 0,
        created_at: p.created_at,
        is_saved: isSaved('post', p.id),
      }));

      // Merge and sort by date
      const merged = [...workItems, ...postItems].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setItems(merged);
    } catch (error) {
      console.error('[FeedPage] Error fetching feed:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTab, followingIds, isSaved]);

  useEffect(() => {
    fetchFeed();
  }, [fetchFeed]);

  const handleSave = async (item: FeedItem) => {
    const itemType = item.type === 'work' ? 'work_video' : 'post';
    await toggleSave(itemType, item.id);
  };

  return (
    <div ref={containerRef} className="h-full overflow-y-auto md:ml-20 lg:ml-64">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-lg border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-3">
          {/* Search bar */}
          <SmartSearchBar className="mb-3" />
          
          {/* Tab switcher */}
          <div className="flex items-center justify-between">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as FeedTab)}>
              <TabsList className="bg-muted/50">
                <TabsTrigger value="for-you" className="text-sm">
                  Para Ti
                </TabsTrigger>
                <TabsTrigger value="following" className="text-sm">
                  Siguiendo
                </TabsTrigger>
              </TabsList>
            </Tabs>
            
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => fetchFeed(true)}
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </header>

      {/* Stories bar */}
      <StoriesBar followingIds={followingIds} />

      {/* Feed content */}
      <div className="max-w-2xl mx-auto px-4 py-4 space-y-6 pb-20">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-3">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <Skeleton className="h-4 w-32" />
              </div>
              <Skeleton className="h-80 w-full rounded-xl" />
              <Skeleton className="h-4 w-48" />
            </div>
          ))
        ) : items.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            {activeTab === 'following' 
              ? 'Sigue a creadores para ver su contenido aquí'
              : 'No hay contenido disponible'}
          </div>
        ) : (
          items.map(item => (
            <FeedCard
              key={`${item.type}-${item.id}`}
              item={item}
              onSave={() => handleSave(item)}
              isSaved={item.is_saved}
            />
          ))
        )}
      </div>
    </div>
  );
}
