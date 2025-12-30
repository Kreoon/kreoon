import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { usePortfolioPermissions } from '@/hooks/usePortfolioPermissions';
import { useSavedItems } from '@/hooks/useSavedItems';
import { useFeedEvents } from '@/hooks/useFeedEvents';
import { useInterestExtractor } from '@/hooks/useInterestExtractor';
import { useRecommendations } from '@/hooks/useRecommendations';
import { usePersistedValue } from '@/hooks/useStatePersistence';
import StoriesBar from '@/components/portfolio/feed/StoriesBar';
import { EnhancedSmartSearch } from '@/components/portfolio/EnhancedSmartSearch';
import { SocialNotificationsDropdown } from '@/components/portfolio/SocialNotificationsDropdown';
import FeedGridCard from '@/components/portfolio/feed/FeedGridCard';
import FeedGridModal from '@/components/portfolio/feed/FeedGridModal';
import { SuggestedProfiles } from '@/components/portfolio/feed/SuggestedProfiles';
import { MediaUploader } from '@/components/portfolio/MediaUploader';
import { TrendingSection } from '@/components/social/TrendingSection';
import { RefreshCw, Sparkles, Plus, ImageIcon, Film, Compass, Users, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

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
  client_username?: string;
  views_count: number;
  likes_count: number;
  comments_count: number;
  created_at: string;
  is_liked?: boolean;
  is_saved?: boolean;
}

type FeedTab = 'for-you' | 'following';

export default function FeedPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { can } = usePortfolioPermissions();
  const { isSaved, toggleSave } = useSavedItems();
  const { startViewTimer, endViewTimer, trackLike, trackSave } = useFeedEvents();
  const { trackEvent: trackInterestEvent } = useInterestExtractor();
  
  // Persist tab and scroll position to avoid losing state on tab change/blur
  const [activeTab, setActiveTab] = usePersistedValue<FeedTab>('feed_active_tab', 'for-you');
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [followingIds, setFollowingIds] = useState<string[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showSuggestions, setShowSuggestions] = usePersistedValue('feed_show_suggestions', true);
  const [showStoryUploader, setShowStoryUploader] = useState(false);
  const [showPostUploader, setShowPostUploader] = useState(false);
  const [useAIRecommendations, setUseAIRecommendations] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // AI Recommendations hook
  const { 
    recommendations, 
    loading: loadingRecs, 
    hasPersonalization,
    fetchRecommendations 
  } = useRecommendations({ followingIds, limit: 50 });
  
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
      // For "Following" tab: chronological order
      // For "For You" tab: we'll rely on AI recommendations hook separately
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

      // Fetch client names and usernames for work items
      const clientIds = [...new Set((workData || []).map(w => (w as any).client_id).filter(Boolean))] as string[];
      const { data: clientsData } = clientIds.length > 0
        ? await supabase
            .from('clients')
            .select('id, name, username')
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
            client_username: client?.username || undefined,
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

      // Merge items first (unsorted)
      const merged = [...workItems, ...postItems];

      // Deterministic shuffle for variety (seeded by current timestamp rounded to minutes)
      const shuffleSeeded = <T,>(arr: T[], seedStr: string): T[] => {
        let seed = 0;
        for (let i = 0; i < seedStr.length; i++) {
          seed = ((seed << 5) - seed) + seedStr.charCodeAt(i);
          seed |= 0;
        }
        const rand = () => {
          seed ^= seed << 13;
          seed ^= seed >> 17;
          seed ^= seed << 5;
          return ((seed >>> 0) % 1_000_000) / 1_000_000;
        };
        const out = [...arr];
        for (let i = out.length - 1; i > 0; i--) {
          const j = Math.floor(rand() * (i + 1));
          [out[i], out[j]] = [out[j], out[i]];
        }
        return out;
      };

      // Seed changes every minute so refresh button gives new order
      const seed = `feed-${activeTab}-${Math.floor(Date.now() / 60000)}`;
      const shuffled = shuffleSeeded(merged, seed);

      // Apply shuffled data for Following tab or as fallback for For You
      if (activeTab === 'following' || !useAIRecommendations) {
        setItems(shuffled);
      } else {
        // For "For You" with AI enabled: only set fallback if we don't have items yet.
        // This prevents fetchFeed() from overwriting the AI-sorted order.
        if (items.length === 0) {
          setItems(shuffled);
        }
      }
    } catch (error) {
      console.error('[FeedPage] Error fetching feed:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTab, followingIds, isSaved, useAIRecommendations, items.length]);

  // Fetch AI recommendations for "For You" tab and apply them
  useEffect(() => {
    if (activeTab === 'for-you' && useAIRecommendations) {
      const viewedIds = items.filter(i => i.type === 'work').map(i => i.id);
      fetchRecommendations([], viewedIds);
    }
  }, [activeTab, useAIRecommendations, followingIds]);

  // When AI recommendations arrive, reorder items based on recommendation order
  // IMPORTANT: make the order "definitive" by also shuffling any non-recommended leftovers,
  // and avoid depending on `items` to prevent re-application loops.
  const appliedRecsRef = useRef<string>('');

  useEffect(() => {
    if (activeTab !== 'for-you' || recommendations.length === 0) return;

    // Create a stable key for this set of recommendations
    const recsKey = recommendations.map((r) => r.id).join('|');
    if (appliedRecsRef.current === recsKey) return;

    // Deterministic shuffle based on the recommendation set (so it stays stable until refresh)
    const shuffleSeeded = <T,>(arr: T[], seedStr: string) => {
      let seed = 0;
      for (let i = 0; i < seedStr.length; i++) {
        seed = ((seed << 5) - seed) + seedStr.charCodeAt(i);
        seed |= 0;
      }
      const rand = () => {
        seed ^= seed << 13;
        seed ^= seed >> 17;
        seed ^= seed << 5;
        return ((seed >>> 0) % 1_000_000) / 1_000_000;
      };
      const out = [...arr];
      for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
      }
      return out;
    };

    appliedRecsRef.current = recsKey;

    setItems((prev) => {
      if (prev.length === 0) return prev;

      const prevById = new Map(prev.map((it) => [it.id, it] as const));

      // 1) Put recommended items first, in EXACT order returned by backend
      const recommendedOrdered = recommendations
        .map((r) => prevById.get(r.id))
        .filter(Boolean) as FeedItem[];

      // 2) Anything not recommended goes after, but SHUFFLED to avoid reverting to chronological
      const recommendedIdSet = new Set(recommendedOrdered.map((it) => it.id));
      const leftovers = prev.filter((it) => !recommendedIdSet.has(it.id));
      const shuffledLeftovers = shuffleSeeded(leftovers, `leftovers:${recsKey}`);

      const next = [...recommendedOrdered, ...shuffledLeftovers];

      // Avoid unnecessary state writes
      const changed = next.some((it, idx) => it.id !== prev[idx]?.id);
      return changed ? next : prev;
    });
  }, [recommendations, activeTab]);

  useEffect(() => {
    fetchFeed();
  }, [fetchFeed]);

  // Track interaction for interest extraction
  const handleInteraction = useCallback(() => {
    trackInterestEvent();
  }, [trackInterestEvent]);

  const handleCardClick = (index: number) => {
    const item = items[index];
    if (item) {
      startViewTimer(item.type === 'work' ? 'content' : 'post', item.id);
      handleInteraction();
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
    <div ref={containerRef} className="h-full overflow-y-auto md:pl-20 lg:pl-64 bg-social-background">
      {/* Header with glassmorphism */}
      <header className="sticky top-0 z-30 glass-social-strong border-b border-white/5">
        <div className="max-w-6xl mx-auto px-4 py-3">
          {/* Search + actions (desktop) */}
          <div className="flex items-center gap-2 mb-3">
            <EnhancedSmartSearch className="mb-0 flex-1" />
            <div className="hidden md:flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-social-foreground hover:bg-white/10 rounded-xl"
                onClick={() => navigate('/explore')}
                aria-label="Explorar"
              >
                <Compass className="h-5 w-5" />
              </Button>
              <SocialNotificationsDropdown />
            </div>
          </div>
          
          {/* Tab switcher with glassmorphism */}
          <div className="flex items-center justify-between">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as FeedTab)}>
              <TabsList className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl">
                <TabsTrigger 
                  value="for-you" 
                  className="text-sm flex items-center gap-1.5 data-[state=active]:bg-social-accent data-[state=active]:text-white rounded-lg transition-all"
                >
                  Para Ti
                  {hasPersonalization && activeTab === 'for-you' && (
                    <Sparkles className="h-3 w-3" />
                  )}
                </TabsTrigger>
                <TabsTrigger 
                  value="following" 
                  className="text-sm data-[state=active]:bg-social-accent data-[state=active]:text-white rounded-lg transition-all"
                >
                  Siguiendo
                </TabsTrigger>
              </TabsList>
            </Tabs>
            
            <div className="flex items-center gap-1">
              {hasPersonalization && (
                <Badge variant="secondary" className="text-xs">
                  <Sparkles className="h-3 w-3 mr-1" />
                  IA
                </Badge>
              )}
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => {
                  if (activeTab === 'for-you' && useAIRecommendations) {
                    const viewedIds = items.filter(i => i.type === 'work').map(i => i.id);
                    fetchRecommendations([], viewedIds);
                    return;
                  }
                  fetchFeed(true);
                }}
                disabled={refreshing}
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Suggested profiles */}
      {activeTab === 'for-you' && (
        showSuggestions ? (
          <SuggestedProfiles 
            variant="carousel" 
            limit={5}
            onDismiss={() => setShowSuggestions(false)}
          />
        ) : (
          <div className="max-w-4xl mx-auto px-4 py-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground hover:text-foreground"
              onClick={() => setShowSuggestions(true)}
            >
              <Users className="h-3 w-3 mr-1" />
              Mostrar sugerencias de perfiles
            </Button>
          </div>
        )
      )}

      <StoriesBar 
        followingIds={followingIds} 
        onAddStory={() => setShowStoryUploader(true)}
      />

      {/* Feed content - responsive layout with sidebar for desktop */}
      <div className="max-w-6xl mx-auto px-1 py-2 pb-20">
        <div className="flex gap-6">
          {/* Main feed - 3 column grid */}
          <div className="flex-1 max-w-4xl">
            {loading ? (
              <div className="grid grid-cols-3 gap-1">
                {Array.from({ length: 12 }).map((_, i) => (
                  <Skeleton key={i} className="aspect-[4/5] rounded-sm" />
                ))}
              </div>
            ) : items.length === 0 ? (
              <div className="text-center py-12 text-social-muted-foreground">
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

          {/* Sidebar - Trending section (desktop only) */}
          <aside className="hidden lg:block w-80 shrink-0">
            <div className="sticky top-20 space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 rounded-xl bg-gradient-to-br from-social-accent to-pink-500">
                  <TrendingUp className="h-4 w-4 text-white" />
                </div>
                <h3 className="font-semibold text-social-foreground">Tendencias</h3>
              </div>
              <TrendingSection variant="sidebar" />
            </div>
          </aside>
        </div>
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

      {/* Story Uploader */}
      {user?.id && (
        <MediaUploader
          userId={user.id}
          type="story"
          isOpen={showStoryUploader}
          onClose={() => setShowStoryUploader(false)}
          onSuccess={() => {
            setShowStoryUploader(false);
            fetchFeed(true);
          }}
        />
      )}

      {/* Post Uploader */}
      {user?.id && (
        <MediaUploader
          userId={user.id}
          type="post"
          isOpen={showPostUploader}
          onClose={() => setShowPostUploader(false)}
          onSuccess={() => {
            setShowPostUploader(false);
            fetchFeed(true);
          }}
        />
      )}

      {/* FAB for creating content */}
      {can('portfolio.posts.create') && (
        <div className="fixed bottom-24 right-4 z-40 md:bottom-8">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                size="lg" 
                className="h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-shadow"
              >
                <Plus className="h-6 w-6" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => setShowPostUploader(true)}>
                <ImageIcon className="h-4 w-4 mr-2" />
                Crear post
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowStoryUploader(true)}>
                <Film className="h-4 w-4 mr-2" />
                Agregar historia
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </div>
  );
}
