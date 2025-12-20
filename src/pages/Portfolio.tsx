import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Play, Pause, Volume2, VolumeX, Heart, Eye, Share2, Filter, X, Home, User, MessageSquare, LogOut, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CommentsSection } from "@/components/content/CommentsSection";

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
  const { user, roles, signOut } = useAuth();
  const navigate = useNavigate();
  const isAdmin = roles.includes('admin');
  const isLoggedIn = !!user;
  const [content, setContent] = useState<PublishedContent[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [userProfile, setUserProfile] = useState<{ full_name: string; avatar_url: string | null } | null>(null);
  const [commentDialogOpen, setCommentDialogOpen] = useState(false);
  const [selectedContentId, setSelectedContentId] = useState<string | null>(null);
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
    if (user?.id) {
      fetchUserProfile();
    }
  }, [selectedClientId, user?.id]);

  const fetchUserProfile = async () => {
    if (!user?.id) return;
    const { data } = await supabase
      .from('profiles')
      .select('full_name, avatar_url')
      .eq('id', user.id)
      .maybeSingle();
    if (data) setUserProfile(data);
  };

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

  const handleLike = async (contentId: string, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
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
          text: `Mira este video de ${item.client?.name || 'UGC Colombia'}`,
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

  const handleLogout = async () => {
    await signOut();
    navigate('/portfolio');
  };

  const getDashboardRoute = () => {
    if (roles.includes('admin')) return '/';
    if (roles.includes('creator')) return '/creator-dashboard';
    if (roles.includes('editor')) return '/editor-dashboard';
    if (roles.includes('client')) return '/client-dashboard';
    return '/portfolio';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-neutral-900 to-black p-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="aspect-[9/16] rounded-xl bg-white/10" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (content.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-neutral-900 to-black flex items-center justify-center text-white">
        <div className="text-center">
          <Play className="h-16 w-16 mx-auto mb-4 opacity-50 text-primary" />
          <h2 className="text-xl font-semibold mb-2">
            {selectedClientId ? 'No hay contenido para este cliente' : 'No hay contenido publicado'}
          </h2>
          <p className="text-white/60 mb-4">Próximamente verás aquí nuestro portafolio</p>
          {selectedClientId && (
            <Button 
              variant="outline" 
              onClick={() => setSelectedClientId(null)}
              className="text-white border-primary/50 hover:bg-primary/20 hover:border-primary"
            >
              Ver todo el contenido
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-neutral-900 to-black">
      {/* Header with navigation */}
      <header className="sticky top-0 z-40 bg-black/90 backdrop-blur-xl border-b border-primary/20">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-4 py-3">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-gradient-gold flex items-center justify-center shadow-lg glow-gold">
              <span className="text-black font-bold text-lg">U</span>
            </div>
            <div>
              <h1 className="text-white font-bold text-lg">UGC Colombia</h1>
              <p className="text-primary text-xs">Portafolio</p>
            </div>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-2">
            {isLoggedIn ? (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate(getDashboardRoute())}
                  className="text-white/70 hover:text-white hover:bg-white/10"
                >
                  <Home className="h-4 w-4 mr-2" />
                  Dashboard
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/settings')}
                  className="text-white/70 hover:text-white hover:bg-white/10"
                >
                  <User className="h-4 w-4 mr-2" />
                  Perfil
                </Button>
                <div className="h-6 w-px bg-white/20 mx-2" />
                <div className="flex items-center gap-2">
                  <Avatar className="h-8 w-8 border-2 border-primary/50">
                    <AvatarImage src={userProfile?.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary/20 text-primary text-xs">
                      {userProfile?.full_name?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-white/80 text-sm">{userProfile?.full_name || 'Usuario'}</span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleLogout}
                  className="text-white/50 hover:text-white hover:bg-white/10"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <Button
                onClick={() => navigate('/auth')}
                className="bg-gradient-gold text-black font-semibold hover:opacity-90 glow-gold"
              >
                Iniciar Sesión
              </Button>
            )}
          </nav>

          {/* Mobile Nav */}
          <div className="flex md:hidden items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowFilters(!showFilters)}
              className="text-white hover:bg-white/10"
            >
              <Filter className="h-5 w-5" />
            </Button>
            
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="text-white hover:bg-white/10">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="bg-black/95 border-primary/20 w-72">
                <div className="flex flex-col h-full py-6">
                  {isLoggedIn ? (
                    <>
                      <div className="flex items-center gap-3 mb-6 pb-6 border-b border-white/10">
                        <Avatar className="h-12 w-12 border-2 border-primary/50">
                          <AvatarImage src={userProfile?.avatar_url || undefined} />
                          <AvatarFallback className="bg-primary/20 text-primary">
                            {userProfile?.full_name?.charAt(0) || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-white font-medium">{userProfile?.full_name || 'Usuario'}</p>
                          <p className="text-primary text-xs capitalize">{roles[0] || 'Usuario'}</p>
                        </div>
                      </div>

                      <nav className="flex-1 space-y-2">
                        <button
                          onClick={() => navigate(getDashboardRoute())}
                          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-white/80 hover:bg-white/10 transition"
                        >
                          <Home className="h-5 w-5" />
                          Dashboard
                        </button>
                        <button
                          onClick={() => navigate('/settings')}
                          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-white/80 hover:bg-white/10 transition"
                        >
                          <User className="h-5 w-5" />
                          Mi Perfil
                        </button>
                      </nav>

                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 px-4 py-3 rounded-lg text-red-400 hover:bg-red-500/10 transition mt-auto"
                      >
                        <LogOut className="h-5 w-5" />
                        Cerrar Sesión
                      </button>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center flex-1 gap-4">
                      <p className="text-white/60 text-center">Inicia sesión para acceder a más funciones</p>
                      <Button
                        onClick={() => navigate('/auth')}
                        className="w-full bg-gradient-gold text-black font-semibold"
                      >
                        Iniciar Sesión
                      </Button>
                    </div>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      {/* Video Grid */}
      <div className="max-w-7xl mx-auto p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {content.map((item) => (
            <EmbeddedVideoCard
              key={item.id}
              content={item}
              isAdmin={isAdmin}
              onLike={(e) => handleLike(item.id, e)}
              onView={() => handleView(item.id)}
              onShare={() => handleShare(item)}
              onComment={() => {
                setSelectedContentId(item.id);
                setCommentDialogOpen(true);
              }}
              getThumbnail={getThumbnail}
              formatCount={formatCount}
            />
          ))}
        </div>
      </div>

      {/* Client Filter Sidebar */}
      {showFilters && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm" onClick={() => setShowFilters(false)}>
          <div 
            className="absolute right-0 top-0 h-full w-80 bg-black/95 border-l border-primary/20 p-4 overflow-y-auto"
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
                  !selectedClientId ? 'bg-primary/20 text-primary border border-primary/30' : 'text-white/70 hover:bg-white/10'
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-gradient-gold flex items-center justify-center text-black font-bold">
                  ★
                </div>
                <span className="font-medium">Todos los clientes</span>
              </button>

              {clients.map(client => (
                <button
                  key={client.id}
                  onClick={() => { setSelectedClientId(client.id); setShowFilters(false); }}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg transition ${
                    selectedClientId === client.id ? 'bg-primary/20 text-primary border border-primary/30' : 'text-white/70 hover:bg-white/10'
                  }`}
                >
                  {client.logo_url ? (
                    <img 
                      src={client.logo_url} 
                      alt={client.name}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-gold flex items-center justify-center text-black font-bold">
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
            className="bg-primary/90 text-black border-none backdrop-blur-sm px-4 py-2 flex items-center gap-2 font-medium shadow-lg glow-gold"
          >
            <span>Filtrando: {clients.find(c => c.id === selectedClientId)?.name}</span>
            <button onClick={() => setSelectedClientId(null)} className="hover:opacity-70">
              <X className="h-4 w-4" />
            </button>
          </Badge>
        </div>
      )}

      {/* Comments Dialog */}
      <Dialog open={commentDialogOpen} onOpenChange={setCommentDialogOpen}>
        <DialogContent className="max-w-lg bg-neutral-900 border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white">Comentarios</DialogTitle>
          </DialogHeader>
          {selectedContentId && (
            <CommentsSection contentId={selectedContentId} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface EmbeddedVideoCardProps {
  content: PublishedContent;
  isAdmin: boolean;
  onLike: (e?: React.MouseEvent) => void;
  onView: () => void;
  onShare: () => void;
  onComment: () => void;
  getThumbnail: (url: string | null, thumbnail: string | null) => string | null;
  formatCount: (count: number) => string;
}

function EmbeddedVideoCard({ 
  content, 
  isAdmin,
  onLike, 
  onView, 
  onShare,
  onComment,
  getThumbnail, 
  formatCount 
}: EmbeddedVideoCardProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const viewTracked = useRef(false);
  const viewTimerRef = useRef<NodeJS.Timeout | null>(null);
  const thumbnail = getThumbnail(content.video_url, content.thumbnail_url);

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

  useEffect(() => {
    if (!isPlaying) {
      viewTracked.current = false;
      if (viewTimerRef.current) {
        clearTimeout(viewTimerRef.current);
      }
    }
  }, [isPlaying]);

  const getEmbedContent = () => {
    const url = content.video_url;
    if (!url) return null;

    // Direct video files - best for mobile
    if (url.match(/\.(mp4|webm|ogg)$/i)) {
      return { type: 'video', src: url };
    }

    // Bunny CDN URLs - direct video playback
    if (url.includes('b-cdn.net') || url.includes('bunnycdn')) {
      return { type: 'video', src: url };
    }

    // Bunny Stream embeds - use iframe with autoplay
    if (url.includes('iframe.mediadelivery.net') || url.includes('bunny')) {
      const separator = url.includes('?') ? '&' : '?';
      return { type: 'iframe', src: `${url}${separator}autoplay=true&muted=true&loop=true` };
    }

    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      let embedUrl = url;
      if (url.includes('/shorts/')) {
        embedUrl = url.replace('/shorts/', '/embed/');
      } else if (url.includes('watch?v=')) {
        embedUrl = url.replace('watch?v=', 'embed/');
      } else if (url.includes('youtu.be/')) {
        embedUrl = url.replace('youtu.be/', 'youtube.com/embed/');
      }
      // Mobile-friendly params: playsinline is critical for iOS
      const params = isAdmin 
        ? '?autoplay=1&mute=1&playsinline=1' 
        : '?autoplay=1&mute=1&modestbranding=1&rel=0&showinfo=0&iv_load_policy=3&disablekb=1&playsinline=1';
      return { type: 'iframe', src: embedUrl + params };
    }

    if (url.includes('tiktok.com')) {
      const videoId = url.match(/video\/(\d+)/)?.[1];
      if (videoId) {
        return { type: 'iframe', src: `https://www.tiktok.com/embed/v2/${videoId}` };
      }
    }

    if (url.includes('instagram.com')) {
      let cleanUrl = url.split('?')[0].replace(/\/$/, '');
      return { type: 'iframe', src: cleanUrl + '/embed/captioned' };
    }

    if (url.includes('drive.google.com')) {
      const fileId = url.match(/\/d\/([a-zA-Z0-9_-]+)/)?.[1];
      if (fileId) {
        return { type: 'iframe', src: `https://drive.google.com/file/d/${fileId}/preview` };
      }
    }

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
    <div className="group relative rounded-2xl overflow-hidden bg-neutral-900 border border-white/10 hover:border-primary/40 transition-all duration-300 hover:shadow-xl hover:shadow-primary/10">
      {/* Video Container */}
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
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-black">
                <Play className="h-12 w-12 text-primary/50" />
              </div>
            )}
            
            {/* Play overlay */}
            <div 
              className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex items-center justify-center cursor-pointer"
              onClick={handlePlay}
            >
              <div className="p-4 rounded-full bg-primary/90 backdrop-blur-sm hover:bg-primary transition-all duration-300 hover:scale-110 shadow-lg glow-gold">
                <Play className="h-8 w-8 text-black" fill="black" />
              </div>
            </div>

            {/* Stats - Always visible, clickable */}
            <div className="absolute bottom-16 left-3 flex items-center gap-2 z-20">
              <div className="flex items-center gap-1.5 text-white text-sm bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-full">
                <Eye className="h-4 w-4" />
                <span className="font-medium">{formatCount(content.views_count)}</span>
              </div>
              <div className="flex items-center gap-1.5 text-white text-sm bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-full">
                <Heart className="h-4 w-4" />
                <span className="font-medium">{formatCount(content.likes_count)}</span>
              </div>
            </div>

            {/* Action Buttons - Always visible */}
            <div className="absolute bottom-16 right-3 flex flex-col gap-3 z-20">
              <button
                onClick={(e) => onLike(e)}
                className={`p-3 rounded-full transition-all duration-200 shadow-lg active:scale-90 ${
                  content.is_liked 
                    ? 'bg-red-500 text-white scale-110' 
                    : 'bg-black/60 backdrop-blur-sm text-white hover:bg-red-500/80 hover:scale-110'
                }`}
              >
                <Heart className="h-6 w-6" fill={content.is_liked ? "currentColor" : "none"} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onComment();
                }}
                className="p-3 rounded-full bg-black/60 backdrop-blur-sm text-white hover:bg-primary/80 hover:text-black transition-all duration-200 shadow-lg active:scale-90"
              >
                <MessageSquare className="h-6 w-6" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onShare();
                }}
                className="p-3 rounded-full bg-black/60 backdrop-blur-sm text-white hover:bg-primary/80 hover:text-black transition-all duration-200 shadow-lg active:scale-90"
              >
                <Share2 className="h-6 w-6" />
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Video Player */}
            {embedContent?.type === 'video' ? (
              <video
                ref={videoRef}
                src={embedContent.src}
                className="w-full h-full object-cover"
                autoPlay
                muted={isMuted}
                playsInline
                webkit-playsinline="true"
                controlsList={isAdmin ? undefined : "nodownload noplaybackrate"}
                disablePictureInPicture={!isAdmin}
                onContextMenu={isAdmin ? undefined : (e) => e.preventDefault()}
                onError={(e) => console.error('Video error:', e)}
              />
            ) : embedContent?.type === 'iframe' ? (
              <div className="relative w-full h-full">
                <iframe
                  src={embedContent.src}
                  className="w-full h-full"
                  allowFullScreen={isAdmin}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
                {!isAdmin && (
                  <div className="absolute inset-0 pointer-events-none" />
                )}
              </div>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white/60">
                No se puede reproducir
              </div>
            )}

            {/* Controls */}
            <div className="absolute top-3 right-3 flex gap-2 z-20">
              <button
                onClick={handleStop}
                className="p-2.5 rounded-full bg-black/60 backdrop-blur-sm text-white hover:bg-black/80 transition-colors"
              >
                <Pause className="h-5 w-5" />
              </button>
              {embedContent?.type === 'video' && (
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className="p-2.5 rounded-full bg-black/60 backdrop-blur-sm text-white hover:bg-black/80 transition-colors"
                >
                  {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                </button>
              )}
            </div>
          </>
        )}
      </div>

      {/* Info */}
      <div className="p-4 bg-neutral-900">
        <h3 className="font-semibold text-sm text-white line-clamp-2 mb-2">
          {content.title}
        </h3>
        <div className="flex items-center gap-2 text-xs text-white/50">
          {content.client && (
            <span className="text-primary">{content.client.name}</span>
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
