import { useState, useRef, useCallback, memo } from 'react';
import { Heart, ChevronLeft, ChevronRight, Star, MapPin, CheckCircle2, Play, Gift, Percent, Package, Clock, Building2 } from 'lucide-react';
// Removed framer-motion for better performance - using CSS transitions instead
import { cn } from '@/lib/utils';
import type { MarketplaceCreator, PortfolioMedia } from './types/marketplace';
import { getBunnyThumbnailUrl } from '@/hooks/useHLSPlayer';
import { getOptimizedImageUrl } from '@/lib/imageOptimization';
import { getSpecializationLabel, getSpecializationBgColor, getSpecializationColor } from '@/lib/specializations';
import type { Specialization } from '@/types/database';
// Nova Design System

// Card dimensions for image optimization
const CARD_WIDTH = 180;
const CARD_HEIGHT = 320; // 9:16 aspect ratio

function resolveThumb(item: PortfolioMedia, optimize = true): string {
  // For videos: prefer Bunny Stream CDN thumbnail (always reliable)
  if (item.type === 'video') {
    const bunnyThumb = getBunnyThumbnailUrl(item.url);
    if (bunnyThumb) return bunnyThumb;
  }

  const baseUrl = item.thumbnail_url || item.url;

  // Optimize non-Bunny images (e.g., Supabase Storage)
  if (optimize && baseUrl && !baseUrl.includes('b-cdn.net')) {
    return getOptimizedImageUrl(baseUrl, { width: CARD_WIDTH * 2, quality: 75 });
  }

  return baseUrl;
}

interface CreatorCardProps {
  creator: MarketplaceCreator;
  onClick?: () => void;
  className?: string;
  /** Priority loading for LCP optimization */
  priority?: boolean;
}

function CreatorCardComponent({ creator, onClick, className, priority = false }: CreatorCardProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);
  const [imgLoaded, setImgLoaded] = useState<Record<number, boolean>>({});
  const touchStartX = useRef(0);
  const media = creator.portfolio_media;

  const currentItem = media[currentSlide];

  const handlePrev = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentSlide(prev => Math.max(0, prev - 1));
  }, []);

  const handleNext = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentSlide(prev => Math.min(media.length - 1, prev + 1));
  }, [media.length]);

  const handleFavorite = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsFavorite(prev => !prev);
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      if (diff > 0 && currentSlide < media.length - 1) {
        setCurrentSlide(prev => prev + 1);
      } else if (diff < 0 && currentSlide > 0) {
        setCurrentSlide(prev => prev - 1);
      }
    }
  }, [currentSlide, media.length]);

  const isNew = isNewCreator(creator.joined_at);
  const hasDiscount = creator.introductory_discount_pct && creator.introductory_discount_pct > 0;

  const badge = creator.level === 'elite'
    ? { label: 'Top', icon: '🔥' }
    : creator.level === 'gold'
      ? { label: 'Destacado', icon: '⭐' }
      : isNew
        ? { label: 'Nuevo', icon: '🆕' }
        : null;

  return (
    <div
      className={cn(
        'group relative cursor-pointer transition-transform duration-200 hover:scale-[1.02] hover:-translate-y-1 active:scale-[0.98]',
        className,
      )}
      onClick={onClick}
    >
      {/* Media area — 9:16 aspect ratio, click opens profile */}
      <div
        className="relative aspect-[9/16] rounded-sm overflow-hidden bg-card border border-border"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Media slides (static thumbnails only) */}
        {media.length > 0 ? (
          <div
            className="flex h-full transition-transform duration-300 ease-out"
            style={{ transform: `translateX(-${currentSlide * 100}%)` }}
          >
            {media.map((item, i) => (
              <div key={item.id} className="w-full h-full flex-shrink-0 relative">
                {!imgLoaded[i] && (
                  <div className="absolute inset-0 bg-secondary animate-pulse" />
                )}
                <img
                  src={resolveThumb(item)}
                  alt=""
                  width={CARD_WIDTH}
                  height={CARD_HEIGHT}
                  className={cn(
                    'w-full h-full object-cover transition-opacity duration-300',
                    imgLoaded[i] ? 'opacity-100' : 'opacity-0',
                  )}
                  loading={(priority && i === 0) ? 'eager' : 'lazy'}
                  decoding={(priority && i === 0) ? 'sync' : 'async'}
                  fetchPriority={(priority && i === 0) ? 'high' : 'auto'}
                  onLoad={() => setImgLoaded(prev => ({ ...prev, [i]: true }))}
                />
                {item.type === 'video' && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-12 h-12 rounded-[0.125rem] bg-card/80 flex items-center justify-center">
                      <Play className="h-5 w-5 text-foreground fill-primary ml-0.5" />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          /* Fallback: avatar as main image when no portfolio media */
          <div className="w-full h-full flex items-center justify-center">
            {creator.avatar_url ? (
              <img
                src={getOptimizedImageUrl(creator.avatar_url, { width: CARD_WIDTH * 2, quality: 75 })}
                alt={creator.display_name}
                width={CARD_WIDTH}
                height={CARD_HEIGHT}
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-20 h-20 rounded-[0.125rem] bg-primary/20 flex items-center justify-center">
                <span className="text-3xl text-primary font-bold">
                  {creator.display_name.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Bottom gradient for text legibility */}
        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/80 to-transparent pointer-events-none" />

        {/* Favorite button */}
        <button
          onClick={handleFavorite}
          className="absolute top-3 right-3 z-10 transition-transform duration-150 active:scale-125"
          aria-label="Favorito"
        >
          <Heart
            className={cn(
              'h-6 w-6 drop-shadow-lg transition-all duration-200',
              isFavorite
                ? 'text-destructive fill-destructive scale-110'
                : 'text-foreground hover:text-primary',
            )}
          />
        </button>

        {/* Badges */}
        <div className="absolute top-3 left-3 z-10 flex flex-col gap-1.5">
          {badge && (
            <div className="bg-card text-foreground text-xs font-semibold px-3 py-1 rounded-[0.125rem] w-fit">
              {badge.icon} {badge.label}
            </div>
          )}
          {hasDiscount && (
            <div className="bg-green-600 text-foreground text-[10px] font-bold px-2.5 py-1 rounded-[0.125rem] flex items-center gap-1 w-fit">
              <Percent className="h-3 w-3" />
              -{creator.introductory_discount_pct}% intro
            </div>
          )}
        </div>

        {/* Navigation arrows (desktop hover only) */}
        {media.length > 1 && (
          <>
            {currentSlide > 0 && (
              <button
                onClick={handlePrev}
                className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-[0.125rem] bg-card/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-card"
                aria-label="Anterior"
              >
                <ChevronLeft className="h-4 w-4 text-foreground" />
              </button>
            )}
            {currentSlide < media.length - 1 && (
              <button
                onClick={handleNext}
                className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-[0.125rem] bg-card/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-card"
                aria-label="Siguiente"
              >
                <ChevronRight className="h-4 w-4 text-foreground" />
              </button>
            )}
          </>
        )}

        {/* Dots */}
        {media.length > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 flex gap-1.5">
            {media.map((_, i) => (
              <span
                key={i}
                className={cn(
                  'w-1.5 h-1.5 rounded-[0.125rem] transition-all duration-200',
                  i === currentSlide ? 'bg-foreground w-2.5' : 'bg-foreground/50',
                )}
              />
            ))}
          </div>
        )}

        {/* Hover mini-gallery - hidden on mobile for performance */}
        {media.length >= 3 && (
          <div
            className={cn(
              "absolute bottom-16 left-1/2 -translate-x-1/2 z-20 flex gap-1 transition-all duration-300",
              "opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0",
              "hidden sm:flex" // Hide on mobile
            )}
          >
            {media.slice(0, 3).map((item, i) => (
              <button
                key={item.id}
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentSlide(i);
                }}
                className={cn(
                  "w-12 h-16 rounded-sm overflow-hidden border-2 transition-all",
                  i === currentSlide
                    ? "border-foreground scale-105"
                    : "border-foreground/30 hover:border-foreground/60"
                )}
              >
                <img
                  src={resolveThumb(item)}
                  alt=""
                  width={48}
                  height={64}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        )}

        {/* Creator info overlay at bottom of card */}
        <div className="absolute bottom-0 inset-x-0 z-10 p-3 space-y-1.5">
          {/* Name + verified */}
          <div className="flex items-center gap-1.5">
            {creator.avatar_url ? (
              <img
                src={getOptimizedImageUrl(creator.avatar_url, { width: 48, quality: 70 })}
                alt=""
                width={24}
                height={24}
                loading="lazy"
                decoding="async"
                className="w-6 h-6 rounded-[0.125rem] object-cover flex-shrink-0 border border-foreground/30"
              />
            ) : (
              <div className="w-6 h-6 rounded-[0.125rem] bg-primary/60 flex items-center justify-center flex-shrink-0 border border-foreground/30">
                <span className="text-[10px] text-foreground font-bold leading-none">
                  {creator.display_name.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <span className="font-semibold text-foreground text-sm truncate drop-shadow-md">
              {creator.display_name}
            </span>
            {creator.is_verified && (
              <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
            )}
          </div>

          {/* Organization badge */}
          {creator.organization_id && creator.organization_name && (
            <div className="flex items-center gap-1.5 bg-foreground/10 rounded-[0.125rem] px-2 py-0.5 w-fit">
              {creator.organization_logo ? (
                <img
                  src={getOptimizedImageUrl(creator.organization_logo, { width: 32, quality: 70 })}
                  alt={creator.organization_name}
                  width={16}
                  height={16}
                  loading="lazy"
                  decoding="async"
                  className="w-4 h-4 rounded-[0.125rem] object-cover flex-shrink-0"
                />
              ) : (
                <Building2 className="h-3 w-3 text-primary flex-shrink-0" />
              )}
              <span className="text-[10px] text-foreground/90 font-medium truncate max-w-[100px]">
                {creator.organization_name}
              </span>
            </div>
          )}

          {/* Location */}
          {(creator.location_city || creator.location_country) && (
            <div className="flex items-center gap-1 text-foreground/70 text-xs">
              <MapPin className="h-3 w-3 flex-shrink-0" />
              <span className="truncate drop-shadow-sm">
                {[creator.location_city, creator.location_country]
                  .filter(Boolean)
                  .join(', ')}
              </span>
            </div>
          )}

          {/* Social Proof Row */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Rating con count */}
            <div className="flex items-center gap-1">
              <Star className="h-3 w-3 text-primary fill-primary" />
              <span className="text-foreground text-xs font-medium drop-shadow-sm">
                {creator.rating_avg.toFixed(1)}
              </span>
              <span className="text-foreground/50 text-[10px]">({creator.rating_count})</span>
            </div>

            {/* Projects completed */}
            {creator.completed_projects > 0 && (
              <div className="flex items-center gap-1 text-foreground/70 text-xs">
                <Package className="h-3 w-3" />
                <span>{creator.completed_projects}</span>
              </div>
            )}

            {/* Response time */}
            {creator.response_time_label && (
              <div className="flex items-center gap-1 text-green-500 text-[10px]">
                <Clock className="h-3 w-3" />
                <span>{creator.response_time_label}</span>
              </div>
            )}
          </div>

          {/* Exchange badge */}
          {creator.accepts_product_exchange && (
            <div className="flex items-center gap-1">
              <span
                className="flex items-center gap-0.5 text-green-500 text-xs"
                title="Acepta canje de producto"
              >
                <Gift className="h-3 w-3" />
                <span>Acepta canje</span>
              </span>
            </div>
          )}

          {/* Specializations */}
          {creator.specializations && creator.specializations.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {creator.specializations.slice(0, 3).map((spec) => (
                <span
                  key={spec}
                  className={cn(
                    "text-[10px] px-1.5 py-0.5 rounded-[0.125rem]",
                    getSpecializationBgColor(spec as Specialization),
                    getSpecializationColor(spec as Specialization)
                  )}
                >
                  {getSpecializationLabel(spec as Specialization)}
                </span>
              ))}
              {creator.specializations.length > 3 && (
                <span className="text-[10px] text-foreground/60 px-1">
                  +{creator.specializations.length - 3}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function isNewCreator(joined: string): boolean {
  const diff = Date.now() - new Date(joined).getTime();
  return diff < 30 * 24 * 60 * 60 * 1000; // 30 days
}

export const MarketplaceCreatorCard = memo(CreatorCardComponent);
