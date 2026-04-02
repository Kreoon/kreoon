/**
 * Reproductor oficial de Bunny Stream.
 * Usa el iframe embed de mediadelivery.net con parámetros optimizados.
 */

import { useMemo } from 'react';
import { cn } from '@/lib/utils';

// Library ID por defecto de Kreoon
const DEFAULT_BUNNY_LIBRARY_ID = '568434';

interface BunnyStreamPlayerProps {
  /** URL del video de Bunny (CDN o embed) */
  videoUrl: string;
  /** Reproducción automática */
  autoplay?: boolean;
  /** Iniciar silenciado */
  muted?: boolean;
  /** Reproducción en loop */
  loop?: boolean;
  /** Precargar video */
  preload?: boolean;
  /** Mostrar controles de velocidad */
  showSpeed?: boolean;
  /** Calidad inicial */
  quality?: '360' | '480' | '720' | '1080';
  /** Aspect ratio del contenedor */
  aspectRatio?: '16:9' | '9:16' | '1:1' | '4:3';
  /** Clases adicionales */
  className?: string;
  /** Border radius */
  borderRadius?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
}

/**
 * Extrae el video_id y library_id de una URL de Bunny.
 */
function extractBunnyIds(url: string): { libraryId: string; videoId: string } | null {
  if (!url) return null;

  // 1. URL de embed: https://iframe.mediadelivery.net/embed/{library_id}/{video_id}
  const embedMatch = url.match(/iframe\.mediadelivery\.net\/(?:embed|play)\/(\d+)\/([a-f0-9-]+)/i);
  if (embedMatch) {
    return { libraryId: embedMatch[1], videoId: embedMatch[2] };
  }

  // 2. URL de CDN: https://vz-xxxxx.b-cdn.net/{video_id}/...
  const cdnMatch = url.match(/vz-[a-f0-9-]+\.b-cdn\.net\/([a-f0-9-]+)/i);
  if (cdnMatch) {
    return { libraryId: DEFAULT_BUNNY_LIBRARY_ID, videoId: cdnMatch[1] };
  }

  // 3. URL directa de mediadelivery: https://{library_id}.mediadelivery.net/{video_id}/...
  const directMatch = url.match(/(\d+)\.mediadelivery\.net\/([a-f0-9-]+)/i);
  if (directMatch) {
    return { libraryId: directMatch[1], videoId: directMatch[2] };
  }

  return null;
}

/**
 * Construye la URL del reproductor embed de Bunny con parámetros.
 */
function buildEmbedUrl(
  libraryId: string,
  videoId: string,
  options: {
    autoplay?: boolean;
    muted?: boolean;
    loop?: boolean;
    preload?: boolean;
    showSpeed?: boolean;
    quality?: string;
  }
): string {
  const params = new URLSearchParams();

  if (options.autoplay) params.set('autoplay', 'true');
  if (options.muted) params.set('muted', 'true');
  if (options.loop) params.set('loop', 'true');
  if (options.preload) params.set('preload', 'true');
  if (options.showSpeed) params.set('showSpeed', 'true');
  if (options.quality) params.set('quality', options.quality);

  // Optimizaciones adicionales
  params.set('responsive', 'true');
  params.set('fast-start', 'true');

  return `https://iframe.mediadelivery.net/embed/${libraryId}/${videoId}?${params.toString()}`;
}

const aspectRatioStyles: Record<string, string> = {
  '16:9': 'aspect-video',
  '9:16': 'aspect-[9/16]',
  '1:1': 'aspect-square',
  '4:3': 'aspect-[4/3]',
};

const borderRadiusStyles: Record<string, string> = {
  none: 'rounded-none',
  sm: 'rounded',
  md: 'rounded-lg',
  lg: 'rounded-xl',
  xl: 'rounded-2xl',
};

export function BunnyStreamPlayer({
  videoUrl,
  autoplay = false,
  muted = false,
  loop = false,
  preload = true,
  showSpeed = true,
  quality = '720',
  aspectRatio = '16:9',
  className,
  borderRadius = 'md',
}: BunnyStreamPlayerProps) {
  const embedUrl = useMemo(() => {
    const ids = extractBunnyIds(videoUrl);
    if (!ids) return null;

    return buildEmbedUrl(ids.libraryId, ids.videoId, {
      autoplay,
      muted,
      loop,
      preload,
      showSpeed,
      quality,
    });
  }, [videoUrl, autoplay, muted, loop, preload, showSpeed, quality]);

  if (!embedUrl) {
    return null;
  }

  return (
    <div
      className={cn(
        'relative w-full overflow-hidden bg-black',
        aspectRatioStyles[aspectRatio],
        borderRadiusStyles[borderRadius],
        className,
      )}
    >
      <iframe
        src={embedUrl}
        title="Video Bunny Stream"
        loading="lazy"
        className="absolute inset-0 w-full h-full border-0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
        allowFullScreen
      />
    </div>
  );
}

/**
 * Verifica si una URL es de Bunny CDN/Stream.
 */
export function isBunnyUrl(url: string): boolean {
  if (!url) return false;
  const lower = url.toLowerCase();
  return (
    lower.includes('b-cdn.net') ||
    lower.includes('mediadelivery.net') ||
    lower.includes('bunnycdn')
  );
}

/**
 * Obtiene la URL del thumbnail de un video de Bunny.
 */
export function getBunnyThumbnailUrl(url: string): string | null {
  const ids = extractBunnyIds(url);
  if (!ids) return null;

  // El thumbnail está en el CDN, no en mediadelivery
  return `https://vz-78fcd769-050.b-cdn.net/${ids.videoId}/thumbnail.jpg`;
}

export default BunnyStreamPlayer;
