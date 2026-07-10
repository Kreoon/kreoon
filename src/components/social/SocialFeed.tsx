import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { SocialFeedCard, SocialFeedItem, SocialFeedCardRef } from './SocialFeedCard';
import type { ReactionType } from './ReactionButton';
import { useGlobalMute } from '@/contexts/VideoPlayerContext';
import { Loader2 } from 'lucide-react';
import { preloadHLSVideo, clearPreloadCache, preloadThumbnail } from '@/hooks/useHLSPlayer';

interface SocialFeedProps {
  items: SocialFeedItem[];
  onLike?: (id: string) => void;
  onReact?: (id: string, type: ReactionType | null) => void;
  onSave?: (id: string) => void;
  onComment?: (id: string) => void;
  onShare?: (item: SocialFeedItem) => void;
  onView?: (id: string) => void;
  onProfileClick?: (creatorId: string) => void;
  onLoadMore?: () => void;
  className?: string;
  loading?: boolean;
}

// Ventana de virtualizacion: solo estos slides montan el reproductor de video real.
// El resto queda como placeholder (thumbnail) para no acumular decenas de HLS/iframes en DOM.
const RENDER_WINDOW = 2;

export function SocialFeed({
  items,
  onLike,
  onReact,
  onSave,
  onComment,
  onShare,
  onView,
  onProfileClick,
  onLoadMore,
  className,
  loading = false,
}: SocialFeedProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Map<string, SocialFeedCardRef>>(new Map());
  const [activeIndex, setActiveIndex] = useState(0);
  // Fuente unica de verdad del mute — antes habia 3 estados desincronizados
  // (contexto global sin usar, audioUnlocked local, y el estado interno de useHLSPlayer).
  const { isGlobalMuted, toggleGlobalMute, setGlobalMuted } = useGlobalMute();

  // Track active item using IntersectionObserver
  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio > 0.6) {
            const index = Number(entry.target.getAttribute('data-index'));
            if (!isNaN(index) && index !== activeIndex) {
              setActiveIndex(index);
            }
          }
        });
      },
      { threshold: [0.6], root: containerRef.current }
    );

    const itemElements = containerRef.current.querySelectorAll('[data-index]');
    itemElements.forEach(item => observer.observe(item));

    return () => observer.disconnect();
  }, [items, activeIndex]);

  // Preload adjacent videos for instant playback
  useEffect(() => {
    // Preload next 2 videos
    const preloadAhead = 2;
    for (let i = 1; i <= preloadAhead; i++) {
      const nextIndex = activeIndex + i;
      if (nextIndex < items.length) {
        const nextItem = items[nextIndex];
        // Poster instantaneo al swipe: precalentar el thumbnail del siguiente slide
        // (aplica a video E imagen, el placeholder fuera de ventana tambien lo usa)
        preloadThumbnail(nextItem.thumbnailUrl);
        if (nextItem.mediaType === 'video') {
          const videoUrl = nextItem.videoUrls?.[0] || nextItem.mediaUrl;
          if (videoUrl) {
            preloadHLSVideo(videoUrl);
          }
        }
      }
    }

    // Clear preload cache for videos far behind
    return () => {
      if (activeIndex > 3) {
        const oldItem = items[activeIndex - 3];
        if (oldItem?.mediaType === 'video') {
          const videoUrl = oldItem.videoUrls?.[0] || oldItem.mediaUrl;
          if (videoUrl) {
            clearPreloadCache(videoUrl);
          }
        }
      }
    };
  }, [activeIndex, items]);

  // Store card refs
  const setCardRef = useCallback((id: string, ref: SocialFeedCardRef | null) => {
    if (ref) {
      cardRefs.current.set(id, ref);
    } else {
      cardRefs.current.delete(id);
    }
  }, []);

  // Pedir la siguiente pagina cuando el usuario se acerca al final del feed cargado
  useEffect(() => {
    if (onLoadMore && activeIndex >= items.length - 3) {
      onLoadMore();
    }
  }, [activeIndex, items.length, onLoadMore]);

  if (loading) {
    return (
      <div className="h-[100dvh] w-full flex items-center justify-center bg-black">
        <Loader2 className="h-8 w-8 text-white/40 animate-spin" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="h-[100dvh] w-full flex items-center justify-center bg-black">
        <p className="text-white/60 text-center px-4">No hay contenido disponible</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        "h-[100dvh] w-full overflow-y-scroll snap-y snap-mandatory scrollbar-hide",
        className
      )}
    >
      {items.map((item, index) => {
        const inRenderWindow = Math.abs(index - activeIndex) <= RENDER_WINDOW;
        return (
          <div
            // Scroll infinito recicla contenido (mismo post_id puede repetirse mas adelante
            // en el array) — la key debe incluir el index o React choca por keys duplicadas.
            key={`${index}-${item.id}`}
            data-index={index}
            className="h-[100dvh] w-full"
          >
            {inRenderWindow ? (
              <SocialFeedCard
                ref={(ref) => setCardRef(item.id, ref)}
                item={item}
                isActive={index === activeIndex}
                isGlobalMuted={isGlobalMuted}
                onLike={onLike ? () => onLike(item.id) : undefined}
                onReact={onReact ? (type) => onReact(item.id, type) : undefined}
                onSave={onSave ? () => onSave(item.id) : undefined}
                onComment={onComment ? () => onComment(item.id) : undefined}
                onShare={onShare ? () => onShare(item) : undefined}
                onView={onView ? () => onView(item.id) : undefined}
                onProfileClick={item.creatorId && onProfileClick ? () => onProfileClick(item.creatorId!) : undefined}
                onToggleMute={toggleGlobalMute}
                onForcedMute={() => setGlobalMuted(true)}
              />
            ) : (
              // Placeholder fuera de la ventana de render: mantiene el alto/snap sin montar video/HLS
              <div className="h-full w-full bg-black relative">
                {item.thumbnailUrl && (
                  <img
                    src={item.thumbnailUrl}
                    alt=""
                    loading="lazy"
                    className="absolute inset-0 w-full h-full object-cover opacity-60"
                  />
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
