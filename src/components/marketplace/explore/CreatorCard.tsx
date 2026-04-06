import { useState, useCallback, memo } from 'react';
import { MapPin, Star, Package, TrendingUp, Zap, Sparkles, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MarketplaceCreator, PortfolioMedia } from '../types/marketplace';
import { getOptimizedImageUrl, getOptimizedThumbnail } from '@/lib/imageOptimization';

// -------------------------------------------------------------------
// Types
// -------------------------------------------------------------------

export type RankingTag = 'top' | 'rising' | 'new';

export interface RankedCreator extends MarketplaceCreator {
  ranking_tag?: RankingTag | null;
  ranking_score?: number;
}

interface CreatorCardProps {
  creator: RankedCreator;
  onClick: () => void;
  style?: React.CSSProperties;
  /** Prioridad alta para LCP - primeras tarjetas visibles */
  priority?: boolean;
}

// -------------------------------------------------------------------
// Helpers
// -------------------------------------------------------------------

const CARD_WIDTH = 180;
const CARD_HEIGHT = 320;
const THUMB_WIDTH = CARD_WIDTH * 2; // 360px para 2x retina
const THUMB_HEIGHT = CARD_HEIGHT * 2; // 640px para 2x retina

function resolveThumb(item: PortfolioMedia): string {
  // Pasar todo por getOptimizedThumbnail — aplica wsrv.nl a Bunny CDN
  // evitando descargar thumbnails de 1440x2560px cuando se muestran a ~360px
  const base = item.thumbnail_url || item.url;
  if (!base) return '';
  return getOptimizedThumbnail(base, THUMB_WIDTH, THUMB_HEIGHT, 80);
}

function formatPrice(price: number, currency: string): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: currency || 'USD',
    maximumFractionDigits: 0,
  }).format(price);
}

// -------------------------------------------------------------------
// RankingBadge (local — variante simplificada para la card)
// -------------------------------------------------------------------

interface RankingBadgeProps {
  tag: RankingTag;
}

const RANKING_CONFIG: Record<RankingTag, { label: string; icon: React.ReactNode; className: string }> = {
  top: {
    label: 'Top',
    icon: <Star className="h-3 w-3 fill-current" aria-hidden="true" />,
    className: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
  },
  rising: {
    label: 'Rising',
    icon: <TrendingUp className="h-3 w-3" aria-hidden="true" />,
    className: 'bg-purple-500/20 text-purple-400 border border-purple-500/30',
  },
  new: {
    label: 'Nuevo',
    icon: <Zap className="h-3 w-3" aria-hidden="true" />,
    className: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
  },
};

function RankingBadge({ tag }: RankingBadgeProps) {
  const config = RANKING_CONFIG[tag];
  return (
    <span
      role="img"
      aria-label={`Creador ${config.label}`}
      className={cn(
        'inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full backdrop-blur-sm',
        config.className,
      )}
    >
      {config.icon}
      {config.label}
    </span>
  );
}

// -------------------------------------------------------------------
// CreatorCard
// -------------------------------------------------------------------

function CreatorCardComponent({ creator, onClick, style, priority = false }: CreatorCardProps) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const firstMedia = creator.portfolio_media?.[0] ?? null;

  const handleLoad = useCallback(() => setImgLoaded(true), []);

  // Atributos de carga según prioridad (para mejorar LCP)
  const loadingAttr = priority ? 'eager' : 'lazy';
  const decodingAttr = priority ? 'sync' : 'async';

  const locationParts = [creator.location_city, creator.location_country].filter(Boolean);
  const locationLabel = locationParts.join(', ');

  return (
    <div
      className={cn(
        // Base layout — 9:16 aspect ratio
        'relative w-full cursor-pointer select-none overflow-hidden rounded-xl',
        'aspect-[9/16]',
        // Nova Design System base — dark: color fijo / light: card oscuro con fallback
        'bg-card dark:bg-[#0f0f22] border border-border dark:border-purple-500/15',
        // Hover: sutil escala + glow purple
        'transition-all duration-300 ease-out',
        'hover:scale-[1.025] hover:-translate-y-0.5',
        'hover:border-purple-500/40 hover:shadow-[0_0_20px_rgba(139,92,246,0.18)]',
        // Active feedback
        'active:scale-[0.98]',
        // Focus visible para keyboard navigation
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50 focus-visible:ring-offset-1',
      )}
      style={{
        contain: 'layout style paint', // CSS containment para prevenir layout shifts
        ...style,
      }}
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-label={`Ver perfil de ${creator.display_name}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
    >
      {/* ---- Background: thumbnail o avatar ---- */}
      <div className="absolute inset-0">
        {firstMedia ? (
          <>
            {!imgLoaded && (
              <div className="absolute inset-0 bg-[#1a1a35] animate-pulse" />
            )}
            <img
              src={resolveThumb(firstMedia)}
              alt=""
              width={CARD_WIDTH}
              height={CARD_HEIGHT}
              loading={loadingAttr}
              decoding={decodingAttr}
              fetchPriority={priority ? 'high' : undefined}
              className={cn(
                'w-full h-full object-cover transition-opacity duration-300',
                imgLoaded ? 'opacity-100' : 'opacity-0',
              )}
              onLoad={handleLoad}
            />
          </>
        ) : creator.avatar_url ? (
          <img
            src={getOptimizedImageUrl(creator.avatar_url, { width: CARD_WIDTH * 2, quality: 80 })}
            alt={creator.display_name}
            width={CARD_WIDTH}
            height={CARD_HEIGHT}
            loading={loadingAttr}
            decoding={decodingAttr}
            fetchPriority={priority ? 'high' : undefined}
            className="w-full h-full object-cover"
          />
        ) : (
          // Fallback: initial con fondo degradado
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-900/40 to-[#0f0f22]">
            <span className="text-5xl font-bold text-purple-400/60 select-none" aria-hidden="true">
              {creator.display_name.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
      </div>

      {/* ---- Verified badge (top-right) ---- */}
      {creator.is_verified && (
        <div className="absolute top-2.5 right-2.5 z-20">
          <span
            role="img"
            aria-label="Creador verificado"
            className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-500/90 backdrop-blur-sm"
          >
            <Sparkles className="h-3 w-3 text-white" aria-hidden="true" />
          </span>
        </div>
      )}

      {/* ---- Organization badge (top-left) ---- */}
      {creator.organization_id && creator.organization_name && (
        <div className="absolute top-2.5 left-2.5 z-20">
          <div
            className="flex items-center gap-1 bg-black/60 backdrop-blur-sm rounded-full px-2 py-1 max-w-[120px]"
            title={creator.organization_name}
          >
            {creator.organization_logo ? (
              <img
                src={getOptimizedImageUrl(creator.organization_logo, { width: 32, quality: 70 })}
                alt={creator.organization_name}
                width={14}
                height={14}
                loading="lazy"
                decoding="async"
                className="w-3.5 h-3.5 rounded-full object-cover flex-shrink-0"
              />
            ) : (
              <Building2 className="h-3 w-3 text-purple-400 flex-shrink-0" aria-hidden="true" />
            )}
            <span className="text-[9px] text-white/90 font-medium truncate">
              {creator.organization_name}
            </span>
          </div>
        </div>
      )}

      {/* ---- Gradient overlay de abajo hacia arriba ---- */}
      <div
        className="absolute inset-0 pointer-events-none"
        aria-hidden="true"
        style={{
          background:
            'linear-gradient(to top, rgba(10,10,28,0.97) 0%, rgba(10,10,28,0.75) 35%, rgba(10,10,28,0.15) 65%, transparent 100%)',
        }}
      />

      {/* ---- Contenido inferior ---- */}
      <div className="absolute bottom-0 inset-x-0 z-10 px-3 pb-3 pt-6 space-y-1.5">

        {/* Ranking badge */}
        {creator.ranking_tag && (
          <div>
            <RankingBadge tag={creator.ranking_tag} />
          </div>
        )}

        {/* Nombre */}
        <p className="text-[#e4e4e7] font-semibold text-sm leading-tight truncate drop-shadow-md">
          {creator.display_name}
        </p>

        {/* Ubicacion */}
        {locationLabel && (
          <div className="flex items-center gap-1 text-[#a1a1aa] text-[11px]">
            <MapPin className="h-3 w-3 flex-shrink-0" aria-hidden="true" />
            <span className="truncate">{locationLabel}</span>
          </div>
        )}

        {/* Precio base */}
        {creator.base_price != null && creator.base_price > 0 && (
          <p className="text-purple-400 font-semibold text-[12px] leading-none">
            desde {formatPrice(creator.base_price, creator.currency)}
          </p>
        )}

        {/* Rating + proyectos */}
        {(creator.rating_count > 0 || creator.completed_projects > 0) && (
          <div className="flex items-center gap-2.5 flex-wrap pt-0.5">
            {creator.rating_count > 0 && (
              <div
                className="flex items-center gap-1"
                aria-label={`Calificacion: ${creator.rating_avg.toFixed(1)} de 5, basado en ${creator.rating_count} resenas`}
              >
                <Star className="h-3 w-3 text-amber-400 fill-amber-400" aria-hidden="true" />
                <span className="text-[#e4e4e7] text-[11px] font-medium">
                  {creator.rating_avg.toFixed(1)}
                </span>
                <span className="text-[#71717a] text-[10px]">
                  ({creator.rating_count})
                </span>
              </div>
            )}
            {creator.completed_projects > 0 && (
              <div
                className="flex items-center gap-1 text-[#71717a]"
                aria-label={`${creator.completed_projects} proyectos completados`}
              >
                <Package className="h-3 w-3" aria-hidden="true" />
                <span className="text-[11px]">{creator.completed_projects}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export const CreatorCard = memo(CreatorCardComponent);
