import { useState, useEffect } from 'react';
import { Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getBunnyVideoUrls } from '@/hooks/useHLSPlayer';

interface FeedItem {
  id: string;
  type: 'work' | 'post';
  title?: string;
  caption?: string;
  media_url: string;
  media_type: 'image' | 'video';
  thumbnail_url?: string;
  user_id: string;
  user_name?: string;
  user_avatar?: string;
  client_name?: string;
  views_count: number;
  likes_count: number;
  comments_count: number;
  created_at: string;
}

interface FeedGridCardProps {
  item: FeedItem;
  onClick: () => void;
}

function formatCount(count: number): string {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return count.toString();
}

export default function FeedGridCard({ item, onClick }: FeedGridCardProps) {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  
  // Try to get thumbnail from Bunny CDN if not provided
  const bunnyUrls = item.media_type === 'video' ? getBunnyVideoUrls(item.media_url) : null;
  const effectiveThumbnail = item.thumbnail_url || bunnyUrls?.thumbnail;
  
  // Reset error state when item changes
  useEffect(() => {
    setImageError(false);
    setImageLoaded(false);
  }, [item.id]);

  const renderMedia = () => {
    if (item.media_type === 'video') {
      return (
        <>
          {effectiveThumbnail && !imageError ? (
            <>
              <img
                src={effectiveThumbnail}
                alt={item.title || item.caption || 'Video'}
                className={cn(
                  "w-full h-full object-cover transition-transform duration-300",
                  "group-hover:scale-105",
                  !imageLoaded && "scale-[1.02] blur-sm"
                )}
                onLoad={() => setImageLoaded(true)}
                onError={() => setImageError(true)}
              />

              {!imageLoaded && (
                <div className="absolute inset-0 flex items-center justify-center bg-muted">
                  <Play className="h-8 w-8 text-muted-foreground" />
                </div>
              )}
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-muted">
              <Play className="h-8 w-8 text-muted-foreground" />
            </div>
          )}
          
          {/* Video indicator */}
          <div className="absolute top-2 right-2">
            <Play className="h-5 w-5 text-white drop-shadow-lg fill-white/30" />
          </div>
          
          {/* Views count */}
          <div className="absolute bottom-2 left-2 flex items-center gap-1 text-white text-xs font-medium drop-shadow-lg">
            <Play className="h-3 w-3" fill="currentColor" />
            <span>{formatCount(item.views_count)}</span>
          </div>
        </>
      );
    }
    
    return (
      <>
        {!imageError ? (
          <img
            src={item.media_url}
            alt={item.title || item.caption || 'Post'}
            className={cn(
              "w-full h-full object-cover transition-all duration-300",
              "group-hover:scale-105",
              imageLoaded ? "opacity-100" : "opacity-0"
            )}
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-muted">
            <span className="text-sm text-muted-foreground">No se pudo cargar</span>
          </div>
        )}

        {/* Loading skeleton */}
        {!imageLoaded && !imageError && (
          <div className="absolute inset-0 bg-muted animate-pulse" />
        )}
      </>
    );
  };

  return (
    <div
      className="aspect-square relative group cursor-pointer overflow-hidden bg-muted"
      onClick={onClick}
    >
      {renderMedia()}

      {/* Hover overlay */}
      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 text-white">
        {item.likes_count > 0 && (
          <span className="flex items-center gap-1 text-sm font-semibold">
            ❤️ {formatCount(item.likes_count)}
          </span>
        )}
        {item.comments_count > 0 && (
          <span className="flex items-center gap-1 text-sm font-semibold">
            💬 {formatCount(item.comments_count)}
          </span>
        )}
      </div>
    </div>
  );
}
