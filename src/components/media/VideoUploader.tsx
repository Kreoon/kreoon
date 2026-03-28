import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useBunnyStorage } from '@/hooks/useBunnyStorage';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Upload, X, CheckCircle, AlertCircle, Film } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VideoUploaderProps {
  folder?: string;
  onUploadComplete?: (videoId: string, embedUrl: string, thumbnailUrl: string) => void;
  onRemove?: () => void;
  maxSizeMB?: number;
  accept?: Record<string, string[]>;
  className?: string;
}

export function VideoUploader({
  folder = 'videos',
  onUploadComplete,
  onRemove,
  maxSizeMB = 500,
  accept = { 'video/*': ['.mp4', '.mov', '.webm'] },
  className,
}: VideoUploaderProps) {
  const [uploadedFile, setUploadedFile] = useState<{
    videoId: string;
    embedUrl: string;
    thumbnailUrl: string;
    name: string;
  } | null>(null);

  const { upload, deleteVideo, isUploading, progress, error } = useBunnyStorage();

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    if (file.size > maxSizeMB * 1024 * 1024) {
      alert(`El archivo es muy grande. Máximo ${maxSizeMB}MB`);
      return;
    }

    const result = await upload(file, folder);

    if (result.success && result.videoId && result.embedUrl && result.thumbnailUrl) {
      setUploadedFile({
        videoId: result.videoId,
        embedUrl: result.embedUrl,
        thumbnailUrl: result.thumbnailUrl,
        name: file.name,
      });
      onUploadComplete?.(result.videoId, result.embedUrl, result.thumbnailUrl);
    }
  }, [upload, folder, maxSizeMB, onUploadComplete]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    maxFiles: 1,
    disabled: isUploading,
  });

  const handleRemove = async () => {
    if (uploadedFile) {
      await deleteVideo(uploadedFile.videoId);
      setUploadedFile(null);
      onRemove?.();
    }
  };

  if (uploadedFile) {
    return (
      <div className={cn("relative rounded-sm border bg-card p-4", className)}>
        <div className="flex items-center gap-4">
          <div className="flex-shrink-0">
            <img
              src={uploadedFile.thumbnailUrl}
              alt={uploadedFile.name}
              className="h-20 w-32 rounded object-cover bg-black"
              onError={(e) => {
                // Thumbnail may not be ready yet during encoding
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{uploadedFile.name}</p>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
              <CheckCircle className="h-3 w-3 text-green-500" />
              Subido correctamente (procesando...)
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRemove}
            className="flex-shrink-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <div
        {...getRootProps()}
        className={cn(
          "relative rounded-sm border-2 border-dashed p-8 text-center cursor-pointer transition-colors",
          isDragActive && "border-primary bg-primary/5",
          isUploading && "pointer-events-none opacity-60",
          error && "border-destructive"
        )}
      >
        <input {...getInputProps()} />

        <div className="flex flex-col items-center gap-3">
          {isUploading ? (
            <>
              <Film className="h-10 w-10 text-muted-foreground animate-pulse" />
              <p className="text-sm font-medium">Subiendo video...</p>
              {progress && (
                <div className="w-full max-w-xs">
                  <Progress value={progress.percentage} className="h-2" />
                  <p className="text-xs text-muted-foreground mt-1 text-center">
                    {progress.percentage}%
                  </p>
                </div>
              )}
            </>
          ) : (
            <>
              <Upload className="h-10 w-10 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">
                  {isDragActive ? 'Suelta el video aquí' : 'Arrastra un video o haz clic'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  MP4, MOV, WEBM • Máximo {maxSizeMB}MB
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {error && (
        <p className="text-sm text-destructive flex items-center gap-1 mt-2">
          <AlertCircle className="h-4 w-4" />
          {error}
        </p>
      )}
    </div>
  );
}
