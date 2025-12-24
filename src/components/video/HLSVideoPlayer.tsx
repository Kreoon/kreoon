import { forwardRef, useImperativeHandle, useEffect, useState, useCallback } from 'react';
import { Play, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useHLSPlayer, getBunnyVideoUrls } from '@/hooks/useHLSPlayer';

export interface HLSVideoPlayerRef {
  play: () => void;
  pause: () => void;
  toggleMute: () => void;
  setMuted: (muted: boolean) => void;
}

interface HLSVideoPlayerProps {
  src: string;
  poster?: string;
  autoPlay?: boolean;
  muted?: boolean;
  loop?: boolean;
  className?: string;
  aspectRatio?: '9:16' | '16:9' | '1:1' | 'auto';
  showControls?: boolean;
  /** If true, video waits for user tap to start (required for unmuted autoplay on mobile) */
  requireInteraction?: boolean;
  onPlay?: () => void;
  onPause?: () => void;
  onError?: (error: string) => void;
  onLoadStart?: () => void;
  onLoadComplete?: () => void;
}

export const HLSVideoPlayer = forwardRef<HLSVideoPlayerRef, HLSVideoPlayerProps>(
  function HLSVideoPlayer(
    {
      src,
      poster,
      autoPlay = false, // Changed: don't autoplay by default
      muted = false, // Changed: audio ON by default
      loop = true,
      className,
      aspectRatio = '9:16',
      showControls = false,
      requireInteraction = true, // New: wait for user tap by default
      onPlay,
      onPause,
      onError,
      onLoadStart,
      onLoadComplete
    },
    ref
  ) {
    const [showPoster, setShowPoster] = useState(true);
    const [hasInteracted, setHasInteracted] = useState(!requireInteraction);
    
    // Only autoplay if user has interacted (or interaction not required)
    const effectiveAutoPlay = autoPlay && hasInteracted;
    
    const {
      videoRef,
      isPlaying,
      isLoading,
      error,
      isMuted,
      thumbnailUrl,
      play,
      pause,
      toggleMute,
      setMuted
    } = useHLSPlayer(src, { autoPlay: effectiveAutoPlay, muted, loop, poster });

    // Handle user tap to start video
    const handleTapToPlay = useCallback(() => {
      if (!hasInteracted) {
        setHasInteracted(true);
        // Small delay to ensure state is updated before playing
        setTimeout(() => {
          play();
        }, 50);
      }
    }, [hasInteracted, play]);

    // Expose methods via ref
    useImperativeHandle(ref, () => ({
      play: () => {
        setHasInteracted(true);
        play();
      },
      pause,
      toggleMute,
      setMuted
    }), [play, pause, toggleMute, setMuted]);

    // Callbacks
    useEffect(() => {
      if (isLoading) {
        onLoadStart?.();
      } else {
        onLoadComplete?.();
        if (isPlaying) {
          setShowPoster(false);
        }
      }
    }, [isLoading, onLoadStart, onLoadComplete, isPlaying]);

    useEffect(() => {
      if (isPlaying) {
        onPlay?.();
        setShowPoster(false);
      } else {
        onPause?.();
      }
    }, [isPlaying, onPlay, onPause]);

    useEffect(() => {
      if (error) {
        onError?.(error);
      }
    }, [error, onError]);

    const aspectClass = {
      '9:16': 'aspect-[9/16]',
      '16:9': 'aspect-video',
      '1:1': 'aspect-square',
      'auto': ''
    }[aspectRatio];

    const posterUrl = poster || thumbnailUrl;
    const showPlayButton = !hasInteracted && !isPlaying;

    return (
      <div 
        className={cn('relative overflow-hidden bg-black', aspectClass, className)}
        onClick={handleTapToPlay}
      >
        {/* Video Element */}
        <video
          ref={videoRef}
          playsInline
          preload="metadata"
          poster={posterUrl || undefined}
          className={cn(
            'w-full h-full object-cover',
            showPoster && posterUrl && 'opacity-0'
          )}
          controls={showControls}
        />

        {/* Poster Image Overlay */}
        {showPoster && posterUrl && (
          <div className="absolute inset-0">
            <img
              src={posterUrl}
              alt="Video thumbnail"
              className="w-full h-full object-cover"
              onError={() => setShowPoster(false)}
            />
          </div>
        )}

        {/* Play Button Overlay - shown until user interacts */}
        {showPlayButton && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 cursor-pointer">
            <div className="bg-white/20 backdrop-blur-sm rounded-full p-6 transition-transform hover:scale-110">
              <Play className="h-12 w-12 text-white fill-white" />
            </div>
          </div>
        )}

        {/* Loading Indicator */}
        {isLoading && hasInteracted && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
            <Loader2 className="h-10 w-10 text-white animate-spin" />
          </div>
        )}

        {/* Error State */}
        {error && !isPlaying && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60">
            <div className="text-center text-white/80">
              <Play className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Error loading video</p>
            </div>
          </div>
        )}
      </div>
    );
  }
);

/**
 * Get thumbnail URL for a Bunny video
 */
export function getBunnyThumbnail(videoUrl: string): string | null {
  const urls = getBunnyVideoUrls(videoUrl);
  return urls?.thumbnail || null;
}
