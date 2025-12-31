import { useState, useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import { Heart, MessageCircle, Share2, Volume2, VolumeX, Play, Pause, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ExpandableText } from '@/components/ui/expandable-text';
import { HLSVideoPlayer, HLSVideoPlayerRef } from '@/components/video/HLSVideoPlayer';
import { useIsMobile } from '@/hooks/use-mobile';

export interface SocialFeedItem {
  id: string;
  title: string;
  mediaType: 'video' | 'image';
  mediaUrl: string;
  videoUrls?: string[];
  thumbnailUrl?: string | null;
  viewsCount: number;
  likesCount: number;
  commentsCount?: number;
  isLiked: boolean;
  creatorId?: string | null;
  creatorName?: string | null;
  creatorAvatar?: string | null;
  clientName?: string | null;
  createdAt?: string;
  canInteract?: boolean;
}

interface FloatingHeart {
  id: number;
  x: number;
  y: number;
}

interface SocialFeedCardProps {
  item: SocialFeedItem;
  isActive: boolean;
  audioUnlocked: boolean;
  onLike?: () => void;
  onComment?: () => void;
  onShare?: () => void;
  onView?: () => void;
  onProfileClick?: () => void;
  onUnlockAudio?: () => void;
}

export interface SocialFeedCardRef {
  play: () => void;
  pause: () => void;
}

function formatCount(count: number): string {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return count.toString();
}

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
        style={{ filter: 'drop-shadow(0 0 10px rgba(239, 68, 68, 0.5))' }}
      />
    </div>
  );
}

export const SocialFeedCard = forwardRef<SocialFeedCardRef, SocialFeedCardProps>(
  function SocialFeedCard(
    {
      item,
      isActive,
      audioUnlocked,
      onLike,
      onComment,
      onShare,
      onView,
      onProfileClick,
      onUnlockAudio,
    },
    ref
  ) {
    const isMobile = useIsMobile();
    const playerRef = useRef<HLSVideoPlayerRef>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const viewTrackedRef = useRef(false);
    const viewTimerRef = useRef<NodeJS.Timeout | null>(null);
    const [floatingHearts, setFloatingHearts] = useState<FloatingHeart[]>([]);
    const [showPauseIcon, setShowPauseIcon] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [imageLoaded, setImageLoaded] = useState(false);
    const heartIdRef = useRef(0);
    const pauseIconTimerRef = useRef<NodeJS.Timeout | null>(null);

    const canInteract = item.canInteract !== false;
    const isVideo = item.mediaType === 'video';
    const isMuted = !audioUnlocked;

    useImperativeHandle(ref, () => ({
      play: () => {
        setIsPaused(false);
        playerRef.current?.play();
        // Ensure audio is unmuted when playing if audio is unlocked
        if (audioUnlocked) {
          playerRef.current?.setMuted(false);
        }
      },
      pause: () => {
        setIsPaused(true);
        playerRef.current?.pause();
      },
    }));

    // Handle active state changes - play/pause video
    useEffect(() => {
      if (!isVideo) return;
      
      if (isActive && !isPaused) {
        playerRef.current?.play();
      } else {
        playerRef.current?.pause();
        viewTrackedRef.current = false;
      }
    }, [isActive, isVideo, isPaused]);

    // Sync mute state with audioUnlocked - ensure active video always has correct audio state
    useEffect(() => {
      if (!isVideo || !isActive) return;
      
      // When audioUnlocked changes or when becoming active, set the correct mute state
      playerRef.current?.setMuted(!audioUnlocked);
    }, [audioUnlocked, isActive, isVideo]);

    // Track view after 3 seconds
    useEffect(() => {
      if (!canInteract || !onView) return;

      if (isActive && !viewTrackedRef.current) {
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
    }, [isActive, onView, canInteract]);

    // Spawn floating heart at tap position
    const spawnFloatingHeart = useCallback((clientX: number, clientY: number) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = clientX - rect.left - 40;
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

    // Handle tap for play/pause and double-tap for like
    const handleTap = useCallback((e: React.MouseEvent | React.TouchEvent) => {
      const now = Date.now();
      const lastTap = (handleTap as any).lastTap || 0;
      (handleTap as any).lastTap = now;

      const clientX = 'touches' in e ? e.changedTouches?.[0]?.clientX || 0 : e.clientX;
      const clientY = 'touches' in e ? e.changedTouches?.[0]?.clientY || 0 : e.clientY;

      if (now - lastTap < 300) {
        // Double tap - like and show floating heart
        spawnFloatingHeart(clientX, clientY);
        if (canInteract && !item.isLiked && onLike) {
          onLike();
        }
        return;
      }

      // Single tap - toggle play/pause for videos
      setTimeout(() => {
        if (Date.now() - (handleTap as any).lastTap >= 280) {
          if (isVideo) {
            setIsPaused(prev => {
              const newPaused = !prev;
              if (newPaused) {
                playerRef.current?.pause();
              } else {
                playerRef.current?.play();
              }
              setShowPauseIcon(true);
              if (pauseIconTimerRef.current) clearTimeout(pauseIconTimerRef.current);
              pauseIconTimerRef.current = setTimeout(() => setShowPauseIcon(false), 600);
              return newPaused;
            });
          }
        }
      }, 300);
    }, [item.isLiked, onLike, spawnFloatingHeart, canInteract, isVideo]);

    // Handle mute toggle
    const handleMuteToggle = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!audioUnlocked && onUnlockAudio) {
        onUnlockAudio();
        playerRef.current?.setMuted(false);
      } else if (onUnlockAudio) {
        // Toggle mute
        playerRef.current?.toggleMute();
      }
    };

    const handleVideoLoadComplete = useCallback(() => {
      if (playerRef.current) {
        playerRef.current.setMuted(!audioUnlocked);
      }
    }, [audioUnlocked]);

    return (
      <div 
        ref={containerRef}
        className="relative w-full h-full bg-black snap-start snap-always overflow-hidden flex items-center justify-center"
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

        {/* Media Container - 100vh with proper aspect ratio */}
        <div className="relative w-full h-full flex items-center justify-center">
          {isVideo ? (
            <HLSVideoPlayer
              ref={playerRef}
              src={item.videoUrls?.[0] || item.mediaUrl}
              poster={item.thumbnailUrl || undefined}
              autoPlay={isActive && !isPaused}
              muted={isMuted}
              loop
              showControls={false}
              aspectRatio="auto"
              objectFit="contain"
              className="w-full h-full"
              onLoadComplete={handleVideoLoadComplete}
            />
          ) : (
            <div className="relative w-full h-full flex items-center justify-center">
              {!imageLoaded && (
                <div className="absolute inset-0 flex items-center justify-center bg-zinc-900">
                  <Loader2 className="h-8 w-8 text-white/40 animate-spin" />
                </div>
              )}
              <img
                src={item.mediaUrl}
                alt={item.title}
                className={cn(
                  'max-w-full max-h-full transition-opacity duration-300',
                  isMobile ? 'object-cover w-full h-full' : 'object-contain',
                  imageLoaded ? 'opacity-100' : 'opacity-0'
                )}
                onLoad={() => setImageLoaded(true)}
                loading="lazy"
              />
            </div>
          )}
        </div>

        {/* Play/Pause indicator */}
        {showPauseIcon && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
            <div className="p-6 rounded-full bg-black/50 backdrop-blur-sm animate-scale-in">
              {isPaused ? (
                <Pause className="h-16 w-16 text-white" />
              ) : (
                <Play className="h-16 w-16 text-white" fill="white" />
              )}
            </div>
          </div>
        )}

        {/* Gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30 pointer-events-none" />

        {/* Volume toggle for videos */}
        {isVideo && (
          <button
            onClick={handleMuteToggle}
            className="absolute top-4 right-4 z-30 p-2.5 rounded-full bg-black/40 backdrop-blur-sm text-white hover:bg-black/60 transition-colors"
          >
            {isMuted ? <VolumeX className="h-6 w-6" /> : <Volume2 className="h-6 w-6" />}
          </button>
        )}

        {/* Right side actions - TikTok style */}
        <div className="absolute right-3 bottom-28 z-20 flex flex-col items-center gap-4">
          {/* Creator avatar */}
          {item.creatorAvatar && onProfileClick && (
            <button
              onClick={(e) => { e.stopPropagation(); onProfileClick(); }}
              className="relative mb-2"
            >
              <Avatar className="h-12 w-12 ring-2 ring-white shadow-lg">
                <AvatarImage src={item.creatorAvatar} />
                <AvatarFallback className="bg-gradient-to-br from-pink-500 to-purple-600 text-white text-sm font-bold">
                  {item.creatorName?.charAt(0)?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
            </button>
          )}

          {/* Like */}
          {canInteract && onLike && (
            <button
              onClick={(e) => { e.stopPropagation(); onLike(); }}
              className="flex flex-col items-center gap-1"
            >
              <div className={cn(
                "p-3 rounded-full transition-all duration-200 active:scale-90",
                item.isLiked 
                  ? "bg-red-500 text-white" 
                  : "bg-black/40 backdrop-blur-sm text-white"
              )}>
                <Heart className="h-7 w-7" fill={item.isLiked ? "currentColor" : "none"} />
              </div>
              <span className="text-white text-xs font-semibold drop-shadow-lg">{formatCount(item.likesCount)}</span>
            </button>
          )}

          {/* Comment */}
          {onComment && (
            <button
              onClick={(e) => { e.stopPropagation(); onComment(); }}
              className="flex flex-col items-center gap-1"
            >
              <div className="p-3 rounded-full bg-black/40 backdrop-blur-sm text-white active:scale-90 transition-transform">
                <MessageCircle className="h-7 w-7" />
              </div>
              {item.commentsCount !== undefined && (
                <span className="text-white text-xs font-semibold drop-shadow-lg">{formatCount(item.commentsCount)}</span>
              )}
            </button>
          )}

          {/* Share */}
          {onShare && (
            <button
              onClick={(e) => { e.stopPropagation(); onShare(); }}
              className="flex flex-col items-center gap-1"
            >
              <div className="p-3 rounded-full bg-black/40 backdrop-blur-sm text-white active:scale-90 transition-transform">
                <Share2 className="h-7 w-7" />
              </div>
            </button>
          )}
        </div>

        {/* Bottom info */}
        <div className="absolute bottom-8 left-4 right-16 z-20">
          <div className="flex items-center gap-2 mb-1">
            {item.creatorName && (
              <button 
                onClick={(e) => { e.stopPropagation(); onProfileClick?.(); }}
                className="text-white font-bold text-sm drop-shadow-lg hover:underline"
              >
                @{item.creatorName.replace(/\s+/g, '').toLowerCase()}
              </button>
            )}
          </div>
          <ExpandableText text={item.title} className="text-white text-sm drop-shadow-lg" maxLines={2} />
          {item.clientName && (
            <p className="text-white/80 text-xs mt-1 drop-shadow-lg">🏢 {item.clientName}</p>
          )}
        </div>
      </div>
    );
  }
);
