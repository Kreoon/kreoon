import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// ============================================
// TYPES
// ============================================

export type TalentPaymentStatus = 'pending' | 'paid' | 'cancelled';
export type TalentPaymentRole = 'creator' | 'editor' | 'mixed' | 'manual' | 'fillmaker' | 'legacy';

export interface RawTalentPayment {
  id: string;
  organization_id: string;
  user_id: string;
  amount: number;
  currency: string;
  status: TalentPaymentStatus;
  description: string | null;
  content_ids: string[] | null;
  payment_date: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  role: TalentPaymentRole | null;
  closing_date: string | null;
  due_payment_date: string | null;
  cycle_label: string | null;
}

export interface TalentProfile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
}

export interface EnrichedTalentPayment extends RawTalentPayment {
  talent: TalentProfile | null;
}

export interface TalentPayrollKPIs {
  totalPending: number;
  totalPaidThisMonth: number;
  nextDueDate: string | null;
  pendingCount: number;
  talentsPending: number;
}

export interface TalentPayrollData {
  payments: EnrichedTalentPayment[];
  kpis: TalentPayrollKPIs;
}

// ============================================
// QUERY KEY
// ============================================

const PAYROLL_QUERY_KEY = (orgId: string) => ['talent-payroll', orgId] as const;

// ============================================
// HOOK: useTalentPayroll
// ============================================

export function useTalentPayroll(orgId: string | undefined) {
  return useQuery({
    queryKey: PAYROLL_QUERY_KEY(orgId ?? ''),
    queryFn: async (): Promise<TalentPayrollData> => {
      // 1. Fetch talent_payments (exclude cancelled)
      const { data: rawPayments, error: paymentsError } = await (supabase as any)
        .from('talent_payments')
        .select('*')
        .eq('organization_id', orgId)
        .neq('status', 'cancelled')
        .order('due_payment_date', { ascending: true, nullsFirst: false });

      if (paymentsError) throw paymentsError;

      const payments: RawTalentPayment[] = rawPayments ?? [];

      // 2. Enrich with profile data (second query pattern — FK embed may not be available)
      const userIds = [...new Set(payments.map((p: RawTalentPayment) => p.user_id))];

      let profileMap: Record<string, TalentProfile> = {};

      if (userIds.length > 0) {
        const { data: profiles, error: profilesError } = await (supabase as any)
          .from('profiles')
          .select('id, full_name, avatar_url')
          .in('id', userIds);

        if (!profilesError && profiles) {
          for (const p of profiles as TalentProfile[]) {
            profileMap[p.id] = p;
          }
        }
      }

      const enriched: EnrichedTalentPayment[] = payments.map((p: RawTalentPayment) => ({
        ...p,
        talent: profileMap[p.user_id] ?? null,
      }));

      // 3. Derive KPIs
      const pending = enriched.filter((p) => p.status === 'pending');

      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

      const paidThisMonth = enriched.filter((p) => {
        if (p.status !== 'paid' || !p.payment_date) return false;
        const d = new Date(p.payment_date);
        return d >= startOfMonth && d <= endOfMonth;
      });

      const dueDates = pending
        .map((p) => p.due_payment_date)
        .filter((d): d is string => !!d)
        .sort();

      const uniquePendingTalents = new Set(pending.map((p) => p.user_id)).size;

      const kpis: TalentPayrollKPIs = {
        totalPending: pending.reduce((sum, p) => sum + (p.amount ?? 0), 0),
        totalPaidThisMonth: paidThisMonth.reduce((sum, p) => sum + (p.amount ?? 0), 0),
        nextDueDate: dueDates[0] ?? null,
        pendingCount: pending.length,
        talentsPending: uniquePendingTalents,
      };

      return { payments: enriched, kpis };
    },
    enabled: !!orgId,
    staleTime: 2 * 60 * 1000,
  });
}

// ============================================
// HOOK: useConfirmTalentPayment
// ============================================

export function useConfirmTalentPayment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ paymentId, orgId }: { paymentId: string; orgId: string }) => {
      const { error } = await (supabase as any)
        .from('talent_payments')
        .update({
          status: 'paid',
          payment_date: new Date().toISOString(),
        })
        .eq('id', paymentId);

      if (error) throw error;

      // Return orgId so onSuccess can invalidate the correct query
      return { orgId };
    },
    onSuccess: ({ orgId }) => {
      queryClient.invalidateQueries({ queryKey: PAYROLL_QUERY_KEY(orgId) });
      toast({
        title: 'Pago confirmado',
        description: 'El talento ha sido marcado como pagado.',
      });
    },
    onError: (err: Error) => {
      toast({
        title: 'Error al confirmar pago',
        description: err.message || 'No se pudo actualizar el estado del pago.',
        variant: 'destructive',
      });
    },
  });
}
