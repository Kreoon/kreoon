import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase, SUPABASE_FUNCTIONS_URL } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Upload, Loader2, CheckCircle, XCircle, Video, RefreshCw } from "lucide-react";

interface BunnyVideoUploaderProps {
  contentId: string;
  title: string;
  onUploadComplete?: (embedUrl: string) => void;
  currentStatus?: string;
  disabled?: boolean;
}

export function BunnyVideoUploader({ 
  contentId, 
  title, 
  onUploadComplete,
  currentStatus,
  disabled 
}: BunnyVideoUploaderProps) {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'processing' | 'completed' | 'failed'>(
    currentStatus as any || 'idle'
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [videoId, setVideoId] = useState<string | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (currentStatus) {
      setStatus(currentStatus as any);
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
          title: "¡Video listo!",
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
        title: "Formato no válido",
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

    try {
      const supabaseUrl = SUPABASE_FUNCTIONS_URL;
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('No autenticado');

      // Step 1: Get upload credentials from edge function (no file data sent)
      const createUrl = new URL(`${supabaseUrl}/functions/v1/bunny-upload`);
      createUrl.searchParams.set('content_id', contentId);
      createUrl.searchParams.set('title', title);

      const credResponse = await fetch(createUrl.toString(), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!credResponse.ok) {
        const errorData = await credResponse.json().catch(() => ({}));
        throw new Error(errorData?.error || `Error obteniendo credenciales: ${credResponse.status}`);
      }

      const credentials = await credResponse.json();
      if (!credentials?.success || !credentials?.uploadUrl) {
        throw new Error('No se pudieron obtener las credenciales de subida');
      }

      setProgress(10);

      // Step 2: Upload directly to Bunny from browser using XHR for progress
      const xhr = new XMLHttpRequest();
      
      await new Promise<void>((resolve, reject) => {
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const percentComplete = Math.round((event.loaded / event.total) * 80) + 10;
            setProgress(percentComplete);
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error(`Error de Bunny: ${xhr.status}`));
          }
        });

        xhr.addEventListener('error', () => reject(new Error('Error de red')));
        xhr.addEventListener('abort', () => reject(new Error('Subida cancelada')));

        xhr.open('PUT', credentials.uploadUrl);
        xhr.setRequestHeader('AccessKey', credentials.accessKey);
        xhr.setRequestHeader('Content-Type', 'application/octet-stream');
        xhr.send(file);
      });

      setProgress(95);

      // Step 3: Confirm upload to update database
      const confirmResponse = await fetch(`${supabaseUrl}/functions/v1/bunny-upload`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content_id: contentId,
          video_id: credentials.video_id,
          embed_url: credentials.embed_url,
          variant_index: 0,
        }),
      });

      if (!confirmResponse.ok) {
        const errorData = await confirmResponse.json().catch(() => ({}));
        throw new Error(errorData?.error || 'Error confirmando subida');
      }

      setProgress(100);
      setVideoId(credentials.video_id);

      if (credentials.embed_url) {
        onUploadComplete?.(credentials.embed_url);
      }

      // Start polling for processing status
      setStatus('processing');
      pollIntervalRef.current = setInterval(() => {
        pollVideoStatus(credentials.video_id);
      }, 5000);

      toast({
        title: "Video subido",
        description: "El video se está procesando en Bunny.net"
      });

    } catch (error) {
      console.error('Upload error:', error);
      setStatus('failed');
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
          El video está listo para reproducirse
        </p>
      )}
    </div>
  );
}
