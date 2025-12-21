import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { 
  Play, 
  Loader2, 
  User,
  Video as VideoIcon,
  Eye,
  Heart,
  Plus,
  Pencil,
  Home,
  ArrowLeft,
  Search
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { TikTokFeed } from '@/components/content/TikTokFeed';
import { BunnyVideoCard } from '@/components/content/BunnyVideoCard';
import { VideoPlayerProvider } from '@/contexts/VideoPlayerContext';
import { StoryViewer } from '@/components/portfolio/StoryViewer';
import { StoryRing } from '@/components/portfolio/StoryRing';
import { MediaUploader } from '@/components/portfolio/MediaUploader';
import { ProfileEditor } from '@/components/portfolio/ProfileEditor';
import { FollowButton } from '@/components/portfolio/FollowButton';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { ParsedText } from '@/components/ui/parsed-text';
import { AmbassadorBadge } from '@/components/ui/ambassador-badge';

interface UserProfile {
  id: string;
  full_name: string;
  avatar_url: string | null;
  bio: string | null;
  is_public: boolean;
  is_ambassador: boolean;
}

interface ContentItem {
  id: string;
  title: string;
  caption: string | null;
  thumbnail_url: string | null;
  video_url: string | null;
  video_urls: string[] | null;
  bunny_embed_url: string | null;
  views_count: number;
  likes_count: number;
  created_at: string;
  creator_id: string | null;
  is_liked: boolean;
  is_pinned?: boolean;
  status?: string; // Content status for client approval
}

interface PortfolioPost {
  id: string;
  media_url: string;
  media_type: string;
  thumbnail_url: string | null;
  caption: string | null;
  views_count: number;
  likes_count: number;
  created_at: string;
  is_pinned: boolean;
  pinned_at: string | null;
}

interface Story {
  id: string;
  media_url: string;
  media_type: string;
  created_at: string;
  expires_at: string;
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
  const navigate = useNavigate();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const isOwner = user?.id === id;
  
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [clientInfo, setClientInfo] = useState<ClientInfo | null>(null);
  const [profileType, setProfileType] = useState<ProfileType>('user');
  const [content, setContent] = useState<ContentItem[]>([]);
  const [posts, setPosts] = useState<PortfolioPost[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedContent, setSelectedContent] = useState<ContentItem | null>(null);
  const [selectedPost, setSelectedPost] = useState<PortfolioPost | null>(null);
  const [showTikTokView, setShowTikTokView] = useState(false);
  const [initialVideoIndex, setInitialVideoIndex] = useState(0);
  const [showStoryViewer, setShowStoryViewer] = useState(false);
  const [showMediaUploader, setShowMediaUploader] = useState(false);
  const [uploaderType, setUploaderType] = useState<'post' | 'story'>('post');
  const [showProfileEditor, setShowProfileEditor] = useState(false);
  const [followCounts, setFollowCounts] = useState({ followers: 0, following: 0 });
  const [isFollowing, setIsFollowing] = useState(false);
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [contentSearchQuery, setContentSearchQuery] = useState('');
  const [viewerId] = useState(() => {
    const stored = localStorage.getItem('portfolio_viewer_id');
    if (stored) return stored;
    const newId = crypto.randomUUID();
    localStorage.setItem('portfolio_viewer_id', newId);
    return newId;
  });

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
        .select('id, full_name, avatar_url, bio, is_public, is_ambassador')
        .eq('id', id)
        .maybeSingle();

      if (userData) {
        setProfile({
          ...userData,
          is_public: userData.is_public ?? true,
          is_ambassador: userData.is_ambassador ?? false
        });
        setProfileType('user');
        
        // Get user roles to determine what content to show
        const { data: rolesData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', id);

        const roles = rolesData?.map(r => r.role) || [];
        setUserRoles(roles);
        
        // Fetch content where user is creator
        const { data: creatorContent } = await supabase
          .from('content')
          .select('id, title, caption, thumbnail_url, video_url, video_urls, bunny_embed_url, views_count, likes_count, created_at, creator_id')
          .eq('is_published', true)
          .eq('creator_id', id)
          .or('video_url.not.is.null,video_urls.not.is.null')
          .order('created_at', { ascending: false });

        // Fetch content where user is a collaborator
        const { data: collabData } = await supabase
          .from('content_collaborators')
          .select('content_id')
          .eq('user_id', id);
        
        const collabContentIds = collabData?.map(c => c.content_id) || [];
        
        let collabContent: any[] = [];
        if (collabContentIds.length > 0) {
          const { data: collabContentData } = await supabase
            .from('content')
            .select('id, title, caption, thumbnail_url, video_url, video_urls, bunny_embed_url, views_count, likes_count, created_at, creator_id')
            .eq('is_published', true)
            .in('id', collabContentIds)
            .or('video_url.not.is.null,video_urls.not.is.null')
            .order('created_at', { ascending: false });
          collabContent = collabContentData || [];
        }

        // Merge and dedupe content (creator + collaborations)
        const allContentMap = new Map<string, any>();
        (creatorContent || []).forEach(c => allContentMap.set(c.id, c));
        collabContent.forEach(c => {
          if (!allContentMap.has(c.id)) {
            allContentMap.set(c.id, c);
          }
        });
        const contentData = Array.from(allContentMap.values()).sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        
        // Get liked content IDs
        const contentIds = contentData?.map(c => c.id) || [];
        const storedViewerId = localStorage.getItem('portfolio_viewer_id') || '';
        const { data: likedData } = contentIds.length > 0 
          ? await supabase.from('content_likes').select('content_id').eq('viewer_id', storedViewerId).in('content_id', contentIds)
          : { data: [] };
        const likedSet = new Set((likedData || []).map(l => l.content_id));
        
        const enrichedContent: ContentItem[] = (contentData || []).map(item => ({
          ...item,
          caption: item.caption || null,
          is_liked: likedSet.has(item.id),
          is_pinned: item.caption?.includes('[PINNED]') || false
        }));
        setContent(enrichedContent);

        // Fetch portfolio posts
        const { data: postsData } = await supabase
          .from('portfolio_posts')
          .select('*')
          .eq('user_id', id)
          .order('created_at', { ascending: false });
        setPosts(postsData || []);

        // Fetch active stories
        const { data: storiesData } = await supabase
          .from('portfolio_stories')
          .select('*')
          .eq('user_id', id)
          .gt('expires_at', new Date().toISOString())
          .order('created_at', { ascending: true });
        setStories(storiesData || []);

        // Fetch follow counts
        const { data: countsData } = await supabase.rpc('get_follow_counts', { _user_id: id });
        if (countsData && countsData.length > 0) {
          setFollowCounts({
            followers: Number(countsData[0].followers_count) || 0,
            following: Number(countsData[0].following_count) || 0,
          });
        }

        // Check if current user follows this profile
        const { data: followingData } = await supabase.rpc('is_following', { _following_id: id });
        setIsFollowing(followingData === true);
        // Try as a client
        const { data: clientData } = await supabase
          .from('clients')
          .select('id, name, logo_url, notes')
          .eq('id', id)
          .maybeSingle();

        if (clientData) {
          setClientInfo(clientData);
          setProfileType('client');

          // For clients, show approved/delivered content (not just is_published)
          const { data: clientContentData } = await supabase
            .from('content')
            .select('id, title, caption, thumbnail_url, video_url, video_urls, bunny_embed_url, views_count, likes_count, created_at, creator_id, status')
            .eq('client_id', id)
            .in('status', ['approved', 'delivered', 'paid'])
            .or('video_url.not.is.null,video_urls.not.is.null')
            .order('created_at', { ascending: false });

          const clientContentIds = clientContentData?.map(c => c.id) || [];
          const { data: clientLikedData } = clientContentIds.length > 0 
            ? await supabase.from('content_likes').select('content_id').eq('viewer_id', storedViewerId).in('content_id', clientContentIds)
            : { data: [] };
          const clientLikedSet = new Set((clientLikedData || []).map(l => l.content_id));
          
          const enrichedClientContent: ContentItem[] = (clientContentData || []).map(item => ({
            ...item,
            caption: item.caption || null,
            is_liked: clientLikedSet.has(item.id),
            is_pinned: item.caption?.includes('[PINNED]') || false,
            status: item.status || undefined
          }));
          setContent(enrichedClientContent);
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
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

  const handleShare = async (item: ContentItem) => {
    const url = `${window.location.origin}/portfolio?v=${item.id}`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: item.title,
          text: `Mira este video`,
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

  const handlePin = async (itemId: string, type: 'work' | 'post') => {
    try {
      if (type === 'post') {
        const { data, error } = await supabase.rpc('toggle_post_pin', { post_id: itemId });
        if (error) throw error;
        
        setPosts(prev => prev.map(p => 
          p.id === itemId ? { ...p, is_pinned: data, pinned_at: data ? new Date().toISOString() : null } : p
        ));
        toast.success(data ? '📌 Post fijado' : 'Post desanclado');
      } else {
        const { data, error } = await supabase.rpc('toggle_content_pin', { content_id: itemId });
        if (error) throw error;
        
        setContent(prev => prev.map(c => 
          c.id === itemId ? { ...c, is_pinned: data } : c
        ));
        toast.success(data ? '📌 Contenido fijado' : 'Contenido desanclado');
      }
    } catch (error: any) {
      console.error('Error toggling pin:', error);
      if (error.message?.includes('Maximum 3')) {
        toast.error('Solo puedes fijar máximo 3 publicaciones');
      } else {
        toast.error('Error al fijar publicación');
      }
    }
  };

  const getVideoUrl = (item: ContentItem | PortfolioPost): string | null => {
    if ('video_urls' in item && item.video_urls && item.video_urls.length > 0) return item.video_urls[0];
    if ('video_url' in item && item.video_url) return item.video_url;
    if ('media_url' in item) return item.media_url;
    return null;
  };

  // Unified content: work + video posts
  const allVideos = useMemo(() => {
    const workVideos = content.map(item => ({
      id: item.id,
      title: item.caption?.replace('[PINNED]', '').trim() || item.title,
      videoUrls: item.video_urls?.length ? item.video_urls : (item.video_url ? [item.video_url] : []),
      thumbnailUrl: item.thumbnail_url,
      viewsCount: item.views_count || 0,
      likesCount: item.likes_count || 0,
      isLiked: item.is_liked,
      createdAt: item.created_at,
      type: 'work' as const,
      isPinned: item.is_pinned || false,
      status: item.status,
    }));
    
    const postVideos = posts.filter(p => p.media_type === 'video').map(item => ({
      id: item.id,
      title: item.caption || '',
      videoUrls: [item.media_url],
      thumbnailUrl: item.thumbnail_url,
      viewsCount: item.views_count || 0,
      likesCount: item.likes_count || 0,
      isLiked: false,
      createdAt: item.created_at,
      type: 'post' as const,
      isPinned: item.is_pinned || false,
      status: undefined,
    }));
    
    // Combine, sort pinned first, then by date
    let combined = [...workVideos, ...postVideos];
    
    // Filter by search query
    if (contentSearchQuery.trim()) {
      const query = contentSearchQuery.toLowerCase();
      combined = combined.filter(item => 
        item.title.toLowerCase().includes(query)
      );
    }
    
    return combined.sort((a, b) => {
      // Pinned items first
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      // Then by date
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [content, posts, contentSearchQuery]);

  // Check if current user is a client viewing their own content
  const isClientOwner = profileType === 'client' && isOwner;

  const handleApproveContent = async (contentId: string) => {
    try {
      const { error } = await supabase
        .from('content')
        .update({ 
          status: 'approved', 
          approved_at: new Date().toISOString(),
          approved_by: user?.id
        })
        .eq('id', contentId);

      if (error) throw error;

      // Update local state
      setContent(prev => prev.map(item =>
        item.id === contentId ? { ...item, status: 'approved' } : item
      ));
      
      toast.success('Contenido aprobado exitosamente');
    } catch (error) {
      console.error('Error approving content:', error);
      toast.error('Error al aprobar contenido');
    }
  };

  const displayName = profileType === 'user' ? profile?.full_name : clientInfo?.name;
  const displayAvatar = profileType === 'user' ? profile?.avatar_url : clientInfo?.logo_url;
  const displayBio = profileType === 'user' ? profile?.bio : clientInfo?.notes;
  const userId = profileType === 'user' ? profile?.id : clientInfo?.id;

  const totalViews = content.reduce((sum, c) => sum + (c.views_count || 0), 0) + 
                     posts.reduce((sum, p) => sum + (p.views_count || 0), 0);
  const totalLikes = content.reduce((sum, c) => sum + (c.likes_count || 0), 0) +
                     posts.reduce((sum, p) => sum + (p.likes_count || 0), 0);
  const totalContent = content.length + posts.length;

  const openUploader = (type: 'post' | 'story') => {
    setUploaderType(type);
    setShowMediaUploader(true);
  };

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

  // Private profile check - only show to owner
  if (profile && !profile.is_public && !isOwner) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-black text-white">
        <div className="text-center p-6">
          <div className="w-24 h-24 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-4">
            <User className="h-12 w-12 text-white/50" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Perfil privado</h2>
          <p className="text-white/50 mb-4">Este usuario ha configurado su perfil como privado.</p>
          <Button 
            variant="outline" 
            onClick={() => navigate('/portfolio')}
            className="border-white/20 text-white hover:bg-white/10"
          >
            Volver al portfolio
          </Button>
        </div>
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
            videos={allVideos.slice(initialVideoIndex).concat(allVideos.slice(0, initialVideoIndex))}
            onLike={() => {}}
            onView={() => {}}
            onShare={() => {}}
          />
        </div>
      </VideoPlayerProvider>
    );
  }

  // Story viewer
  if (showStoryViewer && stories.length > 0) {
    return (
      <StoryViewer
        stories={stories}
        userName={displayName || ''}
        userAvatar={displayAvatar}
        onClose={() => setShowStoryViewer(false)}
      />
    );
  }

  

  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-4xl mx-auto">
        {/* Navigation Header */}
        <div className="flex items-center justify-between px-4 pt-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-white/70 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            <span className="text-sm">Volver</span>
          </button>
          <button
            onClick={() => navigate('/portfolio')}
            className="flex items-center gap-2 text-white/70 hover:text-white transition-colors"
          >
            <Home className="h-5 w-5" />
            <span className="text-sm">Portfolio</span>
          </button>
        </div>

        {/* Stories Row */}
        {(stories.length > 0 || isOwner) && profileType === 'user' && (
          <div className="px-4 pt-4 pb-2 overflow-x-auto">
            <div className="flex gap-4">
              <StoryRing
                avatarUrl={displayAvatar}
                name={displayName || ''}
                hasStories={stories.length > 0}
                hasUnseenStories={stories.length > 0}
                isOwn={isOwner}
                onClick={() => stories.length > 0 && setShowStoryViewer(true)}
                onAddClick={() => openUploader('story')}
              />
            </div>
          </div>
        )}

        {/* Profile Section */}
        <div className="px-4 py-6 md:py-10">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6 md:gap-10">
            {/* Avatar */}
            <div className="relative group">
              <Avatar className="h-24 w-24 md:h-36 md:w-36 ring-2 ring-white/20">
                <AvatarImage src={displayAvatar || undefined} className="object-cover" />
                <AvatarFallback className="bg-zinc-800 text-white text-2xl md:text-4xl">
                  {displayName?.charAt(0) || '?'}
                </AvatarFallback>
              </Avatar>
              {isOwner && profileType === 'user' && (
                <button
                  onClick={() => setShowProfileEditor(true)}
                  className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Pencil className="h-6 w-6 text-white" />
                </button>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-3 mb-3 flex-wrap">
                <h1 className="text-xl md:text-2xl font-bold text-white">
                  {displayName}
                </h1>
                {(profile?.is_ambassador || userRoles.includes('ambassador')) && (
                  <AmbassadorBadge size="sm" variant="glow" />
                )}
                {isOwner && profileType === 'user' && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowProfileEditor(true)}
                    className="text-white/60 hover:text-white hover:bg-white/10"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                )}
                {isOwner && (
                  <Button
                    size="sm"
                    onClick={() => openUploader('post')}
                    className="gap-1"
                  >
                    <Plus className="h-4 w-4" />
                    <span className="hidden sm:inline">Publicar</span>
                  </Button>
                )}
                {!isOwner && profileType === 'user' && profile && (
                  <FollowButton
                    userId={profile.id}
                    initialIsFollowing={isFollowing}
                    onFollowChange={(following) => {
                      setIsFollowing(following);
                      setFollowCounts(prev => ({
                        ...prev,
                        followers: prev.followers + (following ? 1 : -1),
                      }));
                    }}
                  />
                )}
              </div>

              {/* Stats Row */}
              <div className="flex items-center justify-center md:justify-start gap-6 mb-4">
                <div className="text-center">
                  <span className="block text-lg md:text-xl font-bold text-white">
                    {totalContent}
                  </span>
                  <span className="text-xs text-white/50">publicaciones</span>
                </div>
                {profileType === 'user' && (
                  <>
                    <div className="text-center">
                      <span className="block text-lg md:text-xl font-bold text-white">
                        {followCounts.followers.toLocaleString()}
                      </span>
                      <span className="text-xs text-white/50">seguidores</span>
                    </div>
                    <div className="text-center">
                      <span className="block text-lg md:text-xl font-bold text-white">
                        {followCounts.following.toLocaleString()}
                      </span>
                      <span className="text-xs text-white/50">siguiendo</span>
                    </div>
                  </>
                )}
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

        {/* Content Divider */}
        <div className="border-t border-white/10 mt-4" />

        {/* Search Bar for Content */}
        {(content.length > 0 || posts.length > 0) && (
          <div className="px-4 pt-4">
            <div className="relative max-w-md mx-auto md:mx-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/50" />
              <Input
                type="text"
                placeholder="Buscar contenido..."
                value={contentSearchQuery}
                onChange={(e) => setContentSearchQuery(e.target.value)}
                className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:bg-white/15"
              />
            </div>
          </div>
        )}

        {/* Unified Content Grid */}
        <div className="px-4 py-6">
          {allVideos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-white/40">
              <VideoIcon className="h-12 w-12 mb-3" />
              <p className="text-sm">Aún no hay contenido publicado</p>
              {isOwner && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openUploader('post')}
                  className="mt-4 border-white/20 text-white hover:bg-white/10"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Crear primer post
                </Button>
              )}
            </div>
          ) : isMobile ? (
            // Mobile: TikTok feed
            <VideoPlayerProvider>
              <TikTokFeed
                videos={allVideos}
                onLike={(contentId) => handleLike(contentId)}
                onView={(contentId) => handleView(contentId)}
                onShare={(item) => handleShare(content.find(c => c.id === item.id) || content[0])}
              />
            </VideoPlayerProvider>
          ) : (
            // Desktop: Grid with BunnyVideoCard
            <VideoPlayerProvider>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
                {allVideos.map((item) => (
                  <BunnyVideoCard
                    key={item.id}
                    id={item.id}
                    title={item.title}
                    caption={item.title}
                    videoUrls={item.videoUrls}
                    thumbnailUrl={item.thumbnailUrl}
                    viewsCount={item.viewsCount}
                    likesCount={item.likesCount}
                    isLiked={item.isLiked}
                    isPinned={item.isPinned}
                    isOwner={isOwner && profileType === 'user'}
                    status={item.status}
                    showActions={true}
                    onLike={(e) => handleLike(item.id, e)}
                    onView={() => handleView(item.id)}
                    onShare={() => {
                      const contentItem = content.find(c => c.id === item.id);
                      if (contentItem) handleShare(contentItem);
                    }}
                    onPin={isOwner && profileType === 'user' ? () => handlePin(item.id, item.type) : undefined}
                    onApprove={isClientOwner && item.status === 'delivered' ? () => handleApproveContent(item.id) : undefined}
                    onSettingsUpdate={() => fetchData()}
                  />
                ))}
              </div>
            </VideoPlayerProvider>
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
                ) : null}
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

      {/* Post Preview Dialog */}
      <Dialog open={!!selectedPost} onOpenChange={() => setSelectedPost(null)}>
        <DialogContent className="max-w-lg bg-black border-white/10 p-0 overflow-hidden">
          {selectedPost && (
            <div className="flex flex-col">
              <div className="relative aspect-[9/16] bg-black max-h-[80vh]">
                {selectedPost.media_type === 'video' ? (
                  <video
                    src={selectedPost.media_url}
                    controls
                    autoPlay
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <img
                    src={selectedPost.media_url}
                    alt={selectedPost.caption || ''}
                    className="w-full h-full object-contain"
                  />
                )}
              </div>
              {selectedPost.caption && (
                <div className="p-4 border-t border-white/10">
                  <ParsedText text={selectedPost.caption} className="text-white text-sm" />
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Media Uploader */}
      {userId && (
        <MediaUploader
          userId={userId}
          type={uploaderType}
          isOpen={showMediaUploader}
          onClose={() => setShowMediaUploader(false)}
          onSuccess={fetchData}
        />
      )}

      {/* Profile Editor */}
      {profile && (
        <ProfileEditor
          userId={profile.id}
          currentName={profile.full_name}
          currentBio={profile.bio}
          currentAvatar={profile.avatar_url}
          currentIsPublic={profile.is_public}
          open={showProfileEditor}
          onOpenChange={setShowProfileEditor}
          onSave={fetchData}
        />
      )}
    </div>
  );
}
