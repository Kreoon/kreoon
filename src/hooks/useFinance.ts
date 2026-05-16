import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as financeService from '@/services/finance/financeService';
import type { TransactionStatus, InvoiceStatus, PayoutStatus } from '@/types/finance.types';
export type { AgencyPackageStats, ClientPackageRevenue, ActiveClientPackage, BarterPackage, CurrencyStats, PackageCurrency } from '@/services/finance/financeService';
export type { PackagePayment, PackageInstallment, PackageCost, PackageMilestone, CreatorPackageAssignment, AgingRow, PackageProfitability, RecurringExpense } from '@/types/finance.types';

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
// AGENCY PACKAGE HOOKS
// ============================================

export function useAgencyPackageStats(orgId: string | undefined) {
  return useQuery({
    queryKey: ['agency-package-stats', orgId],
    queryFn: () => financeService.getAgencyPackageStats(orgId!),
    enabled: !!orgId,
    staleTime: 0,
    refetchOnMount: true,
  });
}

export function useClientPackagesRevenue(orgId: string | undefined) {
  return useQuery({
    queryKey: ['client-packages-revenue', orgId],
    queryFn: () => financeService.getClientPackagesRevenue(orgId!),
    enabled: !!orgId,
    staleTime: 0,
    refetchOnMount: true,
  });
}

export function useActiveClientPackages(orgId: string | undefined) {
  return useQuery({
    queryKey: ['active-client-packages', orgId],
    queryFn: () => financeService.getActiveClientPackages(orgId!),
    enabled: !!orgId,
    staleTime: 0,
    refetchOnMount: true,
  });
}

export function useBarterPackages(orgId: string | undefined) {
  return useQuery({
    queryKey: ['barter-packages', orgId],
    queryFn: () => financeService.getBarterPackages(orgId!),
    enabled: !!orgId,
    staleTime: 0,
    refetchOnMount: true,
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

// ============================================
// ABONOS / PAGOS HOOKS
// ============================================

export function usePackagePayments(packageId: string | undefined) {
  return useQuery({
    queryKey: ['package-payments', packageId],
    queryFn: () => financeService.getPackagePayments(packageId!),
    enabled: !!packageId,
    staleTime: 0,
    refetchOnMount: true,
  });
}

export function useAddPackagePayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payment: Parameters<typeof financeService.addPackagePayment>[0]) =>
      financeService.addPackagePayment(payment),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['package-payments', vars.client_package_id] });
      queryClient.invalidateQueries({ queryKey: ['active-client-packages'] });
      queryClient.invalidateQueries({ queryKey: ['agency-package-stats'] });
      queryClient.invalidateQueries({ queryKey: ['client-packages-revenue'] });
    },
  });
}

// ============================================
// AGING DE CARTERA
// ============================================

export function useReceivablesAging(orgId: string | undefined) {
  return useQuery({
    queryKey: ['receivables-aging', orgId],
    queryFn: () => financeService.getReceivablesAging(orgId!),
    enabled: !!orgId,
    staleTime: 0,
    refetchOnMount: true,
  });
}

// ============================================
// RENTABILIDAD
// ============================================

export function usePackageProfitability(orgId: string | undefined) {
  return useQuery({
    queryKey: ['package-profitability', orgId],
    queryFn: () => financeService.getPackageProfitability(orgId!),
    enabled: !!orgId,
    staleTime: 0,
    refetchOnMount: true,
  });
}

// ============================================
// GASTOS RECURRENTES
// ============================================

export function useRecurringExpenses(orgId: string | undefined) {
  return useQuery({
    queryKey: ['recurring-expenses', orgId],
    queryFn: () => financeService.getRecurringExpenses(orgId!),
    enabled: !!orgId,
    staleTime: 5 * 60 * 1000,
  });
}

// ============================================
// ASIGNACIONES DE CREADORES
// ============================================

export function useCreatorAssignments(packageId: string | undefined) {
  return useQuery({
    queryKey: ['creator-assignments', packageId],
    queryFn: () => financeService.getCreatorAssignments(packageId!),
    enabled: !!packageId,
    staleTime: 0,
  });
}
