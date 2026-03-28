// Video player components with HLS support for Bunny.net
export { HLSVideoPlayer, getBunnyThumbnail } from './HLSVideoPlayer';
export type { HLSVideoPlayerRef } from './HLSVideoPlayer';

export { BunnyVideoPlayer } from './BunnyVideoPlayer';
export type { BunnyVideoPlayerRef } from './BunnyVideoPlayer';

export { SmartVideoPlayer } from './SmartVideoPlayer';

export { VideoThumbnail } from './VideoThumbnail';

// Hooks for custom implementations
export { useHLSPlayer, getBunnyVideoUrls, extractBunnyIds } from '@/hooks/useHLSPlayer';
export { useOptimizedPlayer, getRecommendedQuality, meetsMinimumQuality, QUALITY_LEVELS, MIN_QUALITY_LEVEL } from '@/hooks/useOptimizedPlayer';
export type { PlayerContext } from '@/hooks/useOptimizedPlayer';
