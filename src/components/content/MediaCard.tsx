import { useState, useRef, useEffect } from 'react';
import { Play, Heart, Eye, Share2, ChevronLeft, ChevronRight, Image as ImageIcon, Video, Volume2, VolumeX } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

export interface MediaItem {
  url: string;
  type: 'image' | 'video';
  thumbnailUrl?: string | null;
}

export interface MediaCardProps {
  id: string;
  title: string;
  media: MediaItem[]; // Array for carousels
  viewsCount: number;
  likesCount: number;
  isLiked: boolean;
  creatorId?: string;
  creatorName?: string;
  creatorAvatar?: string | null;
  onLike?: (e?: React.MouseEvent) => void;
  onView?: () => void;
  onShare?: () => void;
  showActions?: boolean;
  className?: string;
}

function formatCount(count: number): string {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return count.toString();
}

export function MediaCard({
  id,
  title,
  media,
  viewsCount,
  likesCount,
  isLiked,
  creatorId,
  creatorName,
  creatorAvatar,
  onLike,
  onView,
  onShare,
  showActions = true,
  className
}: MediaCardProps) {
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [showFloatingHeart, setShowFloatingHeart] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const viewTracked = useRef(false);

  const currentMedia = media[currentIndex] || media[0];
  const hasMultiple = media.length > 1;
  const isVideo = currentMedia?.type === 'video';

  // Track view after interaction
  useEffect(() => {
    if (!viewTracked.current && onView) {
      const timer = setTimeout(() => {
        onView();
        viewTracked.current = true;
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [onView]);

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex(prev => (prev > 0 ? prev - 1 : media.length - 1));
    setIsPlaying(false);
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex(prev => (prev < media.length - 1 ? prev + 1 : 0));
    setIsPlaying(false);
  };

  const handlePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isVideo) {
      setIsPlaying(true);
      videoRef.current?.play();
    }
  };

  const handleLikeWithAnimation = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setShowFloatingHeart(true);
    setTimeout(() => setShowFloatingHeart(false), 1000);
    onLike?.(e);
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isLiked && onLike) {
      handleLikeWithAnimation(e);
    }
  };

  const handleCreatorClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (creatorId) {
      navigate(`/p/${creatorId}`);
    }
  };

  return (
    <div
      className={cn(
        "group relative rounded-2xl overflow-hidden bg-card border border-border",
        "hover:border-primary/50 transition-all duration-300 hover:shadow-xl hover:shadow-primary/10",
        className
      )}
    >
      {/* Media Container */}
      <div 
        className="relative aspect-[9/16] bg-muted cursor-pointer" 
        onDoubleClick={handleDoubleClick}
        onClick={handlePlay}
      >
        {/* Floating Heart Animation */}
        {showFloatingHeart && (
          <div className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none">
            <Heart className="h-24 w-24 text-red-500 animate-ping" fill="currentColor" />
          </div>
        )}

        {/* Media Content */}
        {isVideo ? (
          isPlaying ? (
            <>
              <video
                ref={videoRef}
                src={currentMedia.url}
                className="w-full h-full object-cover"
                autoPlay
                loop
                muted={isMuted}
                playsInline
                onClick={(e) => {
                  e.stopPropagation();
                  setIsPlaying(false);
                  videoRef.current?.pause();
                }}
              />

              {/* Volume toggle (only control shown) */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMuted((v) => !v);
                  if (videoRef.current) videoRef.current.muted = !videoRef.current.muted;
                }}
                className="absolute top-2 right-2 z-20 p-2 rounded-full bg-black/40 backdrop-blur-sm text-white hover:bg-black/60 transition-colors"
              >
                {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </button>
            </>
          ) : (
            <>
              <img
                src={currentMedia.thumbnailUrl || currentMedia.url}
                alt={title}
                className="w-full h-full object-cover"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex items-center justify-center">
                <div className="p-4 rounded-full bg-white/20 backdrop-blur-sm hover:bg-white/30 transition-all duration-300 hover:scale-110">
                  <Play className="h-10 w-10 text-white" fill="currentColor" />
                </div>
              </div>
            </>
          )
        ) : (
          <img
            src={currentMedia.url}
            alt={title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        )}

        {/* Media type indicator */}
        <div className="absolute top-2 left-2 z-10">
          {isVideo ? (
            <Video className="h-4 w-4 text-white drop-shadow-lg" />
          ) : (
            <ImageIcon className="h-4 w-4 text-white drop-shadow-lg" />
          )}
        </div>

        {/* Carousel navigation */}
        {hasMultiple && (
          <>
            <button
              onClick={handlePrev}
              className="absolute left-2 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors opacity-0 group-hover:opacity-100"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={handleNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors opacity-0 group-hover:opacity-100"
            >
              <ChevronRight className="h-5 w-5" />
            </button>

            {/* Dot indicators */}
            <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-10 flex gap-1.5">
              {media.map((_, idx) => (
                <button
                  key={idx}
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentIndex(idx);
                  }}
                  className={cn(
                    "w-2 h-2 rounded-full transition-all",
                    idx === currentIndex ? "bg-white w-4" : "bg-white/50 hover:bg-white/80"
                  )}
                />
              ))}
            </div>
          </>
        )}

        {/* Stats - bottom left */}
        <div className="absolute bottom-4 left-3 z-10">
          <div className="flex items-center gap-1.5 text-white text-xs">
            <Eye className="h-3.5 w-3.5" />
            <span>{formatCount(viewsCount)}</span>
          </div>
        </div>

        {/* Action buttons */}
        {showActions && (
          <div className="absolute bottom-4 right-3 flex flex-col gap-4 z-10">
            {onLike && (
              <button
                onClick={(e) => handleLikeWithAnimation(e)}
                className="flex flex-col items-center gap-1"
              >
                <div
                  className={cn(
                    "p-2.5 rounded-full transition-all duration-200 active:scale-90",
                    isLiked ? "text-red-500" : "text-white hover:text-red-400"
                  )}
                >
                  <Heart className="h-7 w-7" fill={isLiked ? "currentColor" : "none"} />
                </div>
                <span className="text-white text-xs font-medium">{formatCount(likesCount)}</span>
              </button>
            )}
            {onShare && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onShare();
                }}
                className="flex flex-col items-center gap-1"
              >
                <div className="p-2.5 text-white hover:text-primary transition-colors active:scale-90">
                  <Share2 className="h-7 w-7" />
                </div>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Caption/Creator info */}
      <div className="p-3 bg-gradient-to-t from-black/80 to-transparent absolute bottom-0 left-0 right-0 z-5">
        {creatorName && (
          <button
            onClick={handleCreatorClick}
            className="text-white text-sm font-semibold hover:underline truncate block"
          >
            @{creatorName.replace(/\s+/g, '').toLowerCase()}
          </button>
        )}
        {title && (
          <p className="text-white/80 text-xs line-clamp-2 mt-0.5">{title}</p>
        )}
      </div>
    </div>
  );
}
