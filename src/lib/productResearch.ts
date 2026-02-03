/**
 * Product Research - Invocación directa a Kreoon
 *
 * Usa fetch con URL explícita de Kreoon para garantizar que la petición
 * llegue al proyecto correcto, independientemente de variables de entorno
 * o configuraciones de despliegue (Lovable, Vercel, etc.).
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
  [key: string]: unknown;
}

/**
 * Invoca product-research en Kreoon usando fetch directo.
 * Garantiza que la petición vaya a wjkbqcrxwsmvtxmqgiqc (Kreoon).
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
