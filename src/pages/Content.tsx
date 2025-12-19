import { useState, useEffect, useRef, useCallback } from "react";
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
  is_liked?: boolean;
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

  // Calculate real metrics for admins
  const totalViews = content.reduce((sum, item) => sum + item.views_count, 0);
  const totalLikes = content.reduce((sum, item) => sum + item.likes_count, 0);
  const publishedCount = content.filter(item => item.is_published).length;

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
        <div className="flex h-14 md:h-16 items-center justify-between px-4 md:px-6 gap-2">
            <div className="min-w-0">
              <h1 className="text-lg md:text-xl font-bold text-foreground">Galería de Videos</h1>
              <p className="text-xs md:text-sm text-muted-foreground hidden sm:block">Videos finales y portafolio público</p>
            </div>
            
            {isAdmin && (
              <Dialog open={newVideoOpen} onOpenChange={setNewVideoOpen}>
                <DialogTrigger asChild>
                  <Button variant="glow" size="sm" className="gap-1 md:gap-2 text-xs md:text-sm flex-shrink-0">
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
            )}
          </div>
        </header>

        {/* Admin Metrics Dashboard */}
        {isAdmin && (
          <div className="px-4 md:px-6 py-3 md:py-4 border-b border-border bg-muted/30">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
              <div className="bg-card rounded-lg p-3 md:p-4 border border-border">
                <div className="flex items-center gap-1 md:gap-2 text-muted-foreground text-xs md:text-sm mb-1">
                  <Play className="h-3 w-3 md:h-4 md:w-4" />
                  Total Videos
                </div>
                <div className="text-xl md:text-2xl font-bold text-foreground">{content.length}</div>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
              {[...Array(6)].map((_, i) => (
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
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
              {filteredContent.map((item) => (
                <EmbeddedVideoCard 
                  key={item.id} 
                  item={item} 
                  isAdmin={isAdmin}
                  onTogglePublish={togglePublish}
                  onLike={handleLike}
                  onView={handleView}
                  getThumbnail={getThumbnail}
                  formatCount={formatCount}
                />
              ))}
            </div>
          )}
        </div>
      </div>
  );
};

interface EmbeddedVideoCardProps {
  item: ContentItem;
  isAdmin: boolean;
  onTogglePublish: (id: string, currentStatus: boolean) => void;
  onLike: (id: string) => void;
  onView: (id: string) => void;
  getThumbnail: (url: string | null, thumbnail: string | null) => string | null;
  formatCount: (count: number) => string;
}

function EmbeddedVideoCard({ item, isAdmin, onTogglePublish, onLike, onView, getThumbnail, formatCount }: EmbeddedVideoCardProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isHovering, setIsHovering] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const viewTracked = useRef(false);
  const viewTimerRef = useRef<NodeJS.Timeout | null>(null);
  const thumbnail = getThumbnail(item.video_url, item.thumbnail_url);
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  // Intersection Observer for mobile scroll autoplay
  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsInView(entry.isIntersecting && entry.intersectionRatio > 0.6);
      },
      { threshold: [0, 0.6, 1] }
    );

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Handle play/pause based on hover (desktop) or scroll (mobile)
  useEffect(() => {
    const shouldPlay = isMobile ? isInView : isHovering;
    
    if (shouldPlay && !isPlaying) {
      setIsPlaying(true);
    } else if (!shouldPlay && isPlaying) {
      setIsPlaying(false);
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
      }
    }
  }, [isHovering, isInView, isMobile]);

  // Track view after 3 seconds
  useEffect(() => {
    if (isPlaying && !viewTracked.current) {
      viewTimerRef.current = setTimeout(() => {
        onView(item.id);
        viewTracked.current = true;
      }, 3000);
    }

    return () => {
      if (viewTimerRef.current) {
        clearTimeout(viewTimerRef.current);
      }
    };
  }, [isPlaying, item.id, onView]);

  // Reset view tracking when video stops
  useEffect(() => {
    if (!isPlaying) {
      viewTracked.current = false;
      if (viewTimerRef.current) {
        clearTimeout(viewTimerRef.current);
      }
    }
  }, [isPlaying]);

  // Control video playback
  useEffect(() => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.play().catch(() => {});
      } else {
        videoRef.current.pause();
      }
    }
  }, [isPlaying]);

  // Get embed URL or direct video URL - with restrictions for non-admins
  const getEmbedContent = () => {
    const url = item.video_url;
    if (!url) return null;

    // Direct video files
    if (url.match(/\.(mp4|webm|ogg)$/i)) {
      return { type: 'video', src: url };
    }

    // YouTube - Add modestbranding and controls restrictions for non-admins
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      let embedUrl = url;
      if (url.includes('/shorts/')) {
        embedUrl = url.replace('/shorts/', '/embed/');
      } else if (url.includes('watch?v=')) {
        embedUrl = url.replace('watch?v=', 'embed/');
      } else if (url.includes('youtu.be/')) {
        embedUrl = url.replace('youtu.be/', 'youtube.com/embed/');
      }
      const params = isAdmin 
        ? '?autoplay=1&mute=1' 
        : '?autoplay=1&mute=1&modestbranding=1&rel=0&showinfo=0&iv_load_policy=3&disablekb=1';
      return { type: 'iframe', src: embedUrl + params };
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

    // Fallback - only show link for admins
    if (isAdmin) {
      return { type: 'link', src: url };
    }
    return { type: 'unsupported', src: url };
  };

  const embedContent = getEmbedContent();

  const handleMouseEnter = () => {
    if (!isMobile) {
      setIsHovering(true);
    }
  };

  const handleMouseLeave = () => {
    if (!isMobile) {
      setIsHovering(false);
    }
  };

  const handleStop = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsPlaying(false);
    setIsHovering(false);
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  };

  return (
    <div 
      ref={containerRef}
      className="group relative rounded-xl border border-border bg-card overflow-hidden hover:border-primary/50 transition-all"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
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
            
            {/* Play overlay - shows on hover */}
            <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="p-4 rounded-full bg-white/20 backdrop-blur-sm">
                <Play className="h-10 w-10 text-white" fill="white" />
              </div>
            </div>

            {/* Published Badge - Only for admins */}
            {isAdmin && (
              <div className="absolute top-2 right-2">
                <Badge variant={item.is_published ? "default" : "secondary"} className="text-xs">
                  {item.is_published ? 'Publicado' : 'Privado'}
                </Badge>
              </div>
            )}
          </>
        ) : (
          <>
            {/* Embedded Video Player */}
            {embedContent?.type === 'video' ? (
              <video
                ref={videoRef}
                src={embedContent.src}
                className="w-full h-full object-cover"
                autoPlay
                muted={isMuted}
                playsInline
                loop
                controlsList={isAdmin ? undefined : "nodownload noplaybackrate"}
                disablePictureInPicture={!isAdmin}
                onContextMenu={isAdmin ? undefined : (e) => e.preventDefault()}
              />
            ) : embedContent?.type === 'iframe' ? (
              <div className="relative w-full h-full">
                <iframe
                  src={embedContent.src}
                  className="w-full h-full"
                  allowFullScreen={isAdmin}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                />
                {!isAdmin && (
                  <div className="absolute inset-0 pointer-events-none" />
                )}
              </div>
            ) : embedContent?.type === 'link' && isAdmin ? (
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
                onClick={handleStop}
                className="p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
              >
                <Pause className="h-4 w-4" />
              </button>
              {embedContent?.type === 'video' && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsMuted(!isMuted);
                  }}
                  className="p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
                >
                  {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                </button>
              )}
            </div>
          </>
        )}
      </div>

      {/* Stats Bar - Between video and info */}
      <div className="flex items-center justify-between px-3 py-2 bg-muted/50 border-t border-border">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 text-muted-foreground text-xs">
            <Eye className="h-3.5 w-3.5" />
            <span>{formatCount(item.views_count)}</span>
          </div>
          <div className="flex items-center gap-1 text-muted-foreground text-xs">
            <Heart className="h-3.5 w-3.5" />
            <span>{formatCount(item.likes_count)}</span>
          </div>
        </div>
        
        {/* Like Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onLike(item.id);
          }}
          className={`p-1.5 rounded-full transition-colors ${
            item.is_liked 
              ? 'bg-red-500 text-white' 
              : 'bg-muted text-muted-foreground hover:bg-red-500/20 hover:text-red-500'
          }`}
        >
          <Heart className="h-4 w-4" fill={item.is_liked ? "currentColor" : "none"} />
        </button>
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
              <a 
                href={item.video_url || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
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
