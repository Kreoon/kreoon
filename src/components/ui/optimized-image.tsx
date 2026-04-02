import { useState, useRef, useEffect, memo } from 'react';
import { cn } from '@/lib/utils';
import { getOptimizedImageUrl, getPlaceholderColor } from '@/lib/imageOptimization';

interface OptimizedImageProps {
  src: string | null | undefined;
  alt: string;
  width: number;
  height: number;
  className?: string;
  priority?: boolean;
  quality?: number;
  objectFit?: 'cover' | 'contain' | 'fill';
  onLoad?: () => void;
  fallback?: React.ReactNode;
  placeholderId?: string;
}

/**
 * Optimized image component with:
 * - Native lazy loading
 * - Proper width/height for CLS prevention
 * - Supabase Storage image transformation
 * - Loading placeholder
 * - Error handling with fallback
 */
function OptimizedImageComponent({
  src,
  alt,
  width,
  height,
  className,
  priority = false,
  quality = 75,
  objectFit = 'cover',
  onLoad,
  fallback,
  placeholderId,
}: OptimizedImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // Calculate optimized URL
  const optimizedSrc = getOptimizedImageUrl(src, { width: width * 2, quality });

  // Reset state when src changes
  useEffect(() => {
    setLoaded(false);
    setError(false);
  }, [src]);

  const handleLoad = () => {
    setLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    setError(true);
  };

  const placeholderBg = placeholderId ? getPlaceholderColor(placeholderId) : 'bg-white/5';

  if (error || !src) {
    return fallback ? (
      <>{fallback}</>
    ) : (
      <div
        className={cn(placeholderBg, className)}
        style={{ width, height }}
        role="img"
        aria-label={alt}
      />
    );
  }

  return (
    <div className={cn('relative overflow-hidden', className)} style={{ aspectRatio: `${width}/${height}` }}>
      {/* Placeholder */}
      {!loaded && (
        <div className={cn('absolute inset-0 animate-pulse', placeholderBg)} />
      )}

      <img
        ref={imgRef}
        src={optimizedSrc}
        alt={alt}
        width={width}
        height={height}
        loading={priority ? 'eager' : 'lazy'}
        decoding={priority ? 'sync' : 'async'}
        onLoad={handleLoad}
        onError={handleError}
        className={cn(
          'transition-opacity duration-300',
          loaded ? 'opacity-100' : 'opacity-0',
          objectFit === 'cover' && 'object-cover w-full h-full',
          objectFit === 'contain' && 'object-contain w-full h-full',
          objectFit === 'fill' && 'object-fill w-full h-full',
        )}
      />
    </div>
  );
}

export const OptimizedImage = memo(OptimizedImageComponent);
