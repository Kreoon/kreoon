import { useState, useRef, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { SocialFeedCard, SocialFeedItem, SocialFeedCardRef } from './SocialFeedCard';
import { useGlobalMute } from '@/contexts/VideoPlayerContext';
import { Loader2 } from 'lucide-react';

interface SocialFeedProps {
  items: SocialFeedItem[];
  onLike?: (id: string) => void;
  onComment?: (id: string) => void;
  onShare?: (item: SocialFeedItem) => void;
  onView?: (id: string) => void;
  onProfileClick?: (creatorId: string) => void;
  className?: string;
  loading?: boolean;
}

export function SocialFeed({
  items,
  onLike,
  onComment,
  onShare,
  onView,
  onProfileClick,
  className,
  loading = false,
}: SocialFeedProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Map<string, SocialFeedCardRef>>(new Map());
  const [activeIndex, setActiveIndex] = useState(0);
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const { setGlobalMuted } = useGlobalMute();

  // Track active item using IntersectionObserver
  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio > 0.6) {
            const index = Number(entry.target.getAttribute('data-index'));
            if (!isNaN(index) && index !== activeIndex) {
              setActiveIndex(index);
            }
          }
        });
      },
      { threshold: [0.6], root: containerRef.current }
    );

    const itemElements = containerRef.current.querySelectorAll('[data-index]');
    itemElements.forEach(item => observer.observe(item));

    return () => observer.disconnect();
  }, [items, activeIndex]);

  // Handle audio unlock
  const handleUnlockAudio = useCallback(() => {
    if (!audioUnlocked) {
      setAudioUnlocked(true);
      setGlobalMuted(false);
    }
  }, [audioUnlocked, setGlobalMuted]);

  // Store card refs
  const setCardRef = useCallback((id: string, ref: SocialFeedCardRef | null) => {
    if (ref) {
      cardRefs.current.set(id, ref);
    } else {
      cardRefs.current.delete(id);
    }
  }, []);

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-black">
        <Loader2 className="h-8 w-8 text-white/40 animate-spin" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-black">
        <p className="text-white/60 text-center px-4">No hay contenido disponible</p>
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
    >
      {items.map((item, index) => (
        <div 
          key={item.id} 
          data-index={index}
          className="h-screen w-full"
        >
          <SocialFeedCard
            ref={(ref) => setCardRef(item.id, ref)}
            item={item}
            isActive={index === activeIndex}
            audioUnlocked={audioUnlocked}
            onLike={onLike ? () => onLike(item.id) : undefined}
            onComment={onComment ? () => onComment(item.id) : undefined}
            onShare={onShare ? () => onShare(item) : undefined}
            onView={onView ? () => onView(item.id) : undefined}
            onProfileClick={item.creatorId && onProfileClick ? () => onProfileClick(item.creatorId!) : undefined}
            onUnlockAudio={handleUnlockAudio}
          />
        </div>
      ))}
    </div>
  );
}
