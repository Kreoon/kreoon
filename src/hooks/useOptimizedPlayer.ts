import { useMemo } from 'react';
import { useHLSPlayer, getBunnyVideoUrls, getBunnyThumbnailUrl } from './useHLSPlayer';

/**
 * Player context determines quality settings and behavior
 */
export type PlayerContext =
  | 'feed'        // Feed/grid view - start 720p, upgrade to 1080p+
  | 'fullscreen'  // Modal/fullscreen - start 1080p, upgrade to 4K
  | 'kanban'      // Kanban cards - thumbnail until play, then 720p
  | 'portfolio'   // Portfolio gallery - 720p initial, adaptive
  | 'mobile'      // Mobile view - 720p guaranteed, smart upgrade
  | 'preview';    // Quick preview - 720p, minimal buffer

/**
 * Quality level indices in Bunny Stream HLS
 * 0 = 360p, 1 = 480p, 2 = 720p, 3 = 1080p, 4 = 1440p, 5 = 2160p
 */
const QUALITY_LEVELS = {
  '360p': 0,
  '480p': 1,
  '720p': 2,
  '1080p': 3,
  '1440p': 4,
  '2160p': 5,
} as const;

/**
 * Minimum quality policy: NEVER go below 720p
 */
const MIN_QUALITY_LEVEL = QUALITY_LEVELS['720p']; // index 2

interface OptimizedPlayerConfig {
  autoPlay: boolean;
  muted: boolean;
  loop: boolean;
  fastStart: boolean;
  connectionAware: boolean;
  // Extended options
  startLevel: number;
  maxBufferLength: number;
  lazyLoad: boolean;
  showThumbnailUntilPlay: boolean;
}

interface UseOptimizedPlayerOptions {
  onPlay?: () => void;
  onPause?: () => void;
  onError?: (error: string) => void;
  poster?: string;
}

/**
 * Get optimized player configuration based on context
 *
 * POLICY: Minimum 720p quality, always seek maximum available
 */
function getConfigForContext(context: PlayerContext): OptimizedPlayerConfig {
  const baseConfig: Partial<OptimizedPlayerConfig> = {
    connectionAware: true,
    loop: true,
  };

  switch (context) {
    case 'feed':
      return {
        ...baseConfig,
        autoPlay: false,
        muted: true,
        fastStart: true,
        startLevel: QUALITY_LEVELS['720p'],  // Start at 720p
        maxBufferLength: 45,                  // Buffer for quality upgrades
        lazyLoad: true,
        showThumbnailUntilPlay: false,
        loop: true,
        connectionAware: true,
      };

    case 'fullscreen':
      return {
        ...baseConfig,
        autoPlay: true,
        muted: false,
        fastStart: false,                     // Prioritize quality over speed
        startLevel: QUALITY_LEVELS['1080p'],  // Start at 1080p
        maxBufferLength: 90,                  // Large buffer for 4K
        lazyLoad: false,
        showThumbnailUntilPlay: false,
        loop: false,
        connectionAware: true,
      };

    case 'kanban':
      return {
        ...baseConfig,
        autoPlay: false,
        muted: true,
        fastStart: true,
        startLevel: QUALITY_LEVELS['720p'],
        maxBufferLength: 30,
        lazyLoad: true,
        showThumbnailUntilPlay: true,         // Show thumbnail until user clicks
        loop: true,
        connectionAware: true,
      };

    case 'portfolio':
      return {
        ...baseConfig,
        autoPlay: false,
        muted: true,
        fastStart: true,
        startLevel: QUALITY_LEVELS['720p'],
        maxBufferLength: 60,
        lazyLoad: true,
        showThumbnailUntilPlay: false,
        loop: true,
        connectionAware: true,
      };

    case 'mobile':
      return {
        ...baseConfig,
        autoPlay: false,
        muted: true,
        fastStart: true,
        startLevel: QUALITY_LEVELS['720p'],   // 720p guaranteed
        maxBufferLength: 45,
        lazyLoad: true,
        showThumbnailUntilPlay: false,
        loop: true,
        connectionAware: true,                // Will upgrade on WiFi/5G
      };

    case 'preview':
      return {
        ...baseConfig,
        autoPlay: true,
        muted: true,
        fastStart: true,
        startLevel: QUALITY_LEVELS['720p'],
        maxBufferLength: 15,                  // Minimal buffer
        lazyLoad: false,
        showThumbnailUntilPlay: false,
        loop: true,
        connectionAware: false,               // Fixed quality for preview
      };

    default:
      return {
        ...baseConfig,
        autoPlay: false,
        muted: true,
        fastStart: true,
        startLevel: QUALITY_LEVELS['720p'],
        maxBufferLength: 45,
        lazyLoad: true,
        showThumbnailUntilPlay: false,
        loop: true,
        connectionAware: true,
      };
  }
}

/**
 * Optimized video player hook with context-aware quality settings
 *
 * Features:
 * - Minimum 720p quality policy (never goes below)
 * - Context-aware configuration (feed, fullscreen, kanban, etc.)
 * - Adaptive streaming with intelligent quality upgrades
 * - Lazy loading support for performance
 *
 * @param videoUrl - Bunny video URL (embed, CDN, or direct)
 * @param context - Player context determining quality behavior
 * @param options - Additional options
 */
export function useOptimizedPlayer(
  videoUrl: string | null,
  context: PlayerContext,
  options: UseOptimizedPlayerOptions = {}
) {
  const { poster, onPlay, onPause, onError } = options;

  // Get optimized config for this context
  const config = useMemo(() => getConfigForContext(context), [context]);

  // Get video URLs
  const videoUrls = useMemo(() => {
    if (!videoUrl) return null;
    return getBunnyVideoUrls(videoUrl);
  }, [videoUrl]);

  // Get thumbnail URL
  const thumbnailUrl = useMemo(() => {
    if (poster) return poster;
    if (!videoUrl) return null;
    return getBunnyThumbnailUrl(videoUrl);
  }, [videoUrl, poster]);

  // Use the base HLS player with optimized config
  const playerState = useHLSPlayer(videoUrl, {
    autoPlay: config.autoPlay,
    muted: config.muted,
    loop: config.loop,
    fastStart: config.fastStart,
    connectionAware: config.connectionAware,
    poster: thumbnailUrl || undefined,
  });

  return {
    ...playerState,
    // Context info
    context,
    config,
    // Video URLs
    videoUrls,
    thumbnailUrl,
    // Quality info
    minQuality: '720p',
    startQuality: context === 'fullscreen' ? '1080p' : '720p',
    // Lazy loading flag
    shouldLazyLoad: config.lazyLoad,
    showThumbnailUntilPlay: config.showThumbnailUntilPlay,
  };
}

/**
 * Get recommended quality label based on context
 */
export function getRecommendedQuality(context: PlayerContext): string {
  switch (context) {
    case 'fullscreen':
      return '1080p - 4K';
    case 'feed':
    case 'portfolio':
      return '720p - 1080p';
    case 'kanban':
    case 'mobile':
    case 'preview':
      return '720p';
    default:
      return '720p+';
  }
}

/**
 * Check if a quality level meets minimum requirements
 */
export function meetsMinimumQuality(qualityIndex: number): boolean {
  return qualityIndex >= MIN_QUALITY_LEVEL;
}

export { QUALITY_LEVELS, MIN_QUALITY_LEVEL };
