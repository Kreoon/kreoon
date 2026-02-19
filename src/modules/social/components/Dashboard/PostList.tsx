import { MoreHorizontal, Trash2, Play, XCircle, RotateCw, Eye, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useScheduledPosts } from '../../hooks/useScheduledPosts';
import { PlatformIcon } from '../common/PlatformIcon';
import { PostStatusBadge } from '../common/PostStatusBadge';
import type { ScheduledPost } from '../../types/social.types';
import { toast } from 'sonner';

interface PostListProps {
  onViewPost?: (post: ScheduledPost) => void;
}

export function PostList({ onViewPost }: PostListProps) {
  const { posts, isLoading, publishNow, cancelPost, deletePost } = useScheduledPosts();

  const handlePublish = async (post: ScheduledPost) => {
    try {
      await publishNow.mutateAsync(post.id);
      toast.success('Publicando...');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleCancel = async (post: ScheduledPost) => {
    try {
      await cancelPost.mutateAsync(post.id);
      toast.success('Post cancelado');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDelete = async (post: ScheduledPost) => {
    try {
      await deletePost.mutateAsync(post.id);
      toast.success('Post eliminado');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <Card key={i} className="animate-pulse bg-muted/20">
            <CardContent className="h-20" />
          </Card>
        ))}
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <Card className="bg-muted/20">
        <CardContent className="flex flex-col items-center gap-3 py-8">
          <Clock className="w-10 h-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No hay publicaciones programadas.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {posts.map(post => {
        const platforms = (post.target_accounts || []).map((t: any) => t.platform).filter(Boolean);
        const uniquePlatforms = [...new Set(platforms)] as string[];

        return (
          <Card
            key={post.id}
            className="bg-card/50 hover:bg-card/80 transition-colors cursor-pointer"
            onClick={() => onViewPost?.(post)}
          >
            <CardContent className="flex items-center gap-4 py-3">
              {/* Thumbnail */}
              {post.thumbnail_url || (post.media_urls && post.media_urls.length > 0) ? (
                <div className="w-14 h-14 rounded-lg overflow-hidden bg-muted shrink-0">
                  <img
                    src={post.thumbnail_url || post.media_urls[0]}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-14 h-14 rounded-lg bg-muted/50 flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5 text-muted-foreground" />
                </div>
              )}

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-sm truncate">
                  {post.caption?.slice(0, 80) || 'Sin caption'}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  {/* Platforms */}
                  <div className="flex items-center gap-1">
                    {uniquePlatforms.slice(0, 4).map(p => (
                      <PlatformIcon key={p} platform={p as any} size="xs" />
                    ))}
                  </div>
                  {/* Time */}
                  {post.scheduled_at && (
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(post.scheduled_at).toLocaleString('es', {
                        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                      })}
                    </span>
                  )}
                </div>
              </div>

              {/* Status */}
              <PostStatusBadge status={post.status} />

              {/* Actions */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0">
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {(post.status === 'draft' || post.status === 'scheduled') && (
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handlePublish(post); }}>
                      <Play className="w-4 h-4 mr-2" /> Publicar ahora
                    </DropdownMenuItem>
                  )}
                  {post.status === 'scheduled' && (
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleCancel(post); }}>
                      <XCircle className="w-4 h-4 mr-2" /> Cancelar
                    </DropdownMenuItem>
                  )}
                  {post.status === 'failed' && (
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handlePublish(post); }}>
                      <RotateCw className="w-4 h-4 mr-2" /> Reintentar
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    className="text-red-400"
                    onClick={(e) => { e.stopPropagation(); handleDelete(post); }}
                  >
                    <Trash2 className="w-4 h-4 mr-2" /> Eliminar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
