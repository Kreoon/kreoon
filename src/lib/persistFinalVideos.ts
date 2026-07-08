import { supabase, SUPABASE_FUNCTIONS_URL, SUPABASE_ANON_KEY } from '@/integrations/supabase/client';

/**
 * Persiste content.video_urls vía la edge function bunny-portfolio-upload (action 'set-final-videos').
 *
 * Por qué no usar el RPC update_content_by_id directo:
 * en Safari, durante subidas largas, el auto-refresh del token de Supabase se estrangula
 * (ITP + throttling de timers en background). El RPC exige auth.uid() y recibía un token
 * muerto, fallando en silencio y dejando video_urls vacío. Aquí obtenemos un token FRESCO
 * on-demand (getSession refresca al momento, no depende del refresh en background) y lo
 * enviamos; la edge function valida identidad + permiso sobre el contenido antes de escribir
 * con service_role. Lanza si no se pudo guardar (no es silencioso) para que la UI avise.
 */
// Errores transitorios (conexion caida a mitad de subida, cold start, etc.)
// valen un reintento; errores de auth/permiso/not-found no cambian al reintentar.
const RETRYABLE_STATUS = new Set([400, 502, 503, 504]);

export async function persistFinalVideos(contentId: string, urls: string[], _attempt = 1): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) {
    throw new Error('Sesión expirada. Recarga la página e intenta de nuevo.');
  }

  let res: Response;
  try {
    res = await fetch(`${SUPABASE_FUNCTIONS_URL}/functions/v1/bunny-portfolio-upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ action: 'set-final-videos', content_id: contentId, urls }),
    });
  } catch (networkErr) {
    // fetch en si fallo (conexion caida) -- mismo criterio de reintento que un 5xx
    if (_attempt < 2) {
      await new Promise((r) => setTimeout(r, 1500));
      return persistFinalVideos(contentId, urls, _attempt + 1);
    }
    throw new Error('No se pudo conectar para guardar el video. Revisa tu conexion e intenta de nuevo.');
  }

  if (!res.ok) {
    const data = await res.json().catch(() => ({} as { error?: string }));
    if (_attempt < 2 && RETRYABLE_STATUS.has(res.status)) {
      await new Promise((r) => setTimeout(r, 1500));
      return persistFinalVideos(contentId, urls, _attempt + 1);
    }
    throw new Error(data?.error || `Error ${res.status} al guardar los videos`);
  }
}
