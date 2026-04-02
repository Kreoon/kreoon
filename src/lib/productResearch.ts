/**
 * Product Research - Invocación directa a Kreoon
 *
 * Usa fetch con URL explícita de Kreoon para garantizar que la petición
 * llegue al proyecto correcto, independientemente de variables de entorno
 * o configuraciones de despliegue (Vercel, etc.).
 *
 * La edge function ejecuta los 12 pasos en lotes (auto-invocación),
 * el frontend dispara fire-and-forget y poll-ea research_progress.
 */
import { supabase } from '@/integrations/supabase/client';

// URL explícita de Kreoon - NO depender de variables de entorno en runtime
const KREOON_FUNCTIONS_URL = 'https://wjkbqcrxwsmvtxmqgiqc.supabase.co';

export interface ProductResearchBody {
  productId: string;
  briefData: Record<string, unknown>;
  useSteps?: boolean;
  startFromStep?: string;
  previousResults?: Record<string, unknown>;
}

export interface ProductResearchResult {
  success: boolean;
  error?: string;
  partial?: boolean;
  completedSteps?: string[];
  totalSteps?: number;
  [key: string]: unknown;
}

export interface ResearchProgress {
  step: number;
  total: number;
  label: string;
  stepId?: string;
  done?: boolean;
  error?: boolean;
  incomplete?: boolean;
  completed_steps?: string[];
}

/**
 * Dispara product-research en Kreoon como fire-and-forget.
 * La edge function se auto-invoca para completar todos los pasos.
 * Usa pollProductResearchProgress() para seguir el progreso.
 */
export async function fireProductResearch(
  body: ProductResearchBody
): Promise<{ success: boolean; error?: string }> {
  const url = `${KREOON_FUNCTIONS_URL}/functions/v1/product-research`;
  console.log('[productResearch] Fire-and-forget:', url);

  try {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) {
      return { success: false, error: 'No hay sesión activa' };
    }

    // Fire-and-forget: dispatch but don't await the full response.
    // The edge function runs in batches with self-invocation (~2-5 min total).
    // Polling via pollProductResearchProgress() tracks real-time progress.
    fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    }).then(async (res) => {
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        console.warn('[productResearch] Edge function response:', res.status, text.substring(0, 200));
      } else {
        console.log('[productResearch] Edge function first batch completed');
      }
    }).catch((err) => {
      // Expected: browser may timeout while function continues server-side via self-invocation
      console.warn('[productResearch] Expected timeout or network error:', err.message);
    });

    // Brief delay to ensure request is dispatched
    await new Promise(r => setTimeout(r, 500));
    return { success: true };
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    console.error('[productResearch] Fire error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Pollea research_progress de la tabla products.
 * Retorna función para cancelar el polling.
 */
export function pollProductResearchProgress(
  productId: string,
  onUpdate: (progress: ResearchProgress | null, done: boolean) => void,
  intervalMs = 3000,
  maxAttempts = 200, // ~10 min at 3s
): () => void {
  let attempts = 0;
  let cancelled = false;

  const intervalId = setInterval(async () => {
    if (cancelled) return;
    attempts++;

    try {
      const { data, error } = await supabase
        .from('products')
        .select('research_progress, research_generated_at')
        .eq('id', productId)
        .single();

      if (error) {
        console.error('[productResearch] Poll error:', error);
        return;
      }

      const progress = data?.research_progress as ResearchProgress | null;
      const isDone = progress?.done === true || (!!data?.research_generated_at && (!progress || (progress.step >= progress.total)));
      const isError = !!progress?.error;

      onUpdate(progress, isDone || isError);

      if (isDone || isError || attempts >= maxAttempts) {
        clearInterval(intervalId);
      }
    } catch (err) {
      console.error('[productResearch] Poll exception:', err);
    }
  }, intervalMs);

  return () => {
    cancelled = true;
    clearInterval(intervalId);
  };
}

/**
 * Legacy: invoca product-research y espera la respuesta completa.
 * Mantenida para compatibilidad, pero preferir fireProductResearch + polling.
 */
export async function invokeProductResearch(
  body: ProductResearchBody
): Promise<{ data: ProductResearchResult | null; error: Error | null }> {
  const url = `${KREOON_FUNCTIONS_URL}/functions/v1/product-research`;
  console.log('[productResearch] Invoking Kreoon:', url);

  try {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) {
      const err = new Error('No hay sesión activa');
      console.error('[productResearch]', err.message);
      return { data: null, error: err };
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    const text = await res.text();
    let data: ProductResearchResult;
    try {
      data = JSON.parse(text) as ProductResearchResult;
    } catch {
      data = { success: false, error: text || `HTTP ${res.status}` };
    }

    if (!res.ok) {
      const err = new Error(data?.error as string || `HTTP ${res.status}`);
      console.error('[productResearch] Error response:', res.status, data);
      return { data: null, error: err };
    }

    console.log('[productResearch] Success:', data?.success);
    return { data, error: null };
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    console.error('[productResearch] Exception:', error);
    return { data: null, error };
  }
}
