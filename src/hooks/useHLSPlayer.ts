import { useEffect, useRef, useCallback, useState } from 'react';
import Hls from 'hls.js';

interface UseHLSPlayerOptions {
  autoPlay?: boolean;
  muted?: boolean;
  loop?: boolean;
  poster?: string;
  // New performance options
  fastStart?: boolean;          // Enable aggressive fast start
  preloadNext?: boolean;        // Preload hint for next video
  connectionAware?: boolean;    // Adapt quality to network
}

interface BunnyVideoUrls {
  hls: string;
  mp4: string;
  thumbnail: string;
  // Multiple quality MP4s for progressive loading
  mp4_360p: string;
  mp4_480p: string;
  mp4_720p: string;
  mp4_1080p: string;
}

// Network quality detection
type NetworkQuality = 'slow' | 'medium' | 'fast' | 'unknown';

// Cache for preloaded HLS instances
const preloadCache = new Map<string, Hls>();
const MAX_PRELOAD_CACHE = 3;

/**
 * Detect network quality based on connection API and bandwidth estimates
 */
function detectNetworkQuality(): NetworkQuality {
  if (typeof navigator === 'undefined') return 'unknown';

  const connection = (navigator as any).connection ||
                     (navigator as any).mozConnection ||
                     (navigator as any).webkitConnection;

  if (!connection) return 'unknown';

  // Check effective type (4g, 3g, 2g, slow-2g)
  const effectiveType = connection.effectiveType;
  if (effectiveType === '4g') return 'fast';
  if (effectiveType === '3g') return 'medium';
  if (effectiveType === '2g' || effectiveType === 'slow-2g') return 'slow';

  // Fallback to downlink speed (Mbps)
  const downlink = connection.downlink;
  if (downlink >= 5) return 'fast';
  if (downlink >= 1) return 'medium';
  if (downlink > 0) return 'slow';

  return 'unknown';
}

/**
 * Get optimal HLS config based on network quality
 */
function getOptimalHlsConfig(networkQuality: NetworkQuality, fastStart: boolean): Partial<Hls['config']> {
  const baseConfig: Partial<Hls['config']> = {
    enableWorker: true,
    lowLatencyMode: false,
  };

  if (fastStart) {
    // Aggressive fast start - minimal buffering
    return {
      ...baseConfig,
      maxBufferLength: 10,           // Reduced from 30
      maxMaxBufferLength: 30,        // Reduced from 60
      maxBufferSize: 30 * 1000000,   // 30MB max buffer
      maxBufferHole: 0.5,            // Tolerate small gaps
      startLevel: networkQuality === 'fast' ? -1 : 0, // Start at lowest on slow
      abrEwmaDefaultEstimate: networkQuality === 'fast' ? 5000000 : 1000000,
      abrBandWidthFactor: 0.9,       // More aggressive bandwidth usage
      abrBandWidthUpFactor: 0.7,     // Faster quality upgrades
      // Fragment loading optimization
      fragLoadingTimeOut: 10000,     // Reduced timeout
      fragLoadingMaxRetry: 2,        // Fewer retries for faster failover
      // Start playback as soon as possible
      startFragPrefetch: true,       // Prefetch first fragment
      testBandwidth: false,          // Skip initial bandwidth test
    };
  }

  // Quality-based configs
  switch (networkQuality) {
    case 'slow':
      return {
        ...baseConfig,
        maxBufferLength: 15,
        maxMaxBufferLength: 30,
        startLevel: 0,              // Start at lowest quality
        abrEwmaDefaultEstimate: 500000, // Assume 500kbps
        capLevelToPlayerSize: true, // Don't load higher than display
      };
    case 'medium':
      return {
        ...baseConfig,
        maxBufferLength: 20,
        maxMaxBufferLength: 45,
        startLevel: 1,              // Start at medium quality
        abrEwmaDefaultEstimate: 2000000,
      };
    case 'fast':
    default:
      return {
        ...baseConfig,
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
        startLevel: -1,             // Auto (usually picks highest)
        abrEwmaDefaultEstimate: 5000000,
      };
  }
}

/**
 * Extract video ID and library ID from various Bunny.net URL formats
 */
export function extractBunnyIds(url: string): { libraryId: string; videoId: string } | null {
  if (!url) return null;

  // Format: iframe.mediadelivery.net/embed/{libraryId}/{videoId}
  const embedMatch = url.match(/iframe\.mediadelivery\.net\/(?:embed|play)\/(\d+)\/([a-f0-9-]+)/i);
  if (embedMatch) {
    return { libraryId: embedMatch[1], videoId: embedMatch[2] };
  }

  // Format: https://vz-{hash}.b-cdn.net/{videoId}/... (playlist.m3u8, mp4, thumbnail, etc.)
  const cdnMatch = url.match(/https?:\/\/(vz-[a-f0-9-]+\.b-cdn\.net)\/([a-f0-9-]+)(?:\/|$)/i);
  if (cdnMatch) {
    return { libraryId: cdnMatch[1].replace(/^vz-/, '').replace(/\.b-cdn\.net$/, ''), videoId: cdnMatch[2] };
  }

  // Format: {libraryId}.mediadelivery.net/{videoId}
  const directMatch = url.match(/(\d+)\.mediadelivery\.net\/([a-f0-9-]+)/i);
  if (directMatch) {
    return { libraryId: directMatch[1], videoId: directMatch[2] };
  }

  return null;
}

/**
 * Generate Bunny.net HLS, MP4 and thumbnail URLs from any Bunny URL format
 * Now includes multiple quality MP4s for progressive loading
 */
export function getBunnyVideoUrls(url: string): BunnyVideoUrls | null {
  if (!url) return null;

  const BUNNY_CDN_HOST = 'vz-78fcd769-050.b-cdn.net';

  // 1) CDN URL
  const cdnMatch = url.match(/https?:\/\/(vz-[a-f0-9-]+\.b-cdn\.net)\/([a-f0-9-]+)(?:\/|$)/i);
  if (cdnMatch) {
    const host = cdnMatch[1];
    const videoId = cdnMatch[2];
    return {
      hls: `https://${host}/${videoId}/playlist.m3u8`,
      mp4: `https://${host}/${videoId}/play_720p.mp4`,
      mp4_360p: `https://${host}/${videoId}/play_360p.mp4`,
      mp4_480p: `https://${host}/${videoId}/play_480p.mp4`,
      mp4_720p: `https://${host}/${videoId}/play_720p.mp4`,
      mp4_1080p: `https://${host}/${videoId}/play_1080p.mp4`,
      thumbnail: `https://${host}/${videoId}/thumbnail.jpg`,
    };
  }

  // 2) Iframe embed/play URL
  const embedMatch = url.match(/iframe\.mediadelivery\.net\/(?:embed|play)\/(\d+)\/([a-f0-9-]+)/i);
  if (embedMatch) {
    const videoId = embedMatch[2];
    return {
      hls: `https://${BUNNY_CDN_HOST}/${videoId}/playlist.m3u8`,
      mp4: `https://${BUNNY_CDN_HOST}/${videoId}/play_720p.mp4`,
      mp4_360p: `https://${BUNNY_CDN_HOST}/${videoId}/play_360p.mp4`,
      mp4_480p: `https://${BUNNY_CDN_HOST}/${videoId}/play_480p.mp4`,
      mp4_720p: `https://${BUNNY_CDN_HOST}/${videoId}/play_720p.mp4`,
      mp4_1080p: `https://${BUNNY_CDN_HOST}/${videoId}/play_1080p.mp4`,
      thumbnail: `https://${BUNNY_CDN_HOST}/${videoId}/thumbnail.jpg`,
    };
  }

  // 3) Direct mediadelivery.net URL
  const directMatch = url.match(/(\d+)\.mediadelivery\.net\/([a-f0-9-]+)/i);
  if (directMatch) {
    const videoId = directMatch[2];
    return {
      hls: `https://${BUNNY_CDN_HOST}/${videoId}/playlist.m3u8`,
      mp4: `https://${BUNNY_CDN_HOST}/${videoId}/play_720p.mp4`,
      mp4_360p: `https://${BUNNY_CDN_HOST}/${videoId}/play_360p.mp4`,
      mp4_480p: `https://${BUNNY_CDN_HOST}/${videoId}/play_480p.mp4`,
      mp4_720p: `https://${BUNNY_CDN_HOST}/${videoId}/play_720p.mp4`,
      mp4_1080p: `https://${BUNNY_CDN_HOST}/${videoId}/play_1080p.mp4`,
      thumbnail: `https://${BUNNY_CDN_HOST}/${videoId}/thumbnail.jpg`,
    };
  }

  return null;
}

/**
 * Return multiple candidate CDN URLs for the same Bunny video.
 */
export function getBunnyVideoUrlCandidates(url: string): BunnyVideoUrls[] {
  if (!url) return [];

  const direct = getBunnyVideoUrls(url);
  const ids = extractBunnyIds(url);

  if (!ids) return direct ? [direct] : [];

  const { libraryId, videoId } = ids;

  const candidateHosts = [
    'vz-78fcd769-050.b-cdn.net',
    `vz-${libraryId}.b-cdn.net`,
  ];

  const uniqueHosts = Array.from(new Set(candidateHosts));
  return uniqueHosts.map((host) => ({
    hls: `https://${host}/${videoId}/playlist.m3u8`,
    mp4: `https://${host}/${videoId}/play_720p.mp4`,
    mp4_360p: `https://${host}/${videoId}/play_360p.mp4`,
    mp4_480p: `https://${host}/${videoId}/play_480p.mp4`,
    mp4_720p: `https://${host}/${videoId}/play_720p.mp4`,
    mp4_1080p: `https://${host}/${videoId}/play_1080p.mp4`,
    thumbnail: `https://${host}/${videoId}/thumbnail.jpg`,
  }));
}

/**
 * Preload an HLS video in the background (for next video in feed)
 */
export function preloadHLSVideo(url: string): void {
  if (!Hls.isSupported()) return;

  const urls = getBunnyVideoUrls(url);
  if (!urls?.hls) return;

  // Check if already cached
  if (preloadCache.has(urls.hls)) return;

  // Evict oldest if cache full
  if (preloadCache.size >= MAX_PRELOAD_CACHE) {
    const oldest = preloadCache.keys().next().value;
    if (oldest) {
      preloadCache.get(oldest)?.destroy();
      preloadCache.delete(oldest);
    }
  }

  // Create HLS instance and load manifest only
  const hls = new Hls({
    enableWorker: true,
    maxBufferLength: 0, // Don't buffer, just load manifest
    maxMaxBufferLength: 0,
  });

  hls.loadSource(urls.hls);
  preloadCache.set(urls.hls, hls);
}

/**
 * Clear preload cache for a specific URL or all
 */
export function clearPreloadCache(url?: string): void {
  if (url) {
    const urls = getBunnyVideoUrls(url);
    if (urls?.hls && preloadCache.has(urls.hls)) {
      preloadCache.get(urls.hls)?.destroy();
      preloadCache.delete(urls.hls);
    }
  } else {
    preloadCache.forEach(hls => hls.destroy());
    preloadCache.clear();
  }
}

/**
 * Custom hook for HLS video playback with Bunny.net
 * OPTIMIZED VERSION with fast start and adaptive quality
 */
export function useHLSPlayer(
  videoUrl: string | null,
  options: UseHLSPlayerOptions = {}
) {
  const {
    autoPlay = true,
    muted = true,
    loop = true,
    poster,
    fastStart = true,          // Enable fast start by default
    connectionAware = true,    // Enable network-aware quality
  } = options;

  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const fatalErrorCountRef = useRef(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentMuted, setCurrentMuted] = useState(muted);
  const [sourceIndex, setSourceIndex] = useState(0);
  const [networkQuality, setNetworkQuality] = useState<NetworkQuality>('unknown');
  const [currentQuality, setCurrentQuality] = useState<number>(-1);
  const playbackStartedRef = useRef(false);

  // Detect network quality on mount and when connection changes
  useEffect(() => {
    const updateQuality = () => setNetworkQuality(detectNetworkQuality());
    updateQuality();

    const connection = (navigator as any).connection;
    if (connection) {
      connection.addEventListener('change', updateQuality);
      return () => connection.removeEventListener('change', updateQuality);
    }
  }, []);

  // Reset source attempts when URL changes
  useEffect(() => {
    setSourceIndex(0);
    playbackStartedRef.current = false;
  }, [videoUrl]);

  // Get candidate HLS URLs
  const candidates = videoUrl ? getBunnyVideoUrlCandidates(videoUrl) : [];
  const selected = candidates[sourceIndex] || (videoUrl ? getBunnyVideoUrls(videoUrl) : null);

  const hlsUrl = selected?.hls || null;
  const mp4Url = selected?.mp4 || null;
  const thumbnailUrl = poster || selected?.thumbnail || null;

  // Check if it's a direct MP4 URL
  const isDirectMp4 = videoUrl && !getBunnyVideoUrls(videoUrl) && (videoUrl.endsWith('.mp4') || videoUrl.includes('.mp4?'));

  // Initialize HLS player with optimized config
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (!hlsUrl && !isDirectMp4) return;

    // Handle direct MP4 files
    if (isDirectMp4 && videoUrl) {
      setIsLoading(true);
      setError(null);

      video.playsInline = true;
      video.loop = loop;
      video.preload = fastStart ? 'auto' : 'metadata';
      video.muted = currentMuted;
      video.src = videoUrl;

      const handleCanPlay = () => {
        setIsLoading(false);
        if (autoPlay) {
          playWithFallback(video);
        }
      };

      const handleError = () => {
        setError('Error al cargar el video');
        setIsLoading(false);
      };

      video.addEventListener('canplay', handleCanPlay, { once: true });
      video.addEventListener('error', handleError, { once: true });
      video.load();

      return () => {
        video.removeEventListener('canplay', handleCanPlay);
        video.removeEventListener('error', handleError);
      };
    }

    if (!hlsUrl) return;

    setIsLoading(true);
    setError(null);
    fatalErrorCountRef.current = 0;

    // Configure video element
    video.playsInline = true;
    video.loop = loop;
    video.preload = fastStart ? 'auto' : 'metadata';
    video.muted = currentMuted;

    // Check for preloaded HLS instance
    let hls: Hls | null = preloadCache.get(hlsUrl) || null;
    if (hls) {
      preloadCache.delete(hlsUrl);
    }

    // Check if browser natively supports HLS (Safari/iOS)
    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = hlsUrl;

      const handleCanPlay = () => {
        setIsLoading(false);
        if (autoPlay) {
          playWithFallback(video);
        }
      };

      video.addEventListener('canplay', handleCanPlay, { once: true });
      video.load();

      return () => {
        video.removeEventListener('canplay', handleCanPlay);
      };
    }

    // Use hls.js for other browsers
    if (Hls.isSupported()) {
      // Get optimized config based on network and fast start preference
      const hlsConfig = getOptimalHlsConfig(
        connectionAware ? networkQuality : 'unknown',
        fastStart
      );

      if (!hls) {
        hls = new Hls(hlsConfig as any);
        hls.loadSource(hlsUrl);
      } else {
        // Reconfigure preloaded instance
        Object.assign(hls.config, hlsConfig);
      }

      hlsRef.current = hls;
      hls.attachMedia(video);

      // Track quality level changes
      hls.on(Hls.Events.LEVEL_SWITCHED, (_, data) => {
        setCurrentQuality(data.level);
      });

      hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
        setIsLoading(false);

        // Log available qualities
        if (process.env.NODE_ENV === 'development') {
          console.log('[HLS] Available qualities:', data.levels.map(l => `${l.height}p`));
        }

        if (autoPlay) {
          playWithFallback(video);
        }
      });

      // Can play through - buffer enough for smooth playback
      hls.on(Hls.Events.FRAG_BUFFERED, () => {
        if (!playbackStartedRef.current && autoPlay && video.paused) {
          playbackStartedRef.current = true;
          playWithFallback(video);
        }
      });

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (!data.fatal) return;

        console.warn('[HLS] Fatal error:', {
          type: data.type,
          details: data.details,
          reason: data.reason,
        });

        // Try alternate CDN host
        if (candidates.length > 0 && sourceIndex < candidates.length - 1) {
          setSourceIndex((prev) => prev + 1);
          return;
        }

        fatalErrorCountRef.current += 1;

        // Retry logic
        switch (data.type) {
          case Hls.ErrorTypes.NETWORK_ERROR:
            if (fatalErrorCountRef.current <= 3) {
              hls!.startLoad();
              return;
            }
            break;
          case Hls.ErrorTypes.MEDIA_ERROR:
            if (fatalErrorCountRef.current <= 3) {
              hls!.recoverMediaError();
              return;
            }
            break;
          default:
            if (fatalErrorCountRef.current <= 2) {
              hls!.stopLoad();
              hls!.startLoad();
              return;
            }
            break;
        }

        // Fallback to MP4
        fallbackToMp4(video, mp4Url);
      });

      return () => {
        hls?.destroy();
        hlsRef.current = null;
      };
    }

    // Fallback to MP4 for browsers without HLS support
    fallbackToMp4(video, mp4Url);
  }, [hlsUrl, mp4Url, loop, isDirectMp4, videoUrl, autoPlay, currentMuted, networkQuality, fastStart, connectionAware]);

  // Helper: Play video with muted fallback
  const playWithFallback = useCallback((video: HTMLVideoElement) => {
    video.muted = currentMuted;
    video.play().catch(() => {
      video.muted = true;
      setCurrentMuted(true);
      video.play().catch(() => {
        console.warn('[HLS] Autoplay completely blocked');
      });
    });
  }, [currentMuted]);

  // React to autoPlay changes
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (autoPlay) {
      playWithFallback(video);
    } else {
      video.pause();
      try {
        video.currentTime = 0;
      } catch {
        // ignore
      }
    }
  }, [autoPlay, hlsUrl, playWithFallback]);

  // Helper: Fallback to MP4
  const fallbackToMp4 = useCallback((video: HTMLVideoElement, mp4: string | null) => {
    if (mp4) {
      setError(null);
      setIsLoading(true);
      video.src = mp4;
      video.load();

      const handleCanPlay = () => {
        setIsLoading(false);
        if (autoPlay) {
          playWithFallback(video);
        }
      };

      video.addEventListener('canplay', handleCanPlay, { once: true });
    } else {
      setError('Video playback error');
      setIsLoading(false);
    }
  }, [autoPlay, playWithFallback]);

  // Clear error on successful playback
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const clearOnPlay = () => setError(null);
    video.addEventListener('playing', clearOnPlay);
    video.addEventListener('canplay', clearOnPlay);
    return () => {
      video.removeEventListener('playing', clearOnPlay);
      video.removeEventListener('canplay', clearOnPlay);
    };
  }, [hlsUrl]);

  // Sync muted state
  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.muted = currentMuted;
    }
  }, [currentMuted]);

  useEffect(() => {
    setCurrentMuted(muted);
  }, [muted]);

  // Track play/pause state
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
  }, [loop]);

  const play = useCallback(() => {
    const video = videoRef.current;
    if (video) {
      video.play().catch(() => {
        video.muted = true;
        setCurrentMuted(true);
        video.play().catch(() => {});
      });
    }
  }, []);

  const pause = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.pause();
    try {
      video.currentTime = 0;
    } catch {
      // ignore
    }
  }, []);

  const toggleMute = useCallback(() => {
    setCurrentMuted(prev => !prev);
  }, []);

  const setMuted = useCallback((muted: boolean) => {
    setCurrentMuted(muted);
  }, []);

  // Set quality level manually (for quality selector UI)
  const setQualityLevel = useCallback((level: number) => {
    if (hlsRef.current) {
      hlsRef.current.currentLevel = level;
    }
  }, []);

  // Get available quality levels
  const getQualityLevels = useCallback(() => {
    if (!hlsRef.current) return [];
    return hlsRef.current.levels.map((level, index) => ({
      index,
      height: level.height,
      bitrate: level.bitrate,
      label: `${level.height}p`,
    }));
  }, []);

  return {
    videoRef,
    isPlaying,
    isLoading,
    error,
    isMuted: currentMuted,
    thumbnailUrl,
    play,
    pause,
    toggleMute,
    setMuted,
    // New optimization features
    networkQuality,
    currentQuality,
    setQualityLevel,
    getQualityLevels,
  };
}
