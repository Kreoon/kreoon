import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Plus, Play, Eye, Heart, ExternalLink, Volume2, VolumeX, Pause } from "lucide-react";
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
  const [filterPublished, setFilterPublished] = useState<'all' | 'published' | 'unpublished'>('all');
  const [newVideoOpen, setNewVideoOpen] = useState(false);
  const [newVideoUrl, setNewVideoUrl] = useState("");
  const [newVideoTitle, setNewVideoTitle] = useState("");
  const [submitting, setSubmitting] = useState(false);

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
          
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="aspect-[9/16] rounded-xl" />
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
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {filteredContent.map((item) => (
                <EmbeddedVideoCard 
                  key={item.id} 
                  item={item} 
                  isAdmin={isAdmin}
                  onTogglePublish={togglePublish}
                  getThumbnail={getThumbnail}
                  formatCount={formatCount}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

interface EmbeddedVideoCardProps {
  item: ContentItem;
  isAdmin: boolean;
  onTogglePublish: (id: string, currentStatus: boolean) => void;
  getThumbnail: (url: string | null, thumbnail: string | null) => string | null;
  formatCount: (count: number) => string;
}

function EmbeddedVideoCard({ item, isAdmin, onTogglePublish, getThumbnail, formatCount }: EmbeddedVideoCardProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const thumbnail = getThumbnail(item.video_url, item.thumbnail_url);

  // Get embed URL or direct video URL
  const getEmbedContent = () => {
    const url = item.video_url;
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
      return { type: 'iframe', src: embedUrl + '?autoplay=1&mute=1' };
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
    <div className="group relative rounded-xl border border-border bg-card overflow-hidden hover:border-primary/50 transition-all">
      {/* Video Container - Vertical 9:16 */}
      <div className="relative aspect-[9/16] bg-muted">
        {!isPlaying ? (
          <>
            {/* Thumbnail */}
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
            <div 
              className="absolute inset-0 bg-black/40 flex items-center justify-center cursor-pointer hover:bg-black/50 transition-colors"
              onClick={() => setIsPlaying(true)}
            >
              <div className="p-4 rounded-full bg-white/20 backdrop-blur-sm hover:bg-white/30 transition-colors">
                <Play className="h-10 w-10 text-white" fill="white" />
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Embedded Video Player */}
            {embedContent?.type === 'video' ? (
              <video
                src={embedContent.src}
                className="w-full h-full object-cover"
                controls
                autoPlay
                muted={isMuted}
                playsInline
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
                  Abrir video
                </a>
              </div>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                No se puede reproducir
              </div>
            )}

            {/* Controls overlay */}
            <div className="absolute top-2 right-2 flex gap-2">
              <button
                onClick={() => setIsPlaying(false)}
                className="p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
              >
                <Pause className="h-4 w-4" />
              </button>
              {embedContent?.type === 'video' && (
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className="p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
                >
                  {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                </button>
              )}
            </div>
          </>
        )}

        {/* Published Badge */}
        {!isPlaying && (
          <div className="absolute top-2 right-2">
            <Badge variant={item.is_published ? "default" : "secondary"} className="text-xs">
              {item.is_published ? 'Publicado' : 'Privado'}
            </Badge>
          </div>
        )}

        {/* Stats */}
        {!isPlaying && (
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
        )}
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

export default Content;
