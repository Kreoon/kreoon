import { useState } from 'react';
import { Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getBunnyVideoUrls } from '@/hooks/useHLSPlayer';

interface PortfolioVideoThumbnailProps {
  id: string;
  videoUrl?: string;
  thumbnailUrl?: string | null;
  title?: string;
  viewsCount: number;
  onClick: () => void;
}

function formatCount(count: number): string {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return count.toString();
}

export function PortfolioVideoThumbnail({
  id,
  videoUrl,
  thumbnailUrl,
  title,
  viewsCount,
  onClick,
}: PortfolioVideoThumbnailProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Get Bunny thumbnail if not provided
  const bunnyUrls = videoUrl ? getBunnyVideoUrls(videoUrl) : null;
  const effectiveThumbnailUrl = thumbnailUrl || bunnyUrls?.thumbnail;

  return (
    <div
      onClick={onClick}
      className={cn(
        "relative aspect-[9/16] bg-zinc-900 cursor-pointer overflow-hidden",
        "group transition-transform active:scale-[0.98]"
      )}
    >
      {/* Thumbnail */}
      {effectiveThumbnailUrl && !imageError ? (
        <img
          src={effectiveThumbnailUrl}
          alt={title || 'Video'}
          className={cn(
            "w-full h-full object-cover transition-opacity duration-300",
            imageLoaded ? "opacity-100" : "opacity-0"
          )}
          onLoad={() => setImageLoaded(true)}
          onError={() => setImageError(true)}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-zinc-800">
          <Play className="w-8 h-8 text-white/40" />
        </div>
      )}

      {/* Loading skeleton */}
      {!imageLoaded && effectiveThumbnailUrl && !imageError && (
        <div className="absolute inset-0 bg-zinc-800 animate-pulse" />
      )}

      {/* Hover overlay */}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
        <Play className="w-12 h-12 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>

      {/* Views count - bottom left */}
      <div className="absolute bottom-2 left-2 flex items-center gap-1 text-white text-xs">
        <Play className="h-3 w-3" fill="currentColor" />
        <span>{formatCount(viewsCount)}</span>
      </div>
    </div>
  );
}
