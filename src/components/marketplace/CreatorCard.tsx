import { useState, useRef, useCallback, memo } from 'react';
import { Heart, ChevronLeft, ChevronRight, Star, MapPin, CheckCircle2, Play, Gift, Percent, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MarketplaceCreator, PortfolioMedia } from './types/marketplace';
import { getOptimizedImageUrl, getOptimizedThumbnail } from '@/lib/imageOptimization';
import { getSpecializationLabel, getSpecializationBgColor, getSpecializationColor } from '@/lib/specializations';
import type { Specialization } from '@/types/database';

// Card dimensions for image optimization (2x for retina)
const CARD_WIDTH = 180;
const CARD_HEIGHT = 320; // 9:16 aspect ratio
const THUMB_WIDTH = CARD_WIDTH * 2; // 360px para 2x retina
const THUMB_HEIGHT = CARD_HEIGHT * 2; // 640px para 2x retina

function resolveThumb(item: PortfolioMedia): string {
  // Pasar todo por getOptimizedThumbnail — esto incluye Bunny CDN via wsrv.nl
  // evitando descargar thumbnails de 1440x2560px cuando se muestran a ~360px
  const base = item.thumbnail_url || item.url;
  if (!base) return '';
  return getOptimizedThumbnail(base, THUMB_WIDTH, THUMB_HEIGHT, 80);
}

interface CreatorCardProps {
  creator: MarketplaceCreator;
  onClick?: () => void;
  className?: string;
  priority?: boolean;
}

function CreatorCardComponent({ creator, onClick, className, priority = false }: CreatorCardProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);
  const [imgLoaded, setImgLoaded] = useState<Record<number, boolean>>({});
  const touchStartX = useRef(0);
  const media = creator.portfolio_media;

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

  // Badge priority: Elite > Gold > New
  const badge = creator.level === 'elite'
    ? { label: 'Top', bg: 'bg-gradient-to-r from-amber-500 to-orange-500', text: 'text-white' }
    : creator.level === 'gold'
      ? { label: 'Pro', bg: 'bg-gradient-to-r from-purple-500 to-pink-500', text: 'text-white' }
      : isNew
        ? { label: 'Nuevo', bg: 'bg-primary/90', text: 'text-white' }
        : null;

  // Primary category/specialization to show
  const primarySpec = creator.specializations?.[0];
  const primaryCategory = creator.categories?.[0];

  return (
    <div
      className={cn(
        'group relative cursor-pointer',
        'transition-all duration-300 ease-out',
        'hover:scale-[1.03] hover:-translate-y-1',
        'active:scale-[0.98]',
        className,
      )}
      onClick={onClick}
    >
      {/*
       * CLS fix: aspect-[9/16] + contain reservan el espacio exacto antes de
       * que carguen imágenes. Se elimina minHeight fijo en px porque entraba en
       * conflicto con el aspect-ratio en viewports estrechos, generando layouts
       * de altura inconsistente que contribuían al CLS de 0.618.
       */}
      <div
        className="relative aspect-[9/16] rounded-lg overflow-hidden bg-card/50 dark:bg-[#1a1a35]"
        style={{ contain: 'layout style paint' }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Media slides */}
        {media.length > 0 ? (
          <div
            className="flex h-full transition-transform duration-300 ease-out"
            style={{ transform: `translateX(-${currentSlide * 100}%)` }}
          >
            {media.map((item, i) => (
              <div key={item.id} className="w-full h-full flex-shrink-0 relative">
                {!imgLoaded[i] && (
                  <div className="absolute inset-0 bg-gradient-to-br from-secondary to-secondary/50 animate-pulse" />
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
                  fetchPriority={(priority && i === 0) ? 'high' : undefined}
                  onLoad={() => setImgLoaded(prev => ({ ...prev, [i]: true }))}
                />
                {item.type === 'video' && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-11 h-11 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center border border-white/20">
                      <Play className="h-5 w-5 text-white fill-white ml-0.5" />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
            {creator.avatar_url ? (
              <img
                src={getOptimizedImageUrl(creator.avatar_url, { width: CARD_WIDTH * 2, quality: 75 })}
                alt={creator.display_name}
                className="w-full h-full object-cover"
                loading={priority ? 'eager' : 'lazy'}
                fetchPriority={priority ? 'high' : undefined}
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-primary/30 flex items-center justify-center">
                <span className="text-2xl text-primary font-bold">
                  {creator.display_name.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Subtle gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent pointer-events-none" />

        {/* Top left: Badge */}
        {badge && (
          <div className={cn(
            'absolute top-2.5 left-2.5 z-10 px-2 py-0.5 rounded-full text-[10px] font-semibold shadow-lg',
            badge.bg, badge.text
          )}>
            {badge.label}
          </div>
        )}

        {/* Top right: Favorite */}
        <button
          onClick={handleFavorite}
          className="absolute top-2.5 right-2.5 z-10 w-8 h-8 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center transition-all hover:bg-black/50 active:scale-90"
          aria-label="Favorito"
        >
          <Heart
            className={cn(
              'h-4 w-4 transition-all',
              isFavorite ? 'text-red-500 fill-red-500' : 'text-white',
            )}
          />
        </button>

        {/* Discount badge */}
        {hasDiscount && (
          <div className="absolute top-11 left-2.5 z-10 bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5 shadow-lg">
            <Percent className="h-2.5 w-2.5" />
            {creator.introductory_discount_pct}% OFF
          </div>
        )}

        {/* Navigation arrows */}
        {media.length > 1 && (
          <>
            {currentSlide > 0 && (
              <button
                onClick={handlePrev}
                className="absolute left-1.5 top-1/2 -translate-y-1/2 z-10 w-7 h-7 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/60"
                aria-label="Anterior"
              >
                <ChevronLeft className="h-4 w-4 text-white" />
              </button>
            )}
            {currentSlide < media.length - 1 && (
              <button
                onClick={handleNext}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 z-10 w-7 h-7 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/60"
                aria-label="Siguiente"
              >
                <ChevronRight className="h-4 w-4 text-white" />
              </button>
            )}
          </>
        )}

        {/* Dots indicator */}
        {media.length > 1 && (
          <div className="absolute bottom-[72px] left-1/2 -translate-x-1/2 z-10 flex gap-1">
            {media.slice(0, 5).map((_, i) => (
              <span
                key={i}
                className={cn(
                  'h-1 rounded-full transition-all duration-200',
                  i === currentSlide ? 'bg-white w-3' : 'bg-white/50 w-1',
                )}
              />
            ))}
            {media.length > 5 && <span className="text-white/50 text-[8px] ml-0.5">+{media.length - 5}</span>}
          </div>
        )}

        {/* Bottom info panel */}
        <div className="absolute bottom-0 inset-x-0 z-10 p-2.5">
          {/* Row 1: Avatar + Name + Verified */}
          <div className="flex items-center gap-2 mb-1.5">
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              {creator.avatar_url ? (
                <img
                  src={getOptimizedImageUrl(creator.avatar_url, { width: 64, quality: 75 })}
                  alt=""
                  className="w-7 h-7 rounded-full object-cover ring-2 ring-white/30"
                  loading="lazy"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center ring-2 ring-white/30">
                  <span className="text-[10px] text-white font-bold">
                    {creator.display_name.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              {creator.is_verified && (
                <CheckCircle2 className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 text-green-400 fill-green-400 bg-black rounded-full" />
              )}
            </div>

            {/* Name + Org */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1">
                <span className="font-semibold text-white text-sm truncate">
                  {creator.display_name}
                </span>
              </div>
              {creator.organization_name && (
                <div className="flex items-center gap-1">
                  {creator.organization_logo ? (
                    <img
                      src={getOptimizedImageUrl(creator.organization_logo, { width: 24, quality: 70 })}
                      alt=""
                      className="w-3 h-3 rounded-full object-cover"
                    />
                  ) : (
                    <Building2 className="h-3 w-3 text-white/60" />
                  )}
                  <span className="text-[10px] text-white/60 truncate">{creator.organization_name}</span>
                </div>
              )}
            </div>
          </div>

          {/* Row 2: Category/Spec + Rating + Price */}
          <div className="flex items-center justify-between gap-2">
            {/* Left: Category or Specialization */}
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
              {primarySpec ? (
                <span className={cn(
                  "text-[10px] px-1.5 py-0.5 rounded truncate",
                  getSpecializationBgColor(primarySpec as Specialization),
                  getSpecializationColor(primarySpec as Specialization)
                )}>
                  {getSpecializationLabel(primarySpec as Specialization)}
                </span>
              ) : primaryCategory ? (
                <span className="text-[10px] text-white/70 bg-white/10 px-1.5 py-0.5 rounded truncate">
                  {primaryCategory}
                </span>
              ) : null}

              {/* Rating */}
              <div className="flex items-center gap-0.5">
                <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
                <span className="text-white text-[11px] font-medium">
                  {creator.rating_avg.toFixed(1)}
                </span>
                {creator.rating_count > 0 && (
                  <span className="text-white/50 text-[10px]">({creator.rating_count})</span>
                )}
              </div>
            </div>

            {/* Right: Price */}
            {creator.base_price != null && (
              <div className="flex-shrink-0 bg-white/10 backdrop-blur-sm px-2 py-0.5 rounded">
                <span className="text-white text-xs font-semibold">
                  ${creator.base_price.toLocaleString()}
                </span>
                <span className="text-white/50 text-[10px] ml-0.5">
                  {creator.currency}
                </span>
              </div>
            )}
          </div>

          {/*
           * Row 3: Hover-only extra info.
           * CLS fix: se usa opacity en lugar de max-h animado.
           * max-height fuerza reflow de layout en cada hover; opacity es compositor-only.
           */}
          <div
            className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 ease-out pointer-events-none group-hover:pointer-events-auto"
            aria-hidden="true"
          >
            <div className="flex flex-wrap items-center gap-1.5 pt-1.5 border-t border-white/10 mt-1.5">
              {/* Location */}
              {(creator.location_city || creator.location_country) && (
                <div className="flex items-center gap-0.5 text-white/60 text-[10px]">
                  <MapPin className="h-2.5 w-2.5" />
                  <span className="truncate max-w-[80px]">
                    {creator.location_city || creator.location_country}
                  </span>
                </div>
              )}

              {/* Accepts exchange */}
              {creator.accepts_product_exchange && (
                <div className="flex items-center gap-0.5 text-green-400 text-[10px]">
                  <Gift className="h-2.5 w-2.5" />
                  <span>Canje</span>
                </div>
              )}

              {/* Additional specs on hover */}
              {creator.specializations && creator.specializations.length > 1 && (
                <span className="text-white/40 text-[10px]">
                  +{creator.specializations.length - 1} skills
                </span>
              )}
            </div>
          </div>
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
