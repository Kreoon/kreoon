import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { UnifiedTalentMember } from '@/types/unifiedTalent.types';
import { MARKETPLACE_CREATORS_QUERY_KEY } from '@/hooks/useMarketplaceCreators';

export function useUnifiedTalent(orgId: string | undefined) {
  return useQuery({
    queryKey: ['unified-talent', orgId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_unified_talent', {
        p_org_id: orgId!,
      });
      if (error) throw error;
      return (data || []) as unknown as UnifiedTalentMember[];
    },
    enabled: !!orgId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useToggleAmbassador(orgId: string | undefined) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ userId, currentlyAmbassador }: { userId: string; currentlyAmbassador: boolean }) => {
      if (!orgId) throw new Error('No org');
      const newStatus = !currentlyAmbassador;

      // FASE5 Bloque C: antes eran 4 escrituras secuenciales sin transaccion
      // (profiles, organization_member_badges, organization_members,
      // organization_member_roles). Ahora todo corre atomico en un solo RPC
      // (mismo usado en CreatorsContent.tsx).
      const { data, error } = await (supabase as any).rpc('toggle_ambassador_status', {
        p_organization_id: orgId,
        p_user_id: userId,
        p_new_status: newStatus,
      });
      if (error) throw error;
      if (data && data.success === false) throw new Error(data.error || 'Failed');

      return { newStatus, userId };
    },
    onSuccess: ({ newStatus, userId }) => {
      queryClient.invalidateQueries({ queryKey: ['unified-talent', orgId] });
      // Find the member name from cache for the toast
      const cached = queryClient.getQueryData<UnifiedTalentMember[]>(['unified-talent', orgId]);
      const member = cached?.find(m => m.id === userId);
      const name = member?.full_name || 'Miembro';
      toast({
        description: newStatus
          ? `${name} es ahora embajador!`
          : `${name} ya no es embajador`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: `No se pudo actualizar el estado de embajador: ${error.message}`,
        variant: 'destructive',
      });
    },
  });
}

export function useSetMarketplacePause(orgId: string | undefined) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      creatorProfileId,
      pausedUntil,
      permanent,
    }: {
      creatorProfileId: string;
      pausedUntil: string | null;
      permanent: boolean;
    }) => {
      const isActive = !permanent && pausedUntil === null;
      const { error } = await supabase.rpc('set_creator_marketplace_pause', {
        p_creator_profile_id: creatorProfileId,
        p_is_active:          isActive,
        p_paused_until:       pausedUntil,
      });
      if (error) throw error;
      return { pausedUntil, permanent };
    },
    onSuccess: ({ pausedUntil, permanent }) => {
      queryClient.invalidateQueries({ queryKey: ['unified-talent', orgId] });
      queryClient.invalidateQueries({ queryKey: MARKETPLACE_CREATORS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['marketplace-explore'] });
      queryClient.invalidateQueries({ queryKey: ['marketplace-search'] });
      const msg = permanent
        ? 'Talento desactivado del marketplace permanentemente'
        : pausedUntil
        ? `Talento pausado hasta ${new Date(pausedUntil).toLocaleDateString('es-CO')}`
        : 'Talento reactivado en el marketplace';
      toast({ description: msg });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
