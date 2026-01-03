import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Plus, Play, Eye, Heart, ExternalLink, Film, MoreVertical, Image, Settings, Filter, X } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { PageHeader } from '@/components/layout/PageHeader';
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useOrgOwner } from "@/hooks/useOrgOwner";
import { VideoPlayerProvider, useVideoPlayer } from "@/contexts/VideoPlayerContext";
import { BunnyVideoCard } from "@/components/content/BunnyVideoCard";
import { FullscreenVideoViewer } from "@/components/content/FullscreenVideoViewer";
import { ContentSettingsDialog } from "@/components/content/ContentSettingsDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ContentItem {
  id: string;
  title: string;
  video_url: string | null;
  video_urls: string[] | null;
  thumbnail_url: string | null;
  is_published: boolean;
  views_count: number;
  likes_count: number;
  created_at: string;
  client: { name: string; logo_url: string | null } | null;
  creator: { full_name: string } | null;
  creator_id: string | null;
  client_id: string | null;
  status: string;
  is_liked?: boolean;
}

// Helper to get all video URLs for a content item
function getVideoUrls(item: ContentItem): string[] {
  const urls: string[] = [];
  
  if (item.video_urls && item.video_urls.length > 0) {
    urls.push(...item.video_urls.filter(u => u && u.trim()));
  }
  
  // Only add video_url if not already in video_urls
  if (item.video_url && !urls.includes(item.video_url)) {
    urls.unshift(item.video_url);
  }
  
  return urls;
}

const Content = () => {
  const { roles, user } = useAuth();
  const { isPlatformRoot, currentOrgId, loading: orgLoading } = useOrgOwner();
  const isAdmin = roles.includes('admin');
  const isClient = roles.includes('client');
  const [content, setContent] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterPublished, setFilterPublished] = useState<'all' | 'published' | 'unpublished'>('all');
  const [filterClient, setFilterClient] = useState<string>('all');
  const [filterCreator, setFilterCreator] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [newVideoOpen, setNewVideoOpen] = useState(false);
  const [newVideoUrl, setNewVideoUrl] = useState("");
  const [newVideoTitle, setNewVideoTitle] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [fullscreenIndex, setFullscreenIndex] = useState<number | null>(null);
  const [settingsContentId, setSettingsContentId] = useState<string | null>(null);
  const [userClientIds, setUserClientIds] = useState<string[]>([]);
  
  // Viewer ID for likes tracking
  const [viewerId] = useState(() => {
    const stored = localStorage.getItem('content_viewer_id');
    if (stored) return stored;
    const newId = crypto.randomUUID();
    localStorage.setItem('content_viewer_id', newId);
    return newId;
  });

  // Fetch user's associated client IDs if they are a client
  useEffect(() => {
    const fetchUserClientIds = async () => {
      if (!user?.id || !isClient) return;
      
      const { data } = await supabase
        .from('client_users')
        .select('client_id')
        .eq('user_id', user.id);
      
      if (data) {
        setUserClientIds(data.map(d => d.client_id));
      }
    };
    
    fetchUserClientIds();
  }, [user?.id, isClient]);

  useEffect(() => {
    // Wait for org context to resolve
    if (orgLoading) return;
    fetchContent();
  }, [isPlatformRoot, currentOrgId, orgLoading]);

  const fetchContent = async () => {
    try {
      let query = supabase
        .from('content')
        .select(`
          id,
          title,
          video_url,
          video_urls,
          thumbnail_url,
          is_published,
          views_count,
          likes_count,
          created_at,
          status,
          client_id,
          creator_id,
          organization_id
        `)
        .or('video_url.not.is.null,video_urls.not.is.null')
        .order('created_at', { ascending: false });

      // Filter by organization - always apply when org is selected (including for root)
      if (currentOrgId) {
        query = query.eq('organization_id', currentOrgId);
      }

      const { data, error } = await query;

      if (error) throw error;

      if (data && data.length > 0) {
        const clientIds = [...new Set(data.filter(d => d.client_id).map(d => d.client_id))] as string[];
        const creatorIds = [...new Set(data.filter(d => d.creator_id).map(d => d.creator_id))] as string[];
        const contentIds = data.map(d => d.id);

        const [clientsResult, creatorsResult, likesResult] = await Promise.all([
          clientIds.length > 0 
            ? supabase.from('clients').select('id, name, logo_url').in('id', clientIds)
            : Promise.resolve({ data: [] }),
          creatorIds.length > 0 
            ? supabase.from('profiles').select('id, full_name').in('id', creatorIds)
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

        setContent(enrichedData as ContentItem[]);
      }
    } catch (error) {
      console.error('Error fetching content:', error);
      toast.error('Error al cargar contenido');
    } finally {
      setLoading(false);
    }
  };

  const togglePublish = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('content')
        .update({ is_published: !currentStatus })
        .eq('id', id);

      if (error) throw error;

      setContent(prev => prev.map(item => 
        item.id === id ? { ...item, is_published: !currentStatus } : item
      ));

      toast.success(currentStatus ? 'Video removido del portafolio' : 'Video publicado en el portafolio');
    } catch (error) {
      console.error('Error toggling publish:', error);
      toast.error('Error al cambiar estado de publicación');
    }
  };

  const handleLike = async (contentId: string) => {
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
            likes_count: data ? item.likes_count + 1 : Math.max(0, item.likes_count - 1)
          };
        }
        return item;
      }));

      toast.success(data ? '❤️ Me gusta' : 'Ya no te gusta');
    } catch (error) {
      console.error('Error toggling like:', error);
      toast.error('Error al dar like');
    }
  };

  const handleView = useCallback(async (contentId: string) => {
    try {
      await supabase.rpc('increment_content_views', { content_uuid: contentId });
      setContent(prev => prev.map(item => {
        if (item.id === contentId) {
          return { ...item, views_count: item.views_count + 1 };
        }
        return item;
      }));
    } catch (error) {
      console.error('Error incrementing views:', error);
    }
  }, []);

  const handleAddVideo = async () => {
    if (!newVideoUrl.trim() || !newVideoTitle.trim()) {
      toast.error('Por favor completa todos los campos');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('content')
        .insert({
          title: newVideoTitle,
          video_url: newVideoUrl,
          video_urls: [newVideoUrl],
          is_published: true,
          status: 'delivered'
        });

      if (error) throw error;

      toast.success('Video agregado al portafolio');
      setNewVideoOpen(false);
      setNewVideoUrl("");
      setNewVideoTitle("");
      fetchContent();
    } catch (error) {
      console.error('Error adding video:', error);
      toast.error('Error al agregar video');
    } finally {
      setSubmitting(false);
    }
  };

  // Filter content that has videos
  const contentWithVideos = useMemo(() => {
    return content.filter(item => {
      const urls = getVideoUrls(item);
      return urls.length > 0;
    });
  }, [content]);

  // Get unique clients and creators for filter options
  const uniqueClients = useMemo(() => {
    const clients = contentWithVideos
      .filter(item => item.client)
      .map(item => ({ id: item.client_id!, name: item.client!.name }));
    return Array.from(new Map(clients.map(c => [c.id, c])).values());
  }, [contentWithVideos]);

  const uniqueCreators = useMemo(() => {
    const creators = contentWithVideos
      .filter(item => item.creator)
      .map(item => ({ id: item.creator_id!, name: item.creator!.full_name }));
    return Array.from(new Map(creators.map(c => [c.id, c])).values());
  }, [contentWithVideos]);

  const uniqueStatuses = useMemo(() => {
    return [...new Set(contentWithVideos.map(item => item.status).filter(Boolean))];
  }, [contentWithVideos]);

  // Filter by search and all filters
  const filteredContent = contentWithVideos.filter(item => {
    const matchesSearch = searchQuery === '' || 
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.client?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.creator?.full_name?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesPublished = filterPublished === 'all' ||
      (filterPublished === 'published' && item.is_published) ||
      (filterPublished === 'unpublished' && !item.is_published);

    const matchesClient = filterClient === 'all' || item.client_id === filterClient;
    const matchesCreator = filterCreator === 'all' || item.creator_id === filterCreator;
    const matchesStatus = filterStatus === 'all' || item.status === filterStatus;

    return matchesSearch && matchesPublished && matchesClient && matchesCreator && matchesStatus;
  });

  // Count active filters
  const activeFiltersCount = [filterClient, filterCreator, filterStatus, filterPublished]
    .filter(f => f !== 'all').length;

  const clearAllFilters = () => {
    setFilterClient('all');
    setFilterCreator('all');
    setFilterStatus('all');
    setFilterPublished('all');
    setSearchQuery('');
  };

  // Count total variations for metrics
  const totalVariations = contentWithVideos.reduce((sum, item) => sum + getVideoUrls(item).length, 0);

  const formatCount = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  // Calculate real metrics for admins
  const totalViews = content.reduce((sum, item) => sum + item.views_count, 0);
  const totalLikes = content.reduce((sum, item) => sum + item.likes_count, 0);
  const publishedCount = content.filter(item => item.is_published).length;

  return (
    <VideoPlayerProvider>
      <div className="min-h-screen">
        <div className="p-4 md:p-6 space-y-6">
          {/* Page Header */}
          <PageHeader
            icon={Film}
            title="Portafolio"
            subtitle="Videos finales y contenido público"
            action={
              isAdmin && (
                <Dialog open={newVideoOpen} onOpenChange={setNewVideoOpen}>
                  <DialogTrigger asChild>
                    <Button variant="default" size="sm" className="gap-1 md:gap-2 text-xs md:text-sm flex-shrink-0">
                      <Plus className="h-4 w-4" />
                      <span className="hidden sm:inline">Nuevo Video</span>
                      <span className="sm:hidden">Nuevo</span>
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-[95vw] sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Agregar Video al Portafolio</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-4">
                      <div className="space-y-2">
                        <Label htmlFor="title">Título del video</Label>
                        <Input
                          id="title"
                          placeholder="Ej: Testimonial Cliente X"
                          value={newVideoTitle}
                          onChange={(e) => setNewVideoTitle(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="url">URL del video (Bunny)</Label>
                        <Input
                          id="url"
                          placeholder="https://iframe.mediadelivery.net/embed/..."
                          value={newVideoUrl}
                          onChange={(e) => setNewVideoUrl(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">
                          Soporta URLs de Bunny Stream embed o CDN directo
                        </p>
                      </div>
                      <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-4">
                        <Button variant="outline" onClick={() => setNewVideoOpen(false)}>
                          Cancelar
                        </Button>
                        <Button onClick={handleAddVideo} disabled={submitting}>
                          {submitting ? 'Agregando...' : 'Agregar y Publicar'}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              )
            }
          />
        </div>

        {/* Admin Metrics Dashboard */}
        {isAdmin && (
          <div className="px-4 md:px-6 py-3 md:py-4 border-b border-border bg-muted/30">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2 md:gap-4">
              <div className="bg-card rounded-lg p-3 md:p-4 border border-border">
                <div className="flex items-center gap-1 md:gap-2 text-muted-foreground text-xs md:text-sm mb-1">
                  <Play className="h-3 w-3 md:h-4 md:w-4" />
                  Proyectos
                </div>
                <div className="text-xl md:text-2xl font-bold text-foreground">{content.length}</div>
              </div>
              <div className="bg-card rounded-lg p-3 md:p-4 border border-border">
                <div className="flex items-center gap-1 md:gap-2 text-primary text-xs md:text-sm mb-1">
                  Variaciones
                </div>
                <div className="text-xl md:text-2xl font-bold text-foreground">{totalVariations}</div>
              </div>
              <div className="bg-card rounded-lg p-3 md:p-4 border border-border">
                <div className="flex items-center gap-1 md:gap-2 text-muted-foreground text-xs md:text-sm mb-1">
                  <Eye className="h-3 w-3 md:h-4 md:w-4" />
                  Vistas
                </div>
                <div className="text-xl md:text-2xl font-bold text-foreground">{formatCount(totalViews)}</div>
              </div>
              <div className="bg-card rounded-lg p-3 md:p-4 border border-border">
                <div className="flex items-center gap-1 md:gap-2 text-muted-foreground text-xs md:text-sm mb-1">
                  <Heart className="h-3 w-3 md:h-4 md:w-4" />
                  Likes
                </div>
                <div className="text-xl md:text-2xl font-bold text-foreground">{formatCount(totalLikes)}</div>
              </div>
              <div className="bg-card rounded-lg p-3 md:p-4 border border-border">
                <div className="flex items-center gap-1 md:gap-2 text-green-500 text-xs md:text-sm mb-1">
                  Publicados
                </div>
                <div className="text-xl md:text-2xl font-bold text-foreground">{publishedCount}/{content.length}</div>
              </div>
            </div>
          </div>
        )}

        <div className="p-4 md:p-6">
          {/* Search and Filters */}
          <div className="flex flex-col gap-3 mb-4 md:mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              {/* Search Input */}
              <div className="relative flex-1 sm:max-w-sm">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input 
                  type="text"
                  placeholder="Buscar videos..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-9 md:h-10 w-full rounded-lg border border-input bg-background pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              
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
                      <Select value={filterClient} onValueChange={setFilterClient}>
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
                      <Select value={filterCreator} onValueChange={setFilterCreator}>
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
                      <Select value={filterStatus} onValueChange={setFilterStatus}>
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
                      <Select value={filterPublished} onValueChange={(v) => setFilterPublished(v as 'all' | 'published' | 'unpublished')}>
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
                {filterClient !== 'all' && (
                  <Badge variant="secondary" className="gap-1">
                    Cliente: {uniqueClients.find(c => c.id === filterClient)?.name}
                    <X className="h-3 w-3 cursor-pointer" onClick={() => setFilterClient('all')} />
                  </Badge>
                )}
                {filterCreator !== 'all' && (
                  <Badge variant="secondary" className="gap-1">
                    Creador: {uniqueCreators.find(c => c.id === filterCreator)?.name}
                    <X className="h-3 w-3 cursor-pointer" onClick={() => setFilterCreator('all')} />
                  </Badge>
                )}
                {filterStatus !== 'all' && (
                  <Badge variant="secondary" className="gap-1">
                    Estado: {filterStatus}
                    <X className="h-3 w-3 cursor-pointer" onClick={() => setFilterStatus('all')} />
                  </Badge>
                )}
                {filterPublished !== 'all' && (
                  <Badge variant="secondary" className="gap-1">
                    {filterPublished === 'published' ? 'Publicados' : 'Sin publicar'}
                    <X className="h-3 w-3 cursor-pointer" onClick={() => setFilterPublished('all')} />
                  </Badge>
                )}
                <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={clearAllFilters}>
                  Limpiar todos
                </Button>
              </div>
            )}

            {/* Results count */}
            <div className="text-sm text-muted-foreground">
              {filteredContent.length} de {contentWithVideos.length} videos
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4">
              {[...Array(10)].map((_, i) => (
                <Skeleton key={i} className="aspect-[9/16] rounded-xl" />
              ))}
            </div>
          ) : filteredContent.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-8 md:p-12 text-center">
              <div className="mx-auto max-w-md">
                <div className="mx-auto mb-4 flex h-12 w-12 md:h-16 md:w-16 items-center justify-center rounded-full bg-primary/10">
                  <Play className="h-6 w-6 md:h-8 md:w-8 text-primary" />
                </div>
                <h3 className="text-base md:text-lg font-semibold text-card-foreground mb-2">
                  No hay videos
                </h3>
                <p className="text-sm text-muted-foreground">
                  {searchQuery ? 'No se encontraron videos con esa búsqueda' : 'Los videos finales aparecerán aquí'}
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4">
              {filteredContent.map((item, index) => {
                const videoUrls = getVideoUrls(item);
                return (
                  <div key={item.id} className="relative">
                    <BunnyVideoCard
                      id={item.id}
                      title={item.title}
                      videoUrls={videoUrls}
                      thumbnailUrl={item.thumbnail_url}
                      viewsCount={item.views_count}
                      likesCount={item.likes_count}
                      isLiked={item.is_liked || false}
                      creatorName={item.creator?.full_name}
                      isAdmin={isAdmin}
                      onLike={() => handleLike(item.id)}
                      onView={() => handleView(item.id)}
                      onOpenFullscreen={() => setFullscreenIndex(index)}
                      showActions={true}
                    />
                    
                    {/* Controls overlay - Admin, Content Owner, or Client Owner */}
                    {(() => {
                      const isCreator = user?.id === item.creator_id;
                      const isClientOwner = item.client_id ? userClientIds.includes(item.client_id) : false;
                      const canManage = isAdmin || isCreator || isClientOwner;
                      
                      if (!canManage) return null;
                      
                      return (
                        <>
                          {/* Status badge - only for admin */}
                          {isAdmin && (
                            <div className="absolute top-2 left-2 z-20 flex items-center gap-2">
                              <Badge variant={item.is_published ? "default" : "secondary"} className="text-xs">
                                {item.is_published ? 'Publicado' : 'Privado'}
                              </Badge>
                            </div>
                          )}
                          
                          {/* 3-dot menu for settings */}
                          <div className="absolute top-2 right-2 z-20">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8 bg-black/60 hover:bg-black/80 text-white rounded-full"
                                >
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuItem onClick={() => setSettingsContentId(item.id)}>
                                  <Settings className="h-4 w-4 mr-2" />
                                  Configuración
                                </DropdownMenuItem>
                                {isAdmin && (
                                  <DropdownMenuItem onClick={() => togglePublish(item.id, item.is_published)}>
                                    <Eye className="h-4 w-4 mr-2" />
                                    {item.is_published ? 'Ocultar del portafolio' : 'Publicar en portafolio'}
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem asChild>
                                  <a 
                                    href={videoUrls[0]}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    <ExternalLink className="h-4 w-4 mr-2" />
                                    Ver video original
                                  </a>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                          
                          {/* Publish toggle - only for admin */}
                          {isAdmin && (
                            <div className="absolute bottom-20 left-2 z-20 flex items-center gap-2">
                              <Switch
                                checked={item.is_published}
                                onCheckedChange={() => togglePublish(item.id, item.is_published)}
                                className="data-[state=checked]:bg-primary"
                              />
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                );
              })}
            </div>
          )}

          {/* Fullscreen Video Viewer */}
          {fullscreenIndex !== null && (
            <FullscreenVideoViewer
              videos={filteredContent.map(item => ({
                id: item.id,
                title: item.title,
                videoUrls: getVideoUrls(item),
                thumbnailUrl: item.thumbnail_url,
                viewsCount: item.views_count,
                likesCount: item.likes_count,
                isLiked: item.is_liked || false,
                creatorName: item.creator?.full_name
              }))}
              initialIndex={fullscreenIndex}
              onClose={() => setFullscreenIndex(null)}
              onLike={(id) => handleLike(id)}
              onView={(id) => handleView(id)}
            />
          )}

          {/* Content Settings Dialog */}
          {settingsContentId && (
            <ContentSettingsDialog
              contentId={settingsContentId}
              open={!!settingsContentId}
              onOpenChange={(open) => {
                if (!open) setSettingsContentId(null);
              }}
              onSuccess={() => fetchContent()}
            />
          )}
        </div>
      </div>
    </VideoPlayerProvider>
  );
};

export default Content;
