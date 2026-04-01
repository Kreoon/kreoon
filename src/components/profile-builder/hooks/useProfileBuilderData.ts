import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { ProfileBuilderData, ProfileBlock } from '../types/profile-builder';

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

interface GeneratePreviewTokenResult {
  token: string;
  expiresAt: string;
}

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
        console.error('[useProfileBuilderData] Error al cargar datos:', rpcError);
        throw rpcError;
      }

      return rpcData as unknown as ProfileBuilderData;
    },
    enabled: !!profileId,
    staleTime: 5 * 60 * 1000,
  });

  // ─── Mutation: guardar bloques (borrador o publicado) ─────────────────────

  const saveBlocksMutation = useMutation({
    mutationFn: async ({ profileId: pid, blocks, isDraft }: SaveProfileBlocksParams) => {
      const { error: rpcError } = await supabase.rpc('save_profile_blocks', {
        profile_id: pid,
        blocks: blocks as unknown as Record<string, unknown>[],
        is_draft: isDraft,
      });

      if (rpcError) {
        console.error('[useProfileBuilderData] Error al guardar bloques:', rpcError);
        throw rpcError;
      }
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: profileBuilderKeys.data(variables.profileId),
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
        console.error('[useProfileBuilderData] Error al publicar:', rpcError);
        throw rpcError;
      }
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: profileBuilderKeys.data(variables.profileId),
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
        console.error('[useProfileBuilderData] Error al generar token:', rpcError);
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
    saveBlocksMutation.mutate({ profileId, blocks, isDraft });
  };

  const saveBlocksAsync = (blocks: ProfileBlock[], isDraft: boolean) => {
    if (!profileId) return Promise.resolve();
    return saveBlocksMutation.mutateAsync({ profileId, blocks, isDraft });
  };

  const publishBlocks = () => {
    if (!profileId) return;
    publishMutation.mutate({ profileId });
  };

  const generatePreviewToken = () => {
    if (!profileId) return;
    generatePreviewTokenMutation.mutate({ profileId });
  };

  return {
    // Datos
    data,
    profile: data?.profile ?? null,
    blocks: data?.blocks ?? [],
    // Estados de carga
    isLoading,
    isError,
    error,
    isSaving: saveBlocksMutation.isPending,
    isPublishing: publishMutation.isPending,
    isGeneratingToken: generatePreviewTokenMutation.isPending,
    // Token de preview generado
    previewToken: generatePreviewTokenMutation.data ?? null,
    // Acciones
    saveBlocks,
    saveBlocksAsync,
    publishBlocks,
    generatePreviewToken,
    refetch,
  };
}
