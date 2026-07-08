import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { TalentPayment } from '@/types/talentPayments.types';
import type { MonthlyClosureEntry } from './types';

export function useMonthlyClosures(organizationId: string) {
  return useQuery({
    queryKey: ['monthly-closures', organizationId],
    staleTime: 0,
    queryFn: async (): Promise<MonthlyClosureEntry[]> => {
      const { data: payments, error } = await supabase
        .from('talent_payments')
        .select('*')
        .eq('organization_id', organizationId)
        .in('status', ['pending', 'processing'])
        .or('fillmaker_service_id.is.null,status.eq.processing')
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (!payments || payments.length === 0) return [];

      const userIds = [...new Set(payments.map((p) => p.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', userIds);

      const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

      return payments.map((p) => {
        const profile = profileMap.get(p.user_id);
        return {
          payment: p as TalentPayment,
          full_name: profile?.full_name ?? 'Usuario',
          avatar_url: profile?.avatar_url ?? null,
        };
      });
    },
    enabled: !!organizationId,
  });
}
