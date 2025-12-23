import { useState } from 'react';
import { cn } from '@/lib/utils';

interface PortfolioImageThumbnailProps {
  id: string;
  imageUrl: string;
  title?: string;
  onClick: () => void;
}

export function PortfolioImageThumbnail({
  id,
  imageUrl,
  title,
  onClick,
}: PortfolioImageThumbnailProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  return (
    <div
      onClick={onClick}
      className={cn(
        "relative aspect-[9/16] bg-zinc-900 cursor-pointer overflow-hidden",
        "group transition-transform active:scale-[0.98]"
      )}
    >
      {/* Image */}
      {imageUrl && !imageError ? (
        <img
          src={imageUrl}
          alt={title || 'Image'}
          className={cn(
            "w-full h-full object-cover transition-opacity duration-300",
            imageLoaded ? "opacity-100" : "opacity-0"
          )}
          onLoad={() => setImageLoaded(true)}
          onError={() => setImageError(true)}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-zinc-800">
          <span className="text-white/40 text-xs">Sin imagen</span>
        </div>
      )}

      {/* Loading skeleton */}
      {!imageLoaded && imageUrl && !imageError && (
        <div className="absolute inset-0 bg-zinc-800 animate-pulse" />
      )}

      {/* Hover overlay */}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
    </div>
  );
}
