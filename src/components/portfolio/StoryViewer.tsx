import { useState, useEffect, useRef } from 'react';
import { X, ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';

interface Story {
  id: string;
  media_url: string;
  media_type: string;
  created_at: string;
}

interface StoryViewerProps {
  stories: Story[];
  userName: string;
  userAvatar?: string | null;
  initialIndex?: number;
  onClose: () => void;
  onViewed?: (storyId: string) => void;
}

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
  const videoRef = useRef<HTMLVideoElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const currentStory = stories[currentIndex];
  const STORY_DURATION = currentStory?.media_type === 'video' ? 15000 : 5000;

  useEffect(() => {
    if (currentStory && onViewed) {
      onViewed(currentStory.id);
    }
  }, [currentIndex, currentStory, onViewed]);

  useEffect(() => {
    if (isPaused) return;

    const startTime = Date.now();
    const updateProgress = () => {
      const elapsed = Date.now() - startTime;
      const newProgress = Math.min((elapsed / STORY_DURATION) * 100, 100);
      setProgress(newProgress);

      if (newProgress >= 100) {
        goToNext();
      }
    };

    timerRef.current = setInterval(updateProgress, 50);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [currentIndex, isPaused, STORY_DURATION]);

  const goToNext = () => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setProgress(0);
    } else {
      onClose();
    }
  };

  const goToPrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setProgress(0);
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

  return (
    <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
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

      {/* Content */}
      <div
        className="w-full h-full flex items-center justify-center"
        onTouchStart={handleTouchStart}
      >
        {currentStory.media_type === 'video' ? (
          <video
            ref={videoRef}
            src={currentStory.media_url}
            className="w-full h-full object-contain"
            autoPlay
            muted
            playsInline
          />
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
