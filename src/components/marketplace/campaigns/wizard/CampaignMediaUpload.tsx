import React, { useState, useRef } from 'react';
import { Upload, X, Video, Image, Loader2 } from 'lucide-react';
import { useMarketplaceCampaigns } from '@/hooks/useMarketplaceCampaigns';
import type { CampaignMediaType } from '@/hooks/useMarketplaceCampaigns';
import { cn } from '@/lib/utils';

interface CampaignMediaUploadProps {
  campaignId?: string;
  mediaType: 'cover_image' | 'video_brief';
  currentUrl?: string;
  onUpload: (url: string, mediaId: string, thumbnailUrl?: string) => void;
  onRemove?: () => void;
  /** When campaignId is undefined, passes the raw File so the caller can upload it later. */
  onTempFile?: (file: File) => void;
  className?: string;
}

// Must match hook / edge function limits
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const ACCEPTED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'];
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;  // 10 MB
const MAX_VIDEO_SIZE = 500 * 1024 * 1024; // 500 MB (matches edge function)

export function CampaignMediaUpload({
  campaignId,
  mediaType,
  currentUrl,
  onUpload,
  onRemove,
  onTempFile,
  className,
}: CampaignMediaUploadProps) {
  const { uploadCampaignMedia } = useMarketplaceCampaigns();
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isVideo = mediaType === 'video_brief';
  const acceptedTypes = isVideo ? ACCEPTED_VIDEO_TYPES : ACCEPTED_IMAGE_TYPES;
  const maxSize = isVideo ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;

  const handleFileSelect = async (file: File) => {
    setError(null);

    // Validate MIME type
    if (!acceptedTypes.includes(file.type)) {
      setError(
        `Tipo de archivo no válido. Usa ${isVideo ? 'MP4, WebM, MOV o AVI' : 'JPG, PNG, WebP o GIF'}`,
      );
      return;
    }

    // Validate file size
    if (file.size > maxSize) {
      setError(`El archivo es muy grande. Máximo ${isVideo ? '500MB' : '10MB'}`);
      return;
    }

    // No campaignId yet → store a temp blob URL (will upload after create)
    if (!campaignId) {
      const tempUrl = URL.createObjectURL(file);
      onUpload(tempUrl, 'temp');
      onTempFile?.(file);
      return;
    }

    setUploading(true);
    setProgress(0);

    // uploadCampaignMedia takes a single object param and returns null on error
    // (it does NOT throw — errors are logged internally)
    const result = await uploadCampaignMedia({
      campaign_id: campaignId,
      media_type: mediaType as CampaignMediaType,
      file,
      onProgress: (p) => setProgress(p.percentage),
    });

    setUploading(false);
    setProgress(0);

    if (!result) {
      setError('Error al subir el archivo. Intenta de nuevo.');
      return;
    }

    onUpload(result.file_url, result.id, result.thumbnail_url);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
    // Reset so re-selecting the same file triggers onChange
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ── Preview state (file already uploaded) ──────────────────────────

  if (currentUrl) {
    return (
      <div className={cn('relative rounded-xl overflow-hidden', className)}>
        {isVideo ? (
          <div className="relative aspect-video bg-gray-900">
            <video src={currentUrl} controls className="w-full h-full object-cover" />
            <div className="absolute top-2 left-2 bg-black/60 px-2 py-1 rounded-lg">
              <Video className="w-4 h-4 text-white" />
            </div>
          </div>
        ) : (
          <div className="relative aspect-video bg-gray-100 dark:bg-gray-800">
            <img src={currentUrl} alt="Preview" className="w-full h-full object-cover" />
          </div>
        )}

        {onRemove && (
          <button
            onClick={onRemove}
            className="absolute top-2 right-2 p-1.5 bg-red-500 hover:bg-red-600 rounded-full text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    );
  }

  // ── Upload dropzone ────────────────────────────────────────────────

  return (
    <div className={className}>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => !uploading && fileInputRef.current?.click()}
        className={cn(
          'relative aspect-video border-2 border-dashed rounded-xl cursor-pointer transition-all',
          'flex flex-col items-center justify-center gap-3',
          dragOver
            ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
            : 'border-gray-300 dark:border-gray-600 hover:border-purple-400 hover:bg-gray-50 dark:hover:bg-gray-800/50',
          uploading && 'pointer-events-none opacity-60',
        )}
      >
        {uploading ? (
          <div className="flex flex-col items-center gap-3 px-6 w-full">
            <Loader2 className="w-10 h-10 text-purple-500 animate-spin" />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Subiendo... {progress > 0 ? `${progress}%` : ''}
            </span>
            <div className="w-full max-w-xs h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-purple-500 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        ) : (
          <>
            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-full">
              {isVideo ? (
                <Video className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              ) : (
                <Image className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              )}
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {isVideo ? 'Sube un video explicativo' : 'Sube una imagen de portada'}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {isVideo
                  ? 'MP4, WebM, MOV o AVI \u2022 Máx 500MB'
                  : 'JPG, PNG, WebP o GIF \u2022 Máx 10MB \u2022 16:9 recomendado'}
              </p>
            </div>
            <button
              type="button"
              className="px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition-colors"
            >
              <Upload className="w-4 h-4 inline mr-2" />
              Seleccionar archivo
            </button>
          </>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept={acceptedTypes.join(',')}
          onChange={handleInputChange}
          className="hidden"
        />
      </div>

      {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
