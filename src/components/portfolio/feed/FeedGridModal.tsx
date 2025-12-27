import { useState, useRef, useEffect } from 'react';
import { X, Heart, MessageCircle, Bookmark, Share2, ChevronLeft, ChevronRight, Volume2, VolumeX } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

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

export default function FeedGridModal({
  items,
  initialIndex,
  isOpen,
  onClose,
  onSave,
  isSaved,
}: FeedGridModalProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isMuted, setIsMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  const currentItem = items[currentIndex];

  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex]);

  useEffect(() => {
    if (isOpen && videoRef.current && currentItem?.media_type === 'video') {
      videoRef.current.play().catch(() => {});
    }
  }, [isOpen, currentIndex, currentItem?.media_type]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') goToPrevious();
      if (e.key === 'ArrowRight') goToNext();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentIndex, items.length]);

  if (!isOpen || !currentItem) return null;

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : items.length - 1));
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev < items.length - 1 ? prev + 1 : 0));
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center">
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
            className="absolute left-4 top-1/2 -translate-y-1/2 z-50 text-white hover:bg-white/20 h-12 w-12"
            onClick={goToPrevious}
          >
            <ChevronLeft className="h-8 w-8" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-4 top-1/2 -translate-y-1/2 z-50 text-white hover:bg-white/20 h-12 w-12"
            onClick={goToNext}
          >
            <ChevronRight className="h-8 w-8" />
          </Button>
        </>
      )}

      {/* Content container */}
      <div className="flex flex-col md:flex-row h-full w-full max-w-6xl mx-auto">
        {/* Media */}
        <div className="flex-1 flex items-center justify-center p-4 md:p-8">
          <div className="relative w-full h-full max-h-[70vh] md:max-h-[80vh] flex items-center justify-center">
            {currentItem.media_type === 'video' ? (
              <div className="relative w-full h-full flex items-center justify-center">
                <video
                  ref={videoRef}
                  src={currentItem.media_url}
                  poster={currentItem.thumbnail_url}
                  controls
                  muted={isMuted}
                  loop
                  playsInline
                  className="max-w-full max-h-full object-contain rounded-lg"
                  onClick={(e) => e.stopPropagation()}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute bottom-4 left-4 h-10 w-10 bg-black/50 text-white hover:bg-black/70"
                  onClick={() => setIsMuted(!isMuted)}
                >
                  {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                </Button>
              </div>
            ) : (
              <img
                src={currentItem.media_url}
                alt={currentItem.title || currentItem.caption || 'Post'}
                className="max-w-full max-h-full object-contain rounded-lg"
              />
            )}
          </div>
        </div>

        {/* Info sidebar */}
        <div className="w-full md:w-80 bg-card/90 backdrop-blur-lg p-4 flex flex-col max-h-[30vh] md:max-h-full overflow-y-auto">
          {/* User info */}
          <div className="flex items-center gap-3 mb-4 pb-4 border-b border-border">
            <Avatar className="h-10 w-10">
              <AvatarImage src={currentItem.user_avatar} />
              <AvatarFallback>{currentItem.user_name?.[0]}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{currentItem.user_name}</div>
              <div className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(currentItem.created_at), { addSuffix: true, locale: es })}
              </div>
            </div>
            {currentItem.client_name && (
              <Badge variant="secondary" className="text-xs">{currentItem.client_name}</Badge>
            )}
          </div>

          {/* Caption */}
          {(currentItem.title || currentItem.caption) && (
            <p className="text-sm mb-4 flex-1">
              <span className="font-medium mr-1">{currentItem.user_name}</span>
              {currentItem.title || currentItem.caption}
            </p>
          )}

          {/* Stats */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
            {currentItem.views_count > 0 && (
              <span>{currentItem.views_count} vistas</span>
            )}
            {currentItem.likes_count > 0 && (
              <span>{currentItem.likes_count} me gusta</span>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-4 border-t border-border">
            <Button variant="ghost" size="icon" className="h-10 w-10">
              <Heart className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-10 w-10">
              <MessageCircle className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-10 w-10">
              <Share2 className="h-5 w-5" />
            </Button>
            <div className="flex-1" />
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-10 w-10"
              onClick={() => onSave(currentItem)}
            >
              <Bookmark className={cn("h-5 w-5", isSaved(currentItem) && "fill-current text-yellow-500")} />
            </Button>
          </div>

          {/* Counter */}
          <div className="text-center text-xs text-muted-foreground mt-4">
            {currentIndex + 1} / {items.length}
          </div>
        </div>
      </div>
    </div>
  );
}