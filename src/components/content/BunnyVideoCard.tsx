import { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Heart, Eye, Share2, MessageCircle, ChevronLeft, ChevronRight, Pin, Settings, Check, Video, Circle, Volume2, VolumeX } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useVideoPlayback } from '@/contexts/VideoPlayerContext';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { ContentSettingsDialog } from '@/components/content/ContentSettingsDialog';
import { Drawer, DrawerContent } from '@/components/ui/drawer';
import { CommentsSection } from './CommentsSection';
import { PortfolioCommentsSection } from './PortfolioCommentsSection';

export interface BunnyVideoCardProps {
  id: string;
  title: string;
  caption?: string | null;
  videoUrls: string[]; // Array of video URLs for variations
  thumbnailUrl?: string | null;
  viewsCount: number;
  likesCount: number;
  commentsCount?: number;
  isLiked: boolean;
  isPinned?: boolean;
  creatorId?: string;
  creatorName?: string;
  isAdmin?: boolean;
  isOwner?: boolean;
  isCreatorOwner?: boolean; // Is the current user the creator of this content
  status?: string; // Content status for client approval
  onLike?: (e?: React.MouseEvent) => void;
  onView?: () => void;
  onShare?: () => void;
  onPin?: () => void;
  onApprove?: () => void; // Client approval action
  onCreatorStatusChange?: (newStatus: 'recording' | 'recorded') => void; // Creator status change
  onSettingsUpdate?: () => void;
  showActions?: boolean;
  onOpenFullscreen?: () => void;
  className?: string;
  hideControls?: boolean; // Hide play/pause/mute controls (for portfolio/auth pages)
  alwaysShowActions?: boolean; // Always show social actions without hover
  isPortfolioPost?: boolean; // For comments system
}

function extractVideoId(url: string): string | null {
  if (!url) return null;
  const embedMatch = url.match(/iframe\.mediadelivery\.net\/embed\/\d+\/([a-f0-9-]+)/i);
  if (embedMatch) return embedMatch[1];

  const cdnMatch = url.match(/b-cdn\.net\/([a-f0-9-]+)/i);
  if (cdnMatch) return cdnMatch[1];

  return null;
}

// Check if URL is a Bunny video (embed or CDN) vs a native video file
function isBunnyVideoUrl(url: string): boolean {
  if (!url) return false;
  return url.includes('iframe.mediadelivery.net') || url.includes('b-cdn.net');
}

// Check if URL is a direct video file (mp4, mov, webm, etc.)
function isNativeVideoUrl(url: string): boolean {
  if (!url) return false;
  // Check for common video extensions or Supabase storage URLs
  const videoExtensions = ['.mp4', '.mov', '.webm', '.m4v', '.avi', '.mkv'];
  const lowerUrl = url.toLowerCase();
  return videoExtensions.some(ext => lowerUrl.includes(ext)) || 
         (url.includes('supabase.co/storage') && !url.includes('.jpg') && !url.includes('.png') && !url.includes('.jpeg'));
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
  commentsCount = 0,
  isLiked,
  isPinned = false,
  creatorId,
  creatorName,
  isAdmin = false,
  isOwner = false,
  isCreatorOwner = false,
  status,
  onLike,
  onView,
  onShare,
  onPin,
  onApprove,
  onCreatorStatusChange,
  onSettingsUpdate,
  showActions = true,
  onOpenFullscreen,
  className,
  hideControls = false,
  alwaysShowActions = false,
  isPortfolioPost = false
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
  const [showComments, setShowComments] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const viewTracked = useRef(false);
  const viewTimerRef = useRef<NodeJS.Timeout | null>(null);

  const currentVideoUrl = videoUrls[currentIndex] || videoUrls[0];
  const hasMultiple = videoUrls.length > 1;

  // Determine if current video is a native video file (not Bunny)
  const isNativeVideo = isNativeVideoUrl(currentVideoUrl) && !isBunnyVideoUrl(currentVideoUrl);

  // Load thumbnail for current video
  useEffect(() => {
    // Prefer a real image URL stored in DB
    if (isValidImageUrl(thumbnailUrl)) {
      setResolvedThumbnail(thumbnailUrl as string);
      setThumbnailLoading(false);
      setThumbnailError(false);
      return;
    }

    // Check if it's a Bunny video URL
    const videoId = extractVideoId(currentVideoUrl);
    if (videoId) {
      // Use backend proxy so the thumbnail is always accessible in the browser
      setResolvedThumbnail(getProxiedThumbnailUrl({ contentId: id, videoId }));
      setThumbnailLoading(false);
      setThumbnailError(false);
      return;
    }

    // For non-Bunny videos (like portfolio uploads), try to generate a thumbnail from the video
    if (currentVideoUrl && !currentVideoUrl.includes('iframe.mediadelivery.net')) {
      setThumbnailLoading(true);
      generateVideoThumbnail(currentVideoUrl)
        .then(thumbUrl => {
          if (thumbUrl) {
            setResolvedThumbnail(thumbUrl);
            setThumbnailError(false);
          } else {
            setThumbnailError(true);
          }
        })
        .catch(() => {
          setThumbnailError(true);
        })
        .finally(() => {
          setThumbnailLoading(false);
        });
      return;
    }

    // No thumbnail available
    setResolvedThumbnail(null);
    setThumbnailLoading(false);
    setThumbnailError(true);
  }, [currentVideoUrl, thumbnailUrl, id]);

  // Function to generate thumbnail from video
  async function generateVideoThumbnail(videoUrl: string): Promise<string | null> {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.crossOrigin = 'anonymous';
      video.muted = true;
      video.preload = 'metadata';
      
      video.onloadedmetadata = () => {
        // Seek to 1 second or 10% of video duration
        video.currentTime = Math.min(1, video.duration * 0.1);
      };
      
      video.onseeked = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
            resolve(dataUrl);
          } else {
            resolve(null);
          }
        } catch {
          resolve(null);
        }
        video.remove();
      };
      
      video.onerror = () => {
        resolve(null);
        video.remove();
      };
      
      // Timeout after 5 seconds
      setTimeout(() => {
        resolve(null);
        video.remove();
      }, 5000);
      
      video.src = videoUrl;
      video.load();
    });
  }

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
      // Pause native video when stopping
      if (videoRef.current) {
        videoRef.current.pause();
      }
    }
  }, [isPlaying]);

  // Build Bunny embed URL with autoplay params
  const getEmbedUrl = useCallback((url: string): string => {
    if (!url) return '';

    // Already has embed format
    if (url.includes('iframe.mediadelivery.net')) {
      const separator = url.includes('?') ? '&' : '?';
      return `${url}${separator}autoplay=true&muted=${isMuted}&loop=true&preload=true&controls=false`;
    }

    // Extract video ID from CDN URL and convert to embed
    const cdnMatch = url.match(/vz-(\d+)\.b-cdn\.net\/([a-f0-9-]+)/i);
    if (cdnMatch) {
      const [, libraryId, videoId] = cdnMatch;
      return `https://iframe.mediadelivery.net/embed/${libraryId}/${videoId}?autoplay=true&muted=${isMuted}&loop=true&preload=true&controls=false`;
    }

    // Fallback - return as-is with params
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}autoplay=true&muted=${isMuted}&loop=true&controls=false`;
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
              <div className="w-full h-full flex items-center justify-center bg-black">
                <div className="w-8 h-8 border-3 border-white/30 border-t-white/70 rounded-full animate-spin" />
              </div>
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-black">
                <div className="p-3 rounded-full bg-white/15">
                  <Play className="h-8 w-8 text-white/50" fill="currentColor" />
                </div>
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
                {/* Comments button */}
                <button
                  onClick={(e) => { e.stopPropagation(); setShowComments(true); }}
                  className="flex flex-col items-center gap-1"
                >
                  <div className="p-2.5 text-white hover:text-primary transition-colors active:scale-90">
                    <MessageCircle className="h-7 w-7" />
                  </div>
                  <span className="text-white text-xs font-medium">{formatCount(commentsCount)}</span>
                </button>
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
            {/* Video Player - Native video or Bunny iframe */}
            {isNativeVideo ? (
              // Native video player for mp4, mov, webm, etc.
              <video
                ref={videoRef}
                src={currentVideoUrl}
                className="w-full h-full object-cover"
                autoPlay
                loop
                muted={isMuted}
                playsInline
                onClick={handleStop}
              />
            ) : (
              // Bunny iframe player
              <iframe
                ref={iframeRef}
                src={getEmbedUrl(currentVideoUrl)}
                className="w-full h-full border-0"
                allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
                allowFullScreen={isAdmin}
                loading="lazy"
              />
            )}

            {/* Tap anywhere to pause/stop (no native controls) - only for iframe */}
            {!isNativeVideo && (
              <div 
                className="absolute inset-0 cursor-pointer" 
                onClick={handleStop}
              />
            )}

            {/* Volume toggle (only visible control) */}
            <div className="absolute top-3 right-3 z-20">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMuted((v) => {
                    const newMuted = !v;
                    // Sync with native video element if present
                    if (videoRef.current) {
                      videoRef.current.muted = newMuted;
                    }
                    return newMuted;
                  });
                }}
                className="p-2.5 rounded-full bg-black/40 backdrop-blur-sm text-white hover:bg-black/60 transition-colors"
              >
                {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
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
                {/* Comments button */}
                <button
                  onClick={(e) => { e.stopPropagation(); setShowComments(true); }}
                  className="flex flex-col items-center gap-1"
                >
                  <div className="p-2.5 text-white hover:text-primary transition-colors active:scale-90">
                    <MessageCircle className="h-7 w-7" />
                  </div>
                  <span className="text-white text-xs font-medium">{formatCount(commentsCount)}</span>
                </button>
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

      {/* Caption/Creator info - TikTok style overlay */}
      <div className="p-3 bg-gradient-to-t from-black/80 to-transparent absolute bottom-0 left-0 right-0 z-5">
        {creatorName && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (creatorId) {
                navigate(`/p/${creatorId}`);
              }
            }}
            className="text-white text-sm font-semibold hover:underline truncate block"
          >
            @{creatorName.replace(/\s+/g, '').toLowerCase()}
          </button>
        )}
        {(caption || title) && (
          <p className="text-white/80 text-xs line-clamp-2 mt-0.5">{caption || title}</p>
        )}
        
        {/* Owner controls */}
        {isOwner && (
          <div className="flex items-center gap-3 mt-2">
            {onPin && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onPin();
                }}
                className={cn(
                  "flex items-center gap-1 text-xs transition-colors",
                  isPinned ? "text-primary" : "text-white/60 hover:text-primary"
                )}
              >
                <Pin className="h-3 w-3" />
                <span>{isPinned ? 'Quitar' : 'Fijar'}</span>
              </button>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowSettings(true);
              }}
              className="flex items-center gap-1 text-xs text-white/60 hover:text-primary transition-colors"
            >
              <Settings className="h-3 w-3" />
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
            <span>Aprobar</span>
          </button>
        )}
        {status === 'approved' && (
          <div className="flex items-center gap-1.5 mt-2 text-green-400 text-xs">
            <Check className="h-3.5 w-3.5" />
            <span>Aprobado</span>
          </div>
        )}
        
        {/* Creator status change buttons */}
        {isCreatorOwner && onCreatorStatusChange && (
          <div className="mt-2">
            {status === 'assigned' && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onCreatorStatusChange('recording');
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg text-xs font-medium transition-colors"
              >
                <Circle className="h-3.5 w-3.5 fill-current animate-pulse" />
                <span>Iniciar Grabación</span>
              </button>
            )}
            {status === 'recording' && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onCreatorStatusChange('recorded');
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg text-xs font-medium transition-colors"
              >
                <Video className="h-3.5 w-3.5" />
                <span>Marcar como Grabado</span>
              </button>
            )}
            {status === 'recorded' && (
              <div className="flex items-center gap-1.5 text-green-400 text-xs">
                <Video className="h-3.5 w-3.5" />
                <span>Grabado</span>
              </div>
            )}
          </div>
        )}
      </div>

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

      {/* Comments Drawer */}
      <Drawer open={showComments} onOpenChange={setShowComments}>
        <DrawerContent className="h-[70vh] bg-zinc-900 border-none">
          {isPortfolioPost ? (
            <PortfolioCommentsSection
              postId={id}
              isOpen={showComments}
              onClose={() => setShowComments(false)}
            />
          ) : (
            <CommentsSection
              contentId={id}
              isOpen={showComments}
              onClose={() => setShowComments(false)}
            />
          )}
        </DrawerContent>
      </Drawer>
    </div>
  );
}
