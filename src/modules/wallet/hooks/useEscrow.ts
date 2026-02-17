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
  toEscrowDisplay,
} from '../types';
import type { Currency } from '../types/wallet.types';

// Helper to invoke escrow-service edge function with auth
async function invokeEscrowService<T = any>(
  action: string,
  body: Record<string, any>
): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('No autenticado');

  const { data, error } = await supabase.functions.invoke(`escrow-service/${action}`, {
    body,
    headers: { Authorization: `Bearer ${session.access_token}` },
  });

  if (error) throw new Error(error.message || `Error en escrow/${action}`);
  if (data?.error) throw new Error(data.error);
  return data as T;
}

interface UseEscrowOptions {
  organizationId?: string;
  projectId?: string;
  status?: EscrowStatus[];
}

export function useEscrows(options: UseEscrowOptions = {}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { organizationId, projectId, status } = options;

  const {
    data: escrows,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['escrows', organizationId, projectId, status],
    queryFn: async (): Promise<EscrowHold[]> => {
      let query = supabase
        .from('escrow_holds')
        .select('*')
        .order('created_at', { ascending: false });

      if (organizationId) {
        query = query.eq('organization_id', organizationId);
      }
      if (projectId) {
        query = query.eq('project_id', projectId);
      }
      if (status && status.length > 0) {
        query = query.in('status', status);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as EscrowHold[];
    },
    enabled: !!(organizationId || projectId),
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
          client_wallet:client_wallet_id (
            id,
            user_id,
            organization_id,
            wallet_type
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

// Hook para escrow de un proyecto específico
export function useProjectEscrow(projectId: string | null, currency: Currency = 'USD') {
  const {
    data: escrow,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['escrow', 'project', projectId],
    queryFn: async (): Promise<EscrowDisplay | null> => {
      if (!projectId) return null;

      const { data, error } = await supabase
        .from('escrow_holds')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data ? toEscrowDisplay(data as EscrowHold, currency) : null;
    },
    enabled: !!projectId,
    staleTime: 30 * 1000,
  });

  return {
    escrow,
    isLoading,
    error,
    refetch,
  };
}

// Mutations para gestión de escrow (via escrow-service edge function)
export function useEscrowMutations() {
  const queryClient = useQueryClient();

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['escrows'] });
    queryClient.invalidateQueries({ queryKey: ['escrow'] });
    queryClient.invalidateQueries({ queryKey: ['wallet'] });
    queryClient.invalidateQueries({ queryKey: ['transactions'] });
  };

  // Crear un nuevo escrow
  const createEscrowMutation = useMutation({
    mutationFn: async (input: CreateEscrowInput): Promise<string> => {
      const data = await invokeEscrowService('create', input);
      return data.escrow_id;
    },
    onSuccess: () => {
      invalidateAll();
      toast.success('Escrow creado exitosamente');
    },
    onError: (error: Error) => {
      console.error('Error creating escrow:', error);
      toast.error(`Error al crear escrow: ${error.message}`);
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

  // Aprobar escrow (via edge function)
  const approveEscrowMutation = useMutation({
    mutationFn: async (escrowId: string): Promise<boolean> => {
      const data = await invokeEscrowService('approve', { escrow_id: escrowId });
      return data.success;
    },
    onSuccess: () => {
      invalidateAll();
      toast.success('Escrow aprobado');
    },
    onError: (error: Error) => {
      console.error('Error approving escrow:', error);
      toast.error(`Error al aprobar escrow: ${error.message}`);
    },
  });

  // Liberar escrow (via edge function)
  const releaseEscrowMutation = useMutation({
    mutationFn: async ({ escrowId, milestoneId }: { escrowId: string; milestoneId?: string }): Promise<boolean> => {
      const data = await invokeEscrowService('release', {
        escrow_id: escrowId,
        milestone_id: milestoneId,
      });
      return data.success;
    },
    onSuccess: () => {
      invalidateAll();
      toast.success('Escrow liberado - pagos distribuidos');
    },
    onError: (error: Error) => {
      console.error('Error releasing escrow:', error);
      toast.error(`Error al liberar escrow: ${error.message}`);
    },
  });

  // Reembolsar escrow (via edge function)
  const refundEscrowMutation = useMutation({
    mutationFn: async ({ escrowId, reason }: { escrowId: string; reason?: string }): Promise<boolean> => {
      const data = await invokeEscrowService('refund', {
        escrow_id: escrowId,
        reason,
      });
      return data.success;
    },
    onSuccess: () => {
      invalidateAll();
      toast.success('Escrow reembolsado');
    },
    onError: (error: Error) => {
      console.error('Error refunding escrow:', error);
      toast.error(`Error al reembolsar: ${error.message}`);
    },
  });

  // Disputar escrow (via edge function)
  const disputeEscrowMutation = useMutation({
    mutationFn: async ({ escrowId, reason }: { escrowId: string; reason: string }): Promise<boolean> => {
      const data = await invokeEscrowService('dispute', {
        escrow_id: escrowId,
        reason,
      });
      return data.success;
    },
    onSuccess: () => {
      invalidateAll();
      toast.success('Disputa iniciada');
    },
    onError: (error: Error) => {
      console.error('Error disputing escrow:', error);
      toast.error(`Error al iniciar disputa: ${error.message}`);
    },
  });

  return {
    createEscrow: createEscrowMutation.mutate,
    createEscrowAsync: createEscrowMutation.mutateAsync,
    isCreating: createEscrowMutation.isPending,

    markDelivered: markDeliveredMutation.mutate,
    isMarkingDelivered: markDeliveredMutation.isPending,

    approveEscrow: approveEscrowMutation.mutate,
    isApproving: approveEscrowMutation.isPending,

    releaseEscrow: releaseEscrowMutation.mutate,
    isReleasing: releaseEscrowMutation.isPending,

    refundEscrow: refundEscrowMutation.mutate,
    isRefunding: refundEscrowMutation.isPending,

    disputeEscrow: disputeEscrowMutation.mutate,
    isDisputing: disputeEscrowMutation.isPending,
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
