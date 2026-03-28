import { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Heart, Eye, Share2, MessageCircle, ChevronLeft, ChevronRight, Pin, Settings, Check, Video, Circle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useVideoPlayback } from '@/contexts/VideoPlayerContext';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { ContentSettingsDialog } from '@/components/content/ContentSettingsDialog';
import { Drawer, DrawerContent } from '@/components/ui/drawer';
import { CommentsSection } from './CommentsSection';
import { PortfolioCommentsSection } from './PortfolioCommentsSection';
import { ExpandableText } from '@/components/ui/expandable-text';
import { SocialStyleVideoPlayer } from '@/components/video/SocialStyleVideoPlayer';

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
  const [currentIndex, setCurrentIndex] = useState(0);
  const [thumbnailLoading, setThumbnailLoading] = useState(false);
  const [thumbnailError, setThumbnailError] = useState(false);
  const [resolvedThumbnail, setResolvedThumbnail] = useState<string | null>(null);
  const [showFloatingHeart, setShowFloatingHeart] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const viewTracked = useRef(false);
  const viewTimerRef = useRef<NodeJS.Timeout | null>(null);

  const currentVideoUrl = videoUrls[currentIndex] || videoUrls[0];
  const hasMultiple = videoUrls.length > 1;

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
        "group relative rounded-sm overflow-hidden bg-card border border-border",
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
      <div className="relative aspect-[9/16] bg-black" onDoubleClick={handleDoubleClick}>
        {/* Floating Heart Animation */}
        {showFloatingHeart && (
          <div className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none">
            <Heart 
              className="h-24 w-24 text-red-500 animate-ping" 
              fill="currentColor" 
            />
          </div>
        )}

        {/* Social Style Video Player */}
        <SocialStyleVideoPlayer
          src={currentVideoUrl}
          poster={resolvedThumbnail}
          showControls={true}
          autoPlay={false}
          onPlay={play}
          onPause={stop}
        />

        {/* Carousel navigation */}
        {hasMultiple && (
          <>
            <button
              onClick={handlePrev}
              className="absolute left-2 top-1/2 -translate-y-1/2 z-30 p-2 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors opacity-0 group-hover:opacity-100"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={handleNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 z-30 p-2 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors opacity-0 group-hover:opacity-100"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
            
            {/* Variation indicator */}
            <div className="absolute top-3 left-3 z-30 bg-black/60 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-full">
              {currentIndex + 1}/{videoUrls.length}
            </div>
          </>
        )}
      </div>

      {/* Info section below video */}
      <div className="p-3 space-y-2">
        {/* Creator & Title */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            {creatorName && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (creatorId) {
                    navigate(`/p/${creatorId}`);
                  }
                }}
                className="text-xs font-medium text-muted-foreground hover:text-primary transition-colors truncate block mb-1"
              >
                @{creatorName.replace(/\s+/g, '').toLowerCase()}
              </button>
            )}
            {(caption || title) && (
              <p className="text-sm font-medium line-clamp-2">{caption || title}</p>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1">
            {onLike && (
              <button
                onClick={(e) => handleLikeWithAnimation(e)}
                className={cn(
                  "p-2 rounded-full transition-colors",
                  isLiked 
                    ? "bg-red-500/10 text-red-500" 
                    : "bg-muted hover:bg-muted/80 text-muted-foreground"
                )}
              >
                <Heart className="h-4 w-4" fill={isLiked ? "currentColor" : "none"} />
              </button>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); setShowComments(true); }}
              className="p-2 rounded-full bg-muted hover:bg-muted/80 text-muted-foreground transition-colors"
            >
              <MessageCircle className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Eye className="h-3 w-3" />
            {formatCount(viewsCount)}
          </span>
          <span className="flex items-center gap-1">
            <Heart className="h-3 w-3" />
            {formatCount(likesCount)}
          </span>
          {commentsCount > 0 && (
            <span className="flex items-center gap-1">
              <MessageCircle className="h-3 w-3" />
              {formatCount(commentsCount)}
            </span>
          )}
        </div>
        
        {/* Owner controls */}
        {isOwner && (
          <div className="flex items-center gap-3 pt-1">
            {onPin && (
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
                <span>{isPinned ? 'Quitar' : 'Fijar'}</span>
              </button>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowSettings(true);
              }}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
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
            className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/20 hover:bg-green-500/30 text-green-500 rounded-sm text-xs font-medium transition-colors"
          >
            <Check className="h-3.5 w-3.5" />
            <span>Aprobar</span>
          </button>
        )}
        {status === 'approved' && (
          <div className="flex items-center gap-1.5 text-green-500 text-xs">
            <Check className="h-3.5 w-3.5" />
            <span>Aprobado</span>
          </div>
        )}
        
        {/* Creator status change buttons */}
        {isCreatorOwner && onCreatorStatusChange && (
          <div className="pt-1">
            {status === 'assigned' && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onCreatorStatusChange('recording');
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-500 rounded-sm text-xs font-medium transition-colors"
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
                className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/20 hover:bg-green-500/30 text-green-500 rounded-sm text-xs font-medium transition-colors"
              >
                <Video className="h-3.5 w-3.5" />
                <span>Marcar como Grabado</span>
              </button>
            )}
            {status === 'recorded' && (
              <div className="flex items-center gap-1.5 text-green-500 text-xs">
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
