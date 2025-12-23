import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Heart, MessageCircle, Share2, Volume2, VolumeX, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, MoreVertical, Pencil, Trash2, Globe, Lock, Bookmark, Plus, Music2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

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
  mediaType?: 'video' | 'image';
  mediaUrl?: string;
  isPublic?: boolean;
  caption?: string;
}

interface FullscreenVideoViewerProps {
  videos: VideoItem[];
  initialIndex: number;
  onClose: () => void;
  onLike?: (id: string) => void;
  onView?: (id: string) => void;
  onShare?: (video: VideoItem) => void;
  onComment?: (id: string) => void;
  /** Legacy: use canManageVideo for per-item permissions */
  isOwner?: boolean;
  /** If provided, decides whether the three-dots menu is shown for the current item (owner/admin). */
  canManageVideo?: (video: VideoItem) => boolean;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  onToggleVisibility?: (id: string, isPublic: boolean) => void;
  onProfileClick?: (creatorId: string) => void;
  onFollow?: (creatorId: string) => void;
  isFollowing?: (creatorId: string) => boolean;
}

function formatCount(count: number): string {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return count.toString();
}

function getEmbedUrl(url: string): string {
  if (!url) return '';
  
  // Always start muted to allow autoplay
  if (url.includes('iframe.mediadelivery.net')) {
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}autoplay=true&muted=true&loop=true&preload=true`;
  }
  
  const cdnMatch = url.match(/vz-(\d+)\.b-cdn\.net\/([a-f0-9-]+)/i);
  if (cdnMatch) {
    const [, libraryId, videoId] = cdnMatch;
    return `https://iframe.mediadelivery.net/embed/${libraryId}/${videoId}?autoplay=true&muted=true&loop=true&preload=true`;
  }
  
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}autoplay=true&muted=true&loop=true`;
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
  canManageVideo,
  onEdit,
  onDelete,
  onToggleVisibility,
  onProfileClick,
  onFollow,
  isFollowing
}: FullscreenVideoViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [currentVariation, setCurrentVariation] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [swipeDirection, setSwipeDirection] = useState<'up' | 'down' | null>(null);
  const [showFullCaption, setShowFullCaption] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const touchStartY = useRef(0);
  const touchStartX = useRef(0);
  const viewTrackedRef = useRef<Set<string>>(new Set());

  const PLAYER_ORIGIN = 'https://iframe.mediadelivery.net';

  const postToPlayer = useCallback((payload: any) => {
    const win = iframeRef.current?.contentWindow;
    if (!win) return;

    // Bunny Stream embed uses Player.js compatible messages.
    // Commands are sent as objects like: { api: 'mute' } / { api: 'unmute' } / { api: 'volume', set: 1 }
    try {
      win.postMessage(payload, PLAYER_ORIGIN);
    } catch {
      // ignore
    }
    // Some implementations expect JSON strings
    try {
      win.postMessage(JSON.stringify(payload), PLAYER_ORIGIN);
    } catch {
      // ignore
    }
  }, []);

  const applyMuteStateToPlayer = useCallback(
    (muted: boolean) => {
      // Use Bunny Playback Control API / Player.js commands
      postToPlayer({ api: muted ? 'mute' : 'unmute' });
      postToPlayer({ api: 'volume', set: muted ? 0 : 1 });
    },
    [postToPlayer]
  );

  // Toggle mute using postMessage to avoid reloading the video
  const toggleMute = useCallback(() => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    applyMuteStateToPlayer(newMuted);
  }, [applyMuteStateToPlayer, isMuted]);

  const currentVideo = videos[currentIndex];
  const canManageCurrent = !!currentVideo && (canManageVideo ? canManageVideo(currentVideo) : !!isOwner);
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

  // Reset caption on video change
  useEffect(() => {
    setShowFullCaption(false);
  }, [currentIndex]);

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
      const maxOffset = 150;
      const dampedOffset = Math.sign(diffY) * Math.min(Math.abs(diffY) * 0.5, maxOffset);
      
      const canGoNext = currentIndex < videos.length - 1;
      const canGoPrev = currentIndex > 0;
      
      if ((diffY > 0 && canGoNext) || (diffY < 0 && canGoPrev)) {
        setSwipeOffset(dampedOffset);
        setSwipeDirection(diffY > 0 ? 'up' : 'down');
      } else {
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
    
    setSwipeOffset(0);
    setSwipeDirection(null);

    if (Math.abs(diffY) > Math.abs(diffX)) {
      if (Math.abs(diffY) > minSwipeDistance) {
        if (diffY > 0) {
          goToNext();
        } else {
          goToPrev();
        }
      }
    } else {
      if (Math.abs(diffX) > minSwipeDistance && hasMultipleVariations) {
        if (diffX > 0) {
          goToNextVariation();
        } else {
          goToPrevVariation();
        }
      }
    }
  };

  if (!currentVideo) return null;

  const displayCaption = currentVideo.caption || currentVideo.title;
  const shouldTruncateCaption = displayCaption.length > 80;

  return (
    <div 
      ref={containerRef}
      className="fixed inset-0 z-[100] bg-black flex flex-col touch-none"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Full screen video/content container */}
      <div 
        className={cn(
          "absolute inset-0",
          !touchActive && "transition-all duration-300 ease-out",
          isTransitioning && "opacity-90"
        )}
        style={{
          transform: `translateY(${-swipeOffset}px) scale(${1 - Math.abs(swipeOffset) * 0.0003})`,
        }}
      >
        {isImage ? (
          <div className="w-full h-full flex items-center justify-center">
            <img
              key={currentVideo.id}
              src={currentVideo.mediaUrl || currentVideo.thumbnailUrl || ''}
              alt={currentVideo.title}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <iframe
            ref={iframeRef}
            key={`${currentVideo.id}-${currentVariation}`}
            src={getEmbedUrl(currentVideoUrl)}
            className="w-full h-full border-0"
            allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
            onLoad={() => {
              // Re-apply desired mute state after the player loads
              setTimeout(() => applyMuteStateToPlayer(isMuted), 120);
            }}
          />
        )}

        {/* Touch overlay */}
        <div 
          className="absolute inset-0 z-10"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          style={{ touchAction: 'none' }}
        />

        {/* Top gradient for better visibility */}
        <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-black/40 to-transparent z-20 pointer-events-none" />
        
        {/* Bottom gradient for text readability */}
        <div className="absolute bottom-0 left-0 right-0 h-72 bg-gradient-to-t from-black/80 via-black/40 to-transparent z-20 pointer-events-none" />

        {/* Close button - minimal style */}
        <button
          onClick={onClose}
          className="absolute top-4 left-4 z-30 p-2 text-white/90 hover:text-white transition-colors"
        >
          <X className="h-7 w-7 drop-shadow-lg" />
        </button>

        {/* Top right controls */}
        <div className="absolute top-4 right-4 z-30 flex items-center gap-3">
          {!isImage && (
            <button
              onClick={toggleMute}
              className="p-2 text-white/90 hover:text-white transition-colors"
            >
              {isMuted ? <VolumeX className="h-6 w-6 drop-shadow-lg" /> : <Volume2 className="h-6 w-6 drop-shadow-lg" />}
            </button>
          )}

          {canManageCurrent && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="p-2 text-white/90 hover:text-white transition-colors">
                  <MoreVertical className="h-6 w-6 drop-shadow-lg" />
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

        {/* Variation indicator - top center */}
        {!isImage && hasMultipleVariations && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 flex gap-1.5">
            {currentVideo.videoUrls.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentVariation(idx)}
                className={cn(
                  "h-1 rounded-full transition-all duration-300",
                  idx === currentVariation 
                    ? "bg-white w-8" 
                    : "bg-white/40 w-4 hover:bg-white/60"
                )}
              />
            ))}
          </div>
        )}

        {/* Variation navigation arrows - only for videos with multiple variations */}
        {!isImage && hasMultipleVariations && (
          <>
            <button
              onClick={goToPrevVariation}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-30 p-2 text-white/70 hover:text-white transition-colors hidden md:block"
            >
              <ChevronLeft className="h-8 w-8 drop-shadow-lg" />
            </button>
            <button
              onClick={goToNextVariation}
              className="absolute right-20 top-1/2 -translate-y-1/2 z-30 p-2 text-white/70 hover:text-white transition-colors hidden md:block"
            >
              <ChevronRight className="h-8 w-8 drop-shadow-lg" />
            </button>
          </>
        )}

        {/* TikTok-style right sidebar actions */}
        <div className="absolute bottom-32 right-3 flex flex-col items-center gap-5 z-30">
          {/* Creator Avatar with follow button */}
          <div className="relative mb-2">
            <button
              onClick={() => {
                if (currentVideo.creatorId && onProfileClick) {
                  onClose();
                  onProfileClick(currentVideo.creatorId);
                }
              }}
              className="block"
            >
              <Avatar className="h-12 w-12 ring-2 ring-white shadow-lg cursor-pointer hover:ring-primary transition-all">
                <AvatarImage src={currentVideo.creatorAvatar} />
                <AvatarFallback className="bg-gradient-to-br from-pink-500 to-purple-600 text-white text-sm font-bold">
                  {currentVideo.creatorName?.charAt(0)?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
            </button>
            {!canManageCurrent && currentVideo.creatorId && onFollow && (
              <button 
                onClick={() => onFollow(currentVideo.creatorId!)}
                className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-primary flex items-center justify-center shadow-lg hover:bg-primary/90 transition-colors active:scale-90"
              >
                {isFollowing?.(currentVideo.creatorId) ? (
                  <span className="text-white text-xs font-bold">✓</span>
                ) : (
                  <Plus className="h-4 w-4 text-white" />
                )}
              </button>
            )}
          </div>

          {/* Like button */}
          {onLike && (
            <button
              onClick={() => onLike(currentVideo.id)}
              className="flex flex-col items-center gap-1 active:scale-90 transition-transform"
            >
              <div className={cn(
                "transition-all",
                currentVideo.isLiked && "animate-[pulse_0.3s_ease-in-out]"
              )}>
                <Heart 
                  className={cn(
                    "h-8 w-8 drop-shadow-lg transition-colors",
                    currentVideo.isLiked ? "text-red-500 fill-red-500" : "text-white"
                  )} 
                />
              </div>
              <span className="text-white text-xs font-semibold drop-shadow-lg">{formatCount(currentVideo.likesCount)}</span>
            </button>
          )}
          
          {/* Comment button */}
          {onComment && (
            <button
              onClick={() => onComment(currentVideo.id)}
              className="flex flex-col items-center gap-1 active:scale-90 transition-transform"
            >
              <MessageCircle className="h-8 w-8 text-white drop-shadow-lg" />
              <span className="text-white text-xs font-semibold drop-shadow-lg">0</span>
            </button>
          )}
          
          {/* Bookmark button */}
          <button
            className="flex flex-col items-center gap-1 active:scale-90 transition-transform"
          >
            <Bookmark className="h-8 w-8 text-white drop-shadow-lg" />
            <span className="text-white text-xs font-semibold drop-shadow-lg">{formatCount(currentVideo.viewsCount)}</span>
          </button>
          
          {/* Share button */}
          {onShare && (
            <button
              onClick={() => onShare(currentVideo)}
              className="flex flex-col items-center gap-1 active:scale-90 transition-transform"
            >
              <Share2 className="h-8 w-8 text-white drop-shadow-lg" />
              <span className="text-white text-xs font-semibold drop-shadow-lg">Compartir</span>
            </button>
          )}

          {/* Spinning music disc - TikTok style */}
          <div className="mt-2">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center animate-[spin_3s_linear_infinite] shadow-lg border-2 border-gray-700">
              <div className="w-4 h-4 rounded-full bg-gradient-to-br from-gray-600 to-gray-800" />
            </div>
          </div>
        </div>

        {/* Bottom left - Creator info and caption (TikTok style) */}
        <div className="absolute bottom-6 left-4 right-20 z-30">
          {/* Username */}
          <div className="flex items-center gap-2 mb-2">
            <button 
              onClick={() => {
                if (currentVideo.creatorId && onProfileClick) {
                  onClose();
                  onProfileClick(currentVideo.creatorId);
                }
              }}
              className="text-white font-bold text-base drop-shadow-lg hover:underline transition-all pointer-events-auto"
            >
              @{currentVideo.creatorName || 'usuario'}
            </button>
            {/* Verified badge could go here */}
          </div>

          {/* Caption with "...more" */}
          <div className="pointer-events-auto">
            {showFullCaption ? (
              <p 
                className="text-white text-sm drop-shadow-lg cursor-pointer"
                onClick={() => setShowFullCaption(false)}
              >
                {displayCaption}
              </p>
            ) : (
              <p className="text-white text-sm drop-shadow-lg">
                {shouldTruncateCaption ? (
                  <>
                    {displayCaption.slice(0, 80)}
                    <button 
                      onClick={() => setShowFullCaption(true)}
                      className="text-white/70 ml-1 font-medium"
                    >
                      ...más
                    </button>
                  </>
                ) : (
                  displayCaption
                )}
              </p>
            )}
          </div>

          {/* Music/Sound info - TikTok style */}
          {!isImage && (
            <div className="flex items-center gap-2 mt-3">
              <Music2 className="h-4 w-4 text-white" />
              <div className="overflow-hidden max-w-[200px]">
                <p className="text-white text-xs whitespace-nowrap animate-[marquee_10s_linear_infinite]">
                  Sonido original - {currentVideo.creatorName || 'usuario'}
                </p>
              </div>
            </div>
          )}

          {/* Variation count */}
          {hasMultipleVariations && (
            <div className="mt-2 inline-flex items-center gap-1 px-2 py-1 bg-white/10 backdrop-blur-sm rounded-full">
              <span className="text-white/90 text-xs">{currentVariation + 1}/{currentVideo.videoUrls.length} variaciones</span>
            </div>
          )}
        </div>

        {/* Video navigation hints - desktop only */}
        <div className="absolute right-20 top-1/2 -translate-y-1/2 flex flex-col gap-3 z-30 hidden md:flex">
          <button
            onClick={goToPrev}
            disabled={currentIndex === 0}
            className={cn(
              "p-2 text-white/70 transition-all",
              currentIndex === 0 ? "opacity-20 cursor-not-allowed" : "hover:text-white hover:scale-110"
            )}
          >
            <ChevronUp className="h-8 w-8 drop-shadow-lg" />
          </button>
          <button
            onClick={goToNext}
            disabled={currentIndex === videos.length - 1}
            className={cn(
              "p-2 text-white/70 transition-all",
              currentIndex === videos.length - 1 ? "opacity-20 cursor-not-allowed" : "hover:text-white hover:scale-110"
            )}
          >
            <ChevronDown className="h-8 w-8 drop-shadow-lg" />
          </button>
        </div>

        {/* Progress bar */}
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/20 z-30">
          <div 
            className="h-full bg-white transition-all duration-300"
            style={{ width: `${((currentIndex + 1) / videos.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Swipe hints during drag */}
      {swipeDirection === 'up' && currentIndex < videos.length - 1 && (
        <div 
          className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-primary/30 to-transparent pointer-events-none transition-opacity duration-150 z-40 md:hidden"
          style={{ 
            height: Math.min(Math.abs(swipeOffset) * 2, 200),
            opacity: Math.min(Math.abs(swipeOffset) / 80, 1)
          }}
        >
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white text-sm flex flex-col items-center">
            <ChevronUp className="h-6 w-6 animate-bounce" />
          </div>
        </div>
      )}
      
      {swipeDirection === 'down' && currentIndex > 0 && (
        <div 
          className="absolute top-0 left-0 right-0 bg-gradient-to-b from-primary/30 to-transparent pointer-events-none transition-opacity duration-150 z-40 md:hidden"
          style={{ 
            height: Math.min(Math.abs(swipeOffset) * 2, 200),
            opacity: Math.min(Math.abs(swipeOffset) / 80, 1)
          }}
        >
          <div className="absolute top-8 left-1/2 -translate-x-1/2 text-white text-sm flex flex-col items-center">
            <ChevronDown className="h-6 w-6 animate-bounce" />
          </div>
        </div>
      )}
    </div>
  );
}