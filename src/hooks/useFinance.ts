import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as financeService from '@/services/finance/financeService';
import type { TransactionStatus, InvoiceStatus, PayoutStatus } from '@/types/finance.types';

// ============================================
// PLATFORM FINANCE HOOKS
// ============================================

export function usePlatformFinanceStats(days: number = 30) {
  return useQuery({
    queryKey: ['platform-finance-stats', days],
    queryFn: () => financeService.getPlatformFinanceStats(days),
    staleTime: 5 * 60 * 1000,
  });
}

export function useRevenueByMonth(months: number = 12) {
  return useQuery({
    queryKey: ['revenue-by-month', months],
    queryFn: () => financeService.getRevenueByMonth(months),
    staleTime: 10 * 60 * 1000,
  });
}

export function useAllSubscriptions() {
  return useQuery({
    queryKey: ['all-subscriptions'],
    queryFn: financeService.getAllSubscriptions,
    staleTime: 5 * 60 * 1000,
  });
}

export function useAllTransactions(filters?: { type?: string; status?: TransactionStatus; limit?: number }) {
  return useQuery({
    queryKey: ['all-transactions', filters],
    queryFn: () => financeService.getAllTransactions(filters),
    staleTime: 5 * 60 * 1000,
  });
}

export function useAllInvoices(filters?: { status?: InvoiceStatus; limit?: number }) {
  return useQuery({
    queryKey: ['all-invoices', filters],
    queryFn: () => financeService.getAllInvoices(filters),
    staleTime: 5 * 60 * 1000,
  });
}

export function useAllPayouts(filters?: { status?: PayoutStatus; limit?: number }) {
  return useQuery({
    queryKey: ['all-payouts', filters],
    queryFn: () => financeService.getAllPayouts(filters),
    staleTime: 5 * 60 * 1000,
  });
}

export function useApprovePayout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ payoutId, approvedBy }: { payoutId: string; approvedBy: string }) =>
      financeService.approvePayout(payoutId, approvedBy),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-payouts'] });
      queryClient.invalidateQueries({ queryKey: ['platform-finance-stats'] });
    },
  });
}

export function useProcessPayout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ payoutId, reference }: { payoutId: string; reference: string }) =>
      financeService.processPayout(payoutId, reference),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-payouts'] });
      queryClient.invalidateQueries({ queryKey: ['platform-finance-stats'] });
    },
  });
}

export function useCompletePayout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payoutId: string) => financeService.completePayout(payoutId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-payouts'] });
      queryClient.invalidateQueries({ queryKey: ['platform-finance-stats'] });
    },
  });
}

// ============================================
// ORG FINANCE HOOKS
// ============================================

export function useOrgFinanceStats(orgId: string | undefined, days: number = 30) {
  return useQuery({
    queryKey: ['org-finance-stats', orgId, days],
    queryFn: () => financeService.getOrgFinanceStats(orgId!, days),
    enabled: !!orgId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useOrgSubscription(orgId: string | undefined) {
  return useQuery({
    queryKey: ['org-subscription', orgId],
    queryFn: () => financeService.getOrgSubscription(orgId!),
    enabled: !!orgId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useOrgTransactions(orgId: string | undefined, limit?: number) {
  return useQuery({
    queryKey: ['org-transactions', orgId, limit],
    queryFn: () => financeService.getOrgTransactions(orgId!, limit),
    enabled: !!orgId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useOrgInvoices(orgId: string | undefined) {
  return useQuery({
    queryKey: ['org-invoices', orgId],
    queryFn: () => financeService.getOrgInvoices(orgId!),
    enabled: !!orgId,
    staleTime: 5 * 60 * 1000,
  });
}

// ============================================
// CREATOR FINANCE HOOKS
// ============================================

export function useCreatorFinanceStats(creatorId: string | undefined) {
  return useQuery({
    queryKey: ['creator-finance-stats', creatorId],
    queryFn: () => financeService.getCreatorFinanceStats(creatorId!),
    enabled: !!creatorId,
    staleTime: 2 * 60 * 1000,
  });
}

export function useCreatorWallet(creatorId: string | undefined) {
  return useQuery({
    queryKey: ['creator-wallet', creatorId],
    queryFn: () => financeService.getCreatorWallet(creatorId!),
    enabled: !!creatorId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreatorWalletTransactions(creatorId: string | undefined, limit?: number) {
  return useQuery({
    queryKey: ['creator-wallet-transactions', creatorId, limit],
    queryFn: () => financeService.getCreatorWalletTransactions(creatorId!, limit),
    enabled: !!creatorId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreatorPayouts(creatorId: string | undefined) {
  return useQuery({
    queryKey: ['creator-payouts', creatorId],
    queryFn: () => financeService.getCreatorPayouts(creatorId!),
    enabled: !!creatorId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useRequestPayout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ creatorId, amount, paymentMethod }: {
      creatorId: string;
      amount: number;
      paymentMethod: string
    }) => financeService.requestPayout(creatorId, amount, paymentMethod),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['creator-wallet', variables.creatorId] });
      queryClient.invalidateQueries({ queryKey: ['creator-payouts', variables.creatorId] });
      queryClient.invalidateQueries({ queryKey: ['creator-finance-stats', variables.creatorId] });
    },
  });
}

export function useUpdatePaymentInfo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ creatorId, paymentInfo }: { creatorId: string; paymentInfo: Record<string, any> }) =>
      financeService.updatePaymentInfo(creatorId, paymentInfo),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['creator-wallet', variables.creatorId] });
    },
  });
}
