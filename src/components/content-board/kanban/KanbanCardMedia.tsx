import { lazy, Suspense, useMemo, useState } from "react";
import { Loader2, Play, Video, X } from "lucide-react";
import { extractBunnyIds, getBunnyVideoUrls } from "@/hooks/useHLSPlayer";
import {
  buildBunnyEmbedUrl,
  canPlayVideo,
  getContentThumbnail,
  getPrimaryVideoUrl,
  isBunnyUrl,
  isDirectVideoUrl,
} from "@/components/board/KanbanCardVideoPreview";
import type { Content } from "@/types/database";
import { getOptimizedThumbnail } from "@/lib/imageOptimization";

// El reproductor (HLS) solo se descarga cuando alguien pulsa play.
const BunnyVideoPlayer = lazy(() => import("@/components/video/BunnyVideoPlayer"));

export interface CardMediaInfo {
  thumbnailUrl: string | null;
  primaryVideoUrl: string | null;
  canPlayInline: boolean;
  hasMedia: boolean;
}

/** Datos de media derivados de la producción (sin descargar nada). */
export function getCardMediaInfo(content: Content): CardMediaInfo {
  const primaryVideoUrl = getPrimaryVideoUrl(content)?.trim() || null;
  const thumbnailUrl = getContentThumbnail(content);
  if (!primaryVideoUrl && !thumbnailUrl) {
    return { thumbnailUrl: null, primaryVideoUrl: null, canPlayInline: false, hasMedia: false };
  }
  const playable = canPlayVideo(content);
  const bunnyIds = primaryVideoUrl ? extractBunnyIds(primaryVideoUrl) : null;
  const bunnyUrls = primaryVideoUrl ? getBunnyVideoUrls(primaryVideoUrl) : null;
  const iframe =
    playable && !!primaryVideoUrl && isBunnyUrl(primaryVideoUrl) && !!bunnyIds && /^\d+$/.test(String(bunnyIds.libraryId));
  const tag = playable && !!bunnyUrls && (!!bunnyUrls.hls || !!bunnyUrls.mp4);
  const direct = playable && !!primaryVideoUrl && isDirectVideoUrl(primaryVideoUrl);
  return { thumbnailUrl, primaryVideoUrl, canPlayInline: iframe || tag || direct, hasMedia: true };
}

interface MediaThumbProps {
  title: string;
  info: CardMediaInfo;
  hooksCount?: number | null;
  onPlay: () => void;
}

/** Miniatura 9:16 con recorte uniforme, carga diferida y respaldo si la imagen falla. Sin autoplay. */
export function MediaThumb({ title, info, hooksCount, onPlay }: MediaThumbProps) {
  const [failed, setFailed] = useState(false);
  const showImg = !!info.thumbnailUrl && !failed;
  return (
    <div className="kb-media kb-lift" data-video-trigger>
      {showImg ? (
        <img
          src={getOptimizedThumbnail(info.thumbnailUrl, 144, 256)}
          alt=""
          loading="lazy"
          decoding="async"
          draggable={false}
          width={72}
          height={128}
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="grid h-full w-full place-items-center text-muted-foreground" aria-hidden="true">
          <Video className="h-6 w-6" />
        </div>
      )}
      {hooksCount != null && hooksCount > 1 && <span className="kb-media__hooks">{hooksCount} hooks</span>}
      {info.canPlayInline && (
        <button
          type="button"
          className="kb-media__play"
          data-no-drag
          aria-label={`Reproducir video de «${title}»`}
          onClick={(e) => {
            e.stopPropagation();
            onPlay();
          }}
        >
          <span className="kb-media__btn" aria-hidden="true">
            <Play className="h-4 w-4 fill-current" />
          </span>
        </button>
      )}
    </div>
  );
}

interface MediaPlayerProps {
  title: string;
  content: Content;
  info: CardMediaInfo;
  onClose: () => void;
}

/** Reproductor inline (se monta únicamente tras pulsar play). */
export function MediaPlayer({ title, content, info, onClose }: MediaPlayerProps) {
  const url = info.primaryVideoUrl || "";
  const bunnyIds = useMemo(() => (url ? extractBunnyIds(url) : null), [url]);
  const bunnyUrls = useMemo(() => (url ? getBunnyVideoUrls(url) : null), [url]);
  const direct = !!url && canPlayVideo(content) && isDirectVideoUrl(url);
  const useTag = !!bunnyUrls && (!!bunnyUrls.hls || !!bunnyUrls.mp4);
  const embedUrl =
    !useTag && !direct && bunnyIds && /^\d+$/.test(String(bunnyIds.libraryId))
      ? buildBunnyEmbedUrl(bunnyIds.libraryId, bunnyIds.videoId, true)
      : null;

  return (
    <div className="kb-player kb-lift" data-video-trigger>
      {(useTag || direct) && (
        <Suspense
          fallback={
            <div className="absolute inset-0 grid place-items-center bg-black" role="status" aria-label="Cargando video">
              <Loader2 className="h-6 w-6 animate-spin text-white" />
            </div>
          }
        >
          <BunnyVideoPlayer
            src={url}
            poster={info.thumbnailUrl || undefined}
            autoPlay
            muted
            loop
            showControls
            aspectRatio="9:16"
            objectFit="contain"
            className="absolute left-0 top-0 h-full w-full"
          />
        </Suspense>
      )}
      {embedUrl && (
        <iframe
          src={embedUrl}
          title={title}
          className="absolute left-0 top-0 h-full w-full border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      )}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        className="absolute right-1.5 top-1.5 z-10 grid h-8 w-8 place-items-center rounded-full bg-black/65 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        aria-label="Cerrar video"
        data-no-drag
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
