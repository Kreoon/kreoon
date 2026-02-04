import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Share2,
  ThumbsUp,
  ThumbsDown,
  MessageCircle,
  Clock
} from 'lucide-react';
import { HLSVideoPlayer, getBunnyVideoUrls } from '@/components/video';
import { UnifiedContentItem } from '@/hooks/unified/useUnifiedContent';
import { STATUS_LABELS, STATUS_COLORS } from '@/types/database';
import { motion, AnimatePresence } from 'framer-motion';

interface PresentationModeProps {
  items: UnifiedContentItem[];
  isOpen: boolean;
  onClose: () => void;
  autoPlay?: boolean;
  autoAdvance?: boolean;
  autoAdvanceDelay?: number; // seconds
  showControls?: boolean;
  showBranding?: boolean;
  brandingLogo?: string;
  brandingName?: string;
  onApprove?: (item: UnifiedContentItem) => void;
  onReject?: (item: UnifiedContentItem) => void;
}

export function PresentationMode({
  items,
  isOpen,
  onClose,
  autoPlay = true,
  autoAdvance = false,
  autoAdvanceDelay = 10,
  showControls = true,
  showBranding = true,
  brandingLogo,
  brandingName
}: PresentationModeProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [variantIndex, setVariantIndex] = useState(0);
  const [muted, setMuted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [showControlsOverlay, setShowControlsOverlay] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [progress, setProgress] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const currentItem = items[currentIndex];
  const videoUrls = currentItem?.video_urls || (currentItem?.media_url ? [currentItem.media_url] : []);
  const currentVideoUrl = videoUrls[variantIndex] || videoUrls[0];

  // Auto advance timer
  useEffect(() => {
    if (!isOpen || !autoAdvance || !isPlaying) {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
      setProgress(0);
      return;
    }

    const intervalMs = 100;
    const totalIntervals = (autoAdvanceDelay * 1000) / intervalMs;
    let count = 0;

    progressIntervalRef.current = setInterval(() => {
      count++;
      setProgress((count / totalIntervals) * 100);

      if (count >= totalIntervals) {
        // Auto advance to next
        if (currentIndex < items.length - 1) {
          setCurrentIndex(prev => prev + 1);
          setVariantIndex(0);
        } else {
          // Loop back to start or stop
          setCurrentIndex(0);
          setVariantIndex(0);
        }
        count = 0;
        setProgress(0);
      }
    }, intervalMs);

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, [isOpen, autoAdvance, autoAdvanceDelay, isPlaying, currentIndex, items.length]);

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(0);
      setVariantIndex(0);
      setIsPlaying(autoPlay);
      setProgress(0);
    }
  }, [isOpen, autoPlay]);

  // Navigation
  const goToNext = useCallback(() => {
    setProgress(0);
    if (currentIndex < items.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setVariantIndex(0);
    }
  }, [currentIndex, items.length]);

  const goToPrevious = useCallback(() => {
    setProgress(0);
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      setVariantIndex(0);
    }
  }, [currentIndex]);

  // Fullscreen toggle
  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowRight':
        case 'ArrowDown':
          e.preventDefault();
          goToNext();
          break;
        case 'ArrowLeft':
        case 'ArrowUp':
          e.preventDefault();
          goToPrevious();
          break;
        case 'Escape':
          onClose();
          break;
        case ' ':
          e.preventDefault();
          setIsPlaying(prev => !prev);
          break;
        case 'm':
          setMuted(prev => !prev);
          break;
        case 'f':
          toggleFullscreen();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, goToNext, goToPrevious, onClose, toggleFullscreen]);

  // Hide controls after inactivity
  useEffect(() => {
    let timeout: NodeJS.Timeout;

    const handleMouseMove = () => {
      setShowControlsOverlay(true);
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        if (isPlaying) {
          setShowControlsOverlay(false);
        }
      }, 3000);
    };

    if (isOpen) {
      window.addEventListener('mousemove', handleMouseMove);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      clearTimeout(timeout);
    };
  }, [isOpen, isPlaying]);

  if (!isOpen || !currentItem) return null;

  // Get video source
  const isBunnyEmbed = currentVideoUrl?.includes('iframe.mediadelivery.net/embed');
  const bunnyUrls = !isBunnyEmbed ? getBunnyVideoUrls(currentVideoUrl) : null;
  const videoSrc = bunnyUrls?.hls || currentVideoUrl;

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 bg-black flex items-center justify-center"
      onClick={() => setShowControlsOverlay(true)}
    >
      {/* Video/Content area */}
      <div className="relative w-full h-full flex items-center justify-center">
        {/* Video */}
        {currentItem.media_type === 'video' ? (
          isBunnyEmbed ? (
            <iframe
              key={`${currentItem.id}-${variantIndex}`}
              src={`${currentVideoUrl}?autoplay=${isPlaying}&muted=${muted}&loop=true&responsive=true`}
              className="w-full h-full max-w-[calc(100vh*16/9)]"
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <div className="w-full h-full max-w-[calc(100vh*16/9)] flex items-center justify-center">
              <HLSVideoPlayer
                key={`${currentItem.id}-${variantIndex}`}
                src={videoSrc}
                poster={currentItem.thumbnail_url}
                autoPlay={isPlaying}
                muted={muted}
                loop={!autoAdvance}
                className="w-full h-full"
                aspectRatio="auto"
                objectFit="contain"
              />
            </div>
          )
        ) : (
          <img
            src={currentItem.media_url}
            alt={currentItem.title || ''}
            className="max-w-full max-h-full object-contain"
          />
        )}

        {/* Auto-advance progress bar */}
        {autoAdvance && (
          <div className="absolute top-0 left-0 right-0 z-30">
            <Progress value={progress} className="h-1 rounded-none" />
          </div>
        )}

        {/* Branding */}
        {showBranding && (brandingLogo || brandingName) && (
          <div className="absolute top-6 left-6 z-30 flex items-center gap-3">
            {brandingLogo && (
              <img src={brandingLogo} alt="" className="h-10 w-auto" />
            )}
            {brandingName && (
              <span className="text-white font-semibold text-lg">{brandingName}</span>
            )}
          </div>
        )}

        {/* Content info overlay */}
        <AnimatePresence>
          {showControlsOverlay && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 pointer-events-none"
            >
              {/* Top gradient */}
              <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/60 to-transparent" />

              {/* Bottom gradient with info */}
              <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-black/80 to-transparent" />

              {/* Content info */}
              <div className="absolute bottom-20 left-8 right-24 text-white pointer-events-auto">
                {/* Status badge */}
                {currentItem.status && (
                  <Badge className={cn("mb-3", STATUS_COLORS[currentItem.status])}>
                    {STATUS_LABELS[currentItem.status]}
                  </Badge>
                )}

                {/* Title */}
                <h2 className="text-3xl font-bold mb-2 line-clamp-2">
                  {currentItem.title || currentItem.caption}
                </h2>

                {/* Description */}
                {currentItem.description && (
                  <p className="text-lg text-white/80 line-clamp-2 mb-2">
                    {currentItem.description}
                  </p>
                )}

                {/* Creator & Client */}
                <div className="flex items-center gap-4 text-sm text-white/70">
                  {currentItem.user_name && (
                    <span>Por: {currentItem.user_name}</span>
                  )}
                  {currentItem.client_name && (
                    <Badge variant="secondary" className="bg-white/20 text-white">
                      {currentItem.client_name}
                    </Badge>
                  )}
                </div>

                {/* Variant indicator */}
                {videoUrls.length > 1 && (
                  <div className="mt-3 flex items-center gap-2">
                    <span className="text-sm text-white/70">Variante:</span>
                    <div className="flex gap-1">
                      {videoUrls.map((_, idx) => (
                        <button
                          key={idx}
                          onClick={() => setVariantIndex(idx)}
                          className={cn(
                            "w-8 h-8 rounded-full text-sm font-medium transition-all",
                            idx === variantIndex
                              ? "bg-white text-black"
                              : "bg-white/20 text-white hover:bg-white/30"
                          )}
                        >
                          {idx + 1}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Controls */}
        {showControls && (
          <AnimatePresence>
            {showControlsOverlay && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-40 pointer-events-none"
              >
                {/* Close button */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-6 right-6 text-white hover:bg-white/20 pointer-events-auto"
                  onClick={onClose}
                >
                  <X className="h-6 w-6" />
                </Button>

                {/* Counter */}
                <div className="absolute top-6 right-20 text-white/80 text-sm bg-black/40 px-3 py-1 rounded-full">
                  {currentIndex + 1} / {items.length}
                </div>

                {/* Navigation arrows */}
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "absolute left-4 top-1/2 -translate-y-1/2 h-12 w-12 text-white hover:bg-white/20 pointer-events-auto",
                    currentIndex === 0 && "opacity-30 cursor-not-allowed"
                  )}
                  onClick={goToPrevious}
                  disabled={currentIndex === 0}
                >
                  <ChevronLeft className="h-8 w-8" />
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "absolute right-4 top-1/2 -translate-y-1/2 h-12 w-12 text-white hover:bg-white/20 pointer-events-auto",
                    currentIndex === items.length - 1 && "opacity-30 cursor-not-allowed"
                  )}
                  onClick={goToNext}
                  disabled={currentIndex === items.length - 1}
                >
                  <ChevronRight className="h-8 w-8" />
                </Button>

                {/* Bottom controls */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 pointer-events-auto">
                  {/* Play/Pause */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 text-white hover:bg-white/20"
                    onClick={() => setIsPlaying(!isPlaying)}
                  >
                    {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                  </Button>

                  {/* Mute */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 text-white hover:bg-white/20"
                    onClick={() => setMuted(!muted)}
                  >
                    {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                  </Button>

                  {/* Fullscreen */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 text-white hover:bg-white/20"
                    onClick={toggleFullscreen}
                  >
                    {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
                  </Button>

                  {/* Timer indicator */}
                  {autoAdvance && (
                    <div className="flex items-center gap-1 text-white/70 text-sm ml-4">
                      <Clock className="h-4 w-4" />
                      <span>{autoAdvanceDelay}s</span>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>

      {/* Thumbnail strip at bottom */}
      {items.length > 1 && showControlsOverlay && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 flex gap-2 z-30">
          {items.map((item, idx) => (
            <button
              key={item.id}
              onClick={() => {
                setCurrentIndex(idx);
                setVariantIndex(0);
                setProgress(0);
              }}
              className={cn(
                "w-16 h-12 rounded-md overflow-hidden border-2 transition-all",
                idx === currentIndex
                  ? "border-white scale-110"
                  : "border-transparent opacity-60 hover:opacity-100"
              )}
            >
              {item.thumbnail_url ? (
                <img
                  src={item.thumbnail_url}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-zinc-800 flex items-center justify-center text-white text-xs">
                  {idx + 1}
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
