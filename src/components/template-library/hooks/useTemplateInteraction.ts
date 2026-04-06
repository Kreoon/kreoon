import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { TemplateInteractionType, PublicTemplate, TemplateListResponse } from '../types/template';

/** Variables que recibe la mutación. */
interface ToggleInteractionVariables {
  templateId: string;
  interactionType: TemplateInteractionType;
  /** Slug de la plantilla para invalidar el detalle. Opcional. */
  slug?: string;
}

/** Resultado devuelto por la RPC: true = interacción activada, false = desactivada. */
type ToggleInteractionResult = boolean;

// ─── Helpers de optimistic update ────────────────────────────────────────────

/**
 * Actualiza optimisticamente el estado user_liked o user_saved
 * y los contadores correspondientes en el cache de useInfiniteQuery.
 */
function patchTemplateInCache(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pages: any,
  templateId: string,
  interactionType: TemplateInteractionType,
  active: boolean,
): typeof pages {
  if (!pages?.pages) return pages;

  return {
    ...pages,
    pages: pages.pages.map((page: { templates: PublicTemplate[]; nextPage: number | null; total: number }) => ({
      ...page,
      templates: page.templates.map((t) => {
        if (t.id !== templateId) return t;

        const delta = active ? 1 : -1;

        return {
          ...t,
          user_liked: interactionType === 'like' ? active : t.user_liked,
          user_saved: interactionType === 'save' ? active : t.user_saved,
          like_count: interactionType === 'like' ? Math.max(0, t.like_count + delta) : t.like_count,
          save_count: interactionType === 'save' ? Math.max(0, t.save_count + delta) : t.save_count,
        };
      }),
    })),
  };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Hook para hacer toggle de like o save en una plantilla.
 *
 * Llama a la RPC `toggle_template_interaction` que:
 * - Si la interacción ya existe → la elimina y retorna false.
 * - Si no existe → la inserta y retorna true.
 *
 * Implementa optimistic updates en el cache de 'public-templates' para
 * una UX inmediata. Si la mutación falla, revierte el cambio automáticamente.
 *
 * En caso de éxito invalida:
 * - ['public-templates', *] — para sincronizar todos los filtros activos.
 * - ['template', slug] — si se proporciona el slug, para actualizar el detalle.
 *
 * @example
 * ```tsx
 * const { mutate: toggleInteraction, isPending } = useTemplateInteraction();
 *
 * toggleInteraction({
 *   templateId: 'uuid',
 *   interactionType: 'like',
 *   slug: 'mi-plantilla-a1b2c3d4',
 * });
 * ```
 */
export function useTemplateInteraction() {
  const queryClient = useQueryClient();

  return useMutation<ToggleInteractionResult, Error, ToggleInteractionVariables>({
    mutationFn: async ({ templateId, interactionType }) => {
      const { data, error } = await (supabase as any).rpc('toggle_template_interaction', {
        p_template_id: templateId,
        p_interaction_type: interactionType,
      });

      if (error) {
        throw new Error(error.message);
      }

      return data as boolean;
    },

    // ─── Optimistic update ────────────────────────────────────────────────────
    onMutate: async ({ templateId, interactionType }) => {
      // Cancelar queries en vuelo para evitar colisiones
      await queryClient.cancelQueries({ queryKey: ['public-templates'] });

      // Snapshot del estado anterior para rollback
      const previousData = queryClient.getQueriesData({ queryKey: ['public-templates'] });

      // Determinar estado actual de la interacción en el primer cache disponible
      let currentlyActive = false;
      for (const [, pageData] of previousData) {
        const pages = pageData as { pages?: Array<{ templates: PublicTemplate[] }> };
        if (!pages?.pages) continue;
        for (const page of pages.pages) {
          const found = page.templates.find((t) => t.id === templateId);
          if (found) {
            currentlyActive =
              interactionType === 'like' ? found.user_liked : found.user_saved;
            break;
          }
        }
      }

      const nextActive = !currentlyActive;

      // Aplicar optimistic update en todos los caches de 'public-templates'
      queryClient.setQueriesData({ queryKey: ['public-templates'] }, (old) =>
        patchTemplateInCache(old, templateId, interactionType, nextActive),
      );

      return { previousData };
    },

    onError: (error, _variables, context) => {
      // Revertir optimistic update
      if (context?.previousData) {
        for (const [queryKey, data] of context.previousData) {
          queryClient.setQueryData(queryKey, data);
        }
      }

      const errorMap: Record<string, string> = {
        'Not authenticated': 'Debes iniciar sesión para interactuar con plantillas.',
        'Invalid interaction type': 'Tipo de interacción no válido.',
      };

      const friendlyMessage = errorMap[error.message] ?? `Error al registrar la interacción: ${error.message}`;
      toast.error(friendlyMessage);
    },

    onSuccess: (_result, { slug }) => {
      // Invalidar para sincronizar con la BD
      queryClient.invalidateQueries({ queryKey: ['public-templates'] });

      if (slug) {
        queryClient.invalidateQueries({ queryKey: ['template', slug] });
      }
    },
  });
}
