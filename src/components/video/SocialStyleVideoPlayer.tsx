import { useState, useRef, useCallback } from 'react';
import { Play, Pause, Volume2, VolumeX, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { HLSVideoPlayer, HLSVideoPlayerRef, getBunnyThumbnail } from '@/components/video/HLSVideoPlayer';

interface SocialStyleVideoPlayerProps {
  src: string;
  poster?: string | null;
  className?: string;
  showControls?: boolean;
  autoPlay?: boolean;
  onPlay?: () => void;
  onPause?: () => void;
}

/**
 * A video player styled like the social feed with play/pause tap and mute toggle
 */
export function SocialStyleVideoPlayer({
  src,
  poster,
  className,
  showControls = true,
  autoPlay = false,
  onPlay,
  onPause,
}: SocialStyleVideoPlayerProps) {
  const playerRef = useRef<HLSVideoPlayerRef>(null);
  const [isPaused, setIsPaused] = useState(!autoPlay);
  const [isMuted, setIsMuted] = useState(true);
  const [showPauseIcon, setShowPauseIcon] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Get poster from Bunny if not provided
  const effectivePoster = poster || getBunnyThumbnail(src) || undefined;

  const handleTap = useCallback(() => {
    if (!playerRef.current) return;

    if (isPaused) {
      playerRef.current.play();
      setIsPaused(false);
      onPlay?.();
    } else {
      playerRef.current.pause();
      setIsPaused(true);
      onPause?.();
    }

    // Show play/pause indicator
    setShowPauseIcon(true);
    setTimeout(() => setShowPauseIcon(false), 800);
  }, [isPaused, onPlay, onPause]);

  const handleMuteToggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (playerRef.current) {
      playerRef.current.toggleMute();
      setIsMuted(!isMuted);
    }
  }, [isMuted]);

  const handleLoadComplete = useCallback(() => {
    setIsLoading(false);
  }, []);

  return (
    <div 
      className={cn(
        'relative w-full h-full bg-black overflow-hidden cursor-pointer',
        className
      )}
      onClick={handleTap}
    >
      {/* Video Player */}
      <div className="relative w-full h-full flex items-center justify-center">
        <HLSVideoPlayer
          ref={playerRef}
          src={src}
          poster={effectivePoster}
          autoPlay={autoPlay}
          muted={isMuted}
          loop
          showControls={false}
          aspectRatio="auto"
          objectFit="contain"
          className="w-full h-full"
          onLoadComplete={handleLoadComplete}
        />
      </div>

      {/* Loading indicator */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 pointer-events-none">
          <Loader2 className="h-10 w-10 text-white animate-spin" />
        </div>
      )}

      {/* Play/Pause indicator */}
      {showPauseIcon && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
          <div className="p-6 rounded-full bg-black/50 animate-scale-in">
            {isPaused ? (
              <Play className="h-16 w-16 text-white" fill="white" />
            ) : (
              <Pause className="h-16 w-16 text-white" />
            )}
          </div>
        </div>
      )}

      {/* Gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/20 pointer-events-none" />

      {/* Mute toggle button */}
      {showControls && (
        <button
          onClick={handleMuteToggle}
          className="absolute top-3 right-3 z-30 p-2 rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors"
        >
          {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
        </button>
      )}

      {/* Play button overlay when paused */}
      {isPaused && !showPauseIcon && !isLoading && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="p-4 rounded-full bg-black/40">
            <Play className="h-12 w-12 text-white" fill="white" />
          </div>
        </div>
      )}
    </div>
  );
}
