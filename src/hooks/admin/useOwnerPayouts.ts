import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface OwnerPayoutSummary {
  owner_user_id: string;
  owner_full_name: string | null;
  owner_email: string | null;
  pending_count: number;
  pending_total_usd: number;
  oldest_pending_at: string;
  has_stripe_connect: boolean;
}

export interface OwnerPayoutRow {
  id: string;
  owner_user_id: string;
  space_id: string | null;
  source_type: 'academy_membership_subscription' | 'academy_course_purchase';
  source_id: string | null;
  stripe_session_id: string | null;
  stripe_invoice_id: string | null;
  gross_amount_usd: number;
  platform_fee_percent: number;
  platform_fee_amount_usd: number;
  net_owner_amount_usd: number;
  currency: string;
  collected_at: string;
  paid_out_at: string | null;
  paid_out_method: string | null;
  paid_out_reference: string | null;
}

/** Resumen agregado por owner (solo admin de plataforma KREOON). */
export function useOwnerPayoutsSummary() {
  return useQuery({
    queryKey: ['admin', 'owner-payouts', 'summary'],
    queryFn: async (): Promise<OwnerPayoutSummary[]> => {
      const { data, error } = await (supabase as any).rpc('get_owner_payouts_summary');
      if (error) throw error;
      return (data ?? []) as OwnerPayoutSummary[];
    },
    staleTime: 30_000,
  });
}

/** Detalle de payouts (pendientes y pagados) de un owner específico. */
export function useOwnerPayoutsDetail(ownerUserId: string | null) {
  return useQuery({
    queryKey: ['admin', 'owner-payouts', 'detail', ownerUserId],
    queryFn: async (): Promise<OwnerPayoutRow[]> => {
      if (!ownerUserId) return [];
      // El admin lee directo de la tabla con su JWT — RLS lo bloquearía
      // pero el chequeo de admin se hace a nivel de la página antes de
      // renderizar. Si quisiéramos hardening, agregamos un RPC SECURITY DEFINER.
      const { data, error } = await (supabase as any)
        .from('pending_owner_payouts')
        .select(
          'id, owner_user_id, space_id, source_type, source_id, stripe_session_id, stripe_invoice_id, gross_amount_usd, platform_fee_percent, platform_fee_amount_usd, net_owner_amount_usd, currency, collected_at, paid_out_at, paid_out_method, paid_out_reference',
        )
        .eq('owner_user_id', ownerUserId)
        .order('collected_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as OwnerPayoutRow[];
    },
    enabled: !!ownerUserId,
  });
}

export interface MarkPaidInput {
  payoutId: string;
  method: string;
  reference: string;
  notes?: string;
}

export function useMarkOwnerPayoutPaid() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: MarkPaidInput) => {
      const { error } = await (supabase as any).rpc('mark_owner_payout_paid', {
        p_payout_id: input.payoutId,
        p_method: input.method,
        p_reference: input.reference,
        p_notes: input.notes ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'owner-payouts'] });
    },
  });
}
