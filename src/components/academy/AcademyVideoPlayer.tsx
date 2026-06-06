import { useEffect, useRef, useState, useCallback } from 'react';
import { Play, Pause, Maximize, Volume2, VolumeX, RotateCcw, RotateCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AcademyLesson } from '@/types/academy';

interface AcademyVideoPlayerProps {
  lesson: AcademyLesson;
  enrollmentId: string;
  accentColor?: string;
  onProgress?: (pct: number, lastPosition: number) => void;
  onComplete?: () => void;
  onMidlessonQuizTrigger?: (quizId: string) => void;
}

const PLAYBACK_SPEEDS = [0.75, 1, 1.25, 1.5, 2];

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function AcademyVideoPlayer({
  lesson,
  accentColor = '#8B5CF6',
  onProgress,
  onComplete,
  onMidlessonQuizTrigger,
}: AcademyVideoPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [muted, setMuted] = useState(false);
  const [speedIdx, setSpeedIdx] = useState(1); // 1x
  const [showControls, setShowControls] = useState(true);
  const [quizTriggered, setQuizTriggered] = useState(false);
  const [completedCalled, setCompletedCalled] = useState(false);

  const source = lesson.video_source;
  const isEmbed = source === 'bunny' || source === 'youtube' || source === 'vimeo' || source === 'drive';

  // ── HTML5 video events ──
  useEffect(() => {
    if (isEmbed) return;
    const v = videoRef.current;
    if (!v) return;
    const onTime = () => {
      setCurrentTime(v.currentTime);
      const pct = duration > 0 ? (v.currentTime / duration) * 100 : 0;
      onProgress?.(pct, Math.floor(v.currentTime));

      // Mid-lesson quiz
      if (
        !quizTriggered &&
        lesson.has_midlesson_quiz &&
        lesson.midlesson_quiz_timestamp_seconds &&
        lesson.end_lesson_quiz_id &&
        v.currentTime >= lesson.midlesson_quiz_timestamp_seconds
      ) {
        v.pause();
        setQuizTriggered(true);
        onMidlessonQuizTrigger?.(lesson.end_lesson_quiz_id);
      }

      // Auto-complete al 85%
      if (!completedCalled && pct >= 85) {
        setCompletedCalled(true);
        onComplete?.();
      }
    };
    const onMeta = () => setDuration(v.duration || 0);
    const onPlayEv = () => setIsPlaying(true);
    const onPauseEv = () => setIsPlaying(false);
    v.addEventListener('timeupdate', onTime);
    v.addEventListener('loadedmetadata', onMeta);
    v.addEventListener('play', onPlayEv);
    v.addEventListener('pause', onPauseEv);
    return () => {
      v.removeEventListener('timeupdate', onTime);
      v.removeEventListener('loadedmetadata', onMeta);
      v.removeEventListener('play', onPlayEv);
      v.removeEventListener('pause', onPauseEv);
    };
  }, [isEmbed, duration, lesson, onProgress, onMidlessonQuizTrigger, onComplete, quizTriggered, completedCalled]);

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    v.paused ? v.play() : v.pause();
  }, []);

  const seekBy = useCallback((delta: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Math.max(0, Math.min(v.duration || 0, v.currentTime + delta));
  }, []);

  const onSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = parseFloat(e.target.value);
  };

  const onSpeed = () => {
    const v = videoRef.current;
    if (!v) return;
    const next = (speedIdx + 1) % PLAYBACK_SPEEDS.length;
    setSpeedIdx(next);
    v.playbackRate = PLAYBACK_SPEEDS[next];
  };

  const onFullscreen = () => {
    const el = containerRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      el.requestFullscreen?.();
    }
  };

  // ── Render por source ──
  if (source === 'bunny' && lesson.video_bunny_id) {
    const bunnyLib = (import.meta as any).env?.VITE_BUNNY_LIBRARY_ID ?? '';
    const url = `https://iframe.mediadelivery.net/embed/${bunnyLib}/${lesson.video_bunny_id}?autoplay=false&responsive=true&preload=true`;
    return (
      <div ref={containerRef} className="relative aspect-video w-full overflow-hidden rounded-xl bg-black">
        <iframe
          src={url}
          loading="lazy"
          allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 h-full w-full border-0"
          title={lesson.title}
        />
      </div>
    );
  }

  if (source === 'youtube' && lesson.video_url) {
    const ytId = extractYouTubeId(lesson.video_url);
    if (!ytId) return <UnsupportedSource />;
    const url = `https://www.youtube-nocookie.com/embed/${ytId}?rel=0&modestbranding=1&iv_load_policy=3`;
    return (
      <div ref={containerRef} className="relative aspect-video w-full overflow-hidden rounded-xl bg-black">
        <iframe
          src={url}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 h-full w-full border-0"
          title={lesson.title}
        />
      </div>
    );
  }

  if (source === 'vimeo' && lesson.video_url) {
    const vimeoId = extractVimeoId(lesson.video_url);
    if (!vimeoId) return <UnsupportedSource />;
    const url = `https://player.vimeo.com/video/${vimeoId}?title=0&byline=0&portrait=0`;
    return (
      <div ref={containerRef} className="relative aspect-video w-full overflow-hidden rounded-xl bg-black">
        <iframe
          src={url}
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 h-full w-full border-0"
          title={lesson.title}
        />
      </div>
    );
  }

  if (source === 'drive' && lesson.video_url) {
    const driveId = extractDriveId(lesson.video_url);
    if (!driveId) return <UnsupportedSource />;
    const url = `https://drive.google.com/file/d/${driveId}/preview`;
    return (
      <div ref={containerRef} className="relative aspect-video w-full overflow-hidden rounded-xl bg-black">
        <iframe
          src={url}
          allow="autoplay"
          allowFullScreen
          className="absolute inset-0 h-full w-full border-0"
          title={lesson.title}
        />
      </div>
    );
  }

  // HTML5 video con controles custom
  if (source === 'url' && lesson.video_url) {
    return (
      <div
        ref={containerRef}
        className="group relative aspect-video w-full overflow-hidden rounded-xl bg-black"
        onMouseEnter={() => setShowControls(true)}
        onMouseLeave={() => isPlaying && setShowControls(false)}
        onClick={togglePlay}
      >
        <video
          ref={videoRef}
          src={lesson.video_url}
          className="absolute inset-0 h-full w-full"
          poster={lesson.video_thumbnail_url ?? undefined}
          playsInline
        />
        <div
          className={cn(
            'absolute inset-x-0 bottom-0 px-4 py-3 transition-opacity duration-200',
            'bg-gradient-to-t from-black/80 to-transparent',
            showControls ? 'opacity-100' : 'opacity-0'
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <input
            type="range"
            min={0}
            max={duration || 0}
            step={0.1}
            value={currentTime}
            onChange={onSeek}
            className="h-1 w-full cursor-pointer appearance-none rounded bg-white/20 accent-purple-500"
            style={{ accentColor }}
          />
          <div className="mt-2 flex items-center gap-3 text-white">
            <button onClick={togglePlay} className="rounded hover:bg-white/10 p-1">
              {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
            </button>
            <button onClick={() => seekBy(-10)} className="rounded hover:bg-white/10 p-1">
              <RotateCcw className="h-4 w-4" />
            </button>
            <button onClick={() => seekBy(10)} className="rounded hover:bg-white/10 p-1">
              <RotateCw className="h-4 w-4" />
            </button>
            <button
              onClick={() => {
                setMuted((m) => !m);
                if (videoRef.current) videoRef.current.muted = !muted;
              }}
              className="rounded hover:bg-white/10 p-1"
            >
              {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>
            <span className="text-xs tabular-nums">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
            <button
              onClick={onSpeed}
              className="ml-auto rounded bg-white/10 px-2 py-1 text-xs hover:bg-white/20"
            >
              {PLAYBACK_SPEEDS[speedIdx]}x
            </button>
            <button onClick={onFullscreen} className="rounded hover:bg-white/10 p-1">
              <Maximize className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <UnsupportedSource />;
}

function UnsupportedSource() {
  return (
    <div className="flex aspect-video w-full items-center justify-center rounded-xl bg-zinc-900 text-zinc-500">
      Origen de video no soportado o sin configurar
    </div>
  );
}

function extractYouTubeId(url: string): string | null {
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/))([\w-]{11})/);
  return m?.[1] ?? null;
}

function extractVimeoId(url: string): string | null {
  const m = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  return m?.[1] ?? null;
}

function extractDriveId(url: string): string | null {
  const m = url.match(/\/d\/([a-zA-Z0-9_-]+)/) || url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  return m?.[1] ?? null;
}
