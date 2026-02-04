// Organization Payments Hooks - Gestión de pagos internos de organizaciones
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { organizationPaymentsService } from '../services';
import type {
  OrganizationPaymentSettings,
  OrganizationPaymentGateway,
  OrganizationPayoutMethod,
  OrganizationClientPayment,
  OrganizationTeamPayment,
  PaymentGatewayProvider,
  OrgPayoutMethodType,
} from '../types';

// ========================================
// CONFIGURACIÓN DE PAGOS
// ========================================

/**
 * Hook para obtener configuración de pagos de la organización
 */
export function useOrganizationPaymentSettings(organizationId: string | undefined) {
  return useQuery({
    queryKey: ['organization-payment-settings', organizationId],
    queryFn: () => organizationPaymentsService.getPaymentSettings(organizationId!),
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook para actualizar configuración de pagos
 */
export function useUpdatePaymentSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      organizationId,
      settings,
    }: {
      organizationId: string;
      settings: Partial<Omit<OrganizationPaymentSettings, 'organization_id' | 'created_at' | 'updated_at'>>;
    }) => organizationPaymentsService.updatePaymentSettings(organizationId, settings),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['organization-payment-settings', variables.organizationId],
      });
    },
  });
}

// ========================================
// PASARELAS DE COBRO
// ========================================

/**
 * Hook para obtener pasarelas de cobro configuradas
 */
export function usePaymentGateways(organizationId: string | undefined) {
  return useQuery({
    queryKey: ['organization-payment-gateways', organizationId],
    queryFn: () => organizationPaymentsService.getPaymentGateways(organizationId!),
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook para agregar pasarela de cobro
 */
export function useAddPaymentGateway() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: {
      organizationId: string;
      provider: PaymentGatewayProvider;
      credentials: Record<string, string>;
      displayName?: string;
      supportedCurrencies?: string[];
      isDefault?: boolean;
    }) => organizationPaymentsService.addPaymentGateway(params),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['organization-payment-gateways', variables.organizationId],
      });
    },
  });
}

/**
 * Hook para actualizar pasarela
 */
export function useUpdatePaymentGateway() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      gatewayId,
      organizationId,
      updates,
    }: {
      gatewayId: string;
      organizationId: string;
      updates: Partial<Pick<OrganizationPaymentGateway, 'is_active' | 'is_default' | 'display_name' | 'supported_currencies'>>;
    }) => organizationPaymentsService.updatePaymentGateway(gatewayId, updates),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['organization-payment-gateways', variables.organizationId],
      });
    },
  });
}

/**
 * Hook para eliminar pasarela
 */
export function useDeletePaymentGateway() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      gatewayId,
      organizationId,
    }: {
      gatewayId: string;
      organizationId: string;
    }) => organizationPaymentsService.deletePaymentGateway(gatewayId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['organization-payment-gateways', variables.organizationId],
      });
    },
  });
}

// ========================================
// MÉTODOS DE PAGO A EQUIPO
// ========================================

/**
 * Hook para obtener métodos de pago a equipo
 */
export function usePayoutMethods(organizationId: string | undefined) {
  return useQuery({
    queryKey: ['organization-payout-methods', organizationId],
    queryFn: () => organizationPaymentsService.getPayoutMethods(organizationId!),
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook para agregar método de pago a equipo
 */
export function useAddPayoutMethod() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: {
      organizationId: string;
      methodType: OrgPayoutMethodType;
      credentials?: Record<string, string>;
      bankInfo?: Record<string, string>;
      displayName?: string;
      supportedCurrencies?: string[];
    }) => organizationPaymentsService.addPayoutMethod(params),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['organization-payout-methods', variables.organizationId],
      });
    },
  });
}

/**
 * Hook para eliminar método de pago
 */
export function useDeletePayoutMethod() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      methodId,
      organizationId,
    }: {
      methodId: string;
      organizationId: string;
    }) => organizationPaymentsService.deletePayoutMethod(methodId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['organization-payout-methods', variables.organizationId],
      });
    },
  });
}

// ========================================
// COBROS A CLIENTES
// ========================================

/**
 * Hook para obtener pagos de clientes
 */
export function useClientPayments(
  organizationId: string | undefined,
  filters?: {
    status?: string;
    campaignId?: string;
    from?: string;
    to?: string;
    limit?: number;
  }
) {
  return useQuery({
    queryKey: ['organization-client-payments', organizationId, filters],
    queryFn: () => organizationPaymentsService.getClientPayments(organizationId!, filters),
    enabled: !!organizationId,
    staleTime: 60 * 1000, // 1 minute
  });
}

/**
 * Hook para registrar pago de cliente
 */
export function useRegisterClientPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: {
      organizationId: string;
      campaignId?: string;
      projectReference?: string;
      clientInfo: {
        userId?: string;
        organizationId?: string;
        name?: string;
        email?: string;
      };
      amount: number;
      currency: string;
      paymentMethod?: string;
      gatewayId?: string;
      externalPaymentId?: string;
      notes?: string;
    }) => organizationPaymentsService.registerClientPayment(params),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['organization-client-payments', variables.organizationId],
      });
      queryClient.invalidateQueries({
        queryKey: ['organization-payment-stats', variables.organizationId],
      });
    },
  });
}

/**
 * Hook para confirmar pago manual
 */
export function useConfirmManualPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      paymentId,
      confirmedBy,
      organizationId,
      proofUrl,
    }: {
      paymentId: string;
      confirmedBy: string;
      organizationId: string;
      proofUrl?: string;
    }) =>
      organizationPaymentsService.confirmManualPayment({
        paymentId,
        confirmedBy,
        proofUrl,
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['organization-client-payments', variables.organizationId],
      });
      queryClient.invalidateQueries({
        queryKey: ['organization-payment-stats', variables.organizationId],
      });
    },
  });
}

// ========================================
// PAGOS A EQUIPO
// ========================================

/**
 * Hook para obtener pagos a equipo
 */
export function useTeamPayments(
  organizationId: string | undefined,
  filters?: {
    status?: string;
    recipientId?: string;
    from?: string;
    to?: string;
    limit?: number;
  }
) {
  return useQuery({
    queryKey: ['organization-team-payments', organizationId, filters],
    queryFn: () => organizationPaymentsService.getTeamPayments(organizationId!, filters),
    enabled: !!organizationId,
    staleTime: 60 * 1000,
  });
}

/**
 * Hook para crear pago a equipo
 */
export function useCreateTeamPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: {
      organizationId: string;
      recipientUserId: string;
      recipientName?: string;
      recipientRole?: string;
      campaignId?: string;
      deliverableReference?: string;
      amount: number;
      currency: string;
      payoutMethodId?: string;
      notes?: string;
      requestedBy: string;
    }) => organizationPaymentsService.createTeamPayment(params),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['organization-team-payments', variables.organizationId],
      });
    },
  });
}

/**
 * Hook para aprobar pago a equipo
 */
export function useApproveTeamPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      paymentId,
      approvedBy,
      organizationId,
    }: {
      paymentId: string;
      approvedBy: string;
      organizationId: string;
    }) => organizationPaymentsService.approveTeamPayment(paymentId, approvedBy),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['organization-team-payments', variables.organizationId],
      });
    },
  });
}

/**
 * Hook para completar pago a equipo
 */
export function useCompleteTeamPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      paymentId,
      organizationId,
      externalPaymentId,
      proofUrl,
    }: {
      paymentId: string;
      organizationId: string;
      externalPaymentId?: string;
      proofUrl?: string;
    }) =>
      organizationPaymentsService.completeTeamPayment({
        paymentId,
        externalPaymentId,
        proofUrl,
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['organization-team-payments', variables.organizationId],
      });
      queryClient.invalidateQueries({
        queryKey: ['organization-payment-stats', variables.organizationId],
      });
    },
  });
}

// ========================================
// ESTADÍSTICAS
// ========================================

/**
 * Hook para obtener estadísticas de pagos
 */
export function usePaymentStats(
  organizationId: string | undefined,
  period: 'week' | 'month' | 'year' = 'month'
) {
  return useQuery({
    queryKey: ['organization-payment-stats', organizationId, period],
    queryFn: () => organizationPaymentsService.getPaymentStats(organizationId!, period),
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000,
  });
}

// ========================================
// HOOKS COMBINADOS
// ========================================

/**
 * Hook completo para gestión de pagos de organización
 */
export function useOrganizationPayments(organizationId: string | undefined) {
  const settings = useOrganizationPaymentSettings(organizationId);
  const gateways = usePaymentGateways(organizationId);
  const payoutMethods = usePayoutMethods(organizationId);
  const stats = usePaymentStats(organizationId);

  return {
    settings: settings.data,
    gateways: gateways.data || [],
    payoutMethods: payoutMethods.data || [],
    stats: stats.data,
    isLoading: settings.isLoading || gateways.isLoading || payoutMethods.isLoading,
    isError: settings.isError || gateways.isError || payoutMethods.isError,
    refetch: () => {
      settings.refetch();
      gateways.refetch();
      payoutMethods.refetch();
      stats.refetch();
    },
  };
}
