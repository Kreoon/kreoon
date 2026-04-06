import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { SaveTemplateInput } from '../types/template';

/** Resultado devuelto por la mutación: el UUID de la plantilla creada. */
type SaveTemplateResult = string;

/**
 * Hook para guardar el perfil actual del usuario como una plantilla reutilizable.
 *
 * Llama a la RPC `save_profile_as_template`, que captura un snapshot de los
 * bloques publicados y la builder_config del perfil del usuario autenticado.
 *
 * En caso de éxito invalida ['my-templates'] para refrescar la lista propia
 * y muestra un toast con un link directo al template creado.
 *
 * Errores comunes que la RPC puede lanzar:
 * - "No creator profile found" — el usuario no tiene perfil de creador.
 * - "No published blocks found" — el perfil no tiene bloques publicados.
 *
 * @example
 * ```tsx
 * const { mutate: saveAsTemplate, isPending } = useSaveAsTemplate();
 *
 * saveAsTemplate({
 *   name: 'Mi plantilla UGC',
 *   category: 'ugc',
 *   visibility: 'public',
 * });
 * ```
 */
export function useSaveAsTemplate() {
  const queryClient = useQueryClient();

  return useMutation<SaveTemplateResult, Error, SaveTemplateInput>({
    mutationFn: async (input) => {
      const { data, error } = await (supabase as any).rpc('save_profile_as_template', {
        p_name: input.name,
        p_description: input.description ?? null,
        p_category: input.category,
        p_tags: input.tags ?? [],
        p_visibility: input.visibility,
      });

      if (error) {
        throw new Error(error.message);
      }

      // La RPC retorna el UUID de la plantilla creada
      return data as string;
    },

    onSuccess: (templateId, input) => {
      // Invalidar lista de plantillas propias
      queryClient.invalidateQueries({ queryKey: ['my-templates'] });

      const isPublic = input.visibility === 'public' || input.visibility === 'unlisted';

      toast.success('Plantilla guardada', {
        description: isPublic
          ? `"${input.name}" está siendo revisada para publicación.`
          : `"${input.name}" guardada como borrador.`,
        action: isPublic
          ? undefined
          : {
              label: 'Ver mis plantillas',
              onClick: () => {
                // Navegar a la sección de mis plantillas (el componente padre maneja la ruta)
                window.dispatchEvent(new CustomEvent('kreoon:navigate', { detail: { to: '/profile-builder?tab=templates' } }));
              },
            },
      });
    },

    onError: (error) => {
      // Mapear mensajes de error de la BD a mensajes en español
      const errorMap: Record<string, string> = {
        'No creator profile found': 'No tienes un perfil de creador configurado.',
        'No published blocks found. Publish your profile first.':
          'Debes publicar tu perfil antes de guardarlo como plantilla.',
        'Not authenticated': 'Debes iniciar sesión para guardar plantillas.',
      };

      const friendlyMessage = errorMap[error.message] ?? `Error al guardar la plantilla: ${error.message}`;
      toast.error(friendlyMessage);
    },
  });
}
