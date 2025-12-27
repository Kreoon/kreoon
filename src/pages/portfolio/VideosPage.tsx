import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useSavedItems } from '@/hooks/useSavedItems';
import { cn } from '@/lib/utils';
import { Heart, MessageCircle, Bookmark, Share2, Play, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';

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

export default function VideosPage() {
  const { user } = useAuth();
  const { isSaved, toggleSave } = useSavedItems();
  const navigate = useNavigate();
  
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [filter, setFilter] = useState<VideoFilter>('all');
  const [isMuted, setIsMuted] = useState(true);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);

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
              thumbnail_url,
              caption,
              views_count,
              likes_count,
              comments_count,
              created_at,
              user:profiles!portfolio_posts_user_id_fkey(id, full_name, avatar_url)
            `)
            .eq('media_type', 'video')
            .order('created_at', { ascending: false })
            .limit(30)
        );
      }

      const results = await Promise.all(queries);
      
      let allVideos: VideoItem[] = [];

      if (filter === 'all' || filter === 'work') {
        const workData = results[0]?.data || [];
        allVideos.push(...workData.map((w: any) => ({
          id: w.id,
          type: 'work' as const,
          title: w.title,
          video_url: w.video_url,
          thumbnail_url: w.thumbnail_url,
          user_id: w.creator_id,
          user_name: w.creator?.full_name,
          user_avatar: w.creator?.avatar_url,
          client_name: w.client?.name,
          views_count: w.views_count || 0,
          likes_count: w.likes_count || 0,
          comments_count: 0,
          created_at: w.created_at,
        })));
      }

      if (filter === 'all' || filter === 'posts') {
        const postIdx = filter === 'all' ? 1 : 0;
        const postsData = results[postIdx]?.data || [];
        allVideos.push(...postsData.map((p: any) => ({
          id: p.id,
          type: 'post' as const,
          caption: p.caption,
          video_url: p.media_url,
          thumbnail_url: p.thumbnail_url,
          user_id: p.user_id,
          user_name: p.user?.full_name,
          user_avatar: p.user?.avatar_url,
          views_count: p.views_count || 0,
          likes_count: p.likes_count || 0,
          comments_count: p.comments_count || 0,
          created_at: p.created_at,
        })));
      }

      // Sort by date
      allVideos.sort((a, b) => 
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

  // Play/pause videos based on active index
  useEffect(() => {
    videoRefs.current.forEach((video, index) => {
      if (video) {
        if (index === activeIndex) {
          video.play().catch(() => {});
        } else {
          video.pause();
        }
      }
    });
  }, [activeIndex]);

  const handleSave = async (video: VideoItem) => {
    const itemType = video.type === 'work' ? 'work_video' : 'post';
    await toggleSave(itemType, video.id);
  };

  const handleProfileClick = (userId: string) => {
    navigate(`/p/${userId}`);
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center md:ml-20 lg:ml-64">
        <div className="animate-pulse text-muted-foreground">Cargando videos...</div>
      </div>
    );
  }

  return (
    <div className="h-full bg-black md:ml-20 lg:ml-64">
      {/* Filter chips */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex gap-2">
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

      {/* Video container with snap scroll */}
      <div
        ref={containerRef}
        className="h-full overflow-y-scroll snap-y snap-mandatory scrollbar-hide"
        style={{ scrollBehavior: 'smooth' }}
      >
        {videos.map((video, index) => (
          <div
            key={`${video.type}-${video.id}`}
            className="h-full w-full snap-start relative flex items-center justify-center"
          >
            {/* Video */}
            <video
              ref={el => { videoRefs.current[index] = el; }}
              src={video.video_url}
              poster={video.thumbnail_url}
              loop
              muted={isMuted}
              playsInline
              className="h-full w-full object-contain"
              onClick={() => {
                const videoEl = videoRefs.current[index];
                if (videoEl) {
                  if (videoEl.paused) videoEl.play();
                  else videoEl.pause();
                }
              }}
            />

            {/* Overlay gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none" />

            {/* Content info */}
            <div className="absolute bottom-20 left-4 right-16 text-white">
              <button 
                className="flex items-center gap-2 mb-2"
                onClick={() => handleProfileClick(video.user_id)}
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
              >
                <Heart className="h-6 w-6" />
              </Button>
              <span className="text-white text-xs">
                {video.likes_count > 0 ? video.likes_count : ''}
              </span>

              <Button
                variant="ghost"
                size="icon"
                className="h-12 w-12 rounded-full bg-black/30 text-white hover:bg-black/50"
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
                  "h-12 w-12 rounded-full bg-black/30 hover:bg-black/50",
                  isSaved(video.type === 'work' ? 'work_video' : 'post', video.id) 
                    ? 'text-yellow-400' 
                    : 'text-white'
                )}
                onClick={() => handleSave(video)}
              >
                <Bookmark className="h-6 w-6" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                className="h-12 w-12 rounded-full bg-black/30 text-white hover:bg-black/50"
              >
                <Share2 className="h-6 w-6" />
              </Button>
            </div>

            {/* Mute button */}
            <Button
              variant="ghost"
              size="icon"
              className="absolute bottom-20 left-4 h-8 w-8 rounded-full bg-black/30 text-white hover:bg-black/50"
              onClick={() => setIsMuted(!isMuted)}
            >
              {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </Button>
          </div>
        ))}

        {videos.length === 0 && (
          <div className="h-full flex items-center justify-center text-white/70">
            No hay videos disponibles
          </div>
        )}
      </div>
    </div>
  );
}
