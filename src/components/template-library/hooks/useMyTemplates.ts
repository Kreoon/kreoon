import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { MyTemplate } from '../types/template';

/**
 * Hook para obtener todas las plantillas creadas por el usuario autenticado.
 *
 * Llama a la RPC `get_my_templates`, que devuelve un array jsonb con todas
 * las plantillas del usuario (incluidas las de visibilidad 'draft' y 'unlisted').
 * El resultado está ordenado por created_at DESC.
 *
 * Retorna un array vacío si el usuario no está autenticado.
 *
 * @example
 * ```tsx
 * const { data: myTemplates = [], isLoading } = useMyTemplates();
 * ```
 */
export function useMyTemplates() {
  const { user } = useAuth();

  return useQuery<MyTemplate[], Error>({
    queryKey: ['my-templates'],
    staleTime: 2 * 60 * 1000,  // 2 minutos (datos propios del usuario, cambian más)
    gcTime: 10 * 60 * 1000,
    enabled: !!user?.id,

    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc('get_my_templates');

      if (error) {
        throw new Error(`[useMyTemplates] Error al cargar tus plantillas: ${error.message}`);
      }

      return (data as MyTemplate[]) ?? [];
    },
  });
}
