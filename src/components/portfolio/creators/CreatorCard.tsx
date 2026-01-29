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
        "relative bg-social-card rounded-xl overflow-hidden cursor-pointer",
        "border border-social-border/50 transition-all duration-300",
        "hover:border-social-accent/30 hover:shadow-xl hover:shadow-social-accent/10"
      )}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Video Container - 9:16 aspect ratio */}
      <div className="relative aspect-[9/16] bg-social-muted overflow-hidden">
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
          <div className="absolute inset-0 flex items-center justify-center bg-social-muted animate-pulse">
            <Play className="h-10 w-10 text-social-muted-foreground/50" />
          </div>
        )}

        {/* Fallback placeholder */}
        {imageError && (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-social-muted to-social-background">
            <Play className="h-12 w-12 text-social-muted-foreground/30" />
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

        {/* UP Points Badge */}
        {creator.total_points !== undefined && creator.total_points > 0 && (
          <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full backdrop-blur-md bg-orange-500/20 border border-orange-400/30">
            <Flame className="h-3.5 w-3.5 text-orange-400" />
            <span className="text-xs font-bold text-orange-300">
              {creator.total_points.toLocaleString()} UP
            </span>
          </div>
        )}

        {/* Play indicator on hover */}
        <motion.div
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: isHovered && !videoLoaded ? 0.8 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <Play className="h-6 w-6 text-white fill-white ml-1" />
          </div>
        </motion.div>
      </div>

      {/* Creator Info */}
      <div className="p-4 space-y-3">
        {/* Name and Country */}
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-social-foreground line-clamp-1 flex-1">
            {creator.full_name}
          </h3>
          {creator.country && (
            <div className="flex items-center gap-1 text-social-muted-foreground shrink-0">
              <MapPin className="h-3.5 w-3.5" />
              <span className="text-xs">{creator.country}</span>
            </div>
          )}
        </div>

        {/* Niche/Category */}
        {primaryNiche && (
          <div className="flex items-center gap-1.5">
            <Tag className="h-3.5 w-3.5 text-social-muted-foreground" />
            <Badge variant="secondary" className="text-xs bg-social-muted/50 text-social-muted-foreground border-0">
              {primaryNiche}
            </Badge>
          </div>
        )}

        {/* CTA Button - Visual only */}
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "w-full mt-2 border-social-accent/30 text-social-accent",
            "hover:bg-social-accent/10 hover:border-social-accent/50",
            "transition-all duration-200 pointer-events-none"
          )}
        >
          Este es el creador para tu campaña
        </Button>
      </div>
    </motion.div>
  );
}

export const CreatorCard = memo(CreatorCardComponent);
