import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Heart, MessageSquare, Share2, Volume2, VolumeX, ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

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
}

interface FullscreenVideoViewerProps {
  videos: VideoItem[];
  initialIndex: number;
  onClose: () => void;
  onLike?: (id: string) => void;
  onView?: (id: string) => void;
  onShare?: (video: VideoItem) => void;
  onComment?: (id: string) => void;
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
    return `${url}${separator}autoplay=true&muted=${muted}&loop=true&preload=true`;
  }
  
  const cdnMatch = url.match(/vz-(\d+)\.b-cdn\.net\/([a-f0-9-]+)/i);
  if (cdnMatch) {
    const [, libraryId, videoId] = cdnMatch;
    return `https://iframe.mediadelivery.net/embed/${libraryId}/${videoId}?autoplay=true&muted=${muted}&loop=true&preload=true`;
  }
  
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}autoplay=true&muted=${muted}&loop=true`;
}

export function FullscreenVideoViewer({
  videos,
  initialIndex,
  onClose,
  onLike,
  onView,
  onShare,
  onComment
}: FullscreenVideoViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [currentVariation, setCurrentVariation] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef(0);
  const touchStartX = useRef(0);
  const viewTrackedRef = useRef<Set<string>>(new Set());

  const currentVideo = videos[currentIndex];
  const currentVideoUrl = currentVideo?.videoUrls[currentVariation] || currentVideo?.videoUrls[0];
  const hasMultipleVariations = currentVideo?.videoUrls.length > 1;

  // Track view after 3 seconds
  useEffect(() => {
    if (!currentVideo || viewTrackedRef.current.has(currentVideo.id)) return;
    
    const timer = setTimeout(() => {
      onView?.(currentVideo.id);
      viewTrackedRef.current.add(currentVideo.id);
    }, 3000);

    return () => clearTimeout(timer);
  }, [currentVideo, onView]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowUp') goToPrev();
      if (e.key === 'ArrowDown') goToNext();
      if (e.key === 'ArrowLeft') goToPrevVariation();
      if (e.key === 'ArrowRight') goToNextVariation();
      if (e.key === 'm') setIsMuted(m => !m);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, currentIndex, currentVariation]);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const goToNext = useCallback(() => {
    if (currentIndex < videos.length - 1 && !isTransitioning) {
      setIsTransitioning(true);
      setCurrentIndex(prev => prev + 1);
      setCurrentVariation(0);
      setTimeout(() => setIsTransitioning(false), 300);
    }
  }, [currentIndex, videos.length, isTransitioning]);

  const goToPrev = useCallback(() => {
    if (currentIndex > 0 && !isTransitioning) {
      setIsTransitioning(true);
      setCurrentIndex(prev => prev - 1);
      setCurrentVariation(0);
      setTimeout(() => setIsTransitioning(false), 300);
    }
  }, [currentIndex, isTransitioning]);

  const goToNextVariation = useCallback(() => {
    if (hasMultipleVariations) {
      setCurrentVariation(prev => 
        prev < currentVideo.videoUrls.length - 1 ? prev + 1 : 0
      );
    }
  }, [hasMultipleVariations, currentVideo]);

  const goToPrevVariation = useCallback(() => {
    if (hasMultipleVariations) {
      setCurrentVariation(prev => 
        prev > 0 ? prev - 1 : currentVideo.videoUrls.length - 1
      );
    }
  }, [hasMultipleVariations, currentVideo]);

  // Touch handlers for swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const touchEndY = e.changedTouches[0].clientY;
    const touchEndX = e.changedTouches[0].clientX;
    const diffY = touchStartY.current - touchEndY;
    const diffX = touchStartX.current - touchEndX;
    
    const minSwipeDistance = 50;

    // Determine if it's more of a vertical or horizontal swipe
    if (Math.abs(diffY) > Math.abs(diffX)) {
      // Vertical swipe
      if (Math.abs(diffY) > minSwipeDistance) {
        if (diffY > 0) {
          goToNext(); // Swipe up = next video
        } else {
          goToPrev(); // Swipe down = previous video
        }
      }
    } else {
      // Horizontal swipe for variations
      if (Math.abs(diffX) > minSwipeDistance && hasMultipleVariations) {
        if (diffX > 0) {
          goToNextVariation(); // Swipe left = next variation
        } else {
          goToPrevVariation(); // Swipe right = previous variation
        }
      }
    }
  };

  if (!currentVideo) return null;

  return (
    <div 
      ref={containerRef}
      className="fixed inset-0 z-[100] bg-black flex flex-col"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Video Container */}
      <div className={cn(
        "flex-1 relative transition-transform duration-300",
        isTransitioning && "opacity-90"
      )}>
        <iframe
          key={`${currentVideo.id}-${currentVariation}`}
          src={getEmbedUrl(currentVideoUrl, isMuted)}
          className="w-full h-full border-0"
          allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
        />

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 left-4 z-20 p-2 rounded-full bg-black/50 backdrop-blur-sm text-white hover:bg-black/70 transition-colors"
        >
          <X className="h-6 w-6" />
        </button>

        {/* Mute toggle */}
        <button
          onClick={() => setIsMuted(!isMuted)}
          className="absolute top-4 right-4 z-20 p-2 rounded-full bg-black/50 backdrop-blur-sm text-white hover:bg-black/70 transition-colors"
        >
          {isMuted ? <VolumeX className="h-6 w-6" /> : <Volume2 className="h-6 w-6" />}
        </button>

        {/* Variation navigation (horizontal) */}
        {hasMultipleVariations && (
          <>
            <button
              onClick={goToPrevVariation}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-20 p-3 rounded-full bg-black/50 backdrop-blur-sm text-white hover:bg-black/70 transition-colors"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <button
              onClick={goToNextVariation}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-20 p-3 rounded-full bg-black/50 backdrop-blur-sm text-white hover:bg-black/70 transition-colors"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
            
            {/* Variation indicator */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex gap-1.5">
              {currentVideo.videoUrls.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentVariation(idx)}
                  className={cn(
                    "w-2 h-2 rounded-full transition-all",
                    idx === currentVariation 
                      ? "bg-white w-6" 
                      : "bg-white/50 hover:bg-white/80"
                  )}
                />
              ))}
            </div>
          </>
        )}

        {/* Video navigation hints */}
        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-2 z-10 hidden md:flex">
          <button
            onClick={goToPrev}
            disabled={currentIndex === 0}
            className={cn(
              "p-2 rounded-full bg-black/50 backdrop-blur-sm text-white transition-colors",
              currentIndex === 0 ? "opacity-30 cursor-not-allowed" : "hover:bg-black/70"
            )}
          >
            <ChevronUp className="h-5 w-5" />
          </button>
          <button
            onClick={goToNext}
            disabled={currentIndex === videos.length - 1}
            className={cn(
              "p-2 rounded-full bg-black/50 backdrop-blur-sm text-white transition-colors",
              currentIndex === videos.length - 1 ? "opacity-30 cursor-not-allowed" : "hover:bg-black/70"
            )}
          >
            <ChevronDown className="h-5 w-5" />
          </button>
        </div>

        {/* Actions sidebar (TikTok style) */}
        <div className="absolute bottom-24 right-4 flex flex-col gap-4 z-20">
          {onLike && (
            <button
              onClick={() => onLike(currentVideo.id)}
              className="flex flex-col items-center gap-1"
            >
              <div className={cn(
                "p-3 rounded-full transition-all active:scale-90",
                currentVideo.isLiked 
                  ? "bg-red-500 text-white" 
                  : "bg-black/50 backdrop-blur-sm text-white hover:bg-black/70"
              )}>
                <Heart className="h-7 w-7" fill={currentVideo.isLiked ? "currentColor" : "none"} />
              </div>
              <span className="text-white text-xs font-medium">{formatCount(currentVideo.likesCount)}</span>
            </button>
          )}
          
          {onComment && (
            <button
              onClick={() => onComment(currentVideo.id)}
              className="flex flex-col items-center gap-1"
            >
              <div className="p-3 rounded-full bg-black/50 backdrop-blur-sm text-white hover:bg-black/70 transition-colors active:scale-90">
                <MessageSquare className="h-7 w-7" />
              </div>
              <span className="text-white text-xs font-medium">Comentar</span>
            </button>
          )}
          
          {onShare && (
            <button
              onClick={() => onShare(currentVideo)}
              className="flex flex-col items-center gap-1"
            >
              <div className="p-3 rounded-full bg-black/50 backdrop-blur-sm text-white hover:bg-black/70 transition-colors active:scale-90">
                <Share2 className="h-7 w-7" />
              </div>
              <span className="text-white text-xs font-medium">Compartir</span>
            </button>
          )}
        </div>

        {/* Video info */}
        <div className="absolute bottom-4 left-4 right-20 z-20">
          <h2 className="text-white font-bold text-lg mb-1 line-clamp-2 drop-shadow-lg">
            {currentVideo.title}
          </h2>
          <div className="flex items-center gap-2 text-white/80 text-sm">
            {currentVideo.clientName && (
              <span className="text-primary font-medium">{currentVideo.clientName}</span>
            )}
            {currentVideo.clientName && currentVideo.creatorName && <span>•</span>}
            {currentVideo.creatorName && (
              <span>@{currentVideo.creatorName}</span>
            )}
          </div>
          <div className="flex items-center gap-3 text-white/60 text-xs mt-2">
            <span>{formatCount(currentVideo.viewsCount)} vistas</span>
            {hasMultipleVariations && (
              <span className="text-primary">{currentVideo.videoUrls.length} variaciones</span>
            )}
          </div>
        </div>

        {/* Progress indicator */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
          <div 
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${((currentIndex + 1) / videos.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Swipe hint (mobile only) */}
      <div className="absolute bottom-20 left-1/2 -translate-x-1/2 text-white/40 text-xs flex flex-col items-center gap-1 md:hidden animate-pulse">
        <ChevronUp className="h-4 w-4" />
        <span>Desliza para navegar</span>
      </div>
    </div>
  );
}
