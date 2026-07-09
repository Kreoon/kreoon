import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { VideoPlayerProvider } from '@/contexts/VideoPlayerContext';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { KreoonSkeleton } from '@/components/ui/kreoon/KreoonSkeleton';
import { useIsMobile } from '@/hooks/use-mobile';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { useFeedPosts, FeedTab, FeedPost } from '@/hooks/useFeedPosts';
import { SocialFeed } from '@/components/social/SocialFeed';
import { SocialFeedItem } from '@/components/social/SocialFeedCard';
import StoriesBar from '@/components/portfolio/feed/StoriesBar';
import { EnhancedSmartSearch } from '@/components/portfolio/EnhancedSmartSearch';
import { SocialNotificationsDropdown } from '@/components/portfolio/SocialNotificationsDropdown';
import FeedGridCard from '@/components/portfolio/feed/FeedGridCard';
import FeedGridModal from '@/components/portfolio/feed/FeedGridModal';
import { SuggestedProfiles } from '@/components/portfolio/feed/SuggestedProfiles';
import { MediaUploader } from '@/components/portfolio/MediaUploader';
import { RefreshCw, Plus, ImageIcon, Film, Compass, Grid3x3, Rows3, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// La tab "Colaboraciones" del feed anterior (shared_on_kreoon/is_collaborative sobre `content`)
// no tiene equivalente en get_feed_posts todavia (RPC unifica portfolio_items + portfolio_posts,
// no `content` directo). Se oculta con este flag hasta decidir si se re-integra. Documentado en
// el reporte de Fase 1.4 — NO se borro codigo, solo se dejo de montar la tab.
const SHOW_COLLABORATIONS_TAB = false;

// Grid local FeedItem shape (misma forma que espera FeedGridCard/FeedGridModal)
function toGridItem(post: FeedPost) {
  return {
    id: post.post_id,
    type: (post.post_source === 'portfolio_item' ? 'work' : 'post') as 'work' | 'post',
    title: post.title || undefined,
    caption: post.title || undefined,
    media_url: post.media_url,
    media_type: (post.media_type === 'video' ? 'video' : 'image') as 'video' | 'image',
    thumbnail_url: post.thumbnail_url || undefined,
    user_id: post.author_user_id || '',
    user_name: post.author_name || undefined,
    user_avatar: post.author_avatar || undefined,
    views_count: post.views_count,
    likes_count: post.post_source === 'portfolio_item' ? post.reactions_count : post.likes_count,
    comments_count: 0,
    created_at: post.created_at,
    is_saved: post.is_saved,
  };
}

function toSocialFeedItem(post: FeedPost): SocialFeedItem {
  return {
    id: post.post_id,
    title: post.title || '',
    mediaType: post.media_type === 'video' ? 'video' : 'image',
    mediaUrl: post.media_url,
    thumbnailUrl: post.thumbnail_url,
    viewsCount: post.views_count,
    likesCount: post.post_source === 'portfolio_item' ? post.reactions_count : post.likes_count,
    isLiked: post.is_liked,
    creatorId: post.author_user_id,
    creatorName: post.author_name,
    creatorAvatar: post.author_avatar,
    createdAt: post.created_at,
    supportsReactions: post.post_source === 'portfolio_item',
    myReaction: post.my_reaction as SocialFeedItem['myReaction'],
    reactionsCount: post.reactions_count,
    isSaved: post.is_saved,
  };
}

export default function FeedPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isMobileDevice = useIsMobile();
  const isOnline = useOnlineStatus();

  const [activeTab, setActiveTab] = useState<FeedTab>('for_you');
  const [niche, setNiche] = useState<string | null>(null);
  const [niches, setNiches] = useState<string[]>([]);
  const [mobileViewMode, setMobileViewMode] = useState<'immersive' | 'grid'>('immersive');
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showPostUploader, setShowPostUploader] = useState(false);
  const [showStoryUploader, setShowStoryUploader] = useState(false);
  const [followingIds, setFollowingIds] = useState<string[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const touchStartYRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { posts, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage, refetch, react, toggleLikeLegacyPost, toggleSaved } =
    useFeedPosts(activeTab, activeTab === 'niche' ? niche : null);

  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from('followers')
      .select('following_id')
      .eq('follower_id', user.id)
      .then(({ data }) => setFollowingIds((data || []).map((f) => f.following_id)));
  }, [user?.id]);

  // Categorias reales presentes en portfolio_items, para la tab "Por nicho"
  useEffect(() => {
    supabase
      .from('portfolio_items')
      .select('category')
      .eq('is_public', true)
      .not('category', 'is', null)
      .limit(500)
      .then(({ data }) => {
        const unique = Array.from(new Set((data || []).map((d) => d.category).filter(Boolean))) as string[];
        setNiches(unique.slice(0, 12));
      });
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  // Pull-to-refresh (solo movil, solo cuando el scroll ya esta en el tope)
  const handleTouchStart = (e: React.TouchEvent) => {
    if (containerRef.current && containerRef.current.scrollTop <= 0) {
      touchStartYRef.current = e.touches[0].clientY;
    }
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartYRef.current === null) return;
    const delta = e.touches[0].clientY - touchStartYRef.current;
    if (delta > 0) setPullDistance(Math.min(delta, 80));
  };
  const handleTouchEnd = () => {
    if (pullDistance > 50) handleRefresh();
    setPullDistance(0);
    touchStartYRef.current = null;
  };

  const handleReact = useCallback((postId: string, type: string | null) => {
    const post = posts.find((p) => p.post_id === postId);
    if (!post) return;
    // type=null significa "quitar la reaccion actual" (tap de nuevo sobre la misma reaccion)
    const targetType = type ?? post.my_reaction;
    if (!targetType) return;
    react(post, targetType);
  }, [posts, react]);

  const handleSave = useCallback((postId: string) => {
    const post = posts.find((p) => p.post_id === postId);
    if (post) toggleSaved(post);
  }, [posts, toggleSaved]);

  const handleLikeLegacy = useCallback((postId: string) => {
    const post = posts.find((p) => p.post_id === postId);
    if (post) toggleLikeLegacyPost(post);
  }, [posts, toggleLikeLegacyPost]);

  const socialFeedItems = useMemo(() => posts.map(toSocialFeedItem), [posts]);
  const gridItems = useMemo(() => posts.map(toGridItem), [posts]);

  if (!isOnline) {
    return (
      <div className="h-[100dvh] flex flex-col items-center justify-center gap-3 bg-background px-6 text-center md:pl-20 lg:pl-64">
        <WifiOff className="h-10 w-10 text-muted-foreground" />
        <p className="text-foreground font-medium">Sin conexión</p>
        <p className="text-sm text-muted-foreground">Revisa tu internet y reintenta.</p>
        <Button onClick={() => window.location.reload()} size="sm" className="mt-2 h-11">
          Reintentar
        </Button>
      </div>
    );
  }

  // ── Modo inmersivo movil (TikTok-style) ──
  // Vive DENTRO del chrome real de MainLayout (header + bottom nav globales, Fase 2.5.A) —
  // no duplica header/nav propios. Altura = viewport menos header (3.5rem = h-14) menos
  // bottom nav (--kreoon-bottom-nav-h, seteada por MainLayout) menos safe-area.
  if (isMobileDevice && mobileViewMode === 'immersive') {
    return (
      <VideoPlayerProvider>
      <div className="relative h-[calc(100dvh-3.5rem-var(--kreoon-bottom-nav-h,0px)-env(safe-area-inset-bottom))] w-full bg-black">
        <div className="absolute top-2 left-0 right-0 z-30 flex items-center justify-between px-4">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as FeedTab)}>
            <TabsList className="bg-black/40 border border-white/10">
              <TabsTrigger value="for_you" className="text-xs text-white data-[state=active]:bg-primary">Para ti</TabsTrigger>
              <TabsTrigger value="following" className="text-xs text-white data-[state=active]:bg-primary">Siguiendo</TabsTrigger>
              <TabsTrigger value="niche" className="text-xs text-white data-[state=active]:bg-primary">Por nicho</TabsTrigger>
            </TabsList>
          </Tabs>
          <button
            onClick={() => setMobileViewMode('grid')}
            className="h-11 w-11 flex items-center justify-center rounded-full bg-black/40 text-white"
            aria-label="Ver como grilla"
          >
            <Grid3x3 className="h-5 w-5" />
          </button>
        </div>

        {isLoading ? (
          <div className="h-full w-full flex items-center justify-center bg-black">
            <KreoonSkeleton variant="rectangular" className="h-full w-full" animation="pulse" />
          </div>
        ) : activeTab === 'following' && posts.length === 0 ? (
          <div className="h-full w-full overflow-y-auto bg-background flex flex-col items-center justify-center px-4 pt-24 pb-4">
            <p className="text-foreground font-medium mb-1">Aún no sigues a nadie</p>
            <p className="text-sm text-muted-foreground mb-4 text-center">
              Descubre creadores de tu nicho y arma tu feed
            </p>
            <SuggestedProfiles variant="carousel" limit={8} onFollowed={() => refetch()} />
          </div>
        ) : (
          <SocialFeed
            items={socialFeedItems}
            onReact={handleReact}
            onLike={handleLikeLegacy}
            onSave={handleSave}
            onProfileClick={(creatorId) => navigate(`/profile/${creatorId}`)}
            onLoadMore={() => hasNextPage && !isFetchingNextPage && fetchNextPage()}
          />
        )}

        {user?.id && (
          <MediaUploader
            userId={user.id}
            type="post"
            isOpen={showPostUploader}
            onClose={() => setShowPostUploader(false)}
            onSuccess={() => {
              setShowPostUploader(false);
              refetch();
            }}
          />
        )}
      </div>
      </VideoPlayerProvider>
    );
  }

  // ── Grid (movil-grid, tablet, desktop) ──
  return (
    <div
      ref={containerRef}
      onTouchStart={isMobileDevice ? handleTouchStart : undefined}
      onTouchMove={isMobileDevice ? handleTouchMove : undefined}
      onTouchEnd={isMobileDevice ? handleTouchEnd : undefined}
      className="h-full overflow-y-auto md:pl-20 lg:pl-64 bg-background"
    >
      {pullDistance > 0 && (
        <div
          className="flex items-center justify-center text-muted-foreground text-xs"
          style={{ height: pullDistance }}
        >
          <RefreshCw className={pullDistance > 50 ? 'animate-spin h-4 w-4' : 'h-4 w-4'} />
        </div>
      )}

      <header className="sticky top-0 z-30 bg-card border-b border-white/5">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex items-center gap-2 mb-3">
            <EnhancedSmartSearch className="mb-0 flex-1" />
            <div className="hidden md:flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-11 w-11 text-foreground hover:bg-white/10 rounded-sm"
                onClick={() => navigate('/explore')}
                aria-label="Explorar"
              >
                <Compass className="h-5 w-5" />
              </Button>
              <SocialNotificationsDropdown />
            </div>
            {isMobileDevice && (
              <button
                onClick={() => setMobileViewMode('immersive')}
                className="h-11 w-11 flex items-center justify-center rounded-sm border border-border text-foreground"
                aria-label="Ver inmersivo"
              >
                <Rows3 className="h-5 w-5" />
              </button>
            )}
          </div>

          <div className="flex items-center justify-between gap-2">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as FeedTab)}>
              <TabsList className="bg-white/5 border border-white/10 rounded-sm">
                <TabsTrigger value="for_you" className="text-sm data-[state=active]:bg-primary data-[state=active]:text-white rounded-sm">Para ti</TabsTrigger>
                <TabsTrigger value="following" className="text-sm data-[state=active]:bg-primary data-[state=active]:text-white rounded-sm">Siguiendo</TabsTrigger>
                <TabsTrigger value="niche" className="text-sm data-[state=active]:bg-primary data-[state=active]:text-white rounded-sm">Por nicho</TabsTrigger>
              </TabsList>
            </Tabs>

            <Button variant="ghost" size="icon" onClick={handleRefresh} disabled={refreshing} className="h-11 w-11">
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>

          {activeTab === 'niche' && niches.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pt-3 pb-1 scrollbar-hide">
              {niches.map((n) => (
                <button
                  key={n}
                  onClick={() => setNiche(n === niche ? null : n)}
                  className={`shrink-0 h-9 px-3 rounded-full text-xs font-medium border ${
                    niche === n
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-transparent text-muted-foreground border-border'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      <StoriesBar followingIds={followingIds} onAddStory={() => setShowStoryUploader(true)} />

      <div className="max-w-6xl mx-auto px-1 py-2">
        {isLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-1">
            {Array.from({ length: 12 }).map((_, i) => (
              <KreoonSkeleton key={i} variant="rectangular" className="aspect-[4/5] rounded-sm" />
            ))}
          </div>
        ) : posts.length === 0 && activeTab === 'following' ? (
          <div className="flex flex-col items-center py-8">
            <p className="text-foreground font-medium mb-1">Aún no sigues a nadie</p>
            <p className="text-sm text-muted-foreground mb-2 text-center">
              Descubre creadores de tu nicho y arma tu feed
            </p>
            <SuggestedProfiles variant="carousel" limit={8} onFollowed={() => refetch()} />
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No hay contenido disponible
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-1">
              {gridItems.map((item, index) => (
                <FeedGridCard
                  key={item.id}
                  item={item}
                  priority={index < 8}
                  onClick={() => { setSelectedIndex(index); setModalOpen(true); }}
                />
              ))}
            </div>
            {hasNextPage && (
              <div className="flex justify-center py-6">
                <Button
                  variant="outline"
                  onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                  className="h-11"
                >
                  {isFetchingNextPage ? 'Cargando...' : 'Cargar más'}
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      <FeedGridModal
        items={gridItems}
        initialIndex={selectedIndex}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={(item) => handleSave(item.id)}
        isSaved={(item) => !!item.is_saved}
      />

      {user?.id && (
        <MediaUploader
          userId={user.id}
          type="post"
          isOpen={showPostUploader}
          onClose={() => setShowPostUploader(false)}
          onSuccess={() => {
            setShowPostUploader(false);
            refetch();
          }}
        />
      )}

      {user?.id && (
        <MediaUploader
          userId={user.id}
          type="story"
          isOpen={showStoryUploader}
          onClose={() => setShowStoryUploader(false)}
          onSuccess={() => setShowStoryUploader(false)}
        />
      )}

      <div className="fixed right-4 z-40 bottom-[calc(1rem+var(--kreoon-bottom-nav-h,0px)+env(safe-area-inset-bottom))] md:bottom-8">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="lg" className="h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-shadow">
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
    </div>
  );
}
