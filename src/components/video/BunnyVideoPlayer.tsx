import { memo, useRef, useState, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import { Play, Loader2, RefreshCw, Volume2, VolumeX } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getBunnyVideoUrls } from '@/hooks/useHLSPlayer';
import Hls from 'hls.js';

export interface BunnyVideoPlayerRef {
  play: () => Promise<void>;
  pause: () => void;
  toggleMute: () => void;
  setMuted: (muted: boolean) => void;
  restart: () => void;
}

interface BunnyVideoPlayerProps {
  src: string;
  poster?: string;
  /** If true, video plays when in viewport and autoPlay is true */
  autoPlay?: boolean;
  muted?: boolean;
  loop?: boolean;
  className?: string;
  aspectRatio?: '9:16' | '16:9' | '1:1' | 'auto';
  showControls?: boolean;
  objectFit?: 'cover' | 'contain';
  /** Show mute/unmute button overlay */
  showMuteButton?: boolean;
  /** IntersectionObserver threshold for autoplay */
  intersectionThreshold?: number;
  /** Preload strategy */
  preload?: 'none' | 'metadata' | 'auto';
  onPlay?: () => void;
  onPause?: () => void;
  onError?: (error: string) => void;
  onViewStart?: () => void;
  onViewEnd?: (durationMs: number) => void;
}

const BunnyVideoPlayerComponent = forwardRef<BunnyVideoPlayerRef, BunnyVideoPlayerProps>(
  function BunnyVideoPlayer(
    {
      src,
      poster,
      autoPlay = true,
      muted = true,
      loop = true,
      className,
      aspectRatio = '9:16',
      showControls = false,
      objectFit = 'cover',
      showMuteButton = false,
      intersectionThreshold = 0.6,
      preload = 'metadata',
      onPlay,
      onPause,
      onError,
      onViewStart,
      onViewEnd,
    },
    ref
  ) {
    const containerRef = useRef<HTMLDivElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const hlsRef = useRef<Hls | null>(null);
    const viewStartRef = useRef<number | null>(null);
    const retryCountRef = useRef(0);

    const [isLoading, setIsLoading] = useState(true);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isMuted, setIsMuted] = useState(muted);
    const [error, setError] = useState<string | null>(null);
    const [isInViewport, setIsInViewport] = useState(false);
    const [showLoadingTimeout, setShowLoadingTimeout] = useState(false);

    // Get video URLs from Bunny format
    const bunnyUrls = src ? getBunnyVideoUrls(src) : null;
    const hlsUrl = bunnyUrls?.hls || null;
    const mp4Url = bunnyUrls?.mp4 || null;
    const thumbnailUrl = poster || bunnyUrls?.thumbnail || null;

    // Aspect ratio class
    const aspectClass = {
      '9:16': 'aspect-[9/16]',
      '16:9': 'aspect-video',
      '1:1': 'aspect-square',
      'auto': ''
    }[aspectRatio];

    // Setup IntersectionObserver for viewport detection
    useEffect(() => {
      const container = containerRef.current;
      if (!container) return;

      const observer = new IntersectionObserver(
        (entries) => {
          const entry = entries[0];
          setIsInViewport(entry.isIntersecting && entry.intersectionRatio >= intersectionThreshold);
        },
        { threshold: [intersectionThreshold] }
      );

      observer.observe(container);
      return () => observer.disconnect();
    }, [intersectionThreshold]);

    // Play/pause based on viewport
    useEffect(() => {
      const video = videoRef.current;
      if (!video || !autoPlay) return;

      if (isInViewport && !error) {
        video.play().catch(() => {
          // Try muted if autoplay blocked
          video.muted = true;
          setIsMuted(true);
          video.play().catch(() => {});
        });

        // Track view start
        if (onViewStart && !viewStartRef.current) {
          viewStartRef.current = Date.now();
          onViewStart();
        }
      } else {
        video.pause();

        // Track view end
        if (onViewEnd && viewStartRef.current) {
          const duration = Date.now() - viewStartRef.current;
          onViewEnd(duration);
          viewStartRef.current = null;
        }
      }
    }, [isInViewport, autoPlay, error, onViewStart, onViewEnd]);

    // Initialize video player (HLS or MP4 fallback)
    useEffect(() => {
      const video = videoRef.current;
      if (!video || !src) return;

      setIsLoading(true);
      setError(null);
      retryCountRef.current = 0;

      // Configure video element
      video.playsInline = true;
      video.loop = loop;
      video.muted = isMuted;
      video.preload = preload;

      // Loading timeout indicator
      const loadingTimeout = setTimeout(() => {
        setShowLoadingTimeout(true);
      }, 2000);

      const clearLoadingState = () => {
        setIsLoading(false);
        setShowLoadingTimeout(false);
        clearTimeout(loadingTimeout);
      };

      // Native HLS support (Safari/iOS)
      if (hlsUrl && video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = hlsUrl;
        video.addEventListener('canplay', clearLoadingState, { once: true });
        video.load();
        return () => {
          video.removeEventListener('canplay', clearLoadingState);
          clearTimeout(loadingTimeout);
        };
      }

      // hls.js for other browsers
      // POLICY: Min 720p quality (startLevel: 2), seek max quality
      if (hlsUrl && Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: false,
          backBufferLength: 45,
          maxBufferLength: 60,
          maxMaxBufferLength: 90,
          startLevel: 2, // 720p minimum (0=360p, 1=480p, 2=720p, 3=1080p)
          autoLevelCapping: -1, // No cap - allow max quality
        });

        hlsRef.current = hls;
        hls.loadSource(hlsUrl);
        hls.attachMedia(video);

        hls.on(Hls.Events.MANIFEST_PARSED, clearLoadingState);

        hls.on(Hls.Events.ERROR, (_, data) => {
          if (!data.fatal) return;

          retryCountRef.current += 1;

          if (retryCountRef.current <= 3) {
            if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
              hls.startLoad();
              return;
            }
            if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
              hls.recoverMediaError();
              return;
            }
          }

          // Fallback to MP4
          hls.destroy();
          hlsRef.current = null;
          loadMp4Fallback(video, mp4Url, clearLoadingState);
        });

        return () => {
          hls.destroy();
          hlsRef.current = null;
          clearTimeout(loadingTimeout);
        };
      }

      // Direct MP4 fallback
      loadMp4Fallback(video, mp4Url || src, clearLoadingState);

      return () => clearTimeout(loadingTimeout);
    }, [src, hlsUrl, mp4Url, loop, preload]);

    // Sync muted state
    useEffect(() => {
      if (videoRef.current) {
        videoRef.current.muted = isMuted;
      }
    }, [isMuted]);

    // Track play/pause state
    useEffect(() => {
      const video = videoRef.current;
      if (!video) return;

      const handlePlay = () => {
        setIsPlaying(true);
        onPlay?.();
      };
      const handlePause = () => {
        setIsPlaying(false);
        onPause?.();
      };
      const handleError = () => {
        setError('Error de reproducción');
        setIsLoading(false);
        onError?.('Video playback error');
      };
      const handleWaiting = () => setIsLoading(true);
      const handlePlaying = () => setIsLoading(false);

      video.addEventListener('play', handlePlay);
      video.addEventListener('pause', handlePause);
      video.addEventListener('error', handleError);
      video.addEventListener('waiting', handleWaiting);
      video.addEventListener('playing', handlePlaying);

      return () => {
        video.removeEventListener('play', handlePlay);
        video.removeEventListener('pause', handlePause);
        video.removeEventListener('error', handleError);
        video.removeEventListener('waiting', handleWaiting);
        video.removeEventListener('playing', handlePlaying);
      };
    }, [onPlay, onPause, onError]);

    // Helper: Load MP4 fallback
    const loadMp4Fallback = useCallback(
      (video: HTMLVideoElement, url: string | null, onReady: () => void) => {
        if (!url) {
          setError('Video no disponible');
          setIsLoading(false);
          return;
        }

        video.src = url;
        video.addEventListener('canplay', onReady, { once: true });
        video.load();
      },
      []
    );

    // Retry handler
    const handleRetry = useCallback(() => {
      setError(null);
      setIsLoading(true);
      retryCountRef.current = 0;

      const video = videoRef.current;
      if (!video) return;

      video.load();
      video.play().catch(() => {
        video.muted = true;
        setIsMuted(true);
        video.play().catch(() => {});
      });
    }, []);

    // Expose methods via ref
    useImperativeHandle(ref, () => ({
      play: async () => {
        const video = videoRef.current;
        if (video) {
          try {
            await video.play();
          } catch {
            video.muted = true;
            setIsMuted(true);
            await video.play();
          }
        }
      },
      pause: () => videoRef.current?.pause(),
      toggleMute: () => setIsMuted((prev) => !prev),
      setMuted: (m) => setIsMuted(m),
      restart: () => {
        const video = videoRef.current;
        if (video) {
          video.currentTime = 0;
          video.play().catch(() => {});
        }
      },
    }), []);

    const objectFitClass = objectFit === 'contain' ? 'object-contain' : 'object-cover';

    return (
      <div
        ref={containerRef}
        className={cn('relative overflow-hidden bg-black', aspectClass, className)}
      >
        {/* Video Element */}
        <video
          ref={videoRef}
          playsInline
          poster={thumbnailUrl || undefined}
          controls={showControls}
          className={cn('w-full h-full', objectFitClass)}
        />

        {/* Loading Indicator */}
        {isLoading && !error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/30">
            <Loader2 className="h-10 w-10 text-white animate-spin" />
            {showLoadingTimeout && (
              <p className="text-white/80 text-sm mt-2">Cargando...</p>
            )}
          </div>
        )}

        {/* Error State with Retry */}
        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60">
            <p className="text-white/80 text-sm mb-3">{error}</p>
            <button
              onClick={handleRetry}
              className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-full text-white text-sm transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              Reintentar
            </button>
          </div>
        )}

        {/* Play button overlay (when paused and not loading) */}
        {!isPlaying && !isLoading && !error && !autoPlay && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
            <button
              onClick={() => videoRef.current?.play()}
              className="h-16 w-16 flex items-center justify-center bg-white/30 hover:bg-white/40 rounded-full transition-colors"
            >
              <Play className="h-8 w-8 text-white fill-white" />
            </button>
          </div>
        )}

        {/* Mute button overlay */}
        {showMuteButton && isPlaying && (
          <button
            onClick={() => setIsMuted((prev) => !prev)}
            className="absolute bottom-4 left-4 h-10 w-10 flex items-center justify-center bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors"
          >
            {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
          </button>
        )}
      </div>
    );
  }
);

// Memoize to prevent unnecessary re-renders
export const BunnyVideoPlayer = memo(BunnyVideoPlayerComponent);

export default BunnyVideoPlayer;
