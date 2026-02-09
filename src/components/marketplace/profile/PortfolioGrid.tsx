import { useState, useCallback } from 'react';
import { Play, Maximize2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PortfolioMedia } from '../types/marketplace';
import type { PortfolioItemData } from '@/hooks/usePortfolioItems';
import { getBunnyThumbnailUrl } from '@/hooks/useHLSPlayer';
import { GalleryLightbox } from './GalleryLightbox';

function resolveThumb(item: PortfolioMedia): string {
  if (item.type === 'video') {
    const bunnyThumb = getBunnyThumbnailUrl(item.url);
    if (bunnyThumb) return bunnyThumb;
  }
  if (item.thumbnail_url) return item.thumbnail_url;
  return item.url;
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
        {visible.map((item, i) => {
          const size = getItemSize(i);
          return (
            <button
              key={item.id}
              onClick={() => handleOpen(i)}
              className={cn(
                'w-full rounded-xl overflow-hidden relative group cursor-pointer break-inside-avoid',
                size === 'large' ? 'aspect-[9/16]' : 'aspect-[3/4]',
              )}
            >
              <img
                src={resolveThumb(item)}
                alt=""
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
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
        })}
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
