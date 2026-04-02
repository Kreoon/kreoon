import { useEffect, useCallback, useRef, useState, useMemo } from 'react';
import { X, Heart, MessageCircle, Bookmark, Play, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { extractBunnyIds, getBunnyThumbnailUrl } from '@/hooks/useHLSPlayer';
import { ShareButton } from '@/components/social/ShareButton';
import { PortfolioCommentsSection } from '@/components/content/PortfolioCommentsSection';
import { Drawer, DrawerContent } from '@/components/ui/drawer';
import type { PortfolioMedia } from '../types/marketplace';
import type { PortfolioItemData } from '@/hooks/usePortfolioItems';

interface GalleryLightboxProps {
  media: PortfolioMedia[];
  portfolioItems: PortfolioItemData[];
  currentIndex: number;
  onClose: () => void;
  creatorName: string;
  creatorAvatar: string | null;
  creatorId: string;
}

// ── Helpers ──────────────────────────────────────────────

function buildBunnyEmbedUrl(libraryId: string, videoId: string): string {
  const params = new URLSearchParams({
    autoplay: 'true',
    muted: 'true',
    preload: 'true',
    responsive: 'true',
    loop: 'true',
    quality: '720',
    'fast-start': 'true',
    t: '0',
  });
  return `https://iframe.mediadelivery.net/embed/${libraryId}/${videoId}?${params.toString()}`;
}

function FloatingHearts({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden z-30">
      {[...Array(6)].map((_, i) => (
        <Heart
          key={i}
          className="absolute h-8 w-8 fill-pink-500 text-pink-500 animate-bounce"
          style={{
            animationDelay: `${i * 100}ms`,
            animationDuration: '0.8s',
            left: `${30 + Math.random() * 40}%`,
            top: `${30 + Math.random() * 40}%`,
            opacity: 0,
            animation: `floatHeart 0.8s ease-out ${i * 100}ms forwards`,
          }}
        />
      ))}
      <style>{`
        @keyframes floatHeart {
          0% { opacity: 1; transform: scale(0.5) translateY(0); }
          50% { opacity: 1; transform: scale(1.2) translateY(-30px); }
          100% { opacity: 0; transform: scale(0.8) translateY(-60px); }
        }
      `}</style>
    </div>
  );
}

function formatCount(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

// ── Main Component ──────────────────────────────────────

export function GalleryLightbox({
  media,
  portfolioItems,
  currentIndex,
  onClose,
  creatorName,
  creatorAvatar,
  creatorId,
}: GalleryLightboxProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(currentIndex);
  const hasScrolledRef = useRef(false);
  const { user } = useAuth();

  // Like state per item
  const [likedItems, setLikedItems] = useState<Set<string>>(new Set());
  const [likeCounts, setLikeCounts] = useState<Map<string, number>>(new Map());
  const [showHearts, setShowHearts] = useState(false);

  // Comments drawer
  const [showComments, setShowComments] = useState(false);

  // Save state
  const [savedItems, setSavedItems] = useState<Set<string>>(new Set());

  // Double-tap detection
  const lastTapRef = useRef(0);

  // Initialize like counts from portfolio items
  useEffect(() => {
    const counts = new Map<string, number>();
    for (const item of portfolioItems) {
      counts.set(item.id, item.likes_count || 0);
    }
    setLikeCounts(counts);
  }, [portfolioItems]);

  // Check which items are liked by current user
  useEffect(() => {
    if (!user) return;
    const ids = media.map(m => m.id);
    if (ids.length === 0) return;

    (supabase as any)
      .from('portfolio_post_likes')
      .select('post_id')
      .eq('viewer_id', user.id)
      .in('post_id', ids)
      .then(({ data, error }: any) => {
        if (error) { console.warn('[GalleryLightbox] likes query:', error.message); return; }
        if (data) {
          setLikedItems(new Set(data.map((r: any) => r.post_id)));
        }
      });
  }, [user, media]);

  // Check which items are saved
  useEffect(() => {
    if (!user) return;
    const ids = media.map(m => m.id);
    if (ids.length === 0) return;

    (supabase as any)
      .from('saved_items')
      .select('item_id')
      .eq('user_id', user.id)
      .in('item_id', ids)
      .then(({ data, error }: any) => {
        if (error) { console.warn('[GalleryLightbox] saved query:', error.message); return; }
        if (data) {
          setSavedItems(new Set(data.map((r: any) => r.item_id)));
        }
      });
  }, [user, media]);

  // Scroll to initial item on mount
  useEffect(() => {
    const container = scrollRef.current;
    if (!container || hasScrolledRef.current) return;
    hasScrolledRef.current = true;
    requestAnimationFrame(() => {
      container.scrollTo({ top: currentIndex * container.clientHeight, behavior: 'instant' as ScrollBehavior });
    });
  }, [currentIndex]);

  // Track active item via scroll position
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    let ticking = false;
    const handleScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const h = container.clientHeight;
        if (h > 0) {
          const idx = Math.round(container.scrollTop / h);
          setActiveIndex(Math.min(Math.max(idx, 0), media.length - 1));
        }
        ticking = false;
      });
    };
    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [media.length]);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return; }
      const container = scrollRef.current;
      if (!container) return;
      const h = container.clientHeight;
      if (e.key === 'ArrowUp' && activeIndex > 0) {
        container.scrollTo({ top: (activeIndex - 1) * h, behavior: 'smooth' });
      }
      if (e.key === 'ArrowDown' && activeIndex < media.length - 1) {
        container.scrollTo({ top: (activeIndex + 1) * h, behavior: 'smooth' });
      }
    },
    [activeIndex, media.length, onClose],
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [handleKeyDown]);

  // ── Like handler ──
  const handleLike = useCallback(async (itemId: string) => {
    if (!user) return;
    const wasLiked = likedItems.has(itemId);

    // Optimistic update
    setLikedItems(prev => {
      const next = new Set(prev);
      wasLiked ? next.delete(itemId) : next.add(itemId);
      return next;
    });
    setLikeCounts(prev => {
      const next = new Map(prev);
      next.set(itemId, (prev.get(itemId) || 0) + (wasLiked ? -1 : 1));
      return next;
    });

    try {
      if (wasLiked) {
        await (supabase as any)
          .from('portfolio_post_likes')
          .delete()
          .eq('post_id', itemId)
          .eq('viewer_id', user.id);
      } else {
        await (supabase as any)
          .from('portfolio_post_likes')
          .insert({ post_id: itemId, viewer_id: user.id });
      }
    } catch {
      // Revert on error
      setLikedItems(prev => {
        const next = new Set(prev);
        wasLiked ? next.add(itemId) : next.delete(itemId);
        return next;
      });
      setLikeCounts(prev => {
        const next = new Map(prev);
        next.set(itemId, (prev.get(itemId) || 0) + (wasLiked ? 1 : -1));
        return next;
      });
    }
  }, [user, likedItems]);

  // ── Save handler ──
  const handleSave = useCallback(async (itemId: string) => {
    if (!user) return;
    const wasSaved = savedItems.has(itemId);

    setSavedItems(prev => {
      const next = new Set(prev);
      wasSaved ? next.delete(itemId) : next.add(itemId);
      return next;
    });

    try {
      if (wasSaved) {
        await (supabase as any)
          .from('saved_items')
          .delete()
          .eq('item_id', itemId)
          .eq('user_id', user.id);
      } else {
        await (supabase as any)
          .from('saved_items')
          .insert({ user_id: user.id, item_type: 'work_video', item_id: itemId });
      }
    } catch {
      setSavedItems(prev => {
        const next = new Set(prev);
        wasSaved ? next.add(itemId) : next.delete(itemId);
        return next;
      });
    }
  }, [user, savedItems]);

  // ── Double-tap handler ──
  const handleDoubleTap = useCallback((itemId: string) => {
    setShowHearts(true);
    setTimeout(() => setShowHearts(false), 900);
    if (!likedItems.has(itemId)) {
      handleLike(itemId);
    }
  }, [likedItems, handleLike]);

  const handleContentClick = useCallback((e: React.MouseEvent, itemId: string) => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      handleDoubleTap(itemId);
    }
    lastTapRef.current = now;
  }, [handleDoubleTap]);

  const activeItem = media[activeIndex];
  const activePortfolioItem = portfolioItems[activeIndex];

  return (
    <div className="fixed inset-0 z-[200] bg-black">
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-30 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
      >
        <X className="h-5 w-5 text-white" />
      </button>

      {/* Counter */}
      <div className="absolute top-4 left-4 z-30 text-white/60 text-sm font-medium">
        {activeIndex + 1} / {media.length}
      </div>

      {/* Scroll indicator */}
      {activeIndex === 0 && media.length > 1 && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-30 text-white/40 text-xs flex flex-col items-center gap-1 animate-bounce">
          <span>Desliza</span>
          <ChevronDown className="h-4 w-4" />
        </div>
      )}

      {/* Vertical scroll container */}
      <div
        ref={scrollRef}
        className="h-full w-full overflow-y-auto snap-y snap-mandatory scrollbar-hide"
      >
        {media.map((item, i) => (
          <div
            key={item.id}
            className="h-full w-full snap-start snap-always relative"
            onClick={(e) => handleContentClick(e, item.id)}
          >
            {/* Gradient overlays */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30 pointer-events-none z-10" />

            {/* Media content */}
            {item.type === 'video' ? (
              <TikTokSlideVideo
                item={item}
                bunnyVideoId={portfolioItems[i]?.bunny_video_id}
                isActive={i === activeIndex}
              />
            ) : (
              <div className="h-full w-full flex items-center justify-center">
                <img
                  src={item.url}
                  alt=""
                  className="max-w-full max-h-full object-contain"
                />
              </div>
            )}

            {/* Floating hearts on double-tap */}
            {i === activeIndex && <FloatingHearts show={showHearts} />}

            {/* Right sidebar — TikTok actions */}
            <div className="absolute right-3 bottom-28 z-20 flex flex-col items-center gap-5">
              {/* Creator avatar */}
              {creatorAvatar ? (
                <img
                  src={creatorAvatar}
                  alt={creatorName}
                  className="w-10 h-10 rounded-full ring-2 ring-white object-cover"
                />
              ) : (
                <div className="w-10 h-10 rounded-full ring-2 ring-white bg-purple-500/30 flex items-center justify-center">
                  <span className="text-white text-sm font-bold">
                    {creatorName.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}

              {/* Like */}
              <button
                onClick={(e) => { e.stopPropagation(); handleLike(item.id); }}
                className="flex flex-col items-center gap-1"
              >
                <Heart
                  className={cn(
                    'h-7 w-7 transition-all duration-200',
                    likedItems.has(item.id)
                      ? 'text-pink-500 fill-pink-500 scale-110'
                      : 'text-white hover:scale-110',
                  )}
                />
                <span className="text-white text-xs">
                  {formatCount(likeCounts.get(item.id) || 0)}
                </span>
              </button>

              {/* Comment */}
              <button
                onClick={(e) => { e.stopPropagation(); setShowComments(true); }}
                className="flex flex-col items-center gap-1"
              >
                <MessageCircle className="h-7 w-7 text-white hover:scale-110 transition-transform" />
                <span className="text-white text-xs">
                  {formatCount(portfolioItems[i]?.likes_count || 0)}
                </span>
              </button>

              {/* Share */}
              <div onClick={(e) => e.stopPropagation()}>
                <ShareButton
                  url={`${window.location.origin}/marketplace/creator/${creatorId}`}
                  title={`${creatorName} en Kreoon`}
                  className="text-white"
                  size="lg"
                />
              </div>

              {/* Save/Bookmark */}
              <button
                onClick={(e) => { e.stopPropagation(); handleSave(item.id); }}
                className="flex flex-col items-center gap-1"
              >
                <Bookmark
                  className={cn(
                    'h-7 w-7 transition-all duration-200',
                    savedItems.has(item.id)
                      ? 'text-yellow-400 fill-yellow-400'
                      : 'text-white hover:scale-110',
                  )}
                />
              </button>
            </div>

            {/* Bottom overlay — creator info + caption */}
            <div className="absolute bottom-6 left-4 right-16 z-20 space-y-2">
              <span className="text-white font-bold text-sm drop-shadow-md">
                @{creatorName}
              </span>
              {portfolioItems[i]?.title && (
                <p className="text-white/90 text-sm line-clamp-2 drop-shadow-md">
                  {portfolioItems[i].title}
                </p>
              )}
              {portfolioItems[i]?.brand_name && (
                <p className="text-white/60 text-xs drop-shadow-md">
                  Para: {portfolioItems[i].brand_name}
                </p>
              )}
              {portfolioItems[i]?.tags && portfolioItems[i].tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {portfolioItems[i].tags.slice(0, 5).map(tag => (
                    <span key={tag} className="text-purple-300 text-xs drop-shadow-md">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Comments Drawer */}
      <Drawer open={showComments} onOpenChange={setShowComments}>
        <DrawerContent className="h-[60vh] bg-zinc-900 border-0 rounded-t-2xl">
          {activeItem && (
            <PortfolioCommentsSection
              postId={activeItem.id}
              isOpen={showComments}
              onClose={() => setShowComments(false)}
            />
          )}
        </DrawerContent>
      </Drawer>
    </div>
  );
}

// ── Video Slide with Iframe Unload Strategy ──────────────

// Default Bunny library ID for building embed URLs when only video_id is available
const DEFAULT_BUNNY_LIBRARY_ID = '568434';

interface TikTokSlideVideoProps {
  item: PortfolioMedia;
  bunnyVideoId?: string | null;
  isActive: boolean;
}

function TikTokSlideVideo({ item, bunnyVideoId, isActive }: TikTokSlideVideoProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [iframeSrc, setIframeSrc] = useState<string | null>(null);

  // Try to extract IDs from URL, or use provided bunny_video_id
  const bunnyIds = useMemo(
    () => (item.url ? extractBunnyIds(item.url) : null),
    [item.url],
  );

  // Can use iframe if we have IDs from URL OR if we have bunny_video_id directly
  const canUseIframe = (!!bunnyIds && /^\d+$/.test(String(bunnyIds.libraryId))) || !!bunnyVideoId;

  // Determine the library and video IDs to use
  const effectiveLibraryId = (bunnyIds && /^\d+$/.test(String(bunnyIds.libraryId)))
    ? bunnyIds.libraryId
    : DEFAULT_BUNNY_LIBRARY_ID;
  const effectiveVideoId = bunnyIds?.videoId || bunnyVideoId;

  // IntersectionObserver for iframe load/unload — preloads 200px ahead
  useEffect(() => {
    const el = containerRef.current;
    if (!el || !canUseIframe || !effectiveVideoId) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.1) {
            setIframeSrc(buildBunnyEmbedUrl(effectiveLibraryId, effectiveVideoId));
          } else {
            setIframeSrc(null);
          }
        });
      },
      { threshold: 0.1, rootMargin: '200px 0px' },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [canUseIframe, effectiveLibraryId, effectiveVideoId]);

  return (
    <div
      ref={containerRef}
      className="h-full w-full flex items-center justify-center"
    >
      {canUseIframe ? (
        iframeSrc ? (
          <div className="relative w-full max-w-lg aspect-[9/16] max-h-full">
            <iframe
              src={iframeSrc}
              className="absolute top-0 left-0 w-full h-full border-0 rounded-sm"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        ) : (
          <div className="relative w-full max-w-lg aspect-[9/16] max-h-full">
            {(getBunnyThumbnailUrl(item.url) || item.thumbnail_url) ? (
              <img
                src={getBunnyThumbnailUrl(item.url) || item.thumbnail_url!}
                alt=""
                className="w-full h-full object-cover rounded-sm"
              />
            ) : (
              <div className="w-full h-full bg-zinc-900 rounded-sm" />
            )}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-black/40 flex items-center justify-center">
                <Play className="h-8 w-8 text-white fill-white ml-1" />
              </div>
            </div>
          </div>
        )
      ) : (
        <video
          src={item.url}
          poster={getBunnyThumbnailUrl(item.url) || item.thumbnail_url || undefined}
          autoPlay={isActive}
          controls
          playsInline
          loop
          className="max-h-full max-w-full object-contain rounded-sm"
        />
      )}
    </div>
  );
}
