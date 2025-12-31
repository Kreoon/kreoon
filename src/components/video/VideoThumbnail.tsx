import { useState, useRef, useEffect } from 'react';
import { Play, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getBunnyVideoUrls } from '@/hooks/useHLSPlayer';

interface VideoThumbnailProps {
  id: string;
  videoUrl?: string;
  thumbnailUrl?: string | null;
  title?: string;
  viewsCount?: number;
  onClick: () => void;
  aspectRatio?: '9:16' | '16:9' | '1:1';
  showViewCount?: boolean;
  hoverPreview?: boolean;
}

function formatCount(count: number): string {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return count.toString();
}

export function VideoThumbnail({
  id,
  videoUrl,
  thumbnailUrl,
  title,
  viewsCount = 0,
  onClick,
  aspectRatio = '9:16',
  showViewCount = true,
  hoverPreview = false
}: VideoThumbnailProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Get Bunny thumbnail if not provided
  const bunnyUrls = videoUrl ? getBunnyVideoUrls(videoUrl) : null;
  const effectiveThumbnailUrl = thumbnailUrl || bunnyUrls?.thumbnail;
  const previewVideoUrl = bunnyUrls?.mp4;

  // Handle hover preview
  useEffect(() => {
    if (!hoverPreview || !videoRef.current || !isHovering) return;
    
    const video = videoRef.current;
    video.currentTime = 0;
    video.play().catch(() => {});
    
    return () => {
      video.pause();
    };
  }, [isHovering, hoverPreview]);

  const aspectClass = {
    '9:16': 'aspect-[9/16]',
    '16:9': 'aspect-video',
    '1:1': 'aspect-square'
  }[aspectRatio];

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      className={cn(
        "relative bg-zinc-900 cursor-pointer overflow-hidden",
        "group transition-transform active:scale-[0.98]",
        aspectClass
      )}
    >
      {/* Thumbnail Image */}
      {effectiveThumbnailUrl && !imageError ? (
        <img
          src={effectiveThumbnailUrl}
          alt={title || 'Video'}
          className={cn(
            "w-full h-full object-cover transition-opacity duration-300",
            imageLoaded ? "opacity-100" : "opacity-0",
            isHovering && hoverPreview && previewVideoUrl && "opacity-0"
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

      {/* Hover video preview */}
      {hoverPreview && previewVideoUrl && (
        <video
          ref={videoRef}
          src={previewVideoUrl}
          muted
          loop
          playsInline
          className={cn(
            "absolute inset-0 w-full h-full object-cover transition-opacity duration-300",
            isHovering ? "opacity-100" : "opacity-0"
          )}
        />
      )}

      {/* Hover overlay */}
      <div className={cn(
        "absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center",
        isHovering && hoverPreview && "bg-transparent"
      )}>
        {!isHovering || !hoverPreview ? (
          <Play className="w-12 h-12 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
        ) : null}
      </div>

      {/* Views count */}
      {showViewCount && (
        <div className="absolute bottom-2 left-2 flex items-center gap-1 text-white text-xs">
          <Play className="h-3 w-3" fill="currentColor" />
          <span>{formatCount(viewsCount)}</span>
        </div>
      )}
    </div>
  );
}
