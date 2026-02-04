import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type {
  MarketplacePayment,
  PaymentDispute,
  PaymentTransaction,
  CreatorPayoutSettings,
  CreatePaymentInput,
  OpenDisputeInput,
  UpdatePayoutSettingsInput,
  CreatorEarningsStats,
  CompanySpendingStats,
  PLATFORM_FEE_PERCENTAGE,
} from '@/types/payments';

/**
 * Hook for managing marketplace payments (escrow system)
 */
export function useMarketplacePayments() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Get all payments for current user
  const {
    data: payments = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['marketplace-payments', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await (supabase as any)
        .from('marketplace_payments')
        .select(`
          *,
          company_user:profiles!company_user_id (id, full_name, avatar_url),
          creator_user:profiles!creator_user_id (id, full_name, avatar_url),
          proposal:marketplace_proposals (id, title, status)
        `)
        .or(`company_user_id.eq.${user.id},creator_user_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as MarketplacePayment[];
    },
    enabled: !!user?.id,
  });

  // Create payment (company initiates)
  const createPayment = useMutation({
    mutationFn: async (input: CreatePaymentInput) => {
      if (!user?.id) throw new Error('No autenticado');

      // Calculate fees
      const platformFee = input.gross_amount * 0.10; // 10%
      const netAmount = input.gross_amount - platformFee;

      // Build milestones if provided
      const milestones = input.milestones?.map((m, i) => ({
        id: `milestone_${i}`,
        title: m.title,
        description: m.description || null,
        amount: (input.gross_amount * m.percentage) / 100,
        percentage: m.percentage,
        status: 'pending',
        due_date: m.due_date || null,
        completed_at: null,
        released_at: null,
      })) || [];

      const { data, error } = await (supabase as any)
        .from('marketplace_payments')
        .insert({
          proposal_id: input.proposal_id,
          company_user_id: user.id,
          gross_amount: input.gross_amount,
          platform_fee: platformFee,
          net_amount: netAmount,
          currency: input.currency || 'USD',
          description: input.description || null,
          milestones,
          current_milestone_index: 0,
          status: 'pending',
        })
        .select(`
          *,
          proposal:marketplace_proposals (creator_user_id)
        `)
        .single();

      if (error) throw error;
      return data as MarketplacePayment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketplace-payments', user?.id] });
      toast.success('Pago creado correctamente');
    },
    onError: (error: Error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  // Fund payment (move to escrow via Stripe)
  const fundPayment = useMutation({
    mutationFn: async (paymentId: string) => {
      if (!user?.id) throw new Error('No autenticado');

      // Call edge function to create Stripe PaymentIntent
      const { data, error } = await supabase.functions.invoke('stripe-create-payment', {
        body: { payment_id: paymentId },
      });

      if (error) throw error;
      return data as { client_secret: string };
    },
    onError: (error: Error) => {
      toast.error(`Error al procesar pago: ${error.message}`);
    },
  });

  // Confirm payment funded (called after Stripe confirms)
  const confirmFunded = useMutation({
    mutationFn: async ({
      paymentId,
      stripePaymentIntentId,
    }: {
      paymentId: string;
      stripePaymentIntentId: string;
    }) => {
      if (!user?.id) throw new Error('No autenticado');

      const { error } = await (supabase as any)
        .from('marketplace_payments')
        .update({
          status: 'funded',
          funded_at: new Date().toISOString(),
          stripe_payment_intent_id: stripePaymentIntentId,
        })
        .eq('id', paymentId)
        .eq('company_user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketplace-payments', user?.id] });
      toast.success('Pago depositado en escrow');
    },
  });

  // Release payment (company approves work)
  const releasePayment = useMutation({
    mutationFn: async (paymentId: string) => {
      if (!user?.id) throw new Error('No autenticado');

      // Call edge function to release funds via Stripe
      const { data, error } = await supabase.functions.invoke('stripe-release-payment', {
        body: { payment_id: paymentId },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketplace-payments', user?.id] });
      toast.success('Pago liberado al creador');
    },
    onError: (error: Error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  // Release milestone
  const releaseMilestone = useMutation({
    mutationFn: async ({
      paymentId,
      milestoneIndex,
    }: {
      paymentId: string;
      milestoneIndex: number;
    }) => {
      if (!user?.id) throw new Error('No autenticado');

      const { data, error } = await supabase.functions.invoke('stripe-release-milestone', {
        body: { payment_id: paymentId, milestone_index: milestoneIndex },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketplace-payments', user?.id] });
      toast.success('Milestone liberado');
    },
  });

  // Request refund
  const requestRefund = useMutation({
    mutationFn: async ({
      paymentId,
      reason,
    }: {
      paymentId: string;
      reason: string;
    }) => {
      if (!user?.id) throw new Error('No autenticado');

      const { data, error } = await supabase.functions.invoke('stripe-request-refund', {
        body: { payment_id: paymentId, reason },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketplace-payments', user?.id] });
      toast.success('Solicitud de reembolso enviada');
    },
  });

  // Get payment by ID
  const getPayment = useCallback(async (paymentId: string) => {
    const { data, error } = await (supabase as any)
      .from('marketplace_payments')
      .select(`
        *,
        company_user:profiles!company_user_id (id, full_name, avatar_url, username),
        creator_user:profiles!creator_user_id (id, full_name, avatar_url, username),
        proposal:marketplace_proposals (*)
      `)
      .eq('id', paymentId)
      .single();

    if (error) throw error;
    return data as MarketplacePayment;
  }, []);

  // Filter helpers
  const pendingPayments = payments.filter((p) => p.status === 'pending');
  const fundedPayments = payments.filter((p) => p.status === 'funded');
  const completedPayments = payments.filter((p) => p.status === 'released');
  const disputedPayments = payments.filter((p) => p.status === 'disputed');

  return {
    payments,
    isLoading,
    refetch,
    pendingPayments,
    fundedPayments,
    completedPayments,
    disputedPayments,
    createPayment: createPayment.mutateAsync,
    fundPayment: fundPayment.mutateAsync,
    confirmFunded: confirmFunded.mutateAsync,
    releasePayment: releasePayment.mutateAsync,
    releaseMilestone: releaseMilestone.mutateAsync,
    requestRefund: requestRefund.mutateAsync,
    getPayment,
    isCreating: createPayment.isPending,
    isFunding: fundPayment.isPending,
    isReleasing: releasePayment.isPending,
  };
}

/**
 * Hook for payment disputes
 */
export function usePaymentDisputes() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Get disputes
  const {
    data: disputes = [],
    isLoading,
  } = useQuery({
    queryKey: ['payment-disputes', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await (supabase as any)
        .from('payment_disputes')
        .select(`
          *,
          payment:marketplace_payments (*),
          opener_user:profiles!opener_user_id (id, full_name)
        `)
        .or(`opener_user_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as PaymentDispute[];
    },
    enabled: !!user?.id,
  });

  // Open dispute
  const openDispute = useMutation({
    mutationFn: async (input: OpenDisputeInput) => {
      if (!user?.id) throw new Error('No autenticado');

      // Determine if opener is company or creator
      const { data: payment } = await (supabase as any)
        .from('marketplace_payments')
        .select('company_user_id, creator_user_id')
        .eq('id', input.payment_id)
        .single();

      const openedBy = payment?.company_user_id === user.id ? 'company' : 'creator';

      const { data, error } = await (supabase as any)
        .from('payment_disputes')
        .insert({
          payment_id: input.payment_id,
          opened_by: openedBy,
          opener_user_id: user.id,
          reason: input.reason,
          description: input.description,
          evidence_urls: input.evidence_urls || [],
          status: 'open',
        })
        .select()
        .single();

      if (error) throw error;

      // Update payment status
      await (supabase as any)
        .from('marketplace_payments')
        .update({ status: 'disputed' })
        .eq('id', input.payment_id);

      return data as PaymentDispute;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-disputes', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['marketplace-payments', user?.id] });
      toast.success('Disputa abierta');
    },
    onError: (error: Error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  // Add evidence to dispute
  const addEvidence = useMutation({
    mutationFn: async ({
      disputeId,
      evidenceUrls,
    }: {
      disputeId: string;
      evidenceUrls: string[];
    }) => {
      if (!user?.id) throw new Error('No autenticado');

      const { data: dispute } = await (supabase as any)
        .from('payment_disputes')
        .select('evidence_urls')
        .eq('id', disputeId)
        .single();

      const { error } = await (supabase as any)
        .from('payment_disputes')
        .update({
          evidence_urls: [...(dispute?.evidence_urls || []), ...evidenceUrls],
        })
        .eq('id', disputeId)
        .eq('opener_user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-disputes', user?.id] });
      toast.success('Evidencia agregada');
    },
  });

  return {
    disputes,
    isLoading,
    openDispute: openDispute.mutateAsync,
    addEvidence: addEvidence.mutateAsync,
    isOpening: openDispute.isPending,
  };
}

/**
 * Hook for creator payout settings
 */
export function useCreatorPayoutSettings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Get settings
  const {
    data: settings,
    isLoading,
  } = useQuery({
    queryKey: ['payout-settings', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await (supabase as any)
        .from('creator_payout_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      return data as CreatorPayoutSettings | null;
    },
    enabled: !!user?.id,
  });

  // Update settings
  const updateSettings = useMutation({
    mutationFn: async (input: UpdatePayoutSettingsInput) => {
      if (!user?.id) throw new Error('No autenticado');

      const { data, error } = await (supabase as any)
        .from('creator_payout_settings')
        .upsert({
          user_id: user.id,
          ...input,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id',
        })
        .select()
        .single();

      if (error) throw error;
      return data as CreatorPayoutSettings;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payout-settings', user?.id] });
      toast.success('Configuración actualizada');
    },
  });

  // Connect Stripe account
  const connectStripe = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('No autenticado');

      const { data, error } = await supabase.functions.invoke('stripe-connect-account', {
        body: {},
      });

      if (error) throw error;
      return data as { account_link_url: string };
    },
    onError: (error: Error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  return {
    settings,
    isLoading,
    updateSettings: updateSettings.mutateAsync,
    connectStripe: connectStripe.mutateAsync,
    isUpdating: updateSettings.isPending,
    isConnecting: connectStripe.isPending,
    hasStripeConnected: !!settings?.stripe_account_id && settings.stripe_account_status === 'active',
  };
}

/**
 * Hook for payment transactions history
 */
export function usePaymentTransactions(paymentId?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['payment-transactions', paymentId, user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      let query = (supabase as any)
        .from('payment_transactions')
        .select('*')
        .order('created_at', { ascending: false });

      if (paymentId) {
        query = query.eq('payment_id', paymentId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as PaymentTransaction[];
    },
    enabled: !!user?.id,
  });
}

/**
 * Hook for earnings stats (creators)
 */
export function useCreatorEarnings() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['creator-earnings', user?.id],
    queryFn: async (): Promise<CreatorEarningsStats> => {
      if (!user?.id) {
        return {
          total_earned: 0,
          pending_release: 0,
          available_balance: 0,
          this_month: 0,
          last_month: 0,
          total_projects: 0,
          average_project_value: 0,
        };
      }

      const { data: payments } = await (supabase as any)
        .from('marketplace_payments')
        .select('*')
        .eq('creator_user_id', user.id);

      const released = payments?.filter((p: any) => p.status === 'released') || [];
      const funded = payments?.filter((p: any) => p.status === 'funded') || [];

      const now = new Date();
      const thisMonth = released.filter((p: any) => {
        const date = new Date(p.released_at);
        return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
      });
      const lastMonth = released.filter((p: any) => {
        const date = new Date(p.released_at);
        const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1);
        return date.getMonth() === lastMonthDate.getMonth() && date.getFullYear() === lastMonthDate.getFullYear();
      });

      const totalEarned = released.reduce((sum: number, p: any) => sum + p.net_amount, 0);
      const pendingRelease = funded.reduce((sum: number, p: any) => sum + p.net_amount, 0);

      return {
        total_earned: totalEarned,
        pending_release: pendingRelease,
        available_balance: totalEarned, // Simplified - would need payout tracking
        this_month: thisMonth.reduce((sum: number, p: any) => sum + p.net_amount, 0),
        last_month: lastMonth.reduce((sum: number, p: any) => sum + p.net_amount, 0),
        total_projects: released.length,
        average_project_value: released.length > 0 ? totalEarned / released.length : 0,
      };
    },
    enabled: !!user?.id,
  });
}

/**
 * Hook for spending stats (companies)
 */
export function useCompanySpending() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['company-spending', user?.id],
    queryFn: async (): Promise<CompanySpendingStats> => {
      if (!user?.id) {
        return {
          total_spent: 0,
          in_escrow: 0,
          this_month: 0,
          last_month: 0,
          total_projects: 0,
          average_project_value: 0,
        };
      }

      const { data: payments } = await (supabase as any)
        .from('marketplace_payments')
        .select('*')
        .eq('company_user_id', user.id);

      const released = payments?.filter((p: any) => p.status === 'released') || [];
      const funded = payments?.filter((p: any) => p.status === 'funded') || [];

      const now = new Date();
      const thisMonth = released.filter((p: any) => {
        const date = new Date(p.released_at);
        return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
      });
      const lastMonth = released.filter((p: any) => {
        const date = new Date(p.released_at);
        const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1);
        return date.getMonth() === lastMonthDate.getMonth() && date.getFullYear() === lastMonthDate.getFullYear();
      });

      const totalSpent = released.reduce((sum: number, p: any) => sum + p.gross_amount, 0);
      const inEscrow = funded.reduce((sum: number, p: any) => sum + p.gross_amount, 0);

      return {
        total_spent: totalSpent,
        in_escrow: inEscrow,
        this_month: thisMonth.reduce((sum: number, p: any) => sum + p.gross_amount, 0),
        last_month: lastMonth.reduce((sum: number, p: any) => sum + p.gross_amount, 0),
        total_projects: released.length,
        average_project_value: released.length > 0 ? totalSpent / released.length : 0,
      };
    },
    enabled: !!user?.id,
  });
}
