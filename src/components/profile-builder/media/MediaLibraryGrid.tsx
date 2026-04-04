import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Play, ImageIcon, Loader2 } from 'lucide-react';
import type { MediaItem } from './types';

interface MediaLibraryGridProps {
  items: MediaItem[];
  selectedId: string | null;
  onSelect: (item: MediaItem) => void;
}

/**
 * Extrae el video_id de una URL de Bunny Stream/CDN
 */
function extractBunnyVideoId(url: string): string | null {
  if (!url) return null;

  // URL de embed: https://iframe.mediadelivery.net/embed/{library_id}/{video_id}
  const embedMatch = url.match(/iframe\.mediadelivery\.net\/(?:embed|play)\/\d+\/([a-f0-9-]+)/i);
  if (embedMatch) return embedMatch[1];

  // URL de CDN: https://vz-xxxxx.b-cdn.net/{video_id}/...
  const cdnMatch = url.match(/vz-[a-f0-9-]+\.b-cdn\.net\/([a-f0-9-]+)/i);
  if (cdnMatch) return cdnMatch[1];

  return null;
}

/**
 * Genera la URL del thumbnail de Bunny basándose en la URL del video
 * Usa cdn.kreoon.com que es el dominio personalizado configurado en Bunny
 */
function getBunnyThumbnail(url: string): string | null {
  const videoId = extractBunnyVideoId(url);
  if (!videoId) return null;
  // Dominio personalizado de Kreoon en Bunny CDN
  return `https://cdn.kreoon.com/${videoId}/thumbnail.jpg`;
}

function MediaThumbnail({ item }: { item: MediaItem }) {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  // Determinar la URL del thumbnail
  let thumbnailSrc: string | null = null;

  if (item.thumbnailUrl) {
    thumbnailSrc = item.thumbnailUrl;
  } else if (item.type === 'video' && item.url) {
    // Intentar generar thumbnail de Bunny desde la URL del video
    thumbnailSrc = getBunnyThumbnail(item.url);
  } else if (item.type === 'image' && item.url) {
    thumbnailSrc = item.url;
  }

  if (thumbnailSrc && !imageError) {
    return (
      <>
        {!imageLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted animate-pulse">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}
        <img
          src={thumbnailSrc}
          alt={item.title ?? 'Medio'}
          className={cn(
            'w-full h-full object-cover transition-opacity duration-200',
            imageLoaded ? 'opacity-100' : 'opacity-0'
          )}
          loading="lazy"
          onLoad={() => setImageLoaded(true)}
          onError={() => setImageError(true)}
        />
      </>
    );
  }

  // Fallback: mostrar icono
  return (
    <div className="w-full h-full flex items-center justify-center bg-muted">
      {item.type === 'video' ? (
        <Play className="h-8 w-8 text-muted-foreground" />
      ) : (
        <ImageIcon className="h-8 w-8 text-muted-foreground" />
      )}
    </div>
  );
}

export function MediaLibraryGrid({ items, selectedId, onSelect }: MediaLibraryGridProps) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <ImageIcon className="h-12 w-12 text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground">No hay medios disponibles</p>
        <p className="text-xs text-muted-foreground mt-1">
          Sube tu primer archivo en la pestana "Subir"
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 p-1">
      {items.map((item) => {
        const isSelected = selectedId === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item)}
            className={cn(
              'relative aspect-square rounded-md overflow-hidden border-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
              isSelected
                ? 'border-primary ring-2 ring-primary ring-offset-2 ring-offset-background'
                : 'border-transparent hover:border-primary/40',
            )}
            aria-label={`Seleccionar ${item.title ?? item.type}`}
            aria-pressed={isSelected}
          >
            <MediaThumbnail item={item} />

            {/* Badge tipo video */}
            {item.type === 'video' && (
              <div className="absolute bottom-1 left-1 bg-black/70 rounded px-1 py-0.5 flex items-center gap-1">
                <Play className="h-2.5 w-2.5 text-white fill-white" />
                <span className="text-white text-[10px] font-medium leading-none">Video</span>
              </div>
            )}

            {/* Indicador de seleccion */}
            {isSelected && (
              <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                <div className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center">
                  <svg
                    className="h-3.5 w-3.5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
              </div>
            )}

            {/* Titulo (tooltip al hover) */}
            {item.title && (
              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-1.5 translate-y-full group-hover:translate-y-0 transition-transform">
                <p className="text-white text-xs truncate">{item.title}</p>
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
