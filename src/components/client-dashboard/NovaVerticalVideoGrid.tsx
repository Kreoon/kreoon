import * as React from "react";
import { Play, Video, CheckCircle2, Clock, Eye, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Content, STATUS_LABELS, ContentStatus } from "@/types/database";

interface NovaVerticalVideoGridProps {
  videos: Content[];
  onVideoClick: (content: Content) => void;
  maxItems?: number;
  className?: string;
}

const statusConfig: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  approved: { icon: CheckCircle2, color: "text-green-500", bg: "bg-green-500/10" },
  paid: { icon: CheckCircle2, color: "text-green-500", bg: "bg-green-500/10" },
  delivered: { icon: Eye, color: "text-blue-500", bg: "bg-blue-500/10" },
  corrected: { icon: Eye, color: "text-blue-500", bg: "bg-blue-500/10" },
  review: { icon: Eye, color: "text-amber-500", bg: "bg-amber-500/10" },
  issue: { icon: AlertTriangle, color: "text-orange-500", bg: "bg-orange-500/10" },
  editing: { icon: Clock, color: "text-purple-500", bg: "bg-purple-500/10" },
  recording: { icon: Clock, color: "text-cyan-500", bg: "bg-cyan-500/10" },
  draft: { icon: Clock, color: "text-zinc-500", bg: "bg-zinc-500/10" },
};

function getThumbnailUrl(content: Content): string | null {
  // Prefer explicit thumbnail
  if (content.thumbnail_url && !content.thumbnail_url.includes('iframe.mediadelivery.net')) {
    return content.thumbnail_url;
  }

  // Extract from Bunny embed URL
  const videoUrl = (content.video_urls as string[] | undefined)?.find(u => u?.trim())
    || content.video_url
    || content.bunny_embed_url
    || '';

  const embedMatch = videoUrl.match(/iframe\.mediadelivery\.net\/embed\/(\d+)\/([a-f0-9-]+)/i);
  if (embedMatch) {
    return `https://vz-${embedMatch[1]}.b-cdn.net/${embedMatch[2]}/thumbnail.jpg`;
  }

  return null;
}

export function NovaVerticalVideoGrid({
  videos,
  onVideoClick,
  maxItems = 6,
  className,
}: NovaVerticalVideoGridProps) {
  const displayVideos = videos.slice(0, maxItems);

  if (displayVideos.length === 0) {
    return (
      <div className={cn(
        "flex flex-col items-center justify-center py-12 px-4",
        "rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700",
        "bg-zinc-50 dark:bg-zinc-900/50",
        className
      )}>
        <Video className="h-12 w-12 text-zinc-400 mb-3" />
        <p className="text-sm text-zinc-500">
          No hay videos recientes
        </p>
      </div>
    );
  }

  return (
    <div className={cn(
      "grid gap-3",
      // Responsive grid for vertical videos
      "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6",
      className
    )}>
      {displayVideos.map((video, index) => {
        const thumbUrl = getThumbnailUrl(video);
        const status = video.status as ContentStatus;
        const config = statusConfig[status] || statusConfig.draft;
        const StatusIcon = config.icon;

        return (
          <div
            key={video.id}
            onClick={() => onVideoClick(video)}
            className={cn(
              "group relative cursor-pointer overflow-hidden rounded-lg",
              "border border-zinc-200 dark:border-zinc-800",
              "bg-white dark:bg-[#14141f]",
              "transition-colors duration-150",
              "hover:border-purple-500/50"
            )}
          >
            {/* Aspect ratio container for 9:16 */}
            <div className="aspect-[9/16] relative">
              {/* Thumbnail or placeholder */}
              {thumbUrl ? (
                <img
                  src={thumbUrl}
                  alt={video.title}
                  className="absolute inset-0 w-full h-full object-cover"
                  loading="lazy"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-zinc-100 dark:bg-zinc-900">
                  <Video className="h-8 w-8 text-zinc-400" />
                </div>
              )}

              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/70 dark:from-[#0a0a0f]/70 via-transparent to-transparent" />

              {/* Play button overlay on hover */}
              <div className={cn(
                "absolute inset-0 flex items-center justify-center",
                "opacity-0 group-hover:opacity-100 transition-opacity duration-150",
                "bg-zinc-900/20 dark:bg-[#0a0a0f]/20"
              )}>
                <div className="p-2.5 rounded-full bg-white/90">
                  <Play className="h-5 w-5 text-zinc-900" fill="currentColor" />
                </div>
              </div>

              {/* Status badge */}
              <div className="absolute top-2 right-2">
                <div className={cn(
                  "p-1.5 rounded-lg",
                  config.bg
                )}>
                  <StatusIcon className={cn("h-3 w-3", config.color)} />
                </div>
              </div>

              {/* Title at bottom */}
              <div className="absolute bottom-0 left-0 right-0 p-2.5">
                <p className="text-xs font-medium text-zinc-100 line-clamp-2 leading-tight">
                  {video.title}
                </p>
                <p className="text-[10px] text-zinc-100/70 mt-0.5">
                  {STATUS_LABELS[status] || status}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
