import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { 
  Grid3X3, 
  Play, 
  Loader2, 
  User,
  Video as VideoIcon,
  Eye,
  Heart
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { TikTokFeed } from '@/components/content/TikTokFeed';
import { VideoPlayerProvider } from '@/contexts/VideoPlayerContext';

interface UserProfile {
  id: string;
  full_name: string;
  avatar_url: string | null;
  bio: string | null;
  instagram: string | null;
  tiktok: string | null;
}

interface ContentItem {
  id: string;
  title: string;
  thumbnail_url: string | null;
  video_url: string | null;
  video_urls: string[] | null;
  bunny_embed_url: string | null;
  views_count: number;
  likes_count: number;
  created_at: string;
}

interface ClientInfo {
  id: string;
  name: string;
  logo_url: string | null;
  notes: string | null;
}

type ProfileType = 'user' | 'client';

export default function UserPortfolio() {
  const { id } = useParams<{ id: string }>();
  const isMobile = useIsMobile();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [clientInfo, setClientInfo] = useState<ClientInfo | null>(null);
  const [profileType, setProfileType] = useState<ProfileType>('user');
  const [content, setContent] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedContent, setSelectedContent] = useState<ContentItem | null>(null);
  const [showTikTokView, setShowTikTokView] = useState(false);
  const [initialVideoIndex, setInitialVideoIndex] = useState(0);

  useEffect(() => {
    if (id) {
      fetchData();
    }
  }, [id]);

  const fetchData = async () => {
    if (!id) return;
    setLoading(true);

    try {
      // First, try to find as a user profile
      const { data: userData } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, bio, instagram, tiktok')
        .eq('id', id)
        .maybeSingle();

      if (userData) {
        setProfile(userData);
        setProfileType('user');
        
        // Get user roles to determine what content to show
        const { data: rolesData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', id);

        const roles = rolesData?.map(r => r.role) || [];
        
        // Fetch content based on role
        let query = supabase
          .from('content')
          .select('id, title, thumbnail_url, video_url, video_urls, bunny_embed_url, views_count, likes_count, created_at')
          .in('status', ['approved', 'paid', 'delivered'])
          .or('video_url.not.is.null,video_urls.not.is.null');

        if (roles.includes('creator')) {
          query = query.eq('creator_id', id);
        } else if (roles.includes('editor')) {
          query = query.eq('editor_id', id);
        } else if (roles.includes('strategist')) {
          query = query.eq('strategist_id', id);
        }

        const { data: contentData } = await query.order('created_at', { ascending: false });
        setContent(contentData || []);
      } else {
        // Try as a client
        const { data: clientData } = await supabase
          .from('clients')
          .select('id, name, logo_url, notes')
          .eq('id', id)
          .maybeSingle();

        if (clientData) {
          setClientInfo(clientData);
          setProfileType('client');

          const { data: contentData } = await supabase
            .from('content')
            .select('id, title, thumbnail_url, video_url, video_urls, bunny_embed_url, views_count, likes_count, created_at')
            .eq('client_id', id)
            .in('status', ['approved', 'paid', 'delivered'])
            .or('video_url.not.is.null,video_urls.not.is.null')
            .order('created_at', { ascending: false });

          setContent(contentData || []);
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getVideoUrl = (item: ContentItem): string | null => {
    if (item.video_urls && item.video_urls.length > 0) return item.video_urls[0];
    if (item.video_url) return item.video_url;
    return null;
  };

  const tikTokVideos = useMemo(() => {
    return content.map(item => ({
      id: item.id,
      title: item.title,
      videoUrls: item.video_urls?.length ? item.video_urls : (item.video_url ? [item.video_url] : []),
      thumbnailUrl: item.thumbnail_url,
      viewsCount: item.views_count || 0,
      likesCount: item.likes_count || 0,
      isLiked: false,
    }));
  }, [content]);

  const displayName = profileType === 'user' ? profile?.full_name : clientInfo?.name;
  const displayAvatar = profileType === 'user' ? profile?.avatar_url : clientInfo?.logo_url;
  const displayBio = profileType === 'user' ? profile?.bio : clientInfo?.notes;

  const totalViews = content.reduce((sum, c) => sum + (c.views_count || 0), 0);
  const totalLikes = content.reduce((sum, c) => sum + (c.likes_count || 0), 0);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <Loader2 className="h-8 w-8 animate-spin text-white/50" />
      </div>
    );
  }

  if (!profile && !clientInfo) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-black text-white">
        <User className="h-16 w-16 text-white/30 mb-4" />
        <h2 className="text-xl font-semibold mb-2">Perfil no encontrado</h2>
        <p className="text-white/50">El perfil que buscas no existe o no está disponible.</p>
      </div>
    );
  }

  // TikTok fullscreen view
  if (showTikTokView && isMobile) {
    return (
      <VideoPlayerProvider>
        <div className="h-screen bg-black overflow-hidden relative">
          <button
            onClick={() => setShowTikTokView(false)}
            className="absolute top-4 left-4 z-50 text-white/80 hover:text-white"
          >
            ← Volver
          </button>
          <TikTokFeed
            videos={tikTokVideos.slice(initialVideoIndex).concat(tikTokVideos.slice(0, initialVideoIndex))}
            onLike={() => {}}
            onView={() => {}}
            onShare={() => {}}
          />
        </div>
      </VideoPlayerProvider>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Profile Header - Instagram/TikTok style */}
      <div className="max-w-4xl mx-auto">
        {/* Profile Section */}
        <div className="px-4 py-8 md:py-12">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6 md:gap-10">
            {/* Avatar */}
            <Avatar className="h-24 w-24 md:h-36 md:w-36 ring-2 ring-white/20">
              <AvatarImage src={displayAvatar || undefined} className="object-cover" />
              <AvatarFallback className="bg-zinc-800 text-white text-2xl md:text-4xl">
                {displayName?.charAt(0) || '?'}
              </AvatarFallback>
            </Avatar>

            {/* Info */}
            <div className="flex-1 text-center md:text-left">
              <h1 className="text-xl md:text-2xl font-bold text-white mb-3">
                {displayName}
              </h1>

              {/* Stats Row */}
              <div className="flex items-center justify-center md:justify-start gap-6 mb-4">
                <div className="text-center">
                  <span className="block text-lg md:text-xl font-bold text-white">
                    {content.length}
                  </span>
                  <span className="text-xs text-white/50">videos</span>
                </div>
                <div className="text-center">
                  <span className="block text-lg md:text-xl font-bold text-white">
                    {totalViews.toLocaleString()}
                  </span>
                  <span className="text-xs text-white/50">vistas</span>
                </div>
                <div className="text-center">
                  <span className="block text-lg md:text-xl font-bold text-white">
                    {totalLikes.toLocaleString()}
                  </span>
                  <span className="text-xs text-white/50">likes</span>
                </div>
              </div>

              {/* Bio */}
              {displayBio && (
                <p className="text-white/70 text-sm max-w-md mx-auto md:mx-0 leading-relaxed">
                  {displayBio}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-t border-white/10">
          <div className="flex justify-center">
            <button className="flex items-center gap-2 px-6 py-3 text-white border-t-2 border-white -mt-px">
              <Grid3X3 className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wider">Videos</span>
            </button>
          </div>
        </div>

        {/* Content Grid */}
        <div className="px-1 pb-8">
          {content.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-white/40">
              <VideoIcon className="h-12 w-12 mb-3" />
              <p className="text-sm">Aún no hay videos</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-0.5 md:gap-1">
              {content.map((item, index) => (
                <div
                  key={item.id}
                  className="group relative aspect-[9/16] bg-zinc-900 cursor-pointer overflow-hidden"
                  onClick={() => {
                    if (isMobile) {
                      setInitialVideoIndex(index);
                      setShowTikTokView(true);
                    } else {
                      setSelectedContent(item);
                    }
                  }}
                >
                  {/* Thumbnail */}
                  {item.thumbnail_url ? (
                    <img
                      src={item.thumbnail_url}
                      alt={item.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-zinc-800">
                      <VideoIcon className="h-8 w-8 text-white/20" />
                    </div>
                  )}

                  {/* Play icon */}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition-colors">
                    <Play className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" fill="white" />
                  </div>

                  {/* Stats overlay on hover */}
                  <div className="absolute inset-0 flex items-center justify-center gap-4 opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                    <div className="flex items-center gap-1 text-white">
                      <Eye className="h-4 w-4" />
                      <span className="text-sm font-medium">{(item.views_count || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-1 text-white">
                      <Heart className="h-4 w-4" fill="white" />
                      <span className="text-sm font-medium">{(item.likes_count || 0).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Video Preview Dialog */}
      <Dialog open={!!selectedContent} onOpenChange={() => setSelectedContent(null)}>
        <DialogContent className="max-w-lg bg-black border-white/10 p-0 overflow-hidden">
          {selectedContent && (
            <div className="flex flex-col">
              <div className="relative aspect-[9/16] bg-black max-h-[80vh]">
                {selectedContent.bunny_embed_url ? (
                  <iframe
                    src={`${selectedContent.bunny_embed_url}?autoplay=true`}
                    className="w-full h-full"
                    allow="autoplay; fullscreen"
                    allowFullScreen
                  />
                ) : getVideoUrl(selectedContent) ? (
                  <video
                    src={getVideoUrl(selectedContent)!}
                    controls
                    autoPlay
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white/50">
                    No hay video disponible
                  </div>
                )}
              </div>
              <div className="p-4 border-t border-white/10">
                <h3 className="text-white font-medium text-sm">{selectedContent.title}</h3>
                <div className="flex items-center gap-4 mt-2 text-white/50 text-xs">
                  <span className="flex items-center gap-1">
                    <Eye className="h-3 w-3" /> {(selectedContent.views_count || 0).toLocaleString()}
                  </span>
                  <span className="flex items-center gap-1">
                    <Heart className="h-3 w-3" /> {(selectedContent.likes_count || 0).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
