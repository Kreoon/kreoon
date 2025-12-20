import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
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
      const formData = new FormData();
      formData.append('file', file);
      formData.append('content_id', contentId);
      formData.append('title', title);

      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 500);

      const { data, error } = await supabase.functions.invoke('bunny-upload', {
        body: formData
      });

      clearInterval(progressInterval);

      if (error) throw error;

      setProgress(100);
      setVideoId(data.video_id);

      if (data.embed_url) {
        onUploadComplete?.(data.embed_url);
      }

      // Start polling for processing status
      setStatus('processing');
      pollIntervalRef.current = setInterval(() => {
        pollVideoStatus(data.video_id);
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
            {status === 'uploading' ? `Subiendo... ${progress}%` : `Procesando... ${progress}%`}
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
