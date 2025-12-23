import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Plus, Play, Eye, Heart, ExternalLink, Film, MoreVertical, Image, Settings } from "lucide-react";
import { MedievalBanner } from '@/components/layout/MedievalBanner';
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
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
  const isAdmin = roles.includes('admin');
  const [content, setContent] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterPublished, setFilterPublished] = useState<'all' | 'published' | 'unpublished'>('all');
  const [newVideoOpen, setNewVideoOpen] = useState(false);
  const [newVideoUrl, setNewVideoUrl] = useState("");
  const [newVideoTitle, setNewVideoTitle] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [fullscreenIndex, setFullscreenIndex] = useState<number | null>(null);
  const [settingsContentId, setSettingsContentId] = useState<string | null>(null);
  
  // Viewer ID for likes tracking
  const [viewerId] = useState(() => {
    const stored = localStorage.getItem('content_viewer_id');
    if (stored) return stored;
    const newId = crypto.randomUUID();
    localStorage.setItem('content_viewer_id', newId);
    return newId;
  });

  useEffect(() => {
    fetchContent();
  }, []);

  const fetchContent = async () => {
    try {
      const { data, error } = await supabase
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
          creator_id
        `)
        .or('video_url.not.is.null,video_urls.not.is.null')
        .order('created_at', { ascending: false });

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

  // Filter by search and publish status
  const filteredContent = contentWithVideos.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.client?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.creator?.full_name?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesFilter = filterPublished === 'all' ||
      (filterPublished === 'published' && item.is_published) ||
      (filterPublished === 'unpublished' && !item.is_published);

    return matchesSearch && matchesFilter;
  });

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
          {/* Medieval Banner */}
          <MedievalBanner
            icon={Film}
            title="Galería de Reliquias"
            subtitle="Videos finales y portafolio público del reino"
            action={
              isAdmin && (
                <Dialog open={newVideoOpen} onOpenChange={setNewVideoOpen}>
                  <DialogTrigger asChild>
                    <Button variant="glow" size="sm" className="gap-1 md:gap-2 text-xs md:text-sm flex-shrink-0 font-medieval">
                      <Plus className="h-4 w-4" />
                      <span className="hidden sm:inline">Nueva Reliquia</span>
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 md:mb-6">
            <div className="relative w-full sm:w-auto">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input 
                type="text"
                placeholder="Buscar videos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 md:h-10 w-full sm:w-64 md:w-80 rounded-lg border border-input bg-background pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            
            {isAdmin && (
              <div className="flex items-center gap-1 md:gap-2 overflow-x-auto">
                <Button 
                  variant={filterPublished === 'all' ? 'default' : 'outline'} 
                  size="sm"
                  className="text-xs md:text-sm"
                  onClick={() => setFilterPublished('all')}
                >
                  Todos
                </Button>
                <Button 
                  variant={filterPublished === 'published' ? 'default' : 'outline'} 
                  size="sm"
                  className="text-xs md:text-sm"
                  onClick={() => setFilterPublished('published')}
                >
                  Publicados
                </Button>
                <Button 
                  variant={filterPublished === 'unpublished' ? 'default' : 'outline'} 
                  size="sm"
                  className="text-xs md:text-sm"
                  onClick={() => setFilterPublished('unpublished')}
                >
                  Sin Publicar
                </Button>
              </div>
            )}
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
                    
                    {/* Controls overlay - Admin or Content Owner */}
                    {(() => {
                      const isOwner = user?.id === item.creator_id;
                      const canManage = isAdmin || isOwner;
                      
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
