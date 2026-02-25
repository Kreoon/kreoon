import { supabase } from "@/integrations/supabase/client";

/**
 * Invoca una Edge Function autenticada.
 * Obtiene el JWT automáticamente y lo envía en el header Authorization.
 */
export async function invokeEdgeFunction<T = unknown>(
  functionName: string,
  action?: string,
  body?: Record<string, unknown>,
): Promise<T> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error("No autenticado");

  const path = action ? `${functionName}/${action}` : functionName;
  const { data, error } = await supabase.functions.invoke(path, {
    body: body || {},
    headers: { Authorization: `Bearer ${session.access_token}` },
  });

  if (error) {
    // Extraer mensaje real de FunctionsHttpError
    let msg = error.message;
    try {
      const ctx = (error as any)?.context;
      if (ctx && typeof ctx.json === "function") {
        const parsed = await ctx.json();
        msg = parsed?.error || msg;
      }
    } catch {
      /* ignore parse errors */
    }
    throw new Error(msg || `Error en ${path}`);
  }
  if (data?.error) throw new Error(data.error);
  return data as T;
}

/**
 * Invoca una Edge Function pública (sin autenticación).
 */
export async function invokeEdgeFunctionPublic<T = unknown>(
  functionName: string,
  action?: string,
  body?: Record<string, unknown>,
): Promise<T> {
  const path = action ? `${functionName}/${action}` : functionName;
  const { data, error } = await supabase.functions.invoke(path, {
    body: body || {},
  });

  if (error) throw new Error(error.message || `Error en ${path}`);
  if (data?.error) throw new Error(data.error);
  return data as T;
}
