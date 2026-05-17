import { useMemo, useState, useEffect, useRef } from 'react';
import { MoreHorizontal, Trash2, Play, XCircle, RotateCw, Clock, Film, RefreshCw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useScheduledPosts } from '../../hooks/useScheduledPosts';
import { useBatchPostMetrics } from '../../hooks/useBatchPostMetrics';
import { PlatformIcon } from '../common/PlatformIcon';
import { PostStatusBadge } from '../common/PostStatusBadge';
import { PostMetricsRow } from './PostMetricsRow';
import type { ScheduledPost } from '../../types/social.types';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

interface PostListProps {
  onViewPost?: (post: ScheduledPost) => void;
}

export function PostList({ onViewPost }: PostListProps) {
  const { posts, isLoading, publishNow, cancelPost, deletePost } = useScheduledPosts();
  const queryClient = useQueryClient();
  const [refreshingPostId, setRefreshingPostId] = useState<string | null>(null);

  // Get IDs of published posts to batch-load their metrics
  const publishedPostIds = useMemo(
    () => posts
      .filter(p => p.status === 'published' || p.status === 'partially_published')
      .map(p => p.id),
    [posts]
  );

  const { data: metricsMapData } = useBatchPostMetrics(publishedPostIds);
  // Ensure metricsMap is always a Map to avoid "c.get is not a function" error
  const metricsMap = metricsMapData ?? new Map<string, any[]>();

  // Auto-fetch metrics for published posts that have no metrics yet (one-time on load)
  const autoFetchedRef = useRef(false);
  useEffect(() => {
    if (autoFetchedRef.current || !metricsMap || publishedPostIds.length === 0) return;
    autoFetchedRef.current = true;

    const postsWithoutMetrics = posts.filter(p => {
      if (p.status !== 'published' && p.status !== 'partially_published') return false;
      const metrics = metricsMap.get(p.id);
      return !metrics || metrics.length === 0;
    });

    if (postsWithoutMetrics.length === 0) return;

    // Fetch metrics in background for posts missing them
    (async () => {
      const promises: Promise<unknown>[] = [];
      for (const post of postsWithoutMetrics) {
        const results = (post.publish_results || []) as Array<{ account_id: string; platform_post_id?: string; status: string }>;
        for (const pr of results) {
          if (pr.status === 'success' && pr.platform_post_id) {
            promises.push(
              supabase.functions.invoke('social-metrics/fetch-post-metrics', {
                body: { post_id: pr.platform_post_id, account_id: pr.account_id, scheduled_post_id: post.id },
              }).catch(() => null)
            );
          }
        }
      }
      if (promises.length > 0) {
        await Promise.allSettled(promises);
        queryClient.invalidateQueries({ queryKey: ['batch-post-metrics'] });
      }
    })();
  }, [metricsMap, publishedPostIds, posts, queryClient]);

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

  // Find the platform_post_id for a given scheduled_post_id + account_id from publish_results
  const findPlatformPostId = (post: ScheduledPost, accountId: string): string | null => {
    const results = (post.publish_results || []) as Array<{ account_id: string; platform_post_id?: string; status: string }>;
    const match = results.find(r => r.account_id === accountId && r.status === 'success');
    return match?.platform_post_id || null;
  };

  const handleRefreshMetrics = async (postId: string, accountId: string) => {
    setRefreshingPostId(postId);
    try {
      const post = posts.find(p => p.id === postId);
      const platformPostId = post ? findPlatformPostId(post, accountId) : null;
      if (!platformPostId) {
        toast.error('No se encontro el ID de la publicacion en la plataforma');
        return;
      }
      const { error } = await supabase.functions.invoke(
        'social-metrics/fetch-post-metrics',
        { body: { post_id: platformPostId, account_id: accountId, scheduled_post_id: postId } }
      );
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['batch-post-metrics'] });
      toast.success('Metricas actualizadas');
    } catch (err: any) {
      toast.error('Error actualizando metricas');
    } finally {
      setRefreshingPostId(null);
    }
  };

  const handleRefreshAllMetrics = async () => {
    if (publishedPostIds.length === 0) return;
    setRefreshingPostId('all');
    try {
      const promises: Promise<unknown>[] = [];
      for (const post of posts) {
        if (post.status !== 'published' && post.status !== 'partially_published') continue;
        const results = (post.publish_results || []) as Array<{ account_id: string; platform: string; platform_post_id?: string; status: string }>;
        for (const pr of results) {
          if (pr.status === 'success' && pr.platform_post_id) {
            promises.push(
              supabase.functions.invoke('social-metrics/fetch-post-metrics', {
                body: { post_id: pr.platform_post_id, account_id: pr.account_id, scheduled_post_id: post.id },
              })
            );
          }
        }
      }
      await Promise.allSettled(promises);
      queryClient.invalidateQueries({ queryKey: ['batch-post-metrics'] });
      toast.success('Metricas actualizadas');
    } catch {
      toast.error('Error actualizando metricas');
    } finally {
      setRefreshingPostId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-20 rounded-2xl bg-muted/20 animate-pulse" />
        ))}
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-12 text-center">
        <span className="text-5xl">🗓️</span>
        <p className="font-semibold">¡Todo despejado por aquí!</p>
        <p className="text-sm text-muted-foreground">Crea tu primer post desde la pestaña ✏️ Crear Post</p>
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-2">
        {/* Refresh all button */}
        {publishedPostIds.length > 0 && (
          <div className="flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-muted-foreground"
              onClick={handleRefreshAllMetrics}
              disabled={refreshingPostId === 'all'}
            >
              {refreshingPostId === 'all' ? (
                <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3 w-3 mr-1.5" />
              )}
              Actualizar metricas
            </Button>
          </div>
        )}

        {posts.map(post => {
          const platforms = (post.target_accounts || []).map((t: any) => t.platform).filter(Boolean);
          const uniquePlatforms = [...new Set(platforms)] as string[];
          const isPublished = post.status === 'published' || post.status === 'partially_published';
          const postMetrics = metricsMap?.get(post.id) || [];
          const publishResults = (post.publish_results || []) as Array<{ account_id: string; platform: string; platform_post_id?: string; status: string }>;

          const STATUS_EMOJI: Record<string, string> = {
            draft: '✏️', scheduled: '📅', publishing: '⏳', published: '✅',
            partially_published: '⚠️', failed: '❌', cancelled: '🚫',
          };
          const POST_TYPE_EMOJI: Record<string, string> = {
            post: '📸', reel: '🎥', story: '⏳', carousel: '🎨', short: '🎬', thread: '💬', pin: '📌',
          };

          return (
            <div
              key={post.id}
              className="group rounded-2xl border-2 border-border/50 bg-card/30 hover:bg-card/70 hover:border-border transition-all cursor-pointer active:scale-[0.99] overflow-hidden"
              onClick={() => onViewPost?.(post)}
            >
              <div className="flex items-center gap-3 p-3">
                {/* Thumbnail */}
                {(() => {
                  const mediaSrc = post.thumbnail_url || (post.media_urls && post.media_urls.length > 0 ? post.media_urls[0] : null);
                  const isBlobUrl = mediaSrc?.startsWith('blob:');
                  if (!mediaSrc || isBlobUrl) {
                    return (
                      <div className="w-14 h-14 rounded-xl bg-muted/50 flex items-center justify-center shrink-0 text-2xl">
                        {isBlobUrl ? '🎬' : (POST_TYPE_EMOJI[post.post_type] || '📄')}
                      </div>
                    );
                  }
                  const isVideo = /\.(mp4|mov|webm|avi|m4v)/i.test(mediaSrc);
                  return (
                    <div className="w-14 h-14 rounded-xl overflow-hidden bg-muted shrink-0">
                      {isVideo ? (
                        <video src={mediaSrc} className="w-full h-full object-cover" muted playsInline preload="metadata" />
                      ) : (
                        <img src={mediaSrc} alt="" className="w-full h-full object-cover"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                      )}
                    </div>
                  );
                })()}

                {/* Content */}
                <div className="flex-1 min-w-0 space-y-1">
                  <p className="text-sm font-medium truncate">
                    {post.caption?.slice(0, 80) || '(sin caption)'}
                  </p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-0.5">
                      {uniquePlatforms.slice(0, 4).map(p => (
                        <PlatformIcon key={p} platform={p as any} size="xs" />
                      ))}
                    </div>
                    {post.scheduled_at && (
                      <span className="text-[10px] text-muted-foreground">
                        📅 {new Date(post.scheduled_at).toLocaleString('es', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                </div>

                {/* Status */}
                <PostStatusBadge status={post.status} />

                {/* Actions */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {(post.status === 'draft' || post.status === 'scheduled') && (
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handlePublish(post); }}>
                        <Play className="w-4 h-4 mr-2" /> 🚀 Publicar ahora
                      </DropdownMenuItem>
                    )}
                    {post.status === 'scheduled' && (
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleCancel(post); }}>
                        <XCircle className="w-4 h-4 mr-2" /> 🚫 Cancelar
                      </DropdownMenuItem>
                    )}
                    {post.status === 'failed' && (
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handlePublish(post); }}>
                        <RotateCw className="w-4 h-4 mr-2" /> 🔄 Reintentar
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem className="text-red-400"
                      onClick={(e) => { e.stopPropagation(); handleDelete(post); }}>
                      <Trash2 className="w-4 h-4 mr-2" /> 🗑️ Eliminar
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Metrics row for published posts */}
              {isPublished && (
                <div onClick={e => e.stopPropagation()}>
                  <PostMetricsRow
                    metrics={postMetrics}
                    publishResults={publishResults}
                    onRefresh={(accountId) => handleRefreshMetrics(post.id, accountId)}
                    isRefreshing={refreshingPostId === post.id}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
