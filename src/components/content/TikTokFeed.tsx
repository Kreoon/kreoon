import { useState, useRef, useEffect, useCallback } from 'react';
import { Heart, MessageSquare, Share2, Play, Pause, Volume2, VolumeX, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

interface VideoItem {
  id: string;
  title: string;
  videoUrls: string[];
  thumbnailUrl?: string | null;
  viewsCount: number;
  likesCount: number;
  isLiked: boolean;
  clientName?: string;
  creatorName?: string;
}

interface TikTokFeedProps {
  videos: VideoItem[];
  onLike: (id: string, e?: React.MouseEvent) => void;
  onView: (id: string) => void;
  onShare: (video: VideoItem) => void;
  onComment?: (id: string) => void;
  className?: string;
}

function extractVideoId(url: string): string | null {
  if (!url) return null;
  const embedMatch = url.match(/iframe\.mediadelivery\.net\/embed\/\d+\/([a-f0-9-]+)/i);
  if (embedMatch) return embedMatch[1];
  const cdnMatch = url.match(/b-cdn\.net\/([a-f0-9-]+)/i);
  if (cdnMatch) return cdnMatch[1];
  return null;
}

function getProxiedThumbnailUrl(contentId: string, videoId: string): string {
  const supabaseUrl = (supabase as any).supabaseUrl as string;
  return `${supabaseUrl}/functions/v1/bunny-thumbnail?content_id=${encodeURIComponent(contentId)}&video_id=${encodeURIComponent(videoId)}`;
}

function formatCount(count: number): string {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return count.toString();
}

function getEmbedUrl(url: string, muted: boolean): string {
  if (!url) return '';
  if (url.includes('iframe.mediadelivery.net')) {
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}autoplay=true&muted=${muted}&loop=true&preload=true`;
  }
  const cdnMatch = url.match(/vz-(\d+)\.b-cdn\.net\/([a-f0-9-]+)/i);
  if (cdnMatch) {
    const [, libraryId, videoId] = cdnMatch;
    return `https://iframe.mediadelivery.net/embed/${libraryId}/${videoId}?autoplay=true&muted=${muted}&loop=true&preload=true`;
  }
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}autoplay=true&muted=${muted}&loop=true`;
}

function TikTokVideoCard({
  video,
  isActive,
  onLike,
  onView,
  onShare,
  onComment
}: {
  video: VideoItem;
  isActive: boolean;
  onLike: (e?: React.MouseEvent) => void;
  onView: () => void;
  onShare: () => void;
  onComment?: () => void;
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const viewTrackedRef = useRef(false);
  const viewTimerRef = useRef<NodeJS.Timeout | null>(null);

  const currentVideoUrl = video.videoUrls[currentIndex] || video.videoUrls[0];
  const hasMultiple = video.videoUrls.length > 1;

  // Load thumbnail
  useEffect(() => {
    if (video.thumbnailUrl && !video.thumbnailUrl.includes('iframe.mediadelivery.net')) {
      setThumbnailUrl(video.thumbnailUrl);
      return;
    }
    const videoId = extractVideoId(currentVideoUrl);
    if (videoId) {
      setThumbnailUrl(getProxiedThumbnailUrl(video.id, videoId));
    }
  }, [video.id, video.thumbnailUrl, currentVideoUrl]);

  // Auto-play when active
  useEffect(() => {
    if (isActive) {
      setIsPlaying(true);
    } else {
      setIsPlaying(false);
      viewTrackedRef.current = false;
      if (viewTimerRef.current) {
        clearTimeout(viewTimerRef.current);
      }
    }
  }, [isActive]);

  // Track view after 3 seconds
  useEffect(() => {
    if (isPlaying && !viewTrackedRef.current) {
      viewTimerRef.current = setTimeout(() => {
        onView();
        viewTrackedRef.current = true;
      }, 3000);
    }
    return () => {
      if (viewTimerRef.current) {
        clearTimeout(viewTimerRef.current);
      }
    };
  }, [isPlaying, onView]);

  const togglePlay = () => setIsPlaying(!isPlaying);
  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMuted(!isMuted);
  };

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex(prev => (prev > 0 ? prev - 1 : video.videoUrls.length - 1));
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex(prev => (prev < video.videoUrls.length - 1 ? prev + 1 : 0));
  };

  // Double tap to like
  const lastTapRef = useRef(0);
  const handleDoubleTap = (e: React.MouseEvent) => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      if (!video.isLiked) {
        onLike(e);
      }
    }
    lastTapRef.current = now;
  };

  return (
    <div 
      className="relative w-full h-full bg-black snap-start snap-always"
      onClick={handleDoubleTap}
    >
      {/* Video or Thumbnail */}
      {isPlaying ? (
        <iframe
          src={getEmbedUrl(currentVideoUrl, isMuted)}
          className="absolute inset-0 w-full h-full border-0"
          allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
          allowFullScreen={false}
        />
      ) : (
        <>
          {thumbnailUrl ? (
            <img 
              src={thumbnailUrl} 
              alt={video.title}
              className="absolute inset-0 w-full h-full object-cover"
              onError={() => setThumbnailUrl(null)}
            />
          ) : (
            <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-black">
              <Play className="h-16 w-16 text-white/50" />
            </div>
          )}
          {/* Play button overlay */}
          <div 
            className="absolute inset-0 flex items-center justify-center cursor-pointer"
            onClick={(e) => { e.stopPropagation(); setIsPlaying(true); }}
          >
            <div className="p-5 rounded-full bg-white/20 backdrop-blur-sm">
              <Play className="h-12 w-12 text-white" fill="white" />
            </div>
          </div>
        </>
      )}

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none" />

      {/* Top controls */}
      <div className="absolute top-4 right-4 z-20 flex gap-2">
        {isPlaying && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); togglePlay(); }}
              className="p-2.5 rounded-full bg-black/40 backdrop-blur-sm text-white"
            >
              <Pause className="h-5 w-5" />
            </button>
            <button
              onClick={toggleMute}
              className="p-2.5 rounded-full bg-black/40 backdrop-blur-sm text-white"
            >
              {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
            </button>
          </>
        )}
      </div>

      {/* Carousel navigation for multiple videos */}
      {hasMultiple && (
        <>
          <button
            onClick={handlePrev}
            className="absolute left-3 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-black/40 backdrop-blur-sm text-white"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button
            onClick={handleNext}
            className="absolute right-16 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-black/40 backdrop-blur-sm text-white"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
          
          {/* Variation indicator */}
          <div className="absolute top-4 left-4 z-20 bg-black/40 backdrop-blur-sm text-white text-xs px-3 py-1.5 rounded-full font-medium">
            {currentIndex + 1}/{video.videoUrls.length}
          </div>
        </>
      )}

      {/* Right side actions - TikTok style */}
      <div className="absolute right-3 bottom-32 z-20 flex flex-col items-center gap-5">
        {/* Like */}
        <button
          onClick={(e) => { e.stopPropagation(); onLike(e); }}
          className="flex flex-col items-center gap-1"
        >
          <div className={cn(
            "p-3 rounded-full transition-all duration-200 active:scale-90",
            video.isLiked 
              ? "bg-red-500 text-white" 
              : "bg-black/40 backdrop-blur-sm text-white"
          )}>
            <Heart className="h-7 w-7" fill={video.isLiked ? "currentColor" : "none"} />
          </div>
          <span className="text-white text-xs font-semibold">{formatCount(video.likesCount)}</span>
        </button>

        {/* Comment */}
        {onComment && (
          <button
            onClick={(e) => { e.stopPropagation(); onComment(); }}
            className="flex flex-col items-center gap-1"
          >
            <div className="p-3 rounded-full bg-black/40 backdrop-blur-sm text-white active:scale-90 transition-transform">
              <MessageSquare className="h-7 w-7" />
            </div>
            <span className="text-white text-xs font-semibold">Comentar</span>
          </button>
        )}

        {/* Share */}
        <button
          onClick={(e) => { e.stopPropagation(); onShare(); }}
          className="flex flex-col items-center gap-1"
        >
          <div className="p-3 rounded-full bg-black/40 backdrop-blur-sm text-white active:scale-90 transition-transform">
            <Share2 className="h-7 w-7" />
          </div>
          <span className="text-white text-xs font-semibold">Compartir</span>
        </button>
      </div>

      {/* Bottom info - TikTok style */}
      <div className="absolute bottom-6 left-4 right-20 z-20">
        <div className="flex items-center gap-2 mb-2">
          {video.creatorName && (
            <span className="text-white font-bold text-base">@{video.creatorName.replace(/\s+/g, '').toLowerCase()}</span>
          )}
        </div>
        <p className="text-white text-sm font-medium line-clamp-2 mb-1">{video.title}</p>
        {video.clientName && (
          <p className="text-white/70 text-xs">🏢 {video.clientName}</p>
        )}
        <div className="flex items-center gap-3 mt-2 text-white/60 text-xs">
          <span>👁 {formatCount(video.viewsCount)} vistas</span>
        </div>
      </div>
    </div>
  );
}

export function TikTokFeed({ videos, onLike, onView, onShare, onComment, className }: TikTokFeedProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  // Observe which video is in view
  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio > 0.7) {
            const index = Number(entry.target.getAttribute('data-index'));
            if (!isNaN(index)) {
              setActiveIndex(index);
            }
          }
        });
      },
      { threshold: [0.7], root: containerRef.current }
    );

    const items = containerRef.current.querySelectorAll('[data-index]');
    items.forEach(item => observer.observe(item));

    return () => observer.disconnect();
  }, [videos]);

  if (videos.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen bg-black text-white">
        <p className="text-white/60">No hay videos disponibles</p>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className={cn(
        "h-screen w-full overflow-y-scroll snap-y snap-mandatory scrollbar-hide",
        className
      )}
      style={{ scrollBehavior: 'smooth' }}
    >
      {videos.map((video, index) => (
        <div 
          key={video.id} 
          data-index={index}
          className="h-screen w-full"
        >
          <TikTokVideoCard
            video={video}
            isActive={index === activeIndex}
            onLike={(e) => onLike(video.id, e)}
            onView={() => onView(video.id)}
            onShare={() => onShare(video)}
            onComment={onComment ? () => onComment(video.id) : undefined}
          />
        </div>
      ))}
    </div>
  );
}
