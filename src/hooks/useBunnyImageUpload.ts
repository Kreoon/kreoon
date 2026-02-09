import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const DEFAULT_MAX_SIZE_MB = 10;

interface BunnyImageUploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

interface BunnyImageUploadResult {
  success: boolean;
  cdnUrl?: string;
  storagePath?: string;
  error?: string;
}

export function useBunnyImageUpload() {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState<BunnyImageUploadProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  const uploadImage = useCallback(async (
    file: File,
    storagePath: string,
    maxSizeMB: number = DEFAULT_MAX_SIZE_MB
  ): Promise<BunnyImageUploadResult> => {
    setIsUploading(true);
    setProgress(null);
    setError(null);

    try {
      // Client-side validation
      if (!ALLOWED_TYPES.includes(file.type)) {
        throw new Error('Formato no soportado. Usa JPG, PNG, GIF o WebP.');
      }

      if (file.size > maxSizeMB * 1024 * 1024) {
        throw new Error(`El archivo excede ${maxSizeMB}MB.`);
      }

      // Step 1: Get Bunny Storage credentials
      const { data: creds, error: credsError } = await supabase.functions.invoke('bunny-raw-upload', {
        body: { storagePath },
      });

      if (credsError || !creds?.success) {
        throw new Error(credsError?.message || creds?.error || 'Error al obtener credenciales de subida');
      }

      // Step 2: Upload directly to Bunny Storage via XHR (for progress tracking)
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            setProgress({
              loaded: event.loaded,
              total: event.total,
              percentage: Math.round((event.loaded / event.total) * 100),
            });
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error(`Error al subir: ${xhr.status} ${xhr.statusText}`));
          }
        });

        xhr.addEventListener('error', () => reject(new Error('Error de red al subir la imagen')));
        xhr.addEventListener('timeout', () => reject(new Error('Tiempo de espera agotado')));

        xhr.open('PUT', creds.uploadUrl);
        xhr.setRequestHeader('AccessKey', creds.accessKey);
        xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
        xhr.timeout = 60000; // 60s timeout
        xhr.send(file);
      });

      setProgress({ loaded: 1, total: 1, percentage: 100 });
      return { success: true, cdnUrl: creds.cdnUrl, storagePath };

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al subir la imagen';
      setError(message);
      return { success: false, error: message };

    } finally {
      setIsUploading(false);
    }
  }, []);

  const deleteImage = useCallback(async (storagePath: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.functions.invoke('bunny-raw-delete', {
        body: { storagePath },
      });
      return !error && data?.success;
    } catch {
      return false;
    }
  }, []);

  const reset = useCallback(() => {
    setIsUploading(false);
    setProgress(null);
    setError(null);
  }, []);

  return {
    uploadImage,
    deleteImage,
    isUploading,
    progress,
    error,
    reset,
  };
}

/** Helper to generate consistent Bunny Storage paths for marketplace images */
export function marketplaceStoragePath(
  type: 'org-cover' | 'org-gallery' | 'brand-logo' | 'portfolio-image',
  entityId: string,
  file?: File
): string {
  const ext = file?.name.split('.').pop()?.toLowerCase() || 'jpg';
  const uniqueSuffix = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  switch (type) {
    case 'org-cover':
      return `marketplace/orgs/${entityId}/cover_${uniqueSuffix}.${ext}`;
    case 'org-gallery':
      return `marketplace/orgs/${entityId}/gallery/${uniqueSuffix}.${ext}`;
    case 'brand-logo':
      return `marketplace/brands/${entityId}/logo_${uniqueSuffix}.${ext}`;
    case 'portfolio-image':
      return `marketplace/portfolio/${entityId}/${uniqueSuffix}.${ext}`;
  }
}
