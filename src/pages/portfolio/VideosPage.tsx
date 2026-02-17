import { useState, useEffect, useCallback, useRef, useMemo, memo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useSavedItems } from '@/hooks/useSavedItems';
import { cn } from '@/lib/utils';
import { Heart, MessageCircle, Bookmark, Share2, Download, ChevronDown, X } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Drawer, DrawerContent } from '@/components/ui/drawer';
import { useNavigate } from 'react-router-dom';
import { extractBunnyIds, getBunnyThumbnailUrl } from '@/hooks/useHLSPlayer';
import { PortfolioCommentsSection } from '@/components/content/PortfolioCommentsSection';
import { SocialSharePanel } from '@/components/content/unified';
import { useDownload } from '@/hooks/unified';

interface VideoItem {
  id: string;
  type: 'portfolio' | 'work' | 'post';
  title?: string;
  caption?: string;
  video_url: string;
  video_urls?: string[];
  thumbnail_url?: string;
  user_id: string;
  user_name?: string;
  user_avatar?: string;
  client_name?: string;
  client_id?: string;
  creator_id?: string;
  /** Marketplace creator profile id or slug for navigation */
  marketplace_id?: string;
  views_count: number;
  likes_count: number;
  comments_count: number;
  created_at: string;
  is_published?: boolean;
  status?: string;
}

type VideoFilter = 'all' | 'portfolio' | 'work' | 'posts';

// ── Helpers ──────────────────────────────────────────────

function buildBunnyEmbedUrl(libraryId: string, videoId: string, muted = true): string {
  const params = new URLSearchParams({
    autoplay: 'true',
    muted: muted ? 'true' : 'false',
    preload: 'true',
    responsive: 'true',
    loop: 'true',
    quality: '720',
    'fast-start': 'true',
    t: '0',
  });
  return `https://iframe.mediadelivery.net/embed/${libraryId}/${videoId}?${params.toString()}`;
}

function resolvePoster(video: VideoItem): string | undefined {
  if (video.thumbnail_url) return video.thumbnail_url;
  return getBunnyThumbnailUrl(video.video_url) || undefined;
}

function shuffleArray<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// ── Bunny Iframe Slide ──────────────────────────────────

function BunnyIframeSlide({ url, isVisible }: { url: string; isVisible: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [iframeSrc, setIframeSrc] = useState<string | null>(null);

  const bunnyIds = useMemo(() => extractBunnyIds(url), [url]);
  const canUseIframe = !!bunnyIds && /^\d+$/.test(String(bunnyIds.libraryId));

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !canUseIframe) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.1) {
            setIframeSrc(buildBunnyEmbedUrl(bunnyIds!.libraryId, bunnyIds!.videoId));
          } else {
            setIframeSrc(null);
          }
        });
      },
      { threshold: 0.1, rootMargin: '200px 0px' },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [canUseIframe, bunnyIds]);

  if (!canUseIframe) return null;

  return (
    <div ref={containerRef} className="h-full w-full flex items-center justify-center">
      {iframeSrc ? (
        <div className="relative w-full h-full max-w-md mx-auto">
          <iframe
            src={iframeSrc}
            className="absolute inset-0 w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      ) : (
        <div className="w-full h-full max-w-md mx-auto bg-zinc-900 flex items-center justify-center">
          <div className="w-12 h-12 rounded-full border-2 border-white/30 border-t-white animate-spin" />
        </div>
      )}
    </div>
  );
}

// ── VideoSlide ──────────────────────────────────────────

interface VideoSlideProps {
  video: VideoItem;
  isActive: boolean;
  onSave: () => void;
  isSaved: boolean;
  onProfileClick: (userId: string, marketplaceId?: string) => void;
  onOpenComments: () => void;
  onShare: () => void;
  onDownload: () => void;
  canDownload: boolean;
}

const VideoSlide = memo(function VideoSlide({
  video,
  isActive,
  onSave,
  isSaved,
  onProfileClick,
  onOpenComments,
  onShare,
  onDownload,
  canDownload,
}: VideoSlideProps) {
  const [isLiked, setIsLiked] = useState(false);
  const [showHeart, setShowHeart] = useState(false);
  const directVideoRef = useRef<HTMLVideoElement>(null);
  const lastTapRef = useRef(0);

  const posterSrc = resolvePoster(video);
  const bunnyIds = useMemo(() => extractBunnyIds(video.video_url), [video.video_url]);
  const canUseBunnyIframe = !!bunnyIds && /^\d+$/.test(String(bunnyIds.libraryId));

  const isDirectVideo = !canUseBunnyIframe && (
    video.video_url.match(/\.(mp4|webm|mov)(\?|$)/i) ||
    video.video_url.includes('supabase.co/storage')
  );

  useEffect(() => {
    if (!isDirectVideo) return;
    const el = directVideoRef.current;
    if (!el) return;
    if (isActive) {
      el.muted = true;
      el.play().catch(() => {});
    } else {
      el.pause();
    }
  }, [isActive, isDirectVideo]);

  const handleDoubleTap = useCallback(() => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      if (!isLiked) {
        setIsLiked(true);
        setShowHeart(true);
        setTimeout(() => setShowHeart(false), 1000);
      }
    }
    lastTapRef.current = now;
  }, [isLiked]);

  return (
    <div
      className="h-full w-full relative flex items-center justify-center bg-black"
      onClick={handleDoubleTap}
    >
      {/* Video content */}
      {canUseBunnyIframe ? (
        <BunnyIframeSlide url={video.video_url} isVisible={isActive} />
      ) : isDirectVideo ? (
        <video
          ref={directVideoRef}
          src={video.video_url}
          poster={posterSrc}
          loop
          muted
          playsInline
          className="h-full w-full object-contain"
        />
      ) : (
        <div className="h-full w-full flex items-center justify-center">
          {posterSrc ? (
            <img src={posterSrc} alt="" className="max-h-full max-w-full object-contain" />
          ) : (
            <div className="w-full h-full max-w-md mx-auto bg-zinc-900" />
          )}
        </div>
      )}

      {/* Double-tap heart animation */}
      {showHeart && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
          <Heart className="h-24 w-24 text-white fill-white animate-ping" />
        </div>
      )}

      {/* Gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none z-10" />

      {/* Content info — bottom left */}
      <div className="absolute bottom-6 left-4 right-16 z-20 text-white">
        <button
          className="flex items-center gap-2 mb-2"
          onClick={(e) => { e.stopPropagation(); onProfileClick(video.user_id, video.marketplace_id); }}
        >
          <Avatar className="h-10 w-10 border-2 border-white">
            <AvatarImage src={video.user_avatar} />
            <AvatarFallback>{video.user_name?.[0]}</AvatarFallback>
          </Avatar>
          <span className="font-semibold text-sm">{video.user_name}</span>
        </button>

        {video.client_name && (
          <Badge variant="secondary" className="mb-2 bg-white/20 text-xs">
            {video.client_name}
          </Badge>
        )}

        <p className="text-sm line-clamp-2 drop-shadow-md">
          {video.title || video.caption}
        </p>
      </div>

      {/* Action buttons — right sidebar */}
      <div className="absolute bottom-6 right-3 z-20 flex flex-col items-center gap-5">
        {/* Like */}
        <button
          onClick={(e) => { e.stopPropagation(); setIsLiked(!isLiked); }}
          className="flex flex-col items-center gap-1"
        >
          <Heart className={cn(
            "h-7 w-7 transition-all duration-200",
            isLiked ? "fill-pink-500 text-pink-500 scale-110" : "text-white hover:scale-110",
          )} />
          {video.likes_count > 0 && (
            <span className="text-white text-xs">{video.likes_count}</span>
          )}
        </button>

        {/* Comments */}
        <button
          onClick={(e) => { e.stopPropagation(); onOpenComments(); }}
          className="flex flex-col items-center gap-1"
        >
          <MessageCircle className="h-7 w-7 text-white hover:scale-110 transition-transform" />
          {video.comments_count > 0 && (
            <span className="text-white text-xs">{video.comments_count}</span>
          )}
        </button>

        {/* Save */}
        <button
          onClick={(e) => { e.stopPropagation(); onSave(); }}
          className="flex flex-col items-center gap-1"
        >
          <Bookmark className={cn(
            "h-7 w-7 transition-all duration-200",
            isSaved ? "text-yellow-400 fill-yellow-400" : "text-white hover:scale-110",
          )} />
        </button>

        {/* Share */}
        <button
          onClick={(e) => { e.stopPropagation(); onShare(); }}
        >
          <Share2 className="h-7 w-7 text-white hover:scale-110 transition-transform" />
        </button>

        {/* Download */}
        {canDownload && (
          <button
            onClick={(e) => { e.stopPropagation(); onDownload(); }}
          >
            <Download className="h-7 w-7 text-white hover:scale-110 transition-transform" />
          </button>
        )}
      </div>
    </div>
  );
});

// ── Main Page ───────────────────────────────────────────

export default function VideosPage() {
  const { user } = useAuth();
  const { isSaved, toggleSave } = useSavedItems();
  const { download, canDownload } = useDownload();
  const navigate = useNavigate();

  const [videoPool, setVideoPool] = useState<VideoItem[]>([]);
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [filter, setFilter] = useState<VideoFilter>('all');
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [commentsVideoId, setCommentsVideoId] = useState<string | null>(null);

  // Share panel state
  const [showSharePanel, setShowSharePanel] = useState(false);
  const [shareVideo, setShareVideo] = useState<VideoItem | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  const handleOpenComments = useCallback((videoId: string) => {
    setCommentsVideoId(videoId);
    setCommentsOpen(true);
  }, []);

  const fetchVideos = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Fetch active marketplace creator profiles
      const { data: creatorProfiles } = await (supabase as any)
        .from('creator_profiles')
        .select('id, user_id, display_name, avatar_url, slug')
        .eq('is_active', true);

      if (!creatorProfiles || creatorProfiles.length === 0) {
        setVideos([]);
        setLoading(false);
        return;
      }

      // Build lookup maps
      const userIdToCreator = new Map<string, { id: string; display_name: string; avatar_url: string | null; slug: string | null }>();
      const creatorIdToCreator = new Map<string, { id: string; user_id: string; display_name: string; avatar_url: string | null; slug: string | null }>();
      for (const cp of creatorProfiles) {
        userIdToCreator.set(cp.user_id, cp);
        creatorIdToCreator.set(cp.id, cp);
      }
      const creatorProfileIds = creatorProfiles.map((cp: any) => cp.id);
      const creatorUserIds = creatorProfiles.map((cp: any) => cp.user_id);

      // 2. Fetch from all marketplace sources in parallel
      const queries: Promise<any>[] = [];

      // Portfolio items (marketplace native content)
      if (filter === 'all' || filter === 'portfolio') {
        queries.push(
          (supabase as any)
            .from('portfolio_items')
            .select('id, creator_id, title, description, media_type, media_url, thumbnail_url, bunny_video_id, views_count, likes_count, is_featured, created_at')
            .in('creator_id', creatorProfileIds)
            .eq('media_type', 'video')
            .eq('is_public', true)
            .order('created_at', { ascending: false })
            .limit(50)
        );
      } else {
        queries.push(Promise.resolve({ data: [] }));
      }

      // Published content from marketplace creators
      if (filter === 'all' || filter === 'work') {
        queries.push(
          supabase
            .from('content')
            .select('id, title, video_url, video_urls, thumbnail_url, creator_id, client_id, views_count, likes_count, created_at, is_published, status')
            .eq('is_published', true)
            .not('video_url', 'is', null)
            .in('creator_id', creatorUserIds)
            .order('created_at', { ascending: false })
            .limit(50)
        );
      } else {
        queries.push(Promise.resolve({ data: [] }));
      }

      // Portfolio posts from marketplace creators
      if (filter === 'all' || filter === 'posts') {
        queries.push(
          supabase
            .from('portfolio_posts')
            .select('id, user_id, media_url, media_type, thumbnail_url, caption, views_count, likes_count, comments_count, created_at')
            .eq('media_type', 'video')
            .in('user_id', creatorUserIds)
            .order('created_at', { ascending: false })
            .limit(50)
        );
      } else {
        queries.push(Promise.resolve({ data: [] }));
      }

      const [portfolioRes, contentRes, postsRes] = await Promise.all(queries);

      // Deduplicate by video URL
      const seenUrls = new Set<string>();
      const allItems: VideoItem[] = [];

      // 3a. Process portfolio items
      for (const item of portfolioRes.data || []) {
        if (!item.media_url || seenUrls.has(item.media_url)) continue;
        seenUrls.add(item.media_url);
        const cp = creatorIdToCreator.get(item.creator_id);
        allItems.push({
          id: item.id,
          type: 'portfolio',
          title: item.title,
          video_url: item.media_url,
          thumbnail_url: item.thumbnail_url,
          user_id: cp?.user_id || '',
          user_name: cp?.display_name,
          user_avatar: cp?.avatar_url,
          marketplace_id: cp?.slug || cp?.id,
          views_count: item.views_count || 0,
          likes_count: item.likes_count || 0,
          comments_count: 0,
          created_at: item.created_at,
          is_published: true,
          status: 'published',
        });
      }

      // 3b. Process content videos
      const clientIds = [...new Set((contentRes.data || []).map((c: any) => c.client_id).filter(Boolean))];
      const { data: clientsData } = clientIds.length > 0
        ? await supabase.from('clients').select('id, name').in('id', clientIds)
        : { data: [] };
      const clientMap = new Map((clientsData ?? []).map((c) => [c.id, c]));

      for (const c of contentRes.data || []) {
        const url = (c as any).video_urls?.[0] || (c as any).video_url;
        if (!url || seenUrls.has(url)) continue;
        seenUrls.add(url);
        const cp = userIdToCreator.get((c as any).creator_id);
        const client = (c as any).client_id ? clientMap.get((c as any).client_id) : null;
        allItems.push({
          id: c.id,
          type: 'work',
          title: (c as any).title,
          video_url: url,
          video_urls: (c as any).video_urls,
          thumbnail_url: (c as any).thumbnail_url,
          user_id: (c as any).creator_id,
          user_name: cp?.display_name,
          user_avatar: cp?.avatar_url,
          client_name: client?.name ?? null,
          client_id: (c as any).client_id,
          creator_id: (c as any).creator_id,
          marketplace_id: cp?.slug || cp?.id,
          views_count: (c as any).views_count || 0,
          likes_count: (c as any).likes_count || 0,
          comments_count: 0,
          created_at: (c as any).created_at,
          is_published: (c as any).is_published,
          status: (c as any).status,
        });
      }

      // 3c. Process portfolio posts
      for (const p of postsRes.data || []) {
        if (!p.media_url || seenUrls.has(p.media_url)) continue;
        seenUrls.add(p.media_url);
        const cp = userIdToCreator.get(p.user_id);
        allItems.push({
          id: p.id,
          type: 'post',
          caption: p.caption,
          video_url: p.media_url,
          thumbnail_url: p.thumbnail_url,
          user_id: p.user_id,
          user_name: cp?.display_name,
          user_avatar: cp?.avatar_url,
          marketplace_id: cp?.slug || cp?.id,
          views_count: p.views_count || 0,
          likes_count: p.likes_count || 0,
          comments_count: p.comments_count || 0,
          created_at: p.created_at,
          is_published: true,
          status: 'published',
        });
      }

      // Shuffle randomly and store the pool for infinite scroll
      const shuffled = shuffleArray(allItems);
      setVideoPool(allItems);
      setVideos(shuffled);
      setActiveIndex(0);
    } catch (error) {
      console.error('[VideosPage] Error:', error);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);

  // Infinite scroll: append more shuffled videos when nearing the end
  useEffect(() => {
    if (videoPool.length === 0 || videos.length === 0) return;
    if (activeIndex >= videos.length - 3) {
      setVideos(prev => [...prev, ...shuffleArray(videoPool)]);
    }
  }, [activeIndex, videos.length, videoPool]);

  // Track active item via scroll position
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let ticking = false;
    const handleScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const h = container.clientHeight;
        if (h > 0) {
          const idx = Math.round(container.scrollTop / h);
          setActiveIndex(Math.min(Math.max(idx, 0), videos.length - 1));
        }
        ticking = false;
      });
    };
    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [videos.length]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const container = containerRef.current;
      if (!container) return;
      const h = container.clientHeight;
      if (e.key === 'ArrowUp' && activeIndex > 0) {
        container.scrollTo({ top: (activeIndex - 1) * h, behavior: 'smooth' });
      }
      if (e.key === 'ArrowDown' && activeIndex < videos.length - 1) {
        container.scrollTo({ top: (activeIndex + 1) * h, behavior: 'smooth' });
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [activeIndex, videos.length]);

  const handleSave = async (video: VideoItem) => {
    const itemType = video.type === 'work' ? 'work_video' : 'post';
    await toggleSave(itemType, video.id);
  };

  const handleProfileClick = (userId: string, marketplaceId?: string) => {
    if (marketplaceId) {
      navigate(`/marketplace/creator/${marketplaceId}`);
    } else {
      navigate(`/marketplace/creator/${userId}`);
    }
  };

  const checkIsSaved = (video: VideoItem) => {
    const itemType = video.type === 'work' ? 'work_video' : 'post';
    return isSaved(itemType, video.id);
  };

  const handleShare = (video: VideoItem) => {
    setShareVideo(video);
    setShowSharePanel(true);
  };

  const handleDownload = (video: VideoItem) => {
    download({
      contentId: video.id,
      videoUrl: video.video_url,
      videoUrls: video.video_urls,
      title: video.title || video.caption,
    });
  };

  const checkCanDownload = (video: VideoItem) => {
    if (video.type === 'work') {
      return canDownload(video.status || '', video.is_published);
    }
    return true;
  };

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black z-50">
        <div className="w-10 h-10 rounded-full border-2 border-white/30 border-t-white animate-spin" />
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black text-white/60 z-50">
        <button
          onClick={() => navigate(-1)}
          className="absolute top-4 right-4 z-30 w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center hover:bg-white/20 transition-colors"
          aria-label="Cerrar"
        >
          <X className="h-5 w-5 text-white" />
        </button>
        No hay videos disponibles
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black z-50">
      {/* Filter chips */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 flex gap-2">
        {(['all', 'portfolio', 'work', 'posts'] as VideoFilter[]).map((f) => (
          <button
            key={f}
            className={cn(
              "px-4 py-1.5 rounded-full text-xs font-medium transition-all",
              filter === f
                ? "bg-white text-black"
                : "bg-white/10 text-white/70 hover:bg-white/20",
            )}
            onClick={() => setFilter(f)}
          >
            {f === 'all' ? 'Todos' : f === 'portfolio' ? 'Portfolio' : f === 'work' ? 'Contenido' : 'Posts'}
          </button>
        ))}
      </div>

      {/* Counter */}
      <div className="absolute top-4 left-4 z-30 text-white/50 text-xs font-medium">
        {activeIndex + 1} / {videoPool.length}
      </div>

      {/* Close / Back button */}
      <button
        onClick={() => navigate(-1)}
        className="absolute top-4 right-4 z-30 w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center hover:bg-black/70 transition-colors"
        aria-label="Cerrar"
      >
        <X className="h-5 w-5 text-white" />
      </button>

      {/* Scroll hint */}
      {activeIndex === 0 && videos.length > 1 && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30 text-white/40 text-xs flex flex-col items-center gap-1 animate-bounce">
          <span>Desliza</span>
          <ChevronDown className="h-4 w-4" />
        </div>
      )}

      {/* Video container — full screen with snap scroll */}
      <div
        ref={containerRef}
        className="h-full w-full overflow-y-auto snap-y snap-mandatory scrollbar-hide overscroll-none"
      >
        {videos.map((video, index) => (
          <div
            key={`${index}-${video.type}-${video.id}`}
            className="h-full w-full snap-start snap-always"
          >
            <VideoSlide
              video={video}
              isActive={index === activeIndex}
              onSave={() => handleSave(video)}
              isSaved={checkIsSaved(video)}
              onProfileClick={handleProfileClick}
              onOpenComments={() => handleOpenComments(video.id)}
              onShare={() => handleShare(video)}
              onDownload={() => handleDownload(video)}
              canDownload={checkCanDownload(video)}
            />
          </div>
        ))}
      </div>

      {/* Comments Drawer */}
      <Drawer open={commentsOpen} onOpenChange={setCommentsOpen}>
        <DrawerContent className="h-[60vh] bg-zinc-900 border-0 rounded-t-2xl">
          {commentsVideoId && (
            <PortfolioCommentsSection
              postId={commentsVideoId}
              isOpen={commentsOpen}
              onClose={() => setCommentsOpen(false)}
            />
          )}
        </DrawerContent>
      </Drawer>

      {/* Share Panel */}
      {shareVideo && (
        <SocialSharePanel
          open={showSharePanel}
          onOpenChange={setShowSharePanel}
          contentId={shareVideo.id}
          url={`${window.location.origin}/marketplace/creator/${shareVideo.marketplace_id || shareVideo.user_id}`}
          title={shareVideo.title || shareVideo.caption || 'Mira este video'}
          allowKreoonShare={shareVideo.type === 'work'}
          creatorId={shareVideo.creator_id || shareVideo.user_id}
          clientId={shareVideo.client_id}
        />
      )}
    </div>
  );
}
