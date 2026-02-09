import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { MarketplaceOrgInvitation } from '@/components/marketplace/types/marketplace';

export function useOrgSentInvitations(organizationId: string | null) {
  const { data: invitations = [], isLoading: loading } = useQuery({
    queryKey: ['org-sent-invitations', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await (supabase as any)
        .from('marketplace_org_invitations')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });
      if (error) throw error;

      // Fetch creator profiles
      const invData = data || [];
      if (invData.length === 0) return [];

      const userIds = invData.map((i: any) => i.creator_user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', userIds);

      const profileMap = new Map((profiles || []).map(p => [p.id, p]));

      return invData.map((inv: any) => ({
        ...inv,
        creator: profileMap.get(inv.creator_user_id) || null,
      })) as MarketplaceOrgInvitation[];
    },
    enabled: !!organizationId,
  });

  return { invitations, loading };
}

export function useCreatorReceivedInvitations(userId: string | undefined) {
  const { data: invitations = [], isLoading: loading } = useQuery({
    queryKey: ['creator-received-invitations', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await (supabase as any)
        .from('marketplace_org_invitations')
        .select('*')
        .eq('creator_user_id', userId)
        .order('created_at', { ascending: false });
      if (error) throw error;

      // Fetch org info
      const invData = data || [];
      if (invData.length === 0) return [];

      const orgIds = [...new Set(invData.map((i: any) => i.organization_id))];
      const { data: orgs } = await (supabase as any)
        .from('organizations')
        .select('id, name, logo_url')
        .in('id', orgIds);

      const orgMap = new Map((orgs || []).map((o: any) => [o.id, o]));

      return invData.map((inv: any) => ({
        ...inv,
        organization: orgMap.get(inv.organization_id) || null,
      })) as MarketplaceOrgInvitation[];
    },
    enabled: !!userId,
  });

  return { invitations, loading };
}

/** Send a recruitment invitation via the send-recruitment edge function */
export function useSendRecruitment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      creator_user_id: string;
      proposed_role: string;
      message?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke('send-recruitment', {
        body: input,
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      toast.success('Invitación de reclutamiento enviada');
      queryClient.invalidateQueries({ queryKey: ['org-sent-invitations'] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Error al enviar invitación');
    },
  });
}

/** Accept a received recruitment invitation */
export function useAcceptRecruitment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (invitationId: string) => {
      const { error } = await (supabase as any)
        .from('marketplace_org_invitations')
        .update({ status: 'accepted' })
        .eq('id', invitationId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Invitación aceptada. Te has unido a la organización.');
      queryClient.invalidateQueries({ queryKey: ['creator-received-invitations'] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Error al aceptar invitación');
    },
  });
}

/** Decline a received recruitment invitation */
export function useDeclineRecruitment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { invitationId: string; responseMessage?: string }) => {
      const { error } = await (supabase as any)
        .from('marketplace_org_invitations')
        .update({
          status: 'declined',
          response_message: input.responseMessage || null,
          responded_at: new Date().toISOString(),
        })
        .eq('id', input.invitationId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Invitación rechazada');
      queryClient.invalidateQueries({ queryKey: ['creator-received-invitations'] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Error al rechazar invitación');
    },
  });
}

/** Cancel a sent recruitment invitation */
export function useCancelRecruitment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (invitationId: string) => {
      const { error } = await (supabase as any)
        .from('marketplace_org_invitations')
        .update({ status: 'cancelled' })
        .eq('id', invitationId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Invitación cancelada');
      queryClient.invalidateQueries({ queryKey: ['org-sent-invitations'] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Error al cancelar invitación');
    },
  });
}

/** Check if current org already has a pending invitation for a given creator */
export function useHasPendingInvitation(organizationId: string | null, creatorUserId: string | undefined) {
  const { data: hasPending = false } = useQuery({
    queryKey: ['has-pending-invitation', organizationId, creatorUserId],
    queryFn: async () => {
      if (!organizationId || !creatorUserId) return false;
      const { data, error } = await (supabase as any)
        .from('marketplace_org_invitations')
        .select('id')
        .eq('organization_id', organizationId)
        .eq('creator_user_id', creatorUserId)
        .eq('status', 'pending')
        .maybeSingle();
      if (error) return false;
      return !!data;
    },
    enabled: !!organizationId && !!creatorUserId,
  });

  return hasPending;
}
