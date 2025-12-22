import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Play, Filter, X, Home, User, LogOut, Users, Sparkles, UserPlus, Search, Image as ImageIcon, RefreshCw } from "lucide-react";
import { SmartSearch } from "@/components/portfolio/SmartSearch";
import { PortfolioHeader } from "@/components/portfolio/PortfolioHeader";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CommentsSection } from "@/components/content/CommentsSection";
import { VideoPlayerProvider } from "@/contexts/VideoPlayerContext";
import { BunnyVideoCard } from "@/components/content/BunnyVideoCard";
import { MediaCard, type MediaItem } from "@/components/content/MediaCard";
import { TikTokFeed } from "@/components/content/TikTokFeed";
import { useIsMobile } from "@/hooks/use-mobile";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StoryRing } from "@/components/portfolio/StoryRing";
import { useSeenStories } from "@/hooks/useSeenStories";

interface PublishedContent {
  id: string;
  title: string;
  video_url: string | null;
  video_urls: string[] | null;
  thumbnail_url: string | null;
  creator_id: string | null;
  client: { id: string; name: string; logo_url: string | null } | null;
  creator: { id: string; full_name: string; avatar_url: string | null } | null;
  created_at: string;
  views_count: number;
  likes_count: number;
  is_liked: boolean;
  type?: 'content' | 'post';
  can_interact?: boolean;
  media_type?: 'video' | 'image';
  media_url?: string;
  score?: number;
}

interface FollowingUser {
  id: string;
  full_name: string;
  avatar_url: string | null;
  has_stories: boolean;
  story_ids: string[];
}

// Helper to get all video URLs for a content item
function getVideoUrls(item: PublishedContent): string[] {
  const urls: string[] = [];
  
  if (item.video_urls && item.video_urls.length > 0) {
    urls.push(...item.video_urls.filter(u => u && u.trim()));
  }
  
  if (item.video_url && !urls.includes(item.video_url)) {
    urls.unshift(item.video_url);
  }
  
  return urls;
}

// AI-powered shuffle with engagement and recency weighting
function aiShuffle<T extends { score?: number; created_at?: string; views_count?: number; likes_count?: number }>(array: T[]): T[] {
  const seed = new Date().toISOString().slice(0, 13); // Changes hourly
  const shuffled = [...array];
  
  // Score each item if not already scored
  const scored = shuffled.map((item, idx) => {
    if (item.score !== undefined) return { item, score: item.score };
    
    let score = 0;
    const now = Date.now();
    const createdAt = item.created_at ? new Date(item.created_at).getTime() : now;
    const ageHours = (now - createdAt) / (1000 * 60 * 60);
    
    // Recency boost
    if (ageHours < 24) score += 50;
    else if (ageHours < 72) score += 30;
    else if (ageHours < 168) score += 15;
    
    // Engagement boost
    const likes = (item as any).likes_count || 0;
    const views = (item as any).views_count || 0;
    score += Math.min(25, Math.log10(likes + 1) * 8 + Math.log10(views + 1) * 3);
    
    // Random factor for variety
    let hash = 0;
    const seedStr = seed + idx.toString();
    for (let i = 0; i < seedStr.length; i++) {
      hash = ((hash << 5) - hash) + seedStr.charCodeAt(i);
      hash |= 0;
    }
    score += (Math.abs(hash) % 20) - 10;
    
    return { item, score };
  });
  
  // Sort by score with some randomness
  scored.sort((a, b) => b.score - a.score);
  
  return scored.map(s => s.item);
}

type FeedTab = 'for-you' | 'following';

export default function Portfolio() {
  const { user, roles, signOut } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { hasUnseenStories, markAsSeen } = useSeenStories();
  const isAdmin = roles.includes('admin');
  const isLoggedIn = !!user;
  const [content, setContent] = useState<PublishedContent[]>([]);
  const [followingContent, setFollowingContent] = useState<PublishedContent[]>([]);
  const [followingUsers, setFollowingUsers] = useState<FollowingUser[]>([]);
  const [allUsersWithStories, setAllUsersWithStories] = useState<FollowingUser[]>([]);
  const [followingIds, setFollowingIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<FeedTab>('for-you');
  const [userProfile, setUserProfile] = useState<{ full_name: string; avatar_url: string | null } | null>(null);
  const [commentDialogOpen, setCommentDialogOpen] = useState(false);
  const [selectedContentId, setSelectedContentId] = useState<string | null>(null);
  const lastRefreshRef = useRef<number>(0);
  const [viewerId] = useState(() => {
    const stored = localStorage.getItem('portfolio_viewer_id');
    if (stored) return stored;
    const newId = crypto.randomUUID();
    localStorage.setItem('portfolio_viewer_id', newId);
    return newId;
  });

  useEffect(() => {
    fetchPublishedContent();
    fetchAllStories();
    if (user?.id) {
      fetchUserProfile();
      fetchFollowingData();
    }
  }, [user?.id]);

  // Fetch all users with active stories for the "For You" feed
  const fetchAllStories = async () => {
    try {
      // Get all active stories with their IDs
      const { data: storiesData } = await supabase
        .from('portfolio_stories')
        .select('id, user_id')
        .gt('expires_at', new Date().toISOString());
      
      if (!storiesData || storiesData.length === 0) {
        setAllUsersWithStories([]);
        return;
      }

      // Group story IDs by user
      const storyIdsByUser = new Map<string, string[]>();
      storiesData.forEach(s => {
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
      
      const usersWithStories: FollowingUser[] = (profiles || []).map(p => ({
        id: p.id,
        full_name: p.full_name,
        avatar_url: p.avatar_url,
        has_stories: true,
        story_ids: storyIdsByUser.get(p.id) || []
      }));
      
      setAllUsersWithStories(usersWithStories);
    } catch (error) {
      console.error('Error fetching stories:', error);
    }
  };

  const fetchUserProfile = async () => {
    if (!user?.id) return;
    const { data } = await supabase
      .from('profiles')
      .select('full_name, avatar_url')
      .eq('id', user.id)
      .maybeSingle();
    if (data) setUserProfile(data);
  };

  const fetchFollowingData = async () => {
    if (!user?.id) return;

    try {
      // Get users I follow
      const { data: followingData } = await supabase
        .from('followers')
        .select('following_id')
        .eq('follower_id', user.id);

      const ids = followingData?.map(f => f.following_id) || [];
      setFollowingIds(ids);

      if (ids.length > 0) {
        // Get profiles of users I follow
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .in('id', ids);

        // Check which ones have active stories and get their IDs
        const { data: storiesData } = await supabase
          .from('portfolio_stories')
          .select('id, user_id')
          .in('user_id', ids)
          .gt('expires_at', new Date().toISOString());

        // Group story IDs by user
        const storyIdsByUser = new Map<string, string[]>();
        (storiesData || []).forEach(s => {
          if (!storyIdsByUser.has(s.user_id)) {
            storyIdsByUser.set(s.user_id, []);
          }
          storyIdsByUser.get(s.user_id)!.push(s.id);
        });

        const usersWithStoryFlag: FollowingUser[] = (profiles || []).map(p => ({
          ...p,
          has_stories: storyIdsByUser.has(p.id),
          story_ids: storyIdsByUser.get(p.id) || []
        }));

        // Sort: users with stories first
        usersWithStoryFlag.sort((a, b) => {
          if (a.has_stories && !b.has_stories) return -1;
          if (!a.has_stories && b.has_stories) return 1;
          return 0;
        });

        setFollowingUsers(usersWithStoryFlag);

        // Fetch content from followed users (creators) - includes posts too
        const [{ data: contentData }, { data: postData }] = await Promise.all([
          supabase
            .from('content')
            .select(`
              id,
              title,
              video_url,
              video_urls,
              thumbnail_url,
              created_at,
              creator_id,
              client_id,
              views_count,
              likes_count
            `)
            .eq('is_published', true)
            .in('creator_id', ids)
            .or('video_url.not.is.null,video_urls.not.is.null')
            .order('created_at', { ascending: false }),
          supabase
            .from('portfolio_posts')
            .select('id, user_id, media_url, media_type, thumbnail_url, caption, created_at, views_count, likes_count')
            .in('user_id', ids)
            .order('created_at', { ascending: false })
        ]);

        // Map posts to unified format
        const mappedPosts = (postData || []).map(p => ({
          id: p.id,
          title: p.caption || '',
          video_url: p.media_type === 'video' ? p.media_url : null,
          video_urls: null,
          thumbnail_url: p.thumbnail_url,
          created_at: p.created_at,
          creator_id: p.user_id,
          client_id: null,
          views_count: p.views_count || 0,
          likes_count: p.likes_count || 0,
          type: 'post' as const,
          can_interact: true,
          media_type: p.media_type as 'video' | 'image',
          media_url: p.media_url,
        }));

        const allFollowingContent = [
          ...(contentData || []).map(c => ({ ...c, type: 'content' as const, can_interact: true })),
          ...mappedPosts,
        ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

        if (allFollowingContent.length > 0) {
          const enrichedContent = await enrichContent(allFollowingContent);
          setFollowingContent(enrichedContent);
        }
      }
    } catch (error) {
      console.error('Error fetching following data:', error);
    }
  };

  const enrichContent = async (data: any[]): Promise<PublishedContent[]> => {
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

    return data.map(item => ({
      id: item.id,
      title: item.title,
      video_url: item.video_url,
      video_urls: item.video_urls,
      thumbnail_url: item.thumbnail_url,
      created_at: item.created_at,
      creator_id: item.creator_id,
      views_count: item.views_count || 0,
      likes_count: item.likes_count || 0,
      is_liked: likedSet.has(item.id),
      client: item.client_id ? clientsMap.get(item.client_id) || null : null,
      creator: item.creator_id ? creatorsMap.get(item.creator_id) || null : null,
      type: item.type || 'content',
      can_interact: item.can_interact ?? true,
      media_type: (item as any).media_type,
      media_url: (item as any).media_url,
      score: (item as any).score,
    }));
  };

  const fetchPublishedContent = async () => {
    try {
      const [{ data: contentData, error: contentError }, { data: postData, error: postError }] = await Promise.all([
        supabase
          .from('content')
          .select(`
            id,
            title,
            video_url,
            video_urls,
            thumbnail_url,
            created_at,
            creator_id,
            client_id,
            views_count,
            likes_count
          `)
          .eq('is_published', true)
          .or('video_url.not.is.null,video_urls.not.is.null')
          .order('created_at', { ascending: false }),
        supabase
          .from('portfolio_posts')
          .select('id, user_id, media_url, media_type, thumbnail_url, caption, created_at, views_count, likes_count')
          .order('created_at', { ascending: false })
          .limit(200)
      ]);

      if (contentError) throw contentError;
      if (postError) throw postError;

      // Filter posts to only public profiles
      const postUserIds = [...new Set((postData || []).map(p => p.user_id))] as string[];
      const { data: postProfiles } = postUserIds.length
        ? await supabase.from('profiles').select('id, is_public, full_name, avatar_url').in('id', postUserIds)
        : { data: [] };

      const publicUserIds = new Set((postProfiles || []).filter(p => (p as any).is_public !== false).map(p => p.id));
      const profilesMap = new Map((postProfiles || []).map(p => [p.id, p]));

      const mappedPosts = (postData || [])
        .filter(p => publicUserIds.has(p.user_id))
        .map(p => {
          const profile = profilesMap.get(p.user_id);
          return {
            id: p.id,
            title: p.caption || '',
            video_url: p.media_type === 'video' ? p.media_url : null,
            video_urls: null,
            thumbnail_url: p.thumbnail_url,
            created_at: p.created_at,
            creator_id: p.user_id,
            client_id: null,
            views_count: p.views_count || 0,
            likes_count: p.likes_count || 0,
            type: 'post' as const,
            can_interact: false,
            media_type: p.media_type as 'video' | 'image',
            media_url: p.media_url,
            creator: profile ? { id: profile.id, full_name: profile.full_name, avatar_url: profile.avatar_url } : null,
          };
        });

      const merged = [
        ...(contentData || []).map(c => ({ ...c, type: 'content' as const, can_interact: true, media_type: 'video' as const })),
        ...mappedPosts,
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      if (merged.length > 0) {
        const enrichedData = await enrichContent(merged);
        setContent(enrichedData);
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

      const updateContent = (items: PublishedContent[]) => 
        items.map(item => {
          if (item.id === contentId) {
            return {
              ...item,
              is_liked: data,
              likes_count: data ? item.likes_count + 1 : Math.max(0, item.likes_count - 1)
            };
          }
          return item;
        });

      setContent(updateContent);
      setFollowingContent(updateContent);

      toast.success(data ? '❤️ Me gusta' : 'Ya no te gusta');
    } catch (error) {
      console.error('Error toggling like:', error);
      toast.error('Error al dar like');
    }
  };

  const handleView = useCallback(async (contentId: string) => {
    try {
      await supabase.rpc('increment_content_views', { content_uuid: contentId });
      
      const updateContent = (items: PublishedContent[]) => 
        items.map(item => {
          if (item.id === contentId) {
            return { ...item, views_count: item.views_count + 1 };
          }
          return item;
        });

      setContent(updateContent);
      setFollowingContent(updateContent);
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

  // Refresh feed with new AI recommendations
  const handleRefreshFeed = async () => {
    if (refreshing) return;
    const now = Date.now();
    if (now - lastRefreshRef.current < 5000) {
      toast.info('Espera unos segundos para refrescar');
      return;
    }
    lastRefreshRef.current = now;
    setRefreshing(true);
    await fetchPublishedContent();
    setRefreshing(false);
    toast.success('Feed actualizado con nuevas recomendaciones');
  };

  // Get current content based on tab with AI-powered ordering
  const currentContent = useMemo(() => {
    const items = activeTab === 'following' ? followingContent : content;
    // Include all media types
    const filtered = items.filter(item => {
      const hasVideos = getVideoUrls(item).length > 0;
      const hasImage = (item as any).media_type === 'image' && (item as any).media_url;
      return hasVideos || hasImage;
    });
    
    // Apply AI shuffle for "for-you" tab
    if (activeTab === 'for-you') {
      return aiShuffle(filtered);
    }
    
    // For following tab, sort by recency with followed users first
    return filtered.sort((a, b) => {
      // Prioritize content from followed users
      const aIsFollowed = a.creator_id && followingIds.includes(a.creator_id);
      const bIsFollowed = b.creator_id && followingIds.includes(b.creator_id);
      if (aIsFollowed && !bIsFollowed) return -1;
      if (!aIsFollowed && bIsFollowed) return 1;
      // Then by recency
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [content, followingContent, activeTab, followingIds]);

  // Separate video content for TikTok feed (mobile)
  const videoContent = useMemo(() => {
    return currentContent.filter(item => getVideoUrls(item).length > 0);
  }, [currentContent]);

  // Prepare videos for TikTok feed (only videos, not images)
  const tikTokVideos = useMemo(() => {
    return videoContent.map(item => ({
      id: item.id,
      title: item.title,
      videoUrls: getVideoUrls(item),
      thumbnailUrl: item.thumbnail_url,
      viewsCount: item.views_count,
      likesCount: item.likes_count,
      isLiked: item.is_liked,
      creatorName: item.creator?.full_name,
      creatorId: item.creator_id,
      creatorAvatar: item.creator?.avatar_url,
      canInteract: (item as any).can_interact !== false,
    }));
  }, [videoContent]);

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
      <div className="min-h-screen bg-black p-4">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="aspect-[9/16] rounded-2xl bg-white/10" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (currentContent.length === 0) {
    return (
      <div className="min-h-screen bg-black flex flex-col">
        {/* Shared Header */}
        <PortfolioHeader 
          onRefresh={handleRefreshFeed}
          refreshing={refreshing}
          showTabs={isLoggedIn}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />

        <div className="flex-1 flex items-center justify-center text-white">
          <div className="text-center p-6">
            {activeTab === 'following' ? (
              <>
                <Users className="h-16 w-16 mx-auto mb-4 opacity-50 text-primary" />
                <h2 className="text-xl font-semibold mb-2">Sin contenido de seguidos</h2>
                <p className="text-white/60 mb-4">Sigue a creadores para ver su contenido aquí</p>
                <Button onClick={() => setActiveTab('for-you')} className="bg-gradient-gold text-black">
                  <Sparkles className="h-4 w-4 mr-2" />
                  Explorar Para Ti
                </Button>
              </>
            ) : (
              <>
                <Play className="h-16 w-16 mx-auto mb-4 opacity-50 text-primary" />
                <h2 className="text-xl font-semibold mb-2">No hay contenido publicado</h2>
                <p className="text-white/60">Próximamente verás aquí nuestro portafolio</p>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Mobile view - mix of TikTok feed for videos and grid for images
  if (isMobile) {
    const imageContent = currentContent.filter(item => (item as any).media_type === 'image' && (item as any).media_url);
    const hasVideos = tikTokVideos.length > 0;
    const hasImages = imageContent.length > 0;

    return (
      <VideoPlayerProvider>
        <div className="min-h-screen bg-black overflow-auto">
          {/* Shared header component for mobile */}
          <PortfolioHeader 
            onRefresh={handleRefreshFeed}
            refreshing={refreshing}
            showTabs={true}
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />

          {/* Stories Row - Always show all stories in both tabs */}
          {(() => {
            // Combine stories from followed users and all public users
            const followingWithStories = followingUsers.filter(u => u.has_stories);
            const allWithStories = allUsersWithStories;
            
            // Merge and dedupe, keeping followed users first
            const seenIds = new Set<string>();
            const storiesToShow: FollowingUser[] = [];
            
            // First add followed users with stories
            followingWithStories.forEach(u => {
              if (!seenIds.has(u.id)) {
                seenIds.add(u.id);
                storiesToShow.push(u);
              }
            });
            
            // Then add other public users with stories
            allWithStories.forEach(u => {
              if (!seenIds.has(u.id)) {
                seenIds.add(u.id);
                storiesToShow.push(u);
              }
            });
            
            if (storiesToShow.length === 0) return null;
            
            return (
              <div className="px-4 py-2 overflow-x-auto">
                <div className="flex gap-3">
                  {storiesToShow.map(u => (
                    <StoryRing
                      key={u.id}
                      avatarUrl={u.avatar_url}
                      name={u.full_name}
                      hasStories={true}
                      hasUnseenStories={hasUnseenStories(u.story_ids)}
                      isOwn={user?.id === u.id}
                      onClick={() => navigate(`/p/${u.id}`)}
                      size="sm"
                    />
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Mixed Feed - Videos and Images together ordered by date */}
          <section className="px-4 pb-8">
            <div className="grid grid-cols-2 gap-3">
              {currentContent.map((item) => {
                const videoUrls = getVideoUrls(item);
                const isImagePost = item.media_type === 'image' && item.media_url;
                const canInteract = item.can_interact !== false;

                // Image post
                if (isImagePost) {
                  const media: MediaItem[] = [{ url: item.media_url!, type: 'image' }];
                  return (
                    <MediaCard
                      key={item.id}
                      id={item.id}
                      title={item.title}
                      media={media}
                      viewsCount={item.views_count}
                      likesCount={item.likes_count}
                      isLiked={item.is_liked}
                      creatorId={item.creator_id || undefined}
                      creatorName={item.creator?.full_name}
                      creatorAvatar={item.creator?.avatar_url}
                      onShare={() => handleShare(item)}
                    />
                  );
                }

                // Video content
                return (
                  <BunnyVideoCard
                    key={item.id}
                    id={item.id}
                    title={item.title}
                    videoUrls={videoUrls}
                    thumbnailUrl={item.thumbnail_url}
                    viewsCount={item.views_count}
                    likesCount={item.likes_count}
                    isLiked={item.is_liked}
                    creatorId={item.creator_id || undefined}
                    creatorName={item.creator?.full_name}
                    isAdmin={isAdmin}
                    onLike={canInteract ? (e) => handleLike(item.id, e) : undefined}
                    onView={canInteract ? () => handleView(item.id) : undefined}
                    onShare={() => handleShare(item)}
                    onComment={canInteract ? () => {
                      setSelectedContentId(item.id);
                      setCommentDialogOpen(true);
                    } : undefined}
                  />
                );
              })}
            </div>
          </section>

          {/* Comments Dialog */}
          <Dialog open={commentDialogOpen} onOpenChange={setCommentDialogOpen}>
            <DialogContent className="max-w-lg bg-zinc-900 border-white/10">
              <DialogHeader>
                <DialogTitle className="text-white">Comentarios</DialogTitle>
              </DialogHeader>
              {selectedContentId && (
                <CommentsSection contentId={selectedContentId} />
              )}
            </DialogContent>
          </Dialog>
        </div>
      </VideoPlayerProvider>
    );
  }

  // Desktop view
  return (
    <VideoPlayerProvider>
      <div className="min-h-screen bg-black">
        {/* Shared Header - same as mobile for consistency */}
        <PortfolioHeader 
          onRefresh={handleRefreshFeed}
          refreshing={refreshing}
          showTabs={isLoggedIn}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />

        {/* Stories Row - Always show all stories in both tabs */}
        {(() => {
          // Combine stories from followed users and all public users
          const followingWithStories = followingUsers.filter(u => u.has_stories);
          const allWithStories = allUsersWithStories;
          
          // Merge and dedupe, keeping followed users first
          const seenIds = new Set<string>();
          const storiesToShow: FollowingUser[] = [];
          
          // First add followed users with stories
          followingWithStories.forEach(u => {
            if (!seenIds.has(u.id)) {
              seenIds.add(u.id);
              storiesToShow.push(u);
            }
          });
          
          // Then add other public users with stories
          allWithStories.forEach(u => {
            if (!seenIds.has(u.id)) {
              seenIds.add(u.id);
              storiesToShow.push(u);
            }
          });
          
          if (storiesToShow.length === 0) return null;
          
          return (
            <div className="max-w-4xl mx-auto px-4 py-4 overflow-x-auto border-b border-white/5">
              <div className="flex gap-4">
                {storiesToShow.map(u => (
                  <StoryRing
                    key={u.id}
                    avatarUrl={u.avatar_url}
                    name={u.full_name}
                    hasStories={true}
                    hasUnseenStories={hasUnseenStories(u.story_ids)}
                    isOwn={user?.id === u.id}
                    onClick={() => navigate(`/p/${u.id}`)}
                  />
                ))}
              </div>
            </div>
          );
        })()}

        {/* Content Grid (Videos + Images) */}
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
            {currentContent.map((item) => {
              const videoUrls = getVideoUrls(item);
              const isImagePost = (item as any).media_type === 'image' && (item as any).media_url;
              const canInteract = (item as any).can_interact !== false;

              // Image post
              if (isImagePost) {
                const media: MediaItem[] = [{ url: (item as any).media_url, type: 'image' }];
                return (
                  <MediaCard
                    key={item.id}
                    id={item.id}
                    title={item.title}
                    media={media}
                    viewsCount={item.views_count}
                    likesCount={item.likes_count}
                    isLiked={item.is_liked}
                    creatorId={item.creator_id || undefined}
                    creatorName={item.creator?.full_name}
                    creatorAvatar={item.creator?.avatar_url}
                    onShare={() => handleShare(item)}
                  />
                );
              }

              // Video content
              return (
                <BunnyVideoCard
                  key={item.id}
                  id={item.id}
                  title={item.title}
                  videoUrls={videoUrls}
                  thumbnailUrl={item.thumbnail_url}
                  viewsCount={item.views_count}
                  likesCount={item.likes_count}
                  isLiked={item.is_liked}
                  creatorId={item.creator_id || undefined}
                  creatorName={item.creator?.full_name}
                  isAdmin={isAdmin}
                  onLike={canInteract ? (e) => handleLike(item.id, e) : undefined}
                  onView={canInteract ? () => handleView(item.id) : undefined}
                  onShare={() => handleShare(item)}
                  onComment={canInteract ? () => {
                    setSelectedContentId(item.id);
                    setCommentDialogOpen(true);
                  } : undefined}
                />
              );
            })}
          </div>
        </div>

        {/* Comments Dialog */}
        <Dialog open={commentDialogOpen} onOpenChange={setCommentDialogOpen}>
          <DialogContent className="max-w-lg bg-zinc-900 border-white/10">
            <DialogHeader>
              <DialogTitle className="text-white">Comentarios</DialogTitle>
            </DialogHeader>
            {selectedContentId && (
              <CommentsSection contentId={selectedContentId} />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </VideoPlayerProvider>
  );
}
