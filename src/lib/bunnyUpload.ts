import { supabase } from '@/integrations/supabase/client';

export type MediaType = 'image' | 'asset' | 'avatar' | 'portfolio' | 'chat';

interface UploadOptions {
  type: MediaType;
  userId?: string;
  organizationId?: string;
  onProgress?: (progress: number) => void;
}

interface UploadResult {
  cdnUrl: string;
  path: string;
  zone: string;
}

/**
 * Upload media to Bunny CDN Storage Zones
 *
 * This is a utility function (not a hook) that can be used anywhere.
 *
 * Supports:
 * - image: General images → kreoon-images zone (WebP optimization)
 * - asset: Documents, audio → kreoon-assets zone
 * - avatar: Profile pictures → kreoon-images/avatars/ (256x256)
 * - portfolio: Portfolio media → kreoon-images/portfolio/
 * - chat: Chat attachments → kreoon-assets/chat/
 */
export async function uploadToBunny(
  file: File,
  options: UploadOptions
): Promise<UploadResult> {
  const { type, userId, organizationId, onProgress } = options;

  // Step 1: Get upload credentials from edge function
  const { data: credentials, error: credError } = await supabase.functions.invoke(
    'bunny-media-upload',
    {
      body: {
        type,
        fileName: file.name,
        contentType: file.type,
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
  onProgress?.(10);

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        const percent = Math.round((e.loaded / e.total) * 80) + 10; // 10-90%
        onProgress?.(percent);
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`Upload failed: ${xhr.status} ${xhr.statusText}`));
      }
    });

    xhr.addEventListener('error', () => reject(new Error('Network error during upload')));
    xhr.addEventListener('abort', () => reject(new Error('Upload aborted')));

    xhr.open('PUT', uploadUrl);
    xhr.setRequestHeader('AccessKey', accessKey);
    xhr.setRequestHeader('Content-Type', file.type);
    xhr.send(file);
  });

  onProgress?.(100);

  return { cdnUrl, path, zone };
}

// Convenience functions
export async function uploadAvatar(file: File, userId: string, onProgress?: (p: number) => void): Promise<UploadResult> {
  return uploadToBunny(file, { type: 'avatar', userId, onProgress });
}

export async function uploadPortfolioImage(file: File, userId: string, onProgress?: (p: number) => void): Promise<UploadResult> {
  return uploadToBunny(file, { type: 'portfolio', userId, onProgress });
}

export async function uploadChatAttachment(file: File, organizationId: string, onProgress?: (p: number) => void): Promise<UploadResult> {
  return uploadToBunny(file, { type: 'chat', organizationId, onProgress });
}

export async function uploadImage(file: File, organizationId?: string, onProgress?: (p: number) => void): Promise<UploadResult> {
  return uploadToBunny(file, { type: 'image', organizationId, onProgress });
}

export async function uploadAsset(file: File, organizationId?: string, onProgress?: (p: number) => void): Promise<UploadResult> {
  return uploadToBunny(file, { type: 'asset', organizationId, onProgress });
}
