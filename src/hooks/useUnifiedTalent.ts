import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
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
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ userId, currentlyAmbassador }: { userId: string; currentlyAmbassador: boolean }) => {
      if (!orgId) throw new Error('No org');
      const newStatus = !currentlyAmbassador;
      const newLevel = newStatus ? 'bronze' : 'none';

      // Update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          is_ambassador: newStatus,
          ambassador_celebration_pending: newStatus,
        })
        .eq('id', userId);
      if (profileError) throw profileError;

      // Upsert/deactivate badge
      if (newStatus) {
        const { error: badgeError } = await supabase
          .from('organization_member_badges')
          .upsert(
            {
              organization_id: orgId,
              user_id: userId,
              badge: 'ambassador',
              level: 'bronze',
              is_active: true,
              granted_at: new Date().toISOString(),
              granted_by: user?.id || null,
            },
            { onConflict: 'organization_id,user_id,badge' }
          );
        if (badgeError) throw badgeError;
      } else {
        const { error: badgeError } = await supabase
          .from('organization_member_badges')
          .update({
            is_active: false,
            revoked_at: new Date().toISOString(),
            revoked_by: user?.id || null,
          })
          .eq('organization_id', orgId)
          .eq('user_id', userId)
          .eq('badge', 'ambassador');
        if (badgeError) throw badgeError;
      }

      // Update member level
      const { error: memberError } = await supabase
        .from('organization_members')
        .update({ ambassador_level: newLevel })
        .eq('organization_id', orgId)
        .eq('user_id', userId);
      if (memberError) throw memberError;

      // Upsert/remove ambassador role
      if (newStatus) {
        const { error: roleError } = await supabase
          .from('organization_member_roles')
          .upsert(
            { organization_id: orgId, user_id: userId, role: 'ambassador' },
            { onConflict: 'organization_id,user_id,role' }
          );
        if (roleError) throw roleError;
      } else {
        const { error: roleError } = await supabase
          .from('organization_member_roles')
          .delete()
          .eq('organization_id', orgId)
          .eq('user_id', userId)
          .eq('role', 'ambassador');
        if (roleError) throw roleError;
      }

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
