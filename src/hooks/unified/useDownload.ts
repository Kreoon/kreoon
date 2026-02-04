import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface DownloadOptions {
  contentId: string;
  videoUrl?: string;
  videoUrls?: string[];
  title?: string;
  variantIndex?: number;
}

interface DownloadProgress {
  contentId: string;
  progress: number;
  status: 'pending' | 'downloading' | 'completed' | 'error';
}

interface UseDownloadReturn {
  download: (options: DownloadOptions) => Promise<void>;
  downloadBatch: (items: DownloadOptions[]) => Promise<void>;
  isDownloading: boolean;
  progress: DownloadProgress[];
  canDownload: (status: string, isPublished?: boolean) => boolean;
}

export function useDownload(): UseDownloadReturn {
  const [isDownloading, setIsDownloading] = useState(false);
  const [progress, setProgress] = useState<DownloadProgress[]>([]);

  const canDownload = useCallback((status: string, isPublished?: boolean): boolean => {
    // Content can be downloaded if:
    // 1. Status is 'approved' or 'published'
    // 2. Content is_published is true
    const allowedStatuses = ['approved', 'published', 'entregado', 'aprobado'];
    return allowedStatuses.includes(status.toLowerCase()) || isPublished === true;
  }, []);

  const download = useCallback(async (options: DownloadOptions) => {
    const { contentId, videoUrl, videoUrls, title, variantIndex = 0 } = options;

    // Determine which URL to download
    let urlToDownload = videoUrl;
    if (videoUrls && videoUrls.length > 0) {
      urlToDownload = videoUrls[variantIndex] || videoUrls[0];
    }

    if (!urlToDownload) {
      toast.error('No hay video disponible para descargar');
      return;
    }

    setIsDownloading(true);
    setProgress(prev => [...prev, { contentId, progress: 0, status: 'pending' }]);

    try {
      // Update progress to downloading
      setProgress(prev =>
        prev.map(p => p.contentId === contentId
          ? { ...p, progress: 10, status: 'downloading' }
          : p
        )
      );

      // Check if it's a Bunny CDN URL that needs proxying
      const isBunnyUrl = urlToDownload.includes('b-cdn.net') ||
                         urlToDownload.includes('bunnycdn') ||
                         urlToDownload.includes('mediadelivery.net');

      if (isBunnyUrl) {
        // Use Bunny download edge function
        const { data, error } = await supabase.functions.invoke('bunny-download', {
          body: {
            content_id: contentId,
            video_url: urlToDownload
          }
        });

        if (error) throw error;

        if (data?.downloadUrl) {
          urlToDownload = data.downloadUrl;
        }
      }

      // Update progress
      setProgress(prev =>
        prev.map(p => p.contentId === contentId
          ? { ...p, progress: 50, status: 'downloading' }
          : p
        )
      );

      // Fetch the video
      const response = await fetch(urlToDownload);
      if (!response.ok) throw new Error('Error al descargar el archivo');

      const blob = await response.blob();

      // Update progress
      setProgress(prev =>
        prev.map(p => p.contentId === contentId
          ? { ...p, progress: 90, status: 'downloading' }
          : p
        )
      );

      // Generate filename
      const variantSuffix = videoUrls && videoUrls.length > 1
        ? `_variante_${variantIndex + 1}`
        : '';
      const sanitizedTitle = (title || contentId)
        .replace(/[^a-zA-Z0-9\s-]/g, '')
        .replace(/\s+/g, '_')
        .substring(0, 50);
      const filename = `${sanitizedTitle}${variantSuffix}.mp4`;

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      // Update progress to completed
      setProgress(prev =>
        prev.map(p => p.contentId === contentId
          ? { ...p, progress: 100, status: 'completed' }
          : p
        )
      );

      toast.success('Descarga completada');
    } catch (error) {
      console.error('[useDownload] Error:', error);
      setProgress(prev =>
        prev.map(p => p.contentId === contentId
          ? { ...p, status: 'error' }
          : p
        )
      );
      toast.error('Error al descargar el video');
    } finally {
      setIsDownloading(false);
      // Clear progress after a delay
      setTimeout(() => {
        setProgress(prev => prev.filter(p => p.contentId !== contentId));
      }, 3000);
    }
  }, []);

  const downloadBatch = useCallback(async (items: DownloadOptions[]) => {
    if (items.length === 0) {
      toast.error('No hay videos para descargar');
      return;
    }

    if (items.length === 1) {
      await download(items[0]);
      return;
    }

    setIsDownloading(true);
    toast.info(`Descargando ${items.length} videos...`);

    try {
      // Use bunny-download-zip for batch downloads
      const { data, error } = await supabase.functions.invoke('bunny-download-zip', {
        body: {
          items: items.map(item => ({
            content_id: item.contentId,
            video_url: item.videoUrls?.[item.variantIndex || 0] || item.videoUrl,
            title: item.title
          }))
        }
      });

      if (error) throw error;

      if (data?.downloadUrl) {
        const a = document.createElement('a');
        a.href = data.downloadUrl;
        a.download = `contenido_${new Date().toISOString().split('T')[0]}.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        toast.success('Descarga completada');
      } else {
        throw new Error('No se pudo generar el archivo ZIP');
      }
    } catch (error) {
      console.error('[useDownload] Batch error:', error);
      // Fallback to sequential downloads
      toast.info('Descargando videos individualmente...');
      for (const item of items) {
        await download(item);
      }
    } finally {
      setIsDownloading(false);
    }
  }, [download]);

  return {
    download,
    downloadBatch,
    isDownloading,
    progress,
    canDownload
  };
}
