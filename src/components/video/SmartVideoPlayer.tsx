import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useOptimizedPlayer, PlayerContext, getRecommendedQuality } from '@/hooks/useOptimizedPlayer';
import { Play, Pause, Volume2, VolumeX, Maximize, Settings } from 'lucide-react';

interface SmartVideoPlayerProps {
  videoUrl: string | null;
  context: PlayerContext;
  poster?: string;
  className?: string;
  onPlay?: () => void;
  onPause?: () => void;
  onEnded?: () => void;
  onError?: (error: string) => void;
  showControls?: boolean;
  aspectRatio?: '16/9' | '9/16' | '1/1' | '4/3';
}

/**
 * Smart Video Player with context-aware quality optimization
 *
 * Features:
 * - Minimum 720p quality policy
 * - Adaptive streaming based on context
 * - Lazy loading with Intersection Observer
 * - Thumbnail placeholder until play (kanban context)
 * - Custom controls with quality indicator
 */
export function SmartVideoPlayer({
  videoUrl,
  context,
  poster,
  className = '',
  onPlay,
  onPause,
  onEnded,
  onError,
  showControls = true,
  aspectRatio = '16/9',
}: SmartVideoPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [showThumbnail, setShowThumbnail] = useState(true);
  const [isHovered, setIsHovered] = useState(false);

  // Get optimized player state
  const {
    videoRef,
    isPlaying,
    isMuted,
    currentQuality,
    isLoading,
    error,
    play,
    pause,
    toggleMute,
    thumbnailUrl,
    config,
    shouldLazyLoad,
    showThumbnailUntilPlay,
  } = useOptimizedPlayer(videoUrl, context, { poster, onPlay, onPause, onError });

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (!shouldLazyLoad) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '100px', threshold: 0.1 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [shouldLazyLoad]);

  // Handle video end
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleEnded = () => {
      onEnded?.();
      if (showThumbnailUntilPlay) {
        setShowThumbnail(true);
      }
    };

    video.addEventListener('ended', handleEnded);
    return () => video.removeEventListener('ended', handleEnded);
  }, [videoRef, onEnded, showThumbnailUntilPlay]);

  // Handle play action
  const handlePlay = useCallback(() => {
    setShowThumbnail(false);
    play();
  }, [play]);

  // Handle pause action
  const handlePause = useCallback(() => {
    pause();
    if (showThumbnailUntilPlay) {
      setShowThumbnail(true);
    }
  }, [pause, showThumbnailUntilPlay]);

  // Toggle play/pause
  const togglePlay = useCallback(() => {
    if (isPlaying) {
      handlePause();
    } else {
      handlePlay();
    }
  }, [isPlaying, handlePlay, handlePause]);

  // Request fullscreen
  const requestFullscreen = useCallback(() => {
    const video = videoRef.current;
    if (video?.requestFullscreen) {
      video.requestFullscreen();
    }
  }, [videoRef]);

  // Aspect ratio classes
  const aspectClasses = {
    '16/9': 'aspect-video',
    '9/16': 'aspect-[9/16]',
    '1/1': 'aspect-square',
    '4/3': 'aspect-[4/3]',
  };

  // Show thumbnail overlay
  const shouldShowThumbnail = showThumbnail && showThumbnailUntilPlay && thumbnailUrl;

  // Quality badge color
  const getQualityColor = () => {
    if (!currentQuality) return 'bg-zinc-500';
    const q = parseInt(currentQuality);
    if (q >= 1080) return 'bg-green-500';
    if (q >= 720) return 'bg-blue-500';
    return 'bg-yellow-500';
  };

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden rounded-lg bg-black ${aspectClasses[aspectRatio]} ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Video Element */}
      {isVisible && (
        <video
          ref={videoRef}
          className={`absolute inset-0 w-full h-full object-cover ${shouldShowThumbnail ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
          playsInline
          onClick={togglePlay}
        />
      )}

      {/* Thumbnail Overlay */}
      {shouldShowThumbnail && (
        <div
          className="absolute inset-0 bg-cover bg-center cursor-pointer"
          style={{ backgroundImage: `url(${thumbnailUrl})` }}
          onClick={handlePlay}
        >
          {/* Play button overlay */}
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/40 transition-colors">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
              <Play className="w-6 h-6 sm:w-7 sm:h-7 text-zinc-900 ml-1" />
            </div>
          </div>
        </div>
      )}

      {/* Loading Indicator */}
      {isLoading && !shouldShowThumbnail && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="w-10 h-10 border-3 border-white/30 border-t-white rounded-full animate-spin" />
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80">
          <div className="text-center px-4">
            <p className="text-white text-sm mb-2">Error al cargar video</p>
            <p className="text-zinc-400 text-xs">{error}</p>
          </div>
        </div>
      )}

      {/* Controls Overlay */}
      {showControls && !shouldShowThumbnail && (isHovered || !isPlaying) && (
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3 sm:p-4">
          <div className="flex items-center justify-between gap-3">
            {/* Left controls */}
            <div className="flex items-center gap-2">
              {/* Play/Pause */}
              <button
                onClick={togglePlay}
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
              >
                {isPlaying ? (
                  <Pause className="w-4 h-4 text-white" />
                ) : (
                  <Play className="w-4 h-4 text-white ml-0.5" />
                )}
              </button>

              {/* Mute toggle */}
              <button
                onClick={toggleMute}
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
              >
                {isMuted ? (
                  <VolumeX className="w-4 h-4 text-white" />
                ) : (
                  <Volume2 className="w-4 h-4 text-white" />
                )}
              </button>
            </div>

            {/* Right controls */}
            <div className="flex items-center gap-2">
              {/* Quality badge */}
              {currentQuality && (
                <div className={`px-2 py-0.5 rounded text-[10px] sm:text-xs font-medium text-white ${getQualityColor()}`}>
                  {currentQuality}p
                </div>
              )}

              {/* Fullscreen */}
              <button
                onClick={requestFullscreen}
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
              >
                <Maximize className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>

          {/* Context info (dev mode) */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-2 text-[10px] text-white/50">
              Contexto: {context} | Min: 720p | Recomendado: {getRecommendedQuality(context)}
            </div>
          )}
        </div>
      )}

      {/* Quality indicator badge (always visible in corner) */}
      {!shouldShowThumbnail && currentQuality && !isHovered && (
        <div className={`absolute top-2 right-2 px-1.5 py-0.5 rounded text-[9px] font-medium text-white/80 ${getQualityColor()} opacity-70`}>
          {currentQuality}p
        </div>
      )}
    </div>
  );
}

export default SmartVideoPlayer;
