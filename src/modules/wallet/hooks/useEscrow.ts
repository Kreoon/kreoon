import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type {
  EscrowHold,
  EscrowDisplay,
  EscrowStatus,
  CreateEscrowInput,
  AssignEditorInput,
  toEscrowDisplay,
} from '../types';
import type { Currency } from '../types/wallet.types';

interface UseEscrowOptions {
  organizationId?: string;
  contentId?: string;
  campaignId?: string;
  status?: EscrowStatus[];
}

export function useEscrows(options: UseEscrowOptions = {}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { organizationId, contentId, campaignId, status } = options;

  const {
    data: escrows,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['escrows', organizationId, contentId, campaignId, status],
    queryFn: async (): Promise<EscrowHold[]> => {
      let query = supabase
        .from('escrow_holds')
        .select('*')
        .order('created_at', { ascending: false });

      if (organizationId) {
        query = query.eq('organization_id', organizationId);
      }
      if (contentId) {
        query = query.eq('content_id', contentId);
      }
      if (campaignId) {
        query = query.eq('campaign_id', campaignId);
      }
      if (status && status.length > 0) {
        query = query.in('status', status);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as EscrowHold[];
    },
    enabled: !!(organizationId || contentId || campaignId),
    staleTime: 30 * 1000,
  });

  const refreshEscrows = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['escrows'] });
  }, [queryClient]);

  return {
    escrows: escrows || [],
    isLoading,
    error,
    refetch,
    refreshEscrows,
  };
}

// Hook para un escrow específico
export function useEscrow(escrowId: string | null, currency: Currency = 'USD') {
  const queryClient = useQueryClient();

  const {
    data: escrow,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['escrow', escrowId],
    queryFn: async (): Promise<EscrowDisplay | null> => {
      if (!escrowId) return null;

      const { data, error } = await supabase
        .from('escrow_holds')
        .select(`
          *,
          payer:payer_wallet_id (
            id,
            user_id,
            organization_id,
            wallet_type
          ),
          creator:creator_wallet_id (
            id,
            user_id
          ),
          editor:editor_wallet_id (
            id,
            user_id
          )
        `)
        .eq('id', escrowId)
        .single();

      if (error) throw error;
      return data ? toEscrowDisplay(data as EscrowHold, currency) : null;
    },
    enabled: !!escrowId,
    staleTime: 30 * 1000,
  });

  const refreshEscrow = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['escrow', escrowId] });
  }, [queryClient, escrowId]);

  return {
    escrow,
    isLoading,
    error,
    refetch,
    refreshEscrow,
  };
}

// Hook para escrow de un contenido específico
export function useContentEscrow(contentId: string | null, currency: Currency = 'USD') {
  const {
    data: escrow,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['escrow', 'content', contentId],
    queryFn: async (): Promise<EscrowDisplay | null> => {
      if (!contentId) return null;

      const { data, error } = await supabase
        .from('escrow_holds')
        .select('*')
        .eq('content_id', contentId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data ? toEscrowDisplay(data as EscrowHold, currency) : null;
    },
    enabled: !!contentId,
    staleTime: 30 * 1000,
  });

  return {
    escrow,
    isLoading,
    error,
    refetch,
  };
}

// Mutations para gestión de escrow (requieren service role, se ejecutan via edge function)
export function useEscrowMutations() {
  const queryClient = useQueryClient();

  // Crear un nuevo escrow
  const createEscrowMutation = useMutation({
    mutationFn: async (input: CreateEscrowInput): Promise<string> => {
      const { data, error } = await supabase.functions.invoke('wallet-create-escrow', {
        body: input,
      });

      if (error) throw error;
      return data.escrow_id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['escrows'] });
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      toast.success('Escrow creado exitosamente');
    },
    onError: (error: Error) => {
      console.error('Error creating escrow:', error);
      toast.error(`Error al crear escrow: ${error.message}`);
    },
  });

  // Asignar editor a un escrow
  const assignEditorMutation = useMutation({
    mutationFn: async (input: AssignEditorInput): Promise<boolean> => {
      const { data, error } = await supabase
        .from('escrow_holds')
        .update({
          editor_wallet_id: input.editor_wallet_id,
          editor_assigned_at: new Date().toISOString(),
          status: 'pending_editor',
        })
        .eq('id', input.escrow_id)
        .select()
        .single();

      if (error) throw error;
      return !!data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['escrows'] });
      queryClient.invalidateQueries({ queryKey: ['escrow'] });
      toast.success('Editor asignado al escrow');
    },
    onError: (error: Error) => {
      console.error('Error assigning editor:', error);
      toast.error(`Error al asignar editor: ${error.message}`);
    },
  });

  // Marcar contenido como entregado
  const markDeliveredMutation = useMutation({
    mutationFn: async (escrowId: string): Promise<boolean> => {
      const { data, error } = await supabase
        .from('escrow_holds')
        .update({
          content_delivered_at: new Date().toISOString(),
          status: 'pending_approval',
        })
        .eq('id', escrowId)
        .select()
        .single();

      if (error) throw error;
      return !!data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['escrows'] });
      queryClient.invalidateQueries({ queryKey: ['escrow'] });
      toast.success('Contenido marcado como entregado');
    },
    onError: (error: Error) => {
      console.error('Error marking delivered:', error);
      toast.error(`Error: ${error.message}`);
    },
  });

  // Liberar escrow (requiere edge function con service role)
  const releaseEscrowMutation = useMutation({
    mutationFn: async (escrowId: string): Promise<boolean> => {
      const { data, error } = await supabase.functions.invoke('wallet-release-escrow', {
        body: { escrow_id: escrowId },
      });

      if (error) throw error;
      return data.success;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['escrows'] });
      queryClient.invalidateQueries({ queryKey: ['escrow'] });
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast.success('Escrow liberado - pagos distribuidos');
    },
    onError: (error: Error) => {
      console.error('Error releasing escrow:', error);
      toast.error(`Error al liberar escrow: ${error.message}`);
    },
  });

  // Reembolsar escrow (requiere edge function con service role)
  const refundEscrowMutation = useMutation({
    mutationFn: async ({ escrowId, reason }: { escrowId: string; reason?: string }): Promise<boolean> => {
      const { data, error } = await supabase.functions.invoke('wallet-refund-escrow', {
        body: { escrow_id: escrowId, reason },
      });

      if (error) throw error;
      return data.success;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['escrows'] });
      queryClient.invalidateQueries({ queryKey: ['escrow'] });
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast.success('Escrow reembolsado');
    },
    onError: (error: Error) => {
      console.error('Error refunding escrow:', error);
      toast.error(`Error al reembolsar: ${error.message}`);
    },
  });

  return {
    createEscrow: createEscrowMutation.mutate,
    createEscrowAsync: createEscrowMutation.mutateAsync,
    isCreating: createEscrowMutation.isPending,

    assignEditor: assignEditorMutation.mutate,
    isAssigningEditor: assignEditorMutation.isPending,

    markDelivered: markDeliveredMutation.mutate,
    isMarkingDelivered: markDeliveredMutation.isPending,

    releaseEscrow: releaseEscrowMutation.mutate,
    isReleasing: releaseEscrowMutation.isPending,

    refundEscrow: refundEscrowMutation.mutate,
    isRefunding: refundEscrowMutation.isPending,
  };
}

// Hook para estadísticas de escrows
export function useEscrowStats(organizationId: string | null) {
  const {
    data: stats,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['escrows', 'stats', organizationId],
    queryFn: async () => {
      if (!organizationId) return null;

      const { data, error } = await supabase
        .from('escrow_holds')
        .select('status, total_amount')
        .eq('organization_id', organizationId);

      if (error) throw error;

      const escrows = (data || []) as Array<{ status: EscrowStatus; total_amount: number }>;

      const byStatus: Record<EscrowStatus, { count: number; amount: number }> = {
        active: { count: 0, amount: 0 },
        pending_editor: { count: 0, amount: 0 },
        pending_approval: { count: 0, amount: 0 },
        released: { count: 0, amount: 0 },
        partially_released: { count: 0, amount: 0 },
        refunded: { count: 0, amount: 0 },
        disputed: { count: 0, amount: 0 },
        cancelled: { count: 0, amount: 0 },
      };

      let totalHeld = 0;
      let totalReleased = 0;

      escrows.forEach(e => {
        byStatus[e.status].count++;
        byStatus[e.status].amount += e.total_amount;

        if (['active', 'pending_editor', 'pending_approval'].includes(e.status)) {
          totalHeld += e.total_amount;
        } else if (e.status === 'released') {
          totalReleased += e.total_amount;
        }
      });

      return {
        totalCount: escrows.length,
        totalHeld,
        totalReleased,
        byStatus,
      };
    },
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000,
  });

  return {
    stats,
    isLoading,
    error,
  };
}
