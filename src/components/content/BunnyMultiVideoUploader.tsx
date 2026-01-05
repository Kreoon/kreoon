import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Upload, Loader2, CheckCircle, XCircle, Video, RefreshCw, Plus, Trash2 } from "lucide-react";

interface VideoUpload {
  id: string;
  status: 'idle' | 'uploading' | 'processing' | 'completed' | 'failed';
  progress: number;
  embedUrl: string;
  videoId: string | null;
}

interface BunnyMultiVideoUploaderProps {
  contentId: string;
  title: string;
  currentUrls?: string[];
  hooksCount: number;
  onUploadComplete?: (urls: string[]) => void;
  disabled?: boolean;
  showPreview?: boolean;
}

export function BunnyMultiVideoUploader({ 
  contentId, 
  title, 
  currentUrls = [],
  hooksCount,
  onUploadComplete,
  disabled,
  showPreview = true
}: BunnyMultiVideoUploaderProps) {
  const { toast } = useToast();
  const [uploads, setUploads] = useState<VideoUpload[]>([]);
  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});
  const pollIntervals = useRef<{ [key: string]: NodeJS.Timeout }>({});

  // Initialize uploads array based on hooksCount and currentUrls
  useEffect(() => {
    const initialUploads: VideoUpload[] = Array.from({ length: hooksCount }, (_, index) => ({
      id: `video-${index}`,
      status: currentUrls[index] ? 'completed' : 'idle',
      progress: currentUrls[index] ? 100 : 0,
      embedUrl: currentUrls[index] || '',
      videoId: null
    }));
    setUploads(initialUploads);
  }, [hooksCount]);

  // Update uploads when currentUrls change
  useEffect(() => {
    setUploads(prev => prev.map((upload, index) => ({
      ...upload,
      embedUrl: currentUrls[index] || upload.embedUrl,
      status: currentUrls[index] ? 'completed' : upload.status
    })));
  }, [currentUrls]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      Object.values(pollIntervals.current).forEach(interval => clearInterval(interval));
    };
  }, []);

  const pollVideoStatus = async (uploadId: string, videoGuid: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('bunny-status', {
        body: { content_id: contentId, video_id: videoGuid }
      });

      if (error) {
        console.error('Status check error:', error);
        return;
      }

      if (data.status === 'completed') {
        setUploads(prev => prev.map(u => 
          u.id === uploadId ? { ...u, status: 'completed' } : u
        ));
        if (pollIntervals.current[uploadId]) {
          clearInterval(pollIntervals.current[uploadId]);
          delete pollIntervals.current[uploadId];
        }
        toast({
          title: "¡Video listo!",
          description: "El video se ha procesado correctamente"
        });
      } else if (data.status === 'failed') {
        setUploads(prev => prev.map(u => 
          u.id === uploadId ? { ...u, status: 'failed' } : u
        ));
        if (pollIntervals.current[uploadId]) {
          clearInterval(pollIntervals.current[uploadId]);
          delete pollIntervals.current[uploadId];
        }
        toast({
          title: "Error de procesamiento",
          description: "Hubo un error al procesar el video",
          variant: "destructive"
        });
      } else {
        setUploads(prev => prev.map(u => 
          u.id === uploadId ? { ...u, progress: data.encode_progress || 50 } : u
        ));
      }
    } catch (err) {
      console.error('Polling error:', err);
    }
  };

  const handleFileSelect = async (uploadId: string, index: number, event: React.ChangeEvent<HTMLInputElement>) => {
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

    // Update upload state
    setUploads(prev => prev.map(u => 
      u.id === uploadId ? { ...u, status: 'uploading', progress: 0 } : u
    ));

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('No autenticado');

      // Step 1: Get upload credentials from edge function (no file data sent)
      const createUrl = new URL(`${supabaseUrl}/functions/v1/bunny-upload`);
      createUrl.searchParams.set('content_id', contentId);
      createUrl.searchParams.set('title', `${title} - Variable ${index + 1}`);
      createUrl.searchParams.set('variant_index', String(index));

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

      setUploads(prev => prev.map(u => 
        u.id === uploadId ? { ...u, progress: 10 } : u
      ));

      // Step 2: Upload directly to Bunny from browser using XHR for progress
      const xhr = new XMLHttpRequest();
      
      await new Promise<void>((resolve, reject) => {
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const percentComplete = Math.round((event.loaded / event.total) * 80) + 10;
            setUploads(prev => prev.map(u => 
              u.id === uploadId ? { ...u, progress: percentComplete } : u
            ));
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

      setUploads(prev => prev.map(u => 
        u.id === uploadId ? { ...u, progress: 95 } : u
      ));

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
          variant_index: index,
        }),
      });

      if (!confirmResponse.ok) {
        const errorData = await confirmResponse.json().catch(() => ({}));
        throw new Error(errorData?.error || 'Error confirmando subida');
      }

      // Update with embed URL
      const newEmbedUrl = credentials.embed_url || '';
      setUploads(prev => {
        const newUploads = prev.map(u => 
          u.id === uploadId ? { 
            ...u, 
            progress: 100, 
            videoId: credentials.video_id,
            embedUrl: newEmbedUrl,
            status: 'processing' as const
          } : u
        );
        
        // Notify parent with all URLs
        const allUrls = newUploads.map(u => u.embedUrl);
        onUploadComplete?.(allUrls);
        
        return newUploads;
      });

      // Start polling for processing status
      pollIntervals.current[uploadId] = setInterval(() => {
        pollVideoStatus(uploadId, credentials.video_id);
      }, 5000);

      toast({
        title: "Video subido",
        description: `Variable ${index + 1} se está procesando en Bunny.net`
      });

    } catch (error) {
      console.error('Upload error:', error);
      setUploads(prev => prev.map(u => 
        u.id === uploadId ? { ...u, status: 'failed' } : u
      ));
      toast({
        title: "Error al subir",
        description: error instanceof Error ? error.message : "No se pudo subir el video",
        variant: "destructive"
      });
    } finally {
      // Reset file input
      if (fileInputRefs.current[uploadId]) {
        fileInputRefs.current[uploadId]!.value = '';
      }
    }
  };

  const handleRetry = (uploadId: string) => {
    setUploads(prev => prev.map(u => 
      u.id === uploadId ? { ...u, status: 'idle', progress: 0, videoId: null } : u
    ));
  };

  const handleRemove = async (uploadId: string, index: number, embedUrl: string) => {
    if (!embedUrl) {
      // If no URL, just reset local state
      setUploads(prev => prev.map(u => 
        u.id === uploadId ? { ...u, embedUrl: '', status: 'idle' as const, progress: 0 } : u
      ));
      return;
    }

    // Update UI immediately
    setUploads(prev => prev.map(u => 
      u.id === uploadId ? { ...u, embedUrl: '', status: 'idle' as const, progress: 0 } : u
    ));

    try {
      // Delete from Bunny and database
      await supabase.functions.invoke('bunny-delete', {
        body: { content_id: contentId, video_url: embedUrl, field: 'video_urls' }
      });

      toast({
        title: "Video eliminado",
        description: "El video se eliminó correctamente"
      });
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: "Error al eliminar",
        description: "No se pudo eliminar completamente el video",
        variant: "destructive"
      });
    }
  };

  const getStatusIcon = (status: VideoUpload['status']) => {
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
        return <Plus className="h-4 w-4" />;
    }
  };

  const getStatusText = (status: VideoUpload['status']) => {
    switch (status) {
      case 'uploading':
        return 'Subiendo...';
      case 'processing':
        return 'Procesando...';
      case 'completed':
        return 'Listo';
      case 'failed':
        return 'Error';
      default:
        return 'Subir';
    }
  };

  const renderBunnyEmbed = (embedUrl: string) => {
    if (!embedUrl) return null;
    
    // Extract video ID from Bunny embed URL
    // Format: https://iframe.mediadelivery.net/embed/{library_id}/{video_id}
    if (embedUrl.includes('iframe.mediadelivery.net') || embedUrl.includes('bunny')) {
      return (
        <iframe
          src={embedUrl}
          loading="lazy"
          className="w-full h-full border-0"
          style={{ aspectRatio: '9/16' }}
          allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
        />
      );
    }
    
    // Fallback for other video URLs
    if (embedUrl.match(/\.(mp4|webm|ogg)$/i)) {
      return (
        <video
          src={embedUrl}
          className="w-full h-full object-contain"
          style={{ aspectRatio: '9/16' }}
          controls
        />
      );
    }
    
    return (
      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
        <a href={embedUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
          Ver video
        </a>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {uploads.map((upload, index) => (
        <div key={upload.id} className="space-y-2 p-3 rounded-lg border bg-muted/30">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Variable {index + 1}</span>
            <div className="flex items-center gap-2">
              {upload.status === 'failed' && (
                <Button variant="ghost" size="icon" onClick={() => handleRetry(upload.id)} className="h-7 w-7">
                  <RefreshCw className="h-3 w-3" />
                </Button>
              )}
              {upload.embedUrl && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => handleRemove(upload.id, index, upload.embedUrl)}
                  className="h-7 w-7 text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
          
          {/* Video Preview - Vertical Format */}
          {showPreview && upload.embedUrl && upload.status === 'completed' && (
            <div 
              className="rounded-lg overflow-hidden bg-black flex items-center justify-center mx-auto"
              style={{ aspectRatio: '9/16', maxHeight: '300px', width: 'auto' }}
            >
              {renderBunnyEmbed(upload.embedUrl)}
            </div>
          )}
          
          {/* Upload Button & Progress */}
          <div className="flex items-center gap-2">
            <input
              ref={(el) => { fileInputRefs.current[upload.id] = el; }}
              type="file"
              accept="video/mp4,video/webm,video/quicktime,video/x-msvideo"
              onChange={(e) => handleFileSelect(upload.id, index, e)}
              className="hidden"
              disabled={disabled || upload.status === 'uploading' || upload.status === 'processing'}
            />
            
            <Button
              variant={upload.status === 'completed' ? 'outline' : 'default'}
              size="sm"
              onClick={() => fileInputRefs.current[upload.id]?.click()}
              disabled={disabled || upload.status === 'uploading' || upload.status === 'processing'}
              className="flex items-center gap-2"
            >
              {getStatusIcon(upload.status)}
              {upload.status === 'completed' ? 'Reemplazar' : getStatusText(upload.status)}
            </Button>
            
            {upload.status === 'completed' && (
              <span className="text-xs text-green-600 flex items-center gap-1">
                <CheckCircle className="h-3 w-3" />
                Video listo
              </span>
            )}
          </div>
          
          {/* Progress Bar */}
          {(upload.status === 'uploading' || upload.status === 'processing') && (
            <div className="space-y-1">
              <Progress value={upload.progress} className="h-2" />
              <p className="text-xs text-muted-foreground">
                {upload.status === 'uploading' ? `Subiendo... ${upload.progress}%` : `Procesando... ${upload.progress}%`}
              </p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
