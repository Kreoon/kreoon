import { memo, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, ImagePlus, Plus, Trash2, Camera } from 'lucide-react';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import { Button } from '@/components/ui/button';
import type { BlockProps } from '../types/profile-builder';
import { MediaLibraryPicker } from '../media/MediaLibraryPicker';
import type { MediaItem } from '../media/types';

interface CarouselItem {
  id: string;
  type: 'image' | 'video';
  url: string;
  caption?: string;
}

interface CarouselConfig {
  items: CarouselItem[];
  autoplay: boolean;
  autoplayInterval: number;
  showDots: boolean;
  showArrows: boolean;
  loop: boolean;
  slidesPerView: 1 | 2 | 3;
  gap: 'none' | 'sm' | 'md' | 'lg';
}

function CarouselBlockComponent({ block, isEditing, isSelected, onUpdate, userId, creatorProfileId }: BlockProps) {
  const config = block.config as CarouselConfig;
  const styles = block.styles;
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Estado para media picker
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

  const autoplayOptions = config.autoplay
    ? [Autoplay({ delay: config.autoplayInterval || 5000, stopOnInteraction: false })]
    : [];

  const [emblaRef, emblaApi] = useEmblaCarousel(
    {
      loop: config.loop ?? true,
      align: 'start',
      slidesToScroll: 1,
    },
    autoplayOptions
  );

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  // Subscribe to select events
  emblaApi?.on('select', onSelect);

  const paddingClasses = {
    none: 'p-0',
    sm: 'p-2',
    md: 'p-4',
    lg: 'p-6',
    xl: 'p-8',
  };

  const gapClasses = {
    none: 'gap-0',
    sm: 'gap-2',
    md: 'gap-4',
    lg: 'gap-6',
  };

  const slidesPerViewClasses = {
    1: 'flex-[0_0_100%]',
    2: 'flex-[0_0_50%]',
    3: 'flex-[0_0_33.333%]',
  };

  const items = config.items || [];

  const handleConfigUpdate = (updates: Partial<CarouselConfig>) => {
    onUpdate({ config: { ...config, ...updates } });
  };

  const handleAddItem = () => {
    if (userId) {
      setEditingItemId(null);
      setMediaPickerOpen(true);
    }
  };

  const handleEditItem = (itemId: string) => {
    setEditingItemId(itemId);
    setMediaPickerOpen(true);
  };

  const handleMediaSelect = (media: MediaItem) => {
    if (editingItemId) {
      // Actualizar item existente
      const updatedItems = items.map((item) =>
        item.id === editingItemId
          ? {
              ...item,
              url: media.url,
              type: media.type === 'video' ? 'video' as const : 'image' as const,
            }
          : item
      );
      handleConfigUpdate({ items: updatedItems });
    } else {
      // Agregar nuevo item
      const newItem: CarouselItem = {
        id: crypto.randomUUID(),
        type: media.type === 'video' ? 'video' : 'image',
        url: media.url,
        caption: media.title || '',
      };
      handleConfigUpdate({ items: [...items, newItem] });
    }
    setMediaPickerOpen(false);
    setEditingItemId(null);
  };

  const handleDeleteItem = (itemId: string) => {
    handleConfigUpdate({ items: items.filter((i) => i.id !== itemId) });
  };

  // Editing mode placeholder
  if (isEditing && items.length === 0) {
    return (
      <div
        className={cn(
          'rounded-lg border-2 border-dashed border-border/50',
          paddingClasses[styles.padding || 'md'],
          styles.margin === 'sm' && 'my-2',
          styles.margin === 'md' && 'my-4',
          styles.margin === 'lg' && 'my-6',
          isSelected && 'ring-2 ring-primary/50',
        )}
      >
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <ImagePlus className="h-10 w-10 text-muted-foreground/50 mb-3" />
          <p className="text-sm text-muted-foreground mb-1">Carrusel vacio</p>
          <p className="text-xs text-muted-foreground/70 mb-4">
            Agrega imagenes o videos para tu carrusel
          </p>
          {userId && isSelected && (
            <Button variant="outline" size="sm" onClick={handleAddItem} className="gap-2">
              <Plus className="h-4 w-4" />
              Agregar contenido
            </Button>
          )}
        </div>

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

  return (
    <div
      className={cn(
        'relative',
        paddingClasses[styles.padding || 'md'],
        styles.margin === 'sm' && 'my-2',
        styles.margin === 'md' && 'my-4',
        styles.margin === 'lg' && 'my-6',
        isEditing && isSelected && 'ring-2 ring-primary/50 rounded-lg',
      )}
    >
      {/* Carousel container */}
      <div className="overflow-hidden rounded-lg" ref={emblaRef}>
        <div className={cn('flex', gapClasses[config.gap || 'md'])}>
          {items.map((item) => (
            <div
              key={item.id}
              className={cn(
                'min-w-0 relative group',
                slidesPerViewClasses[config.slidesPerView || 1],
              )}
            >
              {item.type === 'image' ? (
                <img
                  src={item.url}
                  alt={item.caption || ''}
                  className="w-full h-64 md:h-80 object-cover rounded-lg"
                />
              ) : (
                <video
                  src={item.url}
                  className="w-full h-64 md:h-80 object-cover rounded-lg"
                  controls
                  muted
                />
              )}
              {item.caption && (
                <p className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/70 to-transparent text-white text-sm rounded-b-lg pointer-events-none">
                  {item.caption}
                </p>
              )}

              {/* Overlay de edición */}
              {isEditing && isSelected && (
                <>
                  <div
                    className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center cursor-pointer"
                    onClick={() => handleEditItem(item.id)}
                  >
                    <Camera className="h-8 w-8 text-white" />
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteItem(item.id); }}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white hover:bg-red-600 transition-colors opacity-0 group-hover:opacity-100 z-10"
                    aria-label="Eliminar item"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Navigation arrows */}
      {config.showArrows && items.length > 1 && (
        <>
          <button
            onClick={scrollPrev}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors"
            aria-label="Anterior"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button
            onClick={scrollNext}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors"
            aria-label="Siguiente"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        </>
      )}

      {/* Dots indicator */}
      {config.showDots && items.length > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          {items.map((_, index) => (
            <button
              key={index}
              onClick={() => emblaApi?.scrollTo(index)}
              className={cn(
                'w-2 h-2 rounded-full transition-all',
                index === selectedIndex
                  ? 'bg-primary w-4'
                  : 'bg-muted-foreground/30 hover:bg-muted-foreground/50',
              )}
              aria-label={`Ir a slide ${index + 1}`}
            />
          ))}
        </div>
      )}

      {/* Botón agregar más en modo edición */}
      {isEditing && isSelected && userId && items.length > 0 && (
        <div className="flex justify-center mt-4">
          <Button variant="outline" size="sm" onClick={handleAddItem} className="gap-2">
            <Plus className="h-4 w-4" />
            Agregar slide
          </Button>
        </div>
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

export const CarouselBlock = memo(CarouselBlockComponent);
