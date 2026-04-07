import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { SUPABASE_FUNCTIONS_URL } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Upload, Loader2, CheckCircle, XCircle, Video, RefreshCw, Plus, Trash2 } from "lucide-react";

/**
 * Compute a fast fingerprint of a video file for dedup.
 * Reads first 2MB + last 2MB + file size → SHA-256 hash.
 * Fast regardless of file size (reads max 4MB).
 */
async function computeVideoFingerprint(file: File): Promise<string> {
  const CHUNK_SIZE = 2 * 1024 * 1024; // 2MB
  const parts: Uint8Array[] = [];

  // First 2MB
  const firstChunk = await file.slice(0, Math.min(CHUNK_SIZE, file.size)).arrayBuffer();
  parts.push(new Uint8Array(firstChunk));

  // Last 2MB (only if file > 4MB to avoid overlap with first chunk)
  if (file.size > CHUNK_SIZE * 2) {
    const lastChunk = await file.slice(-CHUNK_SIZE).arrayBuffer();
    parts.push(new Uint8Array(lastChunk));
  }

  // Include file size to differentiate files with same start/end but different length
  const sizeBytes = new TextEncoder().encode(String(file.size));
  parts.push(sizeBytes);

  // Combine all parts into one buffer
  const totalLen = parts.reduce((sum, p) => sum + p.byteLength, 0);
  const combined = new Uint8Array(totalLen);
  let offset = 0;
  for (const part of parts) {
    combined.set(part, offset);
    offset += part.byteLength;
  }

  const hashBuffer = await crypto.subtle.digest('SHA-256', combined);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

interface VideoUpload {
  id: string;
  status: 'idle' | 'hashing' | 'uploading' | 'processing' | 'completed' | 'failed';
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

  // Initialize uploads array based on hooksCount and currentUrls.
  // CRITICAL: include currentUrls in deps to avoid stale closure when switching content.
  // Without this, switching from content A to B could initialize B's uploads with A's URLs.
  const currentUrlsKey = JSON.stringify(currentUrls);
  useEffect(() => {
    const initialUploads: VideoUpload[] = Array.from({ length: hooksCount }, (_, index) => ({
      id: `video-${index}`,
      status: currentUrls[index] ? 'completed' : 'idle',
      progress: currentUrls[index] ? 100 : 0,
      embedUrl: currentUrls[index] || '',
      videoId: null
    }));
    setUploads(initialUploads);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hooksCount, contentId, currentUrlsKey]);

  // Update uploads when currentUrls change, but don't overwrite active uploads
  useEffect(() => {
    setUploads(prev => prev.map((upload, index) => {
      // Don't overwrite uploads that are actively uploading or processing
      if (upload.status === 'uploading' || upload.status === 'processing') {
        return upload;
      }
      return {
        ...upload,
        embedUrl: currentUrls[index] || upload.embedUrl,
        status: currentUrls[index] ? 'completed' : upload.status
      };
    }));
  }, [currentUrls]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      Object.values(pollIntervals.current).forEach(interval => clearInterval(interval));
    };
  }, []);

  const pollVideoStatus = async (uploadId: string, videoGuid: string) => {
    // Guard: don't poll if videoId is missing
    if (!videoGuid) {
      console.warn('[BunnyMultiVideoUploader] Skipping poll - no videoId');
      if (pollIntervals.current[uploadId]) {
        clearInterval(pollIntervals.current[uploadId]);
        delete pollIntervals.current[uploadId];
      }
      return;
    }

    console.log('[BunnyMultiVideoUploader] Polling status for:', videoGuid);
    try {
      const { data, error } = await supabase.functions.invoke('bunny-status', {
        body: { content_id: contentId, video_id: videoGuid }
      });

      console.log('[BunnyMultiVideoUploader] Status response:', data, 'error:', error);

      if (error) {
        console.error('Status check error:', error);
        return;
      }

      if (data?.status === 'completed') {
        setUploads(prev => prev.map(u =>
          u.id === uploadId ? { ...u, status: 'completed' } : u
        ));
        if (pollIntervals.current[uploadId]) {
          clearInterval(pollIntervals.current[uploadId]);
          delete pollIntervals.current[uploadId];
        }
        toast({
          title: "Video listo!",
          description: "El video se ha procesado correctamente"
        });
      } else if (data?.status === 'failed') {
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
        // Still processing
        const progress = data?.encode_progress || 50;
        console.log('[BunnyMultiVideoUploader] Still processing, progress:', progress);
        setUploads(prev => prev.map(u =>
          u.id === uploadId ? { ...u, progress } : u
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

    // Step 1: Compute file fingerprint for dedup
    setUploads(prev => prev.map(u =>
      u.id === uploadId ? { ...u, status: 'hashing', progress: 0 } : u
    ));

    try {
      let fileHash: string | null = null;
      try {
        fileHash = await computeVideoFingerprint(file);
        console.log('[BunnyMultiVideoUploader] File hash:', fileHash);

        // Step 2: Check for existing video with same hash
        const { data: existing } = await supabase.rpc('check_video_hash', { p_file_hash: fileHash });

        if (existing && existing.length > 0 && existing[0].embed_url) {
          const match = existing[0];
          console.log('[BunnyMultiVideoUploader] Dedup match found, reusing:', match.bunny_video_id);

          let allUrls: string[] = [];
          setUploads(prev => {
            const newUploads = prev.map(u =>
              u.id === uploadId ? {
                ...u,
                progress: 100,
                videoId: match.bunny_video_id,
                embedUrl: match.embed_url,
                status: 'completed' as const
              } : u
            );
            allUrls = newUploads.map(u => u.embedUrl);
            return newUploads;
          });

          setTimeout(() => onUploadComplete?.(allUrls), 0);
          toast({
            title: "Video reutilizado",
            description: "Este video ya existe en el sistema, se reutilizó sin subir de nuevo"
          });
          return;
        }
      } catch (hashErr) {
        // Non-blocking: if hash/check fails, proceed with normal upload
        console.warn('[BunnyMultiVideoUploader] Hash check failed, proceeding with upload:', hashErr);
      }

      // Step 3: No dedup match - proceed with upload
      setUploads(prev => prev.map(u =>
        u.id === uploadId ? { ...u, status: 'uploading', progress: 0 } : u
      ));

      // Get user id for the edge function
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id || 'anonymous';

      // Step 3a: Create video entry in Bunny via edge function (lightweight JSON call)
      const createRes = await fetch(`${SUPABASE_FUNCTIONS_URL}/functions/v1/bunny-portfolio-upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          user_id: userId,
          type: 'featured',
          file_name: file.name,
        }),
      });

      if (!createRes.ok) {
        const errData = await createRes.json().catch(() => ({}));
        throw new Error(errData.error || `Error del servidor: ${createRes.status}`);
      }

      const createData = await createRes.json();
      if (!createData.success) {
        throw new Error(createData.error || 'Error al crear video en Bunny');
      }

      console.log('[BunnyMultiVideoUploader] Video created in Bunny:', createData.video_id);

      // Step 3b: Upload file DIRECTLY to Bunny (bypasses edge function memory limit)
      const xhr = new XMLHttpRequest();

      await new Promise<void>((resolve, reject) => {
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const percentComplete = Math.round((event.loaded / event.total) * 90);
            setUploads(prev => prev.map(u =>
              u.id === uploadId ? { ...u, progress: percentComplete } : u
            ));
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error(`Error subiendo a Bunny: ${xhr.status}`));
          }
        });

        xhr.addEventListener('error', () => {
          console.error('[BunnyMultiVideoUploader] XHR error:', { readyState: xhr.readyState, status: xhr.status, uploadUrl: createData.upload_url });
          reject(new Error(`Error de conexión (estado: ${xhr.readyState}). Verifica tu internet y desactiva VPN/bloqueadores.`));
        });
        xhr.addEventListener('abort', () => reject(new Error('Subida cancelada')));
        xhr.addEventListener('timeout', () => reject(new Error('Tiempo de espera agotado (10 min). Verifica tu conexión.')));

        xhr.open('PUT', createData.upload_url);
        xhr.setRequestHeader('AccessKey', createData.access_key);
        xhr.setRequestHeader('Content-Type', 'application/octet-stream');
        xhr.timeout = 600000; // 10 minutes for large files
        xhr.send(file);
      });

      console.log('[BunnyMultiVideoUploader] File uploaded directly to Bunny');

      // Step 3c: Save file hash for dedup (non-blocking)
      if (fileHash) {
        fetch(`${SUPABASE_FUNCTIONS_URL}/functions/v1/bunny-portfolio-upload`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'save-hash',
            file_hash: fileHash,
            file_size: String(file.size),
            bunny_video_id: createData.video_id,
            embed_url: createData.embed_url,
            thumbnail_url: createData.thumbnail_url,
            mp4_url: createData.mp4_url,
            user_id: userId,
          }),
        }).catch(err => console.warn('[BunnyMultiVideoUploader] Hash save failed (non-blocking):', err));
      }

      const videoId = createData.video_id;
      const embedUrl = createData.embed_url || '';

      console.log('[BunnyMultiVideoUploader] videoId:', videoId, 'embedUrl:', embedUrl);

      // Update state with result
      let allUrls: string[] = [];
      setUploads(prev => {
        const newUploads = prev.map(u =>
          u.id === uploadId ? {
            ...u,
            progress: 100,
            videoId: videoId || null,
            embedUrl,
            status: 'processing' as const
          } : u
        );
        allUrls = newUploads.map(u => u.embedUrl);
        return newUploads;
      });

      // Notify parent outside of state updater to avoid cascading renders
      setTimeout(() => onUploadComplete?.(allUrls), 0);

      // Start polling for processing status only if we have a videoId
      if (videoId) {
        pollIntervals.current[uploadId] = setInterval(() => {
          pollVideoStatus(uploadId, videoId);
        }, 5000);
      } else {
        console.warn('[BunnyMultiVideoUploader] No videoId available, marking as completed without polling');
        setUploads(prev => prev.map(u =>
          u.id === uploadId ? { ...u, status: 'completed' } : u
        ));
      }

      toast({
        title: "Video subido",
        description: `Variable ${index + 1} se esta procesando en Bunny.net`
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

  const handleRemove = (uploadId: string, index: number, embedUrl: string) => {
    // Update UI immediately and compute updated URLs
    let updatedUrls: string[] = [];
    setUploads(prev => {
      const newUploads = prev.map(u =>
        u.id === uploadId ? { ...u, embedUrl: '', status: 'idle' as const, progress: 0 } : u
      );
      updatedUrls = newUploads.map(u => u.embedUrl);
      return newUploads;
    });

    // Notify parent to auto-save updated URLs to DB (removes URL from database)
    setTimeout(() => onUploadComplete?.(updatedUrls), 0);

    if (embedUrl) {
      toast({
        title: "Video eliminado",
        description: "El video se elimino del proyecto"
      });
    }
  };

  const getStatusIcon = (status: VideoUpload['status']) => {
    switch (status) {
      case 'hashing':
        return <Loader2 className="h-4 w-4 animate-spin" />;
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
      case 'hashing':
        return 'Verificando...';
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
      // Add autoplay=false to prevent videos from auto-playing
      const embedSrc = embedUrl.includes('?') ? `${embedUrl}&autoplay=false` : `${embedUrl}?autoplay=false`;
      return (
        <iframe
          src={embedSrc}
          loading="lazy"
          className="w-full h-full border-0"
          style={{ aspectRatio: '9/16' }}
          allow="accelerometer; gyroscope; encrypted-media; picture-in-picture"
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
        <div key={upload.id} className="space-y-2 p-3 rounded-sm border bg-muted/30">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Variable {index + 1}</span>
            <div className="flex items-center gap-2">
              {upload.status === 'processing' && upload.videoId && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => pollVideoStatus(upload.id, upload.videoId!)}
                  className="h-7 w-7"
                  title="Actualizar estado"
                >
                  <RefreshCw className="h-3 w-3" />
                </Button>
              )}
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
              className="rounded-sm overflow-hidden bg-black flex items-center justify-center mx-auto"
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
              disabled={disabled || upload.status === 'hashing' || upload.status === 'uploading' || upload.status === 'processing'}
            />

            <Button
              variant={upload.status === 'completed' ? 'outline' : 'default'}
              size="sm"
              onClick={() => fileInputRefs.current[upload.id]?.click()}
              disabled={disabled || upload.status === 'hashing' || upload.status === 'uploading' || upload.status === 'processing'}
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
          {(upload.status === 'hashing' || upload.status === 'uploading' || upload.status === 'processing') && (
            <div className="space-y-1">
              <Progress value={upload.status === 'hashing' ? undefined : upload.progress} className="h-2" />
              <p className="text-xs text-muted-foreground">
                {upload.status === 'hashing' ? 'Verificando duplicados...' : upload.status === 'uploading' ? `Subiendo... ${upload.progress}%` : `Procesando... ${upload.progress}%`}
              </p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
