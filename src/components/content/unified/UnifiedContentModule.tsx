import { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { UnifiedContentCard, UnifiedContentItem } from './UnifiedContentCard';
import { FullscreenContentViewer } from '@/components/content/FullscreenContentViewer';
import {
  Search,
  Filter,
  X,
  Play,
  Eye,
  Heart,
  Video,
  Download,
  Loader2,
  Globe,
  RefreshCw
} from 'lucide-react';

interface UnifiedContentModuleProps {
  organizationId?: string;
  clientId?: string;
  creatorId?: string;
  editorId?: string;
  mode: 'admin' | 'client' | 'creator';
  showMetrics?: boolean;
  showKreoonToggle?: boolean;
  title?: string;
  subtitle?: string;
  className?: string;
  onContentUpdate?: () => void;
}

interface FilterState {
  search: string;
  client: string;
  creator: string;
  status: string;
  published: 'all' | 'published' | 'unpublished';
}

// Skeleton loader for grid - 3 columns
const ContentGridSkeleton = memo(function ContentGridSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
      {[...Array(6)].map((_, i) => (
        <Skeleton key={i} className="aspect-[9/16] rounded-sm" />
      ))}
    </div>
  );
});

// Metrics dashboard
const MetricsDashboard = memo(function MetricsDashboard({
  total,
  variations,
  views,
  likes,
  kreoonSocial
}: {
  total: number;
  variations: number;
  views: number;
  likes: number;
  kreoonSocial: number;
}) {
  const formatCount = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  return (
    <div className="px-4 md:px-6 py-3 md:py-4 border-b border-border bg-muted/30">
      <div className="grid grid-cols-2 md:grid-cols-6 gap-2 md:gap-4">
        <div className="bg-card rounded-sm p-3 md:p-4 border border-border">
          <div className="flex items-center gap-1 md:gap-2 text-muted-foreground text-xs md:text-sm mb-1">
            <Play className="h-3 w-3 md:h-4 md:w-4" />
            Proyectos
          </div>
          <div className="text-xl md:text-2xl font-bold text-foreground">{total}</div>
        </div>
        <div className="bg-card rounded-sm p-3 md:p-4 border border-border">
          <div className="flex items-center gap-1 md:gap-2 text-primary text-xs md:text-sm mb-1">
            <Video className="h-3 w-3 md:h-4 md:w-4" />
            Variaciones
          </div>
          <div className="text-xl md:text-2xl font-bold text-foreground">{variations}</div>
        </div>
        <div className="bg-card rounded-sm p-3 md:p-4 border border-border">
          <div className="flex items-center gap-1 md:gap-2 text-muted-foreground text-xs md:text-sm mb-1">
            <Eye className="h-3 w-3 md:h-4 md:w-4" />
            Vistas
          </div>
          <div className="text-xl md:text-2xl font-bold text-foreground">{formatCount(views)}</div>
        </div>
        <div className="bg-card rounded-sm p-3 md:p-4 border border-border">
          <div className="flex items-center gap-1 md:gap-2 text-muted-foreground text-xs md:text-sm mb-1">
            <Heart className="h-3 w-3 md:h-4 md:w-4" />
            Likes
          </div>
          <div className="text-xl md:text-2xl font-bold text-foreground">{formatCount(likes)}</div>
        </div>
        <div className="bg-card rounded-sm p-3 md:p-4 border border-border col-span-2 bg-gradient-to-br from-purple-500/10 to-pink-500/10">
          <div className="flex items-center gap-1 md:gap-2 text-purple-500 text-xs md:text-sm mb-1">
            <Globe className="h-3 w-3 md:h-4 md:w-4" />
            En Marketplace
          </div>
          <div className="text-xl md:text-2xl font-bold text-foreground">{kreoonSocial}/{total}</div>
        </div>
      </div>
    </div>
  );
});

export const UnifiedContentModule = memo(function UnifiedContentModule({
  organizationId,
  clientId,
  creatorId,
  editorId,
  mode,
  showMetrics = true,
  showKreoonToggle = true,
  title = 'Contenido',
  subtitle,
  className,
  onContentUpdate
}: UnifiedContentModuleProps) {
  const { user, roles } = useAuth();
  const isAdmin = roles.includes('admin');
  const isClient = mode === 'client';

  const [content, setContent] = useState<UnifiedContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [fullscreenIndex, setFullscreenIndex] = useState<number | null>(null);

  const [filters, setFilters] = useState<FilterState>({
    search: '',
    client: 'all',
    creator: 'all',
    status: 'all',
    published: 'all'
  });

  // Viewer ID for likes tracking
  const [viewerId] = useState(() => {
    const stored = localStorage.getItem('content_viewer_id');
    if (stored) return stored;
    const newId = crypto.randomUUID();
    localStorage.setItem('content_viewer_id', newId);
    return newId;
  });

  const fetchContent = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      let query = supabase
        .from('content')
        .select(`
          id,
          title,
          description,
          script,
          thumbnail_url,
          video_url,
          video_urls,
          bunny_embed_url,
          status,
          is_published,
          views_count,
          likes_count,
          shared_on_kreoon,
          is_collaborative,
          deadline,
          created_at,
          creator_id,
          client_id,
          organization_id
        `)
        .order('created_at', { ascending: false });

      // Apply filters based on mode
      if (organizationId) {
        query = query.eq('organization_id', organizationId);
      }
      if (clientId) {
        query = query.eq('client_id', clientId);
      }
      if (creatorId) {
        query = query.eq('creator_id', creatorId);
      }
      if (editorId) {
        query = query.eq('editor_id', editorId);
      }

      const { data, error } = await query;
      if (error) throw error;

      if (data && data.length > 0) {
        // Get related data
        const clientIds = [...new Set(data.filter(d => d.client_id).map(d => d.client_id))] as string[];
        const creatorIds = [...new Set(data.filter(d => d.creator_id).map(d => d.creator_id))] as string[];
        const contentIds = data.map(d => d.id);

        const [clientsResult, creatorsResult, likesResult] = await Promise.all([
          clientIds.length > 0
            ? supabase.from('clients').select('id, name, logo_url').in('id', clientIds)
            : Promise.resolve({ data: [] }),
          creatorIds.length > 0
            ? supabase.from('profiles').select('id, full_name, avatar_url').in('id', creatorIds)
            : Promise.resolve({ data: [] }),
          supabase.from('content_likes').select('content_id').eq('viewer_id', viewerId).in('content_id', contentIds)
        ]);

        const clientsMap = new Map((clientsResult.data || []).map(c => [c.id, c]));
        const creatorsMap = new Map((creatorsResult.data || []).map(c => [c.id, c]));
        const likedSet = new Set((likesResult.data || []).map(l => l.content_id));

        const enrichedData = data.map(item => ({
          ...item,
          views_count: item.views_count || 0,
          likes_count: item.likes_count || 0,
          is_liked: likedSet.has(item.id),
          client: item.client_id ? clientsMap.get(item.client_id) || null : null,
          creator: item.creator_id ? creatorsMap.get(item.creator_id) || null : null
        }));

        setContent(enrichedData);
      } else {
        setContent([]);
      }
    } catch (error) {
      console.error('Error fetching content:', error);
      toast.error('Error al cargar contenido');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [organizationId, clientId, creatorId, editorId, viewerId]);

  useEffect(() => {
    fetchContent();
  }, [fetchContent]);

  // Handle like
  const handleLike = useCallback(async (contentId: string) => {
    try {
      const { data, error } = await supabase.rpc('toggle_content_like', {
        content_uuid: contentId,
        viewer: viewerId
      });

      if (error) throw error;

      setContent(prev => prev.map(item => {
        if (item.id === contentId) {
          return {
            ...item,
            is_liked: data,
            likes_count: data ? (item.likes_count || 0) + 1 : Math.max(0, (item.likes_count || 0) - 1)
          };
        }
        return item;
      }));

      toast.success(data ? '❤️ Me gusta' : 'Ya no te gusta');
    } catch (error) {
      console.error('Error toggling like:', error);
      toast.error('Error al dar like');
    }
  }, [viewerId]);

  // Handle view
  const handleView = useCallback(async (contentId: string) => {
    try {
      await supabase.rpc('increment_content_views', { content_uuid: contentId });
      setContent(prev => prev.map(item => {
        if (item.id === contentId) {
          return { ...item, views_count: (item.views_count || 0) + 1 };
        }
        return item;
      }));
    } catch (error) {
      console.error('Error incrementing views:', error);
    }
  }, []);

  // Filter unique values for filter dropdowns
  const uniqueClients = useMemo(() => {
    const clients = content
      .filter(item => item.client)
      .map(item => ({ id: item.client_id!, name: item.client!.name || 'Sin nombre' }));
    return Array.from(new Map(clients.map(c => [c.id, c])).values());
  }, [content]);

  const uniqueCreators = useMemo(() => {
    const creators = content
      .filter(item => item.creator)
      .map(item => ({ id: item.creator_id!, name: item.creator!.full_name || 'Sin nombre' }));
    return Array.from(new Map(creators.map(c => [c.id, c])).values());
  }, [content]);

  const uniqueStatuses = useMemo(() => {
    return [...new Set(content.map(item => item.status).filter(Boolean))];
  }, [content]);

  // Filtered content
  const filteredContent = useMemo(() => {
    return content.filter(item => {
      // Search filter
      const matchesSearch = filters.search === '' ||
        item.title.toLowerCase().includes(filters.search.toLowerCase()) ||
        item.client?.name?.toLowerCase().includes(filters.search.toLowerCase()) ||
        item.creator?.full_name?.toLowerCase().includes(filters.search.toLowerCase());

      // Published filter
      const matchesPublished = filters.published === 'all' ||
        (filters.published === 'published' && item.is_published) ||
        (filters.published === 'unpublished' && !item.is_published);

      // Client filter
      const matchesClient = filters.client === 'all' || item.client_id === filters.client;

      // Creator filter
      const matchesCreator = filters.creator === 'all' || item.creator_id === filters.creator;

      // Status filter
      const matchesStatus = filters.status === 'all' || item.status === filters.status;

      return matchesSearch && matchesPublished && matchesClient && matchesCreator && matchesStatus;
    });
  }, [content, filters]);

  // Tab-based filtering
  const tabFilteredContent = useMemo(() => {
    switch (activeTab) {
      case 'progress':
        return filteredContent.filter(c => !['approved', 'published', 'paid', 'completed'].includes(c.status));
      case 'approved':
        return filteredContent.filter(c => ['approved', 'paid', 'completed'].includes(c.status));
      case 'kreoon_social':
        // Kreoon Social: shows content that is published OR shared on Kreoon
        return filteredContent.filter(c => c.is_published || c.shared_on_kreoon);
      default:
        return filteredContent;
    }
  }, [filteredContent, activeTab]);

  // Metrics
  const metrics = useMemo(() => {
    const totalVariations = content.reduce((sum, item) => {
      const urls = item.video_urls?.filter(u => u?.trim()) || [];
      return sum + Math.max(urls.length, item.video_url ? 1 : 0);
    }, 0);

    return {
      total: content.length,
      variations: totalVariations,
      views: content.reduce((sum, item) => sum + (item.views_count || 0), 0),
      likes: content.reduce((sum, item) => sum + (item.likes_count || 0), 0),
      kreoonSocial: content.filter(c => c.is_published || c.shared_on_kreoon).length
    };
  }, [content]);

  // Active filters count
  const activeFiltersCount = [filters.client, filters.creator, filters.status, filters.published]
    .filter(f => f !== 'all').length;

  const clearAllFilters = () => {
    setFilters({
      search: '',
      client: 'all',
      creator: 'all',
      status: 'all',
      published: 'all'
    });
  };

  const handleRefresh = () => {
    fetchContent(true);
    onContentUpdate?.();
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Metrics Dashboard */}
      {showMetrics && mode === 'admin' && (
        <MetricsDashboard {...metrics} />
      )}

      {/* Search and Filters */}
      <div className="px-4 md:px-6">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            {/* Search Input */}
            <div className="relative flex-1 sm:max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar contenido..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="h-9 md:h-10 w-full rounded-sm border border-input bg-background pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            {/* Refresh button */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
              className="gap-2"
            >
              <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
              <span className="hidden sm:inline">Actualizar</span>
            </Button>

            {/* Filter Button with Sheet */}
            <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Filter className="h-4 w-4" />
                  Filtros
                  {activeFiltersCount > 0 && (
                    <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                      {activeFiltersCount}
                    </Badge>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px] sm:w-[400px]">
                <SheetHeader>
                  <SheetTitle>Filtros</SheetTitle>
                </SheetHeader>
                <div className="space-y-6 py-6">
                  {/* Client Filter */}
                  <div className="space-y-2">
                    <Label>Cliente</Label>
                    <Select value={filters.client} onValueChange={(v) => setFilters(prev => ({ ...prev, client: v }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Todos los clientes" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos los clientes</SelectItem>
                        {uniqueClients.map(client => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Creator Filter */}
                  <div className="space-y-2">
                    <Label>Creador</Label>
                    <Select value={filters.creator} onValueChange={(v) => setFilters(prev => ({ ...prev, creator: v }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Todos los creadores" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos los creadores</SelectItem>
                        {uniqueCreators.map(creator => (
                          <SelectItem key={creator.id} value={creator.id}>
                            {creator.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Status Filter */}
                  <div className="space-y-2">
                    <Label>Estado</Label>
                    <Select value={filters.status} onValueChange={(v) => setFilters(prev => ({ ...prev, status: v }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Todos los estados" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos los estados</SelectItem>
                        {uniqueStatuses.map(status => (
                          <SelectItem key={status} value={status}>
                            {status}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Published Filter */}
                  <div className="space-y-2">
                    <Label>Publicación</Label>
                    <Select value={filters.published} onValueChange={(v) => setFilters(prev => ({ ...prev, published: v as any }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="published">Publicados</SelectItem>
                        <SelectItem value="unpublished">Sin publicar</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-4">
                    <Button variant="outline" className="flex-1" onClick={clearAllFilters}>
                      Limpiar
                    </Button>
                    <Button className="flex-1" onClick={() => setFiltersOpen(false)}>
                      Aplicar
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>

          {/* Active Filters Display */}
          {activeFiltersCount > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-muted-foreground">Filtros activos:</span>
              {filters.client !== 'all' && (
                <Badge variant="secondary" className="gap-1">
                  Cliente: {uniqueClients.find(c => c.id === filters.client)?.name}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => setFilters(prev => ({ ...prev, client: 'all' }))} />
                </Badge>
              )}
              {filters.creator !== 'all' && (
                <Badge variant="secondary" className="gap-1">
                  Creador: {uniqueCreators.find(c => c.id === filters.creator)?.name}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => setFilters(prev => ({ ...prev, creator: 'all' }))} />
                </Badge>
              )}
              {filters.status !== 'all' && (
                <Badge variant="secondary" className="gap-1">
                  Estado: {filters.status}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => setFilters(prev => ({ ...prev, status: 'all' }))} />
                </Badge>
              )}
              {filters.published !== 'all' && (
                <Badge variant="secondary" className="gap-1">
                  {filters.published === 'published' ? 'Publicados' : 'Sin publicar'}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => setFilters(prev => ({ ...prev, published: 'all' }))} />
                </Badge>
              )}
              <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={clearAllFilters}>
                Limpiar todos
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 md:px-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-4">
            <TabsTrigger value="all" className="text-xs">
              Todos
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">{filteredContent.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="progress" className="text-xs">
              Progreso
            </TabsTrigger>
            <TabsTrigger value="approved" className="text-xs">
              Aprobados
            </TabsTrigger>
            <TabsTrigger value="kreoon_social" className="text-xs">
              <Globe className="h-3 w-3 mr-1" />
              Publicados
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                {content.filter(c => c.is_published || c.shared_on_kreoon).length}
              </Badge>
            </TabsTrigger>
          </TabsList>

          {/* Results count */}
          <div className="text-sm text-muted-foreground mb-4">
            {tabFilteredContent.length} de {content.length} videos
          </div>

          {/* Content Grid - Same for all tabs */}
          {loading ? (
            <ContentGridSkeleton />
          ) : tabFilteredContent.length === 0 ? (
            <div className="rounded-sm border border-border bg-card p-8 md:p-12 text-center">
              <div className="mx-auto max-w-md">
                <div className="mx-auto mb-4 flex h-12 w-12 md:h-16 md:w-16 items-center justify-center rounded-full bg-primary/10">
                  <Video className="h-6 w-6 md:h-8 md:w-8 text-primary" />
                </div>
                <h3 className="text-base md:text-lg font-semibold text-card-foreground mb-2">
                  No hay contenido
                </h3>
                <p className="text-sm text-muted-foreground">
                  {filters.search ? 'No se encontró contenido con esa búsqueda' : 'El contenido aparecerá aquí'}
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {tabFilteredContent.map((item, index) => (
                <UnifiedContentCard
                  key={item.id}
                  content={item}
                  userId={user?.id}
                  isAdmin={isAdmin}
                  isClient={isClient}
                  isCreator={item.creator_id === user?.id}
                  isOwner={isAdmin || item.creator_id === user?.id}
                  showDownload={true}
                  showKreoonToggle={showKreoonToggle}
                  showWorkflowActions={isClient || isAdmin}
                  onUpdate={() => fetchContent(true)}
                  onOpenFullscreen={() => setFullscreenIndex(index)}
                  onLike={handleLike}
                  onView={handleView}
                />
              ))}
            </div>
          )}
        </Tabs>
      </div>

      {/* Fullscreen Viewer */}
      {fullscreenIndex !== null && tabFilteredContent.length > 0 && (
        <FullscreenContentViewer
          items={tabFilteredContent.map(c => ({
            id: c.id,
            title: c.title,
            thumbnail_url: c.thumbnail_url,
            video_url: c.video_url,
            video_urls: c.video_urls,
            bunny_embed_url: c.bunny_embed_url,
            status: c.status,
            creator: c.creator,
            script: c.script,
            description: c.description
          }))}
          initialIndex={fullscreenIndex}
          onClose={() => setFullscreenIndex(null)}
          onApprove={async (item) => {
            try {
              await supabase.rpc('update_content_by_id', {
                p_content_id: item.id,
                p_updates: { status: 'approved', approved_by: user?.id }
              });
              toast.success('Contenido aprobado');
              fetchContent(true);
            } catch (error) {
              toast.error('Error al aprobar');
            }
          }}
          onReject={async (item, feedbackText) => {
            try {
              await supabase.rpc('update_content_by_id', {
                p_content_id: item.id,
                p_updates: { status: 'issue', notes: feedbackText }
              });
              if (feedbackText && user?.id) {
                await supabase.from('content_comments').insert({
                  content_id: item.id,
                  user_id: user.id,
                  comment: `Correcciones: ${feedbackText}`
                });
              }
              toast.success('Enviado a corrección');
              fetchContent(true);
            } catch (error) {
              toast.error('Error al enviar corrección');
            }
          }}
          showActions={isClient || isAdmin}
          mode="review"
        />
      )}
    </div>
  );
});
