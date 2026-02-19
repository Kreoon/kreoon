import { useState, useRef, useCallback } from 'react';
import { Upload, X, Image, Film, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
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
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const remaining = maxFiles - mediaUrls.length;
    if (remaining <= 0) {
      toast.error(`Máximo ${maxFiles} archivos`);
      return;
    }

    const filesToProcess = Array.from(files).slice(0, remaining);

    for (const file of filesToProcess) {
      if (!SUPPORTED_MEDIA_TYPES.includes(file.type)) {
        toast.error(`Formato no soportado: ${file.name}`);
        continue;
      }
      if (file.size > MAX_MEDIA_UPLOAD_SIZE_MB * 1024 * 1024) {
        toast.error(`Archivo muy grande: ${file.name} (máx ${MAX_MEDIA_UPLOAD_SIZE_MB}MB)`);
        continue;
      }
    }

    setIsUploading(true);
    try {
      // Create local preview URLs for now (actual upload happens on submit via edge function)
      const newUrls: string[] = [];
      for (const file of filesToProcess) {
        const url = URL.createObjectURL(file);
        newUrls.push(url);

        // Use first image as thumbnail if none set
        if (!thumbnailUrl && SUPPORTED_IMAGE_TYPES.includes(file.type)) {
          onThumbnailChange(url);
        }
      }

      onMediaChange([...mediaUrls, ...newUrls]);
    } finally {
      setIsUploading(false);
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

    // Revoke object URL to free memory
    if (removed.startsWith('blob:')) {
      URL.revokeObjectURL(removed);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  return (
    <div className="space-y-3">
      {/* Upload zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          'border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all',
          dragOver
            ? 'border-primary bg-primary/5'
            : 'border-border hover:border-primary/30 hover:bg-muted/20'
        )}
      >
        {isUploading ? (
          <Loader2 className="w-8 h-8 mx-auto text-muted-foreground animate-spin" />
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

      {/* Media previews */}
      {mediaUrls.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {mediaUrls.map((url, idx) => {
            const isVideo = url.match(/\.(mp4|mov|webm)/i) || url.startsWith('blob:');
            return (
              <div key={idx} className="relative shrink-0 w-20 h-20 rounded-lg overflow-hidden bg-muted group">
                {isVideo && !url.match(/\.(jpg|jpeg|png|gif|webp)/i) ? (
                  <div className="w-full h-full flex items-center justify-center bg-muted/50">
                    <Film className="w-6 h-6 text-muted-foreground" />
                  </div>
                ) : (
                  <img src={url} alt="" className="w-full h-full object-cover" />
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); handleRemove(idx); }}
                  className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-black/70 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3 text-white" />
                </button>
                {url === thumbnailUrl && (
                  <div className="absolute bottom-0 inset-x-0 bg-primary/80 text-[8px] text-center text-white py-0.5">
                    Cover
                  </div>
                )}
              </div>
            );
          })}
          {mediaUrls.length < maxFiles && (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="shrink-0 w-20 h-20 rounded-lg border-2 border-dashed border-border flex items-center justify-center hover:border-primary/30 transition-colors"
            >
              <Image className="w-5 h-5 text-muted-foreground" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
