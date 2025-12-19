import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Plus, Grid, List, Play, Eye, Heart, Share2, ExternalLink, X, Volume2, VolumeX, Pause } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface ContentItem {
  id: string;
  title: string;
  video_url: string | null;
  thumbnail_url: string | null;
  is_published: boolean;
  views_count: number;
  likes_count: number;
  created_at: string;
  client: { name: string; logo_url: string | null } | null;
  creator: { full_name: string } | null;
  status: string;
}

const Content = () => {
  const { roles } = useAuth();
  const isAdmin = roles.includes('admin');
  const [content, setContent] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filterPublished, setFilterPublished] = useState<'all' | 'published' | 'unpublished'>('all');
  const [newVideoOpen, setNewVideoOpen] = useState(false);
  const [newVideoUrl, setNewVideoUrl] = useState("");
  const [newVideoTitle, setNewVideoTitle] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<ContentItem | null>(null);

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
          thumbnail_url,
          is_published,
          views_count,
          likes_count,
          created_at,
          status,
          client_id,
          creator_id
        `)
        .not('video_url', 'is', null)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        const clientIds = [...new Set(data.filter(d => d.client_id).map(d => d.client_id))] as string[];
        const creatorIds = [...new Set(data.filter(d => d.creator_id).map(d => d.creator_id))] as string[];

        const [clientsResult, creatorsResult] = await Promise.all([
          clientIds.length > 0 
            ? supabase.from('clients').select('id, name, logo_url').in('id', clientIds)
            : Promise.resolve({ data: [] }),
          creatorIds.length > 0 
            ? supabase.from('profiles').select('id, full_name').in('id', creatorIds)
            : Promise.resolve({ data: [] })
        ]);

        const clientsMap = new Map((clientsResult.data || []).map(c => [c.id, c]));
        const creatorsMap = new Map((creatorsResult.data || []).map(c => [c.id, c]));

        const enrichedData = data.map(item => ({
          ...item,
          views_count: item.views_count || 0,
          likes_count: item.likes_count || 0,
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

  const filteredContent = content.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.client?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.creator?.full_name.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesFilter = filterPublished === 'all' ||
      (filterPublished === 'published' && item.is_published) ||
      (filterPublished === 'unpublished' && !item.is_published);

    return matchesSearch && matchesFilter;
  });

  const formatCount = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  const getThumbnail = (url: string | null, thumbnail: string | null) => {
    if (thumbnail) return thumbnail;
    if (!url) return null;
    
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      const videoId = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/)?.[1];
      if (videoId) return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
    }
    
    return null;
  };

  return (
    <MainLayout>
      <div className="min-h-screen">
        <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
          <div className="flex h-16 items-center justify-between px-6">
            <div>
              <h1 className="text-xl font-bold text-foreground">Galería de Videos</h1>
              <p className="text-sm text-muted-foreground">Videos finales y portafolio público</p>
            </div>
            
            {isAdmin && (
              <Dialog open={newVideoOpen} onOpenChange={setNewVideoOpen}>
                <DialogTrigger asChild>
                  <Button variant="glow" className="gap-2">
                    <Plus className="h-4 w-4" />
                    Nuevo Video
                  </Button>
                </DialogTrigger>
                <DialogContent>
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
                      <Label htmlFor="url">URL del video</Label>
                      <Input
                        id="url"
                        placeholder="https://youtube.com/... o URL directa"
                        value={newVideoUrl}
                        onChange={(e) => setNewVideoUrl(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Soporta: YouTube, TikTok, Instagram, Google Drive, o URL directa de video (.mp4)
                      </p>
                    </div>
                    <div className="flex justify-end gap-2 pt-4">
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
            )}
          </div>
        </header>

        <div className="p-6">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input 
                  type="text"
                  placeholder="Buscar videos..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-10 w-80 rounded-lg border border-input bg-background pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              
              {isAdmin && (
                <div className="flex items-center gap-2">
                  <Button 
                    variant={filterPublished === 'all' ? 'default' : 'outline'} 
                    size="sm"
                    onClick={() => setFilterPublished('all')}
                  >
                    Todos
                  </Button>
                  <Button 
                    variant={filterPublished === 'published' ? 'default' : 'outline'} 
                    size="sm"
                    onClick={() => setFilterPublished('published')}
                  >
                    Publicados
                  </Button>
                  <Button 
                    variant={filterPublished === 'unpublished' ? 'default' : 'outline'} 
                    size="sm"
                    onClick={() => setFilterPublished('unpublished')}
                  >
                    Sin Publicar
                  </Button>
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <Button 
                variant={viewMode === 'grid' ? 'default' : 'ghost'} 
                size="icon"
                onClick={() => setViewMode('grid')}
              >
                <Grid className="h-4 w-4" />
              </Button>
              <Button 
                variant={viewMode === 'list' ? 'default' : 'ghost'} 
                size="icon"
                onClick={() => setViewMode('list')}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {loading ? (
            <div className={viewMode === 'grid' 
              ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
              : "space-y-4"
            }>
              {[...Array(8)].map((_, i) => (
                <Skeleton key={i} className={viewMode === 'grid' ? "aspect-video rounded-xl" : "h-24 rounded-xl"} />
              ))}
            </div>
          ) : filteredContent.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-12 text-center">
              <div className="mx-auto max-w-md">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                  <Play className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-card-foreground mb-2">
                  No hay videos
                </h3>
                <p className="text-muted-foreground">
                  {searchQuery ? 'No se encontraron videos con esa búsqueda' : 'Los videos finales aparecerán aquí'}
                </p>
              </div>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredContent.map((item) => (
                <VideoCard 
                  key={item.id} 
                  item={item} 
                  isAdmin={isAdmin}
                  onTogglePublish={togglePublish}
                  onPlay={() => setSelectedVideo(item)}
                  getThumbnail={getThumbnail}
                  formatCount={formatCount}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredContent.map((item) => (
                <VideoListItem 
                  key={item.id} 
                  item={item} 
                  isAdmin={isAdmin}
                  onTogglePublish={togglePublish}
                  onPlay={() => setSelectedVideo(item)}
                  getThumbnail={getThumbnail}
                  formatCount={formatCount}
                />
              ))}
            </div>
          )}
        </div>

        {/* Video Player Modal */}
        {selectedVideo && (
          <VideoPlayerModal 
            video={selectedVideo} 
            onClose={() => setSelectedVideo(null)}
            isAdmin={isAdmin}
            onTogglePublish={togglePublish}
            formatCount={formatCount}
          />
        )}
      </div>
    </MainLayout>
  );
};

interface VideoCardProps {
  item: ContentItem;
  isAdmin: boolean;
  onTogglePublish: (id: string, currentStatus: boolean) => void;
  onPlay: () => void;
  getThumbnail: (url: string | null, thumbnail: string | null) => string | null;
  formatCount: (count: number) => string;
}

function VideoCard({ item, isAdmin, onTogglePublish, onPlay, getThumbnail, formatCount }: VideoCardProps) {
  const thumbnail = getThumbnail(item.video_url, item.thumbnail_url);

  return (
    <div className="group relative rounded-xl border border-border bg-card overflow-hidden hover:border-primary/50 transition-all">
      {/* Thumbnail */}
      <div 
        className="relative aspect-video bg-muted cursor-pointer"
        onClick={onPlay}
      >
        {thumbnail ? (
          <img 
            src={thumbnail} 
            alt={item.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
            <Play className="h-12 w-12 text-primary/50" />
          </div>
        )}
        
        {/* Play overlay */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <div className="p-3 rounded-full bg-white/20 backdrop-blur-sm">
            <Play className="h-8 w-8 text-white" fill="white" />
          </div>
        </div>

        {/* Published Badge */}
        <div className="absolute top-2 right-2">
          <Badge variant={item.is_published ? "default" : "secondary"} className="text-xs">
            {item.is_published ? 'Publicado' : 'Privado'}
          </Badge>
        </div>

        {/* Stats */}
        <div className="absolute bottom-2 left-2 flex items-center gap-3">
          <div className="flex items-center gap-1 text-white text-xs bg-black/50 px-2 py-1 rounded-full">
            <Eye className="h-3 w-3" />
            {formatCount(item.views_count)}
          </div>
          <div className="flex items-center gap-1 text-white text-xs bg-black/50 px-2 py-1 rounded-full">
            <Heart className="h-3 w-3" />
            {formatCount(item.likes_count)}
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="p-3">
        <h3 className="font-medium text-sm text-card-foreground line-clamp-2 mb-1">
          {item.title}
        </h3>
        
        <div className="flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
            {item.client?.name || 'Sin cliente'}
          </div>
          
          {isAdmin && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Publicar</span>
              <Switch
                checked={item.is_published}
                onCheckedChange={() => onTogglePublish(item.id, item.is_published)}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function VideoListItem({ item, isAdmin, onTogglePublish, onPlay, getThumbnail, formatCount }: VideoCardProps) {
  const thumbnail = getThumbnail(item.video_url, item.thumbnail_url);

  return (
    <div className="flex items-center gap-4 p-3 rounded-xl border border-border bg-card hover:border-primary/50 transition-all">
      {/* Thumbnail */}
      <div 
        className="relative w-32 h-20 rounded-lg overflow-hidden bg-muted flex-shrink-0 cursor-pointer group"
        onClick={onPlay}
      >
        {thumbnail ? (
          <img 
            src={thumbnail} 
            alt={item.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
            <Play className="h-6 w-6 text-primary/50" />
          </div>
        )}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <Play className="h-6 w-6 text-white" fill="white" />
        </div>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <h3 className="font-medium text-sm text-card-foreground line-clamp-1 mb-1">
          {item.title}
        </h3>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span>{item.client?.name || 'Sin cliente'}</span>
          <span>{item.creator?.full_name || 'Sin creador'}</span>
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1 text-muted-foreground text-sm">
          <Eye className="h-4 w-4" />
          {formatCount(item.views_count)}
        </div>
        <div className="flex items-center gap-1 text-muted-foreground text-sm">
          <Heart className="h-4 w-4" />
          {formatCount(item.likes_count)}
        </div>
      </div>

      {/* Badge */}
      <Badge variant={item.is_published ? "default" : "secondary"}>
        {item.is_published ? 'Publicado' : 'Privado'}
      </Badge>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={onPlay}>
          <Play className="h-4 w-4" />
        </Button>
        {item.video_url && (
          <Button variant="ghost" size="icon" asChild>
            <a href={item.video_url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4" />
            </a>
          </Button>
        )}
        
        {isAdmin && (
          <Switch
            checked={item.is_published}
            onCheckedChange={() => onTogglePublish(item.id, item.is_published)}
          />
        )}
      </div>
    </div>
  );
}

interface VideoPlayerModalProps {
  video: ContentItem;
  onClose: () => void;
  isAdmin: boolean;
  onTogglePublish: (id: string, currentStatus: boolean) => void;
  formatCount: (count: number) => string;
}

function VideoPlayerModal({ video, onClose, isAdmin, onTogglePublish, formatCount }: VideoPlayerModalProps) {
  const [isMuted, setIsMuted] = useState(false);

  // Get embed URL or direct video URL
  const getEmbedContent = () => {
    const url = video.video_url;
    if (!url) return null;

    // Direct video files
    if (url.match(/\.(mp4|webm|ogg)$/i)) {
      return { type: 'video', src: url };
    }

    // YouTube
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      let embedUrl = url;
      if (url.includes('/shorts/')) {
        embedUrl = url.replace('/shorts/', '/embed/');
      } else if (url.includes('watch?v=')) {
        embedUrl = url.replace('watch?v=', 'embed/');
      } else if (url.includes('youtu.be/')) {
        embedUrl = url.replace('youtu.be/', 'youtube.com/embed/');
      }
      return { type: 'iframe', src: embedUrl + '?autoplay=1' };
    }

    // TikTok
    if (url.includes('tiktok.com')) {
      const videoId = url.match(/video\/(\d+)/)?.[1];
      if (videoId) {
        return { type: 'iframe', src: `https://www.tiktok.com/embed/v2/${videoId}` };
      }
    }

    // Instagram
    if (url.includes('instagram.com')) {
      let cleanUrl = url.split('?')[0].replace(/\/$/, '');
      return { type: 'iframe', src: cleanUrl + '/embed/captioned' };
    }

    // Google Drive
    if (url.includes('drive.google.com')) {
      const fileId = url.match(/\/d\/([a-zA-Z0-9_-]+)/)?.[1];
      if (fileId) {
        return { type: 'iframe', src: `https://drive.google.com/file/d/${fileId}/preview` };
      }
    }

    // Fallback - try to embed as iframe
    return { type: 'link', src: url };
  };

  const embedContent = getEmbedContent();

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-4xl bg-background rounded-xl overflow-hidden shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div>
            <h3 className="font-semibold text-foreground">{video.title}</h3>
            <p className="text-sm text-muted-foreground">{video.client?.name || 'Sin cliente'}</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Stats */}
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Eye className="h-4 w-4" />
                {formatCount(video.views_count)}
              </span>
              <span className="flex items-center gap-1">
                <Heart className="h-4 w-4" />
                {formatCount(video.likes_count)}
              </span>
            </div>
            
            {/* Publish toggle */}
            {isAdmin && (
              <div className="flex items-center gap-2 border-l pl-4 border-border">
                <span className="text-sm text-muted-foreground">Publicar</span>
                <Switch
                  checked={video.is_published}
                  onCheckedChange={() => onTogglePublish(video.id, video.is_published)}
                />
              </div>
            )}

            {/* External link */}
            {video.video_url && (
              <Button variant="ghost" size="icon" asChild>
                <a href={video.video_url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            )}
            
            {/* Close button */}
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Video Player */}
        <div className="relative aspect-video bg-black">
          {embedContent?.type === 'video' ? (
            <video
              src={embedContent.src}
              className="w-full h-full object-contain"
              controls
              autoPlay
              muted={isMuted}
            />
          ) : embedContent?.type === 'iframe' ? (
            <iframe
              src={embedContent.src}
              className="w-full h-full"
              allowFullScreen
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            />
          ) : embedContent?.type === 'link' ? (
            <div className="w-full h-full flex items-center justify-center">
              <a 
                href={embedContent.src}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-primary hover:underline"
              >
                <ExternalLink className="h-6 w-6" />
                Abrir video en nueva pestaña
              </a>
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              No se puede reproducir este video
            </div>
          )}
        </div>

        {/* Footer with info */}
        <div className="p-4 border-t border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant={video.is_published ? "default" : "secondary"}>
              {video.is_published ? 'Publicado en Portafolio' : 'Privado'}
            </Badge>
            {video.creator?.full_name && (
              <span className="text-sm text-muted-foreground">
                Creado por {video.creator.full_name}
              </span>
            )}
          </div>
          <Button variant="outline" size="sm" asChild>
            <a href={`/portfolio?v=${video.id}`} target="_blank">
              <Share2 className="h-4 w-4 mr-2" />
              Ver en Portafolio
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
}

export default Content;
