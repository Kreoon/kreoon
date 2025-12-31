import { useEffect, useRef, useCallback, useState } from 'react';
import Hls from 'hls.js';

interface UseHLSPlayerOptions {
  autoPlay?: boolean;
  muted?: boolean;
  loop?: boolean;
  poster?: string;
}

interface BunnyVideoUrls {
  hls: string;
  mp4: string;
  thumbnail: string;
}

/**
 * Extract video ID and library ID from various Bunny.net URL formats
 */
export function extractBunnyIds(url: string): { libraryId: string; videoId: string } | null {
  if (!url) return null;

  // Format: iframe.mediadelivery.net/embed/{libraryId}/{videoId}
  const embedMatch = url.match(/iframe\.mediadelivery\.net\/embed\/(\d+)\/([a-f0-9-]+)/i);
  if (embedMatch) {
    return { libraryId: embedMatch[1], videoId: embedMatch[2] };
  }

  // Format: vz-{hash}.b-cdn.net/{videoId} (e.g., vz-78fcd769-050.b-cdn.net)
  const cdnHashMatch = url.match(/vz-([a-f0-9-]+)\.b-cdn\.net\/([a-f0-9-]+)/i);
  if (cdnHashMatch) {
    // Extract video ID, library ID will be derived from other patterns or use a default
    return { libraryId: cdnHashMatch[1], videoId: cdnHashMatch[2] };
  }

  // Format: vz-{libraryId}.b-cdn.net/{videoId} (numeric library ID)
  const cdnMatch = url.match(/vz-(\d+)\.b-cdn\.net\/([a-f0-9-]+)/i);
  if (cdnMatch) {
    return { libraryId: cdnMatch[1], videoId: cdnMatch[2] };
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
 * Supports:
 * - iframe.mediadelivery.net/embed/{libraryId}/{videoId}
 * - vz-*.b-cdn.net/{videoId}
 * - Direct playlist/mp4/thumbnail URLs
 */
export function getBunnyVideoUrls(url: string): BunnyVideoUrls | null {
  if (!url) return null;

  // Known Bunny CDN host for this project (from network logs)
  const BUNNY_CDN_HOST = 'vz-78fcd769-050.b-cdn.net';

  // 1. Already a CDN URL (vz-*.b-cdn.net)
  const cdnMatch = url.match(/https:\/\/(vz-[a-f0-9-]+\.b-cdn\.net)\/([a-f0-9-]+)/i);
  if (cdnMatch) {
    const host = cdnMatch[1];
    const videoId = cdnMatch[2];
    return {
      hls: `https://${host}/${videoId}/playlist.m3u8`,
      mp4: `https://${host}/${videoId}/play_720p.mp4`,
      thumbnail: `https://${host}/${videoId}/thumbnail.jpg`,
    };
  }

  // 2. Iframe embed URL (iframe.mediadelivery.net/embed/{libraryId}/{videoId})
  const embedMatch = url.match(/iframe\.mediadelivery\.net\/embed\/(\d+)\/([a-f0-9-]+)/i);
  if (embedMatch) {
    const videoId = embedMatch[2];
    return {
      hls: `https://${BUNNY_CDN_HOST}/${videoId}/playlist.m3u8`,
      mp4: `https://${BUNNY_CDN_HOST}/${videoId}/play_720p.mp4`,
      thumbnail: `https://${BUNNY_CDN_HOST}/${videoId}/thumbnail.jpg`,
    };
  }

  // 3. Direct mediadelivery.net URL ({libraryId}.mediadelivery.net/{videoId})
  const directMatch = url.match(/(\d+)\.mediadelivery\.net\/([a-f0-9-]+)/i);
  if (directMatch) {
    const videoId = directMatch[2];
    return {
      hls: `https://${BUNNY_CDN_HOST}/${videoId}/playlist.m3u8`,
      mp4: `https://${BUNNY_CDN_HOST}/${videoId}/play_720p.mp4`,
      thumbnail: `https://${BUNNY_CDN_HOST}/${videoId}/thumbnail.jpg`,
    };
  }

  return null;
}

/**
 * Return multiple candidate CDN URLs for the same Bunny video.
 * Some accounts/libraries can serve from different pull zones; trying alternates
 * fixes cases where a specific user's videos stay stuck on the thumbnail.
 */
export function getBunnyVideoUrlCandidates(url: string): BunnyVideoUrls[] {
  if (!url) return [];

  // If it's already a direct CDN URL, just use that host.
  const direct = getBunnyVideoUrls(url);
  const ids = extractBunnyIds(url);

  if (!ids) return direct ? [direct] : [];

  const { libraryId, videoId } = ids;

  // Candidate hosts: project default + library-based host fallback
  const candidateHosts = [
    'vz-78fcd769-050.b-cdn.net',
    `vz-${libraryId}.b-cdn.net`,
  ];

  const uniqueHosts = Array.from(new Set(candidateHosts));
  return uniqueHosts.map((host) => ({
    hls: `https://${host}/${videoId}/playlist.m3u8`,
    mp4: `https://${host}/${videoId}/play_720p.mp4`,
    thumbnail: `https://${host}/${videoId}/thumbnail.jpg`,
  }));
}

/**
 * Custom hook for HLS video playback with Bunny.net
 * Supports native HLS on Safari/iOS and hls.js for other browsers
 * With MP4 fallback for maximum compatibility
 */
export function useHLSPlayer(
  videoUrl: string | null,
  options: UseHLSPlayerOptions = {}
) {
  const {
    autoPlay = true, // Autoplay when entering viewport
    muted = true, // Start MUTED for autoplay compatibility
    loop = true,
    poster
  } = options;

  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const fatalErrorCountRef = useRef(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentMuted, setCurrentMuted] = useState(muted);
  const [sourceIndex, setSourceIndex] = useState(0);

  // Reset source attempts when URL changes
  useEffect(() => {
    setSourceIndex(0);
  }, [videoUrl]);

  // Get candidate HLS URLs from any Bunny URL format
  const candidates = videoUrl ? getBunnyVideoUrlCandidates(videoUrl) : [];
  const selected = candidates[sourceIndex] || (videoUrl ? getBunnyVideoUrls(videoUrl) : null);

  const hlsUrl = selected?.hls || null;
  const mp4Url = selected?.mp4 || null;
  const thumbnailUrl = poster || selected?.thumbnail || null;

  // Check if it's a direct MP4 URL (not from Bunny)
  const isDirectMp4 = videoUrl && !getBunnyVideoUrls(videoUrl) && (videoUrl.endsWith('.mp4') || videoUrl.includes('.mp4?'));

  // Initialize HLS player - setup only, no autoplay
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    
    // If no Bunny URLs and not a direct MP4, nothing to play
    if (!hlsUrl && !isDirectMp4) return;
    
    // Handle direct MP4 files (e.g., from Supabase storage)
    if (isDirectMp4 && videoUrl) {
      setIsLoading(true);
      setError(null);
      
      video.playsInline = true;
      video.loop = loop;
      video.preload = 'metadata';
      video.muted = currentMuted;
      video.src = videoUrl;
      
      const handleCanPlay = () => {
        setIsLoading(false);
        if (autoPlay) {
          // Inline play with fallback for direct MP4
          video.muted = currentMuted;
          video.play().catch(() => {
            video.muted = true;
            setCurrentMuted(true);
            video.play().catch(() => {
              console.warn('[MP4] Autoplay completely blocked');
            });
          });
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
    
    // Continue with HLS logic for Bunny videos
    if (!hlsUrl) return;

    setIsLoading(true);
    setError(null);
    fatalErrorCountRef.current = 0;

    // Configure video element for mobile compatibility
    video.playsInline = true;
    video.loop = loop;
    video.preload = 'metadata';
    video.muted = currentMuted;

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

    // Use hls.js for other browsers (Chrome, Firefox, Edge, etc.)
    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        backBufferLength: 90,
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
        startLevel: -1, // Auto quality selection
      });

      hlsRef.current = hls;
      hls.loadSource(hlsUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setIsLoading(false);
        if (autoPlay) {
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

        // Try alternate CDN host (fixes cases where some videos exist in a different pull zone)
        if (candidates.length > 0 && sourceIndex < candidates.length - 1) {
          setSourceIndex((prev) => prev + 1);
          return;
        }

        fatalErrorCountRef.current += 1;

        // Retry logic based on error type
        switch (data.type) {
          case Hls.ErrorTypes.NETWORK_ERROR:
            if (fatalErrorCountRef.current <= 3) {
              hls.startLoad();
              return;
            }
            break;
          case Hls.ErrorTypes.MEDIA_ERROR:
            if (fatalErrorCountRef.current <= 3) {
              hls.recoverMediaError();
              return;
            }
            break;
          default:
            if (fatalErrorCountRef.current <= 2) {
              hls.stopLoad();
              hls.startLoad();
              return;
            }
            break;
        }

        // Fallback to MP4 after all retries exhausted
        fallbackToMp4(video, mp4Url);
      });

      return () => {
        hls.destroy();
        hlsRef.current = null;
      };
    }

    // Fallback to MP4 for browsers without HLS support
    fallbackToMp4(video, mp4Url);
  }, [hlsUrl, mp4Url, loop, isDirectMp4, videoUrl, autoPlay, currentMuted]); // Added isDirectMp4 and videoUrl for direct MP4 support

  // Helper: Play video with muted fallback for autoplay policy
  const playWithFallback = useCallback((video: HTMLVideoElement) => {
    video.muted = currentMuted;
    video.play().catch(() => {
      // Autoplay blocked - try muted
      video.muted = true;
      setCurrentMuted(true);
      video.play().catch(() => {
        console.warn('[HLS] Autoplay completely blocked');
      });
    });
  }, [currentMuted]);

  // React to autoPlay changes without re-initializing HLS
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (autoPlay) {
      playWithFallback(video);
    } else {
      video.pause();
      // Reset so no audio keeps playing / no hidden loop when leaving viewport
      try {
        video.currentTime = 0;
      } catch {
        // ignore
      }
    }
  }, [autoPlay, hlsUrl, playWithFallback]);

  // Helper: Fallback to MP4 when HLS fails
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

  // Sync muted state to video element
  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.muted = currentMuted;
    }
  }, [currentMuted]);

  // Sync currentMuted with external muted prop changes
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
    // NOTE: do not force replay on "ended" here; native video.loop handles looping.
    // Forcing play() on ended can cause "audio fantasma" when the video leaves viewport.
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
    setMuted
  };
}
