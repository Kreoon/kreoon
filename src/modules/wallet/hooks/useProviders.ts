// Payment Provider Hooks - Manejo de proveedores de pago
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { payoutService } from '../services/payout.service';
import type { CurrencyCode, PaymentProvider, PaymentProviderDisplay } from '../types';

/**
 * Hook para obtener todos los proveedores activos
 */
export function useAllProviders() {
  return useQuery({
    queryKey: ['payment-providers'],
    queryFn: async () => {
      return payoutService.getAllProviders();
    },
    staleTime: 60 * 60 * 1000, // 1 hora
  });
}

/**
 * Hook para obtener proveedores disponibles para retiro
 */
export function useWithdrawalProviders(country: string, currency: CurrencyCode) {
  return useQuery({
    queryKey: ['withdrawal-providers', country, currency],
    queryFn: async () => {
      return payoutService.getAvailableProviders(country, currency, 'withdrawal');
    },
    enabled: !!country && !!currency,
    staleTime: 30 * 60 * 1000, // 30 minutos
  });
}

/**
 * Hook para obtener proveedores de depósito
 */
export function useDepositProviders(country: string, currency: CurrencyCode) {
  return useQuery({
    queryKey: ['deposit-providers', country, currency],
    queryFn: async () => {
      return payoutService.getAvailableProviders(country, currency, 'deposit');
    },
    enabled: !!country && !!currency,
    staleTime: 30 * 60 * 1000,
  });
}

/**
 * Hook para obtener un proveedor específico
 */
export function useProvider(providerId: string | null) {
  return useQuery({
    queryKey: ['payment-provider', providerId],
    queryFn: async () => {
      if (!providerId) return null;
      return payoutService.getProvider(providerId);
    },
    enabled: !!providerId,
    staleTime: 60 * 60 * 1000,
  });
}

/**
 * Hook para procesar payout
 */
export function useProcessPayout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: payoutService.processPayout,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['withdrawal-requests'] });
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
    },
  });
}

/**
 * Hook para verificar estado de payout
 */
export function useCheckPayoutStatus() {
  return useMutation({
    mutationFn: ({ providerId, externalReference }: { providerId: string; externalReference: string }) => {
      return payoutService.checkPayoutStatus(providerId, externalReference);
    },
  });
}

/**
 * Hook para calcular fee de proveedor
 */
export function useProviderFee(provider: PaymentProvider | null, amount: number) {
  if (!provider || !amount) {
    return { fee: 0, netAmount: amount, formattedFee: 'Gratis' };
  }

  const fee = payoutService.calculateFee(amount, provider);
  const netAmount = amount - fee;
  const formattedFee = payoutService.formatProviderFee(provider);

  return { fee, netAmount, formattedFee };
}

/**
 * Hook para obtener campos requeridos de un proveedor
 */
export function useProviderRequiredFields(providerId: string | null) {
  if (!providerId) return [];
  return payoutService.getRequiredFields(providerId);
}

/**
 * Helper hook para selección de proveedor en formulario de retiro
 */
export function useProviderSelection(country: string, currency: CurrencyCode) {
  const { data: providers = [], isLoading } = useWithdrawalProviders(country, currency);

  // Agrupar por tipo de proveedor
  const groupedProviders = providers.reduce((acc, provider) => {
    // Determinar categoría
    let category = 'other';
    if (['nequi', 'daviplata', 'yape', 'spei'].includes(provider.id)) {
      category = 'instant';
    } else if (['bancolombia', 'bcp', 'interbank', 'banco_chile'].includes(provider.id)) {
      category = 'bank';
    } else if (['paypal', 'payoneer', 'wise'].includes(provider.id)) {
      category = 'global';
    } else if (provider.id === 'usdt_trc20') {
      category = 'crypto';
    }

    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(provider);
    return acc;
  }, {} as Record<string, PaymentProviderDisplay[]>);

  const categoryLabels: Record<string, string> = {
    instant: '⚡ Instantáneo',
    bank: '🏦 Transferencia Bancaria',
    global: '🌍 Internacional',
    crypto: '₿ Crypto',
    other: 'Otros',
  };

  return {
    providers,
    groupedProviders,
    categoryLabels,
    isLoading,
  };
}
