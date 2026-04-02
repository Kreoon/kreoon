/**
 * LivePlayer - Reproductor de video HLS para viewers
 * Optimizado: HLS.js se carga dinamicamente (ahorra 522KB del bundle inicial)
 */

import { useRef, useEffect, useState } from 'react';
import type Hls from 'hls.js';
import { cn } from '@/lib/utils';
import { Loader2, Volume2, VolumeX, Maximize, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';

// Lazy-loaded HLS module reference
let HlsModule: typeof import('hls.js').default | null = null;
let hlsLoadPromise: Promise<typeof import('hls.js').default> | null = null;

/**
 * Dynamically load HLS.js only when needed
 */
async function loadHls(): Promise<typeof import('hls.js').default> {
  if (HlsModule) return HlsModule;
  if (hlsLoadPromise) return hlsLoadPromise;

  hlsLoadPromise = import('hls.js').then(mod => {
    HlsModule = mod.default;
    return HlsModule;
  });

  return hlsLoadPromise;
}

/**
 * Check if HLS.js is supported (without loading the full module)
 */
function isHlsSupported(): boolean {
  const mediaSource = window.MediaSource || (window as any).WebKitMediaSource;
  return !!mediaSource && typeof mediaSource.isTypeSupported === 'function' &&
         mediaSource.isTypeSupported('video/mp4; codecs="avc1.42E01E,mp4a.40.2"');
}

interface LivePlayerProps {
  playbackUrl: string | null;
  playbackUrlWebrtc?: string | null;
  autoPlay?: boolean;
  muted?: boolean;
  className?: string;
  onError?: (error: Error) => void;
}

export function LivePlayer({
  playbackUrl,
  playbackUrlWebrtc,
  autoPlay = true,
  muted = false,
  className,
  onError,
}: LivePlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(muted);
  const [volume, setVolume] = useState(1);
  const [showControls, setShowControls] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Inicializar HLS - carga dinamica
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !playbackUrl) return;

    setIsLoading(true);
    setError(null);

    // Si el navegador soporta HLS nativo (Safari)
    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = playbackUrl;
      video.addEventListener('loadedmetadata', () => {
        setIsLoading(false);
        if (autoPlay) video.play().catch(() => {});
      });
      return;
    }

    // Verificar soporte antes de cargar HLS.js
    if (!isHlsSupported()) {
      setError('Tu navegador no soporta streaming HLS');
      return;
    }

    // Cargar hls.js dinamicamente
    let cancelled = false;

    const initHls = async () => {
      try {
        const Hls = await loadHls();

        if (cancelled) return;

        if (!Hls.isSupported()) {
          setError('Tu navegador no soporta streaming HLS');
          return;
        }

        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
          backBufferLength: 30,
        });

        hlsRef.current = hls;

        hls.loadSource(playbackUrl);
        hls.attachMedia(video);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          setIsLoading(false);
          if (autoPlay) {
            video.play().catch(() => {
              // Autoplay bloqueado, necesita interaccion del usuario
              setIsPlaying(false);
            });
          }
        });

        hls.on(Hls.Events.ERROR, (event, data) => {
          console.error('HLS error:', data);
          if (data.fatal) {
            setError('Error al cargar el stream');
            onError?.(new Error(data.details));
          }
        });
      } catch (err) {
        console.error('[LivePlayer] Failed to load hls.js:', err);
        setError('Error al cargar el reproductor de video');
      }
    };

    initHls();

    return () => {
      cancelled = true;
      hlsRef.current?.destroy();
      hlsRef.current = null;
    };
  }, [playbackUrl, autoPlay, onError]);

  // Sincronizar estado de reproduccion
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleWaiting = () => setIsLoading(true);
    const handlePlaying = () => setIsLoading(false);

    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('playing', handlePlaying);

    return () => {
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('playing', handlePlaying);
    };
  }, []);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
    } else {
      video.play();
    }
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleVolumeChange = (value: number[]) => {
    const video = videoRef.current;
    if (!video) return;

    const newVolume = value[0];
    video.volume = newVolume;
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  };

  const toggleFullscreen = () => {
    const container = containerRef.current;
    if (!container) return;

    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      container.requestFullscreen();
    }
  };

  // Auto-hide controls
  useEffect(() => {
    let timeout: NodeJS.Timeout;

    const resetTimeout = () => {
      setShowControls(true);
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        if (isPlaying) setShowControls(false);
      }, 3000);
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('mousemove', resetTimeout);
      container.addEventListener('click', resetTimeout);
    }

    resetTimeout();

    return () => {
      clearTimeout(timeout);
      if (container) {
        container.removeEventListener('mousemove', resetTimeout);
        container.removeEventListener('click', resetTimeout);
      }
    };
  }, [isPlaying]);

  if (error) {
    return (
      <div
        className={cn(
          'relative aspect-video bg-black flex items-center justify-center',
          className
        )}
      >
        <p className="text-white text-center px-4">{error}</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn('relative aspect-video bg-black group', className)}
    >
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        playsInline
        muted={isMuted}
      />

      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <Loader2 className="h-10 w-10 text-white animate-spin" />
        </div>
      )}

      {/* Play button overlay (when paused) */}
      {!isPlaying && !isLoading && (
        <div
          className="absolute inset-0 flex items-center justify-center cursor-pointer"
          onClick={togglePlay}
        >
          <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center">
            <Play className="h-8 w-8 text-white ml-1" />
          </div>
        </div>
      )}

      {/* Controls */}
      <div
        className={cn(
          'absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent transition-opacity duration-300',
          showControls ? 'opacity-100' : 'opacity-0'
        )}
      >
        <div className="flex items-center gap-4">
          {/* Play/Pause */}
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20"
            onClick={togglePlay}
          >
            {isPlaying ? (
              <div className="w-4 h-4 flex gap-0.5">
                <div className="w-1.5 h-full bg-white" />
                <div className="w-1.5 h-full bg-white" />
              </div>
            ) : (
              <Play className="h-4 w-4" />
            )}
          </Button>

          {/* Volume */}
          <div className="flex items-center gap-2 group/volume">
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20"
              onClick={toggleMute}
            >
              {isMuted ? (
                <VolumeX className="h-4 w-4" />
              ) : (
                <Volume2 className="h-4 w-4" />
              )}
            </Button>
            <div className="w-0 overflow-hidden group-hover/volume:w-20 transition-all duration-200">
              <Slider
                value={[isMuted ? 0 : volume]}
                max={1}
                step={0.1}
                onValueChange={handleVolumeChange}
                className="w-20"
              />
            </div>
          </div>

          <div className="flex-1" />

          {/* Fullscreen */}
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20"
            onClick={toggleFullscreen}
          >
            <Maximize className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
