import { useState, useCallback } from 'react';
import { Play, Maximize2, ImageOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PortfolioMedia } from '../types/marketplace';
import type { PortfolioItemData } from '@/hooks/usePortfolioItems';
import { GalleryLightbox } from './GalleryLightbox';
import { getOptimizedThumbnail } from '@/lib/imageOptimization';

// Dimensiones base de display para las cards del grid (px).
// Se pasan a getOptimizedThumbnail para que wsrv.nl recorte a medida exacta.
// columns-2 → cada columna mide ~50vw (max ~300px en desktop), 2x para retina.
const GRID_W = 300;
const GRID_H_LARGE = Math.round(GRID_W * (16 / 9)); // 9:16 → 533px
const GRID_H_SMALL = Math.round(GRID_W * (4 / 3));  // 3:4 → 400px

function resolveThumb(item: PortfolioMedia, size: 'large' | 'small'): string {
  const h = size === 'large' ? GRID_H_LARGE : GRID_H_SMALL;

  // Prioridad: thumbnail_url guardado > URL del media
  // El thumbnail_url de la BD es más confiable que construir la URL
  let base = item.thumbnail_url;

  // Si no hay thumbnail guardado, usar URL directa
  if (!base) {
    base = item.url;
  }

  if (!base) return '';

  // getOptimizedThumbnail envía por wsrv.nl para resize
  return getOptimizedThumbnail(base, GRID_W * 2, h * 2, 80);
}

interface PortfolioGridProps {
  media: PortfolioMedia[];
  portfolioItems: PortfolioItemData[];
  creatorName: string;
  creatorAvatar: string | null;
  creatorId: string;
}

type FilterTab = 'all' | 'video' | 'image';

/**
 * Collage-style grid that respects vertical (9:16) format
 * with varying sizes for visual interest.
 *
 * Pattern repeats every 6 items:
 *   [0] large  (span 2 rows)
 *   [1] small
 *   [2] small
 *   [3] large  (span 2 rows)
 *   [4] small
 *   [5] small
 */
function getItemSize(index: number): 'large' | 'small' {
  const pos = index % 6;
  return pos === 0 || pos === 3 ? 'large' : 'small';
}

// ─── Portfolio Thumbnail con fallback ───────────────────────────────────────

interface PortfolioThumbnailProps {
  item: PortfolioMedia;
  size: 'large' | 'small';
  onClick: () => void;
}

function PortfolioThumbnail({ item, size, onClick }: PortfolioThumbnailProps) {
  const [hasError, setHasError] = useState(false);
  const thumbUrl = resolveThumb(item, size);

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full rounded-sm overflow-hidden relative group cursor-pointer break-inside-avoid',
        size === 'large' ? 'aspect-[9/16]' : 'aspect-[3/4]',
      )}
    >
      {hasError || !thumbUrl ? (
        <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
          <ImageOff className="h-8 w-8 text-zinc-600" />
        </div>
      ) : (
        <img
          src={thumbUrl}
          alt=""
          width={GRID_W}
          height={size === 'large' ? GRID_H_LARGE : GRID_H_SMALL}
          loading="lazy"
          decoding="async"
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          onError={() => setHasError(true)}
        />
      )}
      {/* Hover overlay */}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
        <Maximize2 className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
      {/* Video badge */}
      {item.type === 'video' && (
        <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
          <Play className="h-3 w-3 fill-white" />
          Video
        </div>
      )}
    </button>
  );
}

export function PortfolioGrid({
  media,
  portfolioItems,
  creatorName,
  creatorAvatar,
  creatorId,
}: PortfolioGridProps) {
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [showAll, setShowAll] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const filtered = activeTab === 'all' ? media : media.filter(m => m.type === activeTab);
  const visible = showAll ? filtered : filtered.slice(0, 9);

  const tabs: { key: FilterTab; label: string }[] = [
    { key: 'all', label: 'Todo' },
    { key: 'video', label: 'Videos' },
    { key: 'image', label: 'Fotos' },
  ];

  const handleOpen = useCallback(
    (index: number) => {
      // Map visible index to full media array index for lightbox
      const item = visible[index];
      const fullIndex = media.findIndex(m => m.id === item.id);
      setLightboxIndex(fullIndex >= 0 ? fullIndex : index);
    },
    [visible, media],
  );

  if (media.length === 0) return null;

  return (
    <div className="pb-8 border-b border-white/10 space-y-4">
      <h2 className="text-xl font-semibold text-white">Portfolio</h2>

      {/* Tabs */}
      <div className="flex gap-2">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => {
              setActiveTab(tab.key);
              setShowAll(false);
            }}
            className={cn(
              'px-4 py-2 rounded-full text-sm transition-colors',
              activeTab === tab.key
                ? 'bg-white text-black font-semibold'
                : 'bg-white/5 text-gray-400 hover:text-white border border-white/10',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Masonry-style collage grid — vertical content with varying sizes */}
      <div className="columns-2 md:columns-3 lg:columns-4 gap-3 space-y-3">
        {visible.map((item, i) => (
          <PortfolioThumbnail
            key={item.id}
            item={item}
            size={getItemSize(i)}
            onClick={() => handleOpen(i)}
          />
        ))}
      </div>

      {/* Load more */}
      {filtered.length > 9 && !showAll && (
        <div className="flex justify-center pt-2">
          <button
            onClick={() => setShowAll(true)}
            className="text-purple-400 hover:text-purple-300 text-sm font-medium transition-colors"
          >
            Ver más contenido ({filtered.length - 9} más)
          </button>
        </div>
      )}

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <GalleryLightbox
          media={media}
          portfolioItems={portfolioItems}
          currentIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          creatorName={creatorName}
          creatorAvatar={creatorAvatar}
          creatorId={creatorId}
        />
      )}
    </div>
  );
}
