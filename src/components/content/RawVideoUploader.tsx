import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Upload, Loader2, CheckCircle, XCircle, RefreshCw, Plus, Trash2, Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface VideoUpload {
  id: string;
  status: 'idle' | 'uploading' | 'processing' | 'completed' | 'failed';
  progress: number;
  embedUrl: string;
  videoId: string | null;
  originalName: string;
}

interface RawVideoUploaderProps {
  contentId: string;
  currentUrls?: string[];
  onUploadComplete?: (urls: string[]) => void;
  disabled?: boolean;
  showDownload?: boolean;
  showPreview?: boolean;
}

export function RawVideoUploader({ 
  contentId, 
  currentUrls = [],
  onUploadComplete,
  disabled,
  showDownload = true,
  showPreview = true
}: RawVideoUploaderProps) {
  const { toast } = useToast();
  const [uploads, setUploads] = useState<VideoUpload[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [downloadingIndex, setDownloadingIndex] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Initialize uploads from currentUrls
  useEffect(() => {
    const initialUploads: VideoUpload[] = (currentUrls || []).filter(Boolean).map((url, index) => ({
      id: `raw-${index}-${Date.now()}`,
      status: 'completed' as const,
      progress: 100,
      embedUrl: url,
      videoId: null,
      originalName: url.split('/').pop() || `Video ${index + 1}`
    }));
    setUploads(initialUploads);
  }, [currentUrls?.join(',')]);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    // Validate file sizes (max 5GB each)
    const maxSize = 5 * 1024 * 1024 * 1024;
    for (const file of Array.from(files)) {
      if (file.size > maxSize) {
        toast({
          title: "Archivo muy grande",
          description: `${file.name} supera los 5GB permitidos`,
          variant: "destructive"
        });
        return;
      }
    }

    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) throw new Error("No autenticado");

      const supabaseUrl = (supabase as any).supabaseUrl as string;
      const supabaseKey = (supabase as any).supabaseKey as string;

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const uploadId = `raw-${Date.now()}-${i}`;

        // Add new upload entry
        setUploads(prev => [...prev, {
          id: uploadId,
          status: 'uploading',
          progress: 0,
          embedUrl: '',
          videoId: null,
          originalName: file.name
        }]);

        // Simulate progress
        const progressInterval = setInterval(() => {
          setUploads(prev => prev.map(u => 
            u.id === uploadId && u.status === 'uploading' 
              ? { ...u, progress: Math.min(u.progress + 10, 90) } 
              : u
          ));
        }, 300);

        try {
          const url = new URL(`${supabaseUrl}/functions/v1/bunny-storage`);
          url.searchParams.set('content_id', contentId);
          url.searchParams.set('file_type', 'raw_video');
          url.searchParams.set('file_name', file.name);

          const res = await fetch(url.toString(), {
            method: 'PUT',
            headers: {
              apikey: supabaseKey,
              authorization: `Bearer ${accessToken}`,
              'content-type': file.type || 'application/octet-stream',
              'x-file-name': file.name,
              'x-file-type': 'raw_video',
              'x-content-id': contentId,
            },
            body: file,
          });

          clearInterval(progressInterval);

          const payload = await res.json().catch(() => ({}));
          if (!res.ok) {
            throw new Error(payload?.error || payload?.message || `Error ${res.status}`);
          }

          // Backend returns full list of URLs - use that as source of truth
          const serverAllUrls: string[] = payload.all_urls || [];

          // Update upload as completed and sync with server state
          setUploads(prev => {
            // Mark current upload as completed
            let updated = prev.map(u => 
              u.id === uploadId 
                ? { ...u, status: 'completed' as const, progress: 100, embedUrl: payload.url } 
                : u
            );

            // Use server URLs as source of truth if available
            if (serverAllUrls.length > 0) {
              // Merge: keep any local uploads in progress, but completed ones come from server
              const inProgressUploads = updated.filter(u => u.status !== 'completed');
              const serverUploads: VideoUpload[] = serverAllUrls.map((url, idx) => ({
                id: `server-${idx}-${Date.now()}`,
                status: 'completed' as const,
                progress: 100,
                embedUrl: url,
                videoId: null,
                originalName: url.split('/').pop() || `Video ${idx + 1}`
              }));
              updated = [...serverUploads, ...inProgressUploads];
            }

            // Notify parent with all completed URLs
            const allUrls = updated.filter(u => u.embedUrl && u.status === 'completed').map(u => u.embedUrl);
            onUploadComplete?.(allUrls);
            return updated;
          });

          toast({
            title: "Video subido",
            description: `${file.name} se subió correctamente`
          });

        } catch (error) {
          clearInterval(progressInterval);
          setUploads(prev => prev.map(u => 
            u.id === uploadId ? { ...u, status: 'failed' as const } : u
          ));
          toast({
            title: "Error al subir",
            description: error instanceof Error ? error.message : "No se pudo subir el video",
            variant: "destructive"
          });
        }
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error de autenticación",
        variant: "destructive"
      });
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemove = async (uploadId: string, embedUrl: string) => {
    if (!embedUrl) {
      // If no URL, just remove from local state
      setUploads(prev => {
        const updated = prev.filter(u => u.id !== uploadId);
        const allUrls = updated.filter(u => u.embedUrl).map(u => u.embedUrl);
        onUploadComplete?.(allUrls);
        return updated;
      });
      return;
    }

    setDeletingId(uploadId);
    
    try {
      const { data, error } = await supabase.functions.invoke('bunny-delete', {
        body: { content_id: contentId, video_url: embedUrl }
      });

      if (error) throw error;

      // Update local state with remaining URLs from server
      const remainingUrls: string[] = data?.remaining_urls || [];
      
      setUploads(prev => {
        const updated = prev.filter(u => u.id !== uploadId);
        onUploadComplete?.(remainingUrls);
        return updated;
      });

      toast({
        title: "Video eliminado",
        description: "El video se eliminó correctamente"
      });

    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: "Error al eliminar",
        description: error instanceof Error ? error.message : "No se pudo eliminar el video",
        variant: "destructive"
      });
    } finally {
      setDeletingId(null);
    }
  };

  const handleRetry = (uploadId: string) => {
    setUploads(prev => prev.filter(u => u.id !== uploadId));
  };

  const handleDownload = async (embedUrl: string, index: number) => {
    setDownloadingIndex(index);
    try {
      const { data, error } = await supabase.functions.invoke('bunny-download', {
        body: { content_id: contentId, video_url: embedUrl }
      });

      if (error) throw error;

      if (data?.download_url) {
        window.open(data.download_url, '_blank');
      } else {
        window.open(embedUrl, '_blank');
      }
    } catch (error) {
      console.error('Download error:', error);
      window.open(embedUrl, '_blank');
    } finally {
      setDownloadingIndex(null);
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

  const renderBunnyEmbed = (embedUrl: string) => {
    if (!embedUrl) return null;
    
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

  const completedCount = uploads.filter(u => u.status === 'completed').length;

  return (
    <div className="space-y-4">
      {/* Header with upload button and download all */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="video/mp4,video/webm,video/quicktime,video/x-msvideo"
            onChange={handleFileSelect}
            className="hidden"
            disabled={disabled}
            multiple
          />
          <Button
            variant={completedCount > 0 ? 'outline' : 'default'}
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            {completedCount > 0 ? 'Agregar más videos' : 'Subir videos crudos'}
          </Button>
          
          {completedCount > 0 && (
            <Badge variant="secondary">
              {completedCount} video(s)
            </Badge>
          )}
        </div>

      </div>

      {/* Video list */}
      <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
        {uploads.map((upload, index) => (
          <div key={upload.id} className="space-y-2 p-3 rounded-lg border bg-muted/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                {getStatusIcon(upload.status)}
                <span className="text-sm font-medium truncate" title={upload.originalName}>
                  {upload.originalName}
                </span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {upload.status === 'failed' && (
                  <Button variant="ghost" size="icon" onClick={() => handleRetry(upload.id)} className="h-7 w-7">
                    <RefreshCw className="h-3 w-3" />
                  </Button>
                )}
                {upload.status === 'completed' && showDownload && (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => handleDownload(upload.embedUrl, index)}
                    disabled={downloadingIndex === index}
                    className="h-7 w-7"
                  >
                    {downloadingIndex === index ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Download className="h-3 w-3" />
                    )}
                  </Button>
                )}
                {!disabled && upload.status !== 'uploading' && deletingId !== upload.id && (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => handleRemove(upload.id, upload.embedUrl)}
                    className="h-7 w-7 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
                {deletingId === upload.id && (
                  <Loader2 className="h-4 w-4 animate-spin text-destructive" />
                )}
              </div>
            </div>
            
            {/* Video Preview */}
            {showPreview && upload.embedUrl && upload.status === 'completed' && (
              <div 
                className="rounded-lg overflow-hidden bg-black flex items-center justify-center mx-auto"
                style={{ aspectRatio: '9/16', maxHeight: '250px', width: 'auto' }}
              >
                {renderBunnyEmbed(upload.embedUrl)}
              </div>
            )}
            
            {/* Progress Bar */}
            {upload.status === 'uploading' && (
              <div className="space-y-1">
                <Progress value={upload.progress} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  Subiendo... {upload.progress}%
                </p>
              </div>
            )}

            {upload.status === 'failed' && (
              <p className="text-xs text-destructive">
                Error al subir. Haz clic en reintentar o elimínalo.
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Empty state */}
      {uploads.length === 0 && (
        <div className="rounded-lg border-2 border-dashed border-border flex items-center justify-center p-8">
          <div className="text-center text-muted-foreground">
            <Upload className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No hay videos crudos subidos</p>
            <p className="text-xs mt-1">Sube los videos sin editar para que el editor los descargue</p>
          </div>
        </div>
      )}
    </div>
  );
}
