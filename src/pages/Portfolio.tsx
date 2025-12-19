import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Play, Pause, Volume2, VolumeX, Heart, Eye, Share2, ChevronUp, ChevronDown, Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

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
  const [content, setContent] = useState<PublishedContent[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [viewerId] = useState(() => {
    // Generate or retrieve a persistent viewer ID for anonymous users
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
        // Fetch related data and likes status
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
        setCurrentIndex(0);
      } else {
        setContent([]);
      }
    } catch (error) {
      console.error('Error fetching published content:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (currentIndex < content.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleLike = async (contentId: string) => {
    try {
      const { data, error } = await supabase.rpc('toggle_content_like', {
        content_uuid: contentId,
        viewer: viewerId
      });

      if (error) throw error;

      // Update local state
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
    } catch (error) {
      console.error('Error toggling like:', error);
      toast.error('Error al dar like');
    }
  };

  const handleView = useCallback(async (contentId: string) => {
    try {
      await supabase.rpc('increment_content_views', { content_uuid: contentId });
      // Update local state
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

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown' || e.key === 'j') {
        handleNext();
      } else if (e.key === 'ArrowUp' || e.key === 'k') {
        handlePrevious();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, content.length]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-full max-w-md aspect-[9/16]">
          <Skeleton className="w-full h-full rounded-none bg-muted/20" />
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
    <div className="min-h-screen bg-black overflow-hidden">
      {/* Mobile-first vertical feed */}
      <div className="h-screen w-full flex items-center justify-center">
        <div className="relative w-full max-w-md h-full md:h-[90vh] md:max-h-[800px]">
          {/* Video Container */}
          <div className="relative w-full h-full">
            {content.map((item, index) => (
              <VideoCard
                key={item.id}
                content={item}
                isActive={index === currentIndex}
                onLike={() => handleLike(item.id)}
                onView={() => handleView(item.id)}
                onShare={() => handleShare(item)}
                style={{
                  transform: `translateY(${(index - currentIndex) * 100}%)`,
                  transition: 'transform 0.3s ease-out',
                }}
              />
            ))}
          </div>

          {/* Navigation Arrows - Desktop */}
          <div className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 flex-col gap-2 z-20">
            <Button
              variant="ghost"
              size="icon"
              onClick={handlePrevious}
              disabled={currentIndex === 0}
              className="bg-white/10 hover:bg-white/20 text-white rounded-full h-10 w-10"
            >
              <ChevronUp className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleNext}
              disabled={currentIndex === content.length - 1}
              className="bg-white/10 hover:bg-white/20 text-white rounded-full h-10 w-10"
            >
              <ChevronDown className="h-5 w-5" />
            </Button>
          </div>

          {/* Progress Indicator */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 flex gap-1 z-20">
            {content.slice(0, 10).map((_, index) => (
              <div
                key={index}
                className={`h-1 rounded-full transition-all ${
                  index === currentIndex 
                    ? 'w-6 bg-white' 
                    : 'w-2 bg-white/40'
                }`}
              />
            ))}
            {content.length > 10 && (
              <span className="text-white/60 text-xs ml-1">+{content.length - 10}</span>
            )}
          </div>
        </div>
      </div>

      {/* Branding */}
      <div className="fixed top-4 left-4 z-30">
        <h1 className="text-white font-bold text-lg">Content Studio</h1>
        <p className="text-white/60 text-xs">Portafolio</p>
      </div>

      {/* Filter Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setShowFilters(!showFilters)}
        className="fixed top-4 right-4 z-30 bg-white/10 hover:bg-white/20 text-white rounded-full h-10 w-10"
      >
        <Filter className="h-5 w-5" />
      </Button>

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

interface VideoCardProps {
  content: PublishedContent;
  isActive: boolean;
  onLike: () => void;
  onView: () => void;
  onShare: () => void;
  style?: React.CSSProperties;
}

function VideoCard({ content, isActive, onLike, onView, onShare, style }: VideoCardProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const viewTracked = useRef(false);

  useEffect(() => {
    if (videoRef.current) {
      if (isActive) {
        videoRef.current.play().catch(() => {});
        setIsPlaying(true);
        
        // Track view after 3 seconds of watching
        if (!viewTracked.current) {
          const timer = setTimeout(() => {
            onView();
            viewTracked.current = true;
          }, 3000);
          return () => clearTimeout(timer);
        }
      } else {
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
        setIsPlaying(false);
        viewTracked.current = false;
      }
    }
  }, [isActive, onView]);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleTap = () => {
    setShowControls(!showControls);
    togglePlay();
  };

  const formatCount = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  const getVideoSrc = () => {
    const url = content.video_url;
    if (url.match(/\.(mp4|webm|ogg)$/i)) {
      return url;
    }
    return null;
  };

  const videoSrc = getVideoSrc();

  return (
    <div 
      className="absolute inset-0 w-full h-full"
      style={style}
    >
      {videoSrc ? (
        <div className="relative w-full h-full bg-black" onClick={handleTap}>
          <video
            ref={videoRef}
            src={videoSrc}
            className="w-full h-full object-cover"
            loop
            muted={isMuted}
            playsInline
            poster={content.thumbnail_url || undefined}
          />
          
          {showControls && !isPlaying && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/20">
              <div className="p-4 rounded-full bg-white/20 backdrop-blur-sm">
                <Play className="h-12 w-12 text-white" fill="white" />
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="relative w-full h-full bg-black">
          <EmbeddedVideo url={content.video_url} />
        </div>
      )}

      {/* Action Buttons - Right Side */}
      <div className="absolute right-3 bottom-32 flex flex-col items-center gap-5 z-10">
        {content.creator && (
          <div className="relative">
            {content.creator.avatar_url ? (
              <img 
                src={content.creator.avatar_url} 
                alt={content.creator.full_name}
                className="w-12 h-12 rounded-full border-2 border-white object-cover"
              />
            ) : (
              <div className="w-12 h-12 rounded-full border-2 border-white bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-white font-bold">
                {content.creator.full_name.charAt(0)}
              </div>
            )}
          </div>
        )}

        {/* Like Button */}
        <button 
          onClick={(e) => { e.stopPropagation(); onLike(); }}
          className="flex flex-col items-center gap-1 text-white"
        >
          <div className={`p-2 rounded-full backdrop-blur-sm transition ${
            content.is_liked 
              ? 'bg-red-500 hover:bg-red-600' 
              : 'bg-white/10 hover:bg-white/20'
          }`}>
            <Heart className={`h-6 w-6 ${content.is_liked ? 'fill-white' : ''}`} />
          </div>
          <span className="text-xs">{formatCount(content.likes_count)}</span>
        </button>

        {/* Views Count */}
        <div className="flex flex-col items-center gap-1 text-white">
          <div className="p-2 rounded-full bg-white/10 backdrop-blur-sm">
            <Eye className="h-6 w-6" />
          </div>
          <span className="text-xs">{formatCount(content.views_count)}</span>
        </div>

        {/* Share Button */}
        <button 
          onClick={(e) => { e.stopPropagation(); onShare(); }}
          className="flex flex-col items-center gap-1 text-white"
        >
          <div className="p-2 rounded-full bg-white/10 backdrop-blur-sm hover:bg-white/20 transition">
            <Share2 className="h-6 w-6" />
          </div>
          <span className="text-xs">Share</span>
        </button>

        {/* Mute Button */}
        {videoSrc && (
          <button 
            onClick={(e) => { e.stopPropagation(); toggleMute(); }}
            className="flex flex-col items-center gap-1 text-white"
          >
            <div className="p-2 rounded-full bg-white/10 backdrop-blur-sm hover:bg-white/20 transition">
              {isMuted ? <VolumeX className="h-6 w-6" /> : <Volume2 className="h-6 w-6" />}
            </div>
            <span className="text-xs">{isMuted ? 'Unmute' : 'Mute'}</span>
          </button>
        )}
      </div>

      {/* Content Info - Bottom */}
      <div className="absolute bottom-0 left-0 right-16 p-4 bg-gradient-to-t from-black/80 via-black/40 to-transparent z-10">
        {content.client && (
          <button 
            className="flex items-center gap-2 mb-2 hover:opacity-80 transition"
            onClick={(e) => e.stopPropagation()}
          >
            {content.client.logo_url ? (
              <img 
                src={content.client.logo_url} 
                alt={content.client.name}
                className="w-6 h-6 rounded-full object-cover"
              />
            ) : (
              <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-white text-xs font-bold">
                {content.client.name.charAt(0)}
              </div>
            )}
            <span className="text-white font-medium text-sm">{content.client.name}</span>
          </button>
        )}

        <h3 className="text-white font-semibold text-base mb-1 line-clamp-2">
          {content.title}
        </h3>

        {content.creator && (
          <p className="text-white/70 text-sm">
            Creado por @{content.creator.full_name.toLowerCase().replace(/\s+/g, '')}
          </p>
        )}
      </div>
    </div>
  );
}

function EmbeddedVideo({ url }: { url: string }) {
  if (url.includes('tiktok.com')) {
    const videoId = url.match(/video\/(\d+)/)?.[1];
    if (videoId) {
      return (
        <iframe
          src={`https://www.tiktok.com/embed/v2/${videoId}`}
          className="w-full h-full"
          allowFullScreen
        />
      );
    }
  }

  if (url.includes('instagram.com')) {
    let cleanUrl = url.split('?')[0].replace(/\/$/, '');
    const embedUrl = cleanUrl + '/embed/captioned';
    return (
      <iframe
        src={embedUrl}
        className="w-full h-full"
        allowFullScreen
        scrolling="no"
        frameBorder="0"
      />
    );
  }

  if (url.includes('/shorts/')) {
    const embedUrl = url.replace('/shorts/', '/embed/');
    return (
      <iframe
        src={embedUrl}
        className="w-full h-full"
        allowFullScreen
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      />
    );
  }

  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    let embedUrl = url;
    if (url.includes('watch?v=')) {
      embedUrl = url.replace('watch?v=', 'embed/');
    } else if (url.includes('youtu.be/')) {
      embedUrl = url.replace('youtu.be/', 'youtube.com/embed/');
    }
    return (
      <iframe
        src={embedUrl}
        className="w-full h-full"
        allowFullScreen
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      />
    );
  }

  return (
    <div className="w-full h-full flex items-center justify-center bg-black">
      <a 
        href={url} 
        target="_blank" 
        rel="noopener noreferrer"
        className="text-white hover:underline flex items-center gap-2"
      >
        <Play className="h-8 w-8" />
        Ver video
      </a>
    </div>
  );
}
