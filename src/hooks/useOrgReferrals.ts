import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

async function invokeReferralService<T = any>(
  action: string,
  body?: Record<string, any>
): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('No autenticado');

  const { data, error } = await supabase.functions.invoke(`referral-service/${action}`, {
    body: body || {},
    headers: { Authorization: `Bearer ${session.access_token}` },
  });

  if (error) throw new Error(error.message || `Error en ${action}`);
  if (data?.error) throw new Error(data.error);
  return data as T;
}

interface OrgCode {
  id: string;
  code: string;
  organization_id: string;
  target_type: string;
  clicks: number;
  registrations: number;
  conversions: number;
  is_active: boolean;
  referral_url: string;
  created_at: string;
}

interface OrgDashboard {
  org_name: string;
  codes: OrgCode[];
  referrals: any[];
  metrics: {
    total_codes: number;
    total_clicks: number;
    total_registrations: number;
    total_conversions: number;
    conversion_rate: string;
    total_earned: number;
    by_type: { brand: number; creator: number; organization: number };
  };
}

export function useOrgReferrals(organizationId: string | null) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const {
    data: dashboard,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['org-referral-dashboard', organizationId],
    queryFn: () =>
      invokeReferralService<OrgDashboard>('get-org-dashboard', {
        organization_id: organizationId,
      }),
    enabled: !!user?.id && !!organizationId,
    staleTime: 5 * 60 * 1000,
  });

  const generateCodeMutation = useMutation({
    mutationFn: (params?: { targetType?: string }) =>
      invokeReferralService<OrgCode>('generate-org-code', {
        organization_id: organizationId,
        target_type: params?.targetType,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-referral-dashboard', organizationId] });
      toast.success('Código de referido de organización generado');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Error al generar código');
    },
  });

  const codes = dashboard?.codes || [];
  const primaryCode = codes.length > 0 ? codes[0].code : null;

  return {
    dashboard,
    codes,
    primaryCode,
    isLoading,
    metrics: dashboard?.metrics || null,
    referrals: dashboard?.referrals || [],
    orgName: dashboard?.org_name || '',
    generateCode: generateCodeMutation.mutateAsync,
    isGenerating: generateCodeMutation.isPending,
    refetch,
  };
}
