import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { getBunnyVideoUrls } from '@/hooks/useHLSPlayer';
import { logger } from '@/lib/logger';

// Helper to check and refresh session if needed
async function ensureValidSession(): Promise<boolean> {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error) {
      logger.warn('useDownload Error getting session', { error });
      return false;
    }

    if (!session) {
      logger.warn('useDownload No active session');
      return false;
    }

    // Check if token is about to expire (within 60 seconds)
    const expiresAt = session.expires_at;
    const now = Math.floor(Date.now() / 1000);

    if (expiresAt && expiresAt - now < 60) {
      logger.debug('useDownload Session expiring soon, refreshing');
      const { data, error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError || !data.session) {
        logger.warn('useDownload Failed to refresh session', { error: refreshError });
        return false;
      }
      logger.debug('useDownload Session refreshed successfully');
    }

    return true;
  } catch (e) {
    logger.error('useDownload Session check error', e);
    return false;
  }
}

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
    // 1. Status is in approved/delivered states (matches bunny-download edge function)
    // 2. Content is_published is true
    const allowedStatuses = ['approved', 'published', 'delivered', 'corrected', 'paid', 'completed', 'entregado', 'aprobado'];
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

      // Check if it's a Bunny CDN URL
      const isBunnyUrl = urlToDownload.includes('b-cdn.net') ||
                         urlToDownload.includes('bunnycdn') ||
                         urlToDownload.includes('mediadelivery.net');

      let finalDownloadUrl = urlToDownload;
      let usedEdgeFunction = false;

      if (isBunnyUrl) {
        // Check session before calling Edge Function
        const hasValidSession = await ensureValidSession();

        if (hasValidSession) {
          // Try Edge Function (provides best quality + auth)
          try {
            logger.debug('useDownload Calling bunny-download with valid session');
            const { data, error } = await supabase.functions.invoke('bunny-download', {
              body: {
                content_id: contentId,
                video_url: urlToDownload
              }
            });

            if (!error && data?.download_url) {
              finalDownloadUrl = data.download_url;
              usedEdgeFunction = true;
              logger.debug('useDownload Edge Function OK', { quality: data.quality });
            } else {
              logger.warn('useDownload Edge Function error', { error });
              throw error || new Error('No download URL returned');
            }
          } catch (edgeFnError) {
            // Fallback to direct CDN URL if Edge Function fails
            logger.warn('useDownload Edge Function failed, using direct CDN fallback', { error: edgeFnError });

            const bunnyUrls = getBunnyVideoUrls(urlToDownload);
            if (bunnyUrls?.mp4) {
              finalDownloadUrl = bunnyUrls.mp4;
              logger.debug('useDownload Direct CDN fallback');
            }
          }
        } else {
          // No valid session - use direct CDN fallback
          logger.debug('useDownload No valid session, using direct CDN download');
          const bunnyUrls = getBunnyVideoUrls(urlToDownload);
          if (bunnyUrls?.mp4) {
            finalDownloadUrl = bunnyUrls.mp4;
            logger.debug('useDownload Direct CDN');
          }
        }
      }

      // Update progress
      setProgress(prev =>
        prev.map(p => p.contentId === contentId
          ? { ...p, progress: 30, status: 'downloading' }
          : p
        )
      );

      // Fetch the video
      const response = await fetch(finalDownloadUrl);
      if (!response.ok) {
        throw new Error(`Error al descargar: ${response.status}`);
      }

      // Get content length for progress tracking
      const contentLength = response.headers.get('content-length');
      const totalBytes = contentLength ? parseInt(contentLength, 10) : 0;

      // Read the response as a stream for progress tracking
      let receivedBytes = 0;
      const reader = response.body?.getReader();
      const chunks: Uint8Array[] = [];

      if (reader && totalBytes > 0) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          chunks.push(value);
          receivedBytes += value.length;

          // Update progress (30-90 range for download)
          const downloadProgress = 30 + Math.round((receivedBytes / totalBytes) * 60);
          setProgress(prev =>
            prev.map(p => p.contentId === contentId
              ? { ...p, progress: downloadProgress, status: 'downloading' }
              : p
            )
          );
        }
      } else {
        // Fallback for when we can't track progress
        const blob = await response.blob();
        chunks.push(new Uint8Array(await blob.arrayBuffer()));
      }

      // Combine chunks into a single blob
      const blob = new Blob(chunks, { type: 'video/mp4' });

      // Update progress
      setProgress(prev =>
        prev.map(p => p.contentId === contentId
          ? { ...p, progress: 95, status: 'downloading' }
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

      toast.success(usedEdgeFunction ? 'Descarga completada (mejor calidad)' : 'Descarga completada');
    } catch (error) {
      logger.error('useDownload Error', error);
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
      logger.error('useDownload Batch error', error);
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
