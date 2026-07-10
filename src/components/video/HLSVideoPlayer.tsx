import { forwardRef, useImperativeHandle, useEffect, useState, memo } from 'react';
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
  /** Use object-contain instead of object-cover to avoid cropping */
  objectFit?: 'cover' | 'contain';
  onPlay?: () => void;
  onPause?: () => void;
  onError?: (error: string) => void;
  onLoadStart?: () => void;
  onLoadComplete?: (info?: { fromPreload: boolean }) => void;
  /** Fase 3.7: clave para el mapa de resume-position (normalmente el post_id del feed). */
  resumeKey?: string;
  /** Fase 3.7: se dispara si el autoplay con audio fue bloqueado y el player forzo mute — para sincronizar el mute global persistido. */
  onForcedMute?: () => void;
}

export const HLSVideoPlayer = memo(forwardRef<HLSVideoPlayerRef, HLSVideoPlayerProps>(
  function HLSVideoPlayer(
    {
      src,
      poster,
      autoPlay = true, // Autoplay when in viewport
      muted = true, // Start muted for autoplay compatibility
      loop = true,
      className,
      aspectRatio = '9:16',
      showControls = false,
      objectFit = 'cover',
      onPlay,
      onPause,
      onError,
      onLoadStart,
      onLoadComplete,
      resumeKey,
      onForcedMute
    },
    ref
  ) {
    const [showPoster, setShowPoster] = useState(true);

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
      setMuted,
      loadedFromPreload
    } = useHLSPlayer(src, { autoPlay, muted, loop, poster, resumeKey, onForcedMute });

    // Expose methods via ref
    useImperativeHandle(ref, () => ({
      play,
      pause,
      toggleMute,
      setMuted
    }), [play, pause, toggleMute, setMuted]);

    // Callbacks
    useEffect(() => {
      if (isLoading) {
        onLoadStart?.();
      } else {
        onLoadComplete?.({ fromPreload: loadedFromPreload });
        if (isPlaying) {
          setShowPoster(false);
        }
      }
    }, [isLoading, onLoadStart, onLoadComplete, isPlaying, loadedFromPreload]);

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
    const objectFitClass = objectFit === 'contain' ? 'object-contain' : 'object-cover';

    // Fase 3.7 fixes: si el thumbnail no existe o da 404, mostrar fallback de marca
    // (gradiente + logo) en vez de pantalla negra hasta el primer frame.
    const [posterFailed, setPosterFailed] = useState(false);

    // When showing native controls (manual playback), rely on the <video poster> attribute.
    // The custom poster overlay blocks user interaction with controls on top of the video.
    const shouldShowPosterOverlay = Boolean(showPoster && posterUrl && !posterFailed && !showControls);
    const shouldShowBrandFallback = Boolean(showPoster && (!posterUrl || posterFailed) && !showControls);

    return (
      <div className={cn('relative overflow-hidden bg-black', aspectClass, className)}>
        {/* Video Element */}
        <video
          ref={videoRef}
          playsInline
          preload="metadata"
          poster={posterUrl || undefined}
          className={cn(
            'w-full h-full',
            objectFitClass,
            // Only hide the video when we render a custom overlay poster (no controls)
            shouldShowPosterOverlay && 'opacity-0'
          )}
          controls={showControls}
        />

        {/* Poster Image Overlay (only for no-controls mode) */}
        {shouldShowPosterOverlay && (
          <div className="absolute inset-0 pointer-events-none">
            <img
              src={posterUrl as string}
              alt="Video thumbnail"
              className={cn('w-full h-full', objectFitClass)}
              onError={() => setPosterFailed(true)}
              loading="lazy"
            />
          </div>
        )}

        {/* Fallback de marca: thumbnail ausente o 404 — gradiente nova + logo, nunca negro */}
        {shouldShowBrandFallback && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center bg-gradient-to-br from-nova-accent-primary/30 via-nova-bg-void to-nova-accent-secondary/20">
            <img
              src="/favicon.png"
              alt="KREOON"
              className="h-16 w-16 opacity-40"
              loading="lazy"
            />
          </div>
        )}

        {/* Loading Indicator */}
        {isLoading && (
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
));

HLSVideoPlayer.displayName = 'HLSVideoPlayer';

/**
 * Get thumbnail URL for a Bunny video
 */
export function getBunnyThumbnail(videoUrl: string): string | null {
  const urls = getBunnyVideoUrls(videoUrl);
  return urls?.thumbnail || null;
}
