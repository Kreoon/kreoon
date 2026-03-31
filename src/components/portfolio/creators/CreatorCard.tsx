import { useState, useRef, useEffect, memo } from 'react';
import { motion } from 'framer-motion';
import { Flame, MapPin, Tag, Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getBunnyVideoUrls } from '@/hooks/useHLSPlayer';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';

export interface CreatorData {
  id: string;
  full_name: string;
  avatar_url?: string;
  city?: string;
  country?: string;
  content_categories?: string[];
  industries?: string[];
  featured_video_url?: string;
  featured_video_thumbnail?: string;
  total_points?: number;
}

interface CreatorCardProps {
  creator: CreatorData;
  onClick?: () => void;
}

function CreatorCardComponent({ creator, onClick }: CreatorCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  // Get video URLs from Bunny
  const bunnyUrls = creator.featured_video_url 
    ? getBunnyVideoUrls(creator.featured_video_url) 
    : null;
  
  const thumbnailUrl = bunnyUrls?.thumbnail || creator.featured_video_thumbnail;
  const videoUrl = bunnyUrls?.mp4 || null;

  // Get primary niche/category
  const primaryNiche = creator.content_categories?.[0] || creator.industries?.[0] || null;

  // Handle hover video playback (desktop)
  useEffect(() => {
    if (isMobile || !videoRef.current || !videoUrl) return;
    
    if (isHovered && videoLoaded) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {});
    } else {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  }, [isHovered, videoLoaded, isMobile, videoUrl]);

  // Mobile: Intersection observer for autoplay
  useEffect(() => {
    if (!isMobile || !videoRef.current || !videoUrl) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && videoLoaded) {
            videoRef.current?.play().catch(() => {});
          } else {
            videoRef.current?.pause();
          }
        });
      },
      { threshold: 0.6 }
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => observer.disconnect();
  }, [isMobile, videoLoaded, videoUrl]);

  return (
    <motion.div
      ref={cardRef}
      className={cn(
        "relative bg-card rounded-sm overflow-hidden",
        "border border-border/50 transition-all duration-300",
        "hover:border-primary/30 hover:shadow-xl hover:shadow-primary/10"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      whileHover={{ scale: 1.02 }}
    >
      {/* Video Container - 9:16 aspect ratio */}
      <div className="relative aspect-[9/16] bg-background overflow-hidden">
        {/* Thumbnail */}
        {thumbnailUrl && !imageError && (
          <img
            src={thumbnailUrl}
            alt={creator.full_name}
            className={cn(
              "absolute inset-0 w-full h-full object-cover transition-opacity duration-300",
              (isHovered && videoLoaded && !isMobile) ? "opacity-0" : "opacity-100",
              !imageLoaded && "opacity-0"
            )}
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageError(true)}
          />
        )}

        {/* Loading placeholder */}
        {!imageLoaded && !imageError && (
          <div className="absolute inset-0 flex items-center justify-center bg-background animate-pulse">
            <Play className="h-10 w-10 text-muted-foreground/50" />
          </div>
        )}

        {/* Fallback placeholder */}
        {imageError && (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-background to-background">
            <Play className="h-12 w-12 text-muted-foreground/30" />
          </div>
        )}

        {/* Video element (preload on hover or viewport) */}
        {videoUrl && (
          <video
            ref={videoRef}
            src={videoUrl}
            muted
            loop
            playsInline
            preload="metadata"
            className={cn(
              "absolute inset-0 w-full h-full object-cover transition-opacity duration-300",
              (isHovered && videoLoaded && !isMobile) || (isMobile && videoLoaded) ? "opacity-100" : "opacity-0"
            )}
            onCanPlay={() => setVideoLoaded(true)}
          />
        )}

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />

        {/* Play indicator on hover */}
        <motion.div
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: isHovered && !videoLoaded ? 0.8 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center">
            <Play className="h-6 w-6 text-white fill-white ml-1" />
          </div>
        </motion.div>
      </div>

      {/* Creator Info */}
      <div className="p-4 space-y-2">
        {/* Name - Full, not truncated */}
        <h3 className="font-semibold text-foreground text-base leading-tight">
          {creator.full_name}
        </h3>

        {/* Location */}
        {(creator.city || creator.country) && (
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span className="text-sm">
              {[creator.city, creator.country].filter(Boolean).join(', ')}
            </span>
          </div>
        )}

        {/* Niche/Category */}
        {primaryNiche && (
          <div className="flex items-center gap-1.5">
            <Tag className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span className="text-sm text-muted-foreground">{primaryNiche}</span>
          </div>
        )}

        {/* UP Points - Below name section */}
        {creator.total_points !== undefined && creator.total_points > 0 && (
          <div className="flex items-center gap-1.5 pt-1">
            <Flame className="h-4 w-4 text-orange-400" />
            <span className="text-sm font-bold text-orange-400">
              {creator.total_points.toLocaleString()} UP
            </span>
          </div>
        )}

        {/* CTA Button - Visual only, no interaction */}
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "w-full mt-2 border-primary/30 text-primary",
            "hover:bg-secondary hover:border-primary/50",
            "transition-all duration-200 pointer-events-none text-xs px-2"
          )}
        >
          ¿Este es el creador para tu campaña?
        </Button>
      </div>
    </motion.div>
  );
}

export const CreatorCard = memo(CreatorCardComponent);
