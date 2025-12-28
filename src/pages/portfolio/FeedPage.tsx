import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { usePortfolioPermissions } from '@/hooks/usePortfolioPermissions';
import { useSavedItems } from '@/hooks/useSavedItems';
import { useFeedEvents } from '@/hooks/useFeedEvents';
import { usePersistedValue } from '@/hooks/useStatePersistence';
import StoriesBar from '@/components/portfolio/feed/StoriesBar';
import SmartSearchBar from '@/components/portfolio/feed/SmartSearchBar';
import FeedGridCard from '@/components/portfolio/feed/FeedGridCard';
import FeedGridModal from '@/components/portfolio/feed/FeedGridModal';
import { SuggestedProfiles } from '@/components/portfolio/feed/SuggestedProfiles';
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
  const { startViewTimer, endViewTimer, trackLike, trackSave } = useFeedEvents();
  
  // Persist tab and scroll position to avoid losing state on tab change/blur
  const [activeTab, setActiveTab] = usePersistedValue<FeedTab>('feed_active_tab', 'for-you');
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [followingIds, setFollowingIds] = useState<string[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showSuggestions, setShowSuggestions] = usePersistedValue('feed_show_suggestions', true);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Persist scroll position
  const scrollPositionRef = useRef(0);
  
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    
    const handleScroll = () => {
      scrollPositionRef.current = container.scrollTop;
      sessionStorage.setItem('feed_scroll', String(container.scrollTop));
    };
    
    container.addEventListener('scroll', handleScroll, { passive: true });
    
    // Restore scroll position
    const savedScroll = sessionStorage.getItem('feed_scroll');
    if (savedScroll) {
      requestAnimationFrame(() => {
        container.scrollTop = parseInt(savedScroll, 10);
      });
    }
    
    return () => container.removeEventListener('scroll', handleScroll);
  }, [loading]);

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
      
      // Fetch work content (published videos) - from ALL organizations
      // Include video_urls array for direct Bunny CDN access
      let workQuery = supabase
        .from('content')
        .select(`
          id,
          title,
          video_url,
          video_urls,
          bunny_embed_url,
          thumbnail_url,
          creator_id,
          client_id,
          views_count,
          likes_count,
          created_at
        `)
        .eq('is_published', true)
        .or('video_url.not.is.null,bunny_embed_url.not.is.null,video_urls.not.is.null')
        .order('created_at', { ascending: false })
        .limit(50);

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
          created_at
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      if (isFollowing && followingIds.length > 0) {
        postsQuery = postsQuery.in('user_id', followingIds);
      }

      const [{ data: workData }, { data: postsData }] = await Promise.all([
        workQuery,
        postsQuery,
      ]);

      // Fetch user profiles (for posts + work creators)
      const postUserIds = [...new Set((postsData || []).map(p => p.user_id))];
      const workCreatorIds = [...new Set((workData || []).map(w => w.creator_id).filter(Boolean))] as string[];
      const allUserIds = [...new Set([...postUserIds, ...workCreatorIds])];

      const { data: profilesData } = allUserIds.length > 0
        ? await supabase
            .from('profiles')
            .select('id, full_name, avatar_url')
            .in('id', allUserIds)
        : { data: [] };

      const profilesMap = new Map((profilesData || []).map(p => [p.id, p]));

      // Fetch client names for work items
      const clientIds = [...new Set((workData || []).map(w => (w as any).client_id).filter(Boolean))] as string[];
      const { data: clientsData } = clientIds.length > 0
        ? await supabase
            .from('clients')
            .select('id, name')
            .in('id', clientIds)
        : { data: [] };

      const clientsMap = new Map((clientsData || []).map(c => [c.id, c]));

      // Transform and merge
      const workItems: FeedItem[] = (workData || [])
        .filter(w => w.video_url || (w as any).bunny_embed_url || ((w as any).video_urls && (w as any).video_urls.length > 0))
        .map(w => {
          const profile = profilesMap.get(w.creator_id);
          const client = clientsMap.get((w as any).client_id);
          
          // Prioritize direct Bunny CDN URLs for better loading
          // video_urls array contains direct CDN links, video_url may be embed URL
          const videoUrls = (w as any).video_urls as string[] | null;
          const directVideoUrl = videoUrls && videoUrls.length > 0 
            ? videoUrls[0] // First video URL from array (direct CDN)
            : w.video_url || (w as any).bunny_embed_url;

          return {
            id: w.id,
            type: 'work' as const,
            title: w.title,
            media_url: directVideoUrl,
            media_type: 'video' as const,
            thumbnail_url: w.thumbnail_url || undefined,
            user_id: w.creator_id,
            user_name: profile?.full_name,
            user_avatar: profile?.avatar_url,
            client_name: client?.name,
            views_count: w.views_count || 0,
            likes_count: w.likes_count || 0,
            comments_count: 0,
            created_at: w.created_at,
            is_saved: isSaved('work_video', w.id),
          };
        });

      const postItems: FeedItem[] = (postsData || []).map(p => {
        const profile = profilesMap.get(p.user_id);
        return {
          id: p.id,
          type: 'post' as const,
          caption: p.caption || undefined,
          media_url: p.media_url,
          media_type: p.media_type as 'image' | 'video',
          thumbnail_url: p.thumbnail_url || undefined,
          user_id: p.user_id,
          user_name: profile?.full_name,
          user_avatar: profile?.avatar_url,
          views_count: p.views_count || 0,
          likes_count: p.likes_count || 0,
          comments_count: p.comments_count || 0,
          created_at: p.created_at,
          is_saved: isSaved('post', p.id),
        };
      });

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

  const handleCardClick = (index: number) => {
    const item = items[index];
    if (item) {
      startViewTimer(item.type === 'work' ? 'content' : 'post', item.id);
    }
    setSelectedIndex(index);
    setModalOpen(true);
  };

  const handleModalClose = () => {
    const item = items[selectedIndex];
    if (item) {
      endViewTimer(item.type === 'work' ? 'content' : 'post', item.id);
    }
    setModalOpen(false);
  };

  const handleSave = async (item: FeedItem) => {
    const itemType = item.type === 'work' ? 'work_video' : 'post';
    await toggleSave(itemType, item.id);
    trackSave(item.type === 'work' ? 'content' : 'post', item.id);
  };

  const checkIsSaved = (item: FeedItem) => {
    const itemType = item.type === 'work' ? 'work_video' : 'post';
    return isSaved(itemType, item.id);
  };

  return (
    <div ref={containerRef} className="h-full overflow-y-auto md:ml-20 lg:ml-64">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-lg border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-3">
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
      {/* Suggested profiles (shown once per session) */}
      {showSuggestions && activeTab === 'for-you' && (
        <SuggestedProfiles 
          variant="carousel" 
          limit={5}
          onDismiss={() => setShowSuggestions(false)}
        />
      )}

      <StoriesBar followingIds={followingIds} />

      {/* Feed content - 3 column grid */}
      <div className="max-w-4xl mx-auto px-1 py-2 pb-20">
        {loading ? (
          <div className="grid grid-cols-3 gap-1">
            {Array.from({ length: 12 }).map((_, i) => (
              <Skeleton key={i} className="aspect-square" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            {activeTab === 'following' 
              ? 'Sigue a creadores para ver su contenido aquí'
              : 'No hay contenido disponible'}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-1">
            {items.map((item, index) => (
              <FeedGridCard
                key={`${item.type}-${item.id}`}
                item={item}
                onClick={() => handleCardClick(index)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Fullscreen modal */}
      <FeedGridModal
        items={items}
        initialIndex={selectedIndex}
        isOpen={modalOpen}
        onClose={handleModalClose}
        onSave={handleSave}
        isSaved={checkIsSaved}
      />
    </div>
  );
}
