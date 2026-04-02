/**
 * Media Input - Profile Builder Pro
 *
 * Componente simple para seleccionar imagenes/videos en bloques.
 * Abre el MediaLibraryPicker y muestra preview del medio seleccionado.
 */

import { useState, useCallback } from 'react';
import { ImagePlus, Video, X, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { MediaLibraryPicker } from './MediaLibraryPicker';
import type { MediaItem } from './types';

interface MediaInputProps {
  value?: string;
  mediaType?: 'image' | 'video';
  onChange: (url: string, item?: MediaItem) => void;
  onClear?: () => void;
  allowedTypes?: ('image' | 'video')[];
  userId: string;
  creatorProfileId?: string;
  placeholder?: string;
  className?: string;
  aspectRatio?: 'video' | 'square' | 'portrait' | 'auto';
}

const ASPECT_RATIO_CLASSES = {
  video: 'aspect-video',
  square: 'aspect-square',
  portrait: 'aspect-[3/4]',
  auto: 'min-h-[120px]',
};

export function MediaInput({
  value,
  mediaType,
  onChange,
  onClear,
  allowedTypes = ['image', 'video'],
  userId,
  creatorProfileId,
  placeholder,
  className,
  aspectRatio = 'video',
}: MediaInputProps) {
  const [pickerOpen, setPickerOpen] = useState(false);

  const handleSelect = useCallback(
    (item: MediaItem) => {
      onChange(item.url, item);
      setPickerOpen(false);
    },
    [onChange]
  );

  const handleClear = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onClear?.();
      onChange('');
    },
    [onChange, onClear]
  );

  const hasValue = !!value;
  const isVideo = mediaType === 'video' || (value && isVideoUrl(value));
  const isExternal = value && (value.includes('youtube.com') || value.includes('vimeo.com'));

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        onClick={() => setPickerOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setPickerOpen(true);
          }
        }}
        className={cn(
          'relative rounded-lg border-2 border-dashed transition-all cursor-pointer overflow-hidden group',
          'hover:border-primary/50 hover:bg-accent/20',
          'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
          hasValue ? 'border-border bg-muted/20' : 'border-muted-foreground/30 bg-muted/10',
          ASPECT_RATIO_CLASSES[aspectRatio],
          className
        )}
        aria-label={hasValue ? 'Cambiar medio' : 'Seleccionar medio'}
      >
        {hasValue ? (
          <>
            {/* Preview del medio */}
            {isVideo ? (
              <div className="absolute inset-0 flex items-center justify-center bg-black/80">
                <Video className="h-10 w-10 text-white/60" />
                {isExternal && (
                  <div className="absolute bottom-2 left-2 flex items-center gap-1 text-xs text-white/70 bg-black/50 px-2 py-0.5 rounded">
                    <ExternalLink className="h-3 w-3" />
                    <span>Video externo</span>
                  </div>
                )}
              </div>
            ) : (
              <img
                src={value}
                alt="Preview"
                className="absolute inset-0 w-full h-full object-cover"
                crossOrigin="anonymous"
              />
            )}

            {/* Overlay con acciones */}
            <div
              className={cn(
                'absolute inset-0 flex items-center justify-center gap-2 transition-opacity',
                'bg-black/60 opacity-0 group-hover:opacity-100'
              )}
            >
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="gap-1.5"
                onClick={(e) => {
                  e.stopPropagation();
                  setPickerOpen(true);
                }}
              >
                {isVideo ? <Video className="h-3.5 w-3.5" /> : <ImagePlus className="h-3.5 w-3.5" />}
                Cambiar
              </Button>
              {onClear && (
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="h-8 w-8"
                  onClick={handleClear}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </>
        ) : (
          /* Estado vacio */
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4 text-center">
            {allowedTypes.includes('image') && allowedTypes.includes('video') ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <ImagePlus className="h-6 w-6" />
                <span>/</span>
                <Video className="h-6 w-6" />
              </div>
            ) : allowedTypes.includes('video') ? (
              <Video className="h-8 w-8 text-muted-foreground" />
            ) : (
              <ImagePlus className="h-8 w-8 text-muted-foreground" />
            )}
            <p className="text-sm text-muted-foreground">
              {placeholder ||
                (allowedTypes.includes('image') && allowedTypes.includes('video')
                  ? 'Agregar imagen o video'
                  : allowedTypes.includes('video')
                  ? 'Agregar video'
                  : 'Agregar imagen')}
            </p>
            <p className="text-xs text-muted-foreground/70">
              Subir, libreria o URL
            </p>
          </div>
        )}
      </div>

      <MediaLibraryPicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onSelect={handleSelect}
        allowedTypes={allowedTypes}
        userId={userId}
        creatorProfileId={creatorProfileId}
      />
    </>
  );
}

// Helper para detectar si una URL es de video
function isVideoUrl(url: string): boolean {
  const videoPatterns = [
    /youtube\.com/i,
    /youtu\.be/i,
    /vimeo\.com/i,
    /\.mp4(\?|$)/i,
    /\.webm(\?|$)/i,
    /\.mov(\?|$)/i,
    /bunny\.net.*\/play\//i,
    /mediadelivery\.net/i,
  ];
  return videoPatterns.some((pattern) => pattern.test(url));
}

export default MediaInput;
