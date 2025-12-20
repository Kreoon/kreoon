import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Grid3X3, 
  Play, 
  Loader2, 
  User,
  Video as VideoIcon,
  Eye,
  Heart,
  Plus,
  Briefcase,
  Image as ImageIcon,
  Pencil
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { TikTokFeed } from '@/components/content/TikTokFeed';
import { VideoPlayerProvider } from '@/contexts/VideoPlayerContext';
import { StoryViewer } from '@/components/portfolio/StoryViewer';
import { StoryRing } from '@/components/portfolio/StoryRing';
import { MediaUploader } from '@/components/portfolio/MediaUploader';
import { ProfileEditor } from '@/components/portfolio/ProfileEditor';
import { FollowButton } from '@/components/portfolio/FollowButton';
import { useAuth } from '@/hooks/useAuth';

interface UserProfile {
  id: string;
  full_name: string;
  avatar_url: string | null;
  bio: string | null;
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

interface PortfolioPost {
  id: string;
  media_url: string;
  media_type: string;
  thumbnail_url: string | null;
  caption: string | null;
  views_count: number;
  likes_count: number;
  created_at: string;
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
type TabType = 'work' | 'posts';

export default function UserPortfolio() {
  const { id } = useParams<{ id: string }>();
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
  const [activeTab, setActiveTab] = useState<TabType>('work');
  const [showProfileEditor, setShowProfileEditor] = useState(false);
  const [followCounts, setFollowCounts] = useState({ followers: 0, following: 0 });
  const [isFollowing, setIsFollowing] = useState(false);

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
        .select('id, full_name, avatar_url, bio')
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
        
        // Fetch work content based on role
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

  const getVideoUrl = (item: ContentItem | PortfolioPost): string | null => {
    if ('video_urls' in item && item.video_urls && item.video_urls.length > 0) return item.video_urls[0];
    if ('video_url' in item && item.video_url) return item.video_url;
    if ('media_url' in item) return item.media_url;
    return null;
  };

  const tikTokVideos = useMemo(() => {
    const allItems = activeTab === 'work' 
      ? content.map(item => ({
          id: item.id,
          title: item.title,
          videoUrls: item.video_urls?.length ? item.video_urls : (item.video_url ? [item.video_url] : []),
          thumbnailUrl: item.thumbnail_url,
          viewsCount: item.views_count || 0,
          likesCount: item.likes_count || 0,
          isLiked: false,
        }))
      : posts.filter(p => p.media_type === 'video').map(item => ({
          id: item.id,
          title: item.caption || '',
          videoUrls: [item.media_url],
          thumbnailUrl: item.thumbnail_url,
          viewsCount: item.views_count || 0,
          likesCount: item.likes_count || 0,
          isLiked: false,
        }));
    return allItems;
  }, [content, posts, activeTab]);

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

  const currentItems = activeTab === 'work' ? content : posts;

  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-4xl mx-auto">
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
              <div className="flex items-center justify-center md:justify-start gap-3 mb-3">
                <h1 className="text-xl md:text-2xl font-bold text-white">
                  {displayName}
                </h1>
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

        {/* Tabs */}
        <div className="border-t border-white/10">
          <div className="flex justify-center">
            <button 
              onClick={() => setActiveTab('work')}
              className={cn(
                "flex items-center gap-2 px-6 py-3 border-t-2 -mt-px transition-colors",
                activeTab === 'work' ? "text-white border-white" : "text-white/50 border-transparent hover:text-white/70"
              )}
            >
              <Briefcase className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wider">Trabajo</span>
            </button>
            {profileType === 'user' && (
              <button 
                onClick={() => setActiveTab('posts')}
                className={cn(
                  "flex items-center gap-2 px-6 py-3 border-t-2 -mt-px transition-colors",
                  activeTab === 'posts' ? "text-white border-white" : "text-white/50 border-transparent hover:text-white/70"
                )}
              >
                <Grid3X3 className="h-4 w-4" />
                <span className="text-xs font-medium uppercase tracking-wider">Posts</span>
              </button>
            )}
          </div>
        </div>

        {/* Content Grid */}
        <div className="px-1 pb-8">
          {currentItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-white/40">
              {activeTab === 'work' ? (
                <>
                  <VideoIcon className="h-12 w-12 mb-3" />
                  <p className="text-sm">Aún no hay trabajo publicado</p>
                </>
              ) : (
                <>
                  <ImageIcon className="h-12 w-12 mb-3" />
                  <p className="text-sm">Aún no hay posts</p>
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
                </>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-0.5 md:gap-1">
              {activeTab === 'work' ? (
                content.map((item, index) => (
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

                    <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition-colors">
                      <Play className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" fill="white" />
                    </div>

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
                ))
              ) : (
                posts.map((item, index) => (
                  <div
                    key={item.id}
                    className="group relative aspect-[9/16] bg-zinc-900 cursor-pointer overflow-hidden"
                    onClick={() => {
                      if (item.media_type === 'video' && isMobile) {
                        const videoIndex = posts.filter(p => p.media_type === 'video').findIndex(p => p.id === item.id);
                        setInitialVideoIndex(videoIndex);
                        setShowTikTokView(true);
                      } else {
                        setSelectedPost(item);
                      }
                    }}
                  >
                    {item.media_type === 'image' ? (
                      <img
                        src={item.media_url}
                        alt={item.caption || ''}
                        className="w-full h-full object-cover"
                      />
                    ) : item.thumbnail_url ? (
                      <img
                        src={item.thumbnail_url}
                        alt={item.caption || ''}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <video
                        src={item.media_url}
                        className="w-full h-full object-cover"
                        muted
                      />
                    )}

                    {item.media_type === 'video' && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition-colors">
                        <Play className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" fill="white" />
                      </div>
                    )}

                    <div className="absolute inset-0 flex items-center justify-center gap-4 opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                      <div className="flex items-center gap-1 text-white">
                        <Heart className="h-4 w-4" fill="white" />
                        <span className="text-sm font-medium">{(item.likes_count || 0).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
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
                  <p className="text-white text-sm">{selectedPost.caption}</p>
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
          open={showProfileEditor}
          onOpenChange={setShowProfileEditor}
          onSave={fetchData}
        />
      )}
    </div>
  );
}
