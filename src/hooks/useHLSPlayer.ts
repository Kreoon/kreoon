import { useEffect, useRef, useCallback, useState } from 'react';
import type Hls from 'hls.js';

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
  mp4_1440p: string;
  mp4_2160p: string;
}

// Network quality detection
type NetworkQuality = 'slow' | 'medium' | 'fast' | 'unknown';

// Cache for preloaded HLS instances
const preloadCache = new Map<string, Hls>();
const MAX_PRELOAD_CACHE = 3;

// Lazy-loaded HLS module reference
let HlsModule: typeof import('hls.js').default | null = null;
let hlsLoadPromise: Promise<typeof import('hls.js').default> | null = null;

/**
 * Dynamically load HLS.js only when needed (saves 522KB from initial bundle)
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
  // Basic check without loading HLS.js - works for most browsers
  const mediaSource = window.MediaSource || (window as any).WebKitMediaSource;
  return !!mediaSource && typeof mediaSource.isTypeSupported === 'function' &&
         mediaSource.isTypeSupported('video/mp4; codecs="avc1.42E01E,mp4a.40.2"');
}

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
function getOptimalHlsConfig(networkQuality: NetworkQuality, fastStart: boolean): Record<string, any> {
  const baseConfig = {
    enableWorker: true,
    lowLatencyMode: false,
  };

  if (fastStart) {
    // Fast start with min 720p policy
    return {
      ...baseConfig,
      maxBufferLength: 30,
      maxMaxBufferLength: 60,
      maxBufferSize: 60 * 1000000,   // 60MB for 720p+
      maxBufferHole: 0.5,
      startLevel: 2,                  // Min 720p always
      autoLevelCapping: -1,           // No cap - seek max quality
      abrEwmaDefaultEstimate: networkQuality === 'fast' ? 5000000 : 2000000,
      abrBandWidthFactor: 0.9,
      abrBandWidthUpFactor: 0.7,
      fragLoadingTimeOut: 10000,
      fragLoadingMaxRetry: 2,
      startFragPrefetch: true,
      testBandwidth: false,
    };
  }

  // Quality-based configs
  // POLICY: Minimum 720p (startLevel: 2), always seek max quality
  // Quality levels: 0=360p, 1=480p, 2=720p, 3=1080p, 4=1440p, 5=2160p
  switch (networkQuality) {
    case 'slow':
      return {
        ...baseConfig,
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
        startLevel: 2,              // Min 720p even on slow connection
        abrEwmaDefaultEstimate: 500000,
        autoLevelCapping: -1,       // No cap - allow upgrade to max
      };
    case 'medium':
      return {
        ...baseConfig,
        maxBufferLength: 45,
        maxMaxBufferLength: 90,
        startLevel: 2,              // Min 720p
        abrEwmaDefaultEstimate: 2000000,
        autoLevelCapping: -1,
      };
    case 'fast':
    default:
      return {
        ...baseConfig,
        maxBufferLength: 60,
        maxMaxBufferLength: 120,
        startLevel: 3,              // Start at 1080p on fast connection
        abrEwmaDefaultEstimate: 5000000,
        autoLevelCapping: -1,
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
 * Get a Bunny CDN thumbnail URL from any Bunny video URL.
 * Returns null for non-Bunny URLs.
 */
export function getBunnyThumbnailUrl(url: string): string | null {
  const ids = extractBunnyIds(url);
  if (!ids) return null;
  const BUNNY_CDN_HOST = 'vz-78fcd769-050.b-cdn.net';
  return `https://${BUNNY_CDN_HOST}/${ids.videoId}/thumbnail.jpg`;
}

/**
 * Generate Bunny.net HLS, MP4 and thumbnail URLs from any Bunny URL format
 * Now includes multiple quality MP4s for progressive loading
 */
export function getBunnyVideoUrls(url: string): BunnyVideoUrls | null {
  if (!url) return null;

  const BUNNY_CDN_HOST = 'vz-78fcd769-050.b-cdn.net';

  // Helper to build all quality URLs for a given host and videoId
  const buildUrls = (host: string, videoId: string): BunnyVideoUrls => ({
    hls: `https://${host}/${videoId}/playlist.m3u8`,
    mp4: `https://${host}/${videoId}/play_1080p.mp4`,
    mp4_360p: `https://${host}/${videoId}/play_360p.mp4`,
    mp4_480p: `https://${host}/${videoId}/play_480p.mp4`,
    mp4_720p: `https://${host}/${videoId}/play_720p.mp4`,
    mp4_1080p: `https://${host}/${videoId}/play_1080p.mp4`,
    mp4_1440p: `https://${host}/${videoId}/play_1440p.mp4`,
    mp4_2160p: `https://${host}/${videoId}/play_2160p.mp4`,
    thumbnail: `https://${host}/${videoId}/thumbnail.jpg`,
  });

  // 1) CDN URL
  const cdnMatch = url.match(/https?:\/\/(vz-[a-f0-9-]+\.b-cdn\.net)\/([a-f0-9-]+)(?:\/|$)/i);
  if (cdnMatch) {
    return buildUrls(cdnMatch[1], cdnMatch[2]);
  }

  // 2) Iframe embed/play URL
  const embedMatch = url.match(/iframe\.mediadelivery\.net\/(?:embed|play)\/(\d+)\/([a-f0-9-]+)/i);
  if (embedMatch) {
    return buildUrls(BUNNY_CDN_HOST, embedMatch[2]);
  }

  // 3) Direct mediadelivery.net URL
  const directMatch = url.match(/(\d+)\.mediadelivery\.net\/([a-f0-9-]+)/i);
  if (directMatch) {
    return buildUrls(BUNNY_CDN_HOST, directMatch[2]);
  }

  return null;
}

/**
 * Async: probe Bunny CDN from highest to lowest quality and return the best available MP4 URL.
 * Falls back to 720p (guaranteed) if no higher quality exists.
 */
export async function findBestBunnyMp4(url: string): Promise<string> {
  const urls = getBunnyVideoUrls(url);
  if (!urls) return url;

  const qualities: Array<keyof BunnyVideoUrls> = [
    'mp4_2160p', 'mp4_1440p', 'mp4_1080p', 'mp4_720p',
  ];

  for (const q of qualities) {
    const candidate = urls[q];
    try {
      const res = await fetch(candidate, { method: 'HEAD' });
      if (res.ok) return candidate;
    } catch {
      // probe failed, try next
    }
  }

  // 720p is always available as absolute fallback
  return urls.mp4_720p;
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
    mp4: `https://${host}/${videoId}/play_1080p.mp4`,
    mp4_360p: `https://${host}/${videoId}/play_360p.mp4`,
    mp4_480p: `https://${host}/${videoId}/play_480p.mp4`,
    mp4_720p: `https://${host}/${videoId}/play_720p.mp4`,
    mp4_1080p: `https://${host}/${videoId}/play_1080p.mp4`,
    mp4_1440p: `https://${host}/${videoId}/play_1440p.mp4`,
    mp4_2160p: `https://${host}/${videoId}/play_2160p.mp4`,
    thumbnail: `https://${host}/${videoId}/thumbnail.jpg`,
  }));
}

/**
 * Preload an HLS video in the background (for next video in feed)
 * Now loads HLS.js dynamically
 */
export async function preloadHLSVideo(url: string): Promise<void> {
  if (!isHlsSupported()) return;

  const urls = getBunnyVideoUrls(url);
  if (!urls?.hls) return;

  // Check if already cached
  if (preloadCache.has(urls.hls)) return;

  try {
    const Hls = await loadHls();
    if (!Hls.isSupported()) return;

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
  } catch (error) {
    console.warn('[HLS] Failed to preload:', error);
  }
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
 * OPTIMIZED VERSION with dynamic HLS.js loading (saves 522KB from initial bundle)
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

  // Helper: Play video with muted fallback
  const playWithFallback = useCallback((video: HTMLVideoElement, mutedState: boolean) => {
    video.muted = mutedState;
    video.play().catch(() => {
      video.muted = true;
      setCurrentMuted(true);
      video.play().catch(() => {
        console.warn('[HLS] Autoplay completely blocked');
      });
    });
  }, []);

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
          playWithFallback(video, currentMuted);
        }
      };

      video.addEventListener('canplay', handleCanPlay, { once: true });
    } else {
      setError('Video playback error');
      setIsLoading(false);
    }
  }, [autoPlay, playWithFallback, currentMuted]);

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
          playWithFallback(video, currentMuted);
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

    // Check if browser natively supports HLS (Safari/iOS)
    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = hlsUrl;

      const handleCanPlay = () => {
        setIsLoading(false);
        if (autoPlay) {
          playWithFallback(video, currentMuted);
        }
      };

      video.addEventListener('canplay', handleCanPlay, { once: true });
      video.load();

      return () => {
        video.removeEventListener('canplay', handleCanPlay);
      };
    }

    // Use hls.js for other browsers - LOAD DYNAMICALLY
    if (!isHlsSupported()) {
      // Fallback to MP4 for browsers without HLS support
      fallbackToMp4(video, mp4Url);
      return;
    }

    // Load HLS.js dynamically and initialize
    let cancelled = false;

    const initHls = async () => {
      try {
        const Hls = await loadHls();

        if (cancelled) return;

        if (!Hls.isSupported()) {
          fallbackToMp4(video, mp4Url);
          return;
        }

        // Check for preloaded HLS instance
        let hls: Hls | null = preloadCache.get(hlsUrl) || null;
        if (hls) {
          preloadCache.delete(hlsUrl);
        }

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
            playWithFallback(video, currentMuted);
          }
        });

        // Can play through - buffer enough for smooth playback
        hls.on(Hls.Events.FRAG_BUFFERED, () => {
          if (!playbackStartedRef.current && autoPlay && video.paused) {
            playbackStartedRef.current = true;
            playWithFallback(video, currentMuted);
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
      } catch (err) {
        console.error('[HLS] Failed to load hls.js:', err);
        fallbackToMp4(video, mp4Url);
      }
    };

    initHls();

    return () => {
      cancelled = true;
      hlsRef.current?.destroy();
      hlsRef.current = null;
    };
  }, [hlsUrl, mp4Url, loop, isDirectMp4, videoUrl, autoPlay, currentMuted, networkQuality, fastStart, connectionAware, fallbackToMp4, playWithFallback, candidates.length, sourceIndex]);

  // React to autoPlay changes
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (autoPlay) {
      playWithFallback(video, currentMuted);
    } else {
      video.pause();
      try {
        video.currentTime = 0;
      } catch {
        // ignore
      }
    }
  }, [autoPlay, hlsUrl, playWithFallback, currentMuted]);

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
