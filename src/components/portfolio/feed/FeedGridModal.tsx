import { useState, useEffect, memo, useCallback } from 'react';
import { X, Heart, MessageCircle, Bookmark, Share2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { BunnyVideoPlayer } from '@/components/video/BunnyVideoPlayer';

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

function FeedGridModalComponent({
  items,
  initialIndex,
  isOpen,
  onClose,
  onSave,
  isSaved,
}: FeedGridModalProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  const currentItem = items[currentIndex];

  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex]);

  const goToPrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : items.length - 1));
  }, [items.length]);

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev < items.length - 1 ? prev + 1 : 0));
  }, [items.length]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') goToPrevious();
      if (e.key === 'ArrowRight') goToNext();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, goToPrevious, goToNext, onClose]);

  if (!isOpen || !currentItem) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
      {/* Close button */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-4 right-4 z-50 text-white hover:bg-white/20"
        onClick={onClose}
      >
        <X className="h-6 w-6" />
      </Button>

      {/* Navigation arrows */}
      {items.length > 1 && (
        <>
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 z-50 text-white hover:bg-white/20 h-10 w-10 md:h-12 md:w-12"
            onClick={goToPrevious}
          >
            <ChevronLeft className="h-6 w-6 md:h-8 md:w-8" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 z-50 text-white hover:bg-white/20 h-10 w-10 md:h-12 md:w-12"
            onClick={goToNext}
          >
            <ChevronRight className="h-6 w-6 md:h-8 md:w-8" />
          </Button>
        </>
      )}

      {/* 9:16 Content container - TikTok/Reels style */}
      <div className="relative h-full w-full max-w-[calc(100vh*9/16)] mx-auto flex flex-col">
        {/* Video/Image area - 9:16 */}
        <div className="relative flex-1 flex items-center justify-center bg-black">
          {currentItem.media_type === 'video' ? (
            <BunnyVideoPlayer
              key={currentItem.id}
              src={currentItem.media_url}
              poster={currentItem.thumbnail_url}
              autoPlay={true}
              muted={false}
              loop={true}
              showControls={true}
              showMuteButton={true}
              objectFit="cover"
              aspectRatio="9:16"
              preload="auto"
              className="w-full h-full"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <img
                src={currentItem.media_url}
                alt={currentItem.title || currentItem.caption || 'Post'}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Overlay info - bottom gradient */}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 pb-6">
            {/* User info */}
            <div className="flex items-center gap-3 mb-3">
              <Avatar className="h-10 w-10 ring-2 ring-white/30">
                <AvatarImage src={currentItem.user_avatar} />
                <AvatarFallback className="text-white bg-white/20">{currentItem.user_name?.[0]}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-white truncate">{currentItem.user_name}</div>
                <div className="text-xs text-white/70">
                  {formatDistanceToNow(new Date(currentItem.created_at), { addSuffix: true, locale: es })}
                </div>
              </div>
              {currentItem.client_name && (
                <Badge variant="secondary" className="text-xs bg-white/20 text-white border-0">
                  {currentItem.client_name}
                </Badge>
              )}
            </div>

            {/* Caption */}
            {(currentItem.title || currentItem.caption) && (
              <p className="text-sm text-white/90 line-clamp-2 mb-3">
                {currentItem.title || currentItem.caption}
              </p>
            )}

            {/* Stats row */}
            <div className="flex items-center gap-4 text-xs text-white/70">
              {currentItem.views_count > 0 && (
                <span>{currentItem.views_count.toLocaleString()} vistas</span>
              )}
              {currentItem.likes_count > 0 && (
                <span>{currentItem.likes_count.toLocaleString()} me gusta</span>
              )}
            </div>
          </div>

          {/* Side actions - TikTok style */}
          <div className="absolute right-3 bottom-24 flex flex-col items-center gap-5">
            <Button variant="ghost" size="icon" className="h-12 w-12 text-white hover:bg-white/20 rounded-full">
              <Heart className="h-7 w-7" />
            </Button>
            <Button variant="ghost" size="icon" className="h-12 w-12 text-white hover:bg-white/20 rounded-full">
              <MessageCircle className="h-7 w-7" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-12 w-12 text-white hover:bg-white/20 rounded-full"
              onClick={() => onSave(currentItem)}
            >
              <Bookmark className={cn("h-7 w-7", isSaved(currentItem) && "fill-yellow-500 text-yellow-500")} />
            </Button>
            <Button variant="ghost" size="icon" className="h-12 w-12 text-white hover:bg-white/20 rounded-full">
              <Share2 className="h-7 w-7" />
            </Button>
          </div>

          {/* Counter */}
          <div className="absolute top-4 left-4 text-sm text-white/80 bg-black/40 px-2 py-1 rounded-full">
            {currentIndex + 1} / {items.length}
          </div>
        </div>
      </div>
    </div>
  );
}

const FeedGridModal = memo(FeedGridModalComponent);
export default FeedGridModal;