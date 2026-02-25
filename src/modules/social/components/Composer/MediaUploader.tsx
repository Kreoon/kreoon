import { useState, useRef, useCallback } from 'react';
import { Upload, X, Image, Film, Loader2, ChevronLeft, ChevronRight, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { SUPPORTED_MEDIA_TYPES, SUPPORTED_IMAGE_TYPES, MAX_MEDIA_UPLOAD_SIZE_MB } from '../../config/constants';
import { toast } from 'sonner';

interface MediaUploaderProps {
  mediaUrls: string[];
  onMediaChange: (urls: string[]) => void;
  thumbnailUrl: string | null;
  onThumbnailChange: (url: string | null) => void;
  maxFiles?: number;
}

export function MediaUploader({
  mediaUrls,
  onMediaChange,
  thumbnailUrl,
  onThumbnailChange,
  maxFiles = 10,
}: MediaUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reorder media: move item from one index to another
  const moveMedia = useCallback((fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    const newUrls = [...mediaUrls];
    const [moved] = newUrls.splice(fromIndex, 1);
    newUrls.splice(toIndex, 0, moved);
    onMediaChange(newUrls);
  }, [mediaUrls, onMediaChange]);

  const handleMediaDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
    setDraggedIndex(index);
  };

  const handleMediaDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleMediaDrop = (e: React.DragEvent, toIndex: number) => {
    e.preventDefault();
    const fromIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);
    if (!isNaN(fromIndex)) {
      moveMedia(fromIndex, toIndex);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleMediaDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const uploadToBunny = async (file: File): Promise<string> => {
    const ext = file.name.split('.').pop()?.toLowerCase() || 'bin';
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 10);
    const storagePath = `social/${timestamp}-${randomId}.${ext}`;

    // Step 1: Get upload credentials from edge function
    const { data: creds, error: credsError } = await supabase.functions.invoke(
      'bunny-raw-upload',
      { body: { storagePath } }
    );

    if (credsError || !creds?.success) {
      throw new Error(creds?.error || credsError?.message || 'Error obteniendo credenciales de subida');
    }

    // Step 2: Upload directly to Bunny CDN
    const uploadRes = await fetch(creds.uploadUrl, {
      method: 'PUT',
      headers: {
        'AccessKey': creds.accessKey,
        'Content-Type': file.type || 'application/octet-stream',
      },
      body: file,
    });

    if (!uploadRes.ok) {
      throw new Error(`Error subiendo a CDN: ${uploadRes.status}`);
    }

    return creds.cdnUrl;
  };

  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const remaining = maxFiles - mediaUrls.length;
    if (remaining <= 0) {
      toast.error(`Máximo ${maxFiles} archivos`);
      return;
    }

    const validFiles: File[] = [];
    for (const file of Array.from(files).slice(0, remaining)) {
      if (!SUPPORTED_MEDIA_TYPES.includes(file.type)) {
        toast.error(`Formato no soportado: ${file.name}`);
        continue;
      }
      if (file.size > MAX_MEDIA_UPLOAD_SIZE_MB * 1024 * 1024) {
        toast.error(`Archivo muy grande: ${file.name} (máx ${MAX_MEDIA_UPLOAD_SIZE_MB}MB)`);
        continue;
      }
      validFiles.push(file);
    }

    if (validFiles.length === 0) return;

    setIsUploading(true);
    try {
      const newUrls: string[] = [];

      for (let i = 0; i < validFiles.length; i++) {
        const file = validFiles[i];
        setUploadProgress(`Subiendo ${i + 1}/${validFiles.length}...`);

        const cdnUrl = await uploadToBunny(file);
        newUrls.push(cdnUrl);

        // Use first image as thumbnail if none set
        if (!thumbnailUrl && SUPPORTED_IMAGE_TYPES.includes(file.type)) {
          onThumbnailChange(cdnUrl);
        }
      }

      onMediaChange([...mediaUrls, ...newUrls]);
      toast.success(`${newUrls.length} archivo${newUrls.length > 1 ? 's' : ''} subido${newUrls.length > 1 ? 's' : ''}`);
    } catch (err: any) {
      toast.error(err.message || 'Error al subir archivos');
    } finally {
      setIsUploading(false);
      setUploadProgress('');
    }
  }, [mediaUrls, maxFiles, thumbnailUrl, onMediaChange, onThumbnailChange]);

  const handleRemove = (index: number) => {
    const removed = mediaUrls[index];
    const newUrls = mediaUrls.filter((_, i) => i !== index);
    onMediaChange(newUrls);

    // If removed URL was the thumbnail, clear it
    if (removed === thumbnailUrl) {
      onThumbnailChange(newUrls.length > 0 ? newUrls[0] : null);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const isVideoUrl = (url: string) => /\.(mp4|mov|webm|avi|m4v)/i.test(url);

  return (
    <div className="space-y-3">
      {/* Upload zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => !isUploading && fileInputRef.current?.click()}
        className={cn(
          'border-2 border-dashed rounded-lg p-6 text-center transition-all',
          isUploading ? 'cursor-wait' : 'cursor-pointer',
          dragOver
            ? 'border-primary bg-primary/5'
            : 'border-border hover:border-primary/30 hover:bg-muted/20'
        )}
      >
        {isUploading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-8 h-8 text-muted-foreground animate-spin" />
            <p className="text-xs text-muted-foreground">{uploadProgress}</p>
          </div>
        ) : (
          <>
            <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              Arrastra archivos o haz clic para seleccionar
            </p>
            <p className="text-[10px] text-muted-foreground mt-1">
              JPG, PNG, GIF, MP4, MOV, WebM - Máx {MAX_MEDIA_UPLOAD_SIZE_MB}MB
            </p>
          </>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={SUPPORTED_MEDIA_TYPES.join(',')}
        onChange={(e) => handleFiles(e.target.files)}
        className="hidden"
      />

      {/* Media previews with order numbers and drag-to-reorder */}
      {mediaUrls.length > 0 && (
        <div className="space-y-2">
          {mediaUrls.length > 1 && (
            <p className="text-[10px] text-muted-foreground">
              Arrastra para reordenar o usa las flechas. El orden se mantiene al publicar.
            </p>
          )}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {mediaUrls.map((url, idx) => (
              <div
                key={`${url}-${idx}`}
                draggable
                onDragStart={(e) => handleMediaDragStart(e, idx)}
                onDragOver={(e) => handleMediaDragOver(e, idx)}
                onDrop={(e) => handleMediaDrop(e, idx)}
                onDragEnd={handleMediaDragEnd}
                className={cn(
                  'relative shrink-0 w-20 h-20 rounded-lg overflow-hidden bg-muted group cursor-grab active:cursor-grabbing transition-all',
                  draggedIndex === idx && 'opacity-50 scale-95',
                  dragOverIndex === idx && draggedIndex !== idx && 'ring-2 ring-primary ring-offset-1'
                )}
              >
                {isVideoUrl(url) ? (
                  <video
                    src={url}
                    className="w-full h-full object-cover pointer-events-none"
                    muted
                    playsInline
                    preload="metadata"
                  />
                ) : (
                  <img
                    src={url}
                    alt=""
                    className="w-full h-full object-cover pointer-events-none"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                )}

                {/* Order number badge */}
                <div className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center shadow-sm">
                  {idx + 1}
                </div>

                {/* Remove button */}
                <button
                  onClick={(e) => { e.stopPropagation(); handleRemove(idx); }}
                  className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-black/70 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3 text-white" />
                </button>

                {/* Reorder buttons - show on hover when multiple items */}
                {mediaUrls.length > 1 && (
                  <div className="absolute bottom-0.5 inset-x-0 flex justify-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => { e.stopPropagation(); if (idx > 0) moveMedia(idx, idx - 1); }}
                      disabled={idx === 0}
                      className={cn(
                        'w-5 h-5 rounded-full bg-black/70 flex items-center justify-center',
                        idx === 0 ? 'opacity-30' : 'hover:bg-black/90'
                      )}
                    >
                      <ChevronLeft className="w-3 h-3 text-white" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); if (idx < mediaUrls.length - 1) moveMedia(idx, idx + 1); }}
                      disabled={idx === mediaUrls.length - 1}
                      className={cn(
                        'w-5 h-5 rounded-full bg-black/70 flex items-center justify-center',
                        idx === mediaUrls.length - 1 ? 'opacity-30' : 'hover:bg-black/90'
                      )}
                    >
                      <ChevronRight className="w-3 h-3 text-white" />
                    </button>
                  </div>
                )}

                {/* Cover label */}
                {url === thumbnailUrl && mediaUrls.length === 1 && (
                  <div className="absolute bottom-0 inset-x-0 bg-primary/80 text-[8px] text-center text-white py-0.5">
                    Cover
                  </div>
                )}
              </div>
            ))}
            {mediaUrls.length < maxFiles && !isUploading && (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="shrink-0 w-20 h-20 rounded-lg border-2 border-dashed border-border flex items-center justify-center hover:border-primary/30 transition-colors"
              >
                <Image className="w-5 h-5 text-muted-foreground" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
