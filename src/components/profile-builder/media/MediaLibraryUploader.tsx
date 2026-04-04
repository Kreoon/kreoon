import { useCallback, useRef, useState } from 'react';
import { UploadCloud, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { supabase, SUPABASE_FUNCTIONS_URL } from '@/integrations/supabase/client';
import { useMediaUpload } from '@/hooks/useMediaUpload';
import type { MediaItem } from './types';

interface MediaLibraryUploaderProps {
  userId: string;
  creatorProfileId?: string;
  allowedTypes?: ('image' | 'video')[];
  onUploaded: (item: MediaItem) => void;
}

const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/avif'];
const ACCEPTED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'];

const IMAGE_MAX_MB = 10;
const VIDEO_MAX_MB = 500;

function buildAcceptString(allowedTypes: ('image' | 'video')[]) {
  const mimeTypes: string[] = [];
  if (allowedTypes.includes('image')) mimeTypes.push(...ACCEPTED_IMAGE_TYPES);
  if (allowedTypes.includes('video')) mimeTypes.push(...ACCEPTED_VIDEO_TYPES);
  return mimeTypes.join(',');
}

function getFileMediaType(file: File): 'image' | 'video' | null {
  if (ACCEPTED_IMAGE_TYPES.includes(file.type)) return 'image';
  if (ACCEPTED_VIDEO_TYPES.includes(file.type)) return 'video';
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif'].includes(ext)) return 'image';
  if (['mp4', 'webm', 'mov', 'avi'].includes(ext)) return 'video';
  return null;
}

function validateFile(
  file: File,
  allowedTypes: ('image' | 'video')[]
): string | null {
  const mediaType = getFileMediaType(file);

  if (!mediaType) {
    return `Formato no soportado: ${file.type || file.name}`;
  }

  if (!allowedTypes.includes(mediaType)) {
    const labels = allowedTypes.map((t) => (t === 'image' ? 'imagen' : 'video')).join(' o ');
    return `Solo se permiten archivos de tipo: ${labels}`;
  }

  const maxMB = mediaType === 'video' ? VIDEO_MAX_MB : IMAGE_MAX_MB;
  if (file.size > maxMB * 1024 * 1024) {
    return `El archivo supera el limite de ${maxMB}MB`;
  }

  return null;
}

export function MediaLibraryUploader({
  userId,
  creatorProfileId,
  allowedTypes = ['image', 'video'],
  onUploaded,
}: MediaLibraryUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);

  const { isUploading, isOptimizing, progress, error: uploadError, upload, reset } = useMediaUpload();

  const handleFile = useCallback(
    async (file: File) => {
      setValidationError(null);
      setUploadedFileName(null);
      reset();

      const error = validateFile(file, allowedTypes);
      if (error) {
        setValidationError(error);
        return;
      }

      const mediaType = getFileMediaType(file);
      if (!mediaType) return;

      let mediaUrl: string;
      let thumbnailUrl: string | null = null;

      // Para VIDEOS: usar Bunny Stream (bunny-portfolio-upload) que genera thumbnails
      // Para IMAGENES: usar Bunny Storage (useMediaUpload)
      if (mediaType === 'video') {
        // Step 1: Crear video en Bunny Stream
        const createRes = await fetch(`${SUPABASE_FUNCTIONS_URL}/functions/v1/bunny-portfolio-upload`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'create',
            user_id: userId,
            type: 'portfolio',
            file_name: file.name,
          }),
        });

        if (!createRes.ok) {
          const errData = await createRes.json().catch(() => ({}));
          setValidationError(errData.error || `Error del servidor: ${createRes.status}`);
          return;
        }

        const createData = await createRes.json();
        if (!createData.success) {
          setValidationError(createData.error || 'Error al crear video en Bunny');
          return;
        }

        // Step 2: Subir archivo directamente a Bunny Stream
        const uploadSuccess = await new Promise<boolean>((resolve) => {
          const xhr = new XMLHttpRequest();

          xhr.upload.addEventListener('progress', (event) => {
            if (event.lengthComputable) {
              const percent = Math.round((event.loaded / event.total) * 100);
              // Podriamos actualizar progreso aqui si tuvieramos un state
              console.log(`[MediaLibraryUploader] Upload progress: ${percent}%`);
            }
          });

          xhr.addEventListener('load', () => {
            resolve(xhr.status >= 200 && xhr.status < 300);
          });

          xhr.addEventListener('error', () => resolve(false));
          xhr.addEventListener('abort', () => resolve(false));

          xhr.open('PUT', createData.upload_url);
          xhr.setRequestHeader('AccessKey', createData.access_key);
          xhr.setRequestHeader('Content-Type', 'application/octet-stream');
          xhr.timeout = 600000; // 10 min
          xhr.send(file);
        });

        if (!uploadSuccess) {
          setValidationError('Error al subir video a Bunny');
          return;
        }

        // Usar URLs de Bunny Stream
        mediaUrl = createData.embed_url;
        thumbnailUrl = createData.thumbnail_url;
        console.log('[MediaLibraryUploader] Video uploaded to Bunny Stream:', {
          video_id: createData.video_id,
          embed_url: mediaUrl,
          thumbnail_url: thumbnailUrl,
        });

      } else {
        // IMAGENES: usar Bunny Storage via useMediaUpload
        const result = await upload(file, {
          type: 'portfolio',
          userId,
        });

        if (!result) return;
        mediaUrl = result.cdnUrl;
        // Para imagenes, la misma URL sirve como thumbnail
        thumbnailUrl = result.cdnUrl;
      }

      // Guardar registro en portfolio_items si hay creatorProfileId
      let newItem: MediaItem;

      if (creatorProfileId) {
        const { data: row, error: dbError } = await (supabase as any)
          .from('portfolio_items')
          .insert({
            creator_id: creatorProfileId,
            title: file.name.replace(/\.[^.]+$/, ''),
            media_type: mediaType,
            media_url: mediaUrl,
            thumbnail_url: thumbnailUrl,
            tags: [],
            aspect_ratio: mediaType === 'video' ? '16:9' : '1:1',
            is_public: true,
            is_featured: false,
            display_order: 0,
          })
          .select('id, creator_id, title, media_type, media_url, thumbnail_url, tags, aspect_ratio, created_at')
          .single();

        if (dbError || !row) {
          console.error('[MediaLibraryUploader] Error guardando en portfolio_items:', dbError);
          // Aun asi retornar el item sin id de BD
          newItem = {
            id: crypto.randomUUID(),
            type: mediaType,
            url: mediaUrl,
            thumbnailUrl: thumbnailUrl ?? undefined,
            title: file.name.replace(/\.[^.]+$/, ''),
            source: 'portfolio_items',
            createdAt: new Date().toISOString(),
          };
        } else {
          newItem = {
            id: row.id as string,
            type: mediaType,
            url: row.media_url as string,
            thumbnailUrl: (row.thumbnail_url as string | null) ?? undefined,
            title: (row.title as string | null) ?? undefined,
            tags: (row.tags as string[]) ?? [],
            source: 'portfolio_items',
            createdAt: row.created_at as string,
            aspectRatio: (row.aspect_ratio as string | null) ?? undefined,
          };
        }
      } else {
        // Sin creatorProfileId: guardar en marketplace_media
        const { data: row, error: dbError } = await (supabase as any)
          .from('marketplace_media')
          .insert({
            file_url: mediaUrl,
            thumbnail_url: thumbnailUrl,
            file_type: file.type,
            uploaded_by: userId,
          })
          .select('id, file_url, thumbnail_url, file_type, uploaded_by, created_at')
          .single();

        if (dbError || !row) {
          console.error('[MediaLibraryUploader] Error guardando en marketplace_media:', dbError);
          newItem = {
            id: crypto.randomUUID(),
            type: mediaType,
            url: mediaUrl,
            thumbnailUrl: thumbnailUrl ?? undefined,
            source: 'marketplace_media',
            createdAt: new Date().toISOString(),
          };
        } else {
          newItem = {
            id: row.id as string,
            type: mediaType,
            url: row.file_url as string,
            thumbnailUrl: (row.thumbnail_url as string | null) ?? undefined,
            source: 'marketplace_media',
            createdAt: row.created_at as string,
          };
        }
      }

      setUploadedFileName(file.name);
      onUploaded(newItem);
    },
    [allowedTypes, userId, creatorProfileId, upload, reset, onUploaded]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFile(file);
        // Limpiar input para permitir reseleccionar el mismo archivo
        e.target.value = '';
      }
    },
    [handleFile]
  );

  const acceptString = buildAcceptString(allowedTypes);
  const hasError = validationError || uploadError;
  const isLoading = isUploading || isOptimizing;

  const statusLabel = isOptimizing
    ? 'Optimizando...'
    : isUploading
    ? `Subiendo... ${progress}%`
    : null;

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Zona drag & drop */}
      <div
        role="button"
        tabIndex={0}
        aria-label="Zona de carga de archivos — arrastra o haz clic para seleccionar"
        onDragEnter={() => setIsDragOver(true)}
        onDragLeave={() => setIsDragOver(false)}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        onClick={() => !isLoading && inputRef.current?.click()}
        onKeyDown={(e) => {
          if ((e.key === 'Enter' || e.key === ' ') && !isLoading) {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        className={cn(
          'relative flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-8 text-center cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          isDragOver
            ? 'border-primary bg-primary/5'
            : 'border-border hover:border-primary/50 hover:bg-accent/30',
          isLoading && 'pointer-events-none opacity-60 cursor-not-allowed',
        )}
      >
        {isLoading ? (
          <>
            <Loader2 className="h-10 w-10 text-primary animate-spin" />
            <p className="text-sm font-medium text-foreground">{statusLabel}</p>
            {isUploading && (
              <div className="w-full max-w-xs bg-muted rounded-full h-1.5 overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}
          </>
        ) : (
          <>
            <UploadCloud
              className={cn(
                'h-10 w-10 transition-colors',
                isDragOver ? 'text-primary' : 'text-muted-foreground',
              )}
            />
            <div>
              <p className="text-sm font-medium text-foreground">
                {isDragOver ? 'Suelta aqui' : 'Arrastra tu archivo o haz clic para seleccionar'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {allowedTypes.includes('image') && allowedTypes.includes('video')
                  ? 'Imagenes (JPG, PNG, WebP) o videos (MP4, WebM, MOV)'
                  : allowedTypes.includes('image')
                  ? 'Imagenes JPG, PNG, GIF, WebP — maximo 10MB'
                  : 'Videos MP4, WebM, MOV — maximo 500MB'}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              tabIndex={-1}
              onClick={(e) => {
                e.stopPropagation();
                inputRef.current?.click();
              }}
            >
              Seleccionar archivo
            </Button>
          </>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={acceptString}
        className="sr-only"
        aria-hidden="true"
        tabIndex={-1}
        onChange={handleInputChange}
      />

      {/* Errores */}
      {hasError && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
        >
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{validationError ?? uploadError}</span>
        </div>
      )}

      {/* Exito */}
      {uploadedFileName && !hasError && !isLoading && (
        <div
          role="status"
          className="flex items-center gap-2 rounded-lg border border-green-500/30 bg-green-500/10 p-3 text-sm text-green-600 dark:text-green-400"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>
            <span className="font-medium">{uploadedFileName}</span> subido correctamente — aparece en tu biblioteca
          </span>
        </div>
      )}
    </div>
  );
}
