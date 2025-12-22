import { useState, useRef, useEffect, useCallback } from 'react';
import { Heart, MessageSquare, Share2, Play, Pause, ChevronLeft, ChevronRight, Circle, Video } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { ParsedText } from '@/components/ui/parsed-text';

interface VideoItem {
  id: string;
  title: string;
  videoUrls: string[];
  thumbnailUrl?: string | null;
  viewsCount: number;
  likesCount: number;
  isLiked: boolean;
  clientName?: string;
  creatorName?: string;
  status?: string;
  isCreatorOwner?: boolean;
  /**
   * When false, hides Like button and disables double-tap likes / view tracking.
   * Useful for videos that are not part of the main content system.
   */
  canInteract?: boolean;
}

interface TikTokFeedProps {
  videos: VideoItem[];
  onLike?: (id: string, e?: React.MouseEvent) => void;
  onView?: (id: string) => void;
  onShare: (video: VideoItem) => void;
  onComment?: (id: string) => void;
  onCreatorStatusChange?: (id: string, newStatus: 'recording' | 'recorded') => void;
  className?: string;
}

interface FloatingHeart {
  id: number;
  x: number;
  y: number;
}

function extractVideoId(url: string): string | null {
  if (!url) return null;
  const embedMatch = url.match(/iframe\.mediadelivery\.net\/embed\/\d+\/([a-f0-9-]+)/i);
  if (embedMatch) return embedMatch[1];
  const cdnMatch = url.match(/b-cdn\.net\/([a-f0-9-]+)/i);
  if (cdnMatch) return cdnMatch[1];
  return null;
}

function getProxiedThumbnailUrl(contentId: string, videoId: string): string {
  const supabaseUrl = (supabase as any).supabaseUrl as string;
  return `${supabaseUrl}/functions/v1/bunny-thumbnail?content_id=${encodeURIComponent(contentId)}&video_id=${encodeURIComponent(videoId)}`;
}

function formatCount(count: number): string {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return count.toString();
}

function getEmbedUrl(url: string, muted: boolean): string {
  if (!url) return '';
  if (url.includes('iframe.mediadelivery.net')) {
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}autoplay=true&muted=${muted}&loop=true&preload=true&controls=false`;
  }
  const cdnMatch = url.match(/vz-(\d+)\.b-cdn\.net\/([a-f0-9-]+)/i);
  if (cdnMatch) {
    const [, libraryId, videoId] = cdnMatch;
    return `https://iframe.mediadelivery.net/embed/${libraryId}/${videoId}?autoplay=true&muted=${muted}&loop=true&preload=true&controls=false`;
  }
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}autoplay=true&muted=${muted}&loop=true&controls=false`;
}

// Floating heart component
function FloatingHeartAnimation({ x, y, onComplete }: { x: number; y: number; onComplete: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onComplete, 1000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div
      className="absolute pointer-events-none z-50"
      style={{ left: x, top: y }}
    >
      <Heart 
        className="h-20 w-20 text-red-500 animate-floating-heart" 
        fill="currentColor"
        style={{
          filter: 'drop-shadow(0 0 10px rgba(239, 68, 68, 0.5))'
        }}
      />
    </div>
  );
}

function TikTokVideoCard({
  video,
  isActive,
  onLike,
  onView,
  onShare,
  onComment,
  onCreatorStatusChange
}: {
  video: VideoItem;
  isActive: boolean;
  onLike?: (e?: React.MouseEvent) => void;
  onView?: () => void;
  onShare: () => void;
  onComment?: () => void;
  onCreatorStatusChange?: (newStatus: 'recording' | 'recorded') => void;
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [showPauseIcon, setShowPauseIcon] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [floatingHearts, setFloatingHearts] = useState<FloatingHeart[]>([]);
  const viewTrackedRef = useRef(false);
  const viewTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pauseIconTimerRef = useRef<NodeJS.Timeout | null>(null);
  const heartIdRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentVideoUrl = video.videoUrls[currentIndex] || video.videoUrls[0];
  const hasMultiple = video.videoUrls.length > 1;

  // Load thumbnail
  useEffect(() => {
    if (video.thumbnailUrl && !video.thumbnailUrl.includes('iframe.mediadelivery.net')) {
      setThumbnailUrl(video.thumbnailUrl);
      return;
    }
    const videoId = extractVideoId(currentVideoUrl);
    if (videoId) {
      setThumbnailUrl(getProxiedThumbnailUrl(video.id, videoId));
    }
  }, [video.id, video.thumbnailUrl, currentVideoUrl]);

  // Auto-play when active
  useEffect(() => {
    if (isActive) {
      setIsPlaying(true);
    } else {
      setIsPlaying(false);
      viewTrackedRef.current = false;
      if (viewTimerRef.current) {
        clearTimeout(viewTimerRef.current);
      }
    }
  }, [isActive]);

  // Track view after 3 seconds (only when enabled)
  useEffect(() => {
    const canInteract = video.canInteract !== false;
    if (!canInteract || !onView) return;

    if (isPlaying && !viewTrackedRef.current) {
      viewTimerRef.current = setTimeout(() => {
        onView();
        viewTrackedRef.current = true;
      }, 3000);
    }
    return () => {
      if (viewTimerRef.current) {
        clearTimeout(viewTimerRef.current);
      }
    };
  }, [isPlaying, onView, video.canInteract]);

  // Spawn floating heart at tap position
  const spawnFloatingHeart = useCallback((clientX: number, clientY: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left - 40; // Center the heart
    const y = clientY - rect.top - 40;
    
    const newHeart: FloatingHeart = {
      id: heartIdRef.current++,
      x,
      y
    };
    setFloatingHearts(prev => [...prev, newHeart]);
  }, []);

  const removeHeart = useCallback((id: number) => {
    setFloatingHearts(prev => prev.filter(h => h.id !== id));
  }, []);

  // Toggle play/pause on tap
  const canInteract = video.canInteract !== false;

  const handleTap = useCallback((e: React.MouseEvent) => {
    // Check for double tap (like)
    const now = Date.now();
    const lastTap = (handleTap as any).lastTap || 0;
    (handleTap as any).lastTap = now;

    if (now - lastTap < 300) {
      // Double tap - like and show floating heart
      spawnFloatingHeart(e.clientX, e.clientY);
      if (canInteract && !video.isLiked && onLike) {
        onLike(e);
      }
      return;
    }

    // Single tap - toggle play/pause
    setTimeout(() => {
      if (Date.now() - (handleTap as any).lastTap >= 280) {
        setIsPlaying(prev => {
          const newState = !prev;
          // Show pause/play icon briefly
          setShowPauseIcon(true);
          if (pauseIconTimerRef.current) clearTimeout(pauseIconTimerRef.current);
          pauseIconTimerRef.current = setTimeout(() => setShowPauseIcon(false), 600);
          return newState;
        });
      }
    }, 300);
  }, [video.isLiked, onLike, spawnFloatingHeart, canInteract]);

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex(prev => (prev > 0 ? prev - 1 : video.videoUrls.length - 1));
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex(prev => (prev < video.videoUrls.length - 1 ? prev + 1 : 0));
  };

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-full bg-black snap-start snap-always overflow-hidden"
      onClick={handleTap}
    >
      {/* Floating hearts */}
      {floatingHearts.map(heart => (
        <FloatingHeartAnimation
          key={heart.id}
          x={heart.x}
          y={heart.y}
          onComplete={() => removeHeart(heart.id)}
        />
      ))}

      {/* Video - always try to show iframe for seamless experience */}
      {isPlaying ? (
        <iframe
          src={getEmbedUrl(currentVideoUrl, true)}
          className="absolute inset-0 w-full h-full border-0 pointer-events-none"
          allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
          allowFullScreen={false}
        />
      ) : (
        <>
          {thumbnailUrl ? (
            <img 
              src={thumbnailUrl} 
              alt={video.title}
              className="absolute inset-0 w-full h-full object-cover"
              onError={() => setThumbnailUrl(null)}
            />
          ) : (
            <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-black">
              <Play className="h-20 w-20 text-white/30" />
            </div>
          )}
        </>
      )}

      {/* Play/Pause indicator (shows briefly on tap) */}
      {showPauseIcon && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
          <div className="p-6 rounded-full bg-black/50 backdrop-blur-sm animate-scale-in">
            {isPlaying ? (
              <Play className="h-16 w-16 text-white" fill="white" />
            ) : (
              <Pause className="h-16 w-16 text-white" />
            )}
          </div>
        </div>
      )}

      {/* Gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30 pointer-events-none" />

      {/* Carousel navigation for multiple videos */}
      {hasMultiple && (
        <>
          <button
            onClick={handlePrev}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-20 p-2.5 rounded-full bg-black/40 backdrop-blur-sm text-white active:scale-90 transition-transform"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button
            onClick={handleNext}
            className="absolute right-14 top-1/2 -translate-y-1/2 z-20 p-2.5 rounded-full bg-black/40 backdrop-blur-sm text-white active:scale-90 transition-transform"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
          
          {/* Dot indicators */}
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-20 flex gap-1.5">
            {video.videoUrls.map((_, idx) => (
              <button
                key={idx}
                onClick={(e) => { e.stopPropagation(); setCurrentIndex(idx); }}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  idx === currentIndex ? "bg-white w-6" : "bg-white/40 w-1.5"
                )}
              />
            ))}
          </div>
        </>
      )}

      {/* Right side actions - TikTok style */}
      <div className="absolute right-3 bottom-28 z-20 flex flex-col items-center gap-4">
        {/* Like */}
        {video.canInteract !== false && onLike && (
          <button
            onClick={(e) => { e.stopPropagation(); onLike(e); }}
            className="flex flex-col items-center gap-1"
          >
            <div className={cn(
              "p-3 rounded-full transition-all duration-200 active:scale-90",
              video.isLiked 
                ? "bg-red-500 text-white" 
                : "bg-black/40 backdrop-blur-sm text-white"
            )}>
              <Heart className="h-7 w-7" fill={video.isLiked ? "currentColor" : "none"} />
            </div>
            <span className="text-white text-xs font-semibold drop-shadow-lg">{formatCount(video.likesCount)}</span>
          </button>
        )}

        {/* Comment */}
        {onComment && (
          <button
            onClick={(e) => { e.stopPropagation(); onComment(); }}
            className="flex flex-col items-center gap-1"
          >
            <div className="p-3 rounded-full bg-black/40 backdrop-blur-sm text-white active:scale-90 transition-transform">
              <MessageSquare className="h-7 w-7" />
            </div>
          </button>
        )}

        {/* Share */}
        <button
          onClick={(e) => { e.stopPropagation(); onShare(); }}
          className="flex flex-col items-center gap-1"
        >
          <div className="p-3 rounded-full bg-black/40 backdrop-blur-sm text-white active:scale-90 transition-transform">
            <Share2 className="h-7 w-7" />
          </div>
        </button>
      </div>

      {/* Bottom info */}
      <div className="absolute bottom-8 left-4 right-16 z-20">
        <div className="flex items-center gap-2 mb-1">
          {video.creatorName && (
            <span className="text-white font-bold text-sm drop-shadow-lg">@{video.creatorName.replace(/\s+/g, '').toLowerCase()}</span>
          )}
        </div>
        <ParsedText text={video.title} className="text-white text-sm line-clamp-2 drop-shadow-lg" />
        {video.clientName && (
          <p className="text-white/80 text-xs mt-1 drop-shadow-lg">🏢 {video.clientName}</p>
        )}
        
        {/* Creator status change buttons */}
        {video.isCreatorOwner && onCreatorStatusChange && (
          <div className="mt-2 flex gap-2">
            {video.status === 'assigned' && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onCreatorStatusChange('recording');
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/30 backdrop-blur-sm text-blue-300 rounded-lg text-xs font-medium active:scale-95 transition-transform"
              >
                <Circle className="h-3 w-3 fill-current animate-pulse" />
                <span>Iniciar Grabación</span>
              </button>
            )}
            {video.status === 'recording' && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onCreatorStatusChange('recorded');
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/30 backdrop-blur-sm text-green-300 rounded-lg text-xs font-medium active:scale-95 transition-transform"
              >
                <Video className="h-3 w-3" />
                <span>Marcar Grabado</span>
              </button>
            )}
            {video.status === 'recording' && (
              <span className="flex items-center gap-1 text-blue-300 text-xs">
                <Circle className="h-2.5 w-2.5 fill-current animate-pulse" />
                En Grabación
              </span>
            )}
            {video.status === 'recorded' && (
              <span className="flex items-center gap-1 text-green-300 text-xs">
                <Video className="h-3 w-3" />
                Grabado
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function TikTokFeed({ videos, onLike, onView, onShare, onComment, onCreatorStatusChange, className }: TikTokFeedProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  // Observe which video is in view
  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio > 0.7) {
            const index = Number(entry.target.getAttribute('data-index'));
            if (!isNaN(index)) {
              setActiveIndex(index);
            }
          }
        });
      },
      { threshold: [0.7], root: containerRef.current }
    );

    const items = containerRef.current.querySelectorAll('[data-index]');
    items.forEach(item => observer.observe(item));

    return () => observer.disconnect();
  }, [videos]);

  if (videos.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen bg-black text-white">
        <p className="text-white/60">No hay videos disponibles</p>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className={cn(
        "h-screen w-full overflow-y-scroll snap-y snap-mandatory scrollbar-hide",
        className
      )}
    >
      {videos.map((video, index) => (
        <div 
          key={video.id} 
          data-index={index}
          className="h-screen w-full"
        >
          <TikTokVideoCard
            video={video}
            isActive={index === activeIndex}
            onLike={onLike ? (e) => onLike(video.id, e) : undefined}
            onView={onView ? () => onView(video.id) : undefined}
            onShare={() => onShare(video)}
            onComment={onComment ? () => onComment(video.id) : undefined}
            onCreatorStatusChange={video.isCreatorOwner && onCreatorStatusChange ? (newStatus) => onCreatorStatusChange(video.id, newStatus) : undefined}
          />
        </div>
      ))}
    </div>
  );
}
