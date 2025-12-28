import { useState, useEffect, useRef, memo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Heart, MessageCircle, Bookmark, Share2, Volume2, VolumeX } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { HLSVideoPlayer, getBunnyVideoUrls } from '@/components/video';

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
  client_username?: string;
  views_count: number;
  likes_count: number;
  comments_count: number;
  created_at: string;
  is_saved?: boolean;
}

interface FeedGridModalProps {
  items: FeedItem[];
  initialIndex: number;
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: FeedItem) => void;
  isSaved: (item: FeedItem) => boolean;
}

interface VideoSlideProps {
  item: FeedItem;
  isActive: boolean;
  isMuted: boolean;
  onMuteToggle: () => void;
  onSave: () => void;
  isSaved: boolean;
  onCompanyClick?: (username: string) => void;
}

const VideoSlide = memo(function VideoSlide({ 
  item, 
  isActive, 
  isMuted, 
  onMuteToggle, 
  onSave,
  isSaved,
  onCompanyClick
}: VideoSlideProps) {
  const [isLiked, setIsLiked] = useState(false);
  const [showHeart, setShowHeart] = useState(false);
  
  // Get HLS URL from Bunny media_url
  const getVideoSource = useCallback(() => {
    const bunnyUrls = getBunnyVideoUrls(item.media_url);
    if (bunnyUrls) {
      return { hls: bunnyUrls.hls, thumbnail: bunnyUrls.thumbnail };
    }
    // Fallback to direct URL
    return { hls: item.media_url, thumbnail: item.thumbnail_url || '' };
  }, [item.media_url, item.thumbnail_url]);

  const videoSource = item.media_type === 'video' ? getVideoSource() : null;

  // Double tap to like
  const handleDoubleTap = useCallback(() => {
    setIsLiked(true);
    setShowHeart(true);
    setTimeout(() => setShowHeart(false), 1000);
  }, []);

  return (
    <div 
      className="h-full w-full snap-start snap-always relative flex items-center justify-center bg-black"
      onDoubleClick={handleDoubleTap}
    >
      {item.media_type === 'video' && videoSource ? (
        <HLSVideoPlayer
          src={videoSource.hls}
          poster={videoSource.thumbnail || item.thumbnail_url}
          autoPlay={isActive}
          muted={isMuted}
          loop={true}
          className="w-full h-full"
          aspectRatio="auto"
          objectFit="cover"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <img
            src={item.media_url}
            alt={item.title || item.caption || 'Post'}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
      )}

      {/* Floating heart animation */}
      {showHeart && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
          <Heart className="h-24 w-24 text-red-500 fill-red-500 animate-ping" />
        </div>
      )}

      {/* Overlay info - bottom gradient */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 pb-8 pointer-events-none">
        {/* User info */}
        <div className="flex items-center gap-3 mb-3 pointer-events-auto">
          <Avatar className="h-10 w-10 ring-2 ring-white/30">
            <AvatarImage src={item.user_avatar} />
            <AvatarFallback className="text-white bg-white/20">{item.user_name?.[0]}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-white truncate">{item.user_name}</div>
            <div className="text-xs text-white/70">
              {formatDistanceToNow(new Date(item.created_at), { addSuffix: true, locale: es })}
            </div>
          </div>
          {item.client_name && (
            <Badge 
              variant="secondary" 
              className={cn(
                "text-xs bg-white/20 text-white border-0",
                item.client_username && "cursor-pointer hover:bg-white/30 transition-colors"
              )}
              onClick={() => item.client_username && onCompanyClick?.(item.client_username)}
            >
              {item.client_name}
            </Badge>
          )}
        </div>

        {/* Caption */}
        {(item.title || item.caption) && (
          <p className="text-sm text-white/90 line-clamp-2 mb-3">
            {item.title || item.caption}
          </p>
        )}

        {/* Stats row */}
        <div className="flex items-center gap-4 text-xs text-white/70">
          {item.views_count > 0 && (
            <span>{item.views_count.toLocaleString()} vistas</span>
          )}
          {item.likes_count > 0 && (
            <span>{item.likes_count.toLocaleString()} me gusta</span>
          )}
        </div>
      </div>

      {/* Side actions - TikTok style */}
      <div className="absolute right-3 bottom-32 flex flex-col items-center gap-5 z-10">
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-12 w-12 text-white hover:bg-white/20 rounded-full"
          onClick={() => setIsLiked(!isLiked)}
        >
          <Heart className={cn("h-7 w-7", isLiked && "fill-red-500 text-red-500")} />
        </Button>
        <Button variant="ghost" size="icon" className="h-12 w-12 text-white hover:bg-white/20 rounded-full">
          <MessageCircle className="h-7 w-7" />
        </Button>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-12 w-12 text-white hover:bg-white/20 rounded-full"
          onClick={onSave}
        >
          <Bookmark className={cn("h-7 w-7", isSaved && "fill-yellow-500 text-yellow-500")} />
        </Button>
        <Button variant="ghost" size="icon" className="h-12 w-12 text-white hover:bg-white/20 rounded-full">
          <Share2 className="h-7 w-7" />
        </Button>
        {item.media_type === 'video' && (
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-12 w-12 text-white hover:bg-white/20 rounded-full"
            onClick={onMuteToggle}
          >
            {isMuted ? <VolumeX className="h-7 w-7" /> : <Volume2 className="h-7 w-7" />}
          </Button>
        )}
      </div>
    </div>
  );
});

function FeedGridModalComponent({
  items,
  initialIndex,
  isOpen,
  onClose,
  onSave,
  isSaved,
}: FeedGridModalProps) {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const [isMuted, setIsMuted] = useState(false);

  const handleCompanyClick = useCallback((username: string) => {
    onClose();
    navigate(`/company/${username}`);
  }, [navigate, onClose]);

  // Scroll to initial index on open
  useEffect(() => {
    if (isOpen && containerRef.current) {
      const slideHeight = window.innerHeight;
      containerRef.current.scrollTo({
        top: initialIndex * slideHeight,
        behavior: 'instant'
      });
      setActiveIndex(initialIndex);
    }
  }, [isOpen, initialIndex]);

  // Handle scroll snap
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const slideHeight = window.innerHeight;
      const newIndex = Math.round(container.scrollTop / slideHeight);
      if (newIndex !== activeIndex && newIndex >= 0 && newIndex < items.length) {
        setActiveIndex(newIndex);
      }
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [activeIndex, items.length]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowUp' && containerRef.current) {
        e.preventDefault();
        const slideHeight = window.innerHeight;
        containerRef.current.scrollTo({
          top: Math.max(0, activeIndex - 1) * slideHeight,
          behavior: 'smooth'
        });
      }
      if (e.key === 'ArrowDown' && containerRef.current) {
        e.preventDefault();
        const slideHeight = window.innerHeight;
        containerRef.current.scrollTo({
          top: Math.min(items.length - 1, activeIndex + 1) * slideHeight,
          behavior: 'smooth'
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, activeIndex, items.length, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black">
      {/* Close button */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-4 right-4 z-50 text-white hover:bg-white/20"
        onClick={onClose}
      >
        <X className="h-6 w-6" />
      </Button>

      {/* Counter */}
      <div className="absolute top-4 left-4 z-50 text-sm text-white/80 bg-black/40 px-3 py-1 rounded-full">
        {activeIndex + 1} / {items.length}
      </div>

      {/* TikTok-style vertical scroll container */}
      <div 
        ref={containerRef}
        className="h-full w-full overflow-y-scroll snap-y snap-mandatory scrollbar-hide"
        style={{ scrollSnapType: 'y mandatory' }}
      >
        {items.map((item, index) => (
          <div 
            key={item.id} 
            className="h-screen w-full max-w-[calc(100vh*9/16)] mx-auto"
          >
            <VideoSlide
              item={item}
              isActive={index === activeIndex}
              isMuted={isMuted}
              onMuteToggle={() => setIsMuted(!isMuted)}
              onSave={() => onSave(item)}
              isSaved={isSaved(item)}
              onCompanyClick={handleCompanyClick}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

const FeedGridModal = memo(FeedGridModalComponent);
export default FeedGridModal;
