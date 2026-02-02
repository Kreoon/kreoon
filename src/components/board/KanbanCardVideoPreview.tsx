import { useState, useMemo } from "react";
import { Video, Play, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { extractBunnyIds, getBunnyVideoUrls } from "@/hooks/useHLSPlayer";
import { Content, ContentStatus } from "@/types/database";
import { TECH_COLORS } from "./kanbanTechStyles";
import { cn } from "@/lib/utils";

/** Estados que permiten mostrar área de video: tienen o pueden tener video final */
const VIDEO_AREA_STATUSES: (ContentStatus | string)[] = [
  "delivered",
  "approved",
  "recorded",
  "corrected", // Video corregido entregado
  "issue", // Novedad - cliente revisando, ya hay video entregado
  "review", // En revisión
  "editing", // En edición - editor puede haber subido preview
];

function getPrimaryVideoUrl(content: Content): string | null {
  const urls = (content as any).video_urls;
  if (urls?.length > 0) {
    const first = urls.find((u: string) => u?.trim());
    if (first) return first;
  }
  return (content as any).video_url || (content as any).bunny_embed_url || null;
}

/** Estados tempranos: no esperamos video final aún */
const EARLY_STATUSES: string[] = ["draft", "script_pending", "script_approved", "assigned"];

/** Si debe mostrarse el área de video (sin placeholder cuando es false) */
export function shouldShowVideoArea(content: Content): boolean {
  const hasVideoUrl = !!getPrimaryVideoUrl(content)?.trim();
  if (!hasVideoUrl) return false;
  const status = String(content.status || "").toLowerCase();
  if (VIDEO_AREA_STATUSES.some((s) => String(s).toLowerCase() === status)) return true;
  if (EARLY_STATUSES.includes(status)) return false;
  return true;
}

function isBunnyUrl(url: string): boolean {
  return (
    url.includes("mediadelivery.net") ||
    url.includes("b-cdn.net")
  );
}

function isDirectVideoUrl(url: string): boolean {
  return /\.(mp4|webm|mov|m4v)(\?|$)/i.test(url) || url.includes("supabase.co/storage");
}

function buildBunnyEmbedUrl(
  libraryId: string,
  videoId: string,
  autoplay: boolean
): string {
  const params = new URLSearchParams({
    autoplay: String(autoplay),
    preload: "true",
    responsive: "true",
    controls: "true",
  });
  return `https://iframe.mediadelivery.net/embed/${libraryId}/${videoId}?${params.toString()}`;
}

export interface KanbanCardVideoPreviewProps {
  content: Content;
  cardSize?: "compact" | "normal" | "large";
  className?: string;
  /** Badge "X hooks" overlay */
  hooksCount?: number;
  /** Orientación del video (default vertical para TikTok/Reels) */
  isVertical?: boolean;
}

export function KanbanCardVideoPreview({
  content,
  cardSize = "normal",
  className,
  hooksCount,
  isVertical = true,
}: KanbanCardVideoPreviewProps) {
  const [isPlaying, setIsPlaying] = useState(false);

  const primaryVideoUrl = getPrimaryVideoUrl(content);
  const showVideoArea = shouldShowVideoArea(content);
  const isBunny = primaryVideoUrl ? isBunnyUrl(primaryVideoUrl) : false;

  const bunnyIds = useMemo(
    () => (primaryVideoUrl ? extractBunnyIds(primaryVideoUrl) : null),
    [primaryVideoUrl]
  );
  const bunnyUrls = useMemo(
    () => (primaryVideoUrl ? getBunnyVideoUrls(primaryVideoUrl) : null),
    [primaryVideoUrl]
  );

  const canPlayWithIframe = showVideoArea && isBunny && !!bunnyIds && /^\d+$/.test(String(bunnyIds.libraryId));
  const embedUrl = canPlayWithIframe
    ? buildBunnyEmbedUrl(bunnyIds!.libraryId, bunnyIds!.videoId, true)
    : null;
  const canPlayWithVideoTag = showVideoArea && !!bunnyUrls && (!!bunnyUrls.hls || !!bunnyUrls.mp4);
  const videoSrc = canPlayWithVideoTag ? (bunnyUrls!.mp4 || bunnyUrls!.hls) : null;
  const canPlayDirectUrl = showVideoArea && !!primaryVideoUrl && isDirectVideoUrl(primaryVideoUrl);
  const directVideoSrc = canPlayDirectUrl ? primaryVideoUrl : null;
  const canPlayInline = canPlayWithIframe || canPlayWithVideoTag || canPlayDirectUrl;

  const containerStyle = {
    width: "100%",
    maxWidth: isVertical ? 280 : "100%",
    aspectRatio: isVertical ? "9/16" : "16/9",
    margin: "0 auto",
    borderRadius: 12,
    overflow: "hidden" as const,
  };

  const containerClass = cn(
    "relative shrink-0 cursor-pointer",
    "transition-all duration-300 ease-out",
    "hover:shadow-[0_0_20px_rgba(168,85,247,0.3)]",
    className
  );

  if (cardSize === "compact") return null;

  // Si no debe mostrarse área de video: no renderizar nada (sin placeholder ni espacio vacío)
  if (!showVideoArea) return null;

  // Thumbnail o Reproduciendo (contenedor dinámico por orientación)
  return (
    <div className="flex justify-center p-4 pt-4 pb-0">
      <div
        data-video-trigger
        className={containerClass}
        style={containerStyle}
      >
        <AnimatePresence mode="wait">
          {!isPlaying ? (
            <motion.div
              key="thumbnail"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="relative w-full h-full"
              onClick={(e) => {
                e.stopPropagation();
                if (canPlayInline) setIsPlaying(true);
              }}
            >
              {bunnyUrls?.thumbnail || content.thumbnail_url ? (
                <img
                  src={bunnyUrls?.thumbnail || content.thumbnail_url!}
                  alt={content.title}
                  className="w-full h-full object-cover rounded-xl"
                  loading="lazy"
                />
              ) : (
                <div
                  className="w-full h-full rounded-xl flex items-center justify-center"
                  style={{
                    background: "linear-gradient(135deg, #1a0a2e 0%, #0a0118 100%)",
                    border: `1px solid ${TECH_COLORS.border}`,
                  }}
                >
                  <Video className="h-12 w-12 text-[#8b5cf6]/40" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/80 rounded-xl" />
              {hooksCount && hooksCount > 1 && (
                <div
                  className="absolute top-2 right-2 z-10 px-2 py-0.5 rounded-lg text-xs font-medium"
                  style={{
                    background: "rgba(255,255,255,0.1)",
                    backdropFilter: "blur(8px)",
                    color: TECH_COLORS.text,
                  }}
                >
                  {hooksCount} hooks
                </div>
              )}
              {canPlayInline && (
                <div className="absolute inset-0 flex items-center justify-center rounded-xl">
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-full transition-all duration-300 group-hover:scale-110"
                    style={{
                      background: "rgba(255,255,255,0.1)",
                      backdropFilter: "blur(8px)",
                      boxShadow: "0 0 20px rgba(168,85,247,0.6)",
                    }}
                  >
                    <Play className="h-6 w-6 text-[#a855f7] fill-[#a855f7] ml-1" />
                  </div>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="player"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="relative w-full h-full rounded-xl overflow-hidden"
              style={{
                boxShadow: "0 0 25px rgba(168, 85, 247, 0.4)",
                border: "1px solid rgba(168, 85, 247, 0.4)",
              }}
            >
              {embedUrl && (
                <iframe
                  src={embedUrl}
                  title={content.title}
                  className="absolute top-0 left-0 w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              )}
              {!embedUrl && (videoSrc || directVideoSrc) && (
                <video
                  src={videoSrc || directVideoSrc || undefined}
                  autoPlay
                  controls
                  playsInline
                  className="absolute top-0 left-0 w-full h-full object-contain bg-black"
                />
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsPlaying(false);
                }}
                className="absolute top-1.5 right-1.5 z-10 flex h-7 w-7 items-center justify-center rounded-lg transition-all"
                style={{
                  background: "rgba(0,0,0,0.6)",
                  backdropFilter: "blur(8px)",
                  border: "1px solid rgba(255,255,255,0.2)",
                  color: "#f8fafc",
                }}
                aria-label="Cerrar video"
              >
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
