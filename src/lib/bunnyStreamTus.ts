import * as tus from 'tus-js-client';
import { supabase, SUPABASE_ANON_KEY } from '@/integrations/supabase/client';

/**
 * Credenciales TUS firmadas que devuelven las edge functions de subida a Bunny
 * Stream (bunny-portfolio-upload, bunny-upload, bunny-upload-v2).
 * La API key de Bunny NUNCA llega al navegador: solo la firma
 * sha256(libraryId + apiKey + expiration + videoId), válida para ese video.
 */
export interface BunnyTusCredentials {
  endpoint: string;
  video_id: string;
  library_id: string;
  expiration: number;
  signature: string;
}

interface TusUploadOptions {
  onProgress?: (bytesUploaded: number, bytesTotal: number) => void;
  signal?: AbortSignal;
}

/** Sube un archivo a Bunny Stream vía TUS (reanudable, directo navegador → Bunny). */
export function uploadToBunnyStreamTus(
  file: File | Blob,
  creds: BunnyTusCredentials,
  options: TusUploadOptions = {},
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!creds?.signature || !creds?.video_id) {
      reject(new Error('Credenciales de subida inválidas'));
      return;
    }

    const fileName = file instanceof File ? file.name : 'video';
    const upload = new tus.Upload(file, {
      endpoint: creds.endpoint,
      retryDelays: [0, 3000, 5000, 10000, 20000, 60000],
      chunkSize: 50 * 1024 * 1024,
      headers: {
        AuthorizationSignature: creds.signature,
        AuthorizationExpire: String(creds.expiration),
        VideoId: creds.video_id,
        LibraryId: String(creds.library_id),
      },
      metadata: { filetype: file.type || 'video/mp4', title: fileName },
      onError: (err) => reject(err instanceof Error ? err : new Error(String(err))),
      onProgress: (sent, total) => options.onProgress?.(sent, total),
      onSuccess: () => resolve(),
    });

    if (options.signal) {
      if (options.signal.aborted) {
        reject(new Error('Subida cancelada'));
        return;
      }
      options.signal.addEventListener('abort', () => {
        upload.abort(true).catch(() => {});
        reject(new Error('Subida cancelada'));
      });
    }

    upload.start();
  });
}

/**
 * Headers para llamar a las edge functions de subida con la sesión del usuario.
 * Obtiene un token fresco justo antes de la llamada (las subidas largas pueden
 * dejar vencido el token en memoria).
 */
export async function bunnyFunctionHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Sesión expirada. Vuelve a iniciar sesión.');
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${session.access_token}`,
    apikey: SUPABASE_ANON_KEY,
  };
}
