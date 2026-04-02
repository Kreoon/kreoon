import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useBunnyImageUpload } from '@/hooks/useBunnyImageUpload';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ImageIcon, X, Upload, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BunnyImageUploaderProps {
  /** 'single' = one image with overwrite; 'gallery' = multiple images */
  mode: 'single' | 'gallery';
  /** For single: the current CDN URL to show as preview */
  value?: string;
  /** For gallery: the current list of CDN URLs */
  values?: string[];
  /** Called when single image changes */
  onChange?: (cdnUrl: string) => void;
  /** Called when gallery list changes */
  onGalleryChange?: (cdnUrls: string[]) => void;
  /** Function that generates the storagePath for a given file */
  getStoragePath: (file: File) => string;
  /** Max file size in MB. Default 10 */
  maxSizeMB?: number;
  /** Max number of files in gallery mode. Default 12 */
  maxFiles?: number;
  /** Aspect ratio for preview. Default 'video' (16:9) */
  aspectRatio?: 'video' | 'square' | 'auto';
  /** Height class for the dropzone. Default 'h-40' */
  height?: string;
  /** Whether the uploader is disabled */
  disabled?: boolean;
  className?: string;
}

const ACCEPT_IMAGES = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/gif': ['.gif'],
  'image/webp': ['.webp'],
};

export function BunnyImageUploader({
  mode,
  value,
  values = [],
  onChange,
  onGalleryChange,
  getStoragePath,
  maxSizeMB = 10,
  maxFiles = 12,
  aspectRatio = 'video',
  height = 'h-40',
  disabled = false,
  className,
}: BunnyImageUploaderProps) {
  const { uploadImage, deleteImage, isUploading, progress, error, reset } = useBunnyImageUpload();
  const [removingIndex, setRemovingIndex] = useState<number | null>(null);

  // --- Single mode ---
  const onDropSingle = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file || disabled) return;

    const storagePath = getStoragePath(file);
    const result = await uploadImage(file, storagePath, maxSizeMB);

    if (result.success && result.cdnUrl) {
      onChange?.(result.cdnUrl);
    }
  }, [uploadImage, getStoragePath, maxSizeMB, onChange, disabled]);

  const handleRemoveSingle = useCallback(async () => {
    if (disabled) return;
    onChange?.('');
  }, [onChange, disabled]);

  // --- Gallery mode ---
  const onDropGallery = useCallback(async (acceptedFiles: File[]) => {
    if (disabled) return;
    const currentUrls = [...values];

    for (const file of acceptedFiles) {
      if (currentUrls.length >= maxFiles) break;

      const storagePath = getStoragePath(file);
      const result = await uploadImage(file, storagePath, maxSizeMB);

      if (result.success && result.cdnUrl) {
        currentUrls.push(result.cdnUrl);
        onGalleryChange?.([...currentUrls]);
      }
    }
  }, [uploadImage, getStoragePath, maxSizeMB, maxFiles, values, onGalleryChange, disabled]);

  const handleRemoveGallery = useCallback(async (index: number) => {
    if (disabled) return;
    setRemovingIndex(index);
    const updated = values.filter((_, i) => i !== index);
    onGalleryChange?.(updated);
    setRemovingIndex(null);
  }, [values, onGalleryChange, disabled]);

  // --- Dropzone config ---
  const isSingle = mode === 'single';
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: isSingle ? onDropSingle : onDropGallery,
    accept: ACCEPT_IMAGES,
    maxFiles: isSingle ? 1 : Math.max(1, maxFiles - values.length),
    disabled: disabled || isUploading,
    multiple: !isSingle,
  });

  const aspectClass = aspectRatio === 'square' ? 'aspect-square' : aspectRatio === 'video' ? 'aspect-video' : '';

  // --- Single mode render ---
  if (isSingle) {
    // Has image preview
    if (value) {
      return (
        <div className={cn('relative group rounded-sm overflow-hidden border bg-muted', aspectClass, height, className)}>
          <img
            src={value}
            alt="Preview"
            className="w-full h-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
          {!disabled && (
            <Button
              variant="destructive"
              size="icon"
              className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={handleRemoveSingle}
              type="button"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      );
    }

    // Uploading state
    if (isUploading) {
      return (
        <div className={cn('flex flex-col items-center justify-center rounded-sm border border-dashed bg-muted/50', height, className)}>
          <Loader2 className="h-6 w-6 animate-spin text-primary mb-2" />
          <p className="text-xs text-muted-foreground mb-2">Subiendo imagen...</p>
          {progress && (
            <div className="w-2/3">
              <Progress value={progress.percentage} className="h-1.5" />
              <p className="text-[10px] text-muted-foreground text-center mt-1">{progress.percentage}%</p>
            </div>
          )}
        </div>
      );
    }

    // Dropzone
    return (
      <div className={cn(className)}>
        <div
          {...getRootProps()}
          className={cn(
            'flex flex-col items-center justify-center rounded-sm border-2 border-dashed cursor-pointer transition-colors',
            height,
            isDragActive
              ? 'border-primary bg-primary/5'
              : 'border-muted-foreground/25 hover:border-primary/50 bg-muted/30',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
        >
          <input {...getInputProps()} />
          <Upload className="h-8 w-8 text-muted-foreground/60 mb-2" />
          <p className="text-sm text-muted-foreground">
            {isDragActive ? 'Suelta la imagen aquí' : 'Arrastra o haz clic para subir'}
          </p>
          <p className="text-[10px] text-muted-foreground/60 mt-1">
            JPG, PNG, GIF, WebP — máx. {maxSizeMB}MB
          </p>
        </div>
        {error && (
          <div className="flex items-center gap-1.5 mt-2 text-xs text-destructive">
            <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>
    );
  }

  // --- Gallery mode render ---
  return (
    <div className={cn('space-y-4', className)}>
      {/* Existing images grid */}
      {values.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {values.map((url, i) => (
            <div key={`${url}-${i}`} className="relative group rounded-sm overflow-hidden border aspect-video bg-muted">
              <img
                src={url}
                alt={`Imagen ${i + 1}`}
                className="w-full h-full object-cover"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
              {!disabled && (
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => handleRemoveGallery(i)}
                  disabled={removingIndex === i}
                  type="button"
                >
                  {removingIndex === i ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <X className="h-3 w-3" />
                  )}
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Upload progress */}
      {isUploading && (
        <div className="flex items-center gap-3 p-3 rounded-sm border bg-muted/50">
          <Loader2 className="h-5 w-5 animate-spin text-primary flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground mb-1">Subiendo imagen...</p>
            {progress && <Progress value={progress.percentage} className="h-1.5" />}
          </div>
          {progress && (
            <span className="text-xs text-muted-foreground">{progress.percentage}%</span>
          )}
        </div>
      )}

      {/* Add more dropzone */}
      {values.length < maxFiles && !isUploading && (
        <div
          {...getRootProps()}
          className={cn(
            'flex flex-col items-center justify-center rounded-sm border-2 border-dashed cursor-pointer transition-colors h-28',
            isDragActive
              ? 'border-primary bg-primary/5'
              : 'border-muted-foreground/25 hover:border-primary/50 bg-muted/30',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
        >
          <input {...getInputProps()} />
          <Upload className="h-6 w-6 text-muted-foreground/60 mb-1.5" />
          <p className="text-xs text-muted-foreground">
            {isDragActive ? 'Suelta las imágenes aquí' : 'Arrastra o haz clic para agregar'}
          </p>
          <p className="text-[10px] text-muted-foreground/60 mt-0.5">
            {values.length}/{maxFiles} imágenes — máx. {maxSizeMB}MB cada una
          </p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-1.5 text-xs text-destructive">
          <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
