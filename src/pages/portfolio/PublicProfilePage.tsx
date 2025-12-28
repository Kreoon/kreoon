import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  User, Grid3X3, Play, Heart, ArrowLeft, MapPin, Link as LinkIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { FollowButton } from '@/components/portfolio/FollowButton';
import FeedGridCard from '@/components/portfolio/feed/FeedGridCard';
import FeedGridModal from '@/components/portfolio/feed/FeedGridModal';

interface UserProfile {
  id: string;
  full_name: string;
  avatar_url: string | null;
  bio: string | null;
  city: string | null;
  instagram: string | null;
}

interface FeedItem {
  id: string;
  type: 'work' | 'post';
  title?: string;
  caption?: string;
  media_url: string;
  media_type: 'image' | 'video';
  thumbnail_url?: string;
  user_id: string;
  user_name?: string;
  user_avatar?: string;
  client_name?: string;
  views_count: number;
  likes_count: number;
  comments_count: number;
  created_at: string;
}

function formatCount(count: number): string {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return count.toString();
}

export default function PublicProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const isOwner = user?.id === userId;
  
  // Stats
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [postsCount, setPostsCount] = useState(0);
  const [worksCount, setWorksCount] = useState(0);
  
  // Content
  const [posts, setPosts] = useState<FeedItem[]>([]);
  const [works, setWorks] = useState<FeedItem[]>([]);
  const [loadingContent, setLoadingContent] = useState(false);
  const [activeTab, setActiveTab] = useState('posts');
  
  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    if (userId) {
      // If viewing own profile, redirect to profile page
      if (user?.id === userId) {
        navigate('/social#profile', { replace: true });
        return;
      }
      fetchProfile();
    }
  }, [userId, user?.id]);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, bio, city, instagram')
        .eq('id', userId)
        .single();

      if (error || !profileData) {
        setNotFound(true);
        return;
      }

      setProfile(profileData);

      // Check if current user is following
      if (user?.id && user.id !== userId) {
        const { data: followData } = await supabase
          .from('followers')
          .select('id')
          .eq('follower_id', user.id)
          .eq('following_id', userId)
          .maybeSingle();
        
        setIsFollowing(!!followData);
      }

      // Fetch stats and content in parallel
      await Promise.all([
        fetchStats(userId!),
        fetchContent(userId!),
      ]);
    } catch (error) {
      console.error('Error fetching profile:', error);
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async (uid: string) => {
    const [followersRes, followingRes, postsRes, worksRes] = await Promise.all([
      supabase.from('followers').select('*', { count: 'exact', head: true }).eq('following_id', uid),
      supabase.from('followers').select('*', { count: 'exact', head: true }).eq('follower_id', uid),
      supabase.from('portfolio_posts').select('*', { count: 'exact', head: true }).eq('user_id', uid),
      supabase.from('content').select('*', { count: 'exact', head: true }).eq('creator_id', uid).eq('is_published', true),
    ]);
    
    setFollowersCount(followersRes.count || 0);
    setFollowingCount(followingRes.count || 0);
    setPostsCount(postsRes.count || 0);
    setWorksCount(worksRes.count || 0);
  };

  const fetchContent = async (uid: string) => {
    setLoadingContent(true);
    try {
      const [postsData, worksData] = await Promise.all([
        supabase
          .from('portfolio_posts')
          .select('id, user_id, media_url, media_type, thumbnail_url, caption, views_count, likes_count, comments_count, created_at')
          .eq('user_id', uid)
          .order('created_at', { ascending: false })
          .limit(50),
        supabase
          .from('content')
          .select('id, title, video_url, video_urls, bunny_embed_url, thumbnail_url, creator_id, client_id, views_count, likes_count, created_at')
          .eq('creator_id', uid)
          .eq('is_published', true)
          .or('video_url.not.is.null,bunny_embed_url.not.is.null,video_urls.not.is.null')
          .order('created_at', { ascending: false })
          .limit(50),
      ]);

      // Transform posts
      const postItems: FeedItem[] = (postsData.data || []).map(p => ({
        id: p.id,
        type: 'post' as const,
        caption: p.caption,
        media_url: p.media_url,
        media_type: p.media_type as 'image' | 'video',
        thumbnail_url: p.thumbnail_url || undefined,
        user_id: p.user_id,
        views_count: p.views_count || 0,
        likes_count: p.likes_count || 0,
        comments_count: p.comments_count || 0,
        created_at: p.created_at,
      }));

      // Get client names for works
      const clientIds = [...new Set((worksData.data || []).map(w => w.client_id).filter(Boolean))] as string[];
      const { data: clients } = clientIds.length > 0
        ? await supabase.from('clients').select('id, name').in('id', clientIds)
        : { data: [] };
      const clientsMap = new Map((clients || []).map(c => [c.id, c.name]));

      // Transform works
      const workItems: FeedItem[] = (worksData.data || []).map(w => {
        const videoUrls = w.video_urls as string[] | null;
        const directVideoUrl = videoUrls && videoUrls.length > 0 
          ? videoUrls[0] 
          : w.video_url || w.bunny_embed_url;

        return {
          id: w.id,
          type: 'work' as const,
          title: w.title,
          media_url: directVideoUrl,
          media_type: 'video' as const,
          thumbnail_url: w.thumbnail_url || undefined,
          user_id: w.creator_id || '',
          client_name: w.client_id ? clientsMap.get(w.client_id) : undefined,
          views_count: w.views_count || 0,
          likes_count: w.likes_count || 0,
          comments_count: 0,
          created_at: w.created_at,
        };
      });

      setPosts(postItems);
      setWorks(workItems);
    } catch (error) {
      console.error('Error fetching content:', error);
    } finally {
      setLoadingContent(false);
    }
  };

  const currentItems = activeTab === 'posts' ? posts : works;

  const handleCardClick = (index: number) => {
    setSelectedIndex(index);
    setModalOpen(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="flex items-start gap-6">
            <Skeleton className="w-24 h-24 rounded-full" />
            <div className="flex-1 space-y-3">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-64" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (notFound || !profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <User className="h-16 w-16 mx-auto text-muted-foreground" />
          <h1 className="text-xl font-semibold">Usuario no encontrado</h1>
          <p className="text-muted-foreground">Este perfil no existe.</p>
          <Button onClick={() => navigate('/social')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver al feed
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-lg border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="font-semibold truncate">{profile.full_name}</h1>
          </div>
        </div>
      </header>

      <ScrollArea className="h-[calc(100vh-60px)]">
        <div className="max-w-4xl mx-auto px-4 py-6">
          {/* Profile Section */}
          <div className="flex flex-col md:flex-row items-start gap-6 mb-8">
            {/* Avatar */}
            <Avatar className="w-24 h-24 md:w-32 md:h-32 border-2 border-border">
              <AvatarImage src={profile.avatar_url || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary text-2xl">
                {profile.full_name?.charAt(0) || 'U'}
              </AvatarFallback>
            </Avatar>

            {/* Info */}
            <div className="flex-1 space-y-3">
              <h2 className="text-xl font-bold">{profile.full_name}</h2>

              {/* Stats */}
              <div className="flex items-center gap-6 text-sm">
                <div className="text-center">
                  <span className="font-bold">{postsCount}</span>
                  <span className="text-muted-foreground ml-1">posts</span>
                </div>
                <div className="text-center">
                  <span className="font-bold">{worksCount}</span>
                  <span className="text-muted-foreground ml-1">trabajos</span>
                </div>
                <div className="text-center">
                  <span className="font-bold">{formatCount(followersCount)}</span>
                  <span className="text-muted-foreground ml-1">seguidores</span>
                </div>
                <div className="text-center">
                  <span className="font-bold">{formatCount(followingCount)}</span>
                  <span className="text-muted-foreground ml-1">siguiendo</span>
                </div>
              </div>

              {/* Bio */}
              {profile.bio && (
                <p className="text-sm">{profile.bio}</p>
              )}

              {/* Meta info */}
              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                {profile.city && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {profile.city}
                  </span>
                )}
                {profile.instagram && (
                  <a 
                    href={`https://instagram.com/${profile.instagram.replace('@', '')}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-primary hover:underline"
                  >
                    <LinkIcon className="h-3 w-3" />
                    @{profile.instagram.replace('@', '')}
                  </a>
                )}
              </div>

              {/* Follow button */}
              {user?.id && !isOwner && (
                <FollowButton 
                  userId={profile.id} 
                  initialIsFollowing={isFollowing}
                  onFollowChange={setIsFollowing}
                />
              )}
            </div>
          </div>

          {/* Content Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full justify-start border-b rounded-none bg-transparent p-0">
              <TabsTrigger 
                value="posts" 
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
              >
                <Grid3X3 className="h-4 w-4 mr-2" />
                Posts ({postsCount})
              </TabsTrigger>
              <TabsTrigger 
                value="works"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
              >
                <Play className="h-4 w-4 mr-2" />
                Trabajos ({worksCount})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="posts" className="mt-4">
              {loadingContent ? (
                <div className="grid grid-cols-3 gap-1">
                  {Array.from({ length: 9 }).map((_, i) => (
                    <Skeleton key={i} className="aspect-square" />
                  ))}
                </div>
              ) : posts.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Grid3X3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Aún no hay posts</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-1">
                  {posts.map((item, index) => (
                    <FeedGridCard
                      key={item.id}
                      item={item}
                      onClick={() => handleCardClick(index)}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="works" className="mt-4">
              {loadingContent ? (
                <div className="grid grid-cols-3 gap-1">
                  {Array.from({ length: 9 }).map((_, i) => (
                    <Skeleton key={i} className="aspect-square" />
                  ))}
                </div>
              ) : works.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Play className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Aún no hay trabajos publicados</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-1">
                  {works.map((item, index) => (
                    <FeedGridCard
                      key={item.id}
                      item={item}
                      onClick={() => handleCardClick(index)}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </ScrollArea>

      {/* Content Modal */}
      <FeedGridModal
        items={currentItems}
        initialIndex={selectedIndex}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={() => {}}
        isSaved={() => false}
      />
    </div>
  );
}