import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { uploadToBunnyStreamTus } from '@/lib/bunnyStreamTus';

interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

interface UploadResult {
  success: boolean;
  videoId?: string;
  embedUrl?: string;
  thumbnailUrl?: string;
  error?: string;
}

interface VideoInfo {
  videoId: string;
  title: string;
  status: number;
  encodeProgress: number;
  embedUrl: string;
  thumbnailUrl: string;
  directUrls: Record<string, string>;
  isReady: boolean;
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
      // 1. Get upload URL from Edge Function (creates video in Bunny Stream)
      const { data, error: fnError } = await supabase.functions.invoke('bunny-upload-v2', {
        body: { fileName: file.name, folder },
      });

      if (fnError || !data?.success) {
        throw new Error(fnError?.message || data?.error || 'Failed to get upload URL');
      }

      const { videoId, embedUrl, thumbnailUrl, tus } = data;

      // 2. Subida directa a Bunny Stream vía TUS firmado (la API key no sale del servidor)
      await uploadToBunnyStreamTus(file, tus, {
        onProgress: (loaded, total) => {
          setProgress({
            loaded,
            total,
            percentage: Math.round((loaded / total) * 100),
          });
        },
      });

      return { success: true, videoId, embedUrl, thumbnailUrl };

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed';
      setError(message);
      return { success: false, error: message };

    } finally {
      setIsUploading(false);
    }
  }, []);

  const deleteVideo = useCallback(async (videoId: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.functions.invoke('bunny-delete-v2', {
        body: { videoId },
      });

      return !error && data?.success;
    } catch {
      return false;
    }
  }, []);

  const getVideoInfo = useCallback(async (videoId: string): Promise<VideoInfo | null> => {
    try {
      const { data, error } = await supabase.functions.invoke('bunny-download-v2', {
        body: { videoId },
      });

      if (error || !data?.success) {
        return null;
      }

      return data as VideoInfo;
    } catch {
      return null;
    }
  }, []);

  const getEmbedUrl = useCallback((videoId: string, libraryId: string = '568434'): string => {
    return `https://iframe.mediadelivery.net/embed/${libraryId}/${videoId}`;
  }, []);

  return {
    upload,
    deleteVideo,
    getVideoInfo,
    getEmbedUrl,
    isUploading,
    progress,
    error,
  };
}
