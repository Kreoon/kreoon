import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Heart, MessageSquare, Share2, Volume2, VolumeX, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, MoreVertical, Pencil, Trash2, Globe, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

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
  mediaType?: 'video' | 'image';
  mediaUrl?: string;
  isPublic?: boolean;
}

interface FullscreenVideoViewerProps {
  videos: VideoItem[];
  initialIndex: number;
  onClose: () => void;
  onLike?: (id: string) => void;
  onView?: (id: string) => void;
  onShare?: (video: VideoItem) => void;
  onComment?: (id: string) => void;
  isOwner?: boolean;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  onToggleVisibility?: (id: string, isPublic: boolean) => void;
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
  onComment,
  isOwner,
  onEdit,
  onDelete,
  onToggleVisibility
}: FullscreenVideoViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [currentVariation, setCurrentVariation] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [swipeDirection, setSwipeDirection] = useState<'up' | 'down' | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef(0);
  const touchStartX = useRef(0);
  const viewTrackedRef = useRef<Set<string>>(new Set());

  const currentVideo = videos[currentIndex];
  const isImage = currentVideo?.mediaType === 'image' || 
    (!currentVideo?.videoUrls?.length && currentVideo?.mediaUrl);
  const currentVideoUrl = currentVideo?.videoUrls?.[currentVariation] || currentVideo?.videoUrls?.[0];
  const hasMultipleVariations = (currentVideo?.videoUrls?.length || 0) > 1;

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

  // Touch handlers for swipe with dynamic feedback
  const [touchActive, setTouchActive] = useState(false);
  
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    touchStartX.current = e.touches[0].clientX;
    setTouchActive(true);
    setSwipeOffset(0);
    setSwipeDirection(null);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchActive) return;
    
    e.preventDefault();
    
    const currentY = e.touches[0].clientY;
    const currentX = e.touches[0].clientX;
    const diffY = touchStartY.current - currentY;
    const diffX = touchStartX.current - currentX;
    
    // Only apply visual feedback for vertical swipes
    if (Math.abs(diffY) > Math.abs(diffX)) {
      // Limit the offset for visual feedback (max 150px)
      const maxOffset = 150;
      const dampedOffset = Math.sign(diffY) * Math.min(Math.abs(diffY) * 0.5, maxOffset);
      
      // Check if we can navigate in this direction
      const canGoNext = currentIndex < videos.length - 1;
      const canGoPrev = currentIndex > 0;
      
      if ((diffY > 0 && canGoNext) || (diffY < 0 && canGoPrev)) {
        setSwipeOffset(dampedOffset);
        setSwipeDirection(diffY > 0 ? 'up' : 'down');
      } else {
        // Resistance when can't go further
        setSwipeOffset(dampedOffset * 0.2);
        setSwipeDirection(diffY > 0 ? 'up' : 'down');
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    setTouchActive(false);
    
    const touchEndY = e.changedTouches[0].clientY;
    const touchEndX = e.changedTouches[0].clientX;
    const diffY = touchStartY.current - touchEndY;
    const diffX = touchStartX.current - touchEndX;
    
    const minSwipeDistance = 50;
    
    // Reset visual feedback
    setSwipeOffset(0);
    setSwipeDirection(null);

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
      className="fixed inset-0 z-[100] bg-black flex flex-col touch-none"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Content Container with swipe animation */}
      <div 
        className={cn(
          "flex-1 relative",
          !touchActive && "transition-all duration-300 ease-out",
          isTransitioning && "opacity-90"
        )}
        style={{
          transform: `translateY(${-swipeOffset}px) scale(${1 - Math.abs(swipeOffset) * 0.0005})`,
        }}
      >
        {isImage ? (
          // Image display - contained within viewport
          <div className="w-full h-full flex items-center justify-center p-4">
            <img
              key={currentVideo.id}
              src={currentVideo.mediaUrl || currentVideo.thumbnailUrl || ''}
              alt={currentVideo.title}
              className="max-w-full max-h-full w-auto h-auto object-contain"
              style={{ maxHeight: 'calc(100vh - 120px)' }}
            />
          </div>
        ) : (
          // Video display
          <iframe
            key={`${currentVideo.id}-${currentVariation}`}
            src={getEmbedUrl(currentVideoUrl, isMuted)}
            className="w-full h-full border-0"
            allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
          />
        )}

        {/* Touch overlay to capture swipes - positioned over content but under controls */}
        <div 
          className="absolute inset-0 z-10"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          style={{ touchAction: 'none' }}
        />

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 left-4 z-30 p-2 rounded-full bg-black/50 backdrop-blur-sm text-white hover:bg-black/70 transition-colors"
        >
          <X className="h-6 w-6" />
        </button>

        {/* Top right controls */}
        <div className="absolute top-4 right-4 z-30 flex items-center gap-2">
          {/* Mute toggle - only for videos */}
          {!isImage && (
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="p-2 rounded-full bg-black/50 backdrop-blur-sm text-white hover:bg-black/70 transition-colors"
            >
              {isMuted ? <VolumeX className="h-6 w-6" /> : <Volume2 className="h-6 w-6" />}
            </button>
          )}

          {/* Owner menu */}
          {isOwner && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="p-2 rounded-full bg-black/50 backdrop-blur-sm text-white hover:bg-black/70 transition-colors">
                  <MoreVertical className="h-6 w-6" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {onEdit && (
                  <DropdownMenuItem onClick={() => onEdit(currentVideo.id)}>
                    <Pencil className="h-4 w-4 mr-2" />
                    Editar
                  </DropdownMenuItem>
                )}
                {onToggleVisibility && (
                  <DropdownMenuItem onClick={() => onToggleVisibility(currentVideo.id, !currentVideo.isPublic)}>
                    {currentVideo.isPublic ? (
                      <>
                        <Lock className="h-4 w-4 mr-2" />
                        Hacer privado
                      </>
                    ) : (
                      <>
                        <Globe className="h-4 w-4 mr-2" />
                        Hacer público
                      </>
                    )}
                  </DropdownMenuItem>
                )}
                {onDelete && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={() => onDelete(currentVideo.id)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Eliminar
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Variation navigation (horizontal) - only for videos with multiple variations */}
        {!isImage && hasMultipleVariations && (
          <>
            <button
              onClick={goToPrevVariation}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-30 p-3 rounded-full bg-black/50 backdrop-blur-sm text-white hover:bg-black/70 transition-colors"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <button
              onClick={goToNextVariation}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-30 p-3 rounded-full bg-black/50 backdrop-blur-sm text-white hover:bg-black/70 transition-colors"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
            
            {/* Variation indicator */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 flex gap-1.5">
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
        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-2 z-30 hidden md:flex">
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
        <div className="absolute bottom-24 right-4 flex flex-col gap-4 z-30">
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
        <div className="absolute bottom-4 left-4 right-20 z-30 pointer-events-none">
          <h2 className="text-white font-bold text-lg mb-1 line-clamp-2 drop-shadow-lg">
            {currentVideo.title}
          </h2>
          {currentVideo.creatorName && (
            <div className="flex items-center gap-2 text-white/80 text-sm">
              <span>@{currentVideo.creatorName}</span>
            </div>
          )}
          <div className="flex items-center gap-3 text-white/60 text-xs mt-2">
            <span>{formatCount(currentVideo.viewsCount)} vistas</span>
            {!isImage && hasMultipleVariations && (
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

      {/* Next/Prev video preview hints during swipe */}
      {swipeDirection === 'up' && currentIndex < videos.length - 1 && (
        <div 
          className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-primary/20 to-transparent pointer-events-none transition-opacity duration-150 md:hidden"
          style={{ 
            height: Math.min(Math.abs(swipeOffset) * 2, 200),
            opacity: Math.min(Math.abs(swipeOffset) / 100, 0.8)
          }}
        >
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/80 text-xs flex flex-col items-center">
            <ChevronUp className="h-5 w-5 animate-bounce" />
            <span className="font-medium">Siguiente video</span>
          </div>
        </div>
      )}
      
      {swipeDirection === 'down' && currentIndex > 0 && (
        <div 
          className="absolute top-0 left-0 right-0 bg-gradient-to-b from-primary/20 to-transparent pointer-events-none transition-opacity duration-150 md:hidden"
          style={{ 
            height: Math.min(Math.abs(swipeOffset) * 2, 200),
            opacity: Math.min(Math.abs(swipeOffset) / 100, 0.8)
          }}
        >
          <div className="absolute top-4 left-1/2 -translate-x-1/2 text-white/80 text-xs flex flex-col items-center">
            <span className="font-medium">Video anterior</span>
            <ChevronDown className="h-5 w-5 animate-bounce" />
          </div>
        </div>
      )}

      {/* Swipe hint (mobile only) - only show when not swiping */}
      {!touchActive && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 text-white/40 text-xs flex flex-col items-center gap-1 md:hidden animate-pulse">
          <ChevronUp className="h-4 w-4" />
          <span>Desliza para navegar</span>
        </div>
      )}
    </div>
  );
}
