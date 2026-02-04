import { useState, useEffect, useRef, memo } from 'react';
import { Play, Heart, MessageCircle, Eye, Handshake } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getBunnyVideoUrls } from '@/hooks/useHLSPlayer';
import { motion } from 'framer-motion';

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
  is_collaborative?: boolean;
  creator_name?: string;
}

interface FeedGridCardProps {
  item: FeedItem;
  onClick: () => void;
  priority?: boolean; // For above-the-fold items
}

function formatCount(count: number): string {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return count.toString();
}

function FeedGridCardComponent({ item, onClick, priority = false }: FeedGridCardProps) {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isInView, setIsInView] = useState(priority);
  const cardRef = useRef<HTMLDivElement>(null);

  // Prefer Bunny CDN thumbnail (always fresh) over stored thumbnail_url
  const bunnyUrls = item.media_type === 'video' ? getBunnyVideoUrls(item.media_url) : null;
  const effectiveThumbnail = bunnyUrls?.thumbnail || item.thumbnail_url;

  // Reset error state when item changes
  useEffect(() => {
    setImageError(false);
    setImageLoaded(false);
  }, [item.id]);

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (priority) {
      setIsInView(true);
      return;
    }

    const element = cardRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: '200px',
        threshold: 0.01,
      }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [priority]);

  const renderMedia = () => {
    // Don't render media until in view (lazy loading)
    if (!isInView) {
      return (
        <div className="w-full h-full flex items-center justify-center bg-social-muted animate-pulse">
          {item.media_type === 'video' && (
            <Play className="h-8 w-8 text-social-muted-foreground/50" />
          )}
        </div>
      );
    }

    if (item.media_type === 'video') {
      return (
        <>
          {effectiveThumbnail && !imageError ? (
            <>
              <img
                src={effectiveThumbnail}
                alt={item.title || item.caption || 'Video'}
                className={cn(
                  "w-full h-full object-cover transition-all duration-500",
                  isHovered && "scale-110 brightness-75",
                  !imageLoaded && "scale-[1.02] blur-sm"
                )}
                onLoad={() => setImageLoaded(true)}
                onError={() => setImageError(true)}
                loading={priority ? "eager" : "lazy"}
                decoding="async"
              />

              {!imageLoaded && (
                <div className="absolute inset-0 flex items-center justify-center bg-social-muted">
                  <Play className="h-8 w-8 text-social-muted-foreground" />
                </div>
              )}
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-social-muted">
              <Play className="h-8 w-8 text-social-muted-foreground" />
            </div>
          )}

          {/* Video indicator - glassmorphism */}
          <div className="absolute top-2 right-2 p-1.5 rounded-full backdrop-blur-md bg-black/30 border border-white/10">
            <Play className="h-3.5 w-3.5 text-white fill-white" />
          </div>

          {/* Collaborative badge */}
          {item.is_collaborative && (
            <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-1 rounded-full backdrop-blur-md bg-gradient-to-r from-purple-500/80 to-pink-500/80 border border-white/20">
              <Handshake className="h-3 w-3 text-white" />
              <span className="text-white text-[10px] font-medium">Collab</span>
            </div>
          )}

          {/* Views count - glassmorphism */}
          <div className="absolute bottom-2 left-2 flex items-center gap-1 px-2 py-1 rounded-full backdrop-blur-md bg-black/40 border border-white/10">
            <Eye className="h-3 w-3 text-white/80" />
            <span className="text-white text-xs font-medium">{formatCount(item.views_count)}</span>
          </div>
        </>
      );
    }

    return (
      <>
        {!imageError ? (
          <img
            src={item.media_url}
            alt={item.title || item.caption || 'Post'}
            className={cn(
              "w-full h-full object-cover transition-all duration-500",
              isHovered && "scale-110 brightness-75",
              imageLoaded ? "opacity-100" : "opacity-0"
            )}
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageError(true)}
            loading={priority ? "eager" : "lazy"}
            decoding="async"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-social-muted">
            <span className="text-sm text-social-muted-foreground">No se pudo cargar</span>
          </div>
        )}

        {/* Loading skeleton */}
        {!imageLoaded && !imageError && (
          <div className="absolute inset-0 bg-social-muted animate-pulse" />
        )}
      </>
    );
  };

  return (
    <motion.div
      ref={cardRef}
      className="aspect-[4/5] relative group cursor-pointer overflow-hidden bg-social-muted rounded-sm"
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      whileTap={{ scale: 0.98 }}
    >
      {renderMedia()}

      {/* Hover overlay with glassmorphism */}
      <motion.div
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: isHovered ? 1 : 0 }}
        transition={{ duration: 0.2 }}
      >
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

        {/* Stats with glassmorphism */}
        <div className="relative flex items-center gap-4 px-4 py-2 rounded-full backdrop-blur-xl bg-white/10 border border-white/20 shadow-lg">
          {item.likes_count >= 0 && (
            <motion.div
              className="flex items-center gap-1.5"
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: isHovered ? 0 : 10, opacity: isHovered ? 1 : 0 }}
              transition={{ delay: 0.05 }}
            >
              <Heart className="h-4 w-4 text-red-400 fill-red-400" />
              <span className="text-white text-sm font-semibold">{formatCount(item.likes_count)}</span>
            </motion.div>
          )}
          {item.comments_count >= 0 && (
            <motion.div
              className="flex items-center gap-1.5"
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: isHovered ? 0 : 10, opacity: isHovered ? 1 : 0 }}
              transition={{ delay: 0.1 }}
            >
              <MessageCircle className="h-4 w-4 text-blue-400" />
              <span className="text-white text-sm font-semibold">{formatCount(item.comments_count)}</span>
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* Subtle border glow on hover */}
      <div
        className={cn(
          "absolute inset-0 rounded-sm pointer-events-none transition-opacity duration-300",
          "ring-1 ring-inset",
          isHovered ? "ring-social-accent/30" : "ring-transparent"
        )}
      />
    </motion.div>
  );
}

// Memoize the component to prevent unnecessary re-renders
const FeedGridCard = memo(FeedGridCardComponent);
export default FeedGridCard;
