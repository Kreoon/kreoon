/**
 * Portfolio Block - Profile Builder
 *
 * Muestra el portfolio real del creador con:
 * - Datos de portfolio_items (no manual)
 * - Thumbnails optimizados con Bunny CDN
 * - Múltiples layouts: grid, masonry, featured, carousel
 * - Filtros por categoría
 * - Visor fullscreen tipo TikTok
 */

import { memo, useState, useMemo, useCallback } from 'react';
import {
  Play,
  Eye,
  Heart,
  ChevronLeft,
  ChevronRight,
  Grid3x3,
  LayoutGrid,
  Star,
  Loader2,
  ImageOff,
  Filter,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { BlockProps } from '../types/profile-builder';
import { usePortfolioItems, type PortfolioItemData } from '@/hooks/usePortfolioItems';
import { getBunnyVideoUrls } from '@/hooks/useHLSPlayer';
import { FullscreenVideoViewer } from '@/components/content/FullscreenVideoViewer';
import { VideoPlayerProvider } from '@/contexts/VideoPlayerContext';

// ─── Tipos ──────────────────────────────────────────────────────────────────

interface PortfolioConfig {
  /** Layout de visualización */
  layout: 'grid' | 'masonry' | 'featured' | 'carousel';
  /** Columnas para grid */
  columns: 2 | 3 | 4;
  /** Mostrar títulos */
  showTitles: boolean;
  /** Mostrar métricas (vistas, likes) */
  showMetrics: boolean;
  /** Mostrar filtro de categoría */
  showCategoryFilter: boolean;
  /** Mostrar solo destacados */
  onlyFeatured: boolean;
  /** Máximo de items a mostrar */
  maxItems: number;
  /** Relación de aspecto de thumbnails */
  aspectRatio: '9:16' | '1:1' | '4:5' | '16:9';
  /** Gap entre items */
  gap: 'sm' | 'md' | 'lg';
  /** Mostrar badge de destacado */
  showFeaturedBadge: boolean;
  /** Hover effect */
  hoverEffect: 'zoom' | 'overlay' | 'none';
  /** Autoplay carousel */
  carouselAutoplay: boolean;
}

// ─── Constantes ─────────────────────────────────────────────────────────────

const BUNNY_CDN_HOST = 'https://vz-93653693-f0a.b-cdn.net';

const ASPECT_RATIO_CLASSES = {
  '9:16': 'aspect-[9/16]',
  '1:1': 'aspect-square',
  '4:5': 'aspect-[4/5]',
  '16:9': 'aspect-video',
};

const GAP_CLASSES = {
  sm: 'gap-2',
  md: 'gap-3',
  lg: 'gap-4',
};

const COLUMNS_CLASSES = {
  2: 'grid-cols-2',
  3: 'grid-cols-2 sm:grid-cols-3',
  4: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4',
};

const CATEGORIES = [
  { value: 'all', label: 'Todos' },
  { value: 'ugc', label: 'UGC' },
  { value: 'reels', label: 'Reels' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'photography', label: 'Foto' },
  { value: 'other', label: 'Otro' },
];

// ─── Helpers ────────────────────────────────────────────────────────────────

function getBunnyThumbnail(item: PortfolioItemData, size: 'sm' | 'md' | 'lg' = 'md'): string {
  const sizes = {
    sm: { w: 320, h: 568 },
    md: { w: 480, h: 854 },
    lg: { w: 720, h: 1280 },
  };

  // Para videos de Bunny, usar thumbnail optimizado
  if (item.media_type === 'video' && item.bunny_video_id) {
    const { w, h } = sizes[size];
    return `${BUNNY_CDN_HOST}/${item.bunny_video_id}/thumbnail.jpg?width=${w}&height=${h}`;
  }

  // Para videos con URL de Bunny, extraer el ID
  if (item.media_type === 'video' && item.media_url) {
    const bunnyUrls = getBunnyVideoUrls(item.media_url);
    if (bunnyUrls?.thumbnail) {
      return bunnyUrls.thumbnail;
    }
  }

  // Fallback a thumbnail guardado o URL del media
  return item.thumbnail_url || item.media_url;
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return '';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatCount(count: number): string {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return count.toString();
}

// ─── Portfolio Item Component ───────────────────────────────────────────────

interface PortfolioItemProps {
  item: PortfolioItemData;
  config: PortfolioConfig;
  onClick: () => void;
  size?: 'sm' | 'md' | 'lg';
}

function PortfolioItemCard({ item, config, onClick, size = 'md' }: PortfolioItemProps) {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const thumbnailUrl = getBunnyThumbnail(item, size);

  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-lg bg-muted cursor-pointer',
        ASPECT_RATIO_CLASSES[config.aspectRatio],
        config.hoverEffect === 'zoom' && 'hover:scale-[1.02] transition-transform duration-300',
        'ring-0 hover:ring-2 hover:ring-primary/50 transition-all',
      )}
      onClick={onClick}
    >
      {/* Loading skeleton */}
      {!imageLoaded && !imageError && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted animate-pulse">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Thumbnail */}
      {!imageError ? (
        <img
          src={thumbnailUrl}
          alt={item.title || 'Portfolio item'}
          className={cn(
            'w-full h-full object-cover transition-opacity duration-300',
            imageLoaded ? 'opacity-100' : 'opacity-0',
            config.hoverEffect === 'zoom' && 'group-hover:scale-105 transition-transform duration-500',
          )}
          loading="lazy"
          decoding="async"
          onLoad={() => setImageLoaded(true)}
          onError={() => setImageError(true)}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-muted">
          <ImageOff className="h-8 w-8 text-muted-foreground/50" />
        </div>
      )}

      {/* Video indicator + duration */}
      {item.media_type === 'video' && (
        <>
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-12 h-12 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center opacity-90 group-hover:opacity-100 group-hover:scale-110 transition-all">
              <Play className="h-5 w-5 text-white fill-white ml-0.5" />
            </div>
          </div>
          {item.duration_seconds && (
            <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/70 text-[10px] text-white font-medium">
              {formatDuration(item.duration_seconds)}
            </div>
          )}
        </>
      )}

      {/* Featured badge */}
      {config.showFeaturedBadge && item.is_featured && (
        <div className="absolute top-2 left-2">
          <Badge variant="secondary" className="gap-1 text-[10px] bg-amber-500/90 text-white border-0">
            <Star className="h-2.5 w-2.5 fill-current" />
            Destacado
          </Badge>
        </div>
      )}

      {/* Overlay con info */}
      {config.hoverEffect === 'overlay' && (
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      )}

      {/* Title + metrics */}
      {(config.showTitles || config.showMetrics) && (
        <div
          className={cn(
            'absolute bottom-0 inset-x-0 p-2 bg-gradient-to-t from-black/80 to-transparent',
            config.hoverEffect === 'overlay' ? 'opacity-0 group-hover:opacity-100 transition-opacity' : '',
          )}
        >
          {config.showTitles && item.title && (
            <p className="text-sm text-white font-medium truncate">{item.title}</p>
          )}
          {config.showMetrics && (
            <div className="flex items-center gap-3 mt-1 text-[10px] text-white/80">
              <span className="flex items-center gap-1">
                <Eye className="h-3 w-3" />
                {formatCount(item.views_count)}
              </span>
              <span className="flex items-center gap-1">
                <Heart className="h-3 w-3" />
                {formatCount(item.likes_count)}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Carousel Layout ────────────────────────────────────────────────────────

function CarouselLayout({
  items,
  config,
  onItemClick,
}: {
  items: PortfolioItemData[];
  config: PortfolioConfig;
  onItemClick: (index: number) => void;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const visibleCount = config.columns;

  const canGoPrev = currentIndex > 0;
  const canGoNext = currentIndex + visibleCount < items.length;

  const goToPrev = useCallback(() => {
    setCurrentIndex((i) => Math.max(0, i - 1));
  }, []);

  const goToNext = useCallback(() => {
    setCurrentIndex((i) => Math.min(items.length - visibleCount, i + 1));
  }, [items.length, visibleCount]);

  const visibleItems = items.slice(currentIndex, currentIndex + visibleCount);

  return (
    <div className="relative group/carousel">
      {/* Nav buttons */}
      {canGoPrev && (
        <button
          onClick={goToPrev}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-background/90 shadow-lg flex items-center justify-center opacity-0 group-hover/carousel:opacity-100 transition-opacity hover:bg-background"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
      )}
      {canGoNext && (
        <button
          onClick={goToNext}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-background/90 shadow-lg flex items-center justify-center opacity-0 group-hover/carousel:opacity-100 transition-opacity hover:bg-background"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      )}

      {/* Items */}
      <div className={cn('grid', COLUMNS_CLASSES[config.columns], GAP_CLASSES[config.gap])}>
        {visibleItems.map((item, idx) => (
          <PortfolioItemCard
            key={item.id}
            item={item}
            config={config}
            onClick={() => onItemClick(currentIndex + idx)}
          />
        ))}
      </div>

      {/* Dots */}
      {items.length > visibleCount && (
        <div className="flex justify-center gap-1.5 mt-4">
          {Array.from({ length: Math.ceil(items.length / visibleCount) }).map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentIndex(i * visibleCount)}
              className={cn(
                'w-2 h-2 rounded-full transition-colors',
                Math.floor(currentIndex / visibleCount) === i ? 'bg-primary' : 'bg-muted-foreground/30',
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Featured Layout ────────────────────────────────────────────────────────

function FeaturedLayout({
  items,
  config,
  onItemClick,
}: {
  items: PortfolioItemData[];
  config: PortfolioConfig;
  onItemClick: (index: number) => void;
}) {
  const featuredItem = items[0];
  const restItems = items.slice(1, 5);

  if (!featuredItem) return null;

  return (
    <div className={cn('grid grid-cols-2 md:grid-cols-3', GAP_CLASSES[config.gap])}>
      {/* Featured item (larger) */}
      <div className="col-span-2 row-span-2">
        <PortfolioItemCard
          item={featuredItem}
          config={{ ...config, aspectRatio: '4:5' }}
          onClick={() => onItemClick(0)}
          size="lg"
        />
      </div>

      {/* Rest items */}
      {restItems.map((item, idx) => (
        <PortfolioItemCard
          key={item.id}
          item={item}
          config={config}
          onClick={() => onItemClick(idx + 1)}
          size="sm"
        />
      ))}
    </div>
  );
}

// ─── Masonry Layout ─────────────────────────────────────────────────────────

function MasonryLayout({
  items,
  config,
  onItemClick,
}: {
  items: PortfolioItemData[];
  config: PortfolioConfig;
  onItemClick: (index: number) => void;
}) {
  // Distribuir items en columnas
  const columns: PortfolioItemData[][] = Array.from({ length: config.columns }, () => []);
  items.forEach((item, idx) => {
    columns[idx % config.columns].push(item);
  });

  return (
    <div className={cn('flex', GAP_CLASSES[config.gap])}>
      {columns.map((columnItems, colIdx) => (
        <div key={colIdx} className={cn('flex-1 flex flex-col', GAP_CLASSES[config.gap])}>
          {columnItems.map((item) => {
            const originalIndex = items.findIndex((i) => i.id === item.id);
            // Variar aspect ratio para efecto masonry
            const aspectRatios: PortfolioConfig['aspectRatio'][] = ['9:16', '4:5', '1:1'];
            const randomAspect = aspectRatios[(originalIndex + colIdx) % 3];

            return (
              <PortfolioItemCard
                key={item.id}
                item={item}
                config={{ ...config, aspectRatio: randomAspect }}
                onClick={() => onItemClick(originalIndex)}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ─── Grid Layout ────────────────────────────────────────────────────────────

function GridLayout({
  items,
  config,
  onItemClick,
}: {
  items: PortfolioItemData[];
  config: PortfolioConfig;
  onItemClick: (index: number) => void;
}) {
  return (
    <div className={cn('grid', COLUMNS_CLASSES[config.columns], GAP_CLASSES[config.gap])}>
      {items.map((item, idx) => (
        <PortfolioItemCard key={item.id} item={item} config={config} onClick={() => onItemClick(idx)} />
      ))}
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

function PortfolioBlockComponent({
  block,
  isEditing,
  isSelected,
  creatorProfileId,
}: BlockProps) {
  const config = {
    layout: 'grid',
    columns: 3,
    showTitles: true,
    showMetrics: true,
    showCategoryFilter: false,
    onlyFeatured: false,
    maxItems: 12,
    aspectRatio: '9:16',
    gap: 'md',
    showFeaturedBadge: true,
    hoverEffect: 'overlay',
    carouselAutoplay: false,
    ...block.config,
  } as PortfolioConfig;

  const styles = block.styles;

  // Estado para filtro y viewer
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerInitialIndex, setViewerInitialIndex] = useState(0);

  // Cargar items reales del portfolio
  const {
    items: portfolioItems,
    loading,
  } = usePortfolioItems({
    creatorProfileId,
  });

  // Filtrar y limitar items
  const filteredItems = useMemo(() => {
    let items = portfolioItems || [];

    // Solo públicos
    items = items.filter((i) => i.is_public);

    // Solo destacados si está configurado
    if (config.onlyFeatured) {
      items = items.filter((i) => i.is_featured);
    }

    // Filtrar por categoría
    if (selectedCategory !== 'all') {
      items = items.filter((i) => i.category === selectedCategory);
    }

    // Ordenar: destacados primero, luego por display_order
    items = [...items].sort((a, b) => {
      if (a.is_featured !== b.is_featured) return a.is_featured ? -1 : 1;
      return (a.display_order || 0) - (b.display_order || 0);
    });

    // Limitar
    return items.slice(0, config.maxItems);
  }, [portfolioItems, config.onlyFeatured, config.maxItems, selectedCategory]);

  // Convertir a formato para FullscreenVideoViewer
  const viewerItems = useMemo(() => {
    return filteredItems.map((item) => ({
      id: item.id,
      title: item.title || '',
      videoUrls: item.media_type === 'video' ? [item.media_url] : [],
      thumbnailUrl: getBunnyThumbnail(item, 'lg'),
      viewsCount: item.views_count,
      likesCount: item.likes_count,
      isLiked: false,
      mediaType: item.media_type as 'video' | 'image',
      mediaUrl: item.media_url,
      caption: item.description || item.title || '',
    }));
  }, [filteredItems]);

  const openViewer = useCallback((index: number) => {
    setViewerInitialIndex(index);
    setViewerOpen(true);
  }, []);

  const paddingClasses = {
    none: 'p-0',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
    xl: 'p-12',
  };

  // Categorías disponibles en el portfolio actual
  const availableCategories = useMemo(() => {
    const cats = new Set(portfolioItems?.map((i) => i.category).filter(Boolean));
    return CATEGORIES.filter((c) => c.value === 'all' || cats.has(c.value));
  }, [portfolioItems]);

  // Render layout
  const renderLayout = () => {
    if (filteredItems.length === 0) return null;

    switch (config.layout) {
      case 'carousel':
        return <CarouselLayout items={filteredItems} config={config} onItemClick={openViewer} />;
      case 'featured':
        return <FeaturedLayout items={filteredItems} config={config} onItemClick={openViewer} />;
      case 'masonry':
        return <MasonryLayout items={filteredItems} config={config} onItemClick={openViewer} />;
      case 'grid':
      default:
        return <GridLayout items={filteredItems} config={config} onItemClick={openViewer} />;
    }
  };

  return (
    <div
      className={cn(paddingClasses[styles.padding || 'md'])}
      style={{
        backgroundColor: styles.backgroundColor,
        color: styles.textColor,
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-foreground">Portfolio</h2>

        {/* Category filter */}
        {config.showCategoryFilter && availableCategories.length > 2 && (
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-32 h-8 text-xs">
              <Filter className="h-3 w-3 mr-1.5" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availableCategories.map((cat) => (
                <SelectItem key={cat.value} value={cat.value}>
                  {cat.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Empty state */}
      {!loading && filteredItems.length === 0 && (
        <div className="border-2 border-dashed border-border rounded-lg p-12 text-center">
          <LayoutGrid className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-muted-foreground">
            {selectedCategory !== 'all'
              ? `No hay contenido en la categoría "${CATEGORIES.find((c) => c.value === selectedCategory)?.label}"`
              : config.onlyFeatured
                ? 'No hay contenido destacado'
                : 'No hay contenido en el portfolio'}
          </p>
          {isEditing && (
            <p className="text-xs text-muted-foreground/70 mt-2">
              Agrega contenido desde el Portfolio Manager en tu panel
            </p>
          )}
        </div>
      )}

      {/* Portfolio grid */}
      {!loading && filteredItems.length > 0 && renderLayout()}

      {/* Visor fullscreen */}
      {viewerOpen && viewerItems.length > 0 && (
        <VideoPlayerProvider>
          <FullscreenVideoViewer
            videos={viewerItems}
            initialIndex={viewerInitialIndex}
            onClose={() => setViewerOpen(false)}
          />
        </VideoPlayerProvider>
      )}
    </div>
  );
}

export const PortfolioBlock = memo(PortfolioBlockComponent);
