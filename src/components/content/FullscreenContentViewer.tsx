import { useState, useRef, useEffect } from 'react';
import { Content, ContentStatus, STATUS_LABELS, STATUS_COLORS } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { 
  X, 
  ChevronUp, 
  ChevronDown, 
  Play, 
  Pause,
  Volume2, 
  VolumeX,
  ThumbsUp,
  ThumbsDown,
  MessageCircle,
  Download,
  User,
  Loader2,
  Video as VideoIcon
} from 'lucide-react';
import { Drawer, DrawerContent, DrawerTrigger } from '@/components/ui/drawer';
import { CommentsSection } from '@/components/content/CommentsSection';

interface ContentItem {
  id: string;
  title: string;
  thumbnail_url: string | null;
  video_url: string | null;
  video_urls: string[] | null;
  bunny_embed_url: string | null;
  status: ContentStatus;
  creator?: { full_name?: string; avatar_url?: string } | null;
  script?: string | null;
  description?: string | null;
}

interface FullscreenContentViewerProps {
  items: ContentItem[];
  initialIndex?: number;
  onClose: () => void;
  onApprove?: (item: ContentItem, feedback?: string) => Promise<void>;
  onReject?: (item: ContentItem, feedback: string) => Promise<void>;
  onDownload?: (item: ContentItem) => void;
  showActions?: boolean;
  mode?: 'review' | 'view';
}

export function FullscreenContentViewer({
  items,
  initialIndex = 0,
  onClose,
  onApprove,
  onReject,
  onDownload,
  showActions = true,
  mode = 'view'
}: FullscreenContentViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [muted, setMuted] = useState(true);
  const [playing, setPlaying] = useState(true);
  const [feedback, setFeedback] = useState('');
  const [showComments, setShowComments] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showFeedbackInput, setShowFeedbackInput] = useState(false);
  const [currentVariantIndex, setCurrentVariantIndex] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const currentItem = items[currentIndex];

  const getVideoUrls = (item: ContentItem): string[] => {
    if (item.video_urls && item.video_urls.length > 0) return item.video_urls;
    if (item.video_url) return [item.video_url];
    if (item.bunny_embed_url) return [item.bunny_embed_url];
    return [];
  };

  const videoUrls = getVideoUrls(currentItem);
  const currentVideoUrl = videoUrls[currentVariantIndex] || null;
  const hasMultipleVariants = videoUrls.length > 1;
  // Check if current URL is a bunny embed URL
  const isBunnyEmbed = !!currentVideoUrl && currentVideoUrl.includes('iframe.mediadelivery.net/embed');
  // Fullscreen viewer: autoplay with sound (user already clicked to open)
  const embedSrc = isBunnyEmbed && currentVideoUrl
    ? `${currentVideoUrl}?autoplay=true&muted=false&loop=true&responsive=true&preload=true&t=${Date.now()}`
    : null;

  const goToNext = () => {
    if (currentIndex < items.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setCurrentVariantIndex(0);
      setFeedback('');
      setShowFeedbackInput(false);
    }
  };

  const goToPrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      setCurrentVariantIndex(0);
      setFeedback('');
      setShowFeedbackInput(false);
    }
  };

  const handleApprove = async () => {
    if (!onApprove || !currentItem) return;
    setSubmitting(true);
    try {
      await onApprove(currentItem, feedback);
      setFeedback('');
      setShowFeedbackInput(false);
      // Auto advance to next
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
      // Auto advance to next
      if (currentIndex < items.length - 1) {
        goToNext();
      } else {
        onClose();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const togglePlayPause = () => {
    if (videoRef.current) {
      if (playing) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setPlaying(!playing);
    }
  };

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle shortcuts if textarea is focused
      const isTextareaFocused = document.activeElement === textareaRef.current;
      
      if (isTextareaFocused) {
        // Only allow Escape when typing
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
          if (hasMultipleVariants && currentVariantIndex > 0) {
            e.preventDefault();
            setCurrentVariantIndex(prev => prev - 1);
          }
          break;
        case 'ArrowRight':
          if (hasMultipleVariants && currentVariantIndex < videoUrls.length - 1) {
            e.preventDefault();
            setCurrentVariantIndex(prev => prev + 1);
          }
          break;
        case 'Escape':
          onClose();
          break;
        case ' ':
          e.preventDefault();
          togglePlayPause();
          break;
        case 'm':
          setMuted(prev => !prev);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, playing]);

  // Handle touch/swipe
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

  if (!currentItem) return null;

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
        className="absolute top-4 left-4 z-50 p-2 rounded-full bg-black/50 backdrop-blur-sm text-white hover:bg-black/70 transition-colors"
      >
        <X className="h-6 w-6" />
      </button>

      {/* Counter */}
      <div className="absolute top-4 right-4 z-50 px-3 py-1.5 rounded-full bg-black/50 backdrop-blur-sm text-white text-sm font-medium">
        {currentIndex + 1} / {items.length}
      </div>

      {/* Navigation arrows - Desktop */}
      <div className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 flex-col gap-2 z-50">
        <button
          onClick={goToPrevious}
          disabled={currentIndex === 0}
          className={cn(
            "p-3 rounded-full bg-black/50 backdrop-blur-sm text-white transition-all",
            currentIndex === 0 ? "opacity-30 cursor-not-allowed" : "hover:bg-black/70"
          )}
        >
          <ChevronUp className="h-6 w-6" />
        </button>
        <button
          onClick={goToNext}
          disabled={currentIndex === items.length - 1}
          className={cn(
            "p-3 rounded-full bg-black/50 backdrop-blur-sm text-white transition-all",
            currentIndex === items.length - 1 ? "opacity-30 cursor-not-allowed" : "hover:bg-black/70"
          )}
        >
          <ChevronDown className="h-6 w-6" />
        </button>
      </div>

      {/* Video Container */}
      <div className="relative w-full h-full md:w-auto md:h-[90vh] md:aspect-[9/16] max-w-full">
        {/* Video or Thumbnail */}
        <div className="absolute inset-0 bg-zinc-900 flex items-center justify-center">
          {isBunnyEmbed && currentVideoUrl ? (
            <iframe
              key={currentVideoUrl}
              src={embedSrc || currentVideoUrl}
              className="w-full h-full"
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
            />
          ) : currentVideoUrl ? (
            <video
              ref={videoRef}
              key={currentVideoUrl}
              src={currentVideoUrl}
              autoPlay
              loop
              muted={muted}
              playsInline
              className="w-full h-full object-contain"
              onClick={togglePlayPause}
            />
          ) : currentItem.thumbnail_url ? (
            <img 
              src={currentItem.thumbnail_url} 
              alt={currentItem.title}
              className="w-full h-full object-contain"
            />
          ) : (
            <div className="text-white/50 flex flex-col items-center gap-2">
              <VideoIcon className="h-16 w-16" />
              <span>Sin video disponible</span>
            </div>
          )}
          
          {/* Variant selector */}
          {hasMultipleVariants && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/60 backdrop-blur-sm px-4 py-2 rounded-full z-20">
              <button
                onClick={() => setCurrentVariantIndex(prev => Math.max(0, prev - 1))}
                disabled={currentVariantIndex === 0}
                className="text-white disabled:opacity-30"
              >
                <ChevronUp className="h-4 w-4 rotate-[-90deg]" />
              </button>
              <span className="text-white text-sm font-medium min-w-[80px] text-center">
                Variante {currentVariantIndex + 1} / {videoUrls.length}
              </span>
              <button
                onClick={() => setCurrentVariantIndex(prev => Math.min(videoUrls.length - 1, prev + 1))}
                disabled={currentVariantIndex === videoUrls.length - 1}
                className="text-white disabled:opacity-30"
              >
                <ChevronDown className="h-4 w-4 rotate-[-90deg]" />
              </button>
            </div>
          )}
        </div>

        {/* Gradient overlays */}
        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/60 to-transparent pointer-events-none" />
        <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-black/80 to-transparent pointer-events-none" />

        {/* Right side actions */}
        <div className="absolute right-3 bottom-32 flex flex-col items-center gap-4 z-20">
          {/* Mute toggle */}
          <button
            onClick={() => setMuted(!muted)}
            className="p-3 rounded-full bg-black/30 backdrop-blur-sm text-white hover:bg-black/50 transition-colors"
          >
            {muted ? <VolumeX className="h-6 w-6" /> : <Volume2 className="h-6 w-6" />}
          </button>

          {/* Comments */}
          <Drawer open={showComments} onOpenChange={setShowComments}>
            <DrawerTrigger asChild>
              <button className="flex flex-col items-center gap-1">
                <div className="p-3 rounded-full bg-black/30 backdrop-blur-sm text-white hover:bg-black/50 transition-colors">
                  <MessageCircle className="h-6 w-6" />
                </div>
              </button>
            </DrawerTrigger>
            <DrawerContent className="h-[60vh] bg-background">
              <CommentsSection contentId={currentItem.id} />
            </DrawerContent>
          </Drawer>

          {/* Download */}
          {onDownload && (
            <button
              onClick={() => onDownload(currentItem)}
              className="p-3 rounded-full bg-black/30 backdrop-blur-sm text-white hover:bg-black/50 transition-colors"
            >
              <Download className="h-6 w-6" />
            </button>
          )}
        </div>

        {/* Bottom info */}
        <div className="absolute left-4 right-16 bottom-4 z-20">
          {/* Creator info */}
          <div className="flex items-center gap-2 mb-2">
            <Avatar className="h-8 w-8 border-2 border-white">
              <AvatarImage src={currentItem.creator?.avatar_url || undefined} />
              <AvatarFallback className="bg-primary/20">
                <User className="h-4 w-4" />
              </AvatarFallback>
            </Avatar>
            <span className="text-white font-semibold text-sm">
              {currentItem.creator?.full_name || 'Sin creador'}
            </span>
            {currentItem.status && (
              <Badge className={cn("text-xs", STATUS_COLORS[currentItem.status])}>
                {STATUS_LABELS[currentItem.status]}
              </Badge>
            )}
          </div>

          {/* Title and description */}
          <h3 className="text-white font-semibold mb-1 line-clamp-2">{currentItem.title}</h3>
          {currentItem.description && (
            <p className="text-white/70 text-sm line-clamp-2">{currentItem.description}</p>
          )}
        </div>

        {/* Review actions - Only in review mode */}
        {mode === 'review' && showActions && (onApprove || onReject) && (
          <div className="absolute inset-x-0 bottom-0 z-30">
            {showFeedbackInput ? (
              <div className="bg-black/90 backdrop-blur-xl p-4 space-y-3">
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
        {items.map((_, idx) => (
          <div
            key={idx}
            className={cn(
              "h-1 rounded-full transition-all",
              idx === currentIndex ? "w-4 bg-white" : "w-1 bg-white/30"
            )}
          />
        ))}
      </div>
    </div>
  );
}
