import type { PostgrestError } from '@supabase/supabase-js';

export type ToastLike = { toast: (opts: { title?: string; description?: string; variant?: 'default' | 'destructive' }) => void };

/**
 * Obtiene un mensaje legible a partir de un error de Supabase/Postgrest.
 */
export function getSupabaseErrorMessage(error: PostgrestError | Error | null | undefined): string {
  if (!error) return 'Error desconocido';
  if ('message' in error && typeof (error as Error).message === 'string') {
    const msg = (error as Error).message;
    if ('code' in error && (error as PostgrestError).code === '23505') return 'El registro ya existe.';
    if ('code' in error && (error as PostgrestError).code === '23503') return 'Referencia inválida (registro relacionado no encontrado).';
    return msg;
  }
  return String(error);
}

/**
 * Maneja un error de Supabase: opcionalmente muestra toast y devuelve si hubo error.
 * Útil para unificar feedback en llamadas a Supabase.
 *
 * @param error - Error devuelto por Supabase (p. ej. result.error)
 * @param toast - Opcional: instancia de useToast().toast para mostrar mensaje
 * @param fallbackTitle - Título por defecto si no se pasa toast
 * @returns true si había error, false si no
 */
export function handleSupabaseError(
  error: PostgrestError | Error | null | undefined,
  toast?: ToastLike['toast'],
  fallbackTitle = 'Error'
): boolean {
  if (!error) return false;
  const message = getSupabaseErrorMessage(error);
  if (toast) {
    toast({ title: fallbackTitle, description: message, variant: 'destructive' });
  }
  return true;
}
