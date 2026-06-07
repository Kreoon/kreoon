import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Play, Pause, Maximize, Volume2, VolumeX, RotateCcw, RotateCw } from 'lucide-react';
import ReactPlayer from 'react-player';
import Hls from 'hls.js';
import { cn } from '@/lib/utils';
import type { AcademyLesson } from '@/types/academy';

export interface AcademyVideoPlayerProps {
  lesson: AcademyLesson;
  enrollmentId: string;
  accentColor?: string;
  onProgress?: (pct: number, lastPosition: number) => void;
  onComplete?: () => void;
  onMidlessonQuizTrigger?: (quizId: string) => void;
}

const SPEEDS = [0.75, 1, 1.25, 1.5, 2];
const BUNNY_CDN = (import.meta as any).env?.VITE_BUNNY_STREAM_CDN_URL ?? '';
const BUNNY_LIB = (import.meta as any).env?.VITE_BUNNY_LIBRARY_ID ?? '';

const noCtxMenu = (e: React.MouseEvent) => e.preventDefault();

function fmtTime(s: number) {
  if (!isFinite(s) || s < 0) return '0:00';
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
}

// ─── Controls bar (shared) ────────────────────────────────────────────────────
interface CtrlProps {
  playing: boolean; time: number; duration: number; muted: boolean;
  speedIdx: number; accentColor: string;
  onToggle(): void; onSeek(t: number): void; onDelta(d: number): void;
  onMute(): void; onSpeed(): void; onFull(): void;
}

function ControlsBar({ playing, time, duration, muted, speedIdx, accentColor, onToggle, onSeek, onDelta, onMute, onSpeed, onFull }: CtrlProps) {
  return (
    <div className="px-3 pb-3 pt-8 bg-gradient-to-t from-black/90 via-black/50 to-transparent select-none">
      <input
        type="range" min={0} max={duration || 100} step={0.1} value={time}
        onChange={e => onSeek(parseFloat(e.target.value))}
        className="w-full h-1.5 cursor-pointer appearance-none rounded-full bg-white/20"
        style={{ accentColor }}
      />
      <div className="mt-2 flex items-center gap-1 text-white">
        <Btn onClick={onToggle}>{playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}</Btn>
        <Btn onClick={() => onDelta(-10)}><RotateCcw className="h-4 w-4" /></Btn>
        <Btn onClick={() => onDelta(10)}><RotateCw className="h-4 w-4" /></Btn>
        <Btn onClick={onMute}>{muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}</Btn>
        <span className="ml-1 text-[11px] text-zinc-300 tabular-nums">{fmtTime(time)} / {fmtTime(duration)}</span>
        <button onClick={onSpeed} className="ml-auto rounded bg-white/10 px-2 py-0.5 text-[11px] font-medium hover:bg-white/20 transition-colors">
          {SPEEDS[speedIdx]}×
        </button>
        <Btn onClick={onFull}><Maximize className="h-4 w-4" /></Btn>
      </div>
    </div>
  );
}

function Btn({ onClick, children }: { onClick(): void; children: ReactNode }) {
  return (
    <button onClick={onClick} className="p-1.5 rounded hover:bg-white/10 transition-colors">
      {children}
    </button>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export function AcademyVideoPlayer({
  lesson, accentColor = '#8B5CF6', onProgress, onComplete, onMidlessonQuizTrigger,
}: AcademyVideoPlayerProps) {
  const { video_source, video_url, video_bunny_id } = lesson;
  const sharedProps = { lesson, accentColor, onProgress, onComplete, onMidlessonQuizTrigger };

  if (video_source === 'bunny' && video_bunny_id && BUNNY_CDN) {
    return <NativePlayer {...sharedProps} videoUrl={`${BUNNY_CDN}/${video_bunny_id}/playlist.m3u8`} />;
  }

  if (video_source === 'bunny' && video_bunny_id) {
    return (
      <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black" onContextMenu={noCtxMenu}>
        <iframe
          src={`https://iframe.mediadelivery.net/embed/${BUNNY_LIB}/${video_bunny_id}?autoplay=false&responsive=true&preload=true`}
          loading="lazy"
          allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 h-full w-full border-0"
          title={lesson.title}
        />
        {/* Bloquea logo Bunny y clic derecho */}
        <div className="absolute bottom-0 right-0 w-24 h-8 z-10" onContextMenu={noCtxMenu} />
      </div>
    );
  }

  if (video_source === 'url' && video_url) {
    return <NativePlayer {...sharedProps} videoUrl={video_url} />;
  }

  if ((video_source === 'youtube' || video_source === 'vimeo') && video_url) {
    return <EmbedPlayer {...sharedProps} url={video_url} />;
  }

  if (video_source === 'drive' && video_url) {
    const driveId =
      video_url.match(/\/d\/([a-zA-Z0-9_-]+)/)?.[1] ??
      video_url.match(/[?&]id=([a-zA-Z0-9_-]+)/)?.[1];
    if (!driveId) return <Unsupported />;
    return (
      <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black" onContextMenu={noCtxMenu}>
        <iframe
          src={`https://drive.google.com/file/d/${driveId}/preview`}
          allow="autoplay"
          allowFullScreen
          className="absolute inset-0 h-full w-full border-0"
          title={lesson.title}
        />
        <div className="absolute top-0 right-0 w-32 h-10 z-10" onContextMenu={noCtxMenu} />
      </div>
    );
  }

  return <Unsupported />;
}

function Unsupported() {
  return (
    <div className="flex aspect-video w-full items-center justify-center rounded-xl bg-zinc-900 text-zinc-500 text-sm">
      Origen de video no soportado o sin configurar
    </div>
  );
}

// ─── Native Player (HTML5 + HLS.js para Bunny CDN) ───────────────────────────
interface NativeProps {
  lesson: AcademyLesson; videoUrl: string; accentColor: string;
  onProgress?: (pct: number, last: number) => void;
  onComplete?: () => void;
  onMidlessonQuizTrigger?: (id: string) => void;
}

function NativePlayer({ lesson, videoUrl, accentColor, onProgress, onComplete, onMidlessonQuizTrigger }: NativeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [muted, setMuted] = useState(false);
  const [speedIdx, setSpeedIdx] = useState(1);
  const [showCtrl, setShowCtrl] = useState(true);
  const completedRef = useRef(false);
  const quizDoneRef = useRef(false);

  useEffect(() => {
    completedRef.current = false;
    quizDoneRef.current = false;
    setTime(0);
    setPlaying(false);
  }, [lesson.id]);

  // HLS.js o src directo
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !videoUrl) return;

    if (videoUrl.includes('.m3u8')) {
      if (v.canPlayType('application/vnd.apple.mpegurl')) {
        v.src = videoUrl; // Safari: HLS nativo
        return;
      }
      if (Hls.isSupported()) {
        const hls = new Hls({ enableWorker: true, lowLatencyMode: false });
        hls.loadSource(videoUrl);
        hls.attachMedia(v);
        return () => { hls.stopLoad(); hls.detachMedia(); hls.destroy(); };
      }
    } else {
      v.src = videoUrl;
    }
  }, [videoUrl]);

  // Refs estables para callbacks (evita re-registro de listeners)
  const cbProgress = useRef(onProgress);
  const cbComplete = useRef(onComplete);
  const cbMid = useRef(onMidlessonQuizTrigger);
  const lessonRef = useRef(lesson);
  useEffect(() => { cbProgress.current = onProgress; }, [onProgress]);
  useEffect(() => { cbComplete.current = onComplete; }, [onComplete]);
  useEffect(() => { cbMid.current = onMidlessonQuizTrigger; }, [onMidlessonQuizTrigger]);
  useEffect(() => { lessonRef.current = lesson; }, [lesson]);

  const onTime = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    const t = v.currentTime;
    const dur = v.duration || 0;
    setTime(t);
    const pct = dur > 0 ? (t / dur) * 100 : 0;
    cbProgress.current?.(pct, Math.floor(t));

    const l = lessonRef.current;
    if (!quizDoneRef.current && l.has_midlesson_quiz && l.midlesson_quiz_timestamp_seconds && l.end_lesson_quiz_id && t >= l.midlesson_quiz_timestamp_seconds) {
      v.pause();
      quizDoneRef.current = true;
      cbMid.current?.(l.end_lesson_quiz_id);
    }
    if (!completedRef.current && pct >= 85) {
      completedRef.current = true;
      cbComplete.current?.();
    }
  }, []);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onMeta = () => setDuration(v.duration || 0);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    v.addEventListener('loadedmetadata', onMeta);
    v.addEventListener('play', onPlay);
    v.addEventListener('pause', onPause);
    v.addEventListener('timeupdate', onTime);
    return () => {
      v.removeEventListener('loadedmetadata', onMeta);
      v.removeEventListener('play', onPlay);
      v.removeEventListener('pause', onPause);
      v.removeEventListener('timeupdate', onTime);
    };
  }, [onTime]);

  const togglePlay = () => videoRef.current?.paused ? videoRef.current.play() : videoRef.current?.pause();
  const seekTo = (t: number) => { if (videoRef.current) { videoRef.current.currentTime = t; setTime(t); } };
  const seekBy = (d: number) => seekTo(Math.max(0, Math.min(duration, time + d)));

  return (
    <div
      ref={containerRef}
      className="group relative aspect-video w-full overflow-hidden rounded-xl bg-black"
      onMouseEnter={() => setShowCtrl(true)}
      onMouseLeave={() => playing && setShowCtrl(false)}
      onClick={togglePlay}
      onContextMenu={noCtxMenu}
    >
      <video
        ref={videoRef}
        className="absolute inset-0 h-full w-full"
        poster={lesson.video_thumbnail_url ?? undefined}
        playsInline
        onContextMenu={noCtxMenu}
        controlsList="nodownload noremoteplayback"
      />
      <div
        className={cn('absolute inset-x-0 bottom-0 transition-opacity duration-200', showCtrl ? 'opacity-100' : 'opacity-0')}
        onClick={e => e.stopPropagation()}
      >
        <ControlsBar
          playing={playing} time={time} duration={duration} muted={muted}
          speedIdx={speedIdx} accentColor={accentColor}
          onToggle={togglePlay}
          onSeek={seekTo}
          onDelta={seekBy}
          onMute={() => { const next = !muted; setMuted(next); if (videoRef.current) videoRef.current.muted = next; }}
          onSpeed={() => {
            const next = (speedIdx + 1) % SPEEDS.length;
            setSpeedIdx(next);
            if (videoRef.current) videoRef.current.playbackRate = SPEEDS[next];
          }}
          onFull={() => document.fullscreenElement ? document.exitFullscreen() : containerRef.current?.requestFullscreen()}
        />
      </div>
    </div>
  );
}

// ─── Embed Player (YouTube / Vimeo con react-player) ─────────────────────────
interface EmbedProps {
  lesson: AcademyLesson; url: string; accentColor: string;
  onProgress?: (pct: number, last: number) => void;
  onComplete?: () => void;
  onMidlessonQuizTrigger?: (id: string) => void;
}

function EmbedPlayer({ lesson, url, accentColor, onProgress, onComplete, onMidlessonQuizTrigger }: EmbedProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<ReactPlayer>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [muted, setMuted] = useState(false);
  const [speedIdx, setSpeedIdx] = useState(1);
  const [showCtrl, setShowCtrl] = useState(true);
  const completedRef = useRef(false);
  const quizDoneRef = useRef(false);

  useEffect(() => {
    completedRef.current = false;
    quizDoneRef.current = false;
    setPlaying(false);
    setTime(0);
  }, [lesson.id]);

  const handleProgress = ({ playedSeconds, played }: { playedSeconds: number; played: number }) => {
    setTime(playedSeconds);
    const pct = played * 100;
    onProgress?.(pct, Math.floor(playedSeconds));

    if (!quizDoneRef.current && lesson.has_midlesson_quiz && lesson.midlesson_quiz_timestamp_seconds && lesson.end_lesson_quiz_id && playedSeconds >= lesson.midlesson_quiz_timestamp_seconds) {
      setPlaying(false);
      quizDoneRef.current = true;
      onMidlessonQuizTrigger?.(lesson.end_lesson_quiz_id);
    }
    if (!completedRef.current && pct >= 85) {
      completedRef.current = true;
      onComplete?.();
    }
  };

  const seekTo = (t: number) => { setTime(t); playerRef.current?.seekTo(t, 'seconds'); };
  const seekBy = (d: number) => seekTo(Math.max(0, Math.min(duration, time + d)));

  const playerConfig = {
    youtube: {
      playerVars: {
        controls: 0,         // Sin controles de YouTube
        modestbranding: 1,   // Mínimo branding
        rel: 0,              // Sin videos relacionados al terminar
        iv_load_policy: 3,   // Sin anotaciones
        disablekb: 1,        // Sin atajos de teclado de YouTube
        playsinline: 1,
      },
    },
    vimeo: {
      playerOptions: {
        controls: false,
        title: false,
        byline: false,
        portrait: false,
        dnt: true,
      },
    },
  };

  return (
    <div
      ref={containerRef}
      className="relative aspect-video w-full overflow-hidden rounded-xl bg-black group"
      onMouseEnter={() => setShowCtrl(true)}
      onMouseLeave={() => playing && setShowCtrl(false)}
      onContextMenu={noCtxMenu}
    >
      <ReactPlayer
        ref={playerRef}
        url={url}
        playing={playing}
        muted={muted}
        playbackRate={SPEEDS[speedIdx]}
        controls={false}
        width="100%"
        height="100%"
        progressInterval={250}
        config={playerConfig}
        onDuration={setDuration}
        onProgress={handleProgress}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        style={{ position: 'absolute', top: 0, left: 0 }}
      />

      {/*
        Interceptor de clics y clic derecho: cubre toda el área de video por encima
        del iframe. Los clics se quedan aquí (play/pause), no pasan al iframe.
        Esto también bloquea el menú contextual del iframe.
      */}
      <div
        className="absolute inset-x-0 top-0 z-10 cursor-pointer"
        style={{ bottom: 60 }}
        onClick={() => setPlaying(p => !p)}
        onContextMenu={noCtxMenu}
      />

      {/* Barra de controles propia */}
      <div className={cn('absolute inset-x-0 bottom-0 z-20 transition-opacity duration-200', showCtrl ? 'opacity-100' : 'opacity-0')}>
        <ControlsBar
          playing={playing} time={time} duration={duration} muted={muted}
          speedIdx={speedIdx} accentColor={accentColor}
          onToggle={() => setPlaying(p => !p)}
          onSeek={seekTo}
          onDelta={seekBy}
          onMute={() => setMuted(m => !m)}
          onSpeed={() => setSpeedIdx(i => (i + 1) % SPEEDS.length)}
          onFull={() => document.fullscreenElement ? document.exitFullscreen() : containerRef.current?.requestFullscreen()}
        />
      </div>

      {/* Bloquea logos que redirigen al origen */}
      {lesson.video_source === 'youtube' && (
        <>
          <div className="absolute bottom-16 right-0 w-28 h-10 z-10" onContextMenu={noCtxMenu} />
          <div className="absolute top-0 right-0 w-20 h-10 z-10" onContextMenu={noCtxMenu} />
        </>
      )}
      {lesson.video_source === 'vimeo' && (
        <div className="absolute bottom-16 right-0 w-24 h-10 z-10" onContextMenu={noCtxMenu} />
      )}
    </div>
  );
}
