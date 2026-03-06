import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { SUPABASE_FUNCTIONS_URL } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Upload, Loader2, CheckCircle, XCircle, Video, RefreshCw } from "lucide-react";
import { useContentAnalytics } from "@/analytics";

type VideoUploadStatus = 'idle' | 'uploading' | 'processing' | 'completed' | 'failed';

interface BunnyVideoUploaderProps {
  contentId: string;
  title: string;
  onUploadComplete?: (embedUrl: string) => void;
  currentStatus?: VideoUploadStatus | string;
  disabled?: boolean;
}

function isValidStatus(status: string | undefined): status is VideoUploadStatus {
  return status !== undefined && ['idle', 'uploading', 'processing', 'completed', 'failed'].includes(status);
}

export function BunnyVideoUploader({
  contentId,
  title,
  onUploadComplete,
  currentStatus,
  disabled
}: BunnyVideoUploaderProps) {
  const { toast } = useToast();
  const { trackUploadStarted, trackUploadCompleted, trackUploadFailed } = useContentAnalytics();
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<VideoUploadStatus>(
    isValidStatus(currentStatus) ? currentStatus : 'idle'
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [videoId, setVideoId] = useState<string | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isValidStatus(currentStatus)) {
      setStatus(currentStatus);
    }
  }, [currentStatus]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  const pollVideoStatus = async (videoGuid: string) => {
    if (!videoGuid) {
      console.warn('[BunnyVideoUploader] Skipping poll - no videoId');
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('bunny-status', {
        body: { content_id: contentId, video_id: videoGuid }
      });

      if (error) {
        console.error('Status check error:', error);
        return;
      }

      if (data.status === 'completed') {
        setStatus('completed');
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }
        toast({
          title: "Video listo!",
          description: "El video se ha procesado correctamente"
        });
      } else if (data.status === 'failed') {
        setStatus('failed');
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }
        toast({
          title: "Error de procesamiento",
          description: "Hubo un error al procesar el video",
          variant: "destructive"
        });
      } else {
        setProgress(data.encode_progress || 50);
      }
    } catch (err) {
      console.error('Polling error:', err);
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'];
    if (!validTypes.includes(file.type)) {
      toast({
        title: "Formato no valido",
        description: "Por favor sube un archivo MP4, WebM, MOV o AVI",
        variant: "destructive"
      });
      return;
    }

    // Validate file size (max 5GB)
    const maxSize = 5 * 1024 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({
        title: "Archivo muy grande",
        description: "El archivo no puede superar los 5GB",
        variant: "destructive"
      });
      return;
    }

    setUploading(true);
    setStatus('uploading');
    setProgress(0);
    trackUploadStarted({
      content_type: 'video',
      file_size_bytes: file.size,
      file_format: file.type,
      source: 'bunny_uploader',
    });

    try {
      // Get user id for the edge function
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id || 'anonymous';

      // Build FormData with file + metadata
      // Uses bunny-portfolio-upload (deployed, verify_jwt=false, server-side proxy)
      // type='featured' skips DB record creation - just uploads to Bunny
      const formData = new FormData();
      formData.append('file', file);
      formData.append('user_id', userId);
      formData.append('type', 'featured');

      // Upload via XHR for progress tracking
      // The edge function proxies the file to Bunny server-side (no CORS issues)
      const xhr = new XMLHttpRequest();

      const response = await new Promise<any>((resolve, reject) => {
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            // Progress 0-90% for upload to edge function
            const percentComplete = Math.round((event.loaded / event.total) * 90);
            setProgress(percentComplete);
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              resolve(JSON.parse(xhr.responseText));
            } catch {
              reject(new Error('Respuesta invalida del servidor'));
            }
          } else {
            let errorMsg = `Error del servidor: ${xhr.status}`;
            try {
              const errData = JSON.parse(xhr.responseText);
              if (errData.error) errorMsg = errData.error;
            } catch { /* ignore parse error */ }
            reject(new Error(errorMsg));
          }
        });

        xhr.addEventListener('error', () => reject(new Error('Error de conexión. Verifica tu internet y desactiva VPN/bloqueadores si los tienes.')));
        xhr.addEventListener('abort', () => reject(new Error('Subida cancelada')));
        xhr.addEventListener('timeout', () => reject(new Error('Tiempo de espera agotado. Verifica tu conexión a internet.')));

        xhr.open('POST', `${SUPABASE_FUNCTIONS_URL}/functions/v1/bunny-portfolio-upload`);
        // No auth headers needed - bunny-portfolio-upload has verify_jwt = false
        // Do NOT set Content-Type for FormData - browser sets it with boundary
        // Set timeout to 10 minutes for large files
        xhr.timeout = 600000;
        xhr.send(formData);
      });

      console.log('[BunnyVideoUploader] Upload response:', JSON.stringify(response));

      if (!response.success) {
        throw new Error(response.error || 'Error al subir el video');
      }

      setProgress(100);

      // bunny-portfolio-upload returns: video_id, embed_url, thumbnail_url
      const extractedVideoId = response.video_id || null;
      setVideoId(extractedVideoId);

      console.log('[BunnyVideoUploader] videoId:', extractedVideoId, 'embedUrl:', response.embed_url);

      const embedUrl = response.embed_url || '';
      if (embedUrl) {
        onUploadComplete?.(embedUrl);
      }

      // Start polling for processing status only if we have a videoId
      setStatus('processing');
      if (extractedVideoId) {
        pollIntervalRef.current = setInterval(() => {
          pollVideoStatus(extractedVideoId);
        }, 5000);
      } else {
        console.warn('[BunnyVideoUploader] No videoId available, marking as completed');
        setStatus('completed');
      }

      trackUploadCompleted(contentId, {
        content_type: 'video',
        file_size_bytes: file.size,
        file_format: file.type,
        source: 'bunny_uploader',
      });

      toast({
        title: "Video subido",
        description: "El video se esta procesando en Bunny.net"
      });

    } catch (error) {
      console.error('Upload error:', error);
      setStatus('failed');
      trackUploadFailed(
        error instanceof Error ? error.message : 'unknown',
        { content_type: 'video', source: 'bunny_uploader' },
      );
      toast({
        title: "Error al subir",
        description: error instanceof Error ? error.message : "No se pudo subir el video",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRetry = () => {
    setStatus('idle');
    setProgress(0);
    setVideoId(null);
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'uploading':
        return <Upload className="h-4 w-4 animate-pulse" />;
      case 'processing':
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-destructive" />;
      default:
        return <Video className="h-4 w-4" />;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'uploading':
        return 'Subiendo...';
      case 'processing':
        return 'Procesando en Bunny.net...';
      case 'completed':
        return 'Video listo';
      case 'failed':
        return 'Error en el proceso';
      default:
        return 'Subir video a Bunny.net';
    }
  };

  return (
    <div className="space-y-3">
      <input
        ref={fileInputRef}
        type="file"
        accept="video/mp4,video/webm,video/quicktime,video/x-msvideo"
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled || uploading || status === 'processing'}
      />

      <div className="flex items-center gap-3">
        <Button
          variant={status === 'completed' ? 'outline' : 'default'}
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || uploading || status === 'processing'}
          className="flex items-center gap-2"
        >
          {getStatusIcon()}
          {getStatusText()}
        </Button>

        {status === 'processing' && videoId && (
          <Button
            variant="outline"
            size="icon"
            onClick={() => pollVideoStatus(videoId)}
            disabled={uploading}
            title="Actualizar estado"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        )}

        {status === 'failed' && (
          <Button variant="ghost" size="icon" onClick={handleRetry}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        )}
      </div>

      {(status === 'uploading' || status === 'processing') && (
        <div className="space-y-1">
          <Progress value={progress} className="h-2" />
          <p className="text-xs text-muted-foreground">
            {status === 'uploading'
              ? `Subiendo... ${progress}%`
              : `Procesando... puede tardar varios minutos (${progress}%)`}
          </p>
        </div>
      )}

      {status === 'completed' && (
        <p className="text-xs text-green-600 flex items-center gap-1">
          <CheckCircle className="h-3 w-3" />
          El video esta listo para reproducirse
        </p>
      )}
    </div>
  );
}
