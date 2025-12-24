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
 */
export function getBunnyVideoUrls(url: string): BunnyVideoUrls | null {
  if (!url) return null;
  
  // If it's already a direct HLS/MP4/thumbnail URL, extract the base
  const hlsMatch = url.match(/(https:\/\/vz-[a-f0-9-]+\.b-cdn\.net\/[a-f0-9-]+)/i);
  if (hlsMatch) {
    const baseUrl = hlsMatch[1];
    return {
      hls: `${baseUrl}/playlist.m3u8`,
      mp4: `${baseUrl}/play_720p.mp4`,
      thumbnail: `${baseUrl}/thumbnail.jpg`
    };
  }
  
  // If it's an iframe embed URL, we need to find the CDN base from thumbnail if available
  const embedMatch = url.match(/iframe\.mediadelivery\.net\/embed\/(\d+)\/([a-f0-9-]+)/i);
  if (embedMatch) {
    const videoId = embedMatch[2];
    // Use the known CDN pattern from network logs
    // The CDN uses a hash format like vz-78fcd769-050.b-cdn.net
    // We'll construct URLs using the video ID and hope the CDN resolves it
    // For now, try common CDN patterns - the actual CDN hostname is project-specific
    return {
      hls: `https://vz-78fcd769-050.b-cdn.net/${videoId}/playlist.m3u8`,
      mp4: `https://vz-78fcd769-050.b-cdn.net/${videoId}/play_720p.mp4`,
      thumbnail: `https://vz-78fcd769-050.b-cdn.net/${videoId}/thumbnail.jpg`
    };
  }

  return null;
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

  // Get HLS URL from any Bunny URL format
  const bunnyUrls = videoUrl ? getBunnyVideoUrls(videoUrl) : null;
  const hlsUrl = bunnyUrls?.hls || null;
  const mp4Url = bunnyUrls?.mp4 || null;
  const thumbnailUrl = poster || bunnyUrls?.thumbnail || null;

  // Initialize HLS player - setup only, no autoplay
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !hlsUrl) return;

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
  }, [hlsUrl, mp4Url, loop]); // Removed autoPlay and currentMuted from deps to prevent re-init

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

  // Track play/pause state
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => {
      if (loop) {
        video.currentTime = 0;
        video.play().catch(() => {});
      } else {
        setIsPlaying(false);
      }
    };
    const handleWaiting = () => setIsLoading(true);
    const handlePlaying = () => setIsLoading(false);

    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('ended', handleEnded);
    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('playing', handlePlaying);

    return () => {
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('ended', handleEnded);
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
    videoRef.current?.pause();
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
