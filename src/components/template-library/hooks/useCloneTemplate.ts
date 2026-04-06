import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { profileBuilderKeys } from '@/components/profile-builder/hooks/useProfileBuilderData';
import type { CloneTemplateOptions } from '../types/template';

/** Variables que recibe la mutación. */
interface CloneTemplateVariables {
  templateId: string;
  options?: CloneTemplateOptions;
}

/**
 * Hook para clonar una plantilla pública al perfil del usuario autenticado.
 *
 * Llama a la RPC `clone_template_to_profile`, que inserta los bloques de la
 * plantilla en el perfil del usuario y aplica la builder_config correspondiente.
 *
 * Modos de clonación:
 * - `replace` (por defecto): elimina todos los bloques existentes del perfil.
 * - `merge`: conserva los bloques existentes y agrega los nuevos al final.
 *
 * Si `cloneContent` es false (por defecto), los bloques se insertan sin
 * contenido (el usuario debe llenarlo), conservando solo estructura y estilos.
 *
 * En caso de éxito invalida todas las queries del Profile Builder para
 * reflejar los cambios inmediatamente en el editor.
 *
 * Errores comunes que la RPC puede lanzar:
 * - "Template not found or not accessible" — plantilla inválida o sin acceso.
 * - "Premium tier required for this template" — tier insuficiente.
 * - "Pro tier required for this template" — tier insuficiente.
 *
 * @example
 * ```tsx
 * const { mutate: cloneTemplate, isPending } = useCloneTemplate();
 *
 * cloneTemplate({
 *   templateId: 'uuid-de-la-plantilla',
 *   options: { cloneContent: false, mergeMode: 'replace' },
 * });
 * ```
 */
export function useCloneTemplate() {
  const queryClient = useQueryClient();

  return useMutation<boolean, Error, CloneTemplateVariables>({
    mutationFn: async ({ templateId, options }) => {
      const { data, error } = await (supabase as any).rpc('clone_template_to_profile', {
        p_template_id: templateId,
        p_clone_content: options?.cloneContent ?? false,
        p_merge_mode: options?.mergeMode ?? 'replace',
      });

      if (error) {
        throw new Error(error.message);
      }

      return data as boolean;
    },

    onSuccess: () => {
      // Invalidar todas las queries del Profile Builder para reflejar los cambios
      queryClient.invalidateQueries({ queryKey: profileBuilderKeys.all });

      toast.success('Plantilla aplicada', {
        description: 'Los bloques se han cargado en tu perfil. Personalízalos a tu gusto.',
      });
    },

    onError: (error) => {
      const errorMap: Record<string, string> = {
        'Template not found or not accessible': 'La plantilla no existe o no tienes acceso a ella.',
        'Premium tier required for this template': 'Esta plantilla requiere el plan Premium.',
        'Pro tier required for this template': 'Esta plantilla requiere el plan Pro.',
        'No creator profile found': 'No tienes un perfil de creador configurado.',
        'Not authenticated': 'Debes iniciar sesión para usar plantillas.',
      };

      const friendlyMessage = errorMap[error.message] ?? `Error al aplicar la plantilla: ${error.message}`;
      toast.error(friendlyMessage);
    },
  });
}
