import { useState, useRef, useCallback, memo } from 'react';
import { motion } from 'framer-motion';
import { Heart, ChevronLeft, ChevronRight, Star, MapPin, CheckCircle2, Play, Gift, Percent, Package, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCurrency } from '@/contexts/CurrencyContext';
import type { MarketplaceCreator, PortfolioMedia } from './types/marketplace';
import { getBunnyThumbnailUrl } from '@/hooks/useHLSPlayer';

function resolveThumb(item: PortfolioMedia): string {
  // For videos: prefer Bunny Stream CDN thumbnail (always reliable)
  // This ensures consistent thumbnails regardless of what's stored in DB
  if (item.type === 'video') {
    const bunnyThumb = getBunnyThumbnailUrl(item.url);
    if (bunnyThumb) return bunnyThumb;
  }
  if (item.thumbnail_url) return item.thumbnail_url;
  return item.url;
}

interface CreatorCardProps {
  creator: MarketplaceCreator;
  onClick?: () => void;
  className?: string;
}

function CreatorCardComponent({ creator, onClick, className }: CreatorCardProps) {
  const { formatPrice } = useCurrency();
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
    <motion.div
      className={cn(
        'group relative cursor-pointer',
        className,
      )}
      onClick={onClick}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02, y: -4 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.2 }}
    >
      {/* Media area — 9:16 aspect ratio, click opens profile */}
      <div
        className="relative aspect-[9/16] rounded-2xl overflow-hidden bg-card"
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
                  <div className="absolute inset-0 bg-white/5 animate-pulse" />
                )}
                <img
                  src={resolveThumb(item)}
                  alt=""
                  className={cn(
                    'w-full h-full object-cover transition-opacity duration-300',
                    imgLoaded[i] ? 'opacity-100' : 'opacity-0',
                  )}
                  loading={i === 0 ? 'eager' : 'lazy'}
                  onLoad={() => setImgLoaded(prev => ({ ...prev, [i]: true }))}
                />
                {item.type === 'video' && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center">
                      <Play className="h-5 w-5 text-white fill-white ml-0.5" />
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
                src={creator.avatar_url}
                alt={creator.display_name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-purple-500/20 flex items-center justify-center">
                <span className="text-3xl text-purple-400 font-bold">
                  {creator.display_name.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Bottom gradient for text legibility */}
        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/80 to-transparent pointer-events-none" />

        {/* Favorite button */}
        <motion.button
          onClick={handleFavorite}
          className="absolute top-3 right-3 z-10"
          aria-label="Favorito"
          whileTap={{ scale: 1.3 }}
          animate={isFavorite ? { scale: [1, 1.2, 1] } : {}}
        >
          <Heart
            className={cn(
              'h-6 w-6 drop-shadow-lg transition-colors duration-200',
              isFavorite
                ? 'text-pink-500 fill-pink-500'
                : 'text-white hover:text-pink-300',
            )}
          />
        </motion.button>

        {/* Badges */}
        <div className="absolute top-3 left-3 z-10 flex flex-col gap-1.5">
          {badge && (
            <div className="bg-white text-black text-xs font-semibold px-3 py-1 rounded-full shadow-lg w-fit">
              {badge.icon} {badge.label}
            </div>
          )}
          {hasDiscount && (
            <div className="bg-green-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-lg flex items-center gap-1 w-fit">
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
                className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-white/80 backdrop-blur flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-white"
                aria-label="Anterior"
              >
                <ChevronLeft className="h-4 w-4 text-gray-800" />
              </button>
            )}
            {currentSlide < media.length - 1 && (
              <button
                onClick={handleNext}
                className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-white/80 backdrop-blur flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-white"
                aria-label="Siguiente"
              >
                <ChevronRight className="h-4 w-4 text-gray-800" />
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
                  'w-1.5 h-1.5 rounded-full transition-all duration-200',
                  i === currentSlide ? 'bg-white w-2.5' : 'bg-white/50',
                )}
              />
            ))}
          </div>
        )}

        {/* Hover mini-gallery */}
        {media.length >= 3 && (
          <div
            className={cn(
              "absolute bottom-16 left-1/2 -translate-x-1/2 z-20 flex gap-1 transition-all duration-300",
              "opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0"
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
                  "w-12 h-16 rounded-lg overflow-hidden border-2 transition-all",
                  i === currentSlide
                    ? "border-white scale-105"
                    : "border-white/30 hover:border-white/60"
                )}
              >
                <img
                  src={resolveThumb(item)}
                  alt=""
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
                src={creator.avatar_url}
                alt=""
                className="w-6 h-6 rounded-full object-cover flex-shrink-0 border border-white/30"
              />
            ) : (
              <div className="w-6 h-6 rounded-full bg-purple-500/60 flex items-center justify-center flex-shrink-0 border border-white/30">
                <span className="text-[10px] text-white font-bold leading-none">
                  {creator.display_name.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <span className="font-semibold text-white text-sm truncate drop-shadow-md">
              {creator.display_name}
            </span>
            {creator.is_verified && (
              <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
            )}
          </div>

          {/* Location */}
          {(creator.location_city || creator.location_country) && (
            <div className="flex items-center gap-1 text-white/70 text-xs">
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
              <Star className="h-3 w-3 text-purple-400 fill-purple-400" />
              <span className="text-white text-xs font-medium drop-shadow-sm">
                {creator.rating_avg.toFixed(1)}
              </span>
              <span className="text-white/50 text-[10px]">({creator.rating_count})</span>
            </div>

            {/* Projects completed */}
            {creator.completed_projects > 0 && (
              <div className="flex items-center gap-1 text-white/70 text-xs">
                <Package className="h-3 w-3" />
                <span>{creator.completed_projects}</span>
              </div>
            )}

            {/* Response time */}
            {creator.response_time_label && (
              <div className="flex items-center gap-1 text-green-400 text-[10px]">
                <Clock className="h-3 w-3" />
                <span>{creator.response_time_label}</span>
              </div>
            )}
          </div>

          {/* Price + Exchange */}
          <div className="flex items-center gap-2">
            {creator.base_price != null && (
              <span className="text-white/70 text-xs drop-shadow-sm">
                Desde <span className="text-white font-semibold">{formatPrice(creator.base_price)}</span>
              </span>
            )}
            {creator.accepts_product_exchange && (
              <span
                className="flex items-center gap-0.5 text-green-400 text-xs"
                title="Acepta canje de producto"
              >
                <Gift className="h-3 w-3" />
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function isNewCreator(joined: string): boolean {
  const diff = Date.now() - new Date(joined).getTime();
  return diff < 30 * 24 * 60 * 60 * 1000; // 30 days
}

export const MarketplaceCreatorCard = memo(CreatorCardComponent);
