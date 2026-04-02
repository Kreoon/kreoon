/**
 * Hook para cargar bloques del Profile Builder de un creador.
 * Retorna bloques guardados en DB, o array vacío si no tiene.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { ProfileBlock } from '@/components/profile-builder/types/profile-builder';

interface UseCreatorProfileBlocksResult {
  blocks: ProfileBlock[];
  isLoading: boolean;
  error: Error | null;
  hasCustomBlocks: boolean;
}

/**
 * Carga bloques guardados del profile builder para un creador.
 * Si no tiene bloques personalizados, retorna array vacío.
 *
 * @param creatorProfileId - ID del creator_profile (no user_id)
 */
export function useCreatorProfileBlocks(
  creatorProfileId: string | undefined
): UseCreatorProfileBlocksResult {
  const {
    data: blocks = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['creator-profile-blocks', creatorProfileId],
    queryFn: async () => {
      if (!creatorProfileId) return [];

      const { data, error } = await supabase
        .from('profile_builder_blocks')
        .select('*')
        .eq('profile_id', creatorProfileId)
        .eq('is_draft', false)
        .order('order_index', { ascending: true });

      if (error) {
        console.error('[useCreatorProfileBlocks] Error:', error);
        throw error;
      }

      // Mapear a formato ProfileBlock
      return (data || []).map((row): ProfileBlock => ({
        id: row.id,
        type: row.block_type as ProfileBlock['type'],
        orderIndex: row.order_index,
        isVisible: row.is_visible ?? true,
        isDraft: row.is_draft ?? false,
        config: (row.config as Record<string, unknown>) || {},
        styles: (row.styles as ProfileBlock['styles']) || {},
        content: (row.content as Record<string, unknown>) || {},
      }));
    },
    enabled: !!creatorProfileId,
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos
  });

  return {
    blocks,
    isLoading,
    error: error as Error | null,
    hasCustomBlocks: blocks.length > 0,
  };
}

export default useCreatorProfileBlocks;
