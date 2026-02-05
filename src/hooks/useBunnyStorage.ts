import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

interface UploadResult {
  success: boolean;
  cdnUrl?: string;
  filePath?: string;
  error?: string;
}

export function useBunnyStorage() {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  const upload = useCallback(async (
    file: File,
    folder: string = 'uploads'
  ): Promise<UploadResult> => {
    setIsUploading(true);
    setProgress(null);
    setError(null);

    try {
      // 1. Obtener URL de upload
      const { data, error: fnError } = await supabase.functions.invoke('bunny-upload-v2', {
        body: { fileName: file.name, folder },
      });

      if (fnError || !data?.success) {
        throw new Error(fnError?.message || data?.error || 'Failed to get upload URL');
      }

      const { uploadUrl, cdnUrl, filePath, accessKey } = data;

      // 2. Subir archivo a Bunny
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
            reject(new Error(`Upload failed: ${xhr.status}`));
          }
        });

        xhr.addEventListener('error', () => reject(new Error('Upload failed')));

        xhr.open('PUT', uploadUrl);
        xhr.setRequestHeader('AccessKey', accessKey);
        xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
        xhr.send(file);
      });

      return { success: true, cdnUrl, filePath };

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed';
      setError(message);
      return { success: false, error: message };

    } finally {
      setIsUploading(false);
    }
  }, []);

  const deleteFile = useCallback(async (filePath: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.functions.invoke('bunny-delete-v2', {
        body: { filePath },
      });

      return !error && data?.success;
    } catch {
      return false;
    }
  }, []);

  const getDownloadUrl = useCallback((filePath: string): string => {
    return `https://cdn.kreoon.com/${filePath}`;
  }, []);

  return {
    upload,
    deleteFile,
    getDownloadUrl,
    isUploading,
    progress,
    error,
  };
}
