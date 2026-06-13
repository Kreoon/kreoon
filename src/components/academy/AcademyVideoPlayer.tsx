import { useCallback, useEffect, useRef } from 'react';
import ReactPlayer from 'react-player';
import Hls from 'hls.js';
import type { AcademyLesson } from '@/types/academy';

export interface AcademyVideoPlayerProps {
  lesson: AcademyLesson;
  enrollmentId: string;
  accentColor?: string;
  onProgress?: (pct: number, lastPosition: number) => void;
  onComplete?: () => void;
  onMidlessonQuizTrigger?: (quizId: string) => void;
}

const BUNNY_CDN = (import.meta as any).env?.VITE_BUNNY_STREAM_CDN_URL ?? '';
const BUNNY_LIB = (import.meta as any).env?.VITE_BUNNY_LIBRARY_ID ?? '';
const SAVE_INTERVAL_S = 10;
const noCtxMenu = (e: React.MouseEvent) => e.preventDefault();

// Fix 2a: validar length > 0 antes de acceder a [0] cuando progress es array
function getSavedPosition(lesson: AcademyLesson): number {
  const prog = Array.isArray(lesson.progress)
    ? (lesson.progress.length > 0 ? (lesson.progress as any[])[0] : null)
    : (lesson.progress as any);
  if (!prog) return 0;
  if (prog.status === 'completed') return 0;
  const pos = (prog.last_position_seconds ?? 0) - 2;
  return pos > 5 ? pos : 0;
}

const POS_KEY = (id: string) => `yt_pos_${id}`;
function readPosCache(id: string): number {
  try {
    const r = localStorage.getItem(POS_KEY(id));
    if (!r) return 0;
    const { pos } = JSON.parse(r);
    return typeof pos === 'number' ? pos : 0;
  } catch { return 0; }
}
function writePosCache(id: string, pos: number) {
  try { localStorage.setItem(POS_KEY(id), JSON.stringify({ pos })); } catch {}
}

// ─── Main component ───────────────────────────────────────────────────────────
export function AcademyVideoPlayer({
  lesson, accentColor = '#8B5CF6', onProgress, onComplete, onMidlessonQuizTrigger,
}: AcademyVideoPlayerProps) {
  const { video_source, video_url, video_bunny_id } = lesson;
  const resumeFrom = getSavedPosition(lesson);
  const shared = { lesson, accentColor, resumeFrom, onProgress, onComplete, onMidlessonQuizTrigger };

  // Bunny HLS directo
  if (video_source === 'bunny' && video_bunny_id && BUNNY_CDN)
    return <NativePlayer {...shared} videoUrl={`${BUNNY_CDN}/${video_bunny_id}/playlist.m3u8`} />;

  // Bunny iframe embed (player nativo de Bunny)
  if (video_source === 'bunny' && video_bunny_id)
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
      </div>
    );

  if (video_source === 'url' && video_url)    return <NativePlayer {...shared} videoUrl={video_url} />;
  if (video_source === 'youtube' && video_url) return <YouTubePlayer {...shared} url={video_url} />;
  if (video_source === 'vimeo' && video_url)   return <EmbedPlayer {...shared} url={video_url} />;

  if (video_source === 'drive' && video_url) {
    const driveId =
      video_url.match(/\/d\/([a-zA-Z0-9_-]+)/)?.[1] ??
      video_url.match(/[?&]id=([a-zA-Z0-9_-]+)/)?.[1];
    if (!driveId) return <Unsupported />;
    return (
      <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black" onContextMenu={noCtxMenu}>
        <iframe
          src={`https://drive.google.com/file/d/${driveId}/preview`}
          allow="autoplay" allowFullScreen
          className="absolute inset-0 h-full w-full border-0"
          title={lesson.title}
        />
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

// ─── Native HTML5 Player (controles del navegador) ────────────────────────────
interface NativeProps {
  lesson: AcademyLesson; videoUrl: string; accentColor: string; resumeFrom: number;
  onProgress?: (pct: number, last: number) => void;
  onComplete?: () => void;
  onMidlessonQuizTrigger?: (id: string) => void;
}

function NativePlayer({ lesson, videoUrl, resumeFrom, onProgress, onComplete, onMidlessonQuizTrigger }: NativeProps) {
  const effectiveResume = Math.max(resumeFrom, readPosCache(lesson.id));
  const videoRef = useRef<HTMLVideoElement>(null);
  const completedRef = useRef(false);
  const quizDoneRef = useRef(false);
  const lastSavedRef = useRef(0);

  useEffect(() => {
    completedRef.current = false; quizDoneRef.current = false; lastSavedRef.current = 0;
  }, [lesson.id]);

  // Fix 2b: listener HLS.Events.ERROR para errores fatales + fallback si !Hls.isSupported()
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !videoUrl) return;
    if (videoUrl.includes('.m3u8')) {
      if (v.canPlayType('application/vnd.apple.mpegurl')) {
        v.src = videoUrl;
        return;
      }
      if (Hls.isSupported()) {
        const hls = new Hls({ enableWorker: true, lowLatencyMode: false });
        hls.loadSource(videoUrl);
        hls.attachMedia(v);
        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (data.fatal) {
            console.error('[HLS] Error fatal:', data.type, data.details);
          }
        });
        return () => { hls.stopLoad(); hls.detachMedia(); hls.destroy(); };
      }
      // Fallback: asignar src directamente si HLS no está soportado
      v.src = videoUrl;
    } else {
      v.src = videoUrl;
    }
  }, [videoUrl]);

  const cbProgress = useRef(onProgress);
  const cbComplete = useRef(onComplete);
  const cbMid = useRef(onMidlessonQuizTrigger);
  const lessonRef = useRef(lesson);
  const resumeFromRef = useRef(effectiveResume);
  useEffect(() => { cbProgress.current = onProgress; }, [onProgress]);
  useEffect(() => { cbComplete.current = onComplete; }, [onComplete]);
  useEffect(() => { cbMid.current = onMidlessonQuizTrigger; }, [onMidlessonQuizTrigger]);
  useEffect(() => { lessonRef.current = lesson; }, [lesson]);
  useEffect(() => { resumeFromRef.current = effectiveResume; }, [effectiveResume]);

  const onTime = useCallback(() => {
    const v = videoRef.current; if (!v) return;
    const t = v.currentTime;
    const dur = isFinite(v.duration) ? (v.duration || 0) : 0;
    if (dur > 0 && t - lastSavedRef.current >= SAVE_INTERVAL_S) {
      const pct = (t / dur) * 100;
      cbProgress.current?.(pct, Math.floor(t));
      writePosCache(lessonRef.current.id, Math.floor(t));
      lastSavedRef.current = t;
      const l = lessonRef.current;
      if (!quizDoneRef.current && l.has_midlesson_quiz && l.midlesson_quiz_timestamp_seconds && l.end_lesson_quiz_id && t >= l.midlesson_quiz_timestamp_seconds) {
        v.pause(); quizDoneRef.current = true; cbMid.current?.(l.end_lesson_quiz_id);
      }
      if (!completedRef.current && pct >= 85) { completedRef.current = true; cbComplete.current?.(); }
    }
  }, []);

  useEffect(() => {
    const v = videoRef.current; if (!v) return;
    const onMeta = () => {
      const pos = resumeFromRef.current;
      if (pos > 0 && pos < (v.duration || 0) - 3) v.currentTime = pos;
    };
    const onPause = () => {
      const dur = isFinite(v.duration) ? v.duration : 0;
      if (dur > 0) cbProgress.current?.((v.currentTime / dur) * 100, Math.floor(v.currentTime));
      writePosCache(lessonRef.current.id, Math.floor(v.currentTime));
      lastSavedRef.current = v.currentTime;
    };
    v.addEventListener('loadedmetadata', onMeta);
    v.addEventListener('pause', onPause);
    v.addEventListener('timeupdate', onTime);
    return () => {
      v.removeEventListener('loadedmetadata', onMeta);
      v.removeEventListener('pause', onPause);
      v.removeEventListener('timeupdate', onTime);
    };
  }, [onTime]);

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black" onContextMenu={noCtxMenu}>
      <video
        ref={videoRef}
        controls
        className="absolute inset-0 h-full w-full"
        poster={lesson.video_thumbnail_url ?? undefined}
        playsInline
        onContextMenu={noCtxMenu}
        controlsList="nodownload noremoteplayback"
      />
    </div>
  );
}

// ─── YouTube Player (controles nativos de YouTube + tracking de progreso) ─────
function extractYouTubeId(raw: string): string | null {
  const s = raw.trim();
  for (const re of [
    /[?&]v=([a-zA-Z0-9_-]{11})/,
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /embed\/([a-zA-Z0-9_-]{11})/,
    /shorts\/([a-zA-Z0-9_-]{11})/,
  ]) {
    const m = s.match(re); if (m) return m[1];
  }
  return /^[a-zA-Z0-9_-]{11}$/.test(s) ? s : null;
}

interface YTProps {
  lesson: AcademyLesson; url: string; accentColor: string; resumeFrom: number;
  onProgress?: (pct: number, last: number) => void;
  onComplete?: () => void;
  onMidlessonQuizTrigger?: (id: string) => void;
}

function YouTubePlayer({ lesson, url, resumeFrom, onProgress, onComplete, onMidlessonQuizTrigger }: YTProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const completedRef = useRef(false);
  const quizDoneRef = useRef(false);
  const lastSavedRef = useRef(0);
  const durationRef = useRef(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const videoId = extractYouTubeId(url);
  const effectiveResume = Math.max(resumeFrom, readPosCache(lesson.id));

  const cbProgress = useRef(onProgress);
  const cbComplete = useRef(onComplete);
  const cbMid = useRef(onMidlessonQuizTrigger);
  const lessonRef = useRef(lesson);
  useEffect(() => { cbProgress.current = onProgress; }, [onProgress]);
  useEffect(() => { cbComplete.current = onComplete; }, [onComplete]);
  useEffect(() => { cbMid.current = onMidlessonQuizTrigger; }, [onMidlessonQuizTrigger]);
  useEffect(() => { lessonRef.current = lesson; }, [lesson]);

  useEffect(() => {
    completedRef.current = false; quizDoneRef.current = false;
    lastSavedRef.current = 0; durationRef.current = 0;
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }

    const sendCmd = (func: string) =>
      iframeRef.current?.contentWindow?.postMessage(
        JSON.stringify({ event: 'command', func, args: [] }),
        'https://www.youtube.com'
      );

    const handleMessage = (ev: MessageEvent) => {
      if (ev.origin !== 'https://www.youtube.com') return;
      let data: any;
      try { data = typeof ev.data === 'string' ? JSON.parse(ev.data) : ev.data; } catch { return; }

      if (data.event === 'onStateChange') {
        const state: number = data.info;
        if (state === 1) { // reproduciendo → poll cada segundo
          if (pollRef.current) clearInterval(pollRef.current);
          pollRef.current = setInterval(() => sendCmd('getCurrentTime'), 1_000);
        } else {
          if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
        }
        if (state === 0 && !completedRef.current) { completedRef.current = true; cbComplete.current?.(); }
      }

      if (data.event === 'infoDelivery' && data.info) {
        const ct: number = data.info.currentTime ?? 0;
        const dur: number = data.info.duration ?? 0;
        if (dur > 0) durationRef.current = dur;
        const d = durationRef.current;
        if (d > 0 && ct > 0 && ct - lastSavedRef.current >= SAVE_INTERVAL_S) {
          const pct = (ct / d) * 100;
          cbProgress.current?.(pct, Math.floor(ct));
          writePosCache(lessonRef.current.id, Math.floor(ct));
          lastSavedRef.current = ct;
          const l = lessonRef.current;
          if (!quizDoneRef.current && l.has_midlesson_quiz && l.midlesson_quiz_timestamp_seconds && l.end_lesson_quiz_id && ct >= l.midlesson_quiz_timestamp_seconds) {
            quizDoneRef.current = true;
            sendCmd('pauseVideo');
            cbMid.current?.(l.end_lesson_quiz_id);
          }
          if (!completedRef.current && pct >= 85) { completedRef.current = true; cbComplete.current?.(); }
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [lesson.id, effectiveResume]);

  if (!videoId) return (
    <div className="flex aspect-video w-full items-center justify-center rounded-xl bg-zinc-900 text-zinc-500 text-sm">
      URL de YouTube no válida
    </div>
  );

  const startParam = effectiveResume > 5 ? `&start=${Math.floor(effectiveResume)}` : '';
  const origin = encodeURIComponent(window.location.origin);
  const src = `https://www.youtube.com/embed/${videoId}?controls=1&rel=0&playsinline=1&iv_load_policy=3&enablejsapi=1&origin=${origin}${startParam}`;

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black">
      <iframe
        ref={iframeRef}
        src={src}
        className="absolute inset-0 h-full w-full border-0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        title={lesson.title}
      />
    </div>
  );
}

// ─── Embed Player (Vimeo — controles nativos) ─────────────────────────────────
interface EmbedProps {
  lesson: AcademyLesson; url: string; accentColor: string; resumeFrom: number;
  onProgress?: (pct: number, last: number) => void;
  onComplete?: () => void;
  onMidlessonQuizTrigger?: (id: string) => void;
}

function EmbedPlayer({ lesson, url, resumeFrom, onProgress, onComplete, onMidlessonQuizTrigger }: EmbedProps) {
  const playerRef = useRef<ReactPlayer>(null);
  const lastSavedRef = useRef(0);
  const completedRef = useRef(false);
  const quizDoneRef = useRef(false);

  useEffect(() => {
    completedRef.current = false; quizDoneRef.current = false; lastSavedRef.current = 0;
  }, [lesson.id, resumeFrom]);

  const handleReady = () => {
    if (resumeFrom > 5) playerRef.current?.seekTo(resumeFrom, 'seconds');
  };

  const handleProgress = ({ playedSeconds, played }: { playedSeconds: number; played: number }) => {
    if (playedSeconds - lastSavedRef.current >= SAVE_INTERVAL_S) {
      onProgress?.(played * 100, Math.floor(playedSeconds));
      lastSavedRef.current = playedSeconds;
    }
    if (!quizDoneRef.current && lesson.has_midlesson_quiz && lesson.midlesson_quiz_timestamp_seconds && lesson.end_lesson_quiz_id && playedSeconds >= lesson.midlesson_quiz_timestamp_seconds) {
      quizDoneRef.current = true;
      onMidlessonQuizTrigger?.(lesson.end_lesson_quiz_id);
    }
    if (!completedRef.current && played >= 0.85) { completedRef.current = true; onComplete?.(); }
  };

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black" onContextMenu={noCtxMenu}>
      <ReactPlayer
        ref={playerRef}
        url={url}
        controls
        width="100%"
        height="100%"
        progressInterval={1_000}
        config={{
          vimeo: {
            playerOptions: { title: false, byline: false, portrait: false, dnt: true },
          },
        }}
        onReady={handleReady}
        onProgress={handleProgress}
        onEnded={() => { if (!completedRef.current) { completedRef.current = true; onComplete?.(); } }}
        style={{ position: 'absolute', top: 0, left: 0 }}
      />
    </div>
  );
}
