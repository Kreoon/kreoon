import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type {
  MarketplaceProposal,
  MarketplaceProposalInput,
  ProposalStatus,
  ProposalMessage,
} from '@/types/marketplace';

type ProposalRole = 'client' | 'provider' | 'all';

interface UseMarketplaceProposalsOptions {
  role?: ProposalRole;
  status?: ProposalStatus | ProposalStatus[];
}

export function useMarketplaceProposals(options: UseMarketplaceProposalsOptions = {}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { role = 'all', status } = options;

  // Fetch proposals
  const {
    data: proposals = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['marketplace-proposals', user?.id, role, status],
    queryFn: async () => {
      if (!user?.id) return [];

      let query = (supabase as any)
        .from('marketplace_proposals')
        .select(`
          *,
          client:profiles!client_id (id, full_name, avatar_url, username),
          provider:profiles!provider_id (id, full_name, avatar_url, username),
          service:creator_services (id, title, service_type, price_amount, price_type)
        `)
        .order('created_at', { ascending: false });

      // Filter by role
      if (role === 'client') {
        query = query.eq('client_id', user.id);
      } else if (role === 'provider') {
        query = query.eq('provider_id', user.id);
      } else {
        query = query.or(`client_id.eq.${user.id},provider_id.eq.${user.id}`);
      }

      // Filter by status
      if (status) {
        if (Array.isArray(status)) {
          query = query.in('status', status);
        } else {
          query = query.eq('status', status);
        }
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map((p: any) => ({
        ...p,
        attachments: p.attachments || [],
      })) as MarketplaceProposal[];
    },
    enabled: !!user?.id,
  });

  // Create proposal
  const createMutation = useMutation({
    mutationFn: async (input: MarketplaceProposalInput) => {
      if (!user?.id) throw new Error('No autenticado');

      const { data, error } = await (supabase as any)
        .from('marketplace_proposals')
        .insert({
          client_id: user.id,
          ...input,
          attachments: input.attachments || [],
          status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;

      // Create notification for provider
      await (supabase as any)
        .from('marketplace_notifications')
        .insert({
          user_id: input.provider_id,
          actor_id: user.id,
          notification_type: 'new_proposal',
          entity_type: 'proposal',
          entity_id: data.id,
          message: `Nueva propuesta: ${input.title}`,
        });

      return data as MarketplaceProposal;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketplace-proposals'] });
      toast.success('Propuesta enviada exitosamente');
    },
    onError: (error: Error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  // Update proposal status
  const updateStatusMutation = useMutation({
    mutationFn: async ({
      proposalId,
      status,
      response,
      counterOffer,
    }: {
      proposalId: string;
      status: ProposalStatus;
      response?: string;
      counterOffer?: { amount: number; deadline?: string };
    }) => {
      if (!user?.id) throw new Error('No autenticado');

      const updateData: any = {
        status,
        updated_at: new Date().toISOString(),
      };

      if (response) {
        updateData.provider_response = response;
        updateData.responded_at = new Date().toISOString();
      }

      if (counterOffer) {
        updateData.counter_offer_amount = counterOffer.amount;
        updateData.counter_offer_deadline = counterOffer.deadline || null;
      }

      const { data, error } = await (supabase as any)
        .from('marketplace_proposals')
        .update(updateData)
        .eq('id', proposalId)
        .select(`
          *,
          client:profiles!client_id (id, full_name),
          provider:profiles!provider_id (id, full_name)
        `)
        .single();

      if (error) throw error;

      // Create notification
      const isProvider = data.provider_id === user.id;
      const notifyUserId = isProvider ? data.client_id : data.provider_id;

      let notificationType: string;
      let message: string;

      switch (status) {
        case 'accepted':
          notificationType = 'proposal_accepted';
          message = `Tu propuesta "${data.title}" fue aceptada`;
          break;
        case 'declined':
          notificationType = 'proposal_declined';
          message = `Tu propuesta "${data.title}" fue rechazada`;
          break;
        case 'interested':
          notificationType = 'new_message';
          message = `${data.provider.full_name} está interesado en tu propuesta`;
          break;
        default:
          notificationType = 'new_message';
          message = `Actualización en propuesta: ${data.title}`;
      }

      await (supabase as any)
        .from('marketplace_notifications')
        .insert({
          user_id: notifyUserId,
          actor_id: user.id,
          notification_type: notificationType,
          entity_type: 'proposal',
          entity_id: proposalId,
          message,
        });

      return data as MarketplaceProposal;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['marketplace-proposals'] });
      queryClient.invalidateQueries({ queryKey: ['marketplace-proposal', variables.proposalId] });

      const statusMessages: Record<ProposalStatus, string> = {
        interested: 'Marcado como interesado',
        negotiating: 'Propuesta en negociación',
        accepted: 'Propuesta aceptada',
        declined: 'Propuesta rechazada',
        withdrawn: 'Propuesta retirada',
        viewed: '',
        pending: '',
        expired: '',
      };

      if (statusMessages[variables.status]) {
        toast.success(statusMessages[variables.status]);
      }
    },
    onError: (error: Error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  // Mark as viewed
  const markAsViewed = useCallback(async (proposalId: string) => {
    if (!user?.id) return;

    await (supabase as any)
      .from('marketplace_proposals')
      .update({
        status: 'viewed',
        viewed_at: new Date().toISOString(),
      })
      .eq('id', proposalId)
      .eq('provider_id', user.id)
      .eq('status', 'pending');

    queryClient.invalidateQueries({ queryKey: ['marketplace-proposals'] });
  }, [user?.id, queryClient]);

  // Withdraw proposal (client only)
  const withdrawProposal = useCallback(async (proposalId: string) => {
    await updateStatusMutation.mutateAsync({
      proposalId,
      status: 'withdrawn',
    });
  }, [updateStatusMutation]);

  // Get counts by status
  const getCounts = useCallback(() => {
    const counts: Record<ProposalStatus, number> = {
      pending: 0,
      viewed: 0,
      interested: 0,
      negotiating: 0,
      accepted: 0,
      declined: 0,
      expired: 0,
      withdrawn: 0,
    };

    proposals.forEach((p) => {
      counts[p.status]++;
    });

    return counts;
  }, [proposals]);

  // Get pending count
  const pendingCount = proposals.filter(
    (p) => ['pending', 'viewed', 'interested', 'negotiating'].includes(p.status)
  ).length;

  return {
    proposals,
    isLoading,
    error,
    refetch,
    createProposal: createMutation.mutateAsync,
    updateStatus: updateStatusMutation.mutateAsync,
    markAsViewed,
    withdrawProposal,
    getCounts,
    pendingCount,
    isCreating: createMutation.isPending,
    isUpdating: updateStatusMutation.isPending,
  };
}

// Hook for a single proposal
export function useMarketplaceProposal(proposalId: string | undefined) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const {
    data: proposal,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['marketplace-proposal', proposalId],
    queryFn: async () => {
      if (!proposalId) return null;

      const { data, error } = await (supabase as any)
        .from('marketplace_proposals')
        .select(`
          *,
          client:profiles!client_id (id, full_name, avatar_url, username, bio),
          provider:profiles!provider_id (id, full_name, avatar_url, username, bio),
          service:creator_services (*)
        `)
        .eq('id', proposalId)
        .single();

      if (error) throw error;

      return {
        ...data,
        attachments: data.attachments || [],
      } as MarketplaceProposal;
    },
    enabled: !!proposalId,
  });

  // Fetch messages
  const {
    data: messages = [],
    isLoading: messagesLoading,
    refetch: refetchMessages,
  } = useQuery({
    queryKey: ['proposal-messages', proposalId],
    queryFn: async () => {
      if (!proposalId) return [];

      const { data, error } = await (supabase as any)
        .from('marketplace_proposal_messages')
        .select(`
          *,
          sender:profiles!sender_id (id, full_name, avatar_url)
        `)
        .eq('proposal_id', proposalId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      return (data || []).map((m: any) => ({
        ...m,
        attachments: m.attachments || [],
      })) as ProposalMessage[];
    },
    enabled: !!proposalId,
  });

  // Send message
  const sendMessageMutation = useMutation({
    mutationFn: async ({
      message,
      attachments = [],
    }: {
      message: string;
      attachments?: any[];
    }) => {
      if (!user?.id || !proposalId) throw new Error('No autenticado');

      const { data, error } = await (supabase as any)
        .from('marketplace_proposal_messages')
        .insert({
          proposal_id: proposalId,
          sender_id: user.id,
          message,
          attachments,
        })
        .select(`
          *,
          sender:profiles!sender_id (id, full_name, avatar_url)
        `)
        .single();

      if (error) throw error;

      // Notify other party
      if (proposal) {
        const notifyUserId = proposal.client_id === user.id
          ? proposal.provider_id
          : proposal.client_id;

        await (supabase as any)
          .from('marketplace_notifications')
          .insert({
            user_id: notifyUserId,
            actor_id: user.id,
            notification_type: 'new_message',
            entity_type: 'proposal',
            entity_id: proposalId,
            message: 'Nuevo mensaje en propuesta',
          });
      }

      return data as ProposalMessage;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposal-messages', proposalId] });
    },
    onError: (error: Error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  // Realtime subscription for messages
  useEffect(() => {
    if (!proposalId) return;

    const channel = supabase
      .channel(`proposal-messages-${proposalId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'marketplace_proposal_messages',
          filter: `proposal_id=eq.${proposalId}`,
        },
        () => {
          refetchMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [proposalId, refetchMessages]);

  return {
    proposal,
    messages,
    isLoading,
    messagesLoading,
    error,
    refetch,
    refetchMessages,
    sendMessage: sendMessageMutation.mutateAsync,
    isSending: sendMessageMutation.isPending,
  };
}
