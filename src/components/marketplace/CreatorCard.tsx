import { useState, useCallback, memo } from 'react';
import { Heart, Star, MapPin, CheckCircle2, Play, Gift, Percent, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MarketplaceCreator, PortfolioMedia } from './types/marketplace';
import { getOptimizedImageUrl, getOptimizedThumbnail } from '@/lib/imageOptimization';
import { getSpecializationLabel, getSpecializationBgColor, getSpecializationColor } from '@/lib/specializations';
import type { Specialization } from '@/types/database';
import { TrustScoreBadge } from './TrustScoreBadge';

// Card dimensions for image optimization (2x for retina)
const CARD_WIDTH = 180;
const CARD_HEIGHT = 320; // 9:16 aspect ratio
const THUMB_WIDTH = CARD_WIDTH * 2; // 360px para 2x retina
const THUMB_HEIGHT = CARD_HEIGHT * 2; // 640px para 2x retina

function resolveThumb(item: PortfolioMedia, isAvatar = false): string {
  // Prioridad: thumbnail_url guardado > URL del media
  // El thumbnail_url de la BD es más confiable que construir la URL
  let base = item.thumbnail_url;

  // Si no hay thumbnail guardado y es imagen, usar URL directa
  if (!base && item.type === 'image') {
    base = item.url;
  }

  // Si no hay thumbnail y es video, intentar usar URL
  if (!base && item.type === 'video' && item.url) {
    base = item.url;
  }

  if (!base) return '';

  // Para avatares, usar getOptimizedImageUrl que maneja mejor las proporciones cuadradas
  if (isAvatar) {
    return getOptimizedImageUrl(base, { width: THUMB_WIDTH, quality: 80, forceProxy: true });
  }

  // Pasar por getOptimizedThumbnail para resize via wsrv.nl
  return getOptimizedThumbnail(base, THUMB_WIDTH, THUMB_HEIGHT, 80);
}

interface CreatorCardProps {
  creator: MarketplaceCreator;
  onClick?: () => void;
  className?: string;
  priority?: boolean;
}

function CreatorCardComponent({ creator, onClick, className, priority = false }: CreatorCardProps) {
  const [isFavorite, setIsFavorite] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);

  // Prioridad: featured_media (si es imagen) > imagen aleatoria del portafolio > avatar
  // Featured media seleccionado por el usuario (solo si es imagen)
  const userSelectedImage = creator.featured_media_url && creator.featured_media_type === 'image'
    ? {
        id: 'featured',
        url: creator.featured_media_url,
        thumbnail_url: creator.featured_media_url,
        type: 'image' as const,
      } as PortfolioMedia
    : null;

  // Si no hay imagen seleccionada, buscar imágenes en el portafolio y elegir una aleatoria
  const portfolioImages = creator.portfolio_media?.filter(
    (item) => item.type === 'image' && (item.thumbnail_url || item.url)
  ) || [];

  // Selección aleatoria pero consistente por creator.id (evita cambio en cada render)
  const randomIndex = portfolioImages.length > 0
    ? Math.abs(creator.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)) % portfolioImages.length
    : 0;
  const randomPortfolioImage = portfolioImages[randomIndex] || null;

  // Avatar como imagen de tarjeta (cuando no hay imágenes del portafolio)
  const avatarAsCard = creator.avatar_url
    ? {
        id: 'avatar',
        url: creator.avatar_url,
        thumbnail_url: creator.avatar_url,
        type: 'image' as const,
      } as PortfolioMedia
    : null;

  // Seleccionar: imagen seleccionada > imagen aleatoria portafolio > avatar grande
  const featuredMedia = userSelectedImage || randomPortfolioImage || avatarAsCard;

  const handleFavorite = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsFavorite(prev => !prev);
  }, []);

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
      <div
        className="relative aspect-[9/16] rounded-lg overflow-hidden bg-card/50 dark:bg-[#1a1a35]"
        style={{ contain: 'layout style paint' }}
      >
        {/* Imagen destacada fija (primer item del portafolio) */}
        {featuredMedia && !imgError ? (
          <>
            {!imgLoaded && (
              <div className="absolute inset-0 bg-gradient-to-br from-secondary to-secondary/50 animate-pulse" />
            )}
            <img
              src={resolveThumb(featuredMedia, featuredMedia.id === 'avatar')}
              alt=""
              width={CARD_WIDTH}
              height={CARD_HEIGHT}
              className={cn(
                'w-full h-full object-cover transition-opacity duration-300',
                imgLoaded ? 'opacity-100' : 'opacity-0',
              )}
              loading={priority ? 'eager' : 'lazy'}
              decoding={priority ? 'sync' : 'async'}
              fetchPriority={priority ? 'high' : undefined}
              onLoad={() => setImgLoaded(true)}
              onError={() => setImgError(true)}
            />
            {/* Icono de video si es video */}
            {featuredMedia.type === 'video' && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-11 h-11 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center border border-white/20">
                  <Play className="h-5 w-5 text-white fill-white ml-0.5" />
                </div>
              </div>
            )}
          </>
        ) : (
          // Fallback: avatar o inicial
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
            {creator.avatar_url && !imgError ? (
              <img
                src={getOptimizedImageUrl(creator.avatar_url, { width: CARD_WIDTH * 2, quality: 75 })}
                alt={creator.display_name}
                className="w-full h-full object-cover"
                loading={priority ? 'eager' : 'lazy'}
                fetchPriority={priority ? 'high' : undefined}
                onError={() => setImgError(true)}
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

          {/* Row 2: Trust Score prominente */}
          <div className="flex items-center justify-between gap-2 mb-1">
            <TrustScoreBadge
              score={creator.trust_score || 50}
              breakdown={creator.trust_score_breakdown}
              isNew={creator.is_new_profile}
              compact
            />
            {/* Price */}
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

          {/* Row 3: Category/Spec + Rating */}
          <div className="flex items-center gap-1.5 flex-wrap">
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
            {creator.rating_count > 0 && (
              <div className="flex items-center gap-0.5">
                <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
                <span className="text-white text-[11px] font-medium">
                  {creator.rating_avg.toFixed(1)}
                </span>
                <span className="text-white/50 text-[10px]">({creator.rating_count})</span>
              </div>
            )}
          </div>

          {/* Row 3: Hover-only extra info */}
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
