/**
 * Media URL Input - Profile Builder Pro
 *
 * Permite pegar URLs externas de imagenes o videos.
 * Valida la URL y muestra preview antes de confirmar.
 */

import { useState, useCallback } from 'react';
import { Link2, AlertCircle, CheckCircle2, Loader2, Image, Video } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { MediaItem } from './types';

interface MediaUrlInputProps {
  allowedTypes?: ('image' | 'video')[];
  onConfirm: (item: MediaItem) => void;
}

// Patrones de URL de video conocidos
const VIDEO_PATTERNS = [
  /youtube\.com\/watch\?v=/i,
  /youtu\.be\//i,
  /vimeo\.com\//i,
  /\.mp4(\?|$)/i,
  /\.webm(\?|$)/i,
  /\.mov(\?|$)/i,
  /\.m3u8(\?|$)/i,
  /bunny\.net.*\/play\//i,
  /iframe\.mediadelivery\.net/i,
];

// Patrones de URL de imagen conocidos
const IMAGE_PATTERNS = [
  /\.(jpg|jpeg|png|gif|webp|avif|svg)(\?|$)/i,
  /unsplash\.com/i,
  /pexels\.com/i,
  /images\.unsplash\.com/i,
  /cloudinary\.com.*\/image\//i,
  /imgix\.net/i,
  /bunny\.net.*\.(jpg|jpeg|png|gif|webp)/i,
];

function detectMediaType(url: string): 'image' | 'video' | null {
  // Primero verificar si es video
  for (const pattern of VIDEO_PATTERNS) {
    if (pattern.test(url)) return 'video';
  }
  // Luego verificar si es imagen
  for (const pattern of IMAGE_PATTERNS) {
    if (pattern.test(url)) return 'image';
  }
  return null;
}

function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

// Convertir URLs de YouTube/Vimeo a embed
function getEmbedUrl(url: string): string {
  // YouTube
  const youtubeMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?/]+)/);
  if (youtubeMatch) {
    return `https://www.youtube.com/embed/${youtubeMatch[1]}`;
  }

  // Vimeo
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) {
    return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  }

  return url;
}

// Obtener thumbnail de video
function getVideoThumbnail(url: string): string | undefined {
  const youtubeMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?/]+)/);
  if (youtubeMatch) {
    return `https://img.youtube.com/vi/${youtubeMatch[1]}/hqdefault.jpg`;
  }
  return undefined;
}

export function MediaUrlInput({ allowedTypes = ['image', 'video'], onConfirm }: MediaUrlInputProps) {
  const [url, setUrl] = useState('');
  const [status, setStatus] = useState<'idle' | 'validating' | 'valid' | 'error'>('idle');
  const [detectedType, setDetectedType] = useState<'image' | 'video' | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [previewLoaded, setPreviewLoaded] = useState(false);

  const validateUrl = useCallback(async () => {
    const trimmedUrl = url.trim();

    if (!trimmedUrl) {
      setStatus('idle');
      setDetectedType(null);
      return;
    }

    if (!isValidUrl(trimmedUrl)) {
      setStatus('error');
      setErrorMessage('URL no valida');
      return;
    }

    setStatus('validating');
    setPreviewLoaded(false);

    // Detectar tipo de media
    const type = detectMediaType(trimmedUrl);

    if (!type) {
      // Intentar cargar como imagen para verificar
      const img = new window.Image();
      img.crossOrigin = 'anonymous';

      const result = await new Promise<'image' | 'error'>((resolve) => {
        img.onload = () => resolve('image');
        img.onerror = () => resolve('error');
        setTimeout(() => resolve('error'), 5000);
        img.src = trimmedUrl;
      });

      if (result === 'image') {
        setDetectedType('image');
        setStatus('valid');
        setPreviewLoaded(true);
        return;
      }

      setStatus('error');
      setErrorMessage('No se pudo detectar el tipo de medio. Asegurate de que la URL sea de una imagen o video.');
      return;
    }

    // Verificar si el tipo detectado esta permitido
    if (!allowedTypes.includes(type)) {
      setStatus('error');
      setErrorMessage(`Solo se permiten: ${allowedTypes.join(', ')}`);
      return;
    }

    setDetectedType(type);
    setStatus('valid');

    // Para imagenes, verificar que cargue
    if (type === 'image') {
      const img = new window.Image();
      img.onload = () => setPreviewLoaded(true);
      img.onerror = () => {
        setStatus('error');
        setErrorMessage('No se pudo cargar la imagen');
      };
      img.src = trimmedUrl;
    } else {
      setPreviewLoaded(true);
    }
  }, [url, allowedTypes]);

  const handleConfirm = useCallback(() => {
    if (status !== 'valid' || !detectedType) return;

    const trimmedUrl = url.trim();
    const embedUrl = detectedType === 'video' ? getEmbedUrl(trimmedUrl) : trimmedUrl;
    const thumbnail = detectedType === 'video' ? getVideoThumbnail(trimmedUrl) : undefined;

    const item: MediaItem = {
      id: crypto.randomUUID(),
      type: detectedType,
      url: embedUrl,
      thumbnailUrl: thumbnail,
      source: 'external_url',
      createdAt: new Date().toISOString(),
    };

    onConfirm(item);
    setUrl('');
    setStatus('idle');
    setDetectedType(null);
    setPreviewLoaded(false);
  }, [status, detectedType, url, onConfirm]);

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Input de URL */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">URL del medio</Label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="url"
              placeholder="https://ejemplo.com/imagen.jpg o URL de YouTube/Vimeo"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                setStatus('idle');
                setErrorMessage(null);
              }}
              onBlur={validateUrl}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  validateUrl();
                }
              }}
              className={cn(
                'pl-9 h-10',
                status === 'error' && 'border-destructive focus-visible:ring-destructive'
              )}
            />
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={validateUrl}
            disabled={!url.trim() || status === 'validating'}
          >
            {status === 'validating' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              'Verificar'
            )}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Soporta: imagenes (JPG, PNG, WebP), YouTube, Vimeo, MP4, y mas
        </p>
      </div>

      {/* Error */}
      {status === 'error' && errorMessage && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Preview */}
      {status === 'valid' && detectedType && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
            <CheckCircle2 className="h-4 w-4" />
            <span>
              {detectedType === 'image' ? 'Imagen' : 'Video'} detectado correctamente
            </span>
          </div>

          {/* Preview del medio */}
          <div
            className={cn(
              'relative rounded-lg border border-border overflow-hidden bg-muted/30',
              detectedType === 'image' ? 'aspect-video' : 'aspect-video'
            )}
          >
            {detectedType === 'image' ? (
              <img
                src={url.trim()}
                alt="Preview"
                className="w-full h-full object-contain"
                crossOrigin="anonymous"
              />
            ) : (
              <div className="flex items-center justify-center h-full gap-3">
                <Video className="h-8 w-8 text-muted-foreground" />
                <div className="text-sm text-muted-foreground">
                  <p className="font-medium">Video externo</p>
                  <p className="text-xs">{getEmbedUrl(url.trim()).substring(0, 50)}...</p>
                </div>
              </div>
            )}

            {/* Badge de tipo */}
            <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/60 text-white text-xs">
              {detectedType === 'image' ? (
                <Image className="h-3 w-3" />
              ) : (
                <Video className="h-3 w-3" />
              )}
              <span>{detectedType === 'image' ? 'Imagen' : 'Video'}</span>
            </div>
          </div>

          {/* Boton confirmar */}
          <Button
            type="button"
            className="w-full"
            onClick={handleConfirm}
            disabled={!previewLoaded && detectedType === 'image'}
          >
            Usar este medio
          </Button>
        </div>
      )}

      {/* Estado idle */}
      {status === 'idle' && !url.trim() && (
        <div className="flex flex-col items-center justify-center py-8 gap-3 text-center">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Image className="h-5 w-5" />
            <span className="text-sm">/</span>
            <Video className="h-5 w-5" />
          </div>
          <p className="text-sm text-muted-foreground">
            Pega una URL de imagen o video para incrustarla
          </p>
        </div>
      )}
    </div>
  );
}

export default MediaUrlInput;
