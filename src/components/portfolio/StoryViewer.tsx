import { useState, useEffect, useRef, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, Pause, Play, Volume2, VolumeX, Music } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Slider } from '@/components/ui/slider';

interface Story {
  id: string;
  media_url: string;
  media_type: string;
  created_at: string;
  music_url?: string | null;
  music_name?: string | null;
  mute_video_audio?: boolean;
  music_volume?: number;
  video_volume?: number;
}

interface StoryViewerProps {
  stories: Story[];
  userName: string;
  userAvatar?: string | null;
  initialIndex?: number;
  onClose: () => void;
  onViewed?: (storyId: string) => void;
}

const IMAGE_DURATION = 10000; // 10 seconds for images
const MAX_VIDEO_DURATION = 60000; // 1 minute max for videos

export function StoryViewer({
  stories,
  userName,
  userAvatar,
  initialIndex = 0,
  onClose,
  onViewed,
}: StoryViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [showVolumeControls, setShowVolumeControls] = useState(false);
  const [videoVolume, setVideoVolume] = useState(1);
  const [musicVolume, setMusicVolume] = useState(0.5);
  const [isMusicMuted, setIsMusicMuted] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const musicRef = useRef<HTMLAudioElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(Date.now());

  const currentStory = stories[currentIndex];
  const isVideo = currentStory?.media_type === 'video';
  
  // Calculate duration based on media type
  const getStoryDuration = useCallback(() => {
    if (isVideo && videoRef.current) {
      // Use actual video duration, capped at 1 minute
      const videoDuration = videoRef.current.duration * 1000;
      return Math.min(videoDuration || MAX_VIDEO_DURATION, MAX_VIDEO_DURATION);
    }
    return IMAGE_DURATION;
  }, [isVideo]);

  // Initialize volumes from story data
  useEffect(() => {
    if (currentStory) {
      setVideoVolume(currentStory.video_volume ?? 1);
      setMusicVolume(currentStory.music_volume ?? 0.5);
      setIsVideoMuted(currentStory.mute_video_audio ?? false);
    }
  }, [currentStory]);

  // Apply volume changes to audio elements
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = isVideoMuted ? 0 : videoVolume;
      videoRef.current.muted = isVideoMuted;
    }
  }, [videoVolume, isVideoMuted]);

  useEffect(() => {
    if (musicRef.current) {
      musicRef.current.volume = isMusicMuted ? 0 : musicVolume;
    }
  }, [musicVolume, isMusicMuted]);

  // Mark story as viewed
  useEffect(() => {
    if (currentStory && onViewed) {
      onViewed(currentStory.id);
    }
  }, [currentIndex, currentStory, onViewed]);

  // Handle music playback
  useEffect(() => {
    if (musicRef.current && currentStory?.music_url) {
      if (isPaused) {
        musicRef.current.pause();
      } else {
        musicRef.current.play().catch(() => {});
      }
    }
  }, [isPaused, currentStory?.music_url]);

  // Progress timer
  useEffect(() => {
    if (isPaused) return;
    
    startTimeRef.current = Date.now() - (progress / 100) * getStoryDuration();
    
    const updateProgress = () => {
      const elapsed = Date.now() - startTimeRef.current;
      const duration = getStoryDuration();
      const newProgress = Math.min((elapsed / duration) * 100, 100);
      setProgress(newProgress);

      if (newProgress >= 100) {
        goToNext();
      }
    };

    timerRef.current = setInterval(updateProgress, 50);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [currentIndex, isPaused, getStoryDuration]);

  // Handle video end - auto advance to next story
  const handleVideoEnded = useCallback(() => {
    goToNext();
  }, []);

  const goToNext = () => {
    // Stop music before transitioning
    if (musicRef.current) {
      musicRef.current.pause();
      musicRef.current.currentTime = 0;
    }
    
    if (currentIndex < stories.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setProgress(0);
      startTimeRef.current = Date.now();
    } else {
      onClose();
    }
  };

  const goToPrev = () => {
    // Stop music before transitioning
    if (musicRef.current) {
      musicRef.current.pause();
      musicRef.current.currentTime = 0;
    }
    
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setProgress(0);
      startTimeRef.current = Date.now();
    }
  };

  const togglePause = () => {
    setIsPaused(!isPaused);
    if (videoRef.current) {
      if (isPaused) {
        videoRef.current.play();
      } else {
        videoRef.current.pause();
      }
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const x = e.touches[0].clientX;
    const width = window.innerWidth;
    if (x < width / 3) {
      goToPrev();
    } else if (x > (width * 2) / 3) {
      goToNext();
    } else {
      togglePause();
    }
  };

  if (!currentStory) return null;

  const timeAgo = () => {
    const diff = Date.now() - new Date(currentStory.created_at).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 1) return 'Hace un momento';
    return `Hace ${hours}h`;
  };

  const hasMusic = !!currentStory.music_url;

  return (
    <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
      {/* Background music */}
      {currentStory.music_url && (
        <audio
          ref={musicRef}
          src={currentStory.music_url}
          loop
          autoPlay
        />
      )}

      {/* Progress bars */}
      <div className="absolute top-2 left-2 right-2 flex gap-1 z-20">
        {stories.map((_, index) => (
          <div key={index} className="flex-1 h-0.5 bg-white/30 rounded-full overflow-hidden">
            <div
              className="h-full bg-white transition-all duration-100"
              style={{
                width:
                  index < currentIndex
                    ? '100%'
                    : index === currentIndex
                    ? `${progress}%`
                    : '0%',
              }}
            />
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="absolute top-6 left-0 right-0 px-4 flex items-center justify-between z-20">
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8 ring-2 ring-white/50">
            <AvatarImage src={userAvatar || undefined} />
            <AvatarFallback className="bg-zinc-700 text-white text-xs">
              {userName?.charAt(0) || '?'}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-white text-sm font-medium">{userName}</p>
            <p className="text-white/50 text-xs">{timeAgo()}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Volume controls toggle */}
          {(isVideo || hasMusic) && (
            <button
              onClick={() => setShowVolumeControls(!showVolumeControls)}
              className="p-2 text-white/80 hover:text-white"
            >
              <Volume2 className="h-5 w-5" />
            </button>
          )}
          <button
            onClick={togglePause}
            className="p-2 text-white/80 hover:text-white"
          >
            {isPaused ? <Play className="h-5 w-5" /> : <Pause className="h-5 w-5" />}
          </button>
          <button
            onClick={onClose}
            className="p-2 text-white/80 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Volume Controls Panel */}
      {showVolumeControls && (
        <div className="absolute top-20 right-4 z-30 bg-black/80 backdrop-blur-lg rounded-xl p-4 space-y-4 min-w-[200px]">
          {/* Video Volume */}
          {isVideo && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-white/70 text-xs">Video</span>
                <button
                  onClick={() => setIsVideoMuted(!isVideoMuted)}
                  className="text-white/60 hover:text-white"
                >
                  {isVideoMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                </button>
              </div>
              <Slider
                value={[isVideoMuted ? 0 : videoVolume * 100]}
                min={0}
                max={100}
                step={1}
                onValueChange={([value]) => {
                  setVideoVolume(value / 100);
                  if (value > 0) setIsVideoMuted(false);
                }}
                className="w-full"
              />
            </div>
          )}

          {/* Music Volume */}
          {hasMusic && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <Music className="h-3 w-3 text-primary" />
                  <span className="text-white/70 text-xs">Música</span>
                </div>
                <button
                  onClick={() => setIsMusicMuted(!isMusicMuted)}
                  className="text-white/60 hover:text-white"
                >
                  {isMusicMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                </button>
              </div>
              <Slider
                value={[isMusicMuted ? 0 : musicVolume * 100]}
                min={0}
                max={100}
                step={1}
                onValueChange={([value]) => {
                  setMusicVolume(value / 100);
                  if (value > 0) setIsMusicMuted(false);
                }}
                className="w-full"
              />
              {currentStory.music_name && (
                <p className="text-white/40 text-[10px] truncate">
                  ♪ {currentStory.music_name}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Music indicator */}
      {hasMusic && !showVolumeControls && (
        <div className="absolute bottom-20 left-4 z-20 flex items-center gap-2 bg-black/40 rounded-full px-3 py-1.5">
          <Music className="h-3 w-3 text-primary animate-pulse" />
          <span className="text-white/70 text-xs truncate max-w-[150px]">
            {currentStory.music_name || 'Música'}
          </span>
        </div>
      )}

      {/* Content */}
      <div
        className="w-full h-full flex items-center justify-center"
        onTouchStart={handleTouchStart}
      >
        {isVideo ? (
          currentStory.media_url.includes('iframe.mediadelivery.net/embed') ? (
            <iframe
              src={currentStory.media_url}
              className="w-full h-full border-0"
              allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
              allowFullScreen
              loading="lazy"
            />
          ) : (
            <video
              ref={videoRef}
              src={currentStory.media_url}
              className="w-full h-full object-contain"
              autoPlay
              playsInline
              onEnded={handleVideoEnded}
              onLoadedMetadata={() => {
                // Reset progress when video loads to recalculate duration
                setProgress(0);
                startTimeRef.current = Date.now();
              }}
            />
          )
        ) : (
          <img
            src={currentStory.media_url}
            alt=""
            className="w-full h-full object-contain"
          />
        )}
      </div>

      {/* Navigation buttons (desktop) */}
      <button
        onClick={goToPrev}
        className={cn(
          "absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/10 text-white",
          "hover:bg-white/20 transition-colors hidden md:block",
          currentIndex === 0 && "opacity-50 cursor-not-allowed"
        )}
        disabled={currentIndex === 0}
      >
        <ChevronLeft className="h-6 w-6" />
      </button>
      <button
        onClick={goToNext}
        className={cn(
          "absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/10 text-white",
          "hover:bg-white/20 transition-colors hidden md:block"
        )}
      >
        <ChevronRight className="h-6 w-6" />
      </button>
    </div>
  );
}
