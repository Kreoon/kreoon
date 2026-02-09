import { useState, useCallback } from 'react';
import { Play, Grid } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PortfolioMedia } from '../types/marketplace';
import type { PortfolioItemData } from '@/hooks/usePortfolioItems';
import { getBunnyThumbnailUrl } from '@/hooks/useHLSPlayer';
import { GalleryLightbox } from './GalleryLightbox';

/** For video items, prefer Bunny Stream CDN thumbnail (always reliable) */
function resolveThumb(item: PortfolioMedia): string {
  if (item.type === 'video') {
    const bunnyThumb = getBunnyThumbnailUrl(item.url);
    if (bunnyThumb) return bunnyThumb;
  }
  if (item.thumbnail_url) return item.thumbnail_url;
  return item.url;
}

/** Parse "9:16" → 0.5625, "16:9" → 1.7778 */
function parseAR(ratio: string | undefined): number {
  if (!ratio) return 9 / 16;
  const [w, h] = ratio.split(':').map(Number);
  return w > 0 && h > 0 ? w / h : 9 / 16;
}

const MAX_DESKTOP = 5;
const DESKTOP_HEIGHT = 480;
const MOBILE_HEIGHT = 280;

interface PortfolioGalleryProps {
  media: PortfolioMedia[];
  portfolioItems: PortfolioItemData[];
  creatorName: string;
  creatorAvatar: string | null;
  creatorId: string;
}

export function PortfolioGallery({
  media,
  portfolioItems,
  creatorName,
  creatorAvatar,
  creatorId,
}: PortfolioGalleryProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const openLightbox = useCallback((idx: number) => setLightboxIndex(idx), []);

  if (media.length === 0) return null;

  /** Numeric aspect ratio for item at index i */
  const ar = (i: number) => parseAR(portfolioItems[i]?.aspect_ratio);

  const desktopItems = media.slice(0, MAX_DESKTOP);
  const hasMore = media.length > MAX_DESKTOP;
  const heroAR = ar(0);
  const isSingle = desktopItems.length === 1;

  // Split secondary items into 2 columns (alternating: 1→A, 2→B, 3→A, 4→B)
  const secondary = desktopItems.slice(1);
  const colA: { item: PortfolioMedia; origIdx: number }[] = [];
  const colB: { item: PortfolioMedia; origIdx: number }[] = [];
  secondary.forEach((item, si) => {
    if (si % 2 === 0) colA.push({ item, origIdx: si + 1 });
    else colB.push({ item, origIdx: si + 1 });
  });
  const hasColB = colB.length > 0;

  return (
    <>
      {/* ── Desktop: Bento layout (hero + weighted flex columns) ── */}
      <div
        className="hidden md:flex gap-2 rounded-2xl overflow-hidden"
        style={{ height: DESKTOP_HEIGHT }}
      >
        {/* Hero — aspect-ratio-driven width, full container height */}
        <button
          onClick={() => openLightbox(0)}
          className={cn(
            'relative h-full flex-shrink-0 overflow-hidden group bg-[#1a1a2e]',
            isSingle ? 'w-full rounded-2xl' : 'rounded-l-2xl',
          )}
          style={isSingle ? undefined : { aspectRatio: heroAR }}
        >
          <img
            src={resolveThumb(desktopItems[0])}
            alt=""
            className={cn(
              'w-full h-full transition-transform duration-300 group-hover:scale-105',
              isSingle ? 'object-contain' : 'object-cover',
            )}
          />
          {desktopItems[0].type === 'video' && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-14 h-14 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center">
                <Play className="h-6 w-6 text-white fill-white ml-0.5" />
              </div>
            </div>
          )}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
        </button>

        {/* Secondary bento columns — flex-grow weighted by 1/AR */}
        {secondary.length > 0 && (
          <div className="flex-1 flex gap-2 min-w-0">
            {/* Column A */}
            <div className="flex-1 flex flex-col gap-2 min-w-0">
              {colA.map(({ item, origIdx }) => {
                const isLastInGrid = origIdx === desktopItems.length - 1;
                return (
                  <button
                    key={item.id}
                    onClick={() => openLightbox(origIdx)}
                    className={cn(
                      'relative overflow-hidden group bg-[#1a1a2e] min-h-0',
                      !hasColB && 'rounded-r-2xl',
                    )}
                    style={{ flex: `${1 / ar(origIdx)} 1 0%` }}
                  >
                    <img
                      src={resolveThumb(item)}
                      alt=""
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    {item.type === 'video' && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center">
                          <Play className="h-4 w-4 text-white fill-white ml-0.5" />
                        </div>
                      </div>
                    )}
                    {isLastInGrid && hasMore && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <span className="bg-white text-black text-sm font-semibold px-4 py-2 rounded-lg shadow-lg flex items-center gap-1.5">
                          <Grid className="h-4 w-4" />
                          +{media.length - MAX_DESKTOP} más
                        </span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                  </button>
                );
              })}
            </div>

            {/* Column B */}
            {hasColB && (
              <div className="flex-1 flex flex-col gap-2 min-w-0">
                {colB.map(({ item, origIdx }, ci) => {
                  const isLastInGrid = origIdx === desktopItems.length - 1;
                  const isLastInCol = ci === colB.length - 1;
                  return (
                    <button
                      key={item.id}
                      onClick={() => openLightbox(origIdx)}
                      className={cn(
                        'relative overflow-hidden group bg-[#1a1a2e] min-h-0',
                        isLastInCol && 'rounded-br-2xl',
                        ci === 0 && 'rounded-tr-2xl',
                      )}
                      style={{ flex: `${1 / ar(origIdx)} 1 0%` }}
                    >
                      <img
                        src={resolveThumb(item)}
                        alt=""
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      {item.type === 'video' && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center">
                            <Play className="h-4 w-4 text-white fill-white ml-0.5" />
                          </div>
                        </div>
                      )}
                      {isLastInGrid && hasMore && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <span className="bg-white text-black text-sm font-semibold px-4 py-2 rounded-lg shadow-lg flex items-center gap-1.5">
                            <Grid className="h-4 w-4" />
                            +{media.length - MAX_DESKTOP} más
                          </span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Mobile: Horizontal scroll with aspect-ratio cards ── */}
      <div
        className="md:hidden flex gap-2 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-2"
        style={{ height: MOBILE_HEIGHT }}
      >
        {media.slice(0, 8).map((item, i) => (
          <button
            key={item.id}
            onClick={() => openLightbox(i)}
            className="snap-start flex-shrink-0 rounded-xl overflow-hidden relative group bg-[#1a1a2e] h-full"
            style={{ aspectRatio: ar(i) }}
          >
            <img
              src={resolveThumb(item)}
              alt=""
              className="w-full h-full object-cover"
            />
            {item.type === 'video' && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center">
                  <Play className="h-3.5 w-3.5 text-white fill-white ml-0.5" />
                </div>
              </div>
            )}
          </button>
        ))}
      </div>

      {/* ── Lightbox ── */}
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
    </>
  );
}
