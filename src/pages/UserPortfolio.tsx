import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { PortfolioHeader } from '@/components/portfolio/PortfolioHeader';
import { 
  Play, 
  Loader2, 
  User,
  Video as VideoIcon,
  Eye,
  Heart,
  Plus,
  Pencil,
  MessageCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { TikTokFeed } from '@/components/content/TikTokFeed';
import { BunnyVideoCard } from '@/components/content/BunnyVideoCard';
import { MediaCard, type MediaItem } from '@/components/content/MediaCard';
import { FullscreenVideoViewer } from '@/components/content/FullscreenVideoViewer';
import { PortfolioVideoThumbnail } from '@/components/portfolio/PortfolioVideoThumbnail';
import { PortfolioImageThumbnail } from '@/components/portfolio/PortfolioImageThumbnail';
import { VideoPlayerProvider } from '@/contexts/VideoPlayerContext';
import { StoryViewer } from '@/components/portfolio/StoryViewer';
import { StoryRing } from '@/components/portfolio/StoryRing';
import { MediaUploader } from '@/components/portfolio/MediaUploader';
import { ProfileEditor } from '@/components/portfolio/ProfileEditor';
import { FollowButton } from '@/components/portfolio/FollowButton';
import { FollowersDialog } from '@/components/portfolio/FollowersDialog';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { ParsedText } from '@/components/ui/parsed-text';
import { AmbassadorBadge } from '@/components/ui/ambassador-badge';
import { useSeenStories } from '@/hooks/useSeenStories';

interface UserProfile {
  id: string;
  full_name: string;
  username: string | null;
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
  is_published?: boolean;
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
  comments_count: number;
  created_at: string;
  is_pinned: boolean;
  pinned_at: string | null;
  is_liked?: boolean;
}

interface Story {
  id: string;
  media_url: string;
  media_type: string;
  created_at: string;
  expires_at: string;
  music_url?: string | null;
  music_name?: string | null;
  mute_video_audio?: boolean;
  music_volume?: number;
  video_volume?: number;
}

interface ClientInfo {
  id: string;
  name: string;
  logo_url: string | null;
  notes: string | null;
}

type ProfileType = 'user' | 'client';

export default function UserPortfolio() {
  const { id: paramId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, roles } = useAuth();
  const isMobile = useIsMobile();
  const { hasUnseenStories, markMultipleAsSeen } = useSeenStories();
  
  // Check if current user is a client trying to access their own profile
  const isClientUser = roles.includes('client');
  const isAdmin = roles.includes('admin');
  
  const [resolvedUserId, setResolvedUserId] = useState<string | null>(null);
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
  const [showFullscreenViewer, setShowFullscreenViewer] = useState(false);
  const [showStoryViewer, setShowStoryViewer] = useState(false);
  const [showMediaUploader, setShowMediaUploader] = useState(false);
  const [uploaderType, setUploaderType] = useState<'post' | 'story'>('post');
  const [showProfileEditor, setShowProfileEditor] = useState(false);
  const [followCounts, setFollowCounts] = useState({ followers: 0, following: 0 });
  const [isFollowing, setIsFollowing] = useState(false);
  const [showFollowersDialog, setShowFollowersDialog] = useState(false);
  const [followersDialogTab, setFollowersDialogTab] = useState<'followers' | 'following'>('followers');
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [allUsersWithStories, setAllUsersWithStories] = useState<Array<{
    id: string;
    full_name: string;
    avatar_url: string | null;
    has_stories: boolean;
    story_ids: string[];
  }>>([]);
  const [storyViewerUser, setStoryViewerUser] = useState<{
    id: string;
    name: string;
    avatar: string | null;
    stories: Story[];
  } | null>(null);
  const [viewerId] = useState(() => {
    const stored = localStorage.getItem('portfolio_viewer_id');
    if (stored) return stored;
    const newId = crypto.randomUUID();
    localStorage.setItem('portfolio_viewer_id', newId);
    return newId;
  });

  const isOwner = user?.id === resolvedUserId || isAdmin;
  
  // Client users trying to access their own profile should be redirected to their company
  useEffect(() => {
    const redirectClientToCompany = async () => {
      if (isClientUser && user && resolvedUserId === user.id) {
        // Get the client's associated company
        const { data: clientAssoc } = await supabase
          .from('client_users')
          .select('client_id, clients(username)')
          .eq('user_id', user.id)
          .limit(1)
          .maybeSingle();
        
        if (clientAssoc?.client_id) {
          const companyUsername = (clientAssoc as any).clients?.username;
          const path = companyUsername 
            ? `/empresa/@${companyUsername}` 
            : `/empresa/${clientAssoc.client_id}`;
          navigate(path, { replace: true });
        }
      }
    };
    
    if (resolvedUserId && user) {
      redirectClientToCompany();
    }
  }, [resolvedUserId, user, isClientUser, navigate]);

  // Resolve username or UUID to user id
  useEffect(() => {
    const resolveUser = async () => {
      if (!paramId) {
        setLoading(false);
        return;
      }
      
      try {
        // Check if it's a UUID format
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(paramId);
        
        if (isUuid) {
          // First check if this UUID is a company (client)
          const { data: clientData } = await supabase
            .from('clients')
            .select('id, username')
            .eq('id', paramId)
            .maybeSingle();
          
          if (clientData) {
          // It's a company, redirect to company portfolio
            const path = clientData.username 
              ? `/empresa/${clientData.username}` 
              : `/empresa/${clientData.id}`;
            navigate(path, { replace: true });
            return;
          }
          
          // Not a company, assume it's a user
          setResolvedUserId(paramId);
        } else {
          // It's a username, resolve it
          const { data, error } = await supabase
            .from('profiles')
            .select('id')
            .eq('username', paramId)
            .maybeSingle();
          
          if (error) {
            console.error('Error resolving username:', error);
            setResolvedUserId(null);
            setLoading(false);
            return;
          }
          
          if (data) {
            setResolvedUserId(data.id);
          } else {
            // Maybe it's a company username?
            const { data: clientData } = await supabase
              .from('clients')
              .select('id, username')
              .eq('username', paramId)
              .maybeSingle();
            
            if (clientData) {
              // Redirect to company portfolio
              navigate(`/empresa/${clientData.username}`, { replace: true });
              return;
            }
            
            setResolvedUserId(null);
            setLoading(false);
          }
        }
      } catch (error) {
        console.error('Error in resolveUser:', error);
        setResolvedUserId(null);
        setLoading(false);
      }
    };
    
    resolveUser();
  }, [paramId, navigate]);

  // Fetch data when we have a resolved user ID
  // Note: We don't wait for auth to be ready - portfolios should work for anonymous users too
  useEffect(() => {
    if (resolvedUserId) {
      fetchData();
    }
  }, [resolvedUserId]);
  
  // Refetch when auth state changes (to show/hide owner controls)
  useEffect(() => {
    if (resolvedUserId && user !== undefined) {
      fetchData();
    }
  }, [user?.id]);

  const fetchData = async () => {
    const id = resolvedUserId;
    if (!id) {
      console.log('[Portfolio] No resolved user ID, skipping fetch');
      return;
    }
    
    console.log('[Portfolio] Fetching data for user:', id);
    setLoading(true);

    // Check if current user is viewing their own profile
    const isViewingOwnProfile = user?.id === id;

    try {
      // First, try to find as a user profile
      const { data: userData } = await supabase
        .from('profiles')
        .select('id, full_name, username, avatar_url, bio, is_public, is_ambassador')
        .eq('id', id)
        .maybeSingle();

      if (userData) {
        setProfile({
          ...userData,
          username: userData.username ?? null,
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
        // If viewing own profile, show all content; otherwise only published
        let creatorContentQuery = supabase
          .from('content')
          .select('id, title, caption, thumbnail_url, video_url, video_urls, bunny_embed_url, views_count, likes_count, created_at, creator_id, status, is_published')
          .eq('creator_id', id)
          .or('video_url.not.is.null,video_urls.not.is.null')
          .order('created_at', { ascending: false });
        
        if (!isViewingOwnProfile) {
          creatorContentQuery = creatorContentQuery.eq('is_published', true);
        }
        
        const { data: creatorContent } = await creatorContentQuery;

        // Fetch content where user is a collaborator
        const { data: collabData } = await supabase
          .from('content_collaborators')
          .select('content_id')
          .eq('user_id', id);
        
        const collabContentIds = collabData?.map(c => c.content_id) || [];
        
        let collabContent: any[] = [];
        if (collabContentIds.length > 0) {
          let collabQuery = supabase
            .from('content')
            .select('id, title, caption, thumbnail_url, video_url, video_urls, bunny_embed_url, views_count, likes_count, created_at, creator_id, status, is_published')
            .in('id', collabContentIds)
            .or('video_url.not.is.null,video_urls.not.is.null')
            .order('created_at', { ascending: false });
          
          if (!isViewingOwnProfile) {
            collabQuery = collabQuery.eq('is_published', true);
          }
          
          const { data: collabContentData } = await collabQuery;
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
        
        // Get liked post IDs
        const postIds = postsData?.map(p => p.id) || [];
        const { data: postLikedData } = postIds.length > 0 
          ? await supabase.from('portfolio_post_likes').select('post_id').eq('viewer_id', storedViewerId).in('post_id', postIds)
          : { data: [] };
        const postLikedSet = new Set((postLikedData || []).map(l => l.post_id));
        
        const enrichedPosts = (postsData || []).map(p => ({
          ...p,
          is_liked: postLikedSet.has(p.id)
        }));
        setPosts(enrichedPosts);

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
      } else {
        // Try as a client only if user profile was not found
        const { data: clientData } = await supabase
          .from('clients')
          .select('id, name, logo_url, notes')
          .eq('id', id)
          .maybeSingle();

        if (clientData) {
          setClientInfo(clientData);
          setProfileType('client');

          const storedViewerId = localStorage.getItem('portfolio_viewer_id') || '';

          // For clients, show approved/delivered content (not just is_published)
          const { data: clientContentData } = await supabase
            .from('content')
            .select('id, title, caption, thumbnail_url, video_url, video_urls, bunny_embed_url, views_count, likes_count, created_at, creator_id, status, is_published')
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

      // Fetch all public users with active stories (for the stories row)
      const { data: activeStories } = await supabase
        .from('portfolio_stories')
        .select('id, user_id')
        .gt('expires_at', new Date().toISOString());
      
      if (activeStories && activeStories.length > 0) {
        // Group story IDs by user
        const storyIdsByUser = new Map<string, string[]>();
        activeStories.forEach(s => {
          if (!storyIdsByUser.has(s.user_id)) {
            storyIdsByUser.set(s.user_id, []);
          }
          storyIdsByUser.get(s.user_id)!.push(s.id);
        });

        const userIds = [...storyIdsByUser.keys()];
        
        // Get profiles of users with stories
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url, is_public')
          .in('id', userIds)
          .eq('is_public', true);
        
        const usersWithStories = (profiles || []).map(p => ({
          id: p.id,
          full_name: p.full_name,
          avatar_url: p.avatar_url,
          has_stories: true,
          story_ids: storyIdsByUser.get(p.id) || []
        }));
        
        setAllUsersWithStories(usersWithStories);
      } else {
        setAllUsersWithStories([]);
      }

    } catch (error) {
      console.error('[Portfolio] Error fetching data:', error);
    } finally {
      console.log('[Portfolio] Fetch complete, setting loading to false');
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

  // Handle like for portfolio posts
  const handlePostLike = async (postId: string, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    try {
      const { data, error } = await supabase.rpc('toggle_portfolio_post_like', {
        post_uuid: postId,
        viewer: viewerId
      });

      if (error) throw error;

      setPosts(prev => prev.map(item => {
        if (item.id === postId) {
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
      console.error('Error toggling post like:', error);
      toast.error('Error al dar like');
    }
  };

  // Handle view for portfolio posts
  const handlePostView = useCallback(async (postId: string) => {
    try {
      await supabase.rpc('increment_portfolio_post_views', { post_uuid: postId });
      setPosts(prev => prev.map(item => {
        if (item.id === postId) {
          return { ...item, views_count: item.views_count + 1 };
        }
        return item;
      }));
    } catch (error) {
      console.error('Error incrementing post views:', error);
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

  const handleDeleteContent = async (id: string) => {
    const item = allContent.find(c => c.id === id);
    if (!item) return;

    try {
      if (item.type === 'post') {
        const { error } = await supabase
          .from('portfolio_posts')
          .delete()
          .eq('id', id);
        if (error) throw error;
        setPosts(prev => prev.filter(p => p.id !== id));
      } else {
        const { error } = await supabase
          .from('content')
          .delete()
          .eq('id', id);
        if (error) throw error;
        setContent(prev => prev.filter(c => c.id !== id));
      }
      toast.success('Contenido eliminado');
      setShowFullscreenViewer(false);
    } catch (error) {
      console.error('Error deleting content:', error);
      toast.error('Error al eliminar contenido');
    }
  };

  const handleEditContent = (id: string) => {
    // For now, close the viewer and let user edit in the dialog
    setShowFullscreenViewer(false);
    const postItem = posts.find(p => p.id === id);
    if (postItem) {
      setSelectedPost(postItem);
    } else {
      const contentItem = content.find(c => c.id === id);
      if (contentItem) {
        setSelectedContent(contentItem);
      }
    }
    toast.info('Puedes editar el contenido desde el panel de detalles');
  };

  const handleToggleVisibility = async (id: string, makePublic: boolean) => {
    const item = allContent.find(c => c.id === id);
    if (!item) return;

    try {
      if (item.type === 'work') {
        // For content table, toggle is_published
        const { error } = await supabase
          .from('content')
          .update({ is_published: makePublic })
          .eq('id', id);
        if (error) throw error;
        toast.success(makePublic ? 'Contenido visible públicamente' : 'Contenido ocultado');
      }
    } catch (error) {
      console.error('Error toggling visibility:', error);
      toast.error('Error al cambiar visibilidad');
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

  // Load stories for any user
  const handleOpenUserStories = async (userId: string, userName: string, userAvatar: string | null) => {
    try {
      const { data: userStories } = await supabase
        .from('portfolio_stories')
        .select('*')
        .eq('user_id', userId)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: true });

      if (userStories && userStories.length > 0) {
        setStoryViewerUser({
          id: userId,
          name: userName,
          avatar: userAvatar,
          stories: userStories
        });
      }
    } catch (error) {
      console.error('Error loading stories:', error);
    }
  };

  const getVideoUrl = (item: ContentItem | PortfolioPost): string | null => {
    if ('video_urls' in item && item.video_urls && item.video_urls.length > 0) return item.video_urls[0];
    if ('video_url' in item && item.video_url) return item.video_url;
    if ('media_url' in item) return item.media_url;
    return null;
  };

  // Unified content: work + video posts + image posts - ALL MIXED
  const allContent = useMemo(() => {
    const isCreatorRole = userRoles.includes('creator');
    
    // Videos from content table
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
      mediaType: 'video' as const,
      mediaUrl: null as string | null,
      isPinned: item.is_pinned || false,
      isPublished: item.is_published ?? true,
      status: item.status,
      isCreatorOwner: isOwner && profileType === 'user' && isCreatorRole,
    }));
    
    // Video posts from portfolio_posts
    const postVideos = posts.filter(p => p.media_type === 'video').map(item => ({
      id: item.id,
      title: item.caption || '',
      videoUrls: [item.media_url],
      thumbnailUrl: item.thumbnail_url,
      viewsCount: item.views_count || 0,
      likesCount: item.likes_count || 0,
      commentsCount: item.comments_count || 0,
      isLiked: item.is_liked || false,
      createdAt: item.created_at,
      type: 'post' as const,
      mediaType: 'video' as const,
      mediaUrl: item.media_url,
      isPinned: item.is_pinned || false,
      isPublished: true, // Posts are always public
      status: undefined,
      isCreatorOwner: false,
      isPortfolioPost: true,
    }));
    
    // Image posts from portfolio_posts
    const imagePostItems = posts.filter(p => p.media_type === 'image').map(item => ({
      id: item.id,
      title: item.caption || '',
      videoUrls: [] as string[],
      thumbnailUrl: item.media_url,
      viewsCount: item.views_count || 0,
      likesCount: item.likes_count || 0,
      commentsCount: item.comments_count || 0,
      isLiked: item.is_liked || false,
      createdAt: item.created_at,
      type: 'post' as const,
      mediaType: 'image' as const,
      mediaUrl: item.media_url,
      isPinned: item.is_pinned || false,
      isPublished: true, // Posts are always public
      status: undefined,
      isCreatorOwner: false,
      isPortfolioPost: true,
    }));
    
    // Combine all content, sort pinned first, then by date
    const combined = [...workVideos, ...postVideos, ...imagePostItems];
    
    return combined.sort((a, b) => {
      // Pinned items first
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      // Then by date
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [content, posts, isOwner, profileType, userRoles]);

  // Keep allVideos for TikTok feed (only videos)
  const allVideos = useMemo(() => {
    return allContent.filter(item => item.mediaType === 'video');
  }, [allContent]);

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

  // Handle creator status change (assigned -> recording -> recorded)
  const handleCreatorStatusChange = async (contentId: string, newStatus: 'recording' | 'recorded') => {
    try {
      const updateData: any = { status: newStatus };
      
      if (newStatus === 'recorded') {
        updateData.recorded_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('content')
        .update(updateData)
        .eq('id', contentId);

      if (error) throw error;

      // Update local state
      setContent(prev => prev.map(item =>
        item.id === contentId ? { ...item, status: newStatus } : item
      ));
      
      const statusLabels: Record<string, string> = {
        'recording': 'En Grabación',
        'recorded': 'Grabado'
      };
      toast.success(`Estado cambiado a: ${statusLabels[newStatus]}`);
    } catch (error) {
      console.error('Error updating content status:', error);
      toast.error('Error al actualizar el estado');
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
      <div className="min-h-screen bg-black">
        <PortfolioHeader />
        <div className="flex items-center justify-center pt-20">
          <Loader2 className="h-8 w-8 animate-spin text-white/50" />
        </div>
      </div>
    );
  }

  if (!profile && !clientInfo) {
    return (
      <div className="min-h-screen bg-black text-white">
        <PortfolioHeader />
        <div className="flex flex-col items-center justify-center pt-20">
          <User className="h-16 w-16 text-white/30 mb-4" />
          <h2 className="text-xl font-semibold mb-2">Perfil no encontrado</h2>
          <p className="text-white/50">El perfil que buscas no existe o no está disponible.</p>
        </div>
      </div>
    );
  }

  // Private profile check - only show to owner
  if (profile && !profile.is_public && !isOwner) {
    return (
      <div className="min-h-screen bg-black text-white">
        <PortfolioHeader />
        <div className="flex flex-col items-center justify-center pt-20">
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

  // Story viewer - for profile owner's stories
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

  // Story viewer - for other users' stories
  if (storyViewerUser) {
    return (
      <StoryViewer
        stories={storyViewerUser.stories}
        userName={storyViewerUser.name}
        userAvatar={storyViewerUser.avatar}
        onClose={() => setStoryViewerUser(null)}
      />
    );
  }

  

  return (
    <div className="min-h-screen bg-black">
      {/* Portfolio Header */}
      <PortfolioHeader />
      
      <div className="max-w-4xl mx-auto">
        {/* Stories Row - Show all users with stories */}
        {(allUsersWithStories.length > 0 || (stories.length > 0 || isOwner)) && (
          <div className="px-4 pt-4 pb-2 overflow-x-auto">
            <div className="flex gap-3">
              {/* Owner's story ring (if owner and user profile) */}
              {isOwner && profileType === 'user' && (
                <StoryRing
                  avatarUrl={displayAvatar}
                  name="Tu historia"
                  hasStories={stories.length > 0}
                  hasUnseenStories={stories.length > 0 && hasUnseenStories(stories.map(s => s.id))}
                  isOwn={true}
                  onClick={() => {
                    if (stories.length > 0) {
                      markMultipleAsSeen(stories.map(s => s.id));
                      setShowStoryViewer(true);
                    }
                  }}
                  onAddClick={() => openUploader('story')}
                />
              )}
              
              {/* Current profile's stories (if not owner) */}
              {!isOwner && profileType === 'user' && stories.length > 0 && (
                <StoryRing
                  avatarUrl={displayAvatar}
                  name={displayName || ''}
                  hasStories={true}
                  hasUnseenStories={hasUnseenStories(stories.map(s => s.id))}
                  isOwn={false}
                  onClick={() => {
                    markMultipleAsSeen(stories.map(s => s.id));
                    setShowStoryViewer(true);
                  }}
                />
              )}
              
              {/* All other users with stories */}
              {allUsersWithStories
                .filter(u => u.id !== resolvedUserId) // Don't show current profile user again
                .map(u => (
                  <StoryRing
                    key={u.id}
                    avatarUrl={u.avatar_url}
                    name={u.full_name}
                    hasStories={true}
                    hasUnseenStories={hasUnseenStories(u.story_ids)}
                    isOwn={user?.id === u.id}
                    onClick={() => {
                      markMultipleAsSeen(u.story_ids);
                      handleOpenUserStories(u.id, u.full_name, u.avatar_url);
                    }}
                    size="sm"
                  />
                ))}
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
              <div className="flex flex-col items-center md:items-start gap-1 mb-3">
                <h1 className="text-xl md:text-2xl font-bold text-white">
                  {displayName}
                </h1>
                {profile?.username && (
                  <span className="text-sm text-white/60">@{profile.username}</span>
                )}
              </div>
              <div className="flex items-center justify-center md:justify-start gap-3 flex-wrap">
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
                  <>
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
                    {userRoles.includes('creator') && (
                      <Button
                        size="sm"
                        variant="glow"
                        className="gap-1.5"
                        onClick={() => {
                          const agencyWhatsApp = '573113842399';
                          const message = encodeURIComponent(`Hola, Estoy interesado en crear contenido para mi marca con el creador @${profile.username || displayName}`);
                          window.open(`https://wa.me/${agencyWhatsApp}?text=${message}`, '_blank');
                        }}
                      >
                        <MessageCircle className="h-4 w-4" />
                        Contratar
                      </Button>
                    )}
                  </>
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
                    <button 
                      onClick={() => {
                        setFollowersDialogTab('followers');
                        setShowFollowersDialog(true);
                      }}
                      className="text-center hover:opacity-80 transition-opacity"
                    >
                      <span className="block text-lg md:text-xl font-bold text-white">
                        {followCounts.followers.toLocaleString()}
                      </span>
                      <span className="text-xs text-white/50">seguidores</span>
                    </button>
                    <button 
                      onClick={() => {
                        setFollowersDialogTab('following');
                        setShowFollowersDialog(true);
                      }}
                      className="text-center hover:opacity-80 transition-opacity"
                    >
                      <span className="block text-lg md:text-xl font-bold text-white">
                        {followCounts.following.toLocaleString()}
                      </span>
                      <span className="text-xs text-white/50">siguiendo</span>
                    </button>
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

        {/* Unified Content Grid - Mixed Videos and Photos */}
        <div className="px-4 py-6">
          {allContent.length === 0 ? (
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
            // Mobile: Show grid of thumbnails
            <div className="grid grid-cols-3 gap-0.5">
              {allContent.map((item, index) => {
                if (item.mediaType === 'image' && item.mediaUrl) {
                  return (
                    <PortfolioImageThumbnail
                      key={item.id}
                      id={item.id}
                      imageUrl={item.mediaUrl}
                      title={item.title}
                      onClick={() => {
                        setInitialVideoIndex(index);
                        setShowFullscreenViewer(true);
                      }}
                    />
                  );
                }
                
                // Video content
                return (
                  <PortfolioVideoThumbnail
                    key={item.id}
                    id={item.id}
                    thumbnailUrl={item.thumbnailUrl}
                    title={item.title}
                    viewsCount={item.viewsCount}
                    onClick={() => {
                      setInitialVideoIndex(index);
                      setShowFullscreenViewer(true);
                    }}
                  />
                );
              })}
            </div>
          ) : (
            // Desktop: Show grid of thumbnails
            <div className="grid grid-cols-3 gap-0.5">
              {allContent.map((item, index) => {
                if (item.mediaType === 'image' && item.mediaUrl) {
                  return (
                    <PortfolioImageThumbnail
                      key={item.id}
                      id={item.id}
                      imageUrl={item.mediaUrl}
                      title={item.title}
                      onClick={() => {
                        setInitialVideoIndex(index);
                        setShowFullscreenViewer(true);
                      }}
                    />
                  );
                }
                
                // Video content
                return (
                  <PortfolioVideoThumbnail
                    key={item.id}
                    id={item.id}
                    thumbnailUrl={item.thumbnailUrl}
                    title={item.title}
                    viewsCount={item.viewsCount}
                    onClick={() => {
                      setInitialVideoIndex(index);
                      setShowFullscreenViewer(true);
                    }}
                  />
                );
              })}
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
          currentUsername={profile.username}
          currentIsPublic={profile.is_public}
          open={showProfileEditor}
          onOpenChange={setShowProfileEditor}
          onSave={fetchData}
        />
      )}

      {/* Followers/Following Dialog */}
      {resolvedUserId && (
        <FollowersDialog
          open={showFollowersDialog}
          onOpenChange={setShowFollowersDialog}
          userId={resolvedUserId}
          initialTab={followersDialogTab}
        />
      )}

      {/* Fullscreen Content Viewer - TikTok style (handles both images and videos) */}
      {showFullscreenViewer && allContent.length > 0 && (
        <FullscreenVideoViewer
          videos={allContent.map(item => ({
            id: item.id,
            title: item.title,
            videoUrls: item.videoUrls || [],
            thumbnailUrl: item.thumbnailUrl,
            viewsCount: item.viewsCount,
            likesCount: item.likesCount,
            isLiked: item.isLiked,
            creatorId: resolvedUserId || undefined,
            creatorName: profile?.full_name,
            creatorAvatar: profile?.avatar_url || undefined,
            mediaType: item.mediaType,
            mediaUrl: item.mediaUrl,
            isPublic: (item as any).isPublished ?? true,
            caption: (item as any).caption || item.title
          }))}
          initialIndex={initialVideoIndex}
          onClose={() => setShowFullscreenViewer(false)}
          onLike={(id) => {
            const item = allContent.find(v => v.id === id);
            if (item) {
              if (item.type === 'post') {
                handlePostLike(id);
              } else {
                handleLike(id);
              }
            }
          }}
          onView={(id) => {
            const item = allContent.find(v => v.id === id);
            if (item) {
              if (item.type === 'post') {
                handlePostView(id);
              } else {
                handleView(id);
              }
            }
          }}
          onShare={(video) => {
            const url = `${window.location.origin}/p/${resolvedUserId}`;
            if (navigator.share) {
              navigator.share({ title: video.title, url });
            } else {
              navigator.clipboard.writeText(url);
              toast.success('Link copiado al portapapeles');
            }
          }}
          isOwner={isOwner}
          onEdit={handleEditContent}
          onDelete={handleDeleteContent}
          onToggleVisibility={handleToggleVisibility}
          onProfileClick={(creatorId) => {
            navigate(`/p/${creatorId}`);
          }}
          onFollow={async (creatorId) => {
            if (!user) {
              toast.error('Inicia sesión para seguir usuarios');
              return;
            }
            if (user.id === creatorId) return;
            
            try {
              const { data, error } = await supabase.rpc('toggle_follow', {
                _following_id: creatorId,
              });
              if (error) throw error;
              
              const nowFollowing = data as boolean;
              setIsFollowing(nowFollowing);
              setFollowCounts(prev => ({
                ...prev,
                followers: prev.followers + (nowFollowing ? 1 : -1),
              }));
              toast.success(nowFollowing ? 'Siguiendo' : 'Dejaste de seguir');
            } catch (error) {
              console.error('Error toggling follow:', error);
              toast.error('Error al seguir');
            }
          }}
          isFollowing={() => isFollowing}
        />
      )}
    </div>
  );
}
