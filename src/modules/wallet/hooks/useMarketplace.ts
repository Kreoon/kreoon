// Marketplace Hooks - Contratación directa usuario ↔ creador/editor
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { marketplaceService } from '../services';
import type {
  MarketplaceContract,
  MarketplaceContractDeliverable,
  MarketplaceContractMessage,
  MarketplaceContractStatus,
  MarketplaceContractDisplay,
  CreateContractInput,
  SubmitDeliveryInput,
  RequestRevisionInput,
  DeliverableFile,
} from '../types';
import {
  calculateMarketplaceFee,
  calculateContractProgress,
  CONTRACT_STATUS_LABELS,
  CONTRACT_STATUS_COLORS,
  CONTRACT_STATUS_ICONS,
} from '../types';

// ========================================
// CONTRATOS
// ========================================

/**
 * Hook para obtener contrato por ID
 */
export function useContract(contractId: string | undefined) {
  return useQuery({
    queryKey: ['marketplace-contract', contractId],
    queryFn: () => marketplaceService.getContract(contractId!),
    enabled: !!contractId,
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Hook para obtener contratos del usuario
 */
export function useUserContracts(
  userId: string | undefined,
  filters?: {
    role?: 'client' | 'provider' | 'all';
    status?: MarketplaceContractStatus | MarketplaceContractStatus[];
    limit?: number;
  }
) {
  return useQuery({
    queryKey: ['marketplace-user-contracts', userId, filters],
    queryFn: () => marketplaceService.getUserContracts(userId!, filters),
    enabled: !!userId,
    staleTime: 60 * 1000, // 1 minute
  });
}

/**
 * Hook para crear contrato
 */
export function useCreateContract() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      clientUserId,
      input,
    }: {
      clientUserId: string;
      input: CreateContractInput;
    }) => marketplaceService.createContract(clientUserId, input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['marketplace-user-contracts', variables.clientUserId],
      });
    },
  });
}

/**
 * Hook para iniciar proceso de pago
 */
export function useInitiatePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      contractId,
      clientUserId,
    }: {
      contractId: string;
      clientUserId: string;
    }) => marketplaceService.initiatePayment(contractId, clientUserId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['marketplace-contract', variables.contractId],
      });
      queryClient.invalidateQueries({
        queryKey: ['marketplace-user-contracts', variables.clientUserId],
      });
    },
  });
}

/**
 * Hook para activar contrato (después de pago)
 */
export function useActivateContract() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      contractId,
      escrowId,
    }: {
      contractId: string;
      escrowId?: string;
    }) => marketplaceService.activateContract(contractId, escrowId),
    onSuccess: (data) => {
      if (data) {
        queryClient.invalidateQueries({
          queryKey: ['marketplace-contract', data.id],
        });
        queryClient.invalidateQueries({
          queryKey: ['marketplace-user-contracts'],
        });
      }
    },
  });
}

// ========================================
// ENTREGABLES
// ========================================

/**
 * Hook para obtener entregables del contrato
 */
export function useDeliverables(contractId: string | undefined) {
  return useQuery({
    queryKey: ['marketplace-deliverables', contractId],
    queryFn: () => marketplaceService.getDeliverables(contractId!),
    enabled: !!contractId,
    staleTime: 30 * 1000,
  });
}

/**
 * Hook para enviar entrega
 */
export function useSubmitDelivery() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      providerUserId,
      input,
    }: {
      providerUserId: string;
      input: SubmitDeliveryInput;
    }) => marketplaceService.submitDelivery(providerUserId, input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['marketplace-deliverables', variables.input.contractId],
      });
      queryClient.invalidateQueries({
        queryKey: ['marketplace-contract', variables.input.contractId],
      });
    },
  });
}

/**
 * Hook para aprobar entregable
 */
export function useApproveDeliverable() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      clientUserId,
      contractId,
      deliverableId,
    }: {
      clientUserId: string;
      contractId: string;
      deliverableId: string;
    }) => marketplaceService.approveDeliverable(clientUserId, contractId, deliverableId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['marketplace-deliverables', variables.contractId],
      });
      queryClient.invalidateQueries({
        queryKey: ['marketplace-contract', variables.contractId],
      });
    },
  });
}

/**
 * Hook para solicitar revisión
 */
export function useRequestRevision() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      clientUserId,
      input,
    }: {
      clientUserId: string;
      input: RequestRevisionInput;
    }) => marketplaceService.requestRevision(clientUserId, input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['marketplace-deliverables', variables.input.contractId],
      });
      queryClient.invalidateQueries({
        queryKey: ['marketplace-contract', variables.input.contractId],
      });
    },
  });
}

// ========================================
// FINALIZACIÓN
// ========================================

/**
 * Hook para completar contrato
 */
export function useCompleteContract() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      clientUserId,
      contractId,
      rating,
      review,
    }: {
      clientUserId: string;
      contractId: string;
      rating?: number;
      review?: string;
    }) => marketplaceService.completeContract(clientUserId, contractId, rating, review),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['marketplace-contract', variables.contractId],
      });
      queryClient.invalidateQueries({
        queryKey: ['marketplace-user-contracts', variables.clientUserId],
      });
    },
  });
}

/**
 * Hook para cancelar contrato
 */
export function useCancelContract() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      userId,
      contractId,
    }: {
      userId: string;
      contractId: string;
    }) => marketplaceService.cancelContract(userId, contractId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['marketplace-contract', variables.contractId],
      });
      queryClient.invalidateQueries({
        queryKey: ['marketplace-user-contracts', variables.userId],
      });
    },
  });
}

/**
 * Hook para abrir disputa
 */
export function useOpenDispute() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      userId,
      contractId,
      reason,
    }: {
      userId: string;
      contractId: string;
      reason: string;
    }) => marketplaceService.openDispute(userId, contractId, reason),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['marketplace-contract', variables.contractId],
      });
      queryClient.invalidateQueries({
        queryKey: ['marketplace-messages', variables.contractId],
      });
    },
  });
}

// ========================================
// MENSAJES
// ========================================

/**
 * Hook para obtener mensajes del contrato
 */
export function useContractMessages(contractId: string | undefined) {
  return useQuery({
    queryKey: ['marketplace-messages', contractId],
    queryFn: () => marketplaceService.getMessages(contractId!),
    enabled: !!contractId,
    staleTime: 10 * 1000, // 10 seconds - mensajes se refrescan más seguido
    refetchInterval: 30 * 1000, // Refetch cada 30 segundos
  });
}

/**
 * Hook para enviar mensaje
 */
export function useSendContractMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      senderId,
      contractId,
      message,
      attachments,
    }: {
      senderId: string;
      contractId: string;
      message: string;
      attachments?: DeliverableFile[];
    }) => marketplaceService.sendMessage(senderId, contractId, message, attachments),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['marketplace-messages', variables.contractId],
      });
    },
  });
}

// ========================================
// CALIFICACIONES
// ========================================

/**
 * Hook para que el proveedor califique al cliente
 */
export function useRateClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      providerUserId,
      contractId,
      rating,
      review,
    }: {
      providerUserId: string;
      contractId: string;
      rating: number;
      review?: string;
    }) => marketplaceService.rateClient(providerUserId, contractId, rating, review),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['marketplace-contract', variables.contractId],
      });
    },
  });
}

// ========================================
// HELPERS Y TRANSFORMADORES
// ========================================

/**
 * Transforma un contrato a formato display
 */
export function toContractDisplay(
  contract: MarketplaceContract,
  formatCurrency: (amount: number, currency: string) => string
): MarketplaceContractDisplay {
  return {
    ...contract,
    formattedAmount: formatCurrency(contract.total_amount, contract.currency),
    formattedProviderAmount: formatCurrency(contract.provider_amount, contract.currency),
    formattedFee: formatCurrency(contract.platform_fee_amount, contract.currency),
    statusLabel: CONTRACT_STATUS_LABELS[contract.status],
    statusColor: CONTRACT_STATUS_COLORS[contract.status],
    statusIcon: CONTRACT_STATUS_ICONS[contract.status],
    progressPercentage: calculateContractProgress(contract),
  };
}

/**
 * Hook para obtener helpers de contrato
 */
export function useContractHelpers() {
  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(amount);
  };

  return {
    formatCurrency,
    calculateFee: calculateMarketplaceFee,
    calculateProgress: calculateContractProgress,
    toDisplay: (contract: MarketplaceContract) => toContractDisplay(contract, formatCurrency),
  };
}

// ========================================
// HOOKS COMBINADOS
// ========================================

/**
 * Hook completo para un contrato específico
 */
export function useContractFull(contractId: string | undefined) {
  const contract = useContract(contractId);
  const deliverables = useDeliverables(contractId);
  const messages = useContractMessages(contractId);
  const helpers = useContractHelpers();

  return {
    contract: contract.data,
    contractDisplay: contract.data ? helpers.toDisplay(contract.data) : null,
    deliverables: deliverables.data || [],
    messages: messages.data || [],
    isLoading: contract.isLoading || deliverables.isLoading,
    isError: contract.isError || deliverables.isError,
    refetch: () => {
      contract.refetch();
      deliverables.refetch();
      messages.refetch();
    },
    helpers,
  };
}

/**
 * Hook para contratos del usuario como cliente
 */
export function useClientContracts(userId: string | undefined) {
  return useUserContracts(userId, { role: 'client' });
}

/**
 * Hook para contratos del usuario como proveedor
 */
export function useProviderContracts(userId: string | undefined) {
  return useUserContracts(userId, { role: 'provider' });
}

/**
 * Hook para contratos activos (en progreso)
 */
export function useActiveContracts(userId: string | undefined) {
  return useUserContracts(userId, {
    status: ['active', 'delivered', 'revision'],
  });
}

/**
 * Hook para contratos pendientes de pago
 */
export function usePendingPaymentContracts(userId: string | undefined) {
  return useUserContracts(userId, {
    role: 'client',
    status: 'pending_payment',
  });
}

/**
 * Hook para estadísticas de marketplace del usuario
 */
export function useMarketplaceStats(userId: string | undefined) {
  const clientContracts = useClientContracts(userId);
  const providerContracts = useProviderContracts(userId);

  const calculateStats = () => {
    const asClient = clientContracts.data || [];
    const asProvider = providerContracts.data || [];

    return {
      // Como cliente
      totalSpent: asClient
        .filter(c => c.status === 'completed')
        .reduce((sum, c) => sum + c.total_amount, 0),
      activeAsClient: asClient.filter(c => ['active', 'delivered', 'revision'].includes(c.status)).length,
      completedAsClient: asClient.filter(c => c.status === 'completed').length,

      // Como proveedor
      totalEarned: asProvider
        .filter(c => c.status === 'completed')
        .reduce((sum, c) => sum + c.provider_amount, 0),
      activeAsProvider: asProvider.filter(c => ['active', 'delivered', 'revision'].includes(c.status)).length,
      completedAsProvider: asProvider.filter(c => c.status === 'completed').length,

      // Rating promedio (como proveedor)
      averageRating: (() => {
        const rated = asProvider.filter(c => c.client_rating !== null);
        if (rated.length === 0) return null;
        return rated.reduce((sum, c) => sum + (c.client_rating || 0), 0) / rated.length;
      })(),
    };
  };

  return {
    stats: calculateStats(),
    isLoading: clientContracts.isLoading || providerContracts.isLoading,
    isError: clientContracts.isError || providerContracts.isError,
  };
}
