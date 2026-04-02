import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  optimizeImage,
  isImageFile,
  OPTIMIZE_PRESETS,
  type OptimizeOptions,
  type OptimizeResult,
} from '@/lib/imageOptimizer';

export type MediaType = 'image' | 'asset' | 'avatar' | 'portfolio' | 'chat';

interface UploadOptions {
  type: MediaType;
  userId?: string;
  organizationId?: string;
  onProgress?: (progress: number) => void;
  /** Desactivar optimizacion (default: false) */
  skipOptimization?: boolean;
  /** Opciones personalizadas de optimizacion */
  optimizeOptions?: OptimizeOptions;
}

interface UploadResult {
  cdnUrl: string;
  path: string;
  zone: string;
  /** Info de optimizacion (si se aplico) */
  optimization?: {
    originalSize: number;
    compressedSize: number;
    compressionRatio: number;
  };
}

interface UploadState {
  isUploading: boolean;
  progress: number;
  error: string | null;
  /** Estado de optimizacion */
  optimizing: boolean;
}

/**
 * Hook for uploading media to Bunny CDN Storage Zones
 *
 * Supports:
 * - image: General images → kreoon-images zone (WebP optimization)
 * - asset: Documents, audio → kreoon-assets zone
 * - avatar: Profile pictures → kreoon-images/avatars/ (256x256)
 * - portfolio: Portfolio media → kreoon-images/portfolio/
 * - chat: Chat attachments → kreoon-assets/chat/
 */
export function useMediaUpload() {
  const [state, setState] = useState<UploadState>({
    isUploading: false,
    progress: 0,
    error: null,
    optimizing: false,
  });

  const upload = useCallback(async (
    file: File,
    options: UploadOptions
  ): Promise<UploadResult | null> => {
    const { type, userId, organizationId, onProgress, skipOptimization = false, optimizeOptions } = options;

    setState({ isUploading: true, progress: 0, error: null, optimizing: false });

    let fileToUpload = file;
    let optimizationResult: OptimizeResult | null = null;

    try {
      // Step 0: Optimize image if applicable
      if (isImageFile(file) && !skipOptimization) {
        setState(prev => ({ ...prev, optimizing: true }));

        // Seleccionar preset segun tipo
        const preset = OPTIMIZE_PRESETS[type] || OPTIMIZE_PRESETS.general;
        const mergedOptions = { ...preset, ...optimizeOptions };

        optimizationResult = await optimizeImage(file, mergedOptions);
        fileToUpload = optimizationResult.file;

        console.log(
          `[useMediaUpload] Optimized: ${(optimizationResult.originalSize / 1024).toFixed(0)}KB → ${(optimizationResult.compressedSize / 1024).toFixed(0)}KB (${optimizationResult.compressionRatio}% reduction)`
        );

        setState(prev => ({ ...prev, optimizing: false }));
      }

      // Step 1: Get upload credentials from edge function
      const { data: credentials, error: credError } = await supabase.functions.invoke(
        'bunny-media-upload',
        {
          body: {
            type,
            fileName: fileToUpload.name,
            contentType: fileToUpload.type,
            userId,
            organizationId,
          },
        }
      );

      if (credError || !credentials) {
        throw new Error(credError?.message || 'Failed to get upload credentials');
      }

      const { uploadUrl, cdnUrl, path, zone, accessKey } = credentials;

      // Step 2: Upload directly to Bunny Storage
      setState(prev => ({ ...prev, progress: 10 }));
      onProgress?.(10);

      const uploadResponse = await new Promise<Response>((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const percent = Math.round((e.loaded / e.total) * 80) + 10; // 10-90%
            setState(prev => ({ ...prev, progress: percent }));
            onProgress?.(percent);
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(new Response(xhr.response, { status: xhr.status }));
          } else {
            reject(new Error(`Upload failed: ${xhr.status} ${xhr.statusText}`));
          }
        });

        xhr.addEventListener('error', () => reject(new Error('Network error during upload')));
        xhr.addEventListener('abort', () => reject(new Error('Upload aborted')));

        xhr.open('PUT', uploadUrl);
        xhr.setRequestHeader('AccessKey', accessKey);
        xhr.setRequestHeader('Content-Type', fileToUpload.type);
        xhr.send(fileToUpload);
      });

      if (!uploadResponse.ok) {
        throw new Error('Upload to Bunny CDN failed');
      }

      setState({ isUploading: false, progress: 100, error: null, optimizing: false });
      onProgress?.(100);

      return {
        cdnUrl,
        path,
        zone,
        optimization: optimizationResult ? {
          originalSize: optimizationResult.originalSize,
          compressedSize: optimizationResult.compressedSize,
          compressionRatio: optimizationResult.compressionRatio,
        } : undefined,
      };

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Upload failed';
      setState({ isUploading: false, progress: 0, error: message, optimizing: false });
      console.error('useMediaUpload error:', error);
      return null;
    }
  }, []);

  const uploadAvatar = useCallback((file: File, userId: string, onProgress?: (p: number) => void) => {
    return upload(file, { type: 'avatar', userId, onProgress });
  }, [upload]);

  const uploadPortfolio = useCallback((file: File, userId: string, onProgress?: (p: number) => void) => {
    return upload(file, { type: 'portfolio', userId, onProgress });
  }, [upload]);

  const uploadChatAttachment = useCallback((file: File, organizationId: string, onProgress?: (p: number) => void) => {
    return upload(file, { type: 'chat', organizationId, onProgress });
  }, [upload]);

  const uploadImage = useCallback((file: File, organizationId?: string, onProgress?: (p: number) => void) => {
    return upload(file, { type: 'image', organizationId, onProgress });
  }, [upload]);

  const uploadAsset = useCallback((file: File, organizationId?: string, onProgress?: (p: number) => void) => {
    return upload(file, { type: 'asset', organizationId, onProgress });
  }, [upload]);

  const reset = useCallback(() => {
    setState({ isUploading: false, progress: 0, error: null, optimizing: false });
  }, []);

  return {
    // State
    isUploading: state.isUploading,
    isOptimizing: state.optimizing,
    progress: state.progress,
    error: state.error,
    // Generic upload
    upload,
    // Convenience methods
    uploadAvatar,
    uploadPortfolio,
    uploadChatAttachment,
    uploadImage,
    uploadAsset,
    // Reset
    reset,
  };
}

export default useMediaUpload;
