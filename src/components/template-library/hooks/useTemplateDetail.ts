import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { TemplateDetail } from '../types/template';

/**
 * Hook para obtener el detalle completo de una plantilla por su slug.
 *
 * Llama a la RPC `get_template_by_slug`. Incluye builder_config, bloques
 * completos, estado de moderación e indicadores is_owner, user_liked, user_saved.
 *
 * La RPC también registra automáticamente una interacción de tipo 'view'
 * si el usuario autenticado no es el autor de la plantilla.
 *
 * @param slug - Slug único de la plantilla (ej. "mi-plantilla-a1b2c3d4")
 *
 * @example
 * ```tsx
 * const { data: template, isLoading } = useTemplateDetail('mi-plantilla-a1b2c3d4');
 * ```
 */
export function useTemplateDetail(slug: string | undefined) {
  return useQuery<TemplateDetail | null, Error>({
    queryKey: ['template', slug],
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    enabled: !!slug,

    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc('get_template_by_slug', {
        p_slug: slug,
      });

      if (error) {
        throw new Error(`[useTemplateDetail] Error al cargar plantilla: ${error.message}`);
      }

      // La RPC retorna NULL si la plantilla no existe o no es accesible
      if (!data) return null;

      return data as TemplateDetail;
    },
  });
}
