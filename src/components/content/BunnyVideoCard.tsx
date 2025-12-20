import { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, Volume2, VolumeX, Heart, Eye, Share2, MessageSquare, ChevronLeft, ChevronRight, Maximize2 } from 'lucide-react';
import { useVideoPlayback } from '@/contexts/VideoPlayerContext';
import { cn } from '@/lib/utils';

export interface BunnyVideoCardProps {
  id: string;
  title: string;
  videoUrls: string[]; // Array of video URLs for variations
  thumbnailUrl?: string | null;
  viewsCount: number;
  likesCount: number;
  isLiked: boolean;
  clientName?: string;
  creatorName?: string;
  isAdmin?: boolean;
  onLike?: (e?: React.MouseEvent) => void;
  onView?: () => void;
  onShare?: () => void;
  onComment?: () => void;
  showActions?: boolean;
  onOpenFullscreen?: () => void;
  className?: string;
}

// Extract Bunny video ID and generate thumbnail
function getBunnyThumbnail(url: string): string | null {
  if (!url) return null;
  
  // Bunny embed URL format: https://iframe.mediadelivery.net/embed/{libraryId}/{videoId}
  const embedMatch = url.match(/iframe\.mediadelivery\.net\/embed\/(\d+)\/([a-f0-9-]+)/i);
  if (embedMatch) {
    const [, libraryId, videoId] = embedMatch;
    return `https://vz-${libraryId}.b-cdn.net/${videoId}/thumbnail.jpg`;
  }
  
  // Direct Bunny CDN URL: https://vz-{libraryId}.b-cdn.net/{videoId}/...
  const cdnMatch = url.match(/vz-(\d+)\.b-cdn\.net\/([a-f0-9-]+)/i);
  if (cdnMatch) {
    const [, libraryId, videoId] = cdnMatch;
    return `https://vz-${libraryId}.b-cdn.net/${videoId}/thumbnail.jpg`;
  }
  
  return null;
}

function formatCount(count: number): string {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return count.toString();
}

export function BunnyVideoCard({
  id,
  title,
  videoUrls,
  thumbnailUrl,
  viewsCount,
  likesCount,
  isLiked,
  clientName,
  creatorName,
  isAdmin = false,
  onLike,
  onView,
  onShare,
  onComment,
  showActions = true,
  onOpenFullscreen,
  className
}: BunnyVideoCardProps) {
  const { isPlaying, play, stop } = useVideoPlayback(id);
  const [isMuted, setIsMuted] = useState(true);
  const [isInView, setIsInView] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [thumbnailLoading, setThumbnailLoading] = useState(true);
  const [thumbnailError, setThumbnailError] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const viewTracked = useRef(false);
  const viewTimerRef = useRef<NodeJS.Timeout | null>(null);

  const currentVideoUrl = videoUrls[currentIndex] || videoUrls[0];
  const hasMultiple = videoUrls.length > 1;

  // Generate thumbnail - prioritize provided, then try to extract from current Bunny URL
  const generatedThumbnail = getBunnyThumbnail(currentVideoUrl);
  const thumbnail = thumbnailError ? null : (thumbnailUrl || generatedThumbnail);

  // Reset loading state when thumbnail changes
  useEffect(() => {
    if (thumbnail) {
      setThumbnailLoading(true);
    }
  }, [thumbnail]);

  // Intersection Observer for scroll-based autoplay
  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        const visible = entry.isIntersecting && entry.intersectionRatio > 0.6;
        setIsInView(visible);
        
        // Auto-play on mobile when scrolling into view
        if (visible && window.innerWidth < 768) {
          play();
        } else if (!visible && isPlaying) {
          stop();
        }
      },
      { threshold: [0, 0.6, 1] }
    );

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [play, stop, isPlaying]);

  // Track view after 3 seconds of playback
  useEffect(() => {
    if (isPlaying && !viewTracked.current && onView) {
      viewTimerRef.current = setTimeout(() => {
        onView();
        viewTracked.current = true;
      }, 3000);
    }

    return () => {
      if (viewTimerRef.current) {
        clearTimeout(viewTimerRef.current);
      }
    };
  }, [isPlaying, onView]);

  // Reset view tracking when stopped
  useEffect(() => {
    if (!isPlaying) {
      viewTracked.current = false;
      if (viewTimerRef.current) {
        clearTimeout(viewTimerRef.current);
      }
    }
  }, [isPlaying]);

  // Build Bunny embed URL with autoplay params
  const getEmbedUrl = useCallback((url: string): string => {
    if (!url) return '';
    
    // Already has embed format
    if (url.includes('iframe.mediadelivery.net')) {
      const separator = url.includes('?') ? '&' : '?';
      return `${url}${separator}autoplay=true&muted=${isMuted}&loop=true&preload=true`;
    }
    
    // Extract video ID from CDN URL and convert to embed
    const cdnMatch = url.match(/vz-(\d+)\.b-cdn\.net\/([a-f0-9-]+)/i);
    if (cdnMatch) {
      const [, libraryId, videoId] = cdnMatch;
      return `https://iframe.mediadelivery.net/embed/${libraryId}/${videoId}?autoplay=true&muted=${isMuted}&loop=true&preload=true`;
    }
    
    // Fallback - return as-is with params
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}autoplay=true&muted=${isMuted}&loop=true`;
  }, [isMuted]);

  const handlePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    play();
  };

  const handleStop = (e: React.MouseEvent) => {
    e.stopPropagation();
    stop();
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMuted(!isMuted);
  };

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex(prev => (prev > 0 ? prev - 1 : videoUrls.length - 1));
    setThumbnailError(false);
    setThumbnailLoading(true);
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex(prev => (prev < videoUrls.length - 1 ? prev + 1 : 0));
    setThumbnailError(false);
    setThumbnailLoading(true);
  };

  return (
    <div 
      ref={containerRef}
      className={cn(
        "group relative rounded-2xl overflow-hidden bg-card border border-border",
        "hover:border-primary/50 transition-all duration-300 hover:shadow-xl hover:shadow-primary/10",
        className
      )}
    >
      {/* Video Container - Instagram-like vertical */}
      <div className="relative aspect-[9/16] bg-muted">
        {!isPlaying ? (
          <>
            {/* Thumbnail with loading state */}
            {thumbnail ? (
              <>
                {thumbnailLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary/20 to-muted z-10">
                    <div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
                  </div>
                )}
                <img 
                  src={thumbnail} 
                  alt={title}
                  className={cn(
                    "w-full h-full object-cover transition-opacity duration-300",
                    thumbnailLoading ? "opacity-0" : "opacity-100"
                  )}
                  loading="lazy"
                  onLoad={() => setThumbnailLoading(false)}
                  onError={() => { setThumbnailError(true); setThumbnailLoading(false); }}
                />
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-muted">
                <Play className="h-12 w-12 text-primary/50" />
              </div>
            )}
            
            {/* Play overlay */}
            <div 
              className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex items-center justify-center cursor-pointer"
              onClick={handlePlay}
            >
              <div className="p-4 rounded-full bg-primary/90 backdrop-blur-sm hover:bg-primary transition-all duration-300 hover:scale-110 shadow-lg">
                <Play className="h-8 w-8 text-primary-foreground" fill="currentColor" />
              </div>
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
                <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-10 flex gap-1.5">
                  {videoUrls.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={(e) => { e.stopPropagation(); setCurrentIndex(idx); setThumbnailError(false); }}
                      className={cn(
                        "w-2 h-2 rounded-full transition-all",
                        idx === currentIndex 
                          ? "bg-white w-4" 
                          : "bg-white/50 hover:bg-white/80"
                      )}
                    />
                  ))}
                </div>
              </>
            )}

            {/* Stats */}
            <div className="absolute bottom-16 left-3 flex items-center gap-2 z-10">
              <div className="flex items-center gap-1.5 text-white text-sm bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-full">
                <Eye className="h-4 w-4" />
                <span className="font-medium">{formatCount(viewsCount)}</span>
              </div>
              <div className="flex items-center gap-1.5 text-white text-sm bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-full">
                <Heart className="h-4 w-4" />
                <span className="font-medium">{formatCount(likesCount)}</span>
              </div>
            </div>

            {/* Action buttons */}
            {showActions && (
              <div className="absolute bottom-16 right-3 flex flex-col gap-3 z-10">
                {onOpenFullscreen && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onOpenFullscreen(); }}
                    className="p-3 rounded-full bg-black/60 backdrop-blur-sm text-white hover:bg-primary/80 hover:text-primary-foreground transition-all duration-200 shadow-lg active:scale-90"
                  >
                    <Maximize2 className="h-6 w-6" />
                  </button>
                )}
                {onLike && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onLike(e); }}
                    className={cn(
                      "p-3 rounded-full transition-all duration-200 shadow-lg active:scale-90",
                      isLiked 
                        ? "bg-red-500 text-white scale-110" 
                        : "bg-black/60 backdrop-blur-sm text-white hover:bg-red-500/80 hover:scale-110"
                    )}
                  >
                    <Heart className="h-6 w-6" fill={isLiked ? "currentColor" : "none"} />
                  </button>
                )}
                {onComment && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onComment(); }}
                    className="p-3 rounded-full bg-black/60 backdrop-blur-sm text-white hover:bg-primary/80 hover:text-primary-foreground transition-all duration-200 shadow-lg active:scale-90"
                  >
                    <MessageSquare className="h-6 w-6" />
                  </button>
                )}
                {onShare && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onShare(); }}
                    className="p-3 rounded-full bg-black/60 backdrop-blur-sm text-white hover:bg-primary/80 hover:text-primary-foreground transition-all duration-200 shadow-lg active:scale-90"
                  >
                    <Share2 className="h-6 w-6" />
                  </button>
                )}
              </div>
            )}
          </>
        ) : (
          <>
            {/* Bunny iframe player */}
            <iframe
              ref={iframeRef}
              src={getEmbedUrl(currentVideoUrl)}
              className="w-full h-full border-0"
              allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
              allowFullScreen={isAdmin}
              loading="lazy"
            />

            {/* Controls overlay */}
            <div className="absolute top-3 right-3 flex gap-2 z-20">
              <button
                onClick={handleStop}
                className="p-2.5 rounded-full bg-black/60 backdrop-blur-sm text-white hover:bg-black/80 transition-colors"
              >
                <Pause className="h-5 w-5" />
              </button>
              <button
                onClick={toggleMute}
                className="p-2.5 rounded-full bg-black/60 backdrop-blur-sm text-white hover:bg-black/80 transition-colors"
              >
                {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
              </button>
            </div>

            {/* Carousel navigation while playing */}
            {hasMultiple && (
              <>
                <button
                  onClick={handlePrev}
                  className="absolute left-2 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  onClick={handleNext}
                  className="absolute right-2 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
                
                {/* Variation indicator while playing */}
                <div className="absolute top-3 left-3 z-20 bg-black/60 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-full">
                  {currentIndex + 1}/{videoUrls.length}
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* Info */}
      <div className="p-4 bg-card">
        <h3 className="font-semibold text-sm text-card-foreground line-clamp-2 mb-2">
          {title}
        </h3>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {clientName && (
            <span className="text-primary">{clientName}</span>
          )}
          {clientName && creatorName && <span>•</span>}
          {creatorName && (
            <span>{creatorName}</span>
          )}
          {hasMultiple && (
            <>
              <span>•</span>
              <span className="text-primary">{videoUrls.length} variaciones</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
