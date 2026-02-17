import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type {
  EscrowHold,
  CreateEscrowRequest,
  CreateEscrowResponse,
  FundEscrowResponse,
} from '@/types/unified-finance.types';

// ─── Helper: invoke edge function with auth ───
async function invokeEscrowService<T = any>(
  action: string,
  body?: Record<string, any>
): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('No autenticado');

  const { data, error } = await supabase.functions.invoke(`escrow-service/${action}`, {
    body: body || {},
    headers: { Authorization: `Bearer ${session.access_token}` },
  });

  if (error) throw new Error(error.message || `Error en ${action}`);
  if (data?.error) throw new Error(data.error);
  return data as T;
}

/**
 * Hook for managing escrow payments.
 * Connects to the escrow-service edge function.
 */
export function useUnifiedEscrow(projectId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = ['unified-escrow', user?.id, projectId];

  // ─── Get escrow for a specific project ───
  const {
    data: escrow,
    isLoading,
    refetch,
  } = useQuery({
    queryKey,
    queryFn: async (): Promise<EscrowHold | null> => {
      if (!projectId) return null;
      // Query directly from unified table
      const { data, error } = await (supabase as any)
        .from('escrow_holds')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('[useUnifiedEscrow] Fetch error:', error);
        return null;
      }
      return data;
    },
    enabled: !!user?.id && !!projectId,
    staleTime: 2 * 60 * 1000,
  });

  // ─── List all escrows for current user ───
  const {
    data: myEscrows = [],
    isLoading: listLoading,
    refetch: refetchList,
  } = useQuery({
    queryKey: ['unified-escrows-list', user?.id],
    queryFn: async (): Promise<EscrowHold[]> => {
      const { data, error } = await (supabase as any)
        .from('escrow_holds')
        .select('*')
        .eq('client_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error('[useUnifiedEscrow] List error:', error);
        return [];
      }
      return data || [];
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });

  // ─── Create Escrow ───
  const createMutation = useMutation({
    mutationFn: (req: CreateEscrowRequest) =>
      invokeEscrowService<CreateEscrowResponse>('create', req),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success('Escrow creado exitosamente');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Error al crear escrow');
    },
  });

  // ─── Fund Escrow (get Stripe PaymentIntent) ───
  const fundMutation = useMutation({
    mutationFn: (escrowId: string) =>
      invokeEscrowService<FundEscrowResponse>('fund', { escrow_id: escrowId }),
    onError: (err: Error) => {
      toast.error(err.message || 'Error al fondear escrow');
    },
  });

  // ─── Approve Delivery ───
  const approveMutation = useMutation({
    mutationFn: (escrowId: string) =>
      invokeEscrowService('approve', { escrow_id: escrowId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success('Entregable aprobado');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Error al aprobar');
    },
  });

  // ─── Release Funds ───
  const releaseMutation = useMutation({
    mutationFn: (params: { escrowId: string; milestoneId?: string }) =>
      invokeEscrowService('release', {
        escrow_id: params.escrowId,
        milestone_id: params.milestoneId,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success('Fondos liberados');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Error al liberar fondos');
    },
  });

  // ─── Open Dispute ───
  const disputeMutation = useMutation({
    mutationFn: (params: { escrowId: string; reason: string }) =>
      invokeEscrowService('dispute', {
        escrow_id: params.escrowId,
        reason: params.reason,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success('Disputa abierta');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Error al abrir disputa');
    },
  });

  // ─── Refund Escrow ───
  const refundMutation = useMutation({
    mutationFn: (params: { escrowId: string; reason: string; partialAmount?: number }) =>
      invokeEscrowService('refund', {
        escrow_id: params.escrowId,
        reason: params.reason,
        partial_amount: params.partialAmount,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success('Reembolso procesado');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Error al procesar reembolso');
    },
  });

  return {
    // Data
    escrow,
    myEscrows,

    // Loading states
    isLoading,
    listLoading,

    // Actions
    createEscrow: createMutation.mutateAsync,
    isCreating: createMutation.isPending,

    fundEscrow: fundMutation.mutateAsync,
    isFunding: fundMutation.isPending,

    approveDelivery: approveMutation.mutateAsync,
    isApproving: approveMutation.isPending,

    releaseFunds: releaseMutation.mutateAsync,
    isReleasing: releaseMutation.isPending,

    openDispute: disputeMutation.mutateAsync,
    isDisputing: disputeMutation.isPending,

    refundEscrow: refundMutation.mutateAsync,
    isRefunding: refundMutation.isPending,

    // Utils
    refetch,
    refetchList,
  };
}
