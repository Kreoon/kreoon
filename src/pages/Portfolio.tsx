import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Play, Pause, Volume2, VolumeX, Heart, Eye, Share2, Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

interface PublishedContent {
  id: string;
  title: string;
  video_url: string;
  thumbnail_url: string | null;
  client: { id: string; name: string; logo_url: string | null } | null;
  creator: { full_name: string; avatar_url: string | null } | null;
  created_at: string;
  views_count: number;
  likes_count: number;
  is_liked: boolean;
}

interface Client {
  id: string;
  name: string;
  logo_url: string | null;
}

export default function Portfolio() {
  const { roles } = useAuth();
  const isAdmin = roles.includes('admin');
  const [content, setContent] = useState<PublishedContent[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [viewerId] = useState(() => {
    const stored = localStorage.getItem('portfolio_viewer_id');
    if (stored) return stored;
    const newId = crypto.randomUUID();
    localStorage.setItem('portfolio_viewer_id', newId);
    return newId;
  });

  useEffect(() => {
    fetchPublishedContent();
    fetchClients();
  }, [selectedClientId]);

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('id, name, logo_url')
        .order('name');
      
      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  };

  const fetchPublishedContent = async () => {
    try {
      let query = supabase
        .from('content')
        .select(`
          id,
          title,
          video_url,
          thumbnail_url,
          created_at,
          creator_id,
          client_id,
          views_count,
          likes_count
        `)
        .eq('is_published', true)
        .not('video_url', 'is', null)
        .order('created_at', { ascending: false });

      if (selectedClientId) {
        query = query.eq('client_id', selectedClientId);
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
            ? supabase.from('profiles').select('id, full_name, avatar_url').in('id', creatorIds)
            : Promise.resolve({ data: [] }),
          supabase.from('content_likes').select('content_id').eq('viewer_id', viewerId).in('content_id', contentIds)
        ]);

        const clientsMap = new Map((clientsResult.data || []).map(c => [c.id, c]));
        const creatorsMap = new Map((creatorsResult.data || []).map(c => [c.id, c]));
        const likedSet = new Set((likesResult.data || []).map(l => l.content_id));

        const enrichedData = data.map(item => ({
          id: item.id,
          title: item.title,
          video_url: item.video_url,
          thumbnail_url: item.thumbnail_url,
          created_at: item.created_at,
          views_count: item.views_count || 0,
          likes_count: item.likes_count || 0,
          is_liked: likedSet.has(item.id),
          client: item.client_id ? clientsMap.get(item.client_id) || null : null,
          creator: item.creator_id ? creatorsMap.get(item.creator_id) || null : null
        }));

        setContent(enrichedData as PublishedContent[]);
      } else {
        setContent([]);
      }
    } catch (error) {
      console.error('Error fetching published content:', error);
    } finally {
      setLoading(false);
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

  const handleShare = async (item: PublishedContent) => {
    const url = `${window.location.origin}/portfolio?v=${item.id}`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: item.title,
          text: `Mira este video de ${item.client?.name || 'Content Studio'}`,
          url
        });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success('Link copiado al portapapeles');
      }
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

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

  if (loading) {
    return (
      <div className="min-h-screen bg-black p-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="aspect-[9/16] rounded-xl bg-muted/20" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (content.length === 0) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white">
        <div className="text-center">
          <Play className="h-16 w-16 mx-auto mb-4 opacity-50" />
          <h2 className="text-xl font-semibold mb-2">
            {selectedClientId ? 'No hay contenido para este cliente' : 'No hay contenido publicado'}
          </h2>
          <p className="text-white/60 mb-4">Próximamente verás aquí nuestro portafolio</p>
          {selectedClientId && (
            <Button 
              variant="outline" 
              onClick={() => setSelectedClientId(null)}
              className="text-white border-white/30 hover:bg-white/10"
            >
              Ver todo el contenido
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-black/95 backdrop-blur border-b border-white/10 px-4 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-white font-bold text-xl">Content Studio</h1>
            <p className="text-white/60 text-sm">Portafolio</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowFilters(!showFilters)}
            className="bg-white/10 hover:bg-white/20 text-white rounded-full h-10 w-10"
          >
            <Filter className="h-5 w-5" />
          </Button>
        </div>
      </header>

      {/* Video Grid - 3 columns on desktop, 1 on mobile */}
      <div className="max-w-7xl mx-auto p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {content.map((item) => (
            <EmbeddedVideoCard
              key={item.id}
              content={item}
              isAdmin={isAdmin}
              onLike={() => handleLike(item.id)}
              onView={() => handleView(item.id)}
              onShare={() => handleShare(item)}
              getThumbnail={getThumbnail}
              formatCount={formatCount}
            />
          ))}
        </div>
      </div>

      {/* Client Filter Sidebar */}
      {showFilters && (
        <div className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm" onClick={() => setShowFilters(false)}>
          <div 
            className="absolute right-0 top-0 h-full w-80 bg-black/95 border-l border-white/10 p-4 overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-white font-semibold text-lg">Filtrar por Cliente</h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowFilters(false)}
                className="text-white hover:bg-white/10 rounded-full"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="space-y-2">
              <button
                onClick={() => { setSelectedClientId(null); setShowFilters(false); }}
                className={`w-full flex items-center gap-3 p-3 rounded-lg transition ${
                  !selectedClientId ? 'bg-white/20 text-white' : 'text-white/70 hover:bg-white/10'
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-white font-bold">
                  ★
                </div>
                <span className="font-medium">Todos los clientes</span>
              </button>

              {clients.map(client => (
                <button
                  key={client.id}
                  onClick={() => { setSelectedClientId(client.id); setShowFilters(false); }}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg transition ${
                    selectedClientId === client.id ? 'bg-white/20 text-white' : 'text-white/70 hover:bg-white/10'
                  }`}
                >
                  {client.logo_url ? (
                    <img 
                      src={client.logo_url} 
                      alt={client.name}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-white font-bold">
                      {client.name.charAt(0)}
                    </div>
                  )}
                  <span className="font-medium">{client.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Active Filter Badge */}
      {selectedClientId && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30">
          <Badge 
            variant="secondary" 
            className="bg-white/20 text-white border-none backdrop-blur-sm px-4 py-2 flex items-center gap-2"
          >
            <span>Filtrando: {clients.find(c => c.id === selectedClientId)?.name}</span>
            <button onClick={() => setSelectedClientId(null)} className="hover:text-white/80">
              <X className="h-4 w-4" />
            </button>
          </Badge>
        </div>
      )}
    </div>
  );
}

interface EmbeddedVideoCardProps {
  content: PublishedContent;
  isAdmin: boolean;
  onLike: () => void;
  onView: () => void;
  onShare: () => void;
  getThumbnail: (url: string | null, thumbnail: string | null) => string | null;
  formatCount: (count: number) => string;
}

function EmbeddedVideoCard({ 
  content, 
  isAdmin,
  onLike, 
  onView, 
  onShare, 
  getThumbnail, 
  formatCount 
}: EmbeddedVideoCardProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const viewTracked = useRef(false);
  const viewTimerRef = useRef<NodeJS.Timeout | null>(null);
  const thumbnail = getThumbnail(content.video_url, content.thumbnail_url);

  // Track view after 3 seconds
  useEffect(() => {
    if (isPlaying && !viewTracked.current) {
      viewTimerRef.current = setTimeout(() => {
        onView();
        viewTracked.current = true;
      }, 3000);
    }

    return () => {
      if (viewTimerRef.current) {
        clearTimeout(viewTimerRef.current);
      }
    };
  }, [isPlaying, onView]);

  // Reset view tracking when video stops
  useEffect(() => {
    if (!isPlaying) {
      viewTracked.current = false;
      if (viewTimerRef.current) {
        clearTimeout(viewTimerRef.current);
      }
    }
  }, [isPlaying]);

  // Get embed URL - with restrictions for non-admins
  const getEmbedContent = () => {
    const url = content.video_url;
    if (!url) return null;

    // Direct video files
    if (url.match(/\.(mp4|webm|ogg)$/i)) {
      return { type: 'video', src: url };
    }

    // YouTube - hide branding and controls for non-admins
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

    // Fallback - only for admins
    if (isAdmin) {
      return { type: 'link', src: url };
    }
    return { type: 'unsupported', src: url };
  };

  const embedContent = getEmbedContent();

  const handlePlay = () => {
    setIsPlaying(true);
  };

  const handleStop = () => {
    setIsPlaying(false);
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  };

  return (
    <div className="group relative rounded-xl overflow-hidden bg-gray-900 border border-white/10 hover:border-white/30 transition-all">
      {/* Video Container - Vertical 9:16 */}
      <div className="relative aspect-[9/16] bg-black">
        {!isPlaying ? (
          <>
            {/* Thumbnail */}
            {thumbnail ? (
              <img 
                src={thumbnail} 
                alt={content.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
                <Play className="h-12 w-12 text-white/50" />
              </div>
            )}
            
            {/* Play overlay */}
            <div 
              className="absolute inset-0 bg-black/40 flex items-center justify-center cursor-pointer hover:bg-black/50 transition-colors"
              onClick={handlePlay}
            >
              <div className="p-4 rounded-full bg-white/20 backdrop-blur-sm hover:bg-white/30 transition-colors">
                <Play className="h-10 w-10 text-white" fill="white" />
              </div>
            </div>

            {/* Stats */}
            <div className="absolute bottom-2 left-2 flex items-center gap-3">
              <div className="flex items-center gap-1 text-white text-xs bg-black/50 px-2 py-1 rounded-full">
                <Eye className="h-3 w-3" />
                {formatCount(content.views_count)}
              </div>
              <div className="flex items-center gap-1 text-white text-xs bg-black/50 px-2 py-1 rounded-full">
                <Heart className="h-3 w-3" />
                {formatCount(content.likes_count)}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="absolute bottom-2 right-2 flex flex-col gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onLike();
                }}
                className={`p-2 rounded-full transition-colors ${
                  content.is_liked 
                    ? 'bg-red-500 text-white' 
                    : 'bg-black/50 text-white hover:bg-red-500/80'
                }`}
              >
                <Heart className="h-5 w-5" fill={content.is_liked ? "currentColor" : "none"} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onShare();
                }}
                className="p-2 rounded-full bg-black/50 text-white hover:bg-white/20 transition-colors"
              >
                <Share2 className="h-5 w-5" />
              </button>
            </div>
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
                {/* Block external links for non-admins */}
                {!isAdmin && (
                  <div className="absolute inset-0 pointer-events-none" />
                )}
              </div>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white/60">
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
                  onClick={() => setIsMuted(!isMuted)}
                  className="p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
                >
                  {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                </button>
              )}
            </div>
          </>
        )}
      </div>

      {/* Info */}
      <div className="p-3 bg-gray-900">
        <h3 className="font-medium text-sm text-white line-clamp-2 mb-1">
          {content.title}
        </h3>
        <div className="flex items-center gap-2 text-xs text-white/60">
          {content.client && (
            <span>{content.client.name}</span>
          )}
          {content.creator && (
            <>
              <span>•</span>
              <span>{content.creator.full_name}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
