import { useState, useMemo } from "react";
import { Video, Play, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { extractBunnyIds, getBunnyVideoUrls } from "@/hooks/useHLSPlayer";
import { Content, ContentStatus } from "@/types/database";
import { TECH_COLORS } from "./kanbanTechStyles";
import { cn } from "@/lib/utils";

/** Estados que permiten mostrar preview de video (Entregado/Completado) */
const VIDEO_READY_STATUSES: ContentStatus[] = ["delivered", "approved", "paid", "corrected"];

function getPrimaryVideoUrl(content: Content): string | null {
  const urls = (content as any).video_urls;
  if (urls?.length > 0) {
    const first = urls.find((u: string) => u?.trim());
    if (first) return first;
  }
  return (content as any).video_url || (content as any).bunny_embed_url || null;
}

function isBunnyUrl(url: string): boolean {
  return (
    url.includes("mediadelivery.net") ||
    url.includes("b-cdn.net")
  );
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
}

export function KanbanCardVideoPreview({
  content,
  cardSize = "normal",
  className,
  hooksCount,
}: KanbanCardVideoPreviewProps) {
  const [isPlaying, setIsPlaying] = useState(false);

  const primaryVideoUrl = getPrimaryVideoUrl(content);
  const hasVideoReady =
    !!primaryVideoUrl &&
    VIDEO_READY_STATUSES.includes(content.status);
  const isBunny = primaryVideoUrl ? isBunnyUrl(primaryVideoUrl) : false;

  const bunnyIds = useMemo(
    () => (primaryVideoUrl ? extractBunnyIds(primaryVideoUrl) : null),
    [primaryVideoUrl]
  );
  const bunnyUrls = useMemo(
    () => (primaryVideoUrl ? getBunnyVideoUrls(primaryVideoUrl) : null),
    [primaryVideoUrl]
  );

  const canPlayInline = hasVideoReady && isBunny && !!bunnyIds;
  const embedUrl = canPlayInline
    ? buildBunnyEmbedUrl(bunnyIds!.libraryId, bunnyIds!.videoId, true)
    : null;

  const containerClass = cn(
    "relative overflow-hidden rounded-xl shrink-0 w-[157px] h-[280px] aspect-[9/16] cursor-pointer",
    "transition-all duration-300 ease-out",
    "hover:shadow-[0_0_20px_rgba(168,85,247,0.3)]",
    className
  );

  const placeholderStyle = {
    background: "rgba(255, 255, 255, 0.04)",
    backdropFilter: "blur(16px) saturate(180%)",
    border: `1px solid ${TECH_COLORS.border}`,
    boxShadow: "0 0 20px rgba(139, 92, 246, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.05)",
  };

  if (cardSize === "compact") return null;

  // Estado 1: Sin video final - placeholder (mismo tamaño y estilo que thumbnail)
  if (!hasVideoReady) {
    return (
      <div className="flex justify-center p-4 pt-4 pb-0">
        <div
          className={cn(containerClass, "flex items-center justify-center")}
          style={placeholderStyle}
        >
          <div className="flex flex-col items-center gap-2 text-center px-4">
            <Video className="h-12 w-12 text-[#8b5cf6]/40" />
            <span className="text-xs text-[#94a3b8]">Video pendiente</span>
          </div>
        </div>
      </div>
    );
  }

  // Estado 2 y 3: Thumbnail o Reproduciendo
  return (
    <div className="flex justify-center p-4 pt-4 pb-0">
      <div
        data-video-trigger
        className={containerClass}
        style={{ minWidth: 157 }}
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
                  className="absolute inset-0 w-full h-full border-0 rounded-xl"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
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
