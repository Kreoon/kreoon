import { memo, useState, useRef, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Play, Eye, Heart, Clock, CheckCircle, AlertCircle, Video } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { STATUS_LABELS, STATUS_COLORS } from '@/types/database';
import { UnifiedContentItem } from '@/hooks/unified/useUnifiedContent';

export type CardVariant = 'grid' | 'list' | 'compact';

interface ContentCardProps {
  item: UnifiedContentItem;
  variant?: CardVariant;
  onClick?: () => void;
  showStatus?: boolean;
  showStats?: boolean;
  showCreator?: boolean;
  showClient?: boolean;
  showVariantCount?: boolean;
  selected?: boolean;
  selectable?: boolean;
  onSelect?: (selected: boolean) => void;
  priority?: boolean; // For above-the-fold items
}

export const ContentCard = memo(function ContentCard({
  item,
  variant = 'grid',
  onClick,
  showStatus = true,
  showStats = true,
  showCreator = true,
  showClient = false,
  showVariantCount = true,
  selected = false,
  selectable = false,
  onSelect,
  priority = false
}: ContentCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isInView, setIsInView] = useState(priority);
  const cardRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (priority) {
      setIsInView(true);
      return;
    }

    const element = cardRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: '200px',
        threshold: 0.01,
      }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [priority]);

  // Get variant count
  const variantCount = item.video_urls?.length || 1;

  // Determine thumbnail or video preview
  const previewUrl = item.thumbnail_url || (item.video_urls?.[0]) || item.media_url;
  const isVideo = item.media_type === 'video';

  // Play video on hover (for grid variant)
  useEffect(() => {
    if (variant === 'grid' && isHovered && videoRef.current && isVideo) {
      videoRef.current.play().catch(() => {});
    } else if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  }, [isHovered, variant, isVideo]);

  // Status icon
  const getStatusIcon = () => {
    switch (item.status) {
      case 'approved':
      case 'published':
        return <CheckCircle className="h-3 w-3" />;
      case 'issue':
        return <AlertCircle className="h-3 w-3" />;
      default:
        return <Clock className="h-3 w-3" />;
    }
  };

  if (variant === 'list') {
    return (
      <div
        onClick={onClick}
        className={cn(
          "flex items-center gap-4 p-3 rounded-lg border bg-card transition-all cursor-pointer",
          "hover:bg-accent/50 hover:border-primary/30",
          selected && "ring-2 ring-primary border-primary"
        )}
      >
        {/* Thumbnail */}
        <div className="relative w-24 h-16 rounded-md overflow-hidden bg-muted flex-shrink-0">
          {previewUrl ? (
            <img
              src={item.thumbnail_url || previewUrl}
              alt={item.title || 'Content'}
              className="w-full h-full object-cover"
              onLoad={() => setImageLoaded(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Video className="h-6 w-6 text-muted-foreground" />
            </div>
          )}
          {isVideo && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/20">
              <Play className="h-4 w-4 text-white fill-white" />
            </div>
          )}
          {showVariantCount && variantCount > 1 && (
            <Badge className="absolute top-1 right-1 text-[10px] px-1 py-0 h-4">
              {variantCount}
            </Badge>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm truncate">{item.title || item.caption || 'Sin título'}</h4>
          {showCreator && item.user_name && (
            <p className="text-xs text-muted-foreground truncate">
              {item.user_name}
            </p>
          )}
          {showClient && item.client_name && (
            <p className="text-xs text-muted-foreground truncate">
              Cliente: {item.client_name}
            </p>
          )}
        </div>

        {/* Stats */}
        {showStats && (
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {item.views_count > 0 && (
              <span className="flex items-center gap-1">
                <Eye className="h-3 w-3" />
                {item.views_count}
              </span>
            )}
            {item.likes_count > 0 && (
              <span className="flex items-center gap-1">
                <Heart className="h-3 w-3" />
                {item.likes_count}
              </span>
            )}
          </div>
        )}

        {/* Status */}
        {showStatus && item.status && (
          <Badge className={cn("text-xs", STATUS_COLORS[item.status])}>
            {getStatusIcon()}
            <span className="ml-1">{STATUS_LABELS[item.status]}</span>
          </Badge>
        )}

        {/* Selection checkbox */}
        {selectable && (
          <input
            type="checkbox"
            checked={selected}
            onChange={(e) => {
              e.stopPropagation();
              onSelect?.(e.target.checked);
            }}
            className="h-4 w-4 rounded border-gray-300"
          />
        )}
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div
        onClick={onClick}
        className={cn(
          "relative aspect-square rounded-md overflow-hidden bg-muted cursor-pointer group",
          selected && "ring-2 ring-primary"
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {previewUrl ? (
          <img
            src={item.thumbnail_url || previewUrl}
            alt={item.title || 'Content'}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Video className="h-8 w-8 text-muted-foreground" />
          </div>
        )}

        {/* Overlay on hover */}
        <div className={cn(
          "absolute inset-0 bg-black/50 flex items-center justify-center transition-opacity",
          isHovered ? "opacity-100" : "opacity-0"
        )}>
          {isVideo && <Play className="h-8 w-8 text-white fill-white" />}
        </div>

        {/* Variant count */}
        {showVariantCount && variantCount > 1 && (
          <Badge className="absolute top-1 right-1 text-[10px] px-1.5 py-0 h-5 bg-black/70">
            1/{variantCount}
          </Badge>
        )}
      </div>
    );
  }

  // Default: Grid variant
  return (
    <div
      ref={cardRef}
      onClick={onClick}
      className={cn(
        "relative aspect-[4/5] rounded-lg overflow-hidden bg-muted cursor-pointer group",
        selected && "ring-2 ring-primary"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Thumbnail/Video - lazy loaded */}
      {!isInView ? (
        <div className="w-full h-full flex items-center justify-center bg-muted animate-pulse">
          {isVideo && <Play className="h-8 w-8 text-muted-foreground/50" />}
        </div>
      ) : isVideo && isHovered && item.video_urls?.[0] ? (
        <video
          ref={videoRef}
          src={item.video_urls[0]}
          className="w-full h-full object-cover"
          muted
          loop
          playsInline
        />
      ) : previewUrl ? (
        <img
          src={item.thumbnail_url || previewUrl}
          alt={item.title || 'Content'}
          className={cn(
            "w-full h-full object-cover transition-transform duration-300",
            isHovered && "scale-105"
          )}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          onLoad={() => setImageLoaded(true)}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <Video className="h-12 w-12 text-muted-foreground" />
        </div>
      )}

      {/* Loading skeleton */}
      {isInView && !imageLoaded && previewUrl && (
        <div className="absolute inset-0 bg-muted animate-pulse" />
      )}

      {/* Play icon overlay */}
      {isVideo && !isHovered && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="p-3 rounded-full bg-black/40 backdrop-blur-sm">
            <Play className="h-6 w-6 text-white fill-white" />
          </div>
        </div>
      )}

      {/* Top badges */}
      <div className="absolute top-2 left-2 right-2 flex items-center justify-between z-10">
        {/* Status badge */}
        {showStatus && item.status && (
          <Badge className={cn("text-xs shadow-md", STATUS_COLORS[item.status])}>
            {STATUS_LABELS[item.status]}
          </Badge>
        )}

        {/* Variant count */}
        {showVariantCount && variantCount > 1 && (
          <Badge className="text-xs bg-black/70 text-white shadow-md">
            1/{variantCount}
          </Badge>
        )}
      </div>

      {/* Bottom gradient with info */}
      <div className={cn(
        "absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-3 pt-8 transition-opacity",
        isHovered ? "opacity-100" : "opacity-0 group-hover:opacity-100"
      )}>
        {/* Title */}
        <h4 className="font-medium text-sm text-white truncate">
          {item.title || item.caption || 'Sin título'}
        </h4>

        {/* Creator */}
        {showCreator && item.user_name && (
          <p className="text-xs text-white/70 truncate mt-0.5">
            {item.user_name}
          </p>
        )}

        {/* Client */}
        {showClient && item.client_name && (
          <Badge variant="secondary" className="text-xs mt-1 bg-white/20 text-white">
            {item.client_name}
          </Badge>
        )}

        {/* Stats */}
        {showStats && (item.views_count > 0 || item.likes_count > 0) && (
          <div className="flex items-center gap-3 text-xs text-white/70 mt-2">
            {item.views_count > 0 && (
              <span className="flex items-center gap-1">
                <Eye className="h-3 w-3" />
                {item.views_count.toLocaleString()}
              </span>
            )}
            {item.likes_count > 0 && (
              <span className="flex items-center gap-1">
                <Heart className="h-3 w-3" />
                {item.likes_count.toLocaleString()}
              </span>
            )}
          </div>
        )}

        {/* Time */}
        <p className="text-[10px] text-white/50 mt-1">
          {formatDistanceToNow(new Date(item.created_at), { addSuffix: true, locale: es })}
        </p>
      </div>

      {/* Selection indicator */}
      {selectable && (
        <div className={cn(
          "absolute top-2 right-2 w-5 h-5 rounded-full border-2 transition-all z-20",
          selected
            ? "bg-primary border-primary"
            : "border-white/50 bg-black/20"
        )}>
          {selected && (
            <CheckCircle className="w-full h-full text-white" />
          )}
        </div>
      )}
    </div>
  );
});
