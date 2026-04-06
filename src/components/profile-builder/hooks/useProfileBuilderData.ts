import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useCreatorPublicProfile } from '@/hooks/useCreatorPublicProfile';
import { getTemplateByName, PROFILE_TEMPLATES } from '@/lib/profile-builder/templates';
import { generateBlocksFromTemplate, type CreatorDataForTemplate } from '@/lib/profile-builder/generateBlocksFromTemplate';
import type { ProfileBuilderData, ProfileBlock, ProfileTemplate, BuilderConfig } from '../types/profile-builder';

// ─── Query keys ───────────────────────────────────────────────────────────────

export const profileBuilderKeys = {
  all: ['profile-builder'] as const,
  data: (profileId: string) => [...profileBuilderKeys.all, 'data', profileId] as const,
  preview: (profileId: string) => [...profileBuilderKeys.all, 'preview', profileId] as const,
};

// ─── Tipos de respuesta RPC ───────────────────────────────────────────────────

interface SaveProfileBlocksParams {
  profileId: string;
  blocks: ProfileBlock[];
  isDraft: boolean;
}

interface PublishProfileBlocksParams {
  profileId: string;
}

interface GeneratePreviewTokenParams {
  profileId: string;
}

// El RPC devuelve solo el token como string
type GeneratePreviewTokenResult = string;

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useProfileBuilderData(profileId: string | undefined) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // ─── Query: cargar datos del profile builder ──────────────────────────────

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: profileBuilderKeys.data(profileId ?? ''),
    queryFn: async (): Promise<ProfileBuilderData> => {
      const { data: rpcData, error: rpcError } = await supabase.rpc(
        'get_profile_builder_data',
        { profile_id: profileId }
      );

      if (rpcError) {
        console.error('[useProfileBuilderData] Error RPC:', rpcError);
        throw rpcError;
      }

      return rpcData as unknown as ProfileBuilderData;
    },
    enabled: !!profileId,
    staleTime: 5 * 60 * 1000,
  });

  // ─── Query: cargar datos del marketplace para generar bloques ─────────────
  // Solo se usa si no hay bloques guardados
  const { data: marketplaceData, loading: marketplaceLoading } = useCreatorPublicProfile(profileId);

  // ─── Mutation: guardar bloques (borrador o publicado) ─────────────────────

  const saveBlocksMutation = useMutation({
    mutationFn: async ({ profileId: pid, blocks, isDraft }: SaveProfileBlocksParams) => {
      const { data: rpcData, error: rpcError } = await supabase.rpc('save_profile_blocks', {
        profile_id: pid,
        blocks: blocks as unknown as Record<string, unknown>[],
        is_draft: isDraft,
      });

      if (rpcError) {
        console.error('[saveBlocksMutation] Error RPC:', rpcError);
        throw rpcError;
      }
    },
    onSuccess: (_data, variables) => {
      // Invalidar datos del builder
      queryClient.invalidateQueries({
        queryKey: profileBuilderKeys.data(variables.profileId),
      });
      // También invalidar bloques publicados para el marketplace
      queryClient.invalidateQueries({
        queryKey: ['published-profile-blocks', variables.profileId],
      });
    },
    onError: (err: Error) => {
      toast({
        title: 'Error al guardar',
        description: err.message,
        variant: 'destructive',
      });
    },
  });

  // ─── Mutation: publicar perfil ────────────────────────────────────────────

  const publishMutation = useMutation({
    mutationFn: async ({ profileId: pid }: PublishProfileBlocksParams) => {
      const { error: rpcError } = await supabase.rpc('publish_profile_blocks', {
        profile_id: pid,
      });

      if (rpcError) {
        throw rpcError;
      }
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: profileBuilderKeys.data(variables.profileId),
      });
      // Invalidar también la query de bloques publicados para el marketplace
      queryClient.invalidateQueries({
        queryKey: ['published-profile-blocks', variables.profileId],
      });
      toast({
        title: 'Perfil publicado',
        description: 'Los cambios ya son visibles para todos.',
      });
    },
    onError: (err: Error) => {
      toast({
        title: 'Error al publicar',
        description: err.message,
        variant: 'destructive',
      });
    },
  });

  // ─── Mutation: guardar configuración del builder ──────────────────────────

  const saveConfigMutation = useMutation({
    mutationFn: async ({ profileId: pid, config }: { profileId: string; config: BuilderConfig }) => {
      const { error } = await supabase
        .from('creator_profiles')
        .update({ builder_config: config as unknown as Record<string, unknown> })
        .eq('id', pid);

      if (error) {
        throw error;
      }
    },
    onSuccess: (_data, variables) => {
      // Invalidar datos del builder
      queryClient.invalidateQueries({
        queryKey: profileBuilderKeys.data(variables.profileId),
      });
      // Invalidar bloques publicados para actualizar el perfil público
      queryClient.invalidateQueries({
        queryKey: ['published-profile-blocks', variables.profileId],
      });
      // Invalidar también perfiles públicos para que se reflejen los cambios
      queryClient.invalidateQueries({ queryKey: ['public-creator-profile'] });
      queryClient.invalidateQueries({ queryKey: ['creator-public-profile'] });
      // Forzar refetch del marketplace para mostrar cambios inmediatamente
      queryClient.invalidateQueries({ queryKey: ['marketplace-creators'] });
    },
    onError: (err: Error) => {
      toast({
        title: 'Error al guardar configuración',
        description: err.message,
        variant: 'destructive',
      });
    },
  });

  // ─── Mutation: generar token de preview ───────────────────────────────────

  const generatePreviewTokenMutation = useMutation({
    mutationFn: async ({
      profileId: pid,
    }: GeneratePreviewTokenParams): Promise<GeneratePreviewTokenResult> => {
      const { data: rpcData, error: rpcError } = await supabase.rpc(
        'generate_preview_token',
        { profile_id: pid }
      );

      if (rpcError) {
        throw rpcError;
      }

      return rpcData as unknown as GeneratePreviewTokenResult;
    },
    onError: (err: Error) => {
      toast({
        title: 'Error al generar vista previa',
        description: err.message,
        variant: 'destructive',
      });
    },
  });

  // ─── Helpers con profileId pre-aplicado ───────────────────────────────────

  const saveBlocks = (blocks: ProfileBlock[], isDraft: boolean) => {
    if (!profileId) return;
    // Protección: no permitir guardar un array vacío para evitar borrar datos
    if (!blocks || blocks.length === 0) {
      console.warn('[saveBlocks] Intento de guardar array vacío bloqueado');
      return;
    }
    saveBlocksMutation.mutate({ profileId, blocks, isDraft });
  };

  const saveBlocksAsync = (blocks: ProfileBlock[], isDraft: boolean) => {
    if (!profileId) return Promise.resolve();
    // Protección: no permitir guardar un array vacío para evitar borrar datos
    if (!blocks || blocks.length === 0) {
      console.warn('[saveBlocksAsync] Intento de guardar array vacío bloqueado');
      return Promise.reject(new Error('No se puede guardar un perfil sin bloques'));
    }
    return saveBlocksMutation.mutateAsync({ profileId, blocks, isDraft });
  };

  const publishBlocks = () => {
    if (!profileId) return;
    publishMutation.mutate({ profileId });
  };

  const saveBuilderConfig = (config: BuilderConfig) => {
    if (!profileId) return;
    saveConfigMutation.mutate({ profileId, config });
  };

  const saveBuilderConfigAsync = async (config: BuilderConfig) => {
    if (!profileId) return;
    return saveConfigMutation.mutateAsync({ profileId, config });
  };

  const generatePreviewToken = () => {
    if (!profileId) return;
    generatePreviewTokenMutation.mutate({ profileId });
  };

  const generatePreviewTokenAsync = async (): Promise<GeneratePreviewTokenResult | null> => {
    if (!profileId) return null;
    try {
      return await generatePreviewTokenMutation.mutateAsync({ profileId });
    } catch {
      return null;
    }
  };

  // ─── Generar bloques automáticamente si no hay guardados ───────────────────
  // Esto permite que el builder muestre contenido basado en datos del marketplace
  const generatedBlocks = (() => {
    // Si hay bloques guardados, usarlos
    if (data?.blocks && data.blocks.length > 0) {
      return data.blocks;
    }

    // Si no hay datos del marketplace, no generar
    if (!marketplaceData?.profile) {
      return [];
    }

    // Obtener plantilla guardada o usar profesional
    const templateName = data?.profile?.builder_template || 'profesional';
    const template = getTemplateByName(templateName) || PROFILE_TEMPLATES.find((t) => t.name === 'profesional')!;

    // Convertir datos del marketplace al formato del template
    const templateData: CreatorDataForTemplate = {
      profile: marketplaceData.profile,
      portfolioItems: marketplaceData.portfolioItems,
      services: marketplaceData.services,
      reviews: marketplaceData.reviews,
      trustStats: marketplaceData.trustStats || undefined,
      specializations: marketplaceData.specializations?.map((s) => s.name) || [],
    };

    // Generar bloques
    return generateBlocksFromTemplate(template, templateData);
  })();

  // Determinar la plantilla actual
  const currentTemplate = data?.profile?.builder_template || 'profesional';

  return {
    // Datos
    data,
    profile: data?.profile ?? null,
    blocks: generatedBlocks,
    currentTemplate,
    // Datos del marketplace (para regenerar bloques)
    marketplaceData,
    // Estados de carga
    isLoading: isLoading || marketplaceLoading,
    isError,
    error,
    isSaving: saveBlocksMutation.isPending || saveConfigMutation.isPending,
    isPublishing: publishMutation.isPending,
    isGeneratingToken: generatePreviewTokenMutation.isPending,
    // Token de preview generado
    previewToken: generatePreviewTokenMutation.data ?? null,
    // Acciones
    saveBlocks,
    saveBlocksAsync,
    publishBlocks,
    saveBuilderConfig,
    saveBuilderConfigAsync,
    generatePreviewToken,
    generatePreviewTokenAsync,
    refetch,
  };
}
