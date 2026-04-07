import { useState, useRef, useEffect, useCallback, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Drawer, DrawerContent, DrawerTrigger } from '@/components/ui/drawer';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  X,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  Volume2,
  VolumeX,
  ThumbsUp,
  ThumbsDown,
  MessageCircle,
  Download,
  Share2,
  User,
  Loader2,
  Video as VideoIcon,
  Heart,
  Bookmark,
  Eye
} from 'lucide-react';
import { HLSVideoPlayer, getBunnyVideoUrls } from '@/components/video';
import { CommentsSection } from '@/components/content/CommentsSection';
import { PortfolioCommentsSection } from '@/components/content/PortfolioCommentsSection';
import { SocialSharePanel } from './SocialSharePanel';
import { FloatingHearts } from '@/components/social/ReactionButton';
import { STATUS_LABELS, STATUS_COLORS, ContentStatus } from '@/types/database';
import { UnifiedContentItem } from '@/hooks/unified/useUnifiedContent';
import { useDownload } from '@/hooks/unified/useDownload';
import { motion, AnimatePresence } from 'framer-motion';

export type ViewerMode = 'review' | 'browse' | 'presentation';

interface UnifiedContentViewerProps {
  items: UnifiedContentItem[];
  initialIndex?: number;
  isOpen: boolean;
  onClose: () => void;
  mode?: ViewerMode;

  // Review mode callbacks
  onApprove?: (item: UnifiedContentItem, feedback?: string) => Promise<void>;
  onReject?: (item: UnifiedContentItem, feedback: string) => Promise<void>;

  // Social callbacks
  onLike?: (item: UnifiedContentItem) => void;
  onSave?: (item: UnifiedContentItem) => void;
  isSaved?: (item: UnifiedContentItem) => boolean;
  isLiked?: (item: UnifiedContentItem) => boolean;

  // Options
  showDownload?: boolean;
  showShare?: boolean;
  showComments?: boolean;
  showStats?: boolean;
  allowKreoonShare?: boolean;
}

interface VideoSlideProps {
  item: UnifiedContentItem;
  isActive: boolean;
  isMuted: boolean;
  onMuteToggle: () => void;
  mode: ViewerMode;
  onLike?: () => void;
  onSave?: () => void;
  onDownload?: () => void;
  onShare?: () => void;
  onOpenComments?: () => void;
  onProfileClick?: (userId: string) => void;
  onClientClick?: (username: string) => void;
  isLiked?: boolean;
  isSaved?: boolean;
  canDownload?: boolean;
  showStats?: boolean;
  currentVariantIndex: number;
  onVariantChange: (index: number) => void;
}

const VideoSlide = memo(function VideoSlide({
  item,
  isActive,
  isMuted,
  onMuteToggle,
  mode,
  onLike,
  onSave,
  onDownload,
  onShare,
  onOpenComments,
  onProfileClick,
  onClientClick,
  isLiked = false,
  isSaved = false,
  canDownload = false,
  showStats = true,
  currentVariantIndex,
  onVariantChange
}: VideoSlideProps) {
  const [showHeart, setShowHeart] = useState(false);
  const [localIsLiked, setLocalIsLiked] = useState(isLiked);

  // Get video URLs
  const getVideoUrls = (): string[] => {
    if (item.video_urls && item.video_urls.length > 0) return item.video_urls;
    if (item.media_url) return [item.media_url];
    if (item.bunny_embed_url) return [item.bunny_embed_url];
    return [];
  };

  const videoUrls = getVideoUrls();
  const currentVideoUrl = videoUrls[currentVariantIndex] || videoUrls[0];
  const hasMultipleVariants = videoUrls.length > 1;

  // Get HLS URL for Bunny videos (works with embed URLs too)
  // getBunnyVideoUrls converts iframe.mediadelivery.net/embed URLs to HLS format
  const getVideoSource = useCallback(() => {
    if (!currentVideoUrl) return null;
    const bunnyUrls = getBunnyVideoUrls(currentVideoUrl);
    if (bunnyUrls) {
      return { hls: bunnyUrls.hls, thumbnail: bunnyUrls.thumbnail };
    }
    // Fallback for non-Bunny URLs
    return { hls: currentVideoUrl, thumbnail: item.thumbnail_url || '' };
  }, [currentVideoUrl, item.thumbnail_url]);

  const videoSource = item.media_type === 'video' ? getVideoSource() : null;

  // Double tap to like
  const handleDoubleTap = useCallback(() => {
    if (mode === 'browse') {
      setLocalIsLiked(true);
      setShowHeart(true);
      onLike?.();
      setTimeout(() => setShowHeart(false), 1000);
    }
  }, [mode, onLike]);

  return (
    <div
      className="h-full w-full relative flex items-center justify-center bg-black"
      onDoubleClick={handleDoubleTap}
    >
      {/* Video/Image content */}
      {item.media_type === 'video' ? (
        videoSource ? (
          <HLSVideoPlayer
            src={videoSource.hls}
            poster={videoSource.thumbnail || item.thumbnail_url}
            autoPlay={isActive}
            muted={isMuted}
            loop={true}
            className="w-full h-full"
            aspectRatio="auto"
            objectFit="contain"
          />
        ) : item.thumbnail_url ? (
          <img
            src={item.thumbnail_url}
            alt={item.title || 'Video'}
            className="w-full h-full object-contain"
          />
        ) : (
          <div className="text-white/50 flex flex-col items-center gap-2">
            <VideoIcon className="h-16 w-16" />
            <span>Sin video disponible</span>
          </div>
        )
      ) : (
        <img
          src={item.media_url}
          alt={item.title || item.caption || 'Imagen'}
          className="w-full h-full object-contain"
          loading="lazy"
        />
      )}

      {/* Floating hearts animation */}
      {mode === 'browse' && <FloatingHearts show={showHeart} />}

      {/* Variant selector - top center */}
      {hasMultipleVariants && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/60 px-4 py-2 rounded-full z-20">
          <button
            onClick={() => onVariantChange(Math.max(0, currentVariantIndex - 1))}
            disabled={currentVariantIndex === 0}
            className="text-white disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-white text-sm font-medium min-w-[100px] text-center">
            Variante {currentVariantIndex + 1} / {videoUrls.length}
          </span>
          <button
            onClick={() => onVariantChange(Math.min(videoUrls.length - 1, currentVariantIndex + 1))}
            disabled={currentVariantIndex === videoUrls.length - 1}
            className="text-white disabled:opacity-30"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Gradient overlays */}
      <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/60 to-transparent pointer-events-none" />
      <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-black/80 to-transparent pointer-events-none" />

      {/* Bottom info */}
      <div className="absolute left-4 right-16 bottom-4 z-20 pointer-events-none">
        {/* User/Creator info */}
        <div
          className="flex items-center gap-2 mb-2 pointer-events-auto cursor-pointer"
          onClick={() => item.user_id && onProfileClick?.(item.user_id)}
        >
          <Avatar className="h-10 w-10 ring-2 ring-white/30">
            <AvatarImage src={item.user_avatar || item.creator?.avatar_url} />
            <AvatarFallback className="bg-primary/20 text-white">
              <User className="h-4 w-4" />
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <span className="text-white font-semibold text-sm truncate block hover:underline">
              {item.user_name || item.creator?.full_name || 'Sin creador'}
            </span>
            <span className="text-xs text-white/70">
              {formatDistanceToNow(new Date(item.created_at), { addSuffix: true, locale: es })}
            </span>
          </div>

          {/* Status badge - only in review mode */}
          {mode === 'review' && item.status && (
            <Badge className={cn("text-xs", STATUS_COLORS[item.status])}>
              {STATUS_LABELS[item.status]}
            </Badge>
          )}

          {/* Client badge */}
          {item.client_name && (
            <Badge
              variant="secondary"
              className={cn(
                "text-xs bg-white/20 text-white border-0",
                item.client_username && "cursor-pointer hover:bg-white/30 pointer-events-auto"
              )}
              onClick={(e) => {
                e.stopPropagation();
                item.client_username && onClientClick?.(item.client_username);
              }}
            >
              {item.client_name}
            </Badge>
          )}
        </div>

        {/* Title/Caption */}
        <h3 className="text-white font-semibold mb-1 line-clamp-2">
          {item.title || item.caption}
        </h3>
        {item.description && (
          <p className="text-white/70 text-sm line-clamp-2">{item.description}</p>
        )}

        {/* Stats row */}
        {showStats && (
          <div className="flex items-center gap-4 text-xs text-white/70 mt-2">
            {item.views_count > 0 && (
              <span className="flex items-center gap-1">
                <Eye className="h-3 w-3" />
                {item.views_count.toLocaleString()}
              </span>
            )}
            {item.likes_count > 0 && (
              <span className="flex items-center gap-1">
                <Heart className="h-3 w-3" />
                {item.likes_count.toLocaleString()}
              </span>
            )}
            {item.comments_count > 0 && (
              <span className="flex items-center gap-1">
                <MessageCircle className="h-3 w-3" />
                {item.comments_count.toLocaleString()}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Side actions */}
      <div className="absolute right-3 bottom-32 flex flex-col items-center gap-4 z-20">
        {/* Mute toggle */}
        {item.media_type === 'video' && (
          <button
            onClick={onMuteToggle}
            className="p-3 rounded-full bg-black/30 text-white hover:bg-black/50 transition-colors"
          >
            {isMuted ? <VolumeX className="h-6 w-6" /> : <Volume2 className="h-6 w-6" />}
          </button>
        )}

        {/* Like - only in browse mode */}
        {mode === 'browse' && onLike && (
          <button
            onClick={() => {
              setLocalIsLiked(!localIsLiked);
              onLike();
            }}
            className="p-3 rounded-full bg-black/30 text-white hover:bg-black/50 transition-colors"
          >
            <Heart className={cn("h-6 w-6", localIsLiked && "fill-red-500 text-red-500")} />
          </button>
        )}

        {/* Comments */}
        <button
          onClick={onOpenComments}
          className="p-3 rounded-full bg-black/30 text-white hover:bg-black/50 transition-colors"
        >
          <MessageCircle className="h-6 w-6" />
        </button>

        {/* Save - only in browse mode */}
        {mode === 'browse' && onSave && (
          <button
            onClick={onSave}
            className="p-3 rounded-full bg-black/30 text-white hover:bg-black/50 transition-colors"
          >
            <Bookmark className={cn("h-6 w-6", isSaved && "fill-yellow-500 text-yellow-500")} />
          </button>
        )}

        {/* Share */}
        {onShare && (
          <button
            onClick={onShare}
            className="p-3 rounded-full bg-black/30 text-white hover:bg-black/50 transition-colors"
          >
            <Share2 className="h-6 w-6" />
          </button>
        )}

        {/* Download - conditional */}
        {canDownload && onDownload && (
          <button
            onClick={onDownload}
            className="p-3 rounded-full bg-black/30 text-white hover:bg-black/50 transition-colors"
          >
            <Download className="h-6 w-6" />
          </button>
        )}
      </div>
    </div>
  );
});

export function UnifiedContentViewer({
  items,
  initialIndex = 0,
  isOpen,
  onClose,
  mode = 'browse',
  onApprove,
  onReject,
  onLike,
  onSave,
  isSaved,
  isLiked,
  showDownload = true,
  showShare = true,
  showComments = true,
  showStats = true,
  allowKreoonShare = false
}: UnifiedContentViewerProps) {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [currentVariantIndex, setCurrentVariantIndex] = useState(0);
  const [muted, setMuted] = useState(mode === 'browse');
  const [feedback, setFeedback] = useState('');
  const [showFeedbackInput, setShowFeedbackInput] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showCommentsDrawer, setShowCommentsDrawer] = useState(false);
  const [showSharePanel, setShowSharePanel] = useState(false);

  const { download, canDownload: checkCanDownload, isDownloading } = useDownload();

  const currentItem = items[currentIndex];

  // Reset state when item changes
  useEffect(() => {
    setCurrentVariantIndex(0);
    setFeedback('');
    setShowFeedbackInput(false);
  }, [currentIndex]);

  // Reset index when initialIndex changes
  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex]);

  // Navigation
  const goToNext = useCallback(() => {
    if (currentIndex < items.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  }, [currentIndex, items.length]);

  const goToPrevious = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  }, [currentIndex]);

  // Review actions
  const handleApprove = async () => {
    if (!onApprove || !currentItem) return;
    setSubmitting(true);
    try {
      await onApprove(currentItem, feedback);
      setFeedback('');
      setShowFeedbackInput(false);
      if (currentIndex < items.length - 1) {
        goToNext();
      } else {
        onClose();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!onReject || !currentItem || !feedback) return;
    setSubmitting(true);
    try {
      await onReject(currentItem, feedback);
      setFeedback('');
      setShowFeedbackInput(false);
      if (currentIndex < items.length - 1) {
        goToNext();
      } else {
        onClose();
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Download handler
  const handleDownload = useCallback(() => {
    if (!currentItem) return;

    const videoUrls = currentItem.video_urls || (currentItem.media_url ? [currentItem.media_url] : []);

    download({
      contentId: currentItem.id,
      videoUrl: currentItem.media_url,
      videoUrls: videoUrls,
      title: currentItem.title || currentItem.caption,
      variantIndex: currentVariantIndex
    });
  }, [currentItem, currentVariantIndex, download]);

  // Check if current item can be downloaded
  const canDownloadCurrent = currentItem
    ? checkCanDownload(currentItem.status || '', currentItem.is_published)
    : false;

  // Navigation handlers
  const handleProfileClick = useCallback((userId: string) => {
    onClose();
    navigate(`/profile/${userId}`);
  }, [navigate, onClose]);

  const handleClientClick = useCallback((username: string) => {
    onClose();
    navigate(`/company/${username}`);
  }, [navigate, onClose]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle if textarea is focused
      if (document.activeElement === textareaRef.current) {
        if (e.key === 'Escape') {
          setShowFeedbackInput(false);
          textareaRef.current?.blur();
        }
        return;
      }

      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          goToPrevious();
          break;
        case 'ArrowDown':
          e.preventDefault();
          goToNext();
          break;
        case 'ArrowLeft':
          if (currentItem?.video_urls && currentItem.video_urls.length > 1 && currentVariantIndex > 0) {
            e.preventDefault();
            setCurrentVariantIndex(prev => prev - 1);
          }
          break;
        case 'ArrowRight':
          if (currentItem?.video_urls && currentItem.video_urls.length > 1 &&
              currentVariantIndex < currentItem.video_urls.length - 1) {
            e.preventDefault();
            setCurrentVariantIndex(prev => prev + 1);
          }
          break;
        case 'Escape':
          if (showSharePanel) {
            setShowSharePanel(false);
          } else {
            onClose();
          }
          break;
        case 'm':
          setMuted(prev => !prev);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentIndex, currentVariantIndex, currentItem, goToNext, goToPrevious, onClose, showSharePanel]);

  // Touch/swipe handling
  const touchStartY = useRef(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const touchEndY = e.changedTouches[0].clientY;
    const diff = touchStartY.current - touchEndY;

    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        goToNext();
      } else {
        goToPrevious();
      }
    }
  };

  if (!isOpen || !currentItem) return null;

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 bg-black flex items-center justify-center"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-[calc(env(safe-area-inset-top)+1rem)] right-4 z-50 p-3 rounded-full bg-white/20 text-white hover:bg-white/40 transition-all shadow-lg border border-white/20"
        aria-label="Cerrar"
      >
        <X className="h-7 w-7" />
      </button>

      {/* Counter */}
      <div className="absolute top-[calc(env(safe-area-inset-top)+1rem)] left-4 z-50 px-3 py-1.5 rounded-full bg-black/50 text-white text-sm font-medium">
        {currentIndex + 1} / {items.length}
      </div>

      {/* Navigation arrows - Desktop */}
      <div className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 flex-col gap-2 z-50">
        <button
          onClick={goToPrevious}
          disabled={currentIndex === 0}
          className={cn(
            "p-3 rounded-full bg-black/50 text-white transition-all",
            currentIndex === 0 ? "opacity-30 cursor-not-allowed" : "hover:bg-black/70"
          )}
        >
          <ChevronUp className="h-6 w-6" />
        </button>
        <button
          onClick={goToNext}
          disabled={currentIndex === items.length - 1}
          className={cn(
            "p-3 rounded-full bg-black/50 text-white transition-all",
            currentIndex === items.length - 1 ? "opacity-30 cursor-not-allowed" : "hover:bg-black/70"
          )}
        >
          <ChevronDown className="h-6 w-6" />
        </button>
      </div>

      {/* Video Container */}
      <div className="relative w-full h-full md:w-auto md:h-[90vh] md:aspect-[9/16] max-w-full">
        <VideoSlide
          item={currentItem}
          isActive={true}
          isMuted={muted}
          onMuteToggle={() => setMuted(!muted)}
          mode={mode}
          onLike={onLike ? () => onLike(currentItem) : undefined}
          onSave={onSave ? () => onSave(currentItem) : undefined}
          onDownload={showDownload ? handleDownload : undefined}
          onShare={showShare ? () => setShowSharePanel(true) : undefined}
          onOpenComments={showComments ? () => setShowCommentsDrawer(true) : undefined}
          onProfileClick={handleProfileClick}
          onClientClick={handleClientClick}
          isLiked={isLiked?.(currentItem)}
          isSaved={isSaved?.(currentItem)}
          canDownload={showDownload && canDownloadCurrent}
          showStats={showStats}
          currentVariantIndex={currentVariantIndex}
          onVariantChange={setCurrentVariantIndex}
        />

        {/* Review actions - Only in review mode */}
        {mode === 'review' && (onApprove || onReject) && (
          <div className="absolute inset-x-0 bottom-0 z-30">
            {showFeedbackInput ? (
              <div className="bg-black/90 p-4 space-y-3">
                <Textarea
                  ref={textareaRef}
                  placeholder="Escribe tus comentarios o correcciones..."
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                  rows={2}
                  autoFocus
                />
                <div className="flex gap-2">
                  {onApprove && (
                    <Button
                      onClick={handleApprove}
                      disabled={submitting}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                    >
                      {submitting ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <ThumbsUp className="h-4 w-4 mr-2" />
                      )}
                      Aprobar
                    </Button>
                  )}
                  {onReject && (
                    <Button
                      onClick={handleReject}
                      disabled={submitting || !feedback}
                      variant="destructive"
                      className="flex-1"
                    >
                      {submitting ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <ThumbsDown className="h-4 w-4 mr-2" />
                      )}
                      Corrección
                    </Button>
                  )}
                </div>
                <button
                  onClick={() => setShowFeedbackInput(false)}
                  className="w-full text-white/50 text-sm py-2"
                >
                  Cancelar
                </button>
              </div>
            ) : (
              <div className="bg-gradient-to-t from-black/90 to-transparent p-4 pt-8">
                <div className="flex gap-3">
                  {onApprove && (
                    <Button
                      onClick={handleApprove}
                      disabled={submitting}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white h-12 text-base"
                    >
                      <ThumbsUp className="h-5 w-5 mr-2" />
                      Aprobar
                    </Button>
                  )}
                  {onReject && (
                    <Button
                      onClick={() => setShowFeedbackInput(true)}
                      variant="outline"
                      className="flex-1 border-white/30 text-white hover:bg-white/10 h-12 text-base"
                    >
                      <ThumbsDown className="h-5 w-5 mr-2" />
                      Corrección
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Mobile navigation indicators */}
      <div className="md:hidden absolute left-1/2 -translate-x-1/2 bottom-[180px] flex gap-1 z-20">
        {items.slice(Math.max(0, currentIndex - 3), currentIndex + 4).map((_, idx) => {
          const actualIdx = Math.max(0, currentIndex - 3) + idx;
          return (
            <div
              key={actualIdx}
              className={cn(
                "h-1 rounded-full transition-all",
                actualIdx === currentIndex ? "w-4 bg-white" : "w-1 bg-white/30"
              )}
            />
          );
        })}
      </div>

      {/* Comments Drawer */}
      <Drawer open={showCommentsDrawer} onOpenChange={setShowCommentsDrawer}>
        <DrawerContent className="h-[70vh] bg-zinc-900 border-0">
          {currentItem.type === 'work' ? (
            <CommentsSection contentId={currentItem.id} />
          ) : (
            <PortfolioCommentsSection
              postId={currentItem.id}
              isOpen={showCommentsDrawer}
              onClose={() => setShowCommentsDrawer(false)}
            />
          )}
        </DrawerContent>
      </Drawer>

      {/* Share Panel */}
      <SocialSharePanel
        open={showSharePanel}
        onOpenChange={setShowSharePanel}
        contentId={currentItem.id}
        url={`${window.location.origin}/content/${currentItem.id}`}
        title={currentItem.title || currentItem.caption || 'Mira este contenido'}
        description={currentItem.description}
        allowKreoonShare={allowKreoonShare}
        creatorId={currentItem.creator_id || currentItem.user_id}
        clientId={currentItem.client_id}
      />
    </div>
  );
}
