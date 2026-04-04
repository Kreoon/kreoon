/**
 * Portfolio Block - Profile Builder
 *
 * El usuario SELECCIONA qué contenido mostrar de su biblioteca.
 * No carga todo automáticamente.
 *
 * Features:
 * - Selección de items desde MediaLibraryPicker
 * - Thumbnails optimizados de Bunny CDN
 * - Múltiples layouts: grid, masonry, featured, carousel
 * - Reproducción inline de videos con BunnyStreamPlayer
 */

import { memo, useState, useCallback } from 'react';
import {
  Eye,
  Heart,
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  Star,
  Loader2,
  ImageOff,
  Camera,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { BlockProps } from '../types/profile-builder';
import { MediaLibraryPicker } from '../media/MediaLibraryPicker';
import type { MediaItem } from '../media/types';
import { getBunnyVideoUrls, extractBunnyIds } from '@/hooks/useHLSPlayer';
import { BunnyStreamPlayer } from './BunnyStreamPlayer';
import { getBlockStyleObject } from './blockStyles';

// ─── Tipos ──────────────────────────────────────────────────────────────────

interface PortfolioItem {
  id: string;
  type: 'image' | 'video';
  url: string;
  thumbnailUrl?: string;
  bunnyVideoId?: string;
  title?: string;
  description?: string;
  duration?: number;
  viewsCount?: number;
  likesCount?: number;
  isFeatured?: boolean;
}

interface PortfolioConfig {
  layout: 'grid' | 'masonry' | 'featured' | 'carousel';
  columns: 2 | 3 | 4;
  showTitles: boolean;
  showMetrics: boolean;
  maxItems: number;
  aspectRatio: '9:16' | '1:1' | '4:5' | '16:9';
  gap: 'sm' | 'md' | 'lg';
  showFeaturedBadge: boolean;
  hoverEffect: 'zoom' | 'overlay' | 'none';
}

interface PortfolioContent {
  items?: PortfolioItem[];
}

// ─── Constantes ─────────────────────────────────────────────────────────────

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

// ─── Helpers para Bunny CDN ─────────────────────────────────────────────────

/**
 * Obtiene el mejor thumbnail disponible para un item
 * Prioriza: bunnyVideoId > thumbnailUrl guardado > extracción de URL > fallback
 */
function getOptimalThumbnail(item: PortfolioItem): string {
  // 1. Si es video y tiene bunnyVideoId, usar Bunny Stream thumbnail
  const BUNNY_STREAM_HOST = 'vz-78fcd769-050.b-cdn.net';
  if (item.type === 'video' && item.bunnyVideoId) {
    return `https://${BUNNY_STREAM_HOST}/${item.bunnyVideoId}/thumbnail.jpg`;
  }

  // 2. Si es video, intentar extraer IDs de la URL
  if (item.type === 'video' && item.url) {
    const bunnyUrls = getBunnyVideoUrls(item.url);
    if (bunnyUrls?.thumbnail) {
      return bunnyUrls.thumbnail;
    }

    // Intentar extraer directamente
    const ids = extractBunnyIds(item.url);
    if (ids?.videoId) {
      return `https://${BUNNY_STREAM_HOST}/${ids.videoId}/thumbnail.jpg`;
    }
  }

  // 3. Usar thumbnailUrl guardado si existe
  if (item.thumbnailUrl && !item.thumbnailUrl.includes('playlist.m3u8')) {
    return item.thumbnailUrl;
  }

  // 4. Fallback a la URL del media
  return item.url;
}

function formatDuration(seconds: number | undefined): string {
  if (!seconds) return '';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatCount(count: number | undefined): string {
  if (!count) return '0';
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return count.toString();
}

// ─── Portfolio Item Card ────────────────────────────────────────────────────

interface PortfolioItemCardProps {
  item: PortfolioItem;
  config: PortfolioConfig;
  onClick: () => void;
  isEditing?: boolean;
  onDelete?: () => void;
}

function PortfolioItemCard({
  item,
  config,
  onClick,
  isEditing,
  onDelete,
}: PortfolioItemCardProps) {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const thumbnailUrl = getOptimalThumbnail(item);
  const isVideo = item.type === 'video';

  // Determinar aspect ratio para el reproductor
  const getVideoAspectRatio = (): '16:9' | '9:16' | '1:1' | '4:3' => {
    switch (config.aspectRatio) {
      case '9:16': return '9:16';
      case '1:1': return '1:1';
      case '4:5': return '4:3'; // Aproximación
      case '16:9': return '16:9';
      default: return '16:9';
    }
  };

  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-lg bg-muted',
        ASPECT_RATIO_CLASSES[config.aspectRatio],
        !isVideo && config.hoverEffect === 'zoom' && 'hover:scale-[1.02] transition-transform duration-300',
        'ring-0 hover:ring-2 hover:ring-primary/50 transition-all',
        isEditing && 'cursor-pointer',
      )}
      onClick={isEditing ? onClick : undefined}
    >
      {/* VIDEO: Usar reproductor oficial de Bunny con miniatura integrada */}
      {isVideo && item.url && (
        <BunnyStreamPlayer
          videoUrl={item.url}
          autoplay={false}
          muted={false}
          loop={false}
          preload={true}
          aspectRatio={getVideoAspectRatio()}
          className="absolute inset-0 w-full h-full"
          borderRadius="none"
        />
      )}

      {/* IMAGEN: Mostrar thumbnail con efectos */}
      {!isVideo && (
        <>
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
                'w-full h-full object-cover transition-opacity duration-300 cursor-pointer',
                imageLoaded ? 'opacity-100' : 'opacity-0',
                config.hoverEffect === 'zoom' && 'group-hover:scale-105 transition-transform duration-500',
              )}
              loading="lazy"
              decoding="async"
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageError(true)}
              onClick={onClick}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-muted">
              <ImageOff className="h-8 w-8 text-muted-foreground/50" />
            </div>
          )}

          {/* Overlay con info */}
          {config.hoverEffect === 'overlay' && (
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
          )}

          {/* Title + metrics en hover o siempre */}
          {(config.showTitles || config.showMetrics) && (
            <div
              className={cn(
                'absolute bottom-0 inset-x-0 p-2 bg-gradient-to-t from-black/80 to-transparent pointer-events-none',
                config.hoverEffect === 'overlay' && !isEditing ? 'opacity-0 group-hover:opacity-100 transition-opacity' : '',
              )}
            >
              {config.showTitles && item.title && (
                <p className="text-sm text-white font-medium truncate">{item.title}</p>
              )}
              {config.showMetrics && (item.viewsCount || item.likesCount) && (
                <div className="flex items-center gap-3 mt-1 text-[10px] text-white/80">
                  {item.viewsCount !== undefined && (
                    <span className="flex items-center gap-1">
                      <Eye className="h-3 w-3" />
                      {formatCount(item.viewsCount)}
                    </span>
                  )}
                  {item.likesCount !== undefined && (
                    <span className="flex items-center gap-1">
                      <Heart className="h-3 w-3" />
                      {formatCount(item.likesCount)}
                    </span>
                  )}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Featured badge (para ambos tipos) */}
      {config.showFeaturedBadge && item.isFeatured && (
        <div className="absolute top-2 left-2 z-10 pointer-events-none">
          <Badge variant="secondary" className="gap-1 text-[10px] bg-amber-500/90 text-white border-0">
            <Star className="h-2.5 w-2.5 fill-current" />
          </Badge>
        </div>
      )}

      {/* Controles de edicion (overlay sobre video o imagen) */}
      {isEditing && (
        <>
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none z-10">
            <Camera className="h-6 w-6 text-white" />
          </div>
          {onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white hover:bg-red-600 transition-colors opacity-0 group-hover:opacity-100 z-20"
              aria-label="Eliminar"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </>
      )}
    </div>
  );
}

// ─── Props comunes para layouts ─────────────────────────────────────────────

interface LayoutProps {
  items: PortfolioItem[];
  config: PortfolioConfig;
  onItemClick: (index: number) => void;
  isEditing?: boolean;
  onDeleteItem?: (id: string) => void;
}

// ─── Carousel Layout ────────────────────────────────────────────────────────

function CarouselLayout({
  items,
  config,
  onItemClick,
  isEditing,
  onDeleteItem,
}: LayoutProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const visibleCount = config.columns;

  const canGoPrev = currentIndex > 0;
  const canGoNext = currentIndex + visibleCount < items.length;

  const visibleItems = items.slice(currentIndex, currentIndex + visibleCount);

  return (
    <div className="relative group/carousel">
      {canGoPrev && (
        <button
          onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-background/90 shadow-lg flex items-center justify-center opacity-0 group-hover/carousel:opacity-100 transition-opacity hover:bg-background"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
      )}
      {canGoNext && (
        <button
          onClick={() => setCurrentIndex((i) => Math.min(items.length - visibleCount, i + 1))}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-background/90 shadow-lg flex items-center justify-center opacity-0 group-hover/carousel:opacity-100 transition-opacity hover:bg-background"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      )}

      <div className={cn('grid', COLUMNS_CLASSES[config.columns], GAP_CLASSES[config.gap])}>
        {visibleItems.map((item, idx) => (
          <PortfolioItemCard
            key={item.id}
            item={item}
            config={config}
            onClick={() => !isEditing && onItemClick(currentIndex + idx)}
            isEditing={isEditing}
            onDelete={onDeleteItem ? () => onDeleteItem(item.id) : undefined}
          />
        ))}
      </div>

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
  isEditing,
  onDeleteItem,
}: LayoutProps) {
  const featuredItem = items[0];
  const restItems = items.slice(1, 5);

  if (!featuredItem) return null;

  return (
    <div className={cn('grid grid-cols-2 md:grid-cols-3', GAP_CLASSES[config.gap])}>
      <div className="col-span-2 row-span-2">
        <PortfolioItemCard
          item={featuredItem}
          config={{ ...config, aspectRatio: '4:5' }}
          onClick={() => !isEditing && onItemClick(0)}
          isEditing={isEditing}
          onDelete={onDeleteItem ? () => onDeleteItem(featuredItem.id) : undefined}
        />
      </div>
      {restItems.map((item, idx) => (
        <PortfolioItemCard
          key={item.id}
          item={item}
          config={config}
          onClick={() => !isEditing && onItemClick(idx + 1)}
          isEditing={isEditing}
          onDelete={onDeleteItem ? () => onDeleteItem(item.id) : undefined}
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
  isEditing,
  onDeleteItem,
}: LayoutProps) {
  const columns: PortfolioItem[][] = Array.from({ length: config.columns }, () => []);
  items.forEach((item, idx) => {
    columns[idx % config.columns].push(item);
  });

  return (
    <div className={cn('flex', GAP_CLASSES[config.gap])}>
      {columns.map((columnItems, colIdx) => (
        <div key={colIdx} className={cn('flex-1 flex flex-col', GAP_CLASSES[config.gap])}>
          {columnItems.map((item) => {
            const originalIndex = items.findIndex((i) => i.id === item.id);
            const aspectRatios: PortfolioConfig['aspectRatio'][] = ['9:16', '4:5', '1:1'];
            const randomAspect = aspectRatios[(originalIndex + colIdx) % 3];

            return (
              <PortfolioItemCard
                key={item.id}
                item={item}
                config={{ ...config, aspectRatio: randomAspect }}
                onClick={() => !isEditing && onItemClick(originalIndex)}
                isEditing={isEditing}
                onDelete={onDeleteItem ? () => onDeleteItem(item.id) : undefined}
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
  isEditing,
  onDeleteItem,
}: LayoutProps) {
  return (
    <div className={cn('grid', COLUMNS_CLASSES[config.columns], GAP_CLASSES[config.gap])}>
      {items.map((item, idx) => (
        <PortfolioItemCard
          key={item.id}
          item={item}
          config={config}
          onClick={() => !isEditing && onItemClick(idx)}
          isEditing={isEditing}
          onDelete={onDeleteItem ? () => onDeleteItem(item.id) : undefined}
        />
      ))}
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

function PortfolioBlockComponent({
  block,
  isEditing,
  isSelected,
  onUpdate,
  userId,
  creatorProfileId,
}: BlockProps) {
  const config = {
    layout: 'grid',
    columns: 3,
    showTitles: true,
    showMetrics: false,
    maxItems: 12,
    aspectRatio: '9:16',
    gap: 'md',
    showFeaturedBadge: true,
    hoverEffect: 'overlay',
    ...block.config,
  } as PortfolioConfig;

  const content = block.content as PortfolioContent;
  const styles = block.styles;
  const items = content.items || [];

  // Estado para media picker
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);

  // Items limitados por maxItems
  const displayItems = items.slice(0, config.maxItems);

  // Click en item (para imagenes, abrir lightbox si se implementa)
  const handleItemClick = useCallback((index: number) => {
    const item = displayItems[index];
    if (item?.type === 'image') {
      // TODO: Abrir lightbox para imagenes
    }
  }, [displayItems]);

  // Handler para agregar item desde MediaLibrary
  const handleMediaSelect = useCallback(
    (media: MediaItem) => {
      // Extraer bunnyVideoId si es video de Bunny
      let bunnyVideoId: string | undefined;
      if (media.type === 'video' && media.url) {
        const ids = extractBunnyIds(media.url);
        bunnyVideoId = ids?.videoId;
      }

      const newItem: PortfolioItem = {
        id: crypto.randomUUID(),
        type: media.type === 'video' ? 'video' : 'image',
        url: media.url,
        thumbnailUrl: media.thumbnail_url,
        bunnyVideoId,
        title: media.title || '',
        duration: media.duration,
        viewsCount: media.views_count,
        likesCount: media.likes_count,
      };

      onUpdate({
        content: {
          ...content,
          items: [...items, newItem],
        },
      });
      setMediaPickerOpen(false);
    },
    [content, items, onUpdate]
  );

  // Handler para eliminar item
  const handleDeleteItem = useCallback(
    (itemId: string) => {
      onUpdate({
        content: {
          ...content,
          items: items.filter((i) => i.id !== itemId),
        },
      });
    },
    [content, items, onUpdate]
  );

  const paddingClasses = {
    none: 'p-0',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
    xl: 'p-12',
  };

  // Render layout
  const renderLayout = () => {
    if (displayItems.length === 0) return null;

    const layoutProps: LayoutProps = {
      items: displayItems,
      config,
      onItemClick: handleItemClick,
      isEditing: isEditing && isSelected,
      onDeleteItem: isEditing && isSelected ? handleDeleteItem : undefined,
    };

    switch (config.layout) {
      case 'carousel':
        return <CarouselLayout {...layoutProps} />;
      case 'featured':
        return <FeaturedLayout {...layoutProps} />;
      case 'masonry':
        return <MasonryLayout {...layoutProps} />;
      case 'grid':
      default:
        return <GridLayout {...layoutProps} />;
    }
  };

  return (
    <div
      className={cn(paddingClasses[styles.padding || 'md'])}
      style={getBlockStyleObject(styles)}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-foreground">Portfolio</h2>
        {isEditing && isSelected && items.length < config.maxItems && userId && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setMediaPickerOpen(true)}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Agregar
          </Button>
        )}
      </div>

      {/* Empty state */}
      {displayItems.length === 0 && (
        <div className="border-2 border-dashed border-border rounded-lg p-12 text-center">
          <LayoutGrid className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-muted-foreground mb-4">
            {isEditing ? 'Agrega contenido a tu portfolio' : 'Sin contenido en el portfolio'}
          </p>
          {isEditing && isSelected && userId && (
            <Button variant="outline" onClick={() => setMediaPickerOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Seleccionar contenido
            </Button>
          )}
        </div>
      )}

      {/* Portfolio content */}
      {displayItems.length > 0 && renderLayout()}

      {/* Contador de items */}
      {isEditing && isSelected && items.length > 0 && (
        <p className="text-[10px] text-muted-foreground text-center mt-4">
          {items.length} de {config.maxItems} items maximo
        </p>
      )}

      {/* Media Library Picker */}
      {userId && (
        <MediaLibraryPicker
          open={mediaPickerOpen}
          onOpenChange={setMediaPickerOpen}
          onSelect={handleMediaSelect}
          allowedTypes={['image', 'video']}
          userId={userId}
          creatorProfileId={creatorProfileId}
        />
      )}
    </div>
  );
}

export const PortfolioBlock = memo(PortfolioBlockComponent);
