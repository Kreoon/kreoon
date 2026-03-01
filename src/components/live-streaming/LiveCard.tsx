/**
 * LiveCard - Card para mostrar un stream en vivo en listados
 */

import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Users, Eye } from 'lucide-react';
import { LiveBadge } from './LiveBadge';
import type { LiveStreamWithCreator } from '@/types/live-streaming.types';
import { LIVE_CATEGORIES } from '@/types/live-streaming.types';

interface LiveCardProps {
  stream: LiveStreamWithCreator;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function LiveCard({ stream, className, size = 'md' }: LiveCardProps) {
  const categoryLabel = LIVE_CATEGORIES.find((c) => c.value === stream.category)?.label || stream.category;

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatViewers = (n: number) => {
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return n.toString();
  };

  const sizeClasses = {
    sm: 'w-48',
    md: 'w-64',
    lg: 'w-80',
  };

  const thumbnailHeights = {
    sm: 'h-28',
    md: 'h-36',
    lg: 'h-44',
  };

  // Campos pueden venir como creator_slug/creator_name (de RPC) o anidados en profiles/creator_profiles
  const creatorSlug = stream.creator_slug || (stream as any).creator_profiles?.slug || stream.user_id;
  const creatorName = stream.creator_name || (stream as any).profiles?.full_name || 'Usuario';
  const creatorAvatar = stream.creator_avatar || (stream as any).profiles?.avatar_url;

  return (
    <Link
      to={`/live/${creatorSlug}`}
      className={cn(
        'group block rounded-lg overflow-hidden bg-card border hover:border-primary/50 transition-colors',
        sizeClasses[size],
        className
      )}
    >
      {/* Thumbnail */}
      <div className={cn('relative bg-muted', thumbnailHeights[size])}>
        {stream.thumbnail_url ? (
          <img
            src={stream.thumbnail_url}
            alt={stream.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-red-500/20 to-purple-500/20">
            <Users className="h-8 w-8 text-muted-foreground" />
          </div>
        )}

        {/* Live badge */}
        <div className="absolute top-2 left-2">
          <LiveBadge size="sm" />
        </div>

        {/* Viewer count */}
        <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-black/60 rounded px-1.5 py-0.5">
          <Eye className="h-3 w-3 text-white" />
          <span className="text-white text-xs font-medium">
            {formatViewers(stream.current_viewers || 0)}
          </span>
        </div>

        {/* Category */}
        <div className="absolute bottom-2 right-2">
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5">
            {categoryLabel}
          </Badge>
        </div>

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <span className="text-white font-medium">Ver stream</span>
        </div>
      </div>

      {/* Info */}
      <div className="p-3">
        <div className="flex items-start gap-2">
          <Avatar className="h-8 w-8 flex-shrink-0">
            <AvatarImage src={creatorAvatar} />
            <AvatarFallback>
              {getInitials(creatorName)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-sm truncate group-hover:text-primary transition-colors">
              {stream.title}
            </h3>
            <p className="text-xs text-muted-foreground truncate">
              {creatorName}
            </p>
          </div>
        </div>
      </div>
    </Link>
  );
}

/**
 * LiveCardSkeleton - Skeleton loading para LiveCard
 */
export function LiveCardSkeleton({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = {
    sm: 'w-48',
    md: 'w-64',
    lg: 'w-80',
  };

  const thumbnailHeights = {
    sm: 'h-28',
    md: 'h-36',
    lg: 'h-44',
  };

  return (
    <div className={cn('rounded-lg overflow-hidden bg-card border', sizeClasses[size])}>
      <div className={cn('bg-muted animate-pulse', thumbnailHeights[size])} />
      <div className="p-3">
        <div className="flex items-start gap-2">
          <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
            <div className="h-3 bg-muted rounded animate-pulse w-1/2" />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * LiveCardCompact - Versión compacta para sidebar o listas
 */
interface LiveCardCompactProps {
  stream: LiveStreamWithCreator;
  className?: string;
}

export function LiveCardCompact({ stream, className }: LiveCardCompactProps) {
  const formatViewers = (n: number) => {
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return n.toString();
  };

  // Campos pueden venir como creator_slug/creator_name (de RPC) o anidados en profiles/creator_profiles
  const creatorSlug = stream.creator_slug || (stream as any).creator_profiles?.slug || stream.user_id;
  const creatorName = stream.creator_name || (stream as any).profiles?.full_name || 'Usuario';

  return (
    <Link
      to={`/live/${creatorSlug}`}
      className={cn(
        'flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors',
        className
      )}
    >
      {/* Thumbnail mini */}
      <div className="relative w-16 h-10 rounded overflow-hidden bg-muted flex-shrink-0">
        {stream.thumbnail_url ? (
          <img
            src={stream.thumbnail_url}
            alt={stream.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Users className="h-4 w-4 text-muted-foreground" />
          </div>
        )}
        <div className="absolute top-0.5 left-0.5">
          <span className="bg-red-600 text-white text-[8px] font-bold px-1 rounded">
            LIVE
          </span>
        </div>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">
          {creatorName}
        </p>
        <p className="text-xs text-muted-foreground truncate">{stream.title}</p>
      </div>

      {/* Viewers */}
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <Eye className="h-3 w-3" />
        {formatViewers(stream.current_viewers || 0)}
      </div>
    </Link>
  );
}
