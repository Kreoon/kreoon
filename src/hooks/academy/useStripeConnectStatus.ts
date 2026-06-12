import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface StripeConnectStatus {
  has_account: boolean;
  account_id: string | null;
  onboarding_complete: boolean;
  ready_to_receive_payments: boolean;
  requirements_currently_due: string[];
  dashboard_link: string | null;
}

/** Status del Stripe Connect del owner actual (siempre fetcheado fresh desde Stripe). */
export function useStripeConnectStatus() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['stripe-connect', 'status', user?.id],
    queryFn: async (): Promise<StripeConnectStatus> => {
      const { data, error } = await (supabase as any).functions.invoke(
        'stripe-connect-account-status',
        { body: {} }
      );
      if (error) throw error;
      return data as StripeConnectStatus;
    },
    enabled: !!user,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });
}

/** Genera link de onboarding y redirige al user a Stripe. */
export function useStartStripeConnectOnboarding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ spaceSlug }: { spaceSlug?: string }) => {
      const { data, error } = await (supabase as any).functions.invoke(
        'stripe-connect-account-link',
        { body: { space_slug: spaceSlug } }
      );
      if (error) throw error;
      if (!data?.url) throw new Error('No recibimos URL de onboarding.');
      return data as { url: string; account_id: string };
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['stripe-connect', 'status'] });
      window.location.href = data.url;
    },
  });
}
