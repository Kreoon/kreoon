import { memo, useState } from 'react';
import { Plus, Trash2, X, ChevronLeft, ChevronRight, Images, Camera } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { BlockProps } from '../types/profile-builder';
import { MediaLibraryPicker } from '../media/MediaLibraryPicker';
import type { MediaItem } from '../media/types';
import { getBlockStyleObject } from './blockStyles';

interface GalleryImage {
  id: string;
  url: string;
  alt?: string;
}

interface ImageGalleryConfig {
  columns: 2 | 3 | 4;
  gap: 'sm' | 'md' | 'lg';
}

interface ImageGalleryContent {
  title?: string;
  images?: GalleryImage[];
}

const DEFAULT_IMAGES: GalleryImage[] = [
  { id: '1', url: '', alt: 'Imagen 1' },
  { id: '2', url: '', alt: 'Imagen 2' },
  { id: '3', url: '', alt: 'Imagen 3' },
  { id: '4', url: '', alt: 'Imagen 4' },
  { id: '5', url: '', alt: 'Imagen 5' },
  { id: '6', url: '', alt: 'Imagen 6' },
];

const gapClasses = {
  sm: 'gap-2',
  md: 'gap-3',
  lg: 'gap-4',
};

const columnClasses: Record<number, string> = {
  2: 'grid-cols-2',
  3: 'grid-cols-2 md:grid-cols-3',
  4: 'grid-cols-2 md:grid-cols-4',
};

interface LightboxProps {
  images: GalleryImage[];
  initialIndex: number;
  onClose: () => void;
}

function Lightbox({ images, initialIndex, onClose }: LightboxProps) {
  const [index, setIndex] = useState(initialIndex);
  const current = images[index];

  const goNext = () => setIndex((i) => (i + 1) % images.length);
  const goPrev = () => setIndex((i) => (i - 1 + images.length) % images.length);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors z-10"
        aria-label="Cerrar galeria"
      >
        <X className="h-6 w-6" />
      </button>

      {images.length > 1 && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); goPrev(); }}
            className="absolute left-4 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors z-10"
            aria-label="Imagen anterior"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); goNext(); }}
            className="absolute right-4 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors z-10"
            aria-label="Imagen siguiente"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        </>
      )}

      <div
        className="max-w-4xl max-h-[85vh] flex flex-col items-center gap-3"
        onClick={(e) => e.stopPropagation()}
      >
        {current.url ? (
          <img
            src={current.url}
            alt={current.alt || ''}
            className="max-h-[75vh] max-w-full object-contain rounded-lg"
          />
        ) : (
          <div className="w-64 h-48 bg-muted/30 rounded-lg flex items-center justify-center">
            <Images className="h-12 w-12 text-muted-foreground/40" />
          </div>
        )}
        {current.alt && (
          <p className="text-white/70 text-sm text-center">{current.alt}</p>
        )}
        {images.length > 1 && (
          <p className="text-white/50 text-xs">
            {index + 1} / {images.length}
          </p>
        )}
      </div>
    </div>
  );
}

function ImageGalleryBlockComponent({ block, isEditing, isSelected, onUpdate, userId, creatorProfileId }: BlockProps) {
  const config = block.config as ImageGalleryConfig;
  const content = block.content as ImageGalleryContent;
  const styles = block.styles;
  const images = content.images || DEFAULT_IMAGES;
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // Estado para media picker
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);
  const [editingImageId, setEditingImageId] = useState<string | null>(null);

  const columns = config.columns || 3;
  const gap = config.gap || 'md';

  const handleContentUpdate = (updates: Partial<ImageGalleryContent>) => {
    onUpdate({ content: { ...content, ...updates } });
  };

  const handleUpdateImage = (id: string, updates: Partial<GalleryImage>) => {
    const newImages = images.map((img) => (img.id === id ? { ...img, ...updates } : img));
    handleContentUpdate({ images: newImages });
  };

  const handleAddImage = () => {
    if (userId) {
      setEditingImageId(null);
      setMediaPickerOpen(true);
    }
  };

  const handleEditImage = (imageId: string) => {
    setEditingImageId(imageId);
    setMediaPickerOpen(true);
  };

  const handleMediaSelect = (media: MediaItem) => {
    if (editingImageId) {
      // Actualizar imagen existente
      handleUpdateImage(editingImageId, {
        url: media.url,
        alt: media.title || undefined,
      });
    } else {
      // Agregar nueva imagen
      const newImage: GalleryImage = {
        id: crypto.randomUUID(),
        url: media.url,
        alt: media.title || undefined,
      };
      handleContentUpdate({ images: [...images, newImage] });
    }
    setMediaPickerOpen(false);
    setEditingImageId(null);
  };

  const handleRemoveImage = (id: string) => {
    handleContentUpdate({ images: images.filter((img) => img.id !== id) });
  };

  const previewImages = images.filter((img) => img.url);

  return (
    <div
      style={getBlockStyleObject(styles)}
    >
      {/* Titulo */}
      {isEditing && isSelected ? (
        <input
          type="text"
          value={content.title || ''}
          onChange={(e) => handleContentUpdate({ title: e.target.value })}
          placeholder="Galeria (opcional)"
          className="text-xl md:text-2xl font-bold text-foreground bg-transparent border-none w-full mb-6 focus:outline-none focus:ring-1 focus:ring-primary rounded"
        />
      ) : content.title ? (
        <h2 className="text-xl md:text-2xl font-bold text-foreground mb-6">{content.title}</h2>
      ) : null}

      {/* Modo edicion: grid con botones para seleccionar imagen */}
      {isEditing && isSelected ? (
        <div className="flex flex-col gap-4">
          <div
            className={cn(
              'grid',
              columnClasses[columns] || columnClasses[3],
              gapClasses[gap],
            )}
          >
            {images.map((image) => (
              <div
                key={image.id}
                className="relative group aspect-square cursor-pointer"
                onClick={() => handleEditImage(image.id)}
              >
                {image.url ? (
                  <img
                    src={image.url}
                    alt={image.alt || ''}
                    className="w-full h-full object-cover rounded-lg"
                  />
                ) : (
                  <div className="w-full h-full bg-muted/30 rounded-lg border border-border/50 border-dashed flex items-center justify-center">
                    <Images className="h-8 w-8 text-muted-foreground/30" />
                  </div>
                )}

                {/* Overlay de edicion */}
                <div className="absolute inset-0 bg-black/50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Camera className="h-6 w-6 text-white" />
                </div>

                <button
                  onClick={(e) => { e.stopPropagation(); handleRemoveImage(image.id); }}
                  className="absolute top-1 right-1 p-1 rounded-full bg-black/60 text-white hover:bg-red-600 transition-colors z-10 opacity-0 group-hover:opacity-100"
                  aria-label={`Eliminar imagen ${image.alt || ''}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>

          {/* Agregar imagen */}
          <Button
            size="sm"
            variant="outline"
            onClick={handleAddImage}
            className="gap-2 self-start"
          >
            <Plus className="h-4 w-4" />
            Agregar imagen
          </Button>
        </div>
      ) : (
        /* Modo preview */
        <>
          {previewImages.length > 0 ? (
            <div
              className={cn(
                'grid',
                columnClasses[columns] || columnClasses[3],
                gapClasses[gap],
              )}
            >
              {previewImages.map((image, index) => (
                <button
                  key={image.id}
                  className="relative aspect-square overflow-hidden rounded-lg group focus:outline-none focus:ring-2 focus:ring-primary"
                  onClick={() => setLightboxIndex(index)}
                  aria-label={`Ver imagen ${image.alt || index + 1}`}
                >
                  <img
                    src={image.url}
                    alt={image.alt || ''}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                </button>
              ))}
            </div>
          ) : (
            <div className="aspect-video bg-muted/30 rounded-lg border border-border/50 border-dashed flex items-center justify-center">
              <div className="text-center">
                <Images className="h-12 w-12 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Sin imagenes</p>
              </div>
            </div>
          )}
        </>
      )}

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <Lightbox
          images={previewImages}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}

      {/* Media Library Picker */}
      {userId && (
        <MediaLibraryPicker
          open={mediaPickerOpen}
          onOpenChange={setMediaPickerOpen}
          onSelect={handleMediaSelect}
          allowedTypes={['image']}
          userId={userId}
          creatorProfileId={creatorProfileId}
        />
      )}
    </div>
  );
}

export const ImageGalleryBlock = memo(ImageGalleryBlockComponent);
