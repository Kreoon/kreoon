import { useState } from 'react';
import {
  Eye, Users, Heart, MessageCircle, Share2, Play, RefreshCw,
  CheckCircle2, XCircle, Clock, ArrowUp, Bookmark, MousePointerClick,
  TrendingUp, Shield,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { useCampaignSocialMetrics } from '../../hooks/useCampaignSocialMetrics';
import { PlatformIcon } from '../common/PlatformIcon';
import { PostStatusBadge } from '../common/PostStatusBadge';
import type { CampaignPostMetrics, VerificationStatus } from '../../types/social.types';
import { toast } from 'sonner';

function fmt(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toString();
}

const verificationColors: Record<string, string> = {
  pending: 'bg-yellow-500/20 text-yellow-400',
  verified: 'bg-green-500/20 text-green-400',
  rejected: 'bg-red-500/20 text-red-400',
};

const verificationIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  pending: Clock,
  verified: CheckCircle2,
  rejected: XCircle,
};

const verificationLabels: Record<string, string> = {
  pending: 'Pendiente',
  verified: 'Verificado',
  rejected: 'No cumple',
};

interface CampaignMetricsDashboardProps {
  campaignId: string;
  campaignName?: string;
}

export function CampaignMetricsDashboard({ campaignId, campaignName }: CampaignMetricsDashboardProps) {
  const {
    summary,
    creators,
    posts,
    isLoading,
    verifyPost,
    syncCampaignMetrics,
    refetch,
  } = useCampaignSocialMetrics(campaignId);

  const handleVerify = async (post: CampaignPostMetrics, status: 'verified' | 'rejected') => {
    try {
      await verifyPost.mutateAsync({
        postId: post.id,
        brandMentioned: status === 'verified',
        brandTagged: status === 'verified' && !!post.brand_collaboration,
        collabActive: status === 'verified',
        hashtagsUsed: [],
      });
      toast.success(status === 'verified' ? 'Post verificado' : 'Post rechazado');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleSyncAll = async () => {
    try {
      await syncCampaignMetrics.mutateAsync();
      await refetch();
      toast.success('Métricas sincronizadas');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <Card key={i} className="animate-pulse bg-muted/20">
            <CardContent className="h-24" />
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold">Métricas de Activación</h2>
          {campaignName && (
            <p className="text-sm text-muted-foreground">{campaignName}</p>
          )}
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={handleSyncAll}
          disabled={syncCampaignMetrics.isPending}
        >
          <RefreshCw className={cn('w-3.5 h-3.5 mr-1', syncCampaignMetrics.isPending && 'animate-spin')} />
          Sincronizar métricas
        </Button>
      </div>

      {/* Summary KPIs */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <Card className="bg-card/50">
            <CardContent className="py-3 text-center">
              <p className="text-2xl font-bold">{summary.published_posts}/{summary.total_posts}</p>
              <p className="text-[10px] text-muted-foreground uppercase">Posts publicados</p>
            </CardContent>
          </Card>
          <Card className="bg-card/50">
            <CardContent className="py-3 text-center">
              <p className="text-2xl font-bold text-green-400">{summary.verified_posts}</p>
              <p className="text-[10px] text-muted-foreground uppercase">Verificados</p>
            </CardContent>
          </Card>
          <Card className="bg-card/50">
            <CardContent className="py-3 text-center">
              <p className="text-2xl font-bold">{summary.unique_creators}</p>
              <p className="text-[10px] text-muted-foreground uppercase">Creadores</p>
            </CardContent>
          </Card>
          <Card className="bg-card/50">
            <CardContent className="py-3 text-center">
              <p className="text-2xl font-bold">{fmt(summary.total_impressions)}</p>
              <p className="text-[10px] text-muted-foreground uppercase">Impresiones</p>
            </CardContent>
          </Card>
          <Card className="bg-card/50">
            <CardContent className="py-3 text-center">
              <p className="text-2xl font-bold">{summary.avg_engagement_rate}%</p>
              <p className="text-[10px] text-muted-foreground uppercase">Engagement</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Detailed metrics bar */}
      {summary && (
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {[
            { icon: Eye, label: 'Alcance', value: summary.total_reach },
            { icon: Heart, label: 'Likes', value: summary.total_likes },
            { icon: MessageCircle, label: 'Comentarios', value: summary.total_comments },
            { icon: Share2, label: 'Compartidos', value: summary.total_shares },
            { icon: Play, label: 'Video views', value: summary.total_video_views },
            { icon: MousePointerClick, label: 'Clicks', value: summary.total_clicks },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 border">
              <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-sm font-bold">{fmt(value)}</p>
                <p className="text-[9px] text-muted-foreground">{label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <Separator />

      {/* Creator breakdown */}
      {creators.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Rendimiento por Creador
          </h3>
          <div className="space-y-2">
            {creators.map(creator => {
              const maxImpressions = Math.max(...creators.map(c => c.total_impressions), 1);
              return (
                <Card key={creator.user_id} className="bg-card/50">
                  <CardContent className="flex items-center gap-4 py-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={creator.avatar_url || ''} />
                      <AvatarFallback>{(creator.display_name || '?')[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">{creator.display_name}</p>
                        <Badge variant="outline" className="text-[9px]">
                          {creator.published_count}/{creator.posts_count} posts
                        </Badge>
                        {creator.verified_count > 0 && (
                          <Badge className="text-[9px] bg-green-500/20 text-green-400 border-0">
                            <CheckCircle2 className="w-2.5 h-2.5 mr-0.5" />
                            {creator.verified_count} verificados
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-1">
                        <span className="text-xs text-muted-foreground">
                          <Eye className="w-3 h-3 inline mr-0.5" />
                          {fmt(creator.total_impressions)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          <Heart className="w-3 h-3 inline mr-0.5" />
                          {fmt(creator.total_likes)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          <Play className="w-3 h-3 inline mr-0.5" />
                          {fmt(creator.total_video_views)}
                        </span>
                      </div>
                      <Progress
                        value={(creator.total_impressions / maxImpressions) * 100}
                        className="h-1 mt-1.5"
                      />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      <Separator />

      {/* Posts list with verification */}
      {posts.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Posts de la Campaña
          </h3>
          <div className="space-y-2">
            {posts.map(post => {
              const VerifIcon = post.verification_status
                ? verificationIcons[post.verification_status]
                : Shield;

              return (
                <Card key={post.id} className="bg-card/50">
                  <CardContent className="flex items-start gap-4 py-3">
                    {/* Thumbnail */}
                    {post.thumbnail_url ? (
                      <img
                        src={post.thumbnail_url}
                        alt=""
                        className="w-16 h-16 rounded-lg object-cover shrink-0"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-lg bg-muted/50 flex items-center justify-center shrink-0">
                        <Play className="w-5 h-5 text-muted-foreground" />
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      {/* Caption preview */}
                      <p className="text-sm truncate">{post.caption || 'Sin caption'}</p>

                      {/* Brand collab info */}
                      {post.brand_collaboration && (
                        <p className="text-xs text-primary mt-0.5">
                          Colaboración con @{post.brand_collaboration.brand_username}
                          {' · '}
                          {post.brand_collaboration.collaboration_type === 'collab_post' && 'Post colaborativo'}
                          {post.brand_collaboration.collaboration_type === 'mention' && 'Mención'}
                          {post.brand_collaboration.collaboration_type === 'tag' && 'Etiqueta'}
                          {post.brand_collaboration.collaboration_type === 'branded_content' && 'Contenido de marca'}
                        </p>
                      )}

                      {/* Metrics row */}
                      <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                        <PostStatusBadge status={post.status} />

                        {post.verification_status && (
                          <span className={cn(
                            'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium',
                            verificationColors[post.verification_status]
                          )}>
                            <VerifIcon className="w-3 h-3" />
                            {verificationLabels[post.verification_status]}
                          </span>
                        )}

                        <span className="text-[10px] text-muted-foreground">
                          <Eye className="w-3 h-3 inline" /> {fmt(post.impressions)}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          <Heart className="w-3 h-3 inline" /> {fmt(post.likes)}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          <Play className="w-3 h-3 inline" /> {fmt(post.video_views)}
                        </span>
                      </div>
                    </div>

                    {/* Verification actions */}
                    {post.status === 'published' && (!post.verification_status || post.verification_status === 'pending') && (
                      <div className="flex gap-1 shrink-0">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-green-400 hover:text-green-300 hover:bg-green-500/10"
                          onClick={() => handleVerify(post, 'verified')}
                          title="Verificar post"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                          onClick={() => handleVerify(post, 'rejected')}
                          title="Rechazar post"
                        >
                          <XCircle className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {posts.length === 0 && !isLoading && (
        <Card className="bg-muted/20">
          <CardContent className="flex flex-col items-center gap-3 py-8">
            <TrendingUp className="w-10 h-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground text-center">
              No hay posts sociales vinculados a esta campaña aún.
              <br />
              Los creadores pueden vincular sus publicaciones desde el Social Hub.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
