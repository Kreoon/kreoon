import { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, Heart, Eye, Share2, MessageSquare, ChevronLeft, ChevronRight, Pin, Settings, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useVideoPlayback } from '@/contexts/VideoPlayerContext';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { ParsedText } from '@/components/ui/parsed-text';
import { ContentSettingsDialog } from '@/components/content/ContentSettingsDialog';

export interface BunnyVideoCardProps {
  id: string;
  title: string;
  caption?: string | null;
  videoUrls: string[]; // Array of video URLs for variations
  thumbnailUrl?: string | null;
  viewsCount: number;
  likesCount: number;
  isLiked: boolean;
  isPinned?: boolean;
  creatorId?: string;
  creatorName?: string;
  isAdmin?: boolean;
  isOwner?: boolean;
  status?: string; // Content status for client approval
  onLike?: (e?: React.MouseEvent) => void;
  onView?: () => void;
  onShare?: () => void;
  onComment?: () => void;
  onPin?: () => void;
  onApprove?: () => void; // Client approval action
  onSettingsUpdate?: () => void;
  showActions?: boolean;
  onOpenFullscreen?: () => void;
  className?: string;
  hideControls?: boolean; // Hide play/pause/mute controls (for portfolio/auth pages)
  alwaysShowActions?: boolean; // Always show social actions without hover
}

function extractVideoId(url: string): string | null {
  if (!url) return null;
  const embedMatch = url.match(/iframe\.mediadelivery\.net\/embed\/\d+\/([a-f0-9-]+)/i);
  if (embedMatch) return embedMatch[1];

  const cdnMatch = url.match(/b-cdn\.net\/([a-f0-9-]+)/i);
  if (cdnMatch) return cdnMatch[1];

  return null;
}

function isValidImageUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  // Sometimes we stored an embed URL by mistake; that's not an image.
  if (url.includes('iframe.mediadelivery.net/embed')) return false;
  return true;
}

function getProxiedThumbnailUrl(params: { contentId: string; videoId: string }): string {
  const supabaseUrl = (supabase as any).supabaseUrl as string;
  return `${supabaseUrl}/functions/v1/bunny-thumbnail?content_id=${encodeURIComponent(params.contentId)}&video_id=${encodeURIComponent(params.videoId)}`;
}

function formatCount(count: number): string {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return count.toString();
}

export function BunnyVideoCard({
  id,
  title,
  caption,
  videoUrls,
  thumbnailUrl,
  viewsCount,
  likesCount,
  isLiked,
  isPinned = false,
  creatorId,
  creatorName,
  isAdmin = false,
  isOwner = false,
  status,
  onLike,
  onView,
  onShare,
  onComment,
  onPin,
  onApprove,
  onSettingsUpdate,
  showActions = true,
  onOpenFullscreen,
  className,
  hideControls = false,
  alwaysShowActions = false
}: BunnyVideoCardProps) {
  const navigate = useNavigate();
  const { isPlaying, play, stop } = useVideoPlayback(id);
  const [isMuted, setIsMuted] = useState(true);
  const [isInView, setIsInView] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [thumbnailLoading, setThumbnailLoading] = useState(false);
  const [thumbnailError, setThumbnailError] = useState(false);
  const [resolvedThumbnail, setResolvedThumbnail] = useState<string | null>(null);
  const [showFloatingHeart, setShowFloatingHeart] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const viewTracked = useRef(false);
  const viewTimerRef = useRef<NodeJS.Timeout | null>(null);

  const currentVideoUrl = videoUrls[currentIndex] || videoUrls[0];
  const hasMultiple = videoUrls.length > 1;

  // Load thumbnail for current video
  useEffect(() => {
    // Prefer a real image URL stored in DB
    if (isValidImageUrl(thumbnailUrl)) {
      setResolvedThumbnail(thumbnailUrl as string);
      setThumbnailLoading(false);
      setThumbnailError(false);
      return;
    }

    const videoId = extractVideoId(currentVideoUrl);
    if (!videoId) {
      setResolvedThumbnail(null);
      setThumbnailLoading(false);
      setThumbnailError(true);
      return;
    }

    // Use backend proxy so the thumbnail is always accessible in the browser
    setResolvedThumbnail(getProxiedThumbnailUrl({ contentId: id, videoId }));
    setThumbnailLoading(false);
    setThumbnailError(false);
  }, [currentVideoUrl, thumbnailUrl, id]);

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
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex(prev => (prev < videoUrls.length - 1 ? prev + 1 : 0));
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

  return (
    <div 
      ref={containerRef}
      className={cn(
        "group relative rounded-2xl overflow-hidden bg-card border border-border",
        "hover:border-primary/50 transition-all duration-300 hover:shadow-xl hover:shadow-primary/10",
        isPinned && "ring-2 ring-primary/50",
        className
      )}
    >
      {/* Pinned Badge */}
      {isPinned && (
        <div className="absolute top-2 left-2 z-30 bg-primary text-primary-foreground px-2 py-0.5 rounded-full flex items-center gap-1 text-xs font-medium">
          <Pin className="h-3 w-3" />
          <span>Fijado</span>
        </div>
      )}

      {/* Video Container - TikTok style */}
      <div className="relative aspect-[9/16] bg-muted" onDoubleClick={handleDoubleClick}>
        {/* Floating Heart Animation */}
        {showFloatingHeart && (
          <div className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none">
            <Heart 
              className="h-24 w-24 text-red-500 animate-ping" 
              fill="currentColor" 
            />
          </div>
        )}

        {!isPlaying ? (
          <>
            {/* Thumbnail with loading state */}
            {resolvedThumbnail ? (
              <img 
                src={resolvedThumbnail} 
                alt={title}
                className="w-full h-full object-cover"
                loading="eager"
                onError={() => {
                  setThumbnailError(true);
                  setResolvedThumbnail(null);
                }}
              />
            ) : thumbnailLoading ? (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-muted">
                <div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
              </div>
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-muted">
                <Play className="h-12 w-12 text-primary/50" />
              </div>
            )}
            
            {/* Play overlay - click to play */}
            <div 
              className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex items-center justify-center cursor-pointer"
              onClick={handlePlay}
            >
              <div className="p-4 rounded-full bg-white/20 backdrop-blur-sm hover:bg-white/30 transition-all duration-300 hover:scale-110">
                <Play className="h-10 w-10 text-white" fill="currentColor" />
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
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        setCurrentIndex(idx);
                      }}
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

            {/* Stats - bottom left */}
            <div className="absolute bottom-4 left-3 z-10">
              <div className="flex items-center gap-1.5 text-white text-xs">
                <Eye className="h-3.5 w-3.5" />
                <span>{formatCount(viewsCount)}</span>
              </div>
            </div>

            {/* Action buttons - TikTok style, always visible */}
            {showActions && (
              <div className="absolute bottom-4 right-3 flex flex-col gap-4 z-10">
                {onLike && (
                  <button
                    onClick={(e) => handleLikeWithAnimation(e)}
                    className="flex flex-col items-center gap-1"
                  >
                    <div className={cn(
                      "p-2.5 rounded-full transition-all duration-200 active:scale-90",
                      isLiked 
                        ? "text-red-500" 
                        : "text-white hover:text-red-400"
                    )}>
                      <Heart className="h-7 w-7" fill={isLiked ? "currentColor" : "none"} />
                    </div>
                    <span className="text-white text-xs font-medium">{formatCount(likesCount)}</span>
                  </button>
                )}
                {onComment && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onComment(); }}
                    className="flex flex-col items-center gap-1"
                  >
                    <div className="p-2.5 text-white hover:text-primary transition-colors active:scale-90">
                      <MessageSquare className="h-7 w-7" />
                    </div>
                  </button>
                )}
                {onShare && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onShare(); }}
                    className="flex flex-col items-center gap-1"
                  >
                    <div className="p-2.5 text-white hover:text-primary transition-colors active:scale-90">
                      <Share2 className="h-7 w-7" />
                    </div>
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

            {/* Pause button - only show pause, no volume control */}
            <div 
              className="absolute inset-0 cursor-pointer" 
              onClick={handleStop}
            />
            <div className="absolute top-3 left-3 z-20">
              <button
                onClick={handleStop}
                className="p-2.5 rounded-full bg-black/40 backdrop-blur-sm text-white hover:bg-black/60 transition-colors"
              >
                <Pause className="h-5 w-5" />
              </button>
            </div>

            {/* Action buttons while playing - TikTok style, always visible */}
            {showActions && (
              <div className="absolute bottom-4 right-3 flex flex-col gap-4 z-20">
                {onLike && (
                  <button
                    onClick={(e) => handleLikeWithAnimation(e)}
                    className="flex flex-col items-center gap-1"
                  >
                    <div className={cn(
                      "p-2.5 rounded-full transition-all duration-200 active:scale-90",
                      isLiked 
                        ? "text-red-500" 
                        : "text-white hover:text-red-400"
                    )}>
                      <Heart className="h-7 w-7" fill={isLiked ? "currentColor" : "none"} />
                    </div>
                    <span className="text-white text-xs font-medium">{formatCount(likesCount)}</span>
                  </button>
                )}
                {onComment && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onComment(); }}
                    className="flex flex-col items-center gap-1"
                  >
                    <div className="p-2.5 text-white hover:text-primary transition-colors active:scale-90">
                      <MessageSquare className="h-7 w-7" />
                    </div>
                  </button>
                )}
                {onShare && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onShare(); }}
                    className="flex flex-col items-center gap-1"
                  >
                    <div className="p-2.5 text-white hover:text-primary transition-colors active:scale-90">
                      <Share2 className="h-7 w-7" />
                    </div>
                  </button>
                )}
              </div>
            )}

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

      {/* Info section */}
      {(creatorName || caption || title) && (
        <div className="p-3 bg-card space-y-1">
          {creatorName && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (creatorId) {
                  navigate(`/p/${creatorId}`);
                }
              }}
              className="font-medium text-sm text-card-foreground hover:text-primary transition-colors truncate text-left block"
            >
              @{creatorName}
            </button>
          )}
          {(caption || title) && (
            <ParsedText 
              text={caption || title} 
              className="text-xs text-muted-foreground line-clamp-2" 
            />
          )}
          {isOwner && onPin && (
            <div className="flex items-center gap-3 mt-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onPin();
                }}
                className={cn(
                  "flex items-center gap-1 text-xs transition-colors",
                  isPinned ? "text-primary" : "text-muted-foreground hover:text-primary"
                )}
              >
                <Pin className="h-3 w-3" />
                <span>{isPinned ? 'Quitar fijado' : 'Fijar'}</span>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowSettings(true);
                }}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
              >
                <Settings className="h-3 w-3" />
                <span>Configuración</span>
              </button>
            </div>
          )}
          {/* Client approval button */}
          {onApprove && status === 'delivered' && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onApprove();
              }}
              className="flex items-center gap-1.5 mt-2 px-3 py-1.5 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg text-xs font-medium transition-colors"
            >
              <Check className="h-3.5 w-3.5" />
              <span>Aprobar contenido</span>
            </button>
          )}
          {status === 'approved' && (
            <div className="flex items-center gap-1.5 mt-2 text-green-400 text-xs">
              <Check className="h-3.5 w-3.5" />
              <span>Aprobado</span>
            </div>
          )}
        </div>
      )}

      {/* Settings Dialog */}
      {isOwner && (
        <ContentSettingsDialog
          open={showSettings}
          onOpenChange={setShowSettings}
          contentId={id}
          onSuccess={() => {
            onSettingsUpdate?.();
          }}
        />
      )}
    </div>
  );
}
