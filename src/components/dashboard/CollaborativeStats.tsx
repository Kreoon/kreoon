import { useState, useEffect, memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Handshake, TrendingUp, Eye, Heart, Users, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface CollaborativeStatsData {
  totalCollaborations: number;
  totalViews: number;
  totalLikes: number;
  topCreators: Array<{
    id: string;
    name: string;
    avatar: string | null;
    count: number;
  }>;
  topClients: Array<{
    id: string;
    name: string;
    logo: string | null;
    count: number;
  }>;
  recentCollaborations: Array<{
    id: string;
    title: string;
    thumbnail: string | null;
    creatorName: string;
    clientName: string;
    createdAt: string;
  }>;
}

interface CollaborativeStatsProps {
  organizationId?: string;
  className?: string;
  variant?: 'full' | 'compact';
}

export const CollaborativeStats = memo(function CollaborativeStats({
  organizationId,
  className,
  variant = 'full',
}: CollaborativeStatsProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<CollaborativeStatsData | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        // Fetch collaborative content
        let query = supabase
          .from('content')
          .select(`
            id,
            title,
            thumbnail_url,
            views_count,
            likes_count,
            creator_id,
            client_id,
            created_at
          `)
          .eq('shared_on_kreoon', true)
          .order('created_at', { ascending: false });

        if (organizationId) {
          query = query.eq('organization_id', organizationId);
        }

        const { data: contentData } = await query.limit(100);

        if (!contentData || contentData.length === 0) {
          setStats({
            totalCollaborations: 0,
            totalViews: 0,
            totalLikes: 0,
            topCreators: [],
            topClients: [],
            recentCollaborations: [],
          });
          setLoading(false);
          return;
        }

        // Calculate totals
        const totalCollaborations = contentData.length;
        const totalViews = contentData.reduce((sum, c) => sum + (c.views_count || 0), 0);
        const totalLikes = contentData.reduce((sum, c) => sum + (c.likes_count || 0), 0);

        // Count by creator
        const creatorCounts = new Map<string, number>();
        contentData.forEach(c => {
          if (c.creator_id) {
            creatorCounts.set(c.creator_id, (creatorCounts.get(c.creator_id) || 0) + 1);
          }
        });

        // Count by client
        const clientCounts = new Map<string, number>();
        contentData.forEach(c => {
          if (c.client_id) {
            clientCounts.set(c.client_id, (clientCounts.get(c.client_id) || 0) + 1);
          }
        });

        // Fetch creator profiles
        const creatorIds = [...creatorCounts.keys()];
        const { data: creatorsData } = creatorIds.length > 0
          ? await supabase
              .from('profiles')
              .select('id, full_name, avatar_url')
              .in('id', creatorIds)
          : { data: [] };

        const creatorsMap = new Map((creatorsData || []).map(c => [c.id, c]));

        // Fetch clients
        const clientIds = [...clientCounts.keys()];
        const { data: clientsData } = clientIds.length > 0
          ? await supabase
              .from('clients')
              .select('id, name, logo_url')
              .in('id', clientIds)
          : { data: [] };

        const clientsMap = new Map((clientsData || []).map(c => [c.id, c]));

        // Build top creators list
        const topCreators = [...creatorCounts.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([id, count]) => {
            const creator = creatorsMap.get(id);
            return {
              id,
              name: creator?.full_name || 'Desconocido',
              avatar: creator?.avatar_url || null,
              count,
            };
          });

        // Build top clients list
        const topClients = [...clientCounts.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([id, count]) => {
            const client = clientsMap.get(id);
            return {
              id,
              name: client?.name || 'Desconocido',
              logo: client?.logo_url || null,
              count,
            };
          });

        // Build recent collaborations
        const recentCollaborations = contentData.slice(0, 5).map(c => {
          const creator = creatorsMap.get(c.creator_id || '');
          const client = clientsMap.get(c.client_id || '');
          return {
            id: c.id,
            title: c.title || 'Sin título',
            thumbnail: c.thumbnail_url,
            creatorName: creator?.full_name || 'Desconocido',
            clientName: client?.name || 'Desconocido',
            createdAt: c.created_at,
          };
        });

        setStats({
          totalCollaborations,
          totalViews,
          totalLikes,
          topCreators,
          topClients,
          recentCollaborations,
        });
      } catch (error) {
        console.error('Error fetching collaborative stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [organizationId]);

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
          </div>
          <Skeleton className="h-32" />
        </CardContent>
      </Card>
    );
  }

  if (!stats || stats.totalCollaborations === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Handshake className="h-5 w-5 text-purple-500" />
            Marketplace
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Handshake className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No hay contenido colaborativo aún</p>
            <p className="text-xs mt-1">Comparte contenido con clientes para empezar</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (variant === 'compact') {
    return (
      <Card className={cn("bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/20", className)}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500">
                <Handshake className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalCollaborations}</p>
                <p className="text-xs text-muted-foreground">Colaboraciones</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/feed?tab=collaborations')}
              className="gap-1"
            >
              Ver más
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500">
              <Handshake className="h-4 w-4 text-white" />
            </div>
            Marketplace
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/feed?tab=collaborations')}
            className="gap-1 text-xs"
          >
            Ver todo
            <ArrowRight className="h-3 w-3" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-3 rounded-lg bg-gradient-to-br from-purple-500/10 to-pink-500/10">
            <p className="text-2xl font-bold">{stats.totalCollaborations}</p>
            <p className="text-xs text-muted-foreground">Colaboraciones</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <p className="text-2xl font-bold flex items-center justify-center gap-1">
              <Eye className="h-4 w-4 text-muted-foreground" />
              {stats.totalViews >= 1000 ? `${(stats.totalViews / 1000).toFixed(1)}K` : stats.totalViews}
            </p>
            <p className="text-xs text-muted-foreground">Vistas</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <p className="text-2xl font-bold flex items-center justify-center gap-1">
              <Heart className="h-4 w-4 text-red-400" />
              {stats.totalLikes >= 1000 ? `${(stats.totalLikes / 1000).toFixed(1)}K` : stats.totalLikes}
            </p>
            <p className="text-xs text-muted-foreground">Likes</p>
          </div>
        </div>

        {/* Top creators & clients */}
        <div className="grid grid-cols-2 gap-4">
          {/* Top Creators */}
          <div>
            <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              Top Creadores
            </h4>
            <div className="space-y-2">
              {stats.topCreators.slice(0, 3).map((creator, index) => (
                <div key={creator.id} className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-4">{index + 1}</span>
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={creator.avatar || undefined} />
                    <AvatarFallback className="text-[10px]">
                      {creator.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm truncate flex-1">{creator.name}</span>
                  <Badge variant="secondary" className="text-xs">
                    {creator.count}
                  </Badge>
                </div>
              ))}
            </div>
          </div>

          {/* Top Clients */}
          <div>
            <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
              <TrendingUp className="h-3.5 w-3.5" />
              Top Clientes
            </h4>
            <div className="space-y-2">
              {stats.topClients.slice(0, 3).map((client, index) => (
                <div key={client.id} className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-4">{index + 1}</span>
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={client.logo || undefined} />
                    <AvatarFallback className="text-[10px]">
                      {client.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm truncate flex-1">{client.name}</span>
                  <Badge variant="secondary" className="text-xs">
                    {client.count}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent collaborations */}
        {stats.recentCollaborations.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2">Recientes</h4>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {stats.recentCollaborations.map(collab => (
                <div
                  key={collab.id}
                  className="flex-shrink-0 w-32 cursor-pointer group"
                  onClick={() => navigate(`/content/${collab.id}`)}
                >
                  <div className="aspect-[4/5] rounded-md overflow-hidden bg-muted mb-1">
                    {collab.thumbnail ? (
                      <img
                        src={collab.thumbnail}
                        alt={collab.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Handshake className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <p className="text-xs truncate">{collab.title}</p>
                  <p className="text-[10px] text-muted-foreground truncate">
                    {collab.creatorName} × {collab.clientName}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
});
