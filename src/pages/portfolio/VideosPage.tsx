import { useState, useEffect, useCallback, useRef, memo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useSavedItems } from '@/hooks/useSavedItems';
import { cn } from '@/lib/utils';
import { Heart, MessageCircle, Bookmark, Share2, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Drawer, DrawerContent } from '@/components/ui/drawer';
import { useNavigate } from 'react-router-dom';
import { HLSVideoPlayer } from '@/components/video';
import { getBunnyVideoUrls } from '@/hooks/useHLSPlayer';
import { PortfolioCommentsSection } from '@/components/content/PortfolioCommentsSection';

interface VideoItem {
  id: string;
  type: 'work' | 'post';
  title?: string;
  caption?: string;
  video_url: string;
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

type VideoFilter = 'all' | 'work' | 'posts';

// Memoized video slide component
interface VideoSlideProps {
  video: VideoItem;
  isActive: boolean;
  isMuted: boolean;
  onMuteToggle: () => void;
  onSave: () => void;
  isSaved: boolean;
  onProfileClick: (userId: string) => void;
  onOpenComments: () => void;
}

const VideoSlide = memo(function VideoSlide({
  video,
  isActive,
  isMuted,
  onMuteToggle,
  onSave,
  isSaved,
  onProfileClick,
  onOpenComments
}: VideoSlideProps) {
  const [isLiked, setIsLiked] = useState(false);
  const [showHeart, setShowHeart] = useState(false);
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const directVideoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<import('@/components/video').HLSVideoPlayerRef>(null);

  // Get video source - try Bunny HLS first, fallback to direct URL
  const bunnyUrls = getBunnyVideoUrls(video.video_url);
  const videoSrc = bunnyUrls?.hls || video.video_url;
  const posterSrc = video.thumbnail_url || bunnyUrls?.thumbnail;

  // Check if it's a direct video file (mp4, etc) vs HLS/embed
  const isDirectVideo = video.video_url.match(/\.(mp4|webm|mov)(\?|$)/i) ||
                        video.video_url.includes('supabase.co/storage');

  // Hard guarantee: pause when not active (fixes audio continuing on scroll)
  useEffect(() => {
    if (isDirectVideo) {
      const el = directVideoRef.current;
      if (!el) return;
      el.muted = isMuted;
      if (isActive) {
        el.play().catch(() => {
          el.muted = true;
          el.play().catch(() => {});
        });
      } else {
        el.pause();
      }
      return;
    }

    // HLS player
    hlsRef.current?.setMuted(isMuted);
    if (isActive) hlsRef.current?.play();
    else hlsRef.current?.pause();
  }, [isActive, isMuted, isDirectVideo]);

  const handleDoubleTap = useCallback(() => {
    if (!isLiked) {
      setIsLiked(true);
      setShowHeart(true);
      setTimeout(() => setShowHeart(false), 1000);
    }
  }, [isLiked]);

  return (
    <div
      ref={videoContainerRef}
      className="h-full w-full snap-start relative flex items-center justify-center bg-black"
      onDoubleClick={handleDoubleTap}
    >
      {isDirectVideo ? (
        // For direct video files (from Supabase storage), use native video element
        <video
          ref={directVideoRef}
          src={video.video_url}
          poster={posterSrc}
          loop
          muted={isMuted}
          playsInline
          className="h-full w-full object-contain"
        />
      ) : (
        // For Bunny videos, use HLS player
        <HLSVideoPlayer
          ref={hlsRef}
          src={videoSrc}
          poster={posterSrc}
          autoPlay={false}
          muted={isMuted}
          loop={true}
          className="w-full h-full"
          aspectRatio="auto"
          objectFit="contain"
        />
      )}

      {/* Double-tap heart animation */}
      {showHeart && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <Heart className="h-24 w-24 text-white fill-white animate-ping" />
        </div>
      )}

      {/* Overlay gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none" />

      {/* Content info */}
      <div className="absolute bottom-20 left-4 right-16 text-white">
        <button
          className="flex items-center gap-2 mb-2"
          onClick={() => onProfileClick(video.user_id)}
        >
          <Avatar className="h-10 w-10 border-2 border-white">
            <AvatarImage src={video.user_avatar} />
            <AvatarFallback>{video.user_name?.[0]}</AvatarFallback>
          </Avatar>
          <span className="font-semibold">{video.user_name}</span>
        </button>

        {video.client_name && (
          <Badge variant="secondary" className="mb-2 bg-white/20">
            {video.client_name}
          </Badge>
        )}

        <p className="text-sm line-clamp-2">
          {video.title || video.caption}
        </p>
      </div>

      {/* Action buttons */}
      <div className="absolute bottom-20 right-4 flex flex-col gap-4 items-center">
        <Button
          variant="ghost"
          size="icon"
          className="h-12 w-12 rounded-full bg-black/30 text-white hover:bg-black/50"
          onClick={() => setIsLiked(!isLiked)}
        >
          <Heart className={cn("h-6 w-6", isLiked && "fill-red-500 text-red-500")} />
        </Button>
        <span className="text-white text-xs">
          {video.likes_count > 0 ? video.likes_count : ''}
        </span>

        <Button
          variant="ghost"
          size="icon"
          className="h-12 w-12 rounded-full bg-black/30 text-white hover:bg-black/50"
          onClick={onOpenComments}
        >
          <MessageCircle className="h-6 w-6" />
        </Button>
        <span className="text-white text-xs">
          {video.comments_count > 0 ? video.comments_count : ''}
        </span>

        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "h-12 w-12 rounded-full bg-black/30 text-white hover:bg-black/50",
            isSaved && "text-yellow-400"
          )}
          onClick={onSave}
        >
          <Bookmark className={cn("h-6 w-6", isSaved && "fill-current")} />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="h-12 w-12 rounded-full bg-black/30 text-white hover:bg-black/50"
        >
          <Share2 className="h-6 w-6" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="h-12 w-12 rounded-full bg-black/30 text-white hover:bg-black/50"
          onClick={onMuteToggle}
        >
          {isMuted ? <VolumeX className="h-6 w-6" /> : <Volume2 className="h-6 w-6" />}
        </Button>
      </div>
    </div>
  );
});

export default function VideosPage() {
  const { user } = useAuth();
  const { isSaved, toggleSave } = useSavedItems();
  const navigate = useNavigate();
  
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [filter, setFilter] = useState<VideoFilter>('all');
  const [isMuted, setIsMuted] = useState(true);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [commentsVideoId, setCommentsVideoId] = useState<string | null>(null);
  
  const containerRef = useRef<HTMLDivElement>(null);

  const handleOpenComments = useCallback((videoId: string) => {
    setCommentsVideoId(videoId);
    setCommentsOpen(true);
  }, []);

  const fetchVideos = useCallback(async () => {
    setLoading(true);
    try {
      const queries = [];

      if (filter === 'all' || filter === 'work') {
        queries.push(
          supabase
            .from('content')
            .select(`
              id,
              title,
              video_url,
              thumbnail_url,
              creator_id,
              views_count,
              likes_count,
              created_at,
              creator:profiles!content_creator_id_fkey(id, full_name, avatar_url),
              client:clients!content_client_id_fkey(name)
            `)
            .eq('is_published', true)
            .not('video_url', 'is', null)
            .order('created_at', { ascending: false })
            .limit(30)
        );
      }

      if (filter === 'all' || filter === 'posts') {
        queries.push(
          supabase
            .from('portfolio_posts')
            .select(`
              id,
              user_id,
              media_url,
              media_type,
              thumbnail_url,
              caption,
              views_count,
              likes_count,
              comments_count,
              created_at
            `)
            .eq('media_type', 'video')
            .order('created_at', { ascending: false })
            .limit(30)
        );
      }

      const results = await Promise.all(queries);
      
      // Process content videos
      const contentVideos = filter !== 'posts' && results[0]?.data 
        ? results[0].data.map((c: any) => ({
            id: c.id,
            type: 'work' as const,
            title: c.title,
            video_url: c.video_url,
            thumbnail_url: c.thumbnail_url,
            user_id: c.creator?.id,
            user_name: c.creator?.full_name,
            user_avatar: c.creator?.avatar_url,
            client_name: c.client?.name,
            views_count: c.views_count || 0,
            likes_count: c.likes_count || 0,
            comments_count: 0,
            created_at: c.created_at,
          }))
        : [];

      // Process post videos - need to fetch profiles separately
      let postVideos: VideoItem[] = [];
      const postsResult = filter === 'posts' ? results[0] : results[1];
      
      if (postsResult?.data && postsResult.data.length > 0) {
        const userIdSet = new Set<string>();
        postsResult.data.forEach((p: any) => userIdSet.add(p.user_id as string));
        const userIds = Array.from(userIdSet);
        
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .in('id', userIds);
        
        const profilesMap = new Map(profiles?.map(p => [p.id, p]) || []);
        
        postVideos = postsResult.data.map((p: any) => {
          const profile = profilesMap.get(p.user_id);
          return {
            id: p.id,
            type: 'post' as const,
            caption: p.caption,
            video_url: p.media_url,
            thumbnail_url: p.thumbnail_url,
            user_id: p.user_id,
            user_name: profile?.full_name,
            user_avatar: profile?.avatar_url,
            views_count: p.views_count || 0,
            likes_count: p.likes_count || 0,
            comments_count: p.comments_count || 0,
            created_at: p.created_at,
          };
        });
      }

      // Combine and sort
      const allVideos = [...contentVideos, ...postVideos].sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setVideos(allVideos);
      setActiveIndex(0);
    } catch (error) {
      console.error('[VideosPage] Error:', error);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);

  // Handle scroll snap
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const scrollTop = container.scrollTop;
      const height = container.clientHeight;
      const newIndex = Math.round(scrollTop / height);
      
      if (newIndex !== activeIndex && newIndex >= 0 && newIndex < videos.length) {
        setActiveIndex(newIndex);
      }
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [activeIndex, videos.length]);

  const handleSave = async (video: VideoItem) => {
    const itemType = video.type === 'work' ? 'work_video' : 'post';
    await toggleSave(itemType, video.id);
  };

  const handleProfileClick = (userId: string) => {
    navigate(`/profile/${userId}`);
  };

  const checkIsSaved = (video: VideoItem) => {
    const itemType = video.type === 'work' ? 'work_video' : 'post';
    return isSaved(itemType, video.id);
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center md:ml-20 lg:ml-64">
        <div className="animate-pulse text-muted-foreground">Cargando videos...</div>
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div className="h-full flex items-center justify-center md:ml-20 lg:ml-64 text-muted-foreground">
        No hay videos disponibles
      </div>
    );
  }

  return (
    <div className="h-full bg-black md:ml-20 lg:ml-64">
      {/* Filter chips */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex gap-2 md:left-auto md:right-1/2 md:translate-x-1/2">
        {(['all', 'work', 'posts'] as VideoFilter[]).map((f) => (
          <Badge
            key={f}
            variant={filter === f ? 'default' : 'secondary'}
            className={cn(
              "cursor-pointer transition-all",
              filter === f 
                ? "bg-white text-black" 
                : "bg-black/50 text-white hover:bg-black/70"
            )}
            onClick={() => setFilter(f)}
          >
            {f === 'all' ? 'Todos' : f === 'work' ? 'Trabajo' : 'Posts'}
          </Badge>
        ))}
      </div>

      {/* Counter */}
      <div className="absolute top-4 left-4 z-20 text-sm text-white/80 bg-black/40 px-3 py-1 rounded-full md:left-auto md:ml-24 lg:ml-72">
        {activeIndex + 1} / {videos.length}
      </div>

      {/* Video container with snap scroll */}
      <div
        ref={containerRef}
        className="h-full overflow-y-scroll snap-y snap-mandatory scrollbar-hide"
      >
        {videos.map((video, index) => (
          <div
            key={`${video.type}-${video.id}`}
            className="h-full w-full"
          >
            <VideoSlide
              video={video}
              isActive={index === activeIndex}
              isMuted={isMuted}
              onMuteToggle={() => setIsMuted(!isMuted)}
              onSave={() => handleSave(video)}
              isSaved={checkIsSaved(video)}
              onProfileClick={handleProfileClick}
              onOpenComments={() => handleOpenComments(video.id)}
            />
          </div>
        ))}
      </div>

      {/* Comments Drawer */}
      <Drawer open={commentsOpen} onOpenChange={setCommentsOpen}>
        <DrawerContent className="h-[70vh] bg-zinc-900 border-0">
          {commentsVideoId && (
            <PortfolioCommentsSection 
              postId={commentsVideoId} 
              isOpen={commentsOpen}
              onClose={() => setCommentsOpen(false)}
            />
          )}
        </DrawerContent>
      </Drawer>
    </div>
  );
}
