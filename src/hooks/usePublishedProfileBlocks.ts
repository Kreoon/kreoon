/**
 * Hook para obtener los bloques publicados del Profile Builder
 *
 * Obtiene los bloques guardados en profile_builder_blocks donde is_draft = false
 * junto con la configuración del builder (tema, colores, fuentes, etc.)
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { ProfileBlock, BuilderConfig } from '@/components/profile-builder/types/profile-builder';

export interface PublishedProfileData {
  blocks: ProfileBlock[];
  builderConfig: BuilderConfig | null;
  hasPublishedProfile: boolean;
}

/**
 * Obtiene los bloques publicados de un creador
 * @param creatorProfileId - ID del creator_profile (UUID o slug)
 */
export function usePublishedProfileBlocks(creatorProfileId: string | undefined) {
  return useQuery({
    queryKey: ['published-profile-blocks', creatorProfileId],
    queryFn: async (): Promise<PublishedProfileData> => {
      console.log('[usePublishedProfileBlocks] ▶ Iniciando fetch para:', creatorProfileId);

      if (!creatorProfileId) {
        console.log('[usePublishedProfileBlocks] ✗ No hay creatorProfileId, abortando');
        return { blocks: [], builderConfig: null, hasPublishedProfile: false };
      }

      // Determinar si es UUID o slug
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(creatorProfileId);
      console.log('[usePublishedProfileBlocks] Es UUID:', isUUID, '| Valor:', creatorProfileId);

      // 1. Obtener el profile_id real si es slug
      let profileId = creatorProfileId;
      if (!isUUID) {
        console.log('[usePublishedProfileBlocks] Resolviendo slug a UUID...');
        const { data: profile, error: slugError } = await supabase
          .from('creator_profiles')
          .select('id, slug')
          .eq('slug', creatorProfileId)
          .maybeSingle();

        console.log('[usePublishedProfileBlocks] Resultado resolución slug:', {
          profile,
          slugError: slugError?.message ?? null,
          slugError_code: slugError?.code ?? null,
        });

        if (slugError) {
          console.error('[usePublishedProfileBlocks] ✗ Error al resolver slug:', slugError);
          return { blocks: [], builderConfig: null, hasPublishedProfile: false };
        }

        if (!profile) {
          console.warn('[usePublishedProfileBlocks] ✗ Slug no encontrado en creator_profiles:', creatorProfileId);
          return { blocks: [], builderConfig: null, hasPublishedProfile: false };
        }

        profileId = profile.id;
        console.log('[usePublishedProfileBlocks] ✓ Slug resuelto a UUID:', profileId);
      }

      // 2. Obtener la configuración del builder del creator_profile
      console.log('[usePublishedProfileBlocks] Obteniendo builder_config para profile_id:', profileId);
      const { data: creatorProfile, error: profileError } = await supabase
        .from('creator_profiles')
        .select('builder_config')
        .eq('id', profileId)
        .maybeSingle();

      console.log('[usePublishedProfileBlocks] builder_config resultado:', {
        hasConfig: !!creatorProfile?.builder_config,
        error: profileError?.message ?? null,
      });

      if (profileError) {
        console.error('[usePublishedProfileBlocks] Error al obtener builder_config:', profileError);
      }

      const builderConfig = creatorProfile?.builder_config as BuilderConfig | null;

      // 3. Obtener bloques publicados (is_draft = false)
      console.log('[usePublishedProfileBlocks] Consultando bloques publicados para profile_id:', profileId);
      const { data: blocks, error: blocksError } = await supabase
        .from('profile_builder_blocks')
        .select('*')
        .eq('profile_id', profileId)
        .eq('is_draft', false)
        .order('order_index', { ascending: true });

      console.log('[usePublishedProfileBlocks] Resultado query bloques:', {
        count: blocks?.length ?? 0,
        error: blocksError?.message ?? null,
        error_code: blocksError?.code ?? null,
        error_details: blocksError?.details ?? null,
        primeros_ids: blocks?.slice(0, 3).map((b) => b.id) ?? [],
      });

      if (blocksError) {
        console.error('[usePublishedProfileBlocks] ✗ Error al obtener bloques:', blocksError);
        return { blocks: [], builderConfig, hasPublishedProfile: false };
      }

      if (!blocks || blocks.length === 0) {
        console.warn('[usePublishedProfileBlocks] ✗ No se encontraron bloques publicados para profile_id:', profileId);
        return { blocks: [], builderConfig, hasPublishedProfile: false };
      }

      // 4. Convertir al formato ProfileBlock
      const formattedBlocks: ProfileBlock[] = blocks.map((b) => ({
        id: b.id,
        type: b.block_type as ProfileBlock['type'],
        orderIndex: b.order_index,
        isVisible: b.is_visible ?? true,
        isDraft: b.is_draft ?? false,
        config: (b.config as Record<string, unknown>) || {},
        styles: (b.styles as Record<string, unknown>) || {},
        content: (b.content as Record<string, unknown>) || {},
      }));

      console.log('[usePublishedProfileBlocks] ✓ Bloques formateados:', formattedBlocks.length, '| Tipos:', formattedBlocks.map((b) => b.type));

      return {
        blocks: formattedBlocks,
        builderConfig,
        hasPublishedProfile: formattedBlocks.length > 0,
      };
    },
    enabled: !!creatorProfileId,
    staleTime: 2 * 60 * 1000, // 2 minutos - los perfiles publicados cambian poco
  });
}

export default usePublishedProfileBlocks;
