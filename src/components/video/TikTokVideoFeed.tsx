import { useState, useRef, useEffect, useCallback } from 'react';
import { Heart, MessageCircle, Share2, Volume2, VolumeX, Play, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { HLSVideoPlayer, HLSVideoPlayerRef, getBunnyThumbnail } from './HLSVideoPlayer';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ExpandableText } from '@/components/ui/expandable-text';
import { useGlobalMute } from '@/contexts/VideoPlayerContext';

interface VideoItem {
  id: string;
  title: string;
  videoUrls: string[];
  thumbnailUrl?: string | null;
  viewsCount: number;
  likesCount: number;
  isLiked: boolean;
  creatorId?: string;
  creatorName?: string;
  creatorAvatar?: string;
  clientName?: string;
  caption?: string;
}

interface TikTokVideoFeedProps {
  videos: VideoItem[];
  onLike?: (id: string) => void;
  onView?: (id: string) => void;
  onShare?: (video: VideoItem) => void;
  onComment?: (id: string) => void;
  onProfileClick?: (creatorId: string) => void;
  className?: string;
}

interface FloatingHeart {
  id: number;
  x: number;
  y: number;
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
      className="absolute pointer-events-none z-50 animate-floating-heart"
      style={{ left: x - 40, top: y - 40 }}
    >
      <Heart 
        className="h-20 w-20 text-red-500" 
        fill="currentColor"
        style={{ filter: 'drop-shadow(0 0 10px rgba(239, 68, 68, 0.5))' }}
      />
    </div>
  );
}

function VideoCard({
  video,
  isActive,
  onLike,
  onView,
  onShare,
  onComment,
  onProfileClick
}: {
  video: VideoItem;
  isActive: boolean;
  onLike?: () => void;
  onView?: () => void;
  onShare?: () => void;
  onComment?: () => void;
  onProfileClick?: () => void;
}) {
  // Use global mute state
  const { isGlobalMuted, setGlobalMuted } = useGlobalMute();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [floatingHearts, setFloatingHearts] = useState<FloatingHeart[]>([]);
  const [showPlayIcon, setShowPlayIcon] = useState(false);
  const playerRef = useRef<HLSVideoPlayerRef>(null);
  const viewTrackedRef = useRef(false);
  const heartIdRef = useRef(0);
  const lastTapRef = useRef(0);

  const currentVideoUrl = video.videoUrls[currentIndex] || video.videoUrls[0];
  const hasMultiple = video.videoUrls.length > 1;
  const thumbnailUrl = video.thumbnailUrl || getBunnyThumbnail(currentVideoUrl);

  // Control playback and sync mute based on active state
  useEffect(() => {
    if (isActive) {
      playerRef.current?.play();
      // Sync mute state when becoming active
      setTimeout(() => {
        playerRef.current?.setMuted(isGlobalMuted);
      }, 50);
    } else {
      playerRef.current?.pause();
      viewTrackedRef.current = false;
    }
  }, [isActive, isGlobalMuted]);

  // Handle video loaded - sync mute state
  const handleVideoLoadComplete = useCallback(() => {
    if (playerRef.current) {
      playerRef.current.setMuted(isGlobalMuted);
    }
  }, [isGlobalMuted]);

  // Track view after 3 seconds
  useEffect(() => {
    if (!isActive || viewTrackedRef.current || !onView) return;
    
    const timer = setTimeout(() => {
      onView();
      viewTrackedRef.current = true;
    }, 3000);

    return () => clearTimeout(timer);
  }, [isActive, onView]);

  const spawnFloatingHeart = useCallback((clientX: number, clientY: number) => {
    const newHeart: FloatingHeart = {
      id: heartIdRef.current++,
      x: clientX,
      y: clientY
    };
    setFloatingHearts(prev => [...prev, newHeart]);
  }, []);

  const removeHeart = useCallback((id: number) => {
    setFloatingHearts(prev => prev.filter(h => h.id !== id));
  }, []);

  const handleTap = useCallback((e: React.MouseEvent) => {
    const now = Date.now();
    const timeSinceLastTap = now - lastTapRef.current;
    lastTapRef.current = now;

    // Double tap = like
    if (timeSinceLastTap < 300) {
      spawnFloatingHeart(e.clientX, e.clientY);
      if (!video.isLiked && onLike) {
        onLike();
      }
      return;
    }

    // Single tap = toggle play/pause with visual feedback
    setTimeout(() => {
      if (Date.now() - lastTapRef.current >= 280) {
        if (isActive) {
          playerRef.current?.pause();
        } else {
          playerRef.current?.play();
        }
        setShowPlayIcon(true);
        setTimeout(() => setShowPlayIcon(false), 600);
      }
    }, 300);
  }, [video.isLiked, onLike, isActive, spawnFloatingHeart]);

  const handleMuteToggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const newMuted = !isGlobalMuted;
    setGlobalMuted(newMuted);
    playerRef.current?.setMuted(newMuted);
  }, [isGlobalMuted, setGlobalMuted]);

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

      {/* HLS Video Player */}
      <HLSVideoPlayer
        ref={playerRef}
        src={currentVideoUrl}
        poster={thumbnailUrl || undefined}
        autoPlay={isActive}
        muted={isGlobalMuted}
        loop={true}
        aspectRatio="auto"
        className="absolute inset-0 w-full h-full"
        onLoadComplete={handleVideoLoadComplete}
      />

      {/* Play/Pause indicator */}
      {showPlayIcon && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
          <div className="p-6 rounded-full bg-black/50 backdrop-blur-sm animate-scale-in">
            <Play className="h-16 w-16 text-white" fill="white" />
          </div>
        </div>
      )}

      {/* Gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30 pointer-events-none" />

      {/* Mute toggle */}
      <button
        onClick={handleMuteToggle}
        className="absolute top-4 right-4 z-30 p-2.5 rounded-full bg-black/40 backdrop-blur-sm text-white hover:bg-black/60 transition-colors"
      >
        {isGlobalMuted ? <VolumeX className="h-6 w-6" /> : <Volume2 className="h-6 w-6" />}
      </button>

      {/* Carousel navigation */}
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

      {/* Right side actions */}
      <div className="absolute right-3 bottom-28 z-20 flex flex-col items-center gap-4">
        {/* Like */}
        {onLike && (
          <button
            onClick={(e) => { e.stopPropagation(); onLike(); }}
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
              <MessageCircle className="h-7 w-7" />
            </div>
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

        {/* Creator avatar */}
        {video.creatorAvatar && onProfileClick && (
          <button
            onClick={(e) => { e.stopPropagation(); onProfileClick(); }}
            className="relative"
          >
            <Avatar className="h-12 w-12 ring-2 ring-white">
              <AvatarImage src={video.creatorAvatar} />
              <AvatarFallback>{video.creatorName?.[0]}</AvatarFallback>
            </Avatar>
          </button>
        )}
      </div>

      {/* Bottom info */}
      <div className="absolute bottom-8 left-4 right-16 z-20">
        {video.creatorName && (
          <button 
            onClick={(e) => { e.stopPropagation(); onProfileClick?.(); }}
            className="text-white font-bold text-sm drop-shadow-lg mb-1"
          >
            @{video.creatorName.replace(/\s+/g, '').toLowerCase()}
          </button>
        )}
        <ExpandableText 
          text={video.caption || video.title} 
          className="text-white text-sm drop-shadow-lg" 
          maxLines={2} 
        />
        {video.clientName && (
          <p className="text-white/80 text-xs mt-1 drop-shadow-lg">🏢 {video.clientName}</p>
        )}
      </div>
    </div>
  );
}

export function TikTokVideoFeed({ 
  videos, 
  onLike, 
  onView, 
  onShare, 
  onComment,
  onProfileClick,
  className 
}: TikTokVideoFeedProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  // IntersectionObserver for detecting active video
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
          <VideoCard
            video={video}
            isActive={index === activeIndex}
            onLike={onLike ? () => onLike(video.id) : undefined}
            onView={onView ? () => onView(video.id) : undefined}
            onShare={onShare ? () => onShare(video) : undefined}
            onComment={onComment ? () => onComment(video.id) : undefined}
            onProfileClick={onProfileClick && video.creatorId ? () => onProfileClick(video.creatorId!) : undefined}
          />
        </div>
      ))}
    </div>
  );
}
